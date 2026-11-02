const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
const exportStart = source.indexOf("async function exportAccountData() {");
const deleteStart = source.indexOf("\nasync function deleteAccount()", exportStart);
const deleteEnd = source.indexOf("\nels.authForm.setAttribute", deleteStart);
if (exportStart < 0 || deleteStart < 0 || deleteEnd < 0) throw new Error("Não foi possível localizar as ações de conta em app.js");

function createHarness({ confirmed = true, rows = [] } = {}) {
  const downloads = [];
  const calls = [];
  const notices = [];
  const state = {
    user: { id: "user-1", name: "Ana Silva", phone: "11999992026", email: "ana@example.test" },
    orderHistory: { rows: [] },
    checkout: { customer: { name: "Ana" } },
  };
  const context = {
    state,
    auth: {
      async restAuth(...args) { calls.push(["restAuth", ...args]); return rows; },
      async rpc(...args) { calls.push(["rpc", ...args]); return { deleted: true }; },
      async signOut() { calls.push(["signOut"]); },
    },
    downloadJson(filename, data) { downloads.push({ filename, data }); },
    showSuccess(message) { notices.push(message); },
    window: { confirm() { return confirmed; } },
    defaultCheckout() { return { customer: { name: "", phone: "", email: "" } }; },
    storage: { remove(key) { calls.push(["remove", key]); } },
    renderAccountUI() { calls.push(["renderAccountUI"]); },
    closeModal() { calls.push(["closeModal"]); },
    els: { authModal: {} },
    toast(message) { notices.push(message); },
  };
  const code = source.slice(exportStart, deleteStart) + source.slice(deleteStart + 1, deleteEnd);
  vm.runInNewContext(code + "\nglobalThis.api = { exportAccountData, deleteAccount };", context);
  return { api: context.api, state, downloads, calls, notices };
}

test("exportação baixa o perfil e os pedidos autenticados", async () => {
  const rows = [{ id: "order-1", order_number: "F147-1" }];
  const h = createHarness({ rows });
  await h.api.exportAccountData();
  assert.equal(h.downloads.length, 1);
  assert.match(h.downloads[0].filename, /^fornalha-147-dados-\d{4}-\d{2}-\d{2}\.json$/);
  assert.deepEqual(JSON.parse(JSON.stringify(h.downloads[0].data.profile)), {
    name: "Ana Silva", phone: "11999992026", email: "ana@example.test",
  });
  assert.deepEqual(JSON.parse(JSON.stringify(h.downloads[0].data.orders)), rows);
  assert.equal(h.notices[0], "Arquivo de dados gerado.");
});

test("exclusão cancelada não chama RPC", async () => {
  const h = createHarness({ confirmed: false });
  await h.api.deleteAccount();
  assert.equal(h.calls.length, 0);
  assert.equal(h.state.user.id, "user-1");
});

test("exclusão confirmada chama RPC, encerra sessão e limpa os dados locais", async () => {
  const h = createHarness();
  await h.api.deleteAccount();
  assert.deepEqual(JSON.parse(JSON.stringify(h.calls.filter((call) => call[0] === "rpc"))), [
    ["rpc", "delete_my_account", {}],
  ]);
  assert.ok(h.calls.some((call) => call[0] === "signOut"));
  assert.equal(h.state.user, null);
  assert.deepEqual(JSON.parse(JSON.stringify(h.state.checkout)), { customer: { name: "", phone: "", email: "" } });
  assert.ok(h.calls.some((call) => call[0] === "remove" && call[1] === "fornalha-checkout"));
});
