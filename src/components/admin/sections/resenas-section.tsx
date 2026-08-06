"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, Eye, EyeOff, Trash2, MoreHorizontal } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { formatDate } from "@/lib/utils-umpi";
import { toast } from "sonner";

async function fetchReviews(params: any) {
  const qs = new URLSearchParams();
  if (params.rating) qs.set("rating", params.rating);
  if (params.status) qs.set("status", params.status);
  qs.set("page", String(params.page));
  const res = await fetch(`/api/admin/reviews?${qs.toString()}`);
  if (!res.ok) throw new Error("Error");
  return res.json();
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`w-3.5 h-3.5 ${
            n <= rating
              ? "text-[var(--umpi-gold)] fill-current"
              : "text-[var(--umpi-border)]"
          }`}
        />
      ))}
    </div>
  );
}

export function ResenasSection() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState({ rating: "", status: "" });
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-reviews", filters, page],
    queryFn: () => fetchReviews({ ...filters, page }),
  });

  const patchMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/admin/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Error");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Acción completada");
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
    onError: () => toast.error("Error"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      const res = await fetch(`/api/admin/reviews?id=${reviewId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Reseña eliminada");
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
    onError: () => toast.error("Error al eliminar"),
  });

  const updateFilter = (k: string, v: string) => {
    setFilters((f) => ({ ...f, [k]: v }));
    setPage(1);
  };

  const reviews = data?.reviews || [];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-4 bg-white border-[var(--umpi-border)] gap-0">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filters.rating || "all"} onValueChange={(v) => updateFilter("rating", v === "all" ? "" : v)}>
            <SelectTrigger className="w-[160px] h-9 bg-[var(--umpi-surface2)] border-[var(--umpi-border)]">
              <SelectValue placeholder="Calificación" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las estrellas</SelectItem>
              <SelectItem value="5">★★★★★ (5)</SelectItem>
              <SelectItem value="4">★★★★ (4)</SelectItem>
              <SelectItem value="3">★★★ (3)</SelectItem>
              <SelectItem value="2">★★ (2)</SelectItem>
              <SelectItem value="1">★ (1)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.status || "all"} onValueChange={(v) => updateFilter("status", v === "all" ? "" : v)}>
            <SelectTrigger className="w-[160px] h-9 bg-[var(--umpi-surface2)] border-[var(--umpi-border)]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="active">Activas</SelectItem>
              <SelectItem value="hidden">Ocultas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Table */}
      <Card className="bg-white border-[var(--umpi-border)] gap-0 overflow-hidden">
        <Table>
          <TableHeader className="bg-[var(--umpi-surface2)] sticky top-0">
            <TableRow className="border-[var(--umpi-border)]">
              <TableHead className="text-[var(--umpi-text2)] font-semibold px-4">Publicación</TableHead>
              <TableHead className="text-[var(--umpi-text2)] font-semibold">Usuario</TableHead>
              <TableHead className="text-[var(--umpi-text2)] font-semibold">Calificación</TableHead>
              <TableHead className="text-[var(--umpi-text2)] font-semibold">Comentario</TableHead>
              <TableHead className="text-[var(--umpi-text2)] font-semibold">Fecha</TableHead>
              <TableHead className="text-[var(--umpi-text2)] font-semibold">Estado</TableHead>
              <TableHead className="text-right text-[var(--umpi-text2)] font-semibold px-4">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-[var(--umpi-text3)]">
                  Cargando…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && reviews.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState message="No se encontraron reseñas" />
                </TableCell>
              </TableRow>
            )}
            {reviews.map((r: any) => (
              <TableRow key={r.id} className="border-[var(--umpi-border)]">
                <TableCell className="px-4 max-w-[200px]">
                  <div className="font-medium text-sm text-[var(--umpi-text)] truncate">
                    {r.listing?.title || "Publicación eliminada"}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <MiniAvatar initials={r.user.initials} size={28} color="var(--umpi-text2)" />
                    <div>
                      <div className="text-sm font-medium text-[var(--umpi-text)]">{r.user.name}</div>
                      <div className="text-xs text-[var(--umpi-text3)]">{r.user.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Stars rating={r.rating} />
                </TableCell>
                <TableCell className="max-w-[300px]">
                  <div className="text-sm text-[var(--umpi-text2)] line-clamp-2">
                    {r.comment}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-[var(--umpi-text2)]">{formatDate(r.createdAt)}</TableCell>
                <TableCell><StatusBadge status={r.status} /></TableCell>
                <TableCell className="px-4 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {r.status === "active" ? (
                        <DropdownMenuItem onClick={() => patchMutation.mutate({ reviewId: r.id, action: "hide" })}>
                          <EyeOff className="w-4 h-4 mr-2 text-[var(--umpi-gold)]" /> Ocultar
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => patchMutation.mutate({ reviewId: r.id, action: "show" })}>
                          <Eye className="w-4 h-4 mr-2 text-[var(--umpi-green)]" /> Mostrar
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-[#dc2626] focus:text-[#dc2626]"
                        onClick={() => {
                          if (confirm("¿Eliminar reseña? Esta acción no se puede deshacer.")) {
                            deleteMutation.mutate(r.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="px-4 pb-4">
          <Pagination page={page} totalPages={data?.totalPages || 1} onChange={setPage} />
        </div>
      </Card>
    </div>
  );
}
