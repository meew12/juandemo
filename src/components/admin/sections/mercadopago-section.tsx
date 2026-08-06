"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Save,
  ShieldCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  TestTube,
  ExternalLink,
  KeyRound,
  Info,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface CredentialField {
  value: string;
  masked: string;
  source: "db" | "env" | "none";
  isSandbox?: boolean;
  isPlaceholder?: boolean;
}
interface CredentialsResponse {
  credentials: {
    accessToken: CredentialField;
    publicKey: CredentialField;
    webhookSecret: CredentialField;
    webhookUrl: CredentialField;
  };
  labels: Record<string, string>;
}

async function fetchCreds(): Promise<CredentialsResponse> {
  const res = await fetch("/api/admin/mercadopago");
  if (!res.ok) throw new Error("Error al cargar credenciales");
  return res.json();
}

export function MercadoPagoSection() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-mercadopago"],
    queryFn: fetchCreds,
  });

  // Draft values the admin is editing. Keys mirror the SiteConfig keys.
  // Empty string = use existing; null = clear; non-empty = new value.
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [showAccess, setShowAccess] = useState(false);
  const [showPublic, setShowPublic] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    valid: boolean;
    message: string;
    detail?: string;
  } | null>(null);

  const accessTokenInfo = data?.credentials.accessToken;
  const publicKeyInfo = data?.credentials.publicKey;
  const webhookSecretInfo = data?.credentials.webhookSecret;
  const webhookUrlInfo = data?.credentials.webhookUrl;

  // The "displayed" value: draft if edited, otherwise the real value
  const displayValue = (key: string, info?: CredentialField) => {
    if (key in draft) return draft[key];
    return info?.value || "";
  };

  const handleFieldChange = (key: string, value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setTestResult(null); // reset test result on edit
  };

  const dirty = Object.keys(draft).length > 0;

  const saveMutation = useMutation({
    mutationFn: async (creds: Record<string, string | null>) => {
      const res = await fetch("/api/admin/mercadopago", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentials: creds, action: "save" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar");
      return data;
    },
    onSuccess: (resp: any) => {
      toast.success(resp.message || "Credenciales guardadas");
      setDraft({});
      setTestResult(null);
      qc.invalidateQueries({ queryKey: ["admin-mercadopago"] });
    },
    onError: (e: any) => toast.error(e.message || "Error al guardar"),
  });

  const testMutation = useMutation({
    mutationFn: async (token: string) => {
      const res = await fetch("/api/admin/mercadopago", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credentials: { "mp.access_token": token },
          action: "test",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al validar");
      return data as { valid: boolean; message: string; detail?: string };
    },
    onSuccess: (result) => {
      setTestResult(result);
      if (result.valid) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    },
    onError: (e: any) => {
      setTestResult({ valid: false, message: e.message || "Error de conexión" });
      toast.error(e.message || "Error al validar token");
    },
  });

  const handleSave = () => {
    if (!dirty) {
      toast.info("No hay cambios para guardar");
      return;
    }
    saveMutation.mutate(draft);
  };

  const handleTest = () => {
    const token = displayValue("mp.access_token", accessTokenInfo);
    if (!token || token.includes("placeholder")) {
      toast.error("Ingresá un access token válido para validar");
      return;
    }
    setTesting(true);
    testMutation.mutate(token, {
      onSettled: () => setTesting(false),
    });
  };

  const handleClear = (key: string) => {
    setDraft((d) => ({ ...d, [key]: "" }));
    saveMutation.mutate({ [key]: null });
  };

  if (isLoading) {
    return (
      <div className="py-12 text-center text-[var(--umpi-text2)] text-sm">
        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
        Cargando configuración de MercadoPago...
      </div>
    );
  }

  // Overall status
  const status = accessTokenInfo?.isPlaceholder
    ? "placeholder"
    : accessTokenInfo?.value
      ? "configured"
      : "missing";

  return (
    <div className="space-y-5 max-w-4xl">
      {/* ─── Status banner ─── */}
      <Card
        className={`p-5 border-2 ${
          status === "configured"
            ? "bg-[var(--umpi-green-soft)] border-[var(--umpi-green)]/30"
            : status === "placeholder"
              ? "bg-[var(--umpi-gold-soft)] border-[var(--umpi-gold)]/30"
              : "bg-red-50 border-red-200"
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className="grid place-items-center rounded-lg shrink-0"
            style={{
              width: 44,
              height: 44,
              background:
                status === "configured"
                  ? "var(--umpi-green)"
                  : status === "placeholder"
                    ? "var(--umpi-gold)"
                    : "#dc2626",
              color: "white",
            }}
          >
            {status === "configured" ? (
              <CheckCircle2 className="w-6 h-6" />
            ) : (
              <AlertTriangle className="w-6 h-6" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-[var(--umpi-text)] text-base mb-0.5">
              {status === "configured"
                ? "MercadoPago configurado"
                : status === "placeholder"
                  ? "Token placeholder — hay que reemplazarlo"
                  : "MercadoPago NO configurado"}
            </h3>
            <p className="text-sm text-[var(--umpi-text2)]">
              {status === "configured" ? (
                <>
                  Modo{" "}
                  <Badge className="text-[10px] mx-0.5">
                    {accessTokenInfo?.isSandbox ? "SANDBOX (TEST-)" : "PRODUCCIÓN"}
                  </Badge>
                  · Los pagos de suscripciones y destacados funcionan correctamente.
                  {accessTokenInfo?.source === "env" && (
                    <span className="ml-1 text-[var(--umpi-text3)]">
                      (cargado desde .env)
                    </span>
                  )}
                </>
              ) : status === "placeholder" ? (
                <>
                  El token actual es el placeholder que viene por defecto. Reemplazalo
                  con tu token real de{" "}
                  <a
                    href="https://www.mercadopago.com.ar/developers/panel/app"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold underline inline-flex items-center gap-0.5"
                  >
                    MercadoPago Developers
                    <ExternalLink className="w-3 h-3" />
                  </a>{" "}
                  para que funcionen los pagos.
                </>
              ) : (
                <>
                  No hay access token configurado. Los pagos de suscripciones y destacados
                  no van a funcionar hasta que lo agregues.
                </>
              )}
            </p>
          </div>
        </div>
      </Card>

      {/* ─── Credentials form ─── */}
      <Card className="p-6 bg-white border-[var(--umpi-border)]">
        <div className="flex items-center gap-2 mb-5 pb-4 border-b border-[var(--umpi-border)]">
          <div
            className="grid place-items-center rounded-md shrink-0"
            style={{
              width: 32,
              height: 32,
              background: "rgba(232, 76, 30, 0.1)",
              color: "var(--umpi-accent)",
            }}
          >
            <KeyRound className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--umpi-text)] text-sm">
              Credenciales de MercadoPago
            </h3>
            <p className="text-xs text-[var(--umpi-text2)]">
              Obtené tus credenciales en{" "}
              <a
                href="https://www.mercadopago.com.ar/developers/panel/app"
                target="_blank"
                rel="noreferrer"
                className="text-[var(--umpi-accent)] hover:underline inline-flex items-center gap-0.5"
              >
                MercadoPago Developers
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Access Token */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="mp.access_token"
                className="text-xs font-medium text-[var(--umpi-text2)]"
              >
                Access Token *
              </Label>
              <div className="flex items-center gap-1.5">
                {accessTokenInfo?.source === "db" && (
                  <Badge
                    variant="outline"
                    className="text-[9px] bg-[var(--umpi-green-soft)] text-[var(--umpi-green)] border-[var(--umpi-green)]/20 py-0"
                  >
                    <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> Guardado en DB
                  </Badge>
                )}
                {accessTokenInfo?.source === "env" && (
                  <Badge
                    variant="outline"
                    className="text-[9px] bg-[var(--umpi-surface2)] text-[var(--umpi-text3)] py-0"
                  >
                    desde .env
                  </Badge>
                )}
                {accessTokenInfo?.isSandbox && accessTokenInfo?.value && (
                  <Badge
                    variant="outline"
                    className="text-[9px] bg-yellow-50 text-yellow-700 border-yellow-200 py-0"
                  >
                    SANDBOX
                  </Badge>
                )}
              </div>
            </div>
            <div className="relative">
              <Input
                id="mp.access_token"
                type={showAccess ? "text" : "password"}
                value={displayValue("mp.access_token", accessTokenInfo)}
                onChange={(e) => handleFieldChange("mp.access_token", e.target.value)}
                placeholder="TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="bg-white font-mono text-sm pr-20"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowAccess((s) => !s)}
                  className="p-1.5 rounded text-[var(--umpi-text3)] hover:text-[var(--umpi-text)] hover:bg-[var(--umpi-surface2)]"
                  aria-label={showAccess ? "Ocultar" : "Mostrar"}
                >
                  {showAccess ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {accessTokenInfo?.source === "db" && !("mp.access_token" in draft) && (
              <p className="text-[10px] text-[var(--umpi-text3)] font-mono">
                Actual: {accessTokenInfo.masked}
              </p>
            )}
            <p className="text-[11px] text-[var(--umpi-text3)]">
              Token secreto usado en el backend para crear preferencias de pago. Comienza
              con <code className="text-[var(--umpi-text2)]">TEST-</code> para sandbox o
              <code className="text-[var(--umpi-text2)]"> APP_USR-</code> para producción.
            </p>
          </div>

          {/* Public Key */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="mp.public_key"
                className="text-xs font-medium text-[var(--umpi-text2)]"
              >
                Public Key
              </Label>
              <div className="flex items-center gap-1.5">
                {publicKeyInfo?.source === "db" && (
                  <Badge
                    variant="outline"
                    className="text-[9px] bg-[var(--umpi-green-soft)] text-[var(--umpi-green)] border-[var(--umpi-green)]/20 py-0"
                  >
                    <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> Guardado en DB
                  </Badge>
                )}
                {publicKeyInfo?.source === "env" && (
                  <Badge
                    variant="outline"
                    className="text-[9px] bg-[var(--umpi-surface2)] text-[var(--umpi-text3)] py-0"
                  >
                    desde .env
                  </Badge>
                )}
              </div>
            </div>
            <div className="relative">
              <Input
                id="mp.public_key"
                type={showPublic ? "text" : "password"}
                value={displayValue("mp.public_key", publicKeyInfo)}
                onChange={(e) => handleFieldChange("mp.public_key", e.target.value)}
                placeholder="TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="bg-white font-mono text-sm pr-20"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowPublic((s) => !s)}
                  className="p-1.5 rounded text-[var(--umpi-text3)] hover:text-[var(--umpi-text)] hover:bg-[var(--umpi-surface2)]"
                  aria-label={showPublic ? "Ocultar" : "Mostrar"}
                >
                  {showPublic ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {publicKeyInfo?.source === "db" && !("mp.public_key" in draft) && (
              <p className="text-[10px] text-[var(--umpi-text3)] font-mono">
                Actual: {publicKeyInfo.masked}
              </p>
            )}
            <p className="text-[11px] text-[var(--umpi-text3)]">
              Clave pública usada en el frontend (checkout, SDK). Comienza con{" "}
              <code className="text-[var(--umpi-text2)]">TEST-</code> o
              <code className="text-[var(--umpi-text2)]"> APP_USR-</code>.
            </p>
          </div>

          {/* Webhook Secret */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="mp.webhook_secret"
                className="text-xs font-medium text-[var(--umpi-text2)]"
              >
                Webhook Secret (opcional)
              </Label>
              {webhookSecretInfo?.source === "db" && (
                <Badge
                  variant="outline"
                  className="text-[9px] bg-[var(--umpi-green-soft)] text-[var(--umpi-green)] border-[var(--umpi-green)]/20 py-0"
                >
                  <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> Guardado en DB
                </Badge>
              )}
            </div>
            <div className="relative">
              <Input
                id="mp.webhook_secret"
                type={showSecret ? "text" : "password"}
                value={displayValue("mp.webhook_secret", webhookSecretInfo)}
                onChange={(e) => handleFieldChange("mp.webhook_secret", e.target.value)}
                placeholder="WhSec_xxxxxxxxxxxx"
                className="bg-white font-mono text-sm pr-20"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowSecret((s) => !s)}
                  className="p-1.5 rounded text-[var(--umpi-text3)] hover:text-[var(--umpi-text)] hover:bg-[var(--umpi-surface2)]"
                  aria-label={showSecret ? "Ocultar" : "Mostrar"}
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <p className="text-[11px] text-[var(--umpi-text3)]">
              Secreto para validar la firma de los webhooks de MercadoPago. Se configura
              en el panel de MP → Notificaciones.
            </p>
          </div>

          {/* Webhook URL */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="mp.webhook_url"
                className="text-xs font-medium text-[var(--umpi-text2)]"
              >
                Webhook URL override (opcional)
              </Label>
              {webhookUrlInfo?.source === "db" && (
                <Badge
                  variant="outline"
                  className="text-[9px] bg-[var(--umpi-green-soft)] text-[var(--umpi-green)] border-[var(--umpi-green)]/20 py-0"
                >
                  <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> Guardado en DB
                </Badge>
              )}
            </div>
            <Input
              id="mp.webhook_url"
              type="text"
              value={displayValue("mp.webhook_url", webhookUrlInfo)}
              onChange={(e) => handleFieldChange("mp.webhook_url", e.target.value)}
              placeholder="https://tu-dominio.com/api/mercadopago/webhook"
              className="bg-white font-mono text-sm"
            />
            <p className="text-[11px] text-[var(--umpi-text3)]">
              Por defecto se usa{" "}
              <code className="text-[var(--umpi-text2)]">
                {`{NEXTAUTH_URL}/api/mercadopago/webhook`}
              </code>
              . Sobreescribí si usás otro dominio o proxy.
            </p>
          </div>
        </div>

        {/* Test result */}
        {testResult && (
          <div
            className={`mt-4 p-3 rounded-lg border flex items-start gap-2 ${
              testResult.valid
                ? "bg-[var(--umpi-green-soft)] border-[var(--umpi-green)]/30"
                : "bg-red-50 border-red-200"
            }`}
          >
            {testResult.valid ? (
              <CheckCircle2 className="w-4 h-4 text-[var(--umpi-green)] shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            )}
            <div className="text-sm">
              <p
                className={`font-medium ${
                  testResult.valid ? "text-[var(--umpi-green)]" : "text-red-700"
                }`}
              >
                {testResult.valid ? "Token válido" : "Token inválido"}
              </p>
              <p className="text-[var(--umpi-text2)] text-xs">{testResult.message}</p>
              {testResult.detail && (
                <p className="text-[var(--umpi-text3)] text-[10px] mt-1 font-mono">
                  {testResult.detail}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex flex-wrap items-center gap-2 pt-4 border-t border-[var(--umpi-border)]">
          <Button
            onClick={handleTest}
            disabled={testing || testMutation.isPending}
            variant="outline"
            className="border-[var(--umpi-border)]"
          >
            {testMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <TestTube className="w-4 h-4 mr-1.5" />
            )}
            Validar token
          </Button>
          <Button
            onClick={handleSave}
            disabled={!dirty || saveMutation.isPending}
            style={{ background: "var(--umpi-accent)", color: "white" }}
            className="ml-auto"
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-1.5" />
            )}
            Guardar cambios
          </Button>
        </div>
      </Card>

      {/* ─── Setup guide ─── */}
      <Card className="p-5 bg-[var(--umpi-surface)] border-[var(--umpi-border)]">
        <div className="flex items-start gap-3">
          <div
            className="grid place-items-center rounded-md shrink-0"
            style={{
              width: 28,
              height: 28,
              background: "rgba(124, 58, 237, 0.12)",
              color: "var(--umpi-purple)",
            }}
          >
            <Info className="w-4 h-4" />
          </div>
          <div className="text-sm">
            <h4 className="font-semibold text-[var(--umpi-text)] mb-2">
              ¿Cómo obtener tus credenciales?
            </h4>
            <ol className="space-y-1.5 text-[var(--umpi-text2)] text-xs list-decimal list-inside">
              <li>
                Ingresá a{" "}
                <a
                  href="https://www.mercadopago.com.ar/developers/panel/app"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--umpi-accent)] hover:underline inline-flex items-center gap-0.5"
                >
                  MercadoPago Developers
                  <ExternalLink className="w-3 h-3" />
                </a>{" "}
                con tu cuenta de MercadoPago.
              </li>
              <li>Creá una aplicación o entrá en una existente.</li>
              <li>
                En <strong>Credenciales</strong>, copiá el{" "}
                <strong>Access Token</strong> y la <strong>Public Key</strong> de prueba
                (TEST-) para sandbox, o de producción (APP_USR-) cuando vayas a vender de
                verdad.
              </li>
              <li>Pegá los valores acá y hacé clic en <strong>Guardar cambios</strong>.</li>
              <li>
                Para recibir webhooks: en <strong>Notificaciones → Webhook</strong>, agregá
                la URL <code>{`{tu-dominio}/api/mercadopago/webhook`}</code> y especificá
                los eventos <code>payment</code>, <code>preapproval</code> y{" "}
                <code>merchant_order</code>.
              </li>
            </ol>
            <div className="mt-3 pt-3 border-t border-[var(--umpi-border)] text-[11px] text-[var(--umpi-text3)]">
              <ShieldCheck className="w-3 h-3 inline mr-1 text-[var(--umpi-green)]" />
              Las credenciales se guardan cifradas en la base de datos y solo son
              accesibles desde el panel de administrador. Nunca se exponen en el frontend.
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
