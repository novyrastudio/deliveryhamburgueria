-- Fornalha 147 — Patch 06: permissões de execução das funções
-- Rode DEPOIS do schema.sql e dos patches 01 a 05. Idempotente. Sem segredos.
-- Não apaga nem altera dados: só troca permissões de EXECUTE em funções.
--
-- Por quê: em projetos Supabase, funções criadas no schema public costumam receber EXECUTE para
-- anon e authenticated pelos privilégios padrão do schema. "revoke ... from public" NÃO remove esse
-- acesso. Até aqui as funções administrativas só estavam protegidas pela checagem interna
-- (is_admin() / auth.uid()); este patch fecha também a porta de entrada, como o código sempre pretendeu.
--
-- O que NÃO muda: create_order, validate_coupon, get_public_store_settings, is_store_open_now e
-- request_ip_status continuam liberadas para anon e authenticated (o site público depende delas).
-- is_admin, current_profile_role, set_updated_at e handle_new_user não são tocadas
-- (as duas primeiras são usadas pelas políticas RLS; as outras são funções de gatilho).

do $$
begin
  if to_regprocedure('public.update_order_status(uuid,text,text)') is null
     or to_regprocedure('public.create_order(jsonb)') is null then
    raise exception 'Schema base incompleto. Execute primeiro schema.sql no mesmo projeto Supabase antes do patch 06.'
      using hint = 'Se o painel do Supabase mostra "No tables in schema", voce esta em um projeto vazio ou diferente do configurado no site.';
  end if;

  if to_regprocedure('public.admin_set_role(text,text)') is null
     or to_regprocedure('public.delete_my_account()') is null
     or to_regprocedure('public.admin_anonymize_orders_by_phone(text)') is null
     or to_regprocedure('public.request_ip_hash()') is null then
    raise exception 'Patch 04 ainda nao foi aplicado. Execute os patches 01 a 05 na ordem antes do patch 06.';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'banners' and column_name = 'eyebrow'
  ) then
    raise exception 'Patch 05 ainda nao foi aplicado. Execute schema-patch-05-banners-adicionais.sql antes do patch 06.';
  end if;
end $$;

-- =========================================================
-- 1) Função interna: ninguém chama pela API (só create_order, que é security definer)
-- =========================================================

revoke execute on function public.request_ip_hash() from public, anon, authenticated;

-- =========================================================
-- 2) Funções que exigem sessão: anon não executa
--    (continuam checando is_admin() / auth.uid() por dentro)
-- =========================================================

revoke execute on function public.admin_set_role(text, text) from public, anon;
grant execute on function public.admin_set_role(text, text) to authenticated;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

revoke execute on function public.admin_anonymize_orders_by_phone(text) from public, anon;
grant execute on function public.admin_anonymize_orders_by_phone(text) to authenticated;

revoke execute on function public.update_order_status(uuid, text, text) from public, anon;
grant execute on function public.update_order_status(uuid, text, text) to authenticated;

-- =========================================================
-- 3) Reafirma o que o site público precisa
-- =========================================================

revoke execute on function public.create_order(jsonb) from public;
grant execute on function public.create_order(jsonb) to anon, authenticated;

-- =========================================================
-- 4) Autoverificação: se algo ainda estiver aberto, o patch falha em vez de passar em silêncio
-- =========================================================

do $$
declare
  v_open text;
  v_missing text;
begin
  select string_agg(f, ', ') into v_open
  from unnest(array[
    'public.admin_set_role(text,text)',
    'public.delete_my_account()',
    'public.admin_anonymize_orders_by_phone(text)',
    'public.update_order_status(uuid,text,text)',
    'public.request_ip_hash()'
  ]) as f
  where has_function_privilege('anon', to_regprocedure(f), 'execute');
  if v_open is not null then
    raise exception 'Permissao ainda aberta para anon em: %', v_open;
  end if;

  if has_function_privilege('authenticated', to_regprocedure('public.request_ip_hash()'), 'execute') then
    raise exception 'request_ip_hash() ainda executavel por authenticated.';
  end if;

  select string_agg(f, ', ') into v_missing
  from unnest(array[
    'public.admin_set_role(text,text)',
    'public.delete_my_account()',
    'public.admin_anonymize_orders_by_phone(text)',
    'public.update_order_status(uuid,text,text)',
    'public.create_order(jsonb)'
  ]) as f
  where not has_function_privilege('authenticated', to_regprocedure(f), 'execute');
  if v_missing is not null then
    raise exception 'authenticated perdeu EXECUTE em: %', v_missing;
  end if;

  if not has_function_privilege('anon', to_regprocedure('public.create_order(jsonb)'), 'execute') then
    raise exception 'anon perdeu EXECUTE em create_order(jsonb): pedidos de convidado parariam de funcionar.';
  end if;
end $$;

-- Verificação manual (somente leitura):
--   select p.proname,
--          has_function_privilege('anon', p.oid, 'execute')          as anon_executa,
--          has_function_privilege('authenticated', p.oid, 'execute') as auth_executa
--   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'public'
--     and p.proname in ('admin_set_role','delete_my_account','admin_anonymize_orders_by_phone',
--                       'update_order_status','request_ip_hash','create_order')
--   order by p.proname;
--   -> anon_executa = false em tudo, exceto create_order (true).
--   -> auth_executa = true em tudo, exceto request_ip_hash (false).
