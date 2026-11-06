import { describe, expect, it } from "vitest";
import { calcOrderTotals, formatOrderNumber } from "../shared/orderTotals";

describe("total da ordem de compra", () => {
  const items = [
    { quantity: "10", unitValue: "5", discount: "0" }, // 50
    { quantity: "2", unitValue: "100.50", discount: "1" }, // 200
  ];

  it("soma os produtos descontando o desconto de cada item", () => {
    expect(calcOrderTotals({ items }).total).toBe(250);
  });

  it("frete e impostos só entram quando marcados", () => {
    expect(calcOrderTotals({ items, freightValue: "30", taxes: "20" }).total).toBe(250);
    expect(calcOrderTotals({ items, freightValue: "30", addFreightToTotal: true }).total).toBe(280);
    expect(calcOrderTotals({ items, taxes: "20", applyTaxes: true }).total).toBe(270);
  });

  it("aplica desconto em reais e em porcentagem sobre os produtos", () => {
    const r = calcOrderTotals({ items, discountValue: "10", discountPercent: "10" });
    expect(r.discount).toBe(35);
    expect(r.total).toBe(215);
  });

  it("nunca fica negativo e ignora texto inválido", () => {
    expect(calcOrderTotals({ items, discountValue: "9999" }).total).toBe(0);
    expect(calcOrderTotals({ items: [{ quantity: "", unitValue: "abc" }] }).total).toBe(0);
  });

  it("aceita vírgula decimal", () => {
    expect(calcOrderTotals({ items: [{ quantity: "2", unitValue: "1,5" }] }).total).toBe(3);
  });
});

describe("número da ordem", () => {
  it("formata sequencial com 3 dígitos", () => {
    expect(formatOrderNumber(2026, 1)).toBe("OC-2026-001");
    expect(formatOrderNumber(2026, 42)).toBe("OC-2026-042");
    expect(formatOrderNumber(2026, 1000)).toBe("OC-2026-1000");
  });
});
