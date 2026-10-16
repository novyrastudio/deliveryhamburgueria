# Entrega etapa 1 — Supabase, patches e LGPD

Data: 2026-10-12

## O que foi corrigido

- Patches 01 a 05 agora verificam dependências antes de alterar tabelas. Se `schema.sql` não tiver sido executado no mesmo projeto Supabase, a mensagem passa a explicar a causa em vez de falhar com erro genérico como `relation "public.banners" does not exist`.
- `TESTES.md` foi atualizado para incluir os patches 04 e 05, consultas de diagnóstico e testes de CAPTCHA/IP/LGPD.
- `BACKEND.md`, `SEGURANCA.md` e `CONCEITO.md` foram alinhados ao estado atual do projeto.
- `app.js` recebeu ações reais em "Minha conta":
  - baixar dados da conta em JSON;
  - excluir conta chamando a RPC `delete_my_account()`.

## Arquivos alterados

- `schema-patch-01-seguranca.sql`
- `schema-patch-02-pedidos-catalogo.sql`
- `schema-patch-03-robustez.sql`
- `schema-patch-04-seguranca-lgpd-config.sql`
- `schema-patch-05-banners-adicionais.sql`
- `TESTES.md`
- `BACKEND.md`
- `SEGURANCA.md`
- `CONCEITO.md`
- `app.js`

## Testes executados

- `node --check app.js` — aprovado.
- `node --check admin.js` — aprovado antes da alteração de LGPD.
- `node --check auth-client.js` — aprovado antes da alteração de LGPD.
- `node --check banners.js` — aprovado antes da alteração de LGPD.
- `node --check config.js` — aprovado antes da alteração de LGPD.

Não foi executado teste contra Supabase remoto. Não executei `test_db.py`, porque ele aponta para um Postgres local fixo e insere dados de teste.

## O que executar no Supabase

Antes de executar qualquer patch, confirme que está no projeto correto:

```sql
select table_schema, table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;

select
  to_regclass('public.profiles') as profiles,
  to_regclass('public.banners') as banners,
  to_regclass('public.store_settings') as store_settings,
  to_regclass('public.orders') as orders;
```

Se o schema estiver vazio e for o projeto correto, execute nesta ordem:

1. `schema.sql`
2. `schema-patch-01-seguranca.sql`
3. `schema-patch-02-pedidos-catalogo.sql`
4. `schema-patch-03-robustez.sql`
5. `schema-patch-04-seguranca-lgpd-config.sql`
6. `schema-patch-05-banners-adicionais.sql`

Não rode `mock.sql` no Supabase real.

## Pendências principais

- Configurar `config.js` com URL e chave anon do Supabase correto.
- Validar `request_ip_status()` em produção com Cloudflare.
- Ativar/testar CAPTCHA/Turnstile se `require_guest_captcha` for ligado.
- Finalizar a política de privacidade removendo marcadores `[[...]]`.
- Tornar a aba "Usuários administrativos" real no painel, usando `profiles` e `admin_set_role()`.
- Rodar o roteiro completo de `TESTES.md`.

## Prompt para continuar no Claude

```text
Você está continuando um projeto de delivery estático com Supabase chamado Fornalha 147 / Brasa Burger. Preserve o layout aprovado, faça alterações pontuais, não reconstrua do zero e não execute nada destrutivo no banco.

Contexto importante:
- Os arquivos estão no pacote `outputs`.
- O erro original era `ERROR: 42P01: relation "public.banners" does not exist` ao rodar `schema-patch-05-banners-adicionais.sql`.
- A causa diagnosticada: `public.banners` é criada em `schema.sql`; o patch 05 só altera essa tabela. Se o Supabase mostra "No tables in schema", o schema base não foi executado naquele projeto ou o usuário está no projeto Supabase errado.
- Não foi executada nenhuma alteração remota no Supabase.

Trabalho já feito na etapa 1:
- Adicionadas pré-checagens nos patches 01 a 05 para detectar schema base ausente ou patches fora de ordem.
- Atualizados `TESTES.md`, `BACKEND.md`, `SEGURANCA.md` e `CONCEITO.md`.
- Em `app.js`, adicionados botões reais em "Minha conta" para baixar dados em JSON e excluir conta via RPC `delete_my_account()`.
- `node --check app.js` passou.

Ordem correta do SQL no Supabase:
1. `schema.sql`
2. `schema-patch-01-seguranca.sql`
3. `schema-patch-02-pedidos-catalogo.sql`
4. `schema-patch-03-robustez.sql`
5. `schema-patch-04-seguranca-lgpd-config.sql`
6. `schema-patch-05-banners-adicionais.sql`

Antes de qualquer alteração remota, mostrar diagnóstico e pedir autorização. Não apagar, recriar ou resetar banco.

Próxima melhor etapa:
1. Implementar a aba "Usuários administrativos" de forma real no `admin.js`:
   - listar `profiles` com `role`;
   - permitir promover/rebaixar por e-mail usando RPC `admin_set_role(p_email, p_role)`;
   - impedir tratar isso como pronto sem testar com conta admin real.
2. Depois, revisar `privacidade.html` para garantir que a política reflita os dados realmente coletados e marque claramente o que depende de confirmação da loja.
3. Rodar checagens de sintaxe (`node --check`) e atualizar `TESTES.md` se necessário.

Arquivos alterados até agora:
- `schema-patch-01-seguranca.sql`
- `schema-patch-02-pedidos-catalogo.sql`
- `schema-patch-03-robustez.sql`
- `schema-patch-04-seguranca-lgpd-config.sql`
- `schema-patch-05-banners-adicionais.sql`
- `TESTES.md`
- `BACKEND.md`
- `SEGURANCA.md`
- `CONCEITO.md`
- `app.js`
- `ENTREGA_ETAPA_1.md`
```
