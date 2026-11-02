# Fornalha 147 — inventário e diagnóstico

Data do inventário: 31/10/2026  
Escopo: leitura da cópia de desenvolvimento. Não houve acesso ao Supabase, execução de SQL, publicação nem execução de testes nesta fase.

## 1. Estrutura encontrada

A pasta de trabalho contém 48 arquivos em duas áreas principais:

- `outputs/`: loja pública, painel administrativo, estilos, imagens, schemas SQL, documentação e roteiro de testes.
- `work/`: `generate-assets.mjs`, gerador local de imagens PNG.

Os materiais listados pelo responsável estão, em sua maioria, consolidados em `outputs/`: `BACKEND.md`, `banners.js`, `CONCEITO.md`, `ENTREGA_ETAPA_1.md`, `privacidade/`, `mock.sql`, `rebuild.sh`, `schema.sql`, os patches 01–06, `SEGURANCA.md`, `styles.css`, `styles-v2.css`, `test_db.py` e `TESTES.md`. Não há nesta cópia pastas separadas chamadas `backend/` ou `banners/`, nem um arquivo `index_mock`.

Não encontrei repositório Git, branch, `.gitignore`, `package.json`, arquivo `.env`, `README`/`AGENTS.md` ou `.htaccess`. A pasta de trabalho tem “Copia” no nome, mas não há histórico Git que permita confirmar sua relação com outra cópia. O projeto é estático: HTML, CSS e JavaScript no navegador, conectado diretamente às APIs do Supabase.

`index.html` carrega `styles.css` e depois `styles-v2.css`. A segunda folha se descreve como uma camada adicional que preserva a identidade visual já aprovada. Os arquivos têm conteúdos diferentes; não são cópias idênticas.

## 2. Schemas e dependências

Os arquivos SQL foram lidos integralmente. A sequência descrita pelos comentários dos próprios arquivos, pelo roteiro atualizado e pelo `BACKEND.md` é:

| Ordem | Arquivo | Dependências e efeito principal |
|---|---|---|
| 0 | `schema.sql` | Base: perfis, catálogo, áreas de entrega, cupons, banners, configurações, pedidos, RLS e RPCs iniciais. Pressupõe as estruturas Auth do Supabase. Inclui dados de exemplo. |
| 1 | `schema-patch-01-seguranca.sql` | Exige as tabelas-base. Restringe leitura de cupons/configurações, escrita direta de pedidos e edição de perfil; cria RPCs públicas seguras. |
| 2 | `schema-patch-02-pedidos-catalogo.sql` | Exige a base e `validate_coupon()` do patch 01. Adiciona slugs aos adicionais, permite pedidos de convidados, semeia 24 produtos e substitui `create_order()`. |
| 3 | `schema-patch-03-robustez.sql` | Exige a base e a coluna de slug criada no patch 02. Reescreve `create_order()`, adiciona limites e constraints para banners e índice de pedidos de convidados. |
| 4 | `schema-patch-04-seguranca-lgpd-config.sql` | Exige a base e o slug do patch 02; foi escrito para suceder 01–03. Adiciona configurações operacionais, horários, rate limit, funções de papel administrativo, exclusão/anonimização e a versão mais completa de `create_order()`. |
| 5 | `schema-patch-05-banners-adicionais.sql` | Exige banners e slug do patch 02, além de `business_hours`, `admin_set_role()` e `request_ip_status()` do patch 04. Acrescenta campos e validações de banner. |
| 6 | `schema-patch-06-permissoes.sql` | Exige as RPCs da base, funções do patch 04 e coluna adicionada pelo patch 05. Revisa permissões `EXECUTE` e falha se encontrar permissões fora do esperado. |

**Não executar essa sequência antes de identificar o estado atual do projeto Supabase.** A base e alguns patches fazem `UPSERT` de valores de exemplo: `schema.sql` atualiza configurações, categorias, áreas e cupom de exemplo; o patch 02 atualiza nome, preço, descrição, imagem e outros campos dos 24 produtos com slugs conhecidos. “Idempotente” não significa que uma nova execução preserve alterações comerciais existentes.

Há divergência documental: `ENTREGA_ETAPA_1.md` lista até o patch 05 e não inclui o 06, enquanto `schema.sql`, `BACKEND.md` e `TESTES.md` incluem o patch 06. O roteiro mais recente é a sequência completa acima, mas ela ainda não deve ser aplicada sem diagnóstico do banco.

## 3. Estado do Supabase

`config.js` contém URL e chave publicável do Supabase; `bannersEndpoint` está vazio. O cliente considera a autenticação configurada pela forma da URL e pelo tamanho da chave, o que não comprova que a conexão funciona ou que o projeto remoto está no estado esperado.

Não há dump, fotografia de tabelas, log de migração ou outro registro local que confirme quais schemas foram aplicados. A `ENTREGA_ETAPA_1.md` registra que não houve teste remoto naquela etapa, mas isso é um registro histórico anterior à reconfiguração relatada. Portanto, o estado atual do banco continua **desconhecido**. Nenhum SQL foi executado nesta inspeção.

Antes de qualquer mudança no banco, será necessário obter uma visão somente de leitura do projeto correto e comparar tabelas, colunas, funções, políticas e permissões com os patches. Se essa verificação depender de SQL, o comando deverá ser apresentado para autorização antes da execução.

## 4. Funcionalidades encontradas no inventário inicial

Esta tabela registra o estado encontrado antes das alterações da etapa 2. Veja a seção 9 para o estado posterior.

| Área | Estado observado no código | Limitações e validação pendente |
|---|---|---|
| Loja e catálogo | `app.js` contém 24 produtos locais, busca, categorias, carrosséis, personalização, ponto da carne, adicionais, remoções e observações. Tenta carregar catálogo, preços, áreas e configurações do Supabase; mantém fallback local em caso de erro. | A conexão real não foi testada. Há 15 referências de imagem primária ausentes na pasta local. |
| Carrinho e cupons | Carrinho e checkout ficam no navegador. Cupom usa `validate_coupon()` quando configurado; sem configuração, há um modo demonstrativo. | A cópia tem textos antigos que descrevem sempre um protótipo, embora o caminho configurado chame o backend. |
| Checkout e pedidos | Quatro etapas, opções de entrega/retirada e pagamento; o caminho configurado chama `create_order()` e usa os totais retornados pelo servidor. | No inventário inicial não havia busca por CEP. A etapa 2 adicionou consulta opcional e associação por faixa declarada; o pedido real ainda depende de configuração e validação remota. |
| Conta | `auth-client.js` implementa cadastro, login, saída, sessão persistente, recuperação e redefinição de senha, além de leitura/edição do perfil. `app.js` inclui histórico e “Pedir novamente”. | Sessões ficam em `localStorage`; nenhuma dessas jornadas foi testada nesta fase. |
| Exportação e exclusão | “Minha conta” gera JSON com perfil e pedidos e chama `delete_my_account()`. O SQL mantém ou anonimiza pedidos conforme configuração. | A interface e a RPC ainda precisam de teste integrado; a escolha e o texto da política de retenção não foram confirmados pela loja. |
| Painel | O acesso consulta sessão e papel admin no Supabase. Há código para catálogo, categorias, adicionais, cupons, áreas, banners, configurações, horários, pedidos e alteração de status por RPC. Os pedidos são consultados por polling. | A aba de usuários administrativos e a chamada a `admin_set_role()` já existem no código, ao contrário do que dizem documentos antigos; falta teste com contas reais. A etapa 2 implementou reordenação persistente de produtos. Criação manual de pedidos continua demonstrativa e sem caminho seguro no schema local. |
| Banners | `banners.js` tem fallback local e também lê `public.banners`; o painel edita a tabela. | `bannersEndpoint` vazio não impede a leitura direta do Supabase quando configurado; a conexão não foi testada. |
| Segurança | Os patches centralizam cálculo de preço, taxa e desconto no servidor, RLS e permissões de funções. O frontend não contém chave `service_role`; a chave presente em `config.js` é publicável. | Não há CAPTCHA/Turnstile implementado na tela ou sessão anônima; `captchaSiteKey` está vazio. Se `require_guest_captcha` for ligado, convidados serão recusados. A proteção por IP depende de cabeçalho presente no pedido e não foi confirmada no projeto remoto. |
| Privacidade | Há página de privacidade e funções de exportação/exclusão. O schema base grava `profiles.consent_at` com `default now()`. | A página continua marcada como minuta e tem campos `[[...]]` pendentes, inclusive empresa/contato, retenção, bases legais, prestadores, região do Supabase e política de pedidos. Na etapa 2, a menção sobre `consent_at` foi alinhada ao schema; a revisão legal continua pendente. |

## 5. Catálogo visual — inventário preliminar

Esta é apenas a conferência de arquivos e referências, não a auditoria visual completa da quinta fase.

- `outputs/assets/` contém 20 imagens raster: 10 JPG e 10 PNG, sem duplicatas binárias exatas pelo hash SHA-256.
- `app.js` referencia 24 imagens JPG como imagem primária de produto. 15 desses arquivos não existem nesta cópia.
- O código possui fallbacks. Anéis de cebola, batata com cheddar e bacon e mandioca recorrem à mesma imagem de batata; alguns combos, bebidas e sobremesas também recorrem a imagens de outros itens.
- `schema-patch-02-pedidos-catalogo.sql` atribui `assets/<slug>.jpg` aos 24 produtos. Para os 15 arquivos ausentes, o registro pode apontar para caminhos sem arquivo se esse seed for aplicado.
- `work/generate-assets.mjs` desenha e grava PNGs localmente; ele não é um catálogo de fotografias e cobre apenas parte dos produtos. Não encontrei pasta separada de originais nem registro de origem/licença das imagens JPG existentes.

Ainda não decidi substituições, não baixei nem gerei imagens e não sobrescrevi arquivos. A auditoria individual, verificação de permissões e tabela de substituição ficam para a fase visual separada, conforme solicitado.

## 6. Testes e segurança operacional no inventário inicial

`TESTES.md` contém um roteiro extenso, mas seus itens estão desmarcados. `ENTREGA_ETAPA_1.md` relata verificações `node --check` de etapas anteriores; não foram repetidas nesta fase e não equivalem a teste funcional.

`test_db.py` é um harness para PostgreSQL local, com endereço e banco fixos, que cria usuários e faz operações de teste. `rebuild.sh` contém `dropdb` para esse banco antes de carregar `mock.sql` e os arquivos SQL informados. Não executei nenhum dos dois; `rebuild.sh` é destrutivo para o banco local indicado e não deve ser usado no Supabase.

No inventário inicial havia referências de hospedagem divergentes. A etapa 2 removeu a recomendação específica dos documentos ativos; o host, cabeçalhos e um pacote público restrito a arquivos de frontend ainda precisam ser definidos.

## 7. Plano de execução

1. **Reconstrução técnica na cópia:** preservar a identidade e os componentes atuais; corrigir conteúdo de protótipo que contradiz os caminhos reais; a busca e o preenchimento por CEP e a reordenação de produtos foram adicionados na etapa 2; criação manual de pedidos segue pendente por falta de RPC segura local.
2. **Integração Supabase:** confirmar primeiro o estado atual somente por leitura; comparar configuração, tabelas, RPCs, RLS e permissões com o contrato usado pelo frontend. Preparar diferenças necessárias, sem executar migrações ou alterar o banco.
3. **Testes:** testar fluxos da cópia com dados simulados e marcar separadamente o que for exercitado com o Supabase real. O harness existente precisa de isolamento e não será executado sobre o banco `fz` fixo nem sobre o projeto remoto sem autorização específica.
4. **Auditoria visual separada:** conferir cada produto e composição de combo; selecionar imagens com licença compatível, criar uma pasta nova sem substituir originais, atualizar apenas a cópia de desenvolvimento e entregar a tabela pedida. Itens sem imagem adequada ficam pendentes.
5. **Entrega:** atualizar documentação, listar arquivos alterados e pendências e gerar o ZIP completo da cópia reconstruída. Nada será publicado.

## 8. Pendências confirmadas antes da reconstrução

- Estado atual do banco Supabase e resultado de qualquer reconfiguração recente.
- CEP válido segue coberto somente por teste simulado; no navegador local foi conferido apenas o bloqueio de CEP incompleto, sem consulta ao ViaCEP. A largura responsiva de 390 px não foi confirmada.
- 15 arquivos de imagem primária ausentes e fallbacks que repetem alimentos diferentes.
- Confirmação de origem e licença das imagens existentes e das novas imagens.
- CAPTCHA/Turnstile ou decisão documentada de manter a exigência desativada.
- Campos pendentes da política de privacidade e política de retenção de pedidos.
- Testes funcionais remotos, acesso real ao painel e cenário de pedidos end-to-end.
- Destino de hospedagem e configuração de cabeçalhos, já que `.htaccess` não está na cópia.

## 9. Atualização da etapa 2 — 31/10/2026

Após o inventário, foram feitas alterações somente nesta cópia de desenvolvimento:

- Adicionada busca opcional de CEP no checkout com preenchimento de endereço, bairro, município e UF. A associação de área usa apenas faixas explícitas configuradas; CEP/localidade ficam no campo de endereço existente para evitar mudança de schema.
- Separadas as funções puras de CEP em `cep-utils.js`, com testes simulados para formatação, faixas, limite do endereço, respostas válidas/inválidas, falha de rede e timeout.
- O catálogo e as áreas recebidos como listas vazias do Supabase agora substituem os dados locais antigos; o checkout também evita oferecer entrega sem áreas configuradas após uma resposta remota válida.
- O painel ganhou modo de reordenação com setas, cancelar e salvar `display_order` em atualizações autenticadas por produto. Uma falha durante a gravação pode deixar parte das posições atualizada; a interface avisa e mantém a edição disponível.
- Corrigidos os caminhos da política e do painel administrativo para logotipo, estilos, scripts e retorno à loja. Removidos placeholders visuais com nome/estado de loja fictícios.
- Documentação de backend, testes, segurança e conceito foi alinhada ao código e ao estado conhecido. A lista de testes separa explicitamente simulações, verificações de sintaxe e testes remotos ainda pendentes.
- As checagens atuais passaram: seis arquivos JavaScript sem erro de sintaxe e 30 testes simulados aprovados. Os testes cobrem Auth/sessão, exportação/exclusão, payload do pedido, cadastro/edição de produtos, transições de status, catálogo, CEP e reordenação. Também foi feito smoke HTTP local com configuração vazia (11 recursos HTTP 200) e checagem de caminhos locais em três páginas. Não houve teste visual no navegador nem conexão ao Supabase real; a automação não conseguiu identificar com confiança a URL da janela Chrome.

Não foi executado SQL nem houve leitura bem-sucedida, escrita ou publicação no Supabase. A auditoria visual completa do catálogo continua separada e pendente, assim como os dados da política de privacidade, CAPTCHA/sessão anônima e um fluxo seguro para criação manual de pedidos no painel.

## 10. Atualização da etapa 3 — integração Supabase — 31/10/2026

- A inspeção estática confirmou que o payload do checkout e o retorno esperado de `create_order()` correspondem à versão final descrita no patch 04. As outras chamadas locais de RPC e REST foram mapeadas em `SUPABASE_COMPATIBILIDADE.md`.
- A dependência local é `schema.sql` seguido, nesta ordem, pelos patches 01 a 06. Isso não demonstra o estado aplicado no Supabase.
- A URL e a chave publicável já estão configuradas localmente; a chave não foi copiada para relatórios. A solicitação HTTP GET ao endpoint não obteve resposta HTTP por falha de rede. Não há confirmação remota de tabelas, funções, RLS, permissões ou dados.
- Nenhum SQL foi executado e nenhuma alteração foi feita no Supabase. Os schemas incluem carga/atualização de conteúdo comercial; reaplicá-los para descobrir o estado não é seguro.
- A etapa 3 fica preparada no plano local, mas a compatibilidade remota permanece pendente até uma fonte de metadados somente de leitura estar disponível.

## 11. Atualização da etapa 4 — testes — 31/10/2026

- A suíte simulada foi ampliada com oito casos para categorias, adicionais, cupons, áreas de entrega, banners e configurações de pagamento. Resultado atualizado: **38 aprovados, 0 falhas**.
- `node --check` passou nos seis arquivos JavaScript da pasta `outputs/`.
- O servidor de desenvolvimento respondeu HTTP 200 em 11 recursos, com `config.js` substituído por configuração vazia. A loja pública foi aberta no navegador local e os fluxos de busca, filtro, personalização de combo, carrinho, cupom, entrega, retirada, checkout demonstrativo, avanço de etapa e tema foram exercitados.
- Dois pedidos inteiramente fictícios foram confirmados como demonstrativos (retirada e entrega). Não foram enviados a nenhum banco. O CEP incompleto exibiu validação local; nenhuma consulta válida foi feita ao ViaCEP.
- O gate do painel impediu acesso sem Auth configurado. Os fluxos de Auth, conta e funções administrativas foram verificados por mocks; Supabase real continua sem teste.
- A política de privacidade abre, mas continua como minuta com marcadores pendentes.
- A inspeção visual no catálogo mostrou imagens quebradas para os quatro combos e `batata-brasa.jpg` como fallback de **Mandioca Frita**. A auditoria de cada produto, composições, licenças e substituições permanece na etapa 5.
- O navegador manteve largura de aproximadamente 666 px mesmo após solicitar override de 390 px. O menu compacto e a barra de carrinho apareceram sem overflow nessa largura; uma conferência em 390 px reais ainda está pendente.

Consulte `TESTES.md` para o escopo executado e as limitações detalhadas. Nenhum SQL foi executado; não houve consulta ou gravação bem-sucedida no Supabase, nem publicação.
