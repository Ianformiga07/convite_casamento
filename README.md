# Casamento Ian & Laura Regina

Convite digital interativo, com lista de presentes, confirmação de presença e painel administrativo.
**Sábado, 26 de junho de 2027, às 16:30 · Chácara Luar do Lago Eventos · Palmas-TO**

- **Site público (convite):** `index.html`
- **Painel dos noivos:** `/admin/`
- **Hospedagem:** Netlify (gratuito) + Supabase (gratuito: banco, login e imagens)

---

## 1. Estrutura dos arquivos

```
casamento-ian-laura/
├── index.html                  → o convite (página única)
├── 404.html                    → página de "não encontrado"
├── netlify.toml                → configuração do Netlify (segurança, cache, build)
├── admin/                      → painel (uma página por tela)
│   ├── index.html              → login
│   ├── dashboard.html          → visão geral, indicadores e gráficos
│   ├── convidados.html         → convites, links individuais, WhatsApp, importação
│   ├── confirmacoes.html       → respostas de presença (ver e alterar)
│   ├── presentes.html          → lista de presentes e reservas
│   ├── conteudo.html           → textos, história, programação, perguntas
│   ├── configuracoes.html      → data, local, prazo, cores, monograma, senha
│   └── relatorios.html         → relatórios em Excel e PDF
├── assets/
│   ├── css/  site.css (convite) · admin.css (painel) · fontes.css
│   ├── js/   config.js (conexão) · comum.js (funções comuns) · site.js (convite)
│   │   └── admin/  base.js (comum do painel) + um arquivo .js por tela
│   ├── images/  monograma, ramos de oliveira, textura de papel, favicon, prévia do WhatsApp
│   ├── fonts/   Cormorant Garamond, Great Vibes, Questrial (hospedadas no próprio site)
│   └── vendor/  Supabase, Font Awesome, SheetJS (Excel), jsPDF (PDF)
├── supabase/schema.sql         → banco completo: tabelas, segurança, funções, dados iniciais
├── scripts/gerar-config.js     → gera o config.js no Netlify a partir das variáveis
└── netlify/functions/manter-ativo.mjs → mantém o Supabase ativo (roda 1x por dia)
```

Para mudar algo de uma tela do painel, você mexe só em `admin/<tela>.html` e `assets/js/admin/<tela>.js`.

---

## 2. Configurar o Supabase (uma vez)

1. Crie uma conta em **supabase.com** e clique em **New project**.
   Nome: `casamento-ian-laura`. Região: **South America (São Paulo)**. Anote a senha do banco.
2. **Criar o banco:** menu **SQL Editor → New query**. Cole todo o conteúdo de `supabase/schema.sql` e clique em **Run**.
   Isso cria as tabelas, as regras de segurança, o espaço de imagens e já cadastra as configurações do casamento e os **17 presentes**.
3. **Bloquear cadastro público:** **Authentication → Sign In / Providers → Email**:
   desmarque **Allow new users to sign up**. Só os noivos terão conta.
4. **Criar os 2 usuários:** **Authentication → Users → Add user → Create new user**.
   Informe e-mail e senha de cada um e marque **Auto Confirm User**.
5. **Dar permissão de administrador:** volte ao **SQL Editor** e rode, trocando pelos e-mails reais:
   ```sql
   insert into public.admins (user_id, email)
   select id, email from auth.users
    where email in ('email-do-ian@exemplo.com', 'email-da-laura@exemplo.com')
   on conflict (user_id) do nothing;
   ```
6. **Pegar as chaves:** **Project Settings → API**. Copie:
   - **Project URL** (ex.: `https://abcdxyz.supabase.co`)
   - a chave **anon public** (ou **publishable**).
   ⚠️ Nunca use a chave **service_role / secret** no site. O sistema recusa essa chave automaticamente.

---

## 3. Publicar no Netlify

1. Crie uma conta em **netlify.com**.
2. Envie o projeto de uma destas formas:
   - **GitHub (recomendado):** suba esta pasta para um repositório e, no Netlify, clique em **Add new site → Import an existing project**.
   - **Sem GitHub:** use **Add new site → Deploy manually**. Nesse caso, antes de arrastar a pasta, preencha `assets/js/config.js` manualmente, porque o envio manual não roda o build.
3. Em **Site configuration → Environment variables**, crie:
   | Variável | Valor |
   |---|---|
   | `SUPABASE_URL` | a Project URL |
   | `SUPABASE_ANON_KEY` | a chave anon public |
4. Clique em **Deploys → Trigger deploy**. O build gera o `config.js` sozinho.
5. Em **Domain management**, troque o nome do site, por exemplo `ianelaura.netlify.app`.
6. **Volte ao Supabase:** **Authentication → URL Configuration**:
   - **Site URL:** `https://ianelaura.netlify.app`
   - **Redirect URLs:** adicione `https://ianelaura.netlify.app/admin/configuracoes.html`
     (necessário para o "Esqueci minha senha" funcionar).

A função `manter-ativo` passa a rodar todo dia automaticamente. No plano gratuito, projetos sem uso por cerca de uma semana são pausados, e ela evita isso. Você pode conferir em **Netlify → Logs → Functions**.

---

## 4. Uso no dia a dia (painel)

Acesse `https://seu-site.netlify.app/admin/` e entre com o e-mail e a senha de um dos noivos.

| Tarefa | Onde |
|---|---|
| Cadastrar convites e definir quantas pessoas cada um contempla | **Convidados → Novo convite** |
| Cadastrar vários de uma vez (copiando do Excel) | **Convidados → Importar lista** |
| Enviar o convite pelo WhatsApp com o link individual | botão **Enviar** em cada convite |
| Ver quem confirmou, alterar ou registrar uma resposta recebida por telefone | **Confirmações** |
| Fotos e valores dos presentes, cancelar reserva, esconder um presente | **Presentes** |
| Fotos e marcos da linha do tempo desde 2015 | **Conteúdo → Nossa história** |
| Adicionar horários (recepção, jantar, festa…) | **Conteúdo → Programação** |
| Perguntas frequentes (estacionamento, crianças…) | **Conteúdo → Perguntas frequentes** |
| Link exato do Google Maps, prazo, abrir e fechar RSVP e lista | **Configurações** |
| Lista para a portaria, relatórios de presentes | **Relatórios** (Excel ou PDF) |

**Como funcionam os links individuais:** cada convite recebe um código aleatório, por exemplo `https://seu-site.netlify.app/?c=K7m2Qx9pLaBc4dEf`.
Pelo link, o convidado vê "Convite especial para Família Silva", confirma com o limite de pessoas daquele convite e pode **alterar a resposta pelo mesmo link** até o prazo. O link geral, sem código, mostra o convite e a lista de presentes; o formulário de presença pede o link pessoal.

**Preencha ainda:** fotos e marcos da história, link exato do Google Maps da chácara, demais horários da programação, fotos dos presentes e as perguntas sobre estacionamento e crianças.

---

## 5. Segurança (o que está protegido)

- Visitantes **não leem nem gravam nenhuma tabela diretamente**. Tudo passa por funções no banco, que validam os dados:
  - `obter_site`: conteúdo público;
  - `listar_presentes`: lista com dados públicos;
  - `reservar_presente`: reserva;
  - `obter_convite`: dados do convite pelo código;
  - `responder_rsvp`: confirmação de presença.
- **Reserva de presente atômica:** a gravação só acontece se o presente ainda estiver disponível, numa única operação do banco. Testado com 20 tentativas simultâneas no mesmo presente: apenas 1 conseguiu.
- **Limite de acompanhantes** garantido no banco: nem pelo navegador, nem pelo painel é possível confirmar mais pessoas do que o convite permite.
- Telefones, observações e respostas só são visíveis no painel, para os 2 administradores.
- O painel exige login, e o usuário precisa estar na tabela `admins`. Um usuário logado que não seja admin não vê nada.
- Nomes digitados por visitantes são sempre exibidos como texto, nunca como código.
- Cabeçalhos de segurança, incluindo CSP, ficam no `netlify.toml`. Os arquivos `supabase/`, `scripts/` e `README.md` não ficam acessíveis pelo navegador.

---

## 6. Testar antes de enviar aos convidados

1. No painel, cadastre um convite de teste para você com 2 pessoas e abra o link dele.
2. Confirme presença. Tente colocar 3 pessoas: o botão "+" para no 2.
3. Altere a resposta pelo mesmo link e veja a mudança em **Confirmações**.
4. Reserve um presente. Abra o site em outro celular e veja "Escolhido por…".
5. No painel, cancele essa reserva e exclua o convite de teste.
6. Abra o link no WhatsApp para conferir a prévia com o monograma.

---

## 7. Testar no computador (opcional)

Preencha `assets/js/config.js` com a URL e a chave anon e rode, dentro da pasta:
```
npx serve .
```
Depois abra o endereço mostrado. Abrir o `index.html` direto com dois cliques não funciona, porque o navegador bloqueia a conexão.
