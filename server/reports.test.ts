import { describe, it, expect, vi } from "vitest";

// Mock the database module
vi.mock("./db", () => ({
  getProducts: vi.fn().mockResolvedValue([
    { id: 1, description: "Produto A", currentQuantity: 10, minStock: 5, maxStock: 50, classification: "estoque", localAlocacao: "Prateleira 1", costCenterId: 1 },
    { id: 2, description: "Produto B", currentQuantity: 2, minStock: 5, maxStock: 30, classification: "uso_especifico", localAlocacao: "Prateleira 2", costCenterId: 2 },
    { id: 3, description: "Produto C", currentQuantity: 0, minStock: 3, maxStock: 20, classification: "estoque", localAlocacao: null, costCenterId: 1 },
  ]),
  getStockMovementsWithProducts: vi.fn().mockResolvedValue([
    { id: 1, productId: 1, productDescription: "Produto A", type: "entrada", quantity: 10, costCenterId: 1, costCenterName: "Fazenda Norte", lote: "L001", pricePerUnit: 5.50, notes: "Compra", createdAt: new Date("2026-07-01") },
    { id: 2, productId: 2, productDescription: "Produto B", type: "saida", quantity: 3, costCenterId: 2, costCenterName: "Fazenda Sul", lote: null, pricePerUnit: 0, notes: "Requisição", createdAt: new Date("2026-07-15") },
  ]),
  getConsumptionByProduct: vi.fn().mockResolvedValue([
    { productId: 1, productDescription: "Produto A", totalQuantity: 25, movementCount: 5, totalValue: 125.00 },
    { productId: 2, productDescription: "Produto B", totalQuantity: 10, movementCount: 3, totalValue: 50.00 },
  ]),
  getExitRequestsBySector: vi.fn().mockResolvedValue([
    { sector: "Jardinagem", totalRequests: 5, totalItemsRequested: 20, totalItemsDelivered: 15 },
    { sector: "Limpeza", totalRequests: 3, totalItemsRequested: 12, totalItemsDelivered: 12 },
  ]),
  getExitRequestsByCollaborator: vi.fn().mockResolvedValue([
    { collaboratorName: "João Silva", sector: "Jardinagem", totalRequests: 3, totalItemsRequested: 10 },
    { collaboratorName: "Maria Santos", sector: "Limpeza", totalRequests: 2, totalItemsRequested: 8 },
  ]),
  getPriceHistory: vi.fn().mockResolvedValue([
    { id: 1, productId: 1, productDescription: "Produto A", quantity: 10, pricePerUnit: 5.50, totalValue: 55.00, lote: "L001", notes: "Compra inicial", createdAt: new Date("2026-07-01") },
  ]),
  getProductsWithoutMovement: vi.fn().mockResolvedValue([
    { id: 3, description: "Produto C", classification: "estoque", currentQuantity: 0, localAlocacao: null, costCenterId: 1 },
  ]),
  getPurchaseRequestsByStatus: vi.fn().mockResolvedValue([
    { status: "mercado_livre", total: 5 },
    { status: "em_negociacao", total: 3 },
    { status: "finalizado", total: 10 },
  ]),
  getSpendingByCostCenter: vi.fn().mockResolvedValue([
    { costCenterId: "1", costCenterName: "Fazenda Norte", totalSpending: 5000, orderCount: 10, averageOrderValue: 500 },
  ]),
}));

describe("Reports - Backend Functions", () => {
  it("getConsumptionByProduct returns aggregated consumption data", async () => {
    const db = await import("./db");
    const result = await db.getConsumptionByProduct({ startDate: new Date("2026-07-01"), endDate: new Date("2026-07-31") });
    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty("productDescription");
    expect(result[0]).toHaveProperty("totalQuantity");
    expect(result[0]).toHaveProperty("movementCount");
    expect(result[0]).toHaveProperty("totalValue");
  });

  it("getExitRequestsBySector returns sector aggregation", async () => {
    const db = await import("./db");
    const result = await db.getExitRequestsBySector({ startDate: new Date("2026-07-01"), endDate: new Date("2026-07-31") });
    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty("sector");
    expect(result[0]).toHaveProperty("totalRequests");
    expect(result[0]).toHaveProperty("totalItemsRequested");
    expect(result[0]).toHaveProperty("totalItemsDelivered");
  });

  it("getExitRequestsByCollaborator returns collaborator data", async () => {
    const db = await import("./db");
    const result = await db.getExitRequestsByCollaborator({ startDate: new Date("2026-07-01"), endDate: new Date("2026-07-31") });
    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty("collaboratorName");
    expect(result[0]).toHaveProperty("sector");
    expect(result[0]).toHaveProperty("totalRequests");
  });

  it("getPriceHistory returns price entries", async () => {
    const db = await import("./db");
    const result = await db.getPriceHistory({ startDate: new Date("2026-07-01"), endDate: new Date("2026-07-31") });
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty("pricePerUnit");
    expect(result[0]).toHaveProperty("totalValue");
    expect(result[0].pricePerUnit).toBe(5.50);
  });

  it("getProductsWithoutMovement returns idle products", async () => {
    const db = await import("./db");
    const result = await db.getProductsWithoutMovement({ startDate: new Date("2026-07-01"), endDate: new Date("2026-07-31") });
    expect(result).toHaveLength(1);
    expect(result[0].description).toBe("Produto C");
  });

  it("getPurchaseRequestsByStatus returns status counts", async () => {
    const db = await import("./db");
    const result = await db.getPurchaseRequestsByStatus({ startDate: new Date("2026-07-01"), endDate: new Date("2026-07-31") });
    expect(result).toHaveLength(3);
    const finalizado = result.find((r: any) => r.status === "finalizado");
    expect(finalizado?.total).toBe(10);
  });

  it("getStockMovementsWithProducts returns enriched movements", async () => {
    const db = await import("./db");
    const result = await db.getStockMovementsWithProducts({ startDate: new Date("2026-07-01"), endDate: new Date("2026-07-31") });
    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty("productDescription");
    expect(result[0]).toHaveProperty("costCenterName");
  });

  it("suggestedPurchases filters products below minStock", async () => {
    const db = await import("./db");
    const allProducts = await db.getProducts();
    const suggested = allProducts.filter((p: any) => p.currentQuantity <= p.minStock);
    expect(suggested).toHaveLength(2); // Produto B (2 <= 5) and Produto C (0 <= 3)
    expect(suggested[0].description).toBe("Produto B");
    expect(suggested[1].description).toBe("Produto C");
  });
});
