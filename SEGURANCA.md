# Auditoria de segurança — Fornalha 147 / Brasa Burger

Base: leitura do código (front-end estático + Supabase). **Nada foi executado contra um Supabase real nem em hospedagem real.** O que depende do banco ou do servidor está marcado como "não confirmado em execução".

## 1. Resumo executivo
Arquitetura sem servidor próprio: toda a lógica sensível fica no Supabase (RLS, funções SQL). O desenho é sólido: preços, cupom, taxa e transições de status são calculados no servidor; papel de admin não é editável pela API. Os riscos reais restantes são abuso de pedidos de convidado (sem CAPTCHA), sessão em localStorage e ausência de política de privacidade (LGPD). Segurança de produção só pode ser afirmada depois dos testes com o banco configurado.

## 2. Vulnerabilidades e riscos encontrados

| # | Item | Gravidade | Onde | Situação |
|---|------|-----------|------|----------|
| 1 | Pedidos de convidado limitados só por WhatsApp (3 / 10 min); trocando o número, o limite some. Permite spam de pedidos falsos para a cozinha. | Média | `schema-patch-02`, `create_order` | Confirmado no código. Mitigação parcial no patch 03 (limite por conta logada). Falta CAPTCHA ou limite por IP. |
| 2 | Tokens de sessão em localStorage: um XSS roubaria a sessão. | Baixa–média | `auth-client.js` (`SESSION_KEY`) | Risco inerente ao cliente Supabase estático. Mitigado por escape de saída e pela CSP do `.htaccess` (não verificada em produção). |
| 3 | `validate_coupon` aceita chamadas anônimas ilimitadas: permite tentar adivinhar códigos. | Baixa | `schema-patch-01` | Confirmado no código. Limite depende de configuração do Supabase/WAF. |
| 4 | Nomes de bairro/categoria vindos do banco eram inseridos no HTML sem escape em 3 pontos do checkout. Só um admin poderia explorar. | Baixa | `app.js` | **Corrigido.** |
| 5 | `banners.click_url` e `coupon_code` sem validação no banco (só no front). Só admin poderia gravar. | Baixa | `schema.sql` | **Corrigido** no patch 03 (constraints). |
| 6 | Sem política de privacidade publicada, sem exclusão de conta, sem troca de e-mail. | Média (conformidade) | — | Pendente (LGPD). |
| 7 | Mínimo de senha de 8 caracteres validado no navegador; no servidor depende da configuração do Supabase. | Baixa | `BACKEND.md` passo 4 | Não confirmado em execução. |

Suspeita não confirmada: pedido de retirada em `create_order` podia ler o registro do bairro sem estar preenchido. O patch 03 elimina a possibilidade, mas só um teste real confirma o comportamento anterior.

## 3. Categorias verificadas e consideradas adequadas (por leitura do código)
- **Preços, descontos e taxas no servidor:** `create_order` recalcula tudo e ignora valores do navegador.
- **Transições de status:** validadas em `update_order_status` (apenas admin, com ordem permitida).
- **Elevação de privilégio / mass assignment:** o cliente só pode atualizar `name` e `phone` (grant por coluna) e a RLS impede mudar `role`.
- **IDOR em pedidos:** cliente só lê pedidos com `customer_id = auth.uid()`; pedidos de convidado só o admin lê.
- **SQL injection:** consultas via PostgREST/RPC parametrizadas; ids de URL passam por `encodeURIComponent`.
- **CSRF:** não aplicável (autenticação por cabeçalho `Authorization`, sem cookies).
- **XSS no painel e no site:** textos dinâmicos passam por `escapeHtml`/`textContent`; imagens do painel passam por `safeImg`; links de banner são validados.
- **Segredos:** nenhuma `service_role` ou senha no repositório; `config.js` só leva URL e chave anon.
- **SSRF, LFI/RFI, RCE, uploads no servidor, IA:** não aplicáveis (sem código de servidor próprio, sem IA). O envio de imagem do painel só gera data URL no navegador, limitado a ~400 KB.
- **Webhooks:** não existem.

## 4. Correções recomendadas
1. Ativar CAPTCHA (Supabase Auth) e limitar por IP os pedidos de convidado (WAF/Cloudflare na frente da Hostinger).
2. Publicar política de privacidade e criar fluxo de exclusão de conta.
3. Conferir no painel do Supabase: senha mínima de 8, confirmação de e-mail ligada, SMTP próprio.

## 5. Código seguro recomendado
Já aplicado: `schema-patch-03-robustez.sql`, `.htaccess` e os escapes em `app.js`.

## 6. Refatoração de arquitetura
Para produção com pagamento online ou volume alto, mover a criação de pedido para uma Edge Function (limite por IP, CAPTCHA, logs). Não é necessário para o escopo atual.

## 7. Hardening adicional
- Cloudflare gratuito na frente do domínio (WAF, rate limit, bot protection).
- MFA para contas admin (Supabase suporta).
- Backups do Supabase e alerta de erros.
- Trocar tokens em localStorage por cookies HttpOnly exige um backend próprio; só vale a pena se o risco justificar.

## 8. Riscos silenciosos
- Políticas RLS e grants nunca foram executados: um erro de digitação no SQL pode abrir ou fechar acesso sem aviso. O roteiro `TESTES.md` cobre isso.
- O `.htaccess` (CSP, HSTS) não foi testado na Hostinger; uma CSP errada pode bloquear o site inteiro.
- Dados de pedido (nome, telefone, endereço) ficam em `jsonb` sem criptografia em coluna (a base do Supabase é criptografada em repouso).

## 9. Score de segurança
**6,5 / 10.** Boa base de autorização e cálculo no servidor. Perde pontos por abuso de convidado sem CAPTCHA, LGPD incompleta e, principalmente, por nada ter sido testado em execução. Limitação: avaliação apenas por leitura do código.

## 10. Próximos passos prioritários
1. Executar `schema.sql`, patches 01, 02 e 03 e rodar `TESTES.md` (principalmente acessos negados).
2. Ativar CAPTCHA e confirmar a política de senha no Supabase.
3. Colocar Cloudflare/WAF na frente do domínio.
4. Publicar política de privacidade e criar exclusão de conta.
5. Ativar MFA nas contas administradoras.
