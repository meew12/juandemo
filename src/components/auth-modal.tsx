"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Mail, Lock, User, Eye, EyeOff } from "lucide-react";

export function AuthModal({
  open,
  onOpenChange,
  defaultMode = "login",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMode?: "login" | "register";
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">(defaultMode);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    name: "",
    lastName: "",
    email: "",
    password: "",
  });

  useEffect(() => {
    setMode(defaultMode);
  }, [defaultMode, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "register") {
        // Register
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al registrarse");
        toast.success("¡Cuenta creada! Bienvenido a UMPI 🎉");
      }

      // Login (after register or directly)
      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Email o contraseña incorrectos");
      } else {
        toast.success(mode === "login" ? "¡Bienvenido de vuelta!" : "¡Sesión iniciada!");
        onOpenChange(false);
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || "Ocurrió un error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden">
        <div
          className="px-6 py-5 text-white text-center"
          style={{ background: "linear-gradient(135deg, #1a1612 0%, #2d2520 50%, #3d1f0f 100%)" }}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <div
              className="grid place-items-center text-white font-display"
              style={{ width: 36, height: 36, background: "var(--umpi-accent)", borderRadius: 10, fontSize: 20 }}
            >
              U
            </div>
            <span
              className="font-bold text-xl"
              style={{ fontFamily: "var(--font-sora)", fontWeight: 700, letterSpacing: "-0.5px" }}
            >
              UMP<span style={{ color: "var(--umpi-accent)" }}>I</span>
            </span>
          </div>
          <DialogHeader className="space-y-1 p-0 text-left">
            <DialogTitle className="text-white text-center text-lg font-semibold">
              {mode === "login" ? "Ingresá a tu cuenta" : "Creá tu cuenta gratis"}
            </DialogTitle>
            <DialogDescription className="text-white/70 text-center text-sm">
              {mode === "login"
                ? "Accedé a miles de servicios, autos y propiedades"
                : "Empezá a publicar y contactar vendedores"}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 pt-2">
          <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">Ingresar</TabsTrigger>
              <TabsTrigger value="register">Registrarse</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email-login" className="text-xs font-medium text-[var(--umpi-text2)]">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--umpi-text3)]" />
                    <Input
                      id="email-login"
                      type="email"
                      required
                      placeholder="tu@email.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="pl-9 h-10"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password-login" className="text-xs font-medium text-[var(--umpi-text2)]">
                    Contraseña
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--umpi-text3)]" />
                    <Input
                      id="password-login"
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="pl-9 pr-9 h-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--umpi-text3)] hover:text-[var(--umpi-text)]"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[var(--umpi-accent)] hover:bg-[var(--umpi-accent2)] text-white h-10"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ingresar"}
                </Button>
              </form>
              <div className="text-xs text-center mt-3 text-[var(--umpi-text3)]">
                Demo: <code className="text-[var(--umpi-accent)]">juan.garcia@email.com</code> / <code className="text-[var(--umpi-accent)]">user123</code>
              </div>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-xs font-medium text-[var(--umpi-text2)]">
                      Nombre
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--umpi-text3)]" />
                      <Input
                        id="name"
                        required
                        placeholder="Juan"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="pl-9 h-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName" className="text-xs font-medium text-[var(--umpi-text2)]">
                      Apellido
                    </Label>
                    <Input
                      id="lastName"
                      required
                      placeholder="García"
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      className="h-10"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium text-[var(--umpi-text2)]">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--umpi-text3)]" />
                    <Input
                      id="email"
                      type="email"
                      required
                      placeholder="tu@email.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="pl-9 h-10"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-medium text-[var(--umpi-text2)]">
                    Contraseña
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--umpi-text3)]" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      placeholder="Mínimo 6 caracteres"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="pl-9 pr-9 h-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--umpi-text3)] hover:text-[var(--umpi-text)]"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[var(--umpi-accent)] hover:bg-[var(--umpi-accent2)] text-white h-10"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Crear cuenta gratis"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[var(--umpi-border)]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[var(--umpi-surface)] px-2 text-[var(--umpi-text3)]">o continuá con</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => toast.info("Login con Google estará disponible pronto")}
            className="w-full h-10 gap-2 border-[var(--umpi-border)] hover:bg-[var(--umpi-surface2)]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google
          </Button>

          <p className="text-[10px] text-center text-[var(--umpi-text3)] mt-3">
            Al continuar aceptás los <a href="#" className="underline">Términos</a> y la{" "}
            <a href="#" className="underline">Política de Privacidad</a> de UMPI.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
