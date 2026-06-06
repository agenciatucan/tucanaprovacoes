import { Metadata } from 'next';
import Link from 'next/link';
import type { Route } from 'next';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { Icon } from '@/components/ui/Icon';
import ActivityCardActions from '@/components/admin/ActivityCardActions';
import {
  ACTIVITY_CATEGORY_LABEL,
  ACTIVITY_STATUS_LABEL,
} from '@/lib/validations/schemas';

export const metadata: Metadata = { title: 'Atividades' };

// ── Configs visuais ──────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  baixa:   { label: 'Baixa',   color: '#6b7280', bg: '#f3f4f6' },
  media:   { label: 'Média',   color: '#1d4ed8', bg: '#eff6ff' },
  alta:    { label: 'Alta',    color: '#ea580c', bg: '#fff7ed' },
  urgente: { label: 'Urgente', color: '#dc2626', bg: '#fef2f2' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  entrada:      { label: 'Entrada',       color: '#6b7280', bg: '#f3f4f6' },
  em_analise:   { label: 'Em análise',    color: '#7c3aed', bg: '#f5f3ff' },
  atribuido:    { label: 'Atribuído',     color: '#4338ca', bg: '#eef2ff' },
  em_producao:  { label: 'Em produção',   color: '#ea580c', bg: '#fff7ed' },
  em_aprovacao: { label: 'Em aprovação',  color: '#d97706', bg: '#fffbeb' },
  ajustes:      { label: 'Ajustes',       color: '#dc2626', bg: '#fef2f2' },
  concluido:    { label: 'Concluído',     color: '#166534', bg: '#f0fdf4' },
  arquivada:    { label: 'Arquivada',     color: '#9ca3af', bg: '#f9fafb' },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(value?: string | null) {
  if (!value) return null;
  return new Date(value + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function getDueLabel(
  due_date?: string | null,
  status?: string,
): { label: string; color: string; bg: string } | null {
  if (!due_date || status === 'concluido' || status === 'arquivada') return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(due_date + 'T00:00:00');
  const diff = Math.floor((due.getTime() - today.getTime()) / 86_400_000);
  if (diff < 0)  return { label: 'Atrasada',    color: '#dc2626', bg: '#fef2f2' };
  if (diff === 0) return { label: 'Vence hoje',  color: '#ea580c', bg: '#fff7ed' };
  if (diff === 1) return { label: 'Amanhã',      color: '#d97706', bg: '#fffbeb' };
  if (diff <= 7)  return { label: 'Esta semana', color: '#0891b2', bg: '#ecfeff' };
  return null;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

// ── Atalhos ──────────────────────────────────────────────────────────────────

type Atalho = 'todas' | 'minhas' | 'sem_responsavel' | 'atrasadas' | 'concluidas' | 'arquivadas';

const ATALHOS: { key: Atalho; label: string }[] = [
  { key: 'todas',           label: 'Todas' },
  { key: 'minhas',          label: 'Minhas' },
  { key: 'sem_responsavel', label: 'Sem responsável' },
  { key: 'atrasadas',       label: 'Atrasadas' },
  { key: 'concluidas',      label: 'Concluídas' },
  { key: 'arquivadas',      label: 'Arquivadas' },
];

function buildAtalhoHref(key: Atalho): Route {
  if (key === 'todas')           return '/admin/atividades' as Route;
  if (key === 'concluidas')      return '/admin/atividades?status=concluido' as Route;
  if (key === 'arquivadas')      return '/admin/atividades?arquivadas=1' as Route;
  return `/admin/atividades?atalho=${key}` as Route;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function AtividadesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    atalho?: string;
    status?: string;
    categoria?: string;
    prioridade?: string;
    cliente?: string;
    responsavel?: string;
    arquivadas?: string;
  }>;
}) {
  const {
    q: rawQ,
    atalho,
    status: filterStatus,
    categoria: filterCategoria,
    prioridade: filterPrioridade,
    cliente: filterCliente,
    responsavel: filterResponsavel,
    arquivadas,
  } = await searchParams;

  const searchQ = rawQ?.trim() ?? '';
  const showArchived      = arquivadas === '1' || atalho === 'arquivadas';
  const showSemResponsavel = atalho === 'sem_responsavel';
  const showAtrasadas     = atalho === 'atrasadas';
  const activeAtalho: Atalho =
    showArchived        ? 'arquivadas'       :
    atalho === 'minhas' ? 'minhas'           :
    showSemResponsavel  ? 'sem_responsavel'  :
    showAtrasadas       ? 'atrasadas'        :
    filterStatus === 'concluido' ? 'concluidas' :
    'todas';

  const supabase = await getSupabaseServerClient();

  // Current user profile (for "Minhas" shortcut)
  const { data: { user } } = await supabase.auth.getUser();
  const { data: currentProfile } = user
    ? await supabase.from('user_profiles').select('id').eq('auth_user_id', user.id).single()
    : { data: null };
  const currentProfileId = currentProfile?.id ?? null;

  // ── Build query ────────────────────────────────────────────────────────────
  let query = supabase
    .from('activities')
    .select(`
      id, title, description, category, priority, status, due_date, visibility, created_at,
      client:clients(id, name, company_name),
      responsible:user_profiles!responsible_id(id, name)
    `)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  // Archived vs active
  if (showArchived) {
    query = query.not('archived_at', 'is', null);
  } else {
    query = query.is('archived_at', null).neq('status', 'arquivada');
  }

  // Atalhos especiais
  if (atalho === 'minhas' && currentProfileId) {
    query = query.eq('responsible_id', currentProfileId);
  }
  if (showSemResponsavel) {
    query = query.is('responsible_id', null);
  }
  if (showAtrasadas) {
    query = query.lt('due_date', todayIso()).not('status', 'in', '(concluido,arquivada)');
  }

  // Regular filters
  if (filterStatus)      query = query.eq('status', filterStatus);
  if (filterCategoria)   query = query.eq('category', filterCategoria);
  if (filterPrioridade)  query = query.eq('priority', filterPrioridade);
  if (filterCliente)     query = query.eq('client_id', filterCliente);
  if (filterResponsavel) query = query.eq('responsible_id', filterResponsavel);

  // Search (title + description)
  if (searchQ) {
    query = query.or(`title.ilike.%${searchQ}%,description.ilike.%${searchQ}%`);
  }

  const { data: activities } = await query.limit(200);

  // ── Side data ──────────────────────────────────────────────────────────────
  const [{ data: clients }, { data: teamMembers }, { data: allStats }] = await Promise.all([
    supabase.from('clients').select('id, name, company_name').eq('status', 'ativo').order('name'),
    supabase.from('user_profiles').select('id, name').in('role', ['admin', 'equipe']).order('name'),
    supabase.from('activities').select('status').is('archived_at', null),
  ]);

  const list = activities ?? [];
  const stats = allStats ?? [];

  const counts = {
    total:        stats.length,
    entrada:      stats.filter(a => a.status === 'entrada').length,
    em_analise:   stats.filter(a => a.status === 'em_analise').length,
    atribuido:    stats.filter(a => a.status === 'atribuido').length,
    em_producao:  stats.filter(a => a.status === 'em_producao').length,
    em_aprovacao: stats.filter(a => a.status === 'em_aprovacao').length,
    ajustes:      stats.filter(a => a.status === 'ajustes').length,
    concluido:    stats.filter(a => a.status === 'concluido').length,
  };

  const hasActiveFilters = Boolean(
    searchQ || filterStatus || filterCategoria || filterPrioridade ||
    filterCliente || filterResponsavel || atalho || showArchived
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="page" style={{ maxWidth: 1200 }}>
      <style>{`
        /* ── Header ── */
        .act-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }

        /* ── Summary ── */
        .act-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-bottom: 16px; }
        .act-summary-card { background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 11px 13px; min-width: 0; cursor: pointer; text-decoration: none; display: block; transition: box-shadow .14s, border-color .14s; }
        .act-summary-card:hover { box-shadow: 0 4px 14px rgba(0,0,0,.07); border-color: rgba(0,0,0,.14); }
        .act-summary-card strong { display: block; margin-top: 3px; font-size: 20px; line-height: 1; letter-spacing: -0.03em; }

        /* ── Shortcuts ── */
        .act-atalhos { display: flex; gap: 6px; margin-bottom: 14px; overflow-x: auto; padding-bottom: 2px; flex-wrap: nowrap; }
        .act-atalhos::-webkit-scrollbar { display: none; }
        .act-atalho { font-size: 12.5px; font-weight: 600; padding: 6px 14px; border-radius: 999px; border: 1px solid var(--line); background: #fff; color: var(--ink-2); cursor: pointer; white-space: nowrap; text-decoration: none; transition: all .14s; flex-shrink: 0; }
        .act-atalho:hover { background: var(--bg); border-color: rgba(0,0,0,.14); }
        .act-atalho.active { background: var(--green); color: #fff; border-color: var(--green); }

        /* ── Filters ── */
        .act-filters { background: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 14px; display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-end; margin-bottom: 18px; }
        .act-filter-field { display: flex; flex-direction: column; gap: 4px; }
        .act-filter-label { font-size: 10px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; }
        .act-filter-input { height: 36px; border-radius: 9px; border: 1px solid var(--line); background: #fff; padding: 0 10px; font-family: inherit; font-size: 12.5px; color: var(--ink); outline: none; }
        .act-filter-input:focus { border-color: rgba(37,65,30,.35); box-shadow: 0 0 0 3px rgba(37,65,30,.07); }
        .act-filter-search { min-width: 200px; flex: 1; }

        /* ── List ── */
        .act-list { display: flex; flex-direction: column; gap: 10px; }

        /* ── Card ── */
        .act-card { background: #fff; border: 1px solid var(--line); border-radius: 18px; padding: 16px 18px; }
        .act-card-top { display: flex; align-items: center; gap: 6px; margin-bottom: 9px; flex-wrap: wrap; }
        .act-card-title { font-size: 15px; font-weight: 800; color: var(--ink); line-height: 1.35; margin-bottom: 4px; }
        .act-card-desc { font-size: 13px; color: var(--muted); line-height: 1.45; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
        .act-card-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 13px; flex-wrap: wrap; }
        .act-card-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .act-tag { font-size: 10px; font-weight: 800; padding: 3px 9px; border-radius: 999px; white-space: nowrap; }
        .act-due-tag { font-size: 10px; font-weight: 800; padding: 3px 9px; border-radius: 999px; white-space: nowrap; }
        .act-origin-tag { font-size: 9px; font-weight: 900; padding: 2px 8px; border-radius: 999px; letter-spacing: .05em; text-transform: uppercase; background: #fff3e8; color: #ea580c; white-space: nowrap; }

        /* ── Responsive ── */
        @media (max-width: 900px) {
          .act-summary { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 760px) {
          .act-header { flex-direction: column; align-items: stretch; }
          /* Filtros: flex-basis vira altura no modo coluna — anular com flex:none */
          .act-filters { flex-direction: column; gap: 8px; }
          .act-filter-field { flex: none !important; width: 100%; }
          .act-filter-input {
            width: 100%; height: 42px !important; font-size: 16px;
            -webkit-appearance: none; appearance: none;
          }
          .act-filter-search { min-width: 0; }
          .act-filter-actions { flex: none !important; width: 100%; display: flex; gap: 8px; flex-direction: column; margin-left: 0 !important; }
          .act-filter-actions .btn { width: 100%; justify-content: center; }
          .act-card-footer { flex-direction: column; align-items: flex-start; }
          .act-card-actions { width: 100%; }
          .act-card-actions > div { width: 100%; }
          .act-card-actions select { flex: 1; max-width: none !important; }
        }
        @media (max-width: 420px) {
          .act-summary { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* ── Header ── */}
      <div className="act-header">
        <div>
          <div className="eyebrow">Tucan · Interno</div>
          <h1 className="h1" style={{ marginTop: 6 }}>Atividades</h1>
          <p className="muted" style={{ marginTop: 6, fontSize: 14 }}>
            Tarefas internas da equipe, separadas dos cronogramas de cliente.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href={'/admin/kanban?tipo=atividade' as Route} className="btn btn-ghost" style={{ fontSize: 13 }}>
            <Icon name="grid" size={15} /> Pipeline
          </Link>
          <Link href={'/admin/atividades/nova' as Route} className="btn btn-primary">
            <Icon name="plus" size={15} /> Nova atividade
          </Link>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div className="act-summary">
        <Link href={'/admin/atividades' as Route} className="act-summary-card">
          <span className="muted tiny">Total ativas</span>
          <strong style={{ color: 'var(--ink)' }}>{counts.total}</strong>
        </Link>
        {(Object.entries(STATUS_CONFIG) as [string, { label: string; color: string; bg: string }][])
          .filter(([k]) => k !== 'arquivada')
          .map(([key, cfg]) => (
            <Link
              key={key}
              href={`/admin/atividades?status=${key}` as Route}
              className="act-summary-card"
            >
              <span className="tiny" style={{ color: cfg.color, fontWeight: 800 }}>{cfg.label}</span>
              <strong style={{ color: cfg.color }}>{counts[key as keyof typeof counts] ?? 0}</strong>
            </Link>
          ))}
      </div>

      {/* ── Quick shortcuts ── */}
      <div className="act-atalhos">
        {ATALHOS.map((a) => (
          <Link
            key={a.key}
            href={buildAtalhoHref(a.key)}
            className={`act-atalho${activeAtalho === a.key ? ' active' : ''}`}
          >
            {a.label}
          </Link>
        ))}
      </div>

      {/* ── Filters ── */}
      <form action="/admin/atividades" className="act-filters">
        {/* Preserve hidden state when archivadas is active via atalho */}
        {showArchived && atalho === 'arquivadas' && <input type="hidden" name="arquivadas" value="1" />}

        {/* Search */}
        <div className="act-filter-field" style={{ flex: '2 1 200px' }}>
          <label className="act-filter-label" htmlFor="af-q">Buscar</label>
          <input
            id="af-q"
            name="q"
            type="search"
            defaultValue={searchQ}
            placeholder="Buscar atividade..."
            className="act-filter-input act-filter-search"
          />
        </div>

        {/* Status */}
        <div className="act-filter-field" style={{ flex: '1 1 130px' }}>
          <label className="act-filter-label" htmlFor="af-status">Status</label>
          <select id="af-status" name="status" defaultValue={filterStatus ?? ''} className="act-filter-input">
            <option value="">Todos</option>
            {Object.entries(STATUS_CONFIG).filter(([k]) => k !== 'arquivada').map(([v, c]) => (
              <option key={v} value={v}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Prioridade */}
        <div className="act-filter-field" style={{ flex: '1 1 110px' }}>
          <label className="act-filter-label" htmlFor="af-pri">Prioridade</label>
          <select id="af-pri" name="prioridade" defaultValue={filterPrioridade ?? ''} className="act-filter-input">
            <option value="">Todas</option>
            {Object.entries(PRIORITY_CONFIG).map(([v, c]) => (
              <option key={v} value={v}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Categoria */}
        <div className="act-filter-field" style={{ flex: '1 1 130px' }}>
          <label className="act-filter-label" htmlFor="af-cat">Categoria</label>
          <select id="af-cat" name="categoria" defaultValue={filterCategoria ?? ''} className="act-filter-input">
            <option value="">Todas</option>
            {Object.entries(ACTIVITY_CATEGORY_LABEL).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        {/* Cliente */}
        <div className="act-filter-field" style={{ flex: '1 1 130px' }}>
          <label className="act-filter-label" htmlFor="af-cli">Cliente</label>
          <select id="af-cli" name="cliente" defaultValue={filterCliente ?? ''} className="act-filter-input">
            <option value="">Todos</option>
            {(clients ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.company_name ?? c.name}</option>
            ))}
          </select>
        </div>

        {/* Responsável */}
        <div className="act-filter-field" style={{ flex: '1 1 130px' }}>
          <label className="act-filter-label" htmlFor="af-resp">Responsável</label>
          <select id="af-resp" name="responsavel" defaultValue={filterResponsavel ?? ''} className="act-filter-input">
            <option value="">Todos</option>
            {(teamMembers ?? []).map((m) => (
              <option key={m.id} value={m.id}>{m.name ?? 'Sem nome'}</option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="act-filter-actions" style={{ display: 'flex', gap: 8, marginLeft: 'auto', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {hasActiveFilters && (
            <Link href={'/admin/atividades' as Route} className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>
              Limpar
            </Link>
          )}
          <button type="submit" className="btn btn-primary btn-sm" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
            <Icon name="filter" size={13} /> Filtrar
          </button>
        </div>
      </form>

      {/* ── Empty state ── */}
      {list.length === 0 && (
        <div className="card" style={{ padding: 'clamp(32px, 6vw, 52px)', textAlign: 'center' }}>
          <p className="muted" style={{ marginBottom: 14 }}>
            {hasActiveFilters
              ? 'Nenhuma atividade corresponde aos filtros.'
              : showArchived
              ? 'Nenhuma atividade arquivada.'
              : 'Nenhuma atividade criada ainda.'}
          </p>
          {!hasActiveFilters && !showArchived && (
            <Link href={'/admin/atividades/nova' as Route} className="btn btn-primary">
              <Icon name="plus" size={15} /> Criar primeira atividade
            </Link>
          )}
        </div>
      )}

      {/* ── List ── */}
      <div className="act-list">
        {list.map((activity) => {
          const client      = Array.isArray(activity.client)      ? activity.client[0]      : activity.client;
          const responsible = Array.isArray(activity.responsible) ? activity.responsible[0] : activity.responsible;
          const priorityCfg = PRIORITY_CONFIG[activity.priority] ?? { label: 'Média', color: '#1d4ed8', bg: '#eff6ff' };
          const statusCfg   = STATUS_CONFIG[activity.status]     ?? { label: 'Entrada', color: '#6b7280', bg: '#f3f4f6' };
          const isArchived  = activity.status === 'arquivada';
          const catLabel    = ACTIVITY_CATEGORY_LABEL[activity.category] ?? activity.category;
          const dueFmt      = formatDate(activity.due_date);
          const dueLabel    = getDueLabel(activity.due_date, activity.status);
          const statusLabel = ACTIVITY_STATUS_LABEL[activity.status] ?? activity.status;

          return (
            <div key={activity.id} className="act-card">
              {/* Topo: badges */}
              <div className="act-card-top">
                <span className="act-origin-tag">Atividade</span>
                <span className="act-tag" style={{ background: priorityCfg.bg, color: priorityCfg.color }}>
                  {priorityCfg.label}
                </span>
                <span className="chip" style={{ fontSize: 10, height: 20 }}>{catLabel}</span>
                <span className="act-tag" style={{ background: statusCfg.bg, color: statusCfg.color }}>
                  {statusLabel}
                </span>
                {dueLabel && (
                  <span className="act-due-tag" style={{ background: dueLabel.bg, color: dueLabel.color }}>
                    {dueLabel.label}
                  </span>
                )}
              </div>

              {/* Título + descrição */}
              <div className="act-card-title">{activity.title}</div>
              {activity.description && (
                <div className="act-card-desc">{activity.description}</div>
              )}

              {/* Footer */}
              <div className="act-card-footer">
                <div className="act-card-meta">
                  {client && (
                    <span className="muted tiny" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Icon name="user" size={11} />
                      {client.company_name ?? client.name}
                    </span>
                  )}
                  {responsible && (
                    <span className="muted tiny" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Icon name="check" size={11} />
                      {responsible.name}
                    </span>
                  )}
                  {dueFmt && !dueLabel && (
                    <span className="muted tiny" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Icon name="calendar" size={11} />
                      {dueFmt}
                    </span>
                  )}
                  {dueFmt && dueLabel && (
                    <span className="tiny" style={{ display: 'flex', alignItems: 'center', gap: 4, color: dueLabel.color, fontWeight: 700 }}>
                      <Icon name="calendar" size={11} />
                      {dueFmt}
                    </span>
                  )}
                </div>

                <div className="act-card-actions" style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  <Link
                    href={`/admin/atividades/${activity.id}/editar` as Route}
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: 12 }}
                  >
                    Editar
                  </Link>
                  <ActivityCardActions
                    id={activity.id}
                    currentStatus={activity.status}
                    isArchived={isArchived}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
