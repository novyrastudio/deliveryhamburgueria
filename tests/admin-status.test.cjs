const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "admin", "admin.js"), "utf8");
const start = source.indexOf('async function changeStatus(id, status, reason = "") {');
const end = source.indexOf("\nfunction rejectForm(orderId)", start);
if (start < 0 || end < 0) throw new Error("Não foi possível localizar changeStatus() em admin.js");

function createHarness(rpc) {
  const state = {
    orders: [{ id: "order-1", number: "F147-1", status: "new", updatedAt: "before" }],
    pending: new Set(),
    drawerId: null,
  };
  const calls = [];
  const messages = [];
  const context = {
    state,
    TRANSITIONS: { new: ["confirmed"], confirmed: ["prep"], prep: ["delivery"], delivery: ["done"] },
    STATUS_TOAST: { confirmed: "confirmado", prep: "em preparo", delivery: "em entrega", done: "entregue", rejected: "recusado" },
    auth: { async rpc(...args) { calls.push(args); return rpc(...args); } },
    renderCurrent() {},
    updateBadges() {},
    toast(message, tone) { messages.push({ message, tone }); },
    openOrderDrawer() {},
  };
  vm.runInNewContext(source.slice(start, end) + "\nglobalThis.changeStatus = changeStatus;", context);
  return { changeStatus: context.changeStatus, state, calls, messages };
}

test("status permitido persiste pela RPC e envia o motivo", async () => {
  const h = createHarness(async () => ({
    status: "confirmed", rejection_reason: null, updated_at: "after",
  }));
  assert.equal(await h.changeStatus("order-1", "confirmed", ""), true);
  assert.equal(h.state.orders[0].status, "confirmed");
  assert.equal(h.state.orders[0].updatedAt, "after");
  assert.deepEqual(JSON.parse(JSON.stringify(h.calls[0])), [
    "update_order_status",
    { p_order_id: "order-1", p_status: "confirmed", p_reason: null },
  ]);
  assert.equal(h.state.pending.size, 0);
});

test("falha da RPC restaura o status anterior", async () => {
  const h = createHarness(async () => { throw new Error("offline"); });
  assert.equal(await h.changeStatus("order-1", "confirmed"), false);
  assert.equal(h.state.orders[0].status, "new");
  assert.match(h.messages.at(-1).message, /status anterior foi restaurado/);
  assert.equal(h.messages.at(-1).tone, "error");
  assert.equal(h.state.pending.size, 0);
});

test("transição inválida é bloqueada antes da chamada", async () => {
  const h = createHarness(async () => { throw new Error("não deveria chamar"); });
  assert.equal(await h.changeStatus("order-1", "done"), false);
  assert.equal(h.calls.length, 0);
  assert.equal(h.state.orders[0].status, "new");
});
