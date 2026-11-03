import { and, desc, eq, gte, like, lte, or } from "drizzle-orm";
import {
  assetCategories,
  assetHistory,
  assetMovements,
  assets,
  assetToolLoans,
} from "../drizzle/schema";
import { getDb } from "./db";

export type ToolLoanFilters = {
  search?: string;
  status?: "pendente" | "devolvido";
  collaborator?: string;
  startDate?: Date;
  endDate?: Date;
  assetId?: number;
};

type ToolCategoryRow = {
  id: number;
  name: string;
  parentId: number | null;
};

function normalizeCategoryName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function resolveToolCategoryIds(categories: ToolCategoryRow[]) {
  const rootIds = categories
    .filter(category => normalizeCategoryName(category.name) === "ferramentas")
    .map(category => category.id);

  const toolIds = new Set(rootIds);
  let changed = true;

  while (changed) {
    changed = false;
    for (const category of categories) {
      if (category.parentId && toolIds.has(category.parentId) && !toolIds.has(category.id)) {
        toolIds.add(category.id);
        changed = true;
      }
    }
  }

  return toolIds;
}

export function isAssetEligibleForToolLoan(asset: {
  categoryId: number | null;
  subcategoryId: number | null;
  status: string;
}, toolCategoryIds: Set<number>, hasPendingLoan: boolean) {
  const isTool =
    (asset.categoryId !== null && toolCategoryIds.has(asset.categoryId)) ||
    (asset.subcategoryId !== null && toolCategoryIds.has(asset.subcategoryId));

  const availableStatuses = new Set(["ativo", "em_estoque"]);
  return isTool && !hasPendingLoan && availableStatuses.has(asset.status);
}

async function getToolCategoryIds(executor: any) {
  const categories = await executor
    .select({ id: assetCategories.id, name: assetCategories.name, parentId: assetCategories.parentId })
    .from(assetCategories)
    .where(eq(assetCategories.isActive, true));

  return resolveToolCategoryIds(categories);
}

export async function getAvailableTools(search?: string) {
  const db = await getDb();
  if (!db) return [];

  const [allAssets, pendingLoans, toolCategoryIds] = await Promise.all([
    db.select().from(assets).orderBy(assets.code),
    db
      .select({ assetId: assetToolLoans.assetId })
      .from(assetToolLoans)
      .where(eq(assetToolLoans.status, "pendente")),
    getToolCategoryIds(db),
  ]);

  const pendingAssetIds = new Set(pendingLoans.map(loan => loan.assetId));
  const normalizedSearch = search?.trim().toLocaleLowerCase("pt-BR");

  return allAssets.filter(asset => {
    if (!isAssetEligibleForToolLoan(asset, toolCategoryIds, pendingAssetIds.has(asset.id))) {
      return false;
    }

    if (!normalizedSearch) return true;
    return [asset.code, asset.description, asset.brand, asset.model, asset.serialNumber]
      .filter(Boolean)
      .some(value => String(value).toLocaleLowerCase("pt-BR").includes(normalizedSearch));
  });
}

export async function getToolLoans(filters: ToolLoanFilters = {}) {
  const db = await getDb();
  if (!db) return [];

  const conditions: any[] = [];
  if (filters.status) conditions.push(eq(assetToolLoans.status, filters.status));
  if (filters.assetId) conditions.push(eq(assetToolLoans.assetId, filters.assetId));
  if (filters.collaborator) {
    conditions.push(like(assetToolLoans.collaboratorName, `%${filters.collaborator}%`));
  }
  if (filters.startDate) conditions.push(gte(assetToolLoans.withdrawnAt, filters.startDate));
  if (filters.endDate) conditions.push(lte(assetToolLoans.withdrawnAt, filters.endDate));
  if (filters.search) {
    const value = `%${filters.search}%`;
    conditions.push(or(
      like(assets.code, value),
      like(assets.description, value),
      like(assetToolLoans.collaboratorName, value),
    ));
  }

  let query = db
    .select({
      id: assetToolLoans.id,
      assetId: assetToolLoans.assetId,
      assetCode: assets.code,
      assetDescription: assets.description,
      assetBrand: assets.brand,
      assetModel: assets.model,
      collaboratorName: assetToolLoans.collaboratorName,
      collaboratorSector: assetToolLoans.collaboratorSector,
      status: assetToolLoans.status,
      withdrawnAt: assetToolLoans.withdrawnAt,
      expectedReturnDate: assetToolLoans.expectedReturnDate,
      returnedAt: assetToolLoans.returnedAt,
      withdrawalNotes: assetToolLoans.withdrawalNotes,
      returnNotes: assetToolLoans.returnNotes,
      conditionAtWithdrawal: assetToolLoans.conditionAtWithdrawal,
      conditionAtReturn: assetToolLoans.conditionAtReturn,
      withdrawnBy: assetToolLoans.withdrawnBy,
      returnedBy: assetToolLoans.returnedBy,
    })
    .from(assetToolLoans)
    .innerJoin(assets, eq(assetToolLoans.assetId, assets.id));

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  const rows = await query.orderBy(desc(assetToolLoans.withdrawnAt));
  const today = new Date().toISOString().slice(0, 10);

  return rows.map(row => ({
    ...row,
    isOverdue: row.status === "pendente" && row.expectedReturnDate < today,
  }));
}

export async function getToolLoanSummary() {
  const db = await getDb();
  if (!db) return { totalTools: 0, available: 0, pending: 0, overdue: 0, returnedToday: 0 };

  const [availableTools, pendingLoans, allAssets, toolCategoryIds] = await Promise.all([
    getAvailableTools(),
    db.select().from(assetToolLoans).where(eq(assetToolLoans.status, "pendente")),
    db.select().from(assets),
    getToolCategoryIds(db),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const startOfDay = new Date(`${today}T00:00:00`);
  const endOfDay = new Date(`${today}T23:59:59`);
  const returnedTodayRows = await db
    .select({ id: assetToolLoans.id })
    .from(assetToolLoans)
    .where(and(
      eq(assetToolLoans.status, "devolvido"),
      gte(assetToolLoans.returnedAt, startOfDay),
      lte(assetToolLoans.returnedAt, endOfDay),
    ));

  const totalTools = allAssets.filter(asset =>
    (asset.categoryId !== null && toolCategoryIds.has(asset.categoryId)) ||
    (asset.subcategoryId !== null && toolCategoryIds.has(asset.subcategoryId))
  ).length;

  return {
    totalTools,
    available: availableTools.length,
    pending: pendingLoans.length,
    overdue: pendingLoans.filter(loan => loan.expectedReturnDate < today).length,
    returnedToday: returnedTodayRows.length,
  };
}

export async function checkoutTool(data: {
  assetId: number;
  collaboratorName: string;
  collaboratorSector?: string;
  expectedReturnDate: string;
  withdrawalNotes?: string;
  conditionAtWithdrawal?: string;
  userId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");

  return db.transaction(async tx => {
    const assetRows = await tx.select().from(assets).where(eq(assets.id, data.assetId)).limit(1);
    const asset = assetRows[0];
    if (!asset) throw new Error("Patrimônio não encontrado");

    const pendingRows = await tx
      .select({ id: assetToolLoans.id })
      .from(assetToolLoans)
      .where(and(eq(assetToolLoans.assetId, data.assetId), eq(assetToolLoans.status, "pendente")))
      .limit(1);

    const toolCategoryIds = await getToolCategoryIds(tx);
    if (!isAssetEligibleForToolLoan(asset, toolCategoryIds, pendingRows.length > 0)) {
      if (pendingRows.length > 0) {
        throw new Error("Esta ferramenta já possui uma retirada pendente de devolução");
      }
      throw new Error("Este patrimônio não está disponível para retirada como ferramenta");
    }

    await tx.insert(assetToolLoans).values({
      assetId: data.assetId,
      collaboratorName: data.collaboratorName.trim(),
      collaboratorSector: data.collaboratorSector?.trim() || null,
      expectedReturnDate: data.expectedReturnDate,
      withdrawalNotes: data.withdrawalNotes?.trim() || null,
      conditionAtWithdrawal: data.conditionAtWithdrawal || asset.conservationState,
      withdrawnBy: data.userId,
    });

    await tx.update(assets).set({ status: "em_uso", updatedBy: data.userId }).where(eq(assets.id, data.assetId));

    const movementDate = new Date().toISOString().slice(0, 10);
    await tx.insert(assetMovements).values({
      assetId: data.assetId,
      type: "emprestimo",
      reason: `Retirada por ${data.collaboratorName.trim()}`,
      movementDate,
      userId: data.userId,
      observations: data.withdrawalNotes?.trim() || null,
    });

    await tx.insert(assetHistory).values({
      assetId: data.assetId,
      userId: data.userId,
      eventType: "retirada_ferramenta",
      description: `Ferramenta retirada por ${data.collaboratorName.trim()}`,
      newData: JSON.stringify({
        collaboratorName: data.collaboratorName.trim(),
        collaboratorSector: data.collaboratorSector?.trim() || null,
        expectedReturnDate: data.expectedReturnDate,
      }),
    });

    return { success: true };
  });
}

export async function returnTool(data: {
  loanId: number;
  returnNotes?: string;
  conditionAtReturn?: string;
  userId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");

  return db.transaction(async tx => {
    const loanRows = await tx
      .select()
      .from(assetToolLoans)
      .where(and(eq(assetToolLoans.id, data.loanId), eq(assetToolLoans.status, "pendente")))
      .limit(1);
    const loan = loanRows[0];

    if (!loan) throw new Error("Retirada pendente não encontrada ou ferramenta já devolvida");

    const returnedAt = new Date();
    await tx.update(assetToolLoans).set({
      status: "devolvido",
      returnedAt,
      returnedBy: data.userId,
      returnNotes: data.returnNotes?.trim() || null,
      conditionAtReturn: data.conditionAtReturn || null,
    }).where(eq(assetToolLoans.id, data.loanId));

    const assetUpdate: Record<string, unknown> = {
      status: "em_estoque",
      responsibleId: null,
      updatedBy: data.userId,
    };
    if (data.conditionAtReturn) assetUpdate.conservationState = data.conditionAtReturn;
    await tx.update(assets).set(assetUpdate as any).where(eq(assets.id, loan.assetId));

    const movementDate = returnedAt.toISOString().slice(0, 10);
    await tx.insert(assetMovements).values({
      assetId: loan.assetId,
      type: "retorno_emprestimo",
      reason: `Devolução por ${loan.collaboratorName}`,
      movementDate,
      userId: data.userId,
      observations: data.returnNotes?.trim() || null,
    });

    await tx.insert(assetHistory).values({
      assetId: loan.assetId,
      userId: data.userId,
      eventType: "devolucao_ferramenta",
      description: `Ferramenta devolvida por ${loan.collaboratorName}`,
      newData: JSON.stringify({
        loanId: loan.id,
        returnedAt: returnedAt.toISOString(),
        conditionAtReturn: data.conditionAtReturn || null,
      }),
    });

    return { success: true };
  });
}
