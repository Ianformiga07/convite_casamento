// ============================================================
//  PAINEL — Tela de login
// ============================================================
(async function () {
  const form = document.getElementById("form-login");
  const erro = document.getElementById("erro");
  const mostrar = m => { erro.textContent = m; erro.hidden = false; };

  if (!db) return mostrar("Configure a conexão com o Supabase em assets/js/config.js.");
  if (new URLSearchParams(location.search).get("erro") === "sem-permissao")
    mostrar("Este usuário não tem permissão de administrador.");

  const { data: { session } } = await db.auth.getSession();
  if (session) {
    const { data: admin } = await db.rpc("is_admin");
    if (admin) return location.replace("dashboard.html");
  }

  form.addEventListener("submit", async e => {
    e.preventDefault();
    erro.hidden = true;
    const email = form.email.value.trim(), senha = form.senha.value;
    if (!email || !senha) return mostrar("Informe e-mail e senha.");
    const btn = document.getElementById("btn-entrar");
    btn.disabled = true; btn.textContent = "Entrando…";
    const { error } = await db.auth.signInWithPassword({ email, password: senha });
    if (error) {
      btn.disabled = false; btn.textContent = "Entrar";
      return mostrar(/invalid/i.test(error.message) ? "E-mail ou senha incorretos." : error.message);
    }
    const { data: admin } = await db.rpc("is_admin");
    if (!admin) {
      await db.auth.signOut();
      btn.disabled = false; btn.textContent = "Entrar";
      return mostrar("Este usuário não tem permissão de administrador.");
    }
    location.replace("dashboard.html");
  });

  document.getElementById("btn-esqueci").addEventListener("click", async () => {
    const email = form.email.value.trim();
    if (!email) return mostrar("Digite seu e-mail no campo acima e clique de novo em “Esqueci minha senha”.");
    const { error } = await db.auth.resetPasswordForEmail(email, {
      redirectTo: new URL("configuracoes.html#senha", location.href).href
    });
    if (error) return mostrar(error.message);
    U.toast("Se o e-mail estiver cadastrado, você receberá um link para criar uma nova senha.", 6000);
  });
})();
