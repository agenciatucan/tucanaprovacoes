import { Metadata } from 'next';
import Link from 'next/link';
import type { Route } from 'next';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { Icon } from '@/components/ui/Icon';
import { StatusBadge } from '@/components/ui/StatusBadge';

export const metadata: Metadata = { title: 'Calendário' };

const STATUS_KIND: Record<string, string> = {
  rascunho: 'rascunho', enviado_para_aprovacao: 'aguardando', em_revisao: 'revisao',
  aprovado: 'aprovado', em_producao: 'agendado', finalizado: 'publicado', arquivado: 'rascunho',
};

// Left border color per status kind
const STATUS_BORDER: Record<string, string> = {
  rascunho:   'var(--st-rascunho-fg)',
  aguardando: 'var(--st-aguardando-fg)',
  revisao:    'var(--st-revisao-fg)',
  aprovado:   'var(--st-aprovado-fg)',
  agendado:   'var(--st-agendado-fg)',
  publicado:  'var(--st-publicado-fg)',
};

const WEEKDAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const { year: yearStr, month: monthStr } = await searchParams;
  const today = new Date();

  const year  = yearStr  ? parseInt(yearStr)      : today.getFullYear();
  const month = monthStr ? parseInt(monthStr) - 1 : today.getMonth(); // 0-indexed

  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth  = new Date(year, month + 1, 0);

  const firstStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastStr  = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastOfMonth.getDate()).padStart(2, '0')}`;

  // Prev / next month href
  const prevDate = new Date(year, month - 1, 1);
  const nextDate = new Date(year, month + 1, 1);
  const prevHref = `/admin/calendario?year=${prevDate.getFullYear()}&month=${prevDate.getMonth() + 1}`;
  const nextHref = `/admin/calendario?year=${nextDate.getFullYear()}&month=${nextDate.getMonth() + 1}`;

  const supabase = await getSupabaseServerClient();

  // Campaigns starting in this month
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, name, status, start_date, end_date, clients(name, company_name), content_items(id, general_status)')
    .gte('start_date', firstStr)
    .lte('start_date', lastStr)
    .order('start_date', { ascending: true });

  // Active campaigns that started before this month but have no end_date yet (span into it)
  const { data: ongoingCampaigns } = await supabase
    .from('campaigns')
    .select('id, name, status, start_date, end_date, clients(name, company_name), content_items(id, general_status)')
    .lt('start_date', firstStr)
    .is('end_date', null)
    .not('status', 'in', '("arquivado","finalizado")')
    .order('start_date', { ascending: true });

  const allCampaigns = [...(campaigns ?? []), ...(ongoingCampaigns ?? [])];

  // Group by start day (for spanning → show on day 1)
  const byDay: Record<number, typeof allCampaigns> = {};
  allCampaigns.forEach((c) => {
    const d = new Date(c.start_date + 'T00:00:00');
    const day = (d.getMonth() === month && d.getFullYear() === year) ? d.getDate() : 1;
    if (!byDay[day]) byDay[day] = [];
    byDay[day]!.push(c);
  });

  // Build the grid cells (always 5 weeks = 35 cells)
  const cells: { day: number; muted: boolean; isoDate: string }[] = [];

  // Pre-fill days from previous month
  const firstDayOfWeek = firstOfMonth.getDay(); // 0=Sun
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthLastDay - i;
    const pm = month === 0 ? 12 : month;
    const py = month === 0 ? year - 1 : year;
    cells.push({ day: d, muted: true, isoDate: `${py}-${String(pm).padStart(2,'0')}-${String(d).padStart(2,'0')}` });
  }

  // Current month days
  for (let d = 1; d <= lastOfMonth.getDate(); d++) {
    cells.push({ day: d, muted: false, isoDate: `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}` });
  }

  // Next month days to fill 35 cells
  let nxt = 1;
  const nm = month + 2 > 12 ? 1 : month + 2;
  const ny = month + 2 > 12 ? year + 1 : year;
  while (cells.length < 35) {
    cells.push({ day: nxt, muted: true, isoDate: `${ny}-${String(nm).padStart(2,'0')}-${String(nxt).padStart(2,'0')}` });
    nxt++;
  }

  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const monthLabel = firstOfMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const monthTitle = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  const pendingCount = allCampaigns.filter((c) =>
    c.status === 'enviado_para_aprovacao' || c.status === 'em_revisao'
  ).length;

  return (
    <div className="page" style={{ maxWidth: 1360 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 22 }}>
        <div>
          <div className="eyebrow">Tucan · Interno</div>
          <h1 className="h1" style={{ marginTop: 6 }}>Calendário editorial</h1>
          <p className="muted" style={{ marginTop: 6, fontSize: 14 }}>
            {allCampaigns.length} cronograma{allCampaigns.length !== 1 ? 's' : ''} em {monthTitle.split(' ')[0]}
            {pendingCount > 0 && (
              <> · <strong style={{ color: 'var(--orange)' }}>{pendingCount} aguardando aprovação</strong></>
            )}
          </p>
        </div>
        <Link href="/admin/cronogramas/novo" className="btn btn-primary">
          <Icon name="plus" size={16} /> Novo cronograma
        </Link>
      </div>

      {/* Toolbar */}
      <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
        {/* Month navigator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link
            href={prevHref as Route}
            style={{ width: 34, height: 34, border: '1px solid var(--line)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink)', textDecoration: 'none' }}>
            <Icon name="arrow-left" size={14} />
          </Link>
          <div style={{ minWidth: 190, textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em' }}>{monthTitle}</div>
          </div>
          <Link
            href={nextHref as Route}
            style={{ width: 34, height: 34, border: '1px solid var(--line)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink)', textDecoration: 'none' }}>
            <Icon name="arrow" size={14} />
          </Link>
        </div>

        <div style={{ width: 1, height: 24, background: 'var(--line)' }} />

        <Link href="/admin/calendario" className="btn btn-ghost btn-sm">Hoje</Link>

        <div style={{ flex: 1 }} />

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12 }}>
          <StatusBadge kind="rascunho" />
          <StatusBadge kind="aguardando" />
          <StatusBadge kind="revisao" />
          <StatusBadge kind="aprovado" />
          <StatusBadge kind="publicado" />
        </div>
      </div>

      {/* Calendar grid */}
      <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
        {/* Weekday header row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--bg)', borderBottom: '1px solid var(--line)' }}>
          {WEEKDAYS.map((d) => (
            <div key={d} style={{ padding: '10px 12px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--muted)' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: '140px' }}>
          {cells.map((cell, i) => {
            const isToday = !cell.muted && cell.isoDate === todayIso;
            const dayItems = !cell.muted ? (byDay[cell.day] ?? []) : [];
            const isLastRow = i >= 28;
            const isLastCol = (i + 1) % 7 === 0;

            return (
              <div
                key={i}
                style={{
                  borderRight:  isLastCol ? 'none' : '1px solid var(--line-soft)',
                  borderBottom: isLastRow ? 'none' : '1px solid var(--line-soft)',
                  padding: 8,
                  background: cell.muted ? '#fafafa' : '#fff',
                  display: 'flex', flexDirection: 'column', gap: 4,
                  overflow: 'hidden',
                }}>
                {/* Day number */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700,
                    background: isToday ? 'var(--orange)' : 'transparent',
                    color: isToday ? '#fff' : (cell.muted ? 'var(--muted-2)' : 'var(--ink)'),
                  }}>
                    {cell.day}
                  </div>
                  {dayItems.length > 2 && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)' }}>
                      {dayItems.length} camp.
                    </span>
                  )}
                </div>

                {/* Campaign pills (max 2 visible) */}
                {dayItems.slice(0, 2).map((c, j) => {
                  const kind = STATUS_KIND[c.status] ?? 'rascunho';
                  const borderColor = STATUS_BORDER[kind] ?? 'var(--muted-2)';
                  const clientInfo = Array.isArray(c.clients) ? c.clients[0] : c.clients;
                  const items = Array.isArray(c.content_items) ? c.content_items : [];
                  const pending = items.filter((it: { general_status: string }) => it.general_status === 'pendente').length;
                  const total = items.length;
                  const clientLabel = (clientInfo?.company_name ?? clientInfo?.name ?? '').split(' ')[0];

                  return (
                    <Link
                      key={j}
                      href={`/admin/cronogramas/${c.id}` as Route}
                      style={{
                        background: `var(--st-${kind}-bg)`,
                        color: `var(--st-${kind}-fg)`,
                        borderLeft: `3px solid ${borderColor}`,
                        borderRadius: 6,
                        padding: '5px 7px',
                        fontSize: 11, fontWeight: 600, lineHeight: 1.25,
                        overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                        textDecoration: 'none', display: 'block',
                        transition: 'opacity .1s',
                      }}>
                      <div style={{ fontSize: 9, fontWeight: 700, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {clientLabel}{total > 0 ? ` · ${pending}/${total}` : ''}
                      </div>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                    </Link>
                  );
                })}

                {/* Overflow indicator */}
                {dayItems.length > 2 && (
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', paddingLeft: 4 }}>
                    +{dayItems.length - 2} mais
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Empty state */}
      {allCampaigns.length === 0 && (
        <div className="card" style={{ marginTop: 24, padding: 56, textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--green-50)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Icon name="calendar" size={28} stroke={1.5} />
          </div>
          <p className="muted" style={{ marginBottom: 16 }}>
            Nenhum cronograma iniciando em {monthTitle.split(' ')[0]}.
          </p>
          <Link href="/admin/cronogramas/novo" className="btn btn-primary">
            <Icon name="plus" size={16} /> Criar cronograma
          </Link>
        </div>
      )}
    </div>
  );
}
