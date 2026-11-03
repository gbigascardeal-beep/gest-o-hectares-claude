export const ENV = {
  appId: process.env.VITE_APP_ID ?? "gestao-hectares",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // Primeiro administrador (criado automaticamente na 1ª vez que o servidor sobe)
  adminEmail: (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD ?? "",
  adminName: process.env.ADMIN_NAME ?? "Administrador",
  // Opcionais (recursos que eram do Manus; sem eles o sistema funciona normalmente)
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  oAuthServerUrl: "",
  ownerOpenId: "",
};
