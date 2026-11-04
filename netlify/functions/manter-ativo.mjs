// =====================================================================
//  Função agendada do Netlify: roda uma vez por dia e faz uma consulta
//  leve ao Supabase, para o projeto gratuito não ser pausado por
//  inatividade até o casamento. Usa as mesmas variáveis de ambiente.
// =====================================================================
export default async () => {
  const url = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
  const chave = process.env.SUPABASE_ANON_KEY;
  if (!url || !chave) return new Response("Variáveis do Supabase não definidas", { status: 500 });

  const r = await fetch(`${url}/rest/v1/rpc/obter_site`, {
    method: "POST",
    headers: { apikey: chave, Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
    body: "{}"
  });
  console.log(`Supabase respondeu ${r.status}`);
  return new Response(`ok ${r.status}`);
};

export const config = { schedule: "@daily" };
