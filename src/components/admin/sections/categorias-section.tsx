"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  FolderTree,
  Tag,
  FileText,
  LayoutGrid,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils-umpi";

type Category = {
  id: string;
  slug: string;
  name: string;
  type: string;
  icon: string | null;
  description: string | null;
  count: number;
  order: number;
  createdAt: string;
  updatedAt: string;
  _count: { listings: number; subcategories: number };
};

const TYPE_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  servicio: { label: "Servicio", color: "bg-[var(--umpi-accent-soft)] text-[var(--umpi-accent)] border-[#f5c5b3]", icon: Tag },
  auto: { label: "Auto", color: "bg-[var(--umpi-blue-soft)] text-[var(--umpi-blue)] border-[#c8d6ef]", icon: LayoutGrid },
  propiedad: { label: "Propiedad", color: "bg-[var(--umpi-purple-soft)] text-[var(--umpi-purple)] border-[#d8ccf0]", icon: FolderTree },
};

async function fetchCategories(type: string) {
  const qs = new URLSearchParams();
  if (type) qs.set("type", type);
  const res = await fetch(`/api/admin/categories?${qs.toString()}`);
  if (!res.ok) throw new Error("Error");
  return res.json();
}

export function CategoriasSection() {
  const qc = useQueryClient();
  const [filterType, setFilterType] = useState("");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const [form, setForm] = useState({
    name: "",
    type: "servicio",
    slug: "",
    icon: "",
    description: "",
    order: 0,
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-categories", filterType],
    queryFn: () => fetchCategories(filterType),
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Categoría creada");
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
      setDialogOpen(false);
    },
    onError: (e: any) => toast.error(e.message || "Error al crear"),
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/admin/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Categoría actualizada");
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
      setDialogOpen(false);
    },
    onError: (e: any) => toast.error(e.message || "Error al actualizar"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/categories?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Categoría eliminada");
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
      setDeleteTarget(null);
    },
    onError: (e: any) => toast.error(e.message || "Error al eliminar"),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: "",
      type: filterType || "servicio",
      slug: "",
      icon: "",
      description: "",
      order: 0,
    });
    setDialogOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setForm({
      name: cat.name,
      type: cat.type,
      slug: cat.slug,
      icon: cat.icon || "",
      description: cat.description || "",
      order: cat.order,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      name: form.name,
      type: form.type,
      slug: form.slug || form.name,
      icon: form.icon,
      description: form.description,
      order: Number(form.order) || 0,
    };
    if (editing) {
      updateMutation.mutate({ categoryId: editing.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const categories: Category[] = data?.categories || [];
  const filtered = categories.filter((c) =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.slug.toLowerCase().includes(search.toLowerCase())
  );

  // KPIs rápidos
  const totalCats = categories.length;
  const totalListings = categories.reduce((s, c) => s + c._count.listings, 0);
  const totalSubs = categories.reduce((s, c) => s + c._count.subcategories, 0);

  return (
    <div className="space-y-5">
      {/* KPIs rápidos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-white border-[var(--umpi-border)]">
          <div className="flex items-center gap-3">
            <div
              className="grid place-items-center rounded-lg shrink-0"
              style={{ width: 40, height: 40, background: "rgba(232, 76, 30, 0.12)", color: "var(--umpi-accent)" }}
            >
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-display text-[var(--umpi-text)]" style={{ fontFamily: "var(--font-dm-serif)" }}>
                {totalCats}
              </div>
              <div className="text-xs text-[var(--umpi-text2)]">Categorías totales</div>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-white border-[var(--umpi-border)]">
          <div className="flex items-center gap-3">
            <div
              className="grid place-items-center rounded-lg shrink-0"
              style={{ width: 40, height: 40, background: "rgba(124, 58, 237, 0.12)", color: "var(--umpi-purple)" }}
            >
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-display text-[var(--umpi-text)]" style={{ fontFamily: "var(--font-dm-serif)" }}>
                {totalListings}
              </div>
              <div className="text-xs text-[var(--umpi-text2)]">Publicaciones vinculadas</div>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-white border-[var(--umpi-border)]">
          <div className="flex items-center gap-3">
            <div
              className="grid place-items-center rounded-lg shrink-0"
              style={{ width: 40, height: 40, background: "rgba(196, 154, 42, 0.12)", color: "var(--umpi-gold)" }}
            >
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-display text-[var(--umpi-text)]" style={{ fontFamily: "var(--font-dm-serif)" }}>
                {totalSubs}
              </div>
              <div className="text-xs text-[var(--umpi-text2)]">Subcategorías</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--umpi-text3)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar categoría..."
            className="pl-9 bg-white"
          />
        </div>
        <Select value={filterType || "all"} onValueChange={(v) => setFilterType(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[180px] bg-white">
            <SelectValue placeholder="Todos los tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="servicio">Servicios</SelectItem>
            <SelectItem value="auto">Autos</SelectItem>
            <SelectItem value="propiedad">Propiedades</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={() => refetch()} title="Refrescar">
          <RefreshCw className="w-4 h-4" />
        </Button>
        <Button onClick={openCreate} className="ml-auto" style={{ background: "var(--umpi-accent)", color: "white" }}>
          <Plus className="w-4 h-4 mr-1.5" />
          Nueva categoría
        </Button>
      </div>

      {/* Tabla */}
      <Card className="bg-white border-[var(--umpi-border)] overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-[var(--umpi-text2)] text-sm">Cargando categorías...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-[var(--umpi-text3)] text-sm">
            No se encontraron categorías. Creá la primera con el botón de arriba.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-[var(--umpi-surface)] hover:bg-[var(--umpi-surface)]">
                <TableHead className="font-semibold text-[var(--umpi-text)]">Categoría</TableHead>
                <TableHead className="font-semibold text-[var(--umpi-text)]">Tipo</TableHead>
                <TableHead className="font-semibold text-[var(--umpi-text)]">Slug</TableHead>
                <TableHead className="text-center font-semibold text-[var(--umpi-text)]">Publicaciones</TableHead>
                <TableHead className="text-center font-semibold text-[var(--umpi-text)]">Subcategorías</TableHead>
                <TableHead className="text-center font-semibold text-[var(--umpi-text)]">Orden</TableHead>
                <TableHead className="text-right font-semibold text-[var(--umpi-text)]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((cat) => {
                const tcfg = TYPE_LABELS[cat.type] || TYPE_LABELS.servicio;
                const TypeIcon = tcfg.icon;
                return (
                  <TableRow key={cat.id} className="hover:bg-[var(--umpi-surface)]/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className="grid place-items-center rounded-md shrink-0"
                          style={{ width: 32, height: 32, background: `${cat.type === "auto" ? "var(--umpi-blue)" : cat.type === "propiedad" ? "var(--umpi-purple)" : "var(--umpi-accent)"}15`, color: cat.type === "auto" ? "var(--umpi-blue)" : cat.type === "propiedad" ? "var(--umpi-purple)" : "var(--umpi-accent)" }}
                        >
                          <TypeIcon className="w-4 h-4" />
                        </div>
                        <div className="leading-tight">
                          <div className="font-medium text-[var(--umpi-text)]">{cat.name}</div>
                          {cat.description && (
                            <div className="text-xs text-[var(--umpi-text3)] line-clamp-1 max-w-[260px]">
                              {cat.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[11px] font-semibold ${tcfg.color}`}>
                        <TypeIcon className="w-3 h-3 mr-1" />
                        {tcfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-[var(--umpi-surface)] px-1.5 py-0.5 rounded text-[var(--umpi-text2)]">
                        {cat.slug}
                      </code>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-semibold text-[var(--umpi-text)]">{cat._count.listings}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-[var(--umpi-text2)]">{cat._count.subcategories}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-[var(--umpi-text2)] text-sm">{cat.order}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-[var(--umpi-text2)] hover:text-[var(--umpi-accent)]"
                          onClick={() => openEdit(cat)}
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-[var(--umpi-text2)] hover:text-red-600"
                          onClick={() => setDeleteTarget(cat)}
                          title="Eliminar"
                          disabled={cat._count.listings > 0}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Dialog crear/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Modificá los datos de la categoría. El slug se usa en las URLs."
                : "Completá los datos para crear una nueva categoría."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej: Plomería"
                  className="bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="type">Tipo *</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v })}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="servicio">Servicio</SelectItem>
                    <SelectItem value="auto">Auto</SelectItem>
                    <SelectItem value="propiedad">Propiedad</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="slug">Slug (URL)</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="auto-generado si vacío"
                  className="bg-white"
                />
                <p className="text-xs text-[var(--umpi-text3)]">
                  Se genera automáticamente desde el nombre si lo dejás vacío.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="order">Orden</Label>
                <Input
                  id="order"
                  type="number"
                  value={form.order}
                  onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
                  className="bg-white"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="icon">Icono (emoji o nombre)</Label>
              <Input
                id="icon"
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                placeholder="Ej: 🔧 o wrench"
                className="bg-white"
              />
              <p className="text-xs text-[var(--umpi-text3)]">
                Podés usar un emoji o el nombre de un icono de lucide-react.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descripción breve de la categoría..."
                rows={3}
                className="bg-white resize-none"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                style={{ background: "var(--umpi-accent)", color: "white" }}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Guardando..."
                  : editing
                  ? "Guardar cambios"
                  : "Crear categoría"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmar eliminación */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar <strong>{deleteTarget?.name}</strong> ({deleteTarget?.slug}). Esta acción no se puede deshacer.
              {deleteTarget && deleteTarget._count.subcategories > 0 && (
                <span className="block mt-2 text-amber-700">
                  ⚠️ Se eliminarán también {deleteTarget._count.subcategories} subcategoría(s).
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
