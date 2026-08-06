"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X, Eye, Ban, MoreHorizontal, Flag } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { formatDate, formatDateTime } from "@/lib/utils-umpi";
import { toast } from "sonner";

async function fetchReports(params: any) {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  qs.set("page", String(params.page));
  const res = await fetch(`/api/admin/reports?${qs.toString()}`);
  if (!res.ok) throw new Error("Error");
  return res.json();
}

function reasonLabel(reason: string) {
  const map: Record<string, string> = {
    spam: "Spam",
    fraude: "Fraude",
    "contenido inapropiado": "Contenido inapropiado",
    estafa: "Estafa",
    otro: "Otro",
  };
  return map[reason] || reason;
}

export function ReportesSection() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-reports", status, page],
    queryFn: () => fetchReports({ status, page }),
  });

  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/admin/reports", {
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
    onSuccess: () => {
      toast.success("Acción completada");
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (err: any) => toast.error(err.message || "Error"),
  });

  const reports = data?.reports || [];
  const openCount = data?.openCount || 0;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-4 bg-white border-[var(--umpi-border)] gap-0">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-[var(--umpi-accent)]" />
            <span className="text-sm font-medium text-[var(--umpi-text)]">
              {openCount} reporte{openCount === 1 ? "" : "s"} abierto{openCount === 1 ? "" : "s"}
            </span>
          </div>
          <div className="ml-auto">
            <Select value={status || "all"} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-[180px] h-9 bg-[var(--umpi-surface2)] border-[var(--umpi-border)]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="open">Abiertos</SelectItem>
                <SelectItem value="reviewing">En revisión</SelectItem>
                <SelectItem value="resolved">Resueltos</SelectItem>
                <SelectItem value="dismissed">Desestimados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="bg-white border-[var(--umpi-border)] gap-0 overflow-hidden">
        <Table>
          <TableHeader className="bg-[var(--umpi-surface2)] sticky top-0">
            <TableRow className="border-[var(--umpi-border)]">
              <TableHead className="text-[var(--umpi-text2)] font-semibold px-4">Reportante</TableHead>
              <TableHead className="text-[var(--umpi-text2)] font-semibold">Reportado</TableHead>
              <TableHead className="text-[var(--umpi-text2)] font-semibold">Motivo</TableHead>
              <TableHead className="text-[var(--umpi-text2)] font-semibold">Descripción</TableHead>
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
            {!isLoading && reports.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState message="No hay reportes para mostrar" />
                </TableCell>
              </TableRow>
            )}
            {reports.map((r: any) => (
              <TableRow key={r.id} className="border-[var(--umpi-border)]">
                <TableCell className="px-4">
                  {r.reporter ? (
                    <div className="flex items-center gap-2">
                      <MiniAvatar initials={r.reporter.initials} size={28} color="var(--umpi-text2)" />
                      <div>
                        <div className="text-sm font-medium text-[var(--umpi-text)]">{r.reporter.name}</div>
                        <div className="text-xs text-[var(--umpi-text3)]">{r.reporter.email}</div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-[var(--umpi-text3)]">Usuario eliminado</span>
                  )}
                </TableCell>
                <TableCell>
                  {r.reportedUser ? (
                    <div>
                      <div className="text-sm font-medium text-[var(--umpi-text)]">{r.reportedUser.name}</div>
                      <div className="text-xs text-[var(--umpi-text3)]">{r.reportedUser.email}</div>
                    </div>
                  ) : r.listing ? (
                    <div className="max-w-[180px]">
                      <div className="text-sm font-medium text-[var(--umpi-text)] truncate">{r.listing.title}</div>
                      <div className="text-xs text-[var(--umpi-text3)]">Publicación</div>
                    </div>
                  ) : (
                    <span className="text-xs text-[var(--umpi-text3)]">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm font-medium text-[var(--umpi-text)]">
                    {reasonLabel(r.reason)}
                  </span>
                </TableCell>
                <TableCell className="max-w-[260px]">
                  <div className="text-sm text-[var(--umpi-text2)] line-clamp-2">
                    {r.description || "Sin descripción"}
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
                      <DropdownMenuItem onClick={() => setDetail(r)}>
                        <Eye className="w-4 h-4 mr-2" /> Ver detalle
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {r.status === "open" && (
                        <DropdownMenuItem onClick={() => mutation.mutate({ reportId: r.id, action: "review" })}>
                          <Eye className="w-4 h-4 mr-2 text-[var(--umpi-gold)]" /> Marcar en revisión
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => mutation.mutate({ reportId: r.id, action: "resolve" })}>
                        <Check className="w-4 h-4 mr-2 text-[var(--umpi-green)]" /> Resolver
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => mutation.mutate({ reportId: r.id, action: "dismiss" })}>
                        <X className="w-4 h-4 mr-2 text-[var(--umpi-text2)]" /> Desestimar
                      </DropdownMenuItem>
                      {r.reportedUser && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-[#dc2626] focus:text-[#dc2626]"
                            onClick={() => {
                              if (confirm(`¿Banear a ${r.reportedUser.name}?`)) {
                                mutation.mutate({ reportId: r.id, action: "ban_user" });
                              }
                            }}
                          >
                            <Ban className="w-4 h-4 mr-2" /> Banear usuario reportado
                          </DropdownMenuItem>
                        </>
                      )}
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

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle del reporte</DialogTitle>
            <DialogDescription>Información completa del reporte</DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-[var(--umpi-text3)] uppercase font-semibold">Reportante</div>
                  <div className="text-[var(--umpi-text)]">{detail.reporter?.name || "—"}</div>
                  <div className="text-xs text-[var(--umpi-text2)]">{detail.reporter?.email}</div>
                </div>
                <div>
                  <div className="text-xs text-[var(--umpi-text3)] uppercase font-semibold">Reportado</div>
                  <div className="text-[var(--umpi-text)]">{detail.reportedUser?.name || detail.listing?.title || "—"}</div>
                  <div className="text-xs text-[var(--umpi-text2)]">
                    {detail.reportedUser?.email || (detail.listing ? "Publicación" : "")}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[var(--umpi-text3)] uppercase font-semibold">Motivo</div>
                  <div className="text-[var(--umpi-text)]">{reasonLabel(detail.reason)}</div>
                </div>
                <div>
                  <div className="text-xs text-[var(--umpi-text3)] uppercase font-semibold">Fecha</div>
                  <div className="text-[var(--umpi-text)]">{formatDateTime(detail.createdAt)}</div>
                </div>
              </div>
              <div>
                <div className="text-xs text-[var(--umpi-text3)] uppercase font-semibold mb-1">Descripción</div>
                <div className="text-sm text-[var(--umpi-text)] bg-[var(--umpi-surface2)] rounded-md p-3">
                  {detail.description || "Sin descripción"}
                </div>
              </div>
              {detail.resolution && (
                <div>
                  <div className="text-xs text-[var(--umpi-text3)] uppercase font-semibold mb-1">Resolución</div>
                  <div className="text-sm text-[var(--umpi-text)] bg-[var(--umpi-green-soft)] rounded-md p-3">
                    {detail.resolution}
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[var(--umpi-green)] border-[#cfe6da]"
                  onClick={() => {
                    mutation.mutate({ reportId: detail.id, action: "resolve" });
                    setDetail(null);
                  }}
                >
                  <Check className="w-4 h-4 mr-1" /> Resolver
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    mutation.mutate({ reportId: detail.id, action: "dismiss" });
                    setDetail(null);
                  }}
                >
                  <X className="w-4 h-4 mr-1" /> Desestimar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
