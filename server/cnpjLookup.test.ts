import { describe, expect, it } from "vitest";
import { isValidCnpj } from "../shared/cnpj";
import { CnpjLookupError, formatPhone, lookupCnpj, normalizeBrasilApi } from "./_core/cnpjLookup";

const VALID = "00000000000191"; // CNPJ do Banco do Brasil (válido)

const reply = (status: number, body: unknown) => async () => ({ ok: status >= 200 && status < 300, status, json: async () => body });

describe("validação de CNPJ", () => {
  it("aceita CNPJ real e rejeita números errados", () => {
    expect(isValidCnpj("00.000.000/0001-91")).toBe(true);
    expect(isValidCnpj("00.000.000/0001-92")).toBe(false);
    expect(isValidCnpj("11111111111111")).toBe(false);
    expect(isValidCnpj("123")).toBe(false);
  });
});

describe("formatação de telefone", () => {
  it("formata fixo e celular", () => {
    expect(formatPhone("1133334444")).toBe("(11) 3333-4444");
    expect(formatPhone("11999998888")).toBe("(11) 99999-8888");
    expect(formatPhone("")).toBe("");
  });
});

describe("consulta de CNPJ", () => {
  const brasilApi = {
    razao_social: "EMPRESA TESTE LTDA",
    nome_fantasia: "Teste Agro",
    descricao_situacao_cadastral: "ATIVA",
    descricao_tipo_logradouro: "RUA",
    logradouro: "DAS FLORES",
    numero: "123",
    complemento: "SALA 2",
    bairro: "CENTRO",
    cep: "01310100",
    municipio: "SAO PAULO",
    uf: "sp",
    ddd_telefone_1: "1133334444",
  };

  it("monta os dados a partir da BrasilAPI", async () => {
    const data = await lookupCnpj(VALID, reply(200, brasilApi));
    expect(data.companyName).toBe("EMPRESA TESTE LTDA");
    expect(data.tradeName).toBe("Teste Agro");
    expect(data.address).toBe("RUA DAS FLORES, 123 - SALA 2 - CENTRO");
    expect(data.cep).toBe("01310100");
    expect(data.state).toBe("SP");
    expect(data.phone).toBe("(11) 3333-4444");
    expect(data.isActive).toBe(true);
  });

  it("marca empresa baixada como não ativa", () => {
    const data = normalizeBrasilApi({ ...brasilApi, descricao_situacao_cadastral: "BAIXADA" }, VALID);
    expect(data.isActive).toBe(false);
  });

  it("recusa CNPJ inválido sem consultar a internet", async () => {
    let called = false;
    await expect(lookupCnpj("12345678000100", async () => { called = true; return { ok: true, status: 200, json: async () => ({}) }; })).rejects.toMatchObject({ code: "INVALID" });
    expect(called).toBe(false);
  });

  it("CNPJ inexistente (404) não tenta o serviço reserva", async () => {
    let calls = 0;
    const fetchFn = async () => { calls++; return { ok: false, status: 404, json: async () => ({}) }; };
    await expect(lookupCnpj(VALID, fetchFn)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(calls).toBe(1);
  });

  it("usa a ReceitaWS quando a BrasilAPI cai", async () => {
    const fetchFn = async (url: string) => {
      if (url.includes("brasilapi")) throw new Error("fora do ar");
      return { ok: true, status: 200, json: async () => ({ status: "OK", nome: "EMPRESA RESERVA", fantasia: "", logradouro: "AV BRASIL", numero: "10", bairro: "CENTRO", municipio: "CAMPINAS", uf: "SP", cep: "13.000-000", telefone: "(19) 3222-1111 / (19) 99999-0000", email: "CONTATO@RESERVA.COM", situacao: "ATIVA" }) };
    };
    const data = await lookupCnpj(VALID, fetchFn);
    expect(data.companyName).toBe("EMPRESA RESERVA");
    expect(data.phone).toBe("(19) 3222-1111");
    expect(data.email).toBe("contato@reserva.com");
    expect(data.cep).toBe("13000000");
  });

  it("avisa quando os dois serviços falham", async () => {
    const fetchFn = async () => { throw new Error("sem rede"); };
    await expect(lookupCnpj(VALID, fetchFn)).rejects.toBeInstanceOf(CnpjLookupError);
    await expect(lookupCnpj(VALID, fetchFn)).rejects.toMatchObject({ code: "UNAVAILABLE" });
  });
});
