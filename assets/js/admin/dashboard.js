// ============================================================
//  PAINEL — Visão geral (indicadores e gráficos)
// ============================================================
Admin.pronto(async () => {
  const { esc } = U;
  const [config, convites, presentesRes] = await Promise.all([
    Admin.carregarConfig(),
    Admin.carregarConvites(),
    db.from("presentes").select("id,nome,status,reservado_por,reservado_em").order("reservado_em", { ascending: false, nullsFirst: false })
  ]);
  if (presentesRes.error) throw presentesRes.error;
  const presentes = presentesRes.data || [];

  // ---------- Números ----------
  const total = convites.length;
  const autorizadas = convites.reduce((s, c) => s + c.qtd_autorizada, 0);
  const sim = convites.filter(c => c.situacao === "sim");
  const nao = convites.filter(c => c.situacao === "nao");
  const pend = convites.filter(c => c.situacao === "pendente");
  const pessoasConf = sim.reduce((s, c) => s + c.resposta.qtd_confirmada, 0);
  const pessoasPend = pend.reduce((s, c) => s + c.qtd_autorizada, 0);
  const pctResp = total ? Math.round((sim.length + nao.length) / total * 100) : 0;
  const pDisp = presentes.filter(p => p.status === "disponivel").length;
  const pRes = presentes.filter(p => p.status === "reservado").length;
  const pInd = presentes.filter(p => p.status === "indisponivel").length;

  const casamento = U.momentoCasamento(config);
  if (casamento) {
    const dias = Math.ceil((casamento - Date.now()) / 86400000);
    const prazo = config.rsvp_prazo ? Math.ceil((new Date(config.rsvp_prazo + "T23:59:59-03:00") - Date.now()) / 86400000) : null;
    document.getElementById("contagem-dias").textContent =
      (dias > 0 ? `Faltam ${dias} dias para o casamento` : "O grande dia chegou!") +
      (prazo !== null ? (prazo >= 0 ? ` · ${prazo} dias para o fim do prazo de confirmação` : " · prazo de confirmação encerrado") : "");
  }

  const cartoes = [
    ["Convites cadastrados", total, ""],
    ["Pessoas autorizadas", autorizadas, "soma de todos os convites"],
    ["Confirmaram presença", sim.length, "convites"],
    ["Não comparecerão", nao.length, "convites"],
    ["Pessoas confirmadas", pessoasConf, `de ${autorizadas} autorizadas`],
    ["Convites pendentes", pend.length, `${pessoasPend} ${pessoasPend === 1 ? "pessoa" : "pessoas"} sem resposta`],
    ["Taxa de resposta", `${pctResp}%`, "convites que já responderam"],
    ["Presentes cadastrados", presentes.length, ""],
    ["Presentes disponíveis", pDisp, ""],
    ["Presentes reservados", pRes, ""]
  ];
  document.getElementById("indicadores").innerHTML = cartoes.map(([r, v, s]) =>
    `<div class="indicador"><p>${r}</p><strong>${v}</strong>${s ? `<small>${s}</small>` : ""}</div>`).join("");

  // ---------- Barras de proporção (rótulos sempre visíveis) ----------
  function proporcao(itens, totalGeral) {
    const base = totalGeral || 1;
    const segs = itens.filter(i => i.valor > 0).map(i =>
      `<span class="${i.classe}" style="width:${i.valor / base * 100}%" title="${esc(i.nome)}: ${i.valor}"></span>`).join("");
    const legenda = itens.map(i => `
      <li><span class="amostra ${i.classe}" aria-hidden="true"></span>${esc(i.nome)}
        <strong>${i.valor}</strong><small>${totalGeral ? Math.round(i.valor / base * 100) : 0}%</small></li>`).join("");
    return `<div class="proporcao" role="img" aria-label="${itens.map(i => `${i.nome}: ${i.valor}`).join(", ")}">${segs || '<span class="serie-pendente" style="width:100%"></span>'}</div>
            <ul class="legenda">${legenda}</ul>`;
  }

  document.getElementById("graf-respostas").insertAdjacentHTML("beforeend", total
    ? proporcao([
        { nome: "Confirmaram", valor: sim.length, classe: "serie-sim" },
        { nome: "Não comparecerão", valor: nao.length, classe: "serie-nao" },
        { nome: "Pendentes", valor: pend.length, classe: "serie-pendente" }
      ], total)
    : `<p class="dica">Nenhum convite cadastrado ainda. <a href="convidados.html">Cadastre o primeiro</a>.</p>`);

  const naoVao = nao.reduce((s, c) => s + c.qtd_autorizada, 0);
  document.getElementById("graf-pessoas").insertAdjacentHTML("beforeend", autorizadas
    ? proporcao([
        { nome: "Confirmadas", valor: pessoasConf, classe: "serie-sim" },
        { nome: "Vagas recusadas ou não usadas", valor: autorizadas - pessoasConf - pessoasPend, classe: "serie-nao" },
        { nome: "Aguardando resposta", valor: pessoasPend, classe: "serie-pendente" }
      ], autorizadas) +
      `<p class="dica">Vagas recusadas inclui convites que não vão (${naoVao} vagas) e confirmações com menos pessoas do que o autorizado.</p>`
    : `<p class="dica">Sem dados ainda.</p>`);

  document.getElementById("graf-presentes").insertAdjacentHTML("beforeend", presentes.length
    ? proporcao([
        { nome: "Reservados", valor: pRes, classe: "serie-sim" },
        { nome: "Disponíveis", valor: pDisp, classe: "serie-pendente" },
        { nome: "Indisponíveis", valor: pInd, classe: "serie-indisponivel" }
      ], presentes.length) +
      (pRes ? `<p class="dica" style="margin-top:1rem">Últimas reservas: ${presentes.filter(p => p.status === "reservado").slice(0, 3)
          .map(p => `<strong>${esc(p.nome)}</strong> (${esc(p.reservado_por)})`).join(" · ")}</p>` : "")
    : `<p class="dica">Nenhum presente cadastrado.</p>`);

  // ---------- Últimas respostas ----------
  const ultimas = convites.filter(c => c.resposta)
    .sort((a, b) => new Date(b.resposta.atualizado_em) - new Date(a.resposta.atualizado_em)).slice(0, 6);
  document.getElementById("ultimas").insertAdjacentHTML("beforeend", ultimas.length
    ? `<ul class="legenda">${ultimas.map(c => `<li>${Admin.etiquetaSituacao(c.situacao)}
        <span>${esc(c.grupo)}${c.situacao === "sim" ? ` · ${c.resposta.qtd_confirmada} pessoa(s)` : ""}</span>
        <small style="margin-left:auto;min-width:auto">${esc(U.formatarDataHora(c.resposta.atualizado_em))}</small></li>`).join("")}</ul>
       <p style="margin:1rem 0 0"><a href="confirmacoes.html">Ver todas as confirmações</a></p>`
    : `<p class="dica">Nenhuma resposta ainda. Envie os links dos convites pela tela <a href="convidados.html">Convidados</a>.</p>`);
});
