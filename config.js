
/*
  Configuração pública do front-end da Fornalha 147.
  Nunca coloque chaves secretas ou service_role neste arquivo.
*/
window.FORNALHA_CONFIG = Object.freeze({
  auth: Object.freeze({
    provider: "supabase",
    url: "https://dyitmjanccgfumjllytj.supabase.co",
    anonKey: "sb_publishable_KJTfkLox4Q-GjWmlmv1o6A_w2AWdlHE",
    captchaSiteKey: "",
  }),

  /* Endpoint opcional de banners usado apenas quando o Supabase não está configurado. */
  bannersEndpoint: "",
});
