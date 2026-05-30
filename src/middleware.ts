// ============================================================
// MIDDLEWARE — Proteção de rotas no edge (executa antes de tudo)
// Valida sessão e redireciona baseado em perfil
// ============================================================
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

// Rotas que não precisam de autenticação
const PUBLIC_ROUTES = ["/", "/login", "/acesso"];
const ADMIN_ROUTES = ["/admin"];
const CLIENT_ROUTES = ["/cliente"];

// Prefixos permitidos para o parâmetro ?redirect= após login.
// Nunca redirecionar para URLs externas ou paths arbitrários.
const SAFE_REDIRECT_PREFIXES = ["/admin", "/cliente"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next({ request });

  // Inicializa cliente Supabase com cookies da requisição
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

  // Verifica sessão ativa — SEMPRE via getUser() não getSession()
  // getUser() valida o token com o servidor Supabase (mais seguro)
  const { data: { user }, error } = await supabase.auth.getUser();

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
  const isAdminRoute = ADMIN_ROUTES.some((route) => pathname.startsWith(route));
  const isClientRoute = CLIENT_ROUTES.some((route) => pathname.startsWith(route));

  // Rota pública — qualquer um pode acessar
  if (isPublicRoute) {
    // Se já está logado em / ou /login, redireciona para a área correta
    if (user && (pathname === "/" || pathname === "/login")) {
      const role = await getUserRole(supabase, user.id);
      return NextResponse.redirect(new URL(getDefaultRoute(role), request.url));
    }
    return response;
  }

  // Sem sessão — redireciona para login
  if (!user || error) {
    const loginUrl = new URL("/login", request.url);
    // Só preserva o destino se for uma rota interna permitida
    if (SAFE_REDIRECT_PREFIXES.some((p) => pathname.startsWith(p))) {
      loginUrl.searchParams.set("redirect", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Verifica perfil e permissões
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
    // Aplica middleware em todas as rotas exceto assets estáticos
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
