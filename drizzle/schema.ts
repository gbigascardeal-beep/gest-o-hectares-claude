import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  longtext,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extended with role-based access control for Admin and Supervisor.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  loginMethod: varchar("loginMethod", { length: 64 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  isActive: boolean("isActive").default(true).notNull(),
  role: mysqlEnum("role", ["user", "admin", "supervisor", "comprador", "almoxarifado"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Centros de Custo - Departamentos/Áreas para alocação de produtos
 * Exemplos: Limpeza, Jardinagem, Manutenção, Estoque
 */
export const costCenters = mysqlTable("cost_centers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CostCenter = typeof costCenters.$inferSelect;
export type InsertCostCenter = typeof costCenters.$inferInsert;

/**
 * Produtos - Itens de estoque com controle de quantidade e valores
 */
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  description: varchar("description", { length: 500 }).notNull(),
  localAlocacao: varchar("local_alocacao", { length: 255 }),
  classification: mysqlEnum("classification", ["estoque", "uso_especifico"]).default("estoque").notNull(),
  currentQuantity: int("current_quantity").default(0).notNull(),
  minStock: int("min_stock").default(0).notNull(),
  maxStock: int("max_stock").default(0).notNull(),
  minStockEstoque: int("min_stock_estoque").default(5).notNull(),
  minStockUsoEspecifico: int("min_stock_uso_especifico").default(2).notNull(),
  costCenterId: int("cost_center_id").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/**
 * Movimentações de Estoque - Registro de entrada e saída de produtos
 */
export const stockMovements = mysqlTable("stock_movements", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("product_id").notNull(),
  type: mysqlEnum("type", ["entrada", "saida"]).notNull(),
  quantity: int("quantity").notNull(),
  costCenterId: int("cost_center_id").notNull(),
  userId: int("user_id").notNull(),
  lote: varchar("lote", { length: 100 }),
  pricePerUnit: decimal("price_per_unit", { precision: 12, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type StockMovement = typeof stockMovements.$inferSelect;
export type InsertStockMovement = typeof stockMovements.$inferInsert;

/**
 * Fornecedores - Dados de fornecedores para ordens de compra
 */
export const suppliers = mysqlTable("suppliers", {
  id: int("id").autoincrement().primaryKey(),
  cnpj: varchar("cnpj", { length: 18 }).notNull().unique(),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  contactName: varchar("contact_name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  cep: varchar("cep", { length: 10 }),
  city: varchar("city", { length: 255 }),
  state: varchar("state", { length: 2 }),
  tradeName: varchar("trade_name", { length: 255 }),
  category: varchar("category", { length: 100 }),
  website: varchar("website", { length: 500 }),
  isFavorite: boolean("is_favorite").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = typeof suppliers.$inferInsert;

/**
 * Ordens de Compra - Requisições de compra com status de acompanhamento
 */
export const purchaseOrders = mysqlTable("purchase_orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("order_number", { length: 50 }).notNull().unique(),
  supplierId: int("supplier_id").notNull(),
  costCenterId: int("cost_center_id").notNull(),
  requestedBy: int("requested_by").notNull(),
  status: mysqlEnum("status", ["solicitado", "entregue", "cancelada"])
    .default("solicitado")
    .notNull(),
  paymentMethod: mysqlEnum("payment_method", ["a_vista", "parcelado"]).notNull(),
  installments: int("installments").default(1),
  freightValue: decimal("freight_value", { precision: 12, scale: 2 }).default("0.00"),
  totalValue: decimal("total_value", { precision: 12, scale: 2 }).notNull(),
  observations: longtext("observations"),
  approvedBy: int("approved_by"),
  approvedAt: timestamp("approved_at"),
  stockAppliedAt: timestamp("stock_applied_at"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = typeof purchaseOrders.$inferInsert;

/**
 * Itens da Ordem de Compra - Produtos inclusos em cada ordem
 */
export const purchaseOrderItems = mysqlTable("purchase_order_items", {
  id: int("id").autoincrement().primaryKey(),
  purchaseOrderId: int("purchase_order_id").notNull(),
  productId: int("product_id"),
  productName: varchar("product_name", { length: 500 }),
  quantity: int("quantity").notNull(),
  unitValue: decimal("unit_value", { precision: 12, scale: 2 }).notNull(),
  totalValue: decimal("total_value", { precision: 12, scale: 2 }).notNull(),
  isSpecificUse: boolean("is_specific_use").default(false).notNull(),
  stockMovementId: int("stock_movement_id"),
});

export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type InsertPurchaseOrderItem = typeof purchaseOrderItems.$inferInsert;

/**
 * Arquivos - Upload de documentos vinculados a produtos e ordens
 */
export const files = mysqlTable("files", {
  id: int("id").autoincrement().primaryKey(),
  filename: varchar("filename", { length: 255 }).notNull(),
  fileKey: varchar("file_key", { length: 500 }).notNull(),
  url: text("url").notNull(),
  mimeType: varchar("mime_type", { length: 100 }),
  fileSize: int("file_size"),
  productId: int("product_id"),
  purchaseOrderId: int("purchase_order_id"),
  uploadedBy: int("uploaded_by").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type File = typeof files.$inferSelect;
export type InsertFile = typeof files.$inferInsert;

/**
 * Parcelas - Detalhes de pagamento parcelado para ordens de compra
 */
export const purchaseOrderInstallments = mysqlTable("purchase_order_installments", {
  id: int("id").autoincrement().primaryKey(),
  purchaseOrderId: int("purchase_order_id").notNull(),
  installmentNumber: int("installment_number").notNull(),
  dueDate: varchar("due_date", { length: 10 }).notNull(),
  value: decimal("value", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 100 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PurchaseOrderInstallment = typeof purchaseOrderInstallments.$inferSelect;
export type InsertPurchaseOrderInstallment = typeof purchaseOrderInstallments.$inferInsert;


/**
 * Solicitações de Compra - Requisições de compra por setor/solicitante
 */
export const purchaseRequests = mysqlTable("purchase_requests", {
  id: int("id").autoincrement().primaryKey(),
  number: varchar("number", { length: 50 }).notNull().unique(),
  date: timestamp("date").defaultNow().notNull(),
  requesterId: int("requester_id").notNull(),
  sector: varchar("sector", { length: 100 }).notNull(),
  costCenterId: int("cost_center_id").notNull(),
  priority: mysqlEnum("priority", ["baixa", "media", "alta", "urgente"]).default("media").notNull(),
  desiredDate: varchar("desired_date", { length: 10 }),
  observations: longtext("observations"),
  status: mysqlEnum("status", ["mercado_livre", "em_negociacao", "aguardando_entrega", "aguardando_aprovacao", "finalizado", "aguardando_detalhes"]).default("mercado_livre").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PurchaseRequest = typeof purchaseRequests.$inferSelect;
export type InsertPurchaseRequest = typeof purchaseRequests.$inferInsert;

/**
 * Itens da Solicitação de Compra
 */
export const purchaseRequestItems = mysqlTable("purchase_request_items", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("request_id").notNull(),
  productCode: varchar("product_code", { length: 100 }).notNull(),
  description: text("description").notNull(),
  quantity: int("quantity").notNull(),
  unit: varchar("unit", { length: 20 }).notNull(),
  desiredBrand: varchar("desired_brand", { length: 100 }),
  suggestedSupplier: varchar("suggested_supplier", { length: 100 }),
  estimatedValue: decimal("estimated_value", { precision: 12, scale: 2 }).notNull(),
  itemObservation: text("item_observation"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PurchaseRequestItem = typeof purchaseRequestItems.$inferSelect;
export type InsertPurchaseRequestItem = typeof purchaseRequestItems.$inferInsert;

/**
 * Histórico de Alterações da Solicitação de Compra
 */
export const purchaseRequestHistory = mysqlTable("purchase_request_history", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("request_id").notNull(),
  oldStatus: varchar("old_status", { length: 50 }),
  newStatus: varchar("new_status", { length: 50 }).notNull(),
  changedBy: int("changed_by").notNull(),
  changedAt: timestamp("changed_at").defaultNow().notNull(),
  observation: text("observation"),
});

export type PurchaseRequestHistoryRecord = typeof purchaseRequestHistory.$inferSelect;
export type InsertPurchaseRequestHistory = typeof purchaseRequestHistory.$inferInsert;

/**
 * Anexos da Solicitação de Compra
 */
export const purchaseRequestAttachments = mysqlTable("purchase_request_attachments", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("request_id").notNull(),
  fileUrl: text("file_url").notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  uploadedBy: int("uploaded_by").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export type PurchaseRequestAttachment = typeof purchaseRequestAttachments.$inferSelect;
export type InsertPurchaseRequestAttachment = typeof purchaseRequestAttachments.$inferInsert;

/**
 * Comentários da Solicitação de Compra
 */
export const purchaseRequestComments = mysqlTable("purchase_request_comments", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("request_id").notNull(),
  userId: int("user_id").notNull(),
  message: longtext("message").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PurchaseRequestComment = typeof purchaseRequestComments.$inferSelect;
export type InsertPurchaseRequestComment = typeof purchaseRequestComments.$inferInsert;


/**
 * Requisições de Saída - Controle de retirada de materiais do almoxarifado
 * Supervisor solicita, almoxarife libera, sistema dá baixa automática no estoque
 */
export const exitRequests = mysqlTable("exit_requests", {
  id: int("id").autoincrement().primaryKey(),
  number: varchar("number", { length: 50 }).notNull().unique(),
  date: timestamp("date").defaultNow().notNull(),
  supervisorId: int("supervisor_id").notNull(),
  sector: varchar("sector", { length: 100 }).notNull(),
  collaboratorName: varchar("collaborator_name", { length: 255 }).notNull(),
  expectedDate: varchar("expected_date", { length: 20 }),
  observations: text("observations"),
  status: mysqlEnum("exit_request_status", [
    "aguardando_retirada",
    "parcialmente_retirado",
    "retirado",
    "cancelado",
  ]).default("aguardando_retirada").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ExitRequest = typeof exitRequests.$inferSelect;
export type InsertExitRequest = typeof exitRequests.$inferInsert;

/**
 * Itens da Requisição de Saída - Produtos solicitados para retirada
 */
export const exitRequestItems = mysqlTable("exit_request_items", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("request_id").notNull(),
  productId: int("product_id").notNull(),
  quantityRequested: int("quantity_requested").notNull(),
  quantityDelivered: int("quantity_delivered").default(0).notNull(),
  itemObservation: text("item_observation"),
  status: mysqlEnum("exit_item_status", [
    "pendente",
    "retirado",
    "cancelado",
  ]).default("pendente").notNull(),
  deliveredAt: timestamp("delivered_at"),
  deliveredBy: int("delivered_by"),
});

export type ExitRequestItem = typeof exitRequestItems.$inferSelect;
export type InsertExitRequestItem = typeof exitRequestItems.$inferInsert;

/**
 * Histórico de Requisições de Saída - Registro de ações realizadas
 */
export const exitRequestHistory = mysqlTable("exit_request_history", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("request_id").notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  performedBy: int("performed_by").notNull(),
  observation: text("observation"),
  performedAt: timestamp("performed_at").defaultNow().notNull(),
});

export type ExitRequestHistory = typeof exitRequestHistory.$inferSelect;
export type InsertExitRequestHistory = typeof exitRequestHistory.$inferInsert;

// ============================================================
// MÓDULO DE GESTÃO PATRIMONIAL
// ============================================================

/**
 * Categorias Patrimoniais - Classificação hierárquica dos bens
 */
export const assetCategories = mysqlTable("asset_categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  parentId: int("parent_id"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AssetCategory = typeof assetCategories.$inferSelect;
export type InsertAssetCategory = typeof assetCategories.$inferInsert;

/**
 * Localizações Patrimoniais - Estrutura hierárquica de locais
 */
export const assetLocations = mysqlTable("asset_locations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  parentId: int("parent_id"),
  type: varchar("type", { length: 100 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AssetLocation = typeof assetLocations.$inferSelect;
export type InsertAssetLocation = typeof assetLocations.$inferInsert;

/**
 * Patrimônios - Bens patrimoniais do condomínio
 */
export const assets = mysqlTable("assets", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  description: varchar("description", { length: 500 }).notNull(),
  categoryId: int("category_id"),
  subcategoryId: int("subcategory_id"),
  brand: varchar("brand", { length: 255 }),
  model: varchar("model", { length: 255 }),
  serialNumber: varchar("serial_number", { length: 255 }),
  manufacturerId: varchar("manufacturer_id", { length: 255 }),
  barcode: varchar("barcode", { length: 255 }),
  status: mysqlEnum("status", [
    "ativo", "em_uso", "em_estoque", "em_manutencao",
    "em_transferencia", "extraviado", "em_inventario", "baixado"
  ]).default("ativo").notNull(),
  conservationState: mysqlEnum("conservation_state", [
    "novo", "excelente", "bom", "regular", "ruim", "inservivel"
  ]).default("bom").notNull(),
  locationId: int("location_id"),
  responsibleId: int("responsible_id"),
  sectorId: int("sector_id"),
  acquisitionDate: varchar("acquisition_date", { length: 10 }),
  entryDate: varchar("entry_date", { length: 10 }),
  acquisitionValue: decimal("acquisition_value", { precision: 12, scale: 2 }),
  currentValue: decimal("current_value", { precision: 12, scale: 2 }),
  supplierId: int("supplier_id"),
  invoiceNumber: varchar("invoice_number", { length: 100 }),
  invoiceSeries: varchar("invoice_series", { length: 20 }),
  orderNumber: varchar("order_number", { length: 100 }),
  acquisitionType: mysqlEnum("acquisition_type", [
    "compra", "doacao", "transferencia", "incorporacao", "outro"
  ]).default("compra"),
  warrantyMonths: int("warranty_months"),
  warrantyStart: varchar("warranty_start", { length: 10 }),
  warrantyEnd: varchar("warranty_end", { length: 10 }),
  lastEvaluationDate: varchar("last_evaluation_date", { length: 10 }),
  nextEvaluationDate: varchar("next_evaluation_date", { length: 10 }),
  photoUrl: varchar("photo_url", { length: 1000 }),
  observations: text("observations"),
  qrCode: varchar("qr_code", { length: 500 }),
  createdBy: int("created_by"),
  updatedBy: int("updated_by"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Asset = typeof assets.$inferSelect;
export type InsertAsset = typeof assets.$inferInsert;

/**
 * Movimentações Patrimoniais - Registro de transferências e movimentos
 */
export const assetMovements = mysqlTable("asset_movements", {
  id: int("id").autoincrement().primaryKey(),
  assetId: int("asset_id").notNull(),
  originLocationId: int("origin_location_id"),
  destinationLocationId: int("destination_location_id"),
  previousResponsibleId: int("previous_responsible_id"),
  newResponsibleId: int("new_responsible_id"),
  type: mysqlEnum("type", [
    "transferencia_local", "transferencia_responsavel", "emprestimo",
    "retorno_emprestimo", "envio_manutencao", "retorno_manutencao",
    "transferencia_setor", "transferencia_temporaria", "outra"
  ]).notNull(),
  reason: text("reason"),
  movementDate: varchar("movement_date", { length: 10 }).notNull(),
  userId: int("user_id").notNull(),
  observations: text("observations"),
  documentUrl: varchar("document_url", { length: 1000 }),
  photoUrl: varchar("photo_url", { length: 1000 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AssetMovement = typeof assetMovements.$inferSelect;
export type InsertAssetMovement = typeof assetMovements.$inferInsert;

/**
 * Empréstimos de Ferramentas - Controle diário de retirada e devolução
 */
export const assetToolLoans = mysqlTable("asset_tool_loans", {
  id: int("id").autoincrement().primaryKey(),
  assetId: int("asset_id").notNull(),
  collaboratorName: varchar("collaborator_name", { length: 255 }).notNull(),
  collaboratorSector: varchar("collaborator_sector", { length: 150 }),
  status: mysqlEnum("tool_loan_status", ["pendente", "devolvido"])
    .default("pendente")
    .notNull(),
  withdrawnAt: timestamp("withdrawn_at").defaultNow().notNull(),
  expectedReturnDate: varchar("expected_return_date", { length: 10 }).notNull(),
  returnedAt: timestamp("returned_at"),
  withdrawalNotes: text("withdrawal_notes"),
  returnNotes: text("return_notes"),
  conditionAtWithdrawal: varchar("condition_at_withdrawal", { length: 50 }),
  conditionAtReturn: varchar("condition_at_return", { length: 50 }),
  withdrawnBy: int("withdrawn_by").notNull(),
  returnedBy: int("returned_by"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AssetToolLoan = typeof assetToolLoans.$inferSelect;
export type InsertAssetToolLoan = typeof assetToolLoans.$inferInsert;

/**
 * Manutenções Patrimoniais - Registro de manutenções dos bens
 */
export const assetMaintenances = mysqlTable("asset_maintenances", {
  id: int("id").autoincrement().primaryKey(),
  assetId: int("asset_id").notNull(),
  type: mysqlEnum("maintenance_type", [
    "preventiva", "corretiva", "inspecao", "calibracao", "limpeza_tecnica", "outro"
  ]).notNull(),
  status: mysqlEnum("maintenance_status", [
    "aberta", "aguardando_orcamento", "aguardando_aprovacao",
    "em_execucao", "concluida", "cancelada"
  ]).default("aberta").notNull(),
  openDate: varchar("open_date", { length: 10 }).notNull(),
  sendDate: varchar("send_date", { length: 10 }),
  returnDate: varchar("return_date", { length: 10 }),
  provider: varchar("provider", { length: 255 }),
  technician: varchar("technician", { length: 255 }),
  problem: text("problem"),
  diagnosis: text("diagnosis"),
  servicePerformed: text("service_performed"),
  replacedParts: text("replaced_parts"),
  laborCost: decimal("labor_cost", { precision: 12, scale: 2 }),
  partsCost: decimal("parts_cost", { precision: 12, scale: 2 }),
  totalCost: decimal("total_cost", { precision: 12, scale: 2 }),
  serviceWarranty: varchar("service_warranty", { length: 100 }),
  nextMaintenance: varchar("next_maintenance", { length: 10 }),
  observations: text("observations"),
  createdBy: int("created_by"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AssetMaintenance = typeof assetMaintenances.$inferSelect;
export type InsertAssetMaintenance = typeof assetMaintenances.$inferInsert;

/**
 * Inventários Patrimoniais - Conferência física dos bens
 */
export const assetInventories = mysqlTable("asset_inventories", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  startDate: varchar("start_date", { length: 10 }).notNull(),
  expectedEndDate: varchar("expected_end_date", { length: 10 }),
  completionDate: varchar("completion_date", { length: 10 }),
  responsibleId: int("responsible_id"),
  status: mysqlEnum("inventory_status", [
    "planejado", "em_andamento", "concluido", "cancelado"
  ]).default("planejado").notNull(),
  observations: text("observations"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AssetInventory = typeof assetInventories.$inferSelect;
export type InsertAssetInventory = typeof assetInventories.$inferInsert;

/**
 * Itens do Inventário - Conferência individual de cada bem
 */
export const assetInventoryItems = mysqlTable("asset_inventory_items", {
  id: int("id").autoincrement().primaryKey(),
  inventoryId: int("inventory_id").notNull(),
  assetId: int("asset_id").notNull(),
  checkStatus: mysqlEnum("check_status", [
    "pendente", "encontrado", "nao_encontrado", "local_diferente",
    "danificado", "sem_identificacao", "divergente"
  ]).default("pendente").notNull(),
  expectedLocationId: int("expected_location_id"),
  foundLocationId: int("found_location_id"),
  foundState: varchar("found_state", { length: 50 }),
  observation: text("observation"),
  photoUrl: varchar("photo_url", { length: 1000 }),
  checkedBy: int("checked_by"),
  checkedAt: timestamp("checked_at"),
});

export type AssetInventoryItem = typeof assetInventoryItems.$inferSelect;
export type InsertAssetInventoryItem = typeof assetInventoryItems.$inferInsert;

/**
 * Documentos Patrimoniais - Anexos vinculados aos bens
 */
export const assetDocuments = mysqlTable("asset_documents", {
  id: int("id").autoincrement().primaryKey(),
  assetId: int("asset_id").notNull(),
  type: mysqlEnum("document_type", [
    "nota_fiscal", "garantia", "manual", "termo_responsabilidade",
    "orcamento", "laudo", "comprovante", "documento_baixa", "foto", "outro"
  ]).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  fileUrl: varchar("file_url", { length: 1000 }).notNull(),
  documentDate: varchar("document_date", { length: 10 }),
  userId: int("user_id"),
  observation: text("observation"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AssetDocument = typeof assetDocuments.$inferSelect;
export type InsertAssetDocument = typeof assetDocuments.$inferInsert;

/**
 * Histórico de Responsabilidade - Quem já foi responsável por cada bem
 */
export const assetResponsibilities = mysqlTable("asset_responsibilities", {
  id: int("id").autoincrement().primaryKey(),
  assetId: int("asset_id").notNull(),
  responsibleId: int("responsible_id").notNull(),
  sectorId: int("sector_id"),
  startDate: varchar("start_date", { length: 10 }).notNull(),
  endDate: varchar("end_date", { length: 10 }),
  termUrl: varchar("term_url", { length: 1000 }),
  observation: text("observation"),
  createdBy: int("created_by"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AssetResponsibility = typeof assetResponsibilities.$inferSelect;
export type InsertAssetResponsibility = typeof assetResponsibilities.$inferInsert;

/**
 * Histórico Patrimonial - Log de todas as alterações relevantes
 */
export const assetHistory = mysqlTable("asset_history", {
  id: int("id").autoincrement().primaryKey(),
  assetId: int("asset_id").notNull(),
  userId: int("user_id").notNull(),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  description: text("description"),
  previousData: text("previous_data"),
  newData: text("new_data"),
  eventDate: timestamp("event_date").defaultNow().notNull(),
});

export type AssetHistoryRecord = typeof assetHistory.$inferSelect;
export type InsertAssetHistoryRecord = typeof assetHistory.$inferInsert;

/**
 * Baixas Patrimoniais - Registro de bens baixados
 */
export const assetDisposals = mysqlTable("asset_disposals", {
  id: int("id").autoincrement().primaryKey(),
  assetId: int("asset_id").notNull(),
  type: mysqlEnum("disposal_type", [
    "descarte", "venda", "doacao", "furto", "extravio",
    "inutilizacao", "transferencia_definitiva", "outro"
  ]).notNull(),
  reason: text("reason").notNull(),
  disposalDate: varchar("disposal_date", { length: 10 }).notNull(),
  disposalValue: decimal("disposal_value", { precision: 12, scale: 2 }),
  authorizedBy: int("authorized_by"),
  executedBy: int("executed_by"),
  documentUrl: varchar("document_url", { length: 1000 }),
  observations: text("observations"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AssetDisposal = typeof assetDisposals.$inferSelect;
export type InsertAssetDisposal = typeof assetDisposals.$inferInsert;
