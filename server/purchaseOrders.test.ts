import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./_core/db";
import { purchaseOrders, purchaseOrderItems, suppliers, products, costCenters } from "../drizzle/schema";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "senha",
    passwordHash: null,
    isActive: true,
    role: "user",
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

  return { ctx };
}

describe("purchaseOrders.list", () => {
  it("returns purchase orders with items", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.purchaseOrders.list({});
      
      // Check if result is an array
      expect(Array.isArray(result)).toBe(true);
      
      // If there are orders, check if they have items
      if (result.length > 0) {
        const order = result[0];
        
        // Check that order has required fields
        expect(order).toHaveProperty('id');
        expect(order).toHaveProperty('orderNumber');
        expect(order).toHaveProperty('totalValue');
        
        // Check if items property exists (should be an array)
        expect(order).toHaveProperty('items');
        expect(Array.isArray(order.items)).toBe(true);
        
        // If order has items, check their structure
        if (order.items && order.items.length > 0) {
          const item = order.items[0];
          expect(item).toHaveProperty('productId');
          expect(item).toHaveProperty('productName');
          expect(item).toHaveProperty('quantity');
          expect(item).toHaveProperty('unitValue');
          expect(item).toHaveProperty('subtotal');
        }
      }
    } catch (error) {
      console.error("Test error:", error);
      throw error;
    }
  });
});
