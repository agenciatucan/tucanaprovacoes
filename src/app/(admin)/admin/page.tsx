import { Metadata } from 'next';
import Link from 'next/link';
import type { Route } from 'next';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { Icon } from '@/components/ui/Icon';

export const metadata: Metadata = { title: 'Visão geral' };

// ── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return (parts[0] ?? '').slice(0, 2).toUpperCase();
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
}

const AVATAR_COLORS = [
  '#5b9e3f', '#3a74d0', '#df6a2d', '#7c3aed', '#0891b2', '#d97706', '#dc2626',
];
function clientColor(id: string | null | undefined): string {
  const fallback = AVATAR_COLORS[0] ?? '#5b9e3f';
  if (!id) return fallback;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h * 31) + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length] ?? fallback;
}

function getClientName(client: { name?: string | null; company_name?: string | null } | null | undefined) {
  return client?.company_name ?? client?.name ?? 'Cliente';
}

const HEAT_COLORS = ['#efece2', '#dfe6cf', '#bcd09a', '#8fb462', '#5b9e3f', '#34431f'];
const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

// ── SVG Primitives (server-renderable) ───────────────────────────────────────

function Sparkline({ points, color, gradId, w = 56, h = 22 }: {
  points: number[]; color: string; gradId: string; w?: number; h?: number;
}) {
  const max = Math.max(...points), min = Math.min(...points), span = (max - min) || 1;
  const pts: [number, number][] = points.map((p, i) => [
    (i / (points.length - 1)) * w,
    h - ((p - min) / span) * (h - 4) - 2,
  ]);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${d} L${w} ${h} L0 ${h} Z`;
  const last = pts[pts.length - 1] ?? [0, 0];
  const [lx, ly] = last;
  return (
    <svg width={w} height={h} style={{ display: 'block', overflow: 'visible', flexShrink: 0 }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".20" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="2.5" fill={color} />
    </svg>
  );
}

function DonutChart({ segments, size = 156, thickness = 22, centerValue, centerLabel }: {
  segments: { value: number; color: string }[];
  size?: number; thickness?: number;
  centerValue: string | number; centerLabel: string;
}) {
  const r = (size - thickness) / 2, cx = size / 2, C = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let off = 0;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="#efece4" strokeWidth={thickness} />
        {segments.map((s, i) => {
          const len = (s.value / total) * C;
          const seg = Math.max(len - 3, 0);
          const el = (
            <circle key={i} cx={cx} cy={cx} r={r} fill="none" stroke={s.color}
              strokeWidth={thickness} strokeDasharray={`${seg} ${C - seg}`}
              strokeDashoffset={-off} strokeLinecap="round"
              transform={`rotate(-90 ${cx} ${cx})`} />
          );
          off += len;
          return el;
        })}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: Math.round(size * 0.26), fontWeight: 800, lineHeight: 1, letterSpacing: '-0.04em', color: 'var(--ink)' }}>
            {centerValue}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{centerLabel}</div>
        </div>
      </div>
    </div>
  );
}

function HeatCalendar({ postsPerDay, year, month, cell = 34, gap = 6 }: {
  postsPerDay: Record<number, number>;
  year: number; month: number;
  cell?: number; gap?: number;
}) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayDay = (today.getFullYear() === year && today.getMonth() === month) ? today.getDate() : -1;

  type Cell = { d: number; n: number; today: boolean } | null;
  const cells: Cell[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ d, n: postsPerDay[d] ?? 0, today: d === todayDay });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: Cell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const shade = (n: number) => HEAT_COLORS[Math.min(n, HEAT_COLORS.length - 1)];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(7, ${cell}px)`, gap, marginBottom: gap }}>
        {WEEKDAYS.map((w, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--muted-2)' }}>{w}</div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} style={{ display: 'grid', gridTemplateColumns: `repeat(7, ${cell}px)`, gap, marginBottom: gap }}>
          {week.map((c, ci) => c ? (
            <div key={ci} title={`Dia ${c.d}: ${c.n} post(s)`} style={{
              width: cell, height: cell, borderRadius: 7, background: shade(c.n),
              display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 600,
              color: c.n >= 3 ? '#fff' : 'var(--ink-2)',
              boxShadow: c.today ? '0 0 0 2px #df6a2d' : 'none',
            }}>
              {c.d}
            </div>
          ) : (
            <div key={ci} style={{ width: cell, height: cell }} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminDashboard() {
  const supabase = await getSupabaseServerClient();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthStart = new Date(year, month, 1).toISOString();
  const monthLabel = new Date(year, month, 1).toLocaleDateString('pt-BR', { month: 'long' });

  // ── Queries ───────────────────────────────────────────────────────────────
  const [
    { count: activeClients },
    { count: pendingApprovalCount },
    { count: pendingPosts },
    { count: approvedPosts },
    { count: adjustPosts },
    { count: openComments },
    { data: pendingCampaigns },
    { data: monthPostsRaw },
    { data: openCommentsData },
    { data: upcomingPostsRaw },
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('status', 'ativo'),
    supabase.from('campaigns').select('*', { count: 'exact', head: true }).in('status', ['enviado_para_aprovacao', 'em_revisao']),
    supabase.from('content_items').select('*', { count: 'exact', head: true }).eq('general_status', 'pendente'),
    supabase.from('content_items').select('*', { count: 'exact', head: true }).in('general_status', ['aprovado', 'programado']),
    supabase.from('content_items').select('*', { count: 'exact', head: true }).eq('general_status', 'em_revisao'),
    supabase.from('comments_history').select('*', { count: 'exact', head: true }).eq('status', 'aberta'),
    supabase.from('campaigns').select('id, name, status, clients(id, name, company_name)').in('status', ['enviado_para_aprovacao', 'em_revisao']).order('updated_at', { ascending: false }).limit(6),
    supabase.from('content_items').select('updated_at').gte('updated_at', monthStart).limit(500),
    supabase.from('comments_history').select('id, message, created_at, clients(id, name, company_name)').eq('status', 'aberta').order('created_at', { ascending: false }).limit(4),
    supabase.from('content_items').select('id, title, format, general_status, clients(id, name, company_name)').in('general_status', ['pendente', 'em_producao']).order('updated_at', { ascending: false }).limit(4),
  ]);

  // Progress bars: post counts per pending campaign
  const campaignIds = (pendingCampaigns ?? []).map((c: any) => c.id as string);
  const { data: campaignPostsRaw } = campaignIds.length > 0
    ? await supabase.from('content_items').select('campaign_id, general_status').in('campaign_id', campaignIds)
    : { data: [] as { campaign_id: string; general_status: string }[] };

  const progressMap: Record<string, { total: number; done: number }> = {};
  for (const p of campaignPostsRaw ?? []) {
    const key = p.campaign_id;
    if (!progressMap[key]) progressMap[key] = { total: 0, done: 0 };
    const entry = progressMap[key];
    if (entry) {
      entry.total++;
      if (['aprovado', 'finalizado', 'programado'].includes(p.general_status)) entry.done++;
    }
  }

  // Heatmap: posts per day this month
  const postsPerDay: Record<number, number> = {};
  for (const p of monthPostsRaw ?? []) {
    if (p.updated_at) {
      const d = new Date(p.updated_at as string).getDate();
      postsPerDay[d] = (postsPerDay[d] ?? 0) + 1;
    }
  }
  const totalMonthPosts = monthPostsRaw?.length ?? 0;
  const fullDays        = Object.values(postsPerDay).filter(n => n >= 3).length;
  const todayKey        = now.getDate();
  const todayPosts      = postsPerDay[todayKey] ?? 0;

  // Funil de produção
  const funnelSegments = [
    { label: 'Em produção',          value: pendingPosts ?? 0,           color: '#9aa15f' },
    { label: 'Aguardando aprovação', value: pendingApprovalCount ?? 0,   color: '#df6a2d' },
    { label: 'Com ajuste',           value: adjustPosts ?? 0,            color: '#e6a52e' },
    { label: 'Aprovados',            value: approvedPosts ?? 0,          color: '#5b9e3f' },
  ];
  const totalFunnel = funnelSegments.reduce((s, f) => s + f.value, 0);

  // KPI cards
  const kpis = [
    { label: 'Clientes ativos',        value: activeClients ?? 0,          color: '#1f2515', soft: '#f0f0eb', icon: 'users',           href: '/admin/clientes' as Route,                              delta: null,              spark: [1, 2, 2, 2, 3, activeClients ?? 0] },
    { label: 'Aguardando aprovação',   value: pendingApprovalCount ?? 0,   color: '#df6a2d', soft: '#f8e4d6', icon: 'clock',           href: '/admin/cronogramas?status=enviado_para_aprovacao' as Route, delta: 'cronogramas',  spark: [1, 2, 2, 3, 4, pendingApprovalCount ?? 0] },
    { label: 'Posts pendentes',        value: pendingPosts ?? 0,           color: '#9aa15f', soft: '#ecedda', icon: 'flag',            href: '/admin/kanban' as Route,                                delta: 'para produzir',   spark: [9, 8, 8, 7, 7, pendingPosts ?? 0] },
    { label: 'Posts aprovados',        value: approvedPosts ?? 0,          color: '#5b9e3f', soft: '#e6efdd', icon: 'check',           href: '/admin/kanban' as Route,                                delta: 'este mês',        spark: [0, 1, 2, 3, 4, approvedPosts ?? 0] },
    { label: 'Com ajuste solicitado',  value: adjustPosts ?? 0,            color: '#e6a52e', soft: '#fbeed1', icon: 'edit',            href: '/admin/observacoes' as Route,                           delta: null,              spark: [0, 1, 2, 1, 1, adjustPosts ?? 0] },
    { label: 'Observações abertas',    value: openComments ?? 0,           color: '#3a74d0', soft: '#dfe9f8', icon: 'message-circle',  href: '/admin/observacoes' as Route,                           delta: openComments === 0 ? 'tudo limpo' : null, spark: [2, 1, 1, 0, 0, openComments ?? 0] },
  ];

  return (
    <div className="page" style={{ maxWidth: 1320 }}>
      <style>{`
        .dash-hero {
          position: relative; overflow: hidden; border-radius: 22px;
          padding: 26px 30px; margin-bottom: 22px;
          background: linear-gradient(120deg, #2c3a20 0%, #34431f 60%, #3d4d27 100%);
          display: flex; align-items: center; justify-content: space-between;
          gap: 24px; flex-wrap: wrap;
        }
        .dash-hero-bubble {
          position: absolute; right: -40px; top: -70px; width: 230px; height: 230px;
          border-radius: 50%; background: rgba(174,178,116,.22); pointer-events: none;
        }
        .dash-hero-title {
          font-size: 32px; font-weight: 800; color: #fff; margin-top: 6px;
          letter-spacing: -0.05em; line-height: 1.15;
        }
        .dash-hero-sub { font-size: 14.5px; color: rgba(255,255,255,.74); margin-top: 6px; max-width: 540px; }
        .dash-hero-actions { position: relative; display: flex; gap: 11px; flex-shrink: 0; }

        .dash-kpi-grid {
          display: grid; grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 12px; margin-bottom: 22px;
        }
        .dash-kpi-card {
          background: #fff; border: 1px solid var(--line); border-radius: 18px;
          padding: 16px 17px; display: flex; flex-direction: column; gap: 12px;
          text-decoration: none; color: inherit;
          transition: transform .15s, box-shadow .15s, border-color .15s;
        }
        .dash-kpi-card:hover {
          transform: translateY(-2px); box-shadow: 0 14px 32px rgba(0,0,0,.07);
          border-color: rgba(37,65,30,.22);
        }
        .dash-kpi-num { font-size: 34px; font-weight: 800; line-height: 1; letter-spacing: -0.05em; }
        .dash-kpi-lbl { font-size: 12.5px; font-weight: 600; color: var(--ink-2); margin-top: 6px; line-height: 1.25; }
        .dash-kpi-dlt { font-size: 11.5px; color: var(--muted); margin-top: 3px; }

        .dash-agenda { display: flex; gap: 34px; align-items: center; }
        .dash-agenda-side { flex: 1; display: flex; flex-direction: column; gap: 13px; min-width: 0; }
        .dash-agenda-stats { display: flex; gap: 11px; }
        .dash-stat-tile { flex: 1; background: #f4f1ea; border-radius: 12px; padding: 13px 15px; }
        .dash-stat-tile strong { display: block; font-size: 26px; font-weight: 800; line-height: 1; letter-spacing: -0.04em; margin-top: 2px; }
        .dash-upcoming { background: #f4f1ea; border-radius: 12px; padding: 14px; }
        .dash-heat-legend { display: flex; align-items: center; gap: 7px; font-size: 11.5px; color: var(--muted); }

        .dash-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
        .dash-card-title { font-size: 17px; font-weight: 800; color: var(--ink); }
        .dash-card-sub { font-size: 13px; color: var(--muted); margin-top: 3px; }
        .dash-card-action {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 13px; font-weight: 700; color: #c2541f;
          text-decoration: none; white-space: nowrap; flex-shrink: 0;
        }
        .dash-card-action:hover { color: #df6a2d; }

        .dash-main { display: grid; grid-template-columns: 1.5fr 1fr; gap: 22px; align-items: start; }

        .dash-crono-row {
          display: flex; align-items: center; gap: 13px; padding: 13px 0;
          border-top: 1px solid #efece4; text-decoration: none; color: inherit;
          transition: background .12s; border-radius: 4px;
        }
        .dash-crono-row:first-child { border-top: none; }
        .dash-crono-row:hover { background: #fafaf8; }

        .dash-legend-item { display: flex; align-items: center; gap: 9px; }

        @media (max-width: 1100px) { .dash-kpi-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 960px)  {
          .dash-main { grid-template-columns: 1fr; }
          .dash-agenda { flex-direction: column; align-items: stretch; gap: 18px; }
        }
        @media (max-width: 680px) {
          .dash-hero { flex-direction: column; align-items: flex-start; padding: 22px 20px; }
          .dash-hero-title { font-size: 24px; }
          .dash-kpi-grid { grid-template-columns: repeat(2, 1fr); }
          .dash-agenda-stats { flex-wrap: wrap; }
        }
      `}</style>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="dash-hero">
        <div className="dash-hero-bubble" />
        <div style={{ position: 'relative' }}>
          <div className="eyebrow" style={{ color: 'rgba(255,255,255,.6)' }}>Tucan · Interno</div>
          <h1 className="dash-hero-title">Bom dia, Admin 👋</h1>
          <p className="dash-hero-sub">
            Você tem{' '}
            <b style={{ color: '#fff' }}>{pendingApprovalCount ?? 0} cronograma{pendingApprovalCount !== 1 ? 's' : ''}</b>{' '}
            aguardando o cliente e{' '}
            <b style={{ color: '#fff' }}>{pendingPosts ?? 0} post{pendingPosts !== 1 ? 's' : ''}</b>{' '}
            em produção esta semana.
          </p>
        </div>
        <div className="dash-hero-actions">
          <Link href={'/admin/cronogramas/novo' as Route} className="btn btn-primary">
            <Icon name="plus" size={16} /> Novo cronograma
          </Link>
          <Link href={'/admin/clientes/novo' as Route} className="btn btn-ghost"
            style={{ background: 'rgba(255,255,255,.1)', color: '#fff', borderColor: 'rgba(255,255,255,.22)' }}>
            <Icon name="users" size={16} /> Novo cliente
          </Link>
        </div>
      </section>

      {/* ── KPI GRID ─────────────────────────────────────────────── */}
      <div className="dash-kpi-grid">
        {kpis.map((k, idx) => (
          <Link key={k.label} href={k.href} className="dash-kpi-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: k.soft, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <Icon name={k.icon} size={17} color={k.color} />
              </div>
              <Sparkline points={k.spark} color={k.color} gradId={`sp${idx}`} />
            </div>
            <div>
              <div className="dash-kpi-num" style={{ color: k.color }}>{k.value}</div>
              <div className="dash-kpi-lbl">{k.label}</div>
              {k.delta && <div className="dash-kpi-dlt">{k.delta}</div>}
            </div>
          </Link>
        ))}
      </div>

      {/* ── AGENDA DE POSTAGENS ──────────────────────────────────── */}
      <section className="card" style={{ padding: 24, marginBottom: 22 }}>
        <div className="dash-card-head">
          <div>
            <div className="dash-card-title">Agenda de postagens</div>
            <div className="dash-card-sub">
              {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)} · quanto mais escuro, mais posts no dia
            </div>
          </div>
          <Link href={'/admin/calendario' as Route} className="dash-card-action">
            Abrir calendário <Icon name="arrow" size={14} />
          </Link>
        </div>
        <div className="dash-agenda">
          <div style={{ flexShrink: 0 }}>
            <HeatCalendar postsPerDay={postsPerDay} year={year} month={month} cell={36} gap={7} />
          </div>
          <div className="dash-agenda-side">
            {/* Summary tiles */}
            <div className="dash-agenda-stats">
              {([
                [totalMonthPosts, 'posts no mês',   '#1f2515'],
                [fullDays,        'dias com 3+ posts', '#5b9e3f'],
                [todayPosts,      'hoje',             '#df6a2d'],
              ] as [number, string, string][]).map(([n, l, c], i) => (
                <div key={i} className="dash-stat-tile">
                  <strong style={{ color: c }}>{n}</strong>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{l}</div>
                </div>
              ))}
            </div>

            {/* Upcoming posts */}
            <div className="dash-upcoming">
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 10 }}>
                Posts em produção
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(upcomingPostsRaw ?? []).slice(0, 4).map((p: any) => {
                  const client = Array.isArray(p.clients) ? p.clients[0] : p.clients;
                  const color  = clientColor(client?.id);
                  return (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 3, background: color, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.title}
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                        {getClientName(client)}
                      </span>
                    </div>
                  );
                })}
                {(upcomingPostsRaw?.length ?? 0) === 0 && (
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>Nenhum post em produção.</div>
                )}
              </div>
            </div>

            {/* Heatmap legend */}
            <div className="dash-heat-legend">
              <span>menos</span>
              {HEAT_COLORS.map((c, i) => (
                <span key={i} style={{ width: 13, height: 13, borderRadius: 4, background: c, display: 'inline-block' }} />
              ))}
              <span>mais</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── MAIN GRID ────────────────────────────────────────────── */}
      <div className="dash-main">

        {/* Cronogramas em aprovação */}
        <div className="card" style={{ padding: 24 }}>
          <div className="dash-card-head">
            <div>
              <div className="dash-card-title">Cronogramas em aprovação</div>
              <div className="dash-card-sub">Acompanhe o que está esperando o cliente ou voltou com ajuste.</div>
            </div>
            <Link href={'/admin/cronogramas' as Route} className="dash-card-action">
              Ver todos <Icon name="arrow" size={14} />
            </Link>
          </div>
          {(pendingCampaigns ?? []).length === 0 ? (
            <div style={{ padding: '28px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
              Nenhum cronograma aguardando aprovação.
            </div>
          ) : (
            <div>
              {(pendingCampaigns ?? []).map((c: any) => {
                const client     = Array.isArray(c.clients) ? c.clients[0] : c.clients;
                const clientName = getClientName(client);
                const color      = clientColor(client?.id);
                const initials   = getInitials(clientName);
                const progress   = progressMap[c.id] ?? { total: 0, done: 0 };
                const pct        = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
                const isAdjust   = c.status === 'em_revisao';
                return (
                  <Link key={c.id} href={`/admin/cronogramas/${c.id}` as Route} className="dash-crono-row">
                    {/* Avatar */}
                    <div style={{ width: 40, height: 40, borderRadius: 11, background: color, display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                      {initials}
                    </div>
                    {/* Info + progress */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'nowrap' }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                          {c.name}
                        </span>
                        <span style={{ fontSize: 12.5, color: 'var(--muted)', flexShrink: 0 }}>· {clientName}</span>
                      </div>
                      {progress.total > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 7 }}>
                          <div style={{ flex: 1, height: 6, borderRadius: 999, background: '#efece4', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999 }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)', flexShrink: 0 }}>
                            {progress.done}/{progress.total}
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Status badge */}
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      fontSize: 12, fontWeight: 600, padding: '5px 11px', borderRadius: 999,
                      background: isAdjust ? '#fbeed1' : '#f8e4d6',
                      color: isAdjust ? '#a9741a' : '#c2541f',
                      whiteSpace: 'nowrap', flexShrink: 0,
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: isAdjust ? '#e6a52e' : '#df6a2d' }} />
                      {isAdjust ? 'Com ajuste' : 'Aguardando'}
                    </span>
                    <Icon name="chevron" size={15} color="var(--muted-2)" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Coluna direita */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

          {/* Funil de produção */}
          <div className="card" style={{ padding: 24 }}>
            <div className="dash-card-head">
              <div>
                <div className="dash-card-title">Funil de produção</div>
                <div className="dash-card-sub">Para onde vão os posts deste mês.</div>
              </div>
              <Link href={'/admin/cronogramas' as Route} className="dash-card-action">
                Cronogramas <Icon name="arrow" size={14} />
              </Link>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
              <DonutChart
                segments={funnelSegments.map(f => ({ value: f.value, color: f.color }))}
                centerValue={totalFunnel}
                centerLabel="posts"
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {funnelSegments.map((f, i) => (
                <div key={i} className="dash-legend-item">
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: f.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13.5, color: 'var(--ink-2)', flex: 1 }}>{f.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)' }}>{f.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Observações abertas */}
          <div className="card" style={{ padding: 24 }}>
            <div className="dash-card-head">
              <div>
                <div className="dash-card-title">Observações abertas</div>
                <div className="dash-card-sub">Feedbacks recentes dos clientes.</div>
              </div>
              <Link href={'/admin/observacoes' as Route} className="dash-card-action">
                Ver todas <Icon name="arrow" size={14} />
              </Link>
            </div>
            {(openCommentsData?.length ?? 0) === 0 ? (
              <div style={{ border: '1px dashed var(--line)', borderRadius: 14, padding: '26px 16px', textAlign: 'center' }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: '#e6efdd', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}>
                  <Icon name="check" size={22} color="#5b9e3f" />
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-2)' }}>Nenhuma observação em aberto.</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>Tudo aprovado por aqui. 🎉</div>
              </div>
            ) : (
              <div>
                {(openCommentsData ?? []).map((comment: any, i: number) => {
                  const client = Array.isArray(comment.clients) ? comment.clients[0] : comment.clients;
                  return (
                    <Link key={comment.id} href={'/admin/observacoes' as Route}
                      style={{ display: 'block', padding: '12px 0', borderTop: i ? '1px solid #efece4' : 'none', textDecoration: 'none', color: 'inherit' }}>
                      <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--ink-2)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                        {comment.message}
                      </div>
                      <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)' }}>
                        <span>{getClientName(client)}</span>
                        <span>{new Date(comment.created_at as string).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
