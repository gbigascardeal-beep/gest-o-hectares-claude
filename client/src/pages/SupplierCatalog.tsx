import { can } from "@shared/roles";
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { formatCnpj, onlyDigits } from "@shared/cnpj";
import { useCnpjLookup } from "@/hooks/useCnpjLookup";
import type { Supplier } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Building2, ExternalLink, Globe, Loader2, Mail, MapPin, Pencil, Phone, Plus, Search, Star, Trash2, ClipboardList, User,
} from "lucide-react";
import { toast } from "sonner";

const DEFAULT_CITY = "Dourados, MS";
const CITY_STORAGE_KEY = "catalogo-fornecedores:cidade";

const RADIUS_OPTIONS = [
  { value: "10", label: "10 km" },
  { value: "25", label: "25 km" },
  { value: "50", label: "50 km" },
  { value: "100", label: "100 km" },
  { value: "200", label: "200 km" },
  { value: "brasil", label: "Todo o Brasil" },
];

type SortKey = "relevancia" | "distancia" | "avaliacao";

function loadCity() {
  try {
    return localStorage.getItem(CITY_STORAGE_KEY) || DEFAULT_CITY;
  } catch {
    return DEFAULT_CITY;
  }
}
function saveCity(city: string) {
  try {
    localStorage.setItem(CITY_STORAGE_KEY, city);
  } catch {
    /* sem armazenamento: tudo bem */
  }
}
const isHttpUrl = (url?: string | null): url is string => !!url && /^https?:\/\//i.test(url);
const hostOf = (url: string) => {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
};
const formatKm = (km: number) => `${km.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`;

/* ------------------------------------------------------------------ */
/* Aba 1: Encontrar fornecedores (busca externa por localização)      */
/* ------------------------------------------------------------------ */
function FindSuppliers() {
  const [keyword, setKeyword] = useState("");
  const [city, setCity] = useState(loadCity);
  const [scope, setScope] = useState("25");
  const [sort, setSort] = useState<SortKey>("relevancia");

  const { data: info } = trpc.supplierCatalog.info.useQuery();
  const isOsm = info?.provider === "osm";
  const radiusOptions = RADIUS_OPTIONS.filter((o) => {
    if (o.value === "brasil") return !!info?.allowNationwide;
    return Number(o.value) <= (info?.maxRadiusKm ?? 500);
  });
  const effectiveScope = radiusOptions.some((o) => o.value === scope) ? scope : "25";
  const mapsSearchUrl = `https://www.google.com/maps/search/${encodeURIComponent(`${keyword.trim()} ${city.trim() ? `perto de ${city.trim()}` : ""}`.trim())}`;

  const search = trpc.supplierCatalog.search.useMutation({
    onError: (error) => toast.error(error.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyword.trim().length < 2) return toast.error("Digite o que você procura (ex.: materiais de construção)");
    if (effectiveScope !== "brasil" && !city.trim()) return toast.error("Informe a cidade de referência");
    saveCity(city);
    search.mutate({
      keyword,
      city: city.trim() || undefined,
      radiusKm: effectiveScope === "brasil" ? null : Number(effectiveScope),
    });
  };

  const results = useMemo(() => {
    const list = [...(search.data?.results ?? [])];
    if (sort === "distancia") list.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    if (sort === "avaliacao") list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.ratingCount ?? 0) - (a.ratingCount ?? 0));
    return list;
  }, [search.data, sort]);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold">Buscar empresas na região ou em todo o Brasil</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Consulte estabelecimentos por palavra-chave na região ou em todo o Brasil. A busca externa serve para descoberta e não cria
            fornecedores no seu catálogo. São exibidas até 12 empresas por pesquisa.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 grid gap-4 md:grid-cols-[2fr_2fr_1fr_1fr_auto] items-end">
            <div className="space-y-2">
              <Label htmlFor="kw">Palavra-chave</Label>
              <Input id="kw" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Ex.: materiais de construção" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Cidade de referência</Label>
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex.: Dourados, MS" />
            </div>
            <div className="space-y-2">
              <Label>Alcance da busca</Label>
              <Select value={effectiveScope} onValueChange={setScope}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {radiusOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ordenar</Label>
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevancia">Relevância</SelectItem>
                  <SelectItem value="distancia">Distância</SelectItem>
                  {!isOsm && <SelectItem value="avaliacao">Avaliação</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={search.isPending} className="h-9">
              {search.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
              Buscar
            </Button>
          </form>

          {isOsm && (
            <p className="text-xs text-muted-foreground mt-4">
              Busca gratuita pelo mapa aberto (OpenStreetMap), com alcance de até {info?.maxRadiusKm} km. Algumas empresas podem não
              aparecer e telefone ou site nem sempre estão preenchidos.
              {keyword.trim().length >= 2 && (
                <>
                  {" "}
                  <a className="underline" href={mapsSearchUrl} target="_blank" rel="noopener noreferrer">Abrir esta busca no Google Maps</a>
                </>
              )}
            </p>
          )}
        </CardContent>
      </Card>

      {search.isPending && (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      )}

      {search.isError && !search.isPending && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-5 text-sm">
          <p className="font-medium">Não foi possível buscar agora</p>
          <p className="text-muted-foreground mt-1">{search.error.message}</p>
        </div>
      )}

      {search.isIdle && (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <Search className="w-8 h-8 mx-auto text-muted-foreground" />
          <p className="font-semibold mt-3">Pronto para encontrar fornecedores</p>
          <p className="text-sm text-muted-foreground mt-1">
            Use uma categoria, produto ou serviço. A pesquisa é feita somente quando você clicar em Buscar.
          </p>
        </div>
      )}

      {search.isSuccess && results.length === 0 && (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <p className="font-semibold">Nenhuma empresa encontrada</p>
          <p className="text-sm text-muted-foreground mt-1">
            Tente outra palavra-chave ou aumente o alcance.{" "}
            <a className="underline" href={mapsSearchUrl} target="_blank" rel="noopener noreferrer">Procurar no Google Maps</a>
          </p>
        </div>
      )}

      {search.isSuccess && results.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {search.data.totalFound > results.length
              ? `Mostrando ${results.length} de ${search.data.totalFound} empresas`
              : `${results.length} ${results.length === 1 ? "empresa encontrada" : "empresas encontradas"}`}
            {search.data.origin ? ` · referência: ${search.data.origin}` : ""}
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {results.map((place) => (
              <Card key={place.id}>
                <CardContent className="pt-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold leading-snug">{place.name}</h3>
                    {place.distanceKm !== null && <Badge variant="secondary" className="shrink-0">{formatKm(place.distanceKm)}</Badge>}
                  </div>
                  {place.rating !== null && (
                    <p className="text-sm flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      {place.rating.toLocaleString("pt-BR")}
                      {place.ratingCount !== null && <span className="text-muted-foreground">({place.ratingCount})</span>}
                    </p>
                  )}
                  <div className="space-y-1.5 text-sm text-muted-foreground">
                    {place.address && <p className="flex gap-2"><MapPin className="w-4 h-4 mt-0.5 shrink-0" />{place.address}</p>}
                    {place.phone && (
                      <p className="flex gap-2 items-center"><Phone className="w-4 h-4 shrink-0" />
                        <a className="hover:underline" href={`tel:${place.phone.replace(/[^\d+]/g, "")}`}>{place.phone}</a>
                      </p>
                    )}
                    {isHttpUrl(place.website) && (
                      <p className="flex gap-2 items-center"><Globe className="w-4 h-4 shrink-0" />
                        <a className="hover:underline" href={place.website} target="_blank" rel="noopener noreferrer">{hostOf(place.website)}</a>
                      </p>
                    )}
                  </div>
                  {isHttpUrl(place.mapsUrl) && (
                    <Button asChild variant="outline" size="sm">
                      <a href={place.mapsUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" /> Ver no mapa
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Resultados externos são só para consulta. Para guardar um fornecedor, use "Cadastrar fornecedor próprio" com o CNPJ e os dados
            confirmados diretamente com a empresa.
            {search.data.source === "osm" && " Dados © contribuidores do OpenStreetMap."}
          </p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Aba 2: Meu catálogo (fornecedores cadastrados no sistema)          */
/* ------------------------------------------------------------------ */
function MyCatalog({ onEdit }: { onEdit: (supplier: Supplier) => void }) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { data: suppliers = [], isLoading } = trpc.suppliers.list.useQuery();

  const [text, setText] = useState("");
  const [category, setCategory] = useState("");
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  const refresh = () => utils.suppliers.list.invalidate();
  const favorite = trpc.suppliers.setFavorite.useMutation({ onSuccess: refresh, onError: (e) => toast.error(e.message) });
  const remove = trpc.suppliers.remove.useMutation({
    onSuccess: () => {
      toast.success("Fornecedor removido do catálogo");
      refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const canManage = can(user?.role, "manageOrders");

  const filtered = useMemo(() => {
    const q = text.trim().toLowerCase();
    const qDigits = onlyDigits(q);
    const cat = category.trim().toLowerCase();
    return suppliers
      .filter((s) => !onlyFavorites || s.isFavorite)
      .filter((s) => !cat || (s.category ?? "").toLowerCase().includes(cat))
      .filter((s) => {
        if (!q) return true;
        const haystack = [s.companyName, s.tradeName, s.contactName, s.email, s.phone, s.category, s.city].join(" ").toLowerCase();
        return haystack.includes(q) || (qDigits.length >= 3 && onlyDigits(s.cnpj).includes(qDigits));
      })
      .sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite) || a.companyName.localeCompare(b.companyName, "pt-BR"));
  }, [suppliers, text, category, onlyFavorites]);

  const categories = useMemo(
    () => Array.from(new Set(suppliers.map((s) => s.category).filter((c): c is string => !!c))).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [suppliers]
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 grid gap-4 md:grid-cols-[2fr_1fr_auto] items-end">
          <div className="space-y-2">
            <Label htmlFor="q">Pesquisar no catálogo</Label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input id="q" className="pl-9" value={text} onChange={(e) => setText(e.target.value)} placeholder="Empresa, CNPJ, contato ou serviço" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cat">Categoria</Label>
            <Input id="cat" list="categorias-fornecedores" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex.: construção" />
            <datalist id="categorias-fornecedores">{categories.map((c) => <option key={c} value={c} />)}</datalist>
          </div>
          <label className="flex items-center gap-2 h-9 px-3 rounded-md border text-sm cursor-pointer">
            <Checkbox checked={onlyFavorites} onCheckedChange={(v) => setOnlyFavorites(v === true)} />
            Somente favoritos
          </label>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{filtered.length} {filtered.length === 1 ? "fornecedor" : "fornecedores"} no catálogo</span>
        <span>Dados internos e editáveis</span>
      </div>

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <ClipboardList className="w-8 h-8 mx-auto text-muted-foreground" />
          <p className="font-semibold mt-3">{suppliers.length === 0 ? "Seu catálogo ainda está vazio" : "Nenhum fornecedor encontrado"}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {suppliers.length === 0 ? 'Use "Cadastrar fornecedor próprio" para adicionar o primeiro.' : "Ajuste a pesquisa ou os filtros."}
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((s) => (
          <Card key={s.id}>
            <CardContent className="pt-5 space-y-3">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  aria-label={s.isFavorite ? "Tirar dos favoritos" : "Marcar como favorito"}
                  className="mt-0.5 shrink-0"
                  onClick={() => favorite.mutate({ id: s.id, isFavorite: !s.isFavorite })}
                >
                  <Star className={`w-5 h-5 ${s.isFavorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                </button>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold leading-snug break-words">{s.companyName}</h3>
                  {s.tradeName && <p className="text-sm text-muted-foreground break-words">{s.tradeName}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5">CNPJ {s.cnpj}</p>
                </div>
                {s.category && <Badge variant="secondary" className="shrink-0">{s.category}</Badge>}
              </div>

              <div className="space-y-1.5 text-sm text-muted-foreground">
                {s.contactName && <p className="flex gap-2 items-center"><User className="w-4 h-4 shrink-0" />{s.contactName}</p>}
                <p className="flex gap-2 items-center"><Phone className="w-4 h-4 shrink-0" />{s.phone || "Não informado"}</p>
                <p className="flex gap-2 items-center"><Mail className="w-4 h-4 shrink-0" />
                  {s.email ? <a className="hover:underline break-all" href={`mailto:${s.email}`}>{s.email}</a> : "Não informado"}
                </p>
                <p className="flex gap-2 items-center"><Globe className="w-4 h-4 shrink-0" />
                  {isHttpUrl(s.website)
                    ? <a className="hover:underline break-all" href={s.website} target="_blank" rel="noopener noreferrer">{hostOf(s.website)}</a>
                    : "Não informado"}
                </p>
                {(s.address || s.city) && (
                  <p className="flex gap-2"><MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                    {[s.address, [s.city, s.state].filter(Boolean).join(" · ")].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                {canManage && (
<Button variant="outline" size="sm" onClick={() => onEdit(s)}>
                  <Pencil className="w-4 h-4 mr-2" /> Editar
                </Button>
)}
                {canManage && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    disabled={remove.isPending}
                    onClick={() => {
                      if (window.confirm(`Remover "${s.companyName}" do catálogo? O histórico de compras é mantido.`)) remove.mutate(s.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Remover
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Janela de cadastro / edição                                         */
/* ------------------------------------------------------------------ */
function SupplierFormDialog({ supplier, onClose }: { supplier: Supplier | null; onClose: () => void }) {
  const utils = trpc.useUtils();
  const editing = !!supplier;
  const [form, setForm] = useState({
    cnpj: supplier?.cnpj ?? "",
    companyName: supplier?.companyName ?? "",
    tradeName: supplier?.tradeName ?? "",
    category: supplier?.category ?? "",
    contactName: supplier?.contactName ?? "",
    phone: supplier?.phone ?? "",
    email: supplier?.email ?? "",
    website: supplier?.website ?? "",
    cep: supplier?.cep ?? "",
    address: supplier?.address ?? "",
    city: supplier?.city ?? "",
    state: supplier?.state ?? "",
  });
  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));
  const cnpjLookup = useCnpjLookup((d) =>
    setForm((f) => ({
      ...f,
      companyName: d.companyName || f.companyName,
      tradeName: d.tradeName || f.tradeName,
      cep: d.cep || f.cep,
      address: d.address || f.address,
      city: d.city || f.city,
      state: d.state || f.state,
      phone: d.phone || f.phone,
      email: d.email || f.email,
    }))
  );

  const done = (message: string) => {
    toast.success(message);
    utils.suppliers.list.invalidate();
    onClose();
  };
  const createMutation = trpc.suppliers.create.useMutation({ onSuccess: () => done("Fornecedor cadastrado!"), onError: (e) => toast.error(e.message) });
  const updateMutation = trpc.suppliers.update.useMutation({ onSuccess: () => done("Fornecedor atualizado!"), onError: (e) => toast.error(e.message) });
  const saving = createMutation.isPending || updateMutation.isPending;

  const handleSave = () => {
    if (!form.companyName.trim()) return toast.error("Informe o nome da empresa");
    if (!editing && onlyDigits(form.cnpj).length !== 14) return toast.error("O CNPJ precisa ter 14 números");

    const { cnpj, ...fields } = form;
    if (editing && supplier) {
      updateMutation.mutate({ id: supplier.id, ...fields }); // texto vazio limpa o campo
    } else {
      const clean = Object.fromEntries(Object.entries(fields).filter(([, v]) => v.trim() !== "")) as typeof fields;
      createMutation.mutate({ ...clean, companyName: form.companyName, cnpj });
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar fornecedor" : "Cadastrar fornecedor próprio"}</DialogTitle>
          <DialogDescription>Use o CNPJ e as informações obtidas diretamente com a empresa.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>CNPJ {editing ? "" : "*"}</Label>
            <div className="flex gap-2">
              <Input value={form.cnpj} disabled={editing} inputMode="numeric" placeholder="00.000.000/0000-00"
                onChange={(e) => {
                  const formatted = formatCnpj(e.target.value);
                  setForm((f) => ({ ...f, cnpj: formatted }));
                  if (!editing) cnpjLookup.check(formatted);
                }} />
              {!editing && (
                <Button type="button" variant="outline" disabled={cnpjLookup.loading || onlyDigits(form.cnpj).length !== 14}
                  onClick={() => cnpjLookup.lookup(form.cnpj)}>
                  {cnpjLookup.loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                  Consultar
                </Button>
              )}
            </div>
            {!editing && <p className="text-xs text-muted-foreground">Ao digitar o CNPJ, os dados públicos da empresa são preenchidos sozinhos.</p>}
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Input value={form.category} onChange={set("category")} placeholder="Ex.: construção, elétrica" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Razão social / nome da empresa *</Label>
            <Input value={form.companyName} onChange={set("companyName")} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Nome fantasia</Label>
            <Input value={form.tradeName} onChange={set("tradeName")} />
          </div>
          <div className="space-y-2">
            <Label>Contato (pessoa)</Label>
            <Input value={form.contactName} onChange={set("contactName")} />
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input value={form.phone} onChange={set("phone")} inputMode="tel" />
          </div>
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input type="email" value={form.email} onChange={set("email")} />
          </div>
          <div className="space-y-2">
            <Label>Site</Label>
            <Input value={form.website} onChange={set("website")} placeholder="www.empresa.com.br" />
          </div>
          <div className="space-y-2">
            <Label>CEP</Label>
            <Input value={form.cep} onChange={set("cep")} inputMode="numeric" />
          </div>
          <div className="space-y-2">
            <Label>Endereço</Label>
            <Input value={form.address} onChange={set("address")} />
          </div>
          <div className="space-y-2">
            <Label>Cidade</Label>
            <Input value={form.city} onChange={set("city")} />
          </div>
          <div className="space-y-2">
            <Label>UF</Label>
            <Input value={form.state} maxLength={2} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value.toUpperCase() }))} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {editing ? "Salvar alterações" : "Cadastrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */
export default function SupplierCatalog() {
  const { user: currentUser } = useAuth();
  const canRegister = can(currentUser?.role, "manageOrders");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  const openForm = (supplier: Supplier | null) => {
    setEditing(supplier);
    setFormOpen(true);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Building2 className="w-4 h-4" /> Compras e fornecedores</p>
          <h1 className="text-3xl font-bold">Catálogo de fornecedores</h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            Encontre empresas na sua região ou em todo o Brasil e mantenha seu relacionamento comercial em um catálogo próprio, organizado e
            verificável.
          </p>
        </div>
        <div className="max-w-xs space-y-1">
          {canRegister && (
<Button onClick={() => openForm(null)}><Plus className="w-4 h-4 mr-2" /> Cadastrar fornecedor próprio</Button>
)}
          <p className="text-xs text-muted-foreground">
            Cadastre com CNPJ e informações obtidas diretamente da empresa; resultados externos não são copiados.
          </p>
        </div>
      </div>

      <Tabs defaultValue="encontrar" className="space-y-6">
        <TabsList>
          <TabsTrigger value="encontrar"><Search className="w-4 h-4 mr-2" /> Encontrar fornecedores</TabsTrigger>
          <TabsTrigger value="catalogo"><ClipboardList className="w-4 h-4 mr-2" /> Meu catálogo</TabsTrigger>
        </TabsList>
        <TabsContent value="encontrar" forceMount className="data-[state=inactive]:hidden"><FindSuppliers /></TabsContent>
        <TabsContent value="catalogo" forceMount className="data-[state=inactive]:hidden"><MyCatalog onEdit={openForm} /></TabsContent>
      </Tabs>

      {formOpen && <SupplierFormDialog supplier={editing} onClose={() => setFormOpen(false)} />}
    </div>
  );
}
