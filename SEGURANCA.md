# Segurança e privacidade — Fornalha 147

Atualizado em 31/10/2026. Esta revisão cobre o código local e os testes simulados descritos em TESTES.md. Não houve auditoria do projeto Supabase remoto nem da hospedagem.

## Controles existentes no código

- O frontend usa apenas a chave publicável que já está em config.js. Não encontrei uso de service_role no frontend. Nunca copie uma chave de serviço para HTML, JavaScript ou CSS.
- O cliente chama o Supabase com Auth, PostgREST e RPCs. RLS, grants e validação do servidor são essenciais: o cliente sozinho não protege dados.
- A RPC create_order() recalcula preço, taxa, cupom e itens no servidor. O painel usa update_order_status() para transições de pedido e admin_set_role() para gestão de acesso.
- Textos dinâmicos da loja e do painel passam por escape ou textContent. Imagens e links do painel têm validação local.
- Exportação e exclusão de conta têm interface; a exportação gera um arquivo JSON no navegador e a exclusão chama a RPC delete_my_account().
- O checkout consulta o ViaCEP somente após a pessoa pedir a busca. O CEP informado é enviado ao ViaCEP para obter logradouro, bairro e município; não enviamos nome, telefone ou outros campos nessa consulta.
- Nenhum teste desta etapa enviou dados ao ViaCEP ou ao Supabase real.

## Riscos e limites ainda abertos

| Tema | Estado atual | Próxima verificação |
|---|---|---|
| Estado remoto | Não foi inspecionado; tabelas, RPCs, políticas e permissões podem diferir dos arquivos locais. | Confirmar projeto e estado apenas por leitura antes de planejar qualquer migração. |
| CAPTCHA para convidado | A interface não implementa CAPTCHA nem sessão anônima. | Não ativar require_guest_captcha até implementar e testar o fluxo completo. |
| Sessão no navegador | Tokens são guardados em localStorage pelo cliente estático. Um XSS poderia expor a sessão. | Manter escaping, revisar qualquer novo HTML dinâmico e configurar CSP no host escolhido. |
| Política de privacidade | A página ainda tem marcadores [[...]] e precisa de dados, prazos e prestadores confirmados pela loja. | Preencher com informações verdadeiras e revisar antes da publicação. |
| Retenção de pedidos | Exclusão/anonimização depende da configuração do banco e da política comercial/legal da loja. | Definir retenção antes de afirmar o que será apagado ou mantido. |
| Senha e e-mail | Mínimo de senha, confirmação, URLs de retorno e SMTP são configurações do Supabase não verificadas. | Testar no projeto correto sem alterar configurações nesta etapa. |
| Proteção por IP | Os patches usam cabeçalhos do Supabase/Cloudflare em regras de limite, ainda sem validação ponta a ponta. | Conferir apenas após confirmar o estado remoto. |
| Hospedagem | Não há .htaccess nesta cópia e o host final não foi decidido. | Definir host e validar HTTPS, CSP e demais cabeçalhos no ambiente real. |
| Pacote público | outputs também contém schemas, documentação, mock.sql e test_db.py com configuração de banco local. Não existe ainda uma lista de arquivos públicos para deploy. | Preparar uma pasta de publicação com apenas os arquivos necessários à loja e testar que SQL, documentação e harness não são servidos. |
| Pedido manual no painel | O código antigo era demonstrativo; os schemas locais não trazem RPC específica para criar um pedido em nome de um cliente convidado. | Projetar e autorizar um fluxo seguro antes de habilitar a função. |

## Schemas e execução

O estado do Supabase é desconhecido. Nenhum schema ou patch SQL foi executado. Os arquivos locais podem conter UPSERTs que sobrescrevem dados de exemplo; não os aplique como teste. Qualquer mudança remota depende de autorização e de uma comparação prévia com o projeto certo.

## Credenciais locais de teste

O arquivo test_db.py contém configuração fixa para o banco de desenvolvimento local. Não use essas credenciais no Supabase nem as inclua em arquivos públicos. O script não foi executado; rebuild.sh pode apagar o banco local fz.

## Evidência e próximos passos

Os 30 testes simulados aprovados cobrem Auth/sessão, ações de conta, payload do pedido sem preços do cliente, produtos, transições de status, CEP, catálogo e reordenação do painel. Eles não provam a segurança ou o funcionamento das políticas reais. Também passaram as checagens de sintaxe de seis arquivos JavaScript. Consulte TESTES.md para resultados e pendências.

Antes de qualquer publicação, ainda será necessário validar o Supabase real, concluir a política de privacidade, testar o comportamento do Auth e do painel e decidir hospedagem e cabeçalhos. Nenhum desses passos foi declarado concluído nesta etapa.
