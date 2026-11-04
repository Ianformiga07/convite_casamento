// ============================================================
//  PAINEL — Presentes
// ============================================================
Admin.pronto(async () => {
  const { esc } = U;
  const $ = s => document.querySelector(s);
  const STATUS = { disponivel: "Disponível", reservado: "Reservado", indisponivel: "Indisponível" };
  let presentes = [];
  let filtro = "todos";
  let busca = "";

  await Admin.carregarConfig();

  async function recarregar() {
    const { data, error } = await db.from("presentes").select("*").order("ordem").order("nome");
    if (error) throw error;
    presentes = data || [];
    desenhar();
  }

  const filtrados = () => {
    const t = busca.toLowerCase();
    return presentes.filter(p => (filtro === "todos" || p.status === filtro) &&
      (!t || [p.nome, p.categoria, p.reservado_por, p.descricao].join(" ").toLowerCase().includes(t)));
  };

  function desenhar() {
    const cont = s => presentes.filter(p => s === "todos" || p.status === s).length;
    $("#filtro").innerHTML = [["todos", "Todos"], ["disponivel", "Disponíveis"], ["reservado", "Reservados"], ["indisponivel", "Indisponíveis"]]
      .map(([v, n]) => `<button type="button" data-f="${v}" aria-pressed="${v === filtro}">${n}<span>${cont(v)}</span></button>`).join("");
    const lista = filtrados();
    if (!lista.length) { $("#tabela").innerHTML = `<p class="vazio">${presentes.length ? "Nada encontrado com esse filtro." : "Nenhum presente cadastrado."}</p>`; return; }

    $("#tabela").innerHTML = `<table class="tabela"><thead><tr>
      <th>Foto</th><th>Presente</th><th>Categoria</th><th class="num">Valor</th><th>Status</th><th>Reservado por</th><th><span class="sr">Ações</span></th>
      </tr></thead><tbody>${lista.map(p => `<tr>
        <td class="celula-titulo" style="width:68px">${U.urlSegura(p.imagem_url)
          ? `<img class="miniatura" src="${esc(p.imagem_url)}" alt="" loading="lazy">`
          : `<span class="miniatura miniatura--vazia"><i class="fa-regular fa-image"></i></span>`}</td>
        <td class="celula-titulo"><span class="forte">${esc(p.nome)}</span>
          ${U.urlSegura(p.link_loja) ? `<br><a class="sub" href="${esc(p.link_loja)}" target="_blank" rel="noopener">abrir link da loja</a>` : ""}</td>
        <td data-r="Categoria">${esc(p.categoria)}</td>
        <td class="num" data-r="Valor">${p.valor ? U.formatarMoeda(p.valor) : "—"}</td>
        <td data-r="Status"><span class="etiqueta etiqueta--${p.status}">${STATUS[p.status]}</span></td>
        <td data-r="Reservado por">${p.reservado_por ? `${esc(p.reservado_por)}<br><span class="sub">${esc(U.formatarDataHora(p.reservado_em))}</span>` : "<span class='sub'>—</span>"}</td>
        <td><div class="acoes-linha">
          ${p.status === "reservado" ? `<button class="btn btn--pequeno" type="button" data-acao="cancelar" data-id="${p.id}"><i class="fa-solid fa-rotate-left"></i> Cancelar reserva</button>` : ""}
          ${p.status === "disponivel" ? `<button class="btn btn--pequeno" type="button" data-acao="reservar" data-id="${p.id}" title="Registrar reserva feita fora do site"><i class="fa-solid fa-user-check"></i> Reservar</button>
            <button class="btn btn--pequeno" type="button" data-acao="indisponivel" data-id="${p.id}"><i class="fa-solid fa-eye-slash"></i> Indisponível</button>` : ""}
          ${p.status === "indisponivel" ? `<button class="btn btn--pequeno" type="button" data-acao="reativar" data-id="${p.id}"><i class="fa-solid fa-eye"></i> Reativar</button>` : ""}
          <button class="btn btn--pequeno btn--icone" type="button" data-acao="editar" data-id="${p.id}" aria-label="Editar"><i class="fa-solid fa-pen"></i></button>
          <button class="btn btn--pequeno btn--icone btn--perigo" type="button" data-acao="excluir" data-id="${p.id}" aria-label="Excluir"><i class="fa-solid fa-trash"></i></button>
        </div></td></tr>`).join("")}</tbody></table>`;
  }

  function formulario(p = {}) {
    const cats = [...new Set(presentes.map(x => x.categoria))];
    return `<div class="campos campos--2">
      <label class="campo campo--inteiro"><span>Nome do presente *</span><input name="nome" maxlength="150" required value="${esc(p.nome || "")}"></label>
      <label class="campo"><span>Categoria *</span><input name="categoria" maxlength="60" list="lista-cats" required value="${esc(p.categoria || cats[0] || "")}">
        <datalist id="lista-cats">${cats.map(c => `<option value="${esc(c)}">`).join("")}</datalist></label>
      <label class="campo"><span>Valor estimado (opcional)</span><input name="valor" inputmode="decimal" value="${p.valor != null ? Number(p.valor).toFixed(2).replace(".", ",") : ""}" placeholder="Ex.: 1299,90"></label>
      <label class="campo campo--inteiro"><span>Descrição (opcional)</span><textarea name="descricao" maxlength="1000">${esc(p.descricao || "")}</textarea></label>
      <label class="campo campo--inteiro"><span>Link da loja (opcional)</span><input name="link_loja" type="url" value="${esc(p.link_loja || "")}" placeholder="https://"></label>
      ${Admin.htmlCampoImagem("imagem_url", "Foto do presente", p.imagem_url || "")}
      <label class="campo"><span>Ordem na lista</span><input name="ordem" type="number" value="${p.ordem ?? (presentes.length + 1)}"></label>
    </div>`;
  }

  function ler(f) {
    // Aceita "1.299,90", "1299,90" e "1299.90"
    const bruto = f.valor.value.trim().replace(/[R$\s]/g, "");
    const valorTxt = bruto.includes(",") ? bruto.replace(/\./g, "").replace(",", ".") : bruto;
    const valor = valorTxt ? Number(valorTxt) : null;
    if (valorTxt && (isNaN(valor) || valor < 0)) throw new Error("Valor inválido. Use apenas números, ex.: 1299,90");
    const link = f.link_loja.value.trim();
    if (link && !U.urlSegura(link)) throw new Error("O link da loja precisa começar com https://");
    if (!f.nome.value.trim()) throw new Error("Informe o nome do presente.");
    if (!f.categoria.value.trim()) throw new Error("Informe a categoria.");
    return {
      nome: f.nome.value.trim(), categoria: f.categoria.value.trim(), valor,
      descricao: f.descricao.value.trim() || null, link_loja: link || null,
      imagem_url: f.imagem_url.value || null, ordem: parseInt(f.ordem.value, 10) || 0
    };
  }

  async function salvar(p) {
    const ok = await Admin.janela({
      titulo: p ? "Editar presente" : "Novo presente", corpo: formulario(p || {}), botao: p ? "Salvar" : "Cadastrar",
      aoAbrir: f => Admin.campoImagem(f, "imagem_url", "presentes", { max: 1000 }),
      aoConfirmar: async f => {
        const dados = ler(f);
        const q = p ? db.from("presentes").update(dados).eq("id", p.id) : db.from("presentes").insert(dados);
        const { error } = await q; if (error) throw error;
      }
    });
    if (ok) { Admin.aviso(p ? "Presente atualizado." : "Presente cadastrado."); recarregar(); }
  }

  async function mudar(p, dados, msg) {
    const { error } = await db.from("presentes").update(dados).eq("id", p.id);
    if (error) return Admin.aviso(Admin.mensagemErro(error), true);
    Admin.aviso(msg); recarregar();
  }

  const LIBERAR = { status: "disponivel", reservado_por: null, reservado_em: null, reservado_convite: null };

  async function acao(tipo, p) {
    if (tipo === "editar") return salvar(p);
    if (tipo === "cancelar") {
      if (await Admin.confirmar(`Cancelar a reserva de <strong>${esc(p.nome)}</strong> feita por <strong>${esc(p.reservado_por)}</strong>? O presente volta a ficar disponível.`, "Cancelar reserva"))
        mudar(p, LIBERAR, "Reserva cancelada.");
    }
    if (tipo === "indisponivel") mudar(p, { status: "indisponivel" }, "Presente escondido da lista.");
    if (tipo === "reativar") mudar(p, LIBERAR, "Presente disponível novamente.");
    if (tipo === "reservar") {
      const ok = await Admin.janela({
        titulo: "Registrar reserva", botao: "Reservar",
        corpo: `<p class="dica" style="margin:0 0 1rem">Use quando alguém avisar que vai dar <strong>${esc(p.nome)}</strong> por outro meio.</p>
          <label class="campo"><span>Nome que aparecerá no convite *</span><input name="quem" maxlength="80" required></label>`,
        aoConfirmar: async f => {
          const quem = f.quem.value.trim();
          if (quem.length < 2) throw new Error("Informe o nome.");
          const { data, error } = await db.from("presentes")
            .update({ status: "reservado", reservado_por: quem, reservado_em: new Date().toISOString() })
            .eq("id", p.id).eq("status", "disponivel").select("id");
          if (error) throw error;
          if (!data.length) throw new Error("Este presente acabou de ser reservado por outra pessoa.");
        }
      });
      if (ok) { Admin.aviso("Reserva registrada."); recarregar(); }
    }
    if (tipo === "excluir") {
      if (!await Admin.confirmar(`Excluir <strong>${esc(p.nome)}</strong> definitivamente?${p.status === "reservado" ? " Ele está reservado por " + esc(p.reservado_por) + "." : ""}`, "Excluir")) return;
      const { error } = await db.from("presentes").delete().eq("id", p.id);
      if (error) return Admin.aviso(Admin.mensagemErro(error), true);
      Admin.aviso("Presente excluído."); recarregar();
    }
  }

  const linhas = () => filtrados().map(p => ({
    "Presente": p.nome, "Categoria": p.categoria, "Valor estimado": p.valor ? U.formatarMoeda(p.valor) : "",
    "Status": STATUS[p.status], "Reservado por": p.reservado_por || "",
    "Reservado em": p.reservado_em ? U.formatarDataHora(p.reservado_em) : "", "Link da loja": p.link_loja || ""
  }));

  $("#btn-novo").addEventListener("click", () => salvar(null));
  $("#busca").addEventListener("input", e => { busca = e.target.value; desenhar(); });
  $("#filtro").addEventListener("click", e => { const b = e.target.closest("[data-f]"); if (b) { filtro = b.dataset.f; desenhar(); } });
  $("#tabela").addEventListener("click", e => {
    const b = e.target.closest("[data-acao]"); if (!b) return;
    acao(b.dataset.acao, presentes.find(x => x.id === b.dataset.id));
  });
  $("#btn-excel").addEventListener("click", () => Admin.excel(`presentes-${Admin.dataArquivo()}`, [{ nome: "Presentes", linhas: linhas() }]));
  $("#btn-pdf").addEventListener("click", () => Admin.pdf(`presentes-${Admin.dataArquivo()}`, "Lista de presentes",
    linhas().map(({ "Link da loja": _, ...r }) => r)));

  await recarregar();
});
