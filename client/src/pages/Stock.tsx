import { useAuth } from "@/_core/hooks/useAuth";
import { can } from "@shared/roles";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowDown, ArrowUp, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Stock() {
  const { user } = useAuth();
  const canMove = can(user?.role, "handleStock");
  const isAdmin = user?.role === "admin";
  const [isOpen, setIsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [movementType, setMovementType] = useState<"entrada" | "saida">("entrada");
  const [selectedMovement, setSelectedMovement] = useState<any>(null);
  const [formData, setFormData] = useState({
    productId: "",
    quantity: "",
    costCenterId: "",
    lote: "",
    pricePerUnit: "",
    notes: "",
  });

  const { data: products = [] } = trpc.products.list.useQuery({});
  const { data: costCenters = [] } = trpc.costCenters.list.useQuery();
  const { data: movements = [], refetch: refetchMovements } = trpc.stockMovements.list.useQuery({});

  const createMovementMutation = trpc.stockMovements.create.useMutation({
    onSuccess: () => {
      toast.success(
        movementType === "entrada"
          ? "Entrada registrada com sucesso!"
          : "Saída registrada com sucesso!"
      );
      setFormData({
        productId: "",
        quantity: "",
        costCenterId: "",
        lote: "",
        pricePerUnit: "",
        notes: "",
      });
      setIsOpen(false);
      refetchMovements();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao registrar movimentação");
    },
  });

  const updateMovementMutation = trpc.stockMovements.update.useMutation({
    onSuccess: () => {
      toast.success("Movimentação atualizada com sucesso!");
      setFormData({
        productId: "",
        quantity: "",
        costCenterId: "",
        lote: "",
        pricePerUnit: "",
        notes: "",
      });
      setIsEditOpen(false);
      setSelectedMovement(null);
      refetchMovements();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar movimentação");
    },
  });

  const deleteMovementMutation = trpc.stockMovements.delete.useMutation({
    onSuccess: () => {
      toast.success("Movimentação excluída com sucesso!");
      setIsDeleteOpen(false);
      setSelectedMovement(null);
      refetchMovements();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao excluir movimentação");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.productId || !formData.quantity || !formData.costCenterId) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const quantity = parseInt(formData.quantity);
    if (isNaN(quantity) || quantity < 1) {
      toast.error("Quantidade deve ser maior que 0");
      return;
    }

    createMovementMutation.mutate({
      productId: parseInt(formData.productId),
      type: movementType,
      quantity: quantity,
      costCenterId: parseInt(formData.costCenterId),
      lote: formData.lote || undefined,
      pricePerUnit: formData.pricePerUnit ? parseFloat(formData.pricePerUnit) : undefined,
      notes: formData.notes || undefined,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedMovement || !formData.quantity) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const quantity = parseInt(formData.quantity);
    if (isNaN(quantity) || quantity < 1) {
      toast.error("Quantidade deve ser maior que 0");
      return;
    }

    updateMovementMutation.mutate({
      id: selectedMovement.id,
      quantity: quantity,
      lote: formData.lote || undefined,
      pricePerUnit: formData.pricePerUnit ? parseFloat(formData.pricePerUnit) : undefined,
      notes: formData.notes || undefined,
    });
  };

  const openEditDialog = (movement: any) => {
    setSelectedMovement(movement);
    setFormData({
      productId: movement.productId.toString(),
      quantity: movement.quantity.toString(),
      costCenterId: movement.costCenterId.toString(),
      lote: movement.lote || "",
      pricePerUnit: movement.pricePerUnit || "",
      notes: movement.notes || "",
    });
    setIsEditOpen(true);
  };

  const openDeleteDialog = (movement: any) => {
    setSelectedMovement(movement);
    setIsDeleteOpen(true);
  };

  const handleDelete = () => {
    if (selectedMovement) {
      deleteMovementMutation.mutate(selectedMovement.id);
    }
  };

  const getProductName = (productId: number) => {
    return (products || []).find((p) => p.id === productId)?.description || "Produto desconhecido";
  };

  const getCostCenterName = (costCenterId: number) => {
    return (costCenters || []).find((cc) => cc.id === costCenterId)?.name || "Centro desconhecido";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Controle de Estoque</h1>
          <p className="text-muted-foreground mt-2">Entradas de produtos e histórico de movimentações. A saída é feita pela Requisição de Saída.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          {canMove && (
            <DialogTrigger asChild>
              <Button>
                <ArrowUp className="w-4 h-4 mr-2" />
                Nova Movimentação
              </Button>
            </DialogTrigger>
          )}
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Movimentação</DialogTitle>
              <DialogDescription>
                Registre uma entrada ou saída de produto do estoque
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="type">Tipo de Movimentação *</Label>
                <Select value={movementType} onValueChange={(value: any) => setMovementType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    {isAdmin && <SelectItem value="saida">Saída</SelectItem>}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="product">Produto *</Label>
                <Select value={formData.productId} onValueChange={(value) => setFormData({ ...formData, productId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quantity">Quantidade *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    placeholder="0"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="costCenter">Centro de Custo *</Label>
                  <Select value={formData.costCenterId} onValueChange={(value) => setFormData({ ...formData, costCenterId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {costCenters.map((cc) => (
                        <SelectItem key={cc.id} value={cc.id.toString()}>
                          {cc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="lote">Lote</Label>
                  <Input
                    id="lote"
                    placeholder="Ex: LOT-2025-001"
                    value={formData.lote}
                    onChange={(e) => setFormData({ ...formData, lote: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="pricePerUnit">Preço do Produto (R$)</Label>
                  <Input
                    id="pricePerUnit"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.pricePerUnit}
                    onChange={(e) => setFormData({ ...formData, pricePerUnit: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Observações</Label>
                <Input
                  id="notes"
                  placeholder="Adicione observações sobre a movimentação"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <Button type="submit" className="w-full" disabled={createMovementMutation.isPending}>
                {createMovementMutation.isPending ? "Registrando..." : "Registrar Movimentação"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Movements List */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Movimentações</CardTitle>
          <CardDescription>
            {movements.length} movimentação(ões) registrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {movements.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">Produto</th>
                    <th className="text-center py-3 px-2">Tipo</th>
                    <th className="text-right py-3 px-2">Quantidade</th>
                    <th className="text-left py-3 px-2">Centro de Custo</th>
                    <th className="text-left py-3 px-2">Data</th>
                    <th className="text-left py-3 px-2">Observações</th>
                    <th className="text-center py-3 px-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement) => (
                    <tr key={movement.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2">{getProductName(movement.productId)}</td>
                      <td className="text-center py-3 px-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            movement.type === "entrada"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {movement.type === "entrada" ? (
                            <ArrowUp className="w-3 h-3" />
                          ) : (
                            <ArrowDown className="w-3 h-3" />
                          )}
                          {movement.type === "entrada" ? "Entrada" : "Saída"}
                        </span>
                      </td>
                      <td className="text-right py-3 px-2 font-medium">{movement.quantity}</td>
                      <td className="py-3 px-2">{getCostCenterName(movement.costCenterId)}</td>
                      <td className="py-3 px-2 text-xs text-muted-foreground">
                        {new Date(movement.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="py-3 px-2 text-xs text-muted-foreground">
                        {movement.notes || "-"}
                      </td>
                      <td className="text-center py-3 px-2">
                        {canMove && (
<div className="flex gap-2 justify-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(movement)}
                            title="Editar movimentação"
                          >
                            <Edit2 className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(movement)}
                            title="Excluir movimentação"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma movimentação registrada
            </p>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Movimentação</DialogTitle>
            <DialogDescription>
              Atualize os dados da movimentação
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <Label htmlFor="edit-product">Produto</Label>
              <Input
                id="edit-product"
                value={getProductName(parseInt(formData.productId))}
                disabled
              />
            </div>

            <div>
              <Label htmlFor="edit-quantity">Quantidade</Label>
              <Input
                id="edit-quantity"
                type="number"
                placeholder="0"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-lote">Lote</Label>
                <Input
                  id="edit-lote"
                  placeholder="Ex: LOT-2025-001"
                  value={formData.lote}
                  onChange={(e) => setFormData({ ...formData, lote: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-pricePerUnit">Preço do Produto (R$)</Label>
                <Input
                  id="edit-pricePerUnit"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.pricePerUnit}
                  onChange={(e) => setFormData({ ...formData, pricePerUnit: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-notes">Observações</Label>
              <Input
                id="edit-notes"
                placeholder="Adicione observações"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={updateMovementMutation.isPending}
            >
              {updateMovementMutation.isPending ? "Atualizando..." : "Atualizar Movimentação"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Alert Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a movimentação de {selectedMovement?.quantity} unidades de "{getProductName(selectedMovement?.productId)}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-4">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMovementMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMovementMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
