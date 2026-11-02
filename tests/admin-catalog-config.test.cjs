const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "admin", "admin.js"), "utf8");
const storefrontSource = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");

function loadFunction(name, endMarker, context) {
  const start = source.indexOf(`async function ${name}(`);
  const end = source.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error(`Não foi possível localizar ${name}() em admin.js`);
  vm.runInNewContext(`${source.slice(start, end)}\nglobalThis.target = ${name};`, context);
  return context.target;
}

function harness({ values = {}, extra = {} } = {}) {
  const writes = [];
  const messages = [];
  const context = {
    data: { categories: [], addons: [], coupons: [], delivery: [], banners: [], ...extra.data },
    state: {},
    requireFields: () => true,
    formData: () => values,
    slugify: (value) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    normalize: (value) => String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(),
    uniqueSlug: (value, taken) => taken.includes(value) ? `${value}-2` : value,
    closeModal() {},
    loadCatalog: async () => {},
    loadAddons: async () => {},
    loadCoupons: async () => {},
    loadDelivery: async () => {},
    loadBanners: async () => {},
    loadSettings: async () => {},
    renderCurrent() {},
    toast(message, tone) { messages.push({ message, tone }); },
    dbWrite: async (...args) => { writes.push(args); return [{ id: "created-row" }]; },
    auth: {
      restAuth: async (...args) => { writes.push(args); return [{ id: "created-row" }]; },
    },
    $$: () => [],
    saveStoreRow: async (body) => { writes.push(["store_settings", "PATCH", body]); return { id: "main" }; },
    COUPON_TYPE_KEYS: { Percentual: "percent", "Valor fixo": "fixed", "Frete grátis": "free_delivery" },
    ...extra.context,
  };
  return { context, writes, messages };
}

const plain = (value) => JSON.parse(JSON.stringify(value));

test("categoria cria slug e grava campos normalizados", async () => {
  const h = harness({ values: { name: "Pizzas", desc: "Da casa", order: "3.8" } });
  const saveCategory = loadFunction("saveCategory", "\nfunction dateInput", h.context);
  await saveCategory({ dataset: { id: "" }, elements: { active: { checked: true } } });
  assert.equal(h.writes[0][0], "categories");
  assert.equal(h.writes[0][1], "POST");
  assert.deepEqual(plain(h.writes[0][2]), {
    name: "Pizzas", description: "Da casa", display_order: 3, active: true, slug: "pizzas",
  });
});

test("grupo de adicionais converte preços em centavos e cria slugs", async () => {
  const h = harness({ values: { name: "Adicionais", min: "1", max: "2", options: "Bacon extra | 6,90\nQueijo | 4,90", status: "active" } });
  const saveAddon = loadFunction("saveAddon", "\n/* ---------- Banners:", h.context);
  await saveAddon({ dataset: { id: "" }, elements: { required: { checked: true } } });
  assert.equal(h.writes.length, 2);
  assert.equal(h.writes[0][0], "addon_groups");
  assert.deepEqual(plain(h.writes[0][2]), { name: "Adicionais", required: true, min_select: 1, max_select: 2, active: true, display_order: 1 });
  assert.equal(h.writes[1][0], "addon_options");
  assert.deepEqual(plain(h.writes[1][2]).map(({ slug, price_cents }) => ({ slug, price_cents })), [
    { slug: "bacon-extra", price_cents: 690 }, { slug: "queijo", price_cents: 490 },
  ]);
});

test("cupom normaliza código, percentual, mínimo e limite", async () => {
  const h = harness({ values: { code: "brasa15", type: "Percentual", value: "15", min: "25,00", limit: "10", expires: "", status: "active" } });
  const saveCoupon = loadFunction("saveCoupon", "\nasync function toggleCoupon", h.context);
  await saveCoupon({ dataset: { id: "" } });
  assert.equal(h.writes[0][0], "coupons");
  assert.equal(h.writes[0][1], "POST");
  assert.deepEqual(plain(h.writes[0][2]), {
    code: "BRASA15", discount_type: "percent", percent_off: 15, value_cents: null,
    min_order_cents: 2500, usage_limit: 10, valid_until: null, active: true,
  });
});

test("cupom rejeita código inválido antes de chamar a API", async () => {
  const h = harness({ values: { code: "código com espaço", type: "Percentual", value: "15", min: "0", limit: "", expires: "", status: "active" } });
  const saveCoupon = loadFunction("saveCoupon", "\nasync function toggleCoupon", h.context);
  await saveCoupon({ dataset: { id: "" } });
  assert.equal(h.writes.length, 0);
  assert.equal(h.messages.at(-1).tone, "error");
});

test("área de entrega grava taxa, mínimo e faixa de CEP pela sessão autenticada", async () => {
  const h = harness({ values: { name: "Centro", fee: "6,90", extraMin: "12", min: "25,00", coverage: "01001000-01001999", status: "active" } });
  const saveDelivery = loadFunction("saveDelivery", "\nasync function toggleDelivery", h.context);
  await saveDelivery({ dataset: { id: "" } });
  assert.equal(h.writes[0][0], "delivery_areas");
  assert.equal(h.writes[0][1].method, "POST");
  assert.deepEqual(plain(h.writes[0][1].body), {
    name: "Centro", fee_cents: 690, extra_minutes: 12, min_order_cents: 2500,
    coverage: "01001000-01001999", active: true,
  });
});

test("banner aceita destinos internos e publica contrato de campos do patch 05", async () => {
  const h = harness({ values: {
    title: "Noite de brasa", text: "Oferta da casa", eyebrow: "Hoje", buttonLabel: "Ver cardápio",
    link: "#cardapio", coupon: "brasa15", image: "assets/burger-costela.jpg", starts: "", ends: "",
    placement: "hero", status: "active", devices: "mobile", order: "2",
  } });
  const saveBanner = loadFunction("saveBanner", "\nasync function duplicateBannerAction", h.context);
  await saveBanner({ dataset: { id: "" } });
  assert.equal(h.writes[0][0], "banners");
  assert.equal(h.writes[0][1], "POST");
  const body = plain(h.writes[0][2]);
  assert.equal(body.title, "Noite de brasa");
  assert.equal(body.click_url, "#cardapio");
  assert.equal(body.coupon_code, "BRASA15");
  assert.equal(body.image_url, "assets/burger-costela.jpg");
  assert.equal(body.eyebrow, "Hoje");
  assert.equal(body.button_label, "Ver cardápio");
  assert.equal(body.devices, "mobile");
  assert.equal(body.display_order, 2);
});

test("banner rejeita protocolo inseguro antes da escrita", async () => {
  const h = harness({ values: { title: "Oferta", link: "javascript:alert(1)", status: "active" } });
  const saveBanner = loadFunction("saveBanner", "\nasync function duplicateBannerAction", h.context);
  await saveBanner({ dataset: { id: "" } });
  assert.equal(h.writes.length, 0);
  assert.match(h.messages.at(-1).message, /Destino inválido/);
});

test("configuração exige ao menos uma forma de pagamento e grava opções válidas", async () => {
  const invalid = harness({ values: {}, extra: { context: {} } });
  const saveInvalid = loadFunction("saveSettings", "\nfunction duplicate(collection", invalid.context);
  await saveInvalid({ dataset: { settingsForm: "payment" }, elements: { pix: { checked: false }, cards: { checked: false }, cash: { checked: false } } });
  assert.equal(invalid.writes.length, 0);
  assert.match(invalid.messages.at(-1).message, /ao menos uma forma/);

  const valid = harness();
  const saveValid = loadFunction("saveSettings", "\nfunction duplicate(collection", valid.context);
  await saveValid({ dataset: { settingsForm: "payment" }, elements: { pix: { checked: true }, cards: { checked: false }, cash: { checked: true } } });
  assert.equal(valid.writes[0][0], "store_settings");
  assert.deepEqual(plain(valid.writes[0][2]), { pay_pix: true, pay_card: false, pay_cash: true });
});

test("caminhos de imagens da raiz são resolvidos corretamente no painel", () => {
  const safeStart = source.indexOf("function safeImg(");
  const displayStart = source.indexOf("function adminImageSrc(", safeStart);
  const displayEnd = source.indexOf("\nfunction escapeHtml", displayStart);
  assert.ok(safeStart >= 0 && displayStart > safeStart && displayEnd > displayStart);
  const context = {};
  vm.runInNewContext(`${source.slice(safeStart, displayEnd)}\nglobalThis.target = adminImageSrc;`, context);
  assert.equal(context.target("assets/catalogo-v2/brasa-bacon.jpg"), "../assets/catalogo-v2/brasa-bacon.jpg");
  assert.equal(context.target("assets/../../config.js"), "../assets/catalogo-v2/foto-pendente.svg");
  assert.equal(context.target("https://cdn.example.test/image.jpg"), "https://cdn.example.test/image.jpg");
  assert.equal(context.target("data:image/png;base64,SGVsbG8="), "data:image/png;base64,SGVsbG8=");
});

test("painel usa as fotos revisadas em seeds antigos e mantém imagens personalizadas", () => {
  const configStart = source.indexOf("const LOCAL_CATALOG_IMAGES =");
  const configEnd = source.indexOf("\n\nconst defaults", configStart);
  const helperStart = source.indexOf("function adminCatalogImageFor(", configEnd);
  const helperEnd = source.indexOf("\nfunction escapeHtml", helperStart);
  assert.ok(configStart >= 0 && configEnd > configStart && helperStart > configEnd && helperEnd > helperStart);

  const context = {};
  vm.runInNewContext(
    `${source.slice(configStart, configEnd)}\n${source.slice(helperStart, helperEnd)}\nglobalThis.target = adminCatalogImageFor; globalThis.options = imageOptions;`,
    context,
  );
  assert.equal(context.options.length, 24);
  assert.equal(context.target("burger-costela", "assets/burger-costela.jpg"), "assets/catalogo-v2/burger-costela.jpg");
  assert.equal(context.target("brownie-brasa", ""), "assets/catalogo-v2/brownie-brasa.jpg");
  assert.equal(context.target("brasa-bacon", "https://cdn.example.test/custom.jpg"), "https://cdn.example.test/custom.jpg");
});

test("entrada do painel leva ao login da loja e retorna ao arquivo correto", () => {
  assert.match(source, /actionHref: "\.\.\/index\.html\?entrar=admin"/);
  assert.match(storefrontSource, /location\.href = "admin\/index\.html"/);
  assert.doesNotMatch(storefrontSource, /location\.href = "admin\.html"/);
});
