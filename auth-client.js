"use strict";

/*
  Cliente de autenticação da Fornalha 147 (Supabase Auth + PostgREST via fetch).

  - Não guarda nem registra senhas: a senha só viaja (HTTPS) até o serviço, que a
    armazena com hash bcrypt. Aqui só ficam os tokens de sessão.
  - Usa apenas a chave pública (anon) de config.js. A proteção dos dados é feita no
    servidor, por RLS (supabase/schema.sql): um cliente só lê/altera a própria linha.
  - A validação daqui é só conveniência de interface; o servidor valida de novo.
*/
(function () {
  const cfg = (window.FORNALHA_CONFIG && window.FORNALHA_CONFIG.auth) || {};
  const BASE = String(cfg.url || "").trim().replace(/\/+$/, "");
  const KEY = String(cfg.anonKey || "").trim();
  const SESSION_KEY = "fornalha-auth-session";

  const urlOk = /^https:\/\/[^/\s]+$/i.test(BASE) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(BASE);
  const configured = urlOk && KEY.length > 20;

  class AuthError extends Error {
    constructor(code, message, status = 0) {
      super(message);
      this.name = "AuthError";
      this.code = code;
      this.status = status;
    }
  }

  /* ---------- Sessão (somente tokens) ---------- */

  function readSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      const data = raw ? JSON.parse(raw) : null;
      return data && data.access_token && data.refresh_token ? data : null;
    } catch {
      return null;
    }
  }

  function writeSession(session) {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      /* armazenamento indisponível: a sessão vale só até recarregar */
    }
    memorySession = session;
  }

  function clearSession() {
    memorySession = null;
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignorado */
    }
  }

  let memorySession = null;

  function toSession(data) {
    if (!data || !data.access_token) return null;
    const now = Math.floor(Date.now() / 1000);
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Number(data.expires_at) || now + (Number(data.expires_in) || 3600),
      user: data.user || null,
    };
  }

  /* ---------- HTTP ---------- */

  function messageFor(status, code, raw) {
    const text = String(raw || "").toLowerCase();
    if (code === "invalid_credentials" || code === "invalid_grant" || text.includes("invalid login")) {
      return ["invalid_credentials", "E-mail ou senha incorretos."];
    }
    if (code === "email_not_confirmed" || text.includes("not confirmed")) {
      return ["email_not_confirmed", "Confirme seu e-mail antes de entrar. Procure a mensagem de confirmação na sua caixa de entrada."];
    }
    if (code === "user_already_exists" || code === "email_exists") {
      return ["user_exists", "Este e-mail já está cadastrado. Entre ou recupere sua senha."];
    }
    if (code === "weak_password") {
      return ["weak_password", "Senha fraca. Use ao menos 8 caracteres, com letras e números."];
    }
    if (code === "same_password") {
      return ["same_password", "A nova senha precisa ser diferente da atual."];
    }
    if (code === "signup_disabled") {
      return ["signup_disabled", "Os cadastros estão desativados no momento."];
    }
    if (status === 429 || String(code).includes("rate_limit")) {
      return ["rate_limited", "Muitas tentativas. Aguarde alguns minutos e tente novamente."];
    }
    if (status >= 500) {
      return ["server", "O serviço está indisponível no momento. Tente novamente em instantes."];
    }
    return ["rejected", "Não foi possível concluir. Confira os dados e tente novamente."];
  }

  async function request(path, { method = "GET", body, token, headers = {} } = {}) {
    if (!configured) {
      throw new AuthError("not_configured", "A autenticação ainda não foi configurada neste ambiente.");
    }
    let response;
    try {
      response = await fetch(BASE + path, {
        method,
        headers: {
          apikey: KEY,
          Authorization: `Bearer ${token || KEY}`,
          "Content-Type": "application/json",
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new AuthError("network", "Não foi possível conectar ao serviço. Verifique sua internet e tente novamente.");
    }

    const text = await response.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    }

    if (!response.ok) {
      const code = (data && (data.error_code || data.error)) || "";
      const raw = data && (data.msg || data.error_description || data.message);
      const [mapped, message] = messageFor(response.status, code, raw);
      const failure = new AuthError(mapped, message, response.status);
      failure.detail = String(raw || ""); // mensagem original do servidor (usada para traduzir erros de pedido)
      throw failure;
    }
    return data;
  }

  /* ---------- Validação (espelha as regras do servidor) ---------- */

  const validate = {
    name(value) {
      const name = String(value || "").trim().replace(/\s+/g, " ");
      if (name.length < 2) return "Informe seu nome.";
      if (name.length > 80) return "O nome deve ter no máximo 80 caracteres.";
      return "";
    },
    email(value) {
      const email = String(value || "").trim();
      if (!email) return "Informe seu e-mail.";
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return "Informe um e-mail válido, como voce@email.com.";
      return "";
    },
    phone(value) {
      const digits = normalizePhone(value);
      if (digits.length < 10 || digits.length > 11) return "Informe o WhatsApp com DDD, por exemplo (11) 99999-2026.";
      return "";
    },
    password(value) {
      const password = String(value || "");
      if (password.length < 8) return "A senha precisa ter ao menos 8 caracteres.";
      if (password.length > 72) return "A senha deve ter no máximo 72 caracteres.";
      if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Use letras e números na senha.";
      return "";
    },
    confirm(password, confirm) {
      return String(password) === String(confirm) ? "" : "As senhas não são iguais.";
    },
    signup(values) {
      const errors = {};
      const set = (key, message) => {
        if (message) errors[key] = message;
      };
      set("name", validate.name(values.name));
      set("phone", validate.phone(values.phone));
      set("email", validate.email(values.email));
      set("password", validate.password(values.password));
      if (!errors.password) set("confirm", validate.confirm(values.password, values.confirm));
      if (!values.consent) errors.consent = "Aceite o uso dos dados para criar a conta.";
      return errors;
    },
  };

  function normalizePhone(value) {
    let digits = String(value || "").replace(/\D/g, "");
    if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) digits = digits.slice(2);
    return digits;
  }

  /* ---------- Operações ---------- */

  const listeners = new Set();

  async function signUp({ email, password, name, phone, consent }) {
    const data = await request("/auth/v1/signup", {
      method: "POST",
      body: {
        email: String(email).trim().toLowerCase(),
        password,
        data: { name: String(name).trim().replace(/\s+/g, " "), phone: normalizePhone(phone), consent: Boolean(consent) },
      },
    });
    const session = toSession(data);
    if (session) {
      writeSession(session);
      return { status: "signed-in", session };
    }
    // Sem sessão = o serviço exige confirmação por e-mail antes do primeiro acesso.
    return { status: "confirm-email", email: String(email).trim().toLowerCase() };
  }

  async function signIn({ email, password }) {
    const data = await request("/auth/v1/token?grant_type=password", {
      method: "POST",
      body: { email: String(email).trim().toLowerCase(), password },
    });
    const session = toSession(data);
    if (!session) throw new AuthError("rejected", "Não foi possível entrar. Tente novamente.");
    writeSession(session);
    return session;
  }

  async function refresh(session) {
    const data = await request("/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      body: { refresh_token: session.refresh_token },
    });
    const next = toSession(data);
    if (!next) throw new AuthError("rejected", "Sessão inválida.");
    if (!next.user) next.user = session.user;
    writeSession(next);
    return next;
  }

  /* Devolve a sessão válida (renovando se estiver perto de expirar) ou null. */
  async function getSession() {
    if (!configured) return null;
    let session = readSession() || memorySession;
    if (!session) return null;
    const now = Math.floor(Date.now() / 1000);
    if (session.expires_at - 30 <= now) {
      try {
        session = await refresh(session);
      } catch (error) {
        const transient = error.code === "network" || error.code === "server";
        if (!transient) clearSession();
        return transient ? session : null;
      }
    }
    // Sessão vinda de link de e-mail chega sem dados do usuário: busca no serviço.
    if (!session.user) {
      try {
        const user = await request("/auth/v1/user", { token: session.access_token });
        session = { ...session, user };
        writeSession(session);
      } catch (error) {
        if (error.status === 401 || error.status === 403) {
          clearSession();
          return null;
        }
      }
    }
    return session;
  }

  async function signOut() {
    const session = readSession() || memorySession;
    clearSession();
    if (session && configured) {
      try {
        await request("/auth/v1/logout", { method: "POST", token: session.access_token });
      } catch {
        /* a sessão local já foi apagada; o token remoto expira sozinho */
      }
    }
  }

  async function recover(email) {
    const redirect = encodeURIComponent(location.origin + location.pathname);
    await request(`/auth/v1/recover?redirect_to=${redirect}`, {
      method: "POST",
      body: { email: String(email).trim().toLowerCase() },
    });
  }

  async function authed(path, options = {}) {
    const session = await getSession();
    if (!session) throw new AuthError("session_expired", "Sua sessão expirou. Entre novamente.", 401);
    try {
      return await request(path, { ...options, token: session.access_token });
    } catch (error) {
      if (error.status === 401) {
        clearSession();
        throw new AuthError("session_expired", "Sua sessão expirou. Entre novamente.", 401);
      }
      throw error;
    }
  }

  /* Chamada de função do banco (RPC). Usa a sessão do cliente, se houver; senão, a chave pública. */
  async function rpc(name, body) {
    let token;
    try {
      const session = await getSession();
      token = session ? session.access_token : undefined;
    } catch {
      token = undefined;
    }
    return request(`/rest/v1/rpc/${encodeURIComponent(name)}`, { method: "POST", body: body === undefined ? {} : body, token });
  }

  /* Leitura pública (somente tabelas liberadas por RLS para o papel anon). */
  async function rest(path) {
    return request(`/rest/v1/${path}`);
  }

  /* Leitura/escrita autenticada em tabelas (RLS do servidor decide; só admin passa nas tabelas administrativas). */
  async function restAuth(path, options = {}) {
    return authed(`/rest/v1/${path}`, options);
  }

  async function updatePassword(password) {
    await authed("/auth/v1/user", { method: "PUT", body: { password } });
  }

  async function getProfile() {
    const session = await getSession();
    if (!session || !session.user) return null;
    const rows = await authed(`/rest/v1/profiles?select=id,name,phone,email,role&id=eq.${encodeURIComponent(session.user.id)}`);
    return Array.isArray(rows) && rows[0] ? rows[0] : null;
  }

  async function updateProfile({ name, phone }) {
    const session = await getSession();
    if (!session || !session.user) throw new AuthError("session_expired", "Sua sessão expirou. Entre novamente.", 401);
    const rows = await authed(`/rest/v1/profiles?id=eq.${encodeURIComponent(session.user.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: { name: String(name).trim().replace(/\s+/g, " "), phone: normalizePhone(phone) },
    });
    // Se nenhuma linha voltou, nada foi salvo: nunca tratamos isso como sucesso.
    if (!Array.isArray(rows) || !rows[0]) throw new AuthError("not_saved", "Não foi possível salvar seus dados. Tente novamente.");
    return rows[0];
  }

  /*
    Links de e-mail (confirmação de cadastro e recuperação de senha) voltam para o site
    com os tokens no fragmento da URL. Lemos, guardamos a sessão e limpamos o endereço.
  */
  function consumeUrlSession() {
    const hash = location.hash.replace(/^#/, "");
    if (!hash.includes("access_token") && !hash.includes("error")) return null;
    const params = new URLSearchParams(hash);
    const clean = () => history.replaceState(null, "", location.pathname + location.search);

    if (params.get("error") || params.get("error_code")) {
      clean();
      return { type: "error", code: params.get("error_code") || params.get("error") || "" };
    }
    const session = toSession({
      access_token: params.get("access_token"),
      refresh_token: params.get("refresh_token"),
      expires_in: params.get("expires_in"),
      expires_at: params.get("expires_at"),
      user: null,
    });
    clean();
    if (!session) return null;
    writeSession(session);
    return { type: params.get("type") || "signup", session };
  }

  // Outras abas: avisa quando a sessão muda (login ou saída em outra aba).
  window.addEventListener("storage", (event) => {
    if (event.key === SESSION_KEY) listeners.forEach((callback) => callback());
  });

  window.FornalhaAuth = Object.freeze({
    configured,
    AuthError,
    validate,
    normalizePhone,
    signUp,
    signIn,
    signOut,
    recover,
    updatePassword,
    rpc,
    rest,
    restAuth,
    getSession,
    getProfile,
    updateProfile,
    consumeUrlSession,
    onExternalChange(callback) {
      listeners.add(callback);
    },
  });
})();
