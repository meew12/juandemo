import type { Metadata, Viewport } from "next";
import { DM_Sans, Sora, DM_Serif_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://umpi.com.ar"),
  title: "UMPI — El marketplace de Argentina",
  description:
    "UMPI es el marketplace de servicios, autos y propiedades de Argentina. Publicá gratis, destacá tus avisos y llegá a miles de clientes.",
  applicationName: "UMPI",
  keywords: [
    "UMPI",
    "marketplace Argentina",
    "servicios",
    "autos",
    "propiedades",
    "avisos clasificados",
    "Mercado Pago",
  ],
  authors: [{ name: "UMPI S.A.S." }],
  creator: "UMPI S.A.S.",
  publisher: "UMPI S.A.S.",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  alternates: {
    canonical: "/",
  },
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/logo.svg", type: "image/svg+xml" }],
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
  openGraph: {
    title: "UMPI — El marketplace de Argentina",
    description:
      "El marketplace de servicios, autos y propiedades de Argentina. Publicá gratis.",
    siteName: "UMPI",
    type: "website",
    locale: "es_AR",
    url: "https://umpi.com.ar",
  },
  twitter: {
    card: "summary_large_image",
    title: "UMPI — El marketplace de Argentina",
    description:
      "El marketplace de servicios, autos y propiedades de Argentina.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e84c1e" },
    { media: "(prefers-color-scheme: dark)", color: "#f06030" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${dmSans.variable} ${sora.variable} ${dmSerif.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          {children}
          <Toaster />
          <SonnerToaster position="bottom-right" richColors />
        </Providers>
      </body>
    </html>
  );
}
