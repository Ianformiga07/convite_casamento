// ============================================================
//  CONVITE PÚBLICO — Ian & Laura Regina
// ============================================================
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const { esc } = U;

  const estado = {
    config: {},
    codigo: null,
    convite: null,
    presentes: [],
    categoria: "Todas",
    busca: "",
    soDisponiveis: false,
    presenteEscolhido: null,
    editandoRsvp: false
  };

  const ICONES_CATEGORIA = [
    [/eletrodom|móve|move/i, "fa-couch"],
    [/eletroport|cozinha|café/i, "fa-mug-hot"],
    [/panela|utens|mesa/i, "fa-utensils"],
    [/cama|banho/i, "fa-bed"],
    [/decor/i, "fa-leaf"]
  ];
  const iconeCategoria = c => (ICONES_CATEGORIA.find(([r]) => r.test(c)) || [, "fa-gift"])[1];

  // ---------------- Código do convite (link individual) ----------------
  function lerCodigo() {
    const p = new URLSearchParams(location.search);
    let c = (p.get("c") || "").trim();
    try {
      if (c) localStorage.setItem("convite_codigo", c);
      else c = localStorage.getItem("convite_codigo") || "";
    } catch { /* navegação privada */ }
    return /^[A-Za-z0-9_-]{8,40}$/.test(c) ? c : null;
  }

  // ---------------- Abertura ----------------
  function abrirConvite() {
    document.body.classList.remove("fechado");
    document.body.classList.add("aberto");
    setTimeout(() => {
      $("#abertura").hidden = true;
      $("#inicio").focus?.({ preventScroll: true });
    }, 950);
  }

  // ---------------- Menu ----------------
  function iniciarMenu() {
    const topo = $("#topo"), btn = $("#btn-menu");
    const definir = aberto => {
      topo.classList.toggle("menu-aberto", aberto);
      document.body.classList.toggle("menu-aberto", aberto);
      btn.setAttribute("aria-expanded", aberto);
      btn.querySelector("i").className = aberto ? "fa-solid fa-xmark" : "fa-solid fa-bars";
      $("#btn-menu-texto").textContent = aberto ? "Fechar" : "Menu";
      document.body.style.overflow = aberto ? "hidden" : "";
    };
    btn.addEventListener("click", () => definir(!topo.classList.contains("menu-aberto")));
    $$("#menu a").forEach(a => a.addEventListener("click", () => definir(false)));
    document.addEventListener("keydown", e => { if (e.key === "Escape" && topo.classList.contains("menu-aberto")) definir(false); });
    window.matchMedia("(min-width: 900px)").addEventListener("change", e => { if (e.matches) definir(false); });

    // Borda do topo e barra de atalhos aparecem depois de sair da capa
    const aoRolar = () => {
      topo.classList.toggle("rolou", scrollY > 40);
      document.body.classList.toggle("mostrar-atalhos", scrollY > innerHeight * 0.55);
    };
    window.addEventListener("scroll", aoRolar, { passive: true });
    aoRolar();
  }

  // Barra de atalhos: ajusta colunas e o texto do botão de confirmação
  function atualizarAtalhos() {
    const barra = $("#atalhos");
    const visiveis = $$("a", barra).filter(a => !a.hidden).length;
    barra.classList.toggle("atalhos--dois", visiveis === 2);
    barra.hidden = visiveis < 2;
    const r = estado.convite?.resposta;
    $("#atalho-rsvp-texto").textContent = r ? "Minha confirmação" : "Confirmar presença";
  }

  // Link de WhatsApp dos noivos (configurado no painel)
  function linkContato() {
    const tel = String(estado.config.contato_whatsapp || "").replace(/\D/g, "");
    if (tel.length < 10) return "";
    const numero = tel.length <= 11 ? "55" + tel : tel;
    const texto = `Olá! Tenho uma dúvida sobre o casamento de ${estado.config.nomes_curtos || "Ian & Laura Regina"}.`;
    return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
  }

  // ---------------- Animação ao rolar ----------------
  let observador;
  function observarRevelar() {
    if (!("IntersectionObserver" in window)) { $$(".revelar").forEach(e => e.classList.add("visivel")); return; }
    observador = observador || new IntersectionObserver(ents => {
      ents.forEach(e => { if (e.isIntersecting) { e.target.classList.add("visivel"); observador.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: .08 });
    $$(".revelar:not(.visivel)").forEach(e => observador.observe(e));
  }

  // ---------------- Conteúdo geral ----------------
  function preencher(sel, valor) { $$(sel).forEach(e => { if (valor) e.textContent = valor; }); }

  function renderConfig(c) {
    U.aplicarCores(c);
    const nomeNoivoCurto = (c.noivo || "Ian").split(" ")[0];
    preencher(".js-noivo", nomeNoivoCurto);
    preencher(".js-noivo-completo", c.noivo);
    preencher(".js-noiva", c.noiva);
    preencher(".js-frase", c.frase_abertura);
    preencher(".js-data-extenso", U.dataExtenso(c.data_casamento));
    preencher(".js-data-curta", U.dataCurta(c.data_casamento));
    preencher(".js-hora", c.hora_cerimonia);
    preencher(".js-local-nome", c.local_nome);
    preencher(".js-local-endereco", c.local_endereco);
    preencher(".js-nomes-curtos", c.nomes_curtos);
    preencher(".js-assinatura", c.assinatura);
    preencher(".js-final-titulo", c.final_titulo);
    preencher(".js-final-texto", c.final_texto);
    preencher(".js-historia-titulo", c.historia_titulo);
    preencher(".js-historia-texto", c.historia_texto);
    preencher(".js-presentes-texto", c.presentes_texto);
    preencher(".js-rsvp-texto", c.rsvp_texto);
    preencher(".js-rsvp-prazo", U.dataExtenso(c.rsvp_prazo));
    preencher(".js-aviso-chegada", c.aviso_chegada);
    if (c.nomes_curtos) document.title = `${c.nomes_curtos} · ${U.dataExtenso(c.data_casamento)}`;

    const mono = U.urlSegura(c.monograma_url);
    if (mono) $$(".js-monograma").forEach(i => (i.src = mono));
    const logo = U.urlSegura(c.logo_url) || mono;
    if (logo) $$(".js-logo").forEach(i => (i.src = logo));

    const p = U.partesData(c.data_casamento);
    if (p) {
      preencher(".js-dia-semana", p.semana);
      preencher(".js-dia", String(p.dia));
      preencher(".js-mes-ano", `${p.mesNome} de ${p.ano}`);
    }

    // Foto principal da história
    const foto = U.urlSegura(c.historia_foto_url);
    if (foto) { const f = $("#historia-foto"); f.querySelector("img").src = foto; f.hidden = false; }

    // Locais e mapas
    const mapa = (url, nome, end) => U.urlSegura(url) ||
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([nome, end].filter(Boolean).join(", "))}`;
    $("#btn-mapa").href = mapa(c.local_maps_url, c.local_nome, c.local_endereco);
    const separado = c.recepcao_mesmo_local === false && c.recepcao_nome;
    $("#local-tipo").textContent = separado ? "Cerimônia" : "Cerimônia e recepção";
    $("#local-recepcao").hidden = !separado;
    if (separado) {
      $("#recepcao-nome").textContent = c.recepcao_nome;
      $("#recepcao-end").textContent = c.recepcao_endereco || "";
      $("#btn-mapa-recepcao").href = mapa(c.recepcao_maps_url, c.recepcao_nome, c.recepcao_endereco);
    }

    // Seções que podem ser desligadas no painel
    const listaAtiva = c.lista_presentes_ativa !== false;
    const rsvpAtivo = c.rsvp_ativo !== false;
    $("#presentes").hidden = !listaAtiva;
    $("#rsvp").hidden = !rsvpAtivo;
    $$('[data-secao="presentes"]').forEach(a => (a.hidden = !listaAtiva));
    $$('[data-secao="rsvp"]').forEach(a => (a.hidden = !rsvpAtivo));

    // Links externos no rodapé
    const links = Array.isArray(c.links) ? c.links : [];
    $("#rodape-links").innerHTML = links
      .filter(l => U.urlSegura(l.url))
      .map(l => `<li><a href="${esc(U.urlSegura(l.url))}" target="_blank" rel="noopener">${esc(l.rotulo || l.url)}</a></li>`)
      .join("");

    iniciarAgenda(c);
    iniciarContagem(c);
  }

  // ---------------- Agenda ----------------
  function iniciarAgenda(c) {
    const ini = U.momentoCasamento(c);
    if (!ini) return;
    const fim = new Date(ini.getTime() + (Number(c.duracao_horas) || 6) * 3600e3);
    const f = d => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const titulo = `Casamento ${c.nomes_curtos || "Ian & Laura Regina"}`;
    const local = [c.local_nome, c.local_endereco].filter(Boolean).join(", ");
    const detalhes = `${c.aviso_chegada || ""}\n${location.origin}${location.pathname}`;

    $("#btn-google-agenda").href = "https://calendar.google.com/calendar/render?action=TEMPLATE" +
      `&text=${encodeURIComponent(titulo)}&dates=${f(ini)}/${f(fim)}` +
      `&location=${encodeURIComponent(local)}&details=${encodeURIComponent(detalhes)}`;

    $("#btn-ics").onclick = () => {
      const limpar = s => String(s).replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
      const ics = [
        "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Casamento Ian e Laura//PT-BR", "CALSCALE:GREGORIAN",
        "BEGIN:VEVENT", `UID:casamento-ian-laura-${f(ini)}@convite`, `DTSTAMP:${f(new Date())}`,
        `DTSTART:${f(ini)}`, `DTEND:${f(fim)}`, `SUMMARY:${limpar(titulo)}`,
        `LOCATION:${limpar(local)}`, `DESCRIPTION:${limpar(detalhes)}`,
        "BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", `DESCRIPTION:${limpar(titulo)}`, "END:VALARM",
        "END:VEVENT", "END:VCALENDAR"
      ].join("\r\n");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
      a.download = "casamento-ian-e-laura.ics";
      document.body.appendChild(a); a.click(); a.remove();
    };
  }

  // ---------------- Contagem regressiva ----------------
  let timerContagem;
  function iniciarContagem(c) {
    const alvo = U.momentoCasamento(c);
    if (!alvo) return;
    clearInterval(timerContagem);
    const dois = n => String(n).padStart(2, "0");
    const tick = () => {
      const ms = alvo - Date.now();
      if (ms <= 0) {
        $("#contagem").hidden = true; $("#contagem-fim").hidden = false;
        clearInterval(timerContagem); return;
      }
      const s = Math.floor(ms / 1000);
      $("#cd-dias").textContent = Math.floor(s / 86400);
      $("#cd-horas").textContent = dois(Math.floor(s % 86400 / 3600));
      $("#cd-min").textContent = dois(Math.floor(s % 3600 / 60));
      $("#cd-seg").textContent = dois(s % 60);
    };
    tick(); timerContagem = setInterval(tick, 1000);
  }

  // ---------------- História / programação / FAQ ----------------
  function renderHistoria(itens) {
    $("#linha-tempo").innerHTML = itens.map(m => {
      const foto = U.urlSegura(m.foto_url);
      return `<li class="marco revelar">
        <p class="marco__ano">${esc(m.ano)}</p>
        <h3 class="marco__titulo">${esc(m.titulo)}</h3>
        ${m.texto ? `<p class="marco__texto">${esc(m.texto)}</p>` : ""}
        ${foto ? `<figure class="marco__foto"><img src="${esc(foto)}" alt="${esc(m.titulo)}" loading="lazy"></figure>` : ""}
      </li>`;
    }).join("");
  }

  function renderProgramacao(itens) {
    const sec = $("#programacao");
    sec.hidden = !itens.length;
    $("#programa").innerHTML = itens.map(p => `
      <li class="programa__item revelar">
        <span class="programa__hora">${esc(p.horario)}</span>
        <span class="programa__icone"><i class="fa-solid ${esc(/^fa-[a-z0-9-]+$/.test(p.icone) ? p.icone : "fa-heart")}" aria-hidden="true"></i></span>
        <div><p class="programa__titulo">${esc(p.titulo)}</p>${p.descricao ? `<p class="programa__desc">${esc(p.descricao)}</p>` : ""}</div>
      </li>`).join("");
  }

  function renderFaq(itens) {
    $("#informacoes").hidden = !itens.length;
    $("#faq").innerHTML = itens.map(f => `
      <details class="revelar"><summary>${esc(f.pergunta)}</summary><p>${esc(f.resposta)}</p></details>`).join("");
  }

  // ---------------- Presentes ----------------
  async function carregarPresentes() {
    if (!db) return;
    const { data, error } = await db.rpc("listar_presentes");
    if (error) {
      $("#lista-presentes").innerHTML = `<p class="carregando">Não foi possível carregar a lista agora. Atualize a página para tentar de novo.</p>`;
      return;
    }
    estado.presentes = data || [];
    renderChips();
    renderPresentes();
  }

  function renderChips() {
    const cats = ["Todas", ...new Set(estado.presentes.map(p => p.categoria))];
    if (!cats.includes(estado.categoria)) estado.categoria = "Todas";
    $("#chips-categorias").innerHTML = cats.map(c =>
      `<button type="button" class="chip" data-cat="${esc(c)}" aria-pressed="${c === estado.categoria}">${esc(c)}</button>`).join("");
  }

  function normalizar(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }

  function renderPresentes() {
    const termo = normalizar(estado.busca);
    const lista = estado.presentes.filter(p =>
      (estado.categoria === "Todas" || p.categoria === estado.categoria) &&
      (!estado.soDisponiveis || p.status === "disponivel") &&
      (!termo || normalizar(p.nome + " " + (p.descricao || "")).includes(termo)));

    const disp = estado.presentes.filter(p => p.status === "disponivel").length;
    $("#contador-presentes").textContent =
      `${disp} de ${estado.presentes.length} presentes disponíveis` +
      (lista.length !== estado.presentes.length ? ` · mostrando ${lista.length}` : "");
    $("#presentes-vazio").hidden = lista.length > 0;

    $("#lista-presentes").innerHTML = lista.map(p => {
      const img = U.urlSegura(p.imagem_url);
      const loja = U.urlSegura(p.link_loja);
      const reservado = p.status === "reservado";
      return `<article class="presente ${reservado ? "reservado" : ""}">
        <div class="presente__imagem">
          ${img ? `<img src="${esc(img)}" alt="${esc(p.nome)}" loading="lazy">`
                : `<div class="presente__sem-foto"><i class="fa-solid ${iconeCategoria(p.categoria)}" aria-hidden="true"></i><img src="assets/images/ramo1.webp" alt=""></div>`}
          ${reservado ? `<span class="selo">Reservado</span>` : ""}
        </div>
        <div class="presente__corpo">
          <p class="presente__cat">${esc(p.categoria)}</p>
          <h3 class="presente__nome">${esc(p.nome)}</h3>
          ${p.descricao ? `<p class="presente__desc">${esc(p.descricao)}</p>` : ""}
          ${p.valor ? `<p class="presente__valor">${U.formatarMoeda(p.valor)} <small>(valor estimado)</small></p>` : ""}
          <div class="presente__acoes">
            ${reservado
              ? `<p class="presente__por">Escolhido por <strong>${esc(p.reservado_por)}</strong></p>`
              : `<button type="button" class="botao botao--principal" data-reservar="${esc(p.id)}" aria-label="Escolher ${esc(p.nome)}"><i class="fa-solid fa-gift" aria-hidden="true"></i> Escolher<span class="so-desktop"> este presente</span></button>`}
            ${loja && !reservado ? `<a class="presente__loja" href="${esc(loja)}" target="_blank" rel="noopener">Ver na loja</a>` : ""}
          </div>
        </div>
      </article>`;
    }).join("");
  }

  function iniciarFiltros() {
    $("#chips-categorias").addEventListener("click", e => {
      const b = e.target.closest("[data-cat]"); if (!b) return;
      estado.categoria = b.dataset.cat;
      $$("#chips-categorias .chip").forEach(c => c.setAttribute("aria-pressed", c === b));
      renderPresentes();
    });
    let t;
    $("#busca-presente").addEventListener("input", e => {
      clearTimeout(t); t = setTimeout(() => { estado.busca = e.target.value; renderPresentes(); }, 150);
    });
    $("#so-disponiveis").addEventListener("change", e => { estado.soDisponiveis = e.target.checked; renderPresentes(); });
    $("#lista-presentes").addEventListener("click", e => {
      const b = e.target.closest("[data-reservar]");
      if (b) abrirReserva(b.dataset.reservar);
    });
    // Mantém a lista atualizada enquanto a pessoa navega
    setInterval(() => { if (!document.hidden && !$("#janela-reserva").open) carregarPresentes(); }, 45000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) carregarPresentes(); });
  }

  // ---------------- Janela de reserva ----------------
  const janela = () => $("#janela-reserva");

  function abrirReserva(id) {
    const p = estado.presentes.find(x => x.id === id);
    if (!p || p.status !== "disponivel") return;
    estado.presenteEscolhido = p;
    $("#form-reserva").hidden = false;
    $("#reserva-sucesso").hidden = true;
    $("#reserva-nome").textContent = p.nome;
    $("#reserva-erro").hidden = true;
    const campo = $("#reserva-quem");
    if (!campo.value && estado.convite) campo.value = estado.convite.titular;
    janela().showModal();
    setTimeout(() => campo.focus(), 50);
  }

  function iniciarReserva() {
    janela().addEventListener("click", e => {
      if (e.target.closest("[data-fechar]") || e.target === janela()) janela().close();
    });
    janela().addEventListener("close", () => renderPresentes());

    $("#form-reserva").addEventListener("submit", async e => {
      e.preventDefault();
      const nome = $("#reserva-quem").value.trim().replace(/\s+/g, " ");
      const erro = $("#reserva-erro");
      if (nome.length < 2) { erro.textContent = "Informe seu nome para reservar."; erro.hidden = false; return; }

      const btn = $("#reserva-confirmar");
      btn.disabled = true; btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Reservando…`;
      const p = estado.presenteEscolhido;
      const { data, error } = await db.rpc("reservar_presente", {
        p_presente: p.id, p_nome: nome, p_codigo: estado.codigo
      });
      btn.disabled = false; btn.textContent = "Confirmar";

      if (error || !data?.ok) {
        erro.textContent = data?.erro || "Não foi possível reservar agora. Verifique sua internet e tente de novo.";
        erro.hidden = false;
        await carregarPresentes();
        return;
      }
      $("#form-reserva").hidden = true;
      $("#reserva-sucesso").hidden = false;
      $("#reserva-sucesso-texto").textContent = `"${p.nome}" agora está reservado em nome de ${data.reservado_por}. Muito obrigado pelo carinho!`;
      const loja = U.urlSegura(p.link_loja);
      $("#reserva-link-loja").innerHTML = loja
        ? `Você pode comprar onde preferir. <a href="${esc(loja)}" target="_blank" rel="noopener">Abrir o link da loja sugerida</a>.`
        : "";
      await carregarPresentes();
    });
  }

  // ---------------- RSVP ----------------
  function prazoEncerrado() {
    const prazo = estado.config.rsvp_prazo;
    if (!prazo) return false;
    const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Araguaina" });
    return hoje > prazo;
  }

  async function carregarConvite() {
    if (!estado.codigo || !db) return null;
    const { data, error } = await db.rpc("obter_convite", { p_codigo: estado.codigo });
    if (error) return null;
    return data;
  }

  function renderRsvp() {
    const area = $("#rsvp-area");
    const c = estado.convite;

    if (!estado.codigo || !c) {
      const contato = linkContato();
      const invalido = !!estado.codigo;
      area.innerHTML = `
        <div class="rsvp__resumo">
          <p class="icone-grande"><i class="fa-regular fa-envelope" aria-hidden="true"></i></p>
          <h3>${invalido ? "Link não reconhecido" : "Use seu link pessoal"}</h3>
          <p>${invalido
            ? "Não encontramos o convite deste link. Ele pode ter sido copiado pela metade. Abra de novo o link que os noivos enviaram pelo WhatsApp."
            : "Cada família recebeu dos noivos, pelo WhatsApp, um link só seu para confirmar presença. Abra o convite por esse link e esta área mostrará o formulário com o seu nome."}</p>
          ${contato ? `<a class="botao botao--principal" href="${esc(contato)}" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp" aria-hidden="true"></i> Pedir meu link aos noivos</a>` : ""}
          <details class="rsvp__ajuda">
            <summary>Tenho o código do convite</summary>
            <p>O código é a parte final do link, depois de <strong>?c=</strong></p>
            <form class="rsvp__codigo" id="form-codigo">
              <input type="text" id="campo-codigo" placeholder="Ex.: K7m2Qx9pLaBc4dEf" aria-label="Código do convite"
                autocomplete="off" autocapitalize="off" spellcheck="false" required>
              <button class="botao botao--principal" type="submit">Abrir</button>
            </form>
          </details>
        </div>`;
      $("#form-codigo").addEventListener("submit", e => {
        e.preventDefault();
        let v = $("#campo-codigo").value.trim();
        const m = v.match(/[?&]c=([A-Za-z0-9_-]+)/); if (m) v = m[1];   // aceita o link inteiro colado
        if (!/^[A-Za-z0-9_-]{8,40}$/.test(v)) { U.toast("Código inválido. Confira e tente de novo."); return; }
        const u = new URL(location.href); u.searchParams.set("c", v); u.hash = "rsvp";
        location.href = u.href;
      });
      return;
    }

    const r = c.resposta;
    const encerrado = prazoEncerrado();

    if (r && !estado.editandoRsvp) {
      const nomes = [r.nome, ...(r.acompanhantes || [])];
      area.innerHTML = `
        <div class="rsvp__resumo">
          <p class="icone-grande"><i class="fa-solid ${r.presenca ? "fa-heart" : "fa-envelope-open"}"></i></p>
          <h3>${r.presenca ? "Presença confirmada!" : "Resposta registrada"}</h3>
          <p>${r.presenca
            ? `Que alegria! Estamos esperando ${r.qtd_confirmada > 1 ? `vocês (${r.qtd_confirmada} pessoas)` : "você"} no dia ${esc(U.dataExtenso(estado.config.data_casamento))}.`
            : "Sentiremos sua falta. Obrigado por nos avisar com carinho."}</p>
          ${r.presenca ? `<ul>${nomes.map(n => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}
          <p class="rsvp__info">Última atualização: ${esc(U.formatarDataHora(r.atualizado_em))}</p>
          ${encerrado
            ? `<p class="rsvp__info">O prazo para alterações terminou. Em caso de dúvida, fale com os noivos.</p>`
            : `<button class="botao botao--linha" type="button" id="btn-alterar">Alterar resposta</button>`}
        </div>`;
      $("#btn-alterar")?.addEventListener("click", () => { estado.editandoRsvp = true; renderRsvp(); });
      return;
    }

    if (encerrado) {
      area.innerHTML = `<div class="rsvp__resumo"><p class="icone-grande"><i class="fa-regular fa-clock"></i></p>
        <p>O prazo para confirmação de presença terminou. Em caso de dúvida, fale com os noivos.</p></div>`;
      return;
    }

    const max = c.qtd_autorizada;
    const qtdInicial = r?.presenca ? r.qtd_confirmada : 1;
    area.innerHTML = `
      <p class="rsvp__ola">Olá, ${esc(c.grupo)}!</p>
      <p class="rsvp__info">Este convite é válido para ${max === 1 ? "1 pessoa" : `até ${max} pessoas`}.</p>
      <form id="form-rsvp" novalidate>
        <p class="erro" id="rsvp-erro" role="alert" hidden></p>
        <label class="campo"><span>Nome completo</span>
          <input type="text" name="nome" maxlength="120" required autocomplete="name" value="${esc(r?.nome || c.titular)}"></label>
        <label class="campo"><span>Telefone / WhatsApp</span>
          <input type="tel" name="telefone" inputmode="tel" maxlength="16" required autocomplete="tel" placeholder="(63) 99999-9999" value="${esc(r?.telefone || "")}"></label>
        <fieldset class="escolha">
          <legend>Você poderá comparecer?</legend>
          <label><input type="radio" name="presenca" value="sim" ${!r || r.presenca ? "checked" : ""}><span><i class="fa-solid fa-heart"></i>Sim, estarei lá</span></label>
          <label><input type="radio" name="presenca" value="nao" ${r && !r.presenca ? "checked" : ""}><span><i class="fa-regular fa-face-frown"></i>Não poderei ir</span></label>
        </fieldset>
        <div id="bloco-qtd">
          <div class="campo"><span>Quantas pessoas, contando com você?</span>
            <div class="qtd">
              <button type="button" data-qtd="-1" aria-label="Diminuir">−</button>
              <output id="qtd-valor">${qtdInicial}</output>
              <button type="button" data-qtd="1" aria-label="Aumentar">+</button>
              <small>de ${max}</small>
            </div>
          </div>
          <div class="acompanhantes" id="acompanhantes"></div>
        </div>
        <label class="campo"><span>Observações (opcional)</span>
          <textarea name="observacoes" maxlength="1000" placeholder="Restrição alimentar, recado para os noivos…">${esc(r?.observacoes || "")}</textarea></label>
        <button class="botao botao--principal" type="submit" id="btn-rsvp">${r ? "Salvar alteração" : "Enviar confirmação"}</button>
        ${r ? `<button class="botao botao--linha" type="button" id="btn-cancelar-edicao" style="width:100%;margin-top:.6rem">Cancelar</button>` : ""}
      </form>`;

    const form = $("#form-rsvp");
    let qtd = qtdInicial;
    const acompanhantesAtuais = [...(r?.acompanhantes || [])];

    const desenharAcomp = () => {
      const box = $("#acompanhantes");
      const atuais = $$("input", box).map(i => i.value);
      atuais.forEach((v, i) => (acompanhantesAtuais[i] = v));
      box.innerHTML = Array.from({ length: qtd - 1 }, (_, i) => `
        <label class="campo"><span>Nome do acompanhante ${i + 1}</span>
          <input type="text" maxlength="120" required data-acomp value="${esc(acompanhantesAtuais[i] || "")}"></label>`).join("");
      $("#qtd-valor").textContent = qtd;
      $('[data-qtd="-1"]').disabled = qtd <= 1;
      $('[data-qtd="1"]').disabled = qtd >= max;
    };
    const sincronizarPresenca = () => {
      $("#bloco-qtd").hidden = form.presenca.value !== "sim";
    };
    desenharAcomp(); sincronizarPresenca();

    $$("[data-qtd]", form).forEach(b => b.addEventListener("click", () => {
      qtd = Math.min(max, Math.max(1, qtd + Number(b.dataset.qtd))); desenharAcomp();
    }));
    $$('input[name="presenca"]', form).forEach(i => i.addEventListener("change", sincronizarPresenca));
    form.telefone.addEventListener("input", e => (e.target.value = U.mascaraTelefone(e.target.value)));
    $("#btn-cancelar-edicao")?.addEventListener("click", () => { estado.editandoRsvp = false; renderRsvp(); });

    form.addEventListener("submit", async e => {
      e.preventDefault();
      const erro = $("#rsvp-erro");
      const mostrarErro = m => { erro.textContent = m; erro.hidden = false; erro.scrollIntoView({ block: "center", behavior: "smooth" }); };
      const presenca = form.presenca.value === "sim";
      const nome = form.nome.value.trim();
      const tel = form.telefone.value.trim();
      const acomp = $$("[data-acomp]", form).map(i => i.value.trim());

      if (nome.split(/\s+/).length < 2) return mostrarErro("Informe seu nome completo (nome e sobrenome).");
      if (tel.replace(/\D/g, "").length < 10) return mostrarErro("Informe um telefone/WhatsApp válido, com DDD.");
      if (presenca && acomp.some(a => a.length < 2)) return mostrarErro("Preencha o nome de todos os acompanhantes.");

      const btn = $("#btn-rsvp");
      btn.disabled = true; btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Enviando…`;
      const { data, error } = await db.rpc("responder_rsvp", {
        p_codigo: estado.codigo,
        p_nome: nome,
        p_telefone: tel,
        p_presenca: presenca,
        p_qtd: presenca ? qtd : 0,
        p_acompanhantes: presenca ? acomp : [],
        p_observacoes: form.observacoes.value.trim() || null
      });
      if (error || !data?.ok) {
        btn.disabled = false; btn.textContent = r ? "Salvar alteração" : "Enviar confirmação";
        return mostrarErro(data?.erro || "Não foi possível enviar agora. Verifique sua internet e tente de novo.");
      }
      estado.editandoRsvp = false;
      estado.convite = await carregarConvite();
      renderRsvp();
      atualizarAtalhos();
      $("#rsvp").scrollIntoView({ behavior: "smooth" });
    });
  }

  // ---------------- Início ----------------
  async function iniciar() {
    iniciarMenu();
    iniciarFiltros();
    iniciarReserva();
    observarRevelar();
    $("#btn-abrir").addEventListener("click", abrirConvite);
    $("#inicio").setAttribute("tabindex", "-1");

    estado.codigo = lerCodigo();

    if (!db) {
      $("#lista-presentes").innerHTML = `<p class="carregando">Configure a conexão com o Supabase em assets/js/config.js.</p>`;
      $("#rsvp-area").innerHTML = `<p class="carregando">Configure a conexão com o Supabase.</p>`;
      iniciarContagem({ data_casamento: "2027-06-26", hora_cerimonia: "16:30" });
      return;
    }

    const [site, convite] = await Promise.all([db.rpc("obter_site"), carregarConvite()]);
    if (site.data) {
      estado.config = site.data.config || {};
      renderConfig(estado.config);
      renderHistoria(site.data.historia || []);
      renderProgramacao(site.data.programacao || []);
      renderFaq(site.data.faq || []);
    } else {
      iniciarContagem({ data_casamento: "2027-06-26", hora_cerimonia: "16:30" });
    }

    estado.convite = convite;
    if (convite) {
      const s = $("#abertura-saudacao");
      s.textContent = `Convite especial para ${convite.grupo}`;
      s.hidden = false;
    } else if (estado.codigo) {
      try { localStorage.removeItem("convite_codigo"); } catch {}
    }

    const contato = linkContato();
    $$("[data-contato]").forEach(a => (a.href = contato));
    $("#contato-faq").hidden = !contato;

    renderRsvp();
    atualizarAtalhos();
    observarRevelar();
    if (estado.config.lista_presentes_ativa !== false) carregarPresentes();

    // Se a pessoa chegou por um link com âncora (#presentes), abre direto
    if (location.hash && location.hash !== "#inicio") {
      abrirConvite();
      setTimeout(() => document.querySelector(location.hash)?.scrollIntoView(), 300);
    }
  }

  document.addEventListener("DOMContentLoaded", iniciar);
})();
