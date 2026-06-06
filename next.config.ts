import type { NextConfig } from "next";
import path from "path";

const isProd = process.env.NODE_ENV === "production";
const SUPABASE_HOSTNAME = "*.supabase.co";

// CSP de fallback para rotas estáticas (_next/static, etc.) não cobertas pelo middleware.
// O middleware (src/middleware.ts) injeta CSP com nonce por request em produção,
// eliminando 'unsafe-inline' para scripts. Esta versão estática é o backstop.
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://${SUPABASE_HOSTNAME}`,
  `media-src 'self' blob: https://${SUPABASE_HOSTNAME}`,
  `connect-src 'self' https://${SUPABASE_HOSTNAME} wss://${SUPABASE_HOSTNAME}`,
  "font-src 'self' https://fonts.gstatic.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          // CSP e HSTS só em produção — em dev o HTTP local + Turbopack é incompatível com CSP estrita
          ...(isProd ? [
            { key: "Content-Security-Policy", value: cspDirectives },
            { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
          ] : []),
        ],
      },
      // Content-Disposition em arquivos do Storage (impede SVG/HTML de executar no browser)
      {
        source: "/storage/:path*",
        headers: [
          { key: "Content-Disposition", value: "attachment" },
        ],
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  poweredByHeader: false,

  // typedRoutes moved out of `experimental` in newer Next.js versions
  typedRoutes: true,

  // Explicit Turbopack root to avoid workspace root inference warnings
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;