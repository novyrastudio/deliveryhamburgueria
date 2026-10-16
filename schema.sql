-- Brasa Burger / Fornalha 147 — base Supabase segura
-- Execute uma vez no Supabase SQL Editor.
-- Este arquivo não contém segredos. Nunca coloque a service_role no front-end.

create extension if not exists pgcrypto;

-- =========================================================
-- Helpers
-- =========================================================

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.current_profile_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

-- =========================================================
-- Perfis e permissões
-- =========================================================

create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text not null check (char_length(name) between 2 and 80),
  phone      text not null check (phone ~ '^[0-9]{10,11}$'),
  email      text not null,
  role       text not null default 'customer' check (role in ('customer', 'admin')),
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "perfil: ler o proprio" on public.profiles;
drop policy if exists "perfil: alterar o proprio" on public.profiles;
drop policy if exists "perfil: ler proprio ou admin" on public.profiles;
create policy "perfil: ler proprio ou admin" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "perfil: atualizar proprio sem elevar permissao" on public.profiles;
create policy "perfil: atualizar proprio sem elevar permissao" on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (
    public.is_admin()
    or (
      id = auth.uid()
      and role = public.current_profile_role()
    )
  );

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_name  text := btrim(coalesce(new.raw_user_meta_data ->> 'name', ''));
  v_phone text := regexp_replace(coalesce(new.raw_user_meta_data ->> 'phone', ''), '\D', '', 'g');
begin
  if char_length(v_name) < 2 or char_length(v_name) > 80 then
    raise exception 'nome invalido';
  end if;
  if v_phone !~ '^[0-9]{10,11}$' then
    raise exception 'whatsapp invalido';
  end if;
  if coalesce(new.raw_user_meta_data ->> 'consent', '') <> 'true' then
    raise exception 'consentimento obrigatorio';
  end if;

  insert into public.profiles (id, name, phone, email, role)
  values (new.id, v_name, v_phone, new.email, 'customer');

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Para criar o primeiro administrador, execute manualmente no SQL Editor:
-- update public.profiles set role = 'admin' where email = 'seu-email@dominio.com';

-- =========================================================
-- Catálogo
-- =========================================================

create table if not exists public.categories (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(name) between 2 and 80),
  slug          text not null unique check (slug ~ '^[a-z0-9-]+$'),
  description   text,
  image_url     text,
  display_order integer not null default 0,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.products (
  id                  uuid primary key default gen_random_uuid(),
  category_id         uuid references public.categories (id) on delete set null,
  name                text not null check (char_length(name) between 2 and 120),
  slug                text not null unique check (slug ~ '^[a-z0-9-]+$'),
  description         text not null default '',
  image_url           text,
  price_cents         integer not null check (price_cents >= 0),
  promo_price_cents   integer check (promo_price_cents is null or promo_price_cents >= 0),
  ingredients         text[] not null default '{}',
  prep_minutes        integer not null default 15 check (prep_minutes between 1 and 180),
  internal_code       text,
  requires_doneness   boolean not null default false,
  featured            boolean not null default false,
  sold_out            boolean not null default false,
  active              boolean not null default true,
  display_order       integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists public.addon_groups (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(name) between 2 and 80),
  required      boolean not null default false,
  min_select    integer not null default 0 check (min_select >= 0),
  max_select    integer not null default 1 check (max_select >= 1),
  active        boolean not null default true,
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (max_select >= min_select)
);

create table if not exists public.addon_options (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid not null references public.addon_groups (id) on delete cascade,
  name          text not null check (char_length(name) between 2 and 80),
  price_cents   integer not null default 0 check (price_cents >= 0),
  active        boolean not null default true,
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.product_addon_groups (
  product_id uuid not null references public.products (id) on delete cascade,
  group_id   uuid not null references public.addon_groups (id) on delete cascade,
  primary key (product_id, group_id)
);

-- =========================================================
-- Operação comercial
-- =========================================================

create table if not exists public.coupons (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique check (code = upper(code) and code ~ '^[A-Z0-9_-]{2,30}$'),
  discount_type   text not null check (discount_type in ('percent', 'fixed', 'free_delivery')),
  percent_off     numeric(5,2) check (percent_off is null or (percent_off > 0 and percent_off <= 100)),
  value_cents     integer check (value_cents is null or value_cents >= 0),
  min_order_cents integer not null default 0 check (min_order_cents >= 0),
  usage_limit     integer check (usage_limit is null or usage_limit > 0),
  used_count      integer not null default 0 check (used_count >= 0),
  valid_from      timestamptz,
  valid_until     timestamptz,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.delivery_areas (
  id              uuid primary key default gen_random_uuid(),
  name            text not null unique check (char_length(name) between 2 and 80),
  fee_cents       integer not null default 0 check (fee_cents >= 0),
  extra_minutes   integer not null default 0 check (extra_minutes >= 0),
  min_order_cents integer not null default 0 check (min_order_cents >= 0),
  coverage        text not null default '',
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.banners (
  id            uuid primary key default gen_random_uuid(),
  placement     text not null check (placement in ('hero', 'promo')),
  title         text not null check (char_length(title) between 2 and 140),
  body          text not null default '',
  image_url     text,
  click_url     text,
  coupon_code   text,
  status        text not null default 'active' check (status in ('active', 'scheduled', 'ended')),
  devices       text not null default 'all' check (devices in ('all', 'desktop', 'mobile')),
  starts_at     timestamptz,
  ends_at       timestamptz,
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.store_settings (
  id                 text primary key default 'main' check (id = 'main'),
  store_name         text not null default 'Brasa Burger',
  cnpj               text,
  phone              text,
  whatsapp           text,
  email              text,
  address            text,
  open               boolean not null default true,
  pause_reason       text,
  avg_delivery_min   integer not null default 30,
  avg_delivery_max   integer not null default 45,
  min_order_cents    integer not null default 2000,
  delivery_enabled   boolean not null default true,
  pickup_enabled     boolean not null default true,
  sound_enabled      boolean not null default true,
  visual_alerts      boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- =========================================================
-- Pedidos
-- =========================================================

create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  order_number      text not null unique default ('BB-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))),
  customer_id       uuid not null references public.profiles (id) on delete restrict,
  status            text not null default 'new' check (status in ('new', 'confirmed', 'prep', 'delivery', 'done', 'rejected')),
  rejection_reason  text,
  customer_snapshot jsonb not null,
  items             jsonb not null,
  fulfillment       jsonb not null,
  payment           jsonb not null,
  totals            jsonb not null,
  admin_notes       text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_products_category on public.products (category_id);
create index if not exists idx_products_active on public.products (active, sold_out);
create index if not exists idx_orders_customer on public.orders (customer_id, created_at desc);
create index if not exists idx_orders_status on public.orders (status, created_at desc);

do $$
declare
  t text;
begin
  foreach t in array array[
    'categories', 'products', 'addon_groups', 'addon_options',
    'coupons', 'delivery_areas', 'banners', 'store_settings', 'orders'
  ]
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', t, t);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- =========================================================
-- RLS
-- =========================================================

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.addon_groups enable row level security;
alter table public.addon_options enable row level security;
alter table public.product_addon_groups enable row level security;
alter table public.coupons enable row level security;
alter table public.delivery_areas enable row level security;
alter table public.banners enable row level security;
alter table public.store_settings enable row level security;
alter table public.orders enable row level security;

drop policy if exists "publico: categorias ativas" on public.categories;
create policy "publico: categorias ativas" on public.categories
  for select to anon, authenticated using (active = true);
drop policy if exists "admin: categorias" on public.categories;
create policy "admin: categorias" on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "publico: produtos ativos" on public.products;
create policy "publico: produtos ativos" on public.products
  for select to anon, authenticated using (active = true);
drop policy if exists "admin: produtos" on public.products;
create policy "admin: produtos" on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "publico: grupos ativos" on public.addon_groups;
create policy "publico: grupos ativos" on public.addon_groups
  for select to anon, authenticated using (active = true);
drop policy if exists "admin: grupos" on public.addon_groups;
create policy "admin: grupos" on public.addon_groups
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "publico: opcoes ativas" on public.addon_options;
create policy "publico: opcoes ativas" on public.addon_options
  for select to anon, authenticated using (active = true);
drop policy if exists "admin: opcoes" on public.addon_options;
create policy "admin: opcoes" on public.addon_options
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "publico: relacao produto adicionais" on public.product_addon_groups;
create policy "publico: relacao produto adicionais" on public.product_addon_groups
  for select to anon, authenticated using (true);
drop policy if exists "admin: relacao produto adicionais" on public.product_addon_groups;
create policy "admin: relacao produto adicionais" on public.product_addon_groups
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "publico: cupons ativos" on public.coupons;
create policy "publico: cupons ativos" on public.coupons
  for select to anon, authenticated using (active = true);
drop policy if exists "admin: cupons" on public.coupons;
create policy "admin: cupons" on public.coupons
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "publico: areas ativas" on public.delivery_areas;
create policy "publico: areas ativas" on public.delivery_areas
  for select to anon, authenticated using (active = true);
drop policy if exists "admin: areas" on public.delivery_areas;
create policy "admin: areas" on public.delivery_areas
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "publico: banners visiveis" on public.banners;
create policy "publico: banners visiveis" on public.banners
  for select to anon, authenticated
  using (
    status = 'active'
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  );
drop policy if exists "admin: banners" on public.banners;
create policy "admin: banners" on public.banners
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "publico: configuracoes da loja" on public.store_settings;
create policy "publico: configuracoes da loja" on public.store_settings
  for select to anon, authenticated using (id = 'main');
drop policy if exists "admin: configuracoes da loja" on public.store_settings;
create policy "admin: configuracoes da loja" on public.store_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "pedido: ler os proprios" on public.orders;
drop policy if exists "cliente: ler proprios pedidos" on public.orders;
create policy "cliente: ler proprios pedidos" on public.orders
  for select to authenticated using (customer_id = auth.uid());
drop policy if exists "admin: ler pedidos" on public.orders;
create policy "admin: ler pedidos" on public.orders
  for select to authenticated using (public.is_admin());
drop policy if exists "admin: atualizar pedidos" on public.orders;
create policy "admin: atualizar pedidos" on public.orders
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Clientes não inserem/alteram pedidos diretamente.
-- A criação passa pela função create_order(), que recalcula preços, cupons e taxa.

-- =========================================================
-- RPC: criar pedido com cálculo no servidor
-- =========================================================

create or replace function public.create_order(p_order jsonb)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_profile public.profiles;
  v_item jsonb;
  v_product record;
  v_qty integer;
  v_requested_addons uuid[];
  v_valid_addons_count integer;
  v_addons_total integer;
  v_unit_cents integer;
  v_subtotal integer := 0;
  v_delivery_fee integer := 0;
  v_discount integer := 0;
  v_total integer;
  v_area record;
  v_coupon public.coupons;
  v_coupon_code text := upper(nullif(btrim(coalesce(p_order ->> 'coupon', '')), ''));
  v_items jsonb := '[]'::jsonb;
  v_order public.orders;
begin
  if v_user is null then
    raise exception 'login obrigatorio';
  end if;

  select * into v_profile from public.profiles where id = v_user;
  if not found then
    raise exception 'perfil nao encontrado';
  end if;

  if jsonb_typeof(p_order -> 'items') <> 'array'
     or jsonb_array_length(p_order -> 'items') = 0
     or jsonb_array_length(p_order -> 'items') > 50 then
    raise exception 'itens invalidos';
  end if;

  for v_item in select * from jsonb_array_elements(p_order -> 'items')
  loop
    v_qty := coalesce((v_item ->> 'qty')::integer, 1);
    if v_qty < 1 or v_qty > 20 then
      raise exception 'quantidade invalida';
    end if;

    select p.id, p.name, p.price_cents, p.promo_price_cents
      into v_product
    from public.products p
    where p.id = (v_item ->> 'productId')::uuid
      and p.active = true
      and p.sold_out = false;

    if not found then
      raise exception 'produto indisponivel';
    end if;

    select coalesce(array_agg(value::uuid), '{}'::uuid[])
      into v_requested_addons
    from jsonb_array_elements_text(coalesce(v_item -> 'addonOptionIds', '[]'::jsonb));

    select count(*), coalesce(sum(ao.price_cents), 0)
      into v_valid_addons_count, v_addons_total
    from public.addon_options ao
    join public.product_addon_groups pag on pag.group_id = ao.group_id
    where pag.product_id = v_product.id
      and ao.active = true
      and ao.id = any(v_requested_addons);

    if coalesce(array_length(v_requested_addons, 1), 0) <> v_valid_addons_count then
      raise exception 'adicional invalido para o produto';
    end if;

    v_unit_cents := coalesce(v_product.promo_price_cents, v_product.price_cents) + v_addons_total;
    v_subtotal := v_subtotal + (v_unit_cents * v_qty);
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'productId', v_product.id,
      'name', v_product.name,
      'qty', v_qty,
      'unitPriceCents', v_unit_cents,
      'addonOptionIds', coalesce(v_requested_addons, '{}'),
      'removals', coalesce(v_item -> 'removals', '[]'::jsonb),
      'notes', left(coalesce(v_item ->> 'notes', ''), 200),
      'doneness', nullif(left(coalesce(v_item ->> 'doneness', ''), 40), '')
    ));
  end loop;

  if coalesce(p_order #>> '{fulfillment,mode}', 'delivery') = 'delivery' then
    select * into v_area
    from public.delivery_areas
    where id = (p_order #>> '{fulfillment,deliveryAreaId}')::uuid
      and active = true;

    if not found then
      raise exception 'area de entrega invalida';
    end if;

    if v_subtotal < v_area.min_order_cents then
      raise exception 'pedido abaixo do minimo da area';
    end if;

    v_delivery_fee := v_area.fee_cents;
  end if;

  if v_coupon_code is not null then
    select * into v_coupon
    from public.coupons
    where code = v_coupon_code
      and active = true
      and (valid_from is null or valid_from <= now())
      and (valid_until is null or valid_until >= now())
      and (usage_limit is null or used_count < usage_limit);

    if not found or v_subtotal < v_coupon.min_order_cents then
      raise exception 'cupom invalido';
    end if;

    if v_coupon.discount_type = 'percent' then
      v_discount := round(v_subtotal * (v_coupon.percent_off / 100.0))::integer;
    elsif v_coupon.discount_type = 'fixed' then
      v_discount := least(coalesce(v_coupon.value_cents, 0), v_subtotal);
    elsif v_coupon.discount_type = 'free_delivery' then
      v_delivery_fee := 0;
    end if;
  end if;

  v_total := greatest(v_subtotal + v_delivery_fee - v_discount, 0);

  insert into public.orders (
    customer_id,
    customer_snapshot,
    items,
    fulfillment,
    payment,
    totals
  ) values (
    v_user,
    jsonb_build_object('name', v_profile.name, 'phone', v_profile.phone, 'email', v_profile.email),
    v_items,
    coalesce(p_order -> 'fulfillment', '{}'::jsonb),
    coalesce(p_order -> 'payment', '{}'::jsonb),
    jsonb_build_object(
      'subtotalCents', v_subtotal,
      'deliveryFeeCents', v_delivery_fee,
      'discountCents', v_discount,
      'totalCents', v_total,
      'coupon', v_coupon_code
    )
  )
  returning * into v_order;

  if v_coupon_code is not null then
    update public.coupons set used_count = used_count + 1 where id = v_coupon.id;
  end if;

  return v_order;
end $$;

grant execute on function public.create_order(jsonb) to authenticated;

-- =========================================================
-- RPC: atualizar status do pedido com transições permitidas
-- =========================================================

create or replace function public.update_order_status(
  p_order_id uuid,
  p_status text,
  p_reason text default null
)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders;
begin
  if not public.is_admin() then
    raise exception 'acesso negado';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'pedido nao encontrado';
  end if;

  if p_status not in ('confirmed', 'prep', 'delivery', 'done', 'rejected') then
    raise exception 'status invalido';
  end if;

  if not (
    (v_order.status = 'new' and p_status in ('confirmed', 'rejected')) or
    (v_order.status = 'confirmed' and p_status in ('prep', 'rejected')) or
    (v_order.status = 'prep' and p_status = 'delivery') or
    (v_order.status = 'delivery' and p_status = 'done')
  ) then
    raise exception 'transicao de status nao permitida';
  end if;

  update public.orders
  set status = p_status,
      rejection_reason = case when p_status = 'rejected' then nullif(left(coalesce(p_reason, ''), 240), '') else rejection_reason end
  where id = p_order_id
  returning * into v_order;

  return v_order;
end $$;

grant execute on function public.update_order_status(uuid, text, text) to authenticated;

-- =========================================================
-- Seeds mínimos para o protótipo virar dados reais
-- =========================================================

insert into public.store_settings (id, store_name, phone, whatsapp, email, address)
values ('main', 'Brasa Burger', '(11) 3333-1470', '(11) 99999-1470', 'contato@brasaburger.com.br', 'Rua das Brasas, 147 - Centro')
on conflict (id) do update
set store_name = excluded.store_name,
    phone = excluded.phone,
    whatsapp = excluded.whatsapp,
    email = excluded.email,
    address = excluded.address;

insert into public.categories (name, slug, display_order, active) values
  ('Combos', 'combos', 1, true),
  ('Hambúrgueres', 'hamburgueres', 2, true),
  ('Acompanhamentos', 'acompanhamentos', 3, true),
  ('Bebidas', 'bebidas', 4, true),
  ('Sobremesas', 'sobremesas', 5, true)
on conflict (slug) do update set
  name = excluded.name,
  display_order = excluded.display_order,
  active = excluded.active;

insert into public.delivery_areas (name, fee_cents, extra_minutes, min_order_cents, coverage, active) values
  ('Centro', 690, 0, 2000, '01000-000 a 01099-999', true),
  ('Jardins', 890, 10, 2500, '01400-000 a 01499-999', true),
  ('Vila Nova', 590, 8, 2000, '04500-000 a 04599-999', true)
on conflict (name) do update set
  fee_cents = excluded.fee_cents,
  extra_minutes = excluded.extra_minutes,
  min_order_cents = excluded.min_order_cents,
  coverage = excluded.coverage,
  active = excluded.active;

insert into public.coupons (code, discount_type, percent_off, min_order_cents, usage_limit, active) values
  ('BRASA15', 'percent', 15, 3500, 200, true)
on conflict (code) do update set
  discount_type = excluded.discount_type,
  percent_off = excluded.percent_off,
  min_order_cents = excluded.min_order_cents,
  usage_limit = excluded.usage_limit,
  active = excluded.active;
