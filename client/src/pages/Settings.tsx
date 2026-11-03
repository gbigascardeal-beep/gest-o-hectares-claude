import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const { data: costCenters = [], refetch } = trpc.costCenters.list.useQuery();

  const createCostCenterMutation = trpc.costCenters.create.useMutation({
    onSuccess: () => {
      toast.success("Centro de custo criado com sucesso!");
      setFormData({ name: "", description: "" });
      setIsOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar centro de custo");
    },
  });

  const updateCostCenterMutation = trpc.costCenters.update.useMutation({
    onSuccess: () => {
      toast.success("Centro de custo atualizado com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar centro de custo");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error("Preencha o nome do centro de custo");
      return;
    }

    createCostCenterMutation.mutate({
      name: formData.name,
      description: formData.description || undefined,
    });
  };

  const handleDeactivate = (id: number) => {
    updateCostCenterMutation.mutate({
      id,
      isActive: false,
    });
  };

  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Acesso Restrito</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Apenas administradores podem acessar as configurações do sistema.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground mt-2">Gerencie os centros de custo do sistema</p>
        </div>
      </div>

      {/* Centros de Custo */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Centros de Custo</CardTitle>
            <CardDescription>
              Departamentos e áreas para alocação de produtos
            </CardDescription>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Novo Centro
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Centro de Custo</DialogTitle>
                <DialogDescription>
                  Adicione um novo centro de custo ao sistema
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome do Centro *</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Limpeza, Jardinagem, Manutenção"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    placeholder="Descrição do centro de custo"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={createCostCenterMutation.isPending}
                >
                  {createCostCenterMutation.isPending
                    ? "Criando..."
                    : "Criar Centro"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {costCenters.length > 0 ? (
            <div className="space-y-4">
              {costCenters.map((center) => (
                <div
                  key={center.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <h3 className="font-medium">{center.name}</h3>
                    {center.description && (
                      <p className="text-sm text-muted-foreground">
                        {center.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" disabled>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeactivate(center.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum centro de custo cadastrado
            </p>
          )}
        </CardContent>
      </Card>

      {/* Informações do Sistema */}
      <Card>
        <CardHeader>
          <CardTitle>Informações do Sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Versão</Label>
              <p className="font-medium">1.0.0</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Ambiente</Label>
              <p className="font-medium">Produção</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Seu Papel</Label>
              <p className="font-medium capitalize">
                {user?.role === "admin" ? "Administrador" : "Supervisor"}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Data de Cadastro</Label>
              <p className="font-medium">
                {user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString("pt-BR")
                  : "-"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
