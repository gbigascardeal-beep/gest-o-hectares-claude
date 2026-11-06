import { describe, expect, it } from "vitest";
import { can } from "../shared/roles";

describe("permissões por perfil", () => {
  it("comprador e administrador gerenciam ordens; supervisor e almoxarifado não", () => {
    expect(can("comprador", "manageOrders")).toBe(true);
    expect(can("admin", "manageOrders")).toBe(true);
    expect(can("supervisor", "manageOrders")).toBe(false);
    expect(can("almoxarifado", "manageOrders")).toBe(false);
  });

  it("comprador, almoxarifado e administrador marcam a ordem como entregue", () => {
    expect(can("comprador", "deliverOrders")).toBe(true);
    expect(can("almoxarifado", "deliverOrders")).toBe(true);
    expect(can("admin", "deliverOrders")).toBe(true);
    expect(can("supervisor", "deliverOrders")).toBe(false);
    expect(can("user", "deliverOrders")).toBe(false);
  });

  it("só supervisor abre solicitações/requisições e só almoxarifado mexe no estoque", () => {
    expect(can("supervisor", "createRequests")).toBe(true);
    expect(can("comprador", "createRequests")).toBe(false);
    expect(can("almoxarifado", "handleStock")).toBe(true);
    expect(can("supervisor", "handleStock")).toBe(false);
  });

  it("perfil ausente nunca tem permissão", () => {
    expect(can(undefined, "manageOrders")).toBe(false);
    expect(can(null, "deliverOrders")).toBe(false);
  });
});
