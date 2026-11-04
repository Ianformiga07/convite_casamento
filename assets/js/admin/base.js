// ============================================================
//  PAINEL — base comum a todas as telas
//  (login obrigatório, menu, janelas, envio de imagens, exportação)
// ============================================================
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const { esc } = U;

  const MENU = [
    ["dashboard", "dashboard.html", "fa-chart-simple", "Visão geral"],
    ["convidados", "convidados.html", "fa-user-group", "Convidados"],
    ["confirmacoes", "confirmacoes.html", "fa-clipboard-check", "Confirmações"],
    ["presentes", "presentes.html", "fa-gift", "Presentes"],
    ["conteudo", "conteudo.html", "fa-pen-nib", "Conteúdo do convite"],
    ["configuracoes", "configuracoes.html", "fa-sliders", "Configurações"],
    ["relatorios", "relatorios.html", "fa-file-export", "Relatórios"]
  ];

  const Admin = {
    usuario: null,
    config: null,

    // ---------- Login obrigatório ----------
    async pronto(iniciarPagina) {
      if (!db) { document.body.innerHTML = `<p class="carregando-tela">Configure o arquivo assets/js/config.js.</p>`; return; }
      const { data: { session } } = await db.auth.getSession();
      if (!session) { location.replace("index.html"); return; }
      const { data: admin, error } = await db.rpc("is_admin");
      if (error || !admin) {
        await db.auth.signOut();
        location.replace("index.html?erro=sem-permissao");
        return;
      }
      Admin.usuario = session.user;
      montarLayout();
      try { await iniciarPagina(); }
      catch (e) { console.error(e); Admin.aviso("Erro ao carregar: " + (e.message || e), true); }
    },

    async sair() {
      await db.auth.signOut();
      location.replace("index.html");
    },

    // ---------- Configurações do site ----------
    async carregarConfig() {
      const { data, error } = await db.from("configuracoes").select("dados").eq("id", 1).maybeSingle();
      if (error) throw error;
      Admin.config = data?.dados || {};
      return Admin.config;
    },

    async salvarConfig(parcial) {
      const atual = await Admin.carregarConfig();
      const novo = { ...atual, ...parcial };
      const { error } = await db.from("configuracoes").upsert({ id: 1, dados: novo });
      if (error) throw error;
      Admin.config = novo;
      return novo;
    },

    // ---------- Convites + respostas ----------
    async carregarConvites() {
      const { data, error } = await db.from("convites")
        .select("*, confirmacoes(*)")
        .order("grupo", { ascending: true });
      if (error) throw error;
      return (data || []).map(c => {
        const r = Array.isArray(c.confirmacoes) ? c.confirmacoes[0] : c.confirmacoes;
        delete c.confirmacoes;
        c.resposta = r || null;
        c.situacao = !r ? "pendente" : r.presenca ? "sim" : "nao";
        return c;
      });
    },

    SITUACAO: { sim: "Confirmado", nao: "Não comparecerá", pendente: "Pendente" },

    etiquetaSituacao(s) {
      const icone = { sim: "fa-check", nao: "fa-xmark", pendente: "fa-clock" }[s];
      return `<span class="etiqueta etiqueta--${s}"><i class="fa-solid ${icone}" aria-hidden="true"></i>${Admin.SITUACAO[s]}</span>`;
    },

    linkConvite(codigo) {
      return new URL(`../?c=${encodeURIComponent(codigo)}`, location.href).href;
    },

    linkWhatsApp(convite) {
      const modelo = Admin.config?.whatsapp_texto ||
        "Olá, {grupo}! Com muita alegria, convidamos vocês para o nosso casamento. Acesse o convite e confirme sua presença: {link}";
      const texto = modelo
        .replaceAll("{grupo}", convite.grupo)
        .replaceAll("{titular}", convite.titular)
        .replaceAll("{link}", Admin.linkConvite(convite.codigo));
      let tel = String(convite.telefone || "").replace(/\D/g, "");
      if (tel.length === 10 || tel.length === 11) tel = "55" + tel;
      return `https://wa.me/${tel}?text=${encodeURIComponent(texto)}`;
    },

    async copiar(texto) {
      try { await navigator.clipboard.writeText(texto); Admin.aviso("Link copiado."); }
      catch { prompt("Copie o link:", texto); }
    },

    // ---------- Avisos ----------
    aviso(msg, erro = false) {
      let t = $("#toast");
      if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "aviso-flutuante"; t.setAttribute("role", "status"); document.body.appendChild(t); }
      t.textContent = msg; t.classList.toggle("erro-toast", erro); t.hidden = false;
      clearTimeout(t._t); t._t = setTimeout(() => (t.hidden = true), erro ? 6000 : 3000);
    },

    // Traduz erros do banco para mensagens claras
    mensagemErro(e) {
      const m = e?.message || String(e);
      if (/duplicate key/i.test(m)) return "Já existe um registro com esses dados.";
      if (/violates check constraint/i.test(m)) return "Algum campo está com valor inválido. Confira os dados.";
      if (/row-level security|permission denied/i.test(m)) return "Sem permissão para esta ação. Entre novamente no painel.";
      if (/Failed to fetch|NetworkError/i.test(m)) return "Sem conexão com a internet. Tente de novo.";
      return m;
    },

    // ---------- Janela com formulário ----------
    // aoConfirmar(form) pode lançar erro (mensagem aparece na janela) ou retornar false para manter aberta
    janela({ titulo, corpo, botao = "Salvar", perigo = false, aoAbrir, aoConfirmar, largura }) {
      return new Promise(resolve => {
        const d = document.createElement("dialog");
        d.className = "janela";
        if (largura) d.style.width = `min(96vw, ${largura})`;
        d.innerHTML = `
          <form novalidate>
            <div class="janela__cabeca"><h2>${esc(titulo)}</h2>
              <button type="button" class="btn btn--icone" data-fechar aria-label="Fechar"><i class="fa-solid fa-xmark"></i></button></div>
            <div class="janela__corpo"><p class="erro" data-erro hidden></p>${corpo}</div>
            <div class="janela__rodape">
              <button type="button" class="btn" data-fechar>Cancelar</button>
              <button type="submit" class="btn ${perigo ? "btn--perigo" : "btn--principal"}">${esc(botao)}</button>
            </div>
          </form>`;
        document.body.appendChild(d);
        const form = d.querySelector("form");
        const fechar = valor => { d.close(); d.remove(); resolve(valor); };
        d.addEventListener("cancel", e => { e.preventDefault(); fechar(false); });
        d.querySelectorAll("[data-fechar]").forEach(b => b.addEventListener("click", () => fechar(false)));
        form.addEventListener("submit", async e => {
          e.preventDefault();
          const erro = form.querySelector("[data-erro]");
          const btn = form.querySelector('button[type="submit"]');
          erro.hidden = true; btn.disabled = true;
          try {
            const r = aoConfirmar ? await aoConfirmar(form) : true;
            if (r === false) { btn.disabled = false; return; }
            fechar(r ?? true);
          } catch (ex) {
            erro.textContent = Admin.mensagemErro(ex); erro.hidden = false; btn.disabled = false;
            erro.scrollIntoView({ block: "nearest" });
          }
        });
        d.showModal();
        aoAbrir?.(form);
        form.querySelector("input:not([type=hidden]):not([type=file]),textarea,select")?.focus();
      });
    },

    confirmar(mensagem, botao = "Confirmar", perigo = true) {
      return Admin.janela({ titulo: "Confirmar", corpo: `<p>${mensagem}</p>`, botao, perigo });
    },

    // ---------- Imagens (reduz no navegador e envia ao Supabase Storage) ----------
    async reduzirImagem(arquivo, max = 1600, qualidade = 0.85) {
      if (!/^image\//.test(arquivo.type)) throw new Error("Escolha um arquivo de imagem (JPG, PNG ou WEBP).");
      if (arquivo.size > 15 * 1024 * 1024) throw new Error("Imagem muito grande (máximo 15 MB).");
      const bitmap = await createImageBitmap(arquivo).catch(() => null);
      if (!bitmap) return arquivo;
      const escala = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * escala);
      canvas.height = Math.round(bitmap.height * escala);
      canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const manterTransparencia = arquivo.type === "image/png";
      const tipo = manterTransparencia ? "image/png" : "image/webp";
      const blob = await new Promise(r => canvas.toBlob(r, tipo, qualidade));
      return blob || arquivo;
    },

    async enviarImagem(arquivo, pasta, opcoes = {}) {
      const blob = await Admin.reduzirImagem(arquivo, opcoes.max || 1600);
      const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : (arquivo.name.split(".").pop() || "jpg");
      const caminho = `${pasta}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await db.storage.from("imagens").upload(caminho, blob, {
        contentType: blob.type || arquivo.type, cacheControl: "31536000", upsert: false
      });
      if (error) throw error;
      return db.storage.from("imagens").getPublicUrl(caminho).data.publicUrl;
    },

    // Liga um <input type=file> a uma prévia e a um campo oculto com a URL
    campoImagem(form, nome, pasta, opcoes = {}) {
      const entrada = form.querySelector(`[data-arquivo="${nome}"]`);
      const oculto = form.querySelector(`[name="${nome}"]`);
      const previa = form.querySelector(`[data-previa="${nome}"]`);
      const remover = form.querySelector(`[data-remover="${nome}"]`);
      const mostrar = url => {
        previa.style.backgroundImage = url ? `url("${url}")` : "";
        previa.classList.toggle("tem", !!url);
        if (remover) remover.hidden = !url;
      };
      mostrar(oculto.value);
      entrada.addEventListener("change", async () => {
        const f = entrada.files[0]; if (!f) return;
        previa.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i>`;
        try { oculto.value = await Admin.enviarImagem(f, pasta, opcoes); mostrar(oculto.value); previa.innerHTML = ""; }
        catch (e) { previa.innerHTML = `<i class="fa-regular fa-image"></i>`; Admin.aviso(Admin.mensagemErro(e), true); }
        entrada.value = "";
      });
      remover?.addEventListener("click", () => { oculto.value = ""; mostrar(""); previa.innerHTML = `<i class="fa-regular fa-image"></i>`; });
    },

    htmlCampoImagem(nome, rotulo, valor = "", larga = false) {
      return `<div class="campo campo--inteiro"><span>${esc(rotulo)}</span>
        <div class="imagem-campo">
          <div class="previa ${larga ? "previa--larga" : ""}" data-previa="${nome}"><i class="fa-regular fa-image"></i></div>
          <div>
            <label class="btn"><i class="fa-solid fa-upload"></i> Escolher imagem
              <input type="file" accept="image/*" data-arquivo="${nome}" hidden></label>
            <button type="button" class="btn btn--perigo" data-remover="${nome}" hidden>Remover</button>
            <p class="dica">JPG, PNG ou WEBP. A imagem é otimizada automaticamente.</p>
          </div>
          <input type="hidden" name="${nome}" value="${esc(valor)}">
        </div></div>`;
    },

    // ---------- Exportação ----------
    excel(nomeArquivo, abas) {
      const wb = XLSX.utils.book_new();
      abas.forEach(({ nome, linhas }) => {
        const ws = XLSX.utils.json_to_sheet(linhas.length ? linhas : [{ "": "Nenhum registro" }]);
        const chaves = Object.keys(linhas[0] || { "": "" });
        ws["!cols"] = chaves.map(k => ({ wch: Math.min(60, Math.max(k.length, ...linhas.map(l => String(l[k] ?? "").length)) + 2) }));
        XLSX.utils.book_append_sheet(wb, ws, nome.slice(0, 31));
      });
      XLSX.writeFile(wb, `${nomeArquivo}.xlsx`);
    },

    pdf(nomeArquivo, titulo, linhas, resumo = "") {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: Object.keys(linhas[0] || {}).length > 5 ? "landscape" : "portrait", unit: "pt", format: "a4" });
      const nomes = Admin.config?.nomes_curtos || "Ian & Laura Regina";
      doc.setFont("times", "normal"); doc.setFontSize(18); doc.setTextColor(161, 61, 25);
      doc.text(nomes, 40, 46);
      doc.setFontSize(13); doc.setTextColor(85, 107, 47); doc.text(titulo, 40, 66);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(110);
      doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}${resumo ? "  |  " + resumo : ""}`, 40, 82);
      const cab = Object.keys(linhas[0] || { Registro: "" });
      doc.autoTable({
        startY: 96,
        head: [cab],
        body: linhas.length ? linhas.map(l => cab.map(k => String(l[k] ?? ""))) : [["Nenhum registro"]],
        styles: { fontSize: 8.5, cellPadding: 5, textColor: 50, lineColor: [231, 224, 211], lineWidth: .5 },
        headStyles: { fillColor: [85, 107, 47], textColor: 255 },
        alternateRowStyles: { fillColor: [251, 248, 243] },
        margin: { left: 40, right: 40 },
        didDrawPage: () => {
          doc.setFontSize(8); doc.setTextColor(150);
          doc.text(`Página ${doc.internal.getNumberOfPages()}`, doc.internal.pageSize.getWidth() - 80, doc.internal.pageSize.getHeight() - 20);
        }
      });
      doc.save(`${nomeArquivo}.pdf`);
    },

    // Linhas padronizadas para relatórios de convidados
    linhasConvidados(convites) {
      return convites.map(c => ({
        "Convite / família": c.grupo,
        "Titular": c.titular,
        "Telefone": c.resposta?.telefone || c.telefone || "",
        "Autorizadas": c.qtd_autorizada,
        "Situação": Admin.SITUACAO[c.situacao],
        "Confirmadas": c.resposta?.presenca ? c.resposta.qtd_confirmada : 0,
        "Quem vai": c.resposta?.presenca ? [c.resposta.nome, ...(c.resposta.acompanhantes || [])].join(", ") : "",
        "Observações": [c.observacoes, c.resposta?.observacoes].filter(Boolean).join(" | "),
        "Respondido em": c.resposta ? U.formatarDataHora(c.resposta.atualizado_em) : "",
        "Link do convite": Admin.linkConvite(c.codigo)
      }));
    },

    dataArquivo() { return new Date().toISOString().slice(0, 10); }
  };

  function montarLayout() {
    const painel = $(".painel");
    const pagina = painel.dataset.pagina;
    const aside = document.createElement("aside");
    aside.className = "lateral";
    aside.id = "lateral";
    aside.innerHTML = `
      <a class="lateral__marca" href="dashboard.html">
        <img src="../assets/images/monograma-claro.webp" alt="">
        <span><strong>Ian & Laura Regina</strong><small>Painel do casamento</small></span>
      </a>
      <nav aria-label="Menu do painel">
        ${MENU.map(([id, href, ic, nome]) =>
          `<a href="${href}" ${id === pagina ? 'aria-current="page"' : ""}><i class="fa-solid ${ic}" aria-hidden="true"></i>${nome}</a>`).join("")}
      </nav>
      <div class="lateral__rodape">
        <a href="../" target="_blank" rel="noopener"><i class="fa-solid fa-arrow-up-right-from-square"></i> Ver o convite</a>
        <button type="button" id="btn-sair"><i class="fa-solid fa-right-from-bracket"></i> Sair</button>
        <p class="lateral__usuario">${esc(Admin.usuario?.email || "")}</p>
      </div>`;
    painel.prepend(aside);
    $("#btn-sair").addEventListener("click", Admin.sair);

    const topo = $(".barra-topo");
    const botao = document.createElement("button");
    botao.className = "btn-menu"; botao.type = "button"; botao.setAttribute("aria-label", "Abrir menu");
    botao.innerHTML = `<i class="fa-solid fa-bars"></i>`;
    topo.prepend(botao);
    botao.addEventListener("click", e => { e.stopPropagation(); aside.classList.toggle("aberta"); });
    document.addEventListener("click", e => {
      if (aside.classList.contains("aberta") && !aside.contains(e.target)) aside.classList.remove("aberta");
    });
    document.body.hidden = false;
  }

  window.Admin = Admin;
})();
