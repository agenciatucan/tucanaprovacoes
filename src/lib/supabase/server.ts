// ============================================================
// CLIENTE SUPABASE — lado do servidor (Server Components, Actions)
// Usa cookies para manter sessão sem expor tokens no cliente
// ============================================================
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function getSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, {
                ...options,
                httpOnly: true,      // Bloqueia acesso via JS (XSS)
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
              });
            });
          } catch {
            // Ignorado em Server Components (só funciona em Route Handlers)
          }
        },
      },
    }
  );
}

// Cliente com privilégio de serviço — APENAS para uso em Server Actions críticas
// NUNCA expor para o cliente ou usar em componentes
export async function getSupabaseServiceClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não definida");
  }

  const { createClient } = await import("@supabase/supabase-js");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
