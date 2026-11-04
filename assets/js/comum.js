// ============================================================
//  Funções compartilhadas entre o convite e o painel
// ============================================================
(function () {
  const cfg = window.CONFIG_CASAMENTO || {};
  const configurado = cfg.SUPABASE_URL && !cfg.SUPABASE_URL.startsWith("COLE_");

  window.db = configurado
    ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true }
      })
    : null;

  if (!configurado) {
    console.warn("Supabase não configurado: preencha assets/js/config.js");
  }

  const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho",
                 "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const SEMANA = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira",
                  "Quinta-feira", "Sexta-feira", "Sábado"];

  window.U = {
    MESES, SEMANA,

    // Escapa texto antes de inserir em HTML (evita injeção de código)
    esc(v) {
      return String(v ?? "").replace(/[&<>"']/g, c =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    },

    // Só aceita links http/https
    urlSegura(u) {
      try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : ""; }
      catch { return ""; }
    },

    // "2027-06-26" -> objeto com partes da data (sem fuso, evita erro de dia)
    partesData(iso) {
      if (!iso) return null;
      const [a, m, d] = iso.split("-").map(Number);
      const dt = new Date(Date.UTC(a, m - 1, d));
      return { ano: a, mes: m, dia: d, semana: SEMANA[dt.getUTCDay()], mesNome: MESES[m - 1] };
    },

    dataExtenso(iso) {
      const p = this.partesData(iso);
      return p ? `${p.dia} de ${p.mesNome} de ${p.ano}` : "";
    },

    dataCurta(iso) {
      const p = this.partesData(iso);
      return p ? `${String(p.dia).padStart(2, "0")}.${String(p.mes).padStart(2, "0")}.${p.ano}` : "";
    },

    // Data/hora do casamento no horário de Palmas (UTC-3, sem horário de verão)
    momentoCasamento(c) {
      if (!c.data_casamento) return null;
      return new Date(`${c.data_casamento}T${c.hora_cerimonia || "16:30"}:00-03:00`);
    },

    formatarMoeda(v) {
      if (v === null || v === undefined || v === "") return "";
      return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    },

    formatarDataHora(iso) {
      if (!iso) return "";
      return new Date(iso).toLocaleString("pt-BR", {
        timeZone: "America/Araguaina", day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit"
      });
    },

    // Máscara simples de telefone brasileiro
    mascaraTelefone(v) {
      const d = String(v).replace(/\D/g, "").slice(0, 11);
      if (d.length <= 2) return d.length ? `(${d}` : "";
      if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
      if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
      return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    },

    aplicarCores(c) {
      const r = document.documentElement.style;
      const hex = /^#[0-9a-f]{6}$/i;
      if (hex.test(c.cor_principal || "")) r.setProperty("--oliva", c.cor_principal);
      if (hex.test(c.cor_secundaria || "")) r.setProperty("--terracota", c.cor_secundaria);
      if (hex.test(c.cor_detalhe || "")) r.setProperty("--terracota-claro", c.cor_detalhe);
    },

    toast(msg, ms = 3500) {
      const t = document.getElementById("toast");
      if (!t) return alert(msg);
      t.textContent = msg; t.hidden = false;
      clearTimeout(t._t); t._t = setTimeout(() => (t.hidden = true), ms);
    }
  };
})();
