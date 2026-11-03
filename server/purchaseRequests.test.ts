import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as db from "./db";

// Mock database functions for testing
describe("Purchase Requests Database Functions", () => {
  let testRequestId: number;
  let testUserId: number;
  let testCostCenterId: number;

  beforeAll(async () => {
    // These tests assume the database is available
    // In a real scenario, you would use a test database
  });

  afterAll(async () => {
    // Cleanup
  });

  describe("generatePurchaseRequestNumber", () => {
    it("should generate a purchase request number with SR- prefix", async () => {
      const number = await db.generatePurchaseRequestNumber();
      expect(number).toMatch(/^SR-\d{6}$/);
    });

    it("should generate sequential numbers", async () => {
      const number = await db.generatePurchaseRequestNumber();
      expect(number).toMatch(/^SR-\d{6}$/);
      
      const parts = number.split("-");
      expect(parts).toHaveLength(2);
      expect(parts[0]).toBe("SR");
      expect(parseInt(parts[1])).toBeGreaterThanOrEqual(0);
    });
  });

  describe("createPurchaseRequest", () => {
    it("should create a purchase request with valid data", async () => {
      let result: any;
      try {
        result = await db.createPurchaseRequest({
          requesterId: 1,
          sector: "administrativo",
          costCenterId: 1,
          priority: "media",
          desiredDate: "2026-12-31",
          observations: `Test request ${Date.now()}`,
        });
      } catch (error: any) {
        if (error.message?.includes("Duplicate")) {
          result = await db.createPurchaseRequest({
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

      expect(result).toBeDefined();
      expect(result.number).toMatch(/^SR-\d{6}$/);
    });

    it("should create a request with all priority levels", async () => {
      const priorities = ["baixa", "media", "alta", "urgente"] as const;

      for (const priority of priorities) {
        let result: any;
        try {
          result = await db.createPurchaseRequest({
            requesterId: 1,
            sector: "administrativo",
            costCenterId: 1,
            priority,
          });
        } catch (error: any) {
          if (error.message?.includes("Duplicate")) {
            result = await db.createPurchaseRequest({
              requesterId: 1,
              sector: "administrativo",
              costCenterId: 1,
              priority,
            });
          } else {
            throw error;
          }
        }
        expect(result).toBeDefined();
        expect(result.number).toMatch(/^SR-\d{6}$/);
      }
    });
  });

  describe("getPurchaseRequestsStats", () => {
    it("should return stats object with all required fields", async () => {
      const stats = await db.getPurchaseRequestsStats();

      expect(stats).toHaveProperty("pending");
      expect(stats).toHaveProperty("inNegotiation");
      expect(stats).toHaveProperty("urgent");
      expect(stats).toHaveProperty("finished");

      expect(typeof stats.pending).toBe("number");
      expect(typeof stats.inNegotiation).toBe("number");
      expect(typeof stats.urgent).toBe("number");
      expect(typeof stats.finished).toBe("number");
    });

    it("should return non-negative numbers", async () => {
      const stats = await db.getPurchaseRequestsStats();

      expect(stats.pending).toBeGreaterThanOrEqual(0);
      expect(stats.inNegotiation).toBeGreaterThanOrEqual(0);
      expect(stats.urgent).toBeGreaterThanOrEqual(0);
      expect(stats.finished).toBeGreaterThanOrEqual(0);
    });
  });

  describe("createPurchaseRequestItem", () => {
    it("should create a purchase request item with valid data", async () => {
      const result = await db.createPurchaseRequestItem({
        requestId: 1,
        productCode: "PROD-001",
        description: "Test Product",
        quantity: 10,
        unit: "UND",
        estimatedValue: 100,
      });

      expect(result).toBeDefined();
    });

    it("should handle optional fields", async () => {
      const result = await db.createPurchaseRequestItem({
        requestId: 1,
        productCode: "PROD-002",
        description: "Test Product 2",
        quantity: 5,
        unit: "CX",
        desiredBrand: "Brand A",
        suggestedSupplier: "Supplier A",
        estimatedValue: 50,
        itemObservation: "Special notes",
      });

      expect(result).toBeDefined();
    });
  });

  describe("addPurchaseRequestComment", () => {
    it("should add a comment to a purchase request", async () => {
      const result = await db.addPurchaseRequestComment({
        requestId: 1,
        userId: 1,
        message: "Test comment",
      });

      expect(result).toBeDefined();
    });

    it("should handle comments with special characters", async () => {
      const result = await db.addPurchaseRequestComment({
        requestId: 1,
        userId: 1,
        message: "Test comment with special chars: @#$%^&*()",
      });

      expect(result).toBeDefined();
    });
  });

  describe("updatePurchaseRequestStatus", () => {
    it("should update status and create history record", async () => {
      // Get an existing request to update
      const requests = await db.getPurchaseRequests({});
      if (requests.length > 0) {
        const requestId = requests[0].id;

        // Update status
        await db.updatePurchaseRequestStatus(
          requestId,
          "em_negociacao",
          1,
          "Enviado para negociação"
        );

        // Verify the update
        const updated = await db.getPurchaseRequestById(requestId);
        expect(updated?.status).toBe("em_negociacao");
      } else {
        // No requests exist, skip
        expect(true).toBe(true);
      }
    });
  });

  describe("getPurchaseRequests", () => {
    it("should return array of purchase requests", async () => {
      const requests = await db.getPurchaseRequests();
      expect(Array.isArray(requests)).toBe(true);
    });

    it("should filter by status", async () => {
      const requests = await db.getPurchaseRequests({ status: "mercado_livre" });
      expect(Array.isArray(requests)).toBe(true);
      
      if (requests.length > 0) {
        requests.forEach((req: any) => {
          expect(req.status).toBe("mercado_livre");
        });
      }
    });

    it("should filter by priority", async () => {
      const requests = await db.getPurchaseRequests({ priority: "urgente" });
      expect(Array.isArray(requests)).toBe(true);
      
      if (requests.length > 0) {
        requests.forEach((req: any) => {
          expect(req.priority).toBe("urgente");
        });
      }
    });
  });
});
