import { describe, expect, it } from "vitest";
import { generatePurchaseOrderPrint } from "../client/src/components/PurchaseOrderPrint";

describe("generatePurchaseOrderPrint", () => {
  it("includes the logo image in the print HTML", () => {
    const mockOrder = {
      id: 1,
      orderNumber: "OC-2026-TEST-001",
      supplierId: 1,
      supplierName: "Fornecedor Alpha",
      supplierCNPJ: "12.345.678/0001-90",
      supplierEmail: "fornecedor@example.com",
      supplierPhone: "(67)99999-9999",
      supplierAddress: "Rua Teste, 123",
      supplierCity: "Dourados",
      supplierState: "MS",
      supplierCEP: "79000-000",
      costCenterId: 1,
      costCenterName: "Estoque",
      totalValue: "100.00",
      paymentMethod: "a_vista",
      installments: 1,
      observations: "Teste",
      createdAt: new Date("2026-01-20"),
      status: "pendente",
      items: [
        {
          productId: 1,
          productName: "Produto Teste",
          quantity: 5,
          unitValue: 20.00,
          subtotal: 100.00,
        },
      ],
    };

    const html = generatePurchaseOrderPrint(mockOrder);

    // Verificar que a logo está incluída
    expect(html).toContain("https://files.manuscdn.com/user_upload_by_module/session_file/310519663282117022/TvykGNFMVvGDkChn.png");
    expect(html).toContain("Logo Hectares");
    expect(html).toContain("Associação Hectares");
    expect(html).toContain("OC-2026-TEST-001");
    expect(html).toContain("Produto Teste");
    expect(html).toContain("5");
    expect(html).toContain("100");
  });
});
