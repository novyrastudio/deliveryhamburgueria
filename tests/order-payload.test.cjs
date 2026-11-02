const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
const start = source.indexOf("function buildServerPayload() {");
const end = source.indexOf("\nlet orderBusy", start);
if (start < 0 || end < 0) throw new Error("Não foi possível localizar buildServerPayload() em app.js");

function buildPayload(state) {
  const context = {
    state,
    couponApplies(value) { return value >= 3000 && state.coupon === "BRASA15"; },
    toCents(value) { return Math.round(Number(value) * 100); },
    getTotals() { return { subtotal: 45.5, total: 52.5 }; },
    deliveryAddressForOrder(value) { return [value.address, value.neighborhood, value.cep].filter(Boolean).join(" • "); },
  };
  return vm.runInNewContext("(" + source.slice(start, end) + ")", context)();
}

const checkout = {
  customer: { name: "Cliente Teste", phone: "11900000000", email: "" },
  fulfillment: { address: "Rua A, 10", neighborhood: "Centro", cep: "01001000", complement: "Apto 2" },
  payment: "Pix",
  cashChange: "",
};
const cart = [{ productId: "burger-teste", qty: 2, doneness: "ao-ponto", addons: ["bacon"], removals: ["cebola"], notes: "sem molho" }];

test("checkout envia escolhas sem confiar preços do navegador", () => {
  const payload = buildPayload({ orderMode: "delivery", district: "Centro", checkout, cart, coupon: "BRASA15" });
  assert.equal(payload.customer.name, "Cliente Teste");
  assert.equal(payload.fulfillment.mode, "delivery");
  assert.equal(payload.fulfillment.district, "Centro");
  assert.equal(payload.fulfillment.address, "Rua A, 10 • Centro • 01001000");
  assert.deepEqual(JSON.parse(JSON.stringify(payload.items)), [{
    productSlug: "burger-teste", qty: 2, doneness: "ao-ponto",
    addonSlugs: ["bacon"], removals: ["cebola"], notes: "sem molho",
  }]);
  assert.equal(payload.coupon, "BRASA15");
  assert.equal(Object.hasOwn(payload, "totals"), false);
  assert.equal(Object.hasOwn(payload.items[0], "unitPrice"), false);
});

test("checkout de retirada não envia endereço nem bairro de entrega", () => {
  const payload = buildPayload({ orderMode: "pickup", district: "Centro", checkout, cart, coupon: "INVALIDO" });
  assert.deepEqual(JSON.parse(JSON.stringify(payload.fulfillment)), {
    mode: "pickup", district: null, address: null, complement: "Apto 2",
  });
  assert.equal(payload.coupon, null);
});
