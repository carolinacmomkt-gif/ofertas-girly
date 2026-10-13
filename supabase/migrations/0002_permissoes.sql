-- =====================================================================
-- Permissões de acesso às tabelas pela API do Supabase.
-- Projetos novos do Supabase não liberam as tabelas automaticamente:
-- sem isto, o site não consegue ler os produtos. Rode depois de 0001_schema.sql.
-- Quem pode ver ou alterar cada linha continua sendo decidido pelo RLS.
-- =====================================================================

grant usage on schema public to anon, authenticated, service_role;

-- Página pública (somente leitura)
grant select on public.categorias, public.produtos to anon;

-- Painel (usuária logada; o RLS só deixa alterar quem está em public.admins)
grant select, insert, update, delete on
  public.admins, public.categorias, public.produtos, public.historico_precos, public.coletas
  to authenticated;
grant select on public.cliques, public.cliques_por_produto to authenticated;

-- Servidor (rotina de preços, CSV, upload): acesso total
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
grant execute on all functions in schema public to service_role;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.registrar_clique(uuid) to anon, authenticated;
