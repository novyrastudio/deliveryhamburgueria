# Testes — Fornalha 147

Atualizado em 31/10/2026. Os resultados simulados abaixo não substituem testes no navegador nem no projeto Supabase real.

## Resultados executados

| Tipo | Resultado | Escopo |
|---|---:|---|
| JavaScript — `node --check` | 6 arquivos aprovados | `app.js`, `admin/admin.js`, `auth-client.js`, `banners.js`, `cep-utils.js` e `config.js` |
| Testes simulados — `node --test outputs/tests/*.test.cjs` | 38 aprovados, 0 falhas | Auth/sessão, conta, pedidos, catálogo, CEP, produtos, categorias, adicionais, cupons, entrega, banners, configurações de pagamento e reordenação/status do painel |
| HTTP local com Supabase desativado | 11/11 recursos responderam HTTP 200 | Loja, configuração vazia injetada no servidor de teste, scripts, estilos, política e painel |
| Teste manual no navegador local | Fluxos públicos principais executados | Busca e filtro, personalização, carrinho, cupom, entrega, retirada, checkout demonstrativo, validação de CEP incompleto e tema; detalhes abaixo |
| Painel local | Gate de segurança exibido | Com configuração vazia, o painel bloqueia o acesso porque não pode validar sessão e papel administrativo |
| Política local | Página abriu e conteúdo foi conferido | A minuta ainda tem marcadores e decisões pendentes; não está pronta para publicação |
| Supabase real | Não executado | Nenhuma consulta, autenticação, RPC ou gravação foi feita no projeto remoto |
| ViaCEP real | Não executado | Foram usados testes simulados e a validação local de CEP incompleto; nenhum CEP foi enviado ao serviço |

Os testes simulados interceptam as chamadas de rede e usam respostas artificiais. Eles não usam credenciais reais, não enviam CEP ao ViaCEP, não gravam em banco e não demonstram que o projeto Supabase atual tem os schemas esperados.

## Etapa 4 — testes funcionais na cópia — 31/10/2026

### Testes simulados

Foram executados novamente 38 testes, todos aprovados. Além das 30 verificações anteriores, `tests/admin-catalog-config.test.cjs` cobre gravação simulada de categorias, grupos/opções de adicionais, cupons, áreas de entrega, banners e formas de pagamento, incluindo rejeição de código de cupom inválido e de destino `javascript:` em banner. As chamadas de banco são mocks; nenhum dado real foi gravado.

### Navegador local

A loja foi servida em `localhost` com `config.js` substituído por configuração vazia. Foram conferidos:

- carregamento da loja e navegação por categoria;
- busca com resultado e sem resultado;
- personalização de combo com ponto da carne obrigatório e inclusão no carrinho;
- cálculo de cupom local `BRASA15`, subtotal, desconto e total;
- retirada grátis e entrega para Jardins com taxa demonstrativa;
- validação de nome/WhatsApp obrigatórios, resumo e confirmação de dois pedidos demonstrativos (um de retirada e um de entrega), sem chamada ao Supabase;
- avanço de uma etapa simulada do pedido, busca de CEP incompleto sem consulta externa e alternância de tema;
- gate de acesso administrativo quando a autenticação está indisponível;
- carregamento da política de privacidade e presença dos marcadores que ainda precisam de confirmação.

Não houve erro ou aviso no console durante esses fluxos. O override de viewport solicitado para 390 px não foi refletido pelo navegador; o viewport medido ficou em aproximadamente 666 px. A barra de carrinho e o menu compacto apareceram sem rolagem horizontal nesse tamanho, mas o breakpoint exato de 390 px permanece sem confirmação.

### Defeitos visuais encontrados e encaminhados à etapa 5

- As imagens locais dos quatro combos não carregam: `combo-fornalha.jpg`, `combo-costela.jpg`, `combo-classico.jpg` e `combo-dupla.jpg`.
- No cartão de **Mandioca Frita**, a loja usa `batata-brasa.jpg` como fallback, imagem que não representa o produto anunciado.
- A conferência foi apenas do que carregou/ficou visível nos fluxos testados. A tabela produto a produto, a composição de cada combo e a escolha/licença das novas imagens continuam para a auditoria visual da etapa 5.

### Limites do que foi testado

- Cadastro, login/sessão, recuperação e redefinição, logout, edição/exportação/exclusão de conta e demais funções de painel foram exercitados por testes simulados, não contra Auth/RPC/RLS do Supabase.
- A interface de conta mostra o bloqueio esperado quando não há configuração Supabase. O painel administrativo também bloqueia o conteúdo sem uma sessão validada.
- A consulta válida de CEP foi testada somente com respostas simuladas. Nenhum CEP ou endereço foi enviado ao ViaCEP.
- Nenhuma operação, pedido ou teste de segurança foi realizado no Supabase real; o estado remoto permanece desconhecido conforme `SUPABASE_COMPATIBILIDADE.md`.

## Executar os testes locais

Na pasta de trabalho, execute:

    node --test outputs/tests/*.test.cjs

Para repetir a checagem de sintaxe:

    node --check outputs/app.js
    node --check outputs/admin/admin.js
    node --check outputs/auth-client.js
    node --check outputs/banners.js
    node --check outputs/cep-utils.js
    node --check outputs/config.js

Os testes estão em outputs/tests/. Eles exercitam funções do código e contratos simulados; não substituem o fluxo completo na interface.

## Não executado por segurança

- outputs/test_db.py: conecta a um banco PostgreSQL local fixo e faz operações de escrita.
- outputs/rebuild.sh: apaga e recria o banco local fixo fz.
- schema.sql e patches 01–06: nenhum arquivo SQL foi executado, localmente ou no Supabase.
- Pedidos, alterações de estado, promoções administrativas, exclusão de conta e edição do catálogo não foram submetidos ao Supabase real.

O Supabase foi reconfigurado, mas seu estado ainda não foi inspecionado. Não use a lista abaixo como autorização para executar SQL. Para testes remotos, primeiro será necessário confirmar o projeto correto e o estado atual por leitura, sem aplicar migrações.

## Próximos testes simulados e de interface

- [x] Abrir a cópia local com configuração Supabase desativada e conferir busca, categorias, carrinho, modais, tema e layout no viewport disponível.
- [x] Conferir checkout de entrega e retirada até a confirmação demonstrativa, sem envio ao backend.
- [x] Conferir por UI o bloqueio de CEP incompleto; validação de faixas, CEPs inexistentes, falha e timeout está nos testes simulados.
- [ ] Repetir a inspeção em viewport real de 390 px; a automação manteve 666 px mesmo após o override.
- [ ] Conferir no painel, em UI com backend simulado, modo de reordenação, cancelar, salvar e atualização da loja após recarregar. Os contratos de reordenação e gravação já têm testes simulados.
- [ ] Exercitar cadastro, login, logout, recuperação de senha e conta em UI conectada a um backend simulado. As chamadas Auth correspondentes estão cobertas por mocks de unidade; a tela local exibe o gate quando a configuração está vazia.

## Testes que dependem do Supabase real

- [ ] Confirmar que a chave configurada é somente publicável e que a URL aponta para o projeto pretendido.
- [ ] Verificar por leitura a presença e compatibilidade de tabelas, colunas, RPCs, RLS e permissões; não aplicar schemas sem autorização.
- [ ] Testar Auth: cadastro, confirmação de e-mail, login, sessão após recarga, recuperação e redefinição de senha.
- [ ] Testar conta: alteração de perfil, exportação JSON, exclusão e comportamento de retenção dos pedidos.
- [ ] Testar catálogo e painel: produtos/categorias/adicionais, disponibilidade, cupons, áreas e taxas, banners, configurações e horários.
- [ ] Testar pedido completo com valores de teste, convidado/conta, entrega/retirada, cupom, adicionais, remoções e ponto da carne.
- [ ] Testar painel: leitura dos pedidos, estados permitidos/negados, motivo de recusa, acesso de cliente e gestão de admins.
- [ ] Registrar separadamente qualquer chamada feita ao ViaCEP e qualquer escrita autorizada no banco.

## Pendências operacionais

- CAPTCHA/sessão anônima não está implementado. Não ligar require_guest_captcha antes de implementar e testar esse fluxo.
- A política de privacidade mantém marcadores que dependem de dados e decisões da loja.
- O formulário de criação manual de pedido continua sem fluxo seguro suportado pelos schemas locais.
- A hospedagem final e os cabeçalhos de segurança ainda precisam ser confirmados.
