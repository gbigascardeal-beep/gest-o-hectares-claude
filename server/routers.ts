import { COOKIE_NAME, SESSION_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import * as assetDb from "./assetDb";
import * as toolLoansDb from "./toolLoansDb";
import { TRPCError } from "@trpc/server";
import { sdk } from "./_core/sdk";
import { hashPassword, verifyPassword } from "./_core/password";

// ============ ADMIN PROCEDURE ============
const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

// Exclusões e cancelamentos: só administrador ou supervisor
const managerProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "supervisor") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administrador ou supervisor pode fazer isso" });
  }
  return next({ ctx });
});

// Trava simples contra tentativas de adivinhar senha: 5 erros por e-mail em 15 min
const failedLogins = new Map<string, { count: number; first: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 5;
function assertNotLocked(key: string) {
  const entry = failedLogins.get(key);
  if (entry && Date.now() - entry.first > WINDOW_MS) failedLogins.delete(key);
  const current = failedLogins.get(key);
  if (current && current.count >= MAX_FAILS) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Muitas tentativas. Aguarde 15 minutos e tente de novo." });
  }
}
function registerFailure(key: string) {
  const entry = failedLogins.get(key);
  if (!entry) failedLogins.set(key, { count: 1, first: Date.now() });
  else entry.count += 1;
}

// ============ ROUTERS ============

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(({ ctx }) => (ctx.user ? db.toPublicUser(ctx.user) : null)),

    login: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        const email = input.email.trim().toLowerCase();
        assertNotLocked(email);

        const user = await db.getUserByEmail(email);
        const passwordOk = user?.passwordHash
          ? await verifyPassword(input.password, user.passwordHash)
          : (await hashPassword(input.password), false); // gasta o mesmo tempo quando o e-mail não existe

        if (!user || !user.isActive || !passwordOk) {
          registerFailure(email);
          throw new TRPCError({ code: "UNAUTHORIZED", message: "E-mail ou senha incorretos" });
        }

        failedLogins.delete(email);
        await db.touchLastSignedIn(user.id);
        const token = await sdk.createSessionToken(user.openId, { name: user.name ?? "", expiresInMs: SESSION_MS });
        ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: SESSION_MS });
        return { success: true } as const;
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    changePassword: protectedProcedure
      .input(z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8, "A nova senha precisa ter pelo menos 8 caracteres") }))
      .mutation(async ({ input, ctx }) => {
        const ok = ctx.user.passwordHash ? await verifyPassword(input.currentPassword, ctx.user.passwordHash) : false;
        if (!ok) throw new TRPCError({ code: "BAD_REQUEST", message: "Senha atual incorreta" });
        await db.updateUserById(ctx.user.id, { passwordHash: await hashPassword(input.newPassword) });
        return { success: true } as const;
      }),
  }),

  // ============ USERS (somente administrador) ============
  users: router({
    list: adminProcedure.query(async () => db.listUsers()),

    create: adminProcedure
      .input(
        z.object({
          name: z.string().min(2),
          email: z.string().email(),
          password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres"),
          role: z.enum(["user", "supervisor", "admin"]),
        })
      )
      .mutation(async ({ input }) => {
        await db.createLocalUser({
          name: input.name,
          email: input.email,
          passwordHash: await hashPassword(input.password),
          role: input.role,
        });
        return { success: true } as const;
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(2).optional(),
          role: z.enum(["user", "supervisor", "admin"]).optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        const target = await db.getUserById(id);
        if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado" });

        const losesAdmin =
          target.role === "admin" &&
          target.isActive &&
          ((data.role !== undefined && data.role !== "admin") || data.isActive === false);
        if (losesAdmin) {
          if (target.id === ctx.user.id) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Você não pode remover seu próprio acesso de administrador" });
          }
          if ((await db.countActiveAdmins()) <= 1) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "O sistema precisa de pelo menos um administrador ativo" });
          }
        }
        await db.updateUserById(id, data);
        return { success: true } as const;
      }),

    resetPassword: adminProcedure
      .input(z.object({ id: z.number(), newPassword: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres") }))
      .mutation(async ({ input }) => {
        await db.updateUserById(input.id, { passwordHash: await hashPassword(input.newPassword) });
        return { success: true } as const;
      }),
  }),

  // ============ COST CENTERS ============
  costCenters: router({
    list: protectedProcedure.query(async () => {
      return await db.getCostCenters();
    }),

    create: adminProcedure
      .input(
        z.object({
          name: z.string().min(1),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createCostCenter(input);
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateCostCenter(id, data);
      }),

    getById: protectedProcedure.input(z.number()).query(async ({ input }) => {
      return await db.getCostCenterById(input);
    }),
  }),

  // ============ PRODUCTS ============
  products: router({
    list: protectedProcedure
      .input(
        z.object({
          costCenterId: z.number().optional(),
          search: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        return await db.getProducts(input);
      }),

    create: protectedProcedure
      .input(
        z.object({
          description: z.string().min(1),
          localAlocacao: z.string().optional(),
          classification: z.enum(["estoque", "uso_especifico"]).optional(),
          minStock: z.number().min(0),
          maxStock: z.number().min(0),
          minStockEstoque: z.number().min(0).optional(),
          minStockUsoEspecifico: z.number().min(0).optional(),
          costCenterId: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createProduct(input);
      }),

    getById: protectedProcedure.input(z.number()).query(async ({ input }) => {
      return await db.getProductById(input);
    }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          description: z.string().optional(),
          localAlocacao: z.string().optional(),
          classification: z.enum(["estoque", "uso_especifico"]).optional(),
          minStock: z.number().optional(),
          maxStock: z.number().optional(),
          minStockEstoque: z.number().optional(),
          minStockUsoEspecifico: z.number().optional(),
          costCenterId: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateProduct(id, data);
      }),

    delete: managerProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        return await db.deleteProduct(input);
      }),

    getBelowMinStock: protectedProcedure.query(async () => {
      return await db.getProductsBelowMinStock();
    }),

    getBelowMinAlert: protectedProcedure.query(async () => {
      return await db.getProductsBelowMinAlert();
    }),
  }),

  // ============ STOCK MOVEMENTS ============
  stockMovements: router({
    list: protectedProcedure
      .input(
        z.object({
          productId: z.number().optional(),
          costCenterId: z.number().optional(),
          type: z.enum(["entrada", "saida"]).optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        })
      )
      .query(async ({ input }) => {
        return await db.getStockMovements(input);
      }),

    create: protectedProcedure
      .input(
        z.object({
          productId: z.number(),
          type: z.enum(["entrada", "saida"]),
          quantity: z.number().min(1),
          costCenterId: z.number(),
          lote: z.string().optional(),
          pricePerUnit: z.number().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Valida o saldo, grava a movimentação e atualiza o produto numa transação só
        const { newQuantity } = await db.applyStockMovement({ ...input, userId: ctx.user.id });
        return { success: true, newQuantity };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          quantity: z.number().min(1).optional(),
          lote: z.string().optional(),
          pricePerUnit: z.number().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.updateStockMovementSafe(input.id, {
          quantity: input.quantity,
          lote: input.lote,
          pricePerUnit: input.pricePerUnit,
          notes: input.notes,
        });
      }),

    delete: managerProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        return await db.deleteStockMovementSafe(input);
      }),
  }),

  // ============ SUPPLIERS ============
  suppliers: router({
    list: protectedProcedure.query(async () => {
      return await db.getSuppliers();
    }),

    create: protectedProcedure
      .input(
        z.object({
          cnpj: z.string().min(14),
          companyName: z.string().min(1),
          contactName: z.string().optional(),
          email: z.string().email().optional(),
          phone: z.string().optional(),
          address: z.string().optional(),
          cep: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createSupplier(input);
      }),

    getById: protectedProcedure.input(z.number()).query(async ({ input }) => {
      return await db.getSupplierById(input);
    }),

    getByCnpj: protectedProcedure.input(z.string()).query(async ({ input }) => {
      return await db.getSupplierByCnpj(input);
    }),
  }),



  // ============ PURCHASE ORDERS ============
  purchaseOrders: router({
    list: protectedProcedure
      .input(
        z.object({
          status: z.string().optional(),
          costCenterId: z.number().optional(),
          supplierId: z.number().optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        })
      )
      .query(async ({ input }) => {
        return await db.getPurchaseOrders(input);
      }),

    create: protectedProcedure
      .input(
        z.object({
          orderNumber: z.string().min(1),
          supplierId: z.number(),
          costCenterId: z.number(),
          paymentMethod: z.enum(["a_vista", "parcelado"]),
          installments: z.number().optional(),
          totalValue: z.string(),
          freightValue: z.string().optional(),
          observations: z.string().optional(),
          installmentDetails: z.array(
            z.object({
              dueDate: z.string(),
              value: z.number(),
              paymentMethod: z.string(),
            })
          ).optional(),
        items: z.array(
          z.object({
            productId: z.number().optional(),
            productName: z.string().optional(),
            quantity: z.number().min(1),
            unitValue: z.string(),
            totalValue: z.string(),
            })
          ).optional().default([]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const supplier = await db.getSupplierById(input.supplierId);
        if (!supplier) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Supplier not found" });
        }

        // Create purchase order
        const result = await db.createPurchaseOrder({
          orderNumber: input.orderNumber,
          supplierId: input.supplierId,
          costCenterId: input.costCenterId,
          requestedBy: ctx.user.id,
          paymentMethod: input.paymentMethod,
          installments: input.installments || 1,
          totalValue: input.totalValue,
          freightValue: input.freightValue,
          observations: input.observations,
        });

        // Create order items if provided
        const orderId = (result as any).insertId || (result as any).id;
        if (input.items && input.items.length > 0) {
          for (const item of input.items) {
            await db.createPurchaseOrderItem({
              purchaseOrderId: orderId,
              productId: item.productId || null,
              productName: item.productName || null,
              quantity: item.quantity,
              unitValue: item.unitValue,
              totalValue: item.totalValue,
            });
          }
        }

        // Create installments if provided
        if (input.installmentDetails && input.installmentDetails.length > 0) {
          for (let i = 0; i < input.installmentDetails.length; i++) {
            const inst = input.installmentDetails[i];
            await db.createPurchaseOrderInstallment({
              purchaseOrderId: orderId,
              installmentNumber: i + 1,
              dueDate: inst.dueDate,
              value: inst.value.toString(),
              paymentMethod: inst.paymentMethod,
            });
          }
        }

        return { success: true, orderId };
      }),

    getById: protectedProcedure.input(z.number()).query(async ({ input }) => {
      return await db.getPurchaseOrderById(input);
    }),

    updateStatus: adminProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["pendente", "aprovada", "finalizada", "cancelada"]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const approvedBy = input.status === "aprovada" ? ctx.user.id : undefined;
        return await db.updatePurchaseOrderStatus(input.id, input.status, approvedBy);
      }),

    getItems: protectedProcedure.input(z.number()).query(async ({ input }) => {
      return await db.getPurchaseOrderItems(input);
    }),

    delete: managerProcedure.input(z.number()).mutation(async ({ input }) => {
      return await db.deletePurchaseOrder(input);
    }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          orderNumber: z.string().optional(),
          supplierId: z.number().optional(),
          costCenterId: z.number().optional(),
          paymentMethod: z.enum(["a_vista", "parcelado"]).optional(),
          installments: z.number().optional(),
          totalValue: z.string().optional(),
          observations: z.string().optional(),
          status: z.enum(["pendente", "aprovada", "finalizada", "cancelada"]).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        return await db.updatePurchaseOrder(id, data);
      }),
  }),

  // ============ FILES ============
  files: router({
    uploadUrl: protectedProcedure.query(async () => {
      // This will be used to get a presigned URL for S3 upload
      // Implementation depends on storage setup
      return { uploadUrl: "" };
    }),

    create: protectedProcedure
      .input(
        z.object({
          filename: z.string(),
          fileKey: z.string(),
          url: z.string(),
          mimeType: z.string().optional(),
          fileSize: z.number().optional(),
          productId: z.number().optional(),
          purchaseOrderId: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return await db.createFile({
          ...input,
          uploadedBy: ctx.user.id,
        });
      }),

    getByProduct: protectedProcedure.input(z.number()).query(async ({ input }) => {
      return await db.getFilesByProduct(input);
    }),

    getByPurchaseOrder: protectedProcedure
      .input(z.number())
      .query(async ({ input }) => {
        return await db.getFilesByPurchaseOrder(input);
      }),

    delete: managerProcedure.input(z.number()).mutation(async ({ input }) => {
      return await db.deleteFile(input);
    }),
  }),

  // ============ REPORTS ============
  reports: router({
    currentStock: protectedProcedure
      .input(
        z.object({
          costCenterId: z.number().optional(),
          classification: z.string().optional(),
          search: z.string().optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        const allProducts = await db.getProducts({
          costCenterId: input?.costCenterId,
          search: input?.search,
        });
        let filtered = allProducts;
        if (input?.classification) {
          filtered = filtered.filter((p) => p.classification === input.classification);
        }
        return filtered.map((p) => ({
          id: p.id,
          description: p.description,
          quantity: p.currentQuantity,
          minStock: p.minStock,
          maxStock: p.maxStock,
          classification: p.classification,
          localAlocacao: p.localAlocacao,
          costCenterId: p.costCenterId,
        }));
      }),

    movementsByPeriod: protectedProcedure
      .input(
        z.object({
          startDate: z.date(),
          endDate: z.date(),
          costCenterId: z.number().optional(),
          productId: z.number().optional(),
          type: z.enum(["entrada", "saida"]).optional(),
        })
      )
      .query(async ({ input }) => {
        return await db.getStockMovementsWithProducts({
          startDate: input.startDate,
          endDate: input.endDate,
          costCenterId: input.costCenterId,
          productId: input.productId,
          type: input.type,
        });
      }),

    spendingByCostCenter: protectedProcedure
      .input(
        z.object({
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        })
      )
      .query(async ({ input }) => {
        return await db.getSpendingByCostCenter({
          startDate: input.startDate,
          endDate: input.endDate,
        });
      }),

    suggestedPurchases: protectedProcedure
      .input(
        z.object({
          classification: z.string().optional(),
          costCenterId: z.number().optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        const allProducts = await db.getProducts({
          costCenterId: input?.costCenterId,
        });
        // Filtrar apenas produtos de estoque (uso específico não entra em sugestões de compra)
        let filtered = allProducts.filter((p) => p.classification === "estoque");
        if (input?.classification) {
          filtered = filtered.filter((p) => p.classification === input.classification);
        }
        return filtered
          .filter((p) => p.currentQuantity <= p.minStock)
          .map((p) => ({
            id: p.id,
            description: p.description,
            currentQuantity: p.currentQuantity,
            minStock: p.minStock,
            maxStock: p.maxStock,
            classification: p.classification,
            suggestedQuantity: p.maxStock - p.currentQuantity,
          }));
      }),

    consumptionByProduct: protectedProcedure
      .input(
        z.object({
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          productId: z.number().optional(),
          costCenterId: z.number().optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        return await db.getConsumptionByProduct({
          startDate: input?.startDate,
          endDate: input?.endDate,
          productId: input?.productId,
          costCenterId: input?.costCenterId,
        });
      }),

    exitRequestsBySector: protectedProcedure
      .input(
        z.object({
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          status: z.string().optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        return await db.getExitRequestsBySector({
          startDate: input?.startDate,
          endDate: input?.endDate,
          status: input?.status,
        });
      }),

    exitRequestsByCollaborator: protectedProcedure
      .input(
        z.object({
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          sector: z.string().optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        return await db.getExitRequestsByCollaborator({
          startDate: input?.startDate,
          endDate: input?.endDate,
          sector: input?.sector,
        });
      }),

    priceHistory: protectedProcedure
      .input(
        z.object({
          productId: z.number().optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        return await db.getPriceHistory({
          productId: input?.productId,
          startDate: input?.startDate,
          endDate: input?.endDate,
        });
      }),

    productsWithoutMovement: protectedProcedure
      .input(
        z.object({
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          classification: z.string().optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        return await db.getProductsWithoutMovement({
          startDate: input?.startDate,
          endDate: input?.endDate,
          classification: input?.classification,
        });
      }),

    purchaseRequestsByStatus: protectedProcedure
      .input(
        z.object({
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          sector: z.string().optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        return await db.getPurchaseRequestsByStatus({
          startDate: input?.startDate,
          endDate: input?.endDate,
          sector: input?.sector,
        });
      }),
  }),

  // ============ DASHBOARD ============
  // ============ PURCHASE REQUESTS ============
  purchaseRequests: router({
    list: protectedProcedure
      .input(
        z.object({
          status: z.string().optional(),
          sector: z.string().optional(),
          priority: z.string().optional(),
          search: z.string().optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        })
      )
      .query(async ({ input }) => {
        return await db.getPurchaseRequests(input);
      }),

    create: protectedProcedure
      .input(
        z.object({
          sector: z.string().min(1),
          costCenterId: z.number(),
          priority: z.enum(["baixa", "media", "alta", "urgente"]),
          desiredDate: z.string().optional(),
          observations: z.string().optional(),
          items: z.array(z.object({
            description: z.string().min(1),
            quantity: z.number().min(1),
            unit: z.string().min(1),
            estimatedValue: z.number().min(0),
            desiredBrand: z.string().optional(),
            suggestedSupplier: z.string().optional(),
            itemObservation: z.string().optional(),
          })).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { items, ...requestData } = input;
        const request = await db.createPurchaseRequest({
          ...requestData,
          requesterId: ctx.user.id,
        });

        // Save items if provided
        if (items && items.length > 0 && request.id) {
          for (const item of items) {
            await db.createPurchaseRequestItem({
              requestId: request.id,
              description: item.description,
              quantity: item.quantity,
              unit: item.unit,
              estimatedValue: item.estimatedValue,
              desiredBrand: item.desiredBrand,
              suggestedSupplier: item.suggestedSupplier,
              itemObservation: item.itemObservation,
            });
          }
        }

        return request;
      }),

    getById: protectedProcedure.input(z.number()).query(async ({ input }) => {
      return await db.getPurchaseRequestWithDetails(input);
    }),

    updateStatus: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          newStatus: z.enum(["mercado_livre", "em_negociacao", "aguardando_entrega", "aguardando_aprovacao", "finalizado", "aguardando_detalhes"]),
          observation: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return await db.updatePurchaseRequestStatus(
          input.id,
          input.newStatus,
          ctx.user.id,
          input.observation
        );
      }),

    addItem: protectedProcedure
      .input(
        z.object({
          requestId: z.number(),
          productCode: z.string().optional(),
          description: z.string().min(1),
          quantity: z.number().min(1),
          unit: z.string().min(1),
          desiredBrand: z.string().optional(),
          suggestedSupplier: z.string().optional(),
          estimatedValue: z.number().min(0),
          itemObservation: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createPurchaseRequestItem(input);
      }),

    removeItem: protectedProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        return await db.deletePurchaseRequestItem(input);
      }),

    delete: managerProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        return await db.deletePurchaseRequest(input);
      }),

    addComment: protectedProcedure
      .input(
        z.object({
          requestId: z.number(),
          message: z.string().min(1),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return await db.addPurchaseRequestComment({
          ...input,
          userId: ctx.user.id,
        });
      }),

    getComments: protectedProcedure
      .input(z.number())
      .query(async ({ input }) => {
        return await db.getPurchaseRequestComments(input);
      }),

    stats: protectedProcedure
      .input(
        z.object({
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        })
      )
      .query(async ({ input }) => {
        return await db.getPurchaseRequestsStats(input);
      }),

    uploadAttachment: protectedProcedure
      .input(
        z.object({
          requestId: z.number(),
          fileUrl: z.string(),
          fileName: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return await db.addPurchaseRequestAttachment({
          ...input,
          uploadedBy: ctx.user.id,
        });
      }),

    getAttachments: protectedProcedure
      .input(z.number())
      .query(async ({ input }) => {
        return await db.getPurchaseRequestAttachments(input);
      }),

    deleteAttachment: protectedProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        return await db.deletePurchaseRequestAttachment(input);
      }),
  }),
  dashboard: router({
    summary: protectedProcedure.query(async () => {
      const products = await db.getProducts();
      const belowMinStock = await db.getProductsBelowMinStock();

      const totalQuantity = products.reduce(
        (sum, p) => sum + p.currentQuantity,
        0
      );

      const totalValue = 0; // unitValue removed from products

      return {
        totalProducts: products.length,
        totalQuantity,
        totalValue,
        productsBelowMinStock: belowMinStock.length,
      };
    }),

    recentMovements: protectedProcedure.query(async () => {
      const movements = await db.getStockMovements();
      return movements.slice(0, 10);
    }),
  }),

  // ============ REQUISIÇÕES DE SAÍDA ============
  exitRequests: router({
    list: protectedProcedure
      .input(
        z.object({
          status: z.string().optional(),
          sector: z.string().optional(),
          search: z.string().optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        return db.getExitRequests(input || {});
      }),

    create: protectedProcedure
      .input(
        z.object({
          sector: z.string().min(1),
          collaboratorName: z.string().min(1),
          expectedDate: z.string().optional(),
          observations: z.string().optional(),
          items: z.array(
            z.object({
              productId: z.number(),
              quantityRequested: z.number().min(1),
              itemObservation: z.string().optional(),
            })
          ).min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return db.createExitRequest({
          supervisorId: ctx.user.id,
          sector: input.sector,
          collaboratorName: input.collaboratorName,
          expectedDate: input.expectedDate,
          observations: input.observations,
          items: input.items,
        });
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getExitRequestById(input.id);
      }),

    markItemDelivered: protectedProcedure
      .input(
        z.object({
          itemId: z.number(),
          quantityDelivered: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return db.markExitRequestItemAsDelivered(
          input.itemId,
          ctx.user.id,
          input.quantityDelivered
        );
      }),

    delete: managerProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return db.deleteExitRequest(input.id);
      }),

    cancel: managerProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
      return db.cancelExitRequest(input.id, ctx.user.id);
      }),
  }),


  // ============ GESTÃO PATRIMONIAL ============
  assets: router({
    // Dashboard
    dashboard: protectedProcedure.query(async () => {
      return await assetDb.getAssetDashboardStats();
    }),

    // CRUD Patrimônios
    list: protectedProcedure
      .input(z.object({
        search: z.string().optional(),
        categoryId: z.number().optional(),
        locationId: z.number().optional(),
        status: z.string().optional(),
        conservationState: z.string().optional(),
        responsibleId: z.number().optional(),
        supplierId: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        return await assetDb.getAssets(input || {});
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const asset = await assetDb.getAssetById(input.id);
        if (!asset) throw new TRPCError({ code: "NOT_FOUND", message: "Patrimônio não encontrado" });
        return asset;
      }),

    create: protectedProcedure
      .input(z.object({
        description: z.string().min(1),
        categoryId: z.number().optional(),
        subcategoryId: z.number().optional(),
        brand: z.string().optional(),
        model: z.string().optional(),
        serialNumber: z.string().optional(),
        manufacturerId: z.string().optional(),
        barcode: z.string().optional(),
        status: z.string().optional(),
        conservationState: z.string().optional(),
        locationId: z.number().optional(),
        responsibleId: z.number().optional(),
        sectorId: z.number().optional(),
        acquisitionDate: z.string().optional(),
        entryDate: z.string().optional(),
        acquisitionValue: z.string().optional(),
        currentValue: z.string().optional(),
        supplierId: z.number().optional(),
        invoiceNumber: z.string().optional(),
        invoiceSeries: z.string().optional(),
        orderNumber: z.string().optional(),
        acquisitionType: z.string().optional(),
        warrantyMonths: z.number().optional(),
        warrantyStart: z.string().optional(),
        warrantyEnd: z.string().optional(),
        photoUrl: z.string().optional(),
        observations: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const asset = await assetDb.createAsset({
          ...input,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        });
        await assetDb.createAssetHistoryRecord({
          assetId: asset.id,
          userId: ctx.user.id,
          eventType: "criacao",
          description: `Patrimônio "${input.description}" cadastrado`,
        });
        return asset;
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        description: z.string().optional(),
        categoryId: z.number().optional(),
        subcategoryId: z.number().optional(),
        brand: z.string().optional(),
        model: z.string().optional(),
        serialNumber: z.string().optional(),
        manufacturerId: z.string().optional(),
        barcode: z.string().optional(),
        status: z.string().optional(),
        conservationState: z.string().optional(),
        locationId: z.number().optional(),
        responsibleId: z.number().optional(),
        sectorId: z.number().optional(),
        acquisitionDate: z.string().optional(),
        entryDate: z.string().optional(),
        acquisitionValue: z.string().optional(),
        currentValue: z.string().optional(),
        supplierId: z.number().optional(),
        invoiceNumber: z.string().optional(),
        invoiceSeries: z.string().optional(),
        orderNumber: z.string().optional(),
        acquisitionType: z.string().optional(),
        warrantyMonths: z.number().optional(),
        warrantyStart: z.string().optional(),
        warrantyEnd: z.string().optional(),
        photoUrl: z.string().optional(),
        observations: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        const previous = await assetDb.getAssetById(id);
        const updated = await assetDb.updateAsset(id, { ...data, updatedBy: ctx.user.id });
        await assetDb.createAssetHistoryRecord({
          assetId: id,
          userId: ctx.user.id,
          eventType: "alteracao",
          description: `Patrimônio atualizado`,
          previousData: JSON.stringify(previous),
          newData: JSON.stringify(data),
        });
        return updated;
      }),

    // Movimentações
    getMovements: protectedProcedure
      .input(z.object({ assetId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return await assetDb.getAssetMovements(input?.assetId);
      }),

    createMovement: protectedProcedure
      .input(z.object({
        assetId: z.number(),
        originLocationId: z.number().optional(),
        destinationLocationId: z.number().optional(),
        previousResponsibleId: z.number().optional(),
        newResponsibleId: z.number().optional(),
        type: z.string(),
        reason: z.string().optional(),
        movementDate: z.string(),
        observations: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await assetDb.createAssetMovement({ ...input, userId: ctx.user.id });
        // Update asset location/responsible if applicable
        const updateData: any = {};
        if (input.destinationLocationId) updateData.locationId = input.destinationLocationId;
        if (input.newResponsibleId) updateData.responsibleId = input.newResponsibleId;
        if (Object.keys(updateData).length > 0) {
          await assetDb.updateAsset(input.assetId, updateData);
        }
        await assetDb.createAssetHistoryRecord({
          assetId: input.assetId,
          userId: ctx.user.id,
          eventType: "movimentacao",
          description: `Movimentação: ${input.type}`,
          newData: JSON.stringify(input),
        });
        return result;
      }),

    // Controle de retirada e devolução de ferramentas
    tools: router({
      summary: protectedProcedure.query(async () => {
        return await toolLoansDb.getToolLoanSummary();
      }),

      available: protectedProcedure
        .input(z.object({ search: z.string().optional() }).optional())
        .query(async ({ input }) => {
          return await toolLoansDb.getAvailableTools(input?.search);
        }),

      loans: protectedProcedure
        .input(z.object({
          search: z.string().optional(),
          status: z.enum(["pendente", "devolvido"]).optional(),
          collaborator: z.string().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          assetId: z.number().optional(),
        }).optional())
        .query(async ({ input }) => {
          return await toolLoansDb.getToolLoans({
            ...input,
            startDate: input?.startDate ? new Date(`${input.startDate}T00:00:00`) : undefined,
            endDate: input?.endDate ? new Date(`${input.endDate}T23:59:59`) : undefined,
          });
        }),

      checkout: protectedProcedure
        .input(z.object({
          assetId: z.number().int().positive(),
          collaboratorName: z.string().trim().min(2, "Informe o colaborador responsável"),
          collaboratorSector: z.string().trim().optional(),
          expectedReturnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data prevista inválida"),
          withdrawalNotes: z.string().trim().optional(),
          conditionAtWithdrawal: z.enum(["novo", "excelente", "bom", "regular", "ruim", "inservivel"]).optional(),
        }))
        .mutation(async ({ input, ctx }) => {
          return await toolLoansDb.checkoutTool({ ...input, userId: ctx.user.id });
        }),

      return: protectedProcedure
        .input(z.object({
          loanId: z.number().int().positive(),
          returnNotes: z.string().trim().optional(),
          conditionAtReturn: z.enum(["novo", "excelente", "bom", "regular", "ruim", "inservivel"]).optional(),
        }))
        .mutation(async ({ input, ctx }) => {
          return await toolLoansDb.returnTool({ ...input, userId: ctx.user.id });
        }),
    }),

    // Manutenções
    getMaintenances: protectedProcedure
      .input(z.object({ assetId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return await assetDb.getAssetMaintenances(input?.assetId);
      }),

    createMaintenance: protectedProcedure
      .input(z.object({
        assetId: z.number(),
        type: z.string(),
        openDate: z.string(),
        problem: z.string().optional(),
        provider: z.string().optional(),
        technician: z.string().optional(),
        observations: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await assetDb.createAssetMaintenance({ ...input, createdBy: ctx.user.id });
        await assetDb.updateAsset(input.assetId, { status: "em_manutencao" });
        await assetDb.createAssetHistoryRecord({
          assetId: input.assetId,
          userId: ctx.user.id,
          eventType: "manutencao",
          description: `Manutenção ${input.type} aberta`,
        });
        return result;
      }),

    updateMaintenance: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.string().optional(),
        returnDate: z.string().optional(),
        diagnosis: z.string().optional(),
        servicePerformed: z.string().optional(),
        replacedParts: z.string().optional(),
        laborCost: z.string().optional(),
        partsCost: z.string().optional(),
        totalCost: z.string().optional(),
        nextMaintenance: z.string().optional(),
        observations: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await assetDb.updateAssetMaintenance(id, data);
      }),

    // Documentos
    getDocuments: protectedProcedure
      .input(z.object({ assetId: z.number() }))
      .query(async ({ input }) => {
        return await assetDb.getAssetDocuments(input.assetId);
      }),

    createDocument: protectedProcedure
      .input(z.object({
        assetId: z.number(),
        type: z.string(),
        name: z.string(),
        fileUrl: z.string(),
        documentDate: z.string().optional(),
        observation: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await assetDb.createAssetDocument({ ...input, userId: ctx.user.id });
      }),

    deleteDocument: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await assetDb.deleteAssetDocument(input.id);
      }),

    // Histórico
    getHistory: protectedProcedure
      .input(z.object({ assetId: z.number() }))
      .query(async ({ input }) => {
        return await assetDb.getAssetHistory(input.assetId);
      }),

    // Responsabilidades
    getResponsibilities: protectedProcedure
      .input(z.object({ assetId: z.number() }))
      .query(async ({ input }) => {
        return await assetDb.getAssetResponsibilities(input.assetId);
      }),

    createResponsibility: protectedProcedure
      .input(z.object({
        assetId: z.number(),
        responsibleId: z.number(),
        sectorId: z.number().optional(),
        startDate: z.string(),
        observation: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await assetDb.createAssetResponsibility({ ...input, createdBy: ctx.user.id });
      }),

    // Baixa
    dispose: protectedProcedure
      .input(z.object({
        assetId: z.number(),
        type: z.string(),
        reason: z.string(),
        disposalDate: z.string(),
        disposalValue: z.string().optional(),
        observations: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await assetDb.createAssetDisposal({
          ...input,
          authorizedBy: ctx.user.id,
          executedBy: ctx.user.id,
        });
        await assetDb.updateAsset(input.assetId, { status: "baixado" });
        await assetDb.createAssetHistoryRecord({
          assetId: input.assetId,
          userId: ctx.user.id,
          eventType: "baixa",
          description: `Patrimônio baixado: ${input.type} - ${input.reason}`,
        });
        return { success: true };
      }),

    // Categorias
    categories: router({
      list: protectedProcedure.query(async () => {
        return await assetDb.getAssetCategories();
      }),
      create: protectedProcedure
        .input(z.object({ name: z.string(), description: z.string().optional(), parentId: z.number().optional() }))
        .mutation(async ({ input }) => {
          return await assetDb.createAssetCategory(input);
        }),
      update: protectedProcedure
        .input(z.object({ id: z.number(), name: z.string().optional(), description: z.string().optional(), parentId: z.number().optional(), isActive: z.boolean().optional() }))
        .mutation(async ({ input }) => {
          const { id, ...data } = input;
          return await assetDb.updateAssetCategory(id, data);
        }),
      delete: managerProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          return await assetDb.deleteAssetCategory(input.id);
        }),
    }),

    // Localizações
    locations: router({
      list: protectedProcedure.query(async () => {
        return await assetDb.getAssetLocations();
      }),
      create: protectedProcedure
        .input(z.object({ name: z.string(), description: z.string().optional(), parentId: z.number().optional(), type: z.string().optional() }))
        .mutation(async ({ input }) => {
          return await assetDb.createAssetLocation(input);
        }),
      update: protectedProcedure
        .input(z.object({ id: z.number(), name: z.string().optional(), description: z.string().optional(), parentId: z.number().optional(), type: z.string().optional(), isActive: z.boolean().optional() }))
        .mutation(async ({ input }) => {
          const { id, ...data } = input;
          return await assetDb.updateAssetLocation(id, data);
        }),
      delete: managerProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          return await assetDb.deleteAssetLocation(input.id);
        }),
    }),

    // Inventários
    inventories: router({
      list: protectedProcedure.query(async () => {
        return await assetDb.getAssetInventories();
      }),
      getById: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
          return await assetDb.getAssetInventoryById(input.id);
        }),
      create: protectedProcedure
        .input(z.object({
          name: z.string(),
          startDate: z.string(),
          expectedEndDate: z.string().optional(),
          observations: z.string().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
          const code = `INV-${Date.now().toString(36).toUpperCase()}`;
          return await assetDb.createAssetInventory({ ...input, code, responsibleId: ctx.user.id });
        }),
      update: protectedProcedure
        .input(z.object({ id: z.number(), status: z.string().optional(), completionDate: z.string().optional(), observations: z.string().optional() }))
        .mutation(async ({ input }) => {
          const { id, ...data } = input;
          return await assetDb.updateAssetInventory(id, data);
        }),
      getItems: protectedProcedure
        .input(z.object({ inventoryId: z.number() }))
        .query(async ({ input }) => {
          return await assetDb.getAssetInventoryItems(input.inventoryId);
        }),
      checkItem: protectedProcedure
        .input(z.object({
          id: z.number(),
          checkStatus: z.string(),
          foundLocationId: z.number().optional(),
          foundState: z.string().optional(),
          observation: z.string().optional(),
          photoUrl: z.string().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
          const { id, ...data } = input;
          return await assetDb.updateAssetInventoryItem(id, { ...data, checkedBy: ctx.user.id, checkedAt: new Date() });
        }),
    }),
  }),
});
export type AppRouter = typeof appRouter;
