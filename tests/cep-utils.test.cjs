const assert = require("node:assert/strict");
const test = require("node:test");
const cep = require("../cep-utils.js");

test("normaliza e formata CEP sem ultrapassar oito dígitos", () => {
  assert.equal(cep.digitsOnly("01001-000 xyz"), "01001000");
  assert.equal(cep.formatCep("010010001234"), "01001-000");
  assert.equal(cep.formatCep("01001"), "01001");
});

test("associa apenas CEPs dentro de faixas configuradas", () => {
  const areas = {
    Centro: "01000-000 a 01099-999",
    Jardins: "01499-999 a 01400-000",
    BairroSemFaixa: "Consulte a loja",
  };
  assert.deepEqual(cep.deliveryAreasForCep("01001000", areas), ["Centro"]);
  assert.deepEqual(cep.deliveryAreasForCep("01450000", areas), ["Jardins"]);
  assert.deepEqual(cep.deliveryAreasForCep("04500000", areas), []);
  assert.deepEqual(cep.deliveryAreasForCep("01001", areas), []);
});

test("compõe os dados de endereço no campo legado sem exceder o limite", () => {
  assert.equal(
    cep.addressForOrder({ address: "Rua A, 12", neighborhood: "Centro", city: "São Paulo", uf: "SP", cep: "01001000" }),
    "Rua A, 12 • Centro • São Paulo/SP • CEP 01001-000",
  );
  assert.equal(cep.addressForOrder({ address: "Rua " + "x".repeat(240) }).length, 200);
});
