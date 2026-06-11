import { getSupabaseServerClient } from '@/lib/supabase/server';
import { decryptToken, encryptToken } from './crypto';
import { refreshAccessToken } from './calendar';

export interface ActiveGoogleConnection {
  id: string;
  calendarId: string;
  accessToken: string;
  syncToken: string | null;
}

const REFRESH_MARGIN_MS = 5 * 60 * 1000;

/**
 * Busca a conexão única da agência, renovando o access_token (e persistindo)
 * quando estiver perto de expirar. Retorna `null` se não houver conexão.
 */
export async function getActiveGoogleConnection(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>
): Promise<ActiveGoogleConnection | null> {
  const { data: row } = await supabase
    .from('google_calendar_connections')
    .select('id, calendar_id, access_token_enc, refresh_token_enc, token_expires_at, sync_token')
    .limit(1)
    .maybeSingle();

  if (!row) return null;

  let accessToken = decryptToken(row.access_token_enc as string);
  const expiresAt = new Date(row.token_expires_at as string).getTime();

  if (expiresAt - Date.now() < REFRESH_MARGIN_MS) {
    const refreshToken = decryptToken(row.refresh_token_enc as string);
    const refreshed = await refreshAccessToken(refreshToken);
    accessToken = refreshed.access_token;

    await supabase
      .from('google_calendar_connections')
      .update({
        access_token_enc: encryptToken(accessToken),
        token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      })
      .eq('id', row.id as string);
  }

  return {
    id: row.id as string,
    calendarId: row.calendar_id as string,
    accessToken,
    syncToken: (row.sync_token as string | null) ?? null,
  };
}
