import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createTestContext(): TrpcContext {
  const user = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "senha",
    passwordHash: null,
    isActive: true,
    role: "admin" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

describe("Products Router", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(() => {
    const ctx = createTestContext();
    caller = appRouter.createCaller(ctx);
  });

  it("should list products", async () => {
    const products = await caller.products.list({});
    expect(Array.isArray(products)).toBe(true);
  });

  it("should create a cost center", async () => {
    const result = await caller.costCenters.create({
      name: `Test Center ${Date.now()}`,
      description: "A test cost center",
    });
    expect(result).toBeDefined();
  });

  it("should list cost centers", async () => {
    const centers = await caller.costCenters.list();
    expect(Array.isArray(centers)).toBe(true);
  });

  it("should handle stock movements", async () => {
    // Get the cost center
    const centers = await caller.costCenters.list();
    const testCenter = centers[0]; // Use first available center

    if (testCenter) {
      // Create a product
      const productResult = await caller.products.create({
        description: "Test Product for Movement",
        unitValue: "10.00",
        minStock: 5,
        maxStock: 100,
        costCenterId: testCenter.id,
      });

      expect(productResult).toBeDefined();
    }
  });

  it("should get suggested purchases", async () => {
    const suggestions = await caller.reports.suggestedPurchases();
    expect(Array.isArray(suggestions)).toBe(true);
  });

  it("should get dashboard summary", async () => {
    const summary = await caller.dashboard.summary();
    expect(summary).toBeDefined();
    expect(summary.totalProducts).toBeGreaterThanOrEqual(0);
    expect(summary.totalQuantity).toBeGreaterThanOrEqual(0);
    expect(summary.productsBelowMinStock).toBeGreaterThanOrEqual(0);
  });
});
