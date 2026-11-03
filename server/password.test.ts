import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./_core/password";

describe("senhas", () => {
  it("aceita a senha correta e recusa a errada", async () => {
    const hash = await hashPassword("senha-segura-123");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("senha-segura-123", hash)).toBe(true);
    expect(await verifyPassword("outra-senha", hash)).toBe(false);
  });

  it("gera hashes diferentes para a mesma senha (salt aleatório)", async () => {
    const a = await hashPassword("mesma-senha-1");
    const b = await hashPassword("mesma-senha-1");
    expect(a).not.toBe(b);
  });

  it("recusa hash em formato inválido", async () => {
    expect(await verifyPassword("qualquer", "texto-solto")).toBe(false);
  });
});
