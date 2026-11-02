# Fornalha 147 — backend e integração

Atualizado em 01/11/2026. Este documento descreve o código local desta cópia; não confirma o estado remoto do Supabase.

## Arquitetura existente

- A loja é HTML, CSS e JavaScript estáticos. `index.html` carrega `config.js`, `auth-client.js`, `banners.js`, `cep-utils.js` e `app.js`.
- `auth-client.js` usa a URL e a chave publicável já presentes em `config.js` para Supabase Auth, REST e RPC.
- A chave publicável pode estar no navegador por desenho do Supabase. A chave `service_role` não pode ser incluída em nenhum arquivo público; ela não é necessária para esta arquitetura.
- `banners.js` lê banners públicos do Supabase e usa uma lista local quando a integração falha. `bannersEndpoint` está vazio e não é necessário para a consulta direta.

## Integração do catálogo e da loja

Com o serviço configurado, a loja lê categorias, produtos, grupos de adicionais e áreas de entrega das tabelas públicas autorizadas por RLS. Os valores do navegador servem como fallback quando a configuração está ausente ou a leitura falha. Uma resposta remota válida com lista vazia agora substitui os dados locais: não mantém produtos ou taxas antigos como se viessem do banco.

O checkout envia escolhas do cliente à RPC `create_order()`. O servidor valida os produtos, adicionais, cupons, área, taxa e totais. O navegador não envia preços como fonte de verdade. Os estados dos pedidos são alterados no painel pela RPC `update_order_status()`.

A consulta de CEP está separada em `cep-utils.js`. O navegador consulta o ViaCEP quando a pessoa pede a busca; o CEP e a localidade são incorporados ao campo de endereço existente, sem exigir mudança de schema. Uma área só é pré-selecionada quando `delivery_areas.coverage` contém uma faixa explícita com dois CEPs e a faixa corresponde. Se nenhuma faixa ou mais de uma faixa corresponder, a escolha continua manual.

## Conta e painel

`auth-client.js` implementa cadastro, login, logout, recuperação/redefinição de senha e edição do perfil. `app.js` expõe histórico, repetição de pedido, exportação dos dados em JSON e exclusão da conta por RPC. O painel valida o papel administrativo no servidor e já lê produtos, pedidos, cupons, áreas, banners, configurações, horários e usuários administrativos.

O painel agora permite reordenar produtos com setas e salvar `display_order` por chamadas autenticadas de atualização. A persistência usa uma chamada por produto; se parte delas falhar, algumas posições podem já ter sido gravadas. A interface mantém a edição aberta e pede que a lista seja conferida antes de tentar novamente.

O formulário de criação manual de pedido no código antigo era apenas demonstrativo e não tem botão ligado ao painel nem RPC segura correspondente nos schemas locais. Não será usado para gravar pedidos reais. Para habilitá-lo, será necessário projetar e autorizar um fluxo que mantenha a autoria, os dados do cliente e o cálculo de preço corretos.

## Estado Supabase e schemas

O projeto Supabase foi reconfigurado segundo a informação do responsável. A URL e uma chave publicável estão configuradas no `config.js` local, mas as tentativas HTTP GET à API falharam antes de receber uma resposta HTTP (`fetch failed`). Portanto, não foi possível confirmar objetos nem estado remoto. A inspeção de compatibilidade local, os contratos de tabela/RPC, a ordem dos patches e os riscos de reexecução estão em `SUPABASE_COMPATIBILIDADE.md`.

Os schemas locais são documentação de referência. A sequência de dependências é `schema.sql` e depois os patches 01 a 06. **Não execute essa sequência nem qualquer SQL neste momento.** Os arquivos incluem carga e atualização de dados comerciais e não provam quais alterações já existem no banco.

O contrato local do checkout confere com a versão final das RPCs e com os campos descritos nos schemas. Essa comparação é estática; tabelas, colunas, RPCs, RLS e permissões do projeto remoto seguem sem confirmação. Nenhum SQL foi executado e o banco não foi alterado.

## Diagnóstico de login — 01/11/2026

A primeira verificação encontrou no `config.js` um endereço Supabase antigo cujo hostname falhou no navegador com `net::ERR_NAME_NOT_RESOLVED`. Isso acontece antes de uma resposta HTTP e não prova que a conexão geral à internet esteja fora do ar. As causas comuns documentadas pelo Supabase incluem referência de projeto incorreta ou projeto pausado.

O responsável forneceu o endereço e a chave publicável do projeto reconfigurado, e atualizei esse par em `config.js`. O navegador agora alcança o endpoint de Auth do novo endereço; sem enviar a chave pela URL, o endpoint respondeu que a requisição não tinha `apikey`. Isso confirma resolução/conectividade HTTP, mas não confirma a chave, credenciais de usuário, estado das tabelas/RPCs ou sucesso de login. O teste autenticado real continua pendente. A mensagem do cliente foi corrigida para não atribuir uma falha de `fetch` à internet geral. Nunca coloque uma chave `sb_secret_` ou `service_role` no frontend.

## Limitações e pendências

- CAPTCHA e sessão anônima não estão implementados. Se `require_guest_captcha` estiver ligado, o backend recusa pedidos de convidados; a tela orienta a pessoa a entrar na conta.
- A política de privacidade continua como minuta e contém marcadores que precisam de dados e decisões da loja. Não foram inventados dados legais ou comerciais.
- A criação manual de pedidos permanece pendente por falta de um caminho seguro definido nos schemas.
- O domínio de hospedagem e os cabeçalhos de segurança continuam sem confirmação; não há `.htaccess` nesta cópia.
- `outputs/` contém material de desenvolvimento (schemas, `mock.sql`, documentação e `test_db.py`). Não publique a pasta inteira; ainda falta definir um pacote de publicação com allowlist dos arquivos de frontend.
- Nenhum teste autenticado, administrativo ou de pedido foi realizado contra o Supabase real.

Consulte `TESTES.md` para os resultados simulados e a lista de verificações pendentes.
