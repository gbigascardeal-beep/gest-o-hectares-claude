/** Cálculo único do total da ordem de compra: a tela (barra de total) e o valor gravado usam esta mesma conta. */
export type OrderTotalsInput = {
  items: { quantity: string | number; unitValue: string | number; discount?: string | number }[];
  freightValue?: string | number;
  addFreightToTotal?: boolean;
  taxes?: string | number;
  applyTaxes?: boolean;
  discountValue?: string | number;
  discountPercent?: string | number;
};

export type OrderTotals = {
  subtotal: number; // soma dos produtos (já com o desconto de cada item)
  freight: number; // frete somado ao total (0 se não marcado)
  taxes: number; // impostos somados ao total (0 se não marcado)
  discount: number; // desconto geral (R$ + %)
  total: number;
};

const num = (value: string | number | undefined): number => {
  const parsed = typeof value === "number" ? value : parseFloat(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};
const money = (value: number) => Math.round(value * 100) / 100;

export function itemTotal(item: OrderTotalsInput["items"][number]): number {
  return money(num(item.quantity) * num(item.unitValue) - num(item.discount));
}

export function calcOrderTotals(input: OrderTotalsInput): OrderTotals {
  const subtotal = money(input.items.reduce((sum, item) => sum + itemTotal(item), 0));
  const freight = input.addFreightToTotal ? money(Math.max(0, num(input.freightValue))) : 0;
  const taxes = input.applyTaxes ? money(Math.max(0, num(input.taxes))) : 0;
  const percent = Math.min(100, Math.max(0, num(input.discountPercent)));
  const discount = money(Math.max(0, num(input.discountValue)) + (subtotal * percent) / 100);
  const total = money(Math.max(0, subtotal - discount + freight + taxes));
  return { subtotal, freight, taxes, discount, total };
}

/** "OC-2026-001". Passa de 999 sem problema (OC-2026-1000). */
export function formatOrderNumber(year: number, sequence: number): string {
  return `OC-${year}-${String(sequence).padStart(3, "0")}`;
}

export const formatBRL = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
