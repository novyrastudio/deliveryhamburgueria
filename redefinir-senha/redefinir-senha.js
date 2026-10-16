"use strict";

/*
  Página de redefinição de senha (Supabase Auth, fluxo oficial de recuperação).

  1. Lê o token do fragmento da URL e limpa o endereço.
  2. Confere o token no servidor antes de mostrar o formulário.
  3. Troca a senha com PUT /auth/v1/user usando esse token.

  O token e a senha ficam só em variáveis desta página: nada vai para localStorage,
  sessionStorage, console ou URL.
*/
(function () {
  const auth = window.FornalhaAuth;
  const $ = (id) => document.getElementById(id);
  const states = ["stateLoading", "resetForm", "stateSuccess", "stateInvalid", "stateUnconfigured"];

  function show(name) {
    states.forEach((id) => {
      $(id).hidden = id !== name;
    });
  }

  function setText(el, message) {
    el.textContent = message;
    el.hidden = !message;
  }

  // Sempre lido e limpo da URL de imediato, mesmo se a autenticação não estiver configurada.
  const found = auth.readRecoveryFromUrl();
  let recoveryToken = null;

  function showInvalid(message) {
    recoveryToken = null;
    if (message) $("invalidText").textContent = message;
    $("resetTitle").textContent = "Link inválido";
    show("stateInvalid");
  }

  async function start() {
    if (!auth.configured) {
      show("stateUnconfigured");
      return;
    }
    if (found.status !== "token") {
      showInvalid(
        found.status === "error"
          ? "Este link de recuperação expirou ou já foi usado."
          : "Não encontramos um link de recuperação válido nesta página. Abra o link enviado por e-mail ou peça um novo.",
      );
      return;
    }
    try {
      const ok = await auth.verifyRecoveryToken(found.token);
      if (!ok) {
        showInvalid("Este link de recuperação é inválido, expirou ou já foi usado.");
        return;
      }
      recoveryToken = found.token;
      show("resetForm");
      $("rp-password").focus();
    } catch (error) {
      // Falha de rede/servidor: não dá para saber se o link vale. O link continua na memória para nova tentativa.
      $("resetTitle").textContent = "Nova senha";
      $("stateLoading").innerHTML = "";
      const p = document.createElement("p");
      p.className = "form-alert";
      p.setAttribute("role", "alert");
      p.textContent = error instanceof auth.AuthError ? error.message : "Não foi possível verificar o link agora. Tente novamente.";
      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = "secondary-btn full";
      retry.textContent = "Tentar novamente";
      retry.addEventListener("click", () => {
        $("stateLoading").innerHTML = '<p class="reset-text">Verificando o link de recuperação…</p>';
        found.status === "token" && verifyAgain();
      });
      $("stateLoading").append(p, retry);
    }
  }

  async function verifyAgain() {
    try {
      const ok = await auth.verifyRecoveryToken(found.token);
      if (!ok) return showInvalid("Este link de recuperação é inválido, expirou ou já foi usado.");
      recoveryToken = found.token;
      show("resetForm");
      $("rp-password").focus();
    } catch (error) {
      $("stateLoading").innerHTML = "";
      const p = document.createElement("p");
      p.className = "form-alert";
      p.setAttribute("role", "alert");
      p.textContent = error instanceof auth.AuthError ? error.message : "Não foi possível verificar o link agora. Tente novamente.";
      $("stateLoading").append(p);
    }
  }

  /* ---------- Formulário ---------- */

  const form = $("resetForm");
  let busy = false;

  function clearErrors() {
    ["password", "confirm"].forEach((name) => {
      setText($(`err-${name}`), "");
      $(`rp-${name}`).removeAttribute("aria-invalid");
    });
    setText($("resetAlert"), "");
  }

  function fieldError(name, message) {
    setText($(`err-${name}`), message);
    $(`rp-${name}`).setAttribute("aria-invalid", "true");
  }

  form.addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-toggle-password]");
    if (!toggle) return;
    const input = toggle.parentElement.querySelector("input");
    const reveal = input.type === "password";
    input.type = reveal ? "text" : "password";
    toggle.textContent = reveal ? "Ocultar" : "Mostrar";
    toggle.setAttribute("aria-pressed", String(reveal));
    toggle.setAttribute("aria-label", reveal ? "Ocultar senha" : "Mostrar senha");
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy || !recoveryToken) return;
    clearErrors();

    const password = $("rp-password").value;
    const confirm = $("rp-confirm").value;
    const passwordError = auth.validate.password(password);
    if (passwordError) {
      fieldError("password", passwordError);
      $("rp-password").focus();
      return;
    }
    const confirmError = auth.validate.confirm(password, confirm);
    if (confirmError) {
      fieldError("confirm", confirmError);
      $("rp-confirm").focus();
      return;
    }

    busy = true;
    const submit = $("resetSubmit");
    submit.disabled = true;
    submit.textContent = "Aguarde…";
    try {
      await auth.resetPasswordWithToken(recoveryToken, password);
      recoveryToken = null;
      form.reset();
      $("resetTitle").textContent = "Senha alterada";
      show("stateSuccess");
      $("goLogin").focus();
    } catch (error) {
      if (error instanceof auth.AuthError && error.code === "link_invalid") {
        form.reset();
        showInvalid("O link expirou ou já foi usado.");
      } else if (error instanceof auth.AuthError && (error.code === "weak_password" || error.code === "same_password")) {
        fieldError("password", error.message);
        $("rp-password").focus();
      } else {
        setText($("resetAlert"), error instanceof auth.AuthError ? error.message : "Não foi possível concluir agora. Tente novamente.");
      }
    } finally {
      busy = false;
      submit.disabled = false;
      submit.textContent = "Salvar nova senha";
    }
  });

  start();
})();
