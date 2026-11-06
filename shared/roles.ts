export const ROLES = ["user", "supervisor", "comprador", "almoxarifado", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrador",
  supervisor: "Supervisor (centro de custo)",
  comprador: "Comprador",
  almoxarifado: "Supervisor de almoxarifado",
  user: "Usuário (somente consulta)",
};

/** Quem pode fazer cada tipo de ação. O servidor confere sempre; a tela só esconde botões. */
export const PERMISSIONS = {
  // criar/editar ordens de compra e cadastrar fornecedores
  manageOrders: ["admin", "comprador"],
  // marcar a ordem como Entregue (dá entrada no estoque) ou voltar o status (desfaz a entrada)
  deliverOrders: ["admin", "comprador", "almoxarifado"],
  // abrir solicitação de compra e requisição de saída
  createRequests: ["admin", "supervisor"],
  // sinalizar o andamento (status) das solicitações de compra
  updateRequestStatus: ["admin", "comprador"],
  // entrega de requisição de saída, entradas e correções de estoque
  handleStock: ["admin", "almoxarifado"],
  // cancelar ou excluir requisições de saída
  manageExitRequests: ["admin", "supervisor", "almoxarifado"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export const can = (role: string | undefined | null, permission: Permission): boolean =>
  !!role && (PERMISSIONS[permission] as readonly string[]).includes(role);
