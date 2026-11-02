
-- Fornalha 147 — Patch 05 corrigido
-- Executar depois dos patches 01 a 04.

DO $$
BEGIN
  IF to_regclass('public.banners') IS NULL
     OR to_regclass('public.addon_options') IS NULL THEN
    RAISE EXCEPTION
      'Tabelas necessárias não encontradas. Verifique o schema.sql.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'addon_options'
      AND column_name = 'slug'
  ) THEN
    RAISE EXCEPTION
      'A coluna addon_options.slug não existe. Verifique o patch 02.';
  END IF;

  IF to_regclass('public.business_hours') IS NULL
     OR to_regprocedure('public.admin_set_role(text,text)') IS NULL
     OR to_regprocedure('public.request_ip_status()') IS NULL THEN
    RAISE EXCEPTION
      'Objetos do patch 04 não encontrados. Verifique a ordem dos patches.';
  END IF;
END $$;

-- 1. Novas colunas dos banners
ALTER TABLE public.banners
  ADD COLUMN IF NOT EXISTS eyebrow text,
  ADD COLUMN IF NOT EXISTS button_label text;

-- 2. Limites de texto
ALTER TABLE public.banners
  DROP CONSTRAINT IF EXISTS banners_texts_chk;

ALTER TABLE public.banners
  ADD CONSTRAINT banners_texts_chk
  CHECK (
    char_length(body) <= 400
    AND (eyebrow IS NULL OR char_length(eyebrow) <= 80)
    AND (button_label IS NULL OR char_length(button_label) <= 40)
  );

-- 3. URL da imagem: sem limite de repetição incompatível
ALTER TABLE public.banners
  DROP CONSTRAINT IF EXISTS banners_image_url_chk;

ALTER TABLE public.banners
  ADD CONSTRAINT banners_image_url_chk
  CHECK (
    image_url IS NULL
    OR image_url ~ '^assets/[A-Za-z0-9_./-]+$'
    OR image_url ~ '^https://[^[:space:]]+$'
  );

-- 4. Período do banner
ALTER TABLE public.banners
  DROP CONSTRAINT IF EXISTS banners_period_chk;

ALTER TABLE public.banners
  ADD CONSTRAINT banners_period_chk
  CHECK (
    starts_at IS NULL
    OR ends_at IS NULL
    OR ends_at >= starts_at
  );

-- 5. Inserir os banners iniciais somente se a tabela estiver vazia
INSERT INTO public.banners (
  placement, title, body, image_url, click_url, coupon_code,
  status, devices, display_order, eyebrow, button_label
)
SELECT *
FROM (
  VALUES
    (
      'hero',
      'Brasa alta, pedido rápido e hambúrguer artesanal de verdade.',
      'Fornalha 147 entrega burgers premium no Centro, Jardins e Vila Nova, com retirada grátis e pagamento na entrega ou retirada.',
      'assets/burger-costela.jpg',
      '#cardapio',
      'BRASA15',
      'active',
      'all',
      1,
      'Terça a domingo • 18h às 23h30',
      'Pedir agora'
    ),
    (
      'promo',
      'Cupom de estreia para testar o fluxo completo.',
      'Digite **BRASA15** no carrinho. O desconto de 15%, a taxa do bairro e o total final são recalculados antes da revisão do pedido.',
      NULL,
      NULL,
      'BRASA15',
      'active',
      'all',
      1,
      'Promoções',
      'Copiar cupom'
    )
) AS v(
  placement, title, body, image_url, click_url, coupon_code,
  status, devices, display_order, eyebrow, button_label
)
WHERE NOT EXISTS (
  SELECT 1 FROM public.banners
);

-- 6. Validação do slug dos adicionais
ALTER TABLE public.addon_options
  DROP CONSTRAINT IF EXISTS addon_options_slug_chk;

ALTER TABLE public.addon_options
  ADD CONSTRAINT addon_options_slug_chk
  CHECK (
    slug IS NULL OR slug ~ '^[a-z0-9-]+$'
  );
