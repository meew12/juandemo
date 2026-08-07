"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DollarSign, CreditCard, XCircle, RefreshCw, Download, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  KpiCard,
  StatusBadge,
  MiniAvatar,
  Pagination,
  EmptyState,
} from "@/components/admin/admin-helpers";
import { formatPrice, formatCurrencyCompact, formatDate } from "@/lib/utils-umpi";
import { toast } from "sonner";

async function fetchTransactions(params: any) {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.status) qs.set("status", params.status);
  if (params.method) qs.set("method", params.method);
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  qs.set("page", String(params.page));
  const res = await fetch(`/api/admin/transactions?${qs.toString()}`);
  if (!res.ok) throw new Error("Error");
  return res.json();
}

function methodLabel(method: string) {
  const map: Record<string, string> = {
    mercadopago: "Mercado Pago",
    tarjeta: "Tarjeta",
    transferencia: "Transferencia",
  };
  return map[method] || method;
}

export function PagosSection() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState({
    q: "",
    status: "",
    method: "",
    from: "",
    to: "",
  });
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-tx", filters, page],
    queryFn: () => fetchTransactions({ ...filters, page }),
  });

  const refundMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const res = await fetch("/api/admin/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId, action: "refund" }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || "Error");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Reembolso procesado");
      qc.invalidateQueries({ queryKey: ["admin-tx"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (err: any) => toast.error(err.message || "Error al reembolsar"),
  });

  const updateFilter = (k: string, v: string) => {
    setFilters((f) => ({ ...f, [k]: v }));
    setPage(1);
  };

  // Export CSV — fetches all matching filters (max 200)
  const exportCsv = async () => {
    try {
      const qs = new URLSearchParams();
      if (filters.q) qs.set("q", filters.q);
      if (filters.status) qs.set("status", filters.status);
      if (filters.method) qs.set("method", filters.method);
      if (filters.from) qs.set("from", filters.from);
      if (filters.to) qs.set("to", filters.to);
      qs.set("page", "1");
      qs.set("pageSize", "200");
      const res = await fetch(`/api/admin/transactions?${qs.toString()}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const txs = data.transactions || [];
      const headers = ["TXN ID", "Usuario", "Email", "Concepto", "Método", "Monto", "Moneda", "Estado", "Fecha"];
      const rows = txs.map((t: any) => [
        t.txId,
        t.user.name,
        t.user.email,
        t.concept,
        methodLabel(t.method),
        String(t.amount),
        t.currency,
        t.status,
        formatDate(t.createdAt),
      ]);
      const csv = [headers, ...rows]
        .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\n");
      const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `umpi-transacciones-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`${txs.length} transacciones exportadas`);
    } catch {
      toast.error("Error al exportar CSV");
    }
  };

  const k = data?.kpis;
  const transactions = data?.transactions || [];

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Ingresos del mes"
          value={formatCurrencyCompact(k?.monthRevenue || 0)}
          icon={DollarSign}
          iconColor="var(--umpi-green)"
          trendLabel="Total aprobado"
        />
        <KpiCard
          label="Transacciones"
          value={(k?.monthTxCount || 0).toLocaleString("es-AR")}
          icon={CreditCard}
          iconColor="var(--umpi-accent)"
          trendLabel="Este mes"
        />
        <KpiCard
          label="Pagos fallidos"
          value={(k?.failedPayments || 0).toLocaleString("es-AR")}
          icon={XCircle}
          iconColor="#dc2626"
          trendLabel="Histórico"
        />
        <KpiCard
          label="Reembolsos"
          value={(k?.refundsCount || 0).toLocaleString("es-AR")}
          icon={RefreshCw}
          iconColor="var(--umpi-purple)"
          trendLabel="Histórico"
        />
      </div>

      {/* Filters + export */}
      <Card className="p-4 bg-white border-[var(--umpi-border)] gap-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--umpi-text3)]" />
            <Input
              placeholder="Buscar por TXN ID, concepto, usuario…"
              value={filters.q}
              onChange={(e) => updateFilter("q", e.target.value)}
              className="pl-9 h-9 bg-[var(--umpi-surface2)] border-[var(--umpi-border)]"
            />
          </div>
          <Select value={filters.status || "all"} onValueChange={(v) => updateFilter("status", v === "all" ? "" : v)}>
            <SelectTrigger className="w-[140px] h-9 bg-[var(--umpi-surface2)] border-[var(--umpi-border)]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="approved">Aprobado</SelectItem>
              <SelectItem value="pending">Pendiente</SelectItem>
              <SelectItem value="rejected">Rechazado</SelectItem>
              <SelectItem value="refunded">Reembolsado</SelectItem>
              <SelectItem value="canceled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.method || "all"} onValueChange={(v) => updateFilter("method", v === "all" ? "" : v)}>
            <SelectTrigger className="w-[160px] h-9 bg-[var(--umpi-surface2)] border-[var(--umpi-border)]">
              <SelectValue placeholder="Método" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los métodos</SelectItem>
              <SelectItem value="mercadopago">Mercado Pago</SelectItem>
              <SelectItem value="tarjeta">Tarjeta</SelectItem>
              <SelectItem value="transferencia">Transferencia</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={filters.from}
            onChange={(e) => updateFilter("from", e.target.value)}
            className="h-9 w-[140px] bg-[var(--umpi-surface2)] border-[var(--umpi-border)]"
          />
          <Input
            type="date"
            value={filters.to}
            onChange={(e) => updateFilter("to", e.target.value)}
            className="h-9 w-[140px] bg-[var(--umpi-surface2)] border-[var(--umpi-border)]"
          />
          <Button
            variant="outline"
            size="sm"
            className="h-9 ml-auto border-[var(--umpi-accent)] text-[var(--umpi-accent)] hover:bg-[var(--umpi-accent-soft)]"
            onClick={exportCsv}
          >
            <Download className="w-4 h-4 mr-1.5" />
            Exportar CSV
          </Button>
        </div>
      </Card>

      {/* Transactions table */}
      <Card className="bg-white border-[var(--umpi-border)] gap-0 overflow-hidden">
        <Table>
          <TableHeader className="bg-[var(--umpi-surface2)] sticky top-0">
            <TableRow className="border-[var(--umpi-border)]">
              <TableHead className="text-[var(--umpi-text2)] font-semibold px-4">TXN ID</TableHead>
              <TableHead className="text-[var(--umpi-text2)] font-semibold">Usuario</TableHead>
              <TableHead className="text-[var(--umpi-text2)] font-semibold">Concepto</TableHead>
              <TableHead className="text-[var(--umpi-text2)] font-semibold">Método</TableHead>
              <TableHead className="text-right text-[var(--umpi-text2)] font-semibold">Monto</TableHead>
              <TableHead className="text-[var(--umpi-text2)] font-semibold">Estado</TableHead>
              <TableHead className="text-[var(--umpi-text2)] font-semibold">Fecha</TableHead>
              <TableHead className="text-right text-[var(--umpi-text2)] font-semibold px-4">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-[var(--umpi-text3)]">
                  Cargando…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && transactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={8}>
                  <EmptyState message="No se encontraron transacciones" />
                </TableCell>
              </TableRow>
            )}
            {transactions.map((t: any) => (
              <TableRow key={t.id} className="border-[var(--umpi-border)]">
                <TableCell className="px-4 font-mono text-xs font-semibold text-[var(--umpi-text)]">
                  {t.txId}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <MiniAvatar initials={t.user.initials} size={28} />
                    <div>
                      <div className="text-sm font-medium text-[var(--umpi-text)]">{t.user.name}</div>
                      <div className="text-xs text-[var(--umpi-text3)]">{t.user.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-[var(--umpi-text2)] max-w-[220px] truncate">
                  {t.concept}
                </TableCell>
                <TableCell className="text-sm text-[var(--umpi-text2)]">{methodLabel(t.method)}</TableCell>
                <TableCell className="text-right font-semibold text-[var(--umpi-text)]">
                  <span className={t.amount < 0 ? "text-[#dc2626]" : ""}>
                    {t.amount < 0 ? "-" : ""}
                    {formatPrice(Math.abs(t.amount), t.currency)}
                  </span>
                </TableCell>
                <TableCell><StatusBadge status={t.status} /></TableCell>
                <TableCell className="text-sm text-[var(--umpi-text2)]">{formatDate(t.createdAt)}</TableCell>
                <TableCell className="px-4 text-right">
                  {t.status === "approved" && t.amount > 0 ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-[var(--umpi-purple)] border-[#d8ccf0] hover:bg-[#f0ecf8]"
                      disabled={refundMutation.isPending}
                      onClick={() => {
                        if (confirm(`¿Reembolsar ${formatPrice(t.amount, t.currency)} (${t.txId})?`)) {
                          refundMutation.mutate(t.id);
                        }
                      }}
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1" />
                      Reembolsar
                    </Button>
                  ) : (
                    <span className="text-xs text-[var(--umpi-text3)]">—</span>
                  )}
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
