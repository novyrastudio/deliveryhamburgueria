const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "auth-client.js"), "utf8");

function createClient(respond, { configured = true, protocol = "https:", origin = "https://fornalha.test", search = "" } = {}) {
  const values = new Map();
  const requests = [];
  const location = { protocol, origin, pathname: "/index.html", search, hash: "" };
  const context = {
    window: {
      FORNALHA_CONFIG: { auth: configured ? { url: "https://supabase.invalid", anonKey: "fake-test-publishable-key-not-a-credential" } : {} },
      addEventListener() {},
    },
    localStorage: {
      getItem(key) { return values.get(key) ?? null; },
      setItem(key, value) { values.set(key, String(value)); },
      removeItem(key) { values.delete(key); },
    },
    location,
    history: { replaceState() { location.hash = ""; } },
    URLSearchParams,
    Date,
    fetch: async (url, options) => {
      const request = { url: String(url), options, body: options.body ? JSON.parse(options.body) : undefined };
      requests.push(request);
      const result = await respond(request);
      return {
        ok: result.status >= 200 && result.status < 300,
        status: result.status,
        async text() { return result.data == null ? "" : JSON.stringify(result.data); },
      };
    },
  };
  vm.runInNewContext(source, context);
  return { auth: context.window.FornalhaAuth, values, requests, location };
}

const sessionResponse = {
  access_token: "simulated-access",
  refresh_token: "simulated-refresh",
  expires_in: 3600,
  user: { id: "user-1", email: "ana@example.test" },
};

test("valida cadastro e normaliza telefone antes de enviar", () => {
  const client = createClient(async () => ({ status: 200, data: null }));
  const { auth } = client;
  assert.deepEqual(JSON.parse(JSON.stringify(auth.validate.signup({
    name: " Ana Silva ", phone: "(11) 99999-2026", email: "ana@example.test",
    password: "Brasa123", confirm: "Brasa123", consent: true,
  }))), {});
  assert.match(auth.validate.password("curta"), /8 caracteres/);
  assert.match(auth.validate.phone("123"), /DDD/);
  assert.equal(auth.normalizePhone("+55 (11) 99999-2026"), "11999992026");
});

test("cadastro retorna confirmação de e-mail quando não há sessão", async () => {
  const client = createClient(async () => ({ status: 200, data: { id: "user-1", email: "ana@example.test" } }));
  const result = await client.auth.signUp({
    email: " ANA@EXAMPLE.TEST ", password: "Brasa123", name: " Ana   Silva ",
    phone: "(11) 99999-2026", consent: true,
  });
  assert.deepEqual(JSON.parse(JSON.stringify(result)), { status: "confirm-email", email: "ana@example.test" });
  assert.equal(client.requests[0].url, "https://supabase.invalid/auth/v1/signup");
  assert.equal(client.requests[0].body.email, "ana@example.test");
  assert.equal(client.requests[0].body.data.name, "Ana Silva");
  assert.equal(client.requests[0].body.data.phone, "11999992026");
  assert.equal(client.requests[0].body.data.consent, true);
});

test("login mantém sessão; exportação/alteração e RPC usam token autenticado", async () => {
  const client = createClient(async (request) => {
    if (request.url.endsWith("/auth/v1/token?grant_type=password")) return { status: 200, data: sessionResponse };
    if (request.url.includes("/rest/v1/profiles?")) return { status: 200, data: [{ id: "user-1", name: "Ana", phone: "11999992026" }] };
    if (request.url.endsWith("/rest/v1/rpc/delete_my_account")) return { status: 200, data: { deleted: true } };
    return { status: 200, data: null };
  });
  const session = await client.auth.signIn({ email: "ANA@EXAMPLE.TEST", password: "Brasa123" });
  assert.equal(session.access_token, "simulated-access");
  assert.ok(client.values.has("fornalha-auth-session"));
  assert.equal((await client.auth.getSession()).user.id, "user-1");

  const profile = await client.auth.updateProfile({ name: "Ana Silva", phone: "(11) 99999-2026" });
  assert.equal(profile.name, "Ana");
  const patch = client.requests.find((request) => request.options.method === "PATCH");
  assert.deepEqual(JSON.parse(JSON.stringify(patch.body)), { name: "Ana Silva", phone: "11999992026" });
  assert.equal(patch.options.headers.Authorization, "Bearer simulated-access");

  await client.auth.rpc("delete_my_account", {});
  const rpc = client.requests.find((request) => request.url.endsWith("/rest/v1/rpc/delete_my_account"));
  assert.equal(rpc.options.method, "POST");
  assert.equal(rpc.options.headers.Authorization, "Bearer simulated-access");
});

test("recuperação usa o endereço atual de retorno e logout limpa a sessão local", async () => {
  const client = createClient(async (request) => {
    if (request.url.endsWith("/auth/v1/token?grant_type=password")) return { status: 200, data: sessionResponse };
    return { status: 200, data: null };
  });
  await client.auth.recover("ANA@EXAMPLE.TEST");
  assert.ok(client.requests[0].url.includes("redirect_to=https%3A%2F%2Ffornalha.test%2Findex.html"));
  assert.deepEqual(JSON.parse(JSON.stringify(client.requests[0].body)), { email: "ana@example.test" });
  await client.auth.signIn({ email: "ana@example.test", password: "Brasa123" });
  await client.auth.signOut();
  assert.equal(client.values.has("fornalha-auth-session"), false);
  assert.ok(client.requests.some((request) => request.url.endsWith("/auth/v1/logout")));
});

test("recuperação preserva o retorno do admin e rejeita URLs file sem enviar pedido", async () => {
  const adminClient = createClient(async () => ({ status: 200, data: null }), { search: "?entrar=admin" });
  await adminClient.auth.recover("admin@example.test");
  assert.ok(adminClient.requests[0].url.includes("redirect_to=https%3A%2F%2Ffornalha.test%2Findex.html%3Fentrar%3Dadmin"));

  const fileClient = createClient(async () => ({ status: 200, data: null }), { protocol: "file:", origin: "null" });
  await assert.rejects(fileClient.auth.recover("admin@example.test"), (error) => error.code === "invalid_redirect");
  assert.equal(fileClient.requests.length, 0);
});

test("configuração ausente impede chamadas de rede", async () => {
  const client = createClient(async () => ({ status: 200, data: null }), { configured: false });
  assert.equal(client.auth.configured, false);
  await assert.rejects(client.auth.rest("products?select=id"), (error) => error.code === "not_configured");
  assert.equal(client.requests.length, 0);
});

test("falha de rede aponta a configuração Supabase sem culpar a internet", async () => {
  const client = createClient(async () => { throw new TypeError("Failed to fetch"); });
  await assert.rejects(
    client.auth.signIn({ email: "ana@example.test", password: "Brasa123" }),
    (error) => error.code === "network" && /Supabase configurado/.test(error.message) && /internet pode estar funcionando/.test(error.message)
  );
});
