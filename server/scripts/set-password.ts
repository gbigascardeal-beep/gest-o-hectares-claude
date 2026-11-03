// Uso: pnpm set-password email@empresa.com NovaSenha123
// Serve para recuperar o acesso caso ninguém lembre a senha de administrador.
import "dotenv/config";
import { hashPassword } from "../_core/password";
import * as db from "../db";

async function main() {
  const [email, newPassword] = process.argv.slice(2);
  if (!email || !newPassword) {
    console.error("Uso: pnpm set-password <email> <nova-senha>");
    process.exit(1);
  }
  if (newPassword.length < 8) {
    console.error("A senha precisa ter pelo menos 8 caracteres.");
    process.exit(1);
  }
  const user = await db.getUserByEmail(email);
  if (!user) {
    console.error(`Nenhum usuário com o e-mail ${email}`);
    process.exit(1);
  }
  await db.updateUserById(user.id, { passwordHash: await hashPassword(newPassword), isActive: true });
  console.log(`Senha de ${email} atualizada.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
