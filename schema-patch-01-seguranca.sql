-- Fornalha 147 — Patch 01: correções de segurança
-- Rode no Supabase SQL Editor DEPOIS do schema.sql. É idempotente (pode rodar de novo).
-- Sem segredos neste arquivo.

-- =========================================================
-- 1) Cupons: anônimos não podem mais listar códigos e limites
--    O site valida o cupom pela função validate_coupon().
-- =========================================================

drop policy if exists "publico: cupons ativos" on public.coupons;

create or replace function public.validate_coupon(p_code text, p_subtotal_cents integer)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_c public.coupons;
  v_discount integer := 0;
begin
  if p_subtotal_cents is null or p_subtotal_cents < 0 then
    return jsonb_build_object('valid', false, 'message', 'Cupom inválido.');
  end if;

  select * into v_c
  from public.coupons
  where code = v_code
    and active = true
    and (valid_from is null or valid_from <= now())
    and (valid_until is null or valid_until >= now())
    and (usage_limit is null or used_count < usage_limit);

  if not found then
    return jsonb_build_object('valid', false, 'message', 'Cupom inválido ou expirado.');
  end if;

  if v_c.discount_type = 'percent' then
    v_discount := round(p_subtotal_cents * (v_c.percent_off / 100.0))::integer;
  elsif v_c.discount_type = 'fixed' then
    v_discount := least(coalesce(v_c.value_cents, 0), p_subtotal_cents);
  end if;

  return jsonb_build_object(
    'valid', true,
    'code', v_c.code,
    'type', v_c.discount_type,
    'discountCents', v_discount,
    'percentOff', coalesce(v_c.percent_off, 0),
    'valueCents', coalesce(v_c.value_cents, 0),
    'minOrderCents', v_c.min_order_cents,
    'freeDelivery', v_c.discount_type = 'free_delivery'
  );
end $$;

revoke all on function public.validate_coupon(text, integer) from public;
grant execute on function public.validate_coupon(text, integer) to anon, authenticated;

-- =========================================================
-- 2) Pedidos: ninguém altera por acesso direto à tabela
--    Criação só por create_order(); status só por update_order_status().
-- =========================================================

drop policy if exists "admin: atualizar pedidos" on public.orders;

revoke insert, update, delete on public.orders from anon, authenticated;

-- =========================================================
-- 3) Perfis: cliente só altera nome e WhatsApp
--    (e-mail, papel e consentimento deixam de ser editáveis pela API)
-- =========================================================

revoke update on public.profiles from anon, authenticated;
grant update (name, phone) on public.profiles to authenticated;

-- =========================================================
-- 4) Configurações da loja: sem CNPJ/e-mail para o público
--    O site lê só os campos seguros por get_public_store_settings().
-- =========================================================

drop policy if exists "publico: configuracoes da loja" on public.store_settings;

create or replace function public.get_public_store_settings()
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'storeName', store_name,
    'whatsapp', whatsapp,
    'address', address,
    'open', open,
    'avgDeliveryMin', avg_delivery_min,
    'avgDeliveryMax', avg_delivery_max,
    'deliveryEnabled', delivery_enabled,
    'pickupEnabled', pickup_enabled
  )
  from public.store_settings
  where id = 'main';
$$;

revoke all on function public.get_public_store_settings() from public;
grant execute on function public.get_public_store_settings() to anon, authenticated;

-- =========================================================
-- Verificação rápida (rode e confira o resultado):
--   select policyname, tablename from pg_policies
--    where schemaname = 'public' and tablename in ('coupons','orders','store_settings');
--   -> não deve existir "publico: cupons ativos", "admin: atualizar pedidos"
--      nem "publico: configuracoes da loja".
--
-- Pendente para o patch 02 (reescrita do create_order): FOR UPDATE no cupom
-- (corrida no used_count), IDs reais, pedido sem conta e ponto da carne.
-- =========================================================
