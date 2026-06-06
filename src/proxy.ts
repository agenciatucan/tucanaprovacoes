import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const SUPABASE_HOSTNAME = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : '*.supabase.co';

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https://${SUPABASE_HOSTNAME}`,
    `media-src 'self' blob: https://${SUPABASE_HOSTNAME}`,
    `connect-src 'self' https://${SUPABASE_HOSTNAME} wss://${SUPABASE_HOSTNAME}`,
    "font-src 'self' https://fonts.gstatic.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

// Rotas que não precisam de autenticação
const PUBLIC_ROUTES = ["/", "/login", "/acesso"];
const ADMIN_ROUTES = ["/admin"];
const CLIENT_ROUTES = ["/cliente"];

// Prefixos permitidos para o parâmetro ?redirect= após login.
// Nunca redirecionar para URLs externas ou paths arbitrários.
const SAFE_REDIRECT_PREFIXES = ["/admin", "/cliente"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const nonce = process.env.NODE_ENV === 'production'
    ? Buffer.from(crypto.randomUUID()).toString('base64')
    : undefined;

  const requestHeaders = new Headers(request.headers);
  if (nonce) requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  if (nonce) response.headers.set('Content-Security-Policy', buildCsp(nonce));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, {
              ...options,
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
            });
          });
        },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
  const isAdminRoute = ADMIN_ROUTES.some((route) => pathname.startsWith(route));
  const isClientRoute = CLIENT_ROUTES.some((route) => pathname.startsWith(route));

  if (isPublicRoute) {
    if (user && (pathname === "/" || pathname === "/login")) {
      const role = await getUserRole(supabase, user.id);
      return NextResponse.redirect(new URL(getDefaultRoute(role), request.url));
    }
    return response;
  }

  if (!user || error) {
    const loginUrl = new URL("/login", request.url);
    if (SAFE_REDIRECT_PREFIXES.some((p) => pathname.startsWith(p))) {
      loginUrl.searchParams.set("redirect", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  const role = await getUserRole(supabase, user.id);

  if (isAdminRoute && role !== "admin" && role !== "equipe") {
    return NextResponse.redirect(new URL("/cliente", request.url));
  }

  if (isClientRoute && (role === "admin" || role === "equipe")) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return response;
}

async function getUserRole(supabase: ReturnType<typeof createServerClient>, userId: string) {
  const { data } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("auth_user_id", userId)
    .single();

  return data?.role ?? "cliente";
}

function getDefaultRoute(role: string) {
  switch (role) {
    case "admin": return "/admin";
    case "equipe": return "/admin";
    default: return "/cliente";
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
