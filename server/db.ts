import { randomUUID } from "node:crypto";
import { calcOrderTotals, formatOrderNumber, itemTotal } from "@shared/orderTotals";
import { eq, and, gte, lte, like, desc, asc, gt, sql, or, count, sum } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  users,
  costCenters,
  products,
  stockMovements,
  suppliers,
  purchaseOrders,
  purchaseOrderItems,
  purchaseOrderInstallments,
  files,
  purchaseRequests,
  purchaseRequestItems,
  purchaseRequestHistory,
  purchaseRequestAttachments,
  purchaseRequestComments,
  exitRequests,
  exitRequestItems,
  exitRequestHistory,
} from "../drizzle/schema";
import { TRPCError } from "@trpc/server";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ USER OPERATIONS ============

export type PublicUser = Omit<typeof users.$inferSelect, "passwordHash">;

export function toPublicUser<T extends { passwordHash?: string | null }>(user: T): Omit<T, "passwordHash"> {
  const { passwordHash: _ignored, ...rest } = user;
  return rest;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email.trim().toLowerCase()))
    .limit(1);
  return result[0];
}

export async function listUsers() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(users).orderBy(asc(users.name));
  return rows.map(toPublicUser);
}

export async function createLocalUser(data: {
  name: string;
  email: string;
  passwordHash: string;
  role: "user" | "supervisor" | "admin";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const email = data.email.trim().toLowerCase();
  if (await getUserByEmail(email)) {
    throw new TRPCError({ code: "CONFLICT", message: "Já existe um usuário com esse e-mail" });
  }
  await db.insert(users).values({
    openId: `local:${randomUUID()}`,
    name: data.name.trim(),
    email,
    loginMethod: "senha",
    passwordHash: data.passwordHash,
    role: data.role,
    isActive: true,
  });
}

export async function updateUserById(
  id: number,
  data: { name?: string; role?: "user" | "supervisor" | "admin"; isActive?: boolean; passwordHash?: string }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (Object.keys(data).length === 0) return;
  await db.update(users).set(data).where(eq(users.id, id));
}

export async function touchLastSignedIn(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, id));
}

export async function countActiveAdmins() {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.isActive, true)));
  return rows.length;
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ COST CENTER OPERATIONS ============

export async function createCostCenter(data: {
  name: string;
  description?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(costCenters).values({
    name: data.name,
    description: data.description,
  });

  return result;
}

export async function getCostCenters() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(costCenters).where(eq(costCenters.isActive, true));
}

export async function getCostCenterById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(costCenters)
    .where(eq(costCenters.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function updateCostCenter(
  id: number,
  data: { name?: string; description?: string; isActive?: boolean }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(costCenters).set(data).where(eq(costCenters.id, id));
}

// ============ PRODUCT OPERATIONS ============

export async function createProduct(data: {
  description: string;
  localAlocacao?: string;
  classification?: "estoque" | "uso_especifico";
  minStock: number;
  maxStock: number;
  minStockEstoque?: number;
  minStockUsoEspecifico?: number;
  costCenterId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(products).values({
    description: data.description,
    localAlocacao: data.localAlocacao || null,
    classification: data.classification || "estoque",
    minStock: data.minStock,
    maxStock: data.maxStock,
    minStockEstoque: data.minStockEstoque || 5,
    minStockUsoEspecifico: data.minStockUsoEspecifico || 2,
    costCenterId: data.costCenterId,
    currentQuantity: 0,
  });
}

export async function getProducts(filters?: {
  costCenterId?: number;
  search?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  let conditions: any[] = [];

  if (filters?.costCenterId) {
    conditions.push(eq(products.costCenterId, filters.costCenterId));
  }

  if (filters?.search) {
    conditions.push(like(products.description, `%${filters.search}%`));
  }

  if (conditions.length === 0) {
    return await db.select().from(products).orderBy(asc(products.description));
  }

  return await db
    .select()
    .from(products)
    .where(and(...conditions))
    .orderBy(asc(products.description));
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateProduct(
  id: number,
  data: {
    description?: string;
    localAlocacao?: string;
    classification?: "estoque" | "uso_especifico";
    minStock?: number;
    maxStock?: number;
    minStockEstoque?: number;
    minStockUsoEspecifico?: number;
    costCenterId?: number;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(products).set(data).where(eq(products.id, id));
}

export async function updateProductQuantity(id: number, quantity: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(products)
    .set({ currentQuantity: quantity })
    .where(eq(products.id, id));
}

export async function deleteProduct(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.delete(products).where(eq(products.id, id));
}

export async function getProductsBelowMinStock() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.classification, "estoque"),
        lte(products.currentQuantity, products.minStock),
        gt(products.minStock, 0)
      )
    );
}

export function isProductBelowMinAlert(
  product: typeof products.$inferSelect
): boolean {
  const minLimit =
    product.classification === "estoque"
      ? product.minStockEstoque
      : product.minStockUsoEspecifico;
  return product.currentQuantity <= minLimit;
}

export async function getProductsBelowMinAlert() {
  const db = await getDb();
  if (!db) return [];

  const allProducts = await db.select().from(products);
  return allProducts.filter(isProductBelowMinAlert);
}

// ============ STOCK MOVEMENT OPERATIONS ============

export async function getStockMovements(filters?: {
  productId?: number;
  costCenterId?: number;
  type?: "entrada" | "saida";
  startDate?: Date;
  endDate?: Date;
}) {
  const db = await getDb();
  if (!db) return [];

  let conditions: any[] = [];

  if (filters?.productId) {
    conditions.push(eq(stockMovements.productId, filters.productId));
  }

  if (filters?.costCenterId) {
    conditions.push(eq(stockMovements.costCenterId, filters.costCenterId));
  }

  if (filters?.type) {
    conditions.push(eq(stockMovements.type, filters.type));
  }

  if (filters?.startDate) {
    conditions.push(gte(stockMovements.createdAt, filters.startDate));
  }

  if (filters?.endDate) {
    conditions.push(lte(stockMovements.createdAt, filters.endDate));
  }

  if (conditions.length === 0) {
    return await db.select().from(stockMovements).orderBy(desc(stockMovements.createdAt));
  }

  return await db
    .select()
    .from(stockMovements)
    .where(and(...conditions))
    .orderBy(desc(stockMovements.createdAt));
}

const movementEffect = (type: "entrada" | "saida", quantity: number) =>
  type === "entrada" ? quantity : -quantity;

function insufficientStock(current: number, needed: number) {
  return new TRPCError({
    code: "BAD_REQUEST",
    message: `Estoque insuficiente: saldo atual ${current}, necessário ${needed}.`,
  });
}

/** Registra uma movimentação e atualiza o saldo do produto na mesma transação (com trava na linha do produto). */
export async function applyStockMovement(data: {
  productId: number;
  type: "entrada" | "saida";
  quantity: number;
  costCenterId: number;
  userId: number;
  lote?: string;
  pricePerUnit?: string | number;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.transaction(async (tx) => {
    const [product] = await tx.select().from(products).where(eq(products.id, data.productId)).for("update");
    if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Produto não encontrado" });

    const newQuantity = product.currentQuantity + movementEffect(data.type, data.quantity);
    if (newQuantity < 0) throw insufficientStock(product.currentQuantity, data.quantity);

    await tx.insert(stockMovements).values({
      productId: data.productId,
      type: data.type,
      quantity: data.quantity,
      costCenterId: data.costCenterId,
      userId: data.userId,
      lote: data.lote,
      pricePerUnit: data.pricePerUnit === undefined ? undefined : String(data.pricePerUnit),
      notes: data.notes,
    });
    await tx.update(products).set({ currentQuantity: newQuantity }).where(eq(products.id, product.id));
    return { newQuantity };
  });
}

/** Edita uma movimentação e corrige o saldo do produto junto. */
export async function updateStockMovementSafe(
  id: number,
  data: { quantity?: number; lote?: string; pricePerUnit?: string | number; notes?: string }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.transaction(async (tx) => {
    const [movement] = await tx.select().from(stockMovements).where(eq(stockMovements.id, id)).for("update");
    if (!movement) throw new TRPCError({ code: "NOT_FOUND", message: "Movimentação não encontrada" });
    const [product] = await tx.select().from(products).where(eq(products.id, movement.productId)).for("update");
    if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Produto não encontrado" });

    const newMovementQty = data.quantity ?? movement.quantity;
    const newBalance =
      product.currentQuantity -
      movementEffect(movement.type, movement.quantity) +
      movementEffect(movement.type, newMovementQty);
    if (newBalance < 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Essa alteração deixaria o estoque negativo (${newBalance}). Ajuste a quantidade.`,
      });
    }

    const updateData: Record<string, unknown> = {};
    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.lote !== undefined) updateData.lote = data.lote;
    if (data.pricePerUnit !== undefined) updateData.pricePerUnit = String(data.pricePerUnit);
    if (data.notes !== undefined) updateData.notes = data.notes;

    if (Object.keys(updateData).length > 0) {
      await tx.update(stockMovements).set(updateData).where(eq(stockMovements.id, id));
    }
    await tx.update(products).set({ currentQuantity: newBalance }).where(eq(products.id, product.id));
    return { newQuantity: newBalance };
  });
}

/** Exclui uma movimentação desfazendo o efeito dela no saldo do produto. */
export async function deleteStockMovementSafe(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.transaction(async (tx) => {
    const [movement] = await tx.select().from(stockMovements).where(eq(stockMovements.id, id)).for("update");
    if (!movement) throw new TRPCError({ code: "NOT_FOUND", message: "Movimentação não encontrada" });
    const [product] = await tx.select().from(products).where(eq(products.id, movement.productId)).for("update");

    if (product) {
      const newBalance = product.currentQuantity - movementEffect(movement.type, movement.quantity);
      if (newBalance < 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Não dá para excluir: essa entrada já foi consumida por saídas posteriores.",
        });
      }
      await tx.update(products).set({ currentQuantity: newBalance }).where(eq(products.id, product.id));
    }
    await tx.delete(stockMovements).where(eq(stockMovements.id, id));
    return { success: true };
  });
}

// ============ SUPPLIER OPERATIONS ============

export type SupplierInput = {
  cnpj: string;
  companyName: string;
  tradeName?: string | null;
  category?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  cep?: string | null;
  city?: string | null;
  state?: string | null;
};

export async function createSupplier(data: SupplierInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(suppliers).values(data);

  // Retornar o fornecedor criado
  return await db.select().from(suppliers).where(eq(suppliers.cnpj, data.cnpj)).limit(1);
}

export async function updateSupplier(
  id: number,
  data: Partial<Omit<SupplierInput, "cnpj">> & { isFavorite?: boolean; isActive?: boolean }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (Object.keys(data).length === 0) return;
  await db.update(suppliers).set(data).where(eq(suppliers.id, id));
}

export async function getSuppliers() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(suppliers).where(eq(suppliers.isActive, true));
}

export async function getSupplierById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getSupplierByCnpj(cnpj: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.cnpj, cnpj))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ PURCHASE ORDER OPERATIONS ============

/** Próximo número da sequência do ano (OC-2026-001, 002...). Ignora números digitados à mão que fujam do padrão. */
async function nextOrderNumber(db: NonNullable<Awaited<ReturnType<typeof getDb>>>): Promise<string> {
  const year = Number(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric" }).format(new Date()));
  const prefix = `OC-${year}-`;
  const [row] = await db
    .select({ last: sql<number | null>`MAX(CAST(SUBSTRING(${purchaseOrders.orderNumber}, ${prefix.length + 1}) AS UNSIGNED))` })
    .from(purchaseOrders)
    .where(sql`${purchaseOrders.orderNumber} REGEXP ${`^OC-${year}-[0-9]+$`}`);
  return formatOrderNumber(year, Number(row?.last ?? 0) + 1);
}

function isDuplicateKey(error: any): boolean {
  return [error, error?.cause].some((e) => e?.code === "ER_DUP_ENTRY" || e?.errno === 1062);
}

export async function createPurchaseOrder(data: {
  supplierId: number;
  costCenterId: number;
  requestedBy: number;
  paymentMethod: "a_vista" | "parcelado";
  installments?: number;
  totalValue: string | number;
  freightValue?: string | number;
  observations?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Convert totalValue to number and ensure it's valid
  const totalValueNum = typeof data.totalValue === 'string' 
    ? parseFloat(data.totalValue) 
    : data.totalValue;

  if (isNaN(totalValueNum)) {
    throw new Error("Invalid totalValue: must be a valid number");
  }

  // Convert freightValue to number if provided
  let freightValueNum: number | undefined = undefined;
  if (data.freightValue !== undefined) {
    freightValueNum = typeof data.freightValue === 'string' 
      ? parseFloat(data.freightValue) 
      : data.freightValue;
    if (isNaN(freightValueNum)) {
      freightValueNum = 0;
    }
  }

  // O número é gerado aqui. Se duas ordens saírem ao mesmo tempo e pegarem o mesmo número,
  // o banco recusa a repetida (campo único) e tentamos de novo com o próximo.
  for (let attempt = 0; attempt < 5; attempt++) {
    const orderNumber = await nextOrderNumber(db);
    try {
      await db.insert(purchaseOrders).values({
        orderNumber,
        supplierId: data.supplierId,
        costCenterId: data.costCenterId,
        requestedBy: data.requestedBy,
        paymentMethod: data.paymentMethod,
        installments: data.installments,
        totalValue: totalValueNum.toString(),
        freightValue: freightValueNum !== undefined ? freightValueNum.toString() : '0.00',
        observations: data.observations,
      });
    } catch (error) {
      if (isDuplicateKey(error)) continue;
      throw error;
    }
    const inserted = await db.select().from(purchaseOrders).where(eq(purchaseOrders.orderNumber, orderNumber)).limit(1);
    return inserted[0];
  }
  throw new Error("Não foi possível gerar o número da ordem. Tente de novo.");
}

export async function getPurchaseOrders(filters?: {
  status?: string;
  costCenterId?: number;
  supplierId?: number;
  startDate?: Date;
  endDate?: Date;
}) {
  const db = await getDb();
  if (!db) return [];

  let conditions: any[] = [];

  if (filters?.status) {
    conditions.push(eq(purchaseOrders.status, filters.status as any));
  }

  if (filters?.costCenterId) {
    conditions.push(eq(purchaseOrders.costCenterId, filters.costCenterId));
  }

  if (filters?.supplierId) {
    conditions.push(eq(purchaseOrders.supplierId, filters.supplierId));
  }

  if (filters?.startDate) {
    conditions.push(gte(purchaseOrders.createdAt, filters.startDate));
  }

  if (filters?.endDate) {
    conditions.push(lte(purchaseOrders.createdAt, filters.endDate));
  }

  try {
    let query: any = db
      .select({
        id: purchaseOrders.id,
        orderNumber: purchaseOrders.orderNumber,
        supplierId: purchaseOrders.supplierId,
        supplierName: suppliers.companyName,
        supplierCNPJ: suppliers.cnpj,
        supplierEmail: suppliers.email,
        supplierPhone: suppliers.phone,
        supplierAddress: suppliers.address,
        supplierCity: suppliers.city,
        supplierState: suppliers.state,
        supplierCEP: suppliers.cep,
        costCenterId: purchaseOrders.costCenterId,
        status: purchaseOrders.status,
        totalValue: purchaseOrders.totalValue,
        freightValue: purchaseOrders.freightValue,
        createdAt: purchaseOrders.createdAt,
        paymentMethod: purchaseOrders.paymentMethod,
        installments: purchaseOrders.installments,
        observations: purchaseOrders.observations,
      })
      .from(purchaseOrders)
      .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id));

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const ordersData = await query.orderBy(desc(purchaseOrders.createdAt));

    // Get items for each order
    const ordersWithItems = await Promise.all(
      ordersData.map(async (order: any) => {
        const items = await db
          .select({
            productId: purchaseOrderItems.productId,
            productName: purchaseOrderItems.productName,
            productDescription: products.description,
            quantity: purchaseOrderItems.quantity,
            unitValue: purchaseOrderItems.unitValue,
            subtotal: purchaseOrderItems.totalValue,
          })
          .from(purchaseOrderItems)
          .leftJoin(products, eq(purchaseOrderItems.productId, products.id))
          .where(eq(purchaseOrderItems.purchaseOrderId, order.id));

        return {
          ...order,
          items: (items || []).map((item: any) => ({
            ...item,
            productName: item.productDescription || item.productName || "Produto sem nome",
          })),
        };
      })
    );

    return ordersWithItems;
  } catch (error) {
    console.error("Error fetching purchase orders:", error);
    return [];
  }
}

export async function getPurchaseOrderById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(purchaseOrders)
    .where(eq(purchaseOrders.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export type PurchaseOrderStatus = "solicitado" | "entregue" | "cancelada";

const normalizeName = (text: string) => text.trim().replace(/\s+/g, " ");

/**
 * Troca o status da ordem de compra.
 * - Para "entregue": dá entrada de cada item no estoque (cria o produto se ainda não existir).
 *   Itens marcados como "uso específico" não entram no saldo.
 * - Saindo de "entregue": desfaz as entradas feitas por esta ordem.
 * Tudo numa transação: ou acontece por completo, ou nada muda.
 */
export async function changePurchaseOrderStatus(id: number, newStatus: PurchaseOrderStatus, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.transaction(async (tx) => {
    const [order] = await tx.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)).for("update");
    if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Ordem de compra não encontrada" });
    if (order.status === newStatus) return { status: newStatus, entriesApplied: 0, entriesReverted: 0 };

    const items = await tx
      .select()
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.purchaseOrderId, id))
      .orderBy(asc(purchaseOrderItems.id));

    let entriesApplied = 0;
    let entriesReverted = 0;

    if (newStatus === "entregue") {
      for (const item of items) {
        if (item.stockMovementId) continue; // já tem entrada: nunca duplica

        let productId = item.productId;
        let product = productId
          ? (await tx.select().from(products).where(eq(products.id, productId)).for("update"))[0]
          : undefined;

        if (!product) {
          const name = normalizeName(item.productName ?? "");
          if (!name) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Há um item sem produto nem nome. Corrija a ordem antes de marcar como entregue." });
          }
          // evita duplicar: usa o produto de mesmo nome, se já existir
          product = (
            await tx
              .select()
              .from(products)
              .where(sql`lower(trim(${products.description})) = ${name.toLowerCase()}`)
              .limit(1)
              .for("update")
          )[0];
          if (!product) {
            const [created] = await tx
              .insert(products)
              .values({
                description: name,
                classification: item.isSpecificUse ? "uso_especifico" : "estoque",
                costCenterId: order.costCenterId,
                currentQuantity: 0,
              })
              .$returningId();
            product = (await tx.select().from(products).where(eq(products.id, created.id)).for("update"))[0];
          }
          productId = product.id;
          await tx.update(purchaseOrderItems).set({ productId }).where(eq(purchaseOrderItems.id, item.id));
        }

        if (item.isSpecificUse) continue; // uso específico: fica cadastrado, mas não entra no estoque

        const [movement] = await tx
          .insert(stockMovements)
          .values({
            productId: product.id,
            type: "entrada",
            quantity: item.quantity,
            costCenterId: order.costCenterId,
            userId,
            pricePerUnit: item.unitValue,
            notes: `Entrada - Ordem de compra ${order.orderNumber}`,
          })
          .$returningId();
        await tx
          .update(products)
          .set({ currentQuantity: product.currentQuantity + item.quantity })
          .where(eq(products.id, product.id));
        await tx.update(purchaseOrderItems).set({ stockMovementId: movement.id }).where(eq(purchaseOrderItems.id, item.id));
        entriesApplied += 1;
      }
    } else if (order.status === "entregue") {
      for (const item of items) {
        if (!item.stockMovementId) continue;

        const [movement] = await tx.select().from(stockMovements).where(eq(stockMovements.id, item.stockMovementId)).for("update");
        if (movement) {
          const [product] = await tx.select().from(products).where(eq(products.id, movement.productId)).for("update");
          if (product) {
            const newBalance = product.currentQuantity - movement.quantity;
            if (newBalance < 0) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Não dá para voltar o status: parte de "${product.description}" já saiu do estoque (saldo atual ${product.currentQuantity}, a entrada desta ordem foi de ${movement.quantity}).`,
              });
            }
            await tx.update(products).set({ currentQuantity: newBalance }).where(eq(products.id, product.id));
          }
          await tx.delete(stockMovements).where(eq(stockMovements.id, movement.id));
          entriesReverted += 1;
        }
        await tx.update(purchaseOrderItems).set({ stockMovementId: null }).where(eq(purchaseOrderItems.id, item.id));
      }
    }

    await tx
      .update(purchaseOrders)
      .set({ status: newStatus, stockAppliedAt: newStatus === "entregue" ? new Date() : null })
      .where(eq(purchaseOrders.id, id));

    return { status: newStatus, entriesApplied, entriesReverted };
  });
}

// ============ PURCHASE ORDER ITEMS OPERATIONS ============

export async function createPurchaseOrderItem(data: {
  purchaseOrderId: number;
  productId: number | null;
  productName?: string | null;
  quantity: number;
  unitValue: string;
  totalValue: string;
  isSpecificUse?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(purchaseOrderItems).values({
    isSpecificUse: data.isSpecificUse ?? false,
    purchaseOrderId: data.purchaseOrderId,
    productId: data.productId,
    productName: data.productName || null,
    quantity: data.quantity,
    unitValue: data.unitValue,
    totalValue: data.totalValue,
  });
}

export async function getPurchaseOrderItems(purchaseOrderId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(purchaseOrderItems)
    .where(eq(purchaseOrderItems.purchaseOrderId, purchaseOrderId));
}

/** Itens da ordem para a tela de edição: traz a descrição do produto cadastrado quando o item não tem nome próprio. */
export async function getPurchaseOrderItemsForEdit(purchaseOrderId: number) {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      id: purchaseOrderItems.id,
      productId: purchaseOrderItems.productId,
      productName: purchaseOrderItems.productName,
      productDescription: products.description,
      quantity: purchaseOrderItems.quantity,
      unitValue: purchaseOrderItems.unitValue,
      totalValue: purchaseOrderItems.totalValue,
      isSpecificUse: purchaseOrderItems.isSpecificUse,
    })
    .from(purchaseOrderItems)
    .leftJoin(products, eq(purchaseOrderItems.productId, products.id))
    .where(eq(purchaseOrderItems.purchaseOrderId, purchaseOrderId))
    .orderBy(asc(purchaseOrderItems.id));

  return rows.map((row) => ({
    id: row.id,
    productId: row.productId,
    description: (row.productName ?? "").trim() || row.productDescription || "",
    quantity: row.quantity,
    unitValue: row.unitValue,
    totalValue: row.totalValue,
    isSpecificUse: row.isSpecificUse,
  }));
}

export type EditableOrderItem = {
  productId?: number | null;
  description: string;
  quantity: number;
  unitValue: number;
  discount: number;
  isSpecificUse: boolean;
};

/**
 * Salva a ordem e substitui os produtos dela, tudo numa transação.
 * Só vale para ordem "Solicitado": depois de entregue, os itens já deram entrada no estoque,
 * então é preciso voltar o status (o que desfaz a entrada) antes de mexer nos produtos.
 * O total é recalculado aqui: soma dos itens + ajuste (frete, impostos e descontos).
 */
export async function updatePurchaseOrderWithItems(
  id: number,
  header: {
    supplierId?: number;
    costCenterId?: number;
    paymentMethod?: "a_vista" | "parcelado";
    installments?: number;
    observations?: string;
  },
  items: EditableOrderItem[],
  adjustment: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const cleanItems = items.map((item, index) => {
    const description = normalizeName(item.description ?? "");
    if (!description) throw new TRPCError({ code: "BAD_REQUEST", message: `Produto ${index + 1}: informe a descrição` });
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Produto ${index + 1}: a quantidade precisa ser um número inteiro maior que zero` });
    }
    if (!(item.unitValue >= 0) || !(item.discount >= 0)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Produto ${index + 1}: valor e desconto não podem ser negativos` });
    }
    const total = itemTotal({ quantity: item.quantity, unitValue: item.unitValue, discount: item.discount });
    if (total < 0) throw new TRPCError({ code: "BAD_REQUEST", message: `Produto ${index + 1}: o desconto é maior que o valor do produto` });
    return { ...item, description, total };
  });

  const { subtotal } = calcOrderTotals({ items: cleanItems.map((i) => ({ quantity: i.quantity, unitValue: i.unitValue, discount: i.discount })) });
  const totalValue = Math.max(0, Math.round((subtotal + (Number.isFinite(adjustment) ? adjustment : 0)) * 100) / 100);

  return await db.transaction(async (tx) => {
    const [order] = await tx.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)).for("update");
    if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Ordem de compra não encontrada" });
    if (order.status !== "solicitado") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          order.status === "entregue"
            ? 'Esta ordem já foi entregue e deu entrada no estoque. Volte o status para "Solicitado" (isso desfaz a entrada) para editar os produtos.'
            : "Ordens canceladas não podem ter os produtos editados.",
      });
    }

    await tx.delete(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, id));
    for (const item of cleanItems) {
      await tx.insert(purchaseOrderItems).values({
        purchaseOrderId: id,
        productId: item.productId ?? null,
        productName: item.description,
        quantity: item.quantity,
        unitValue: item.unitValue.toFixed(2),
        totalValue: item.total.toFixed(2),
        isSpecificUse: item.isSpecificUse,
      });
    }

    await tx
      .update(purchaseOrders)
      .set({ ...header, totalValue: totalValue.toFixed(2) })
      .where(eq(purchaseOrders.id, id));

    return { success: true as const, totalValue };
  });
}

export async function deletePurchaseOrder(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [order] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)).limit(1);
  if (order?.status === "entregue") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: 'Esta ordem já foi entregue e deu entrada no estoque. Volte o status para "Solicitado" (isso desfaz a entrada) antes de excluir.',
    });
  }

  // Delete order items first
  await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, id));
  
  // Delete the order
  return await db.delete(purchaseOrders).where(eq(purchaseOrders.id, id));
}

export async function updatePurchaseOrder(
  id: number,
  data: {
    supplierId?: number;
    costCenterId?: number;
    paymentMethod?: "a_vista" | "parcelado";
    installments?: number;
    totalValue?: string;
    freightValue?: string | number;
    observations?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = { ...data };
  
  // Convert freightValue to string if provided
  if (data.freightValue !== undefined) {
    const freightNum = typeof data.freightValue === 'string' 
      ? parseFloat(data.freightValue) 
      : data.freightValue;
    updateData.freightValue = isNaN(freightNum) ? '0.00' : freightNum.toString();
  }

  return await db.update(purchaseOrders).set(updateData).where(eq(purchaseOrders.id, id));
}

// ============ FILE OPERATIONS ============

export async function createFile(data: {
  filename: string;
  fileKey: string;
  url: string;
  mimeType?: string;
  fileSize?: number;
  productId?: number;
  purchaseOrderId?: number;
  uploadedBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(files).values(data);
}

export async function getFilesByProduct(productId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(files).where(eq(files.productId, productId));
}

export async function getFilesByPurchaseOrder(purchaseOrderId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(files)
    .where(eq(files.purchaseOrderId, purchaseOrderId));
}

export async function deleteFile(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.delete(files).where(eq(files.id, id));
}


// ============ PURCHASE ORDER INSTALLMENTS OPERATIONS ============

export async function createPurchaseOrderInstallment(data: {
  purchaseOrderId: number;
  installmentNumber: number;
  dueDate: string;
  value: string | number;
  paymentMethod: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const valueNum = typeof data.value === 'string' 
    ? parseFloat(data.value) 
    : data.value;

  return await db.insert(purchaseOrderInstallments).values({
    purchaseOrderId: data.purchaseOrderId,
    installmentNumber: data.installmentNumber,
    dueDate: data.dueDate,
    value: valueNum.toString(),
    paymentMethod: data.paymentMethod,
  });
}

export async function getPurchaseOrderInstallments(purchaseOrderId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(purchaseOrderInstallments)
    .where(eq(purchaseOrderInstallments.purchaseOrderId, purchaseOrderId))
    .orderBy(asc(purchaseOrderInstallments.installmentNumber));
}

export async function deletePurchaseOrderInstallments(purchaseOrderId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .delete(purchaseOrderInstallments)
    .where(eq(purchaseOrderInstallments.purchaseOrderId, purchaseOrderId));
}


// ============ PURCHASE REQUEST OPERATIONS ============

export async function generatePurchaseRequestNumber(): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const lastRequest = await db
    .select()
    .from(purchaseRequests)
    .orderBy(desc(purchaseRequests.id))
    .limit(1);

  const lastNumber = lastRequest.length > 0 
    ? parseInt(lastRequest[0].number.split('-')[1] || '0') 
    : 0;

  const newNumber = String(lastNumber + 1).padStart(6, '0');
  return `SR-${newNumber}`;
}

export async function createPurchaseRequest(data: {
  requesterId: number;
  sector: string;
  costCenterId: number;
  priority: "baixa" | "media" | "alta" | "urgente";
  desiredDate?: string;
  observations?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const number = await generatePurchaseRequestNumber();

  const result = await db.insert(purchaseRequests).values({
    number,
    requesterId: data.requesterId,
    sector: data.sector,
    costCenterId: data.costCenterId,
    priority: data.priority,
    desiredDate: data.desiredDate,
    observations: data.observations,
    status: "mercado_livre",
  });

  // Get the created request with ID
  const created = await db.select().from(purchaseRequests).where(eq(purchaseRequests.number, number)).limit(1);
  
  if (created && created.length > 0) {
    return created[0];
  }

  throw new Error("Failed to create purchase request");
}

export async function getPurchaseRequests(filters?: {
  status?: string;
  sector?: string;
  requesterId?: number;
  priority?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  let conditions: any[] = [];

  if (filters?.status) {
    conditions.push(eq(purchaseRequests.status, filters.status as any));
  }

  if (filters?.sector) {
    conditions.push(eq(purchaseRequests.sector, filters.sector));
  }

  if (filters?.requesterId) {
    conditions.push(eq(purchaseRequests.requesterId, filters.requesterId));
  }

  if (filters?.priority) {
    conditions.push(eq(purchaseRequests.priority, filters.priority as any));
  }

  if (filters?.startDate) {
    conditions.push(gte(purchaseRequests.date, filters.startDate));
  }

  if (filters?.endDate) {
    conditions.push(lte(purchaseRequests.date, filters.endDate));
  }

  if (filters?.search) {
    conditions.push(like(purchaseRequests.number, `%${filters.search}%`));
  }

  try {
    let query: any = db
      .select({
        id: purchaseRequests.id,
        number: purchaseRequests.number,
        date: purchaseRequests.date,
        requesterName: users.name,
        sector: purchaseRequests.sector,
        costCenterName: costCenters.name,
        priority: purchaseRequests.priority,
        status: purchaseRequests.status,
        createdAt: purchaseRequests.createdAt,
      })
      .from(purchaseRequests)
      .leftJoin(users, eq(purchaseRequests.requesterId, users.id))
      .leftJoin(costCenters, eq(purchaseRequests.costCenterId, costCenters.id));

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.orderBy(desc(purchaseRequests.createdAt));
  } catch (error) {
    console.error("[Database] Failed to get purchase requests:", error);
    return [];
  }
}

export async function getPurchaseRequestById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(purchaseRequests)
    .where(eq(purchaseRequests.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getPurchaseRequestWithDetails(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const request = await getPurchaseRequestById(id);
  if (!request) return undefined;

  const items = await db
    .select()
    .from(purchaseRequestItems)
    .where(eq(purchaseRequestItems.requestId, id));

  const history = await db
    .select()
    .from(purchaseRequestHistory)
    .where(eq(purchaseRequestHistory.requestId, id))
    .orderBy(desc(purchaseRequestHistory.changedAt));

  const comments = await db
    .select()
    .from(purchaseRequestComments)
    .where(eq(purchaseRequestComments.requestId, id))
    .orderBy(desc(purchaseRequestComments.createdAt));

  const attachments = await db
    .select()
    .from(purchaseRequestAttachments)
    .where(eq(purchaseRequestAttachments.requestId, id));

  return {
    ...request,
    items,
    history,
    comments,
    attachments,
  };
}

export async function updatePurchaseRequestStatus(
  id: number,
  newStatus: string,
  changedBy: number,
  observation?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const request = await getPurchaseRequestById(id);
  if (!request) throw new Error("Purchase request not found");

  // Update status
  await db
    .update(purchaseRequests)
    .set({ status: newStatus as any })
    .where(eq(purchaseRequests.id, id));

  // Record history
  await db.insert(purchaseRequestHistory).values({
    requestId: id,
    oldStatus: request.status,
    newStatus,
    changedBy,
    observation: observation || null,
  });
}

export async function createPurchaseRequestItem(data: {
  requestId: number;
  productCode?: string;
  description: string;
  quantity: number;
  unit: string;
  desiredBrand?: string;
  suggestedSupplier?: string;
  estimatedValue: number;
  itemObservation?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(purchaseRequestItems).values({
    requestId: data.requestId,
    productCode: data.productCode || "SEM-CODIGO",
    description: data.description,
    quantity: data.quantity,
    unit: data.unit,
    desiredBrand: data.desiredBrand || null,
    suggestedSupplier: data.suggestedSupplier || null,
    estimatedValue: data.estimatedValue.toString(),
    itemObservation: data.itemObservation || null,
  });
}

export async function deletePurchaseRequestItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.delete(purchaseRequestItems).where(eq(purchaseRequestItems.id, id));
}

export async function addPurchaseRequestComment(data: {
  requestId: number;
  userId: number;
  message: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(purchaseRequestComments).values(data);
}

export async function getPurchaseRequestComments(requestId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      id: purchaseRequestComments.id,
      userName: users.name,
      userEmail: users.email,
      message: purchaseRequestComments.message,
      createdAt: purchaseRequestComments.createdAt,
    })
    .from(purchaseRequestComments)
    .leftJoin(users, eq(purchaseRequestComments.userId, users.id))
    .where(eq(purchaseRequestComments.requestId, requestId))
    .orderBy(desc(purchaseRequestComments.createdAt));
}

export async function getPurchaseRequestsStats(filters?: {
  startDate?: Date;
  endDate?: Date;
}) {
  const db = await getDb();
  if (!db) return { pending: 0, inQuotation: 0, urgent: 0, purchased: 0 };

  let conditions: any[] = [];

  if (filters?.startDate) {
    conditions.push(gte(purchaseRequests.date, filters.startDate));
  }

  if (filters?.endDate) {
    conditions.push(lte(purchaseRequests.date, filters.endDate));
  }

  try {
    const baseQuery = conditions.length > 0
      ? db.select().from(purchaseRequests).where(and(...conditions))
      : db.select().from(purchaseRequests);

    const requests = await baseQuery;

    return {
      pending: requests.filter(r => r.status === "mercado_livre").length,
      inNegotiation: requests.filter(r => r.status === "em_negociacao").length,
      urgent: requests.filter(r => r.priority === "urgente").length,
      finished: requests.filter(r => r.status === "finalizado").length,
    };
  } catch (error) {
    console.error("[Database] Failed to get purchase request stats:", error);
    return { pending: 0, inNegotiation: 0, urgent: 0, finished: 0 };
  }
}


export async function addPurchaseRequestAttachment(data: {
  requestId: number;
  fileUrl: string;
  fileName: string;
  uploadedBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(purchaseRequestAttachments).values(data);
}

export async function getPurchaseRequestAttachments(requestId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      id: purchaseRequestAttachments.id,
      fileName: purchaseRequestAttachments.fileName,
      fileUrl: purchaseRequestAttachments.fileUrl,
      uploadedBy: purchaseRequestAttachments.uploadedBy,
      uploadedAt: purchaseRequestAttachments.uploadedAt,
      userName: users.name,
    })
    .from(purchaseRequestAttachments)
    .leftJoin(users, eq(purchaseRequestAttachments.uploadedBy, users.id))
    .where(eq(purchaseRequestAttachments.requestId, requestId))
    .orderBy(desc(purchaseRequestAttachments.uploadedAt));
}

export async function deletePurchaseRequestAttachment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.delete(purchaseRequestAttachments).where(eq(purchaseRequestAttachments.id, id));
}


export async function getSpendingByCostCenter(filters?: {
  startDate?: Date;
  endDate?: Date;
}) {
  const db = await getDb();
  if (!db) return [];

  try {
    let baseQuery = db
      .select({
        costCenterId: purchaseOrders.costCenterId,
        costCenterName: costCenters.name,
        totalValue: purchaseOrders.totalValue,
        status: purchaseOrders.status,
        createdAt: purchaseOrders.createdAt,
      })
      .from(purchaseOrders)
      .leftJoin(costCenters, eq(purchaseOrders.costCenterId, costCenters.id));

    let conditions: any[] = [];

    if (filters?.startDate) {
      conditions.push(gte(purchaseOrders.createdAt, filters.startDate));
    }

    if (filters?.endDate) {
      conditions.push(lte(purchaseOrders.createdAt, filters.endDate));
    }

    const query = conditions.length > 0
      ? baseQuery.where(and(...conditions))
      : baseQuery;

    const orders = await query;

    // Aggregate by cost center
    const spending: Record<string, { name: string; total: number; count: number }> = {};

    orders.forEach((order: any) => {
      const key = order.costCenterId || "sem-centro";
      if (!spending[key]) {
        spending[key] = {
          name: order.costCenterName || "Sem Centro de Custo",
          total: 0,
          count: 0,
        };
      }
      spending[key].total += parseFloat(order.totalValue || "0");
      spending[key].count += 1;
    });

    return Object.entries(spending).map(([id, data]) => ({
      costCenterId: id,
      costCenterName: data.name,
      totalSpending: data.total,
      orderCount: data.count,
      averageOrderValue: data.count > 0 ? data.total / data.count : 0,
    }));
  } catch (error) {
    console.error("[Database] Failed to get spending by cost center:", error);
    return [];
  }
}

export async function deletePurchaseRequest(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const request = await getPurchaseRequestById(id);
  if (!request) throw new Error("Purchase request not found");

  // Delete all related records first (cascading delete)
  // Delete comments
  await db
    .delete(purchaseRequestComments)
    .where(eq(purchaseRequestComments.requestId, id));

  // Delete attachments
  await db
    .delete(purchaseRequestAttachments)
    .where(eq(purchaseRequestAttachments.requestId, id));

  // Delete history
  await db
    .delete(purchaseRequestHistory)
    .where(eq(purchaseRequestHistory.requestId, id));

  // Delete items
  await db
    .delete(purchaseRequestItems)
    .where(eq(purchaseRequestItems.requestId, id));

  // Delete the request itself
  await db
    .delete(purchaseRequests)
    .where(eq(purchaseRequests.id, id));

  return { success: true };
}


// ==========================================
// REQUISIÇÕES DE SAÍDA
// ==========================================

export async function generateExitRequestNumber(): Promise<string> {
  const db = await getDb();
  if (!db) return "RS-000001";

  const [last] = await db
    .select({ number: exitRequests.number })
    .from(exitRequests)
    .orderBy(desc(exitRequests.id))
    .limit(1);

  if (!last) return "RS-000001";

  const lastNum = parseInt(last.number.replace("RS-", ""), 10);
  const nextNum = lastNum + 1;
  return `RS-${nextNum.toString().padStart(6, "0")}`;
}

export async function createExitRequest(data: {
  supervisorId: number;
  sector: string;
  collaboratorName: string;
  expectedDate?: string;
  observations?: string;
  items: Array<{
    productId: number;
    quantityRequested: number;
    itemObservation?: string;
  }>;
}) {
  const db = await getDb();
  if (!db) return null;

  const number = await generateExitRequestNumber();

  await db.insert(exitRequests).values({
    number,
    supervisorId: data.supervisorId,
    sector: data.sector,
    collaboratorName: data.collaboratorName,
    expectedDate: data.expectedDate || null,
    observations: data.observations || null,
    status: "aguardando_retirada",
  });

  // Get the created request
  const [created] = await db
    .select()
    .from(exitRequests)
    .where(eq(exitRequests.number, number))
    .limit(1);

  if (!created) return null;

  // Insert items
  for (const item of data.items) {
    await db.insert(exitRequestItems).values({
      requestId: created.id,
      productId: item.productId,
      quantityRequested: item.quantityRequested,
      itemObservation: item.itemObservation || null,
      status: "pendente",
    });
  }

  // Add history
  await db.insert(exitRequestHistory).values({
    requestId: created.id,
    action: "Requisição criada",
    performedBy: data.supervisorId,
    observation: `Requisição ${number} criada com ${data.items.length} item(ns)`,
  });

  return created;
}

export async function getExitRequests(filters?: {
  status?: string;
  sector?: string;
  search?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions: any[] = [];

  if (filters?.status) {
    conditions.push(eq(exitRequests.status, filters.status as any));
  }
  if (filters?.sector) {
    conditions.push(eq(exitRequests.sector, filters.sector));
  }
  if (filters?.search) {
    conditions.push(
      or(
        like(exitRequests.number, `%${filters.search}%`),
        like(exitRequests.collaboratorName, `%${filters.search}%`),
        like(exitRequests.sector, `%${filters.search}%`)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const results = await db
    .select()
    .from(exitRequests)
    .where(whereClause)
    .orderBy(desc(exitRequests.createdAt));

  // Get supervisor names and item counts
  const enriched = await Promise.all(
    results.map(async (req) => {
      const [supervisor] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, req.supervisorId))
        .limit(1);

      const items = await db
        .select()
        .from(exitRequestItems)
        .where(eq(exitRequestItems.requestId, req.id));

      return {
        ...req,
        supervisorName: supervisor?.name || "Desconhecido",
        itemCount: items.length,
        itemsDelivered: items.filter((i) => i.status === "retirado").length,
      };
    })
  );

  return enriched;
}

export async function getExitRequestById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const [request] = await db
    .select()
    .from(exitRequests)
    .where(eq(exitRequests.id, id))
    .limit(1);

  if (!request) return null;

  // Get supervisor name
  const [supervisor] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, request.supervisorId))
    .limit(1);

  // Get items with product details
  const items = await db
    .select({
      id: exitRequestItems.id,
      requestId: exitRequestItems.requestId,
      productId: exitRequestItems.productId,
      quantityRequested: exitRequestItems.quantityRequested,
      quantityDelivered: exitRequestItems.quantityDelivered,
      itemObservation: exitRequestItems.itemObservation,
      status: exitRequestItems.status,
      deliveredAt: exitRequestItems.deliveredAt,
      deliveredBy: exitRequestItems.deliveredBy,
      productDescription: products.description,
      productCurrentQuantity: products.currentQuantity,
    })
    .from(exitRequestItems)
    .innerJoin(products, eq(exitRequestItems.productId, products.id))
    .where(eq(exitRequestItems.requestId, id));

  // Get history
  const history = await db
    .select()
    .from(exitRequestHistory)
    .where(eq(exitRequestHistory.requestId, id))
    .orderBy(desc(exitRequestHistory.performedAt));

  // Get history performer names
  const historyWithNames = await Promise.all(
    history.map(async (h) => {
      const [user] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, h.performedBy))
        .limit(1);
      return { ...h, performedByName: user?.name || "Desconhecido" };
    })
  );

  return {
    ...request,
    supervisorName: supervisor?.name || "Desconhecido",
    items,
    history: historyWithNames,
  };
}

export async function markExitRequestItemAsDelivered(
  itemId: number,
  deliveredBy: number,
  quantityDelivered?: number
) {
  const db = await getDb();
  if (!db) return null;

  return await db.transaction(async (tx) => {
    const [item] = await tx.select().from(exitRequestItems).where(eq(exitRequestItems.id, itemId)).for("update");
    if (!item) return null;

    if (item.status !== "pendente") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Este item já foi retirado ou cancelado." });
    }

    const qty = quantityDelivered ?? item.quantityRequested;
    if (!Number.isInteger(qty) || qty < 1 || qty > item.quantityRequested) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Quantidade inválida: informe de 1 a ${item.quantityRequested}.`,
      });
    }

    // A requisição de saída não guarda centro de custo; usamos o "Estoque" (ou o 1º ativo).
    const activeCenters = await tx.select().from(costCenters).where(eq(costCenters.isActive, true)).orderBy(asc(costCenters.id));
    const costCenter = activeCenters.find((c) => c.name.trim().toLowerCase() === "estoque") ?? activeCenters[0];
    if (!costCenter) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cadastre ao menos um centro de custo (Configurações) antes de registrar retiradas.",
      });
    }

    const [product] = await tx.select().from(products).where(eq(products.id, item.productId)).for("update");
    if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Produto não encontrado" });
    if (product.currentQuantity < qty) throw insufficientStock(product.currentQuantity, qty);

    await tx
      .update(exitRequestItems)
      .set({ status: "retirado", quantityDelivered: qty, deliveredAt: new Date(), deliveredBy })
      .where(eq(exitRequestItems.id, itemId));

    await tx.insert(stockMovements).values({
      productId: item.productId,
      type: "saida",
      quantity: qty,
      costCenterId: costCenter.id,
      userId: deliveredBy,
      notes: "Requisição de Saída - Item retirado",
    });
    await tx
      .update(products)
      .set({ currentQuantity: product.currentQuantity - qty })
      .where(eq(products.id, item.productId));

    const allItems = await tx.select().from(exitRequestItems).where(eq(exitRequestItems.requestId, item.requestId));
    const allDelivered = allItems.every((i) => i.id === itemId || i.status === "retirado" || i.status === "cancelado");
    const newStatus = allDelivered ? "retirado" : "parcialmente_retirado";

    await tx.update(exitRequests).set({ status: newStatus }).where(eq(exitRequests.id, item.requestId));
    await tx.insert(exitRequestHistory).values({
      requestId: item.requestId,
      action: "Item retirado",
      performedBy: deliveredBy,
      observation: `Item entregue - Quantidade: ${qty}`,
    });

    return { success: true, newStatus };
  });
}

export async function deleteExitRequest(id: number) {
  const db = await getDb();
  if (!db) return null;

  // Delete related records first
  await db.delete(exitRequestItems).where(eq(exitRequestItems.requestId, id));
  await db.delete(exitRequestHistory).where(eq(exitRequestHistory.requestId, id));
  await db.delete(exitRequests).where(eq(exitRequests.id, id));

  return { success: true };
}

export async function cancelExitRequest(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;

  await db
    .update(exitRequests)
    .set({ status: "cancelado" as any })
    .where(eq(exitRequests.id, id));

  await db.insert(exitRequestHistory).values({
    requestId: id,
    action: "Requisição cancelada",
    performedBy: userId,
    observation: "Requisição cancelada pelo usuário",
  });

  return { success: true };
}

// ============ REPORT FUNCTIONS (FASE 50) ============

/**
 * Consumo por Produto - Agrega movimentações de saída por produto
 */
export async function getConsumptionByProduct(filters?: {
  startDate?: Date;
  endDate?: Date;
  productId?: number;
  costCenterId?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  try {
    const conditions: any[] = [eq(stockMovements.type, "saida" as any)];

    if (filters?.startDate) {
      conditions.push(gte(stockMovements.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(stockMovements.createdAt, filters.endDate));
    }
    if (filters?.productId) {
      conditions.push(eq(stockMovements.productId, filters.productId));
    }
    if (filters?.costCenterId) {
      conditions.push(eq(stockMovements.costCenterId, filters.costCenterId));
    }

    const results = await db
      .select({
        productId: stockMovements.productId,
        productDescription: products.description,
        totalQuantity: sum(stockMovements.quantity),
        movementCount: count(stockMovements.id),
        totalValue: sql<string>`COALESCE(SUM(${stockMovements.quantity} * CAST(${stockMovements.pricePerUnit} AS DECIMAL(12,2))), 0)`,
      })
      .from(stockMovements)
      .innerJoin(products, eq(stockMovements.productId, products.id))
      .where(and(...conditions))
      .groupBy(stockMovements.productId, products.description)
      .orderBy(desc(sum(stockMovements.quantity)));

    return results.map((r) => ({
      productId: r.productId,
      productDescription: r.productDescription,
      totalQuantity: Number(r.totalQuantity) || 0,
      movementCount: Number(r.movementCount) || 0,
      totalValue: Number(r.totalValue) || 0,
    }));
  } catch (error) {
    console.error("[Database] Failed to get consumption by product:", error);
    return [];
  }
}

/**
 * Requisições de Saída por Setor - Agrega requisições por setor
 */
export async function getExitRequestsBySector(filters?: {
  startDate?: Date;
  endDate?: Date;
  status?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  try {
    const conditions: any[] = [];

    if (filters?.startDate) {
      conditions.push(gte(exitRequests.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(exitRequests.createdAt, filters.endDate));
    }
    if (filters?.status) {
      conditions.push(eq(exitRequests.status, filters.status as any));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await db
      .select({
        sector: exitRequests.sector,
        totalRequests: count(exitRequests.id),
      })
      .from(exitRequests)
      .where(whereClause)
      .groupBy(exitRequests.sector)
      .orderBy(desc(count(exitRequests.id)));

    // Enrich with item counts
    const enriched = await Promise.all(
      results.map(async (r) => {
        // Get all exit requests for this sector
        const sectorConditions: any[] = [eq(exitRequests.sector, r.sector)];
        if (filters?.startDate) sectorConditions.push(gte(exitRequests.createdAt, filters.startDate));
        if (filters?.endDate) sectorConditions.push(lte(exitRequests.createdAt, filters.endDate));
        if (filters?.status) sectorConditions.push(eq(exitRequests.status, filters.status as any));

        const sectorRequests = await db
          .select({ id: exitRequests.id })
          .from(exitRequests)
          .where(and(...sectorConditions));

        let totalItems = 0;
        let totalDelivered = 0;

        for (const req of sectorRequests) {
          const items = await db
            .select({
              quantityRequested: exitRequestItems.quantityRequested,
              quantityDelivered: exitRequestItems.quantityDelivered,
            })
            .from(exitRequestItems)
            .where(eq(exitRequestItems.requestId, req.id));

          items.forEach((item) => {
            totalItems += item.quantityRequested;
            totalDelivered += item.quantityDelivered;
          });
        }

        return {
          sector: r.sector,
          totalRequests: Number(r.totalRequests) || 0,
          totalItemsRequested: totalItems,
          totalItemsDelivered: totalDelivered,
        };
      })
    );

    return enriched;
  } catch (error) {
    console.error("[Database] Failed to get exit requests by sector:", error);
    return [];
  }
}

/**
 * Requisições de Saída por Colaborador
 */
export async function getExitRequestsByCollaborator(filters?: {
  startDate?: Date;
  endDate?: Date;
  sector?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  try {
    const conditions: any[] = [];

    if (filters?.startDate) {
      conditions.push(gte(exitRequests.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(exitRequests.createdAt, filters.endDate));
    }
    if (filters?.sector) {
      conditions.push(eq(exitRequests.sector, filters.sector));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await db
      .select({
        collaboratorName: exitRequests.collaboratorName,
        sector: exitRequests.sector,
        totalRequests: count(exitRequests.id),
      })
      .from(exitRequests)
      .where(whereClause)
      .groupBy(exitRequests.collaboratorName, exitRequests.sector)
      .orderBy(desc(count(exitRequests.id)));

    // Enrich with item counts
    const enriched = await Promise.all(
      results.map(async (r) => {
        const collabConditions: any[] = [eq(exitRequests.collaboratorName, r.collaboratorName)];
        if (filters?.startDate) collabConditions.push(gte(exitRequests.createdAt, filters.startDate));
        if (filters?.endDate) collabConditions.push(lte(exitRequests.createdAt, filters.endDate));
        if (filters?.sector) collabConditions.push(eq(exitRequests.sector, filters.sector));

        const collabRequests = await db
          .select({ id: exitRequests.id })
          .from(exitRequests)
          .where(and(...collabConditions));

        let totalItems = 0;
        for (const req of collabRequests) {
          const items = await db
            .select({ quantityRequested: exitRequestItems.quantityRequested })
            .from(exitRequestItems)
            .where(eq(exitRequestItems.requestId, req.id));
          items.forEach((item) => { totalItems += item.quantityRequested; });
        }

        return {
          collaboratorName: r.collaboratorName,
          sector: r.sector,
          totalRequests: Number(r.totalRequests) || 0,
          totalItemsRequested: totalItems,
        };
      })
    );

    return enriched;
  } catch (error) {
    console.error("[Database] Failed to get exit requests by collaborator:", error);
    return [];
  }
}

/**
 * Histórico de Preços - Movimentações de entrada com preço por unidade
 */
export async function getPriceHistory(filters?: {
  productId?: number;
  startDate?: Date;
  endDate?: Date;
}) {
  const db = await getDb();
  if (!db) return [];

  try {
    const conditions: any[] = [
      eq(stockMovements.type, "entrada" as any),
      gt(sql`CAST(${stockMovements.pricePerUnit} AS DECIMAL(12,2))`, sql`0`),
    ];

    if (filters?.productId) {
      conditions.push(eq(stockMovements.productId, filters.productId));
    }
    if (filters?.startDate) {
      conditions.push(gte(stockMovements.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(stockMovements.createdAt, filters.endDate));
    }

    const results = await db
      .select({
        id: stockMovements.id,
        productId: stockMovements.productId,
        productDescription: products.description,
        quantity: stockMovements.quantity,
        pricePerUnit: stockMovements.pricePerUnit,
        lote: stockMovements.lote,
        notes: stockMovements.notes,
        createdAt: stockMovements.createdAt,
      })
      .from(stockMovements)
      .innerJoin(products, eq(stockMovements.productId, products.id))
      .where(and(...conditions))
      .orderBy(desc(stockMovements.createdAt));

    return results.map((r) => ({
      ...r,
      pricePerUnit: Number(r.pricePerUnit) || 0,
      totalValue: (Number(r.pricePerUnit) || 0) * r.quantity,
    }));
  } catch (error) {
    console.error("[Database] Failed to get price history:", error);
    return [];
  }
}

/**
 * Produtos Sem Movimentação - Produtos sem nenhuma movimentação no período
 */
export async function getProductsWithoutMovement(filters?: {
  startDate?: Date;
  endDate?: Date;
  classification?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  try {
    // Get all products
    const allProducts = await db.select().from(products);

    // Get products that DO have movements in the period
    const movementConditions: any[] = [];
    if (filters?.startDate) {
      movementConditions.push(gte(stockMovements.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      movementConditions.push(lte(stockMovements.createdAt, filters.endDate));
    }

    const movementWhereClause = movementConditions.length > 0 ? and(...movementConditions) : undefined;

    const productsWithMovement = await db
      .select({ productId: stockMovements.productId })
      .from(stockMovements)
      .where(movementWhereClause)
      .groupBy(stockMovements.productId);

    const productIdsWithMovement = new Set(productsWithMovement.map((p) => p.productId));

    // Filter products without movement
    let result = allProducts.filter((p) => !productIdsWithMovement.has(p.id));

    if (filters?.classification) {
      result = result.filter((p) => p.classification === filters.classification);
    }

    return result.map((p) => ({
      id: p.id,
      description: p.description,
      classification: p.classification,
      currentQuantity: p.currentQuantity,
      localAlocacao: p.localAlocacao,
      costCenterId: p.costCenterId,
    }));
  } catch (error) {
    console.error("[Database] Failed to get products without movement:", error);
    return [];
  }
}

/**
 * Solicitações de Compra por Status - Contagem agrupada por status
 */
export async function getPurchaseRequestsByStatus(filters?: {
  startDate?: Date;
  endDate?: Date;
  sector?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  try {
    const conditions: any[] = [];

    if (filters?.startDate) {
      conditions.push(gte(purchaseRequests.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(purchaseRequests.createdAt, filters.endDate));
    }
    if (filters?.sector) {
      conditions.push(eq(purchaseRequests.sector, filters.sector));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await db
      .select({
        status: purchaseRequests.status,
        total: count(purchaseRequests.id),
      })
      .from(purchaseRequests)
      .where(whereClause)
      .groupBy(purchaseRequests.status);

    return results.map((r) => ({
      status: r.status,
      total: Number(r.total) || 0,
    }));
  } catch (error) {
    console.error("[Database] Failed to get purchase requests by status:", error);
    return [];
  }
}

/**
 * Movimentações com detalhes do produto (enhanced para relatórios)
 */
export async function getStockMovementsWithProducts(filters?: {
  productId?: number;
  costCenterId?: number;
  type?: "entrada" | "saida";
  startDate?: Date;
  endDate?: Date;
}) {
  const db = await getDb();
  if (!db) return [];

  try {
    const conditions: any[] = [];

    if (filters?.productId) {
      conditions.push(eq(stockMovements.productId, filters.productId));
    }
    if (filters?.costCenterId) {
      conditions.push(eq(stockMovements.costCenterId, filters.costCenterId));
    }
    if (filters?.type) {
      conditions.push(eq(stockMovements.type, filters.type as any));
    }
    if (filters?.startDate) {
      conditions.push(gte(stockMovements.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(stockMovements.createdAt, filters.endDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await db
      .select({
        id: stockMovements.id,
        productId: stockMovements.productId,
        productDescription: products.description,
        type: stockMovements.type,
        quantity: stockMovements.quantity,
        costCenterId: stockMovements.costCenterId,
        costCenterName: costCenters.name,
        lote: stockMovements.lote,
        pricePerUnit: stockMovements.pricePerUnit,
        notes: stockMovements.notes,
        createdAt: stockMovements.createdAt,
      })
      .from(stockMovements)
      .innerJoin(products, eq(stockMovements.productId, products.id))
      .leftJoin(costCenters, eq(stockMovements.costCenterId, costCenters.id))
      .where(whereClause)
      .orderBy(desc(stockMovements.createdAt));

    return results.map((r) => ({
      ...r,
      pricePerUnit: Number(r.pricePerUnit) || 0,
      costCenterName: r.costCenterName || "Sem Centro de Custo",
    }));
  } catch (error) {
    console.error("[Database] Failed to get stock movements with products:", error);
    return [];
  }
}
