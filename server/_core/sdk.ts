import { COOKIE_NAME, SESSION_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

export type SessionPayload = { openId: string; name: string };

class SessionService {
  private getSecret() {
    if (ENV.cookieSecret.length < 32) {
      throw new Error("JWT_SECRET precisa ter pelo menos 32 caracteres (veja o .env.example).");
    }
    return new TextEncoder().encode(ENV.cookieSecret);
  }

  async createSessionToken(
    openId: string,
    options: { expiresInMs?: number; name?: string } = {}
  ): Promise<string> {
    const expiresInMs = options.expiresInMs ?? SESSION_MS;
    const expirationSeconds = Math.floor((Date.now() + expiresInMs) / 1000);
    return new SignJWT({ openId, name: options.name ?? "" })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(this.getSecret());
  }

  async verifySession(cookieValue: string | undefined | null): Promise<SessionPayload | null> {
    if (!cookieValue) return null;
    try {
      const { payload } = await jwtVerify(cookieValue, this.getSecret(), { algorithms: ["HS256"] });
      const { openId, name } = payload as Record<string, unknown>;
      if (typeof openId !== "string" || openId.length === 0) return null;
      return { openId, name: typeof name === "string" ? name : "" };
    } catch {
      return null;
    }
  }

  async authenticateRequest(req: Request): Promise<User> {
    const cookies = parseCookieHeader(req.headers.cookie ?? "");
    const session = await this.verifySession(cookies[COOKIE_NAME]);
    if (!session) throw ForbiddenError("Sessão inválida");

    const user = await db.getUserByOpenId(session.openId);
    if (!user) throw ForbiddenError("Usuário não encontrado");
    if (!user.isActive) throw ForbiddenError("Usuário desativado");
    return user;
  }
}

export const sdk = new SessionService();
