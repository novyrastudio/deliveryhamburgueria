-- Fornalha 147 — Patch 03: robustez do create_order e validações de banner
-- Rode DEPOIS do schema.sql e dos patches 01 e 02. Idempotente. Sem segredos.
-- 1) create_order: nome do bairro em variável própria (evita ler registro não preenchido em pedido de
--    retirada) e limite de 5 pedidos / 10 min por conta logada.
-- 2) banners: o banco passa a recusar destino de clique e cupom fora do formato esperado.
-- 3) índice para a trava de pedidos de convidado.

create or replace function public.create_order(p_order jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
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
  end if;
  if v_mode not in ('delivery', 'pickup') then raise exception 'modalidade invalida'; end if;
  if v_method is null or v_method not in ('Dinheiro', 'Pix', 'Débito', 'Crédito') then
    raise exception 'pagamento invalido';
  end if;

  -- Cliente: conta logada ou convidado (nome + WhatsApp).
  if v_user is not null then
    select * into v_profile from public.profiles where id = v_user;
    if not found then raise exception 'perfil nao encontrado'; end if;
    v_name := v_profile.name; v_phone := v_profile.phone; v_email := v_profile.email;
    -- Limite contra abuso: 5 pedidos / 10 min por conta.
    if (select count(*) from public.orders where customer_id = v_user and created_at > now() - interval '10 minutes') >= 5 then
      raise exception 'muitos pedidos em sequencia';
    end if;
  else
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
    if v_subtotal < v_area.min_order_cents then raise exception 'pedido abaixo do minimo da area'; end if;
    v_fee := v_area.fee_cents;
  end if;

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

  if v_code is not null then
    update public.coupons set used_count = used_count + 1 where id = v_coupon.id;
  end if;

  return jsonb_build_object('orderNumber', v_order.order_number, 'totals', v_order.totals);
end $$;

revoke all on function public.create_order(jsonb) from public;
grant execute on function public.create_order(jsonb) to anon, authenticated;

alter table public.banners drop constraint if exists banners_click_url_chk;
alter table public.banners add constraint banners_click_url_chk
  check (click_url is null or click_url ~ '^(#[A-Za-z0-9_-]*|https://[^[:space:]]+)$');

alter table public.banners drop constraint if exists banners_coupon_code_chk;
alter table public.banners add constraint banners_coupon_code_chk
  check (coupon_code is null or coupon_code ~ '^[A-Z0-9_-]{2,30}$');

create index if not exists idx_orders_guest_phone
  on public.orders ((customer_snapshot ->> 'phone'), created_at) where customer_id is null;
