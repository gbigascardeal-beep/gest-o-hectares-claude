import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  PackageCheck,
  Plus,
  RotateCcw,
  Search,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

const CONSERVATION_LABELS: Record<string, string> = {
  novo: "Novo",
  excelente: "Excelente",
  bom: "Bom",
  regular: "Regular",
  ruim: "Ruim",
  inservivel: "Inservível",
};

function localDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value?: string | Date | null) {
  if (!value) return "-";
  const date = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00`)
    : new Date(value);
  return date.toLocaleDateString("pt-BR");
}

function formatDateTime(value?: string | Date | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

type SelectedLoan = {
  id: number;
  assetCode: string;
  assetDescription: string;
  collaboratorName: string;
};

export default function AssetToolLoans() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"todos" | "pendente" | "devolvido">("pendente");
  const [collaborator, setCollaborator] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [toolSearch, setToolSearch] = useState("");
  const [selectedLoan, setSelectedLoan] = useState<SelectedLoan | null>(null);

  const [checkoutForm, setCheckoutForm] = useState({
    assetId: "",
    collaboratorName: "",
    collaboratorSector: "",
    expectedReturnDate: localDateString(),
    conditionAtWithdrawal: "bom",
    withdrawalNotes: "",
  });
  const [returnForm, setReturnForm] = useState({
    conditionAtReturn: "bom",
    returnNotes: "",
  });

  const queryInput = useMemo(() => ({
    search: search.trim() || undefined,
    status: status === "todos" ? undefined : status,
    collaborator: collaborator.trim() || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  }), [search, status, collaborator, startDate, endDate]);

  const { data: summary, isLoading: summaryLoading } = trpc.assets.tools.summary.useQuery();
  const { data: loans = [], isLoading: loansLoading } = trpc.assets.tools.loans.useQuery(queryInput);
  const { data: availableTools = [], isLoading: toolsLoading } = trpc.assets.tools.available.useQuery({
    search: toolSearch.trim() || undefined,
  });

  const refreshData = async () => {
    await Promise.all([
      utils.assets.tools.summary.invalidate(),
      utils.assets.tools.loans.invalidate(),
      utils.assets.tools.available.invalidate(),
      utils.assets.list.invalidate(),
    ]);
  };

  const checkoutMutation = trpc.assets.tools.checkout.useMutation({
    onSuccess: async () => {
      toast.success("Retirada registrada com sucesso");
      setCheckoutOpen(false);
      setCheckoutForm({
        assetId: "",
        collaboratorName: "",
        collaboratorSector: "",
        expectedReturnDate: localDateString(),
        conditionAtWithdrawal: "bom",
        withdrawalNotes: "",
      });
      setToolSearch("");
      await refreshData();
    },
    onError: error => toast.error(error.message || "Não foi possível registrar a retirada"),
  });

  const returnMutation = trpc.assets.tools.return.useMutation({
    onSuccess: async () => {
      toast.success("Devolução registrada com sucesso");
      setReturnOpen(false);
      setSelectedLoan(null);
      setReturnForm({ conditionAtReturn: "bom", returnNotes: "" });
      await refreshData();
    },
    onError: error => toast.error(error.message || "Não foi possível registrar a devolução"),
  });

  const handleCheckout = () => {
    if (!checkoutForm.assetId) {
      toast.error("Selecione a ferramenta");
      return;
    }
    if (checkoutForm.collaboratorName.trim().length < 2) {
      toast.error("Informe o colaborador responsável");
      return;
    }
    if (!checkoutForm.expectedReturnDate) {
      toast.error("Informe a data prevista de devolução");
      return;
    }

    checkoutMutation.mutate({
      assetId: Number(checkoutForm.assetId),
      collaboratorName: checkoutForm.collaboratorName.trim(),
      collaboratorSector: checkoutForm.collaboratorSector.trim() || undefined,
      expectedReturnDate: checkoutForm.expectedReturnDate,
      conditionAtWithdrawal: checkoutForm.conditionAtWithdrawal as "novo" | "excelente" | "bom" | "regular" | "ruim" | "inservivel",
      withdrawalNotes: checkoutForm.withdrawalNotes.trim() || undefined,
    });
  };

  const openReturnDialog = (loan: SelectedLoan) => {
    setSelectedLoan(loan);
    setReturnForm({ conditionAtReturn: "bom", returnNotes: "" });
    setReturnOpen(true);
  };

  const handleReturn = () => {
    if (!selectedLoan) return;
    returnMutation.mutate({
      loanId: selectedLoan.id,
      conditionAtReturn: returnForm.conditionAtReturn as "novo" | "excelente" | "bom" | "regular" | "ruim" | "inservivel",
      returnNotes: returnForm.returnNotes.trim() || undefined,
    });
  };

  const cards = [
    { label: "Ferramentas", value: summary?.totalTools ?? 0, icon: Wrench, tone: "text-slate-700 bg-slate-100" },
    { label: "Disponíveis", value: summary?.available ?? 0, icon: PackageCheck, tone: "text-emerald-700 bg-emerald-100" },
    { label: "Retiradas", value: summary?.pending ?? 0, icon: Clock3, tone: "text-amber-700 bg-amber-100" },
    { label: "Em atraso", value: summary?.overdue ?? 0, icon: AlertTriangle, tone: "text-red-700 bg-red-100" },
    { label: "Devolvidas hoje", value: summary?.returnedToday ?? 0, icon: CheckCircle2, tone: "text-blue-700 bg-blue-100" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Gestão patrimonial</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Controle de Ferramentas</h1>
          <p className="mt-1 text-muted-foreground">Registre retiradas, responsáveis e devoluções dos itens do almoxarifado.</p>
        </div>
        <Button onClick={() => setCheckoutOpen(true)} className="shrink-0">
          <Plus className="mr-2 h-4 w-4" /> Registrar retirada
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        {cards.map(card => (
          <Card key={card.label} className="shadow-sm">
            <CardContent className="flex items-center justify-between p-4 sm:p-5">
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="mt-1 text-2xl font-bold">{summaryLoading ? "—" : card.value}</p>
              </div>
              <div className={`rounded-xl p-2 sm:p-2.5 ${card.tone}`}><card.icon className="h-4 w-4 sm:h-5 sm:w-5" /></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="relative xl:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Patrimônio ou descrição" className="pl-9" />
          </div>
          <Input value={collaborator} onChange={event => setCollaborator(event.target.value)} placeholder="Colaborador" />
          <Select value={status} onValueChange={value => setStatus(value as typeof status)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="pendente">Pendentes</SelectItem>
              <SelectItem value="devolvido">Devolvidos</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => { setSearch(""); setCollaborator(""); setStatus("pendente"); setStartDate(""); setEndDate(""); }}>
            Limpar filtros
          </Button>
          <div><Label className="text-xs text-muted-foreground">Retirada a partir de</Label><Input type="date" value={startDate} onChange={event => setStartDate(event.target.value)} /></div>
          <div><Label className="text-xs text-muted-foreground">Retirada até</Label><Input type="date" value={endDate} onChange={event => setEndDate(event.target.value)} /></div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden shadow-sm">
        <CardHeader className="border-b bg-muted/20 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Movimentações de ferramentas</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">{loans.length} registro(s) encontrado(s)</p>
            </div>
            {summary && summary.overdue > 0 && (
              <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> {summary.overdue} em atraso</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loansLoading ? (
            <div className="py-14 text-center text-muted-foreground">Carregando movimentações...</div>
          ) : loans.length === 0 ? (
            <div className="flex flex-col items-center py-14 text-center">
              <Wrench className="h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 font-medium">Nenhuma movimentação encontrada</p>
              <p className="mt-1 text-sm text-muted-foreground">Registre uma retirada ou ajuste os filtros.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patrimônio</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Retirada</TableHead>
                    <TableHead>Devolução prevista</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loans.map(loan => (
                    <TableRow key={loan.id} className={loan.isOverdue ? "bg-red-50/60" : undefined}>
                      <TableCell className="font-mono font-semibold">{loan.assetCode}</TableCell>
                      <TableCell>
                        <p className="font-medium">{loan.assetDescription}</p>
                        {(loan.assetBrand || loan.assetModel) && <p className="text-xs text-muted-foreground">{[loan.assetBrand, loan.assetModel].filter(Boolean).join(" · ")}</p>}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{loan.collaboratorName}</p>
                        {loan.collaboratorSector && <p className="text-xs text-muted-foreground">{loan.collaboratorSector}</p>}
                      </TableCell>
                      <TableCell>{formatDateTime(loan.withdrawnAt)}</TableCell>
                      <TableCell>{formatDate(loan.expectedReturnDate)}</TableCell>
                      <TableCell>
                        {loan.status === "devolvido" ? (
                          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Devolvido</Badge>
                        ) : loan.isOverdue ? (
                          <Badge variant="destructive">Pendente · atrasado</Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Pendente</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {loan.status === "pendente" ? (
                          <Button size="sm" onClick={() => openReturnDialog({
                            id: loan.id,
                            assetCode: loan.assetCode,
                            assetDescription: loan.assetDescription,
                            collaboratorName: loan.collaboratorName,
                          })}>
                            <RotateCcw className="mr-2 h-4 w-4" /> Devolver
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">{formatDateTime(loan.returnedAt)}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Registrar retirada de ferramenta</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Buscar ferramenta</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={toolSearch} onChange={event => setToolSearch(event.target.value)} placeholder="Digite o número patrimonial ou a descrição" className="pl-9" />
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Ferramenta *</Label>
              <Select value={checkoutForm.assetId || "none"} onValueChange={value => setCheckoutForm(current => ({ ...current, assetId: value === "none" ? "" : value }))}>
                <SelectTrigger><SelectValue placeholder={toolsLoading ? "Carregando..." : "Selecione uma ferramenta disponível"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecione uma ferramenta</SelectItem>
                  {availableTools.map(tool => (
                    <SelectItem key={tool.id} value={String(tool.id)}>{tool.code} — {tool.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!toolsLoading && availableTools.length === 0 && <p className="text-xs text-amber-700">Nenhuma ferramenta disponível para este filtro.</p>}
            </div>
            <div className="space-y-2">
              <Label>Colaborador responsável *</Label>
              <Input value={checkoutForm.collaboratorName} onChange={event => setCheckoutForm(current => ({ ...current, collaboratorName: event.target.value }))} placeholder="Nome completo" />
            </div>
            <div className="space-y-2">
              <Label>Setor</Label>
              <Input value={checkoutForm.collaboratorSector} onChange={event => setCheckoutForm(current => ({ ...current, collaboratorSector: event.target.value }))} placeholder="Ex: Manutenção" />
            </div>
            <div className="space-y-2">
              <Label>Devolução prevista *</Label>
              <Input type="date" value={checkoutForm.expectedReturnDate} onChange={event => setCheckoutForm(current => ({ ...current, expectedReturnDate: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Estado na retirada</Label>
              <Select value={checkoutForm.conditionAtWithdrawal} onValueChange={value => setCheckoutForm(current => ({ ...current, conditionAtWithdrawal: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(CONSERVATION_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Observações da retirada</Label>
              <Textarea value={checkoutForm.withdrawalNotes} onChange={event => setCheckoutForm(current => ({ ...current, withdrawalNotes: event.target.value }))} placeholder="Acessórios entregues, finalidade de uso ou observações" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutOpen(false)}>Cancelar</Button>
            <Button onClick={handleCheckout} disabled={checkoutMutation.isPending}>{checkoutMutation.isPending ? "Registrando..." : "Confirmar retirada"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmar devolução</DialogTitle></DialogHeader>
          {selectedLoan && (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm">
              <p className="font-mono font-semibold">{selectedLoan.assetCode}</p>
              <p className="mt-1 font-medium">{selectedLoan.assetDescription}</p>
              <p className="mt-1 text-muted-foreground">Retirada por {selectedLoan.collaboratorName}</p>
            </div>
          )}
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Estado na devolução</Label>
              <Select value={returnForm.conditionAtReturn} onValueChange={value => setReturnForm(current => ({ ...current, conditionAtReturn: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(CONSERVATION_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Observações da devolução</Label>
              <Textarea value={returnForm.returnNotes} onChange={event => setReturnForm(current => ({ ...current, returnNotes: event.target.value }))} placeholder="Avarias, peças faltantes ou observações" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnOpen(false)}>Cancelar</Button>
            <Button onClick={handleReturn} disabled={returnMutation.isPending}>{returnMutation.isPending ? "Devolvendo..." : "Confirmar devolução"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
