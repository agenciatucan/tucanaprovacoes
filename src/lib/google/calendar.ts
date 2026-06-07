const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const TIME_ZONE = 'America/Sao_Paulo';

export const GOOGLE_OAUTH_SCOPE = 'https://www.googleapis.com/auth/calendar';

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
}

export interface InternalEventRecord {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
}

export interface GoogleCalendarEvent {
  id: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  updated?: string;
  start?: { date?: string; dateTime?: string; timeZone?: string };
  end?: { date?: string; dateTime?: string; timeZone?: string };
}

interface ListEventsResult {
  events: GoogleCalendarEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
}

async function googleFetch(url: string, accessToken: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${accessToken}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  return res;
}

/** Troca o `code` do redirect OAuth pelos tokens de acesso/renovação. */
export async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!res.ok) {
    throw new Error(`Falha ao trocar código por tokens: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

/** Renova o access_token a partir do refresh_token salvo. */
export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    throw new Error(`Falha ao renovar token: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

/** Busca o e-mail da conta Google conectada (para exibir na tela de Configurações). */
export async function fetchGoogleAccountEmail(accessToken: string): Promise<string | null> {
  const res = await googleFetch('https://www.googleapis.com/oauth2/v2/userinfo', accessToken);
  if (!res.ok) return null;
  const data = await res.json();
  return data.email ?? null;
}

/** Lista eventos do calendário. Use `syncToken` para sync incremental ou `timeMin` para a primeira carga. */
export async function listEvents(
  accessToken: string,
  calendarId: string,
  opts: { syncToken?: string; timeMin?: string; pageToken?: string } = {}
): Promise<ListEventsResult> {
  const params = new URLSearchParams({ singleEvents: 'true', showDeleted: 'true' });
  if (opts.syncToken) params.set('syncToken', opts.syncToken);
  if (opts.timeMin) params.set('timeMin', opts.timeMin);
  if (opts.pageToken) params.set('pageToken', opts.pageToken);

  const res = await googleFetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
    accessToken
  );

  if (res.status === 410) {
    // syncToken expirado — sinaliza para o chamador fazer full resync
    const err = new Error('SYNC_TOKEN_EXPIRED');
    err.name = 'SyncTokenExpiredError';
    throw err;
  }

  if (!res.ok) {
    throw new Error(`Falha ao listar eventos: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return {
    events: data.items ?? [],
    nextPageToken: data.nextPageToken,
    nextSyncToken: data.nextSyncToken,
  };
}

export async function insertEvent(
  accessToken: string,
  calendarId: string,
  event: Record<string, unknown>
): Promise<GoogleCalendarEvent> {
  const res = await googleFetch(`${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`, accessToken, {
    method: 'POST',
    body: JSON.stringify(event),
  });
  if (!res.ok) {
    throw new Error(`Falha ao criar evento no Google Agenda: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function updateEvent(
  accessToken: string,
  calendarId: string,
  googleEventId: string,
  event: Record<string, unknown>
): Promise<GoogleCalendarEvent> {
  const res = await googleFetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`,
    accessToken,
    { method: 'PATCH', body: JSON.stringify(event) }
  );
  if (!res.ok) {
    throw new Error(`Falha ao atualizar evento no Google Agenda: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function deleteEvent(accessToken: string, calendarId: string, googleEventId: string): Promise<void> {
  const res = await googleFetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`,
    accessToken,
    { method: 'DELETE' }
  );
  // 410 Gone = já tinha sido removido no Google — tratamos como sucesso
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    throw new Error(`Falha ao remover evento no Google Agenda: ${res.status} ${await res.text()}`);
  }
}

/** Converte um evento interno do portal para o formato esperado pela API do Google Calendar. */
export function toGoogleEvent(event: InternalEventRecord): Record<string, unknown> {
  const isAllDay = !event.start_time;

  const start = isAllDay
    ? { date: event.event_date }
    : { dateTime: `${event.event_date}T${event.start_time}`, timeZone: TIME_ZONE };

  const end = isAllDay
    ? { date: event.event_date }
    : {
        dateTime: `${event.event_date}T${event.end_time ?? event.start_time}`,
        timeZone: TIME_ZONE,
      };

  return {
    summary: event.title,
    description: event.description ?? undefined,
    location: event.location ?? undefined,
    start,
    end,
  };
}

/** Converte um evento do Google Calendar para os campos equivalentes de `internal_events`. */
export function fromGoogleEvent(event: GoogleCalendarEvent): {
  title: string;
  description: string | null;
  location: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
} | null {
  const start = event.start;
  if (!start) return null;

  const isAllDay = Boolean(start.date) && !start.dateTime;

  const event_date = isAllDay ? start.date! : (start.dateTime ?? '').slice(0, 10);
  const start_time = isAllDay ? null : (start.dateTime ?? '').slice(11, 16);
  const end_time = isAllDay ? null : (event.end?.dateTime ?? '').slice(11, 16) || null;

  return {
    title: event.summary ?? '(Sem título)',
    description: event.description ?? null,
    location: event.location ?? null,
    event_date,
    start_time,
    end_time,
  };
}
