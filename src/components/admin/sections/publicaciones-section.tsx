"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Eye,
  Check,
  X,
  Pause,
  Play,
  Star,
  StarOff,
  Trash2,
  ImageOff,
  MoreHorizontal,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  StatusBadge,
  MiniAvatar,
  Pagination,
  EmptyState,
} from "@/components/admin/admin-helpers";
import { formatPrice, formatDate, safeJsonParse } from "@/lib/utils-umpi";
import { toast } from "sonner";

async function fetchListings(params: any) {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.status) qs.set("status", params.status);
  if (params.categoryType) qs.set("categoryType", params.categoryType);
  if (params.featured) qs.set("featured", params.featured);
  qs.set("page", String(params.page));
  const res = await fetch(`/api/admin/listings?${qs.toString()}`);
  if (!res.ok) throw new Error("Error");
  return res.json();
}

export function PublicacionesSection() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState({ q: "", status: "", categoryType: "", featured: "" });
  const [page, setPage] = useState(1);
  const [rejectListing, setRejectListing] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-listings", filters, page],
    queryFn: () => fetchListings({ ...filters, page }),
  });

  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/admin/listings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || "Error");
      }
      return res.json();
    },
    onSuccess: (_data, vars) => {
      toast.success("Acción completada");
      qc.invalidateQueries({ queryKey: ["admin-listings"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      if (vars.action === "reject") {
        setRejectListing(null);
        setRejectReason("");
      }
    },
    onError: (err: any) => toast.error(err.message || "Error"),
  });

  const updateFilter = (k: string, v: string) => {
    setFilters((f) => ({ ...f, [k]: v }));
    setPage(1);
  };

  const listings = data?.listings || [];

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-white border-[var(--umpi-border)] gap-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--umpi-text3)]" />
            <Input
              placeholder="Buscar por título o descripción…"
              value={filters.q}
              onChange={(e) => updateFilter("q", e.target.value)}
              className="pl-9 h-9 bg-[var(--umpi-surface2)] border-[var(--umpi-border)]"
            />
          </div>
          <Select value={filters.status || "all"} onValueChange={(v) => updateFilter("status", v === "all" ? "" : v)}>
            <SelectTrigger className="w-[160px] h-9 bg-[var(--umpi-surface2)] border-[var(--umpi-border)]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="active">Activas</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="paused">Pausadas</SelectItem>
              <SelectItem value="rejected">Rechazadas</SelectItem>
              <SelectItem value="sold">Vendidas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.categoryType || "all"} onValueChange={(v) => updateFilter("categoryType", v === "all" ? "" : v)}>
            <SelectTrigger className="w-[160px] h-9 bg-[var(--umpi-surface2)] border-[var(--umpi-border)]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              <SelectItem value="servicio">Servicios</SelectItem>
              <SelectItem value="auto">Autos</SelectItem>
              <SelectItem value="propiedad">Propiedades</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.featured || "all"} onValueChange={(v) => updateFilter("featured", v === "all" ? "" : v)}>
            <SelectTrigger className="w-[160px] h-9 bg-[var(--umpi-surface2)] border-[var(--umpi-border)]">
              <SelectValue placeholder="Destacadas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="true">Solo destacadas</SelectItem>
              <SelectItem value="false">No destacadas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="bg-white border-[var(--umpi-border)] gap-0 overflow-hidden">
        <Table>
          <TableHeader className="bg-[var(--umpi-surface2)] sticky top-0">
            <TableRow className="border-[var(--umpi-border)]">
              <TableHead className="text-[var(--umpi-text2)] font-semibold px-4">Publicación</TableHead>
              <TableHead className="text-[var(--umpi-text2)] font-semibold">Vendedor</TableHead>
              <TableHead className="text-[var(--umpi-text2)] font-semibold">Categoría</TableHead>
              <TableHead className="text-[var(--umpi-text2)] font-semibold">Precio</TableHead>
              <TableHead className="text-[var(--umpi-text2)] font-semibold">Estado</TableHead>
              <TableHead className="text-[var(--umpi-text2)] font-semibold">Dest.</TableHead>
              <TableHead className="text-right text-[var(--umpi-text2)] font-semibold">Vistas</TableHead>
              <TableHead className="text-[var(--umpi-text2)] font-semibold">Fecha</TableHead>
              <TableHead className="text-right text-[var(--umpi-text2)] font-semibold px-4">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-[var(--umpi-text3)]">
                  Cargando…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && listings.length === 0 && (
              <TableRow>
                <TableCell colSpan={9}>
                  <EmptyState message="No se encontraron publicaciones" />
                </TableCell>
              </TableRow>
            )}
            {listings.map((l: any) => {
              const imgs = safeJsonParse<string[]>(l.thumbs || l.images, []);
              const thumb = imgs[0];
              return (
                <TableRow key={l.id} className="border-[var(--umpi-border)]">
                  <TableCell className="px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-md overflow-hidden bg-[var(--umpi-surface2)] shrink-0 grid place-items-center">
                        {thumb ? (
                          <img src={thumb} alt={l.title} className="w-full h-full object-cover" />
                        ) : (
                          <ImageOff className="w-5 h-5 text-[var(--umpi-text3)]" />
                        )}
                      </div>
                      <div className="max-w-[220px]">
                        <div className="font-medium text-[var(--umpi-text)] truncate">{l.title}</div>
                        <div className="text-xs text-[var(--umpi-text3)] truncate">
                          {l.categoryType === "servicio" ? "Servicio" : l.categoryType === "auto" ? "Auto" : "Propiedad"}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MiniAvatar initials={l.seller.initials} size={28} />
                      <div className="text-sm font-medium text-[var(--umpi-text)]">{l.seller.name}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-[var(--umpi-text2)]">
                    {l.category?.name || "—"}
                  </TableCell>
                  <TableCell className="text-sm font-semibold text-[var(--umpi-text)]">
                    {formatPrice(l.price, l.currency)}
                  </TableCell>
                  <TableCell><StatusBadge status={l.status} /></TableCell>
                  <TableCell>
                    {l.featured ? (
                      <Badge variant="outline" className="text-[11px] font-semibold bg-[var(--umpi-gold-soft)] text-[var(--umpi-gold)] border-[#ecdfb8]">
                        <Star className="w-3 h-3 mr-0.5 fill-current" /> Sí
                      </Badge>
                    ) : (
                      <span className="text-[var(--umpi-text3)] text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold text-[var(--umpi-text)]">
                    <span className="inline-flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5 text-[var(--umpi-text3)]" />
                      {l.views.toLocaleString("es-AR")}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-[var(--umpi-text2)]">{formatDate(l.createdAt)}</TableCell>
                  <TableCell className="px-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {l.status === "pending" && (
                          <DropdownMenuItem onClick={() => mutation.mutate({ listingId: l.id, action: "approve" })}>
                            <Check className="w-4 h-4 mr-2 text-[var(--umpi-green)]" /> Aprobar
                          </DropdownMenuItem>
                        )}
                        {l.status === "active" && (
                          <DropdownMenuItem onClick={() => mutation.mutate({ listingId: l.id, action: "pause" })}>
                            <Pause className="w-4 h-4 mr-2 text-[var(--umpi-gold)]" /> Pausar
                          </DropdownMenuItem>
                        )}
                        {l.status === "paused" && (
                          <DropdownMenuItem onClick={() => mutation.mutate({ listingId: l.id, action: "resume" })}>
                            <Play className="w-4 h-4 mr-2 text-[var(--umpi-green)]" /> Reactivar
                          </DropdownMenuItem>
                        )}
                        {(l.status === "pending" || l.status === "active") && (
                          <DropdownMenuItem onClick={() => { setRejectListing(l); setRejectReason(""); }}>
                            <X className="w-4 h-4 mr-2 text-[#dc2626]" /> Rechazar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {l.featured ? (
                          <DropdownMenuItem onClick={() => mutation.mutate({ listingId: l.id, action: "unfeature" })}>
                            <StarOff className="w-4 h-4 mr-2" /> Quitar destacado
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => mutation.mutate({ listingId: l.id, action: "feature" })}>
                            <Star className="w-4 h-4 mr-2 text-[var(--umpi-gold)]" /> Destacar (30 días)
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-[#dc2626] focus:text-[#dc2626]"
                          onClick={() => {
                            if (confirm("¿Eliminar publicación? Esta acción no se puede deshacer.")) {
                              mutation.mutate({ listingId: l.id, action: "delete" });
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <div className="px-4 pb-4">
          <Pagination page={page} totalPages={data?.totalPages || 1} onChange={setPage} />
        </div>
      </Card>

      {/* Reject dialog */}
      <Dialog open={!!rejectListing} onOpenChange={(v) => !v && setRejectListing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rechazar publicación</DialogTitle>
            <DialogDescription>
              Indicá el motivo del rechazo. El vendedor recibirá esta notificación.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm font-medium text-[var(--umpi-text)]">{rejectListing?.title}</div>
            <Textarea
              placeholder="Motivo del rechazo…"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="min-h-[100px] bg-[var(--umpi-surface2)] border-[var(--umpi-border)]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectListing(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || mutation.isPending}
              onClick={() =>
                mutation.mutate({
                  listingId: rejectListing?.id,
                  action: "reject",
                  reason: rejectReason.trim(),
                })
              }
            >
              {mutation.isPending ? "Rechazando…" : "Rechazar publicación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
