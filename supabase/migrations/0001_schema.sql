-- =====================================================================
-- Achadinhos · link na bio
-- Rode este arquivo inteiro no SQL Editor do Supabase (uma vez).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Administradores: só quem estiver aqui consegue escrever.
-- ---------------------------------------------------------------------
create table if not exists public.admins (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------
-- Categorias
-- ---------------------------------------------------------------------
create table if not exists public.categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null unique,
  ordem int not null default 0,
  ativa boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Produtos
-- ---------------------------------------------------------------------
create table if not exists public.produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  categoria_id uuid references public.categorias(id) on delete set null,
  preco numeric(12,2),
  preco_antes numeric(12,2),
  desconto int check (desconto between 0 and 100),
  loja text not null default 'Mercado Livre',
  link text not null,
  loja_item_id text,
  disponivel boolean not null default true,
  preco_atualizado_em timestamptz,
  preco_manual boolean not null default false,
  foto_url text,
  destaque boolean not null default false,
  ativo boolean not null default true,
  ordem int not null default 0,
  -- controle da coleta automática
  ultima_coleta_em timestamptz,
  ultimo_erro text,
  alerta text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists produtos_categoria_idx on public.produtos (categoria_id, ordem);
create index if not exists produtos_publicos_idx on public.produtos (ativo, disponivel);

create or replace function public.tocar_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists produtos_updated_at on public.produtos;
create trigger produtos_updated_at before update on public.produtos
for each row execute function public.tocar_updated_at();

-- ---------------------------------------------------------------------
-- Histórico de preços
-- ---------------------------------------------------------------------
create table if not exists public.historico_precos (
  id bigint generated always as identity primary key,
  produto_id uuid not null references public.produtos(id) on delete cascade,
  preco numeric(12,2) not null,
  preco_antes numeric(12,2),
  coletado_em timestamptz not null default now()
);

create index if not exists historico_produto_idx on public.historico_precos (produto_id, coletado_em desc);

-- ---------------------------------------------------------------------
-- Cliques em "Comprar"
-- ---------------------------------------------------------------------
create table if not exists public.cliques (
  id bigint generated always as identity primary key,
  produto_id uuid not null references public.produtos(id) on delete cascade,
  criado_em timestamptz not null default now()
);

create index if not exists cliques_produto_idx on public.cliques (produto_id);

-- Inserção pública controlada: só aceita produto ativo existente.
create or replace function public.registrar_clique(p_produto_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.cliques (produto_id)
  select id from public.produtos where id = p_produto_id and ativo;
end;
$$;

grant execute on function public.registrar_clique(uuid) to anon, authenticated;

create or replace view public.cliques_por_produto
with (security_invoker = true) as
  select produto_id, count(*)::int as total,
         count(*) filter (where criado_em > now() - interval '7 days')::int as ultimos_7_dias
  from public.cliques
  group by produto_id;

-- ---------------------------------------------------------------------
-- Registro de cada rodada da coleta de preços
-- ---------------------------------------------------------------------
create table if not exists public.coletas (
  id bigint generated always as identity primary key,
  iniciada_em timestamptz not null default now(),
  finalizada_em timestamptz,
  origem text not null default 'cron',
  total int not null default 0,
  atualizados int not null default 0,
  falhas int not null default 0,
  erros jsonb not null default '[]'::jsonb
);

-- Tokens de API das lojas (só o servidor, com a service role, lê e grava).
create table if not exists public.tokens_lojas (
  loja text primary key,
  access_token text not null,
  expira_em timestamptz not null
);

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.admins enable row level security;
alter table public.categorias enable row level security;
alter table public.produtos enable row level security;
alter table public.historico_precos enable row level security;
alter table public.cliques enable row level security;
alter table public.coletas enable row level security;
alter table public.tokens_lojas enable row level security;
-- tokens_lojas fica sem nenhuma policy: inacessível para anon e authenticated.

-- admins: o administrador vê a lista
drop policy if exists admins_select on public.admins;
create policy admins_select on public.admins for select using (public.is_admin());

-- categorias: leitura pública das ativas, tudo para admin
drop policy if exists categorias_leitura on public.categorias;
create policy categorias_leitura on public.categorias for select
  using (ativa or public.is_admin());
drop policy if exists categorias_escrita on public.categorias;
create policy categorias_escrita on public.categorias for all
  using (public.is_admin()) with check (public.is_admin());

-- produtos: leitura pública dos ativos e disponíveis, tudo para admin
drop policy if exists produtos_leitura on public.produtos;
create policy produtos_leitura on public.produtos for select
  using ((ativo and disponivel) or public.is_admin());
drop policy if exists produtos_escrita on public.produtos;
create policy produtos_escrita on public.produtos for all
  using (public.is_admin()) with check (public.is_admin());

-- histórico, cliques e coletas: só admin lê (o servidor grava com a service role)
drop policy if exists historico_admin on public.historico_precos;
create policy historico_admin on public.historico_precos for all
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists cliques_admin on public.cliques;
create policy cliques_admin on public.cliques for select using (public.is_admin());
drop policy if exists coletas_admin on public.coletas;
create policy coletas_admin on public.coletas for select using (public.is_admin());

-- =====================================================================
-- Storage: bucket público "fotos"
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', true)
on conflict (id) do update set public = true;

drop policy if exists fotos_leitura on storage.objects;
create policy fotos_leitura on storage.objects for select
  using (bucket_id = 'fotos');
drop policy if exists fotos_upload on storage.objects;
create policy fotos_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and public.is_admin());
drop policy if exists fotos_update on storage.objects;
create policy fotos_update on storage.objects for update to authenticated
  using (bucket_id = 'fotos' and public.is_admin());
drop policy if exists fotos_delete on storage.objects;
create policy fotos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and public.is_admin());
