// ============================================================
//  PAINEL — Configurações gerais
// ============================================================
Admin.pronto(async () => {
  const { esc } = U;
  const c = await Admin.carregarConfig();
  const v = k => esc(c[k] ?? "");
  const marcado = (k, padrao = true) => (c[k] ?? padrao) !== false ? "checked" : "";
  const PADRAO_CORES = { cor_principal: "#556B2F", cor_secundaria: "#A13D19", cor_detalhe: "#E2725B" };

  document.getElementById("formularios").innerHTML = `
  <form class="cartao" data-secao="casamento">
    <h2>Casamento</h2>
    <div class="campos campos--3">
      <label class="campo"><span>Noivo</span><input name="noivo" maxlength="80" value="${v("noivo")}"></label>
      <label class="campo"><span>Noiva</span><input name="noiva" maxlength="80" value="${v("noiva")}"></label>
      <label class="campo"><span>Nomes curtos (rodapé e título)</span><input name="nomes_curtos" maxlength="80" value="${v("nomes_curtos")}"></label>
      <label class="campo"><span>Data do casamento</span><input name="data_casamento" type="date" required value="${v("data_casamento")}"></label>
      <label class="campo"><span>Horário da cerimônia</span><input name="hora_cerimonia" type="time" required value="${v("hora_cerimonia")}"></label>
      <label class="campo"><span>Duração do evento (horas, para a agenda)</span><input name="duracao_horas" type="number" min="1" max="24" value="${v("duracao_horas") || 6}"></label>
    </div>
    <p class="dica">Horário de Palmas-TO (UTC−3).</p>
    <p style="margin:1rem 0 0"><button class="btn btn--principal" type="submit">Salvar</button></p>
  </form>

  <form class="cartao" data-secao="local">
    <h2>Local</h2>
    <div class="campos campos--2">
      <label class="campo"><span>Nome do local da cerimônia</span><input name="local_nome" maxlength="120" value="${v("local_nome")}"></label>
      <label class="campo"><span>Endereço completo</span><input name="local_endereco" maxlength="200" value="${v("local_endereco")}"></label>
      <label class="campo campo--inteiro"><span>Link do Google Maps (opcional)</span><input name="local_maps_url" type="url" value="${v("local_maps_url")}" placeholder="https://maps.app.goo.gl/…">
        <p class="dica">Sem link, o botão “Como chegar” pesquisa pelo nome e endereço. Para o ponto exato: abra o local no Google Maps, toque em Compartilhar e cole o link aqui.</p></label>
      <label class="interruptor campo--inteiro"><input type="checkbox" name="recepcao_mesmo_local" ${marcado("recepcao_mesmo_local")}> A recepção é no mesmo local da cerimônia</label>
      <label class="campo" data-recepcao><span>Local da recepção</span><input name="recepcao_nome" maxlength="120" value="${v("recepcao_nome")}"></label>
      <label class="campo" data-recepcao><span>Endereço da recepção</span><input name="recepcao_endereco" maxlength="200" value="${v("recepcao_endereco")}"></label>
      <label class="campo campo--inteiro" data-recepcao><span>Link do Google Maps da recepção</span><input name="recepcao_maps_url" type="url" value="${v("recepcao_maps_url")}"></label>
    </div>
    <p style="margin:1rem 0 0"><button class="btn btn--principal" type="submit">Salvar</button></p>
  </form>

  <form class="cartao" data-secao="funcoes">
    <h2>Confirmação de presença e presentes</h2>
    <div class="campos campos--2">
      <label class="campo"><span>Prazo final para confirmação</span><input name="rsvp_prazo" type="date" value="${v("rsvp_prazo")}">
        <p class="dica">Depois desta data, o formulário fecha automaticamente.</p></label>
      <div>
        <label class="interruptor"><input type="checkbox" name="rsvp_ativo" ${marcado("rsvp_ativo")}> Confirmação de presença ativada</label>
        <label class="interruptor"><input type="checkbox" name="lista_presentes_ativa" ${marcado("lista_presentes_ativa")}> Lista de presentes ativada</label>
        <label class="interruptor"><input type="checkbox" name="mostrar_valores" ${marcado("mostrar_valores")}> Mostrar valores estimados dos presentes</label>
      </div>
      <label class="campo campo--inteiro"><span>WhatsApp dos noivos para dúvidas (opcional)</span>
        <input name="contato_whatsapp" inputmode="tel" maxlength="16" value="${v("contato_whatsapp")}" placeholder="(63) 99999-9999">
        <p class="dica">Aparece como botão “Falar com os noivos” no convite, para quem perdeu o link pessoal ou tem dúvidas. Deixe vazio para não mostrar.</p></label>
      <label class="campo campo--inteiro"><span>Mensagem padrão do WhatsApp ao enviar convites</span>
        <textarea name="whatsapp_texto" rows="3" maxlength="800">${v("whatsapp_texto")}</textarea>
        <p class="dica">Use {grupo}, {titular} e {link}: eles são trocados automaticamente pelos dados de cada convite.</p></label>
    </div>
    <p style="margin:1rem 0 0"><button class="btn btn--principal" type="submit">Salvar</button></p>
  </form>

  <form class="cartao" data-secao="identidade">
    <h2>Identidade visual</h2>
    <div class="campos campos--2">
      ${Admin.htmlCampoImagem("monograma_url", "Monograma (PNG com fundo transparente)", c.monograma_url || "", true)}
      ${Admin.htmlCampoImagem("logo_url", "Logo pequena do menu (opcional; sem ela, usa o monograma)", c.logo_url || "")}
    </div>
    <p class="dica">Sem arquivo enviado, o site usa o monograma oficial que já vem no projeto.</p>
    <h2 style="margin-top:1.5rem">Cores</h2>
    <div class="cores">
      <label><input type="color" name="cor_principal" value="${v("cor_principal") || PADRAO_CORES.cor_principal}"> Principal (verde oliva)</label>
      <label><input type="color" name="cor_secundaria" value="${v("cor_secundaria") || PADRAO_CORES.cor_secundaria}"> Secundária (terracota)</label>
      <label><input type="color" name="cor_detalhe" value="${v("cor_detalhe") || PADRAO_CORES.cor_detalhe}"> Detalhes (terracota claro)</label>
    </div>
    <p style="margin:1rem 0 0;display:flex;gap:.5rem;flex-wrap:wrap">
      <button class="btn btn--principal" type="submit">Salvar</button>
      <button class="btn" type="button" id="btn-cores-padrao">Restaurar cores oficiais</button></p>
  </form>

  <form class="cartao" data-secao="links">
    <h2>Links externos <small>aparecem no rodapé do convite</small></h2>
    <label class="campo"><span>Um link por linha, no formato: Nome | https://endereço</span>
      <textarea name="links" rows="3" placeholder="Instagram dos noivos | https://instagram.com/…">${esc((c.links || []).map(l => `${l.rotulo} | ${l.url}`).join("\n"))}</textarea></label>
    <p style="margin:1rem 0 0"><button class="btn btn--principal" type="submit">Salvar</button></p>
  </form>

  <form class="cartao" data-secao="senha" id="senha">
    <h2>Minha senha</h2>
    <div class="campos campos--2">
      <label class="campo"><span>Nova senha (mínimo 8 caracteres)</span><input name="senha1" type="password" autocomplete="new-password" minlength="8"></label>
      <label class="campo"><span>Repita a nova senha</span><input name="senha2" type="password" autocomplete="new-password" minlength="8"></label>
    </div>
    <p style="margin:1rem 0 0"><button class="btn btn--principal" type="submit">Alterar senha</button></p>
  </form>`;

  const fFun = document.querySelector('[data-secao="funcoes"]');
  fFun.contato_whatsapp.addEventListener("input", e => (e.target.value = U.mascaraTelefone(e.target.value)));

  // Recepção em outro local
  const fLocal = document.querySelector('[data-secao="local"]');
  const sincRecepcao = () => fLocal.querySelectorAll("[data-recepcao]").forEach(e => (e.hidden = fLocal.recepcao_mesmo_local.checked));
  fLocal.recepcao_mesmo_local.addEventListener("change", sincRecepcao); sincRecepcao();

  const fId = document.querySelector('[data-secao="identidade"]');
  Admin.campoImagem(fId, "monograma_url", "identidade", { max: 1400 });
  Admin.campoImagem(fId, "logo_url", "identidade", { max: 400 });
  document.getElementById("btn-cores-padrao").addEventListener("click", () =>
    Object.entries(PADRAO_CORES).forEach(([k, cor]) => (fId.elements[k].value = cor)));

  const LEITORES = {
    casamento: f => {
      if (!f.data_casamento.value || !f.hora_cerimonia.value) throw new Error("Informe data e horário.");
      return { noivo: f.noivo.value.trim(), noiva: f.noiva.value.trim(), nomes_curtos: f.nomes_curtos.value.trim(),
        data_casamento: f.data_casamento.value, hora_cerimonia: f.hora_cerimonia.value, duracao_horas: Number(f.duracao_horas.value) || 6 };
    },
    local: f => {
      for (const k of ["local_maps_url", "recepcao_maps_url"])
        if (f[k].value.trim() && !U.urlSegura(f[k].value.trim())) throw new Error("Os links do mapa precisam começar com https://");
      return { local_nome: f.local_nome.value.trim(), local_endereco: f.local_endereco.value.trim(), local_maps_url: f.local_maps_url.value.trim(),
        recepcao_mesmo_local: f.recepcao_mesmo_local.checked, recepcao_nome: f.recepcao_nome.value.trim(),
        recepcao_endereco: f.recepcao_endereco.value.trim(), recepcao_maps_url: f.recepcao_maps_url.value.trim() };
    },
    funcoes: f => {
      if (!f.whatsapp_texto.value.includes("{link}")) throw new Error("A mensagem do WhatsApp precisa conter {link}.");
      const contato = f.contato_whatsapp.value.trim();
      if (contato && contato.replace(/\D/g, "").length < 10) throw new Error("WhatsApp dos noivos incompleto: informe com DDD.");
      return { contato_whatsapp: contato, rsvp_prazo: f.rsvp_prazo.value, rsvp_ativo: f.rsvp_ativo.checked,
        lista_presentes_ativa: f.lista_presentes_ativa.checked, mostrar_valores: f.mostrar_valores.checked,
        whatsapp_texto: f.whatsapp_texto.value.trim() };
    },
    identidade: f => ({ monograma_url: f.monograma_url.value, logo_url: f.logo_url.value,
      cor_principal: f.cor_principal.value, cor_secundaria: f.cor_secundaria.value, cor_detalhe: f.cor_detalhe.value }),
    links: f => {
      const links = f.links.value.split("\n").map(l => l.trim()).filter(Boolean).map((l, i) => {
        const [rotulo, url] = l.split("|").map(s => (s || "").trim());
        if (!U.urlSegura(url)) throw new Error(`Linha ${i + 1}: o link precisa começar com https://`);
        return { rotulo: rotulo || url, url };
      });
      return { links };
    }
  };

  document.querySelectorAll("form[data-secao]").forEach(f => f.addEventListener("submit", async e => {
    e.preventDefault();
    const btn = f.querySelector('button[type="submit"]'); btn.disabled = true;
    try {
      if (f.dataset.secao === "senha") {
        if (f.senha1.value.length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");
        if (f.senha1.value !== f.senha2.value) throw new Error("As senhas não são iguais.");
        const { error } = await db.auth.updateUser({ password: f.senha1.value });
        if (error) throw error;
        f.reset(); Admin.aviso("Senha alterada.");
      } else {
        await Admin.salvarConfig(LEITORES[f.dataset.secao](f));
        Admin.aviso("Configurações salvas.");
      }
    } catch (ex) { Admin.aviso(Admin.mensagemErro(ex), true); }
    btn.disabled = false;
  }));

  if (location.hash === "#senha") document.getElementById("senha").scrollIntoView();
});
