# Conceito Visual — Fornalha 147

**Marca:** Fornalha 147. O nome conecta brasa, preparo artesanal e o endereço da operação, mas permite evolução para restaurante, cozinha ou grupo gastronômico.

**Direção visual:** hamburgueria artesanal premium com atmosfera noturna, fundo em preto quente e grafite, marrom profundo, destaque obrigatório em laranja-brasa `#F26B21`, âmbar para chamadas comerciais e contraste claro para leitura em celular.

**Tipografia:** `Barlow Condensed` (títulos e preços, caixa alta, peso 800) e `DM Sans` (interface), carregadas do Google Fonts com fontes de sistema como reserva. Para operar sem dependência externa, baixe as duas famílias para `assets/fonts/` e troque o `<link>` por `@font-face`.

**Experiência entregue:**
- Site público do cliente com hero, categorias, promoções, cardápio e dúvidas frequentes.
- Cardápio com abas de categoria; cada categoria é um carrossel horizontal com setas e deslize no celular. Busca em todo o cardápio.
- Hero com hambúrguer integrado ao fundo por máscaras e brilho de brasa; permanece escuro também no tema claro.
- **Banners (hero e promoções)** alimentados por `public.banners` quando Supabase está configurado, com `banners.js` como fallback visual. O painel administrativo já edita banners reais via Supabase.
- **Personalização do produto** em grupos: Ponto da carne (obrigatório nos hambúrgueres de blend e combos), Retirar ingredientes (sem custo), Adicionais (com custo), Observação e resumo da escolha, com rodapé de compra sempre visível. O carrinho separa itens iguais com personalizações diferentes e permite editar cada linha.
- **Ponto da carne:** Malpassada, Ao ponto para mal, Ao ponto, Ao ponto para bem, Bem-passada. Nunca vem pré-marcado; `HOUSE_DONENESS` em `app.js` identifica um padrão da casa quando existir. Não aparece em bebidas, sobremesas, acompanhamentos, Smash Duplo nem Frango.
- **Conta de cliente integrada ao Supabase no código:** cadastro, login, sair, recuperar senha, edição de nome/WhatsApp, histórico, exportação e exclusão. A configuração publicável já existe nesta cópia, mas a conexão e os fluxos remotos ainda precisam ser testados; sem configuração válida, a loja avisa e continua permitindo pedir sem conta.
- Carrinho lateral (bottom sheet no celular), cupom, taxa por bairro e checkout em quatro etapas. Com Supabase configurado, o pedido é gravado pela RPC `create_order`; sem configuração, o fluxo permanece demonstrativo.
- Checkout com consulta opcional de CEP e preenchimento de endereço pelo ViaCEP; área de entrega só é pré-selecionada quando uma faixa de CEP está cadastrada e corresponde.
- Painel administrativo protegido pelo papel de admin, com gerenciamento de pedidos, catálogo, adicionais, cupons, áreas, banners, operação e admins; reordenação de produtos persistida no banco.
- Responsivo de 320 px a telas largas.

**Ainda fora do escopo:** pagamento online, despacho/roteirização automatizados e criação manual de pedidos no painel. A gestão de administradores e as ações de conta têm interface no código, mas aguardam validação integrada.
