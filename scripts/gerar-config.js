// =====================================================================
//  Roda no Netlify a cada publicação (veja netlify.toml).
//  Lê as variáveis de ambiente SUPABASE_URL e SUPABASE_ANON_KEY e
//  grava assets/js/config.js, que o site usa para falar com o Supabase.
// =====================================================================
const fs = require("fs");
const path = require("path");

const url = (process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
const chave = (process.env.SUPABASE_ANON_KEY || "").trim();
const destino = path.join(__dirname, "..", "assets", "js", "config.js");

if (!url || !chave) {
  const atual = fs.existsSync(destino) ? fs.readFileSync(destino, "utf8") : "";
  if (atual && !atual.includes("COLE_AQUI")) {
    console.log("Variáveis não definidas: mantendo o assets/js/config.js já preenchido.");
    process.exit(0);
  }
  console.error("ERRO: defina SUPABASE_URL e SUPABASE_ANON_KEY em Netlify > Site configuration > Environment variables.");
  process.exit(1);
}

if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)) {
  console.warn(`Aviso: SUPABASE_URL fora do padrão esperado (https://xxxx.supabase.co): ${url}`);
}

// Proteção: a chave service_role NUNCA pode ir para o navegador
try {
  const carga = JSON.parse(Buffer.from(chave.split(".")[1], "base64url").toString());
  if (carga.role && carga.role !== "anon") {
    console.error(`ERRO: SUPABASE_ANON_KEY contém uma chave "${carga.role}". Use a chave "anon public".`);
    process.exit(1);
  }
} catch { /* chaves no formato novo (sb_publishable_...) não são JWT */ }
if (/^sb_secret_/.test(chave)) {
  console.error("ERRO: SUPABASE_ANON_KEY contém uma chave secreta. Use a chave pública (publishable/anon).");
  process.exit(1);
}

fs.writeFileSync(destino,
`// Gerado automaticamente pelo Netlify em ${new Date().toISOString()} — não edite aqui.
window.CONFIG_CASAMENTO = {
  SUPABASE_URL: ${JSON.stringify(url)},
  SUPABASE_ANON_KEY: ${JSON.stringify(chave)}
};
`);
console.log("assets/js/config.js gerado com sucesso.");

// Prévia do link no WhatsApp: a imagem precisa de endereço completo.
// O Netlify informa o endereço do site na variável URL.
const site = (process.env.URL || "").replace(/\/+$/, "");
if (site) {
  const index = path.join(__dirname, "..", "index.html");
  const html = fs.readFileSync(index, "utf8")
    .replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${site}/assets/images/og-image.jpg$2`)
    .replace(/(<meta property="og:type" content="website">)/, `$1\n  <meta property="og:url" content="${site}/">`);
  fs.writeFileSync(index, html);
  console.log(`Prévia do WhatsApp apontando para ${site}`);
}
