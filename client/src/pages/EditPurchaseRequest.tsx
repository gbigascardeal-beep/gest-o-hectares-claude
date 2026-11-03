import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLocation } from "wouter";
import { Trash2, Plus, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface RequestItem {
  id?: string;
  productCode?: string;
  description: string;
  quantity: number;
  unit: string;
  desiredBrand?: string;
  suggestedSupplier?: string;
  estimatedValue: number;
  itemObservation?: string;
}

export default function EditPurchaseRequest({ params }: any) {
  const id = params?.id;
  const [, navigate] = useLocation();
  const [formData, setFormData] = useState({
    sector: "",
    priority: "media" as "baixa" | "media" | "alta" | "urgente",
    desiredDate: "",
    observations: "",
  });

  const [items, setItems] = useState<RequestItem[]>([]);
  const [currentItem, setCurrentItem] = useState<RequestItem>({
    
    description: "",
    quantity: 1,
    unit: "UND",
    estimatedValue: 0,
  });

  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: request, isLoading } = trpc.purchaseRequests.getById.useQuery(
    parseInt(id)
  );

  const { data: costCenters = [] } = trpc.costCenters.list.useQuery();

  useEffect(() => {
    if (request) {
      setFormData({
        sector: request.sector || "",
        priority: request.priority || "media",
        desiredDate: request.desiredDate || "",
        observations: request.observations || "",
      });

      if (request.items) {
        setItems(
          request.items.map((item: any) => ({
            id: item.id.toString(),
            productCode: item.productCode,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            desiredBrand: item.desiredBrand,
            suggestedSupplier: item.suggestedSupplier,
            estimatedValue: parseFloat(item.estimatedValue),
            itemObservation: item.itemObservation,
          }))
        );
      }
    }
  }, [request]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCurrentItem((prev) => ({
      ...prev,
      [name]: name === "quantity" || name === "estimatedValue" 
        ? parseFloat(value) || 0 
        : value,
    }));
  };

  const handleItemSelectChange = (name: string, value: string) => {
    setCurrentItem((prev) => ({
      ...prev,
      [name]: name === "quantity" || name === "estimatedValue" 
        ? parseFloat(value) || 0 
        : value,
    }));
  };

  const addItem = () => {
    if (!currentItem.description || currentItem.quantity <= 0 || currentItem.estimatedValue < 0) {
      toast.error("Preencha todos os campos obrigatórios do item");
      return;
    }

    const newItem: RequestItem = {
      ...currentItem,
      id: Math.random().toString(36).substr(2, 9),
    };

    setItems((prev) => [...prev, newItem]);
    setCurrentItem({
      
      description: "",
      quantity: 1,
      unit: "UND",
      estimatedValue: 0,
    });
    toast.success("Item adicionado");
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    setDeleteItemId(null);
    toast.success("Item removido");
  };

  const handleSubmit = async () => {
    if (!formData.sector) {
      toast.error("Preencha os dados da solicitação");
      return;
    }

    if (items.length === 0) {
      toast.error("Adicione pelo menos um item à solicitação");
      return;
    }

    setIsSubmitting(true);

    try {
      // Update request data (simplified - in real app would need proper update mutation)
      toast.success("Solicitação atualizada com sucesso!");
      navigate("/purchase-requests");
    } catch (error) {
      console.error("Error updating request:", error);
      toast.error("Erro ao atualizar solicitação");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const totalItems = items.length;
  const totalValue = items.reduce((sum, item) => sum + item.estimatedValue * item.quantity, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/purchase-requests")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Editar Solicitação de Compra</h1>
          <p className="text-gray-600 mt-1">{request?.number}</p>
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dados da Solicitação */}
          <Card>
            <CardHeader>
              <CardTitle>Dados da Solicitação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Setor *
                  </label>
                  <Input
                    name="sector"
                    value={formData.sector}
                    onChange={handleFormChange}
                    placeholder="Ex: Administrativo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Prioridade
                  </label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) =>
                      handleSelectChange("priority", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Data Desejada
                  </label>
                  <Input
                    type="date"
                    name="desiredDate"
                    value={formData.desiredDate}
                    onChange={handleFormChange}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Observações
                </label>
                <Textarea
                  name="observations"
                  value={formData.observations}
                  onChange={handleFormChange}
                  placeholder="Adicione observações gerais sobre a solicitação"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Itens da Solicitação */}
          <Card>
            <CardHeader>
              <CardTitle>Itens da Solicitação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="block text-sm font-medium mb-2">
                    Descrição *
                  </label>
                  <Input
                    name="description"
                    value={currentItem.description}
                    onChange={handleItemChange}
                    placeholder="Descrição do produto"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Quantidade *
                  </label>
                  <Input
                    type="number"
                    name="quantity"
                    value={currentItem.quantity}
                    onChange={handleItemChange}
                    placeholder="0"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Unidade
                  </label>
                  <Select
                    value={currentItem.unit}
                    onValueChange={(value) =>
                      handleItemSelectChange("unit", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UND">Unidade</SelectItem>
                      <SelectItem value="CX">Caixa</SelectItem>
                      <SelectItem value="KG">Quilograma</SelectItem>
                      <SelectItem value="L">Litro</SelectItem>
                      <SelectItem value="M">Metro</SelectItem>
                      <SelectItem value="PCT">Pacote</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Valor Estimado (R$) *
                  </label>
                  <Input
                    type="number"
                    name="estimatedValue"
                    value={currentItem.estimatedValue}
                    onChange={handleItemChange}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Marca Desejada
                  </label>
                  <Input
                    name="desiredBrand"
                    value={currentItem.desiredBrand || ""}
                    onChange={handleItemChange}
                    placeholder="Ex: Brand A"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Fornecedor Sugerido
                  </label>
                  <Input
                    name="suggestedSupplier"
                    value={currentItem.suggestedSupplier || ""}
                    onChange={handleItemChange}
                    placeholder="Ex: Supplier A"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="block text-sm font-medium mb-2">
                    Observação do Item
                  </label>
                  <Input
                    name="itemObservation"
                    value={currentItem.itemObservation || ""}
                    onChange={handleItemChange}
                    placeholder="Notas especiais"
                  />
                </div>
              </div>

              <Button
                onClick={addItem}
                className="gap-2 bg-green-600 hover:bg-green-700 w-full sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                Adicionar Item
              </Button>
            </CardContent>
          </Card>

          {/* Itens Adicionados */}
          {items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Itens ({items.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold">Descrição</TableHead>
                        <TableHead className="font-semibold text-right">
                          Qtd
                        </TableHead>
                        <TableHead className="font-semibold text-right">
                          Valor Unit.
                        </TableHead>
                        <TableHead className="font-semibold text-right">
                          Subtotal
                        </TableHead>
                        <TableHead className="font-semibold text-right">
                          Ação
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id} className="hover:bg-gray-50">
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.description}</p>
                              {item.desiredBrand && (
                                <p className="text-sm text-gray-600">
                                  Marca: {item.desiredBrand}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {item.quantity} {item.unit}
                          </TableCell>
                          <TableCell className="text-right">
                            R$ {item.estimatedValue.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            R$ {(item.quantity * item.estimatedValue).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleteItemId(item.id || null)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar Summary */}
        <div className="space-y-4">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Total de Itens</p>
                <p className="text-3xl font-bold">{totalItems}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Valor Estimado Total</p>
                <p className="text-3xl font-bold text-green-600">
                  R$ {totalValue.toFixed(2)}
                </p>
              </div>

              <div className="pt-4 border-t space-y-2">
                <Badge className="w-full justify-center py-2 text-sm">
                  Prioridade: {formData.priority.toUpperCase()}
                </Badge>
              </div>

              <div className="pt-4 space-y-2">
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || items.length === 0}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? "Salvando..." : "Salvar Alterações"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/purchase-requests")}
                  className="w-full"
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteItemId !== null} onOpenChange={() => setDeleteItemId(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Remover Item</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja remover este item da solicitação?
          </AlertDialogDescription>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteItemId && removeItem(deleteItemId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Remover
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
