import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Building2, Wrench, Package, AlertTriangle, DollarSign, MapPin, User, Archive } from "lucide-react";
import { useLocation } from "wouter";

export default function AssetDashboard() {
  const { data: stats, isLoading } = trpc.assets.dashboard.useQuery();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Patrimônio</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2"><div className="h-4 bg-gray-200 rounded w-24"></div></CardHeader>
              <CardContent><div className="h-8 bg-gray-200 rounded w-16"></div></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const cards = [
    { title: "Total de Bens", value: stats?.total || 0, icon: Building2, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Valor Patrimonial", value: `R$ ${(stats?.totalValue || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: DollarSign, color: "text-green-600", bg: "bg-green-50" },
    { title: "Em Uso", value: stats?.inUse || 0, icon: Package, color: "text-indigo-600", bg: "bg-indigo-50" },
    { title: "Em Estoque", value: stats?.inStock || 0, icon: Archive, color: "text-cyan-600", bg: "bg-cyan-50" },
    { title: "Em Manutenção", value: stats?.inMaintenance || 0, icon: Wrench, color: "text-yellow-600", bg: "bg-yellow-50" },
    { title: "Baixados", value: stats?.disposed || 0, icon: AlertTriangle, color: "text-gray-500", bg: "bg-gray-50" },
    { title: "Sem Localização", value: stats?.noLocation || 0, icon: MapPin, color: "text-red-600", bg: "bg-red-50" },
    { title: "Sem Responsável", value: stats?.noResponsible || 0, icon: User, color: "text-orange-600", bg: "bg-orange-50" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestão Patrimonial</h1>
          <p className="text-gray-600 mt-1">Controle completo dos bens patrimoniais</p>
        </div>
        <button
          onClick={() => setLocation("/patrimonio/novo")}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          + Novo Patrimônio
        </button>
      </div>

      {/* Cards de Indicadores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <Card key={i} className={`${card.bg} border-none shadow-sm`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">{card.title}</CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${card.color}`}>
                {typeof card.value === "number" ? card.value.toLocaleString("pt-BR") : card.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alertas */}
      {((stats?.noLocation || 0) > 0 || (stats?.noResponsible || 0) > 0 || (stats?.inMaintenance || 0) > 0) && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-lg text-yellow-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Alertas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(stats?.noLocation || 0) > 0 && (
              <p className="text-yellow-800 cursor-pointer hover:underline" onClick={() => setLocation("/patrimonio/bens")}>
                <strong>{stats?.noLocation}</strong> patrimônio(s) sem localização definida
              </p>
            )}
            {(stats?.noResponsible || 0) > 0 && (
              <p className="text-yellow-800 cursor-pointer hover:underline" onClick={() => setLocation("/patrimonio/bens")}>
                <strong>{stats?.noResponsible}</strong> patrimônio(s) sem responsável definido
              </p>
            )}
            {(stats?.inMaintenance || 0) > 0 && (
              <p className="text-yellow-800 cursor-pointer hover:underline" onClick={() => setLocation("/patrimonio/bens")}>
                <strong>{stats?.inMaintenance}</strong> patrimônio(s) em manutenção
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Ações Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation("/patrimonio/bens")}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Ver Patrimônios</h3>
              <p className="text-sm text-gray-600">Listar e gerenciar bens</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation("/patrimonio/categorias")}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Package className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Categorias</h3>
              <p className="text-sm text-gray-600">Gerenciar categorias</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation("/patrimonio/locais")}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <MapPin className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Locais</h3>
              <p className="text-sm text-gray-600">Gerenciar localizações</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
