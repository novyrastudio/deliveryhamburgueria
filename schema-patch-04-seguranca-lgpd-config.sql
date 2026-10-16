-- Fornalha 147 — Patch 04: proteção contra pedidos falsos, exclusão de conta (LGPD) e configurações reais da loja
-- Rode DEPOIS do schema.sql e dos patches 01, 02 e 03. Idempotente. Sem segredos.
-- Não apaga nem sobrescreve dados existentes (só adiciona colunas/tabelas e limpa 3 valores de exemplo do seed).
-- ATENÇÃO: não rode o schema.sql de novo depois de a loja estar em uso: o seed dele regrava lojas/categorias/áreas/cupom de exemplo.

do $$
begin
  if to_regclass('public.profiles') is null
     or to_regclass('public.orders') is null
     or to_regclass('public.store_settings') is null
     or to_regclass('public.delivery_areas') is null
     or to_regclass('public.coupons') is null then
    raise exception 'Schema base incompleto. Execute primeiro schema.sql no mesmo projeto Supabase antes do patch 04.';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'addon_options' and column_name = 'slug'
  ) then
    raise exception 'Patch 02 ainda nao foi aplicado. Execute os patches 01, 02 e 03 antes do patch 04.';
  end if;
end $$;

-- =========================================================
-- 1) Proteção contra abuso (rate limit no servidor)
-- =========================================================

create table if not exists public.security_config (key text primary key, value text not null);
insert into public.security_config (key, value) values ('ip_salt', gen_random_uuid()::text) on conflict do nothing;

create table if not exists public.order_attempts (
  id         bigint generated always as identity primary key,
  ip_hash    text,
  actor      uuid,
  created_at timestamptz not null default now()
);
create index if not exists idx_order_attempts_ip on public.order_attempts (ip_hash, created_at);
create index if not exists idx_order_attempts_actor on public.order_attempts (actor, created_at);

alter table public.security_config enable row level security;
alter table public.order_attempts enable row level security;
revoke all on public.security_config from anon, authenticated;
revoke all on public.order_attempts from anon, authenticated;

-- Hash do IP (com sal secreto) a partir do cabeçalho do Cloudflare, que o cliente não consegue forjar.
-- Sem o cabeçalho, devolve null e o limite por origem simplesmente não é aplicado.
create or replace function public.request_ip_hash() returns text
language plpgsql stable security definer set search_path = public, extensions as $$
declare h jsonb; ip text; salt text;
begin
  begin
    h := nullif(current_setting('request.headers', true), '')::jsonb;
  exception when others then
    h := null;
  end;
  ip := nullif(btrim(coalesce(h ->> 'cf-connecting-ip', '')), '');
  if ip is null then return null; end if;
  select value into salt from public.security_config where key = 'ip_salt';
  return encode(digest(coalesce(salt, '') || ip, 'sha256'), 'hex');
end $$;
revoke all on function public.request_ip_hash() from public;

-- Verificação: o limite por origem só funciona se este retorno vier true (ver TESTES.md).
create or replace function public.request_ip_status() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare h jsonb;
begin
  begin h := nullif(current_setting('request.headers', true), '')::jsonb; exception when others then h := null; end;
  return jsonb_build_object('cfConnectingIpPresent', nullif(btrim(coalesce(h ->> 'cf-connecting-ip', '')), '') is not null);
end $$;
revoke all on function public.request_ip_status() from public;
grant execute on function public.request_ip_status() to anon, authenticated;

-- Usuários anônimos (pedido de convidado verificado por CAPTCHA) não têm perfil.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_name  text := btrim(coalesce(new.raw_user_meta_data ->> 'name', ''));
  v_phone text := regexp_replace(coalesce(new.raw_user_meta_data ->> 'phone', ''), '\D', '', 'g');
begin
  if coalesce(new.is_anonymous, false) then return new; end if;
  if char_length(v_name) < 2 or char_length(v_name) > 80 then raise exception 'nome invalido'; end if;
  if v_phone !~ '^[0-9]{10,11}$' then raise exception 'whatsapp invalido'; end if;
  if coalesce(new.raw_user_meta_data ->> 'consent', '') <> 'true' then raise exception 'consentimento obrigatorio'; end if;
  insert into public.profiles (id, name, phone, email, role) values (new.id, v_name, v_phone, new.email, 'customer');
  return new;
end $$;

-- =========================================================
-- 2) Configurações reais da loja (painel -> banco -> site)
-- =========================================================

alter table public.store_settings
  add column if not exists pickup_info text,
  add column if not exists pay_pix boolean not null default true,
  add column if not exists pay_card boolean not null default true,
  add column if not exists pay_cash boolean not null default true,
  add column if not exists enforce_hours boolean not null default false,
  add column if not exists hours_note text,
  add column if not exists require_guest_captcha boolean not null default false,
  add column if not exists deletion_order_policy text not null default 'keep';

alter table public.store_settings drop constraint if exists store_settings_policy_chk;
alter table public.store_settings add constraint store_settings_policy_chk check (deletion_order_policy in ('keep', 'anonymize'));
alter table public.store_settings drop constraint if exists store_settings_avg_chk;
alter table public.store_settings add constraint store_settings_avg_chk
  check (avg_delivery_min between 1 and 300 and avg_delivery_max between avg_delivery_min and 600);

-- Contatos de exemplo do seed original passam a ficar vazios (o site mantém os dados atuais até o painel preencher os reais).
update public.store_settings set phone = null where id = 'main' and phone = '(11) 3333-1470';
update public.store_settings set whatsapp = null where id = 'main' and whatsapp = '(11) 99999-1470';
update public.store_settings set email = null where id = 'main' and email = 'contato@brasaburger.com.br';

-- Horários (dia 0 = domingo, igual ao JavaScript). Fechamento depois da abertura; virada de dia não é suportada.
create table if not exists public.business_hours (
  day        smallint primary key check (day between 0 and 6),
  closed     boolean not null default false,
  open_time  time not null default '18:00',
  close_time time not null default '23:30',
  check (closed or close_time > open_time)
);
insert into public.business_hours (day, closed) values (0, false), (1, true), (2, false), (3, false), (4, false), (5, false), (6, false)
on conflict (day) do nothing;

alter table public.business_hours enable row level security;
drop policy if exists "publico: horarios" on public.business_hours;
create policy "publico: horarios" on public.business_hours for select to anon, authenticated using (true);
drop policy if exists "admin: horarios" on public.business_hours;
create policy "admin: horarios" on public.business_hours for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- "Aberto agora?" no fuso de Brasília (decisão de projeto; troque aqui se a loja ficar em outro fuso).
create or replace function public.is_store_open_now() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select (not h.closed)
       and (now() at time zone 'America/Sao_Paulo')::time >= h.open_time
       and (now() at time zone 'America/Sao_Paulo')::time <  h.close_time
    from public.business_hours h
    where h.day = extract(dow from (now() at time zone 'America/Sao_Paulo'))::int
  ), false);
$$;
revoke all on function public.is_store_open_now() from public;
grant execute on function public.is_store_open_now() to anon, authenticated;

create or replace function public.get_public_store_settings()
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'storeName', s.store_name, 'whatsapp', s.whatsapp, 'address', s.address,
    'open', s.open, 'pauseReason', s.pause_reason,
    'avgDeliveryMin', s.avg_delivery_min, 'avgDeliveryMax', s.avg_delivery_max,
    'deliveryEnabled', s.delivery_enabled, 'pickupEnabled', s.pickup_enabled, 'pickupInfo', s.pickup_info,
    'minOrderCents', s.min_order_cents, 'enforceHours', s.enforce_hours, 'hoursNote', s.hours_note,
    'payments', jsonb_build_object('pix', s.pay_pix, 'card', s.pay_card, 'cash', s.pay_cash),
    'requireCaptcha', s.require_guest_captcha,
    'hours', (select coalesce(jsonb_agg(jsonb_build_object('day', h.day, 'closed', h.closed,
                'open', to_char(h.open_time, 'HH24:MI'), 'close', to_char(h.close_time, 'HH24:MI')) order by h.day), '[]'::jsonb)
              from public.business_hours h)
  )
  from public.store_settings s where s.id = 'main';
$$;
revoke all on function public.get_public_store_settings() from public;
grant execute on function public.get_public_store_settings() to anon, authenticated;

-- =========================================================
-- 3) Usuários administrativos (papel só muda por função, nunca pela API de tabela)
-- =========================================================

create table if not exists public.admin_audit (
  id         bigint generated always as identity primary key,
  admin_id   uuid,
  action     text not null,
  detail     text,
  created_at timestamptz not null default now()
);
alter table public.admin_audit enable row level security;
drop policy if exists "admin: ler auditoria" on public.admin_audit;
create policy "admin: ler auditoria" on public.admin_audit for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.admin_audit from anon, authenticated;

create or replace function public.admin_set_role(p_email text, p_role text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_target public.profiles;
begin
  if not public.is_admin() then raise exception 'acesso negado'; end if;
  if p_role not in ('customer', 'admin') then raise exception 'papel invalido'; end if;
  select * into v_target from public.profiles where lower(email) = lower(btrim(coalesce(p_email, '')));
  if not found then raise exception 'conta nao encontrada'; end if;
  if v_target.id = auth.uid() and p_role <> 'admin' then raise exception 'nao remova o proprio acesso'; end if;
  update public.profiles set role = p_role where id = v_target.id;
  insert into public.admin_audit (admin_id, action, detail) values (auth.uid(), 'set_role', v_target.email || ' -> ' || p_role);
  return jsonb_build_object('email', v_target.email, 'role', p_role);
end $$;
revoke all on function public.admin_set_role(text, text) from public;
grant execute on function public.admin_set_role(text, text) to authenticated;

-- =========================================================
-- 4) Exclusão de conta (LGPD)
--    A conta e os dados de acesso são apagados. Os pedidos ficam desvinculados da conta; o que mais
--    acontece com os dados dentro deles depende de store_settings.deletion_order_policy:
--      'keep'      = pedidos mantidos como estão (padrão, até o responsável decidir)
--      'anonymize' = nome/telefone/e-mail/endereço removidos dos pedidos, mantendo itens e valores
-- =========================================================

create table if not exists public.account_deletions (
  id             uuid primary key default gen_random_uuid(),
  deleted_at     timestamptz not null default now(),
  policy         text not null,
  orders_affected integer not null default 0
);
alter table public.account_deletions enable row level security;
drop policy if exists "admin: ler exclusoes" on public.account_deletions;
create policy "admin: ler exclusoes" on public.account_deletions for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.account_deletions from anon, authenticated;

create or replace function public.delete_my_account() returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_policy text; v_count integer; v_role text;
begin
  if v_user is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then raise exception 'login obrigatorio'; end if;
  select role into v_role from public.profiles where id = v_user;
  if v_role = 'admin' and (select count(*) from public.profiles where role = 'admin') <= 1 then
    raise exception 'ultimo administrador';
  end if;
  select coalesce(deletion_order_policy, 'keep') into v_policy from public.store_settings where id = 'main';
  v_policy := coalesce(v_policy, 'keep');
  if v_policy = 'anonymize' then
    update public.orders
       set customer_id = null,
           customer_snapshot = jsonb_build_object('name', 'Cliente excluído', 'phone', '', 'email', '', 'guest', false, 'deleted', true),
           fulfillment = fulfillment - 'address' - 'complement'
     where customer_id = v_user;
  else
    update public.orders set customer_id = null where customer_id = v_user;
  end if;
  get diagnostics v_count = row_count;
  insert into public.account_deletions (policy, orders_affected) values (v_policy, v_count);
  delete from auth.users where id = v_user;   -- apaga perfil (cascade), sessões e identidades
  return jsonb_build_object('deleted', true, 'ordersKept', v_count);
end $$;
revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;

-- Pedido de exclusão de quem comprou sem conta: o administrador roda isto (ou pelo painel, se preferir).
create or replace function public.admin_anonymize_orders_by_phone(p_phone text) returns integer
language plpgsql security definer set search_path = public as $$
declare v_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'); v_count integer;
begin
  if not public.is_admin() then raise exception 'acesso negado'; end if;
  if length(v_phone) in (12, 13) and left(v_phone, 2) = '55' then v_phone := substr(v_phone, 3); end if;
  if v_phone !~ '^[0-9]{10,11}$' then raise exception 'whatsapp invalido'; end if;
  update public.orders
     set customer_snapshot = jsonb_build_object('name', 'Cliente excluído', 'phone', '', 'email', '', 'guest', true, 'deleted', true),
         fulfillment = fulfillment - 'address' - 'complement'
   where customer_id is null and customer_snapshot ->> 'phone' = v_phone;
  get diagnostics v_count = row_count;
  insert into public.admin_audit (admin_id, action, detail) values (auth.uid(), 'anonymize_guest_orders', v_count || ' pedidos');
  return v_count;
end $$;
revoke all on function public.admin_anonymize_orders_by_phone(text) from public;
grant execute on function public.admin_anonymize_orders_by_phone(text) to authenticated;

-- =========================================================
-- 5) create_order com limites, horário, pagamento habilitado e pedido mínimo da loja
-- =========================================================

create or replace function public.create_order(p_order jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid := auth.uid();
  v_anon boolean := coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
  v_user uuid := case when coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then null else auth.uid() end;
  v_ip text := public.request_ip_hash();
  v_profile public.profiles;
  v_settings public.store_settings;
  v_name text; v_phone text; v_email text;
  v_item jsonb; v_product record;
  v_qty integer; v_slugs text[]; v_valid integer; v_addons_total integer; v_unit integer;
  v_addon_ids uuid[]; v_addon_names text[]; v_removals text[]; v_doneness text;
  v_subtotal integer := 0; v_fee integer := 0; v_discount integer := 0; v_total integer;
  v_mode text := coalesce(p_order #>> '{fulfillment,mode}', 'delivery');
  v_area record; v_area_name text; v_coupon public.coupons;
  v_code text := upper(nullif(btrim(coalesce(p_order ->> 'coupon', '')), ''));
  v_method text := p_order #>> '{payment,method}';
  v_items jsonb := '[]'::jsonb; v_order public.orders;
begin
  select * into v_settings from public.store_settings where id = 'main';
  if found then
    if not v_settings.open then raise exception 'loja fechada'; end if;
    if v_mode = 'delivery' and not v_settings.delivery_enabled then raise exception 'entrega indisponivel'; end if;
    if v_mode = 'pickup' and not v_settings.pickup_enabled then raise exception 'retirada indisponivel'; end if;
    if v_settings.enforce_hours and not public.is_store_open_now() then raise exception 'loja fechada'; end if;
  end if;
  if v_mode not in ('delivery', 'pickup') then raise exception 'modalidade invalida'; end if;
  if v_method is null or v_method not in ('Dinheiro', 'Pix', 'Débito', 'Crédito') then
    raise exception 'pagamento invalido';
  end if;
  if v_settings.id is not null and ((v_method = 'Pix' and not v_settings.pay_pix)
      or (v_method in ('Débito', 'Crédito') and not v_settings.pay_card)
      or (v_method = 'Dinheiro' and not v_settings.pay_cash)) then
    raise exception 'pagamento invalido';
  end if;

  -- Cliente: conta logada ou convidado (nome + WhatsApp).
  if v_user is not null then
    select * into v_profile from public.profiles where id = v_user;
    if not found then raise exception 'perfil nao encontrado'; end if;
    v_name := v_profile.name; v_phone := v_profile.phone; v_email := v_profile.email;
    -- Limite contra abuso: 5 pedidos / 10 min por conta.
    if (select count(*) from public.order_attempts where actor = v_actor and created_at > now() - interval '10 minutes') >= 5 then
      raise exception 'muitos pedidos em sequencia';
    end if;
  else
    -- Convidado: com a verificação ligada, só vale com sessão anônima (emitida pelo Supabase após o CAPTCHA).
    if v_settings.require_guest_captcha and not v_anon then raise exception 'verificacao obrigatoria'; end if;
    v_name := btrim(coalesce(p_order #>> '{customer,name}', ''));
    v_phone := regexp_replace(coalesce(p_order #>> '{customer,phone}', ''), '\D', '', 'g');
    if length(v_phone) in (12, 13) and left(v_phone, 2) = '55' then v_phone := substr(v_phone, 3); end if;
    v_email := left(btrim(coalesce(p_order #>> '{customer,email}', '')), 254);
    if char_length(v_name) < 2 or char_length(v_name) > 80 then raise exception 'nome invalido'; end if;
    if v_phone !~ '^[0-9]{10,11}$' then raise exception 'whatsapp invalido'; end if;
    -- Limite simples contra abuso de convidados: 3 pedidos / 10 min por WhatsApp.
    if (select count(*) from public.orders
         where customer_id is null
           and customer_snapshot ->> 'phone' = v_phone
           and created_at > now() - interval '10 minutes') >= 3 then
      raise exception 'muitos pedidos em sequencia';
    end if;
    -- Limite por origem (hash do IP, só quando o cabeçalho do Cloudflare existe) e por sessão anônima.
    if v_ip is not null and (select count(*) from public.order_attempts where ip_hash = v_ip and created_at > now() - interval '10 minutes') >= 5 then
      raise exception 'muitos pedidos em sequencia';
    end if;
    if v_anon and (select count(*) from public.order_attempts where actor = v_actor and created_at > now() - interval '10 minutes') >= 3 then
      raise exception 'muitos pedidos em sequencia';
    end if;
  end if;

  if jsonb_typeof(p_order -> 'items') <> 'array'
     or jsonb_array_length(p_order -> 'items') not between 1 and 50 then
    raise exception 'itens invalidos';
  end if;

  for v_item in select * from jsonb_array_elements(p_order -> 'items') loop
    v_qty := coalesce((v_item ->> 'qty')::integer, 1);
    if v_qty < 1 or v_qty > 20 then raise exception 'quantidade invalida'; end if;

    select p.id, p.name, p.price_cents, p.promo_price_cents, p.ingredients, p.requires_doneness
      into v_product
    from public.products p
    where p.slug = (v_item ->> 'productSlug') and p.active and not p.sold_out;
    if not found then raise exception 'produto indisponivel'; end if;

    -- Ponto da carne: obrigatório quando o produto exige; só valores conhecidos.
    v_doneness := nullif(btrim(coalesce(v_item ->> 'doneness', '')), '');
    if v_product.requires_doneness then
      if v_doneness is null or v_doneness not in
         ('malpassada','ao-ponto-para-mal','ao-ponto','ao-ponto-para-bem','bem-passada') then
        raise exception 'ponto da carne obrigatorio';
      end if;
    else
      v_doneness := null;
    end if;

    -- Remoções: só ingredientes do próprio produto.
    select coalesce(array_agg(distinct value), '{}') into v_removals
    from jsonb_array_elements_text(coalesce(v_item -> 'removals', '[]'::jsonb));
    if coalesce(array_length(v_removals, 1), 0) > 20
       or not (v_removals <@ v_product.ingredients) then
      raise exception 'remocao invalida';
    end if;

    -- Adicionais por slug, só os liberados para o produto.
    select coalesce(array_agg(distinct value), '{}') into v_slugs
    from jsonb_array_elements_text(coalesce(v_item -> 'addonSlugs', '[]'::jsonb));

    select count(*), coalesce(sum(ao.price_cents), 0), coalesce(array_agg(ao.id), '{}'), coalesce(array_agg(ao.name), '{}')
      into v_valid, v_addons_total, v_addon_ids, v_addon_names
    from public.addon_options ao
    join public.addon_groups ag on ag.id = ao.group_id and ag.active
    join public.product_addon_groups pag on pag.group_id = ao.group_id
    where pag.product_id = v_product.id and ao.active and ao.slug = any(v_slugs);

    if coalesce(array_length(v_slugs, 1), 0) <> v_valid then
      raise exception 'adicional invalido para o produto';
    end if;

    v_unit := coalesce(v_product.promo_price_cents, v_product.price_cents) + v_addons_total;
    v_subtotal := v_subtotal + v_unit * v_qty;
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'productId', v_product.id, 'slug', v_item ->> 'productSlug', 'name', v_product.name,
      'qty', v_qty, 'unitPriceCents', v_unit, 'doneness', v_doneness,
      'addonOptionIds', to_jsonb(v_addon_ids), 'addonSlugs', to_jsonb(v_slugs), 'addonNames', to_jsonb(v_addon_names),
      'removals', to_jsonb(v_removals), 'notes', left(coalesce(v_item ->> 'notes', ''), 200)
    ));
  end loop;

  -- Entrega: bairro e taxa vêm do banco.
  if v_mode = 'delivery' then
    select * into v_area from public.delivery_areas
    where name = (p_order #>> '{fulfillment,district}') and active;
    if not found then raise exception 'area de entrega invalida'; end if;
    v_area_name := v_area.name;
    if char_length(btrim(coalesce(p_order #>> '{fulfillment,address}', ''))) < 5 then
      raise exception 'endereco invalido';
    end if;
    if v_subtotal < greatest(v_area.min_order_cents, coalesce(v_settings.min_order_cents, 0)) then raise exception 'pedido abaixo do minimo da area'; end if;
    v_fee := v_area.fee_cents;
  end if;

  if v_mode = 'pickup' and v_subtotal < coalesce(v_settings.min_order_cents, 0) then raise exception 'pedido abaixo do minimo'; end if;

  -- Cupom: FOR UPDATE evita que duas requisições passem do limite de usos.
  if v_code is not null then
    select * into v_coupon from public.coupons
    where code = v_code and active
      and (valid_from is null or valid_from <= now())
      and (valid_until is null or valid_until >= now())
      and (usage_limit is null or used_count < usage_limit)
    for update;
    if not found or v_subtotal < v_coupon.min_order_cents then raise exception 'cupom invalido'; end if;

    if v_coupon.discount_type = 'percent' then
      v_discount := round(v_subtotal * (v_coupon.percent_off / 100.0))::integer;
    elsif v_coupon.discount_type = 'fixed' then
      v_discount := least(coalesce(v_coupon.value_cents, 0), v_subtotal);
    else
      v_fee := 0;
    end if;
  end if;

  v_total := greatest(v_subtotal + v_fee - v_discount, 0);

  insert into public.orders (customer_id, customer_snapshot, items, fulfillment, payment, totals)
  values (
    v_user,
    jsonb_build_object('name', v_name, 'phone', v_phone, 'email', v_email, 'guest', v_user is null),
    v_items,
    jsonb_build_object(
      'mode', v_mode,
      'district', v_area_name,
      'address', case when v_mode = 'delivery' then left(btrim(p_order #>> '{fulfillment,address}'), 200) end,
      'complement', left(coalesce(p_order #>> '{fulfillment,complement}', ''), 200)
    ),
    jsonb_build_object('method', v_method, 'cashChange', left(coalesce(p_order #>> '{payment,cashChange}', ''), 40)),
    jsonb_build_object('subtotalCents', v_subtotal, 'deliveryFeeCents', v_fee,
                       'discountCents', v_discount, 'totalCents', v_total, 'coupon', v_code)
  )
  returning * into v_order;

  insert into public.order_attempts (ip_hash, actor) values (v_ip, v_actor);
  delete from public.order_attempts where created_at < now() - interval '2 days';

  if v_code is not null then
    update public.coupons set used_count = used_count + 1 where id = v_coupon.id;
  end if;

  return jsonb_build_object('orderNumber', v_order.order_number, 'totals', v_order.totals);
end $$;

revoke all on function public.create_order(jsonb) from public;
grant execute on function public.create_order(jsonb) to anon, authenticated;
