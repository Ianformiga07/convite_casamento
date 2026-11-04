// ============================================================
//  PAINEL — Relatórios (Excel e PDF)
// ============================================================
Admin.pronto(async () => {
  await Admin.carregarConfig();
  const [convites, pres] = await Promise.all([
    Admin.carregarConvites(),
    db.from("presentes").select("*").order("ordem").order("nome")
  ]);
  if (pres.error) throw pres.error;
  const presentes = pres.data || [];

  const confirmados = convites.filter(c => c.situacao === "sim");
  const totalPessoas = confirmados.reduce((s, c) => s + c.resposta.qtd_confirmada, 0);

  // Lista nominal de todas as pessoas confirmadas (uma linha por pessoa)
  const pessoas = confirmados.flatMap(c => [c.resposta.nome, ...(c.resposta.acompanhantes || [])].map((n, i) => ({
    "Nome": n, "Convite / família": c.grupo, "Tipo": i === 0 ? "Titular da resposta" : "Acompanhante",
    "Telefone": i === 0 ? c.resposta.telefone || "" : ""
  }))).sort((a, b) => a.Nome.localeCompare(b.Nome, "pt-BR"));

  const linhaPresente = p => ({
    "Presente": p.nome, "Categoria": p.categoria, "Valor estimado": p.valor ? U.formatarMoeda(p.valor) : "",
    ...(p.status === "reservado" ? { "Reservado por": p.reservado_por, "Reservado em": U.formatarDataHora(p.reservado_em) } : {})
  });

  document.getElementById("resumo").textContent =
    `${convites.length} convites · ${confirmados.length} confirmados · ${totalPessoas} pessoas confirmadas · ` +
    `${presentes.filter(p => p.status === "reservado").length} de ${presentes.length} presentes reservados`;

  const n = (q, um, varios) => `${q} ${q === 1 ? um : varios}`;
  const R = [
    ["fa-users", "Lista geral de convidados", n(convites.length, "convite", "convites"), () => Admin.linhasConvidados(convites), "convidados-geral"],
    ["fa-user-check", "Pessoas confirmadas", `${n(totalPessoas, "pessoa", "pessoas")}, uma por linha (lista para a portaria)`, () => pessoas, "pessoas-confirmadas", `Total: ${totalPessoas} pessoas`],
    ["fa-circle-check", "Convites confirmados", n(confirmados.length, "convite", "convites"), () => Admin.linhasConvidados(confirmados), "convites-confirmados"],
    ["fa-hourglass-half", "Ainda não responderam", n(convites.filter(c => c.situacao === "pendente").length, "convite", "convites"), () => Admin.linhasConvidados(convites.filter(c => c.situacao === "pendente")), "convites-pendentes"],
    ["fa-circle-xmark", "Não comparecerão", n(convites.filter(c => c.situacao === "nao").length, "convite", "convites"), () => Admin.linhasConvidados(convites.filter(c => c.situacao === "nao")), "convites-nao-vao"],
    ["fa-gift", "Presentes reservados", n(presentes.filter(p => p.status === "reservado").length, "presente", "presentes"), () => presentes.filter(p => p.status === "reservado").map(linhaPresente), "presentes-reservados"],
    ["fa-box-open", "Presentes disponíveis", n(presentes.filter(p => p.status === "disponivel").length, "presente", "presentes"), () => presentes.filter(p => p.status === "disponivel").map(linhaPresente), "presentes-disponiveis"]
  ];

  const box = document.getElementById("relatorios");
  box.innerHTML = R.map(([ic, t, s], i) => `<div class="relatorio">
    <i class="fa-solid ${ic}" aria-hidden="true"></i>
    <div><h3>${t}</h3><p>${s}</p></div>
    <div class="acoes-linha">
      <button class="btn btn--pequeno" type="button" data-x="${i}"><i class="fa-regular fa-file-excel"></i> Excel</button>
      <button class="btn btn--pequeno" type="button" data-p="${i}"><i class="fa-regular fa-file-pdf"></i> PDF</button>
    </div></div>`).join("");

  box.addEventListener("click", e => {
    const b = e.target.closest("[data-x],[data-p]"); if (!b) return;
    const [, titulo, sub, gerar, arquivo, resumo] = R[b.dataset.x ?? b.dataset.p];
    const nome = `${arquivo}-${Admin.dataArquivo()}`;
    if (b.dataset.x !== undefined) Admin.excel(nome, [{ nome: titulo, linhas: gerar() }]);
    else Admin.pdf(nome, titulo, gerar().map(({ "Link do convite": _, ...r }) => r), resumo || sub);
  });
});
