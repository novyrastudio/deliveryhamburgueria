"use strict";

/*
  Banners da página inicial (hero) e das promoções.

  Todo o conteúdo dos banners vem de UMA lista de dados (BANNERS_LOCAIS, abaixo).
  O HTML só tem os "encaixes" e este arquivo preenche os textos, a imagem e os botões.
  Para mudar um banner hoje, edite os dados aqui; nada mais precisa mudar no código.

  PREPARADO PARA O FUTURO (ainda NÃO existe painel administrativo):
  quando houver painel, ele poderá publicar a mesma lista em um endpoint. Bastará
  informar a URL em config.js (`bannersEndpoint`). Os campos abaixo já cobrem o que o
  painel precisará editar: imagem, título, texto, botão e destino, ativo/inativo e ordem.
  Se o endpoint falhar ou devolver dados inválidos, os dados locais continuam valendo.

  Campos de um banner:
    id            identificador único e estável
    placement     "hero" (topo da página) ou "promo" (faixa de promoções)
    active        true/false: só banners ativos aparecem
    order         número; menor aparece primeiro
    image         caminho/URL da imagem (opcional em "promo")
    eyebrow       texto pequeno acima do título
    title, text   título e texto ("**negrito**" é aceito no texto)
    primaryButton { label, href }  ou  { label, action: "copy-coupon", coupon }
    secondaryButton  (opcional, mesmo formato; "note" mostra um detalhe ao lado)
    ticket        (só hero, opcional) { label, code, note }

  No "hero" aparece apenas o primeiro banner ativo. Em "promo", todos os ativos, em ordem.
*/
(function () {
  const BANNERS_LOCAIS = [
    {
      id: "hero-principal",
      placement: "hero",
      active: true,
      order: 1,
      image: "assets/burger-costela.jpg",
      eyebrow: "Terça a domingo • 18h às 23h30",
      title: "Brasa alta, pedido rápido e hambúrguer artesanal de verdade.",
      text: "Fornalha 147 entrega burgers premium no Centro, Jardins e Vila Nova, com retirada grátis e pagamento na entrega ou retirada.",
      primaryButton: { label: "Pedir agora", href: "#cardapio" },
      secondaryButton: { label: "Cupom BRASA15", note: "15% OFF", action: "copy-coupon", coupon: "BRASA15" },
      ticket: { label: "Hoje", code: "BRASA15", note: "15% de desconto" },
    },
    {
      id: "promo-brasa15",
      placement: "promo",
      active: true,
      order: 1,
      image: "",
      eyebrow: "Promoções",
      title: "Cupom de estreia para testar o fluxo completo.",
      text: "Digite **BRASA15** no carrinho. O protótipo recalcula o desconto de 15%, a taxa do bairro e o total final antes da revisão do pedido.",
      primaryButton: { label: "Copiar cupom", action: "copy-coupon", coupon: "BRASA15" },
    },
  ];

  /* ---------- Validação: nada que venha de uma fonte externa é confiável ---------- */

  const text = (value, max) => (typeof value === "string" ? value.trim().slice(0, max) : "");

  function safeUrl(value, { allowHash = false } = {}) {
    const raw = text(value, 500);
    if (!raw) return "";
    if (allowHash && raw.startsWith("#")) return /^#[\w-]*$/.test(raw) ? raw : "";
    if (/[\u0000-\u001f\\]/.test(raw) || raw.startsWith("//")) return "";
    // Caminho relativo (ex.: "assets/foto.jpg") é sempre aceito, inclusive ao abrir o site direto do computador.
    if (!/^[a-z][a-z0-9+.-]*:/i.test(raw)) return raw;
    // Com protocolo, só http/https: bloqueia javascript:, data: etc.
    return /^https?:\/\//i.test(raw) ? raw : "";
  }

  function cleanButton(raw) {
    if (!raw || typeof raw !== "object") return null;
    const label = text(raw.label, 40);
    if (!label) return null;
    const note = text(raw.note, 30);
    if (raw.action === "copy-coupon") {
      const coupon = text(raw.coupon, 30).toUpperCase();
      return /^[A-Z0-9_-]{2,30}$/.test(coupon) ? { label, note, action: "copy-coupon", coupon } : null;
    }
    const href = safeUrl(raw.href, { allowHash: true });
    return href ? { label, note, href } : null;
  }

  function cleanBanner(raw) {
    if (!raw || typeof raw !== "object") return null;
    const placement = raw.placement === "hero" || raw.placement === "promo" ? raw.placement : "";
    const id = text(raw.id, 60);
    const title = text(raw.title, 140);
    if (!placement || !id || !title) return null;
    const ticket = raw.ticket && typeof raw.ticket === "object" ? { label: text(raw.ticket.label, 20), code: text(raw.ticket.code, 30), note: text(raw.ticket.note, 40) } : null;
    return {
      id,
      placement,
      active: raw.active === true,
      order: Number.isFinite(Number(raw.order)) ? Number(raw.order) : 999,
      image: safeUrl(raw.image),
      eyebrow: text(raw.eyebrow, 80),
      title,
      text: text(raw.text, 400),
      primaryButton: cleanButton(raw.primaryButton),
      secondaryButton: cleanButton(raw.secondaryButton),
      ticket: ticket && ticket.code ? ticket : null,
    };
  }

  function visibleBanners(list, placement) {
    return list
      .map(cleanBanner)
      .filter((banner) => banner && banner.placement === placement && banner.active)
      .sort((a, b) => a.order - b.order);
  }

  /* ---------- Renderização ---------- */

  function buttonEl(config, className) {
    const el = document.createElement(config.href ? "a" : "button");
    el.className = className;
    if (config.href) {
      el.href = config.href;
      if (/^https?:/i.test(config.href)) {
        el.target = "_blank";
        el.rel = "noopener noreferrer";
      }
    } else {
      el.type = "button";
      el.dataset.copyCoupon = config.coupon;
    }
    el.append(config.label);
    if (config.note) {
      const small = document.createElement("small");
      small.textContent = config.note;
      el.append(" ", small);
    }
    return el;
  }

  // Aceita apenas **negrito**; todo o resto entra como texto puro.
  function richText(target, value) {
    target.textContent = "";
    value.split(/(\*\*[^*]+\*\*)/).forEach((part) => {
      if (/^\*\*[^*]+\*\*$/.test(part)) {
        const strong = document.createElement("strong");
        strong.textContent = part.slice(2, -2);
        target.append(strong);
      } else if (part) {
        target.append(part);
      }
    });
  }

  function renderHero(list) {
    const section = document.getElementById("heroBanner");
    if (!section) return;
    const banner = visibleBanners(list, "hero")[0];
    section.hidden = !banner;
    if (!banner) return;

    const bg = section.querySelector(".hero-bg");
    bg.querySelector(".hero-burger")?.remove();
    if (banner.image) {
      const img = document.createElement("img");
      img.className = "hero-burger";
      img.src = banner.image;
      img.alt = "";
      bg.prepend(img);
    }

    const slot = (name) => section.querySelector(`[data-slot="${name}"]`);
    const eyebrow = slot("eyebrow");
    eyebrow.textContent = banner.eyebrow;
    eyebrow.hidden = !banner.eyebrow;
    slot("title").textContent = banner.title;
    const body = slot("text");
    richText(body, banner.text);
    body.hidden = !banner.text;

    const actions = slot("actions");
    actions.textContent = "";
    if (banner.primaryButton) actions.append(buttonEl(banner.primaryButton, "primary-btn"));
    if (banner.secondaryButton) actions.append(buttonEl(banner.secondaryButton, "secondary-btn"));
    actions.hidden = !actions.children.length;

    const ticket = slot("ticket");
    ticket.hidden = !banner.ticket;
    if (banner.ticket) {
      ticket.querySelector("[data-ticket-label]").textContent = banner.ticket.label;
      ticket.querySelector("[data-ticket-code]").textContent = banner.ticket.code;
      ticket.querySelector("[data-ticket-note]").textContent = banner.ticket.note;
    }
  }

  function renderPromos(list) {
    const wrap = document.getElementById("promocoes");
    if (!wrap) return;
    const promos = visibleBanners(list, "promo");
    wrap.hidden = promos.length === 0;
    document.querySelectorAll('a[href="#promocoes"]').forEach((link) => {
      link.hidden = promos.length === 0;
    });
    wrap.textContent = "";

    promos.forEach((banner) => {
      const section = document.createElement("section");
      section.className = "promo-section";
      section.dataset.bannerId = banner.id;
      section.setAttribute("aria-labelledby", `promo-title-${banner.id}`);

      if (banner.image) {
        const media = document.createElement("div");
        media.className = "promo-media";
        const img = document.createElement("img");
        img.src = banner.image;
        img.alt = "";
        img.loading = "lazy";
        media.append(img);
        section.append(media);
      }

      const copy = document.createElement("div");
      copy.className = "promo-copy";
      if (banner.eyebrow) {
        const eyebrow = document.createElement("p");
        eyebrow.className = "eyebrow";
        eyebrow.textContent = banner.eyebrow;
        copy.append(eyebrow);
      }
      const title = document.createElement("h2");
      title.id = `promo-title-${banner.id}`;
      title.textContent = banner.title;
      copy.append(title);
      if (banner.text) {
        const body = document.createElement("p");
        richText(body, banner.text);
        copy.append(body);
      }
      section.append(copy);

      if (banner.primaryButton) section.append(buttonEl(banner.primaryButton, "secondary-btn"));
      wrap.append(section);
    });
  }

  function render(list) {
    renderHero(list);
    renderPromos(list);
  }

  /* ---------- Fonte de dados ---------- */

  async function loadRemote(endpoint) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(endpoint, { headers: { Accept: "application/json" }, signal: controller.signal });
      if (!response.ok) return null;
      const data = await response.json();
      const list = Array.isArray(data) ? data : data && data.banners;
      if (!Array.isArray(list)) return null;
      // Só aceita a fonte externa se ela tiver ao menos um banner válido.
      return list.some((item) => cleanBanner(item)) ? list : null;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  // Renderiza na hora com os dados locais (sem esperar rede) e troca pela fonte externa, se houver.
  render(BANNERS_LOCAIS);
  const endpoint = safeUrl(window.FORNALHA_CONFIG && window.FORNALHA_CONFIG.bannersEndpoint);
  if (endpoint) {
    loadRemote(endpoint).then((list) => {
      if (list) render(list);
    });
  }

  window.FornalhaBanners = Object.freeze({ render, local: BANNERS_LOCAIS });
})();
