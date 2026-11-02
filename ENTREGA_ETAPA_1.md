# Registro de entrega — etapa 1 e atualização da etapa 2

Data do registro original: 12/10/2026  
Atualização de desenvolvimento: 31/10/2026

> Este documento contém o histórico da etapa 1. As instruções antigas para criar um projeto, configurar credenciais ou executar SQL foram substituídas: o Supabase foi reconfigurado pelo responsável, mas o estado remoto atual continua desconhecido. Nenhum SQL foi executado nesta continuação. Consulte INVENTARIO_DIAGNOSTICO.md, BACKEND.md e TESTES.md para o estado atual.

## Registro histórico da etapa 1

A etapa original registrou pré-checagens de dependência nos patches 01 a 05, alterações de documentação e a interface de exportação/exclusão da conta. As verificações de sintaxe e os testes listados naquela entrega são registros históricos e não comprovam o estado atual do banco.

Na revisão atual, os arquivos SQL locais incluem também schema-patch-06-permissoes.sql. A ordem documentada para comparação futura é schema.sql seguido dos patches 01 a 06. Essa ordem descreve dependências; não é autorização para execução.

## Trabalho da etapa 2 nesta cópia

- Adicionada consulta opcional de CEP no checkout com preenchimento do endereço e associação por faixa explícita cadastrada.
- Extraídos os utilitários de CEP para cep-utils.js.
- Respostas remotas vazias de catálogo, categorias e áreas de entrega agora substituem os fallbacks locais, evitando mostrar itens ou taxas antigos.
- Implementado modo de reordenação de produtos no painel, com cancelar e salvar display_order por atualizações autenticadas.
- Corrigidos os caminhos da política de privacidade e do painel para estilos, logotipos, scripts e retorno à loja; removidos placeholders de nome/estado da loja no painel.
- Corrigido o texto de acesso administrativo para não instruir a execução de SQL.
- Alinhados BACKEND.md, TESTES.md, SEGURANCA.md e CONCEITO.md ao estado conhecido.
- A política continua sendo minuta. Foram removidos o provedor de hospedagem não confirmado e a dúvida resolvida pelo campo consent_at; os demais dados e decisões legais ainda precisam de revisão da loja.

## Verificações atuais

- Seis arquivos JavaScript passaram node --check.
- 30 testes simulados passaram com 0 falhas. Cobrem Auth/sessão, exportação/exclusão, produto, payload do pedido, transições de estado, catálogo, CEP e reordenação.
- Um servidor HTTP local com a configuração Supabase desativada serviu 11 recursos com HTTP 200.
- Os caminhos locais de links e recursos em loja, política e painel foram conferidos.
- Não houve teste visual da página, consulta ao ViaCEP nesta etapa, chamada ao Supabase real, gravação em banco ou publicação.
- test_db.py e rebuild.sh não foram executados; rebuild.sh apaga o banco local fixo fz.

## Pendências

- Confirmar por leitura o projeto Supabase correto e comparar tabelas, funções, RLS e permissões com o contrato do frontend.
- Testar no navegador os fluxos públicos e administrativos; o teste visual continua pendente.
- Testar Auth, perfil, pedidos, cupons, banners, áreas e permissões no Supabase real, depois da leitura e com dados de teste autorizados.
- Projetar um caminho seguro para criação manual de pedidos; o formulário antigo era demonstrativo e não há RPC correspondente nos schemas locais.
- Implementar CAPTCHA/sessão anônima antes de ligar require_guest_captcha.
- Finalizar os campos da política de privacidade com informações fornecidas pela loja e revisão jurídica.
- Definir hospedagem e pacote de publicação com allowlist; não publicar a pasta outputs inteira, pois inclui schemas, documentação e harness de banco.
- Executar a auditoria visual completa do catálogo em etapa separada, com fontes/licenças registradas.
- Ao final, gerar o ZIP completo da cópia reconstruída, atualizado com os resultados e pendências reais.
