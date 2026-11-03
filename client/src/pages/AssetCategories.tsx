import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, Edit, Trash2, FolderTree } from "lucide-react";

export default function AssetCategories() {
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState("");

  const { data: categories = [], refetch } = trpc.assets.categories.list.useQuery();
  const createMutation = trpc.assets.categories.create.useMutation({ onSuccess: () => { refetch(); setIsOpen(false); toast.success("Categoria criada"); } });
  const updateMutation = trpc.assets.categories.update.useMutation({ onSuccess: () => { refetch(); setIsOpen(false); toast.success("Categoria atualizada"); } });
  const deleteMutation = trpc.assets.categories.delete.useMutation({ onSuccess: () => { refetch(); toast.success("Categoria removida"); } });

  const openNew = () => { setEditId(null); setName(""); setDescription(""); setParentId(""); setIsOpen(true); };
  const openEdit = (cat: any) => { setEditId(cat.id); setName(cat.name); setDescription(cat.description || ""); setParentId(cat.parentId?.toString() || ""); setIsOpen(true); };

  const handleSave = () => {
    if (!name) { toast.error("Informe o nome"); return; }
    if (editId) {
      updateMutation.mutate({ id: editId, name, description: description || undefined, parentId: parentId ? parseInt(parentId) : undefined });
    } else {
      createMutation.mutate({ name, description: description || undefined, parentId: parentId ? parseInt(parentId) : undefined });
    }
  };

  const parentCategories = categories.filter((c: any) => !c.parentId);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Categorias Patrimoniais</h1>
          <p className="text-gray-600 mt-1">{categories.length} categorias cadastradas</p>
        </div>
        <Button onClick={openNew} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> Nova Categoria
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {parentCategories.map((cat: any) => {
          const children = categories.filter((c: any) => c.parentId === cat.id);
          return (
            <Card key={cat.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FolderTree className="h-5 w-5 text-blue-600" />
                    {cat.name}
                  </CardTitle>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(cat)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate({ id: cat.id })}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {cat.description && <p className="text-sm text-gray-600 mb-2">{cat.description}</p>}
                {children.length > 0 && (
                  <div className="space-y-1">
                    {children.map((child: any) => (
                      <div key={child.id} className="flex items-center justify-between pl-4 py-1 border-l-2 border-blue-200">
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

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Editar Categoria" : "Nova Categoria"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>Descrição</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
            <div>
              <Label>Categoria Pai</Label>
              <Select value={parentId || "none"} onValueChange={(v) => setParentId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Nenhuma (raiz)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma (raiz)</SelectItem>
                  {parentCategories.map((c: any) => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
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
