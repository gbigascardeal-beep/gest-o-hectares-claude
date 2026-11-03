import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, Edit, Trash2, MapPin } from "lucide-react";

export default function AssetLocations() {
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState("");
  const [type, setType] = useState("");

  const { data: locations = [], refetch } = trpc.assets.locations.list.useQuery();
  const createMutation = trpc.assets.locations.create.useMutation({ onSuccess: () => { refetch(); setIsOpen(false); toast.success("Local criado"); } });
  const updateMutation = trpc.assets.locations.update.useMutation({ onSuccess: () => { refetch(); setIsOpen(false); toast.success("Local atualizado"); } });
  const deleteMutation = trpc.assets.locations.delete.useMutation({ onSuccess: () => { refetch(); toast.success("Local removido"); } });

  const openNew = () => { setEditId(null); setName(""); setDescription(""); setParentId(""); setType(""); setIsOpen(true); };
  const openEdit = (loc: any) => { setEditId(loc.id); setName(loc.name); setDescription(loc.description || ""); setParentId(loc.parentId?.toString() || ""); setType(loc.type || ""); setIsOpen(true); };

  const handleSave = () => {
    if (!name) { toast.error("Informe o nome"); return; }
    if (editId) {
      updateMutation.mutate({ id: editId, name, description: description || undefined, parentId: parentId ? parseInt(parentId) : undefined, type: type || undefined });
    } else {
      createMutation.mutate({ name, description: description || undefined, parentId: parentId ? parseInt(parentId) : undefined, type: type || undefined });
    }
  };

  const parentLocations = locations.filter((l: any) => !l.parentId);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Localizações</h1>
          <p className="text-gray-600 mt-1">{locations.length} locais cadastrados</p>
        </div>
        <Button onClick={openNew} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> Novo Local
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {parentLocations.map((loc: any) => {
          const children = locations.filter((l: any) => l.parentId === loc.id);
          return (
            <Card key={loc.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-green-600" />
                    {loc.name}
                  </CardTitle>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(loc)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate({ id: loc.id })}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loc.description && <p className="text-sm text-gray-600 mb-2">{loc.description}</p>}
                {loc.type && <span className="text-xs bg-gray-100 px-2 py-1 rounded">{loc.type}</span>}
                {children.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {children.map((child: any) => (
                      <div key={child.id} className="flex items-center justify-between pl-4 py-1 border-l-2 border-green-200">
                        <span className="text-sm text-gray-700">{child.name}</span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(child)}><Edit className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate({ id: child.id })}><Trash2 className="h-3 w-3 text-red-500" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {locations.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Nenhum local cadastrado</h3>
            <p className="text-gray-600 mt-1">Cadastre os locais do condomínio para organizar os patrimônios.</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Editar Local" : "Novo Local"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Administração, Bloco A, Salão de Festas" /></div>
            <div><Label>Descrição</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
            <div><Label>Tipo</Label><Input value={type} onChange={(e) => setType(e.target.value)} placeholder="Ex: Bloco, Sala, Área, Andar" /></div>
            <div>
              <Label>Local Pai</Label>
              <Select value={parentId || "none"} onValueChange={(v) => setParentId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Nenhum (raiz)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum (raiz)</SelectItem>
                  {parentLocations.map((l: any) => (
                    <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

