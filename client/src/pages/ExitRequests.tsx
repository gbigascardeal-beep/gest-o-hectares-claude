import { useState } from "react";
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
import { useLocation } from "wouter";
import {
  Eye,
  Trash2,
  Plus,
  Search,
  Filter,
  X,
  Package,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";


type StatusType = "aguardando_retirada" | "parcialmente_retirado" | "retirado" | "cancelado";

const statusLabels: Record<StatusType, string> = {
  aguardando_retirada: "Aguardando Retirada",
  parcialmente_retirado: "Parcialmente Retirado",
  retirado: "Retirado",
  cancelado: "Cancelado",
};

const statusColors: Record<StatusType, string> = {
  aguardando_retirada: "bg-yellow-100 text-yellow-800",
  parcialmente_retirado: "bg-blue-100 text-blue-800",
  retirado: "bg-green-100 text-green-800",
  cancelado: "bg-red-100 text-red-800",
};

export default function ExitRequests() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sectorFilter, setSectorFilter] = useState<string>("");
  const [deleteId, setDeleteId] = useState<number | null>(null);


  const { data: requests, isLoading } = trpc.exitRequests.list.useQuery({
    status: statusFilter || undefined,
    sector: sectorFilter || undefined,
    search: search || undefined,
  });

  const deleteMutation = trpc.exitRequests.delete.useMutation({
    onSuccess: () => {
      alert("Requisição excluída com sucesso");
      setDeleteId(null);
      trpc.useUtils().exitRequests.list.invalidate();
    },
    onError: (error) => {
      alert("Erro ao excluir: " + error.message);
    },
  });

  const utils = trpc.useUtils();

  const handleDelete = () => {
    if (deleteId) {
      deleteMutation.mutate({ id: deleteId });
    }
  };

  // Stats
  const stats = {
    aguardando: requests?.filter((r) => r.status === "aguardando_retirada").length || 0,
    parcial: requests?.filter((r) => r.status === "parcialmente_retirado").length || 0,
    retirado: requests?.filter((r) => r.status === "retirado").length || 0,
    total: requests?.length || 0,
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setSectorFilter("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Requisições de Saída</h1>
          <p className="text-muted-foreground">
            Controle de retirada de materiais do almoxarifado
          </p>
        </div>
        <Button onClick={() => navigate("/exit-requests/new")} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" />
          Nova Requisição
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="w-8 h-8 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold">{stats.aguardando}</p>
              <p className="text-xs text-muted-foreground">Aguardando Retirada</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{stats.parcial}</p>
              <p className="text-xs text-muted-foreground">Parcialmente Retirado</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{stats.retirado}</p>
              <p className="text-xs text-muted-foreground">Retirado</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Package className="w-8 h-8 text-gray-500" />
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total de Requisições</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número, colaborador ou setor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[200px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="aguardando_retirada">Aguardando Retirada</SelectItem>
                <SelectItem value="parcialmente_retirado">Parcialmente Retirado</SelectItem>
                <SelectItem value="retirado">Retirado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sectorFilter || "all"} onValueChange={(v) => setSectorFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Setor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Setores</SelectItem>
                <SelectItem value="limpeza">Limpeza</SelectItem>
                <SelectItem value="jardinagem">Jardinagem</SelectItem>
                <SelectItem value="manutencao">Manutenção</SelectItem>
                <SelectItem value="administrativo">Administrativo</SelectItem>
                <SelectItem value="cozinha">Cozinha</SelectItem>
              </SelectContent>
            </Select>
            {(search || statusFilter || sectorFilter) && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" /> Limpar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Supervisor</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Colaborador</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : !requests || requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhuma requisição de saída encontrada
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">{req.number}</TableCell>
                    <TableCell>
                      {new Date(req.date).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>{req.supervisorName}</TableCell>
                    <TableCell className="capitalize">{req.sector}</TableCell>
                    <TableCell>{req.collaboratorName}</TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {req.itemsDelivered}/{req.itemCount}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          statusColors[req.status as StatusType] || "bg-gray-100 text-gray-800"
                        }
                      >
                        {statusLabels[req.status as StatusType] || req.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/exit-requests/${req.id}`)}
                          title="Visualizar"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(req.id)}
                          title="Excluir"
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Excluir Requisição de Saída</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir esta requisição? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
          <div className="flex justify-end gap-2 mt-4">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
