// ============================================================
// CLIENTE SUPABASE — lado do browser (componentes client-side)
// ============================================================
import { createBrowserClient } from "@supabase/ssr";

// Singleton para evitar múltiplas instâncias
let client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (client) return client;

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return client;
}
