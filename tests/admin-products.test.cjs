const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "admin", "admin.js"), "utf8");
const start = source.indexOf("async function saveProduct(form) {");
const end = source.indexOf("\nfunction saveOrder(form)", start);
if (start < 0 || end < 0) throw new Error("Não foi possível localizar saveProduct() em admin.js");

function createHarness({ id = "", currentProducts = [] } = {}) {
  const writes = [];
  const messages = [];
  const addonLinks = [];
  const data = {
    categories: [{ id: "category-1", name: "Hambúrgueres" }],
    products: currentProducts,
  };
  const context = {
    data,
    state: { modalImage: "" },
    requireFields() { return true; },
    formData() {
      return {
        name: "Novo Burger", price: "28,50", promo: "25,00", category: "Hambúrgueres",
        desc: "Hambúrguer de teste", imageChoice: "assets/burger.jpg",
        ingredients: "Pão, Carne", prep: "16", code: "NB-1",
      };
    },
    safeImg(value) { return value; },
    toList(value) { return value.split(",").map((item) => item.trim()).filter(Boolean); },
    slugify(value) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); },
    uniqueSlug(value, taken) { return taken.includes(value) ? value + "-2" : value; },
    async dbWrite(...args) { writes.push(args); return [{ id: id || "product-1" }]; },
    async syncAddonLink(...args) { addonLinks.push(args); },
    async loadCatalog() {},
    renderCurrent() {},
    closeModal() {},
    toast(message, tone) { messages.push({ message, tone }); },
  };
  const form = {
    dataset: { id },
    elements: {
      addons: { checked: true },
      doneness: { checked: true },
      featured: { checked: true },
      soldOut: { checked: false },
      active: { checked: true },
    },
  };
  vm.runInNewContext(source.slice(start, end) + "\nglobalThis.saveProduct = saveProduct;", context);
  return { saveProduct: context.saveProduct, form, writes, messages, addonLinks };
}

test("criação de produto grava campos normalizados e liga adicionais", async () => {
  const h = createHarness({ currentProducts: [{ order: 7, slug: "outro" }] });
  await h.saveProduct(h.form);
  assert.equal(h.writes.length, 1);
  assert.equal(h.writes[0][0], "products");
  assert.equal(h.writes[0][1], "POST");
  const body = JSON.parse(JSON.stringify(h.writes[0][2]));
  assert.equal(body.name, "Novo Burger");
  assert.equal(body.slug, "novo-burger");
  assert.equal(body.price_cents, 2850);
  assert.equal(body.promo_price_cents, 2500);
  assert.deepEqual(body.ingredients, ["Pão", "Carne"]);
  assert.equal(body.display_order, 8);
  assert.equal(body.featured, true);
  assert.deepEqual(JSON.parse(JSON.stringify(h.addonLinks)), [["product-1", true]]);
  assert.equal(h.messages.at(-1).message, "Produto salvo. O site já mostra a alteração.");
});

test("edição usa PATCH e não altera slug nem posição", async () => {
  const h = createHarness({
    id: "product-1",
    currentProducts: [{ id: "product-1", addons: true, order: 3, slug: "burger-original" }],
  });
  await h.saveProduct(h.form);
  assert.equal(h.writes[0][0], "products?id=eq.product-1");
  assert.equal(h.writes[0][1], "PATCH");
  const body = JSON.parse(JSON.stringify(h.writes[0][2]));
  assert.equal(Object.hasOwn(body, "slug"), false);
  assert.equal(Object.hasOwn(body, "display_order"), false);
  assert.equal(h.addonLinks.length, 0);
});
