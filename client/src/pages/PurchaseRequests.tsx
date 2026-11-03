import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLocation } from "wouter";
import {
  Eye,
  Edit2,
  Trash2,
  Plus,
  Search,
  Filter,
  X,
  RefreshCw,
} from "lucide-react";

type PriorityType = "baixa" | "media" | "alta" | "urgente";
type StatusType = "mercado_livre" | "em_negociacao" | "aguardando_entrega" | "aguardando_aprovacao" | "finalizado" | "aguardando_detalhes";

const priorityLabels: Record<PriorityType, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

const statusLabels: Record<StatusType, string> = {
  mercado_livre: "Mercado Livre",
  em_negociacao: "Em Negociação",
  aguardando_entrega: "Aguardando Entrega",
  aguardando_aprovacao: "Aguardando Aprovação",
  finalizado: "Finalizado",
  aguardando_detalhes: "Aguardando Detalhes do Pedido",
};

const priorityColors: Record<PriorityType, string> = {
  baixa: "bg-blue-100 text-blue-800",
  media: "bg-yellow-100 text-yellow-800",
  alta: "bg-orange-100 text-orange-800",
  urgente: "bg-red-100 text-red-800",
};

const statusColors: Record<StatusType, string> = {
  mercado_livre: "bg-yellow-100 text-yellow-800",
  em_negociacao: "bg-blue-100 text-blue-800",
  aguardando_entrega: "bg-purple-100 text-purple-800",
  aguardando_aprovacao: "bg-orange-100 text-orange-800",
  finalizado: "bg-green-100 text-green-800",
  aguardando_detalhes: "bg-gray-100 text-gray-800",
};

export default function PurchaseRequests() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [sectorFilter, setSectorFilter] = useState<string>("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [statusChangeId, setStatusChangeId] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("");

  const { data: requests = [], isLoading } = trpc.purchaseRequests.list.useQuery(
    {
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
      sector: sectorFilter || undefined,
      search: search || undefined,
    }
  );

  const { data: stats } = trpc.purchaseRequests.stats.useQuery({});
  const deleteMutation = trpc.purchaseRequests.delete.useMutation();
  const updateStatusMutation = trpc.purchaseRequests.updateStatus.useMutation();
  const utils = trpc.useUtils();

  const filteredRequests = useMemo(() => {
    return requests.filter((req: any) => {
      const searchLower = search.toLowerCase();
      return (
        req.number.toLowerCase().includes(searchLower) ||
        (req.requesterName?.toLowerCase() || "").includes(searchLower) ||
        (req.costCenterName?.toLowerCase() || "").includes(searchLower)
      );
    });
  }, [requests, search]);

  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setPriorityFilter("");
    setSectorFilter("");
  };

  const hasActiveFilters =
    search || statusFilter || priorityFilter || sectorFilter;

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("pt-BR");
  };

  const formatCurrency = (value: number | string) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(num);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Solicitações de Compras</h1>
          <p className="text-gray-600 mt-1">
            Gerencie todas as suas solicitações de compra
          </p>
        </div>
        <Button
          onClick={() => navigate("/purchase-requests/new")}
          className="gap-2 bg-green-600 hover:bg-green-700"
        >
          <Plus className="h-4 w-4" />
          Nova Solicitação
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {stats?.pending || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Em Negociação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats?.inNegotiation || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Urgentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats?.urgent || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Finalizados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats?.finished || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por número..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter || "all"} onValueChange={(val) => setStatusFilter(val === "all" ? "" : val)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="mercado_livre">Mercado Livre</SelectItem>
                <SelectItem value="em_negociacao">Em Negociação</SelectItem>
                <SelectItem value="aguardando_entrega">Aguardando Entrega</SelectItem>
                <SelectItem value="aguardando_aprovacao">Aguardando Aprovação</SelectItem>
                <SelectItem value="finalizado">Finalizado</SelectItem>
                <SelectItem value="aguardando_detalhes">Aguardando Detalhes</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter || "all"} onValueChange={(val) => setPriorityFilter(val === "all" ? "" : val)}>
              <SelectTrigger>
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="baixa">Baixa</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="urgente">Urgente</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sectorFilter || "all"} onValueChange={(val) => setSectorFilter(val === "all" ? "" : val)}>
              <SelectTrigger>
                <SelectValue placeholder="Setor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="administrativo">Administrativo</SelectItem>
                <SelectItem value="operacional">Operacional</SelectItem>
                <SelectItem value="manutencao">Manutenção</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={handleClearFilters}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Limpar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <p className="text-lg font-medium">
                Nenhuma solicitação encontrada
              </p>
              <p className="text-sm">
                Crie uma nova solicitação para começar
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">Número</TableHead>
                    <TableHead className="font-semibold">Data</TableHead>
                    <TableHead className="font-semibold">Solicitante</TableHead>
                    <TableHead className="font-semibold">Setor</TableHead>
                    <TableHead className="font-semibold text-right">
                      Prioridade
                    </TableHead>
                    <TableHead className="font-semibold text-right">
                      Status
                    </TableHead>
                    <TableHead className="font-semibold text-right">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request: any) => (
                    <TableRow key={request.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">
                        {request.number}
                      </TableCell>
                      <TableCell>{formatDate(request.date)}</TableCell>
                      <TableCell>{request.requesterName || "-"}</TableCell>
                      <TableCell>{request.sector}</TableCell>
                      <TableCell className="text-right">
                        <Badge
                          className={priorityColors[request.priority as PriorityType]}
                        >
                          {priorityLabels[request.priority as PriorityType]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          className={statusColors[request.status as StatusType]}
                        >
                          {statusLabels[request.status as StatusType]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              navigate(
                                `/purchase-requests/${request.id}`
                              )
                            }
                            title="Visualizar"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              navigate(
                                `/purchase-requests/${request.id}/edit`
                              )
                            }
                            title="Editar"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setStatusChangeId(request.id);
                              setSelectedStatus(request.status);
                            }}
                            title="Alterar Status"
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteId(request.id)}
                            title="Excluir"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Change Dialog */}
      <Dialog open={statusChangeId !== null} onOpenChange={() => setStatusChangeId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Status da Solicitação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o novo status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mercado_livre">Mercado Livre</SelectItem>
                <SelectItem value="em_negociacao">Em Negociação</SelectItem>
                <SelectItem value="aguardando_entrega">Aguardando Entrega</SelectItem>
                <SelectItem value="aguardando_aprovacao">Aguardando Aprovação</SelectItem>
                <SelectItem value="finalizado">Finalizado</SelectItem>
                <SelectItem value="aguardando_detalhes">Aguardando Detalhes do Pedido</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setStatusChangeId(null)}>Cancelar</Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={async () => {
                  if (statusChangeId && selectedStatus) {
                    try {
                      await updateStatusMutation.mutateAsync({
                        id: statusChangeId,
                        newStatus: selectedStatus as any,
                      });
                      await utils.purchaseRequests.list.invalidate();
                      await utils.purchaseRequests.stats.invalidate();
                      setStatusChangeId(null);
                    } catch (error) {
                      console.error("Erro ao alterar status:", error);
                    }
                  }
                }}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Excluir Solicitação de Compra</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir esta solicitação de compra? Esta ação não pode ser desfeita. Esta
            ação não pode ser desfeita.
          </AlertDialogDescription>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>Não, manter</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-600 hover:bg-red-700"
              onClick={async () => {
                if (deleteId) {
                  try {
                    await deleteMutation.mutateAsync(deleteId);
                    await utils.purchaseRequests.list.invalidate();
                    await utils.purchaseRequests.stats.invalidate();
                    setDeleteId(null);
                  } catch (error) {
                    console.error("Erro ao excluir:", error);
                  }
                }
              }}
            >
              Sim, excluir
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
