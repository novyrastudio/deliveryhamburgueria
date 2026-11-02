const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "admin", "admin.js"), "utf8");
const start = source.indexOf("function beginProductReorder() {");
const end = source.indexOf("\nfunction renderCategories()", start);
if (start < 0 || end < 0) throw new Error("Não foi possível localizar as funções de ordenação em admin.js");

function createHarness(restAuth = async (url) => [{ id: decodeURIComponent(url.match(/id=eq\.([^&]+)/)[1]) }]) {
  const products = [
    { id: "a", name: "Alfa", order: 10 },
    { id: "b", name: "Beta", order: 20 },
    { id: "c", name: "Gama", order: 30 },
  ];
  const data = { products };
  const state = {
    productCategory: "Burgers",
    productAvailability: "active",
    query: "alfa",
    reorderingProducts: false,
    productOrderSnapshot: null,
  };
  const calls = [];
  const messages = [];
  const context = {
    data,
    state,
    auth: { restAuth: async (...args) => { calls.push(args); return restAuth(...args); } },
    renderCurrent() {},
    loadCatalog: async () => {},
    toast(message, tone) { messages.push({ message, tone }); },
  };
  vm.runInNewContext(`${source.slice(start, end)}\nglobalThis.api = { beginProductReorder, moveProduct, cancelProductReorder, saveProductReorder };`, context);
  return { api: context.api, data, state, calls, messages };
}

test("mover e cancelar restauram a ordem original", () => {
  const h = createHarness();
  h.api.beginProductReorder();
  h.api.moveProduct("c", "up");
  assert.deepEqual(JSON.parse(JSON.stringify(h.data.products.map((item) => item.id))), ["a", "c", "b"]);
  assert.equal(h.state.productCategory, "all");
  assert.equal(h.state.productAvailability, "all");
  h.api.cancelProductReorder();
  assert.deepEqual(JSON.parse(JSON.stringify(h.data.products.map((item) => item.id))), ["a", "b", "c"]);
  assert.deepEqual(JSON.parse(JSON.stringify(h.data.products.map((item) => item.order))), [10, 20, 30]);
  assert.equal(h.state.reorderingProducts, false);
});

test("salvar atualiza só display_order em chamadas autenticadas", async () => {
  const h = createHarness();
  h.api.beginProductReorder();
  h.api.moveProduct("c", "up");
  await h.api.saveProductReorder();
  assert.equal(h.calls.length, 3);
  assert.deepEqual(JSON.parse(JSON.stringify(h.calls.map(([url, options]) => ({
    url,
    method: options.method,
    prefer: options.headers.Prefer,
    body: options.body,
  })))), [
    { url: "products?id=eq.a&select=id", method: "PATCH", prefer: "return=representation", body: { display_order: 1 } },
    { url: "products?id=eq.c&select=id", method: "PATCH", prefer: "return=representation", body: { display_order: 2 } },
    { url: "products?id=eq.b&select=id", method: "PATCH", prefer: "return=representation", body: { display_order: 3 } },
  ]);
  assert.equal(h.state.reorderingProducts, false);
  assert.equal(h.messages.at(-1).message, "Ordem atualizada no cardápio.");
});

test("falha ao salvar mantém a edição aberta para nova tentativa", async () => {
  const h = createHarness(async () => { throw new Error("offline"); });
  h.api.beginProductReorder();
  await h.api.saveProductReorder();
  assert.equal(h.state.reorderingProducts, true);
  assert.match(h.messages.at(-1).message, /gravada parcialmente/);
  assert.equal(h.messages.at(-1).tone, "error");
});
