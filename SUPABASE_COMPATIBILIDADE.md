# Fornalha 147 — auditoria local de compatibilidade com Supabase

**Data:** 31/10/2026  
**Escopo:** inspeção local e tentativas somente de leitura. Nenhum SQL foi executado; não houve escrita no Supabase.

## Resultado

A configuração local contém uma URL de projeto Supabase e uma chave publicável. `auth-client.js` usa diretamente Auth, REST e RPC; não há SDK necessário nesta arquitetura. A chave `service_role` não aparece no frontend e não foi reproduzida neste documento.

Não foi possível obter a especificação REST do endpoint configurado: as tentativas HTTP GET terminaram em erro de rede (`fetch failed`), sem uma resposta HTTP do Supabase. Não há nesta sessão um conector de banco que permita consultar catálogo ou histórico de migrações. Isso **não permite concluir** que o projeto esteja vazio, incorreto ou fora do ar. O estado remoto — tabelas, funções, políticas, dados e patches aplicados — permanece **não verificado**.

## Ordem de dependência documentada nos arquivos locais

```text
schema.sql
  └─ schema-patch-01-seguranca.sql
       └─ schema-patch-02-pedidos-catalogo.sql
            └─ schema-patch-03-robustez.sql
                 └─ schema-patch-04-seguranca-lgpd-config.sql
                      └─ schema-patch-05-banners-adicionais.sql
                           └─ schema-patch-06-permissoes.sql
```

- O patch 01 exige tabelas do schema base e instala `validate_coupon()` e a leitura pública de configurações.
- O patch 02 exige o patch 01 e as tabelas do catálogo; torna `orders.customer_id` opcional, adiciona `addon_options.slug` e substitui a criação do pedido para resolver produtos/adicionais pelo slug.
- O patch 03 exige as alterações do patch 02 e substitui `create_order()` novamente; também aplica validações a banners.
- O patch 04 documenta dependência dos patches 01–03. Acrescenta configurações, horários, controle de tentativas, funções administrativas e de conta, e define a versão final de `create_order()`.
- O patch 05 exige objetos do patch 04 e o slug do patch 02; acrescenta campos e validações de banners.
- O patch 06 verifica funções do patch 04 e o campo de banner do patch 05; restringe permissões `EXECUTE` de RPCs administrativas.

Essa é a ordem **dos arquivos locais**, não evidência do que foi aplicado no projeto remoto.

## Contrato frontend ↔ schemas locais

| Área | O que o código local espera | Referência local | Compatibilidade estática |
|---|---|---|---|
| Catálogo público | `categories`, `products`, `addon_groups`, `addon_options`, `product_addon_groups`; campos de slug, preço, disponibilidade, ordenação, ingredientes e relações | `schema.sql`, com `addon_options.slug` no patch 02 | Compatível com o contrato final descrito nos arquivos locais |
| Entrega | `delivery_areas.name`, `fee_cents`, `min_order_cents`, `coverage`, `active` | `schema.sql` | Compatível; `coverage` é texto e o cliente só pré-seleciona faixa CEP explícita |
| Banners | Campos base e `eyebrow`, `button_label` | `schema.sql` e patch 05 | Compatível somente depois do patch 05 |
| Perfil e conta | `profiles` e histórico de `orders`; RPC `delete_my_account()` | `schema.sql`, patch 04 e permissões do patch 06 | Compatível estaticamente; operação real não verificada |
| Administração | CRUD de produtos, categorias, adicionais, pedidos, cupons, áreas, banners, `store_settings` e `business_hours` com sessão autenticada/RLS | `schema.sql`, patches 02, 04, 05 e 06 | O código depende do conjunto completo de objetos e políticas; remoto não verificado |
| Cupom | `validate_coupon(p_code, p_subtotal_cents)` retorna JSON com `valid`, `discountCents`, `minOrderCents` e `freeDelivery`, entre outros | patch 01 | Nomes e formato consumidos pelo frontend são compatíveis |
| Configuração pública | `get_public_store_settings()` retorna JSON camelCase para loja, modos, pagamentos, horários e exigência de verificação | patch 04 amplia a função do patch 01 | Compatível com as propriedades lidas pelo frontend |
| Criar pedido | `create_order(p_order jsonb)` recebe `productSlug`, `addonSlugs`, endereço, modalidade, pagamento, cupom e escolhas; retorna `{ orderNumber, totals }` em camelCase | versão final no patch 04 | **Compatível** com o payload e a leitura da resposta em `app.js`; versões anteriores dos schemas retornam formatos diferentes, então o patch 04 é requisito para este contrato |
| Alterar status | `update_order_status(p_order_id, p_status, p_reason)` | `schema.sql`; execução administrativa restringida no patch 06 | O painel chama a RPC com estes argumentos; autorização efetiva depende do banco |
| Papel administrativo | `admin_set_role(p_email, p_role)` | patch 04; restrição de execução no patch 06 | Chamada local compatível |
| Proteção contra abuso | `request_ip_status()` e controles de tentativas de `create_order()` | patch 04; permissões complementadas no patch 06 | Parcialmente dependente de sessão anônima e cabeçalhos da infraestrutura, não confirmados |

## Riscos e pendências de integração

1. **Não reaplicar schemas para “descobrir” o estado.** O schema base inclui dados iniciais; o patch 02 faz carga/upsert do catálogo; o patch 04 ajusta valores de exemplo; o patch 05 insere banners quando a tabela está vazia. Reexecuções podem modificar conteúdo comercial. Nenhum arquivo SQL foi executado nesta fase.
2. **O histórico de aplicação não está disponível localmente.** Os arquivos não demonstram se o projeto atual recebeu todos, alguns ou nenhum dos patches.
3. **Convidados e CAPTCHA.** O checkout não implementa CAPTCHA nem cria sessão anônima verificada. Se `store_settings.require_guest_captcha` estiver ligado, o `create_order()` final pode recusar o convidado. A tela orienta a entrar na conta nesse caso; a configuração real é desconhecida.
4. **Admin e RLS.** O painel depende de sessão válida, papel administrativo, políticas RLS e permissões corretas. Uma leitura HTTP anônima não seria suficiente para validar o fluxo administrativo.
5. **Tabelas de suporte do painel.** `business_hours`, colunas estendidas de `store_settings`, campos adicionais de `banners` e as funções LGPD/admin dependem dos patches posteriores, em particular 04–06.

## Próximo passo seguro

Obter uma leitura do catálogo do projeto configurado (tabelas/colunas, assinaturas das RPCs, políticas RLS e privilégios `EXECUTE`) e comparar com a matriz acima. A leitura pode ser feita por um conector Supabase autorizado ou por uma exportação somente de metadados do painel. Até existir essa evidência, não aplicar migrações nem declarar a integração remota pronta. O usuário proibiu execução de SQL e alterações no banco sem autorização; esta auditoria respeitou esse limite.
