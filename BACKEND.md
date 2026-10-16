# Backend e autenticação — Brasa Burger / Fornalha 147

## Recomendação
O site roda no **GitHub Pages** (só arquivos estáticos, sem servidor). Contas reais precisam de um serviço
externo. A opção escolhida é o **Supabase** (plano gratuito atende):

- **Supabase Auth**: guarda senhas com hash bcrypt, envia e-mail de confirmação e de recuperação, emite sessões.
- **Postgres + RLS**: dados em banco persistente; as regras de segurança por linha impedem um cliente de ler
  ou alterar dados de outro, mesmo conhecendo a chave pública.
- A chave **anon/publishable** pode ficar no front-end por desenho. A `service_role` NUNCA pode.

## O que já está implementado no código
- `auth-client.js`: cadastro, login, sair, recuperar/redefinir senha, perfil, sessão persistente (localStorage).
- `app.js`: telas (Entrar, Criar conta, Esqueci a senha, Minha conta, Meus pedidos protegido por login),
  validação com mensagens claras, checkout preenchido com dados da conta, `customerId` no pedido preparado.
- `schema.sql`: schema Supabase com perfis, papel `customer/admin`, catálogo, adicionais, cupons, áreas,
  banners, configurações, pedidos, RLS e RPCs `create_order` e `update_order_status`.
- `admin.html`, `admin.css` e `admin.js`: protótipo navegável do painel. Ainda usa dados locais/localStorage.

## O que falta fazer (depende de você — nada foi criado nem configurado por mim)
1. Criar um projeto em supabase.com (conta sua).
2. SQL Editor → colar e executar `schema.sql`.
3. Authentication → Providers → Email: ligar. Decidir "Confirm email" (recomendado ligado).
4. Authentication → Policies/Password: exigir mínimo de 8 caracteres.
5. Authentication → URL Configuration: **Site URL** = endereço do GitHub Pages
   (ex.: `https://SEU-USUARIO.github.io/SEU-REPO/`) e incluí-lo em **Redirect URLs**
   (sem isso o link de recuperar senha e de confirmar e-mail não volta ao site).
6. Authentication → SMTP: o e-mail padrão do Supabase tem limite baixo; para produção configure um SMTP próprio.
7. Project Settings → API: copiar **Project URL** e a chave **anon/publishable** para `config.js`
   (`auth.url` e `auth.anonKey`). **Não copie a `service_role`.**
8. Criar a primeira conta pelo site público e promover manualmente o administrador no SQL Editor:
   `update public.profiles set role = 'admin' where email = 'seu-email@dominio.com';`
9. Testar: criar conta, sair, entrar, recuperar senha.

## Segurança — o que está e o que não está coberto
- Senhas nunca ficam no site nem no banco em texto puro (hash no Supabase).
- Validação no navegador (conveniência) **e** no servidor (gatilho SQL, RLS e RPCs).
- Isolamento entre clientes e administradores é garantido por RLS e pela coluna `role` em `profiles`, não pelo front-end.
- A sessão (tokens) fica em localStorage, como no cliente oficial do Supabase. O site escapa todo texto exibido
  para reduzir risco de XSS. Considere ativar um CSP no futuro, se migrar para um host que permita cabeçalhos.
- Ainda não existe: exclusão de conta, troca de e-mail, política de privacidade publicada (necessária pela LGPD),
  proteção anti-robô (CAPTCHA, ativável no Supabase).
- O banco já tem RPC `create_order`, que recalcula produtos, adicionais, cupom e taxa antes de gravar.
  O site público ainda precisa ser conectado a esse RPC; até essa conexão, o checkout continua visual.
- O painel ainda precisa trocar os dados locais por consultas reais ao Supabase e usar `update_order_status`.

## Banners
Os banners vêm de uma única lista em `banners.js`. Para o futuro painel, basta publicar essa lista em um endpoint
e informar a URL em `config.js` (`bannersEndpoint`). Com Supabase, a próxima etapa é ler/gravar a tabela
`banners` em vez de editar `banners.js` manualmente.
