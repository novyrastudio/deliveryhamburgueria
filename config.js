
/*
  Configuração pública do front-end da Fornalha 147.
  Nunca coloque chaves secretas ou service_role neste arquivo.
*/
window.FORNALHA_CONFIG = Object.freeze({
  auth: Object.freeze({
    provider: "supabase",
    url: "https://pknbmebaffobziijomim.supabase.co",
    anonKey: "sb_publishable_KXI3aHEe_0xEJZHFnf3ZrA_zOSKNtPJ",
    captchaSiteKey: "",
  }),

  /* Endpoint opcional de banners usado apenas quando o Supabase não está configurado. */
  bannersEndpoint: "",
});
