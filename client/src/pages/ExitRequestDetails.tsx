import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLocation, useParams } from "wouter";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Package,
  User,
  Calendar,
  FileText,
  History,
} from "lucide-react";

type StatusType = "aguardando_retirada" | "parcialmente_retirado" | "retirado" | "cancelado";
type ItemStatusType = "pendente" | "retirado" | "cancelado";

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

const itemStatusLabels: Record<ItemStatusType, string> = {
  pendente: "Pendente",
  retirado: "Retirado",
  cancelado: "Cancelado",
};

const itemStatusColors: Record<ItemStatusType, string> = {
  pendente: "bg-yellow-100 text-yellow-800",
  retirado: "bg-green-100 text-green-800",
  cancelado: "bg-red-100 text-red-800",
};

export default function ExitRequestDetails() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [confirmItemId, setConfirmItemId] = useState<number | null>(null);

  const requestId = parseInt(params?.id || "0");

  const { data: request, isLoading, refetch } = trpc.exitRequests.getById.useQuery(
    { id: requestId },
    { enabled: requestId > 0 }
  );

  const markDeliveredMutation = trpc.exitRequests.markItemDelivered.useMutation({
    onSuccess: () => {
      alert("Item marcado como retirado! Estoque atualizado automaticamente.");
      setConfirmItemId(null);
      refetch();
    },
    onError: (error) => {
      alert("Erro ao marcar item: " + error.message);
    },
  });

  const handleMarkDelivered = () => {
    if (confirmItemId) {
      markDeliveredMutation.mutate({ itemId: confirmItemId });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Requisição não encontrada</p>
        <Button variant="link" onClick={() => navigate("/exit-requests")}>
          Voltar para lista
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/exit-requests")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Requisição {request.number}</h1>
            <p className="text-muted-foreground">
              Detalhes da requisição de saída
            </p>
          </div>
        </div>
        <Badge className={statusColors[request.status as StatusType] || "bg-gray-100 text-gray-800"}>
          {statusLabels[request.status as StatusType] || request.status}
        </Badge>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <User className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-xs text-muted-foreground">Supervisor</p>
              <p className="font-medium text-sm">{request.supervisorName}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Package className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-xs text-muted-foreground">Setor</p>
              <p className="font-medium text-sm capitalize">{request.sector}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <User className="w-5 h-5 text-orange-500" />
            <div>
              <p className="text-xs text-muted-foreground">Colaborador</p>
              <p className="font-medium text-sm">{request.collaboratorName}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Calendar className="w-5 h-5 text-purple-500" />
            <div>
              <p className="text-xs text-muted-foreground">Data Prevista</p>
              <p className="font-medium text-sm">
                {request.expectedDate || "Não informada"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Observations */}
      {request.observations && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Observações</p>
                <p className="text-sm">{request.observations}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Itens da Requisição
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Qtd. Solicitada</TableHead>
                <TableHead>Qtd. Entregue</TableHead>
                <TableHead>Estoque Atual</TableHead>
                <TableHead>Observação</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {request.items?.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.productDescription}</TableCell>
                  <TableCell>{item.quantityRequested}</TableCell>
                  <TableCell>{item.quantityDelivered}</TableCell>
                  <TableCell>{item.productCurrentQuantity}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.itemObservation || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge className={itemStatusColors[item.status as ItemStatusType] || "bg-gray-100"}>
                      {itemStatusLabels[item.status as ItemStatusType] || item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {item.status === "pendente" && (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => setConfirmItemId(item.id)}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Retirado
                      </Button>
                    )}
                    {item.status === "retirado" && (
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Entregue
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* History */}
      {request.history && request.history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Histórico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {request.history.map((h: any) => (
                <div key={h.id} className="flex items-start gap-3 border-l-2 border-muted pl-4 py-1">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{h.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {h.performedByName} •{" "}
                      {new Date(h.performedAt).toLocaleString("pt-BR")}
                    </p>
                    {h.observation && (
                      <p className="text-xs text-muted-foreground mt-0.5">{h.observation}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirm Delivery Dialog */}
      <AlertDialog open={!!confirmItemId} onOpenChange={() => setConfirmItemId(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Confirmar Retirada</AlertDialogTitle>
          <AlertDialogDescription>
            Ao confirmar, o item será marcado como retirado e a quantidade será automaticamente
            descontada do estoque. Esta ação não pode ser desfeita.
          </AlertDialogDescription>
          <div className="flex justify-end gap-2 mt-4">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMarkDelivered}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Confirmar Retirada
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
