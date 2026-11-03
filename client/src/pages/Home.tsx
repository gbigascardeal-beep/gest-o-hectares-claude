import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { Package, AlertTriangle, TrendingUp, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b"];

export default function Home() {
  const { user } = useAuth();
  const { data: summary, isLoading: summaryLoading } = trpc.dashboard.summary.useQuery();
  const { data: movements, isLoading: movementsLoading } = trpc.dashboard.recentMovements.useQuery();
  const { data: suggestedPurchases } = trpc.reports.suggestedPurchases.useQuery();
  const { data: products } = trpc.products.list.useQuery({});

  const recentMovementsData = (movements || []).slice(0, 7).map((m) => ({
    date: new Date(m.createdAt).toLocaleDateString("pt-BR"),
    type: m.type,
  }));

  const movementCounts = recentMovementsData.reduce(
    (acc, m) => {
      if (m.type === "entrada") acc.entrada++;
      else acc.saida++;
      return acc;
    },
    { entrada: 0, saida: 0 }
  );

  const chartData = [
    { name: "Entradas", value: movementCounts.entrada },
    { name: "Saídas", value: movementCounts.saida },
  ];

  if (summaryLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Bem-vindo, {user?.name}! Aqui está um resumo do seu estoque.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total em Estoque</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalQuantity || 0}</div>
            <p className="text-xs text-muted-foreground">Unidades</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {(summary?.totalValue || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Valor em estoque</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abaixo do Mínimo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {summary?.productsBelowMinStock || 0}
            </div>
            <p className="text-xs text-muted-foreground">Produtos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalProducts || 0}</div>
            <p className="text-xs text-muted-foreground">Cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas Ativados</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {(products || []).filter((p: any) => {
                if (p.classification !== "estoque") return false;
                const minLimit = p.minStockEstoque || p.minStock;
                return p.currentQuantity <= minLimit && minLimit > 0;
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">Produtos em alerta</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(suggestedPurchases || []).length > 0 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>{(suggestedPurchases || []).length} produto(s)</strong> abaixo do estoque mínimo.
            Verifique as sugestões de compra no módulo de relatórios.
          </AlertDescription>
        </Alert>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Entradas e Saídas */}
        <Card>
          <CardHeader>
            <CardTitle>Movimentações Recentes</CardTitle>
            <CardDescription>Últimas 7 movimentações de estoque</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Produtos Abaixo do Mínimo */}
        <Card>
          <CardHeader>
            <CardTitle>Produtos com Alerta</CardTitle>
            <CardDescription>Itens que precisam de reposição</CardDescription>
          </CardHeader>
          <CardContent>
            {(suggestedPurchases || []).length > 0 ? (
              <div className="space-y-4">
                {(suggestedPurchases || []).slice(0, 5).map((product) => (
                  <div key={product.id} className="flex items-center justify-between border-b pb-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{product.description}</p>
                      <p className="text-xs text-muted-foreground">
                        Estoque: {product.currentQuantity} / Mínimo: {product.minStock}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm text-destructive">
                        {product.suggestedQuantity}
                      </p>
                      <p className="text-xs text-muted-foreground">Sugerir</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum produto abaixo do estoque mínimo
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resumo de Produtos */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo de Produtos</CardTitle>
          <CardDescription>Distribuição de produtos por centro de custo</CardDescription>
        </CardHeader>
        <CardContent>
          {(products || []).length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Descrição</th>
                    <th className="text-right py-2 px-2">Quantidade</th>
                  </tr>
                </thead>
                <tbody>
                  {(products || []).slice(0, 10).map((product) => (
                    <tr key={product.id} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-2">{product.description}</td>
                      <td className="text-right py-2 px-2">{product.currentQuantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum produto cadastrado
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
