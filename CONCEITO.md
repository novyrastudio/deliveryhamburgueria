# Conceito Visual — Fornalha 147

**Marca:** Fornalha 147. O nome conecta brasa, preparo artesanal e o endereço da operação, mas permite evolução para restaurante, cozinha ou grupo gastronômico.

**Direção visual:** hamburgueria artesanal premium com atmosfera noturna, fundo em preto quente e grafite, marrom profundo, destaque obrigatório em laranja-brasa `#F26B21`, âmbar para chamadas comerciais e contraste claro para leitura em celular.

**Tipografia:** `Barlow Condensed` (títulos e preços, caixa alta, peso 800) e `DM Sans` (interface), carregadas do Google Fonts com fontes de sistema como reserva. Para operar sem dependência externa, baixe as duas famílias para `assets/fonts/` e troque o `<link>` por `@font-face`.

**Experiência entregue:**
- Site público do cliente com hero, categorias, promoções, cardápio e dúvidas frequentes.
- Cardápio com abas de categoria; cada categoria é um carrossel horizontal com setas e deslize no celular. Busca em todo o cardápio.
- Hero com hambúrguer integrado ao fundo por máscaras e brilho de brasa; permanece escuro também no tema claro.
- **Banners (hero e promoções)** alimentados por uma única lista de dados (`banners.js`): imagem, título, texto, botão/destino, ativo e ordem. O visitante não edita nada; o design atual foi mantido. O painel administrativo ainda NÃO existe; `config.js` (`bannersEndpoint`) reserva o ponto de conexão.
- **Personalização do produto** em grupos: Ponto da carne (obrigatório nos hambúrgueres de blend e combos), Retirar ingredientes (sem custo), Adicionais (com custo), Observação e resumo da escolha, com rodapé de compra sempre visível. O carrinho separa itens iguais com personalizações diferentes e permite editar cada linha.
- **Ponto da carne:** Malpassada, Ao ponto para mal, Ao ponto, Ao ponto para bem, Bem-passada. Nunca vem pré-marcado; `HOUSE_DONENESS` em `app.js` identifica um padrão da casa quando existir. Não aparece em bebidas, sobremesas, acompanhamentos, Smash Duplo nem Frango.
- **Conta de cliente real** (Supabase): cadastro, login, sair, recuperar senha, edição de nome/WhatsApp. Só funciona depois de configurar o serviço (ver `BACKEND.md`); enquanto isso o site avisa e continua permitindo pedir sem conta.
- Carrinho lateral (bottom sheet no celular), cupom, taxa por bairro e checkout simulado em quatro etapas; o pedido já é montado no formato futuro (`buildOrderPayload`), com cliente e ponto da carne.
- Responsivo de 320 px a telas largas.

**Fora desta etapa:** painel administrativo, gravação real de pedidos, envio à cozinha, pagamento online.
