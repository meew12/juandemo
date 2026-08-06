import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // ─── Incluir el archivo SQL en el build para que /api/setup lo pueda leer ───
  outputFileTracingIncludes: {
    "/api/setup": ["./database/umpi_turso.sql"],
  },
};

export default nextConfig;
