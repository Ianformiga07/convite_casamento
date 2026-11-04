// ============================================================
//  PAINEL — Conteúdo do convite (textos, história, programação, FAQ)
// ============================================================
Admin.pronto(async () => {
  const { esc } = U;
  const $ = s => document.querySelector(s);
  const area = $("#aba-conteudo");

  // ---------- Aba: textos ----------
  const TEXTOS = [
    ["Abertura do convite", [
      ["frase_abertura", "Frase da abertura", "area"]
    ]],
    ["Nossa história", [
      ["historia_titulo", "Subtítulo (ex.: Juntos desde 2015)"],
      ["historia_texto", "Texto de apresentação", "area"],
      ["historia_foto_url", "Foto principal do casal", "imagem"]
    ]],
    ["O grande dia", [
      ["aviso_chegada", "Aviso de chegada", "area"]
    ]],
    ["Lista de presentes", [
      ["presentes_texto", "Texto de apresentação da lista", "area"]
    ]],
    ["Confirmação de presença", [
      ["rsvp_texto", "Texto de apresentação", "area"]
    ]],
    ["Mensagem final", [
      ["final_titulo", "Título (em caligrafia)"],
      ["final_texto", "Mensagem de agradecimento", "area"],
      ["assinatura", "Assinatura"]
    ]]
  ];

  async function abaTextos() {
    const c = await Admin.carregarConfig();
    area.innerHTML = `<form id="form-textos">${TEXTOS.map(([titulo, campos]) => `
      <section class="cartao"><h2>${titulo}</h2><div class="campos">${campos.map(([k, rot, tipo]) =>
        tipo === "imagem" ? Admin.htmlCampoImagem(k, rot, c[k] || "", true)
        : tipo === "area" ? `<label class="campo"><span>${rot}</span><textarea name="${k}" rows="3" maxlength="1500">${esc(c[k] || "")}</textarea></label>`
        : `<label class="campo"><span>${rot}</span><input name="${k}" maxlength="200" value="${esc(c[k] || "")}"></label>`).join("")}
      </div></section>`).join("")}
      <div style="position:sticky;bottom:0;padding:1rem 0;background:linear-gradient(transparent,var(--papel) 30%)">
        <button class="btn btn--principal" type="submit"><i class="fa-solid fa-floppy-disk"></i> Salvar textos</button></div>
    </form>`;
    const f = $("#form-textos");
    Admin.campoImagem(f, "historia_foto_url", "historia");
    f.addEventListener("submit", async e => {
      e.preventDefault();
      const dados = {};
      TEXTOS.flatMap(([, cs]) => cs).forEach(([k]) => (dados[k] = f.elements[k].value.trim()));
      try { await Admin.salvarConfig(dados); Admin.aviso("Textos salvos. O convite já está atualizado."); }
      catch (ex) { Admin.aviso(Admin.mensagemErro(ex), true); }
    });
  }

  // ---------- Listas editáveis ----------
  const LISTAS = {
    historia: {
      tabela: "historia", titulo: "Linha do tempo", novo: "Novo momento",
      dica: "Momentos importantes desde 2015. Aparecem em ordem na seção “Nossa história”.",
      resumo: i => [`${i.ano} · ${i.titulo}`, i.texto],
      campos: i => `<div class="campos campos--2">
        <label class="campo"><span>Ano ou data *</span><input name="ano" maxlength="20" required value="${esc(i.ano || "")}" placeholder="Ex.: 2015"></label>
        <label class="campo"><span>Título *</span><input name="titulo" maxlength="120" required value="${esc(i.titulo || "")}" placeholder="Ex.: O primeiro encontro"></label>
        <label class="campo campo--inteiro"><span>Texto</span><textarea name="texto" maxlength="2000">${esc(i.texto || "")}</textarea></label>
        ${Admin.htmlCampoImagem("foto_url", "Foto (opcional)", i.foto_url || "", true)}</div>`,
      aoAbrir: f => Admin.campoImagem(f, "foto_url", "historia"),
      ler: f => {
        if (!f.ano.value.trim() || !f.titulo.value.trim()) throw new Error("Preencha ano e título.");
        return { ano: f.ano.value.trim(), titulo: f.titulo.value.trim(), texto: f.texto.value.trim() || null, foto_url: f.foto_url.value || null };
      }
    },
    programacao: {
      tabela: "programacao", titulo: "Programação do dia", novo: "Novo item",
      dica: "Horários e atividades do grande dia (cerimônia, recepção, jantar, festa…).",
      resumo: i => [`${i.horario} · ${i.titulo}`, i.descricao],
      campos: i => `<div class="campos campos--2">
        <label class="campo"><span>Horário *</span><input name="horario" maxlength="20" required value="${esc(i.horario || "")}" placeholder="Ex.: 18:00"></label>
        <label class="campo"><span>Atividade *</span><input name="titulo" maxlength="120" required value="${esc(i.titulo || "")}" placeholder="Ex.: Jantar"></label>
        <label class="campo campo--inteiro"><span>Descrição</span><input name="descricao" maxlength="500" value="${esc(i.descricao || "")}"></label>
        <label class="campo campo--inteiro"><span>Ícone</span><select name="icone">${[
          ["fa-door-open", "Chegada"], ["fa-ring", "Cerimônia / alianças"], ["fa-champagne-glasses", "Brinde / recepção"],
          ["fa-utensils", "Jantar"], ["fa-cake-candles", "Bolo"], ["fa-music", "Festa / música"], ["fa-camera", "Fotos"],
          ["fa-heart", "Coração"], ["fa-moon", "Encerramento"]].map(([v, n]) =>
          `<option value="${v}" ${i.icone === v ? "selected" : ""}>${n}</option>`).join("")}</select></label></div>`,
      ler: f => {
        if (!f.horario.value.trim() || !f.titulo.value.trim()) throw new Error("Preencha horário e atividade.");
        return { horario: f.horario.value.trim(), titulo: f.titulo.value.trim(), descricao: f.descricao.value.trim() || null, icone: f.icone.value };
      }
    },
    faq: {
      tabela: "faq", titulo: "Perguntas frequentes", novo: "Nova pergunta",
      dica: "Ex.: estacionamento, crianças, horário de chegada, prazo de confirmação.",
      resumo: i => [i.pergunta, i.resposta],
      campos: i => `<div class="campos">
        <label class="campo"><span>Pergunta *</span><input name="pergunta" maxlength="200" required value="${esc(i.pergunta || "")}"></label>
        <label class="campo"><span>Resposta *</span><textarea name="resposta" rows="4" maxlength="2000" required>${esc(i.resposta || "")}</textarea></label></div>`,
      ler: f => {
        if (!f.pergunta.value.trim() || !f.resposta.value.trim()) throw new Error("Preencha pergunta e resposta.");
        return { pergunta: f.pergunta.value.trim(), resposta: f.resposta.value.trim() };
      }
    }
  };

  async function abaLista(chave) {
    const L = LISTAS[chave];
    const { data, error } = await db.from(L.tabela).select("*").order("ordem").order("criado_em");
    if (error) throw error;
    const itens = data || [];
    area.innerHTML = `<section class="cartao">
      <div style="display:flex;gap:1rem;align-items:start;flex-wrap:wrap;margin-bottom:1rem">
        <div><h2 style="margin:0">${L.titulo}</h2><p class="dica">${L.dica}</p></div>
        <button class="btn btn--principal" type="button" id="btn-novo-item" style="margin-left:auto"><i class="fa-solid fa-plus"></i> ${L.novo}</button>
      </div>
      <div class="itens-lista">${itens.length ? itens.map((i, n) => {
        const [t, s] = L.resumo(i);
        return `<div class="item-lista">
          <div class="ordem"><button type="button" data-mover="-1" data-n="${n}" ${n === 0 ? "disabled" : ""} aria-label="Subir"><i class="fa-solid fa-chevron-up"></i></button>
            <button type="button" data-mover="1" data-n="${n}" ${n === itens.length - 1 ? "disabled" : ""} aria-label="Descer"><i class="fa-solid fa-chevron-down"></i></button></div>
          <div><h3>${esc(t)}</h3>${s ? `<p>${esc(s.length > 140 ? s.slice(0, 140) + "…" : s)}</p>` : ""}</div>
          <div class="acoes-linha">
            <button class="btn btn--pequeno" type="button" data-editar="${n}"><i class="fa-solid fa-pen"></i> Editar</button>
            <button class="btn btn--pequeno btn--icone btn--perigo" type="button" data-excluir="${n}" aria-label="Excluir"><i class="fa-solid fa-trash"></i></button>
          </div></div>`;
      }).join("") : `<p class="vazio">Nada cadastrado ainda. ${chave === "historia" ? "Enquanto a linha do tempo estiver vazia, o convite mostra só o texto de apresentação." : ""}</p>`}</div>
    </section>`;

    const editar = async item => {
      const ok = await Admin.janela({
        titulo: item ? "Editar" : L.novo, corpo: L.campos(item || {}), aoAbrir: L.aoAbrir,
        aoConfirmar: async f => {
          const dados = L.ler(f);
          const q = item ? db.from(L.tabela).update(dados).eq("id", item.id)
            : db.from(L.tabela).insert({ ...dados, ordem: (itens.at(-1)?.ordem || 0) + 1 });
          const { error } = await q; if (error) throw error;
        }
      });
      if (ok) { Admin.aviso("Salvo."); abaLista(chave); }
    };

    $("#btn-novo-item").addEventListener("click", () => editar(null));
    area.querySelectorAll("[data-editar]").forEach(b => b.addEventListener("click", () => editar(itens[b.dataset.editar])));
    area.querySelectorAll("[data-excluir]").forEach(b => b.addEventListener("click", async () => {
      const item = itens[b.dataset.excluir];
      if (!await Admin.confirmar("Excluir este item?", "Excluir")) return;
      const { error } = await db.from(L.tabela).delete().eq("id", item.id);
      if (error) return Admin.aviso(Admin.mensagemErro(error), true);
      abaLista(chave);
    }));
    area.querySelectorAll("[data-mover]").forEach(b => b.addEventListener("click", async () => {
      const n = +b.dataset.n, m = n + +b.dataset.mover;
      const nova = [...itens]; [nova[n], nova[m]] = [nova[m], nova[n]];
      const res = await Promise.all(nova.map((it, idx) => db.from(L.tabela).update({ ordem: idx + 1 }).eq("id", it.id)));
      const erro = res.find(r => r.error);
      if (erro) Admin.aviso(Admin.mensagemErro(erro.error), true);
      abaLista(chave);
    }));
  }

  // ---------- Abas ----------
  async function abrir(aba) {
    document.querySelectorAll("[data-aba]").forEach(b => b.setAttribute("aria-selected", b.dataset.aba === aba));
    area.innerHTML = `<p class="carregando-tela">Carregando…</p>`;
    try { aba === "textos" ? await abaTextos() : await abaLista(aba); }
    catch (e) { area.innerHTML = `<p class="erro">${esc(Admin.mensagemErro(e))}</p>`; }
    history.replaceState(null, "", "#" + aba);
  }
  document.querySelectorAll("[data-aba]").forEach(b => b.addEventListener("click", () => abrir(b.dataset.aba)));
  const ABAS = ["textos", "historia", "programacao", "faq"];
  const abaDoEndereco = () => (ABAS.includes(location.hash.slice(1)) ? location.hash.slice(1) : "textos");
  window.addEventListener("hashchange", () => abrir(abaDoEndereco()));
  await abrir(abaDoEndereco());
});
