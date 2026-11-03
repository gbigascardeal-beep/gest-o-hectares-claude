'use client';

import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Eye, Edit2, Trash2, Printer, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { generatePurchaseOrderPrint } from '@/components/PurchaseOrderPrint';

export default function PurchaseOrders() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewingOrder, setViewingOrder] = useState<any>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch purchase orders
  const { data: orders = [], isLoading, refetch } = trpc.purchaseOrders.list.useQuery({});

  // Mutations
  const deleteMutation = trpc.purchaseOrders.delete.useMutation({
    onSuccess: () => {
      toast.success('Ordem de compra excluída com sucesso!');
      setShowDeleteDialog(false);
      setDeleteConfirmId(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    },
  });

  // Filter and search orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order: any) => {
      const matchesSearch =
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.supplierName && order.supplierName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = !statusFilter || order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  // Format currency
  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(num);
  };

  // Format date
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('pt-BR');
  };

  // Format datetime
  const formatDateTime = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleString('pt-BR');
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800';
      case 'aprovada':
        return 'bg-blue-100 text-blue-800';
      case 'finalizada':
        return 'bg-green-100 text-green-800';
      case 'cancelada':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get status label
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'Solicitado';
      case 'aprovada':
        return 'Aprovado';
      case 'finalizada':
        return 'Finalizado';
      case 'cancelada':
        return 'Cancelado';
      default:
        return status;
    }
  };

  // Handle view
  const handleView = (order: any) => {
    setViewingOrder(order);
    setShowViewDialog(true);
  };

  // Handle edit
  const handleEdit = (orderId: number) => {
    setLocation(`/purchase-orders/edit/${orderId}`);
  };

  // Handle delete
  const handleDeleteClick = (orderId: number) => {
    setDeleteConfirmId(orderId);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirmId) {
      await deleteMutation.mutateAsync(deleteConfirmId);
    }
  };

  // Handle print
  const handlePrint = (order: any) => {
    const html = generatePurchaseOrderPrint(order);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ordens de Compra</h1>
          <p className="text-sm text-gray-600 mt-1">Gestão de todas as ordens de compra do sistema</p>
        </div>
        <Button
          onClick={() => setLocation('/purchase-orders/new')}
          className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
        >
          <Plus className="w-4 h-4" />
          Nova Ordem
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por código ou fornecedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="w-48">
          <label className="block text-sm font-medium text-gray-700 mb-2">Situação</label>
          <Select value={statusFilter || 'all'} onValueChange={(value) => setStatusFilter(value === 'all' ? '' : value)}>
            <SelectTrigger>
              <SelectValue placeholder="Todas as situações" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as situações</SelectItem>
              <SelectItem value="pendente">Solicitado</SelectItem>
              <SelectItem value="aprovada">Aprovado</SelectItem>
              <SelectItem value="finalizada">Finalizado</SelectItem>
              <SelectItem value="cancelada">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-600">Carregando ordens de compra...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <p className="text-gray-600">Nenhuma ordem de compra encontrada</p>
            <Button
              onClick={() => setLocation('/purchase-orders/new')}
              variant="outline"
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Criar primeira ordem
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 border-b border-gray-200">
                <TableHead className="font-bold text-gray-900 py-4 px-6">Código</TableHead>
                <TableHead className="font-bold text-gray-900 py-4 px-6">Fornecedor</TableHead>
                <TableHead className="font-bold text-gray-900 py-4 px-6">Data</TableHead>
                <TableHead className="font-bold text-gray-900 py-4 px-6">Situação</TableHead>
                <TableHead className="font-bold text-gray-900 py-4 px-6 text-right">Valor</TableHead>
                <TableHead className="font-bold text-gray-900 py-4 px-6">Cadastrado em</TableHead>
                <TableHead className="font-bold text-gray-900 py-4 px-6 text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order: any) => (
                <TableRow key={order.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <TableCell className="py-4 px-6 font-medium text-gray-900">
                    <a href={`#`} className="text-blue-600 hover:underline">
                      {order.orderNumber}
                    </a>
                  </TableCell>
                  <TableCell className="py-4 px-6 text-gray-700">
                    {order.supplierName || 'N/A'}
                  </TableCell>
                  <TableCell className="py-4 px-6 text-gray-700">
                    {formatDate(order.createdAt)}
                  </TableCell>
                  <TableCell className="py-4 px-6">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {getStatusLabel(order.status)}
                    </span>
                  </TableCell>
                  <TableCell className="py-4 px-6 text-gray-900 font-medium text-right">
                    {formatCurrency(order.totalValue)}
                  </TableCell>
                  <TableCell className="py-4 px-6 text-gray-700 text-sm">
                    {formatDateTime(order.createdAt)}
                  </TableCell>
                  <TableCell className="py-4 px-6">
                    <div className="flex gap-2 justify-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-blue-600 hover:bg-blue-50"
                        title="Visualizar"
                        onClick={() => handleView(order)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-orange-600 hover:bg-orange-50"
                        title="Editar"
                        onClick={() => handleEdit(order.id)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50"
                        title="Excluir"
                        onClick={() => handleDeleteClick(order.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-green-600 hover:bg-green-50"
                        title="Imprimir"
                        onClick={() => handlePrint(order)}
                      >
                        <Printer className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Summary */}
      {filteredOrders.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p className="text-sm text-gray-700">
            <span className="font-medium">{filteredOrders.length}</span> ordem(ns) de compra
            {statusFilter && ` com situação "${getStatusLabel(statusFilter)}"`}
            {searchTerm && ` contendo "${searchTerm}"`}
          </p>
        </div>
      )}

      {/* View Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Ordem de Compra</DialogTitle>
          </DialogHeader>
          {viewingOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Código</label>
                  <p className="text-lg font-semibold text-gray-900">{viewingOrder.orderNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Fornecedor</label>
                  <p className="text-lg font-semibold text-gray-900">{viewingOrder.supplierName || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Data de Emissão</label>
                  <p className="text-lg font-semibold text-gray-900">{formatDate(viewingOrder.createdAt)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Situação</label>
                  <p className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(viewingOrder.status)}`}>
                    {getStatusLabel(viewingOrder.status)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Forma de Pagamento</label>
                  <p className="text-lg font-semibold text-gray-900">
                    {viewingOrder.paymentMethod === 'a_vista' ? 'À Vista' : 'Parcelado'}
                  </p>
                </div>
                {viewingOrder.paymentMethod === 'parcelado' && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Número de Parcelas</label>
                    <p className="text-lg font-semibold text-gray-900">{viewingOrder.installments || 1}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-600">Valor Total</label>
                  <p className="text-lg font-semibold text-gray-900">{formatCurrency(viewingOrder.totalValue)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Cadastrado em</label>
                  <p className="text-lg font-semibold text-gray-900">{formatDateTime(viewingOrder.createdAt)}</p>
                </div>
              </div>
              {viewingOrder.observations && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Observações</label>
                  <p className="text-gray-900 whitespace-pre-wrap">{viewingOrder.observations}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowViewDialog(false)}
            >
              Fechar
            </Button>
            <Button
              onClick={() => {
                setShowViewDialog(false);
                handleEdit(viewingOrder.id);
              }}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-gray-700">
            Tem certeza que deseja excluir esta ordem de compra? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setDeleteConfirmId(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
