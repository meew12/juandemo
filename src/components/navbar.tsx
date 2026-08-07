"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { useState, useSyncExternalStore } from "react";
import {
  Search,
  MessageCircle,
  LayoutDashboard,
  Plus,
  Menu,
  X,
  User,
  LogOut,
  Settings,
  Heart,
  Sparkles,
  Sun,
  Moon,
  Bookmark,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AuthModal } from "@/components/auth-modal";
import { NotificationBell } from "@/components/notification-bell";
import { SearchSuggestions, useSearchSuggestions } from "@/components/search-suggestions";
import { SavedSearchesDropdown } from "@/components/saved-searches-dropdown";
import { getInitials } from "@/lib/utils-umpi";

const NAV_CATEGORIES = [
  { label: "Inicio", href: "/?page=home" },
  { label: "Servicios", href: "/?page=servicios" },
  { label: "Autos", href: "/?page=autos" },
  { label: "Propiedades", href: "/?page=propiedades" },
];

const emptySubscribe = () => () => {};
const returnTrue = () => true;
const returnFalse = () => false;
function useMounted() {
  return useSyncExternalStore(emptySubscribe, returnTrue, returnFalse);
}

export function Navbar({ currentPage, onNavigate }: { currentPage: string; onNavigate: (page: string) => void }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [showAuth, setShowAuth] = useState(() => {
    if (typeof window === "undefined") return false;
    const url = new URL(window.location.href);
    return url.searchParams.get("auth") === "login" || url.searchParams.get("auth") === "register";
  });
  const [authMode, setAuthMode] = useState<"login" | "register">(() => {
    if (typeof window === "undefined") return "login" as const;
    const url = new URL(window.location.href);
    return url.searchParams.get("auth") === "register" ? "register" : "login";
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const { open: suggestionsOpen, setOpen: setSuggestionsOpen, ref: suggestionsRef } = useSearchSuggestions();

  const openAuth = (mode: "login" | "register") => {
    setAuthMode(mode);
    setShowAuth(true);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSuggestionsOpen(false);
      onNavigate("servicios");
      // The servicios page reads the query from URL or a shared store
      const url = new URL(window.location.href);
      url.searchParams.set("page", "servicios");
      url.searchParams.set("q", searchQuery.trim());
      window.history.pushState({}, "", url.toString());
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  const handleSuggestionSelect = (suggestion: string) => {
    setSearchQuery(suggestion);
    setSuggestionsOpen(false);
    onNavigate("servicios");
    const url = new URL(window.location.href);
    url.searchParams.set("page", "servicios");
    url.searchParams.set("q", suggestion);
    window.history.pushState({}, "", url.toString());
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const navigate = (page: string) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  const userName =
    session?.user?.name || (session?.user?.email ? session.user.email.split("@")[0] : "");
  const userPlan = (session?.user as any)?.plan || "basico";

  return (
    <>
      <header
        className="sticky top-0 z-50 bg-[var(--umpi-surface)]/95 dark:bg-[#0f0d0a]/95 backdrop-blur-md border-b border-[var(--umpi-border)]"
        style={{ height: "var(--nav-h)" }}
      >
        <nav className="h-full px-4 sm:px-6 flex items-center gap-3 sm:gap-4 max-w-[1600px] mx-auto">
          {/* Logo */}
          <Link
            href="/?page=home"
            onClick={(e) => {
              e.preventDefault();
              navigate("home");
            }}
            className="flex items-center gap-2.5 shrink-0"
          >
            <div
              className="grid place-items-center text-white font-display"
              style={{
                width: 36,
                height: 36,
                background: "var(--umpi-accent)",
                borderRadius: 10,
                fontSize: 20,
                letterSpacing: "-1px",
              }}
            >
              U
            </div>
            <span
              className="font-bold tracking-tight"
              style={{ fontFamily: "var(--font-sora)", fontSize: 20, fontWeight: 700, letterSpacing: "-0.5px" }}
            >
              UMP<span style={{ color: "var(--umpi-accent)" }}>I</span>
            </span>
          </Link>

          {/* Search bar - desktop */}
          <div ref={suggestionsRef} className="hidden md:flex flex-1 max-w-xl relative">
            <form onSubmit={handleSearch} className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--umpi-text3)]" />
              <Input
                type="text"
                placeholder="Buscar servicios, autos, propiedades…"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSuggestionsOpen(true);
                }}
                onFocus={() => setSuggestionsOpen(true)}
                className="pl-10 pr-4 h-10 bg-[var(--umpi-surface2)] border-[var(--umpi-border)] focus-visible:ring-[var(--umpi-accent)] focus-visible:border-[var(--umpi-accent)] rounded-full text-sm"
              />
            </form>
            {suggestionsOpen && (
              <SearchSuggestions
                query={searchQuery}
                onSelect={handleSuggestionSelect}
                onClose={() => setSuggestionsOpen(false)}
              />
            )}
          </div>

          {/* Category pills - desktop */}
          <div className="hidden lg:flex items-center gap-1">
            {NAV_CATEGORIES.map((cat) => {
              const pageKey = cat.href.split("=")[1];
              const isActive = currentPage === pageKey;
              return (
                <button
                  key={cat.label}
                  onClick={() => navigate(pageKey)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all umpi-transition ${
                    isActive
                      ? "bg-[var(--umpi-accent)] text-white"
                      : "text-[var(--umpi-text2)] hover:bg-[var(--umpi-surface2)] hover:text-[var(--umpi-text)]"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
            <button
              onClick={() => navigate("suscripciones")}
              className={`ml-1 px-3 py-1.5 rounded-full text-sm font-semibold transition-all umpi-transition flex items-center gap-1 ${
                currentPage === "suscripciones"
                  ? "bg-[var(--umpi-purple)] text-white"
                  : "bg-[var(--umpi-purple-soft)] text-[var(--umpi-purple)] hover:bg-[var(--umpi-purple)] hover:text-white"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Premium
            </button>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1.5 ml-auto">
            {status === "authenticated" && <NotificationBell />}
            {status === "authenticated" && (
              <SavedSearchesDropdown
                onApplySearch={(saved) => {
                  onNavigate(saved.type === "servicio" ? "servicios" : saved.type === "auto" ? "autos" : saved.type === "propiedad" ? "propiedades" : "home");
                }}
                align="end"
              />
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("mensajes")}
              className="hidden sm:flex gap-2 text-[var(--umpi-text2)] hover:text-[var(--umpi-text)] hover:bg-[var(--umpi-surface2)]"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="hidden xl:inline">Mensajes</span>
            </Button>

            {/* Dark mode toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="text-[var(--umpi-text2)] hover:text-[var(--umpi-text)] hover:bg-[var(--umpi-surface2)]"
              aria-label="Cambiar tema"
            >
              {mounted ? (
                theme === "dark" ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )
              ) : (
                <Sun className="w-4 h-4" />
              )}
            </Button>

            {status === "authenticated" ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 px-2 py-1 rounded-full hover:bg-[var(--umpi-surface2)] transition-colors">
                    <Avatar className="w-8 h-8 border-2 border-[var(--umpi-accent)]">
                      <AvatarFallback
                        className="text-xs font-semibold"
                        style={{ background: "var(--umpi-accent)", color: "white" }}
                      >
                        {getInitials(userName)}
                      </AvatarFallback>
                    </Avatar>
                    {userPlan !== "basico" && (
                      <Badge
                        variant="secondary"
                        className="hidden sm:inline-flex text-[10px] px-1.5 py-0"
                        style={{
                          background: "var(--umpi-purple-soft)",
                          color: "var(--umpi-purple)",
                        }}
                      >
                        {userPlan === "pro" ? "Pro" : "Business"}
                      </Badge>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{userName}</p>
                      <p className="text-xs leading-none text-[var(--umpi-text2)]">
                        {session?.user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("perfil")} className="cursor-pointer">
                    <User className="w-4 h-4 mr-2" /> Mi perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("perfil")} className="cursor-pointer">
                    <Heart className="w-4 h-4 mr-2" /> Favoritos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("mensajes")} className="cursor-pointer">
                    <MessageCircle className="w-4 h-4 mr-2" /> Mensajes
                  </DropdownMenuItem>
                  {(session?.user as any)?.role === "admin" && (
                    <DropdownMenuItem onClick={() => navigate("admin")} className="cursor-pointer">
                      <LayoutDashboard className="w-4 h-4 mr-2" /> Panel Admin
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => navigate("suscripciones")} className="cursor-pointer">
                    <Sparkles className="w-4 h-4 mr-2" /> Premium
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="cursor-pointer text-red-600 focus:text-red-600"
                  >
                    <LogOut className="w-4 h-4 mr-2" /> Cerrar sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openAuth("login")}
                className="text-[var(--umpi-text2)] hover:text-[var(--umpi-text)] hover:bg-[var(--umpi-surface2)]"
              >
                Ingresar
              </Button>
            )}

            <Button
              size="sm"
              onClick={() => navigate("publicar")}
              className="bg-[var(--umpi-accent)] hover:bg-[var(--umpi-accent2)] text-white gap-1.5 rounded-full px-4"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Publicar</span>
            </Button>

            {(session?.user as any)?.role === "admin" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("admin")}
                className="hidden sm:flex text-[var(--umpi-text2)] hover:text-[var(--umpi-text)] hover:bg-[var(--umpi-surface2)]"
                title="Panel Admin"
              >
                <LayoutDashboard className="w-4 h-4" />
              </Button>
            )}

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </nav>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-[var(--umpi-border)] bg-[var(--umpi-surface)] p-4 space-y-3 animate-slide-up">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--umpi-text3)]" />
              <Input
                type="text"
                placeholder="Buscar…"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSuggestionsOpen(true);
                }}
                onFocus={() => setSuggestionsOpen(true)}
                className="pl-10 pr-4 h-10 bg-[var(--umpi-surface2)] border-[var(--umpi-border)] rounded-full text-sm"
              />
              {suggestionsOpen && (
                <SearchSuggestions
                  query={searchQuery}
                  onSelect={handleSuggestionSelect}
                  onClose={() => setSuggestionsOpen(false)}
                />
              )}
            </form>
            <div className="flex flex-col gap-1">
              {NAV_CATEGORIES.map((cat) => {
                const pageKey = cat.href.split("=")[1];
                return (
                  <button
                    key={cat.label}
                    onClick={() => navigate(pageKey)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium text-left transition-colors ${
                      currentPage === pageKey
                        ? "bg-[var(--umpi-accent)] text-white"
                        : "text-[var(--umpi-text2)] hover:bg-[var(--umpi-surface2)]"
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
              <button
                onClick={() => navigate("suscripciones")}
                className="px-3 py-2 rounded-lg text-sm font-semibold text-left bg-[var(--umpi-purple-soft)] text-[var(--umpi-purple)]"
              >
                ⭐ Premium
              </button>
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="px-3 py-2 rounded-lg text-sm font-medium text-left flex items-center gap-2 text-[var(--umpi-text2)] hover:bg-[var(--umpi-surface2)]"
              >
                {mounted && theme === "dark" ? (
                  <>
                    <Sun className="w-4 h-4" /> Modo claro
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4" /> Modo oscuro
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </header>

      <AuthModal open={showAuth} onOpenChange={setShowAuth} defaultMode={authMode} />
    </>
  );
}
