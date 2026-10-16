do $$ begin if not exists (select 1 from pg_roles where rolname=$q$anon$q$) then create role anon nologin; end if; if not exists (select 1 from pg_roles where rolname=$q$authenticated$q$) then create role authenticated nologin; end if; end $$;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}', is_anonymous boolean default false);
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true),''),'{}')::jsonb $$;
create function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt() ->> 'sub','')::uuid $$;
grant usage on schema auth to anon, authenticated;
create extension if not exists pgcrypto;
create schema if not exists extensions;
grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
-- Como no Supabase: funções novas em public já nascem executáveis por anon e authenticated.
-- Sem isto o teste local não reproduz o risco que o patch 06 corrige.
alter default privileges in schema public grant execute on functions to anon, authenticated;
