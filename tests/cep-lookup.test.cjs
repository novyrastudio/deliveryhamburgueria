const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const cep = require("../cep-utils.js");

const appSource = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
const start = appSource.indexOf("async function lookupCep(button) {");
const end = appSource.indexOf("\nfunction renderCheckout()", start);
if (start < 0 || end < 0) throw new Error("Não foi possível localizar lookupCep() em app.js");
const lookupSource = appSource.slice(start, end).trim();

function setupLookup({ cepValue = "01001000", coverage = {}, fetchImpl, timeout = false } = {}) {
  const status = { textContent: "" };
  const saved = [];
  const input = { value: cepValue, focusCount: 0, focus() { this.focusCount += 1; } };
  const form = {
    elements: {
      cep: input,
      address: { value: "", focus() {} },
      complement: { value: "" },
      district: { value: "Centro" },
    },
    querySelector() { return status; },
  };
  const button = { textContent: "Buscar endereço", disabled: false };
  const state = { district: "Centro", checkout: { fulfillment: { cep: "", address: "", complement: "" } } };
  const context = {
    digitsOnly: cep.digitsOnly,
    deliveryAreasForCep: (value) => cep.deliveryAreasForCep(value, coverage),
    state,
    els: { checkoutForm: form },
    storage: { set(key, value) { saved.push({ key, value: structuredClone(value) }); } },
    persistCart() {},
    renderCart() {},
    fetch: fetchImpl || (async () => ({ ok: true, async json() { return { logradouro: "Praça da Sé", bairro: "Sé", localidade: "São Paulo", uf: "SP" }; } })),
    AbortController: class {
      signal = {};
      abort() { this.signal.aborted = true; }
    },
    window: {
      setTimeout(callback) { if (timeout) callback(); return 1; },
      clearTimeout() {},
    },
  };
  const lookupCep = vm.runInNewContext(`(${lookupSource})`, context);
  return { lookupCep, button, form, input, state, status, saved };
}

test("CEP válido preenche endereço e escolhe área somente quando a faixa coincide", async () => {
  const page = setupLookup({ coverage: { Centro: "01000-000 a 01099-999", Jardins: "01400-000 a 01499-999" } });
  await page.lookupCep(page.button);
  assert.equal(page.form.elements.address.value, "Praça da Sé");
  assert.equal(page.state.checkout.fulfillment.neighborhood, "Sé");
  assert.equal(page.state.checkout.fulfillment.city, "São Paulo");
  assert.equal(page.state.checkout.fulfillment.uf, "SP");
  assert.equal(page.form.elements.district.value, "Centro");
  assert.match(page.status.textContent, /complete o número/);
  assert.equal(page.saved.length, 1);
  assert.equal(page.button.disabled, false);
});

test("CEP válido sem faixa correspondente deixa a área escolhida manualmente", async () => {
  const page = setupLookup({ cepValue: "02000000", coverage: { Centro: "01000-000 a 01099-999" } });
  page.form.elements.district.value = "Jardins";
  await page.lookupCep(page.button);
  assert.equal(page.state.district, "Centro");
  assert.equal(page.form.elements.district.value, "Jardins");
  assert.match(page.status.textContent, /Confira a área de entrega/);
});

test("CEP incompleto não consulta serviço externo", async () => {
  let calls = 0;
  const page = setupLookup({ cepValue: "12345", fetchImpl: async () => { calls += 1; } });
  await page.lookupCep(page.button);
  assert.equal(calls, 0);
  assert.match(page.status.textContent, /oito números/);
  assert.equal(page.input.focusCount, 1);
});

test("CEP inexistente e falha de rede mantêm o preenchimento manual disponível", async (t) => {
  await t.test("CEP inexistente", async () => {
    const page = setupLookup({ fetchImpl: async () => ({ ok: true, async json() { return { erro: true }; } }) });
    await page.lookupCep(page.button);
    assert.match(page.status.textContent, /Não encontramos esse CEP/);
    assert.equal(page.button.disabled, false);
  });
  await t.test("falha de rede", async () => {
    const page = setupLookup({ fetchImpl: async () => { throw new TypeError("offline"); } });
    await page.lookupCep(page.button);
    assert.match(page.status.textContent, /preencha o endereço manualmente/i);
  });
  await t.test("timeout", async () => {
    const page = setupLookup({ timeout: true, fetchImpl: async (_url, options) => {
      const error = new Error("aborted");
      error.name = options.signal.aborted ? "AbortError" : "Error";
      throw error;
    } });
    await page.lookupCep(page.button);
    assert.match(page.status.textContent, /demorou demais/);
  });
});
