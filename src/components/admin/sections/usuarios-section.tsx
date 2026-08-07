"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, MoreHorizontal, Eye, Ban, ShieldCheck, ShieldAlert, UserCog } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  PlanBadge,
  RoleBadge,
  VerifiedBadge,
  MiniAvatar,
  Pagination,
  EmptyState,
} from "@/components/admin/admin-helpers";
import { formatDate } from "@/lib/utils-umpi";
import { toast } from "sonner";

async function fetchUsers(params: any) {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.role) qs.set("role", params.role);
  if (params.plan) qs.set("plan", params.plan);
  if (params.verified) qs.set("verified", params.verified);
  if (params.status) qs.set("status", params.status);
  qs.set("page", String(params.page));
  const res = await fetch(`/api/admin/users?${qs.toString()}`);
  if (!res.ok) throw new Error("Error");
  return res.json();
}

export function UsuariosSection() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState({ q: "", role: "", plan: "", verified: "", status: "" });
  const [page, setPage] = useState(1);
  const [detailUser, setDetailUser] = useState<any>(null);

  const queryKey = ["admin-users", filters, page];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchUsers({ ...filters, page }),
  });

  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/admin/users", {
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
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (err: any) => toast.error(err.message || "Error"),
  });

  const updateFilter = (k: string, v: string) => {
    setFilters((f) => ({ ...f, [k]: v }));
    setPage(1);
  };

  const users = data?.users || [];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-4 bg-white border-[var(--umpi-border)] gap-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--umpi-text3)]" />
            <Input
              placeholder="Buscar por nombre, email…"
              value={filters.q}
              onChange={(e) => updateFilter("q", e.target.value)}
              className="pl-9 h-9 bg-[var(--umpi-surface2)] border-[var(--umpi-border)]"
            />
          </div>
          <Select value={filters.role || "all"} onValueChange={(v) => updateFilter("role", v === "all" ? "" : v)}>
            <SelectTrigger className="w-[140px] h-9 bg-[var(--umpi-surface2)] border-[var(--umpi-border)]">
              <SelectValue placeholder="Rol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los roles</SelectItem>
              <SelectItem value="user">Usuarios</SelectItem>
              <SelectItem value="admin">Admins</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.plan || "all"} onValueChange={(v) => updateFilter("plan", v === "all" ? "" : v)}>
            <SelectTrigger className="w-[140px] h-9 bg-[var(--umpi-surface2)] border-[var(--umpi-border)]">
              <SelectValue placeholder="Plan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los planes</SelectItem>
              <SelectItem value="basico">Básico</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="business">Business</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.verified || "all"} onValueChange={(v) => updateFilter("verified", v === "all" ? "" : v)}>
            <SelectTrigger className="w-[150px] h-9 bg-[var(--umpi-surface2)] border-[var(--umpi-border)]">
              <SelectValue placeholder="Verificación" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Verificación</SelectItem>
              <SelectItem value="true">Verificados</SelectItem>
              <SelectItem value="false">No verificados</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.status || "all"} onValueChange={(v) => updateFilter("status", v === "all" ? "" : v)}>
            <SelectTrigger className="w-[140px] h-9 bg-[var(--umpi-surface2)] border-[var(--umpi-border)]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="banned">Baneados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Table */}
      <Card className="bg-white border-[var(--umpi-border)] gap-0 overflow-hidden">
        <Table>
          <TableHeader className="bg-[var(--umpi-surface2)]">
            <TableRow className="border-[var(--umpi-border)]">
              <TableHead className="text-[var(--umpi-text2)] font-semibold px-4">Usuario</TableHead>
              <TableHead className="text-[var(--umpi-text2)] font-semibold">Email</TableHead>
              <TableHead className="text-[var(--umpi-text2)] font-semibold">Rol</TableHead>
              <TableHead className="text-[var(--umpi-text2)] font-semibold">Plan</TableHead>
              <TableHead className="text-[var(--umpi-text2)] font-semibold">Verif.</TableHead>
              <TableHead className="text-[var(--umpi-text2)] font-semibold">Miembro desde</TableHead>
              <TableHead className="text-center text-[var(--umpi-text2)] font-semibold">Pubs.</TableHead>
              <TableHead className="text-[var(--umpi-text2)] font-semibold">Estado</TableHead>
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
            {!isLoading && users.length === 0 && (
              <TableRow>
                <TableCell colSpan={9}>
                  <EmptyState message="No se encontraron usuarios" />
                </TableCell>
              </TableRow>
            )}
            {users.map((u: any) => (
              <TableRow key={u.id} className="border-[var(--umpi-border)]">
                <TableCell className="px-4">
                  <div className="flex items-center gap-3">
                    <MiniAvatar initials={u.initials} size={36} />
                    <div>
                      <div className="font-medium text-[var(--umpi-text)]">{u.name}</div>
                      {u.zone && <div className="text-xs text-[var(--umpi-text3)]">{u.zone}</div>}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-[var(--umpi-text2)]">{u.email}</TableCell>
                <TableCell><RoleBadge role={u.role} /></TableCell>
                <TableCell><PlanBadge plan={u.plan} /></TableCell>
                <TableCell><VerifiedBadge verified={u.verified} /></TableCell>
                <TableCell className="text-sm text-[var(--umpi-text2)]">{formatDate(u.memberSince)}</TableCell>
                <TableCell className="text-center text-sm font-semibold text-[var(--umpi-text)]">{u.listingsCount}</TableCell>
                <TableCell>
                  {u.banned ? (
                    <Badge variant="outline" className="text-[11px] font-semibold bg-[#fde8e8] text-[#dc2626] border-[#f5c2c2]">
                      Baneado
                    </Badge>
                  ) : (
                    <StatusBadge status="active" />
                  )}
                </TableCell>
                <TableCell className="px-4 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setDetailUser(u)}>
                        <Eye className="w-4 h-4 mr-2" /> Ver detalle
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {u.banned ? (
                        <DropdownMenuItem onClick={() => mutation.mutate({ userId: u.id, action: "unban" })}>
                          <ShieldCheck className="w-4 h-4 mr-2 text-[var(--umpi-green)]" /> Desbanear
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => mutation.mutate({ userId: u.id, action: "ban" })}>
                          <Ban className="w-4 h-4 mr-2 text-[#dc2626]" /> Banear usuario
                        </DropdownMenuItem>
                      )}
                      {u.verified ? (
                        <DropdownMenuItem onClick={() => mutation.mutate({ userId: u.id, action: "unverify" })}>
                          <ShieldAlert className="w-4 h-4 mr-2 text-[var(--umpi-gold)]" /> Quitar verificación
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => mutation.mutate({ userId: u.id, action: "verify" })}>
                          <ShieldCheck className="w-4 h-4 mr-2 text-[var(--umpi-green)]" /> Verificar usuario
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      {u.role === "admin" ? (
                        <DropdownMenuItem onClick={() => mutation.mutate({ userId: u.id, action: "setRole", role: "user" })}>
                          <UserCog className="w-4 h-4 mr-2" /> Quitar admin
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => mutation.mutate({ userId: u.id, action: "setRole", role: "admin" })}>
                          <UserCog className="w-4 h-4 mr-2 text-[var(--umpi-accent)]" /> Hacer admin
                        </DropdownMenuItem>
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

      {/* Detail modal */}
      <Dialog open={!!detailUser} onOpenChange={(v) => !v && setDetailUser(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle de usuario</DialogTitle>
            <DialogDescription>Información del usuario y su actividad</DialogDescription>
          </DialogHeader>
          {detailUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <MiniAvatar initials={detailUser.initials} size={64} />
                <div>
                  <div className="font-semibold text-lg text-[var(--umpi-text)]">{detailUser.name}</div>
                  <div className="text-sm text-[var(--umpi-text2)]">{detailUser.email}</div>
                  <div className="flex gap-2 mt-1.5">
                    <RoleBadge role={detailUser.role} />
                    <PlanBadge plan={detailUser.plan} />
                    <VerifiedBadge verified={detailUser.verified} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-[var(--umpi-text3)] uppercase font-semibold">Zona</div>
                  <div className="text-[var(--umpi-text)]">{detailUser.zone || "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-[var(--umpi-text3)] uppercase font-semibold">Miembro desde</div>
                  <div className="text-[var(--umpi-text)]">{formatDate(detailUser.memberSince)}</div>
                </div>
                <div>
                  <div className="text-xs text-[var(--umpi-text3)] uppercase font-semibold">Publicaciones</div>
                  <div className="text-[var(--umpi-text)]">{detailUser.listingsCount}</div>
                </div>
                <div>
                  <div className="text-xs text-[var(--umpi-text3)] uppercase font-semibold">Estado</div>
                  <div>{detailUser.banned ? "Baneado" : "Activo"}</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
