import { describe, it, expect } from "vitest";
import * as db from "./db";

describe("Purchase Requests - Create with Items", () => {
  it("should create request and items in one flow", async () => {
    // Step 1: Create request with unique data
    let request: any;
    try {
      request = await db.createPurchaseRequest({
        requesterId: 1,
        sector: "administrativo",
        costCenterId: 1,
        priority: "media",
        desiredDate: "2026-12-31",
        observations: `Test request ${Date.now()}`,
      });
    } catch (error: any) {
      // If duplicate number error, retry once (race condition with sequential numbering)
      if (error.message?.includes("Duplicate")) {
        request = await db.createPurchaseRequest({
          requesterId: 1,
          sector: "administrativo",
          costCenterId: 1,
          priority: "media",
          desiredDate: "2026-12-31",
          observations: `Test request retry ${Date.now()}`,
        });
      } else {
        throw error;
      }
    }

    expect(request).toBeDefined();
    expect(request.id).toBeDefined();
    expect(request.id).toBeGreaterThan(0);

    // Step 2: Add items
    await db.createPurchaseRequestItem({
      requestId: request.id,
      description: "Detergente YPE 500ml",
      quantity: 10,
      unit: "UND",
      estimatedValue: 5.50,
      desiredBrand: "YPE",
      suggestedSupplier: "Atacadão",
      itemObservation: "Preferência neutro",
    });

    await db.createPurchaseRequestItem({
      requestId: request.id,
      description: "Sabão em Pó OMO 1kg",
      quantity: 5,
      unit: "UND",
      estimatedValue: 12.00,
      desiredBrand: "OMO",
      suggestedSupplier: "Atacadão",
    });

    // Step 3: Verify items are returned with details
    const details = await db.getPurchaseRequestWithDetails(request.id);

    expect(details).toBeDefined();
    expect(details.items).toBeDefined();
    expect(details.items.length).toBe(2);
    expect(details.items[0].description).toBe("Detergente YPE 500ml");
    expect(details.items[1].description).toBe("Sabão em Pó OMO 1kg");
    expect(details.items[0].quantity).toBe(10);
    expect(details.items[1].quantity).toBe(5);
  });
});
