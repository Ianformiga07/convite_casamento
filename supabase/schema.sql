-- =====================================================================
--  CASAMENTO IAN & LAURA REGINA — Banco de dados (Supabase / PostgreSQL)
--  Rode este arquivo UMA VEZ no Supabase: SQL Editor > New query > Run.
--  Ele cria tabelas, segurança (RLS), funções seguras, Storage e os
--  dados iniciais (configurações e lista de presentes).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. FUNÇÕES AUXILIARES
-- ---------------------------------------------------------------------

-- Código aleatório e imprevisível para o link de cada convite (16 caracteres)
create or replace function public.gerar_codigo()
returns text
language sql
volatile
as $$
  select translate(
    encode(
      substring(uuid_send(gen_random_uuid()) from 1 for 6) ||
      substring(uuid_send(gen_random_uuid()) from 1 for 6),
      'base64'),
    '+/=', 'xyz');
$$;

-- Atualiza a coluna atualizado_em automaticamente
create or replace function public.tocar_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 1. TABELAS
-- ---------------------------------------------------------------------

-- Administradores (somente os noivos). O vínculo é com o usuário do Supabase Auth.
create table if not exists public.admins (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  email     text not null,
  criado_em timestamptz not null default now()
);

-- Configurações e textos do site (uma única linha, id = 1)
create table if not exists public.configuracoes (
  id            int primary key default 1 check (id = 1),
  dados         jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);

-- Convites (família / grupo / convidado individual)
create table if not exists public.convites (
  id             uuid primary key default gen_random_uuid(),
  codigo         text not null unique default public.gerar_codigo(),
  grupo          text not null check (char_length(grupo) between 1 and 120),
  titular        text not null check (char_length(titular) between 1 and 120),
  telefone       text check (telefone is null or char_length(telefone) <= 30),
  qtd_autorizada int  not null default 1 check (qtd_autorizada between 1 and 30),
  observacoes    text check (observacoes is null or char_length(observacoes) <= 1000),
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);

-- Resposta de presença (no máximo UMA por convite)
create table if not exists public.confirmacoes (
  id             uuid primary key default gen_random_uuid(),
  convite_id     uuid not null unique references public.convites(id) on delete cascade,
  nome           text not null check (char_length(nome) between 2 and 120),
  telefone       text check (telefone is null or char_length(telefone) <= 30),
  presenca       boolean not null,
  qtd_confirmada int not null default 0 check (qtd_confirmada between 0 and 30),
  acompanhantes  jsonb not null default '[]'::jsonb check (jsonb_typeof(acompanhantes) = 'array'),
  observacoes    text check (observacoes is null or char_length(observacoes) <= 1000),
  origem         text not null default 'convidado' check (origem in ('convidado', 'admin')),
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  check ((presenca and qtd_confirmada >= 1) or (not presenca and qtd_confirmada = 0))
);

-- Lista de presentes
create table if not exists public.presentes (
  id                 uuid primary key default gen_random_uuid(),
  nome               text not null check (char_length(nome) between 1 and 150),
  descricao          text check (descricao is null or char_length(descricao) <= 1000),
  categoria          text not null default 'Outros' check (char_length(categoria) between 1 and 60),
  valor              numeric(10,2) check (valor is null or valor >= 0),
  imagem_url         text,
  link_loja          text,
  status             text not null default 'disponivel'
                     check (status in ('disponivel', 'reservado', 'indisponivel')),
  reservado_por      text check (reservado_por is null or char_length(reservado_por) <= 80),
  reservado_em       timestamptz,
  reservado_convite  uuid references public.convites(id) on delete set null, -- privado
  ordem              int not null default 0,
  criado_em          timestamptz not null default now(),
  atualizado_em      timestamptz not null default now(),
  check ((status = 'reservado') = (reservado_por is not null))
);

-- Linha do tempo "Nossa história"
create table if not exists public.historia (
  id        uuid primary key default gen_random_uuid(),
  ano       text not null check (char_length(ano) between 1 and 20),
  titulo    text not null check (char_length(titulo) between 1 and 120),
  texto     text check (texto is null or char_length(texto) <= 2000),
  foto_url  text,
  ordem     int not null default 0,
  criado_em timestamptz not null default now()
);

-- Programação do dia
create table if not exists public.programacao (
  id        uuid primary key default gen_random_uuid(),
  horario   text not null check (char_length(horario) between 1 and 20),
  titulo    text not null check (char_length(titulo) between 1 and 120),
  descricao text check (descricao is null or char_length(descricao) <= 500),
  icone     text not null default 'fa-heart',
  ordem     int not null default 0,
  criado_em timestamptz not null default now()
);

-- Perguntas frequentes
create table if not exists public.faq (
  id        uuid primary key default gen_random_uuid(),
  pergunta  text not null check (char_length(pergunta) between 1 and 200),
  resposta  text not null check (char_length(resposta) between 1 and 2000),
  ordem     int not null default 0,
  criado_em timestamptz not null default now()
);

create index if not exists presentes_ordem_idx  on public.presentes (ordem, nome);
create index if not exists historia_ordem_idx   on public.historia (ordem);
create index if not exists programacao_ordem_idx on public.programacao (ordem);
create index if not exists faq_ordem_idx        on public.faq (ordem);

drop trigger if exists t_convites_upd on public.convites;
create trigger t_convites_upd before update on public.convites
  for each row execute function public.tocar_atualizado_em();
drop trigger if exists t_confirmacoes_upd on public.confirmacoes;
create trigger t_confirmacoes_upd before update on public.confirmacoes
  for each row execute function public.tocar_atualizado_em();
drop trigger if exists t_presentes_upd on public.presentes;
create trigger t_presentes_upd before update on public.presentes
  for each row execute function public.tocar_atualizado_em();
drop trigger if exists t_config_upd on public.configuracoes;
create trigger t_config_upd before update on public.configuracoes
  for each row execute function public.tocar_atualizado_em();

-- Trava de integridade: vale para convidados E para o painel
create or replace function public.validar_confirmacao()
returns trigger
language plpgsql
as $$
declare v_max int;
begin
  select qtd_autorizada into v_max from public.convites where id = new.convite_id;
  if new.presenca and new.qtd_confirmada > v_max then
    raise exception 'Este convite permite no máximo % pessoa(s).', v_max;
  end if;
  if new.presenca and jsonb_array_length(new.acompanhantes) <> new.qtd_confirmada - 1 then
    raise exception 'Informe o nome de % acompanhante(s).', new.qtd_confirmada - 1;
  end if;
  if not new.presenca then
    new.acompanhantes := '[]'::jsonb;
  end if;
  return new;
end;
$$;

drop trigger if exists t_confirmacoes_validar on public.confirmacoes;
create trigger t_confirmacoes_validar before insert or update on public.confirmacoes
  for each row execute function public.validar_confirmacao();

create or replace function public.validar_reducao_convite()
returns trigger
language plpgsql
as $$
declare v_conf int;
begin
  select qtd_confirmada into v_conf from public.confirmacoes
   where convite_id = new.id and presenca;
  if v_conf is not null and new.qtd_autorizada < v_conf then
    raise exception 'Este convite já tem % pessoa(s) confirmada(s). Ajuste a confirmação antes de reduzir.', v_conf;
  end if;
  return new;
end;
$$;

drop trigger if exists t_convites_validar on public.convites;
create trigger t_convites_validar before update of qtd_autorizada on public.convites
  for each row execute function public.validar_reducao_convite();

-- ---------------------------------------------------------------------
-- 2. SEGURANÇA — ROW LEVEL SECURITY
--    Visitantes (anon) NÃO leem nem gravam nenhuma tabela diretamente.
--    Tudo que é público passa pelas funções da seção 3.
--    Apenas usuários presentes na tabela admins acessam as tabelas.
-- ---------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

alter table public.admins        enable row level security;
alter table public.configuracoes enable row level security;
alter table public.convites      enable row level security;
alter table public.confirmacoes  enable row level security;
alter table public.presentes     enable row level security;
alter table public.historia      enable row level security;
alter table public.programacao   enable row level security;
alter table public.faq           enable row level security;

-- Remove qualquer permissão direta do público
revoke all on public.admins, public.configuracoes, public.convites, public.confirmacoes,
              public.presentes, public.historia, public.programacao, public.faq
  from anon;

grant select, insert, update, delete on
  public.configuracoes, public.convites, public.confirmacoes,
  public.presentes, public.historia, public.programacao, public.faq
  to authenticated;
grant select on public.admins to authenticated;

-- admins: cada admin só enxerga a si mesmo (inclusões são feitas pelo SQL Editor)
drop policy if exists admins_select on public.admins;
create policy admins_select on public.admins
  for select to authenticated using (user_id = auth.uid());

-- Demais tabelas: acesso total somente para admins
do $$
declare t text;
begin
  foreach t in array array['configuracoes','convites','confirmacoes','presentes','historia','programacao','faq']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_admin', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      t || '_admin', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 3. FUNÇÕES PÚBLICAS SEGURAS (chamadas pelo convite via RPC)
-- ---------------------------------------------------------------------

-- 3.1 Conteúdo público do site em uma única chamada
create or replace function public.obter_site()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'config', coalesce((select dados from configuracoes where id = 1), '{}'::jsonb),
    'historia', coalesce((select jsonb_agg(jsonb_build_object(
        'ano', ano, 'titulo', titulo, 'texto', texto, 'foto_url', foto_url)
        order by ordem, criado_em) from historia), '[]'::jsonb),
    'programacao', coalesce((select jsonb_agg(jsonb_build_object(
        'horario', horario, 'titulo', titulo, 'descricao', descricao, 'icone', icone)
        order by ordem, criado_em) from programacao), '[]'::jsonb),
    'faq', coalesce((select jsonb_agg(jsonb_build_object(
        'pergunta', pergunta, 'resposta', resposta)
        order by ordem, criado_em) from faq), '[]'::jsonb)
  );
$$;

-- 3.2 Lista pública de presentes (somente campos públicos; esconde indisponíveis)
create or replace function public.listar_presentes()
returns table (
  id uuid, nome text, descricao text, categoria text, valor numeric,
  imagem_url text, link_loja text, status text, reservado_por text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.nome, p.descricao, p.categoria,
         case when coalesce((c.dados->>'mostrar_valores')::boolean, true) then p.valor end,
         p.imagem_url, p.link_loja, p.status, p.reservado_por
    from presentes p
    left join configuracoes c on c.id = 1
   where p.status in ('disponivel', 'reservado')
     and coalesce((c.dados->>'lista_presentes_ativa')::boolean, true)
   order by p.ordem, p.nome;
$$;

-- 3.3 Reserva ATÔMICA de presente
--     O UPDATE só altera a linha se ela ainda estiver 'disponivel'.
--     Duas tentativas simultâneas: o PostgreSQL bloqueia a linha, a
--     primeira grava, a segunda reavalia a condição e não altera nada.
create or replace function public.reservar_presente(
  p_presente uuid,
  p_nome     text,
  p_codigo   text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_nome    text := regexp_replace(regexp_replace(btrim(coalesce(p_nome, '')), '[<>]', '', 'g'), '\s+', ' ', 'g');
  v_convite uuid;
  v_ativa   boolean;
  v_reg     presentes%rowtype;
  v_qtd     int;
begin
  select coalesce((dados->>'lista_presentes_ativa')::boolean, true)
    into v_ativa from configuracoes where id = 1;
  if not coalesce(v_ativa, true) then
    return jsonb_build_object('ok', false, 'erro', 'A lista de presentes está fechada no momento.');
  end if;

  if char_length(v_nome) < 2 or char_length(v_nome) > 80 then
    return jsonb_build_object('ok', false, 'erro', 'Informe um nome entre 2 e 80 caracteres.');
  end if;

  if p_codigo is not null and p_codigo <> '' then
    select id into v_convite from convites where codigo = p_codigo;
  end if;

  -- Proteção simples contra abuso: um mesmo convite reserva no máximo 5 presentes
  if v_convite is not null then
    select count(*) into v_qtd from presentes where reservado_convite = v_convite;
    if v_qtd >= 5 then
      return jsonb_build_object('ok', false, 'erro', 'Este convite já reservou o número máximo de presentes.');
    end if;
  end if;

  update presentes
     set status = 'reservado',
         reservado_por = v_nome,
         reservado_em = now(),
         reservado_convite = v_convite
   where id = p_presente
     and status = 'disponivel'
  returning * into v_reg;

  if not found then
    if exists (select 1 from presentes where id = p_presente and status = 'reservado') then
      return jsonb_build_object('ok', false, 'erro', 'Que pena! Este presente acabou de ser escolhido por outra pessoa.');
    end if;
    return jsonb_build_object('ok', false, 'erro', 'Este presente não está disponível.');
  end if;

  return jsonb_build_object('ok', true, 'presente', v_reg.nome, 'reservado_por', v_reg.reservado_por);
end;
$$;

-- 3.4 Dados do convite pelo código do link (somente o necessário)
create or replace function public.obter_convite(p_codigo text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
           'grupo', c.grupo,
           'titular', c.titular,
           'qtd_autorizada', c.qtd_autorizada,
           'resposta', case when r.id is null then null else jsonb_build_object(
               'nome', r.nome, 'telefone', r.telefone, 'presenca', r.presenca,
               'qtd_confirmada', r.qtd_confirmada, 'acompanhantes', r.acompanhantes,
               'observacoes', r.observacoes, 'atualizado_em', r.atualizado_em) end)
    from convites c
    left join confirmacoes r on r.convite_id = c.id
   where c.codigo = p_codigo
     and char_length(coalesce(p_codigo, '')) between 8 and 40;
$$;

-- 3.5 Confirmação de presença (cria ou atualiza; valida tudo no servidor)
create or replace function public.responder_rsvp(
  p_codigo        text,
  p_nome          text,
  p_telefone      text,
  p_presenca      boolean,
  p_qtd           int,
  p_acompanhantes text[] default '{}',
  p_observacoes   text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_conv    convites%rowtype;
  v_cfg     jsonb;
  v_prazo   date;
  v_hoje    date := (now() at time zone 'America/Araguaina')::date;
  v_nome    text := regexp_replace(regexp_replace(btrim(coalesce(p_nome, '')), '[<>]', '', 'g'), '\s+', ' ', 'g');
  v_tel     text := nullif(regexp_replace(coalesce(p_telefone, ''), '[^0-9+() -]', '', 'g'), '');
  v_obs     text := nullif(btrim(coalesce(p_observacoes, '')), '');
  v_acomp   text[] := '{}';
  v_item    text;
  v_qtd     int := coalesce(p_qtd, 0);
begin
  select dados into v_cfg from configuracoes where id = 1;
  if not coalesce((v_cfg->>'rsvp_ativo')::boolean, true) then
    return jsonb_build_object('ok', false, 'erro', 'A confirmação de presença está encerrada.');
  end if;

  v_prazo := nullif(v_cfg->>'rsvp_prazo', '')::date;
  if v_prazo is not null and v_hoje > v_prazo then
    return jsonb_build_object('ok', false, 'erro', 'O prazo para confirmação de presença terminou.');
  end if;

  select * into v_conv from convites where codigo = p_codigo;
  if not found then
    return jsonb_build_object('ok', false, 'erro', 'Convite não encontrado. Verifique o link recebido.');
  end if;

  if char_length(v_nome) < 3 or char_length(v_nome) > 120 then
    return jsonb_build_object('ok', false, 'erro', 'Informe seu nome completo.');
  end if;
  if v_tel is null or char_length(regexp_replace(v_tel, '[^0-9]', '', 'g')) < 10
     or char_length(v_tel) > 30 then
    return jsonb_build_object('ok', false, 'erro', 'Informe um telefone/WhatsApp válido, com DDD.');
  end if;
  if p_presenca is null then
    return jsonb_build_object('ok', false, 'erro', 'Informe se você comparecerá.');
  end if;
  if v_obs is not null and char_length(v_obs) > 1000 then
    return jsonb_build_object('ok', false, 'erro', 'As observações devem ter no máximo 1000 caracteres.');
  end if;

  if p_presenca then
    if v_qtd < 1 or v_qtd > v_conv.qtd_autorizada then
      return jsonb_build_object('ok', false, 'erro',
        format('A quantidade de pessoas deve ser entre 1 e %s.', v_conv.qtd_autorizada));
    end if;
    foreach v_item in array coalesce(p_acompanhantes, '{}') loop
      v_item := regexp_replace(regexp_replace(btrim(coalesce(v_item, '')), '[<>]', '', 'g'), '\s+', ' ', 'g');
      if v_item <> '' then
        if char_length(v_item) > 120 then
          return jsonb_build_object('ok', false, 'erro', 'Nome de acompanhante muito longo.');
        end if;
        v_acomp := v_acomp || v_item;
      end if;
    end loop;
    if coalesce(array_length(v_acomp, 1), 0) <> v_qtd - 1 then
      return jsonb_build_object('ok', false, 'erro',
        format('Informe o nome de %s acompanhante(s).', v_qtd - 1));
    end if;
  else
    v_qtd := 0;
    v_acomp := '{}';
  end if;

  insert into confirmacoes (convite_id, nome, telefone, presenca, qtd_confirmada,
                            acompanhantes, observacoes, origem)
  values (v_conv.id, v_nome, v_tel, p_presenca, v_qtd, to_jsonb(v_acomp), v_obs, 'convidado')
  on conflict (convite_id) do update
     set nome = excluded.nome,
         telefone = excluded.telefone,
         presenca = excluded.presenca,
         qtd_confirmada = excluded.qtd_confirmada,
         acompanhantes = excluded.acompanhantes,
         observacoes = excluded.observacoes,
         origem = 'convidado';

  return jsonb_build_object('ok', true, 'presenca', p_presenca, 'qtd', v_qtd);
end;
$$;

-- Permissões das funções: só as públicas ficam liberadas para visitantes
revoke execute on all functions in schema public from public, anon;
grant execute on function public.obter_site()                                   to anon, authenticated;
grant execute on function public.listar_presentes()                             to anon, authenticated;
grant execute on function public.reservar_presente(uuid, text, text)            to anon, authenticated;
grant execute on function public.obter_convite(text)                            to anon, authenticated;
grant execute on function public.responder_rsvp(text, text, text, boolean, int, text[], text)
                                                                                 to anon, authenticated;
grant execute on function public.is_admin()                                     to authenticated;
grant execute on function public.gerar_codigo()                                 to authenticated;
grant execute on function public.tocar_atualizado_em()                          to authenticated;

-- ---------------------------------------------------------------------
-- 4. STORAGE — bucket público "imagens" (fotos do casal, presentes, monograma)
--    Leitura pública; envio/alteração/exclusão somente por admins.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('imagens', 'imagens', true)
on conflict (id) do update set public = true;

drop policy if exists imagens_admin_insert on storage.objects;
create policy imagens_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'imagens' and public.is_admin());

drop policy if exists imagens_admin_update on storage.objects;
create policy imagens_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'imagens' and public.is_admin());

drop policy if exists imagens_admin_delete on storage.objects;
create policy imagens_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'imagens' and public.is_admin());

-- ---------------------------------------------------------------------
-- 5. DADOS INICIAIS (informações confirmadas pelos noivos)
-- ---------------------------------------------------------------------
insert into public.configuracoes (id, dados) values (1, jsonb_build_object(
  'noivo',               'Ian Leandro',
  'noiva',               'Laura Regina',
  'nomes_curtos',        'Ian & Laura Regina',
  'assinatura',          'Com amor, Ian Leandro e Laura Regina',
  'frase_abertura',      'Com a bênção de Deus e de nossas famílias, temos a alegria de convidar você para celebrar o nosso amor.',
  'data_casamento',      '2027-06-26',
  'hora_cerimonia',      '16:30',
  'duracao_horas',       6,
  'local_nome',          'Chácara Luar do Lago Eventos',
  'local_endereco',      'Palmas – TO, 77002-000',
  'local_maps_url',      '',
  'recepcao_mesmo_local', true,
  'recepcao_nome',       '',
  'recepcao_endereco',   '',
  'recepcao_maps_url',   '',
  'aviso_chegada',       'O casamento iniciará pontualmente às 16:30. Chegue com 30 minutos de antecedência.',
  'historia_titulo',     'Juntos desde 2015',
  'historia_texto',      'Uma história que começou em 2015 e que, a cada capítulo, nos trouxe até aqui.',
  'historia_foto_url',   '',
  'presentes_texto',     'Preparamos com muito carinho uma seleção de presentes para nossa nova casa. Escolhemos itens úteis e especiais para essa nova etapa da nossa vida. Quem desejar nos presentear poderá escolher qualquer uma das opções abaixo.',
  'rsvp_texto',          'Sua presença é muito importante para nós. Por favor, confirme até a data abaixo.',
  'rsvp_prazo',          '2027-03-26',
  'rsvp_ativo',          true,
  'lista_presentes_ativa', true,
  'mostrar_valores',     true,
  'final_titulo',        'Obrigado',
  'final_texto',         'Estamos felizes por ter vocês ao nosso lado nesse dia tão especial.',
  'monograma_url',       '',
  'logo_url',            '',
  'cor_principal',       '#556B2F',
  'cor_secundaria',      '#A13D19',
  'cor_detalhe',         '#E2725B',
  'links',               '[]'::jsonb,
  'whatsapp_texto',      'Olá, {grupo}! 💍 Com muita alegria, convidamos vocês para o nosso casamento. Acesse o convite e confirme sua presença: {link}'
))
on conflict (id) do nothing;

insert into public.programacao (horario, titulo, descricao, icone, ordem)
select * from (values
  ('16:00', 'Chegada dos convidados', 'Chegue com 30 minutos de antecedência.', 'fa-door-open', 1),
  ('16:30', 'Cerimônia', 'Início pontual.', 'fa-ring', 2)
) v(horario, titulo, descricao, icone, ordem)
where not exists (select 1 from public.programacao);

insert into public.faq (pergunta, resposta, ordem)
select * from (values
  ('Qual o horário de chegada?', 'A cerimônia começa pontualmente às 16:30. Pedimos que você chegue com 30 minutos de antecedência.', 1),
  ('Como confirmo minha presença?', 'Pelo link personalizado que você recebeu pelo WhatsApp, na seção "Confirme sua presença". Pelo mesmo link você pode alterar sua resposta, se precisar.', 2),
  ('Até quando posso confirmar?', 'Até 26 de março de 2027.', 3),
  ('Como funciona a lista de presentes?', 'Escolha um presente, informe seu nome e confirme. Ele fica reservado para você e não poderá ser escolhido por outra pessoa. A compra é feita por você, diretamente na loja de sua preferência.', 4)
) v(pergunta, resposta, ordem)
where not exists (select 1 from public.faq);

insert into public.presentes (nome, categoria, link_loja, ordem)
select * from (values
  ('Geladeira Brastemp Frost Free Duplex 385L Inox', 'Eletrodomésticos e Móveis',
   'https://www.mercadolivre.com.br/geladeira-brastemp-frost-free-duplex-385l-inox-brm46mk/up/MLBU4867943357?pdp_filters=item_id%3AMLB7479709966', 1),
  ('Sofá Retrátil Reclinável Nairobi 2,38m', 'Eletrodomésticos e Móveis',
   'https://www.mercadolivre.com.br/p/MLB37850627?attributes=LEGS_COLOR:MLB38227797,UPHOLSTERY_MATERIAL:MLB38227797,IS_RECLINABLE:MLB38227797,LEGS_MATERIAL:MLB38227797,COLOR:MLB37850627&pdp_filters=item_id:MLB4265643409', 2),
  ('Lava-louças Brastemp 8 Serviços Inox', 'Eletrodomésticos e Móveis',
   'https://share.google/Ac44kEwVl6nL63T2s', 3),
  ('Ar-condicionado Inverter Philco 12.000 BTUs', 'Eletrodomésticos e Móveis',
   'https://www.mercadolivre.com.br/ar-condicionado-inverter-philco-pac12qg-12000-btus-qf-220v/up/MLBU3898145790?pdp_filters=item_id%3AMLB6600974182', 4),
  ('Máquina de Lavar Consul 14kg', 'Eletrodomésticos e Móveis',
   'https://a.co/d/02I3wOPV', 5),
  ('Cafeteira Oster Programável 1,2L', 'Eletroportáteis e Cozinha',
   'https://share.google/jdcWw2ygZiyBdl7cV', 6),
  ('Batedeira Planetária Philco 900W – 5L', 'Eletroportáteis e Cozinha',
   'https://share.google/VnsL7M6zKKWBrSMte', 7),
  ('Panificadora Automática Britânia Multipane', 'Eletroportáteis e Cozinha',
   'https://a.co/d/0964bEFC', 8),
  ('Panela de Pressão Elétrica Philco 6L', 'Eletroportáteis e Cozinha',
   'https://share.google/0TRx17200l3pVE2TZ', 9),
  ('Chaleira Elétrica Best', 'Eletroportáteis e Cozinha',
   'https://share.google/fluz29FtqbpJnzUQK', 10),
  ('Jogo de Panelas Brinox Carbon Ceramic Life – 5 Peças', 'Panelas, Utensílios e Mesa Posta',
   'https://www.mercadolivre.com.br/up/MLBU3730412799?pdp_filters=item_id:MLB6175689770', 11),
  ('Panela de Pressão Brinox Ceramic Life 4,2L', 'Panelas, Utensílios e Mesa Posta',
   'https://m.magazineluiza.com.br/panela-de-pressao-inducao-brinox-antiaderente-ceramic-life-pressure-42l-vanilla/p/kgj7j0k807/ud/udpp/?seller_id=mimorada', 12),
  ('Aparelho de Jantar Oxford Ryo Maresia – 16 Peças', 'Panelas, Utensílios e Mesa Posta',
   'https://www.mercadolivre.com.br/p/MLB42260859?pdp_filters=item_id:MLB6193866172', 13),
  ('Faqueiro Dourado Inox – 24 Peças', 'Panelas, Utensílios e Mesa Posta',
   'https://www.mercadolivre.com.br/kit-faqueiro-dourado-luxo-jogo-talheres-inox-24pcs--maleta/up/MLBU3958354605?pdp_filters=item_id%3AMLB4675790077', 14),
  ('Kit de Talheres para Churrasco Tramontina', 'Panelas, Utensílios e Mesa Posta',
   'https://share.google/gaG2Yxb2EKT8Fih4M', 15),
  ('Kit Tábua de Churrasco Personalizada com Estojo', 'Panelas, Utensílios e Mesa Posta',
   'https://www.mercadolivre.com.br/kit-tabua-churrasco-rustica-personalizado-estojo-completo/p/MLB69663396?pdp_filters=item_id%3AMLB4681853351', 16),
  ('Kit com 2 Travessas de Cerâmica (M e P)', 'Panelas, Utensílios e Mesa Posta',
   'https://produto.mercadolivre.com.br/MLB-3999196403?attributes=PATTERN_NAME:UsO6c3RpY28=,COLOR_SECONDARY_COLOR:QWNxdWEgTWFyaW5l', 17)
) v(nome, categoria, link_loja, ordem)
where not exists (select 1 from public.presentes);

-- ---------------------------------------------------------------------
-- 6. ÚLTIMO PASSO (rode depois de criar os 2 usuários em Authentication > Users)
--    Troque pelos e-mails reais dos noivos e execute:
--
-- insert into public.admins (user_id, email)
-- select id, email from auth.users
--  where email in ('email-do-ian@exemplo.com', 'email-da-laura@exemplo.com')
-- on conflict (user_id) do nothing;
-- ---------------------------------------------------------------------
