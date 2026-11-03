import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, AlertTriangle, Package, TrendingDown, BarChart3, Mail, Calendar, Filter, Search } from "lucide-react";
import { toast } from "sonner";

// ============ HELPERS ============

function formatDateBR(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR");
}

function formatCurrencyBR(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getQuickDateRange(period: string): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().split("T")[0];
  let start: Date;

  switch (period) {
    case "today":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "week":
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "month":
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "quarter":
      start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "year":
      start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return { start: start.toISOString().split("T")[0], end };
}

// CSV Export with Brazilian standards
function exportCSVBrazilian(data: any[], headers: { key: string; label: string }[], filename: string, filters?: string) {
  if (!data || data.length === 0) {
    toast.error("Nenhum dado para exportar");
    return;
  }

  const BOM = "\uFEFF";
  const separator = ";";
  const headerRow = headers.map((h) => h.label).join(separator);

  const rows = data.map((item) =>
    headers
      .map((h) => {
        let value = item[h.key];
        if (value === null || value === undefined) return "";
        if (value instanceof Date) return formatDateBR(value);
        if (typeof value === "number") {
          if (h.key.toLowerCase().includes("value") || h.key.toLowerCase().includes("price") || h.key.toLowerCase().includes("spending") || h.key.toLowerCase().includes("total")) {
            return formatCurrencyBR(value);
          }
          return value.toString().replace(".", ",");
        }
        if (typeof value === "string" && value.match(/^\d{4}-\d{2}-\d{2}/)) {
          return formatDateBR(value);
        }
        const strValue = String(value);
        if (strValue.includes(separator) || strValue.includes('"') || strValue.includes("\n")) {
          return `"${strValue.replace(/"/g, '""')}"`;
        }
        return strValue;
      })
      .join(separator)
  );

  // Footer with generation info
  const footer = [
    "",
    `Relatório gerado em: ${formatDateBR(new Date())} às ${new Date().toLocaleTimeString("pt-BR")}`,
    filters ? `Filtros aplicados: ${filters}` : "",
    `Total de registros: ${data.length}`,
  ].filter(Boolean);

  const csv = BOM + [headerRow, ...rows, ...footer].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  toast.success("Relatório exportado com sucesso!");
}

// ============ PERIOD FILTER COMPONENT ============
function PeriodFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: {
  startDate: string;
  endDate: string;
  onStartDateChange: (v: string) => void;
  onEndDateChange: (v: string) => void;
}) {
  const handleQuickPeriod = (period: string) => {
    const { start, end } = getQuickDateRange(period);
    onStartDateChange(start);
    onEndDateChange(end);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => handleQuickPeriod("today")}>
          <Calendar className="w-3 h-3 mr-1" /> Hoje
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleQuickPeriod("week")}>
          Última Semana
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleQuickPeriod("month")}>
          Último Mês
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleQuickPeriod("quarter")}>
          Último Trimestre
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleQuickPeriod("year")}>
          Último Ano
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Data Inicial</Label>
          <Input type="date" value={startDate} onChange={(e) => onStartDateChange(e.target.value)} />
        </div>
        <div>
          <Label>Data Final</Label>
          <Input type="date" value={endDate} onChange={(e) => onEndDateChange(e.target.value)} />
        </div>
      </div>
    </div>
  );
}

// ============ SUMMARY CARD COMPONENT ============
function SummaryCard({ title, value, icon: Icon, color = "blue" }: { title: string; value: string | number; icon: any; color?: string }) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    green: "bg-green-50 text-green-700 border-green-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
    red: "bg-red-50 text-red-700 border-red-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color] || colorClasses.blue}`}>
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5" />
        <span className="text-sm font-medium">{title}</span>
      </div>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

// ============ MAIN COMPONENT ============
export default function Reports() {
  const [reportType, setReportType] = useState("current-stock");
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);

  // Filters
  const [costCenterFilter, setCostCenterFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [classificationFilter, setClassificationFilter] = useState("");
  const [sectorFilter, setSectorFilter] = useState("");
  const [searchFilter, setSearchFilter] = useState("");

  // Data queries
  const { data: costCenters } = trpc.costCenters.list.useQuery();
  const { data: productsList } = trpc.products.list.useQuery({});

  const currentStockInput = useMemo(() => ({
    costCenterId: costCenterFilter ? Number(costCenterFilter) : undefined,
    classification: classificationFilter || undefined,
    search: searchFilter || undefined,
  }), [costCenterFilter, classificationFilter, searchFilter]);

  const { data: currentStock } = trpc.reports.currentStock.useQuery(currentStockInput);

  const { data: suggestedPurchases } = trpc.reports.suggestedPurchases.useQuery({
    classification: classificationFilter || undefined,
    costCenterId: costCenterFilter ? Number(costCenterFilter) : undefined,
  });

  const movementsInput = useMemo(() => ({
    startDate: new Date(startDate),
    endDate: new Date(endDate + "T23:59:59"),
    costCenterId: costCenterFilter ? Number(costCenterFilter) : undefined,
    productId: productFilter ? Number(productFilter) : undefined,
    type: typeFilter as "entrada" | "saida" | undefined || undefined,
  }), [startDate, endDate, costCenterFilter, productFilter, typeFilter]);

  const { data: movements } = trpc.reports.movementsByPeriod.useQuery(movementsInput);

  const { data: spending } = trpc.reports.spendingByCostCenter.useQuery({
    startDate: new Date(startDate),
    endDate: new Date(endDate + "T23:59:59"),
  });

  const consumptionInput = useMemo(() => ({
    startDate: new Date(startDate),
    endDate: new Date(endDate + "T23:59:59"),
    productId: productFilter ? Number(productFilter) : undefined,
    costCenterId: costCenterFilter ? Number(costCenterFilter) : undefined,
  }), [startDate, endDate, productFilter, costCenterFilter]);

  const { data: consumption } = trpc.reports.consumptionByProduct.useQuery(consumptionInput);

  const exitBySectorInput = useMemo(() => ({
    startDate: new Date(startDate),
    endDate: new Date(endDate + "T23:59:59"),
    status: undefined,
  }), [startDate, endDate]);

  const { data: exitBySector } = trpc.reports.exitRequestsBySector.useQuery(exitBySectorInput);

  const exitByCollabInput = useMemo(() => ({
    startDate: new Date(startDate),
    endDate: new Date(endDate + "T23:59:59"),
    sector: sectorFilter || undefined,
  }), [startDate, endDate, sectorFilter]);

  const { data: exitByCollab } = trpc.reports.exitRequestsByCollaborator.useQuery(exitByCollabInput);

  const priceHistoryInput = useMemo(() => ({
    productId: productFilter ? Number(productFilter) : undefined,
    startDate: new Date(startDate),
    endDate: new Date(endDate + "T23:59:59"),
  }), [productFilter, startDate, endDate]);

  const { data: priceHistory } = trpc.reports.priceHistory.useQuery(priceHistoryInput);

  const productsWithoutMovInput = useMemo(() => ({
    startDate: new Date(startDate),
    endDate: new Date(endDate + "T23:59:59"),
    classification: classificationFilter || undefined,
  }), [startDate, endDate, classificationFilter]);

  const { data: productsWithoutMov } = trpc.reports.productsWithoutMovement.useQuery(productsWithoutMovInput);

  const purchaseByStatusInput = useMemo(() => ({
    startDate: new Date(startDate),
    endDate: new Date(endDate + "T23:59:59"),
    sector: sectorFilter || undefined,
  }), [startDate, endDate, sectorFilter]);

  const { data: purchaseByStatus } = trpc.reports.purchaseRequestsByStatus.useQuery(purchaseByStatusInput);

  // Email notification mutation
  const notifyMutation = trpc.system.notifyOwner.useMutation({
    onSuccess: () => toast.success("Relatório enviado por notificação!"),
    onError: () => toast.error("Erro ao enviar notificação"),
  });

  const handleSendEmail = (title: string, content: string) => {
    notifyMutation.mutate({ title, content });
  };

  // Get unique sectors from exit requests data
  const availableSectors = useMemo(() => {
    const sectors = new Set<string>();
    if (exitBySector) {
      exitBySector.forEach((r: any) => sectors.add(r.sector));
    }
    return Array.from(sectors).sort();
  }, [exitBySector]);

  // Status labels
  const statusLabels: Record<string, string> = {
    mercado_livre: "Mercado Livre",
    em_negociacao: "Em Negociação",
    aguardando_entrega: "Aguardando Entrega",
    aguardando_aprovacao: "Aguardando Aprovação",
    finalizado: "Finalizado",
    aguardando_detalhes: "Aguardando Detalhes",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground mt-1">Gere, filtre e exporte relatórios completos do sistema</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={reportType} onValueChange={setReportType} className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="inline-flex w-auto min-w-full">
            <TabsTrigger value="current-stock" className="text-xs sm:text-sm">Estoque Atual</TabsTrigger>
            <TabsTrigger value="movements" className="text-xs sm:text-sm">Movimentações</TabsTrigger>
            <TabsTrigger value="consumption" className="text-xs sm:text-sm">Consumo</TabsTrigger>
            <TabsTrigger value="spending" className="text-xs sm:text-sm">Gastos</TabsTrigger>
            <TabsTrigger value="exit-sector" className="text-xs sm:text-sm">Saídas/Setor</TabsTrigger>
            <TabsTrigger value="exit-collab" className="text-xs sm:text-sm">Saídas/Colaborador</TabsTrigger>
            <TabsTrigger value="price-history" className="text-xs sm:text-sm">Preços</TabsTrigger>
            <TabsTrigger value="no-movement" className="text-xs sm:text-sm">Sem Movimentação</TabsTrigger>
            <TabsTrigger value="purchase-status" className="text-xs sm:text-sm">Solicitações</TabsTrigger>
            <TabsTrigger value="suggested" className="text-xs sm:text-sm">Sugestões</TabsTrigger>
          </TabsList>
        </div>

        {/* ============ ESTOQUE ATUAL ============ */}
        <TabsContent value="current-stock" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Estoque Atual</CardTitle>
                  <CardDescription>Quantidade e situação de todos os produtos em estoque</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const summary = (currentStock || []).map((i) => `${i.description}: ${i.quantity} un`).join("\n");
                      handleSendEmail("Relatório - Estoque Atual", `Estoque Atual (${formatDateBR(new Date())})\n\n${summary}\n\nTotal: ${(currentStock || []).length} produtos`);
                    }}
                  >
                    <Mail className="w-4 h-4 mr-1" /> Enviar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      exportCSVBrazilian(
                        currentStock || [],
                        [
                          { key: "description", label: "Descrição" },
                          { key: "quantity", label: "Quantidade" },
                          { key: "minStock", label: "Estoque Mínimo" },
                          { key: "maxStock", label: "Estoque Máximo" },
                          { key: "classification", label: "Classificação" },
                          { key: "localAlocacao", label: "Local" },
                        ],
                        `estoque-atual-${new Date().toISOString().split("T")[0]}`,
                        [
                          costCenterFilter ? `Centro de Custo: ${costCenters?.find((c: any) => c.id === Number(costCenterFilter))?.name}` : "",
                          classificationFilter ? `Classificação: ${classificationFilter}` : "",
                        ].filter(Boolean).join(", ") || undefined
                      )
                    }
                  >
                    <Download className="w-4 h-4 mr-1" /> CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 bg-muted/30 rounded-lg">
                <div>
                  <Label className="text-xs">Buscar</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar produto..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="pl-8 h-9"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Centro de Custo</Label>
                  <Select value={costCenterFilter || "all"} onValueChange={(v) => setCostCenterFilter(v === "all" ? "" : v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {(costCenters || []).map((cc: any) => (
                        <SelectItem key={cc.id} value={String(cc.id)}>{cc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Classificação</Label>
                  <Select value={classificationFilter || "all"} onValueChange={(v) => setClassificationFilter(v === "all" ? "" : v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="estoque">Estoque</SelectItem>
                      <SelectItem value="uso_especifico">Uso Específico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button variant="ghost" size="sm" onClick={() => { setSearchFilter(""); setCostCenterFilter(""); setClassificationFilter(""); }}>
                    <Filter className="w-4 h-4 mr-1" /> Limpar
                  </Button>
                </div>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <SummaryCard title="Total Produtos" value={(currentStock || []).length} icon={Package} color="blue" />
                <SummaryCard
                  title="Total Itens"
                  value={(currentStock || []).reduce((acc, i) => acc + i.quantity, 0)}
                  icon={BarChart3}
                  color="green"
                />
                <SummaryCard
                  title="Abaixo Mínimo"
                  value={(currentStock || []).filter((i) => i.quantity <= i.minStock).length}
                  icon={AlertTriangle}
                  color="orange"
                />
                <SummaryCard
                  title="Zerados"
                  value={(currentStock || []).filter((i) => i.quantity === 0).length}
                  icon={TrendingDown}
                  color="red"
                />
              </div>

              {/* Table */}
              {(currentStock || []).length > 0 ? (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr className="border-b">
                        <th className="text-left py-3 px-3 font-medium">Descrição</th>
                        <th className="text-center py-3 px-3 font-medium">Classificação</th>
                        <th className="text-right py-3 px-3 font-medium">Quantidade</th>
                        <th className="text-right py-3 px-3 font-medium">Mín.</th>
                        <th className="text-right py-3 px-3 font-medium">Máx.</th>
                        <th className="text-center py-3 px-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(currentStock || []).map((item, index) => (
                        <tr key={index} className="border-b hover:bg-muted/30">
                          <td className="py-2.5 px-3">{item.description}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded ${item.classification === "estoque" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                              {item.classification === "estoque" ? "Estoque" : "Uso Específico"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium">{item.quantity}</td>
                          <td className="py-2.5 px-3 text-right text-muted-foreground">{item.minStock}</td>
                          <td className="py-2.5 px-3 text-right text-muted-foreground">{item.maxStock}</td>
                          <td className="py-2.5 px-3 text-center">
                            {item.quantity === 0 ? (
                              <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">Zerado</span>
                            ) : item.quantity <= item.minStock ? (
                              <span className="text-xs px-2 py-0.5 rounded bg-orange-100 text-orange-700">Baixo</span>
                            ) : (
                              <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">Normal</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum dado disponível</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ MOVIMENTAÇÕES ============ */}
        <TabsContent value="movements" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Movimentações por Período</CardTitle>
                  <CardDescription>Entradas e saídas de produtos com filtros avançados</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const summary = (movements || []).slice(0, 50).map((m: any) => `${formatDateBR(m.createdAt)} | ${m.type === "entrada" ? "Entrada" : "Saída"} | ${m.productDescription} | Qtd: ${m.quantity}`).join("\n");
                      handleSendEmail(`Relatório - Movimentações (${startDate} a ${endDate})`, summary);
                    }}
                  >
                    <Mail className="w-4 h-4 mr-1" /> Enviar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      exportCSVBrazilian(
                        (movements || []).map((m: any) => ({
                          ...m,
                          type: m.type === "entrada" ? "Entrada" : "Saída",
                          createdAt: formatDateBR(m.createdAt),
                        })),
                        [
                          { key: "createdAt", label: "Data" },
                          { key: "type", label: "Tipo" },
                          { key: "productDescription", label: "Produto" },
                          { key: "quantity", label: "Quantidade" },
                          { key: "costCenterName", label: "Centro de Custo" },
                          { key: "pricePerUnit", label: "Preço Unitário" },
                          { key: "lote", label: "Lote" },
                          { key: "notes", label: "Observações" },
                        ],
                        `movimentacoes-${startDate}-a-${endDate}`,
                        `Período: ${formatDateBR(startDate)} a ${formatDateBR(endDate)}`
                      )
                    }
                  >
                    <Download className="w-4 h-4 mr-1" /> CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <PeriodFilter startDate={startDate} endDate={endDate} onStartDateChange={setStartDate} onEndDateChange={setEndDate} />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-muted/30 rounded-lg">
                <div>
                  <Label className="text-xs">Produto</Label>
                  <Select value={productFilter || "all"} onValueChange={(v) => setProductFilter(v === "all" ? "" : v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {(productsList || []).map((p: any) => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.description}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Tipo</Label>
                  <Select value={typeFilter || "all"} onValueChange={(v) => setTypeFilter(v === "all" ? "" : v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="entrada">Entrada</SelectItem>
                      <SelectItem value="saida">Saída</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Centro de Custo</Label>
                  <Select value={costCenterFilter || "all"} onValueChange={(v) => setCostCenterFilter(v === "all" ? "" : v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {(costCenters || []).map((cc: any) => (
                        <SelectItem key={cc.id} value={String(cc.id)}>{cc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <SummaryCard title="Total Movimentações" value={(movements || []).length} icon={BarChart3} color="blue" />
                <SummaryCard
                  title="Entradas"
                  value={(movements || []).filter((m: any) => m.type === "entrada").length}
                  icon={Package}
                  color="green"
                />
                <SummaryCard
                  title="Saídas"
                  value={(movements || []).filter((m: any) => m.type === "saida").length}
                  icon={TrendingDown}
                  color="red"
                />
                <SummaryCard
                  title="Valor Total"
                  value={formatCurrencyBR((movements || []).reduce((acc: number, m: any) => acc + (m.pricePerUnit * m.quantity), 0))}
                  icon={BarChart3}
                  color="purple"
                />
              </div>

              {/* Table */}
              {(movements || []).length > 0 ? (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr className="border-b">
                        <th className="text-left py-3 px-3 font-medium">Data</th>
                        <th className="text-left py-3 px-3 font-medium">Tipo</th>
                        <th className="text-left py-3 px-3 font-medium">Produto</th>
                        <th className="text-right py-3 px-3 font-medium">Qtd.</th>
                        <th className="text-left py-3 px-3 font-medium">Centro de Custo</th>
                        <th className="text-right py-3 px-3 font-medium">Preço Un.</th>
                        <th className="text-left py-3 px-3 font-medium">Obs.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(movements || []).map((item: any, index: number) => (
                        <tr key={index} className="border-b hover:bg-muted/30">
                          <td className="py-2.5 px-3 text-xs">{formatDateBR(item.createdAt)}</td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${item.type === "entrada" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                              {item.type === "entrada" ? "Entrada" : "Saída"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">{item.productDescription}</td>
                          <td className="text-right py-2.5 px-3 font-medium">{item.quantity}</td>
                          <td className="py-2.5 px-3 text-muted-foreground">{item.costCenterName}</td>
                          <td className="text-right py-2.5 px-3">{item.pricePerUnit > 0 ? formatCurrencyBR(item.pricePerUnit) : "-"}</td>
                          <td className="py-2.5 px-3 text-muted-foreground text-xs max-w-[150px] truncate">{item.notes || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma movimentação no período</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ CONSUMO POR PRODUTO ============ */}
        <TabsContent value="consumption" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Consumo por Produto</CardTitle>
                  <CardDescription>Produtos mais consumidos (saídas) no período</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    const summary = (consumption || []).map((c: any) => `${c.productDescription}: ${c.totalQuantity} un (${c.movementCount} saídas) - ${formatCurrencyBR(c.totalValue)}`).join("\n");
                    handleSendEmail(`Relatório - Consumo por Produto (${startDate} a ${endDate})`, summary);
                  }}>
                    <Mail className="w-4 h-4 mr-1" /> Enviar
                  </Button>
                  <Button size="sm" onClick={() =>
                    exportCSVBrazilian(
                      consumption || [],
                      [
                        { key: "productDescription", label: "Produto" },
                        { key: "totalQuantity", label: "Quantidade Total" },
                        { key: "movementCount", label: "Nº Saídas" },
                        { key: "totalValue", label: "Valor Total" },
                      ],
                      `consumo-produto-${startDate}-a-${endDate}`,
                      `Período: ${formatDateBR(startDate)} a ${formatDateBR(endDate)}`
                    )
                  }>
                    <Download className="w-4 h-4 mr-1" /> CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <PeriodFilter startDate={startDate} endDate={endDate} onStartDateChange={setStartDate} onEndDateChange={setEndDate} />

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <SummaryCard title="Produtos Consumidos" value={(consumption || []).length} icon={Package} color="blue" />
                <SummaryCard
                  title="Total Saídas"
                  value={(consumption || []).reduce((acc: number, c: any) => acc + c.totalQuantity, 0)}
                  icon={TrendingDown}
                  color="orange"
                />
                <SummaryCard
                  title="Valor Total"
                  value={formatCurrencyBR((consumption || []).reduce((acc: number, c: any) => acc + c.totalValue, 0))}
                  icon={BarChart3}
                  color="purple"
                />
              </div>

              {(consumption || []).length > 0 ? (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr className="border-b">
                        <th className="text-left py-3 px-3 font-medium">Produto</th>
                        <th className="text-right py-3 px-3 font-medium">Qtd. Total</th>
                        <th className="text-right py-3 px-3 font-medium">Nº Saídas</th>
                        <th className="text-right py-3 px-3 font-medium">Valor Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(consumption || []).map((item: any, index: number) => (
                        <tr key={index} className="border-b hover:bg-muted/30">
                          <td className="py-2.5 px-3">{item.productDescription}</td>
                          <td className="text-right py-2.5 px-3 font-medium">{item.totalQuantity}</td>
                          <td className="text-right py-2.5 px-3">{item.movementCount}</td>
                          <td className="text-right py-2.5 px-3 font-medium">{formatCurrencyBR(item.totalValue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum consumo no período</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ GASTOS POR CENTRO ============ */}
        <TabsContent value="spending" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Gastos por Centro de Custo</CardTitle>
                  <CardDescription>Total de gastos agrupado por centro de custo</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    const summary = (spending || []).map((s: any) => `${s.costCenterName}: ${formatCurrencyBR(s.totalSpending)} (${s.orderCount} ordens)`).join("\n");
                    handleSendEmail(`Relatório - Gastos por Centro de Custo (${startDate} a ${endDate})`, summary);
                  }}>
                    <Mail className="w-4 h-4 mr-1" /> Enviar
                  </Button>
                  <Button size="sm" onClick={() =>
                    exportCSVBrazilian(
                      spending || [],
                      [
                        { key: "costCenterName", label: "Centro de Custo" },
                        { key: "totalSpending", label: "Total de Gastos" },
                        { key: "orderCount", label: "Qtd. Ordens" },
                        { key: "averageOrderValue", label: "Valor Médio" },
                      ],
                      `gastos-centro-custo-${startDate}-a-${endDate}`,
                      `Período: ${formatDateBR(startDate)} a ${formatDateBR(endDate)}`
                    )
                  }>
                    <Download className="w-4 h-4 mr-1" /> CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <PeriodFilter startDate={startDate} endDate={endDate} onStartDateChange={setStartDate} onEndDateChange={setEndDate} />

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <SummaryCard title="Centros de Custo" value={(spending || []).length} icon={BarChart3} color="blue" />
                <SummaryCard
                  title="Total Gasto"
                  value={formatCurrencyBR((spending || []).reduce((acc: number, s: any) => acc + (s.totalSpending || 0), 0))}
                  icon={TrendingDown}
                  color="red"
                />
                <SummaryCard
                  title="Total Ordens"
                  value={(spending || []).reduce((acc: number, s: any) => acc + (s.orderCount || 0), 0)}
                  icon={Package}
                  color="green"
                />
              </div>

              {(spending || []).length > 0 ? (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr className="border-b">
                        <th className="text-left py-3 px-3 font-medium">Centro de Custo</th>
                        <th className="text-right py-3 px-3 font-medium">Total de Gastos</th>
                        <th className="text-right py-3 px-3 font-medium">Qtd. Ordens</th>
                        <th className="text-right py-3 px-3 font-medium">Valor Médio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(spending || []).map((item: any, index: number) => (
                        <tr key={index} className="border-b hover:bg-muted/30">
                          <td className="py-2.5 px-3">{item.costCenterName}</td>
                          <td className="py-2.5 px-3 text-right font-medium">{formatCurrencyBR(item.totalSpending || 0)}</td>
                          <td className="py-2.5 px-3 text-right">{item.orderCount}</td>
                          <td className="py-2.5 px-3 text-right">{formatCurrencyBR(item.averageOrderValue || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum gasto registrado no período</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ SAÍDAS POR SETOR ============ */}
        <TabsContent value="exit-sector" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Requisições de Saída por Setor</CardTitle>
                  <CardDescription>Quantidade de requisições e itens por setor</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    const summary = (exitBySector || []).map((s: any) => `${s.sector}: ${s.totalRequests} requisições, ${s.totalItemsRequested} itens solicitados, ${s.totalItemsDelivered} entregues`).join("\n");
                    handleSendEmail(`Relatório - Saídas por Setor (${startDate} a ${endDate})`, summary);
                  }}>
                    <Mail className="w-4 h-4 mr-1" /> Enviar
                  </Button>
                  <Button size="sm" onClick={() =>
                    exportCSVBrazilian(
                      exitBySector || [],
                      [
                        { key: "sector", label: "Setor" },
                        { key: "totalRequests", label: "Total Requisições" },
                        { key: "totalItemsRequested", label: "Itens Solicitados" },
                        { key: "totalItemsDelivered", label: "Itens Entregues" },
                      ],
                      `saidas-por-setor-${startDate}-a-${endDate}`,
                      `Período: ${formatDateBR(startDate)} a ${formatDateBR(endDate)}`
                    )
                  }>
                    <Download className="w-4 h-4 mr-1" /> CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <PeriodFilter startDate={startDate} endDate={endDate} onStartDateChange={setStartDate} onEndDateChange={setEndDate} />

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <SummaryCard title="Setores" value={(exitBySector || []).length} icon={BarChart3} color="blue" />
                <SummaryCard
                  title="Total Requisições"
                  value={(exitBySector || []).reduce((acc: number, s: any) => acc + s.totalRequests, 0)}
                  icon={Package}
                  color="green"
                />
                <SummaryCard
                  title="Itens Entregues"
                  value={(exitBySector || []).reduce((acc: number, s: any) => acc + s.totalItemsDelivered, 0)}
                  icon={TrendingDown}
                  color="orange"
                />
              </div>

              {(exitBySector || []).length > 0 ? (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr className="border-b">
                        <th className="text-left py-3 px-3 font-medium">Setor</th>
                        <th className="text-right py-3 px-3 font-medium">Requisições</th>
                        <th className="text-right py-3 px-3 font-medium">Itens Solicitados</th>
                        <th className="text-right py-3 px-3 font-medium">Itens Entregues</th>
                        <th className="text-right py-3 px-3 font-medium">% Entrega</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(exitBySector || []).map((item: any, index: number) => (
                        <tr key={index} className="border-b hover:bg-muted/30">
                          <td className="py-2.5 px-3 font-medium">{item.sector}</td>
                          <td className="text-right py-2.5 px-3">{item.totalRequests}</td>
                          <td className="text-right py-2.5 px-3">{item.totalItemsRequested}</td>
                          <td className="text-right py-2.5 px-3">{item.totalItemsDelivered}</td>
                          <td className="text-right py-2.5 px-3">
                            <span className={`text-xs px-2 py-0.5 rounded ${item.totalItemsRequested > 0 && (item.totalItemsDelivered / item.totalItemsRequested) >= 0.8 ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                              {item.totalItemsRequested > 0 ? Math.round((item.totalItemsDelivered / item.totalItemsRequested) * 100) : 0}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma requisição de saída no período</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ SAÍDAS POR COLABORADOR ============ */}
        <TabsContent value="exit-collab" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Requisições por Colaborador</CardTitle>
                  <CardDescription>Quantidade de requisições por colaborador</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    const summary = (exitByCollab || []).map((c: any) => `${c.collaboratorName} (${c.sector}): ${c.totalRequests} requisições, ${c.totalItemsRequested} itens`).join("\n");
                    handleSendEmail(`Relatório - Requisições por Colaborador (${startDate} a ${endDate})`, summary);
                  }}>
                    <Mail className="w-4 h-4 mr-1" /> Enviar
                  </Button>
                  <Button size="sm" onClick={() =>
                    exportCSVBrazilian(
                      exitByCollab || [],
                      [
                        { key: "collaboratorName", label: "Colaborador" },
                        { key: "sector", label: "Setor" },
                        { key: "totalRequests", label: "Total Requisições" },
                        { key: "totalItemsRequested", label: "Itens Solicitados" },
                      ],
                      `requisicoes-colaborador-${startDate}-a-${endDate}`,
                      `Período: ${formatDateBR(startDate)} a ${formatDateBR(endDate)}`
                    )
                  }>
                    <Download className="w-4 h-4 mr-1" /> CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <PeriodFilter startDate={startDate} endDate={endDate} onStartDateChange={setStartDate} onEndDateChange={setEndDate} />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-muted/30 rounded-lg">
                <div>
                  <Label className="text-xs">Filtrar por Setor</Label>
                  <Select value={sectorFilter || "all"} onValueChange={(v) => setSectorFilter(v === "all" ? "" : v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {availableSectors.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <SummaryCard title="Colaboradores" value={(exitByCollab || []).length} icon={BarChart3} color="blue" />
                <SummaryCard
                  title="Total Itens"
                  value={(exitByCollab || []).reduce((acc: number, c: any) => acc + c.totalItemsRequested, 0)}
                  icon={Package}
                  color="green"
                />
              </div>

              {(exitByCollab || []).length > 0 ? (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr className="border-b">
                        <th className="text-left py-3 px-3 font-medium">Colaborador</th>
                        <th className="text-left py-3 px-3 font-medium">Setor</th>
                        <th className="text-right py-3 px-3 font-medium">Requisições</th>
                        <th className="text-right py-3 px-3 font-medium">Itens Solicitados</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(exitByCollab || []).map((item: any, index: number) => (
                        <tr key={index} className="border-b hover:bg-muted/30">
                          <td className="py-2.5 px-3 font-medium">{item.collaboratorName}</td>
                          <td className="py-2.5 px-3 text-muted-foreground">{item.sector}</td>
                          <td className="text-right py-2.5 px-3">{item.totalRequests}</td>
                          <td className="text-right py-2.5 px-3">{item.totalItemsRequested}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma requisição no período</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ HISTÓRICO DE PREÇOS ============ */}
        <TabsContent value="price-history" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Histórico de Preços</CardTitle>
                  <CardDescription>Evolução dos preços de compra por produto</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    const summary = (priceHistory || []).slice(0, 50).map((p: any) => `${formatDateBR(p.createdAt)} | ${p.productDescription} | ${formatCurrencyBR(p.pricePerUnit)}/un | Qtd: ${p.quantity}`).join("\n");
                    handleSendEmail(`Relatório - Histórico de Preços (${startDate} a ${endDate})`, summary);
                  }}>
                    <Mail className="w-4 h-4 mr-1" /> Enviar
                  </Button>
                  <Button size="sm" onClick={() =>
                    exportCSVBrazilian(
                      (priceHistory || []).map((p: any) => ({ ...p, createdAt: formatDateBR(p.createdAt) })),
                      [
                        { key: "createdAt", label: "Data" },
                        { key: "productDescription", label: "Produto" },
                        { key: "quantity", label: "Quantidade" },
                        { key: "pricePerUnit", label: "Preço Unitário" },
                        { key: "totalValue", label: "Valor Total" },
                        { key: "lote", label: "Lote" },
                        { key: "notes", label: "Observações" },
                      ],
                      `historico-precos-${startDate}-a-${endDate}`,
                      `Período: ${formatDateBR(startDate)} a ${formatDateBR(endDate)}`
                    )
                  }>
                    <Download className="w-4 h-4 mr-1" /> CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <PeriodFilter startDate={startDate} endDate={endDate} onStartDateChange={setStartDate} onEndDateChange={setEndDate} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg">
                <div>
                  <Label className="text-xs">Produto</Label>
                  <Select value={productFilter || "all"} onValueChange={(v) => setProductFilter(v === "all" ? "" : v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {(productsList || []).map((p: any) => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.description}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <SummaryCard title="Registros" value={(priceHistory || []).length} icon={BarChart3} color="blue" />
                <SummaryCard
                  title="Valor Total"
                  value={formatCurrencyBR((priceHistory || []).reduce((acc: number, p: any) => acc + p.totalValue, 0))}
                  icon={TrendingDown}
                  color="purple"
                />
                <SummaryCard
                  title="Preço Médio"
                  value={formatCurrencyBR((priceHistory || []).length > 0 ? (priceHistory || []).reduce((acc: number, p: any) => acc + p.pricePerUnit, 0) / (priceHistory || []).length : 0)}
                  icon={Package}
                  color="green"
                />
              </div>

              {(priceHistory || []).length > 0 ? (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr className="border-b">
                        <th className="text-left py-3 px-3 font-medium">Data</th>
                        <th className="text-left py-3 px-3 font-medium">Produto</th>
                        <th className="text-right py-3 px-3 font-medium">Qtd.</th>
                        <th className="text-right py-3 px-3 font-medium">Preço Un.</th>
                        <th className="text-right py-3 px-3 font-medium">Valor Total</th>
                        <th className="text-left py-3 px-3 font-medium">Lote</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(priceHistory || []).map((item: any, index: number) => (
                        <tr key={index} className="border-b hover:bg-muted/30">
                          <td className="py-2.5 px-3 text-xs">{formatDateBR(item.createdAt)}</td>
                          <td className="py-2.5 px-3">{item.productDescription}</td>
                          <td className="text-right py-2.5 px-3">{item.quantity}</td>
                          <td className="text-right py-2.5 px-3 font-medium">{formatCurrencyBR(item.pricePerUnit)}</td>
                          <td className="text-right py-2.5 px-3 font-medium">{formatCurrencyBR(item.totalValue)}</td>
                          <td className="py-2.5 px-3 text-muted-foreground">{item.lote || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum registro de preço no período</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ PRODUTOS SEM MOVIMENTAÇÃO ============ */}
        <TabsContent value="no-movement" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Produtos Sem Movimentação</CardTitle>
                  <CardDescription>Produtos que não tiveram nenhuma movimentação no período</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    const summary = (productsWithoutMov || []).map((p: any) => `${p.description} (${p.classification}) - Qtd: ${p.currentQuantity}`).join("\n");
                    handleSendEmail(`Relatório - Produtos Sem Movimentação (${startDate} a ${endDate})`, `${(productsWithoutMov || []).length} produtos sem movimentação:\n\n${summary}`);
                  }}>
                    <Mail className="w-4 h-4 mr-1" /> Enviar
                  </Button>
                  <Button size="sm" onClick={() =>
                    exportCSVBrazilian(
                      productsWithoutMov || [],
                      [
                        { key: "description", label: "Descrição" },
                        { key: "classification", label: "Classificação" },
                        { key: "currentQuantity", label: "Quantidade Atual" },
                        { key: "localAlocacao", label: "Local" },
                      ],
                      `produtos-sem-movimentacao-${startDate}-a-${endDate}`,
                      `Período: ${formatDateBR(startDate)} a ${formatDateBR(endDate)}`
                    )
                  }>
                    <Download className="w-4 h-4 mr-1" /> CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <PeriodFilter startDate={startDate} endDate={endDate} onStartDateChange={setStartDate} onEndDateChange={setEndDate} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg">
                <div>
                  <Label className="text-xs">Classificação</Label>
                  <Select value={classificationFilter || "all"} onValueChange={(v) => setClassificationFilter(v === "all" ? "" : v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="estoque">Estoque</SelectItem>
                      <SelectItem value="uso_especifico">Uso Específico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <SummaryCard title="Produtos Parados" value={(productsWithoutMov || []).length} icon={AlertTriangle} color="orange" />
                <SummaryCard
                  title="Estoque Parado"
                  value={(productsWithoutMov || []).reduce((acc: number, p: any) => acc + p.currentQuantity, 0) + " un"}
                  icon={Package}
                  color="red"
                />
              </div>

              {(productsWithoutMov || []).length > 0 ? (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr className="border-b">
                        <th className="text-left py-3 px-3 font-medium">Descrição</th>
                        <th className="text-center py-3 px-3 font-medium">Classificação</th>
                        <th className="text-right py-3 px-3 font-medium">Quantidade</th>
                        <th className="text-left py-3 px-3 font-medium">Local</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(productsWithoutMov || []).map((item: any, index: number) => (
                        <tr key={index} className="border-b hover:bg-muted/30">
                          <td className="py-2.5 px-3">{item.description}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded ${item.classification === "estoque" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                              {item.classification === "estoque" ? "Estoque" : "Uso Específico"}
                            </span>
                          </td>
                          <td className="text-right py-2.5 px-3 font-medium">{item.currentQuantity}</td>
                          <td className="py-2.5 px-3 text-muted-foreground">{item.localAlocacao || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-4 bg-green-50 rounded-lg">
                  <Package className="w-5 h-5 text-green-600" />
                  <p className="text-sm text-green-800">Todos os produtos tiveram movimentação no período!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ SOLICITAÇÕES DE COMPRA POR STATUS ============ */}
        <TabsContent value="purchase-status" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Solicitações de Compra por Status</CardTitle>
                  <CardDescription>Distribuição das solicitações de compra por status</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    const summary = (purchaseByStatus || []).map((p: any) => `${statusLabels[p.status] || p.status}: ${p.total}`).join("\n");
                    handleSendEmail(`Relatório - Solicitações de Compra por Status (${startDate} a ${endDate})`, summary);
                  }}>
                    <Mail className="w-4 h-4 mr-1" /> Enviar
                  </Button>
                  <Button size="sm" onClick={() =>
                    exportCSVBrazilian(
                      (purchaseByStatus || []).map((p: any) => ({ ...p, statusLabel: statusLabels[p.status] || p.status })),
                      [
                        { key: "statusLabel", label: "Status" },
                        { key: "total", label: "Quantidade" },
                      ],
                      `solicitacoes-por-status-${startDate}-a-${endDate}`,
                      `Período: ${formatDateBR(startDate)} a ${formatDateBR(endDate)}`
                    )
                  }>
                    <Download className="w-4 h-4 mr-1" /> CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <PeriodFilter startDate={startDate} endDate={endDate} onStartDateChange={setStartDate} onEndDateChange={setEndDate} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg">
                <div>
                  <Label className="text-xs">Filtrar por Setor</Label>
                  <Select value={sectorFilter || "all"} onValueChange={(v) => setSectorFilter(v === "all" ? "" : v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {availableSectors.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <SummaryCard
                  title="Total Solicitações"
                  value={(purchaseByStatus || []).reduce((acc: number, p: any) => acc + p.total, 0)}
                  icon={BarChart3}
                  color="blue"
                />
                <SummaryCard
                  title="Finalizadas"
                  value={(purchaseByStatus || []).find((p: any) => p.status === "finalizado")?.total || 0}
                  icon={Package}
                  color="green"
                />
                <SummaryCard
                  title="Em Andamento"
                  value={(purchaseByStatus || []).filter((p: any) => p.status !== "finalizado").reduce((acc: number, p: any) => acc + p.total, 0)}
                  icon={TrendingDown}
                  color="orange"
                />
              </div>

              {(purchaseByStatus || []).length > 0 ? (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr className="border-b">
                        <th className="text-left py-3 px-3 font-medium">Status</th>
                        <th className="text-right py-3 px-3 font-medium">Quantidade</th>
                        <th className="text-right py-3 px-3 font-medium">% do Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(purchaseByStatus || []).map((item: any, index: number) => {
                        const total = (purchaseByStatus || []).reduce((acc: number, p: any) => acc + p.total, 0);
                        const percentage = total > 0 ? Math.round((item.total / total) * 100) : 0;
                        return (
                          <tr key={index} className="border-b hover:bg-muted/30">
                            <td className="py-2.5 px-3">
                              <span className="font-medium">{statusLabels[item.status] || item.status}</span>
                            </td>
                            <td className="text-right py-2.5 px-3 font-medium">{item.total}</td>
                            <td className="text-right py-2.5 px-3">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-16 bg-muted rounded-full h-2">
                                  <div className="bg-primary h-2 rounded-full" style={{ width: `${percentage}%` }} />
                                </div>
                                <span className="text-xs text-muted-foreground">{percentage}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma solicitação no período</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ SUGESTÕES DE COMPRA ============ */}
        <TabsContent value="suggested" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Sugestões de Compra</CardTitle>
                  <CardDescription>Produtos abaixo do estoque mínimo que precisam ser repostos</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    const summary = (suggestedPurchases || []).map((p: any) => `${p.description}: Atual ${p.currentQuantity}, Mín ${p.minStock}, Sugerir ${p.suggestedQuantity}`).join("\n");
                    handleSendEmail("Relatório - Sugestões de Compra", `${(suggestedPurchases || []).length} produtos precisam de reposição:\n\n${summary}`);
                  }}>
                    <Mail className="w-4 h-4 mr-1" /> Enviar
                  </Button>
                  <Button size="sm" onClick={() =>
                    exportCSVBrazilian(
                      suggestedPurchases || [],
                      [
                        { key: "description", label: "Descrição" },
                        { key: "currentQuantity", label: "Estoque Atual" },
                        { key: "minStock", label: "Estoque Mínimo" },
                        { key: "maxStock", label: "Estoque Máximo" },
                        { key: "suggestedQuantity", label: "Quantidade Sugerida" },
                        { key: "classification", label: "Classificação" },
                      ],
                      `sugestoes-compra-${new Date().toISOString().split("T")[0]}`
                    )
                  }>
                    <Download className="w-4 h-4 mr-1" /> CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <SummaryCard title="Produtos em Falta" value={(suggestedPurchases || []).length} icon={AlertTriangle} color="red" />
                <SummaryCard
                  title="Total a Comprar"
                  value={(suggestedPurchases || []).reduce((acc: number, p: any) => acc + p.suggestedQuantity, 0) + " un"}
                  icon={Package}
                  color="orange"
                />
                <SummaryCard
                  title="Urgentes (Zerados)"
                  value={(suggestedPurchases || []).filter((p: any) => p.currentQuantity === 0).length}
                  icon={TrendingDown}
                  color="red"
                />
              </div>

              {(suggestedPurchases || []).length > 0 ? (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr className="border-b">
                        <th className="text-left py-3 px-3 font-medium">Descrição</th>
                        <th className="text-center py-3 px-3 font-medium">Classificação</th>
                        <th className="text-right py-3 px-3 font-medium">Atual</th>
                        <th className="text-right py-3 px-3 font-medium">Mínimo</th>
                        <th className="text-right py-3 px-3 font-medium">Máximo</th>
                        <th className="text-right py-3 px-3 font-medium">Comprar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(suggestedPurchases || []).map((item: any, index: number) => (
                        <tr key={index} className={`border-b hover:bg-muted/30 ${item.currentQuantity === 0 ? "bg-red-50" : "bg-yellow-50"}`}>
                          <td className="py-2.5 px-3">{item.description}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded ${item.classification === "estoque" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                              {item.classification === "estoque" ? "Estoque" : "Uso Específico"}
                            </span>
                          </td>
                          <td className="text-right py-2.5 px-3 font-medium">{item.currentQuantity}</td>
                          <td className="text-right py-2.5 px-3 text-muted-foreground">{item.minStock}</td>
                          <td className="text-right py-2.5 px-3 text-muted-foreground">{item.maxStock}</td>
                          <td className="text-right py-2.5 px-3 font-bold text-orange-600">{item.suggestedQuantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-4 bg-green-50 rounded-lg">
                  <Package className="w-5 h-5 text-green-600" />
                  <p className="text-sm text-green-800">Nenhum produto abaixo do estoque mínimo. Seu estoque está em dia!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Google Sheets notice */}
      <Card className="border-dashed">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground text-center">
            Exportação para Google Sheets estará disponível em breve. Configure as credenciais de serviço do Google para habilitar esta funcionalidade.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
