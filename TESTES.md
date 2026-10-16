# Roteiro de testes (rodar com o Supabase configurado)

Marque cada item. Se algo falhar, anote a mensagem e o passo.

## 0. Preparação
- [ ] Rodar `schema.sql`, `schema-patch-01-seguranca.sql`, `schema-patch-02-pedidos-catalogo.sql`, `schema-patch-03-robustez.sql` (nessa ordem, sem erro).
- [ ] `config.js` com URL e chave anon; `.htaccess` com o endereço do Supabase.
- [ ] Criar uma conta pelo site e promovê-la a admin no SQL Editor.

## 1. Contas
- [ ] Cadastro com dados válidos cria a conta (e pede confirmação de e-mail, se ligada).
- [ ] Senha curta (menos de 8) é recusada.
- [ ] Login com senha errada mostra "E-mail ou senha incorretos".
- [ ] Sair e entrar de novo funciona; recarregar a página mantém a sessão.
- [ ] Recuperar senha: o link volta ao site e permite definir nova senha.

## 2. Acessos negados (o mais importante)
- [ ] Conta comum abre `admin.html` → "Acesso negado".
- [ ] Sem login, `admin.html` → botão "Entrar" leva ao login e volta ao painel.
- [ ] Conta comum, no console do navegador, não consegue alterar o próprio `role`.
- [ ] Anônimo não lista cupons nem lê pedidos (consulta direta à API retorna vazio ou erro).
- [ ] Cliente A não vê pedidos do cliente B.

## 3. Pedido de ponta a ponta
- [ ] Pedido de **entrega** com login: aparece no painel em até 15 s, com som de sino.
- [ ] Pedido de **retirada**: grava sem erro (era a dúvida do `create_order`).
- [ ] Pedido de convidado (sem login) funciona; o 4º em 10 min com o mesmo WhatsApp é recusado.
- [ ] Item com ponto da carne, adicional, remoção e observação chega completo ao painel e à comanda impressa.
- [ ] Preço adulterado no navegador (editar carrinho no console) é ignorado: o total gravado é o do servidor.
- [ ] Cupom BRASA15 abaixo do mínimo é recusado; acima, aplica 15%.

## 4. Status
- [ ] Botão avança: Confirmar → Preparo → Entrega → Entregue.
- [ ] Arrastar para uma coluna permitida persiste; para uma coluna proibida é recusado.
- [ ] Recusar pedido exige/guarda motivo.
- [ ] Desligar a internet no meio de uma mudança: o status volta ao anterior com aviso.
- [ ] Cliente vê o status atualizado em Minha conta > Meus pedidos; "Pedir novamente" repõe os itens.

## 5. Painel → site
- [ ] Mudar a taxa de um bairro: o checkout mostra o novo valor após recarregar.
- [ ] Esgotar um produto: o botão no site vira "Esgotado".
- [ ] Criar produto e categoria novos: aparecem no cardápio.
- [ ] Criar cupom: vale no carrinho; desativar: deixa de valer.
- [ ] Mudar preço de um adicional: reflete no modal do produto.
- [ ] Criar banner de promoção com datas: aparece só dentro do período.
- [ ] Pausar pedidos no painel: o site mostra "Pedidos pausados" e bloqueia o checkout.

## 6. Hospedagem (Hostinger)
- [ ] Site abre em HTTPS; HTTP redireciona.
- [ ] Console do navegador sem erros de CSP (se houver, anotar o domínio bloqueado).
- [ ] `https://seudominio.com/schema.sql` e `/BACKEND.md` retornam 403/404.
- [ ] Mobile (320 px a 430 px): painel, kanban, modais e checkout sem barra lateral horizontal na página.
