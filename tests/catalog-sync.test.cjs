const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
const start = source.indexOf("async function loadRemoteCatalog() {");
const end = source.indexOf("\n// Cupom salvo no navegador:", start);
if (start < 0 || end < 0) throw new Error("Não foi possível localizar loadRemoteCatalog() em app.js");
const modeStart = source.indexOf("function modeAllowed(mode) {");
const modeEnd = source.indexOf("\nfunction allowedMethods()", modeStart);
if (modeStart < 0 || modeEnd < 0) throw new Error("Não foi possível localizar modeAllowed() em app.js");
const imageStart = source.indexOf("function catalogImageFor(");
const imageEnd = source.indexOf("\nfunction fillDistricts", imageStart);
if (imageStart < 0 || imageEnd < 0) throw new Error("Não foi possível localizar catalogImageFor() em app.js");
const escapeStart = source.indexOf("function escapeHtml(");
const escapeEnd = source.indexOf("\nfunction capitalize", escapeStart);
const imageTagStart = source.indexOf("function imageTag(");
const imageTagEnd = source.indexOf("\n// Uma referência quebrada", imageTagStart);
if (escapeStart < 0 || escapeEnd < 0 || imageTagStart < 0 || imageTagEnd < 0) throw new Error("Não foi possível localizar a renderização segura de imagens em app.js");

function setupCatalog(responses) {
  const products = [{ id: "old", name: "Catálogo antigo", category: "burgers", fallback: "assets/old.jpg", tags: [] }];
  const menuOrder = [{ id: "burgers", category: "burgers", title: "Hambúrgueres", hint: "" }];
  const deliveryFees = { Centro: 6.9 };
  const deliveryMin = { Centro: 2000 };
  const deliveryCoverage = { Centro: "01000-000 a 01099-999" };
  const state = { activeCategory: "burgers", district: "Centro", orderMode: "delivery", cart: [] };
  const addonGroups = [];
  const addons = [];
  const calls = [];
  const context = {
    products, menuOrder, deliveryFees, deliveryMin, deliveryCoverage, state, addonGroups, addons,
    PRODUCT_IMAGE_PLACEHOLDER: "assets/catalogo-v2/foto-pendente.svg",
    storeSettings: null,
    storePaused: false,
    auth: {
      configured: true,
      async rest(path) { calls.push(path); return responses[path.split("?")[0]]; },
      async rpc() { return { open: true, deliveryEnabled: true, pickupEnabled: true }; },
    },
    els: { orderMode: { options: [{ value: "delivery" }, { value: "pickup" }] } },
    normalizeCartItem(item) { return item; },
    fillDistricts() {}, persistCart() {}, renderTabs() {}, renderMenu() {}, renderCart() {}, applyStoreSettings() {},
  };
  vm.runInNewContext(`${source.slice(imageStart, imageEnd)}\n${source.slice(modeStart, modeEnd)}\n${source.slice(start, end)}\nglobalThis.run = loadRemoteCatalog;`, context);
  return { run: context.run, products, menuOrder, deliveryFees, deliveryMin, deliveryCoverage, state, get addonGroups() { return context.addonGroups; }, addons, calls };
}

test("catálogo, categorias e áreas vazios no remoto substituem os fallbacks locais", async () => {
  const h = setupCatalog({ products: [], addon_groups: [], delivery_areas: [], categories: [] });
  await h.run();
  assert.equal(h.products.length, 0);
  assert.equal(h.menuOrder.length, 0);
  assert.equal(Object.keys(h.deliveryFees).length, 0);
  assert.equal(Object.keys(h.deliveryMin).length, 0);
  assert.equal(Object.keys(h.deliveryCoverage).length, 0);
  assert.equal(h.state.district, "");
  assert.equal(h.state.activeCategory, "");
  assert.equal(h.state.orderMode, "pickup");
});

test("dados remotos substituem o produto e carregam faixa de CEP e adicionais", async () => {
  const h = setupCatalog({
    categories: [{ slug: "burgers", name: "Hambúrgueres", display_order: 1 }],
    products: [{
      slug: "burger-novo", name: "Burger Novo", description: "Descrição", price_cents: 3000, promo_price_cents: 2800,
      image_url: "assets/burger-novo.jpg", ingredients: ["Pão", "Carne"], requires_doneness: true, sold_out: false,
      display_order: 1, categories: { slug: "burgers" }, product_addon_groups: [{ group_id: "extras" }],
    }],
    addon_groups: [{ id: "extras", name: "Extras", required: false, min_select: 0, max_select: 2,
      addon_options: [{ slug: "bacon", name: "Bacon", price_cents: 500, display_order: 1 }] }],
    delivery_areas: [{ name: "Centro", fee_cents: 700, min_order_cents: 2500, coverage: "01000-000 a 01099-999" }],
  });
  await h.run();
  assert.equal(h.products.length, 1);
  assert.equal(h.products[0].id, "burger-novo");
  assert.equal(h.products[0].price, 28);
  assert.equal(h.products[0].doneness, true);
  assert.deepEqual(JSON.parse(JSON.stringify(h.products[0].addonGroupIds)), ["extras"]);
  assert.equal(h.addonGroups[0].options[0].id, "bacon");
  assert.equal(h.deliveryFees.Centro, 7);
  assert.equal(h.deliveryMin.Centro, 2500);
  assert.equal(h.deliveryCoverage.Centro, "01000-000 a 01099-999");
});

test("catálogo remoto usa a imagem local revisada quando a URL ainda é o seed antigo", async () => {
  const h = setupCatalog({
    categories: [{ slug: "burgers", name: "Hambúrgueres", display_order: 1 }],
    products: [{ slug: "brasa-bacon", name: "Brasa Bacon", image_url: "assets/brasa-bacon.jpg", price_cents: 3890, display_order: 1, categories: { slug: "burgers" } }],
    addon_groups: [], delivery_areas: [],
  });
  h.products.splice(0, h.products.length, { id: "brasa-bacon", image: "assets/catalogo-v2/brasa-bacon.jpg", tags: [] });
  await h.run();
  assert.equal(h.products[0].image, "assets/catalogo-v2/brasa-bacon.jpg");
  assert.equal(h.products[0].fallback, "assets/catalogo-v2/foto-pendente.svg");
});

test("imagem remota personalizada continua respeitada", async () => {
  const h = setupCatalog({
    categories: [{ slug: "burgers", name: "Hambúrgueres", display_order: 1 }],
    products: [{ slug: "brasa-bacon", name: "Brasa Bacon", image_url: "https://cdn.example.test/brasa.jpg", price_cents: 3890, display_order: 1, categories: { slug: "burgers" } }],
    addon_groups: [], delivery_areas: [],
  });
  h.products.splice(0, h.products.length, { id: "brasa-bacon", image: "assets/catalogo-v2/brasa-bacon.jpg", tags: [] });
  await h.run();
  assert.equal(h.products[0].image, "https://cdn.example.test/brasa.jpg");
});

test("atributos da imagem são escapados contra injeção via image_url", () => {
  const context = { PRODUCT_IMAGE_PLACEHOLDER: "assets/catalogo-v2/foto-pendente.svg" };
  vm.runInNewContext(`${source.slice(escapeStart, escapeEnd)}\n${source.slice(imageTagStart, imageTagEnd)}\nglobalThis.render = imageTag;`, context);
  const markup = context.render({ image: 'assets/item.jpg" onerror="alert(1)', fallback: 'assets/fallback.jpg" onerror="alert(2)', name: "Produto" });
  assert.match(markup, /src="assets\/item\.jpg&quot; onerror=&quot;alert\(1\)"/);
  assert.doesNotMatch(markup, /onerror="/);
});
