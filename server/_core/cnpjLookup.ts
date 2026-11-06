import { isValidCnpj, onlyDigits } from "@shared/cnpj";

/**
 * Consulta pública de CNPJ (dados abertos da Receita Federal).
 * Serviço principal: BrasilAPI. Reserva (se o principal estiver fora do ar): ReceitaWS.
 * Nenhum dos dois exige cadastro nem chave.
 */
export type CnpjData = {
  cnpj: string; // só números
  companyName: string;
  tradeName: string;
  cep: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  situation: string; // ex.: "ATIVA", "BAIXADA"
  isActive: boolean;
};

export class CnpjLookupError extends Error {
  code: "INVALID" | "NOT_FOUND" | "RATE_LIMIT" | "UNAVAILABLE";
  constructor(code: "INVALID" | "NOT_FOUND" | "RATE_LIMIT" | "UNAVAILABLE", message: string) {
    super(message);
    this.code = code;
  }
}

const text = (value: unknown): string => (typeof value === "string" || typeof value === "number" ? String(value).trim() : "");

/** "1133334444" -> "(11) 3333-4444"; "11999998888" -> "(11) 99999-8888". Outros formatos ficam como vieram. */
export function formatPhone(raw: string): string {
  const digits = onlyDigits(raw);
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  return raw.trim().slice(0, 20);
}

export function buildAddress(parts: { type?: string; street?: string; number?: string; complement?: string; district?: string }): string {
  const street = [text(parts.type), text(parts.street)].filter(Boolean).join(" ");
  const number = text(parts.number) && text(parts.number).toUpperCase() !== "S/N" ? text(parts.number) : "S/N";
  const first = street ? `${street}, ${number}` : "";
  return [first, text(parts.complement), text(parts.district)].filter(Boolean).join(" - ").slice(0, 500);
}

const isActiveSituation = (situation: string) => situation === "" || /ativ/i.test(situation) && !/inativ/i.test(situation);

export function normalizeBrasilApi(data: Record<string, unknown>, cnpj: string): CnpjData {
  const situation = text(data.descricao_situacao_cadastral).toUpperCase();
  return {
    cnpj,
    companyName: text(data.razao_social),
    tradeName: text(data.nome_fantasia),
    cep: onlyDigits(text(data.cep)),
    address: buildAddress({
      type: text(data.descricao_tipo_logradouro),
      street: text(data.logradouro),
      number: text(data.numero),
      complement: text(data.complemento),
      district: text(data.bairro),
    }),
    city: text(data.municipio),
    state: text(data.uf).toUpperCase().slice(0, 2),
    phone: formatPhone(text(data.ddd_telefone_1)),
    email: text(data.email).toLowerCase(),
    situation,
    isActive: isActiveSituation(situation),
  };
}

export function normalizeReceitaWs(data: Record<string, unknown>, cnpj: string): CnpjData {
  const situation = text(data.situacao).toUpperCase();
  // ReceitaWS às vezes manda "(11) 3333-4444 / (11) 99999-8888": fica o primeiro
  const phone = text(data.telefone).split("/")[0] ?? "";
  return {
    cnpj,
    companyName: text(data.nome),
    tradeName: text(data.fantasia),
    cep: onlyDigits(text(data.cep)),
    address: buildAddress({
      street: text(data.logradouro),
      number: text(data.numero),
      complement: text(data.complemento),
      district: text(data.bairro),
    }),
    city: text(data.municipio),
    state: text(data.uf).toUpperCase().slice(0, 2),
    phone: formatPhone(phone),
    email: text(data.email).toLowerCase(),
    situation,
    isActive: isActiveSituation(situation),
  };
}

type FetchLike = (url: string, init?: { signal?: AbortSignal; headers?: Record<string, string> }) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

const TIMEOUT_MS = 8000;
const HEADERS = { Accept: "application/json", "User-Agent": "gestao-hectares" };

async function getJson(fetchFn: FetchLike, url: string) {
  const response = await fetchFn(url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: HEADERS });
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    /* corpo vazio ou não-JSON: tratado pelo status */
  }
  return { status: response.status, ok: response.ok, body: (body ?? {}) as Record<string, unknown> };
}

/** Consulta sem cache nem limite de uso (esses ficam em `lookupCnpjCached`). Aceita `fetchFn` para teste. */
export async function lookupCnpj(input: string, fetchFn: FetchLike = fetch as unknown as FetchLike): Promise<CnpjData> {
  const cnpj = onlyDigits(input);
  if (!isValidCnpj(cnpj)) throw new CnpjLookupError("INVALID", "CNPJ inválido. Confira os números.");

  // 1) BrasilAPI
  try {
    const result = await getJson(fetchFn, `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
    if (result.ok && text(result.body.razao_social)) return normalizeBrasilApi(result.body, cnpj);
    if (result.status === 404) throw new CnpjLookupError("NOT_FOUND", "CNPJ não encontrado na Receita Federal.");
  } catch (error) {
    if (error instanceof CnpjLookupError) throw error;
    /* falha de rede / tempo esgotado: tenta o serviço reserva */
  }

  // 2) ReceitaWS (reserva)
  try {
    const result = await getJson(fetchFn, `https://receitaws.com.br/v1/cnpj/${cnpj}`);
    if (result.status === 429) throw new CnpjLookupError("RATE_LIMIT", "O serviço de consulta está com muitos pedidos. Tente de novo em 1 minuto.");
    if (result.ok && text(result.body.status).toUpperCase() !== "ERROR" && text(result.body.nome)) {
      return normalizeReceitaWs(result.body, cnpj);
    }
    if (text(result.body.status).toUpperCase() === "ERROR" && /n[ãa]o encontrad|inv[áa]lid/i.test(text(result.body.message))) {
      throw new CnpjLookupError("NOT_FOUND", "CNPJ não encontrado na Receita Federal.");
    }
  } catch (error) {
    if (error instanceof CnpjLookupError) throw error;
  }

  throw new CnpjLookupError("UNAVAILABLE", "Não consegui consultar a Receita agora. Preencha os dados manualmente ou tente de novo em instantes.");
}

/* ---------------- cache (24 h) + limite por usuário ---------------- */
const CACHE_MS = 24 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; data: CnpjData }>();
const usage = new Map<number, number[]>();
const MAX_PER_10_MIN = 20;

export async function lookupCnpjCached(input: string, userId: number): Promise<CnpjData> {
  const cnpj = onlyDigits(input);
  const hit = cache.get(cnpj);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;

  const now = Date.now();
  const recent = (usage.get(userId) ?? []).filter((t) => now - t < 10 * 60 * 1000);
  if (recent.length >= MAX_PER_10_MIN) {
    throw new CnpjLookupError("RATE_LIMIT", "Muitas consultas seguidas. Aguarde alguns minutos.");
  }
  recent.push(now);
  usage.set(userId, recent);

  const data = await lookupCnpj(cnpj);
  cache.set(cnpj, { at: now, data });
  return data;
}
