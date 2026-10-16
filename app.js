"use strict";

/* =========================================================
   Dados do cardápio e regras de negócio
   ========================================================= */

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const deliveryFees = {
  Centro: 6.9,
  Jardins: 8.9,
  "Vila Nova": 5.9,
};

const COUPONS = { BRASA15: 0.15 }; // usado só quando o Supabase não está configurado

function localCouponInfo(code) {
  return COUPONS[code]
    ? { type: "percent", percentOff: Math.round(COUPONS[code] * 100), valueCents: 0, minOrderCents: 0, freeDelivery: false }
    : null;
}

const deliveryMin = {}; // pedido mínimo por bairro (centavos), preenchido pelo banco
let storePaused = false;

const menuOrder = [
  { id: "combos", title: "Combos", category: "combos", hint: "pedido rápido" },
  { id: "hamburgueres", title: "Hambúrgueres", category: "burgers", hint: "artesanais" },
  { id: "acompanhamentos", title: "Acompanhamentos", category: "acompanhamentos", hint: "para dividir" },
  { id: "bebidas", title: "Bebidas", category: "bebidas", hint: "geladas" },
  { id: "sobremesas", title: "Sobremesas", category: "sobremesas", hint: "final doce" },
];

const addons = [
  { id: "cheddar", name: "Cheddar cremoso", price: 4.9 },
  { id: "bacon", name: "Bacon extra", price: 6.9 },
  { id: "cebola", name: "Cebola caramelizada", price: 3.9 },
  { id: "molho", name: "Molho da casa", price: 2.9 },
  { id: "smash", name: "Smash extra", price: 9.9 },
];

/*
  Ponto da carne. Só aparece em produtos com `doneness: true` (hambúrgueres de blend e combos
  que levam um deles). O `id` é o valor que seguirá no pedido real; `label` é o texto exibido.

  A hamburgueria ainda não definiu um ponto padrão. Quando definir, informe o `id` abaixo
  (ex.: "ao-ponto"): a opção ganha a etiqueta "Padrão da casa", mas continua sem vir marcada,
  porque a escolha precisa ser do cliente.
*/
const HOUSE_DONENESS = null;

const DONENESS_LEVELS = [
  { id: "malpassada", label: "Malpassada", hint: "Centro vermelho e macio" },
  { id: "ao-ponto-para-mal", label: "Ao ponto para mal", hint: "Centro rosado intenso" },
  { id: "ao-ponto", label: "Ao ponto", hint: "Centro rosado e suculento" },
  { id: "ao-ponto-para-bem", label: "Ao ponto para bem", hint: "Pouco rosado no centro" },
  { id: "bem-passada", label: "Bem-passada", hint: "Sem rosa, bem firme" },
];

/*
  Cada produto tem `image` (foto própria) e `fallback` (foto existente usada
  apenas enquanto o arquivo próprio ainda não estiver na pasta assets/).
*/
const products = [
  /* ---------- Combos ---------- */
  {
    id: "combo-fornalha",
    category: "combos",
    categoryLabel: "Combos",
    name: "Combo Fornalha",
    price: 58.9,
    image: "assets/combo-fornalha.jpg",
    desc: "Burger Brasa Bacon, meia Batata Brasa e bebida gelada.",
    ingredients: ["burger", "batata", "bebida"],
    customizable: true,
    doneness: true,
    tags: ["combo", "economia"],
  },
  {
    id: "combo-costela",
    category: "combos",
    categoryLabel: "Combos",
    name: "Combo Costela",
    price: 64.9,
    image: "assets/combo-costela.jpg",
    fallback: "assets/burger-costela.jpg",
    desc: "Burger de Costela alto, batata rústica média e refri artesanal gelado.",
    ingredients: ["burger de costela", "batata", "bebida"],
    customizable: true,
    doneness: true,
    tags: ["combo", "premium"],
  },
  {
    id: "combo-classico",
    category: "combos",
    categoryLabel: "Combos",
    name: "Combo Clássico",
    price: 49.9,
    image: "assets/combo-classico.jpg",
    fallback: "assets/x-bacon-brasa.jpg",
    desc: "X-Bacon da Brasa com meia porção de batata e uma bebida à escolha.",
    ingredients: ["x-bacon", "batata", "bebida"],
    customizable: true,
    doneness: true,
    tags: ["combo", "clássico"],
  },
  {
    id: "combo-dupla",
    category: "combos",
    categoryLabel: "Combos",
    name: "Combo Dupla Brasa",
    price: 119.9,
    image: "assets/combo-dupla.jpg",
    fallback: "assets/brasa-bacon.jpg",
    desc: "Dois Brasa Bacon, Batata Brasa grande para dividir e duas bebidas.",
    ingredients: ["2 burgers", "batata grande", "2 bebidas"],
    customizable: true,
    doneness: true,
    donenessNote: "O ponto escolhido vale para os dois hambúrgueres. Para pontos diferentes, peça em itens separados.",
    tags: ["para compartilhar"],
  },

  /* ---------- Hambúrgueres ---------- */
  {
    id: "brasa-bacon",
    category: "burgers",
    categoryLabel: "Hambúrgueres",
    name: "Brasa Bacon",
    price: 38.9,
    image: "assets/brasa-bacon.jpg",
    desc: "Blend 160g, cheddar, bacon tostado, molho de brasa e pão selado.",
    ingredients: ["pão brioche", "blend 160g", "cheddar", "bacon", "molho de brasa"],
    customizable: true,
    doneness: true,
    tags: ["mais pedido", "defumado"],
  },
  {
    id: "burger-costela",
    category: "burgers",
    categoryLabel: "Hambúrgueres",
    name: "Burger de Costela",
    price: 42.9,
    image: "assets/burger-costela.jpg",
    desc: "Burger alto, queijo âmbar, cebola na chapa e barbecue da casa.",
    ingredients: ["pão brioche", "burger alto", "costela", "queijo âmbar", "cebola", "barbecue"],
    customizable: true,
    doneness: true,
    tags: ["premium", "intenso"],
  },
  {
    id: "x-bacon-brasa",
    category: "burgers",
    categoryLabel: "Hambúrgueres",
    name: "X-Bacon da Brasa",
    price: 32.9,
    image: "assets/x-bacon-brasa.jpg",
    desc: "Clássico da chapa com queijo, bacon crocante e molho levemente picante.",
    ingredients: ["pão", "burger 130g", "queijo", "bacon", "maionese da casa"],
    customizable: true,
    doneness: true,
    tags: ["clássico"],
  },
  {
    id: "brasa-salad",
    category: "burgers",
    categoryLabel: "Hambúrgueres",
    name: "Brasa Salad",
    price: 31.9,
    image: "assets/brasa-salad.jpg",
    desc: "Burger artesanal com salada fresca, cebola roxa, picles e molho leve.",
    ingredients: ["pão", "burger 130g", "alface", "tomate", "cebola roxa", "picles"],
    customizable: true,
    doneness: true,
    tags: ["leve", "fresco"],
  },
  {
    id: "smash-duplo",
    category: "burgers",
    categoryLabel: "Hambúrgueres",
    name: "Smash Duplo",
    price: 36.9,
    image: "assets/smash-duplo.jpg",
    fallback: "assets/x-bacon-brasa.jpg",
    desc: "Dois smashes de 80g com borda crocante, queijo derretido e picles.",
    ingredients: ["pão macio", "2 smashes 80g", "queijo prato", "picles", "molho da casa"],
    customizable: true,
    tags: ["crocante", "queijo"],
  },
  {
    id: "cheddar-melt",
    category: "burgers",
    categoryLabel: "Hambúrgueres",
    name: "Cheddar Melt",
    price: 37.9,
    image: "assets/cheddar-melt.jpg",
    fallback: "assets/brasa-bacon.jpg",
    desc: "Blend 160g coberto de cheddar cremoso e cebola caramelizada na chapa.",
    ingredients: ["pão brioche", "blend 160g", "cheddar cremoso", "cebola caramelizada"],
    customizable: true,
    doneness: true,
    tags: ["cremoso"],
  },
  {
    id: "frango-crocante",
    category: "burgers",
    categoryLabel: "Hambúrgueres",
    name: "Frango Crocante",
    price: 33.9,
    image: "assets/frango-crocante.jpg",
    fallback: "assets/brasa-salad.jpg",
    desc: "Filé de frango empanado, alface, tomate e maionese defumada.",
    ingredients: ["pão", "filé de frango", "alface", "tomate", "maionese defumada"],
    customizable: true,
    tags: ["frango"],
  },
  {
    id: "hamburguer-tradicional",
    category: "burgers",
    categoryLabel: "Hambúrgueres",
    name: "Hambúrguer Tradicional",
    price: 27.9,
    image: "assets/hamburguer-tradicional.jpg",
    fallback: "assets/x-bacon-brasa.jpg",
    desc: "Blend 130g na chapa, queijo, alface e tomate. Simples e bem feito.",
    ingredients: ["pão", "burger 130g", "queijo", "alface", "tomate"],
    customizable: true,
    doneness: true,
    tags: ["tradicional"],
  },

  /* ---------- Acompanhamentos ---------- */
  {
    id: "batata-brasa",
    category: "acompanhamentos",
    categoryLabel: "Acompanhamentos",
    name: "Batata Brasa",
    price: 24.9,
    image: "assets/batata-brasa.jpg",
    desc: "Batata rústica crocante com páprica defumada e molho especial.",
    ingredients: ["batata rústica", "páprica", "sal de ervas", "molho especial"],
    customizable: true,
    tags: ["para dividir"],
  },
  {
    id: "aneis-cebola",
    category: "acompanhamentos",
    categoryLabel: "Acompanhamentos",
    name: "Anéis de Cebola",
    price: 21.9,
    image: "assets/aneis-cebola.jpg",
    fallback: "assets/batata-brasa.jpg",
    desc: "Anéis empanados e sequinhos, servidos com maionese de ervas.",
    ingredients: ["cebola empanada", "maionese de ervas"],
    customizable: true,
    tags: ["crocante"],
  },
  {
    id: "batata-cheddar-bacon",
    category: "acompanhamentos",
    categoryLabel: "Acompanhamentos",
    name: "Batata Cheddar & Bacon",
    price: 29.9,
    image: "assets/batata-cheddar-bacon.jpg",
    fallback: "assets/batata-brasa.jpg",
    desc: "Batata frita coberta com cheddar cremoso e farofa de bacon.",
    ingredients: ["batata frita", "cheddar cremoso", "farofa de bacon"],
    customizable: true,
    tags: ["cremosa"],
  },
  {
    id: "mandioca-frita",
    category: "acompanhamentos",
    categoryLabel: "Acompanhamentos",
    name: "Mandioca Frita",
    price: 22.9,
    image: "assets/mandioca-frita.jpg",
    fallback: "assets/batata-brasa.jpg",
    desc: "Palitos de mandioca macios por dentro, dourados por fora, com sal de ervas.",
    ingredients: ["mandioca", "sal de ervas", "molho verde"],
    customizable: true,
    tags: ["caseira"],
  },

  /* ---------- Bebidas ---------- */
  {
    id: "refri-artesanal",
    category: "bebidas",
    categoryLabel: "Bebidas",
    name: "Refri Artesanal",
    price: 12.9,
    image: "assets/refri-artesanal.jpg",
    desc: "Bebida gaseificada gelada com toque cítrico e especiarias suaves.",
    ingredients: [],
    customizable: false,
    tags: ["gelado"],
  },
  {
    id: "refrigerante-lata",
    category: "bebidas",
    categoryLabel: "Bebidas",
    name: "Refrigerante Lata",
    price: 7.9,
    image: "assets/refrigerante-lata.jpg",
    fallback: "assets/refri-artesanal.jpg",
    desc: "Lata de 350 ml bem gelada. Pergunte pelos sabores disponíveis na observação.",
    ingredients: [],
    customizable: false,
    tags: ["350 ml"],
  },
  {
    id: "suco-laranja",
    category: "bebidas",
    categoryLabel: "Bebidas",
    name: "Suco de Laranja",
    price: 11.9,
    image: "assets/suco-laranja.jpg",
    fallback: "assets/refri-artesanal.jpg",
    desc: "Suco de laranja espremido na hora, sem adição de açúcar. Copo de 400 ml.",
    ingredients: [],
    customizable: false,
    tags: ["natural"],
  },
  {
    id: "milkshake-chocolate",
    category: "bebidas",
    categoryLabel: "Bebidas",
    name: "Milkshake de Chocolate",
    price: 21.9,
    image: "assets/milkshake-chocolate.jpg",
    fallback: "assets/refri-artesanal.jpg",
    desc: "Sorvete cremoso batido com calda de chocolate e finalização de chantilly.",
    ingredients: [],
    customizable: false,
    tags: ["cremoso"],
  },

  /* ---------- Sobremesas ---------- */
  {
    id: "brownie-brasa",
    category: "sobremesas",
    categoryLabel: "Sobremesas",
    name: "Brownie da Brasa",
    price: 18.9,
    image: "assets/brownie-brasa.jpg",
    desc: "Brownie intenso, servido quente, com calda doce no fechamento.",
    ingredients: ["brownie", "calda"],
    customizable: false,
    tags: ["quente"],
  },
  {
    id: "pudim-ambar",
    category: "sobremesas",
    categoryLabel: "Sobremesas",
    name: "Pudim Âmbar",
    price: 16.9,
    image: "assets/pudim-ambar.jpg",
    desc: "Pudim cremoso com caramelo escuro e final delicado.",
    ingredients: ["pudim", "caramelo"],
    customizable: false,
    tags: ["novo"],
  },
  {
    id: "sundae-doce-de-leite",
    category: "sobremesas",
    categoryLabel: "Sobremesas",
    name: "Sundae de Doce de Leite",
    price: 17.9,
    image: "assets/sundae-doce-de-leite.jpg",
    fallback: "assets/pudim-ambar.jpg",
    desc: "Sorvete de creme com doce de leite em calda e amendoim crocante.",
    ingredients: ["sorvete", "doce de leite", "amendoim"],
    customizable: false,
    tags: ["gelado"],
  },
  {
    id: "cookie-recheado",
    category: "sobremesas",
    categoryLabel: "Sobremesas",
    name: "Cookie Recheado",
    price: 12.9,
    image: "assets/cookie-recheado.jpg",
    fallback: "assets/brownie-brasa.jpg",
    desc: "Cookie macio com gotas de chocolate e recheio cremoso de avelã.",
    ingredients: ["cookie", "recheio de avelã"],
    customizable: false,
    tags: ["individual"],
  },
];

const statusSteps = ["Pedido recebido", "Em preparação", "Saiu para entrega", "Entregue"];

/* =========================================================
   Persistência e estado
   ========================================================= */

const storage = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw) ?? fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* armazenamento indisponível (modo privado, cota): o site segue funcionando */
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignorado */
    }
  },
};

// Versões anteriores guardavam um "usuário" e "pedidos" fictícios. Esses dados antigos são descartados.
// (A sessão real fica em "fornalha-auth-session", gerenciada por auth-client.js.)
storage.remove("fornalha-user");
storage.remove("fornalha-order-history");

const auth = window.FornalhaAuth;

function defaultCheckout() {
  return {
    customer: { name: "", phone: "", email: "" },
    fulfillment: { address: "", complement: "" },
    payment: "Pix",
    cashChange: "",
  };
}

function loadCheckout() {
  const base = defaultCheckout();
  const saved = storage.get("fornalha-checkout", null);
  if (!saved || typeof saved !== "object") return base;
  return {
    customer: { ...base.customer, ...(saved.customer || {}) },
    fulfillment: { ...base.fulfillment, ...(saved.fulfillment || {}) },
    payment: ["Dinheiro", "Pix", "Débito", "Crédito"].includes(saved.payment) ? saved.payment : base.payment,
    cashChange: String(saved.cashChange || ""),
  };
}

function newLineId(productId) {
  return `${productId}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clampQty(value) {
  return Math.min(99, Math.max(1, Math.floor(Number(value)) || 1));
}

function findProduct(productId) {
  return products.find((product) => product.id === productId);
}

function findAddon(addonId) {
  return addons.find((addon) => addon.id === addonId);
}

function findDoneness(donenessId) {
  return DONENESS_LEVELS.find((level) => level.id === donenessId);
}

/*
  Uma linha do carrinho guarda apenas escolhas do cliente (produto, quantidade, ponto da carne,
  adicionais, remoções, observação). Nome, imagem e preço são sempre lidos do cardápio, então o
  carrinho nunca fica com valores diferentes dos exibidos no cardápio e no modal.
*/
function normalizeCartItem(item) {
  const product = findProduct(item?.productId);
  if (!product) return null;
  const rawAddons = Array.isArray(item.addons) ? item.addons : [];
  const addonIds = rawAddons.map((entry) => (typeof entry === "string" ? entry : entry?.id)).filter((id) => findAddon(id));
  return {
    lineId: item.lineId || newLineId(product.id),
    productId: product.id,
    qty: clampQty(item.qty),
    // Só produtos com ponto da carne aceitam o campo; qualquer outro valor é descartado.
    doneness: product.doneness && findDoneness(item.doneness) ? item.doneness : null,
    addons: [...new Set(addonIds)],
    removals: Array.isArray(item.removals) ? item.removals.filter((name) => product.ingredients.includes(name)) : [],
    notes: String(item.notes || "").slice(0, 200),
  };
}

function lineUnitPrice(line) {
  const product = findProduct(line.productId);
  const addonTotal = line.addons.reduce((sum, id) => sum + (findAddon(id)?.price || 0), 0);
  return product.price + addonTotal;
}

function lineMissingDoneness(line) {
  return Boolean(findProduct(line.productId)?.doneness) && !line.doneness;
}

const savedMode = storage.get("fornalha-mode", "delivery");
const savedDistrict = storage.get("fornalha-district", "Centro");
const savedCoupon = storage.get("fornalha-coupon", "");

const state = {
  cart: storage.get("fornalha-cart", []).map(normalizeCartItem).filter(Boolean),
  coupon: (auth.configured || COUPONS[savedCoupon]) && /^[A-Z0-9_-]{2,30}$/.test(savedCoupon) ? savedCoupon : "",
  couponInfo: auth.configured ? null : localCouponInfo(savedCoupon),
  orderMode: savedMode === "pickup" ? "pickup" : "delivery",
  district: deliveryFees[savedDistrict] ? savedDistrict : "Centro",
  activeCategory: menuOrder[0].category,
  selectedProduct: null,
  editingLineId: null,
  modalQty: 1,
  modalDoneness: null,
  modalAddons: new Set(),
  modalRemovals: new Set(),
  user: null,
  authView: "login",
  authNotice: null,
  checkoutStep: 0,
  currentOrder: null,
  checkout: loadCheckout(),
};

const $ = (selector) => document.querySelector(selector);

const els = {
  menuSections: $("#menuSections"),
  menuTabs: $("#menuTabs"),
  emptySearch: $("#emptySearch"),
  menuSearch: $("#menuSearch"),
  searchClear: $("#searchClear"),
  searchStatus: $("#searchStatus"),
  cartPanel: $("#cartPanel"),
  cartItems: $("#cartItems"),
  cartCount: $("#cartCount"),
  closeCart: $("#closeCart"),
  openCart: $("#openCart"),
  totals: $("#totals"),
  startCheckout: $("#startCheckout"),
  orderMode: $("#orderMode"),
  district: $("#district"),
  districtLabel: $("#districtLabel"),
  couponInput: $("#couponInput"),
  couponMessage: $("#couponMessage"),
  productModal: $("#productModal"),
  modalImage: $("#modalImage"),
  modalScroll: $("#modalScroll"),
  modalCategory: $("#modalCategory"),
  modalTitle: $("#modalTitle"),
  modalDescription: $("#modalDescription"),
  donenessBlock: $("#donenessBlock"),
  donenessList: $("#donenessList"),
  donenessHelp: $("#donenessHelp"),
  donenessError: $("#donenessError"),
  addonBlock: $("#addonBlock"),
  removeBlock: $("#removeBlock"),
  addonList: $("#addonList"),
  removeList: $("#removeList"),
  itemNotes: $("#itemNotes"),
  noteCount: $("#noteCount"),
  selectionSummary: $("#selectionSummary"),
  modalQty: $("#modalQty"),
  modalPrice: $("#modalPrice"),
  addToCartLabel: $("#addToCartLabel"),
  authModal: $("#authModal"),
  authTitle: $("#authTitle"),
  authTabs: $("#authTabs"),
  authForm: $("#authForm"),
  authHelper: $("#authHelper"),
  authButton: $("#authButton"),
  authButtonText: $("#authButtonText"),
  navAccount: $(".nav-account"),
  loginPreviewBtn: $("#loginPreviewBtn"),
  loginPreviewText: $("#loginPreviewText"),
  checkoutModal: $("#checkoutModal"),
  checkoutSteps: $("#checkoutSteps"),
  checkoutForm: $("#checkoutForm"),
  checkoutBack: $("#checkoutBack"),
  checkoutNext: $("#checkoutNext"),
  orderModal: $("#orderModal"),
  orderSummary: $("#orderSummary"),
  toast: $("#toast"),
  mobileCartBar: $("#mobileCartBar"),
  mobileCartTotal: $("#mobileCartTotal"),
  storeStatus: $("#storeStatus"),
  navToggle: $("#navToggle"),
  themeToggle: $("#themeToggle"),
};

const modals = [els.orderModal, els.checkoutModal, els.authModal, els.productModal];

/* =========================================================
   Utilitários
   ========================================================= */

function brl(value) {
  return money.format(value);
}

function toCents(value) {
  return Math.round(value * 100);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function capitalize(value) {
  const text = String(value);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function imageTag(product, extra = "") {
  return `<img src="${product.image}" data-fallback="${product.fallback || ""}" alt="${escapeHtml(product.name)}" ${extra}>`;
}

// Fotos novas ainda não adicionadas à pasta assets/ caem para a foto de referência indicada.
document.addEventListener(
  "error",
  (event) => {
    const img = event.target;
    if (!(img instanceof HTMLImageElement)) return;
    const fallback = img.dataset.fallback;
    if (fallback && !img.dataset.fallbackUsed) {
      img.dataset.fallbackUsed = "1";
      img.src = fallback;
    } else {
      img.classList.add("img-missing");
    }
  },
  true,
);

let toastTimer = 0;
function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => els.toast.classList.remove("show"), 3200);
}

function persistCart() {
  storage.set("fornalha-cart", state.cart);
  storage.set("fornalha-coupon", state.coupon);
  storage.set("fornalha-mode", state.orderMode);
  storage.set("fornalha-district", state.district);
}

function couponApplies(subtotalCents) {
  return Boolean(state.coupon && state.couponInfo && subtotalCents >= state.couponInfo.minOrderCents);
}

function getTotals() {
  const subtotal = state.cart.reduce((sum, line) => sum + toCents(lineUnitPrice(line)) * line.qty, 0);
  const info = couponApplies(subtotal) ? state.couponInfo : null;
  let discount = 0;
  if (info && info.type === "percent") discount = Math.round((subtotal * info.percentOff) / 100);
  else if (info && info.type === "fixed") discount = Math.min(info.valueCents, subtotal);
  const fee = state.orderMode === "delivery" && subtotal > 0 && !(info && info.freeDelivery) ? toCents(deliveryFees[state.district]) : 0;
  return {
    subtotal: subtotal / 100,
    discount: discount / 100,
    fee: fee / 100,
    total: Math.max(0, subtotal - discount + fee) / 100,
  };
}

/*
  Lista, em partes separadas, tudo o que o cliente escolheu para uma linha.
  É a base do carrinho (uma por linha), da revisão do checkout e do resumo do pedido.
*/
function lineOptions(line) {
  const options = [];
  const doneness = findDoneness(line.doneness);
  if (doneness) options.push({ kind: "doneness", text: `Ponto da carne: ${doneness.label}` });
  line.removals.forEach((name) => options.push({ kind: "remove", text: `Sem ${name}` }));
  line.addons.forEach((id) => {
    const addon = findAddon(id);
    options.push({ kind: "add", text: `+ ${addon.name}`, price: addon.price });
  });
  if (line.notes) options.push({ kind: "note", text: `Obs.: ${line.notes}` });
  return options;
}

function describeLine(line) {
  return lineOptions(line)
    .map((option) => option.text)
    .join(" • ");
}

function totalsMarkup(totals) {
  const feeLabel = state.orderMode === "delivery" ? `Taxa ${state.district}` : "Retirada";
  return `
    <div class="total-row"><span>Subtotal</span><strong>${brl(totals.subtotal)}</strong></div>
    ${totals.discount > 0 ? `<div class="total-row discount"><span>Desconto ${escapeHtml(state.coupon)}</span><strong>-${brl(totals.discount)}</strong></div>` : ""}
    <div class="total-row"><span>${escapeHtml(feeLabel)}</span><strong>${totals.fee > 0 ? brl(totals.fee) : "Grátis"}</strong></div>
    <div class="total-row final"><span>Total</span><strong>${brl(totals.total)}</strong></div>
  `;
}

/* =========================================================
   Cardápio: abas, busca e carrosséis
   ========================================================= */

function renderTabs() {
  els.menuTabs.innerHTML = menuOrder
    .map((section) => {
      const count = products.filter((product) => product.category === section.category).length;
      return `<button class="menu-tab" type="button" data-category="${section.category}" aria-pressed="false">${escapeHtml(section.title)}<span>${count}</span></button>`;
    })
    .join("");
}

function productMatches(product, tokens) {
  const haystack = normalizeText([product.name, product.desc, product.categoryLabel, ...product.tags, ...product.ingredients].join(" "));
  return tokens.every((token) => haystack.includes(token));
}

function renderMenu() {
  const rawQuery = els.menuSearch.value;
  const tokens = normalizeText(rawQuery).split(/\s+/).filter(Boolean);
  const searching = tokens.length > 0;

  els.searchClear.hidden = rawQuery.length === 0;
  els.menuTabs.classList.toggle("is-searching", searching);
  els.menuTabs.querySelectorAll(".menu-tab").forEach((tab) => {
    const active = !searching && tab.dataset.category === state.activeCategory;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-pressed", String(active));
  });

  const sections = searching ? menuOrder : menuOrder.filter((section) => section.category === state.activeCategory);
  let totalMatches = 0;

  els.menuSections.innerHTML = sections
    .map((section) => {
      const items = products.filter((product) => product.category === section.category && (!searching || productMatches(product, tokens)));
      totalMatches += items.length;
      if (!items.length) return "";
      return `
        <section class="menu-group" data-group="${section.id}" aria-label="${escapeHtml(section.title)}">
          <div class="menu-group-head">
            <div>
              <p class="eyebrow">${items.length} ${items.length === 1 ? "item" : "itens"}${section.hint ? ` • ${section.hint}` : ""}</p>
              <h3>${escapeHtml(section.title)}</h3>
            </div>
            <div class="carousel-controls">
              <button class="carousel-btn" type="button" data-carousel-dir="-1" aria-label="Ver itens anteriores de ${escapeHtml(section.title)}">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m14.5 5.5-6.5 6.5 6.5 6.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
              <button class="carousel-btn" type="button" data-carousel-dir="1" aria-label="Ver próximos itens de ${escapeHtml(section.title)}">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m9.5 5.5 6.5 6.5-6.5 6.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
            </div>
          </div>
          <div class="carousel">
            <div class="carousel-track" tabindex="0" role="region" aria-label="${escapeHtml(section.title)}: lista de produtos">
              ${items.map(productCard).join("")}
            </div>
          </div>
        </section>
      `;
    })
    .join("");

  els.emptySearch.hidden = totalMatches > 0;
  els.searchStatus.hidden = !searching || totalMatches === 0;
  if (searching && totalMatches > 0) {
    els.searchStatus.textContent = `${totalMatches} ${totalMatches === 1 ? "resultado" : "resultados"} para “${rawQuery.trim()}”`;
  }

  window.requestAnimationFrame(updateCarousels);
}

function productCard(product) {
  const badge = product.tags[0] ? `<span class="product-badge">${escapeHtml(product.tags[0])}</span>` : "";
  // Produtos com ponto da carne abrem a personalização, porque o cliente precisa escolher o ponto.
  const addAttr = product.doneness ? "data-details" : "data-add";
  return `
    <article class="product-card">
      <button class="product-media" type="button" data-details="${product.id}" aria-label="Ver detalhes de ${escapeHtml(product.name)}">
        ${imageTag(product, 'loading="lazy" decoding="async"')}
        ${badge}
      </button>
      <div class="product-body">
        <h3 class="product-title">${escapeHtml(product.name)}</h3>
        <p class="product-desc">${escapeHtml(product.desc)}</p>
        <div class="product-foot">
          <strong class="product-price">${brl(product.price)}</strong>
          <div class="card-actions">
            <button class="btn-sm ghost" type="button" data-details="${product.id}">${product.customizable ? "Personalizar" : "Detalhes"}</button>
            ${product.soldOut ? '<button class="btn-sm solid" type="button" disabled>Esgotado</button>' : `<button class="btn-sm solid" type="button" ${addAttr}="${product.id}">Adicionar</button>`}
          </div>
        </div>
      </div>
    </article>
  `;
}

function updateCarousel(group) {
  const track = group.querySelector(".carousel-track");
  const prev = group.querySelector('[data-carousel-dir="-1"]');
  const next = group.querySelector('[data-carousel-dir="1"]');
  if (!track || !prev || !next) return;
  const maxScroll = track.scrollWidth - track.clientWidth;
  prev.disabled = track.scrollLeft <= 2;
  next.disabled = maxScroll <= 2 || track.scrollLeft >= maxScroll - 2;
}

function updateCarousels() {
  els.menuSections.querySelectorAll(".menu-group").forEach(updateCarousel);
}

els.menuSections.addEventListener(
  "scroll",
  (event) => {
    if (event.target.classList?.contains("carousel-track")) updateCarousel(event.target.closest(".menu-group"));
  },
  true,
);
window.addEventListener("resize", updateCarousels);

els.menuSections.addEventListener("click", (event) => {
  const arrow = event.target.closest("[data-carousel-dir]");
  if (arrow) {
    const track = arrow.closest(".menu-group").querySelector(".carousel-track");
    track.scrollBy({ left: Number(arrow.dataset.carouselDir) * track.clientWidth * 0.85, behavior: "smooth" });
    return;
  }
  const add = event.target.closest("[data-add]");
  if (add) {
    quickAdd(add.dataset.add);
    return;
  }
  const details = event.target.closest("[data-details]");
  if (details) openProduct(details.dataset.details);
});

els.menuTabs.addEventListener("click", (event) => {
  const tab = event.target.closest("[data-category]");
  if (!tab) return;
  state.activeCategory = tab.dataset.category;
  els.menuSearch.value = "";
  renderMenu();
  tab.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
});

els.menuSearch.addEventListener("input", renderMenu);

function clearSearch() {
  els.menuSearch.value = "";
  renderMenu();
  els.menuSearch.focus({ preventScroll: true });
}

els.searchClear.addEventListener("click", clearSearch);
document.addEventListener("click", (event) => {
  if (event.target.closest("[data-clear-search]")) clearSearch();
});
els.menuSearch.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && els.menuSearch.value) {
    event.stopPropagation();
    clearSearch();
  }
});

/* =========================================================
   Carrinho
   ========================================================= */

function sameLine(a, b) {
  return (
    a.productId === b.productId &&
    a.notes === b.notes &&
    (a.doneness || "") === (b.doneness || "") &&
    [...a.addons].sort().join("|") === [...b.addons].sort().join("|") &&
    [...a.removals].sort().join("|") === [...b.removals].sort().join("|")
  );
}

function addLineToCart(productId, qty, choices = {}) {
  const line = normalizeCartItem({ productId, qty, ...choices });
  if (!line) return null;
  const existing = state.cart.find((current) => sameLine(current, line));
  if (existing) existing.qty = clampQty(existing.qty + line.qty);
  else state.cart.push(line);
  persistCart();
  renderCart();
  return line;
}

// Troca uma linha existente pela versão editada (juntando com outra linha idêntica, se houver).
function replaceLine(lineId, productId, qty, choices) {
  const index = state.cart.findIndex((line) => line.lineId === lineId);
  const line = normalizeCartItem({ productId, qty, ...choices });
  if (!line) return null;
  if (index < 0) return addLineToCart(productId, qty, choices);
  state.cart.splice(index, 1);
  const duplicate = state.cart.find((current) => sameLine(current, line));
  if (duplicate) duplicate.qty = clampQty(duplicate.qty + line.qty);
  else state.cart.splice(index, 0, line);
  persistCart();
  renderCart();
  return line;
}

function quickAdd(productId) {
  const product = findProduct(productId);
  if (!product) return;
  if (product.doneness) {
    openProduct(product.id);
    return;
  }
  addLineToCart(product.id, 1);
  toast(`${product.name} adicionado ao carrinho.`);
}

let lastCount = null;
function renderCart() {
  const count = state.cart.reduce((sum, line) => sum + line.qty, 0);
  els.cartCount.textContent = count;
  if (lastCount !== null && count > lastCount) {
    els.cartCount.classList.remove("bump");
    void els.cartCount.offsetWidth;
    els.cartCount.classList.add("bump");
  }
  lastCount = count;

  els.orderMode.value = state.orderMode;
  els.district.value = state.district;
  els.districtLabel.hidden = state.orderMode !== "delivery";
  if (document.activeElement !== els.couponInput) els.couponInput.value = state.coupon;
  els.startCheckout.disabled = count === 0;

  if (!state.cart.length) {
    els.cartItems.innerHTML = `<p class="cart-empty">Seu carrinho está vazio. Escolha um item do cardápio para iniciar.</p>`;
  } else {
    els.cartItems.innerHTML = state.cart
      .map((line) => {
        const product = findProduct(line.productId);
        const options = lineOptions(line);
        const missing = lineMissingDoneness(line);
        const optionsMarkup = missing
          ? `<li class="opt opt-warn">Escolha o ponto da carne</li>`
          : "";
        const rows = options
          .map(
            (option) =>
              `<li class="opt opt-${option.kind}"><span>${escapeHtml(option.text)}</span>${option.price ? `<em>+${brl(option.price)}</em>` : ""}</li>`,
          )
          .join("");
        const list = optionsMarkup + rows || `<li class="opt opt-none">Sem alterações</li>`;
        const editButton = product.customizable
          ? `<button class="edit-btn" type="button" data-cart-action="edit" aria-label="Editar ${escapeHtml(product.name)}">Editar</button>`
          : "";
        return `
          <article class="cart-item" data-line="${line.lineId}">
            ${imageTag(product, 'decoding="async"')}
            <div class="cart-item-main">
              <div class="cart-item-top">
                <h3>${escapeHtml(product.name)}</h3>
                <strong>${brl(lineUnitPrice(line) * line.qty)}</strong>
              </div>
              <ul class="cart-opts">${list}</ul>
              <div class="cart-item-actions">
                <div class="quantity-mini">
                  <button type="button" data-cart-action="dec" aria-label="Diminuir quantidade de ${escapeHtml(product.name)}">−</button>
                  <strong>${line.qty}</strong>
                  <button type="button" data-cart-action="inc" aria-label="Aumentar quantidade de ${escapeHtml(product.name)}">+</button>
                </div>
                <div class="cart-item-links">
                  ${editButton}
                  <button class="remove-btn" type="button" data-cart-action="remove">Remover</button>
                </div>
              </div>
            </div>
          </article>
        `;
      })
      .join("");
  }

  const totals = getTotals();
  els.totals.innerHTML = totalsMarkup(totals);
  els.mobileCartTotal.textContent = brl(totals.total);
  els.mobileCartBar.hidden = count === 0;
  document.body.classList.toggle("has-cart-bar", count > 0);
}

els.cartItems.addEventListener("click", (event) => {
  const button = event.target.closest("[data-cart-action]");
  if (!button) return;
  const lineId = button.closest("[data-line]")?.dataset.line;
  const index = state.cart.findIndex((line) => line.lineId === lineId);
  if (index < 0) return;
  const line = state.cart[index];
  const action = button.dataset.cartAction;
  if (action === "edit") {
    openProduct(line.productId, line);
    return;
  }
  if (action === "inc") line.qty = clampQty(line.qty + 1);
  if (action === "dec") line.qty -= 1;
  if (action === "remove" || line.qty <= 0) state.cart.splice(index, 1);
  persistCart();
  renderCart();
});

els.orderMode.addEventListener("change", () => {
  state.orderMode = els.orderMode.value;
  persistCart();
  renderCart();
});

els.district.addEventListener("change", () => {
  state.district = els.district.value;
  persistCart();
  renderCart();
});

async function checkCoupon(code) {
  if (!auth.configured) {
    const info = localCouponInfo(code);
    return info
      ? { valid: true, info, message: `Cupom aplicado: ${info.percentOff}% OFF.` }
      : { valid: false, message: "Cupom inválido neste protótipo." };
  }
  try {
    const subtotalCents = state.cart.reduce((sum, line) => sum + toCents(lineUnitPrice(line)) * line.qty, 0);
    const r = await auth.rpc("validate_coupon", { p_code: code, p_subtotal_cents: subtotalCents });
    if (!r || !r.valid) return { valid: false, message: (r && r.message) || "Cupom inválido ou expirado." };
    const info = {
      type: r.type,
      percentOff: Number(r.percentOff) || 0,
      valueCents: Number(r.valueCents) || 0,
      minOrderCents: Number(r.minOrderCents) || 0,
      freeDelivery: Boolean(r.freeDelivery),
    };
    const message =
      subtotalCents < info.minOrderCents
        ? `Cupom salvo: vale em pedidos a partir de ${brl(info.minOrderCents / 100)}.`
        : "Cupom aplicado.";
    return { valid: true, info, message };
  } catch (error) {
    return { valid: false, message: error instanceof auth.AuthError ? error.message : "Não foi possível validar o cupom agora." };
  }
}

$("#couponForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const coupon = els.couponInput.value.trim().toUpperCase();
  if (!coupon) {
    state.coupon = "";
    state.couponInfo = null;
    els.couponMessage.textContent = "Cupom removido.";
  } else {
    const result = await checkCoupon(coupon);
    if (result.valid) {
      state.coupon = coupon;
      state.couponInfo = result.info;
    }
    els.couponMessage.textContent = result.message;
  }
  persistCart();
  renderCart();
});

// Os botões de cupom são criados por banners.js, então o clique é tratado por delegação.
document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-copy-coupon]");
  if (!button) return;
  const coupon = button.dataset.copyCoupon;
  try {
    await navigator.clipboard.writeText(coupon);
    toast(`Cupom ${coupon} copiado.`);
  } catch {
    els.couponInput.value = coupon;
    toast(`Cupom ${coupon} pronto no carrinho.`);
  }
});

function syncLock() {
  const locked = modals.some((modal) => !modal.hidden) || document.body.classList.contains("cart-open");
  document.body.classList.toggle("is-locked", locked);
}

function openCart() {
  closeNav();
  document.body.classList.add("cart-open");
  els.cartPanel.setAttribute("aria-hidden", "false");
  els.cartPanel.inert = false;
  syncLock();
  els.closeCart.focus({ preventScroll: true });
}

function closeCart(restoreFocus = true) {
  const wasOpen = document.body.classList.contains("cart-open");
  document.body.classList.remove("cart-open");
  els.cartPanel.setAttribute("aria-hidden", "true");
  els.cartPanel.inert = true;
  syncLock();
  if (wasOpen && restoreFocus) els.openCart.focus({ preventScroll: true });
}

els.openCart.addEventListener("click", openCart);
els.closeCart.addEventListener("click", () => closeCart());
$("#cartScrim").addEventListener("click", () => closeCart());
$("#keepShopping").addEventListener("click", () => closeCart());
els.mobileCartBar.addEventListener("click", openCart);

/* =========================================================
   Modais
   ========================================================= */

let lastFocus = null;

function openModal(modal) {
  lastFocus = document.activeElement;
  modal.hidden = false;
  syncLock();
  modal.querySelector(".modal-close")?.focus({ preventScroll: true });
}

function closeModal(modal) {
  modal.hidden = true;
  syncLock();
  if (lastFocus && document.contains(lastFocus) && !lastFocus.closest("[hidden]")) lastFocus.focus({ preventScroll: true });
}

modals.forEach((modal) => {
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal(modal);
  });
});

document.addEventListener("click", (event) => {
  const closer = event.target.closest("[data-close-modal]");
  if (closer) closeModal(closer.closest(".modal-backdrop"));
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const open = modals.find((modal) => !modal.hidden);
  if (open) closeModal(open);
  else if (document.body.classList.contains("cart-open")) closeCart();
  else closeNav();
});

/* ---------- Produto: personalização ---------- */

/*
  `line` (opcional) abre o modal para EDITAR uma linha do carrinho, já com as escolhas dela.
  Sem `line`, abre um item novo, sem nada marcado (inclusive sem ponto da carne escolhido).
*/
function openProduct(productId, line = null) {
  const product = findProduct(productId);
  if (!product) return;
  if (product.soldOut && !line) {
    toast(`${product.name} está esgotado no momento.`);
    return;
  }
  state.selectedProduct = product;
  state.editingLineId = line ? line.lineId : null;
  state.modalQty = line ? line.qty : 1;
  state.modalDoneness = line?.doneness || null;
  state.modalAddons = new Set(line ? line.addons : []);
  state.modalRemovals = new Set(line ? line.removals : []);
  els.itemNotes.value = line ? line.notes : "";
  renderProductModal();
  openModal(els.productModal);
  els.modalScroll.scrollTop = 0;
}

function currentModalUnitPrice() {
  const addonTotal = [...state.modalAddons].reduce((sum, id) => sum + (findAddon(id)?.price || 0), 0);
  return state.selectedProduct.price + addonTotal;
}

function renderSelectionSummary() {
  const product = state.selectedProduct;
  const items = [];
  const doneness = findDoneness(state.modalDoneness);
  if (product.doneness) {
    items.push(
      doneness
        ? `<li class="sum-doneness">Ponto da carne: <strong>${escapeHtml(doneness.label)}</strong></li>`
        : `<li class="sum-warn">Ponto da carne: <strong>ainda não escolhido</strong></li>`,
    );
  }
  [...state.modalRemovals].forEach((name) => items.push(`<li class="sum-remove">Sem ${escapeHtml(name)}</li>`));
  [...state.modalAddons].forEach((id) => {
    const addon = findAddon(id);
    items.push(`<li class="sum-add">+ ${escapeHtml(addon.name)} <em>+${brl(addon.price)}</em></li>`);
  });
  els.selectionSummary.innerHTML = items.length ? items.join("") : `<li class="sum-none">Sem alterações: vem exatamente como no cardápio.</li>`;
}

function updateModalTotals() {
  els.modalQty.textContent = state.modalQty;
  els.modalPrice.textContent = brl(currentModalUnitPrice() * state.modalQty);
  els.addToCartLabel.textContent = state.editingLineId ? "Salvar alterações" : "Adicionar";
  els.noteCount.textContent = `${els.itemNotes.value.length}/200`;
  renderSelectionSummary();
}

function renderProductModal() {
  const product = state.selectedProduct;
  if (!product) return;

  els.modalImage.dataset.fallback = product.fallback || "";
  delete els.modalImage.dataset.fallbackUsed;
  els.modalImage.classList.remove("img-missing");
  els.modalImage.src = product.image;
  els.modalImage.alt = product.name;
  els.modalCategory.textContent = product.categoryLabel;
  els.modalTitle.textContent = product.name;
  els.modalDescription.textContent = product.desc;

  // Ponto da carne: só em produtos com `doneness`; nunca vem marcado sem o cliente escolher.
  els.donenessBlock.hidden = !product.doneness;
  els.donenessError.hidden = true;
  els.donenessHelp.textContent = product.donenessNote || "Escolha 1 opção. A cozinha prepara do jeito que você pedir.";
  els.donenessList.innerHTML = product.doneness
    ? DONENESS_LEVELS.map(
        (level) => `
          <label class="radio-card">
            <input type="radio" name="doneness" value="${level.id}" ${state.modalDoneness === level.id ? "checked" : ""}>
            <span class="rc-dot" aria-hidden="true"></span>
            <span class="rc-body"><strong>${escapeHtml(level.label)}</strong><small>${escapeHtml(level.hint)}</small></span>
            ${level.id === HOUSE_DONENESS ? '<em class="rc-flag">Padrão da casa</em>' : ""}
          </label>
        `,
      ).join("")
    : "";

  const removable = product.customizable ? product.ingredients : [];
  els.removeBlock.hidden = removable.length === 0;
  els.removeList.innerHTML = removable
    .map(
      (ingredient) => `
        <label class="remove-chip">
          <input type="checkbox" value="${escapeHtml(ingredient)}" ${state.modalRemovals.has(ingredient) ? "checked" : ""}>
          <span class="rm-icon" aria-hidden="true"></span>
          <span class="rm-name"><span class="sr-only">Remover </span>${escapeHtml(capitalize(ingredient))}</span>
          <span class="rm-state" aria-hidden="true"></span>
        </label>
      `,
    )
    .join("");

  els.addonBlock.hidden = !product.customizable;
  els.addonList.innerHTML = product.customizable
    ? addons
        .map(
          (addon) => `
            <label class="option-row">
              <input type="checkbox" value="${addon.id}" ${state.modalAddons.has(addon.id) ? "checked" : ""}>
              <span class="or-check" aria-hidden="true"></span>
              <span class="or-name">${escapeHtml(addon.name)}</span>
              <span class="or-price">+${brl(addon.price)}</span>
            </label>
          `,
        )
        .join("")
    : "";

  updateModalTotals();
}

els.donenessList.addEventListener("change", (event) => {
  if (event.target.name !== "doneness") return;
  state.modalDoneness = event.target.value;
  els.donenessError.hidden = true;
  updateModalTotals();
});

els.addonList.addEventListener("change", (event) => {
  const input = event.target;
  if (input.checked) state.modalAddons.add(input.value);
  else state.modalAddons.delete(input.value);
  updateModalTotals();
});

els.removeList.addEventListener("change", (event) => {
  const input = event.target;
  if (input.checked) state.modalRemovals.add(input.value);
  else state.modalRemovals.delete(input.value);
  updateModalTotals();
});

els.itemNotes.addEventListener("input", updateModalTotals);

document.querySelectorAll("[data-qty]").forEach((button) => {
  button.addEventListener("click", () => {
    state.modalQty = clampQty(state.modalQty + Number(button.dataset.qty));
    updateModalTotals();
  });
});

$("#addToCart").addEventListener("click", () => {
  const product = state.selectedProduct;
  if (!product) return;

  if (product.doneness && !state.modalDoneness) {
    els.donenessError.hidden = false;
    els.donenessBlock.scrollIntoView({ block: "center", behavior: "smooth" });
    els.donenessList.querySelector("input")?.focus({ preventScroll: true });
    return;
  }

  const choices = {
    doneness: state.modalDoneness,
    addons: [...state.modalAddons],
    removals: [...state.modalRemovals],
    notes: els.itemNotes.value.trim(),
  };
  const editing = state.editingLineId;
  if (editing) replaceLine(editing, product.id, state.modalQty, choices);
  else addLineToCart(product.id, state.modalQty, choices);

  state.selectedProduct = null;
  state.editingLineId = null;
  closeModal(els.productModal);
  toast(editing ? `${product.name} atualizado no carrinho.` : `${product.name} adicionado ao carrinho.`);
});

/* =========================================================
   Conta do cliente (autenticação real via serviço configurado)
   ========================================================= */

const GENERIC_AUTH_ERROR = "Não foi possível concluir agora. Tente novamente.";

function firstName(name) {
  return String(name || "").trim().split(/\s+/)[0] || "";
}

function renderAccountUI() {
  const user = state.user;
  const label = user ? firstName(user.name) || "Minha conta" : "Entrar";
  els.authButtonText.textContent = label;
  els.authButton.setAttribute("aria-label", user ? `Minha conta (${label})` : "Entrar ou criar conta");
  els.navAccount.textContent = user ? `Minha conta (${label})` : "Entrar ou criar conta";
  els.loginPreviewBtn.textContent = user ? "Ver minha conta" : "Entrar ou criar conta";
  els.loginPreviewText.textContent = user
    ? "Você está conectado. Seus dados ficam salvos e preenchem o checkout. Veja seus pedidos e use “Pedir novamente” em Minha conta > Meus pedidos."
    : "Crie uma conta para guardar seus dados e, quando o checkout for conectado ao sistema de pedidos, acompanhar seus pedidos e usar “Pedir novamente”. Você também pode pedir sem conta, informando nome e WhatsApp no checkout.";
}

async function loadUser() {
  const session = await auth.getSession();
  if (!session || !session.user) {
    state.user = null;
    renderAccountUI();
    return null;
  }
  let profile = null;
  let profileError = false;
  try {
    profile = await auth.getProfile();
  } catch (error) {
    if (error.code === "session_expired") {
      state.user = null;
      renderAccountUI();
      return null;
    }
    profileError = true;
  }
  const meta = session.user.user_metadata || {};
  state.user = {
    id: session.user.id,
    email: profile?.email || session.user.email || "",
    name: profile?.name || meta.name || "",
    phone: profile?.phone || meta.phone || "",
    profileSaved: Boolean(profile),
    profileError,
  };
  renderAccountUI();
  return state.user;
}

function authField({ name, label, type = "text", autocomplete = "off", placeholder = "", inputmode = "", value = "", password = false, maxlength = "" }) {
  const toggle = password
    ? `<button class="pw-toggle" type="button" data-toggle-password aria-label="Mostrar senha" aria-pressed="false">Mostrar</button>`
    : "";
  return `
    <div class="auth-field">
      <label for="af-${name}">${label}</label>
      <div class="af-control">
        <input id="af-${name}" name="${name}" type="${type}" value="${escapeHtml(value)}" autocomplete="${autocomplete}" ${placeholder ? `placeholder="${escapeHtml(placeholder)}"` : ""} ${inputmode ? `inputmode="${inputmode}"` : ""} ${maxlength ? `maxlength="${maxlength}"` : ""} autocapitalize="none" spellcheck="false" aria-describedby="err-${name}">
        ${toggle}
      </div>
      <small class="field-error" id="err-${name}" data-error-for="${name}" hidden></small>
    </div>
  `;
}

const alertSlots = `<p class="form-alert" id="authAlert" role="alert" hidden></p><p class="form-success" id="authSuccess" role="status" hidden></p>`;

function unconfiguredNote() {
  return `<p class="soon-note"><strong>Contas ainda não ativadas neste ambiente.</strong> O serviço de autenticação não foi configurado, então não é possível criar conta nem entrar agora. Você pode fazer seu pedido normalmente: nome e WhatsApp são pedidos no checkout.</p>`;
}

const guestButton = `<button class="secondary-btn full" type="button" data-close-modal>Continuar sem conta</button>`;

const authViews = {
  login() {
    return `
      ${auth.configured ? "" : unconfiguredNote()}
      <fieldset class="auth-fields" ${auth.configured ? "" : "disabled"}>
        ${authField({ name: "email", label: "E-mail", type: "email", autocomplete: "email", placeholder: "voce@email.com", inputmode: "email" })}
        ${authField({ name: "password", label: "Senha", type: "password", autocomplete: "current-password", password: true })}
        ${alertSlots}
        <button class="primary-btn full" type="submit">Entrar</button>
        <button class="link-btn" type="button" data-auth-view="forgot">Esqueci minha senha</button>
      </fieldset>
      ${guestButton}
    `;
  },

  signup() {
    return `
      ${auth.configured ? "" : unconfiguredNote()}
      <fieldset class="auth-fields" ${auth.configured ? "" : "disabled"}>
        ${authField({ name: "name", label: "Nome", autocomplete: "name", placeholder: "Seu nome", maxlength: 80 })}
        ${authField({ name: "phone", label: "WhatsApp", type: "tel", autocomplete: "tel", placeholder: "(11) 99999-2026", inputmode: "tel" })}
        ${authField({ name: "email", label: "E-mail", type: "email", autocomplete: "email", placeholder: "voce@email.com", inputmode: "email" })}
        ${authField({ name: "password", label: "Senha", type: "password", autocomplete: "new-password", password: true })}
        <p class="field-hint">Mínimo de 8 caracteres, com letras e números.</p>
        ${authField({ name: "confirm", label: "Confirmar senha", type: "password", autocomplete: "new-password", password: true })}
        <div class="auth-field">
          <label class="consent-row" for="af-consent">
            <input id="af-consent" name="consent" type="checkbox" aria-describedby="err-consent">
            <span>Concordo que a Fornalha 147 guarde meu nome, WhatsApp e e-mail para criar minha conta e atender meus pedidos.</span>
          </label>
          <small class="field-error" id="err-consent" data-error-for="consent" hidden></small>
        </div>
        ${alertSlots}
        <button class="primary-btn full" type="submit">Criar conta</button>
      </fieldset>
      ${guestButton}
    `;
  },

  forgot() {
    return `
      ${auth.configured ? "" : unconfiguredNote()}
      <fieldset class="auth-fields" ${auth.configured ? "" : "disabled"}>
        ${authField({ name: "email", label: "E-mail da conta", type: "email", autocomplete: "email", placeholder: "voce@email.com", inputmode: "email" })}
        ${alertSlots}
        <button class="primary-btn full" type="submit">Enviar link de recuperação</button>
        <button class="link-btn" type="button" data-auth-view="login">Voltar para entrar</button>
      </fieldset>
    `;
  },

  reset() {
    return `
      <fieldset class="auth-fields">
        ${authField({ name: "password", label: "Nova senha", type: "password", autocomplete: "new-password", password: true })}
        <p class="field-hint">Mínimo de 8 caracteres, com letras e números.</p>
        ${authField({ name: "confirm", label: "Confirmar nova senha", type: "password", autocomplete: "new-password", password: true })}
        ${alertSlots}
        <button class="primary-btn full" type="submit">Salvar nova senha</button>
      </fieldset>
    `;
  },

  notice() {
    const notice = state.authNotice || { title: "", text: "", action: "login", button: "Ir para entrar" };
    return `
      <div class="account-empty notice-box">
        <strong>${escapeHtml(notice.title)}</strong>
        <p>${escapeHtml(notice.text)}</p>
      </div>
      <button class="primary-btn full" type="button" data-auth-view="${notice.action}">${escapeHtml(notice.button)}</button>
    `;
  },

  account() {
    const user = state.user;
    const initial = (firstName(user.name) || user.email || "?").charAt(0).toUpperCase();
    return `
      <div class="account-card">
        <span class="avatar" aria-hidden="true">${escapeHtml(initial)}</span>
        <div><strong>${escapeHtml(user.name || "Cliente")}</strong><span>${escapeHtml(user.email)}</span></div>
      </div>
      ${user.profileSaved ? "" : `<p class="soon-note">Não foi possível carregar seus dados salvos agora. Você pode tentar de novo mais tarde; o acesso à conta continua ativo.</p>`}
      <fieldset class="auth-fields">
        ${authField({ name: "name", label: "Nome", autocomplete: "name", value: user.name, maxlength: 80 })}
        ${authField({ name: "phone", label: "WhatsApp", type: "tel", autocomplete: "tel", value: user.phone, inputmode: "tel" })}
        ${alertSlots}
        <button class="primary-btn full" type="submit">Salvar alterações</button>
      </fieldset>
      <button class="secondary-btn full" type="button" data-auth-logout>Sair da conta</button>
    `;
  },

  orders() {
    if (!state.user) {
      return `
        <div class="account-empty">
          <strong>Entre para ver seus pedidos.</strong>
          <p>O histórico é privado e só aparece depois do login, na sua conta.</p>
        </div>
        <div class="auth-actions">
          <button class="primary-btn" type="button" data-auth-view="login">Entrar</button>
          <button class="secondary-btn" type="button" data-auth-view="signup">Criar conta</button>
        </div>
      `;
    }
    const history = state.orderHistory;
    if (!history || history.loading) {
      if (!history) loadOrderHistory();
      return `<div class="account-empty"><strong>Carregando seus pedidos…</strong></div>`;
    }
    if (history.error) {
      return `<div class="account-empty"><strong>Não foi possível carregar seus pedidos.</strong><p>Verifique sua conexão e abra esta aba de novo.</p></div>`;
    }
    if (!history.rows.length) {
      return `<div class="account-empty"><strong>Você ainda não fez pedidos nesta conta.</strong><p>Seus próximos pedidos feitos com login aparecem aqui, com a opção “Pedir novamente”.</p></div>`;
    }
    return `<div class="history-preview">${history.rows.map(historyCard).join("")}</div>`;
  },
};

const ORDER_STATUS_LABELS = { new: "Recebido", confirmed: "Confirmado", prep: "Em preparo", delivery: "Saiu para entrega", done: "Entregue", rejected: "Recusado" };

function historyCard(row) {
  const items = Array.isArray(row.items) ? row.items : [];
  const pickup = row.fulfillment && row.fulfillment.mode === "pickup";
  const status = row.status === "delivery" && pickup ? "Pronto para retirada" : ORDER_STATUS_LABELS[row.status] || row.status;
  const when = new Date(row.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const total = ((row.totals && row.totals.totalCents) || 0) / 100;
  return `
    <article class="history-card">
      <div class="history-head">
        <div><strong>Pedido ${escapeHtml(row.order_number)}</strong><span>${escapeHtml(when)}</span></div>
        <em>${escapeHtml(status)}</em>
      </div>
      <ul>${items.map((item) => `<li>${Number(item.qty) || 0}× ${escapeHtml(item.name || "Item")}</li>`).join("")}</ul>
      <div class="price-row"><span>Total</span><strong>${brl(total)}</strong></div>
      <button class="secondary-btn full" type="button" data-reorder="${escapeHtml(row.id)}">Pedir novamente</button>
    </article>
  `;
}

async function loadOrderHistory() {
  state.orderHistory = { loading: true };
  try {
    const rows = await auth.restAuth("orders?select=id,order_number,status,items,fulfillment,totals,created_at&order=created_at.desc&limit=20");
    state.orderHistory = { rows: Array.isArray(rows) ? rows : [] };
  } catch {
    state.orderHistory = { error: true };
  }
  if (!els.authModal.hidden && state.authView === "orders") renderAuth();
}

// Reabastece o carrinho com os itens de um pedido antigo, sempre com os preços atuais do cardápio.
function reorderOrder(orderId) {
  const row = state.orderHistory && state.orderHistory.rows && state.orderHistory.rows.find((r) => r.id === orderId);
  if (!row) return;
  let added = 0;
  let skipped = 0;
  (Array.isArray(row.items) ? row.items : []).forEach((item) => {
    const line = item.slug
      ? addLineToCart(item.slug, item.qty, {
          doneness: item.doneness || null,
          addons: Array.isArray(item.addonSlugs) ? item.addonSlugs : [],
          removals: Array.isArray(item.removals) ? item.removals : [],
          notes: item.notes || "",
        })
      : null;
    if (line) added += 1;
    else skipped += 1;
  });
  closeModal(els.authModal);
  if (!added) {
    toast("Esses itens não estão mais disponíveis no cardápio.");
    return;
  }
  toast(skipped ? `${added} item(ns) adicionados; ${skipped} indisponível(is). Confira o carrinho.` : "Itens adicionados. Confira o carrinho e os preços atuais.");
  openCart();
}

const authHelpers = {
  login: "Entre com o e-mail e a senha da sua conta.",
  signup: "Crie sua conta para guardar seus dados.",
  forgot: "Informe o e-mail da conta para receber o link de recuperação.",
  reset: "Defina uma nova senha para a sua conta.",
  notice: "",
  account: "Seus dados são privados e visíveis só para você.",
  orders: "Acompanhe seus pedidos.",
};

const authTitles = { reset: "Nova senha", forgot: "Recuperar senha", account: "Minha conta" };

function renderAuth() {
  const loggedIn = Boolean(state.user);
  let view = state.authView;
  // Telas privadas e de acesso nunca aparecem no estado errado.
  if (view === "account" && !loggedIn) view = "login";
  if ((view === "login" || view === "signup" || view === "forgot") && loggedIn) view = "account";
  state.authView = view;

  const tabs = loggedIn
    ? [["account", "Minha conta"], ["orders", "Meus pedidos"]]
    : [["login", "Entrar"], ["signup", "Criar conta"], ["orders", "Meus pedidos"]];
  const activeTab = ["forgot", "notice", "reset"].includes(view) ? (loggedIn ? "account" : "login") : view;
  els.authTabs.innerHTML = tabs
    .map(([id, label]) => `<button type="button" class="${id === activeTab ? "active" : ""}" data-auth-tab="${id}" aria-pressed="${id === activeTab}">${label}</button>`)
    .join("");

  els.authTitle.textContent = authTitles[view] || (loggedIn ? "Minha conta" : "Sua conta");
  els.authHelper.textContent = authHelpers[view] || "";
  els.authHelper.hidden = !authHelpers[view];
  els.authForm.innerHTML = authViews[view]();
}

function openAuth(view = "login") {
  state.authView = view;
  state.orderHistory = null;
  renderAuth();
  openModal(els.authModal);
}

function setAuthView(view) {
  state.authView = view;
  if (view === "orders") state.orderHistory = null;
  renderAuth();
  els.authForm.querySelector("input:not([disabled])")?.focus({ preventScroll: true });
}

function showAlert(message) {
  const el = $("#authAlert");
  if (!el) return;
  el.textContent = message;
  el.hidden = !message;
}

function showSuccess(message) {
  const el = $("#authSuccess");
  if (!el) return;
  el.textContent = message;
  el.hidden = !message;
}

// Marca cada campo com problema e foca o primeiro. Retorna true se houve erro.
function applyFieldErrors(errors) {
  els.authForm.querySelectorAll("[data-error-for]").forEach((small) => {
    small.hidden = true;
    small.textContent = "";
  });
  els.authForm.querySelectorAll("[aria-invalid]").forEach((input) => input.removeAttribute("aria-invalid"));
  showAlert("");
  showSuccess("");
  const names = Object.keys(errors);
  names.forEach((name) => {
    const small = els.authForm.querySelector(`[data-error-for="${name}"]`);
    const input = els.authForm.elements[name];
    if (small) {
      small.textContent = errors[name];
      small.hidden = false;
    }
    input?.setAttribute("aria-invalid", "true");
  });
  if (names.length) els.authForm.elements[names[0]]?.focus();
  return names.length > 0;
}

let authBusy = false;

async function runAuthTask(task) {
  if (authBusy) return;
  authBusy = true;
  const submit = els.authForm.querySelector('button[type="submit"]');
  const label = submit?.textContent;
  if (submit) {
    submit.disabled = true;
    submit.textContent = "Aguarde…";
  }
  try {
    await task();
  } catch (error) {
    showAlert(error instanceof auth.AuthError ? error.message : GENERIC_AUTH_ERROR);
  } finally {
    authBusy = false;
    if (submit && document.contains(submit)) {
      submit.disabled = false;
      submit.textContent = label;
    }
  }
}

const authSubmit = {
  async login(data) {
    const errors = {};
    const emailError = auth.validate.email(data.email);
    if (emailError) errors.email = emailError;
    if (!data.password) errors.password = "Informe sua senha.";
    if (applyFieldErrors(errors)) return;
    await auth.signIn({ email: data.email, password: data.password });
    const user = await loadUser();
    if (!user) throw new auth.AuthError("rejected", "Não foi possível carregar sua conta. Tente novamente.");
    closeModal(els.authModal);
    toast(`Bem-vindo(a), ${firstName(user.name) || "cliente"}!`);
    // Veio do painel: volta para ele (o painel confere o papel de admin no servidor).
    if (new URLSearchParams(location.search).get("entrar") === "admin") location.href = "admin.html";
  },

  async signup(data) {
    const values = {
      name: data.name,
      phone: data.phone,
      email: data.email,
      password: data.password,
      confirm: data.confirm,
      consent: data.consent === "on",
    };
    if (applyFieldErrors(auth.validate.signup(values))) return;
    const result = await auth.signUp(values);
    if (result.status === "signed-in") {
      const user = await loadUser();
      if (!user || !user.profileSaved) {
        throw new auth.AuthError("not_saved", "Seu acesso foi criado, mas não conseguimos confirmar o salvamento dos seus dados. Entre em contato com a loja.");
      }
      closeModal(els.authModal);
      toast("Conta criada. Você já está conectado.");
      return;
    }
    state.authNotice = {
      title: "Falta confirmar seu e-mail",
      text: `Enviamos uma mensagem para ${result.email}. Abra o link dela para ativar a conta. Se você já tinha cadastro com esse e-mail, use “Entrar” ou recupere a senha. Confira também a caixa de spam.`,
      action: "login",
      button: "Ir para entrar",
    };
    setAuthView("notice");
  },

  async forgot(data) {
    const emailError = auth.validate.email(data.email);
    if (applyFieldErrors(emailError ? { email: emailError } : {})) return;
    await auth.recover(data.email);
    state.authNotice = {
      title: "Verifique seu e-mail",
      text: "Se esse e-mail tiver uma conta, enviamos um link para criar uma nova senha. O link expira em pouco tempo. Confira também o spam.",
      action: "login",
      button: "Voltar para entrar",
    };
    setAuthView("notice");
  },

  async reset(data) {
    const errors = {};
    const passwordError = auth.validate.password(data.password);
    if (passwordError) errors.password = passwordError;
    else {
      const confirmError = auth.validate.confirm(data.password, data.confirm);
      if (confirmError) errors.confirm = confirmError;
    }
    if (applyFieldErrors(errors)) return;
    await auth.updatePassword(data.password);
    await loadUser();
    closeModal(els.authModal);
    toast("Senha alterada com sucesso.");
  },

  async account(data) {
    const errors = {};
    const nameError = auth.validate.name(data.name);
    const phoneError = auth.validate.phone(data.phone);
    if (nameError) errors.name = nameError;
    if (phoneError) errors.phone = phoneError;
    if (applyFieldErrors(errors)) return;
    const saved = await auth.updateProfile({ name: data.name, phone: data.phone });
    state.user = { ...state.user, name: saved.name, phone: saved.phone, profileSaved: true };
    renderAccountUI();
    renderAuth();
    showSuccess("Dados salvos.");
  },
};

async function logout() {
  await auth.signOut();
  state.user = null;
  state.orderHistory = null;
  // Em aparelho compartilhado, os dados pessoais do checkout não podem ficar para o próximo cliente.
  state.checkout = defaultCheckout();
  storage.remove("fornalha-checkout");
  renderAccountUI();
  state.authView = "login";
  renderAuth();
  toast("Você saiu da conta.");
}

els.authForm.setAttribute("novalidate", "");
els.authForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const handler = authSubmit[state.authView];
  if (!handler) return;
  const data = Object.fromEntries(new FormData(els.authForm));
  runAuthTask(() => handler(data));
});

els.authForm.addEventListener("click", (event) => {
  const viewButton = event.target.closest("[data-auth-view]");
  if (viewButton) {
    setAuthView(viewButton.dataset.authView);
    return;
  }
  if (event.target.closest("[data-auth-logout]")) {
    runAuthTask(logout);
    return;
  }
  const reorder = event.target.closest("[data-reorder]");
  if (reorder) {
    reorderOrder(reorder.dataset.reorder);
    return;
  }
  const toggle = event.target.closest("[data-toggle-password]");
  if (toggle) {
    const input = toggle.parentElement.querySelector("input");
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    toggle.textContent = show ? "Ocultar" : "Mostrar";
    toggle.setAttribute("aria-pressed", String(show));
    toggle.setAttribute("aria-label", show ? "Ocultar senha" : "Mostrar senha");
  }
});

els.authTabs.addEventListener("click", (event) => {
  const tab = event.target.closest("[data-auth-tab]");
  if (tab) setAuthView(tab.dataset.authTab);
});

els.authButton.addEventListener("click", () => openAuth(state.user ? "account" : "login"));
document.addEventListener("click", (event) => {
  if (!event.target.closest("[data-open-auth]")) return;
  closeNav();
  openAuth(state.user ? "account" : "login");
});

// Sessão iniciada ou encerrada em outra aba.
auth.onExternalChange(async () => {
  await loadUser();
  if (!els.authModal.hidden) renderAuth();
});

/* =========================================================
   Checkout simulado
   ========================================================= */

function openCheckout() {
  if (!state.cart.length) return;
  if (storePaused) {
    toast("A loja pausou os pedidos no momento. Tente novamente em instantes.");
    return;
  }

  // O ponto da carne é obrigatório; linhas antigas sem ele levam o cliente direto para a edição.
  const pending = state.cart.find(lineMissingDoneness);
  if (pending) {
    toast(`Escolha o ponto da carne de ${findProduct(pending.productId).name} para finalizar.`);
    openProduct(pending.productId, pending);
    return;
  }

  // Cliente conectado: preenche os campos vazios com os dados da conta (sem sobrescrever o que ele digitou).
  if (state.user) {
    const customer = state.checkout.customer;
    customer.name = customer.name || state.user.name;
    customer.phone = customer.phone || state.user.phone;
    customer.email = customer.email || state.user.email;
  }

  state.checkoutStep = 0;
  renderCheckout();
  closeCart(false);
  openModal(els.checkoutModal);
}

function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

function renderCheckout() {
  const labels = ["Dados", "Entrega", "Pagamento", "Revisão"];
  els.checkoutSteps.innerHTML = labels
    .map((label, index) => `<span class="${index <= state.checkoutStep ? "active" : ""}" title="${label}"></span>`)
    .join("");
  els.checkoutBack.style.visibility = state.checkoutStep === 0 ? "hidden" : "visible";
  els.checkoutNext.textContent = state.checkoutStep === 3 ? confirmLabel() : "Continuar";
  const customer = state.checkout.customer;

  if (state.checkoutStep === 0) {
    els.checkoutForm.innerHTML = `
      <div class="checkout-grid">
        <label>Nome
          <input name="name" value="${escapeHtml(customer.name)}" autocomplete="name" required>
        </label>
        <label>WhatsApp
          <input name="phone" value="${escapeHtml(customer.phone)}" inputmode="tel" autocomplete="tel" placeholder="(11) 99999-2026" required>
        </label>
      </div>
      <label>E-mail (opcional)
        <input name="email" type="email" value="${escapeHtml(customer.email)}" autocomplete="email" placeholder="voce@email.com">
      </label>
    `;
  }

  if (state.checkoutStep === 1) {
    const delivery = state.orderMode === "delivery";
    els.checkoutForm.innerHTML = `
      <div class="choice-grid">
        <label class="choice-card">
          <input type="radio" name="mode" value="delivery" ${delivery ? "checked" : ""}>
          Entrega com taxa por bairro
        </label>
        <label class="choice-card">
          <input type="radio" name="mode" value="pickup" ${delivery ? "" : "checked"}>
          Retirada grátis
        </label>
      </div>
      <div class="delivery-preview">
        <strong>Valores antes da confirmação</strong>
        ${Object.entries(deliveryFees).map(([name, fee]) => `<span>${escapeHtml(name)}: ${brl(fee)}</span>`).join("")}
        <span>Retirada: grátis</span>
      </div>
      <label data-delivery-only ${delivery ? "" : "hidden"}>Bairro
        <select name="district">
          ${Object.entries(deliveryFees)
            .map(([name, fee]) => `<option value="${escapeHtml(name)}" ${state.district === name ? "selected" : ""}>${escapeHtml(name)} - ${brl(fee)}</option>`)
            .join("")}
        </select>
      </label>
      <label data-delivery-only ${delivery ? "" : "hidden"}>Endereço
        <input name="address" value="${escapeHtml(state.checkout.fulfillment.address)}" autocomplete="street-address" placeholder="Rua, número e referência">
      </label>
      <label>Complemento ou observação
        <textarea name="complement" rows="3" placeholder="Apto, portaria, retirada no balcão...">${escapeHtml(state.checkout.fulfillment.complement)}</textarea>
      </label>
    `;
  }

  if (state.checkoutStep === 2) {
    const methods = ["Dinheiro", "Pix", "Débito", "Crédito"];
    els.checkoutForm.innerHTML = `
      <div class="choice-grid">
        ${methods
          .map(
            (method) => `
              <label class="choice-card">
                <input type="radio" name="payment" value="${method}" ${state.checkout.payment === method ? "checked" : ""}>
                ${method}
              </label>
            `,
          )
          .join("")}
      </div>
      <label data-cash-field ${state.checkout.payment === "Dinheiro" ? "" : "hidden"}>Troco para quanto?
        <input name="cashChange" value="${escapeHtml(state.checkout.cashChange)}" inputmode="decimal" placeholder="Ex.: R$ 100,00">
      </label>
      <p class="auth-note">O pagamento acontece na entrega ou na retirada.</p>
    `;
  }

  if (state.checkoutStep === 3) {
    const totals = getTotals();
    const delivery = state.orderMode === "delivery";
    const where = delivery ? `Entrega em ${state.district} — ${state.checkout.fulfillment.address}` : "Retirada grátis";
    const change = state.checkout.payment === "Dinheiro" && state.checkout.cashChange ? ` • troco para ${state.checkout.cashChange}` : "";
    els.checkoutForm.innerHTML = `
      <div class="review-box">
        <strong>${escapeHtml(customer.name || "Cliente")}</strong>
        <span>${escapeHtml(customer.phone || "WhatsApp não informado")}</span>
        <span>${escapeHtml(where)}</span>
        ${state.checkout.fulfillment.complement ? `<span>${escapeHtml(state.checkout.fulfillment.complement)}</span>` : ""}
        <span>Pagamento: ${escapeHtml(state.checkout.payment)}${escapeHtml(change)}</span>
      </div>
      <div class="review-box">
        ${state.cart
          .map((line) => {
            const product = findProduct(line.productId);
            const options = describeLine(line);
            return `<div class="cart-line"><span>${line.qty}× ${escapeHtml(product.name)}${options ? `<small>${escapeHtml(options)}</small>` : ""}</span><strong>${brl(line.qty * lineUnitPrice(line))}</strong></div>`;
          })
          .join("")}
        ${totalsMarkup(totals)}
      </div>
    `;
  }
}

function collectCheckoutStep() {
  const data = new FormData(els.checkoutForm);

  if (state.checkoutStep === 0) {
    const customer = {
      name: String(data.get("name") || "").trim(),
      phone: String(data.get("phone") || "").trim(),
      email: String(data.get("email") || "").trim(),
    };
    state.checkout.customer = customer;
    if (!customer.name || digitsOnly(customer.phone).length < 10) {
      toast("Informe nome e um WhatsApp com DDD para continuar.");
      return false;
    }
  }

  if (state.checkoutStep === 1) {
    state.orderMode = data.get("mode") === "pickup" ? "pickup" : "delivery";
    const district = String(data.get("district") || state.district);
    if (deliveryFees[district]) state.district = district;
    state.checkout.fulfillment = {
      address: String(data.get("address") || "").trim(),
      complement: String(data.get("complement") || "").trim(),
    };
    if (state.orderMode === "delivery" && !state.checkout.fulfillment.address) {
      toast("Informe o endereço para entrega.");
      return false;
    }
    const minCents = deliveryMin[state.district] || 0;
    if (state.orderMode === "delivery" && toCents(getTotals().subtotal) < minCents) {
      toast(`Pedido mínimo para ${state.district}: ${brl(minCents / 100)}.`);
      return false;
    }
  }

  if (state.checkoutStep === 2) {
    state.checkout.payment = String(data.get("payment") || state.checkout.payment);
    state.checkout.cashChange = state.checkout.payment === "Dinheiro" ? String(data.get("cashChange") || "").trim() : "";
  }

  storage.set("fornalha-checkout", state.checkout);
  persistCart();
  renderCart();
  return true;
}

function advanceCheckout() {
  if (state.checkoutStep < 3) {
    if (!collectCheckoutStep()) return;
    state.checkoutStep += 1;
    renderCheckout();
  } else {
    finishOrder();
  }
}

/*
  Monta o pedido no formato que o backend/painel receberão no futuro: já separa o cliente
  (`customerId`, vindo da conta quando há login), cada item com ponto da carne, adicionais,
  remoções e observação, e os totais. HOJE ele NÃO é enviado a lugar nenhum: serve só para o
  resumo simulado. Ao conectar o sistema de pedidos, é este objeto que deve ser enviado.
*/
function buildOrderPayload() {
  const totals = getTotals();
  return {
    customerId: state.user ? state.user.id : null,
    customer: { ...state.checkout.customer },
    fulfillment: {
      mode: state.orderMode,
      district: state.orderMode === "delivery" ? state.district : null,
      address: state.orderMode === "delivery" ? state.checkout.fulfillment.address : null,
      complement: state.checkout.fulfillment.complement,
    },
    payment: { method: state.checkout.payment, cashChange: state.checkout.cashChange },
    coupon: state.coupon || null,
    totals,
    items: state.cart.map((line) => {
      const product = findProduct(line.productId);
      const doneness = findDoneness(line.doneness);
      return {
        productId: product.id,
        name: product.name,
        qty: line.qty,
        unitPrice: lineUnitPrice(line),
        doneness: doneness ? { id: doneness.id, label: doneness.label } : null,
        addons: line.addons.map((id) => ({ id, name: findAddon(id).name, price: findAddon(id).price })),
        removals: [...line.removals],
        notes: line.notes,
      };
    }),
  };
}

const SERVER_MESSAGES = {
  "loja fechada": "A loja não está recebendo pedidos agora.",
  "entrega indisponivel": "A entrega está indisponível no momento.",
  "retirada indisponivel": "A retirada está indisponível no momento.",
  "pagamento invalido": "Escolha uma forma de pagamento válida.",
  "nome invalido": "Informe um nome válido.",
  "whatsapp invalido": "Informe um WhatsApp válido, com DDD.",
  "muitos pedidos em sequencia": "Você fez vários pedidos seguidos. Aguarde alguns minutos.",
  "produto indisponivel": "Algum item do carrinho não está mais disponível. Revise o carrinho.",
  "ponto da carne obrigatorio": "Escolha o ponto da carne de todos os hambúrgueres.",
  "remocao invalida": "Alguma remoção de ingrediente é inválida. Edite o item.",
  "adicional invalido": "Algum adicional não está disponível. Edite o item.",
  "area de entrega invalida": "Esse bairro não está disponível para entrega.",
  "endereco invalido": "Informe um endereço completo.",
  "pedido abaixo do minimo": "O pedido está abaixo do mínimo para este bairro.",
  "cupom invalido": "O cupom não é mais válido. Remova-o e tente de novo.",
  "quantidade invalida": "Quantidade inválida em algum item.",
  "itens invalidos": "O carrinho está vazio ou inválido.",
};

function serverMessage(error) {
  const detail = String((error && error.detail) || "").toLowerCase();
  const key = Object.keys(SERVER_MESSAGES).find((k) => detail.includes(k));
  if (key) return SERVER_MESSAGES[key];
  return error instanceof auth.AuthError ? error.message : "Não foi possível enviar o pedido. Tente novamente.";
}

function confirmLabel() {
  return auth.configured ? "Confirmar pedido" : "Confirmar pedido demo";
}

// Payload enviado ao servidor: só escolhas do cliente. Preços, taxa e desconto são recalculados lá.
function buildServerPayload() {
  const delivery = state.orderMode === "delivery";
  return {
    customer: { ...state.checkout.customer },
    fulfillment: {
      mode: state.orderMode,
      district: delivery ? state.district : null,
      address: delivery ? state.checkout.fulfillment.address : null,
      complement: state.checkout.fulfillment.complement,
    },
    payment: { method: state.checkout.payment, cashChange: state.checkout.cashChange },
    coupon: couponApplies(toCents(getTotals().subtotal)) ? state.coupon : null,
    items: state.cart.map((line) => ({
      productSlug: line.productId,
      qty: line.qty,
      doneness: line.doneness,
      addonSlugs: line.addons,
      removals: line.removals,
      notes: line.notes,
    })),
  };
}

let orderBusy = false;

async function finishOrder() {
  if (!state.cart.length || orderBusy) return;
  let serverOrder = null;

  if (auth.configured) {
    orderBusy = true;
    els.checkoutNext.disabled = true;
    els.checkoutNext.textContent = "Enviando…";
    try {
      serverOrder = await auth.rpc("create_order", { p_order: buildServerPayload() });
    } catch (error) {
      toast(serverMessage(error));
      return;
    } finally {
      orderBusy = false;
      els.checkoutNext.disabled = false;
      els.checkoutNext.textContent = confirmLabel();
    }
  }

  const t = serverOrder && serverOrder.totals;
  const totals = t
    ? { subtotal: t.subtotalCents / 100, discount: t.discountCents / 100, fee: t.deliveryFeeCents / 100, total: t.totalCents / 100 }
    : getTotals();
  const code = (serverOrder && serverOrder.orderNumber) || `F147-${Math.floor(1000 + Math.random() * 9000)}`;
  state.currentOrder = {
    code,
    real: Boolean(serverOrder),
    statusIndex: 0,
    totals,
    orderMode: state.orderMode,
    district: state.district,
    payment: state.checkout.payment,
    coupon: state.coupon,
    items: state.cart.map((line) => ({
      name: findProduct(line.productId).name,
      qty: line.qty,
      options: lineOptions(line).map((option) => option.text),
      total: lineUnitPrice(line) * line.qty,
    })),
  };
  state.cart = [];
  state.coupon = "";
  state.couponInfo = null;
  els.couponMessage.textContent = "";
  persistCart();
  renderCart();
  renderOrderModal();
  els.checkoutModal.hidden = true;
  openModal(els.orderModal);
}

function renderOrderModal() {
  const order = state.currentOrder;
  if (!order) return;
  const modeText = order.orderMode === "delivery" ? `Entrega em ${escapeHtml(order.district)}` : "Retirada no balcão";
  els.orderSummary.innerHTML = `
    <div class="review-box">
      <div class="price-row">
        <div>
          <p class="eyebrow">Número do pedido</p>
          <h3>${escapeHtml(order.code)}</h3>
        </div>
        <strong class="product-price">${brl(order.totals.total)}</strong>
      </div>
      <p class="cart-meta">${modeText} • ${escapeHtml(order.payment)}${order.real ? "" : " • fluxo demonstrativo"}</p>
      ${order.items
        .map(
          (item) =>
            `<div class="cart-line"><span>${item.qty}× ${escapeHtml(item.name)}${item.options.length ? `<small>${escapeHtml(item.options.join(" • "))}</small>` : ""}</span><strong>${brl(item.total)}</strong></div>`,
        )
        .join("")}
    </div>
    <div class="order-steps">
      ${statusSteps
        .map(
          (label, index) => `
            <div class="order-step ${index <= order.statusIndex ? "active" : ""}">
              <span>${index + 1}</span>
              <strong>${label}</strong>
            </div>
          `,
        )
        .join("")}
    </div>
    <p class="auth-note">Etapas simuladas para demonstrar a experiência visual, sem comunicação com cozinha ou entrega real.</p>
    <button class="secondary-btn full" type="button" data-next-order-status ${order.statusIndex >= statusSteps.length - 1 ? "disabled" : ""}>Simular próxima etapa</button>
  `;
  applyOrderModalMode(order);
}

// Pedido real: sem etapas simuladas; só o resumo e o aviso de que a loja confirma pelo WhatsApp.
function applyOrderModalMode(order) {
  const eyebrow = els.orderModal.querySelector(".eyebrow");
  const title = els.orderModal.querySelector("h2");
  if (eyebrow) eyebrow.textContent = order.real ? "Pedido recebido" : "Pedido demonstrativo";
  if (title) title.textContent = order.real ? "Pedido enviado!" : "Pedido simulado";
  if (!order.real) return;
  els.orderSummary.querySelector(".order-steps")?.remove();
  els.orderSummary.querySelector("[data-next-order-status]")?.remove();
  const note = els.orderSummary.querySelector(".auth-note");
  if (note) note.textContent = "A loja confirma seu pedido pelo WhatsApp informado. O pagamento é feito na entrega ou na retirada.";
}

els.orderModal.addEventListener("click", (event) => {
  if (event.target.closest("[data-next-order-status]") && state.currentOrder) {
    state.currentOrder.statusIndex = Math.min(statusSteps.length - 1, state.currentOrder.statusIndex + 1);
    renderOrderModal();
  }
});

els.startCheckout.addEventListener("click", openCheckout);
els.checkoutBack.addEventListener("click", () => {
  collectCheckoutStepQuietly();
  state.checkoutStep = Math.max(0, state.checkoutStep - 1);
  renderCheckout();
});
els.checkoutNext.addEventListener("click", advanceCheckout);

// Enter dentro do formulário avança a etapa em vez de recarregar a página.
els.checkoutForm.addEventListener("submit", (event) => {
  event.preventDefault();
  advanceCheckout();
});

// Guarda o que já foi digitado ao voltar, sem validar.
function collectCheckoutStepQuietly() {
  const data = new FormData(els.checkoutForm);
  if (state.checkoutStep === 0) {
    state.checkout.customer = {
      name: String(data.get("name") || "").trim(),
      phone: String(data.get("phone") || "").trim(),
      email: String(data.get("email") || "").trim(),
    };
  }
  if (state.checkoutStep === 1) {
    state.checkout.fulfillment = {
      address: String(data.get("address") || "").trim(),
      complement: String(data.get("complement") || "").trim(),
    };
  }
  if (state.checkoutStep === 2) {
    state.checkout.payment = String(data.get("payment") || state.checkout.payment);
    state.checkout.cashChange = String(data.get("cashChange") || "").trim();
  }
  storage.set("fornalha-checkout", state.checkout);
}

// Alternar entrega/retirada ou forma de pagamento só mostra/oculta campos: nada é re-renderizado,
// então o que o cliente já digitou não se perde.
els.checkoutForm.addEventListener("change", (event) => {
  const { name, value } = event.target;
  if (name === "mode") {
    state.orderMode = value === "pickup" ? "pickup" : "delivery";
    els.checkoutForm.querySelectorAll("[data-delivery-only]").forEach((field) => {
      field.hidden = state.orderMode !== "delivery";
    });
    persistCart();
    renderCart();
  }
  if (name === "district" && deliveryFees[value]) {
    state.district = value;
    persistCart();
    renderCart();
  }
  if (name === "payment") {
    els.checkoutForm.querySelectorAll("[data-cash-field]").forEach((field) => {
      field.hidden = value !== "Dinheiro";
    });
  }
});

/* =========================================================
   Cabeçalho, navegação, tema, FAQ e status da loja
   ========================================================= */

function closeNav() {
  document.body.classList.remove("nav-open");
  els.navToggle.setAttribute("aria-expanded", "false");
  els.navToggle.setAttribute("aria-label", "Abrir menu");
}

els.navToggle.addEventListener("click", () => {
  const open = document.body.classList.toggle("nav-open");
  els.navToggle.setAttribute("aria-expanded", String(open));
  els.navToggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
});

$("#mainNav").addEventListener("click", (event) => {
  if (event.target.closest("a")) closeNav();
});

document.addEventListener("click", (event) => {
  if (document.body.classList.contains("nav-open") && !event.target.closest(".site-header")) closeNav();
});

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("fornalha-theme", theme);
  } catch {
    /* ignorado */
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#120d0a" : "#fff8ee");
}

els.themeToggle.addEventListener("click", () => {
  applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
});

$("#faqList").addEventListener("click", (event) => {
  const question = event.target.closest(".faq-q");
  if (!question) return;
  const item = question.closest(".faq-item");
  const open = !item.classList.contains("open");
  item.classList.toggle("open", open);
  question.setAttribute("aria-expanded", String(open));
});

function renderStoreStatus() {
  const now = new Date();
  const day = now.getDay();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const opensToday = day !== 1;
  const isOpen = opensToday && minutes >= 18 * 60 && minutes <= 23 * 60 + 30;
  const label = els.storeStatus.querySelector("span:last-child");
  els.storeStatus.classList.toggle("closed", !isOpen);
  if (storePaused) {
    els.storeStatus.classList.add("closed");
    label.textContent = "Pedidos pausados no momento";
    return;
  }
  if (isOpen) label.textContent = "Aberto agora • 35-50 min";
  else if (opensToday && minutes < 18 * 60) label.textContent = "Fechado • abre às 18h";
  else if (day === 0) label.textContent = "Fechado • abre terça às 18h";
  else if (day === 1) label.textContent = "Fechado • abre terça às 18h";
  else label.textContent = "Fechado • abre amanhã às 18h";
}

/* =========================================================
   Inicialização
   ========================================================= */

els.district.innerHTML = Object.entries(deliveryFees)
  .map(([name, fee]) => `<option value="${name}">${name} - ${brl(fee)}</option>`)
  .join("");

els.cartPanel.inert = true;
renderStoreStatus();
renderTabs();
renderMenu();
renderCart();
renderAccountUI();
window.setInterval(renderStoreStatus, 60_000);

// Retorno de links enviados por e-mail (confirmação de cadastro / recuperação de senha).
async function initAuth() {
  const returned = auth.configured ? auth.consumeUrlSession() : null;
  await loadUser();

  if (returned?.type === "error") {
    toast("O link do e-mail expirou ou é inválido. Peça um novo e tente de novo.");
  } else if (returned?.type === "recovery" && state.user) {
    openAuth("reset");
  } else if (returned && state.user) {
    toast("E-mail confirmado. Você já está conectado.");
  }
  if (!state.user && new URLSearchParams(location.search).get("entrar")) openAuth("login");
}

initAuth();

/* =========================================================
   Catálogo, taxas e status da loja vindos do Supabase
   (sem configuração ou com falha, o cardápio local continua valendo)
   ========================================================= */

const CATEGORY_KEYS = { combos: "combos", hamburgueres: "burgers", acompanhamentos: "acompanhamentos", bebidas: "bebidas", sobremesas: "sobremesas" };

function fillDistricts() {
  els.district.innerHTML = Object.entries(deliveryFees)
    .map(([name, fee]) => `<option value="${escapeHtml(name)}">${escapeHtml(name)} - ${brl(fee)}</option>`)
    .join("");
}

async function loadRemoteCatalog() {
  if (!auth.configured) return;
  let changed = false;

  try {
    const [rows, addonRows, areas, catRows] = await Promise.all([
      auth.rest("products?select=slug,name,description,price_cents,promo_price_cents,image_url,ingredients,requires_doneness,sold_out,display_order,categories(slug),product_addon_groups(group_id)&active=eq.true&order=display_order"),
      auth.rest("addon_options?select=slug,name,price_cents,addon_groups!inner(id)&active=eq.true&order=display_order"),
      auth.rest("delivery_areas?select=name,fee_cents,min_order_cents&active=eq.true&order=name"),
      auth.rest("categories?select=slug,name,display_order&active=eq.true&order=display_order"),
    ]);

    if (Array.isArray(catRows) && catRows.length) {
      const known = new Map(menuOrder.map((section) => [section.id, section]));
      menuOrder.splice(
        0,
        menuOrder.length,
        ...catRows
          .filter((cat) => cat.slug)
          .map((cat) => {
            const old = known.get(cat.slug);
            return { id: cat.slug, title: cat.name, category: old ? old.category : cat.slug, hint: old ? old.hint : "" };
          }),
      );
      if (!menuOrder.some((section) => section.category === state.activeCategory)) state.activeCategory = menuOrder[0].category;
      changed = true;
    }

    if (Array.isArray(rows) && rows.length) {
      const local = new Map(products.map((product) => [product.id, product]));
      const next = [];
      rows.forEach((row) => {
        const section = menuOrder.find((item) => item.id === (row.categories && row.categories.slug));
        if (!section || !row.slug) return;
        const category = section.category;
        const old = local.get(row.slug) || {};
        next.push({
          id: row.slug,
          category,
          categoryLabel: section.title,
          name: row.name,
          price: (row.promo_price_cents ?? row.price_cents) / 100,
          image: row.image_url || old.image || "",
          fallback: old.fallback || "",
          desc: row.description || "",
          ingredients: Array.isArray(row.ingredients) ? row.ingredients : [],
          customizable: Array.isArray(row.product_addon_groups) && row.product_addon_groups.length > 0,
          doneness: Boolean(row.requires_doneness),
          donenessNote: old.donenessNote,
          tags: old.tags || [],
          soldOut: Boolean(row.sold_out),
        });
      });
      if (next.length) {
        products.splice(0, products.length, ...next);
        changed = true;
      }
    }

    const validAddons = (Array.isArray(addonRows) ? addonRows : []).filter((row) => row.slug);
    if (validAddons.length) {
      addons.splice(0, addons.length, ...validAddons.map((row) => ({ id: row.slug, name: row.name, price: row.price_cents / 100 })));
      changed = true;
    }

    if (Array.isArray(areas) && areas.length) {
      Object.keys(deliveryFees).forEach((key) => delete deliveryFees[key]);
      Object.keys(deliveryMin).forEach((key) => delete deliveryMin[key]);
      areas.forEach((area) => {
        deliveryFees[area.name] = area.fee_cents / 100;
        deliveryMin[area.name] = area.min_order_cents;
      });
      if (!deliveryFees[state.district]) state.district = Object.keys(deliveryFees)[0];
      fillDistricts();
      changed = true;
    }
  } catch {
    /* sem rede ou tabelas ainda não criadas: mantém o cardápio local */
  }

  try {
    const settings = await auth.rpc("get_public_store_settings", {});
    if (settings && typeof settings.open === "boolean") {
      storePaused = settings.open === false;
      renderStoreStatus();
    }
  } catch {
    /* mantém o horário local */
  }

  if (changed) {
    state.cart = state.cart.map(normalizeCartItem).filter(Boolean);
    persistCart();
    renderTabs();
    renderMenu();
    renderCart();
  }
}

// Cupom salvo no navegador: confirma de novo no servidor (o desconto nunca é confiado ao navegador).
async function restoreCoupon() {
  if (!auth.configured || !state.coupon || state.couponInfo) return;
  const result = await checkCoupon(state.coupon);
  if (result.valid) state.couponInfo = result.info;
  else state.coupon = "";
  persistCart();
  renderCart();
}

// Textos que só valem enquanto os pedidos eram simulados.
if (auth.configured) {
  const faq = document.querySelector("#faq-a-5 p");
  if (faq) faq.textContent = "Sim. Seu pedido é enviado à loja, que confirma pelo WhatsApp informado. O pagamento é feito na entrega ou na retirada.";
  const checkoutEyebrow = document.querySelector(".checkout-head .eyebrow");
  if (checkoutEyebrow) checkoutEyebrow.textContent = "Finalizar pedido";
  const footerNote = document.querySelector(".site-footer > p");
  if (footerNote) footerNote.textContent = "Pedidos enviados à loja • pagamento na entrega ou na retirada.";
}

loadRemoteCatalog().then(restoreCoupon);
