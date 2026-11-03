import * as db from "../db";
import { ENV } from "./env";
import { hashPassword } from "./password";

/** Cria o primeiro administrador a partir de ADMIN_EMAIL / ADMIN_PASSWORD (só se ainda não existir). */
export async function ensureAdminUser() {
  if (!ENV.adminEmail || !ENV.adminPassword) return;
  try {
    const existing = await db.getUserByEmail(ENV.adminEmail);
    if (existing) return; // nunca sobrescreve a senha de quem já existe
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
