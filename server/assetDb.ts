import { eq, and, desc, like, or, isNull, sql, count, sum, asc, lte, gte } from "drizzle-orm";
import {
  assets, assetCategories, assetLocations, assetMovements,
  assetMaintenances, assetInventories, assetInventoryItems,
  assetDocuments, assetResponsibilities, assetHistory, assetDisposals
} from "../drizzle/schema";
import { getDb } from "./db";

// ============ CATEGORIAS ============

export async function getAssetCategories() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(assetCategories).where(eq(assetCategories.isActive, true)).orderBy(asc(assetCategories.name));
}

export async function createAssetCategory(data: { name: string; description?: string; parentId?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(assetCategories).values({
    name: data.name,
    description: data.description || null,
    parentId: data.parentId || null,
  });
}

export async function updateAssetCategory(id: number, data: { name?: string; description?: string; parentId?: number; isActive?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(assetCategories).set(data).where(eq(assetCategories.id, id));
}

export async function deleteAssetCategory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(assetCategories).set({ isActive: false }).where(eq(assetCategories.id, id));
}

// ============ LOCALIZAÇÕES ============

export async function getAssetLocations() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(assetLocations).where(eq(assetLocations.isActive, true)).orderBy(asc(assetLocations.name));
}

export async function createAssetLocation(data: { name: string; description?: string; parentId?: number; type?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(assetLocations).values({
    name: data.name,
    description: data.description || null,
    parentId: data.parentId || null,
    type: data.type || null,
  });
}

export async function updateAssetLocation(id: number, data: { name?: string; description?: string; parentId?: number; type?: string; isActive?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(assetLocations).set(data).where(eq(assetLocations.id, id));
}

export async function deleteAssetLocation(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(assetLocations).set({ isActive: false }).where(eq(assetLocations.id, id));
}

// ============ PATRIMÔNIOS ============

export async function generateAssetCode(): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const lastAsset = await db.select().from(assets).orderBy(desc(assets.id)).limit(1);
  const lastNumber = lastAsset.length > 0
    ? parseInt(lastAsset[0].code.split('-')[1] || '0')
    : 0;
  const newNumber = String(lastNumber + 1).padStart(6, '0');
  return `PAT-${newNumber}`;
}

export async function getAssets(filters?: {
  search?: string;
  categoryId?: number;
  locationId?: number;
  status?: string;
  conservationState?: string;
  responsibleId?: number;
  supplierId?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions: any[] = [];

  if (filters?.search) {
    const s = `%${filters.search}%`;
    conditions.push(
      or(
        like(assets.code, s),
        like(assets.description, s),
        like(assets.brand, s),
        like(assets.model, s),
        like(assets.serialNumber, s),
      )
    );
  }
  if (filters?.categoryId) conditions.push(eq(assets.categoryId, filters.categoryId));
  if (filters?.locationId) conditions.push(eq(assets.locationId, filters.locationId));
  if (filters?.status) conditions.push(eq(assets.status, filters.status as any));
  if (filters?.conservationState) conditions.push(eq(assets.conservationState, filters.conservationState as any));
  if (filters?.responsibleId) conditions.push(eq(assets.responsibleId, filters.responsibleId));
  if (filters?.supplierId) conditions.push(eq(assets.supplierId, filters.supplierId));

  let query = db.select().from(assets);
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  return await (query as any).orderBy(desc(assets.createdAt));
}

export async function getAssetById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(assets).where(eq(assets.id, id)).limit(1);
  return result[0] || undefined;
}

export async function getAssetByCode(code: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(assets).where(eq(assets.code, code)).limit(1);
  return result[0] || undefined;
}

export async function createAsset(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const code = await generateAssetCode();
  const result = await db.insert(assets).values({ ...data, code });
  const created = await db.select().from(assets).where(eq(assets.code, code)).limit(1);
  return created[0];
}

export async function updateAsset(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(assets).set(data).where(eq(assets.id, id));
  return await getAssetById(id);
}

// ============ MOVIMENTAÇÕES ============

export async function getAssetMovements(assetId?: number) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(assetMovements);
  if (assetId) {
    query = query.where(eq(assetMovements.assetId, assetId)) as any;
  }
  return await (query as any).orderBy(desc(assetMovements.createdAt));
}

export async function createAssetMovement(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(assetMovements).values(data);
}

// ============ MANUTENÇÕES ============

export async function getAssetMaintenances(assetId?: number) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(assetMaintenances);
  if (assetId) {
    query = query.where(eq(assetMaintenances.assetId, assetId)) as any;
  }
  return await (query as any).orderBy(desc(assetMaintenances.createdAt));
}

export async function createAssetMaintenance(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(assetMaintenances).values(data);
}

export async function updateAssetMaintenance(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(assetMaintenances).set(data).where(eq(assetMaintenances.id, id));
}

// ============ DOCUMENTOS ============

export async function getAssetDocuments(assetId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(assetDocuments).where(eq(assetDocuments.assetId, assetId)).orderBy(desc(assetDocuments.createdAt));
}

export async function createAssetDocument(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(assetDocuments).values(data);
}

export async function deleteAssetDocument(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(assetDocuments).where(eq(assetDocuments.id, id));
}

// ============ HISTÓRICO ============

export async function getAssetHistory(assetId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(assetHistory).where(eq(assetHistory.assetId, assetId)).orderBy(desc(assetHistory.eventDate));
}

export async function createAssetHistoryRecord(data: { assetId: number; userId: number; eventType: string; description?: string; previousData?: string; newData?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(assetHistory).values(data);
}

// ============ RESPONSABILIDADES ============

export async function getAssetResponsibilities(assetId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(assetResponsibilities).where(eq(assetResponsibilities.assetId, assetId)).orderBy(desc(assetResponsibilities.createdAt));
}

export async function createAssetResponsibility(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(assetResponsibilities).values(data);
}

// ============ BAIXAS ============

export async function getAssetDisposals(assetId?: number) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(assetDisposals);
  if (assetId) {
    query = query.where(eq(assetDisposals.assetId, assetId)) as any;
  }
  return await (query as any).orderBy(desc(assetDisposals.createdAt));
}

export async function createAssetDisposal(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(assetDisposals).values(data);
}

// ============ INVENTÁRIOS ============

export async function getAssetInventories() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(assetInventories).orderBy(desc(assetInventories.createdAt));
}

export async function getAssetInventoryById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(assetInventories).where(eq(assetInventories.id, id)).limit(1);
  return result[0] || undefined;
}

export async function createAssetInventory(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(assetInventories).values(data);
}

export async function updateAssetInventory(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(assetInventories).set(data).where(eq(assetInventories.id, id));
}

export async function getAssetInventoryItems(inventoryId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(assetInventoryItems).where(eq(assetInventoryItems.inventoryId, inventoryId));
}

export async function createAssetInventoryItem(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(assetInventoryItems).values(data);
}

export async function updateAssetInventoryItem(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(assetInventoryItems).set(data).where(eq(assetInventoryItems.id, id));
}

// ============ DASHBOARD ============

export async function getAssetDashboardStats() {
  const db = await getDb();
  if (!db) return { total: 0, active: 0, inMaintenance: 0, inStock: 0, inUse: 0, disposed: 0, noLocation: 0, noResponsible: 0, totalValue: 0 };

  const allAssets = await db.select().from(assets);

  const total = allAssets.length;
  const active = allAssets.filter(a => a.status !== "baixado").length;
  const inMaintenance = allAssets.filter(a => a.status === "em_manutencao").length;
  const inStock = allAssets.filter(a => a.status === "em_estoque").length;
  const inUse = allAssets.filter(a => a.status === "em_uso").length;
  const disposed = allAssets.filter(a => a.status === "baixado").length;
  const noLocation = allAssets.filter(a => !a.locationId && a.status !== "baixado").length;
  const noResponsible = allAssets.filter(a => !a.responsibleId && a.status !== "baixado").length;
  const totalValue = allAssets
    .filter(a => a.status !== "baixado")
    .reduce((sum, a) => sum + parseFloat(a.acquisitionValue || "0"), 0);

  return { total, active, inMaintenance, inStock, inUse, disposed, noLocation, noResponsible, totalValue };
}
