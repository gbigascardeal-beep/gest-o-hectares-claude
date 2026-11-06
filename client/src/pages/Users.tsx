import { ROLES, ROLE_LABEL, type Role } from "@shared/roles";
import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { KeyRound, Plus } from "lucide-react";
import { toast } from "sonner";


export default function Users() {
  const { user: me } = useAuth();
  const utils = trpc.useUtils();
  const { data: users = [], isLoading } = trpc.users.list.useQuery(undefined, { enabled: me?.role === "admin" });

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "user" as Role });
  const [resetTarget, setResetTarget] = useState<{ id: number; name: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const refresh = () => utils.users.list.invalidate();
  const onError = (error: { message: string }) => toast.error(error.message);

  const createUser = trpc.users.create.useMutation({
    onSuccess: () => {
      toast.success("Usuário criado!");
      setCreateOpen(false);
      setForm({ name: "", email: "", password: "", role: "user" });
      refresh();
    },
    onError,
  });
  const updateUser = trpc.users.update.useMutation({ onSuccess: refresh, onError });
  const resetPassword = trpc.users.resetPassword.useMutation({
    onSuccess: () => {
      toast.success("Senha redefinida!");
      setResetTarget(null);
      setNewPassword("");
    },
    onError,
  });

  if (me?.role !== "admin") {
    return <div className="p-6 text-muted-foreground">Apenas administradores podem gerenciar usuários.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuários</h1>
          <p className="text-sm text-muted-foreground">Só entra no sistema quem for cadastrado aqui.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Novo usuário
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Acessos</CardTitle>
          <CardDescription>
            Administrador: tudo. Comprador: solicitações, ordens de compra e fornecedores. Supervisor: abre solicitações de compra e requisições de saída. Supervisor de almoxarifado: entrega requisições e controla o estoque. Usuário: somente consulta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="text-right">Senha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">Carregando...</TableCell>
                </TableRow>
              )}
              {users.map((u) => {
                const isMe = u.id === me?.id;
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.name} {isMe && <Badge variant="secondary" className="ml-2">você</Badge>}
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Select
                        value={u.role}
                        disabled={isMe}
                        onValueChange={(role) => updateUser.mutate({ id: u.id, role: role as Role })}
                      >
                        <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => (
                            <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={u.isActive}
                        disabled={isMe}
                        onCheckedChange={(isActive) => updateUser.mutate({ id: u.id, isActive })}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => setResetTarget({ id: u.id, name: u.name ?? u.email ?? "" })}>
                        <KeyRound className="w-4 h-4 mr-2" /> Redefinir
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo usuário</DialogTitle>
            <DialogDescription>Passe o e-mail e a senha inicial para a pessoa. Ela pode trocar depois em "Minha conta".</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Senha inicial (mín. 8 caracteres)</Label>
              <Input type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Perfil</Label>
              <Select value={form.role} onValueChange={(role) => setForm({ ...form, role: role as Role })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button disabled={createUser.isPending} onClick={() => createUser.mutate(form)}>Criar usuário</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetTarget} onOpenChange={(open) => !open && setResetTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redefinir senha</DialogTitle>
            <DialogDescription>Nova senha para {resetTarget?.name}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Nova senha (mín. 8 caracteres)</Label>
            <Input type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetTarget(null)}>Cancelar</Button>
            <Button
              disabled={resetPassword.isPending}
              onClick={() => resetTarget && resetPassword.mutate({ id: resetTarget.id, newPassword })}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
