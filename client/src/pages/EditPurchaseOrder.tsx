import { useAuth } from "@/_core/hooks/useAuth";
import { can } from "@shared/roles";
'use client';

import { useState, useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ArrowLeft, Save, Loader, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { calcOrderTotals, formatBRL, itemTotal } from '@shared/orderTotals';

type EditItem = {
  key: string;
  productId: number | null;
  originalDescription: string;
  description: string;
  quantity: string;
  unitValue: string;
  discount: string;
  isSpecificUse: boolean;
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const normalize = (t: string) => t.trim().replace(/\s+/g, ' ').toLowerCase();

export default function EditPurchaseOrder() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams();
  const orderId = params?.id ? parseInt(params.id) : null;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<any>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [items, setItems] = useState<EditItem[] | null>(null);
  const [adjustment, setAdjustment] = useState('0');

  // Fetch order data
  const { data: order, isLoading: orderLoading } = trpc.purchaseOrders.getById.useQuery(
    orderId || 0,
    { enabled: !!orderId }
  );

  const { data: savedItems } = trpc.purchaseOrders.getItemsForEdit.useQuery(orderId || 0, { enabled: !!orderId });
  const { data: productList = [] } = trpc.products.list.useQuery({}) as any;

  // Fetch suppliers and cost centers
  const { data: suppliers = [] } = trpc.suppliers.list.useQuery() as any;
  const { data: costCenters = [] } = trpc.costCenters.list.useQuery() as any;

  // Mutations
  const updateMutation = trpc.purchaseOrders.update.useMutation({
    onSuccess: () => {
      toast.success('Ordem de compra atualizada com sucesso!');
      setLocation('/purchase-orders');
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
      setIsSaving(false);
    },
  });

  const updateStatusMutation = trpc.purchaseOrders.updateStatus.useMutation({
    onSuccess: () => {
      toast.success('Status atualizado com sucesso!');
      setShowStatusDialog(false);
      setLocation('/purchase-orders');
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    },
  });

  // Initialize form data when order is loaded
  useEffect(() => {
    if (order && !formData) {
      setFormData({
        orderNumber: order.orderNumber || '',
        supplierId: order.supplierId?.toString() || '',
        costCenterId: order.costCenterId?.toString() || '',
        totalValue: order.totalValue || '0',
        observations: order.observations || '',
        paymentMethod: order.paymentMethod || 'a_vista',
        installments: order.installments || 1,
        status: order.status || 'solicitado',
      });
      setIsLoading(false);
    }
  }, [order, formData]);

  // Carrega os produtos da ordem uma única vez
  useEffect(() => {
    if (order && savedItems && !items) {
      const savedSum = savedItems.reduce((sum: number, it: any) => sum + parseFloat(it.totalValue || '0'), 0);
      setItems(
        savedItems.map((it: any) => {
          const gross = it.quantity * parseFloat(it.unitValue || '0');
          return {
            key: `saved-${it.id}`,
            productId: it.productId ?? null,
            originalDescription: it.description,
            description: it.description,
            quantity: String(it.quantity),
            unitValue: String(parseFloat(it.unitValue || '0')),
            discount: String(Math.max(0, round2(gross - parseFloat(it.totalValue || '0')))),
            isSpecificUse: !!it.isSpecificUse,
          };
        })
      );
      // frete, impostos e descontos gerais que já estavam no total salvo
      setAdjustment(String(round2(parseFloat(order.totalValue || '0') - savedSum)));
    }
  }, [order, savedItems, items]);

  if (!orderId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Ordem de compra não encontrada</p>
      </div>
    );
  }

  if (isLoading || orderLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Carregando ordem de compra...</p>
        </div>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Erro ao carregar ordem de compra</p>
      </div>
    );
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData({
      ...formData,
      [field]: value,
    });
  };

  // Produtos só podem ser editados enquanto a ordem está "Solicitado" (depois de entregue já deu entrada no estoque)
  const canEditItems = formData.status === 'solicitado' && can(user?.role, 'manageOrders');
  const totals = calcOrderTotals({ items: items ?? [] });
  const adjustmentNumber = parseFloat(adjustment.replace(',', '.')) || 0;
  const editedTotal = Math.max(0, round2(totals.subtotal + adjustmentNumber));
  const displayTotal = canEditItems && items ? editedTotal : parseFloat(formData.totalValue || '0');

  const updateItem = (key: string, patch: Partial<EditItem>) =>
    setItems((prev) => (prev ? prev.map((it) => (it.key === key ? { ...it, ...patch } : it)) : prev));
  const addItem = () =>
    setItems((prev) => [
      ...(prev ?? []),
      { key: `new-${Date.now()}-${Math.random()}`, productId: null, originalDescription: '', description: '', quantity: '1', unitValue: '0', discount: '0', isSpecificUse: false },
    ]);
  const removeItem = (key: string) => setItems((prev) => (prev ? prev.filter((it) => it.key !== key) : prev));

  const handleSave = async () => {
    if (!formData.supplierId || !formData.costCenterId) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (canEditItems && items) {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const qty = parseFloat(it.quantity);
        if (!it.description.trim()) return toast.error(`Produto ${i + 1}: informe a descrição`);
        if (!Number.isInteger(qty) || qty < 1) return toast.error(`Produto ${i + 1}: a quantidade precisa ser um número inteiro maior que zero`);
        if (!(parseFloat(it.unitValue) >= 0)) return toast.error(`Produto ${i + 1}: informe o valor unitário`);
        if (itemTotal(it) < 0) return toast.error(`Produto ${i + 1}: o desconto é maior que o valor do produto`);
      }
    }

    setIsSaving(true);
    try {
      await updateMutation.mutateAsync({
        id: orderId,
        supplierId: parseInt(formData.supplierId),
        costCenterId: parseInt(formData.costCenterId),
        observations: formData.observations,
        paymentMethod: formData.paymentMethod,
        installments: parseInt(formData.installments),
        ...(canEditItems && items
          ? {
              items: items.map((it) => {
                // mantém o vínculo com o produto cadastrado se a descrição não mudou;
                // se mudou, usa o produto de mesmo nome (se existir) ou deixa para criar na entrega
                const match = productList.find((p: any) => normalize(p.description || '') === normalize(it.description));
                const productId = it.description === it.originalDescription ? it.productId : match?.id ?? null;
                return {
                  productId,
                  description: it.description,
                  quantity: parseFloat(it.quantity),
                  unitValue: parseFloat(it.unitValue) || 0,
                  discount: parseFloat(it.discount) || 0,
                  isSpecificUse: it.isSpecificUse,
                };
              }),
              adjustment: parseFloat(adjustment.replace(',', '.')) || 0,
            }
          : { totalValue: formData.totalValue }),
      });
    } catch (error) {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async () => {
    if (!newStatus) {
      toast.error('Selecione um status');
      return;
    }

    try {
      await updateStatusMutation.mutateAsync({
        id: orderId,
        status: newStatus as any,
      });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'solicitado':
        return 'Solicitado';
      case 'entregue':
        return 'Entregue';
      case 'cancelada':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'solicitado':
        return 'bg-yellow-100 text-yellow-800';
      case 'entregue':
        return 'bg-green-100 text-green-800';
      case 'cancelada':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const supplierName =
    suppliers.find((s: any) => s.id === parseInt(formData.supplierId))?.companyName || 'N/A';
  const costCenterName =
    costCenters.find((c: any) => c.id === parseInt(formData.costCenterId))?.name || 'N/A';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/purchase-orders')}
              className="mr-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Editar Ordem de Compra</h1>
              <p className="text-sm text-gray-500">Atualize as informações da ordem de compra</p>
            </div>
          </div>
          <div className="flex gap-2">
            {can(user?.role, "deliverOrders") && (
<Button
              variant="outline"
              onClick={() => {
                setNewStatus(formData.status);
                setShowStatusDialog(true);
              }}
            >
              Alterar Status
            </Button>
)}
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 gap-2"
            >
              {isSaving ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Dados Gerais */}
            <Card>
              <CardHeader>
                <CardTitle>Dados Gerais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="orderNumber">Código da Ordem</Label>
                    <Input
                      id="orderNumber"
                      value={formData.orderNumber}
                      readOnly
                      disabled
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="supplier">Fornecedor *</Label>
                    <Select
                      value={formData.supplierId}
                      onValueChange={(value) => handleInputChange('supplierId', value)}
                    >
                      <SelectTrigger id="supplier" className="mt-1">
                        <SelectValue placeholder="Selecione um fornecedor" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((supplier: any) => (
                          <SelectItem key={supplier.id} value={supplier.id.toString()}>
                            {supplier.companyName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="costCenter">Centro de Custo *</Label>
                    <Select
                      value={formData.costCenterId}
                      onValueChange={(value) => handleInputChange('costCenterId', value)}
                    >
                      <SelectTrigger id="costCenter" className="mt-1">
                        <SelectValue placeholder="Selecione um centro de custo" />
                      </SelectTrigger>
                      <SelectContent>
                        {costCenters.map((center: any) => (
                          <SelectItem key={center.id} value={center.id.toString()}>
                            {center.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="paymentMethod">Forma de Pagamento *</Label>
                    <Select
                      value={formData.paymentMethod}
                      onValueChange={(value) => handleInputChange('paymentMethod', value)}
                    >
                      <SelectTrigger id="paymentMethod" className="mt-1">
                        <SelectValue placeholder="Selecione a forma de pagamento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="a_vista">À Vista</SelectItem>
                        <SelectItem value="parcelado">Parcelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.paymentMethod === 'parcelado' && (
                  <div>
                    <Label htmlFor="installments">Número de Parcelas</Label>
                    <Input
                      id="installments"
                      type="number"
                      value={formData.installments}
                      onChange={(e) => handleInputChange('installments', e.target.value)}
                      min="1"
                      className="mt-1"
                    />
                  </div>
                )}

                {!canEditItems && (
                  <div>
                    <Label htmlFor="totalValue">Valor Total</Label>
                    <Input
                      id="totalValue"
                      type="number"
                      value={formData.totalValue}
                      onChange={(e) => handleInputChange('totalValue', e.target.value)}
                      step="0.01"
                      placeholder="0.00"
                      className="mt-1"
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="observations">Observações</Label>
                  <textarea
                    id="observations"
                    value={formData.observations}
                    onChange={(e) => handleInputChange('observations', e.target.value)}
                    placeholder="Digite as observações da ordem de compra..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1"
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Produtos da ordem */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <CardTitle>Produtos</CardTitle>
                  {canEditItems && (
                    <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1">
                      <Plus className="w-4 h-4" /> Adicionar produto
                    </Button>
                  )}
                </div>
                {!canEditItems && (
                  <p className="text-sm text-muted-foreground">
                    {formData.status === 'entregue'
                      ? 'Esta ordem já foi entregue e deu entrada no estoque. Para editar os produtos, volte o status para "Solicitado" (isso desfaz a entrada no estoque).'
                      : formData.status === 'cancelada'
                        ? 'Ordens canceladas não podem ter os produtos editados.'
                        : 'Seu perfil não pode editar os produtos desta ordem.'}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <datalist id="produtos-cadastrados">
                  {productList.map((p: any) => (
                    <option key={p.id} value={p.description} />
                  ))}
                </datalist>

                {!items ? (
                  <p className="text-sm text-gray-500">Carregando produtos...</p>
                ) : items.length === 0 ? (
                  <p className="text-sm text-gray-500">Nenhum produto nesta ordem.</p>
                ) : (
                  items.map((it, index) => (
                    <div key={it.key} className="rounded-lg border border-gray-200 p-4 space-y-3">
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <Label>Descrição do produto *</Label>
                          <Input
                            list="produtos-cadastrados"
                            value={it.description}
                            disabled={!canEditItems}
                            onChange={(e) => updateItem(it.key, { description: e.target.value })}
                            placeholder="Digite ou escolha um produto cadastrado"
                            className="mt-1"
                          />
                        </div>
                        {canEditItems && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="mt-6 text-red-600 hover:bg-red-50"
                            onClick={() => removeItem(it.key)}
                            aria-label={`Remover produto ${index + 1}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <Label>Quantidade *</Label>
                          <Input type="number" min="1" step="1" value={it.quantity} disabled={!canEditItems}
                            onChange={(e) => updateItem(it.key, { quantity: e.target.value })} className="mt-1" />
                        </div>
                        <div>
                          <Label>Valor unitário (R$) *</Label>
                          <Input type="number" min="0" step="0.01" value={it.unitValue} disabled={!canEditItems}
                            onChange={(e) => updateItem(it.key, { unitValue: e.target.value })} className="mt-1" />
                        </div>
                        <div>
                          <Label>Desconto (R$)</Label>
                          <Input type="number" min="0" step="0.01" value={it.discount} disabled={!canEditItems}
                            onChange={(e) => updateItem(it.key, { discount: e.target.value })} className="mt-1" />
                        </div>
                        <div>
                          <Label>Subtotal</Label>
                          <p className="mt-1 h-9 flex items-center font-semibold text-gray-900">{formatBRL(itemTotal(it))}</p>
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input type="checkbox" checked={it.isSpecificUse} disabled={!canEditItems}
                          onChange={(e) => updateItem(it.key, { isSpecificUse: e.target.checked })} className="w-4 h-4" />
                        Produto de uso específico (não entra no saldo do estoque)
                      </label>
                    </div>
                  ))
                )}

                {canEditItems && items && (
                  <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div>
                      <Label htmlFor="adjustment">Frete, impostos e descontos gerais (R$)</Label>
                      <Input id="adjustment" type="number" step="0.01" value={adjustment}
                        onChange={(e) => setAdjustment(e.target.value)} className="mt-1" />
                      <p className="text-xs text-muted-foreground mt-1">
                        Valor que já estava no total além dos produtos. Positivo soma, negativo desconta.
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Produtos: <strong>{formatBRL(totals.subtotal)}</strong></p>
                      <p className="text-sm text-gray-600">Total da ordem</p>
                      <p className="text-2xl font-bold text-green-700">{formatBRL(editedTotal)}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Status Atual</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Situação</p>
                  <span
                    className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(
                      formData.status
                    )}`}
                  >
                    {getStatusLabel(formData.status)}
                  </span>
                </div>
                {can(user?.role, "deliverOrders") && (
<Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setNewStatus(formData.status);
                    setShowStatusDialog(true);
                  }}
                >
                  Alterar Status
                </Button>
)}
              </CardContent>
            </Card>

            {/* Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Fornecedor</p>
                  <p className="font-semibold text-gray-900">{supplierName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Centro de Custo</p>
                  <p className="font-semibold text-gray-900">{costCenterName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Valor Total</p>
                  <p className="font-semibold text-gray-900">
                    {formatBRL(displayTotal)}
                  </p>
                </div>
                <div className="pt-3 border-t border-gray-200">
                  <p className="text-sm text-gray-600">Forma de Pagamento</p>
                  <p className="font-semibold text-gray-900">
                    {formData.paymentMethod === 'a_vista' ? 'À Vista' : 'Parcelado'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Status Change Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Status da Ordem</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newStatus">Novo Status</Label>
              <p className="text-xs text-muted-foreground mt-1 mb-2">
                Marcar como Entregue dá entrada dos itens no estoque. Voltar para Solicitado desfaz essa entrada (só é possível se os itens ainda estiverem no estoque).
              </p>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger id="newStatus" className="mt-1">
                  <SelectValue placeholder="Selecione um novo status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solicitado">Solicitado</SelectItem>
                  <SelectItem value="entregue">Entregue (dá entrada no estoque)</SelectItem>
                  {can(user?.role, "manageOrders") && <SelectItem value="cancelada">Cancelado</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowStatusDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleStatusChange}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
