import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLocation } from "wouter";
import { ArrowLeft, Plus, Trash2, Save, Package } from "lucide-react";

interface RequestItem {
  productId: number;
  productDescription: string;
  quantityRequested: number;
  currentStock: number;
  itemObservation: string;
}

export default function NewExitRequest() {
  const [, navigate] = useLocation();
  const submitInProgressRef = useRef(false);

  // Form state
  const [sector, setSector] = useState("");
  const [collaboratorName, setCollaboratorName] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [observations, setObservations] = useState("");
  const [items, setItems] = useState<RequestItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Current item being added
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [itemObservation, setItemObservation] = useState("");

  // Get products list (only estoque products)
  const { data: products } = trpc.products.list.useQuery({});

  // Create mutation
  const createMutation = trpc.exitRequests.create.useMutation({
    onSuccess: () => {
      navigate("/exit-requests");
    },
    onError: (error) => {
      alert("Erro ao criar requisição: " + error.message);
      setIsSubmitting(false);
      submitInProgressRef.current = false;
    },
  });

  const handleAddItem = () => {
    if (!selectedProductId) {
      alert("Selecione um produto");
      return;
    }
    if (quantity <= 0) {
      alert("Quantidade deve ser maior que zero");
      return;
    }

    const product = products?.find((p: any) => p.id === parseInt(selectedProductId));
    if (!product) return;

    // Check if product already added
    if (items.some((i) => i.productId === product.id)) {
      alert("Este produto já foi adicionado à requisição");
      return;
    }

    // Check stock availability
    if (quantity > product.currentQuantity) {
      alert(`Estoque insuficiente! Disponível: ${product.currentQuantity}`);
      return;
    }

    setItems([
      ...items,
      {
        productId: product.id,
        productDescription: product.description,
        quantityRequested: quantity,
        currentStock: product.currentQuantity,
        itemObservation,
      },
    ]);

    // Reset item form
    setSelectedProductId("");
    setQuantity(1);
    setItemObservation("");
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (submitInProgressRef.current) return;

    if (!sector) {
      alert("Selecione o setor");
      return;
    }
    if (!collaboratorName.trim()) {
      alert("Informe o nome do colaborador");
      return;
    }
    if (items.length === 0) {
      alert("Adicione pelo menos um item à requisição");
      return;
    }

    submitInProgressRef.current = true;
    setIsSubmitting(true);

    try {
      await createMutation.mutateAsync({
        sector,
        collaboratorName: collaboratorName.trim(),
        expectedDate: expectedDate || undefined,
        observations: observations || undefined,
        items: items.map((item) => ({
          productId: item.productId,
          quantityRequested: item.quantityRequested,
          itemObservation: item.itemObservation || undefined,
        })),
      });
    } catch (error) {
      // Error handled in onError
    } finally {
      setIsSubmitting(false);
      submitInProgressRef.current = false;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/exit-requests")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nova Requisição de Saída</h1>
          <p className="text-muted-foreground">
            Solicitar retirada de materiais do almoxarifado
          </p>
        </div>
      </div>

      {/* Dados da Requisição */}
      <Card>
        <CardHeader>
          <CardTitle>Dados da Requisição</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Setor *</Label>
              <Select value={sector} onValueChange={setSector}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o setor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="limpeza">Limpeza</SelectItem>
                  <SelectItem value="jardinagem">Jardinagem</SelectItem>
                  <SelectItem value="manutencao">Manutenção</SelectItem>
                  <SelectItem value="administrativo">Administrativo</SelectItem>
                  <SelectItem value="cozinha">Cozinha</SelectItem>
                  <SelectItem value="portaria">Portaria</SelectItem>
                  <SelectItem value="lavanderia">Lavanderia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Colaborador que vai retirar *</Label>
              <Input
                value={collaboratorName}
                onChange={(e) => setCollaboratorName(e.target.value)}
                placeholder="Nome do colaborador"
              />
            </div>
            <div className="space-y-2">
              <Label>Data prevista para retirada</Label>
              <Input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Observações gerais sobre a requisição..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Adicionar Itens */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Itens da Requisição
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Form para adicionar item */}
          <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
            <p className="text-sm font-medium">Adicionar Item</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Produto *</Label>
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products
                      ?.filter((p: any) => p.classification === "estoque")
                      .map((p: any) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.description} (Estoque: {p.currentQuantity})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Quantidade *</Label>
                <Input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Observação do item</Label>
                <Input
                  value={itemObservation}
                  onChange={(e) => setItemObservation(e.target.value)}
                  placeholder="Ex: Para uso no jardim frontal"
                />
              </div>
            </div>
            <Button onClick={handleAddItem} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-1" /> Adicionar Item
            </Button>
          </div>

          {/* Lista de itens */}
          {items.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Estoque Atual</TableHead>
                  <TableHead>Qtd. Solicitada</TableHead>
                  <TableHead>Observação</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.productDescription}</TableCell>
                    <TableCell>{item.currentStock}</TableCell>
                    <TableCell>{item.quantityRequested}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.itemObservation || "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>Nenhum item adicionado</p>
              <p className="text-xs">Selecione um produto e clique em "Adicionar Item"</p>
            </div>
          )}

          {/* Summary */}
          {items.length > 0 && (
            <div className="border-t pt-3 flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {items.length} item(ns) | Total: {items.reduce((acc, i) => acc + i.quantityRequested, 0)} unidade(s)
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate("/exit-requests")}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="bg-green-600 hover:bg-green-700"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSubmitting ? "Salvando..." : "Salvar Requisição"}
        </Button>
      </div>
    </div>
  );
}
