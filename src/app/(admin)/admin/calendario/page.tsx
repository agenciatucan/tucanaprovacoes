import { Metadata } from 'next';
import Link from 'next/link';
import type { Route } from 'next';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { Icon } from '@/components/ui/Icon';
import { StatusBadge } from '@/components/ui/StatusBadge';
import CalendarClientFilter from '@/components/admin/CalendarClientFilter';
import InternalEventsPanel from '@/components/admin/InternalEventsPanel';

export const metadata: Metadata = { title: 'Calendário' };

type StatusKind = Parameters<typeof StatusBadge>[0]['kind'];

const STATUS_KIND: Record<string, StatusKind> = {
  rascunho: 'rascunho',
  enviado_para_aprovacao: 'aguardando',
  em_revisao: 'revisao',
  aprovado: 'aprovado',
  em_producao: 'agendado',
  finalizado: 'publicado',
  arquivado: 'rascunho',
};

const STATUS_LABEL: Record<string, string> = {
  rascunho: 'Rascunho',
  enviado_para_aprovacao: 'Aguardando aprovação',
  em_revisao: 'Em revisão',
  aprovado: 'Aprovado',
  em_producao: 'Em produção',
  finalizado: 'Finalizado',
  arquivado: 'Arquivado',
};

const STATUS_BORDER: Record<string, string> = {
  rascunho: 'var(--st-rascunho-fg)',
  aguardando: 'var(--st-aguardando-fg)',
  revisao: 'var(--st-revisao-fg)',
  aprovado: 'var(--st-aprovado-fg)',
  agendado: 'var(--st-agendado-fg)',
  publicado: 'var(--st-publicado-fg)',
};

const WEEKDAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

type CalendarCampaign = {
  id: string;
  name: string;
  status: string;
  start_date: string;
  end_date: string | null;
  client_id: string;
  clients:
    | {
        name: string | null;
        company_name: string | null;
      }
    | {
        name: string | null;
        company_name: string | null;
      }[]
    | null;
  content_items:
    | {
        id: string;
        general_status: string;
      }[]
    | null;
};

type ScheduledPost = {
  id: string;
  title: string;
  format: string;
  general_status: string;
  scheduled_date: string;
  client_id: string;
  campaign_id: string;
  client_name: string;
};

type InternalEvent = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  google_event_id: string | null;
};

const POST_FORMAT_SHORT: Record<string, string> = {
  reels:        'Reels',
  carrossel:    'Carrossel',
  post_estatico:'Post',
  story:        'Story',
  outro:        'Outro',
};

function getClientName(client: CalendarCampaign['clients']) {
  const clientData = Array.isArray(client) ? client[0] : client;

  return clientData?.company_name ?? clientData?.name ?? 'Cliente';
}

function formatDateLabel(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
}

function formatFullDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
}

function formatMonthHref(date: Date) {
  return `/admin/calendario?year=${date.getFullYear()}&month=${
    date.getMonth() + 1
  }` as Route;
}

function getProgress(items: CalendarCampaign['content_items']) {
  const list = Array.isArray(items) ? items : [];
  const total = list.length;
  const pending = list.filter((item) => item.general_status === 'pendente').length;
  const approved = list.filter((item) =>
    ['aprovado', 'finalizado'].includes(item.general_status)
  ).length;

  return {
    total,
    pending,
    approved,
  };
}

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; cliente?: string }>;
}) {
  const { year: yearStr, month: monthStr, cliente: clientFilter } = await searchParams;

  // Vercel roda em UTC — calcula "hoje" no horário de Brasília para evitar
  // que a virada do dia em UTC (21h em BRT) adiante o calendário em 1 dia.
  const now = new Date();
  const brLocale = (opts: Intl.DateTimeFormatOptions) =>
    now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', ...opts });
  const todayYear  = parseInt(brLocale({ year: 'numeric' }), 10);
  const todayMonth = parseInt(brLocale({ month: 'numeric' }), 10); // 1-indexado
  const todayDay   = parseInt(brLocale({ day: 'numeric' }), 10);

  const year = yearStr ? parseInt(yearStr) : todayYear;
  const month = monthStr ? parseInt(monthStr) - 1 : todayMonth - 1;

  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);

  const firstStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(
    lastOfMonth.getDate()
  ).padStart(2, '0')}`;

  const prevDate = new Date(year, month - 1, 1);
  const nextDate = new Date(year, month + 1, 1);

  const prevHref = formatMonthHref(prevDate);
  const nextHref = formatMonthHref(nextDate);

  const supabase = await getSupabaseServerClient();

  const [
    { data: campaigns },
    { data: ongoingCampaigns },
    { data: scheduledPostsRaw },
    { data: clientsForFilter },
    { data: internalEventsRaw },
    { data: googleConnectionRow },
  ] = await Promise.all([
    supabase
      .from('campaigns')
      .select('id, name, status, start_date, end_date, client_id, clients(name, company_name), content_items(id, general_status)')
      .gte('start_date', firstStr)
      .lte('start_date', lastStr)
      .neq('status', 'arquivado')
      .order('start_date', { ascending: true }),

    supabase
      .from('campaigns')
      .select('id, name, status, start_date, end_date, client_id, clients(name, company_name), content_items(id, general_status)')
      .lt('start_date', firstStr)
      .is('end_date', null)
      .neq('status', 'arquivado')
      .neq('status', 'finalizado')
      .order('start_date', { ascending: true }),

    supabase
      .from('content_items')
      .select('id, title, format, general_status, scheduled_date, client_id, campaign_id, clients(name, company_name)')
      .gte('scheduled_date', firstStr)
      .lte('scheduled_date', lastStr)
      .not('scheduled_date', 'is', null),

    supabase
      .from('clients')
      .select('id, name, company_name')
      .eq('status', 'ativo')
      .order('company_name', { ascending: true }),

    supabase
      .from('internal_events')
      .select('id, title, description, location, event_date, start_time, end_time, google_event_id')
      .gte('event_date', firstStr)
      .lte('event_date', lastStr)
      .order('event_date', { ascending: true })
      .order('start_time', { ascending: true }),

    supabase
      .from('google_calendar_connections')
      .select('id')
      .limit(1)
      .maybeSingle(),
  ]);

  const allCampaignsRaw = [
    ...((campaigns ?? []) as CalendarCampaign[]),
    ...((ongoingCampaigns ?? []) as CalendarCampaign[]),
  ];

  const allCampaigns = clientFilter
    ? allCampaignsRaw.filter((c) => c.client_id === clientFilter)
    : allCampaignsRaw;

  const scheduledPosts: ScheduledPost[] = (scheduledPostsRaw ?? [])
    .filter((p) => !clientFilter || p.client_id === clientFilter)
    .map((p) => {
      const c = Array.isArray(p.clients) ? p.clients[0] : p.clients;
      return {
        id: p.id,
        title: p.title,
        format: p.format,
        general_status: p.general_status,
        scheduled_date: p.scheduled_date as string,
        client_id: p.client_id,
        campaign_id: p.campaign_id,
        client_name: c?.company_name ?? c?.name ?? 'Cliente',
      };
    });

  const byDay: Record<number, CalendarCampaign[]> = {};

  allCampaigns.forEach((campaign) => {
    const startDate = new Date(`${campaign.start_date}T00:00:00`);

    const day =
      startDate.getMonth() === month && startDate.getFullYear() === year
        ? startDate.getDate()
        : 1;

    if (!byDay[day]) {
      byDay[day] = [];
    }

    byDay[day].push(campaign);
  });

  const byDayPosts: Record<number, ScheduledPost[]> = {};
  scheduledPosts.forEach((post) => {
    const d = new Date(`${post.scheduled_date}T00:00:00`).getDate();
    if (!byDayPosts[d]) byDayPosts[d] = [];
    byDayPosts[d].push(post);
  });

  const internalEvents: InternalEvent[] = (internalEventsRaw ?? []) as InternalEvent[];

  const byDayEvents: Record<number, InternalEvent[]> = {};
  internalEvents.forEach((event) => {
    const d = new Date(`${event.event_date}T00:00:00`).getDate();
    if (!byDayEvents[d]) byDayEvents[d] = [];
    byDayEvents[d].push(event);
  });

  const cells: { day: number; muted: boolean; isoDate: string }[] = [];

  const firstDayOfWeek = firstOfMonth.getDay();
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i;
    const prevMonthNumber = month === 0 ? 12 : month;
    const prevYear = month === 0 ? year - 1 : year;

    cells.push({
      day,
      muted: true,
      isoDate: `${prevYear}-${String(prevMonthNumber).padStart(
        2,
        '0'
      )}-${String(day).padStart(2, '0')}`,
    });
  }

  for (let day = 1; day <= lastOfMonth.getDate(); day++) {
    cells.push({
      day,
      muted: false,
      isoDate: `${year}-${String(month + 1).padStart(2, '0')}-${String(
        day
      ).padStart(2, '0')}`,
    });
  }

  let nextMonthDay = 1;
  const nextMonthNumber = month + 2 > 12 ? 1 : month + 2;
  const nextMonthYear = month + 2 > 12 ? year + 1 : year;

  while (cells.length % 7 !== 0) {
    cells.push({
      day: nextMonthDay,
      muted: true,
      isoDate: `${nextMonthYear}-${String(nextMonthNumber).padStart(
        2,
        '0'
      )}-${String(nextMonthDay).padStart(2, '0')}`,
    });

    nextMonthDay++;
  }

  const todayIso = `${todayYear}-${String(todayMonth).padStart(2, '0')}-${String(todayDay).padStart(2, '0')}`;

  const monthLabel = firstOfMonth.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  const monthTitle = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  const pendingCount = allCampaigns.filter(
    (campaign) =>
      campaign.status === 'enviado_para_aprovacao' ||
      campaign.status === 'em_revisao'
  ).length;

  const activeCount = allCampaigns.filter(
    (campaign) =>
      campaign.status !== 'finalizado' && campaign.status !== 'arquivado'
  ).length;

  const finishedCount = allCampaigns.filter(
    (campaign) => campaign.status === 'finalizado'
  ).length;

  const agendaItems = allCampaigns
    .map((campaign) => {
      const startDate = new Date(`${campaign.start_date}T00:00:00`);

      return {
        campaign,
        day:
          startDate.getMonth() === month && startDate.getFullYear() === year
            ? startDate.getDate()
            : 1,
        date:
          startDate.getMonth() === month && startDate.getFullYear() === year
            ? campaign.start_date
            : firstStr,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="page calendar-page" style={{ maxWidth: 1360 }}>
      <style>
        {`
          .calendar-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            gap: 18px;
            margin-bottom: 22px;
          }

          .calendar-summary-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 12px;
            margin-bottom: 16px;
          }

          .calendar-summary-card {
            background: #fff;
            border: 1px solid var(--line);
            border-radius: 18px;
            padding: 16px;
          }

          .calendar-summary-card strong {
            display: block;
            margin-top: 5px;
            font-size: 30px;
            line-height: 1;
            letter-spacing: -0.04em;
          }

          .calendar-toolbar {
            background: #fff;
            border: 1px solid var(--line);
            border-radius: 18px;
            padding: 12px;
            display: flex;
            align-items: center;
            gap: 14px;
            margin-bottom: 16px;
            flex-wrap: wrap;
          }

          .calendar-month-nav {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .calendar-nav-button {
            width: 38px;
            height: 38px;
            border: 1px solid var(--line);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--ink);
            text-decoration: none;
            background: #fff;
          }

          .calendar-month-title {
            min-width: 210px;
            text-align: center;
            font-weight: 800;
            font-size: 15px;
            letter-spacing: -0.01em;
          }

          .calendar-legend {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
            margin-left: auto;
          }

          .calendar-desktop {
            background: #fff;
            border: 1px solid var(--line);
            border-radius: var(--r-lg);
            overflow: hidden;
          }

          .calendar-weekdays {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            background: var(--bg);
            border-bottom: 1px solid var(--line);
          }

          .calendar-weekday {
            padding: 10px 12px;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.1em;
            color: var(--muted);
          }

          .calendar-grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            grid-auto-rows: 140px;
          }

          .calendar-cell {
            padding: 8px;
            display: flex;
            flex-direction: column;
            gap: 4px;
            overflow: hidden;
          }

          .calendar-day-number {
            width: 26px;
            height: 26px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 13px;
            font-weight: 800;
          }

          .calendar-pill {
            border-radius: 8px;
            padding: 6px 7px;
            font-size: 11px;
            font-weight: 700;
            line-height: 1.25;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
            text-decoration: none;
            display: block;
          }

          .calendar-pill-client {
            font-size: 9px;
            font-weight: 800;
            opacity: 0.72;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .calendar-post-pill {
            border-radius: 6px;
            padding: 4px 6px;
            font-size: 10px;
            font-weight: 600;
            line-height: 1.3;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
            text-decoration: none;
            display: flex;
            align-items: center;
            gap: 4px;
            background: #eff6ff;
            border-left: 3px solid #3b82f6;
            color: #1e40af;
          }

          .calendar-event-pill {
            border-radius: 6px;
            padding: 4px 6px;
            font-size: 10px;
            font-weight: 600;
            line-height: 1.3;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
            text-decoration: none;
            display: flex;
            align-items: center;
            gap: 4px;
            background: #f5f3ff;
            border-left: 3px solid #7c3aed;
            color: #5b21b6;
          }

          .calendar-filter-bar {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-left: auto;
          }

          .calendar-filter-select {
            height: 36px;
            padding: 0 10px;
            border: 1px solid var(--line);
            border-radius: 10px;
            font-size: 13px;
            background: #fff;
            color: var(--ink);
            min-width: 160px;
          }

          /* ── mobile agenda (list cards) ── */
          .calendar-mobile-agenda { display: none; }

          .calendar-agenda-list { display: flex; flex-direction: column; gap: 10px; }

          .calendar-agenda-card {
            display: grid; grid-template-columns: auto minmax(0, 1fr) auto;
            gap: 12px; align-items: center;
            background: #fff; border: 1px solid var(--line); border-radius: 20px;
            padding: 15px; color: inherit; text-decoration: none;
          }

          .calendar-agenda-date {
            width: 48px; height: 48px; border-radius: 16px;
            background: var(--green-50); color: var(--green);
            display: flex; align-items: center; justify-content: center;
            flex-direction: column; flex-shrink: 0;
          }
          .calendar-agenda-date strong { font-size: 18px; line-height: 1; }
          .calendar-agenda-date span { margin-top: 2px; font-size: 9px; font-weight: 900; text-transform: uppercase; }

          /* ── mobile compact calendar grid ── */
          .cal-mob { display: none; }
          .cal-mob-head {
            display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px;
            margin-bottom: 4px;
          }
          .cal-mob-wday {
            text-align: center; font-size: 10px; font-weight: 800;
            color: var(--muted); padding: 5px 0; letter-spacing: .06em;
          }
          .cal-mob-cells { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
          .cal-mob-cell {
            display: flex; flex-direction: column; align-items: center;
            padding: 5px 2px 6px; gap: 3px; border-radius: 10px;
          }
          .cal-mob-cell-muted { opacity: .3; }
          .cal-mob-cell-has { background: rgba(0,0,0,.025); }
          .cal-mob-num {
            width: 28px; height: 28px; border-radius: 8px;
            display: flex; align-items: center; justify-content: center;
            font-size: 13px; font-weight: 700; color: var(--ink);
          }
          .cal-mob-today { background: var(--orange) !important; color: #fff !important; border-radius: 8px; }
          .cal-mob-dots { display: flex; gap: 3px; justify-content: center; flex-wrap: wrap; }
          .cal-mob-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
          .cal-mob-dot-rascunho  { background: var(--st-rascunho-fg); }
          .cal-mob-dot-aguardando{ background: var(--st-aguardando-fg); }
          .cal-mob-dot-revisao   { background: var(--st-revisao-fg); }
          .cal-mob-dot-aprovado  { background: var(--st-aprovado-fg); }
          .cal-mob-dot-agendado  { background: var(--st-agendado-fg); }
          .cal-mob-dot-publicado { background: var(--st-publicado-fg); }
          .cal-mob-dot-post      { background: #3b82f6; }
          .cal-mob-dot-event     { background: #7c3aed; }
          .cal-mob-more          { font-size: 8px; font-weight: 900; color: var(--muted); line-height: 5px; }

          .cal-mob-list-head {
            font-size: 12px; font-weight: 800; color: var(--muted);
            text-transform: uppercase; letter-spacing: .08em;
            margin: 20px 0 10px;
          }

          .calendar-empty {
            margin-top: 24px; padding: clamp(34px, 8vw, 56px);
            text-align: center;
          }

          /* ── breakpoints ── */
          @media (max-width: 1100px) {
            .calendar-summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .calendar-toolbar { align-items: stretch; flex-direction: column; }
            .calendar-month-nav { justify-content: space-between; }
            .calendar-month-title { min-width: 0; flex: 1; }
            .calendar-legend { margin-left: 0; overflow-x: auto; flex-wrap: nowrap; padding-bottom: 2px; }
            .calendar-legend > span { flex-shrink: 0; }
          }

          @media (max-width: 760px) {
            .calendar-header { align-items: stretch; flex-direction: column; }
            .calendar-desktop { display: none; }
            .calendar-mobile-agenda { display: none; }
            .calendar-toolbar { display: none; }
            .cal-mob { display: block; }
          }

          @media (max-width: 520px) {
            .calendar-summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .calendar-agenda-card { grid-template-columns: auto minmax(0, 1fr); }
            .calendar-agenda-card > svg { display: none; }
          }

          @media (max-width: 380px) {
            .calendar-summary-grid { grid-template-columns: 1fr; }
          }
        `}
      </style>

      {/* Header */}
      <div className="calendar-header">
        <div>
          <div className="eyebrow">Tucan · Interno</div>

          <h1 className="h1" style={{ marginTop: 6 }}>
            Calendário editorial
          </h1>

          <p className="muted" style={{ marginTop: 6, fontSize: 14 }}>
            {allCampaigns.length} cronograma
            {allCampaigns.length !== 1 ? 's' : ''} · {scheduledPosts.length} post
            {scheduledPosts.length !== 1 ? 's' : ''} agendado
            {scheduledPosts.length !== 1 ? 's' : ''} em{' '}
            {monthTitle.split(' ')[0]}
            {pendingCount > 0 && (
              <>
                {' '}
                ·{' '}
                <strong style={{ color: 'var(--orange)' }}>
                  {pendingCount} aguardando aprovação
                </strong>
              </>
            )}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a href="#agenda-interna-novo" className="btn btn-ghost">
            <Icon name="calendar" size={16} />
            Evento interno
          </a>

          <Link href="/admin/cronogramas/novo" className="btn btn-primary">
            <Icon name="plus" size={16} />
            Novo cronograma
          </Link>
        </div>
      </div>

      {/* Summary */}
      <div className="calendar-summary-grid">
        <div className="calendar-summary-card">
          <span className="muted tiny">Neste mês</span>
          <strong>{allCampaigns.length}</strong>
        </div>

        <div className="calendar-summary-card">
          <span
            className="tiny"
            style={{ color: 'var(--green)', fontWeight: 800 }}
          >
            Ativos
          </span>
          <strong style={{ color: 'var(--green)' }}>{activeCount}</strong>
        </div>

        <div className="calendar-summary-card">
          <span
            className="tiny"
            style={{ color: 'var(--orange)', fontWeight: 800 }}
          >
            Aguardando
          </span>
          <strong style={{ color: 'var(--orange)' }}>{pendingCount}</strong>
        </div>

        <div className="calendar-summary-card">
          <span
            className="tiny"
            style={{ color: 'var(--muted)', fontWeight: 800 }}
          >
            Finalizados
          </span>
          <strong style={{ color: 'var(--muted)' }}>{finishedCount}</strong>
        </div>
      </div>

      {/* Toolbar */}
      <div className="calendar-toolbar">
        <div className="calendar-month-nav">
          <Link href={prevHref} className="calendar-nav-button">
            <Icon name="arrow-left" size={14} />
          </Link>

          <div className="calendar-month-title">{monthTitle}</div>

          <Link href={nextHref} className="calendar-nav-button">
            <Icon name="arrow" size={14} />
          </Link>
        </div>

        <Link href="/admin/calendario" className="btn btn-ghost btn-sm">
          Hoje
        </Link>

        <div className="calendar-filter-bar">
          <CalendarClientFilter
            clients={clientsForFilter ?? []}
            currentYear={yearStr}
            currentMonth={monthStr}
            currentClient={clientFilter}
          />
        </div>

        <div className="calendar-legend">
          <StatusBadge kind="rascunho" />
          <StatusBadge kind="aguardando" />
          <StatusBadge kind="revisao" />
          <StatusBadge kind="aprovado" />
          <StatusBadge kind="publicado" />
          <span className="status" style={{ background: '#eff6ff', color: '#1e40af' }}>Post agendado</span>
          <span className="status" style={{ background: '#f5f3ff', color: '#5b21b6' }}>Evento interno</span>
        </div>
      </div>

      {/* Desktop calendar */}
      <div className="calendar-desktop">
        <div className="calendar-weekdays">
          {WEEKDAYS.map((day) => (
            <div key={day} className="calendar-weekday">
              {day}
            </div>
          ))}
        </div>

        <div className="calendar-grid">
          {cells.map((cell, index) => {
            const isToday = !cell.muted && cell.isoDate === todayIso;
            const dayItems = !cell.muted ? byDay[cell.day] ?? [] : [];
            const dayPosts = !cell.muted ? byDayPosts[cell.day] ?? [] : [];
            const dayEvents = !cell.muted ? byDayEvents[cell.day] ?? [] : [];
            const totalItems = dayItems.length + dayPosts.length + dayEvents.length;
            const isLastRow = index >= cells.length - 7;
            const isLastCol = (index + 1) % 7 === 0;

            // Orçamento de até 2 pills visíveis por célula: posts têm prioridade
            // reservada (como antes), depois eventos internos, depois cronogramas.
            const postsToShow = dayPosts.slice(0, 2);
            const eventsBudget = Math.max(0, 2 - postsToShow.length);
            const eventsToShow = dayEvents.slice(0, eventsBudget);
            const itemsBudget = Math.max(0, eventsBudget - eventsToShow.length);
            const itemsToShow = dayItems.slice(0, itemsBudget);

            return (
              <div
                key={cell.isoDate}
                className="calendar-cell"
                style={{
                  borderRight: isLastCol
                    ? 'none'
                    : '1px solid var(--line-soft)',
                  borderBottom: isLastRow
                    ? 'none'
                    : '1px solid var(--line-soft)',
                  background: cell.muted ? '#fafafa' : '#fff',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 2,
                  }}
                >
                  <div
                    className="calendar-day-number"
                    style={{
                      background: isToday ? 'var(--orange)' : 'transparent',
                      color: isToday
                        ? '#fff'
                        : cell.muted
                          ? 'var(--muted-2)'
                          : 'var(--ink)',
                    }}
                  >
                    {cell.day}
                  </div>

                  {totalItems > 2 && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: 'var(--muted)',
                      }}
                    >
                      {totalItems} itens
                    </span>
                  )}
                </div>

                {itemsToShow.map((campaign) => {
                  const kind = STATUS_KIND[campaign.status] ?? 'rascunho';
                  const borderColor =
                    STATUS_BORDER[kind] ?? 'var(--muted-2)';

                  const { total, pending } = getProgress(
                    campaign.content_items
                  );

                  const clientLabel = getClientName(campaign.clients).split(
                    ' '
                  )[0];

                  return (
                    <Link
                      key={campaign.id}
                      href={`/admin/cronogramas/${campaign.id}` as Route}
                      className="calendar-pill"
                      style={{
                        background: `var(--st-${kind}-bg)`,
                        color: `var(--st-${kind}-fg)`,
                        borderLeft: `3px solid ${borderColor}`,
                      }}
                    >
                      <div className="calendar-pill-client">
                        {clientLabel}
                        {total > 0 ? ` · ${pending}/${total}` : ''}
                      </div>

                      <div
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {campaign.name}
                      </div>
                    </Link>
                  );
                })}

                {postsToShow.map((post) => (
                  <Link
                    key={post.id}
                    href={`/admin/posts/${post.id}` as Route}
                    className="calendar-post-pill"
                  >
                    <span style={{ flexShrink: 0, opacity: 0.7 }}>
                      {POST_FORMAT_SHORT[post.format] ?? post.format}
                    </span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {post.title}
                    </span>
                  </Link>
                ))}

                {eventsToShow.map((event) => (
                  <a
                    key={event.id}
                    href={`#agenda-interna-${event.id}`}
                    className="calendar-event-pill"
                    title={event.title}
                  >
                    <span style={{ flexShrink: 0, opacity: 0.7 }}>
                      {event.start_time ? event.start_time.slice(0, 5) : 'Interno'}
                    </span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {event.title}
                    </span>
                    {event.google_event_id && (
                      <span style={{ flexShrink: 0, opacity: 0.6, fontSize: 9 }} aria-hidden="true">🔗</span>
                    )}
                  </a>
                ))}

                {totalItems > 2 && (
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--muted)',
                      paddingLeft: 4,
                    }}
                  >
                    +{totalItems - 2} mais
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile: compact calendar grid + agenda list */}
      <div className="cal-mob">
        {/* Month grid */}
        <div className="card" style={{ padding: '14px 12px' }}>
          {/* Month navigation inside mobile card */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <Link href={prevHref} className="calendar-nav-button" style={{ width: 36, height: 36 }}>
              <Icon name="arrow-left" size={14} />
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.01em' }}>{monthTitle}</span>
              <Link href="/admin/calendario" className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '0 10px', minHeight: 28 }}>
                Hoje
              </Link>
            </div>
            <Link href={nextHref} className="calendar-nav-button" style={{ width: 36, height: 36 }}>
              <Icon name="arrow" size={14} />
            </Link>
          </div>
          {/* Weekday labels */}
          <div className="cal-mob-head">
            {['D','S','T','Q','Q','S','S'].map((d, i) => (
              <div key={i} className="cal-mob-wday">{d}</div>
            ))}
          </div>
          {/* Day cells */}
          <div className="cal-mob-cells">
            {cells.map((cell) => {
              const isToday = !cell.muted && cell.isoDate === todayIso;
              const dayItems = !cell.muted ? (byDay[cell.day] ?? []) : [];
              const dayPostsM = !cell.muted ? (byDayPosts[cell.day] ?? []) : [];
              const dayEventsM = !cell.muted ? (byDayEvents[cell.day] ?? []) : [];

              const dotKinds = [
                ...dayItems.map((c) => STATUS_KIND[c.status] ?? 'rascunho'),
                ...dayPostsM.map(() => 'post'),
                ...dayEventsM.map(() => 'event'),
              ];

              return (
                <div
                  key={cell.isoDate}
                  className={[
                    'cal-mob-cell',
                    cell.muted ? 'cal-mob-cell-muted' : '',
                    !cell.muted && dotKinds.length > 0 ? 'cal-mob-cell-has' : '',
                  ].join(' ')}
                >
                  <span className={`cal-mob-num${isToday ? ' cal-mob-today' : ''}`}>
                    {cell.day}
                  </span>
                  {dotKinds.length > 0 && (
                    <div className="cal-mob-dots">
                      {dotKinds.slice(0, 3).map((k, i) => (
                        <span key={i} className={`cal-mob-dot cal-mob-dot-${k}`} />
                      ))}
                      {dotKinds.length > 3 && (
                        <span className="cal-mob-more">+{dotKinds.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {/* Dot legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--line-soft)' }}>
            {([
              ['rascunho',   'Rascunho'],
              ['aguardando', 'Aguardando'],
              ['revisao',    'Em revisão'],
              ['aprovado',   'Aprovado'],
              ['publicado',  'Publicado'],
              ['post',       'Post agendado'],
              ['event',      'Evento interno'],
            ] as [string, string][]).map(([k, l]) => (
              <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--muted)' }}>
                <span className={`cal-mob-dot cal-mob-dot-${k}`} />
                {l}
              </span>
            ))}
          </div>
        </div>

        {/* Campaign list */}
        {agendaItems.length > 0 && (
          <div className="cal-mob-list-head">
            {agendaItems.length} cronograma{agendaItems.length !== 1 ? 's' : ''} em {monthTitle.split(' ')[0]}
          </div>
        )}
        <div className="calendar-agenda-list">
          {agendaItems.length === 0 ? (
            <div className="card calendar-empty">
              <Icon name="calendar" size={28} color="var(--muted-2)" />
              <p className="muted" style={{ margin: '12px 0 0' }}>
                Nenhum cronograma em {monthTitle.split(' ')[0]}.
              </p>
            </div>
          ) : (
            agendaItems.map(({ campaign, date }) => {
              const kind = STATUS_KIND[campaign.status] ?? 'rascunho';
              const label = STATUS_LABEL[campaign.status];
              const { total, approved } = getProgress(campaign.content_items);
              const day = new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit' });
              const monthShort = new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR', { month: 'short' });
              return (
                <Link
                  key={campaign.id}
                  href={`/admin/cronogramas/${campaign.id}` as Route}
                  className="calendar-agenda-card"
                >
                  <div className="calendar-agenda-date">
                    <strong>{day}</strong>
                    <span>{monthShort.replace('.', '')}</span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)', lineHeight: 1.25, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                      {campaign.name}
                    </div>
                    <div className="muted tiny" style={{ marginTop: 4 }}>
                      {getClientName(campaign.clients)}
                      {total > 0 ? ` · ${approved}/${total} aprovados` : ' · Sem posts'}
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <StatusBadge kind={kind} label={label} />
                    </div>
                  </div>
                  <Icon name="chevron" size={15} color="var(--muted-2)" />
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* Agenda interna (eventos da agência, sincronizados com o Google Agenda) */}
      <section id="agenda-interna" style={{ marginTop: 24, scrollMarginTop: 90 }}>
        <InternalEventsPanel
          events={internalEvents}
          monthLabel={monthTitle}
          defaultDate={todayIso}
          googleConnected={!!googleConnectionRow}
        />
      </section>

      {/* Empty desktop state */}
      {allCampaigns.length === 0 && (
        <div className="card calendar-empty">
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              background: 'var(--green-50)',
              color: 'var(--green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <Icon name="calendar" size={28} stroke={1.5} />
          </div>

          <p className="muted" style={{ marginBottom: 16 }}>
            Nenhum cronograma iniciando em {monthTitle.split(' ')[0]}.
          </p>

          <Link href="/admin/cronogramas/novo" className="btn btn-primary">
            <Icon name="plus" size={16} />
            Criar cronograma
          </Link>
        </div>
      )}
    </div>
  );
}