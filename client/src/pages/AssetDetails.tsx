import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, Building2, Wrench } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  ativo: "Ativo", em_uso: "Em Uso", em_estoque: "Em Estoque",
  em_manutencao: "Em Manutenção", em_transferencia: "Em Transferência",
  extraviado: "Extraviado", em_inventario: "Em Inventário", baixado: "Baixado",
};

const CONSERVATION_LABELS: Record<string, string> = {
  novo: "Novo", excelente: "Excelente", bom: "Bom",
  regular: "Regular", ruim: "Ruim", inservivel: "Inservível",
};

export default function AssetDetails() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const assetId = parseInt(params?.id || "0");

  const { data: asset, isLoading } = trpc.assets.getById.useQuery({ id: assetId }, { enabled: assetId > 0 });
  const { data: history = [] } = trpc.assets.getHistory.useQuery({ assetId }, { enabled: assetId > 0 });
  const { data: movements = [] } = trpc.assets.getMovements.useQuery({ assetId }, { enabled: assetId > 0 });
  const { data: maintenances = [] } = trpc.assets.getMaintenances.useQuery({ assetId }, { enabled: assetId > 0 });
  const { data: toolLoans = [] } = trpc.assets.tools.loans.useQuery({ assetId }, { enabled: assetId > 0 });

  if (isLoading) return <div className="p-6 text-center">Carregando...</div>;
  if (!asset) return <div className="p-6 text-center text-red-600">Patrimônio não encontrado</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => setLocation("/patrimonio/bens")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
      </div>

      {/* Cabeçalho */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <div className="p-4 bg-blue-100 rounded-xl">
              <Building2 className="h-10 w-10 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{asset.code}</h1>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {STATUS_LABELS[asset.status] || asset.status}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {CONSERVATION_LABELS[asset.conservationState] || asset.conservationState}
                </span>
              </div>
              <p className="text-lg text-gray-700 mt-1">{asset.description}</p>
              <div className="grid grid-cols-4 gap-4 mt-4 text-sm">
                <div><span className="text-gray-500">Marca:</span> <strong>{asset.brand || "-"}</strong></div>
                <div><span className="text-gray-500">Modelo:</span> <strong>{asset.model || "-"}</strong></div>
                <div><span className="text-gray-500">Nº Série:</span> <strong>{asset.serialNumber || "-"}</strong></div>
                <div><span className="text-gray-500">Valor:</span> <strong>{asset.acquisitionValue ? `R$ ${parseFloat(asset.acquisitionValue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "-"}</strong></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Abas */}
      <Tabs defaultValue="dados">
        <TabsList className="grid grid-cols-3 lg:grid-cols-6 w-full h-auto">
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="movimentacoes">Movimentações</TabsTrigger>
          <TabsTrigger value="manutencoes">Manutenções</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
          <TabsTrigger value="ferramentas">Retiradas</TabsTrigger>
        </TabsList>

        <TabsContent value="dados">
          <Card>
            <CardHeader><CardTitle>Dados do Patrimônio</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">Código:</span> <strong>{asset.code}</strong></div>
                <div><span className="text-gray-500">Descrição:</span> <strong>{asset.description}</strong></div>
                <div><span className="text-gray-500">Marca:</span> <strong>{asset.brand || "-"}</strong></div>
                <div><span className="text-gray-500">Modelo:</span> <strong>{asset.model || "-"}</strong></div>
                <div><span className="text-gray-500">Nº Série:</span> <strong>{asset.serialNumber || "-"}</strong></div>
                <div><span className="text-gray-500">Código de Barras:</span> <strong>{asset.barcode || "-"}</strong></div>
                <div><span className="text-gray-500">Data Aquisição:</span> <strong>{asset.acquisitionDate || "-"}</strong></div>
                <div><span className="text-gray-500">Data Entrada:</span> <strong>{asset.entryDate || "-"}</strong></div>
                <div><span className="text-gray-500">Valor Aquisição:</span> <strong>{asset.acquisitionValue ? `R$ ${parseFloat(asset.acquisitionValue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "-"}</strong></div>
                <div><span className="text-gray-500">Nº Nota Fiscal:</span> <strong>{asset.invoiceNumber || "-"}</strong></div>
                <div><span className="text-gray-500">Garantia (meses):</span> <strong>{asset.warrantyMonths || "-"}</strong></div>
                <div><span className="text-gray-500">Fim Garantia:</span> <strong>{asset.warrantyEnd || "-"}</strong></div>
              </div>
              {asset.observations && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-500 text-sm">Observações:</span>
                  <p className="text-gray-900 mt-1">{asset.observations}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movimentacoes">
          <Card>
            <CardHeader><CardTitle>Movimentações ({movements.length})</CardTitle></CardHeader>
            <CardContent>
              {movements.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nenhuma movimentação registrada</p>
              ) : (
                <div className="space-y-3">
                  {movements.map((m: any) => (
                    <div key={m.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between">
                        <span className="font-medium">{m.type.replace(/_/g, " ")}</span>
                        <span className="text-sm text-gray-500">{m.movementDate}</span>
                      </div>
                      {m.reason && <p className="text-sm text-gray-600 mt-1">{m.reason}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manutencoes">
          <Card>
            <CardHeader><CardTitle>Manutenções ({maintenances.length})</CardTitle></CardHeader>
            <CardContent>
              {maintenances.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nenhuma manutenção registrada</p>
              ) : (
                <div className="space-y-3">
                  {maintenances.map((m: any) => (
                    <div key={m.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between">
                        <span className="font-medium capitalize">{m.type}</span>
                        <span className="text-sm text-gray-500">{m.openDate}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Status: {m.status}</p>
                      {m.problem && <p className="text-sm text-gray-600">{m.problem}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico">
          <Card>
            <CardHeader><CardTitle>Histórico ({history.length})</CardTitle></CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nenhum registro no histórico</p>
              ) : (
                <div className="space-y-3">
                  {history.map((h: any) => (
                    <div key={h.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between">
                        <span className="font-medium capitalize">{h.eventType.replace(/_/g, " ")}</span>
                        <span className="text-sm text-gray-500">{new Date(h.eventDate).toLocaleString("pt-BR")}</span>
                      </div>
                      {h.description && <p className="text-sm text-gray-600 mt-1">{h.description}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documentos">
          <Card>
            <CardHeader><CardTitle>Documentos</CardTitle></CardHeader>
            <CardContent>
              <p className="text-gray-500 text-center py-8">Funcionalidade de documentos em desenvolvimento</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ferramentas">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Wrench className="h-5 w-5" /> Retiradas e devoluções ({toolLoans.length})</CardTitle></CardHeader>
            <CardContent>
              {toolLoans.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nenhuma retirada registrada para este patrimônio</p>
              ) : (
                <div className="space-y-3">
                  {toolLoans.map((loan) => (
                    <div key={loan.id} className="rounded-lg border p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium">{loan.collaboratorName}</p>
                          <p className="text-sm text-muted-foreground">Retirada em {new Date(loan.withdrawnAt).toLocaleString("pt-BR")}</p>
                        </div>
                        <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ${loan.status === "devolvido" ? "bg-emerald-100 text-emerald-800" : loan.isOverdue ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
                          {loan.status === "devolvido" ? "Devolvido" : loan.isOverdue ? "Pendente · atrasado" : "Pendente"}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                        <p><span className="text-muted-foreground">Setor:</span> {loan.collaboratorSector || "-"}</p>
                        <p><span className="text-muted-foreground">Prevista:</span> {new Date(`${loan.expectedReturnDate}T12:00:00`).toLocaleDateString("pt-BR")}</p>
                        <p><span className="text-muted-foreground">Devolução:</span> {loan.returnedAt ? new Date(loan.returnedAt).toLocaleString("pt-BR") : "-"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
