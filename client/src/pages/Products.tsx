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
import { Plus, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Products() {
  const [search, setSearch] = useState("");
  const [selectedCostCenter, setSelectedCostCenter] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [formData, setFormData] = useState({
    description: "",
    localAlocacao: "",
    classification: "estoque" as "estoque" | "uso_especifico",
    minStock: "",
    maxStock: "",
    minStockEstoque: "",
    minStockUsoEspecifico: "",
    costCenterId: "",
  });

  const { data: products = [], isLoading: productsLoading, refetch } = trpc.products.list.useQuery({
    search: search || undefined,
    costCenterId: selectedCostCenter ? parseInt(selectedCostCenter) : undefined,
  });

  const { data: costCenters = [] } = trpc.costCenters.list.useQuery();

  const createProductMutation = trpc.products.create.useMutation({
    onSuccess: () => {
      toast.success("Produto criado com sucesso!");
      setFormData({
        description: "",
        localAlocacao: "",
        classification: "estoque",
        minStock: "",
        maxStock: "",
        minStockEstoque: "",
        minStockUsoEspecifico: "",
        costCenterId: "",
      });
      setIsOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar produto");
    },
  });

  const updateProductMutation = trpc.products.update.useMutation({
    onSuccess: () => {
      toast.success("Produto atualizado com sucesso!");
      setFormData({
        description: "",
        localAlocacao: "",
        classification: "estoque",
        minStock: "",
        maxStock: "",
        minStockEstoque: "",
        minStockUsoEspecifico: "",
        costCenterId: "",
      });
      setIsEditOpen(false);
      setSelectedProduct(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar produto");
    },
  });

  const deleteProductMutation = trpc.products.delete.useMutation({
    onSuccess: () => {
      toast.success("Produto excluído com sucesso!");
      setIsDeleteOpen(false);
      setSelectedProduct(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao excluir produto");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.description ||
      !formData.minStock ||
      !formData.maxStock ||
      !formData.costCenterId
    ) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    createProductMutation.mutate({
      description: formData.description,
      classification: formData.classification,
      minStock: parseInt(formData.minStock),
      maxStock: parseInt(formData.maxStock),
      minStockEstoque: formData.minStockEstoque ? parseInt(formData.minStockEstoque) : undefined,
      minStockUsoEspecifico: formData.minStockUsoEspecifico ? parseInt(formData.minStockUsoEspecifico) : undefined,
      costCenterId: parseInt(formData.costCenterId),
      localAlocacao: formData.localAlocacao || undefined,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct) return;

    updateProductMutation.mutate({
      id: selectedProduct.id,
      description: formData.description || undefined,
      classification: formData.classification,
      minStock: formData.minStock ? parseInt(formData.minStock) : undefined,
      maxStock: formData.maxStock ? parseInt(formData.maxStock) : undefined,
      minStockEstoque: formData.minStockEstoque ? parseInt(formData.minStockEstoque) : undefined,
      minStockUsoEspecifico: formData.minStockUsoEspecifico ? parseInt(formData.minStockUsoEspecifico) : undefined,
      costCenterId: formData.costCenterId ? parseInt(formData.costCenterId) : undefined,
      localAlocacao: formData.localAlocacao || undefined,
    });
  };

  const openEditDialog = (product: any) => {
    setSelectedProduct(product);
    setFormData({
      description: product.description,
      localAlocacao: product.localAlocacao || "",
      classification: product.classification || "estoque",
      minStock: product.minStock.toString(),
      maxStock: product.maxStock.toString(),
      minStockEstoque: product.minStockEstoque?.toString() || "",
      minStockUsoEspecifico: product.minStockUsoEspecifico?.toString() || "",
      costCenterId: product.costCenterId.toString(),
    });
    setIsEditOpen(true);
  };

  const openDeleteDialog = (product: any) => {
    setSelectedProduct(product);
    setIsDeleteOpen(true);
  };

  const handleDelete = () => {
    if (selectedProduct) {
      deleteProductMutation.mutate(selectedProduct.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Produtos</h1>
          <p className="text-muted-foreground mt-2">Gerencie seu catálogo de produtos</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Produto</DialogTitle>
              <DialogDescription>
                Adicione um novo produto ao seu estoque
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="description">Descrição do Produto *</Label>
                <Input
                  id="description"
                  placeholder="Ex: Papel A4 500 folhas"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="localAlocacao">Local de Alocação</Label>
                <Input
                  id="localAlocacao"
                  placeholder="Ex: Sala A / Estante 1 / Prateleira 2"
                  value={formData.localAlocacao}
                  onChange={(e) =>
                    setFormData({ ...formData, localAlocacao: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="classification">Classificacao *</Label>
                <Select
                  value={formData.classification}
                  onValueChange={(value) =>
                    setFormData({ ...formData, classification: value as "estoque" | "uso_especifico" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="estoque">Estoque</SelectItem>
                    <SelectItem value="uso_especifico">Uso Especifico</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="costCenter">Centro de Custo *</Label>
                <Select
                  value={formData.costCenterId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, costCenterId: value })
                  }
                >
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minStock">Estoque Mínimo *</Label>
                  <Input
                    id="minStock"
                    type="number"
                    placeholder="0"
                    value={formData.minStock}
                    onChange={(e) =>
                      setFormData({ ...formData, minStock: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="maxStock">Estoque Máximo *</Label>
                  <Input
                    id="maxStock"
                    type="number"
                    placeholder="0"
                    value={formData.maxStock}
                    onChange={(e) =>
                      setFormData({ ...formData, maxStock: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minStockEstoque">Alerta Mín. Estoque</Label>
                  <Input
                    id="minStockEstoque"
                    type="number"
                    placeholder="5"
                    value={formData.minStockEstoque}
                    onChange={(e) =>
                      setFormData({ ...formData, minStockEstoque: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="minStockUsoEspecifico">Alerta Mín. Uso Específico</Label>
                  <Input
                    id="minStockUsoEspecifico"
                    type="number"
                    placeholder="2"
                    value={formData.minStockUsoEspecifico}
                    onChange={(e) =>
                      setFormData({ ...formData, minStockUsoEspecifico: e.target.value })
                    }
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={createProductMutation.isPending}
              >
                {createProductMutation.isPending ? "Criando..." : "Criar Produto"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por descrição..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={selectedCostCenter} onValueChange={setSelectedCostCenter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Centro de Custo" />
              </SelectTrigger>
              <SelectContent>
                {costCenters.map((cc) => (
                  <SelectItem key={cc.id} value={cc.id.toString()}>
                    {cc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCostCenter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCostCenter("")}
              >
                Limpar Filtro
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Produtos</CardTitle>
          <CardDescription>
            {products.length} produto(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {productsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : products.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">Descricao</th>
                    <th className="text-left py-3 px-2">Local</th>
                    <th className="text-center py-3 px-2">Centro de Custo</th>
                    <th className="text-right py-3 px-2">Quantidade</th>
                    <th className="text-center py-3 px-2">Min/Max</th>
                    <th className="text-center py-3 px-2">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const minLimit = product.classification === "estoque" ? product.minStockEstoque : product.minStockUsoEspecifico;
                    const isBelowAlert = product.currentQuantity <= minLimit;
                    const isBelowMin = product.currentQuantity <= product.minStock;
                    const isAboveMax = product.currentQuantity >= product.maxStock;

                    return (
                      <tr
                        key={product.id}
                        className={`border-b hover:bg-muted/50 ${
                          isBelowAlert ? "bg-orange-50" : isBelowMin ? "bg-red-50" : isAboveMax ? "bg-yellow-50" : ""
                        }`}
                      >
                        <td className="py-3 px-2">{product.description}</td>
                        <td className="py-3 px-2 text-sm text-muted-foreground">
                          {product.localAlocacao || "-"}
                        </td>
                        <td className="text-center py-3 px-2 text-sm">
                          {costCenters.find(cc => cc.id === product.costCenterId)?.name || "-"}
                        </td>
                        <td className="text-right py-3 px-2 font-medium">
                          {product.currentQuantity}
                        </td>
                        <td className="text-center py-3 px-2 text-sm">
                          <div className="flex flex-col items-center">
                            <span>{product.minStock} / {product.maxStock}</span>
                            {isBelowAlert && (
                              <span className="text-xs text-orange-600 font-semibold mt-1">
                                ⚠️ Alerta: {minLimit}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="text-center py-3 px-2">
                          <div className="flex gap-2 justify-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(product)}
                              title="Editar produto"
                            >
                              <Edit2 className="w-4 h-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteDialog(product)}
                              title="Excluir produto"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum produto encontrado
            </p>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Produto</DialogTitle>
            <DialogDescription>
              Atualize as informações do produto
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <Label htmlFor="edit-description">Descrição do Produto</Label>
              <Input
                id="edit-description"
                placeholder="Ex: Papel A4 500 folhas"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="edit-classification">Classificacao</Label>
              <Select
                value={formData.classification}
                onValueChange={(value) =>
                  setFormData({ ...formData, classification: value as "estoque" | "uso_especifico" })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="estoque">Estoque</SelectItem>
                  <SelectItem value="uso_especifico">Uso Especifico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit-costCenter">Centro de Custo</Label>
              <Select
                value={formData.costCenterId}
                onValueChange={(value) =>
                  setFormData({ ...formData, costCenterId: value })
                }
              >
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-minStock">Estoque Mínimo</Label>
                <Input
                  id="edit-minStock"
                  type="number"
                  placeholder="0"
                  value={formData.minStock}
                  onChange={(e) =>
                    setFormData({ ...formData, minStock: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-maxStock">Estoque Máximo</Label>
                <Input
                  id="edit-maxStock"
                  type="number"
                  placeholder="0"
                  value={formData.maxStock}
                  onChange={(e) =>
                    setFormData({ ...formData, maxStock: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-localAlocacao">Local de Alocação</Label>
              <Input
                id="edit-localAlocacao"
                placeholder="Ex: Prateleira A3, Corredor 2, Galpão B"
                value={formData.localAlocacao}
                onChange={(e) =>
                  setFormData({ ...formData, localAlocacao: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-minStockEstoque">Alerta Mín. Estoque</Label>
                <Input
                  id="edit-minStockEstoque"
                  type="number"
                  placeholder="5"
                  value={formData.minStockEstoque}
                  onChange={(e) =>
                    setFormData({ ...formData, minStockEstoque: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-minStockUsoEspecifico">Alerta Mín. Uso Específico</Label>
                <Input
                  id="edit-minStockUsoEspecifico"
                  type="number"
                  placeholder="2"
                  value={formData.minStockUsoEspecifico}
                  onChange={(e) =>
                    setFormData({ ...formData, minStockUsoEspecifico: e.target.value })
                  }
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={updateProductMutation.isPending}
            >
              {updateProductMutation.isPending ? "Atualizando..." : "Atualizar Produto"}
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
              Tem certeza que deseja excluir o produto "{selectedProduct?.description}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-4">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteProductMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteProductMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
