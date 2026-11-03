import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Search, Plus, Eye, Edit, Building2 } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  ativo: "Ativo", em_uso: "Em Uso", em_estoque: "Em Estoque",
  em_manutencao: "Em Manutenção", em_transferencia: "Em Transferência",
  extraviado: "Extraviado", em_inventario: "Em Inventário", baixado: "Baixado",
};

const STATUS_COLORS: Record<string, string> = {
  ativo: "bg-green-100 text-green-800", em_uso: "bg-blue-100 text-blue-800",
  em_estoque: "bg-cyan-100 text-cyan-800", em_manutencao: "bg-yellow-100 text-yellow-800",
  em_transferencia: "bg-purple-100 text-purple-800", extraviado: "bg-red-100 text-red-800",
  em_inventario: "bg-orange-100 text-orange-800", baixado: "bg-gray-100 text-gray-800",
};

const CONSERVATION_LABELS: Record<string, string> = {
  novo: "Novo", excelente: "Excelente", bom: "Bom",
  regular: "Regular", ruim: "Ruim", inservivel: "Inservível",
};

export default function AssetList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [, setLocation] = useLocation();

  const { data: assets = [], isLoading } = trpc.assets.list.useQuery({
    search: search || undefined,
    status: statusFilter || undefined,
    categoryId: categoryFilter ? parseInt(categoryFilter) : undefined,
  });
  const { data: categories = [] } = trpc.assets.categories.list.useQuery();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bens Patrimoniais</h1>
          <p className="text-gray-600 mt-1">{assets.length} patrimônio(s) encontrado(s)</p>
        </div>
        <Button onClick={() => setLocation("/patrimonio/novo")} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> Novo Patrimônio
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por código, descrição, marca, modelo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Situação" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Situações</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter || "all"} onValueChange={(v) => setCategoryFilter(v === "all" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Categorias</SelectItem>
                {categories.filter((c: any) => !c.parentId).map((c: any) => (
                  <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Carregando...</div>
      ) : assets.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Nenhum patrimônio encontrado</h3>
            <p className="text-gray-600 mt-1">Cadastre o primeiro patrimônio clicando no botão acima.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Código</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Descrição</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Marca/Modelo</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Situação</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Conservação</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Valor</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {assets.map((asset: any) => (
                  <tr key={asset.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-blue-600 font-medium">{asset.code}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{asset.description}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {[asset.brand, asset.model].filter(Boolean).join(" / ") || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[asset.status] || "bg-gray-100"}`}>
                        {STATUS_LABELS[asset.status] || asset.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{CONSERVATION_LABELS[asset.conservationState] || "-"}</td>
                    <td className="px-4 py-3 text-gray-900">
                      {asset.acquisitionValue ? `R$ ${parseFloat(asset.acquisitionValue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setLocation(`/patrimonio/bens/${asset.id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setLocation(`/patrimonio/bens/${asset.id}`)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
