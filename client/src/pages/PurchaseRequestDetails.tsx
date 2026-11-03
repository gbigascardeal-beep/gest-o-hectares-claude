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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import { ArrowLeft, Send, Download, FileUp, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";

interface RouteProps {
  id: string;
}

export default function PurchaseRequestDetails({ params }: any) {
  const id = params?.id;
  const [, navigate] = useLocation();
  const [newComment, setNewComment] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const { data: request, isLoading } = trpc.purchaseRequests.getById.useQuery(
    parseInt(id)
  );

  const { data: comments = [] } = trpc.purchaseRequests.getComments.useQuery(
    parseInt(id)
  );

  const addCommentMutation = trpc.purchaseRequests.addComment.useMutation();
  const updateStatusMutation = trpc.purchaseRequests.updateStatus.useMutation();

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      toast.error("Digite um comentário");
      return;
    }

    try {
      await addCommentMutation.mutateAsync({
        requestId: parseInt(id),
        message: newComment,
      });
      setNewComment("");
      toast.success("Comentário adicionado");
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Erro ao adicionar comentário");
    }
  };

  const handleUpdateStatus = async () => {
    if (!newStatus) {
      toast.error("Selecione um novo status");
      return;
    }

    setIsUpdatingStatus(true);

    try {
      await updateStatusMutation.mutateAsync({
        id: parseInt(id),
        newStatus: newStatus as any,
      });
      setNewStatus("");
      toast.success("Status atualizado com sucesso");
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Erro ao atualizar status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-lg font-medium text-gray-900">
          Solicitação não encontrada
        </p>
        <Button
          variant="outline"
          onClick={() => navigate("/purchase-requests")}
          className="mt-4"
        >
          Voltar para Solicitações
        </Button>
      </div>
    );
  }

  const statusLabels: Record<string, string> = {
    mercado_livre: "Mercado Livre",
    em_negociacao: "Em Negociação",
    aguardando_entrega: "Aguardando Entrega",
    aguardando_aprovacao: "Aguardando Aprovação",
    finalizado: "Finalizado",
    aguardando_detalhes: "Aguardando Detalhes do Pedido",
  };

  const statusColors: Record<string, string> = {
    mercado_livre: "bg-yellow-100 text-yellow-800",
    em_negociacao: "bg-blue-100 text-blue-800",
    aguardando_entrega: "bg-purple-100 text-purple-800",
    aguardando_aprovacao: "bg-orange-100 text-orange-800",
    finalizado: "bg-green-100 text-green-800",
    aguardando_detalhes: "bg-gray-100 text-gray-800",
  };

  const priorityLabels: Record<string, string> = {
    baixa: "Baixa",
    media: "Média",
    alta: "Alta",
    urgente: "Urgente",
  };

  const priorityColors: Record<string, string> = {
    baixa: "bg-blue-100 text-blue-800",
    media: "bg-yellow-100 text-yellow-800",
    alta: "bg-orange-100 text-orange-800",
    urgente: "bg-red-100 text-red-800",
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("pt-BR");
  };

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
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{request.number}</h1>
          <p className="text-gray-600 mt-1">
            Criada em {formatDate(request.createdAt)}
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      </div>

      {/* Status and Priority */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600 mb-2">Status Atual</p>
            <Badge className={statusColors[request.status]}>
              {statusLabels[request.status]}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600 mb-2">Prioridade</p>
            <Badge className={priorityColors[request.priority]}>
              {priorityLabels[request.priority]}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="items" className="space-y-4">
        <TabsList>
          <TabsTrigger value="items">Itens</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
          <TabsTrigger value="comments">Comentários</TabsTrigger>
          <TabsTrigger value="attachments">Anexos</TabsTrigger>
          <TabsTrigger value="details">Detalhes</TabsTrigger>
        </TabsList>

        {/* Items Tab */}
        <TabsContent value="items">
          <Card>
            <CardHeader>
              <CardTitle>Itens da Solicitação</CardTitle>
            </CardHeader>
            <CardContent>
              {request.items && request.items.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold">
                          Descrição
                        </TableHead>
                        <TableHead className="font-semibold text-right">
                          Qtd
                        </TableHead>
                        <TableHead className="font-semibold text-right">
                          Valor Unit.
                        </TableHead>
                        <TableHead className="font-semibold text-right">
                          Subtotal
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {request.items.map((item: any) => (
                        <TableRow key={item.id} className="hover:bg-gray-50">
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.description}</p>
                              {item.desiredBrand && (
                                <p className="text-sm text-gray-600">
                                  Marca: {item.desiredBrand}
                                </p>
                              )}
                              {item.suggestedSupplier && (
                                <p className="text-sm text-gray-600">
                                  Fornecedor: {item.suggestedSupplier}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {item.quantity} {item.unit}
                          </TableCell>
                          <TableCell className="text-right">
                            R$ {parseFloat(item.estimatedValue).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            R${" "}
                            {(
                              item.quantity * parseFloat(item.estimatedValue)
                            ).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-gray-600 text-center py-8">
                  Nenhum item adicionado
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Alterações</CardTitle>
            </CardHeader>
            <CardContent>
              {request.history && request.history.length > 0 ? (
                <div className="space-y-4">
                  {request.history.map((entry: any) => (
                    <div
                      key={entry.id}
                      className="border-l-4 border-blue-500 pl-4 py-2"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">
                            {entry.oldStatus} → {entry.newStatus}
                          </p>
                          {entry.observation && (
                            <p className="text-sm text-gray-600 mt-1">
                              {entry.observation}
                            </p>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {formatDate(entry.changedAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 text-center py-8">
                  Nenhuma alteração registrada
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comments Tab */}
        <TabsContent value="comments">
          <Card>
            <CardHeader>
              <CardTitle>Comentários</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Comment */}
              <div className="space-y-2">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Adicione um comentário..."
                  rows={3}
                />
                <Button
                  onClick={handleAddComment}
                  className="gap-2 bg-green-600 hover:bg-green-700"
                >
                  <Send className="h-4 w-4" />
                  Enviar Comentário
                </Button>
              </div>

              {/* Comments List */}
              <div className="border-t pt-4 space-y-4">
                {comments && comments.length > 0 ? (
                  comments.map((comment: any) => (
                    <div
                      key={comment.id}
                      className="bg-gray-50 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-medium">{comment.userName}</p>
                        <p className="text-sm text-gray-500">
                          {formatDate(comment.createdAt)}
                        </p>
                      </div>
                      <p className="text-gray-700">{comment.message}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-600 text-center py-8">
                    Nenhum comentário ainda
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attachments Tab */}
        <TabsContent value="attachments">
          <Card>
            <CardHeader>
              <CardTitle>Anexos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <FileUp className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">Arraste arquivos aqui ou clique para selecionar</p>
                <p className="text-sm text-gray-500 mt-1">Máximo 10MB por arquivo</p>
              </div>
              <p className="text-sm text-gray-600 text-center">Funcionalidade de upload em desenvolvimento</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Detalhes da Solicitação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Setor</p>
                  <p className="font-medium">{request.sector}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Centro de Custo</p>
                  <p className="font-medium">-</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Solicitante</p>
                  <p className="font-medium">-</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Data Desejada</p>
                  <p className="font-medium">
                    {request.desiredDate
                      ? formatDate(request.desiredDate)
                      : "-"}
                  </p>
                </div>
              </div>

              {request.observations && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Observações</p>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded">
                    {request.observations}
                  </p>
                </div>
              )}

              {/* Status Update */}
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3">Atualizar Status</p>
                <div className="flex gap-2">
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecione novo status" />
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
                  <Button
                    onClick={handleUpdateStatus}
                    disabled={isUpdatingStatus || !newStatus}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isUpdatingStatus ? "Atualizando..." : "Atualizar"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
