// ============================================================
//  PAINEL — Convidados (convites, links individuais, exportação)
// ============================================================
Admin.pronto(async () => {
  const { esc } = U;
  const $ = s => document.querySelector(s);
  let convites = [];
  let filtro = "todos";
  let busca = "";

  await Admin.carregarConfig();

  async function recarregar() {
    convites = await Admin.carregarConvites();
    desenhar();
  }

  function filtrados() {
    const t = busca.toLowerCase();
    return convites.filter(c =>
      (filtro === "todos" || c.situacao === filtro) &&
      (!t || [c.grupo, c.titular, c.telefone, c.observacoes, ...(c.resposta?.acompanhantes || [])]
        .join(" ").toLowerCase().includes(t)));
  }

  function desenhar() {
    const cont = s => convites.filter(c => s === "todos" || c.situacao === s).length;
    $("#filtro").innerHTML = [["todos", "Todos"], ["sim", "Confirmados"], ["nao", "Não vão"], ["pendente", "Pendentes"]]
      .map(([v, n]) => `<button type="button" data-f="${v}" aria-pressed="${v === filtro}">${n}<span>${cont(v)}</span></button>`).join("");

    const lista = filtrados();
    if (!convites.length) {
      $("#tabela").innerHTML = `<div class="vazio"><p>Nenhum convite cadastrado ainda.</p>
        <button class="btn btn--principal" type="button" data-acao="novo"><i class="fa-solid fa-plus"></i> Cadastrar o primeiro convite</button></div>`;
      return;
    }
    if (!lista.length) { $("#tabela").innerHTML = `<p class="vazio">Nenhum convite encontrado com esse filtro.</p>`; return; }

    $("#tabela").innerHTML = `<table class="tabela"><thead><tr>
        <th>Convite</th><th>Telefone</th><th class="num">Autorizadas</th><th>Situação</th><th>Quem vai</th><th><span class="sr">Ações</span></th>
      </tr></thead><tbody>${lista.map(c => {
        const r = c.resposta;
        const quem = r?.presenca ? [r.nome, ...(r.acompanhantes || [])] : [];
        return `<tr>
          <td class="celula-titulo"><span class="forte">${esc(c.grupo)}</span><br><span class="sub">${esc(c.titular)}</span>
            ${c.observacoes ? `<br><span class="sub"><i class="fa-regular fa-note-sticky"></i> ${esc(c.observacoes)}</span>` : ""}</td>
          <td data-r="Telefone" style="white-space:nowrap">${esc(c.telefone || "—")}</td>
          <td class="num" data-r="Autorizadas">${c.qtd_autorizada}</td>
          <td data-r="Situação">${Admin.etiquetaSituacao(c.situacao)}${r?.presenca ? ` <span class="sub">${r.qtd_confirmada} pessoa(s)</span>` : ""}</td>
          <td data-r="Quem vai">${quem.length ? esc(quem.join(", ")) : "<span class='sub'>—</span>"}</td>
          <td><div class="acoes-linha">
            <button class="btn btn--pequeno" type="button" data-acao="copiar" data-id="${c.id}" title="Copiar link do convite"><i class="fa-solid fa-link"></i> Link</button>
            <a class="btn btn--pequeno" href="${esc(Admin.linkWhatsApp(c))}" target="_blank" rel="noopener" title="Enviar pelo WhatsApp"><i class="fa-brands fa-whatsapp"></i> Enviar</a>
            <button class="btn btn--pequeno btn--icone" type="button" data-acao="editar" data-id="${c.id}" aria-label="Editar ${esc(c.grupo)}"><i class="fa-solid fa-pen"></i></button>
            <button class="btn btn--pequeno btn--icone btn--perigo" type="button" data-acao="excluir" data-id="${c.id}" aria-label="Excluir ${esc(c.grupo)}"><i class="fa-solid fa-trash"></i></button>
          </div></td></tr>`;
      }).join("")}</tbody></table>`;
  }

  // ---------- Cadastro / edição ----------
  function formulario(c = {}) {
    return `<div class="campos campos--2">
      <label class="campo campo--inteiro"><span>Nome do convite (família ou grupo) *</span>
        <input name="grupo" maxlength="120" required value="${esc(c.grupo || "")}" placeholder="Ex.: Família Silva"></label>
      <label class="campo"><span>Titular (responsável) *</span>
        <input name="titular" maxlength="120" required value="${esc(c.titular || "")}" placeholder="Ex.: João Silva"></label>
      <label class="campo"><span>Telefone / WhatsApp</span>
        <input name="telefone" inputmode="tel" maxlength="16" value="${esc(c.telefone || "")}" placeholder="(63) 99999-9999"></label>
      <label class="campo"><span>Quantidade de pessoas autorizadas *</span>
        <input name="qtd_autorizada" type="number" min="1" max="30" required value="${c.qtd_autorizada || 1}"></label>
      <label class="campo campo--inteiro"><span>Observações internas (só os noivos veem)</span>
        <textarea name="observacoes" maxlength="1000">${esc(c.observacoes || "")}</textarea></label>
    </div>
    ${c.codigo ? `<p class="dica">Link deste convite: <a href="${esc(Admin.linkConvite(c.codigo))}" target="_blank" rel="noopener">${esc(Admin.linkConvite(c.codigo))}</a></p>` : ""}`;
  }

  function lerFormulario(f) {
    const dados = {
      grupo: f.grupo.value.trim(),
      titular: f.titular.value.trim(),
      telefone: f.telefone.value.trim() || null,
      qtd_autorizada: parseInt(f.qtd_autorizada.value, 10),
      observacoes: f.observacoes.value.trim() || null
    };
    if (!dados.grupo) throw new Error("Informe o nome do convite.");
    if (!dados.titular) throw new Error("Informe o titular.");
    if (!(dados.qtd_autorizada >= 1 && dados.qtd_autorizada <= 30)) throw new Error("A quantidade autorizada deve ser entre 1 e 30.");
    if (dados.telefone && dados.telefone.replace(/\D/g, "").length < 10) throw new Error("Telefone incompleto: informe com DDD.");
    return dados;
  }

  function mascarar(f) { f.telefone.addEventListener("input", e => (e.target.value = U.mascaraTelefone(e.target.value))); }

  async function novo() {
    const ok = await Admin.janela({
      titulo: "Novo convite", corpo: formulario(), botao: "Cadastrar", aoAbrir: mascarar,
      aoConfirmar: async f => {
        const { error } = await db.from("convites").insert(lerFormulario(f));
        if (error) throw error;
      }
    });
    if (ok) { Admin.aviso("Convite cadastrado."); recarregar(); }
  }

  async function editar(c) {
    const ok = await Admin.janela({
      titulo: "Editar convite", corpo: formulario(c), aoAbrir: mascarar,
      aoConfirmar: async f => {
        const { error } = await db.from("convites").update(lerFormulario(f)).eq("id", c.id);
        if (error) throw error;
      }
    });
    if (ok) { Admin.aviso("Convite atualizado."); recarregar(); }
  }

  async function excluir(c) {
    const ok = await Admin.confirmar(
      `Excluir o convite <strong>${esc(c.grupo)}</strong>? ${c.resposta ? "A confirmação de presença dele também será apagada. " : ""}O link deixará de funcionar.`,
      "Excluir");
    if (!ok) return;
    const { error } = await db.from("convites").delete().eq("id", c.id);
    if (error) return Admin.aviso(Admin.mensagemErro(error), true);
    Admin.aviso("Convite excluído."); recarregar();
  }

  // ---------- Importar lista colada ----------
  async function importar() {
    const ok = await Admin.janela({
      titulo: "Importar lista de convites", botao: "Importar", largura: "44rem",
      corpo: `<p class="dica" style="margin:0 0 .75rem">Cole uma linha por convite, com os campos separados por <strong>ponto e vírgula</strong> ou <strong>tabulação</strong> (copiando do Excel):<br>
        <code>Nome do convite; Titular; Telefone; Quantidade</code></p>
        <label class="campo"><span>Lista</span>
          <textarea name="lista" rows="10" placeholder="Família Silva; João Silva; (63) 99999-0000; 4&#10;Ana Souza; Ana Souza; (63) 98888-1111; 1"></textarea></label>`,
      aoConfirmar: async f => {
        const linhas = f.lista.value.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (!linhas.length) throw new Error("Cole pelo menos uma linha.");
        const registros = linhas.map((l, i) => {
          const p = l.split(/\t|;/).map(x => x.trim());
          const qtd = parseInt(p[3] || "1", 10);
          if (!p[0]) throw new Error(`Linha ${i + 1}: falta o nome do convite.`);
          if (!(qtd >= 1 && qtd <= 30)) throw new Error(`Linha ${i + 1}: quantidade inválida.`);
          return { grupo: p[0], titular: p[1] || p[0], telefone: p[2] ? U.mascaraTelefone(p[2]) : null, qtd_autorizada: qtd };
        });
        const { error } = await db.from("convites").insert(registros);
        if (error) throw error;
        return registros.length;
      }
    });
    if (ok) { Admin.aviso(`${ok} convite(s) importado(s).`); recarregar(); }
  }

  // ---------- Eventos ----------
  $("#btn-novo").addEventListener("click", novo);
  $("#btn-importar").addEventListener("click", importar);
  $("#busca").addEventListener("input", e => { busca = e.target.value; desenhar(); });
  $("#filtro").addEventListener("click", e => {
    const b = e.target.closest("[data-f]"); if (b) { filtro = b.dataset.f; desenhar(); }
  });
  $("#tabela").addEventListener("click", e => {
    const b = e.target.closest("[data-acao]"); if (!b) return;
    if (b.dataset.acao === "novo") return novo();
    const c = convites.find(x => x.id === b.dataset.id);
    if (b.dataset.acao === "copiar") Admin.copiar(Admin.linkConvite(c.codigo));
    if (b.dataset.acao === "editar") editar(c);
    if (b.dataset.acao === "excluir") excluir(c);
  });
  const nomeFiltro = { todos: "todos", sim: "confirmados", nao: "nao-vao", pendente: "pendentes" };
  $("#btn-excel").addEventListener("click", () =>
    Admin.excel(`convidados-${nomeFiltro[filtro]}-${Admin.dataArquivo()}`, [{ nome: "Convidados", linhas: Admin.linhasConvidados(filtrados()) }]));
  $("#btn-pdf").addEventListener("click", () => {
    const l = Admin.linhasConvidados(filtrados()).map(({ "Link do convite": _, "Respondido em": __, ...r }) => r);
    Admin.pdf(`convidados-${nomeFiltro[filtro]}-${Admin.dataArquivo()}`, `Convidados (${nomeFiltro[filtro].replace("-", " ")})`, l,
      `${l.length} convite(s)`);
  });

  await recarregar();
});
