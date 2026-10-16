/*
  Configuração PÚBLICA do front-end da Fornalha 147.

  Este arquivo é publicado junto com o site (GitHub Pages), então só pode conter
  valores públicos por desenho. NUNCA coloque aqui:
    - a chave "service_role" do Supabase (acesso total ao banco);
    - senhas, tokens de administrador ou strings de conexão do banco.

  A chave "anon" (também chamada "publishable") é pública: ela só funciona dentro
  das regras de segurança por linha (RLS) definidas em schema.sql.

  Enquanto `url` e `anonKey` estiverem vazios, o site funciona normalmente, mas
  cadastro e login ficam desativados e avisam isso ao cliente.
*/
window.FORNALHA_CONFIG = Object.freeze({
  auth: Object.freeze({
    provider: "supabase",
    url: "", // ex.: "https://abcdefgh.supabase.co"
    anonKey: "", // chave anon/publishable do projeto Supabase
  }),

  /*
    Fonte dos banners. Vazio = usa os dados locais de banners.js.
    No futuro, o painel administrativo poderá publicar um endpoint que devolve
    { "banners": [ ... ] } no mesmo formato de banners.js; basta informar a URL aqui.
    Hoje esse endpoint NÃO existe.
  */
  bannersEndpoint: "",
});
