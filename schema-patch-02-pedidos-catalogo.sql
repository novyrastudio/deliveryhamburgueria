-- Fornalha 147 — Patch 02: pedidos reais (com ou sem conta) + catálogo
-- Rode DEPOIS do schema.sql e do patch 01. Idempotente. Sem segredos.
-- O site envia SLUGS (ex.: "brasa-bacon", "cheddar") e o NOME do bairro; o servidor
-- resolve tudo, recalcula preços/cupom/taxa e ignora qualquer valor vindo do navegador.

-- =========================================================
-- 1) Ajustes de tabela
-- =========================================================

alter table public.orders alter column customer_id drop not null;  -- permite pedido sem conta

alter table public.addon_options add column if not exists slug text;
create unique index if not exists addon_options_slug_key on public.addon_options (slug);

-- =========================================================
-- 2) Catálogo (espelha o cardápio atual do site)
-- =========================================================

insert into public.addon_groups (name, required, min_select, max_select, display_order)
select 'Adicionais', false, 0, 5, 1
where not exists (select 1 from public.addon_groups where name = 'Adicionais');

insert into public.addon_options (group_id, slug, name, price_cents, display_order)
select g.id, v.slug, v.name, v.price, v.ord
from (select id from public.addon_groups where name = 'Adicionais' limit 1) g
cross join (values
  ('cheddar', 'Cheddar cremoso', 490, 1),
  ('bacon',   'Bacon extra',     690, 2),
  ('cebola',  'Cebola caramelizada', 390, 3),
  ('molho',   'Molho da casa',   290, 4),
  ('smash',   'Smash extra',     990, 5)
) as v(slug, name, price, ord)
on conflict (slug) do update
set name = excluded.name, price_cents = excluded.price_cents, display_order = excluded.display_order;

insert into public.products
  (category_id, slug, name, price_cents, image_url, description, ingredients, requires_doneness, display_order)
select c.id, v.slug, v.name, v.price, 'assets/' || v.slug || '.jpg', v.descr, v.ing, v.dn, v.ord
from (values
  ('combos','combo-fornalha','Combo Fornalha',5890,'Burger Brasa Bacon, meia Batata Brasa e bebida gelada.',array['burger','batata','bebida']::text[],true,1),
  ('combos','combo-costela','Combo Costela',6490,'Burger de Costela alto, batata rústica média e refri artesanal gelado.',array['burger de costela','batata','bebida']::text[],true,2),
  ('combos','combo-classico','Combo Clássico',4990,'X-Bacon da Brasa com meia porção de batata e uma bebida à escolha.',array['x-bacon','batata','bebida']::text[],true,3),
  ('combos','combo-dupla','Combo Dupla Brasa',11990,'Dois Brasa Bacon, Batata Brasa grande para dividir e duas bebidas.',array['2 burgers','batata grande','2 bebidas']::text[],true,4),
  ('hamburgueres','brasa-bacon','Brasa Bacon',3890,'Blend 160g, cheddar, bacon tostado, molho de brasa e pão selado.',array['pão brioche','blend 160g','cheddar','bacon','molho de brasa']::text[],true,1),
  ('hamburgueres','burger-costela','Burger de Costela',4290,'Burger alto, queijo âmbar, cebola na chapa e barbecue da casa.',array['pão brioche','burger alto','costela','queijo âmbar','cebola','barbecue']::text[],true,2),
  ('hamburgueres','x-bacon-brasa','X-Bacon da Brasa',3290,'Clássico da chapa com queijo, bacon crocante e molho levemente picante.',array['pão','burger 130g','queijo','bacon','maionese da casa']::text[],true,3),
  ('hamburgueres','brasa-salad','Brasa Salad',3190,'Burger artesanal com salada fresca, cebola roxa, picles e molho leve.',array['pão','burger 130g','alface','tomate','cebola roxa','picles']::text[],true,4),
  ('hamburgueres','smash-duplo','Smash Duplo',3690,'Dois smashes de 80g com borda crocante, queijo derretido e picles.',array['pão macio','2 smashes 80g','queijo prato','picles','molho da casa']::text[],false,5),
  ('hamburgueres','cheddar-melt','Cheddar Melt',3790,'Blend 160g coberto de cheddar cremoso e cebola caramelizada na chapa.',array['pão brioche','blend 160g','cheddar cremoso','cebola caramelizada']::text[],true,6),
  ('hamburgueres','frango-crocante','Frango Crocante',3390,'Filé de frango empanado, alface, tomate e maionese defumada.',array['pão','filé de frango','alface','tomate','maionese defumada']::text[],false,7),
  ('hamburgueres','hamburguer-tradicional','Hambúrguer Tradicional',2790,'Blend 130g na chapa, queijo, alface e tomate. Simples e bem feito.',array['pão','burger 130g','queijo','alface','tomate']::text[],true,8),
  ('acompanhamentos','batata-brasa','Batata Brasa',2490,'Batata rústica crocante com páprica defumada e molho especial.',array['batata rústica','páprica','sal de ervas','molho especial']::text[],false,1),
  ('acompanhamentos','aneis-cebola','Anéis de Cebola',2190,'Anéis empanados e sequinhos, servidos com maionese de ervas.',array['cebola empanada','maionese de ervas']::text[],false,2),
  ('acompanhamentos','batata-cheddar-bacon','Batata Cheddar & Bacon',2990,'Batata frita coberta com cheddar cremoso e farofa de bacon.',array['batata frita','cheddar cremoso','farofa de bacon']::text[],false,3),
  ('acompanhamentos','mandioca-frita','Mandioca Frita',2290,'Palitos de mandioca macios por dentro, dourados por fora, com sal de ervas.',array['mandioca','sal de ervas','molho verde']::text[],false,4),
  ('bebidas','refri-artesanal','Refri Artesanal',1290,'Bebida gaseificada gelada com toque cítrico e especiarias suaves.','{}'::text[],false,1),
  ('bebidas','refrigerante-lata','Refrigerante Lata',790,'Lata de 350 ml bem gelada. Pergunte pelos sabores disponíveis na observação.','{}'::text[],false,2),
  ('bebidas','suco-laranja','Suco de Laranja',1190,'Suco de laranja espremido na hora, sem adição de açúcar. Copo de 400 ml.','{}'::text[],false,3),
  ('bebidas','milkshake-chocolate','Milkshake de Chocolate',2190,'Sorvete cremoso batido com calda de chocolate e finalização de chantilly.','{}'::text[],false,4),
  ('sobremesas','brownie-brasa','Brownie da Brasa',1890,'Brownie intenso, servido quente, com calda doce no fechamento.',array['brownie','calda']::text[],false,1),
  ('sobremesas','pudim-ambar','Pudim Âmbar',1690,'Pudim cremoso com caramelo escuro e final delicado.',array['pudim','caramelo']::text[],false,2),
  ('sobremesas','sundae-doce-de-leite','Sundae de Doce de Leite',1790,'Sorvete de creme com doce de leite em calda e amendoim crocante.',array['sorvete','doce de leite','amendoim']::text[],false,3),
  ('sobremesas','cookie-recheado','Cookie Recheado',1290,'Cookie macio com gotas de chocolate e recheio cremoso de avelã.',array['cookie','recheio de avelã']::text[],false,4)
) as v(cat, slug, name, price, descr, ing, dn, ord)
join public.categories c on c.slug = v.cat
on conflict (slug) do update
set category_id = excluded.category_id, name = excluded.name, price_cents = excluded.price_cents,
    image_url = excluded.image_url, description = excluded.description,
    ingredients = excluded.ingredients, requires_doneness = excluded.requires_doneness,
    display_order = excluded.display_order;

-- Adicionais disponíveis em combos, hambúrgueres e acompanhamentos (os "personalizáveis").
insert into public.product_addon_groups (product_id, group_id)
select p.id, g.id
from public.products p
join public.categories c on c.id = p.category_id and c.slug in ('combos','hamburgueres','acompanhamentos')
cross join (select id from public.addon_groups where name = 'Adicionais' limit 1) g
on conflict do nothing;

-- =========================================================
-- 3) create_order: cálculo e validação 100% no servidor
-- =========================================================

drop function if exists public.create_order(jsonb);

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
  v_area record; v_coupon public.coupons;
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
      'district', case when v_mode = 'delivery' then v_area.name end,
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

-- Verificação:
--   select count(*) from public.products;                 -- 24
--   select slug, price_cents from public.addon_options;   -- 5 linhas
