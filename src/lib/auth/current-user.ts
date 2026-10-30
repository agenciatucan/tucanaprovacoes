import { cache } from 'react';
import { getSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Sessão e perfil do usuário logado, deduplicados por request com React cache().
 *
 * Layout, página e helpers (getUnreadCount, requireAdmin...) rodam no mesmo request;
 * sem o cache cada um refazia auth + SELECT em user_profiles em série.
 * getClaims() valida o JWT localmente (chaves ES256 via JWKS em cache global),
 * sem a ida ao servidor de Auth que o getUser() faz.
 *
 * Uso: só em Server Components / páginas. Server Actions de mutação continuam
 * usando supabase.auth.getUser() direto.
 */
export const getAuthUserId = cache(async (): Promise<string | null> => {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  return data.claims.sub;
});

export const getCurrentProfile = cache(async () => {
  const userId = await getAuthUserId();
  if (!userId) return null;

  const supabase = await getSupabaseServerClient();
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, name, role')
    .eq('auth_user_id', userId)
    .single();

  return profile as { id: string; name: string; role: string } | null;
});
