import path from "node:path";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { getDb } from "../db";

/** Cria/atualiza as tabelas do banco sozinho toda vez que o sistema liga. */
export async function runMigrations() {
  const db = await getDb();
  if (!db) {
    console.warn("[Banco] Sem conexão: confira a variável DATABASE_URL no Railway.");
    return;
  }
  try {
    await migrate(db, { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
    console.log("[Banco] Tabelas conferidas e atualizadas.");
  } catch (error) {
    console.error("[Banco] ERRO ao criar/atualizar as tabelas:", error);
  }
}
