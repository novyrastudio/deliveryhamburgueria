"use strict";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const auth = window.FornalhaAuth;

const els = {
  shell: $("#adminShell"),
  sideNav: $("#sideNav"),
  pageTitle: $("#pageTitle"),
  headerDate: $("#headerDate"),
  globalSearch: $("#globalSearch"),
  viewRoot: $("#viewRoot"),
  menuToggle: $("#menuToggle"),
  mobileScrim: $("#mobileScrim"),
  soundToggle: $("#soundToggle"),
  notifyBtn: $("#notifyBtn"),
  profileBtn: $("#profileBtn"),
  drawerBackdrop: $("#drawerBackdrop"),
  orderDrawer: $("#orderDrawer"),
  modalBackdrop: $("#modalBackdrop"),
  modalPanel: $("#modalPanel"),
  confirmBackdrop: $("#confirmBackdrop"),
  confirmTitle: $("#confirmTitle"),
  confirmText: $("#confirmText"),
  toastStack: $("#toastStack"),
};

const STORAGE_KEY = "brasa-admin-prototype-v2";

const storage = {
  read() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    } catch {
      return null;
    }
  },
  write(value) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch {
      /* Persistência demonstrativa indisponível neste navegador. */
    }
  },
};

const navItems = [
  { id: "overview", label: "Visão geral", icon: "grid" },
  { id: "orders", label: "Pedidos", icon: "receipt" },
  { id: "products", label: "Produtos", icon: "burger" },
  { id: "categories", label: "Categorias", icon: "layers" },
  { id: "addons", label: "Adicionais", icon: "plus" },
  { id: "coupons", label: "Cupons", icon: "ticket" },
  { id: "delivery", label: "Áreas de entrega", icon: "map" },
  { id: "banners", label: "Banners e promoções", icon: "image" },
  { id: "settings", label: "Configurações", icon: "settings" },
];

const statusMeta = {
  new: { label: "Novo", className: "status-new" },
  confirmed: { label: "Confirmado", className: "status-confirmed" },
  prep: { label: "Em preparo", className: "status-prep" },
  delivery: { label: "Em entrega", className: "status-delivery" },
  done: { label: "Entregue", className: "status-confirmed" },
  rejected: { label: "Recusado", className: "status-paused" },
  active: { label: "Ativo", className: "status-confirmed" },
  inactive: { label: "Inativo", className: "status-muted" },
  exhausted: { label: "Esgotado", className: "status-paused" },
  scheduled: { label: "Agendado", className: "status-scheduled" },
  expired: { label: "Expirado", className: "status-expired" },
  ended: { label: "Encerrado", className: "status-expired" },
};

const imageOptions = [
  "assets/brasa-bacon.jpg",
  "assets/x-bacon-brasa.jpg",
  "assets/burger-costela.jpg",
  "assets/brasa-salad.jpg",
  "assets/combo-fornalha.jpg",
  "assets/batata-brasa.jpg",
  "assets/refri-artesanal.jpg",
  "assets/brownie-brasa.jpg",
  "assets/pudim-ambar.jpg",
  "assets/aneis-de-cebola.jpg",
  "assets/batata-com-cheddar-e-bacon.jpg",
  "assets/refrigerante-lata.jpg",
  "assets/milkshake-de-chocolate.jpg",
  "assets/sundae-de-doce-de-leite.jpg",
  "assets/cookie-recheado.jpg",
  "assets/suco-de-laranja.jpg",
];

const defaults = {
  orders: [
    {
      id: "p1098",
      number: "#1098",
      status: "new",
      elapsed: "04 min",
      customer: "Rafael Nunes",
      phone: "(11) 98844-1200",
      itemsCount: 3,
      mode: "Entrega",
      total: 86.7,
      subtotal: 79.8,
      deliveryFee: 8.9,
      discount: 2,
      address: "Rua das Acácias, 142 - Jardins",
      reference: "Portão preto, casa 2",
      eta: "35-45 min",
      payment: "Pix na entrega",
      change: "",
      timeline: ["Pedido recebido", "Aguardando confirmação"],
      items: [
        { name: "Brasa Bacon", qty: 1, price: 38.9, notes: "Ao ponto para mal", addons: "Bacon extra" },
        { name: "Batata Brasa", qty: 1, price: 24.9, notes: "Molho separado", addons: "Cheddar" },
        { name: "Refri Artesanal", qty: 1, price: 12.9, notes: "", addons: "" },
      ],
    },
    {
      id: "p1097",
      number: "#1097",
      status: "new",
      elapsed: "07 min",
      customer: "Camila Rocha",
      phone: "(11) 99774-8801",
      itemsCount: 2,
      mode: "Retirada",
      total: 73.8,
      subtotal: 73.8,
      deliveryFee: 0,
      discount: 0,
      address: "Retirada no balcão",
      reference: "Chega em 20 min",
      eta: "20-25 min",
      payment: "Crédito na retirada",
      change: "",
      timeline: ["Pedido recebido", "Cliente escolheu retirada"],
      items: [
        { name: "Burger de Costela", qty: 1, price: 42.9, notes: "Ao ponto", addons: "Cheddar cremoso" },
        { name: "Onion Rings", qty: 1, price: 21.9, notes: "", addons: "Molho da casa" },
      ],
    },
    {
      id: "p1096",
      number: "#1096",
      status: "confirmed",
      elapsed: "12 min",
      customer: "Patrícia Lima",
      phone: "(11) 91220-4433",
      itemsCount: 4,
      mode: "Entrega",
      total: 112.4,
      subtotal: 106.5,
      deliveryFee: 5.9,
      discount: 0,
      address: "Av. Vila Nova, 905 - Vila Nova",
      reference: "Apartamento 72",
      eta: "30-40 min",
      payment: "Dinheiro",
      change: "Troco para R$ 150,00",
      timeline: ["Pedido recebido", "Pedido confirmado"],
      items: [
        { name: "Combo Casal", qty: 1, price: 68.9, notes: "Dois burgers ao ponto", addons: "Molho extra" },
        { name: "Brownie da Brasa", qty: 2, price: 18.9, notes: "", addons: "" },
      ],
    },
    {
      id: "p1095",
      number: "#1095",
      status: "prep",
      elapsed: "18 min",
      customer: "Gustavo Prado",
      phone: "(11) 93330-1414",
      itemsCount: 2,
      mode: "Entrega",
      total: 54.8,
      subtotal: 48.9,
      deliveryFee: 5.9,
      discount: 0,
      address: "Rua Ibirapuera, 67 - Centro",
      reference: "Recepção do coworking",
      eta: "15-20 min",
      payment: "Débito",
      change: "",
      timeline: ["Pedido recebido", "Pedido confirmado", "Em preparação"],
      items: [
        { name: "Duplo Cheddar", qty: 1, price: 39.9, notes: "Sem picles", addons: "" },
        { name: "Refri Artesanal", qty: 1, price: 12.9, notes: "", addons: "" },
      ],
    },
    {
      id: "p1094",
      number: "#1094",
      status: "prep",
      elapsed: "22 min",
      customer: "Lia Martins",
      phone: "(11) 98777-9012",
      itemsCount: 1,
      mode: "Retirada",
      total: 33.9,
      subtotal: 33.9,
      deliveryFee: 0,
      discount: 0,
      address: "Retirada no balcão",
      reference: "Nome na embalagem: Lia",
      eta: "10-15 min",
      payment: "Pix",
      change: "",
      timeline: ["Pedido recebido", "Pedido confirmado", "Em preparação"],
      items: [{ name: "Frango Crocante", qty: 1, price: 33.9, notes: "Molho à parte", addons: "" }],
    },
    {
      id: "p1093",
      number: "#1093",
      status: "delivery",
      elapsed: "31 min",
      customer: "Thiago Alves",
      phone: "(11) 91114-3333",
      itemsCount: 3,
      mode: "Entrega",
      total: 91.6,
      subtotal: 84.7,
      deliveryFee: 6.9,
      discount: 0,
      address: "Rua Aurora, 331 - Centro",
      reference: "Prédio azul",
      eta: "5-10 min",
      payment: "Crédito",
      change: "",
      timeline: ["Pedido recebido", "Pedido confirmado", "Em preparação", "Saiu para entrega"],
      items: [
        { name: "Smash Clássico", qty: 2, price: 27.9, notes: "", addons: "Cheddar" },
        { name: "Batata Brasa", qty: 1, price: 24.9, notes: "", addons: "" },
      ],
    },
  ],
  products: [
    { id: "brasa-bacon", name: "Brasa Bacon", category: "Hambúrgueres", badge: "MAIS PEDIDO", desc: "Blend 160g, cheddar, bacon tostado, molho de brasa e pão selado.", price: 38.9, promo: "", image: "assets/brasa-bacon.jpg", active: true, soldOut: false, featured: true, prep: 18, ingredients: "Blend 160g, cheddar, bacon, molho de brasa", addons: "Extras, Molhos", code: "BB-001" },
    { id: "duplo-cheddar", name: "Duplo Cheddar", category: "Hambúrgueres", badge: "CHAPA", desc: "Dois smashs, cheddar cremoso, cebola caramelizada e picles.", price: 39.9, promo: "", image: "assets/x-bacon-brasa.jpg", active: true, soldOut: false, featured: false, prep: 16, ingredients: "2 smashs, cheddar, cebola, picles", addons: "Extras", code: "BB-002" },
    { id: "burger-costela", name: "Burger de Costela", category: "Hambúrgueres", badge: "PREMIUM", desc: "Burger alto, queijo âmbar, cebola na chapa e barbecue da casa.", price: 42.9, promo: "", image: "assets/burger-costela.jpg", active: true, soldOut: false, featured: true, prep: 20, ingredients: "Costela, queijo âmbar, barbecue", addons: "Ponto da carne, Extras", code: "BB-003" },
    { id: "frango-crocante", name: "Frango Crocante", category: "Hambúrgueres", badge: "NOVO", desc: "Filé de frango empanado, alface, tomate e maionese defumada.", price: 33.9, promo: "", image: "assets/brasa-salad.jpg", active: true, soldOut: false, featured: false, prep: 17, ingredients: "Frango empanado, alface, tomate", addons: "Molhos", code: "BB-004" },
    { id: "smash-classico", name: "Smash Clássico", category: "Hambúrgueres", badge: "CLÁSSICO", desc: "Smash 100g, queijo prato, picles e molho da casa.", price: 27.9, promo: "", image: "assets/x-bacon-brasa.jpg", active: true, soldOut: false, featured: false, prep: 12, ingredients: "Smash, queijo, picles", addons: "Extras", code: "BB-005" },
    { id: "combo-casal", name: "Combo Casal", category: "Combos", badge: "COMBO", desc: "Dois burgers, batata grande e duas bebidas geladas.", price: 89.9, promo: "79.9", image: "assets/combo-fornalha.jpg", active: true, soldOut: false, featured: true, prep: 24, ingredients: "2 burgers, batata, 2 bebidas", addons: "Ponto da carne, Extras", code: "CB-001" },
    { id: "batata-brasa", name: "Batata Brasa", category: "Porções", badge: "PORÇÃO", desc: "Batata rústica crocante com páprica defumada e molho especial.", price: 24.9, promo: "", image: "assets/batata-brasa.jpg", active: true, soldOut: false, featured: false, prep: 10, ingredients: "Batata, páprica, molho", addons: "Molhos", code: "AC-001" },
    { id: "onion-rings", name: "Onion Rings", category: "Porções", badge: "CROCANTE", desc: "Anéis empanados e sequinhos, servidos com maionese de ervas.", price: 21.9, promo: "", image: "assets/batata-brasa.jpg", active: true, soldOut: true, featured: false, prep: 9, ingredients: "Cebola empanada, molho", addons: "Molhos", code: "AC-002" },
  ],
  categories: [
    { id: "cat1", name: "Mais pedidos", products: 6, active: true, order: 1, icon: "Fogo" },
    { id: "cat2", name: "Hambúrgueres", products: 14, active: true, order: 2, icon: "Burger" },
    { id: "cat3", name: "Combos", products: 5, active: true, order: 3, icon: "Combo" },
    { id: "cat4", name: "Porções", products: 7, active: true, order: 4, icon: "Batata" },
    { id: "cat5", name: "Bebidas", products: 8, active: true, order: 5, icon: "Copo" },
    { id: "cat6", name: "Sobremesas", products: 4, active: false, order: 6, icon: "Doce" },
  ],
  addons: [],
  coupons: [
    { id: "cup1", code: "BRASA15", type: "Percentual", value: "15%", min: "R$ 35,00", uses: 82, limit: 200, expires: "31/08/2026", status: "active" },
    { id: "cup2", code: "PRIMEIRACOMPRA", type: "Valor fixo", value: "R$ 12,00", min: "R$ 45,00", uses: 37, limit: 120, expires: "15/09/2026", status: "scheduled" },
    { id: "cup3", code: "COMBO20", type: "Percentual", value: "20%", min: "R$ 80,00", uses: 119, limit: 150, expires: "05/07/2026", status: "expired" },
  ],
  delivery: [
    { id: "reg1", name: "Centro", fee: 6.9, extra: "0-5 min", min: 20, status: "active", coverage: "01000-000 a 01099-999" },
    { id: "reg2", name: "Jardins", fee: 8.9, extra: "8-12 min", min: 25, status: "active", coverage: "01400-000 a 01499-999" },
    { id: "reg3", name: "Vila Nova", fee: 5.9, extra: "5-8 min", min: 20, status: "active", coverage: "04500-000 a 04599-999" },
  ],
  banners: [],
  settings: {
    store: { name: "Brasa Burger", cnpj: "", phone: "", whatsapp: "", email: "", address: "" },
    operation: { open: true, avgMin: 30, avgMax: 45, minOrder: "20,00", pauseReason: "" },
    hours: { enforce: false, note: "", days: [] },
    payment: { pix: true, cards: true, cash: true },
    fulfillment: { delivery: true, pickup: true, pickupInfo: "" },
    notifications: { sound: true, visual: true },
  },
};

const persisted = storage.read();
const data = structuredClone(defaults); // tudo vem do banco; o navegador só lembra do som

data.orders = []; // pedidos vêm do banco, nunca do navegador
data.products = []; // catálogo vem do banco
data.categories = [];
data.coupons = [];
data.admins = []; // administradores vêm do banco (profiles)

const BASE_TITLE = document.title;

const state = {
  view: "overview",
  query: "",
  sound: typeof persisted?.sound === "boolean" ? persisted.sound : true,
  orderFilter: "all",
  productCategory: "all",
  productAvailability: "all",
  settingsTab: "store",
  storeOpen: data.settings.operation.open,
  modalImage: "",
  adminProfile: null,
  orders: [],
  seen: new Set(),
  dragId: null,
  drawerId: null,
  pending: new Set(),
  pollTimer: null,
  pollBusy: false,
  confirm: null,
  loadingTimer: null,
};

function persist() {
  storage.write({ sound: state.sound });
}

// Só aceita imagens do próprio site, https ou data:image. Evita injeção em src/style.
function safeImg(value) {
  const v = String(value || "");
  if (/^assets\/[\w./-]{1,120}$/.test(v)) return v;
  if (/^https:\/\/[^\s"'()<>\\]{1,500}$/.test(v)) return v;
  if (/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]{1,2500000}$/.test(v)) return v;
  return "assets/brasa-bacon.jpg";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function money(value) {
  return brl.format(Number(value) || 0);
}

function icon(name) {
  const paths = {
    grid: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>',
    receipt: '<path d="M6 3h12v18l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2L6 21V3Z"/><path d="M9 8h6M9 12h6M9 16h4"/>',
    burger: '<path d="M4 12h16M5 16h14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2Z"/><path d="M5 10a7 7 0 0 1 14 0M7 8h.01M11 7h.01M15 8h.01"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    ticket: '<path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3a2 2 0 1 0 0 4v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3a2 2 0 1 0 0-4V7Z"/><path d="M13 5v14"/>',
    map: '<path d="m9 18-6 3V6l6-3 6 3 6-3v15l-6 3-6-3Z"/><path d="M9 3v15M15 6v15"/>',
    image: '<path d="M4 5h16v14H4z"/><path d="m4 15 4-4 4 4 3-3 5 5"/><circle cx="15" cy="9" r="1"/>',
    settings: '<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1-2 3.4-.2-.1a1.7 1.7 0 0 0-1.9.1 8 8 0 0 1-1.5.9 1.7 1.7 0 0 0-1 1.5V23H9v-.3a1.7 1.7 0 0 0-1-1.5 8 8 0 0 1-1.5-.9 1.7 1.7 0 0 0-1.9-.1l-.2.1-2-3.4.1-.1A1.7 1.7 0 0 0 2.6 15 8 8 0 0 1 2 13.2 1.7 1.7 0 0 0 .7 12H.5V8h.2A1.7 1.7 0 0 0 2 6.8 8 8 0 0 1 2.6 5a1.7 1.7 0 0 0-.3-1.8l-.1-.1 2-3.4.2.1a1.7 1.7 0 0 0 1.9-.1 8 8 0 0 1 1.5-.9 1.7 1.7 0 0 0 1-1.5V-3h4v.3a1.7 1.7 0 0 0 1 1.5 8 8 0 0 1 1.5.9 1.7 1.7 0 0 0 1.9.1l.2-.1 2 3.4-.1.1A1.7 1.7 0 0 0 19.4 5c.3.6.5 1.2.6 1.8A1.7 1.7 0 0 0 21.3 8h.2v4h-.2a1.7 1.7 0 0 0-1.3 1.2c-.1.6-.3 1.2-.6 1.8Z" transform="translate(1.5 2) scale(.86)"/>',
    bell: '<path d="M18 9a6 6 0 1 0-12 0c0 7-2 7-2 9h16c0-2-2-2-2-9Z"/><path d="M10 21h4"/>',
    edit: '<path d="M4 20h4l11-11-4-4L4 16v4Z"/><path d="m13 7 4 4"/>',
    copy: '<path d="M8 8h11v11H8z"/><path d="M5 16H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v1"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3"/>',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.grid}</svg>`;
}

function statusBadge(status) {
  const meta = statusMeta[status] || statusMeta.inactive;
  return `<span class="status-badge ${meta.className}">${meta.label}</span>`;
}

function toast(message, tone = "success") {
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  if (tone === "error") node.style.borderColor = "rgba(255, 93, 86, .55)";
  els.toastStack.append(node);
  window.setTimeout(() => node.remove(), 3200);
}

function todayLabel() {
  const date = new Date();
  return date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).toUpperCase();
}

function saveAndRender(message) {
  persist();
  renderCurrent();
  if (message) toast(message);
}

function renderNav() {
  els.sideNav.innerHTML = navItems
    .map(
      (item) => `
        <button class="nav-item ${state.view === item.id ? "active" : ""}" type="button" data-view="${item.id}">
          ${icon(item.icon)}
          <span>${item.label}</span>
          ${item.id === "orders" && newOrdersCount() > 0 ? `<span class="badge">${newOrdersCount()}</span>` : ""}
        </button>
      `,
    )
    .join("");
}

function closeMobileNav() {
  document.body.classList.remove("nav-open");
  els.mobileScrim.hidden = true;
  els.menuToggle.setAttribute("aria-expanded", "false");
  els.menuToggle.setAttribute("aria-label", "Abrir menu");
}

function openMobileNav() {
  document.body.classList.add("nav-open");
  els.mobileScrim.hidden = false;
  els.menuToggle.setAttribute("aria-expanded", "true");
  els.menuToggle.setAttribute("aria-label", "Fechar menu");
}

function showSkeleton() {
  els.viewRoot.innerHTML = `
    <section class="skeleton-wrap" aria-label="Carregando">
      <div class="skeleton"></div>
      <div class="metrics-grid">
        <div class="skeleton"></div>
        <div class="skeleton"></div>
        <div class="skeleton"></div>
        <div class="skeleton"></div>
      </div>
    </section>
  `;
}

function initials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return (parts[0]?.[0] || "A") + (parts[1]?.[0] || "D");
}

function updateAdminHeader(profile) {
  const name = profile?.name || "Administrador";
  $(".avatar", els.profileBtn).textContent = initials(name).toUpperCase();
  $(".profile-copy strong", els.profileBtn).textContent = name;
  $(".profile-copy small", els.profileBtn).textContent = "Administrador";
}

function renderAccessGate({ title, text, detail = "", actionHref = "index.html", actionLabel = "Ir para login" }) {
  document.body.classList.add("admin-locked");
  els.pageTitle.textContent = "Acesso administrativo";
  els.viewRoot.innerHTML = `
    <section class="access-gate" aria-labelledby="accessGateTitle">
      <div>
        <p class="eyebrow">SEGURANÇA</p>
        <h2 id="accessGateTitle">${escapeHtml(title)}</h2>
        <p>${escapeHtml(text)}</p>
        ${detail ? `<small>${escapeHtml(detail)}</small>` : ""}
      </div>
      <a class="primary-action" href="${escapeHtml(actionHref)}">${escapeHtml(actionLabel)}</a>
    </section>
  `;
}

async function requireAdminAccess() {
  document.body.classList.remove("admin-locked");
  showSkeleton();

  if (!auth || !auth.configured) {
    renderAccessGate({
      title: "Supabase ainda não configurado.",
      text: "O painel real precisa de auth.url e auth.anonKey em config.js. Sem isso, não há como validar sessão nem papel administrativo com segurança.",
      detail: "Depois de configurar o Supabase e executar schema.sql, crie uma conta e promova esse e-mail para role = admin.",
      actionHref: "BACKEND.md",
      actionLabel: "Ver instruções",
    });
    return false;
  }

  const returned = auth.consumeUrlSession();
  if (returned?.type === "error") {
    renderAccessGate({
      title: "Link de acesso inválido.",
      text: "O link de e-mail expirou ou foi recusado pelo serviço de autenticação.",
      actionHref: "index.html",
      actionLabel: "Entrar novamente",
    });
    return false;
  }

  try {
    const session = await auth.getSession();
    if (!session) {
      renderAccessGate({
        title: "Entre com uma conta administradora.",
        text: "A área administrativa exige sessão real do Supabase. Entre com uma conta promovida para admin.",
        actionHref: "index.html?entrar=admin",
        actionLabel: "Entrar",
      });
      return false;
    }

    const profile = await auth.getProfile();
    if (!profile || profile.role !== "admin") {
      renderAccessGate({
        title: "Acesso negado.",
        text: "Esta conta não tem permissão administrativa. O bloqueio vem do perfil salvo no banco, não de uma regra visual do navegador.",
        actionHref: "index.html",
        actionLabel: "Voltar para a loja",
      });
      return false;
    }

    state.adminProfile = profile;
    updateAdminHeader(profile);
    document.body.classList.remove("admin-locked");
    return true;
  } catch (error) {
    renderAccessGate({
      title: "Não foi possível validar o acesso.",
      text: error instanceof auth.AuthError ? error.message : "Falha inesperada ao consultar o serviço de autenticação.",
      actionHref: "index.html",
      actionLabel: "Voltar para login",
    });
    return false;
  }
}

function setView(view, withSkeleton = true) {
  state.view = view;
  state.query = "";
  els.globalSearch.value = "";
  closeMobileNav();
  renderNav();
  const item = navItems.find((entry) => entry.id === view);
  els.pageTitle.textContent = item ? item.label : "Painel";
  if (withSkeleton) {
    showSkeleton();
    clearTimeout(state.loadingTimer);
    state.loadingTimer = window.setTimeout(renderCurrent, 160);
  } else {
    renderCurrent();
  }
}

function renderCurrent(options = {}) {
  els.headerDate.textContent = todayLabel();
  renderNav();
  const renderers = {
    overview: renderOverview,
    orders: renderOrders,
    products: renderProducts,
    categories: renderCategories,
    addons: renderAddons,
    coupons: renderCoupons,
    delivery: renderDelivery,
    banners: renderBanners,
    settings: renderSettings,
  };
  els.viewRoot.innerHTML = (renderers[state.view] || renderOverview)();
  if (!options.silent) els.viewRoot.focus({ preventScroll: true });
}

function matchesQuery(values) {
  const q = normalize(state.query);
  if (!q) return true;
  return values.some((value) => normalize(value).includes(q));
}

function metricCard(label, value, hint, tone, iconName) {
  return `
    <article class="metric-card">
      <div class="metric-top">
        <span>${label}</span>
        <span class="metric-icon ${tone}">${icon(iconName)}</span>
      </div>
      <strong class="metric-value">${value}</strong>
      <small class="${hint.includes("↑") ? "positive" : hint.includes("atenção") ? "attention" : ""}">${hint}</small>
    </article>
  `;
}

function orderStatusLabel(status) {
  return statusMeta[status]?.label || status;
}

function newOrdersCount() {
  return state.orders.filter((order) => order.status === "new").length;
}

function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}

function activeOrders() {
  return state.orders.filter((order) => order.status !== "rejected");
}

function ordersBetween(from, to) {
  return activeOrders().filter((order) => {
    const t = new Date(order.createdAt).getTime();
    return t >= from.getTime() && t < to.getTime();
  });
}

function renderRecentOrders() {
  const recent = activeOrders().slice(0, 5);
  if (!recent.length) return '<div class="empty-state">Nenhum pedido recebido ainda.</div>';
  return recent
    .map(
      (order) => `
        <button class="recent-order" type="button" data-open-order="${escapeHtml(order.id)}">
          <span class="order-number">${escapeHtml(order.number)}</span>
          <span><strong>${escapeHtml(order.customer)}</strong><small class="meta">${plural(order.itemsCount, "item", "itens")} • ${order.mode}</small></span>
          ${statusBadge(order.status)}
          <strong>${money(order.total)}</strong>
        </button>
      `,
    )
    .join("");
}

function renderOverview() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayOrders = ordersBetween(today, tomorrow);
  const revenueToday = todayOrders.reduce((sum, order) => sum + order.total, 0);
  const waiting = newOrdersCount();
  const inPrep = state.orders.filter((order) => order.status === "prep").length;
  const queue = state.orders.filter((order) => ["new", "confirmed", "prep"].includes(order.status)).length;

  const labels = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const dayTotals = days.map((d) => {
    const end = new Date(d);
    end.setDate(end.getDate() + 1);
    return ordersBetween(d, end).reduce((sum, order) => sum + order.total, 0);
  });
  const weekTotal = dayTotals.reduce((a, b) => a + b, 0);
  const maxDay = Math.max(...dayTotals, 1);
  const bestDay = dayTotals.indexOf(Math.max(...dayTotals));
  const bars = days.map((d, i) => [labels[d.getDay()], Math.max(4, Math.round((dayTotals[i] / maxDay) * 100)), i === bestDay && dayTotals[i] > 0]);

  const sold = new Map();
  activeOrders().forEach((order) =>
    order.items.forEach((item) => {
      const row = sold.get(item.name) || { qty: 0, total: 0 };
      row.qty += Number(item.qty) || 0;
      row.total += (Number(item.qty) || 0) * item.price;
      sold.set(item.name, row);
    }),
  );
  const topProducts = [...sold.entries()].sort((a, b) => b[1].qty - a[1].qty).slice(0, 4);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const firstName = String(state.adminProfile?.name || "").trim().split(/\s+/)[0] || "equipe";
  const summary = waiting
    ? `Você tem <strong>${plural(waiting, "pedido aguardando", "pedidos aguardando")} confirmação</strong>.`
    : "Nenhum pedido aguardando confirmação no momento.";

  return `
    <section class="view">
      <article class="hero-admin">
        <div>
          <p class="eyebrow">RESUMO DO DIA</p>
          <h2>${greeting}, ${escapeHtml(firstName)}.</h2>
          <p>${summary}</p>
        </div>
        <span class="live-pill"><span class="live-dot"></span>Atualiza sozinho</span>
      </article>

      <section class="metrics-grid" aria-label="Métricas do dia">
        ${metricCard("Pedidos hoje", String(todayOrders.length), `Ontem: ${ordersBetween(yesterday, today).length}`, "", "receipt")}
        ${metricCard("Aguardando", String(waiting), waiting ? "Precisam de atenção" : "Nenhum aguardando", "amber", "bell")}
        ${metricCard("Em preparação", String(inPrep), `${state.orders.filter((o) => o.status === "confirmed").length} confirmados`, "blue", "settings")}
        ${metricCard("Faturamento", money(revenueToday), "Pedidos de hoje, sem recusados", "green", "ticket")}
      </section>

      <section class="dashboard-grid">
        <article class="panel tall">
          <div class="panel-head">
            <div><p class="eyebrow">TEMPO REAL</p><h2 class="panel-title">Pedidos recentes</h2></div>
            <button class="panel-link" type="button" data-view="orders">Ver todos</button>
          </div>
          <div class="recent-list">${renderRecentOrders()}</div>
        </article>

        <article class="panel">
          <div class="panel-head">
            <div><p class="eyebrow">ÚLTIMOS 7 DIAS</p><h2 class="panel-title">Faturamento semanal</h2></div>
          </div>
          <div class="price-row"><strong class="metric-value">${money(weekTotal)}</strong><span class="meta">${plural(ordersBetween(days[0], tomorrow).length, "pedido", "pedidos")}</span></div>
          <div class="bar-chart">${bars
            .map(
              ([day, height, hot]) => `
                <div class="bar-item ${hot ? "hot" : ""}">
                  <div class="bar-track"><span class="bar-fill" style="height:${height}%"></span></div>
                  <strong>${day}</strong>
                </div>
              `,
            )
            .join("")}</div>
        </article>

        <article class="panel">
          <div class="panel-head"><div><p class="eyebrow">ÚLTIMOS 7 DIAS</p><h2 class="panel-title">Mais vendidos</h2></div></div>
          <div class="ranking-list">${
            topProducts.length
              ? topProducts
                  .map(([name, row], index) => {
                    const product = data.products.find((item) => item.name === name);
                    return `
                <div class="rank-row">
                  <b>${index + 1}</b>
                  <img src="${escapeHtml(safeImg(product?.image))}" alt="${escapeHtml(name)}" />
                  <span><strong>${escapeHtml(name)}</strong><small class="meta">${plural(row.qty, "venda", "vendas")}</small></span>
                  <strong>${money(row.total)}</strong>
                </div>`;
                  })
                  .join("")
              : '<div class="empty-state">Ainda sem vendas no período.</div>'
          }</div>
        </article>

        <article class="panel">
          <div class="panel-head"><div><p class="eyebrow">OPERAÇÃO</p><h2 class="panel-title">Status da loja</h2></div></div>
          <div class="store-status-body">
            <div class="status-large">
              <span class="store-line"><span class="status-dot ${state.storeOpen ? "" : "paused"}"></span><strong>${state.storeOpen ? "Recebendo pedidos" : "Pedidos pausados"}</strong></span>
              ${statusBadge(state.storeOpen ? "active" : "scheduled")}
            </div>
            <div class="info-grid">
              <div class="info-box"><span>Hoje</span><strong>${todayHoursLabel()}</strong></div>
              <div class="info-box"><span>Tempo médio</span><strong>${data.settings.operation.avgMin}-${data.settings.operation.avgMax} min</strong></div>
              <div class="info-box"><span>Pedido mínimo</span><strong>R$ ${escapeHtml(data.settings.operation.minOrder)}</strong></div>
              <div class="info-box"><span>Fila atual</span><strong>${plural(queue, "pedido", "pedidos")}</strong></div>
            </div>
            <button class="${state.storeOpen ? "danger-btn" : "primary-action"}" type="button" data-action="toggle-store">${state.storeOpen ? "Pausar pedidos" : "Retomar pedidos"}</button>
          </div>
        </article>
      </section>
    </section>
  `;
}

function filteredOrders() {
  return state.orders.filter((order) => {
    if (!matchesQuery([order.number, order.customer, order.phone, order.mode, orderStatusLabel(order.status)])) return false;
    if (state.orderFilter === "all") return order.status !== "rejected";
    return order.status === state.orderFilter;
  });
}

function orderCard(order) {
  const next = nextAction(order);
  const active = !["done", "rejected"].includes(order.status);
  const when = active
    ? `<span class="elapsed" data-created="${escapeHtml(order.createdAt)}">${elapsedLabel(order.createdAt)}</span>`
    : `<span class="meta">${new Date(order.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>`;
  return `
    <div class="order-card" role="button" tabindex="0" draggable="true" data-open-order="${escapeHtml(order.id)}">
      <div class="order-card-top">
        <span class="order-number">${escapeHtml(order.number)}</span>
        ${when}
      </div>
      <strong>${escapeHtml(order.customer)}</strong>
      <span class="meta">${plural(order.itemsCount, "item", "itens")} • ${order.mode}</span>
      <div class="order-card-bottom">
        ${statusBadge(order.status)}
        <strong>${money(order.total)}</strong>
      </div>
      ${next ? `<button class="soft-action" type="button" data-advance="${escapeHtml(order.id)}">${escapeHtml(next.label)} →</button>` : ""}
    </div>
  `;
}

function renderOrders() {
  const visible = activeOrders();
  const counts = {
    all: visible.length,
    new: visible.filter((order) => order.status === "new").length,
    prep: visible.filter((order) => order.status === "prep").length,
    delivery: visible.filter((order) => order.status === "delivery").length,
  };
  const columns = [
    ["new", "Novos"],
    ["confirmed", "Confirmados"],
    ["prep", "Em preparação"],
    ["delivery", "Em entrega"],
    ["done", "Entregues"],
  ];
  const orders = filteredOrders();
  const dayAgo = Date.now() - 864e5;
  return `
    <section class="view">
      <div class="toolbar">
        <div class="filter-tabs" role="group" aria-label="Filtros de pedidos">
          ${[
            ["all", `Todos ${counts.all}`],
            ["new", `Novos ${counts.new}`],
            ["prep", `Em preparo ${counts.prep}`],
            ["delivery", `Em entrega ${counts.delivery}`],
          ]
            .map(([id, label]) => `<button class="tab-btn ${state.orderFilter === id ? "active" : ""}" type="button" data-order-filter="${id}">${label}</button>`)
            .join("")}
        </div>
        <span class="meta">Arraste os cartões entre as colunas ou use o botão de avançar.</span>
      </div>
      <div class="kanban-board" aria-label="Quadro de pedidos">
        ${columns
          .map(([status, title]) => {
            let list = orders.filter((order) => order.status === status);
            if (status === "done") list = list.filter((order) => new Date(order.createdAt).getTime() >= dayAgo).slice(0, 15);
            return `
              <section class="kanban-column" data-status="${status}">
                <div class="kanban-head"><h2>${title}</h2><span class="pill">${list.length}</span></div>
                <div class="order-stack">
                  ${list.length ? list.map(orderCard).join("") : '<div class="empty-state">Nenhum pedido nesta etapa.</div>'}
                </div>
              </section>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

function filteredProducts() {
  return data.products.filter((product) => {
    const available =
      state.productAvailability === "all" ||
      (state.productAvailability === "active" && product.active && !product.soldOut) ||
      (state.productAvailability === "inactive" && !product.active) ||
      (state.productAvailability === "soldOut" && product.soldOut);
    const category = state.productCategory === "all" || product.category === state.productCategory;
    return category && available && matchesQuery([product.name, product.category, product.desc, product.badge]);
  });
}

function productCard(product) {
  const status = product.soldOut ? "exhausted" : product.active ? "active" : "inactive";
  return `
    <article class="product-card ${product.active ? "" : "off"}">
      <div class="product-media">
        <img src="${escapeHtml(safeImg(product.image))}" alt="${escapeHtml(product.name)}" />
        <span class="status-badge ${product.featured ? "status-new" : "status-muted"}">${escapeHtml(product.badge || product.category)}</span>
      </div>
      <div class="product-body">
        <div class="price-row">
          <h2 class="card-title">${escapeHtml(product.name)}</h2>
          ${statusBadge(status)}
        </div>
        <p>${escapeHtml(product.desc)}</p>
        <div class="price-row">
          <strong class="price">${money(product.price)}</strong>
          <label class="toggle">Ativo <input type="checkbox" ${product.active ? "checked" : ""} data-toggle-product="${product.id}"><span></span></label>
        </div>
        <div class="action-row">
          <button class="mini-action" type="button" data-edit-product="${product.id}" aria-label="Editar ${escapeHtml(product.name)}">${icon("edit")}</button>
          <button class="mini-action" type="button" data-duplicate-product="${product.id}" aria-label="Duplicar ${escapeHtml(product.name)}">${icon("copy")}</button>
          <button class="soft-action" type="button" data-stock-product="${product.id}">${product.soldOut ? "Repor" : "Esgotar"}</button>
          <button class="mini-action" type="button" data-delete-product="${product.id}" aria-label="Excluir ${escapeHtml(product.name)}">${icon("trash")}</button>
        </div>
      </div>
    </article>
  `;
}

function renderProducts() {
  const categories = ["all", ...data.categories.map((c) => c.name)];
  const products = filteredProducts();
  return `
    <section class="view">
      <div class="toolbar">
        <div class="toolbar-left">
          <label class="compact-search"><span class="sr-only">Buscar produtos</span><input type="search" data-local-search placeholder="Buscar produtos..." value="${escapeHtml(state.query)}"></label>
          <select class="filter-select" data-product-category aria-label="Filtrar por categoria">
            ${categories.map((category) => `<option value="${category}" ${state.productCategory === category ? "selected" : ""}>${category === "all" ? "Todas as categorias" : category}</option>`).join("")}
          </select>
          <select class="filter-select" data-product-availability aria-label="Filtrar por disponibilidade">
            ${[
              ["all", "Todas"],
              ["active", "Ativos"],
              ["inactive", "Inativos"],
              ["soldOut", "Esgotados"],
            ]
              .map(([id, label]) => `<option value="${id}" ${state.productAvailability === id ? "selected" : ""}>${label}</option>`)
              .join("")}
          </select>
        </div>
        <div class="toolbar-right">
          <button class="soft-action" type="button" data-action="reorder">Reordenar</button>
          <button class="primary-action" type="button" data-modal="product">${icon("plus")} Novo produto</button>
        </div>
      </div>
      ${products.length ? `<div class="product-grid">${products.map(productCard).join("")}</div>` : '<div class="empty-state">Nenhum produto encontrado com os filtros atuais.</div>'}
    </section>
  `;
}

function renderCategories() {
  const list = data.categories.filter((cat) => matchesQuery([cat.name, cat.desc, cat.order]));
  return `
    <section class="view">
      <div class="toolbar">
        <label class="compact-search"><span class="sr-only">Buscar categorias</span><input type="search" data-local-search placeholder="Buscar categoria..." value="${escapeHtml(state.query)}"></label>
        <button class="primary-action" type="button" data-modal="category">${icon("plus")} Nova categoria</button>
      </div>
      <div class="table">
        ${list
          .map(
            (cat) => `
              <div class="table-row">
                <span><strong>${escapeHtml(cat.name)}</strong><small class="meta">${escapeHtml(cat.desc || "Sem descrição")}</small></span>
                <span>${plural(data.products.filter((p) => p.categoryId === cat.id).length, "produto", "produtos")}</span>
                ${statusBadge(cat.active ? "active" : "inactive")}
                <span>Ordem ${cat.order}</span>
                <label class="toggle">Ativa <input type="checkbox" ${cat.active ? "checked" : ""} data-toggle-category="${cat.id}"><span></span></label>
                <div class="table-actions">
                  <button class="mini-action" type="button" data-edit-category="${cat.id}" aria-label="Editar categoria">${icon("edit")}</button>
                  <button class="mini-action" type="button" data-duplicate-category="${cat.id}" aria-label="Duplicar categoria">${icon("copy")}</button>
                  <button class="mini-action" type="button" data-delete-category="${cat.id}" aria-label="Excluir categoria">${icon("trash")}</button>
                </div>
              </div>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderAddons() {
  const list = data.addons.filter((group) => matchesQuery([group.name, ...group.options.map((option) => option.name)]));
  return `
    <section class="view">
      <div class="toolbar">
        <label class="compact-search"><span class="sr-only">Buscar adicionais</span><input type="search" data-local-search placeholder="Buscar grupo ou opção..." value="${escapeHtml(state.query)}"></label>
        <button class="primary-action" type="button" data-modal="addon">${icon("plus")} Novo grupo</button>
      </div>
      ${
        list.length
          ? `<div class="entity-grid">${list
              .map((group) => {
                const names = group.productIds.map((id) => data.products.find((product) => product.id === id)?.name).filter(Boolean);
                return `
              <article class="entity-card">
                <div class="price-row"><h2>${escapeHtml(group.name)}</h2>${statusBadge(group.status)}</div>
                <div class="tag-list">
                  <span class="mini-badge ${group.required ? "status-new" : "status-muted"}">${group.required ? "Obrigatório" : "Opcional"}</span>
                  <span class="mini-badge status-muted">Mín. ${group.min}</span>
                  <span class="mini-badge status-muted">Máx. ${group.max}</span>
                </div>
                <p><strong>Produtos:</strong> ${names.length ? escapeHtml(names.join(", ")) : "nenhum produto associado"}</p>
                <ul class="addon-opts">${group.options.map((option) => `<li><span>${escapeHtml(option.name)}${option.active ? "" : " (inativo)"}</span><strong>${money(option.price)}</strong></li>`).join("")}</ul>
                <div class="action-row">
                  <button class="soft-action" type="button" data-edit-addon="${escapeHtml(group.id)}">${icon("edit")} Editar</button>
                  <button class="danger-btn" type="button" data-delete-addon="${escapeHtml(group.id)}">${icon("trash")} Excluir</button>
                </div>
              </article>`;
              })
              .join("")}</div>`
          : '<div class="empty-state">Nenhum grupo de adicionais. Crie o primeiro em "Novo grupo".</div>'
      }
    </section>
  `;
}

function renderCoupons() {
  const list = data.coupons.filter((coupon) => matchesQuery([coupon.code, coupon.type, coupon.status]));
  return `
    <section class="view">
      <div class="toolbar">
        <label class="compact-search"><span class="sr-only">Buscar cupons</span><input type="search" data-local-search placeholder="Buscar cupom..." value="${escapeHtml(state.query)}"></label>
        <button class="primary-action" type="button" data-modal="coupon">${icon("plus")} Novo cupom</button>
      </div>
      <div class="table">
        ${list
          .map(
            (coupon) => `
              <div class="table-row compact">
                <span><strong>${escapeHtml(coupon.code)}</strong><small class="meta">${escapeHtml(coupon.type)} • ${escapeHtml(coupon.value)}</small></span>
                <span>Mín. ${escapeHtml(coupon.min)}</span>
                <span>${coupon.uses}/${coupon.limit ?? "∞"} usos</span>
                <span>Validade ${escapeHtml(coupon.expires)}</span>
                ${statusBadge(coupon.status)}
                <div class="table-actions">
                  <button class="mini-action" type="button" data-edit-coupon="${coupon.id}" aria-label="Editar cupom">${icon("edit")}</button>
                  <button class="mini-action" type="button" data-duplicate-coupon="${coupon.id}" aria-label="Duplicar cupom">${icon("copy")}</button>
                  <button class="soft-action" type="button" data-disable-coupon="${coupon.id}">${coupon.active ? "Desativar" : "Ativar"}</button>
                </div>
              </div>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderDelivery() {
  const list = data.delivery.filter((region) => matchesQuery([region.name, region.coverage]));
  return `
    <section class="view">
      <div class="toolbar">
        <label class="compact-search"><span class="sr-only">Buscar regiões</span><input type="search" data-local-search placeholder="Buscar área..." value="${escapeHtml(state.query)}"></label>
        <button class="primary-action" type="button" data-modal="delivery">${icon("plus")} Nova área</button>
      </div>
      <section class="dashboard-grid">
        <article class="map-panel">
          <span class="map-ring"></span>
          <span class="map-ring" style="width:24rem;height:24rem"></span>
          <span class="map-pin" style="left:42%;top:42%">Centro</span>
          <span class="map-pin" style="left:61%;top:30%">Jardins</span>
          <span class="map-pin" style="left:54%;top:63%">Vila Nova</span>
        </article>
        <div class="entity-grid">
          ${list
            .map(
              (region) => `
                <article class="entity-card">
                  <div class="price-row"><h2>${escapeHtml(region.name)}</h2>${statusBadge(region.status)}</div>
                  <div class="info-grid">
                    <div class="info-box"><span>Taxa</span><strong>${money(region.fee)}</strong></div>
                    <div class="info-box"><span>Tempo adicional</span><strong>${escapeHtml(region.extra)}</strong></div>
                    <div class="info-box"><span>Pedido mínimo</span><strong>${money(region.min)}</strong></div>
                    <div class="info-box"><span>CEP/raio</span><strong>${escapeHtml(region.coverage)}</strong></div>
                  </div>
                  <div class="action-row">
                    <button class="soft-action" type="button" data-edit-delivery="${region.id}">${icon("edit")} Editar</button>
                    <button class="danger-btn" type="button" data-disable-delivery="${region.id}">Desativar</button>
                  </div>
                </article>
              `,
            )
            .join("")}
        </div>
      </section>
    </section>
  `;
}

const DEVICE_LABELS = { all: "Desktop e mobile", desktop: "Só desktop", mobile: "Só mobile" };

function bannerPeriod(banner) {
  const fmt = (iso) => new Date(iso).toLocaleDateString("pt-BR");
  if (!banner.startsAt && !banner.endsAt) return "Sem prazo";
  return `${banner.startsAt ? fmt(banner.startsAt) : "início imediato"} a ${banner.endsAt ? fmt(banner.endsAt) : "sem fim"}`;
}

function renderBanners() {
  const list = data.banners.filter((banner) => matchesQuery([banner.title, banner.text, banner.eyebrow, bannerState(banner)]));
  return `
    <section class="view">
      <div class="toolbar">
        <label class="compact-search"><span class="sr-only">Buscar campanhas</span><input type="search" data-local-search placeholder="Buscar campanha..." value="${escapeHtml(state.query)}"></label>
        <button class="primary-action" type="button" data-modal="banner">${icon("plus")} Nova campanha</button>
      </div>
      ${
        list.length
          ? `<div class="entity-grid">${list
              .map(
                (banner) => `
              <article class="entity-card">
                <div class="banner-preview" style="--banner-img:${banner.image ? `url('${escapeHtml(safeImg(banner.image))}')` : "none"}">
                  <p class="eyebrow">${banner.placement === "hero" ? "Topo da página" : "Promoção"} • ordem ${banner.order}</p>
                  <h3>${escapeHtml(banner.title)}</h3>
                </div>
                <div class="price-row">${statusBadge(bannerState(banner))}<span class="meta">${DEVICE_LABELS[banner.devices] || ""}</span></div>
                <p>${escapeHtml(banner.text)}</p>
                <p><strong>Período:</strong> ${escapeHtml(bannerPeriod(banner))}<br><strong>Botão:</strong> ${banner.coupon ? `copia o cupom ${escapeHtml(banner.coupon)}` : banner.link ? escapeHtml(banner.link) : "sem botão"}</p>
                <div class="action-row">
                  <button class="mini-action" type="button" data-edit-banner="${escapeHtml(banner.id)}" aria-label="Editar campanha">${icon("edit")}</button>
                  <button class="mini-action" type="button" data-duplicate-banner="${escapeHtml(banner.id)}" aria-label="Duplicar campanha">${icon("copy")}</button>
                  <button class="mini-action" type="button" data-delete-banner="${escapeHtml(banner.id)}" aria-label="Excluir campanha">${icon("trash")}</button>
                </div>
              </article>
            `,
              )
              .join("")}</div>`
          : '<div class="empty-state">Nenhuma campanha. O site não mostra banner até você criar uma.</div>'
      }
    </section>
  `;
}

const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const fmtH = (value) => {
  const [h, m] = String(value).split(":");
  return m === "00" ? `${Number(h)}h` : `${Number(h)}h${m}`;
};

function todayHoursLabel() {
  const h = data.settings.hours.days[new Date().getDay()];
  return !h || h.closed ? "Fechado" : `${fmtH(h.open)} às ${fmtH(h.close)}`;
}

const settingsTabs = [
  ["store", "Dados da loja"],
  ["operation", "Operação"],
  ["hours", "Horários de funcionamento"],
  ["payment", "Formas de pagamento"],
  ["fulfillment", "Entrega e retirada"],
  ["notifications", "Notificações"],
  ["users", "Usuários administrativos"],
];

function toggleField(label, checked, name) {
  return `<label class="toggle">${label}<input type="checkbox" name="${name}" ${checked ? "checked" : ""}><span></span></label>`;
}

function renderSettingsPanel() {
  const s = data.settings;
  if (state.settingsTab === "store") {
    return `
      <form class="settings-panel" data-settings-form="store">
        <div class="form-grid">
          ${field("Nome da loja", "name", s.store.name)}
          ${field("CNPJ (interno)", "cnpj", s.store.cnpj)}
          ${field("Telefone (interno)", "phone", s.store.phone)}
          ${field("WhatsApp (aparece no site)", "whatsapp", s.store.whatsapp)}
          ${field("E-mail (interno)", "email", s.store.email, "email")}
          ${field("Endereço (aparece no site)", "address", s.store.address)}
        </div>
        <div class="modal-actions"><button class="primary-action" type="submit">Salvar dados da loja</button></div>
      </form>
    `;
  }
  if (state.settingsTab === "operation") {
    return `
      <form class="settings-panel" data-settings-form="operation">
        <div class="form-grid">
          <div class="field">${toggleField("Loja aberta (recebendo pedidos)", state.storeOpen, "open")}</div>
          ${field("Pedido mínimo (R$)", "minOrder", s.operation.minOrder)}
          ${field("Tempo médio mínimo (min)", "avgMin", s.operation.avgMin, "number", 'min="1" max="300"')}
          ${field("Tempo médio máximo (min)", "avgMax", s.operation.avgMax, "number", 'min="1" max="600"')}
          ${field("Motivo da pausa (aparece no site)", "pauseReason", s.operation.pauseReason)}
        </div>
        <div class="modal-actions"><button class="primary-action" type="submit">Salvar operação</button></div>
      </form>
    `;
  }
  if (state.settingsTab === "hours") {
    return `
      <form class="settings-panel" data-settings-form="hours">
        <p class="meta">Os horários aparecem no site. Com "Bloquear pedidos fora do horário" ligado, o servidor também recusa pedidos fora deles (fuso de Brasília). Desligado, só informam o cliente.</p>
        <div class="field">${toggleField("Bloquear pedidos fora do horário", s.hours.enforce, "enforce")}</div>
        <div class="week-grid">
          ${[1, 2, 3, 4, 5, 6, 0]
            .map((day) => {
              const h = s.hours.days[day] || { closed: day === 1, open: "18:00", close: "23:30" };
              return `
                <div class="week-row">
                  <strong>${DAY_NAMES[day]}</strong>
                  <input type="time" name="open-${day}" value="${escapeHtml(h.open)}" aria-label="${DAY_NAMES[day]} abertura">
                  <input type="time" name="close-${day}" value="${escapeHtml(h.close)}" aria-label="${DAY_NAMES[day]} fechamento">
                  ${toggleField("Aberta", !h.closed, `day-${day}`)}
                </div>`;
            })
            .join("")}
        </div>
        <div class="form-grid one">${field("Observação de horários (aparece no site)", "note", s.hours.note)}</div>
        <div class="modal-actions"><button class="primary-action" type="submit">Salvar horários</button></div>
      </form>
    `;
  }
  if (state.settingsTab === "payment") {
    return `
      <form class="settings-panel" data-settings-form="payment">
        <div class="entity-grid">
          <article class="entity-card">${toggleField("Pix", s.payment.pix, "pix")}<p>Pagamento por Pix na entrega ou retirada.</p></article>
          <article class="entity-card">${toggleField("Cartões", s.payment.cards, "cards")}<p>Débito e crédito na entrega ou retirada.</p></article>
          <article class="entity-card">${toggleField("Dinheiro", s.payment.cash, "cash")}<p>Campo de troco no checkout.</p></article>
        </div>
        <p class="meta">O servidor recusa pedidos com uma forma de pagamento desligada. Pagamento online ainda não existe.</p>
        <div class="modal-actions"><button class="primary-action" type="submit">Salvar pagamentos</button></div>
      </form>
    `;
  }
  if (state.settingsTab === "fulfillment") {
    return `
      <form class="settings-panel" data-settings-form="fulfillment">
        <div class="form-grid">
          <div class="field">${toggleField("Habilitar entrega", s.fulfillment.delivery, "delivery")}</div>
          <div class="field">${toggleField("Habilitar retirada", s.fulfillment.pickup, "pickup")}</div>
          ${field("Orientações de retirada (aparecem no site)", "pickupInfo", s.fulfillment.pickupInfo)}
        </div>
        <div class="modal-actions"><button class="primary-action" type="submit">Salvar entrega e retirada</button></div>
      </form>
    `;
  }
  if (state.settingsTab === "notifications") {
    return `
      <form class="settings-panel" data-settings-form="notifications">
        <div class="entity-grid">
          <article class="entity-card">${toggleField("Som de novo pedido", state.sound, "sound")}<p>Toque de sino a cada novo pedido.</p></article>
          <article class="entity-card">${toggleField("Alertas visuais", s.notifications.visual, "visual")}<p>Badges e avisos no topo do painel.</p></article>
        </div>
        <div class="modal-actions"><button class="soft-action" type="button" data-action="test-bell">Testar sino</button><button class="primary-action" type="submit">Salvar notificações</button></div>
      </form>
    `;
  }
  return renderUsersPanel();
}

/* ---------- Usuários administrativos: profiles + RPC admin_set_role (a regra é do banco; aqui é só a tela) ---------- */

const ROLE_LABELS = { admin: "Administrador", customer: "Cliente" };

const ROLE_ERRORS = {
  "acesso negado": "Sem permissão para alterar papéis.",
  "papel invalido": "Papel inválido.",
  "conta nao encontrada": "Nenhuma conta cadastrada com esse e-mail. A pessoa precisa criar conta no site primeiro.",
  "nao remova o proprio acesso": "Você não pode remover o seu próprio acesso de administrador.",
};

function roleErrorMessage(error) {
  const detail = String((error && error.detail) || "").toLowerCase();
  const key = Object.keys(ROLE_ERRORS).find((k) => detail.includes(k));
  if (key) return ROLE_ERRORS[key];
  return error && error.code === "session_expired" ? error.message : "Não foi possível alterar o papel. Tente novamente.";
}

async function loadAdmins() {
  try {
    // A RLS só entrega todas as linhas de profiles a um admin; para os demais voltaria só a própria.
    const rows = await auth.restAuth("profiles?select=id,name,email,phone,role&role=eq.admin&order=name&limit=200");
    if (!Array.isArray(rows)) throw new Error("bad");
    data.admins = rows.map((p) => ({ id: p.id, name: p.name, email: p.email, role: p.role }));
  } catch {
    toast("Não foi possível carregar os usuários administrativos.", "error");
  }
}

function renderUsersPanel() {
  const me = state.adminProfile ? state.adminProfile.id : "";
  const list = data.admins.filter((u) => matchesQuery([u.name, u.email]));
  return `
    <section class="settings-panel">
      <p class="meta">Só quem já criou conta no site pode virar administrador. Informe o e-mail da conta. Toda alteração fica registrada na auditoria do banco.</p>
      <form class="form-grid" data-users-form>
        ${field("E-mail da conta", "email", "", "email", 'required autocomplete="off"')}
        ${labeledSelect("Papel", "role", "admin", [["admin", "Administrador"], ["customer", "Cliente (remove o acesso)"]])}
        <div class="modal-actions"><button class="primary-action" type="submit">Aplicar papel</button></div>
      </form>
      <div class="table">
        ${
          list.length
            ? list
                .map(
                  (u) => `
              <div class="table-row compact">
                <span><strong>${escapeHtml(u.name)}${u.id === me ? " (você)" : ""}</strong><small class="meta">${escapeHtml(u.email)}</small></span>
                <span>${escapeHtml(ROLE_LABELS[u.role] || u.role)}</span>
                ${statusBadge("active")}
                <span></span>
                <div class="table-actions">
                  ${u.id === me ? '<span class="meta">Seu acesso</span>' : `<button class="danger-btn" type="button" data-remove-admin="${escapeHtml(u.email)}">Remover acesso</button>`}
                </div>
              </div>`,
                )
                .join("")
            : '<div class="empty-state">Nenhum administrador encontrado.</div>'
        }
      </div>
    </section>
  `;
}

async function setRole(email, role) {
  try {
    await auth.rpc("admin_set_role", { p_email: email, p_role: role });
    await loadAdmins();
    renderCurrent({ silent: true });
    toast(role === "admin" ? `${email} agora é administrador.` : `Acesso administrativo de ${email} removido.`);
  } catch (error) {
    toast(roleErrorMessage(error), "error");
  }
}

function renderSettings() {
  return `
    <section class="view">
      <div class="settings-shell">
        <div class="settings-tabs" role="tablist" aria-label="Configurações">
          ${settingsTabs.map(([id, label]) => `<button class="settings-tab ${state.settingsTab === id ? "active" : ""}" type="button" data-settings-tab="${id}">${label}</button>`).join("")}
        </div>
        ${renderSettingsPanel()}
      </div>
    </section>
  `;
}

function field(label, name, value = "", type = "text", extra = "") {
  return `
    <label class="field">
      ${label}
      <input type="${type}" name="${name}" value="${escapeHtml(value)}" ${extra}>
    </label>
  `;
}

function labeledSelect(label, name, value, pairs) {
  return `
    <label class="field">
      ${label}
      <select name="${name}">
        ${pairs.map(([v, text]) => `<option value="${escapeHtml(v)}" ${String(value) === String(v) ? "selected" : ""}>${escapeHtml(text)}</option>`).join("")}
      </select>
    </label>
  `;
}

function selectField(label, name, value, options) {
  return `
    <label class="field">
      ${label}
      <select name="${name}">
        ${options.map((option) => `<option value="${escapeHtml(option)}" ${String(value) === String(option) ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}
      </select>
    </label>
  `;
}

function textAreaField(label, name, value = "") {
  return `
    <label class="field">
      ${label}
      <textarea name="${name}" rows="3">${escapeHtml(value)}</textarea>
    </label>
  `;
}

function closeModal() {
  els.modalBackdrop.hidden = true;
  els.modalPanel.innerHTML = "";
  state.modalImage = "";
  document.body.classList.remove("modal-open");
}

function openModal(title, eyebrow, body, sizeClass = "") {
  els.modalPanel.className = `modal-panel ${sizeClass}`;
  els.modalPanel.innerHTML = `
    <button class="icon-btn modal-x" type="button" data-close-modal aria-label="Fechar">×</button>
    <header class="modal-head">
      <p class="eyebrow">${eyebrow}</p>
      <h2 id="modalTitle">${title}</h2>
    </header>
    <div class="modal-body">${body}</div>
  `;
  els.modalBackdrop.hidden = false;
  document.body.classList.add("modal-open");
  window.setTimeout(() => $("input, select, textarea, button", els.modalPanel)?.focus({ preventScroll: true }), 40);
}

function productForm(product = null) {
  const isEdit = Boolean(product);
  const current = product || {
    id: "",
    name: "",
    category: data.categories[0]?.name || "",
    badge: "",
    desc: "",
    price: "",
    promo: "",
    image: "assets/brasa-bacon.jpg",
    ingredients: "",
    addons: false,
    doneness: false,
    prep: 15,
    code: "",
    active: true,
    featured: false,
    soldOut: false,
  };
  state.modalImage = current.image;
  openModal(
    isEdit ? "Editar produto" : "Novo produto",
    "CARDÁPIO",
    `
      <form data-form="product" data-id="${escapeHtml(current.id)}">
        <div class="upload-preview">
          <img id="imagePreview" src="${escapeHtml(current.image)}" alt="Pré-visualização do produto">
          <div class="form-grid one">
            <label class="field">Upload da imagem
              <input type="file" accept="image/*" data-image-upload>
            </label>
            ${selectField("Imagem de referência", "imageChoice", current.image, imageOptions)}
          </div>
        </div>
        <div class="form-grid">
          ${field("Nome", "name", current.name)}
          ${selectField("Categoria", "category", current.category, data.categories.map((c) => c.name))}
          ${field("Preço", "price", current.price)}
          ${field("Preço promocional opcional", "promo", current.promo)}
          ${textAreaField("Descrição", "desc", current.desc)}
          ${textAreaField("Ingredientes (separados por vírgula)", "ingredients", current.ingredients)}
          ${field("Tempo de preparo", "prep", current.prep, "number", 'min="1"')}
          ${field("Código interno opcional", "code", current.code)}
        </div>
        <div class="entity-grid">
          <article class="entity-card">${toggleField("Produto ativo", current.active, "active")}</article>
          <article class="entity-card">${toggleField("Marcar como destaque", current.featured, "featured")}</article>
          <article class="entity-card">${toggleField("Marcar como esgotado", current.soldOut, "soldOut")}</article>
          <article class="entity-card">${toggleField("Permitir adicionais e remoções", current.addons, "addons")}</article>
          <article class="entity-card">${toggleField("Pedir ponto da carne", current.doneness, "doneness")}</article>
        </div>
        <div class="modal-actions">
          <button class="ghost-action" type="button" data-close-modal>Cancelar</button>
          <button class="primary-action" type="submit">Salvar produto</button>
        </div>
      </form>
    `,
  );
}

function orderForm() {
  openModal(
    "Novo pedido",
    "PEDIDO MANUAL",
    `
      <form data-form="order">
        <div class="form-grid">
          ${field("Cliente", "customer", "")}
          ${field("Telefone", "phone", "")}
          ${selectField("Modalidade", "mode", "Entrega", ["Entrega", "Retirada"])}
          ${field("Total", "total", "49,90")}
          ${field("Endereço", "address", "Rua das Brasas, 147 - Centro")}
          ${selectField("Pagamento", "payment", "Pix", ["Pix", "Crédito", "Débito", "Dinheiro"])}
        </div>
        ${textAreaField("Itens", "items", "1x Brasa Bacon; 1x Refri Artesanal")}
        <div class="modal-actions">
          <button class="ghost-action" type="button" data-close-modal>Cancelar</button>
          <button class="primary-action" type="submit">Criar pedido demo</button>
        </div>
      </form>
    `,
  );
}

function categoryForm(category = null) {
  const current = category || { id: "", name: "", desc: "", active: true, order: Math.max(0, ...data.categories.map((c) => c.order || 0)) + 1 };
  openModal(
    category ? "Editar categoria" : "Nova categoria",
    "CATEGORIAS",
    `
      <form data-form="category" data-id="${escapeHtml(current.id)}">
        <div class="form-grid">
          ${field("Nome", "name", current.name)}
          ${field("Ordem de exibição", "order", current.order, "number", 'min="0"')}
          ${field("Descrição opcional", "desc", current.desc)}
          <div class="field">${toggleField("Categoria ativa", current.active, "active")}</div>
        </div>
        <div class="modal-actions">
          <button class="ghost-action" type="button" data-close-modal>Cancelar</button>
          <button class="primary-action" type="submit">Salvar categoria</button>
        </div>
      </form>
    `,
  );
}

function addonForm(group = null) {
  const current = group || { id: "", name: "", required: false, min: 0, max: 1, status: "active", options: [], productIds: [] };
  const optionsText = current.options.map((option) => `${option.name} | ${option.price.toFixed(2).replace(".", ",")}${option.active ? "" : " | inativo"}`).join("\n");
  openModal(
    group ? "Editar grupo" : "Novo grupo de adicionais",
    "PERSONALIZAÇÕES",
    `
      <form data-form="addon" data-id="${escapeHtml(current.id)}">
        <div class="form-grid">
          ${field("Nome do grupo", "name", current.name)}
          ${labeledSelect("Status", "status", current.status, [["active", "Ativo"], ["inactive", "Inativo"]])}
          ${field("Quantidade mínima", "min", current.min, "number", 'min="0"')}
          ${field("Quantidade máxima", "max", current.max, "number", 'min="1"')}
          <div class="field">${toggleField("Obrigatório (mínimo de 1)", current.required, "required")}</div>
        </div>
        <div class="form-grid one">
          ${textAreaField("Opções, uma por linha: Nome | preço (acrescente | inativo para ocultar)", "options", optionsText)}
          <div class="field">Produtos que usam este grupo
            <div class="check-list">
              ${data.products.map((product) => `<label class="toggle">${escapeHtml(product.name)}<input type="checkbox" name="prod" value="${escapeHtml(product.id)}" ${current.productIds.includes(product.id) ? "checked" : ""}><span></span></label>`).join("") || "<small>Cadastre produtos primeiro.</small>"}
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button class="ghost-action" type="button" data-close-modal>Cancelar</button>
          <button class="primary-action" type="submit">Salvar grupo</button>
        </div>
      </form>
    `,
  );
}

function couponForm(coupon = null) {
  const current = coupon || { id: "", code: "", type: "Percentual", valueNum: "", minNum: 0, limit: 100, dateValue: "", active: true };
  openModal(
    coupon ? "Editar cupom" : "Novo cupom",
    "CUPONS",
    `
      <form data-form="coupon" data-id="${escapeHtml(current.id)}">
        <div class="form-grid">
          ${field("Código", "code", current.code)}
          ${selectField("Tipo de desconto", "type", current.type, ["Percentual", "Valor fixo", "Frete grátis"])}
          ${field("Valor (% ou R$; ignorado em frete grátis)", "value", current.valueNum, "number", 'min="0" step="0.01"')}
          ${field("Pedido mínimo (R$)", "min", current.minNum, "number", 'min="0" step="0.01"')}
          ${field("Limite de usos (vazio = sem limite)", "limit", current.limit ?? "", "number", 'min="1"')}
          ${field("Válido até (vazio = sem validade)", "expires", current.dateValue, "date")}
          ${selectField("Status", "status", current.active ? "active" : "inactive", ["active", "inactive"])}
        </div>
        <div class="modal-actions">
          <button class="ghost-action" type="button" data-close-modal>Cancelar</button>
          <button class="primary-action" type="submit">Salvar cupom</button>
        </div>
      </form>
    `,
  );
}

function deliveryForm(region = null) {
  const current = region || { id: "", name: "", fee: 6.9, extraMin: 5, min: 20, status: "active", coverage: "" };
  openModal(
    region ? "Editar área" : "Nova área de entrega",
    "ENTREGA",
    `
      <form data-form="delivery" data-id="${escapeHtml(current.id)}">
        <div class="form-grid">
          ${field("Bairro ou região", "name", current.name)}
          ${field("Taxa de entrega", "fee", current.fee, "number", 'min="0" step="0.1"')}
          ${field("Tempo adicional (min)", "extraMin", current.extraMin ?? 0, "number", 'min="0"')}
          ${field("Pedido mínimo", "min", current.min, "number", 'min="0" step="0.1"')}
          ${field("Faixa de CEP ou raio", "coverage", current.coverage)}
          ${selectField("Status", "status", current.status, ["active", "inactive"])}
        </div>
        <div class="modal-actions">
          <button class="ghost-action" type="button" data-close-modal>Cancelar</button>
          <button class="primary-action" type="submit">Salvar área</button>
        </div>
      </form>
    `,
  );
}

function bannerForm(banner = null) {
  const current = banner || { id: "", placement: "promo", title: "", text: "", eyebrow: "", buttonLabel: "", link: "#cardapio", coupon: "", image: "", status: "active", startsOn: "", endsOn: "", order: data.banners.length + 1, devices: "all" };
  openModal(
    banner ? "Editar campanha" : "Nova campanha",
    "BANNERS E PROMOÇÕES",
    `
      <form data-form="banner" data-id="${escapeHtml(current.id)}">
        <div class="form-grid">
          ${labeledSelect("Onde aparece", "placement", current.placement, [["hero", "Topo da página (só o primeiro ativo)"], ["promo", "Faixa de promoções"]])}
          ${labeledSelect("Status", "status", current.status === "active" ? "active" : "ended", [["active", "Ativa"], ["ended", "Desativada"]])}
          ${field("Texto pequeno acima do título", "eyebrow", current.eyebrow)}
          ${field("Título", "title", current.title)}
          ${textAreaField("Texto (use **negrito** para destacar)", "text", current.text)}
          ${field("Texto do botão", "buttonLabel", current.buttonLabel)}
          ${field("Destino do botão (#cardapio ou https://...)", "link", current.link)}
          ${field("Cupom (se preencher, o botão copia o cupom)", "coupon", current.coupon)}
          <label class="field">Imagem (assets/arquivo.jpg ou https://...)
            <input name="image" list="bannerImages" value="${escapeHtml(current.image)}">
          </label>
          ${field("Começa em (opcional)", "starts", current.startsOn, "date")}
          ${field("Termina em (opcional)", "ends", current.endsOn, "date")}
          ${field("Ordem de exibição", "order", current.order, "number", 'min="1"')}
          ${labeledSelect("Aparelhos", "devices", current.devices, [["all", "Desktop e mobile"], ["desktop", "Só desktop"], ["mobile", "Só mobile"]])}
        </div>
        <datalist id="bannerImages">${imageOptions.map((option) => `<option value="${escapeHtml(option)}"></option>`).join("")}</datalist>
        <div class="modal-actions">
          <button class="ghost-action" type="button" data-close-modal>Cancelar</button>
          <button class="primary-action" type="submit">Salvar campanha</button>
        </div>
      </form>
    `,
  );
}

function openEntityModal(type, id = "") {
  const lookups = {
    product: () => productForm(id ? data.products.find((item) => item.id === id) : null),
    order: orderForm,
    category: () => categoryForm(id ? data.categories.find((item) => item.id === id) : null),
    addon: () => addonForm(id ? data.addons.find((item) => item.id === id) : null),
    coupon: () => couponForm(id ? data.coupons.find((item) => item.id === id) : null),
    delivery: () => deliveryForm(id ? data.delivery.find((item) => item.id === id) : null),
    banner: () => bannerForm(id ? data.banners.find((item) => item.id === id) : null),
  };
  lookups[type]?.();
}

function closeDrawer() {
  state.drawerId = null;
  document.body.classList.remove("drawer-open");
  els.drawerBackdrop.hidden = true;
  els.orderDrawer.setAttribute("aria-hidden", "true");
  els.orderDrawer.innerHTML = "";
}

function openOrderDrawer(orderId) {
  const order = state.orders.find((item) => item.id === orderId);
  if (!order) return;
  state.drawerId = orderId;
  const next = nextAction(order);
  const canReject = (TRANSITIONS[order.status] || []).includes("rejected");
  const flow = order.status === "rejected" ? ["new"] : FLOW.slice(0, FLOW.indexOf(order.status) + 1);
  const timeline = flow.map((status, index) => {
    const label = status === "delivery" && order.mode === "Retirada" ? "Pronto para retirada" : FLOW_LABELS[status];
    const when = index === 0 ? order.createdAt : index === flow.length - 1 ? order.updatedAt : "";
    return [label, when];
  });
  if (order.status === "rejected") timeline.push([`Pedido recusado${order.rejectionReason ? `: ${order.rejectionReason}` : ""}`, order.updatedAt]);
  const stamp = (iso) => (iso ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "");

  els.orderDrawer.innerHTML = `
    <div class="drawer-head">
      <div>
        <p class="eyebrow">PEDIDO</p>
        <h2>${escapeHtml(order.number)}</h2>
        <p class="meta">${statusBadge(order.status)} ${["done", "rejected"].includes(order.status) ? "" : `<span class="elapsed" data-created="${escapeHtml(order.createdAt)}">${elapsedLabel(order.createdAt)}</span>`}</p>
      </div>
      <button class="icon-btn" type="button" data-close-drawer aria-label="Fechar">×</button>
    </div>
    <div class="drawer-body">
      <section class="drawer-section">
        <h3>Cliente</h3>
        <strong>${escapeHtml(order.customer)}</strong>
        <span class="meta">${escapeHtml(order.phone)}${order.guest ? " • sem conta" : ""}</span>
      </section>
      <section class="drawer-section">
        <h3>Itens</h3>
        ${order.items
          .map(
            (item) => `
              <div class="price-row">
                <span><strong>${Number(item.qty) || 0}x ${escapeHtml(item.name)}</strong><small class="meta">${escapeHtml(optionsText(item))}</small></span>
                <strong>${money(item.price * item.qty)}</strong>
              </div>
            `,
          )
          .join("")}
      </section>
      <section class="drawer-section">
        <h3>Totais</h3>
        <div class="price-row"><span>Subtotal</span><strong>${money(order.subtotal)}</strong></div>
        <div class="price-row"><span>Taxa de entrega</span><strong>${money(order.deliveryFee)}</strong></div>
        <div class="price-row"><span>Desconto${order.coupon ? ` (${escapeHtml(order.coupon)})` : ""}</span><strong>-${money(order.discount)}</strong></div>
        <div class="price-row"><span>Total</span><strong class="price">${money(order.total)}</strong></div>
      </section>
      <section class="drawer-section">
        <h3>Entrega e pagamento</h3>
        <span>${escapeHtml(order.address)}</span>
        ${order.reference ? `<span class="meta">${escapeHtml(order.reference)}</span>` : ""}
        <span>Pagamento: <strong>${escapeHtml(order.payment)}</strong> (na entrega ou retirada)</span>
        ${order.change ? `<span class="attention">${escapeHtml(order.change)}</span>` : ""}
      </section>
      <section class="drawer-section">
        <h3>Linha do tempo</h3>
        <div class="timeline-list">
          ${timeline.map(([label, when]) => `<div class="timeline-row" style="padding:.65rem"><strong>${escapeHtml(label)}</strong><span class="meta">${escapeHtml(stamp(when))}</span></div>`).join("")}
        </div>
      </section>
    </div>
    <div class="drawer-actions">
      <button class="soft-action" type="button" data-order-action="print" data-id="${escapeHtml(order.id)}">Imprimir comanda</button>
      <button class="ghost-action" type="button" data-order-action="talk" data-id="${escapeHtml(order.id)}">WhatsApp do cliente</button>
      ${next ? `<button class="primary-action" type="button" data-order-action="advance" data-id="${escapeHtml(order.id)}">${escapeHtml(next.label)}</button>` : ""}
      ${canReject ? `<button class="danger-btn" type="button" data-order-action="reject" data-id="${escapeHtml(order.id)}">Recusar pedido</button>` : ""}
    </div>
  `;
  els.drawerBackdrop.hidden = false;
  document.body.classList.add("drawer-open");
  els.orderDrawer.setAttribute("aria-hidden", "false");
  $("[data-close-drawer]", els.orderDrawer)?.focus({ preventScroll: true });
}

function askConfirm(title, text, onConfirm) {
  state.confirm = onConfirm;
  els.confirmTitle.textContent = title;
  els.confirmText.textContent = text;
  els.confirmBackdrop.hidden = false;
  document.body.classList.add("modal-open");
  $("[data-confirm-cancel]", els.confirmBackdrop)?.focus({ preventScroll: true });
}

function closeConfirm() {
  state.confirm = null;
  els.confirmBackdrop.hidden = true;
  document.body.classList.remove("modal-open");
}

/* =========================================================
   Pedidos reais: leitura, status, impressão, WhatsApp, sino
   ========================================================= */

const TRANSITIONS = {
  new: ["confirmed", "rejected"],
  confirmed: ["prep", "rejected"],
  prep: ["delivery"],
  delivery: ["done"],
};
const FLOW = ["new", "confirmed", "prep", "delivery", "done"];
const FLOW_LABELS = { new: "Pedido recebido", confirmed: "Pedido confirmado", prep: "Em preparação", delivery: "Saiu para entrega", done: "Entregue" };
const STATUS_TOAST = { confirmed: "confirmado", prep: "em preparo", delivery: "em entrega", done: "entregue", rejected: "recusado" };
const DONENESS = { malpassada: "Malpassada", "ao-ponto-para-mal": "Ao ponto para mal", "ao-ponto": "Ao ponto", "ao-ponto-para-bem": "Ao ponto para bem", "bem-passada": "Bem-passada" };
const REJECT_REASONS = ["Item indisponível", "Fora da área de entrega", "Loja sobrecarregada", "Dados incorretos do cliente", "Outro motivo"];
const POLL_MS = 15000;

function nextAction(order) {
  const map = {
    new: ["confirmed", "Confirmar pedido"],
    confirmed: ["prep", "Iniciar preparo"],
    prep: ["delivery", order.mode === "Entrega" ? "Saiu para entrega" : "Pronto p/ retirada"],
    delivery: ["done", "Marcar entregue"],
  };
  const entry = map[order.status];
  return entry ? { status: entry[0], label: entry[1] } : null;
}

function optionsText(item) {
  return [
    item.doneness ? `Ponto: ${DONENESS[item.doneness] || item.doneness}` : "",
    ...item.removals.map((name) => `Sem ${name}`),
    ...item.addons.map((name) => `+ ${name}`),
    item.notes ? `Obs.: ${item.notes}` : "",
  ]
    .filter(Boolean)
    .join(" • ");
}

function elapsedLabel(iso) {
  const min = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 60) return `${String(min).padStart(2, "0")} min`;
  return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}`;
}

function refreshElapsed() {
  document.querySelectorAll("[data-created]").forEach((el) => {
    el.textContent = elapsedLabel(el.dataset.created);
  });
}

function mapOrder(row) {
  const c = row.customer_snapshot || {};
  const f = row.fulfillment || {};
  const p = row.payment || {};
  const t = row.totals || {};
  const items = Array.isArray(row.items) ? row.items : [];
  const delivery = f.mode === "delivery";
  return {
    id: row.id,
    number: row.order_number,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    customer: c.name || "Cliente",
    phone: c.phone || "",
    guest: Boolean(c.guest),
    mode: delivery ? "Entrega" : "Retirada",
    itemsCount: items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0),
    subtotal: (t.subtotalCents || 0) / 100,
    deliveryFee: (t.deliveryFeeCents || 0) / 100,
    discount: (t.discountCents || 0) / 100,
    total: (t.totalCents || 0) / 100,
    coupon: t.coupon || "",
    address: delivery ? [f.address, f.district].filter(Boolean).join(" - ") : "Retirada no balcão",
    reference: f.complement || "",
    payment: p.method || "",
    change: p.cashChange ? `Troco para ${p.cashChange}` : "",
    rejectionReason: row.rejection_reason || "",
    items: items.map((item) => ({
      name: String(item.name || "Item"),
      qty: Number(item.qty) || 0,
      price: (item.unitPriceCents || 0) / 100,
      doneness: item.doneness || "",
      removals: Array.isArray(item.removals) ? item.removals.map(String) : [],
      addons: (Array.isArray(item.addonNames) && item.addonNames.length ? item.addonNames : Array.isArray(item.addonSlugs) ? item.addonSlugs : []).map(String),
      notes: String(item.notes || ""),
    })),
  };
}

async function fetchOrders() {
  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  const rows = await auth.restAuth(
    `orders?select=id,order_number,status,rejection_reason,customer_snapshot,items,fulfillment,payment,totals,created_at,updated_at&created_at=gte.${encodeURIComponent(since)}&order=created_at.desc&limit=500`,
  );
  return Array.isArray(rows) ? rows.map(mapOrder) : [];
}

function ordersSignature(list) {
  return list.map((order) => `${order.id}:${order.status}`).join("|");
}

function updateBadges() {
  const n = newOrdersCount();
  const badge = els.notifyBtn.querySelector("span");
  if (badge) {
    badge.textContent = String(n);
    badge.hidden = n === 0;
  }
  document.title = n ? `(${n}) Novos pedidos | ${BASE_TITLE}` : BASE_TITLE;
  renderNav();
}

async function pollOrders(first = false) {
  if (state.pollBusy || !state.adminProfile) return;
  state.pollBusy = true;
  try {
    const list = await fetchOrders();
    // Uma mudança de status em andamento não pode ser sobrescrita por esta leitura.
    list.forEach((order) => {
      if (!state.pending.has(order.id)) return;
      const current = state.orders.find((item) => item.id === order.id);
      if (current) order.status = current.status;
    });
    const fresh = list.filter((order) => !state.seen.has(order.id) && order.status === "new");
    const changed = ordersSignature(list) !== ordersSignature(state.orders);
    list.forEach((order) => state.seen.add(order.id));
    state.orders = list;
    updateBadges();
    if (fresh.length && !first) alertNewOrders(fresh);
    if (!first && changed && !state.dragId && ["overview", "orders"].includes(state.view)) renderCurrent({ silent: true });
    else refreshElapsed();
  } catch (error) {
    if (error && error.code === "session_expired") {
      stopPolling();
      startAdmin();
    }
    // Falha de rede: tenta de novo no próximo ciclo.
  } finally {
    state.pollBusy = false;
  }
}

function startPolling() {
  stopPolling();
  state.pollTimer = window.setInterval(() => pollOrders(false), POLL_MS);
}

function stopPolling() {
  if (state.pollTimer) window.clearInterval(state.pollTimer);
  state.pollTimer = null;
}

/* ---------- Sino (Web Audio: sem arquivo de som, funciona offline) ---------- */

let audioCtx = null;

function getAudio() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  return audioCtx;
}

function unlockAudio() {
  const ctx = getAudio();
  if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
}

function strikeBell(ctx, when, base) {
  const partials = [[1, 1], [2.76, 0.6], [5.4, 0.35], [8.93, 0.2]];
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, when);
  master.gain.exponentialRampToValueAtTime(0.25, when + 0.01);
  master.gain.exponentialRampToValueAtTime(0.0001, when + 1.6);
  master.connect(ctx.destination);
  partials.forEach(([ratio, gain], i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = base * ratio;
    g.gain.setValueAtTime(gain, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 1.6 / (1 + i * 0.7));
    osc.connect(g);
    g.connect(master);
    osc.start(when);
    osc.stop(when + 1.7);
  });
}

// Dois toques de sino ("ding-dong"). Retorna false se o navegador ainda bloqueia o som.
async function ringBell() {
  const ctx = getAudio();
  if (!ctx) return false;
  try {
    if (ctx.state !== "running") await ctx.resume();
  } catch {
    return false;
  }
  if (ctx.state !== "running") return false;
  const t = ctx.currentTime + 0.03;
  strikeBell(ctx, t, 988);
  strikeBell(ctx, t + 0.6, 1319);
  return true;
}

function alertNewOrders(fresh) {
  toast(fresh.length === 1 ? `Novo pedido ${fresh[0].number} de ${fresh[0].customer}!` : `${fresh.length} novos pedidos!`);
  if (!state.sound) return;
  ringBell().then((ok) => {
    if (!ok) toast("O navegador bloqueou o som. Clique em qualquer lugar da página para ativar o sino.", "error");
  });
}

/* ---------- Status do pedido (sempre confirmado pelo servidor) ---------- */

async function changeStatus(id, status, reason = "") {
  const order = state.orders.find((item) => item.id === id);
  if (!order || state.pending.has(id)) return false;
  if (!(TRANSITIONS[order.status] || []).includes(status)) {
    toast("Essa mudança de status não é permitida.", "error");
    return false;
  }
  const previous = order.status;
  state.pending.add(id);
  order.status = status;
  renderCurrent({ silent: true });
  updateBadges();
  try {
    const row = await auth.rpc("update_order_status", { p_order_id: id, p_status: status, p_reason: reason || null });
    if (!row || row.status !== status) throw new Error("not saved");
    order.status = row.status;
    order.rejectionReason = row.rejection_reason || "";
    order.updatedAt = row.updated_at || order.updatedAt;
    toast(`Pedido ${order.number}: ${STATUS_TOAST[status]}.`);
    return true;
  } catch (error) {
    order.status = previous;
    toast(error && error.code === "session_expired" ? error.message : "Não foi possível atualizar o pedido. O status anterior foi restaurado.", "error");
    return false;
  } finally {
    state.pending.delete(id);
    renderCurrent({ silent: true });
    updateBadges();
    if (state.drawerId === id) openOrderDrawer(id);
  }
}

function rejectForm(orderId) {
  openModal(
    "Recusar pedido",
    "PEDIDO",
    `
      <form data-form="reject" data-id="${escapeHtml(orderId)}">
        <div class="form-grid one">
          ${selectField("Motivo", "reason", REJECT_REASONS[0], REJECT_REASONS)}
          ${textAreaField("Detalhes (opcional)", "details", "")}
        </div>
        <div class="modal-actions">
          <button class="ghost-action" type="button" data-close-modal>Cancelar</button>
          <button class="danger-btn" type="submit">Recusar pedido</button>
        </div>
      </form>
    `,
  );
}

function saveReject(form) {
  const values = formData(form);
  const reason = [values.reason, String(values.details || "").trim()].filter(Boolean).join(" — ").slice(0, 240);
  closeModal();
  changeStatus(form.dataset.id, "rejected", reason);
}

function whatsappUrl(order) {
  let digits = String(order.phone || "").replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 11) return "";
  digits = `55${digits}`;
  const first = String(order.customer).trim().split(/\s+/)[0];
  const message = `Olá, ${first}! Sobre o seu pedido ${order.number} na ${data.settings.store.name}: `;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function printOrder(order) {
  const rows = order.items
    .map(
      (item) =>
        `<tr><td>${item.qty}x</td><td><strong>${escapeHtml(item.name)}</strong>${optionsText(item) ? `<br><small>${escapeHtml(optionsText(item))}</small>` : ""}</td><td style="text-align:right">${money(item.price * item.qty)}</td></tr>`,
    )
    .join("");
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Comanda ${escapeHtml(order.number)}</title>
<style>body{font:13px/1.35 monospace;width:72mm;margin:0 auto;padding:4mm}h1{font-size:18px;margin:0}hr{border:0;border-top:1px dashed #000;margin:6px 0}table{width:100%;border-collapse:collapse}td{vertical-align:top;padding:2px 0}small{font-size:11px}</style></head><body>
<h1>${escapeHtml(data.settings.store.name)}</h1><div>Comanda ${escapeHtml(order.number)} • ${escapeHtml(new Date(order.createdAt).toLocaleString("pt-BR"))}</div><hr>
<div><strong>${escapeHtml(order.customer)}</strong><br>${escapeHtml(order.phone)}</div>
<div>${escapeHtml(order.mode)}: ${escapeHtml(order.address)}${order.reference ? `<br>${escapeHtml(order.reference)}` : ""}</div><hr>
<table>${rows}</table><hr>
<table><tr><td>Subtotal</td><td style="text-align:right">${money(order.subtotal)}</td></tr><tr><td>Taxa</td><td style="text-align:right">${money(order.deliveryFee)}</td></tr><tr><td>Desconto</td><td style="text-align:right">-${money(order.discount)}</td></tr><tr><td><strong>Total</strong></td><td style="text-align:right"><strong>${money(order.total)}</strong></td></tr></table><hr>
<div>Pagamento: ${escapeHtml(order.payment)}${order.change ? ` (${escapeHtml(order.change)})` : ""}</div></body></html>`;
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  frame.onload = () => {
    frame.contentWindow.focus();
    frame.contentWindow.print();
    window.setTimeout(() => frame.remove(), 2000);
  };
  frame.srcdoc = html;
  document.body.append(frame);
}

/* ---------- Loja aberta/pausada (o site público lê este valor) ---------- */

async function loadStoreOpen() {
  try {
    const rows = await auth.restAuth("store_settings?select=open&id=eq.main");
    if (Array.isArray(rows) && rows[0]) state.storeOpen = Boolean(rows[0].open);
  } catch {
    /* mantém o valor local */
  }
}

async function setStoreOpen(next) {
  try {
    const rows = await auth.restAuth("store_settings?id=eq.main", { method: "PATCH", headers: { Prefer: "return=representation" }, body: { open: next } });
    if (!Array.isArray(rows) || !rows[0]) throw new Error("not saved");
    state.storeOpen = next;
    persist();
    renderCurrent({ silent: true });
    return true;
  } catch {
    toast("Não foi possível alterar o status da loja.", "error");
    renderCurrent({ silent: true });
    return false;
  }
}

async function toggleStore() {
  const next = !state.storeOpen;
  if (await setStoreOpen(next)) toast(next ? "Pedidos retomados." : "Pedidos pausados. O site já avisa os clientes.");
}

function formData(form) {
  const fd = new FormData(form);
  return Object.fromEntries(fd.entries());
}

function requireFields(form, names) {
  let ok = true;
  $$(".field", form).forEach((fieldEl) => {
    fieldEl.classList.remove("error");
    fieldEl.querySelector("small")?.remove();
  });
  names.forEach((name) => {
    const input = form.elements[name];
    if (!input || String(input.value || "").trim()) return;
    ok = false;
    const fieldEl = input.closest(".field");
    fieldEl?.classList.add("error");
    fieldEl?.insertAdjacentHTML("beforeend", "<small>Campo obrigatório.</small>");
  });
  if (!ok) toast("Preencha os campos obrigatórios destacados.", "error");
  return ok;
}

async function saveProduct(form) {
  if (!requireFields(form, ["name", "price", "desc"])) return;
  const v = formData(form);
  const num = (x) => Number(String(x).replace(",", "."));
  const price = Math.round(num(v.price) * 100);
  const promoText = String(v.promo || "").trim();
  const promo = promoText ? Math.round(num(promoText) * 100) : null;
  if (!Number.isFinite(price) || price < 0 || (promo !== null && (!Number.isFinite(promo) || promo < 0))) {
    toast("Informe preços válidos.", "error");
    return;
  }
  const cat = data.categories.find((c) => c.name === v.category);
  if (!cat) {
    toast("Escolha uma categoria existente.", "error");
    return;
  }
  const image = safeImg(state.modalImage || v.imageChoice);
  if (image.length > 400000) {
    toast("Imagem muito grande. Use uma foto de até cerca de 300 KB.", "error");
    return;
  }
  const id = form.dataset.id;
  const body = {
    category_id: cat.id,
    name: v.name.trim().slice(0, 120),
    description: v.desc.trim(),
    image_url: image,
    price_cents: price,
    promo_price_cents: promo,
    ingredients: toList(v.ingredients),
    prep_minutes: Math.min(180, Math.max(1, Math.floor(Number(v.prep)) || 15)),
    internal_code: String(v.code || "").trim() || null,
    requires_doneness: form.elements.doneness.checked,
    featured: form.elements.featured.checked,
    sold_out: form.elements.soldOut.checked,
    active: form.elements.active.checked,
  };
  if (!id) {
    body.slug = uniqueSlug(slugify(v.name), data.products.map((p) => p.slug));
    body.display_order = Math.max(0, ...data.products.map((p) => p.order || 0)) + 1;
  }
  try {
    const rows = await dbWrite(id ? `products?id=eq.${encodeURIComponent(id)}` : "products", id ? "PATCH" : "POST", body);
    const hadAddons = id ? Boolean(data.products.find((p) => p.id === id)?.addons) : false;
    if (form.elements.addons.checked !== hadAddons) await syncAddonLink(rows[0].id, form.elements.addons.checked);
    closeModal();
    await loadCatalog();
    renderCurrent({ silent: true });
    toast("Produto salvo. O site já mostra a alteração.");
  } catch {
    toast("Não foi possível salvar o produto.", "error");
  }
}

function saveOrder(form) {
  if (!requireFields(form, ["customer", "phone", "total"])) return;
  const values = formData(form);
  const total = Number(String(values.total).replace(",", ".")) || 0;
  const next = {
    id: uid("order"),
    number: `#${1100 + data.orders.length}`,
    status: "new",
    elapsed: "01 min",
    customer: values.customer,
    phone: values.phone,
    itemsCount: String(values.items || "").split(";").filter(Boolean).length || 1,
    mode: values.mode,
    total,
    subtotal: Math.max(total - (values.mode === "Entrega" ? 6.9 : 0), 0),
    deliveryFee: values.mode === "Entrega" ? 6.9 : 0,
    discount: 0,
    address: values.address,
    reference: "Pedido criado manualmente no protótipo.",
    eta: values.mode === "Entrega" ? "35-45 min" : "20-25 min",
    payment: values.payment,
    change: "",
    timeline: ["Pedido criado manualmente"],
    items: String(values.items || "1x Brasa Bacon")
      .split(";")
      .filter(Boolean)
      .map((name) => ({ name: name.trim(), qty: 1, price: total, notes: "", addons: "" })),
  };
  data.orders.unshift(next);
  closeModal();
  saveAndRender("Pedido demonstrativo criado.");
}

async function saveCategory(form) {
  if (!requireFields(form, ["name"])) return;
  const v = formData(form);
  const id = form.dataset.id;
  const body = {
    name: v.name.trim().slice(0, 80),
    description: String(v.desc || "").trim() || null,
    display_order: Math.max(0, Math.floor(Number(v.order)) || 0),
    active: form.elements.active.checked,
  };
  if (!id) body.slug = uniqueSlug(slugify(v.name), data.categories.map((c) => c.slug));
  try {
    await dbWrite(id ? `categories?id=eq.${encodeURIComponent(id)}` : "categories", id ? "PATCH" : "POST", body);
    closeModal();
    await loadCatalog();
    renderCurrent({ silent: true });
    toast("Categoria salva. O site já usa a nova ordem e os nomes.");
  } catch {
    toast("Não foi possível salvar a categoria.", "error");
  }
}

function dateInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/* ---------- Configurações da loja: gravadas em store_settings e business_hours; o site lê as mesmas tabelas ---------- */

async function loadSettings() {
  try {
    const [rows, hours] = await Promise.all([
      auth.restAuth("store_settings?select=*&id=eq.main"),
      auth.restAuth("business_hours?select=day,closed,open_time,close_time&order=day"),
    ]);
    const r = Array.isArray(rows) ? rows[0] : null;
    if (!r) throw new Error("no settings");
    const s = data.settings;
    s.store = { name: r.store_name || "", cnpj: r.cnpj || "", phone: r.phone || "", whatsapp: r.whatsapp || "", email: r.email || "", address: r.address || "" };
    s.operation = {
      open: Boolean(r.open),
      avgMin: r.avg_delivery_min,
      avgMax: r.avg_delivery_max,
      minOrder: ((r.min_order_cents || 0) / 100).toFixed(2).replace(".", ","),
      pauseReason: r.pause_reason || "",
    };
    s.hours.enforce = Boolean(r.enforce_hours);
    s.hours.note = r.hours_note || "";
    s.hours.days = Array.from({ length: 7 }, (_, day) => {
      const h = Array.isArray(hours) ? hours.find((item) => item.day === day) : null;
      return h ? { closed: h.closed, open: String(h.open_time).slice(0, 5), close: String(h.close_time).slice(0, 5) } : { closed: day === 1, open: "18:00", close: "23:30" };
    });
    s.payment = { pix: Boolean(r.pay_pix), cards: Boolean(r.pay_card), cash: Boolean(r.pay_cash) };
    s.fulfillment = { delivery: Boolean(r.delivery_enabled), pickup: Boolean(r.pickup_enabled), pickupInfo: r.pickup_info || "" };
    s.notifications = { sound: Boolean(r.sound_enabled), visual: Boolean(r.visual_alerts) };
    state.storeOpen = s.operation.open;
    state.sound = s.notifications.sound;
    els.soundToggle.setAttribute("aria-pressed", String(state.sound));
    persist();
  } catch {
    toast("Não foi possível carregar as configurações da loja.", "error");
  }
}

async function saveStoreRow(body) {
  const rows = await auth.restAuth("store_settings?id=eq.main", { method: "PATCH", headers: { Prefer: "return=representation" }, body });
  if (!Array.isArray(rows) || !rows[0]) throw new Error("not saved");
  return rows[0];
}

/* ---------- Adicionais: grupos, opções e produtos ligados ficam no banco; o site lê as mesmas tabelas ---------- */

async function loadAddons() {
  try {
    const rows = await auth.restAuth(
      "addon_groups?select=id,name,required,min_select,max_select,active,display_order,addon_options(id,slug,name,price_cents,active,display_order),product_addon_groups(product_id)&order=display_order",
    );
    if (!Array.isArray(rows)) throw new Error("bad");
    data.addons = rows.map((g) => ({
      id: g.id,
      name: g.name,
      required: g.required,
      min: g.min_select,
      max: g.max_select,
      active: g.active,
      status: g.active ? "active" : "inactive",
      order: g.display_order,
      options: (g.addon_options || [])
        .slice()
        .sort((a, b) => a.display_order - b.display_order)
        .map((o) => ({ id: o.id, slug: o.slug, name: o.name, price: o.price_cents / 100, active: o.active, order: o.display_order })),
      productIds: (g.product_addon_groups || []).map((link) => link.product_id),
    }));
  } catch {
    toast("Não foi possível carregar os adicionais.", "error");
  }
}

async function saveAddon(form) {
  if (!requireFields(form, ["name", "options"])) return;
  const v = formData(form);
  const num = (x) => Number(String(x).replace(",", "."));
  const required = form.elements.required.checked;
  let min = Math.max(0, Math.floor(num(v.min)) || 0);
  const max = Math.floor(num(v.max)) || 0;
  if (required && min < 1) min = 1;
  if (max < 1 || max < min) {
    toast("A quantidade máxima precisa ser ao menos 1 e não pode ser menor que a mínima.", "error");
    return;
  }

  const parsed = [];
  const seen = new Set();
  for (const raw of String(v.options).split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const parts = line.split("|").map((part) => part.trim());
    const name = parts[0];
    const price = parts[1] ? num(parts[1]) : 0;
    if (name.length < 2 || name.length > 80 || !Number.isFinite(price) || price < 0) {
      toast(`Linha inválida: "${line.slice(0, 40)}". Use: Nome | preço (ex.: Bacon extra | 6,90).`, "error");
      return;
    }
    const key = normalize(name);
    if (seen.has(key)) {
      toast(`Opção repetida: ${name}.`, "error");
      return;
    }
    seen.add(key);
    parsed.push({ name, key, cents: Math.round(price * 100), active: (parts[2] || "").toLowerCase() !== "inativo" });
  }
  if (!parsed.length || parsed.length > 40) {
    toast("Informe de 1 a 40 opções.", "error");
    return;
  }
  if (min > parsed.filter((option) => option.active).length) {
    toast("A quantidade mínima é maior que o número de opções ativas.", "error");
    return;
  }

  const id = form.dataset.id;
  const existing = id ? data.addons.find((group) => group.id === id) : null;
  const groupBody = { name: v.name.trim().slice(0, 80), required, min_select: min, max_select: max, active: v.status === "active" };
  if (!id) groupBody.display_order = Math.max(0, ...data.addons.map((group) => group.order || 0)) + 1;

  try {
    const groupRows = await dbWrite(id ? `addon_groups?id=eq.${encodeURIComponent(id)}` : "addon_groups", id ? "PATCH" : "POST", groupBody);
    const gid = groupRows[0].id;

    const old = new Map((existing ? existing.options : []).map((option) => [normalize(option.name), option]));
    const taken = data.addons.flatMap((group) => group.options.map((option) => option.slug));
    const toInsert = [];
    for (let i = 0; i < parsed.length; i += 1) {
      const option = parsed[i];
      const prev = old.get(option.key);
      if (prev) {
        old.delete(option.key);
        const changed = prev.name !== option.name || Math.round(prev.price * 100) !== option.cents || prev.active !== option.active || prev.order !== i + 1;
        if (changed) await dbWrite(`addon_options?id=eq.${encodeURIComponent(prev.id)}`, "PATCH", { name: option.name, price_cents: option.cents, active: option.active, display_order: i + 1 });
      } else {
        const slug = uniqueSlug(slugify(option.name), taken);
        taken.push(slug);
        toInsert.push({ group_id: gid, slug, name: option.name, price_cents: option.cents, active: option.active, display_order: i + 1 });
      }
    }
    if (toInsert.length) await dbWrite("addon_options", "POST", toInsert);
    if (old.size) await auth.restAuth(`addon_options?id=in.(${[...old.values()].map((option) => encodeURIComponent(option.id)).join(",")})`, { method: "DELETE" });

    const want = $$('input[name="prod"]:checked', form).map((input) => input.value);
    const have = existing ? existing.productIds : [];
    const add = want.filter((pid) => !have.includes(pid));
    const drop = have.filter((pid) => !want.includes(pid));
    if (add.length) {
      await auth.restAuth("product_addon_groups?on_conflict=product_id,group_id", {
        method: "POST",
        headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
        body: add.map((pid) => ({ product_id: pid, group_id: gid })),
      });
    }
    if (drop.length) {
      await auth.restAuth(`product_addon_groups?group_id=eq.${encodeURIComponent(gid)}&product_id=in.(${drop.map(encodeURIComponent).join(",")})`, { method: "DELETE" });
    }

    closeModal();
    await Promise.all([loadAddons(), loadCatalog()]);
    renderCurrent({ silent: true });
    toast("Grupo salvo. O site já usa as novas opções e preços.");
  } catch {
    toast("Não foi possível salvar o grupo. Confira os dados e tente de novo.", "error");
    await loadAddons();
    renderCurrent({ silent: true });
  }
}

/* ---------- Banners: gravados na tabela banners; o site mostra só os ativos e dentro do período ---------- */

async function loadBanners() {
  try {
    const rows = await auth.restAuth(
      "banners?select=id,placement,title,body,image_url,click_url,coupon_code,status,devices,starts_at,ends_at,display_order,eyebrow,button_label&order=display_order",
    );
    if (!Array.isArray(rows)) throw new Error("bad");
    data.banners = rows.map((b) => ({
      id: b.id,
      placement: b.placement,
      title: b.title,
      text: b.body || "",
      eyebrow: b.eyebrow || "",
      buttonLabel: b.button_label || "",
      link: b.click_url || "",
      coupon: b.coupon_code || "",
      image: b.image_url || "",
      status: b.status,
      devices: b.devices,
      startsAt: b.starts_at,
      endsAt: b.ends_at,
      startsOn: dateInput(b.starts_at),
      endsOn: dateInput(b.ends_at),
      order: b.display_order,
    }));
  } catch {
    toast("Não foi possível carregar os banners.", "error");
  }
}

// Estado exibido no painel: o site só mostra "ativo" (status ativo e dentro do período).
function bannerState(banner) {
  if (banner.status !== "active") return "inactive";
  const now = Date.now();
  if (banner.startsAt && new Date(banner.startsAt).getTime() > now) return "scheduled";
  if (banner.endsAt && new Date(banner.endsAt).getTime() < now) return "ended";
  return "active";
}

async function saveBanner(form) {
  if (!requireFields(form, ["title"])) return;
  const v = formData(form);
  const title = v.title.trim();
  const text = String(v.text || "").trim();
  const eyebrow = String(v.eyebrow || "").trim();
  const label = String(v.buttonLabel || "").trim();
  const link = String(v.link || "").trim();
  const coupon = String(v.coupon || "").trim().toUpperCase();
  const image = String(v.image || "").trim();
  const fail = (message) => {
    toast(message, "error");
  };
  if (title.length < 2 || title.length > 140) return fail("O título precisa ter de 2 a 140 caracteres.");
  if (text.length > 400) return fail("O texto pode ter no máximo 400 caracteres.");
  if (eyebrow.length > 80) return fail("O texto pequeno pode ter no máximo 80 caracteres.");
  if (label.length > 40) return fail("O texto do botão pode ter no máximo 40 caracteres.");
  if (link && !/^(#[A-Za-z0-9_-]*|https:\/\/\S+)$/.test(link)) return fail("Destino inválido. Use #secao ou um endereço https://.");
  if (coupon && !/^[A-Z0-9_-]{2,30}$/.test(coupon)) return fail("Cupom: 2 a 30 letras, números, hífen ou sublinhado.");
  if (image && !/^(assets\/[A-Za-z0-9_./-]{1,120}|https:\/\/[^\s"'()<>\\]{1,500})$/.test(image)) return fail("Imagem inválida. Use assets/arquivo.jpg ou um endereço https://.");
  const startsAt = v.starts ? new Date(`${v.starts}T00:00:00`).toISOString() : null;
  const endsAt = v.ends ? new Date(`${v.ends}T23:59:59`).toISOString() : null;
  if (startsAt && endsAt && endsAt < startsAt) return fail("A data final precisa ser depois da inicial.");

  const body = {
    placement: v.placement === "hero" ? "hero" : "promo",
    title,
    body: text,
    eyebrow: eyebrow || null,
    button_label: label || null,
    click_url: link || null,
    coupon_code: coupon || null,
    image_url: image || null,
    status: v.status === "active" ? "active" : "ended",
    devices: ["desktop", "mobile"].includes(v.devices) ? v.devices : "all",
    starts_at: startsAt,
    ends_at: endsAt,
    display_order: Math.max(1, Math.floor(Number(v.order)) || 1),
  };
  const id = form.dataset.id;
  try {
    await dbWrite(id ? `banners?id=eq.${encodeURIComponent(id)}` : "banners", id ? "PATCH" : "POST", body);
    closeModal();
    await loadBanners();
    renderCurrent({ silent: true });
    toast("Campanha salva. O site já usa a alteração.");
  } catch {
    toast("Não foi possível salvar a campanha.", "error");
  }
}

async function duplicateBannerAction(id) {
  const b = data.banners.find((item) => item.id === id);
  if (!b) return;
  try {
    await dbWrite("banners", "POST", {
      placement: b.placement,
      title: `${b.title} cópia`.slice(0, 140),
      body: b.text,
      eyebrow: b.eyebrow || null,
      button_label: b.buttonLabel || null,
      click_url: b.link || null,
      coupon_code: b.coupon || null,
      image_url: b.image || null,
      status: "ended",
      devices: b.devices,
      starts_at: b.startsAt,
      ends_at: b.endsAt,
      display_order: Math.max(0, ...data.banners.map((item) => item.order || 0)) + 1,
    });
    toast("Campanha duplicada como desativada. Ative quando quiser publicar.");
  } catch {
    toast("Não foi possível duplicar a campanha.", "error");
  }
  await loadBanners();
  renderCurrent({ silent: true });
}

/* ---------- Catálogo (produtos e categorias) gravado no banco; o site público lê as mesmas tabelas ---------- */

const slugify = (t) =>
  String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "item";

function uniqueSlug(base, taken) {
  let slug = base;
  let n = 2;
  while (taken.includes(slug)) slug = `${base}-${n++}`.slice(0, 70);
  return slug;
}

async function dbWrite(path, method, body) {
  const rows = await auth.restAuth(path, { method, headers: { Prefer: "return=representation" }, body });
  if (!Array.isArray(rows) || !rows[0]) throw new Error("not saved");
  return rows;
}

const toList = (text) => String(text || "").split(",").map((x) => x.trim()).filter(Boolean).slice(0, 20);

async function loadCatalog() {
  try {
    const [cats, prods] = await Promise.all([
      auth.restAuth("categories?select=id,name,slug,description,display_order,active&order=display_order"),
      auth.restAuth("products?select=id,slug,name,description,image_url,price_cents,promo_price_cents,ingredients,prep_minutes,internal_code,requires_doneness,featured,sold_out,active,display_order,category_id,product_addon_groups(group_id)&order=display_order"),
    ]);
    if (!Array.isArray(cats) || !Array.isArray(prods)) throw new Error("bad");
    const names = new Map(cats.map((c) => [c.id, c.name]));
    data.categories = cats.map((c) => ({ id: c.id, slug: c.slug, name: c.name, desc: c.description || "", active: c.active, order: c.display_order }));
    data.products = prods.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      categoryId: p.category_id,
      category: names.get(p.category_id) || "Sem categoria",
      badge: "",
      desc: p.description || "",
      price: p.price_cents / 100,
      promo: p.promo_price_cents == null ? "" : String(p.promo_price_cents / 100),
      image: p.image_url || "assets/brasa-bacon.jpg",
      active: p.active,
      soldOut: p.sold_out,
      featured: p.featured,
      prep: p.prep_minutes,
      ingredients: (p.ingredients || []).join(", "),
      addons: Array.isArray(p.product_addon_groups) && p.product_addon_groups.length > 0,
      doneness: p.requires_doneness,
      code: p.internal_code || "",
      order: p.display_order,
    }));
  } catch {
    toast("Não foi possível carregar produtos e categorias.", "error");
  }
}

// Liga/desliga a personalização (grupo "Adicionais") de um produto no site.
async function syncAddonLink(productId, want) {
  let groups = await auth.restAuth("addon_groups?select=id&name=eq.Adicionais&limit=1");
  if (!Array.isArray(groups) || !groups[0]) groups = await auth.restAuth("addon_groups?select=id&order=display_order&limit=1");
  const gid = Array.isArray(groups) && groups[0] && groups[0].id;
  if (!gid) return;
  if (want) {
    await auth.restAuth("product_addon_groups?on_conflict=product_id,group_id", {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
      body: { product_id: productId, group_id: gid },
    });
  } else {
    await auth.restAuth(`product_addon_groups?product_id=eq.${encodeURIComponent(productId)}&group_id=eq.${encodeURIComponent(gid)}`, { method: "DELETE" });
  }
}

async function patchRow(table, id, body, okMessage) {
  try {
    await dbWrite(`${table}?id=eq.${encodeURIComponent(id)}`, "PATCH", body);
    toast(okMessage);
  } catch {
    toast("Não foi possível salvar a alteração.", "error");
  }
  await loadCatalog();
  renderCurrent({ silent: true });
}

async function deleteRow(table, id, okMessage) {
  try {
    await dbWrite(`${table}?id=eq.${encodeURIComponent(id)}`, "DELETE");
    toast(okMessage);
  } catch {
    toast("Não foi possível excluir.", "error");
  }
  await Promise.all([loadCatalog(), loadAddons(), loadBanners()]);
  renderCurrent({ silent: true });
}

async function duplicateProductAction(id) {
  const p = data.products.find((x) => x.id === id);
  if (!p) return;
  try {
    const rows = await dbWrite("products", "POST", {
      category_id: p.categoryId,
      name: `${p.name} cópia`.slice(0, 120),
      slug: uniqueSlug(`${p.slug}-copia`, data.products.map((x) => x.slug)),
      description: p.desc,
      image_url: p.image,
      price_cents: Math.round(p.price * 100),
      promo_price_cents: p.promo ? Math.round(Number(p.promo) * 100) : null,
      ingredients: toList(p.ingredients),
      prep_minutes: p.prep,
      internal_code: p.code || null,
      requires_doneness: p.doneness,
      featured: false,
      sold_out: false,
      active: false,
      display_order: Math.max(0, ...data.products.map((x) => x.order || 0)) + 1,
    });
    await syncAddonLink(rows[0].id, p.addons);
    toast("Produto duplicado como inativo. Ative quando quiser publicar.");
  } catch {
    toast("Não foi possível duplicar o produto.", "error");
  }
  await loadCatalog();
  renderCurrent({ silent: true });
}

async function duplicateCategory_(id) {
  const c = data.categories.find((x) => x.id === id);
  if (!c) return;
  try {
    await dbWrite("categories", "POST", {
      name: `${c.name} cópia`.slice(0, 80),
      slug: uniqueSlug(`${c.slug}-copia`, data.categories.map((x) => x.slug)),
      description: c.desc || null,
      display_order: Math.max(0, ...data.categories.map((x) => x.order || 0)) + 1,
      active: false,
    });
    toast("Categoria duplicada como inativa.");
  } catch {
    toast("Não foi possível duplicar a categoria.", "error");
  }
  await loadCatalog();
  renderCurrent({ silent: true });
}

/* ---------- Cupons: gravados no banco; a validação e o desconto são calculados no servidor ---------- */

const COUPON_TYPES = { percent: "Percentual", fixed: "Valor fixo", free_delivery: "Frete grátis" };
const COUPON_TYPE_KEYS = { Percentual: "percent", "Valor fixo": "fixed", "Frete grátis": "free_delivery" };

async function loadCoupons() {
  try {
    const rows = await auth.restAuth("coupons?select=id,code,discount_type,percent_off,value_cents,min_order_cents,usage_limit,used_count,valid_until,active&order=created_at.desc");
    if (!Array.isArray(rows)) throw new Error("bad");
    const now = Date.now();
    data.coupons = rows.map((c) => {
      const expired = c.valid_until && new Date(c.valid_until).getTime() < now;
      const exhausted = c.usage_limit != null && c.used_count >= c.usage_limit;
      const num = c.discount_type === "percent" ? Number(c.percent_off) : (c.value_cents || 0) / 100;
      return {
        id: c.id,
        code: c.code,
        dbType: c.discount_type,
        type: COUPON_TYPES[c.discount_type] || c.discount_type,
        valueNum: num,
        value: c.discount_type === "percent" ? `${num}%` : c.discount_type === "fixed" ? money(num) : "Frete grátis",
        minNum: (c.min_order_cents || 0) / 100,
        min: money((c.min_order_cents || 0) / 100),
        uses: c.used_count,
        limit: c.usage_limit,
        dateValue: dateInput(c.valid_until),
        expires: c.valid_until ? new Date(c.valid_until).toLocaleDateString("pt-BR") : "Sem validade",
        active: c.active,
        status: !c.active ? "inactive" : expired ? "expired" : exhausted ? "exhausted" : "active",
      };
    });
  } catch {
    toast("Não foi possível carregar os cupons.", "error");
  }
}

async function saveCoupon(form) {
  if (!requireFields(form, ["code"])) return;
  const v = formData(form);
  const code = String(v.code).trim().toUpperCase();
  const dbType = COUPON_TYPE_KEYS[v.type] || "percent";
  const num = (x) => Number(String(x).replace(",", "."));
  const value = num(v.value);
  if (!/^[A-Z0-9_-]{2,30}$/.test(code)) {
    toast("Código: 2 a 30 letras, números, hífen ou sublinhado, sem espaços.", "error");
    return;
  }
  if (dbType === "percent" && !(value > 0 && value <= 100)) {
    toast("Informe um percentual entre 0 e 100.", "error");
    return;
  }
  if (dbType === "fixed" && !(value > 0)) {
    toast("Informe o valor do desconto.", "error");
    return;
  }
  const limitText = String(v.limit || "").trim();
  const limit = limitText ? Math.floor(num(limitText)) : null;
  if (limit !== null && !(limit > 0)) {
    toast("O limite de usos precisa ser maior que zero (ou deixe em branco).", "error");
    return;
  }
  const body = {
    code,
    discount_type: dbType,
    percent_off: dbType === "percent" ? value : null,
    value_cents: dbType === "fixed" ? Math.round(value * 100) : null,
    min_order_cents: Math.max(0, Math.round((num(v.min) || 0) * 100)),
    usage_limit: limit,
    valid_until: v.expires ? new Date(`${v.expires}T23:59:59`).toISOString() : null,
    active: v.status === "active",
  };
  const id = form.dataset.id;
  try {
    await dbWrite(id ? `coupons?id=eq.${encodeURIComponent(id)}` : "coupons", id ? "PATCH" : "POST", body);
    closeModal();
    await loadCoupons();
    renderCurrent({ silent: true });
    toast("Cupom salvo.");
  } catch {
    toast("Não foi possível salvar o cupom (o código precisa ser único).", "error");
  }
}

async function toggleCoupon(id) {
  const c = data.coupons.find((x) => x.id === id);
  if (!c) return;
  try {
    await dbWrite(`coupons?id=eq.${encodeURIComponent(id)}`, "PATCH", { active: !c.active });
    toast(c.active ? "Cupom desativado." : "Cupom ativado.");
  } catch {
    toast("Não foi possível alterar o cupom.", "error");
  }
  await loadCoupons();
  renderCurrent({ silent: true });
}

async function duplicateCoupon_(id) {
  const c = data.coupons.find((x) => x.id === id);
  if (!c) return;
  try {
    await dbWrite("coupons", "POST", {
      code: `${c.code}-COPIA`.slice(0, 30),
      discount_type: c.dbType,
      percent_off: c.dbType === "percent" ? c.valueNum : null,
      value_cents: c.dbType === "fixed" ? Math.round(c.valueNum * 100) : null,
      min_order_cents: Math.round(c.minNum * 100),
      usage_limit: c.limit,
      valid_until: c.dateValue ? new Date(`${c.dateValue}T23:59:59`).toISOString() : null,
      active: false,
    });
    toast("Cupom duplicado como inativo. Ajuste o código antes de ativar.");
  } catch {
    toast("Não foi possível duplicar o cupom (já existe uma cópia).", "error");
  }
  await loadCoupons();
  renderCurrent({ silent: true });
}

/* Áreas e taxas: gravadas no banco (delivery_areas). O site público lê a mesma tabela. */
async function loadDelivery() {
  try {
    const rows = await auth.restAuth("delivery_areas?select=id,name,fee_cents,extra_minutes,min_order_cents,coverage,active&order=name");
    if (!Array.isArray(rows)) return;
    data.delivery = rows.map((r) => ({
      id: r.id,
      name: r.name,
      fee: r.fee_cents / 100,
      extraMin: r.extra_minutes,
      extra: `+${r.extra_minutes} min`,
      min: r.min_order_cents / 100,
      coverage: r.coverage || "",
      status: r.active ? "active" : "inactive",
    }));
  } catch {
    toast("Não foi possível carregar as áreas de entrega.", "error");
  }
}

async function saveDelivery(form) {
  if (!requireFields(form, ["name", "fee", "coverage"])) return;
  const v = formData(form);
  const num = (x) => Number(String(x).replace(",", ".")) || 0;
  const body = {
    name: v.name.trim(),
    fee_cents: Math.round(num(v.fee) * 100),
    extra_minutes: Math.max(0, Math.floor(num(v.extraMin))),
    min_order_cents: Math.round(num(v.min) * 100),
    coverage: v.coverage.trim(),
    active: v.status === "active",
  };
  const id = form.dataset.id;
  try {
    const rows = await auth.restAuth(id ? `delivery_areas?id=eq.${encodeURIComponent(id)}` : "delivery_areas", {
      method: id ? "PATCH" : "POST",
      headers: { Prefer: "return=representation" },
      body,
    });
    if (!Array.isArray(rows) || !rows[0]) throw new Error("not saved");
    closeModal();
    await loadDelivery();
    renderCurrent({ silent: true });
    toast("Área de entrega salva. O site já usa a nova taxa.");
  } catch {
    toast("Não foi possível salvar a área (o nome precisa ser único).", "error");
  }
}

async function toggleDelivery(id) {
  const region = data.delivery.find((item) => item.id === id);
  if (!region) return;
  try {
    const rows = await auth.restAuth(`delivery_areas?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: { active: region.status !== "active" },
    });
    if (!Array.isArray(rows) || !rows[0]) throw new Error("not saved");
    await loadDelivery();
    renderCurrent({ silent: true });
    toast("Status da área atualizado.");
  } catch {
    toast("Não foi possível alterar a área.", "error");
  }
}

function upsert(list, item) {
  const index = list.findIndex((entry) => entry.id === item.id);
  if (index >= 0) list[index] = item;
  else list.unshift(item);
}

async function saveSettings(form) {
  const type = form.dataset.settingsForm;
  const v = formData(form);
  const checked = (name) => Boolean(form.elements[name]?.checked);
  const num = (x) => Number(String(x).replace(",", "."));
  const text = (x) => String(x || "").trim();
  const fail = (message) => {
    toast(message, "error");
  };
  let body = null;
  let hoursBody = null;

  if (type === "store") {
    const name = text(v.name);
    const email = text(v.email);
    const wa = text(v.whatsapp).replace(/\D/g, "");
    if (name.length < 2 || name.length > 80) return fail("Informe o nome da loja (2 a 80 caracteres).");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return fail("E-mail inválido.");
    if (wa && (wa.length < 10 || wa.length > 13)) return fail("WhatsApp com DDD, por exemplo (11) 99999-2026.");
    body = {
      store_name: name,
      cnpj: text(v.cnpj) || null,
      phone: text(v.phone) || null,
      whatsapp: text(v.whatsapp) || null,
      email: email || null,
      address: text(v.address) || null,
    };
  } else if (type === "operation") {
    const min = Math.floor(num(v.avgMin));
    const max = Math.floor(num(v.avgMax));
    const minOrder = num(v.minOrder || 0);
    if (!(min >= 1 && min <= 300 && max >= min && max <= 600)) return fail("Tempo médio: mínimo de 1 a 300 e máximo igual ou maior que o mínimo (até 600).");
    if (!Number.isFinite(minOrder) || minOrder < 0) return fail("Informe um pedido mínimo válido.");
    body = { open: checked("open"), avg_delivery_min: min, avg_delivery_max: max, min_order_cents: Math.round(minOrder * 100), pause_reason: text(v.pauseReason).slice(0, 200) || null };
  } else if (type === "hours") {
    hoursBody = [];
    for (const day of [1, 2, 3, 4, 5, 6, 0]) {
      const closed = !checked(`day-${day}`);
      const open = v[`open-${day}`] || "18:00";
      const close = v[`close-${day}`] || "23:30";
      if (!closed && !(close > open)) return fail(`${DAY_NAMES[day]}: o fechamento precisa ser depois da abertura.`);
      hoursBody.push({ day, closed, open_time: open, close_time: close });
    }
    body = { enforce_hours: checked("enforce"), hours_note: text(v.note).slice(0, 200) || null };
  } else if (type === "payment") {
    if (!checked("pix") && !checked("cards") && !checked("cash")) return fail("Deixe ao menos uma forma de pagamento ligada.");
    body = { pay_pix: checked("pix"), pay_card: checked("cards"), pay_cash: checked("cash") };
  } else if (type === "fulfillment") {
    if (!checked("delivery") && !checked("pickup")) return fail("Deixe entrega ou retirada ligada.");
    body = { delivery_enabled: checked("delivery"), pickup_enabled: checked("pickup"), pickup_info: text(v.pickupInfo).slice(0, 200) || null };
  } else if (type === "notifications") {
    body = { sound_enabled: checked("sound"), visual_alerts: checked("visual") };
  } else {
    return;
  }

  try {
    if (hoursBody) {
      await auth.restAuth("business_hours?on_conflict=day", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=representation" },
        body: hoursBody,
      });
    }
    await saveStoreRow(body);
    await loadSettings();
    toast("Configurações salvas. O site já usa os novos valores.");
  } catch {
    toast("Não foi possível salvar as configurações. Confira os dados e tente de novo.", "error");
    await loadSettings();
  }
  renderCurrent({ silent: true });
}

function duplicate(collection, id, labelKey = "name") {
  const list = data[collection];
  const item = list.find((entry) => entry.id === id);
  if (!item) return;
  const copy = structuredClone(item);
  copy.id = uid(collection.slice(0, 3));
  copy[labelKey] = `${copy[labelKey]} cópia`;
  list.unshift(copy);
  saveAndRender("Item duplicado.");
}

function removeFrom(collection, id, message) {
  data[collection] = data[collection].filter((item) => item.id !== id);
  saveAndRender(message);
}

function handleAction(action) {
  if (action === "toggle-store") toggleStore();
  if (action === "test-bell") ringBell().then((ok) => toast(ok ? "Sino tocado." : "O navegador bloqueou o som. Clique na página e tente de novo.", ok ? "success" : "error"));
  if (action === "reorder") toast("Modo de reordenação demonstrativo ativado.");
}

function bindEvents() {
  els.sideNav.addEventListener("click", (event) => {
    const button = event.target.closest("[data-view]");
    if (button) setView(button.dataset.view);
  });

  els.viewRoot.addEventListener("click", (event) => {
    const viewButton = event.target.closest("[data-view]");
    if (viewButton) return setView(viewButton.dataset.view);

    const advance = event.target.closest("[data-advance]");
    if (advance) {
      const target = state.orders.find((item) => item.id === advance.dataset.advance);
      const step = target && nextAction(target);
      if (step) changeStatus(target.id, step.status);
      return;
    }

    const orderButton = event.target.closest("[data-open-order]");
    if (orderButton) return openOrderDrawer(orderButton.dataset.openOrder);

    const action = event.target.closest("[data-action]");
    if (action) return handleAction(action.dataset.action);

    const modal = event.target.closest("[data-modal]");
    if (modal) return openEntityModal(modal.dataset.modal);

    const editProduct = event.target.closest("[data-edit-product]");
    if (editProduct) return openEntityModal("product", editProduct.dataset.editProduct);
    const duplicateProduct = event.target.closest("[data-duplicate-product]");
    if (duplicateProduct) return duplicateProductAction(duplicateProduct.dataset.duplicateProduct);
    const stockProduct = event.target.closest("[data-stock-product]");
    if (stockProduct) {
      const product = data.products.find((item) => item.id === stockProduct.dataset.stockProduct);
      if (!product) return;
      return patchRow("products", product.id, { sold_out: !product.soldOut }, product.soldOut ? "Produto reposto." : "Produto marcado como esgotado.");
    }
    const deleteProduct = event.target.closest("[data-delete-product]");
    if (deleteProduct) return askConfirm("Excluir produto", "O produto será removido do banco e do site. Isso não pode ser desfeito.", () => deleteRow("products", deleteProduct.dataset.deleteProduct, "Produto excluído."));

    const editCategory = event.target.closest("[data-edit-category]");
    if (editCategory) return openEntityModal("category", editCategory.dataset.editCategory);
    const duplicateCategory = event.target.closest("[data-duplicate-category]");
    if (duplicateCategory) return duplicateCategory_(duplicateCategory.dataset.duplicateCategory);
    const deleteCategory = event.target.closest("[data-delete-category]");
    if (deleteCategory) return askConfirm("Excluir categoria", "Os produtos dela ficam sem categoria e somem do site até você movê-los. Isso não pode ser desfeito.", () => deleteRow("categories", deleteCategory.dataset.deleteCategory, "Categoria excluída."));

    const editAddon = event.target.closest("[data-edit-addon]");
    if (editAddon) return openEntityModal("addon", editAddon.dataset.editAddon);
    const deleteAddon = event.target.closest("[data-delete-addon]");
    if (deleteAddon) return askConfirm("Excluir grupo", "O grupo e suas opções serão removidos, e os produtos perdem esses adicionais no site. Isso não pode ser desfeito.", () => deleteRow("addon_groups", deleteAddon.dataset.deleteAddon, "Grupo excluído."));

    const editCoupon = event.target.closest("[data-edit-coupon]");
    if (editCoupon) return openEntityModal("coupon", editCoupon.dataset.editCoupon);
    const duplicateCoupon = event.target.closest("[data-duplicate-coupon]");
    if (duplicateCoupon) return duplicateCoupon_(duplicateCoupon.dataset.duplicateCoupon);
    const disableCoupon = event.target.closest("[data-disable-coupon]");
    if (disableCoupon) {
      return toggleCoupon(disableCoupon.dataset.disableCoupon);
    }

    const editDelivery = event.target.closest("[data-edit-delivery]");
    if (editDelivery) return openEntityModal("delivery", editDelivery.dataset.editDelivery);
    const disableDelivery = event.target.closest("[data-disable-delivery]");
    if (disableDelivery) {
      return toggleDelivery(disableDelivery.dataset.disableDelivery);
    }

    const editBanner = event.target.closest("[data-edit-banner]");
    if (editBanner) return openEntityModal("banner", editBanner.dataset.editBanner);
    const duplicateBanner = event.target.closest("[data-duplicate-banner]");
    if (duplicateBanner) return duplicateBannerAction(duplicateBanner.dataset.duplicateBanner);
    const deleteBanner = event.target.closest("[data-delete-banner]");
    if (deleteBanner) return askConfirm("Excluir campanha", "A campanha será removida do banco e do site. Isso não pode ser desfeito.", () => deleteRow("banners", deleteBanner.dataset.deleteBanner, "Campanha excluída."));
  });

  els.viewRoot.addEventListener("change", (event) => {
    if (event.target.matches("[data-product-category]")) {
      state.productCategory = event.target.value;
      renderCurrent();
    }
    if (event.target.matches("[data-product-availability]")) {
      state.productAvailability = event.target.value;
      renderCurrent();
    }
    if (event.target.matches("[data-toggle-product]")) {
      patchRow("products", event.target.dataset.toggleProduct, { active: event.target.checked }, event.target.checked ? "Produto ativado." : "Produto inativado.");
    }
    if (event.target.matches("[data-toggle-category]")) {
      patchRow("categories", event.target.dataset.toggleCategory, { active: event.target.checked }, "Status da categoria atualizado.");
    }
  });

  els.viewRoot.addEventListener("input", (event) => {
    if (event.target.matches("[data-local-search]")) {
      state.query = event.target.value;
      renderCurrent();
      const input = $("[data-local-search]", els.viewRoot);
      input?.focus();
      input?.setSelectionRange(input.value.length, input.value.length);
    }
  });

  els.viewRoot.addEventListener("click", (event) => {
    const filter = event.target.closest("[data-order-filter]");
    if (filter) {
      state.orderFilter = filter.dataset.orderFilter;
      renderCurrent();
    }
    const tab = event.target.closest("[data-settings-tab]");
    if (tab) {
      state.settingsTab = tab.dataset.settingsTab;
      if (state.settingsTab === "users") loadAdmins().then(() => renderCurrent({ silent: true }));
      renderCurrent();
    }
    const removeAdmin = event.target.closest("[data-remove-admin]");
    if (removeAdmin) {
      const email = removeAdmin.dataset.removeAdmin;
      askConfirm("Remover acesso", `${email} deixará de ser administrador.`, () => setRole(email, "customer"));
    }
  });

  els.modalBackdrop.addEventListener("click", (event) => {
    if (event.target === els.modalBackdrop || event.target.closest("[data-close-modal]")) closeModal();
  });

  els.modalPanel.addEventListener("change", (event) => {
    if (event.target.matches("[data-image-upload]") && event.target.files?.[0]) {
      const reader = new FileReader();
      reader.onload = () => {
        state.modalImage = reader.result;
        $("#imagePreview", els.modalPanel).src = state.modalImage;
      };
      reader.readAsDataURL(event.target.files[0]);
    }
    if (event.target.name === "imageChoice") {
      state.modalImage = event.target.value;
      $("#imagePreview", els.modalPanel).src = state.modalImage;
    }
  });

  els.modalPanel.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.target.closest("form");
    const handlers = {
      product: saveProduct,
      order: saveOrder,
      category: saveCategory,
      addon: saveAddon,
      coupon: saveCoupon,
      delivery: saveDelivery,
      banner: saveBanner,
      reject: saveReject,
    };
    const type = form?.dataset.form;
    if (type && handlers[type]) handlers[type](form);
    if (form?.dataset.settingsForm) saveSettings(form);
  });

  els.viewRoot.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.target.closest("form");
    if (form?.matches("[data-users-form]")) {
      const v = formData(form);
      const email = String(v.email || "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return toast("Informe um e-mail válido.", "error");
      const role = v.role === "customer" ? "customer" : "admin";
      if (role === "customer") return askConfirm("Remover acesso", `${email} deixará de ser administrador.`, () => setRole(email, role));
      return setRole(email, role);
    }
    if (form?.dataset.settingsForm) saveSettings(form);
  });

  els.drawerBackdrop.addEventListener("click", closeDrawer);
  els.orderDrawer.addEventListener("click", (event) => {
    if (event.target.closest("[data-close-drawer]")) return closeDrawer();
    const button = event.target.closest("[data-order-action]");
    if (!button) return;
    const order = state.orders.find((item) => item.id === button.dataset.id);
    if (!order) return;
    const action = button.dataset.orderAction;
    if (action === "print") printOrder(order);
    if (action === "talk") {
      const url = whatsappUrl(order);
      if (url) window.open(url, "_blank", "noopener");
      else toast("Este cliente não tem um WhatsApp válido.", "error");
    }
    if (action === "advance") {
      const step = nextAction(order);
      if (step) changeStatus(order.id, step.status);
    }
    if (action === "reject") {
      closeDrawer();
      rejectForm(order.id);
    }
  });

  els.confirmBackdrop.addEventListener("click", (event) => {
    if (event.target === els.confirmBackdrop || event.target.closest("[data-confirm-cancel]")) closeConfirm();
    if (event.target.closest("[data-confirm-ok]")) {
      const fn = state.confirm;
      closeConfirm();
      fn?.();
    }
  });

  els.menuToggle.addEventListener("click", () => {
    document.body.classList.contains("nav-open") ? closeMobileNav() : openMobileNav();
  });
  els.mobileScrim.addEventListener("click", closeMobileNav);

  els.soundToggle.addEventListener("click", async () => {
    state.sound = !state.sound;
    els.soundToggle.setAttribute("aria-pressed", String(state.sound));
    els.soundToggle.setAttribute("aria-label", state.sound ? "Som de novos pedidos ligado" : "Som de novos pedidos desligado");
    persist();
    saveStoreRow({ sound_enabled: state.sound }).catch(() => {});
    if (state.sound) {
      const ok = await ringBell(); // o clique libera o áudio do navegador e toca o sino de teste
      toast(ok ? "Sino ativado: você vai ouvir um toque a cada novo pedido." : "Sino ativado, mas o navegador bloqueou o som. Clique de novo.");
    } else {
      toast("Som de novos pedidos desativado.");
    }
  });

  els.notifyBtn.addEventListener("click", () => {
    state.orderFilter = "new";
    setView("orders");
  });
  els.profileBtn.addEventListener("click", async () => {
    if (!state.adminProfile || !auth?.configured) {
      toast("Menu de perfil indisponível sem sessão administrativa.");
      return;
    }
    await auth.signOut();
    stopPolling();
    state.adminProfile = null;
    state.orders = [];
    toast("Sessão administrativa encerrada.");
    await startAdmin();
  });

  els.globalSearch.addEventListener("input", () => {
    state.query = els.globalSearch.value;
    renderCurrent();
    els.globalSearch.focus();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!els.confirmBackdrop.hidden) return closeConfirm();
    if (!els.modalBackdrop.hidden) return closeModal();
    if (document.body.classList.contains("drawer-open")) return closeDrawer();
    if (document.body.classList.contains("nav-open")) return closeMobileNav();
  });
}

function bindOrderEvents() {
  const root = els.viewRoot;
  const clearMarks = () => root.querySelectorAll(".drop-ok, .drop-no").forEach((el) => el.classList.remove("drop-ok", "drop-no"));
  const allowed = (id, status) => {
    const order = state.orders.find((item) => item.id === id);
    return Boolean(order && (TRANSITIONS[order.status] || []).includes(status));
  };

  root.addEventListener("dragstart", (event) => {
    const card = event.target.closest && event.target.closest(".order-card");
    if (!card) return;
    state.dragId = card.dataset.openOrder;
    card.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", state.dragId);
  });

  root.addEventListener("dragend", () => {
    state.dragId = null;
    clearMarks();
    root.querySelectorAll(".dragging").forEach((el) => el.classList.remove("dragging"));
  });

  root.addEventListener("dragover", (event) => {
    const column = event.target.closest && event.target.closest(".kanban-column");
    if (!column || !state.dragId) return;
    const ok = allowed(state.dragId, column.dataset.status);
    if (ok) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    }
    clearMarks();
    column.classList.add(ok ? "drop-ok" : "drop-no");
  });

  root.addEventListener("dragleave", (event) => {
    if (!event.relatedTarget || !event.relatedTarget.closest || !event.relatedTarget.closest(".kanban-column")) clearMarks();
  });

  root.addEventListener("drop", (event) => {
    const column = event.target.closest && event.target.closest(".kanban-column");
    if (!column || !state.dragId) return;
    event.preventDefault();
    const id = state.dragId;
    state.dragId = null;
    clearMarks();
    const order = state.orders.find((item) => item.id === id);
    if (!order || order.status === column.dataset.status) return;
    if (!allowed(id, column.dataset.status)) {
      toast("Mudança não permitida. Siga a ordem: novo, confirmado, preparo, entrega, entregue.", "error");
      return;
    }
    changeStatus(id, column.dataset.status);
  });

  root.addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && event.target.classList && event.target.classList.contains("order-card")) {
      event.preventDefault();
      openOrderDrawer(event.target.dataset.openOrder);
    }
  });

  document.addEventListener("pointerdown", unlockAudio);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) pollOrders(false);
  });
}

async function startAdmin() {
  const allowed = await requireAdminAccess();
  if (!allowed) return;
  await loadSettings();
  await loadDelivery();
  await loadCatalog();
  await loadCoupons();
  await loadAddons();
  await loadBanners();
  await loadAdmins();
  await pollOrders(true);
  setView("overview", false);
  startPolling();
}

function init() {
  els.soundToggle.setAttribute("aria-pressed", String(state.sound));
  els.headerDate.textContent = todayLabel();
  bindEvents();
  bindOrderEvents();
  startAdmin();
}

init();
