import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { getActiveGoogleConnection, type ActiveGoogleConnection } from '@/lib/google/connection';
import {
  listEvents,
  insertEvent,
  toGoogleEvent,
  fromGoogleEvent,
  type GoogleCalendarEvent,
} from '@/lib/google/calendar';
import { logger } from '@/lib/logger';

type ServiceClient = Awaited<ReturnType<typeof getSupabaseServiceClient>>;

// Sem syncToken (primeira carga ou token expirado), buscamos eventos a partir
// desta janela — cobre reuniões recentes sem precisar paginar o histórico todo.
const FULL_SYNC_LOOKBACK_DAYS = 30;

function lookbackTimeMin() {
  return new Date(Date.now() - FULL_SYNC_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

function sameInstant(a: string | null, b: string | null | undefined) {
  if (!a || !b) return false;
  return new Date(a).getTime() === new Date(b).getTime();
}

async function fetchAllEvents(
  connection: ActiveGoogleConnection,
  baseOpts: { syncToken?: string; timeMin?: string }
) {
  const events: GoogleCalendarEvent[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | undefined;

  do {
    const page = await listEvents(connection.accessToken, connection.calendarId, { ...baseOpts, pageToken });
    events.push(...page.events);
    if (page.nextSyncToken) nextSyncToken = page.nextSyncToken;
    pageToken = page.nextPageToken;
  } while (pageToken);

  return { events, nextSyncToken };
}

interface PullStats {
  created: number;
  updated: number;
  removed: number;
  skipped: number;
}

/** Aplica um evento vindo do Google em `internal_events`, com lógica anti-eco. */
async function applyGoogleEvent(supabase: ServiceClient, googleEvent: GoogleCalendarEvent, stats: PullStats) {
  const { data: existing } = await supabase
    .from('internal_events')
    .select('id, google_updated_at')
    .eq('google_event_id', googleEvent.id)
    .maybeSingle();

  if (googleEvent.status === 'cancelled') {
    if (existing) {
      await supabase.from('internal_events').delete().eq('id', existing.id as string);
      stats.removed++;
    } else {
      stats.skipped++;
    }
    return;
  }

  const mapped = fromGoogleEvent(googleEvent);
  if (!mapped) {
    stats.skipped++;
    return;
  }

  if (existing) {
    if (sameInstant(existing.google_updated_at as string | null, googleEvent.updated)) {
      stats.skipped++; // eco da própria sincronização — nada mudou desde o último push
      return;
    }

    await supabase
      .from('internal_events')
      .update({ ...mapped, google_updated_at: googleEvent.updated ?? null })
      .eq('id', existing.id as string);
    stats.updated++;
    return;
  }

  await supabase.from('internal_events').insert({
    ...mapped,
    google_event_id: googleEvent.id,
    google_updated_at: googleEvent.updated ?? null,
  });
  stats.created++;
}

/** Puxa mudanças do Google Agenda (sync incremental via syncToken, com fallback para full resync). */
async function pullFromGoogle(supabase: ServiceClient, connection: ActiveGoogleConnection) {
  let page;
  try {
    page = connection.syncToken
      ? await fetchAllEvents(connection, { syncToken: connection.syncToken })
      : await fetchAllEvents(connection, { timeMin: lookbackTimeMin() });
  } catch (err) {
    if (!(err instanceof Error) || err.name !== 'SyncTokenExpiredError') throw err;
    page = await fetchAllEvents(connection, { timeMin: lookbackTimeMin() });
  }

  const stats: PullStats = { created: 0, updated: 0, removed: 0, skipped: 0 };
  for (const googleEvent of page.events) {
    await applyGoogleEvent(supabase, googleEvent, stats);
  }

  return { nextSyncToken: page.nextSyncToken ?? null, total: page.events.length, ...stats };
}

/** Empurra para o Google eventos criados localmente cujo push inicial falhou (best-effort). */
async function pushPendingToGoogle(supabase: ServiceClient, connection: ActiveGoogleConnection) {
  const { data: pending } = await supabase
    .from('internal_events')
    .select('id, title, description, location, event_date, start_time, end_time')
    .is('google_event_id', null);

  let pushed = 0;
  for (const event of pending ?? []) {
    try {
      const result = await insertEvent(connection.accessToken, connection.calendarId, toGoogleEvent(event));
      await supabase
        .from('internal_events')
        .update({ google_event_id: result.id, google_updated_at: result.updated ?? null })
        .eq('id', event.id as string);
      pushed++;
    } catch (err) {
      logger.error('googleCalendarSyncPushPending', err instanceof Error ? err.message : 'Erro desconhecido');
    }
  }

  return pushed;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const supabase = await getSupabaseServiceClient();
  const connection = await getActiveGoogleConnection(supabase);
  if (!connection) {
    return NextResponse.json({ skipped: 'Nenhuma conexão com o Google Agenda ativa' });
  }

  try {
    const pulled = await pullFromGoogle(supabase, connection);
    const pushed = await pushPendingToGoogle(supabase, connection);

    await supabase
      .from('google_calendar_connections')
      .update({ sync_token: pulled.nextSyncToken, last_synced_at: new Date().toISOString() })
      .eq('id', connection.id);

    return NextResponse.json({ ok: true, pulled, pushed });
  } catch (err) {
    logger.error('googleCalendarSync', err instanceof Error ? err.message : 'Erro desconhecido');
    return NextResponse.json({ error: 'Erro ao sincronizar com o Google Agenda' }, { status: 500 });
  }
}
