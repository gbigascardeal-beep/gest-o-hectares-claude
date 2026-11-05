import * as db from "../db";
import { ENV } from "./env";
import { hashPassword } from "./password";

/** Avisa no log do Railway o que está faltando configurar. */
export function checkConfig() {
  if (!ENV.databaseUrl) console.warn("[Config] FALTA a variável DATABASE_URL (o sistema não consegue salvar nada).");
  if (ENV.cookieSecret.length < 32) console.warn("[Config] FALTA a variável JWT_SECRET (precisa ter 32 caracteres ou mais); sem ela o login não funciona.");
  if (!ENV.googlePlacesApiKey) console.log("[Config] GOOGLE_PLACES_API_KEY não definida: a busca de fornecedores usa o mapa gratuito (OpenStreetMap, alcance até 100 km).");
  if (!ENV.adminEmail || !ENV.adminPassword) console.warn("[Config] ADMIN_EMAIL/ADMIN_PASSWORD não definidos: o primeiro administrador não será criado.");
}

/** Cria o primeiro administrador a partir de ADMIN_EMAIL / ADMIN_PASSWORD (só se ainda não existir). */
export async function ensureAdminUser() {
  if (!ENV.adminEmail || !ENV.adminPassword) return;
  try {
    const existing = await db.getUserByEmail(ENV.adminEmail);
    if (existing) {
      console.log(`[Admin] ${ENV.adminEmail} já existe (a senha não é alterada por aqui).`);
      return; // nunca sobrescreve a senha de quem já existe
    }
    if (ENV.adminPassword.length < 8) {
      console.warn("[Admin] ADMIN_PASSWORD precisa ter pelo menos 8 caracteres.");
      return;
    }
    await db.createLocalUser({
      name: ENV.adminName,
      email: ENV.adminEmail,
      passwordHash: await hashPassword(ENV.adminPassword),
      role: "admin",
    });
    console.log(`[Admin] Administrador criado: ${ENV.adminEmail}`);
  } catch (error) {
    console.error("[Admin] Não foi possível criar o administrador (as tabelas já foram criadas com pnpm db:push?)", error);
  }
}
