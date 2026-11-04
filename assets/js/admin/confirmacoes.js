// ============================================================
//  PAINEL — Confirmações de presença
// ============================================================
Admin.pronto(async () => {
  const { esc } = U;
  const $ = s => document.querySelector(s);
  let convites = [];
  let filtro = "todos";
  let busca = "";

  await Admin.carregarConfig();

  async function recarregar() { convites = await Admin.carregarConvites(); desenhar(); }

  function filtrados() {
    const t = busca.toLowerCase();
    return convites
      .filter(c => (filtro === "todos" || c.situacao === filtro) &&
        (!t || [c.grupo, c.titular, c.resposta?.nome, ...(c.resposta?.acompanhantes || [])].join(" ").toLowerCase().includes(t)))
      .sort((a, b) => (b.resposta ? new Date(b.resposta.atualizado_em) : 0) - (a.resposta ? new Date(a.resposta.atualizado_em) : 0));
  }

  function desenhar() {
    const cont = s => convites.filter(c => s === "todos" || c.situacao === s).length;
    const pessoas = convites.filter(c => c.situacao === "sim").reduce((s, c) => s + c.resposta.qtd_confirmada, 0);
    $("#filtro").innerHTML = [["todos", "Todos"], ["sim", "Confirmados"], ["nao", "Não vão"], ["pendente", "Pendentes"]]
      .map(([v, n]) => `<button type="button" data-f="${v}" aria-pressed="${v === filtro}">${n}<span>${cont(v)}</span></button>`).join("") +
      `<button type="button" disabled style="cursor:default">Total de pessoas confirmadas: <strong>&nbsp;${pessoas}</strong></button>`;

    const lista = filtrados();
    if (!lista.length) { $("#tabela").innerHTML = `<p class="vazio">${convites.length ? "Nada encontrado com esse filtro." : "Nenhum convite cadastrado ainda."}</p>`; return; }

    $("#tabela").innerHTML = `<table class="tabela"><thead><tr>
      <th>Convidado</th><th>Família / grupo</th><th>Telefone</th><th class="num">Pessoas</th>
      <th>Acompanhantes</th><th>Situação</th><th>Data</th><th><span class="sr">Ações</span></th></tr></thead>
      <tbody>${lista.map(c => {
        const r = c.resposta;
        return `<tr>
          <td class="celula-titulo"><span class="forte">${esc(r?.nome || c.titular)}</span>
            ${r?.origem === "admin" ? `<br><span class="sub"><i class="fa-solid fa-user-pen"></i> alterado no painel</span>` : ""}
            ${r?.observacoes ? `<br><span class="sub"><i class="fa-regular fa-comment"></i> ${esc(r.observacoes)}</span>` : ""}</td>
          <td data-r="Família">${esc(c.grupo)}</td>
          <td data-r="Telefone" style="white-space:nowrap">${esc(r?.telefone || c.telefone || "—")}</td>
          <td class="num" data-r="Pessoas" style="white-space:nowrap">${r ? (r.presenca ? r.qtd_confirmada : 0) : "—"} <span class="sub">de ${c.qtd_autorizada}</span></td>
          <td data-r="Acompanhantes">${r?.acompanhantes?.length ? esc(r.acompanhantes.join(", ")) : "<span class='sub'>—</span>"}</td>
          <td data-r="Situação">${Admin.etiquetaSituacao(c.situacao)}</td>
          <td data-r="Data"><span class="sub">${r ? esc(U.formatarDataHora(r.atualizado_em)) : "—"}</span></td>
          <td><div class="acoes-linha">
            <button class="btn btn--pequeno" type="button" data-acao="editar" data-id="${c.id}"><i class="fa-solid fa-pen"></i> ${r ? "Alterar" : "Registrar"}</button>
            ${r ? `<button class="btn btn--pequeno btn--icone btn--perigo" type="button" data-acao="limpar" data-id="${c.id}" aria-label="Apagar resposta"><i class="fa-solid fa-rotate-left"></i></button>` : ""}
          </div></td></tr>`;
      }).join("")}</tbody></table>`;
  }

  async function editar(c) {
    const r = c.resposta || {};
    const max = c.qtd_autorizada;
    const ok = await Admin.janela({
      titulo: `Confirmação: ${c.grupo}`,
      corpo: `<p class="dica" style="margin:0 0 1rem">Convite para até <strong>${max}</strong> pessoa(s). Use quando o convidado responder por outro meio (telefone, pessoalmente).</p>
        <div class="campos campos--2">
          <label class="campo"><span>Nome de quem respondeu *</span><input name="nome" maxlength="120" value="${esc(r.nome || c.titular)}"></label>
          <label class="campo"><span>Telefone</span><input name="telefone" maxlength="16" value="${esc(r.telefone || c.telefone || "")}"></label>
          <label class="campo"><span>Vai comparecer?</span>
            <select name="presenca"><option value="sim" ${r.presenca !== false ? "selected" : ""}>Sim</option><option value="nao" ${r.presenca === false ? "selected" : ""}>Não</option></select></label>
          <label class="campo" data-qtd><span>Quantidade de pessoas (máx. ${max})</span>
            <input name="qtd" type="number" min="1" max="${max}" value="${r.presenca ? r.qtd_confirmada : 1}"></label>
          <label class="campo campo--inteiro" data-qtd><span>Acompanhantes (um nome por linha, sem contar quem respondeu)</span>
            <textarea name="acompanhantes" rows="3">${esc((r.acompanhantes || []).join("\n"))}</textarea></label>
          <label class="campo campo--inteiro"><span>Observações</span><textarea name="observacoes" maxlength="1000">${esc(r.observacoes || "")}</textarea></label>
        </div>`,
      aoAbrir: f => {
        const sinc = () => f.querySelectorAll("[data-qtd]").forEach(e => (e.hidden = f.presenca.value !== "sim"));
        f.presenca.addEventListener("change", sinc); sinc();
        f.telefone.addEventListener("input", e => (e.target.value = U.mascaraTelefone(e.target.value)));
      },
      aoConfirmar: async f => {
        const presenca = f.presenca.value === "sim";
        const qtd = presenca ? parseInt(f.qtd.value, 10) : 0;
        const acomp = presenca ? f.acompanhantes.value.split(/\n/).map(s => s.trim()).filter(Boolean) : [];
        if (f.nome.value.trim().length < 2) throw new Error("Informe o nome de quem respondeu.");
        if (presenca && !(qtd >= 1 && qtd <= max)) throw new Error(`A quantidade deve ser entre 1 e ${max}.`);
        if (presenca && acomp.length !== qtd - 1) throw new Error(`Informe ${qtd - 1} acompanhante(s), um por linha (informados: ${acomp.length}).`);
        const { error } = await db.from("confirmacoes").upsert({
          convite_id: c.id, nome: f.nome.value.trim(), telefone: f.telefone.value.trim() || null,
          presenca, qtd_confirmada: qtd, acompanhantes: acomp,
          observacoes: f.observacoes.value.trim() || null, origem: "admin"
        }, { onConflict: "convite_id" });
        if (error) throw error;
      }
    });
    if (ok) { Admin.aviso("Confirmação salva."); recarregar(); }
  }

  async function limpar(c) {
    if (!await Admin.confirmar(`Apagar a resposta de <strong>${esc(c.grupo)}</strong>? O convite volta para "Pendente" e o convidado poderá responder de novo pelo link.`, "Apagar resposta")) return;
    const { error } = await db.from("confirmacoes").delete().eq("convite_id", c.id);
    if (error) return Admin.aviso(Admin.mensagemErro(error), true);
    Admin.aviso("Resposta apagada."); recarregar();
  }

  $("#busca").addEventListener("input", e => { busca = e.target.value; desenhar(); });
  $("#filtro").addEventListener("click", e => { const b = e.target.closest("[data-f]"); if (b) { filtro = b.dataset.f; desenhar(); } });
  $("#tabela").addEventListener("click", e => {
    const b = e.target.closest("[data-acao]"); if (!b) return;
    const c = convites.find(x => x.id === b.dataset.id);
    if (b.dataset.acao === "editar") editar(c);
    if (b.dataset.acao === "limpar") limpar(c);
  });
  $("#btn-excel").addEventListener("click", () =>
    Admin.excel(`confirmacoes-${Admin.dataArquivo()}`, [{ nome: "Confirmações", linhas: Admin.linhasConvidados(filtrados()) }]));
  $("#btn-pdf").addEventListener("click", () => {
    const l = Admin.linhasConvidados(filtrados()).map(({ "Link do convite": _, ...r }) => r);
    Admin.pdf(`confirmacoes-${Admin.dataArquivo()}`, "Confirmações de presença", l);
  });

  await recarregar();
});
