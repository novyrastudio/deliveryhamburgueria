-- Fornalha 147 — Patch 07 (v2): caminhos das imagens de 5 produtos (SOMENTE image_url)
-- Rode DEPOIS do schema.sql e dos patches 01 a 06. Idempotente. Sem segredos.
-- Não altera slug, nome, preço, descrição, estoque nem outras colunas.
-- v2: troca o caminho pelo SLUG sempre que o image_url atual for um arquivo de assets/ (qualquer nome antigo).
--     Imagens enviadas pelo painel (data:image...) e URLs https:// NÃO são sobrescritas.
-- Mandioca Frita, Cookie Recheado e Refrigerante Lata já usam o nome certo e não entram aqui.
-- Se o patch 02 for rodado de novo depois, ele regrava o caminho antigo; rode este patch outra vez.

do $$
declare
  v_total integer := 0;
  v_n integer;
  r record;
begin
  if to_regclass('public.products') is null then
    raise exception 'Tabela public.products nao encontrada. Execute o schema.sql e os patches anteriores.';
  end if;

  for r in select * from (values
    ('aneis-cebola',         'assets/aneis-de-cebola.jpg'),
    ('batata-cheddar-bacon', 'assets/batata-com-cheddar-e-bacon.jpg'),
    ('milkshake-chocolate',  'assets/milkshake-de-chocolate.jpg'),
    ('sundae-doce-de-leite', 'assets/sundae-de-doce-de-leite.jpg'),
    ('suco-laranja',         'assets/suco-de-laranja.jpg')
  ) as v(slug, novo)
  loop
    update public.products
       set image_url = r.novo
     where slug = r.slug
       and (image_url is null or image_url like 'assets/%')
       and image_url is distinct from r.novo;
    get diagnostics v_n = row_count;
    v_total := v_total + v_n;
    if not exists (select 1 from public.products where slug = r.slug) then
      raise warning 'Nenhum produto com slug % foi encontrado (confira o slug real na consulta abaixo).', r.slug;
    end if;
  end loop;
  raise notice 'Patch 07: % linha(s) atualizada(s).', v_total;
end $$;

-- Verificação (somente leitura) — rode ANTES e DEPOIS; mostra todos os produtos, para conferir slugs reais:
--   select slug, name, image_url from public.products order by display_order;
