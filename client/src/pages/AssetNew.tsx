import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export default function AssetNew() {
  const [, setLocation] = useLocation();
  const { data: categories = [] } = trpc.assets.categories.list.useQuery();
  const { data: locations = [] } = trpc.assets.locations.list.useQuery();
  const { data: suppliers = [] } = trpc.suppliers.list.useQuery() as any;

  const [form, setForm] = useState({
    description: "", categoryId: "", subcategoryId: "", brand: "", model: "",
    serialNumber: "", manufacturerId: "", barcode: "",
    status: "ativo", conservationState: "novo",
    locationId: "", responsibleId: "", sectorId: "",
    acquisitionDate: "", entryDate: new Date().toISOString().split("T")[0],
    acquisitionValue: "", currentValue: "", supplierId: "",
    invoiceNumber: "", invoiceSeries: "", orderNumber: "",
    acquisitionType: "compra", warrantyMonths: "", warrantyStart: "", warrantyEnd: "",
    observations: "",
  });

  const createMutation = trpc.assets.create.useMutation({
    onSuccess: () => {
      toast.success("Patrimônio cadastrado com sucesso!");
      setLocation("/patrimonio/bens");
    },
    onError: (err) => toast.error(err.message || "Erro ao cadastrar patrimônio"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description) { toast.error("Informe a descrição do patrimônio"); return; }
    createMutation.mutate({
      description: form.description,
      categoryId: form.categoryId ? parseInt(form.categoryId) : undefined,
      subcategoryId: form.subcategoryId ? parseInt(form.subcategoryId) : undefined,
      brand: form.brand || undefined,
      model: form.model || undefined,
      serialNumber: form.serialNumber || undefined,
      manufacturerId: form.manufacturerId || undefined,
      barcode: form.barcode || undefined,
      status: form.status || undefined,
      conservationState: form.conservationState || undefined,
      locationId: form.locationId ? parseInt(form.locationId) : undefined,
      supplierId: form.supplierId ? parseInt(form.supplierId) : undefined,
      acquisitionDate: form.acquisitionDate || undefined,
      entryDate: form.entryDate || undefined,
      acquisitionValue: form.acquisitionValue || undefined,
      currentValue: form.currentValue || undefined,
      invoiceNumber: form.invoiceNumber || undefined,
      invoiceSeries: form.invoiceSeries || undefined,
      orderNumber: form.orderNumber || undefined,
      acquisitionType: form.acquisitionType || undefined,
      warrantyMonths: form.warrantyMonths ? parseInt(form.warrantyMonths) : undefined,
      warrantyStart: form.warrantyStart || undefined,
      warrantyEnd: form.warrantyEnd || undefined,
      observations: form.observations || undefined,
    });
  };

  const subcategories = categories.filter((c: any) => c.parentId === (form.categoryId ? parseInt(form.categoryId) : null));

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => setLocation("/patrimonio/bens")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Novo Patrimônio</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identificação */}
        <Card>
          <CardHeader><CardTitle>Identificação</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Descrição *</Label>
              <Input placeholder="Ex: Furadeira Bosch GSB 550" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoria</Label>
                <Select value={form.categoryId || "none"} onValueChange={(v) => setForm({ ...form, categoryId: v === "none" ? "" : v, subcategoryId: "" })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {categories.filter((c: any) => !c.parentId).map((c: any) => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subcategoria</Label>
                <Select value={form.subcategoryId || "none"} onValueChange={(v) => setForm({ ...form, subcategoryId: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {subcategories.map((c: any) => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Marca</Label><Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></div>
              <div><Label>Modelo</Label><Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Número de Série</Label><Input value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} /></div>
              <div><Label>Código de Barras</Label><Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} /></div>
            </div>
          </CardContent>
        </Card>

        {/* Situação */}
        <Card>
          <CardHeader><CardTitle>Situação e Conservação</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <Label>Situação</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="em_uso">Em Uso</SelectItem>
                  <SelectItem value="em_estoque">Em Estoque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Estado de Conservação</Label>
              <Select value={form.conservationState} onValueChange={(v) => setForm({ ...form, conservationState: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="novo">Novo</SelectItem>
                  <SelectItem value="excelente">Excelente</SelectItem>
                  <SelectItem value="bom">Bom</SelectItem>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="ruim">Ruim</SelectItem>
                  <SelectItem value="inservivel">Inservível</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Localização</Label>
              <Select value={form.locationId || "none"} onValueChange={(v) => setForm({ ...form, locationId: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {locations.map((l: any) => (
                    <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Aquisição */}
        <Card>
          <CardHeader><CardTitle>Aquisição</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Data de Aquisição</Label><Input type="date" value={form.acquisitionDate} onChange={(e) => setForm({ ...form, acquisitionDate: e.target.value })} /></div>
              <div><Label>Data de Entrada</Label><Input type="date" value={form.entryDate} onChange={(e) => setForm({ ...form, entryDate: e.target.value })} /></div>
              <div>
                <Label>Forma de Aquisição</Label>
                <Select value={form.acquisitionType} onValueChange={(v) => setForm({ ...form, acquisitionType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compra">Compra</SelectItem>
                    <SelectItem value="doacao">Doação</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                    <SelectItem value="incorporacao">Incorporação</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Valor de Aquisição (R$)</Label><Input type="number" step="0.01" placeholder="0.00" value={form.acquisitionValue} onChange={(e) => setForm({ ...form, acquisitionValue: e.target.value })} /></div>
              <div><Label>Nº Nota Fiscal</Label><Input value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} /></div>
              <div>
                <Label>Fornecedor</Label>
                <Select value={form.supplierId || "none"} onValueChange={(v) => setForm({ ...form, supplierId: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {suppliers.map((s: any) => (
                      <SelectItem key={s.id} value={s.id.toString()}>{s.companyName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Garantia (meses)</Label><Input type="number" value={form.warrantyMonths} onChange={(e) => setForm({ ...form, warrantyMonths: e.target.value })} /></div>
              <div><Label>Início Garantia</Label><Input type="date" value={form.warrantyStart} onChange={(e) => setForm({ ...form, warrantyStart: e.target.value })} /></div>
              <div><Label>Fim Garantia</Label><Input type="date" value={form.warrantyEnd} onChange={(e) => setForm({ ...form, warrantyEnd: e.target.value })} /></div>
            </div>
          </CardContent>
        </Card>

        {/* Observações */}
        <Card>
          <CardHeader><CardTitle>Observações</CardTitle></CardHeader>
          <CardContent>
            <textarea
              className="w-full border rounded-md p-3 min-h-[100px] text-sm"
              placeholder="Observações sobre o patrimônio..."
              value={form.observations}
              onChange={(e) => setForm({ ...form, observations: e.target.value })}
            />
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700 flex-1" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Cadastrando..." : "Cadastrar Patrimônio"}
          </Button>
          <Button type="button" variant="outline" onClick={() => setLocation("/patrimonio/bens")}>Cancelar</Button>
        </div>
      </form>
    </div>
  );
}
