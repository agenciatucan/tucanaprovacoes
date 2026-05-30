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

function formatDate(value?: string | null) {
  if (!value) return null;
  return new Date(value + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function isOverdue(due_date?: string | null, status?: string): boolean {
  if (!due_date || status === 'concluido' || status === 'arquivada') return false;
  return new Date(due_date + 'T23:59:59') < new Date();
}

export default async function AtividadesPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    categoria?: string;
    prioridade?: string;
    cliente?: string;
    responsavel?: string;
    arquivadas?: string;
  }>;
}) {
  const {
    status: filterStatus,
    categoria: filterCategoria,
    prioridade: filterPrioridade,
    cliente: filterCliente,
    responsavel: filterResponsavel,
    arquivadas,
  } = await searchParams;

  const showArchived = arquivadas === '1';
  const supabase = await getSupabaseServerClient();

  let query = supabase
    .from('activities')
    .select(`
      id, title, description, category, priority, status, due_date, visibility, created_at,
      client:clients(id, name, company_name),
      responsible:user_profiles!responsible_id(id, name)
    `)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (showArchived) {
    query = query.not('archived_at', 'is', null);
  } else {
    query = query.is('archived_at', null).neq('status', 'arquivada');
  }

  if (filterStatus)      query = query.eq('status', filterStatus);
  if (filterCategoria)   query = query.eq('category', filterCategoria);
  if (filterPrioridade)  query = query.eq('priority', filterPrioridade);
  if (filterCliente)     query = query.eq('client_id', filterCliente);
  if (filterResponsavel) query = query.eq('responsible_id', filterResponsavel);

  const { data: activities } = await query.limit(200);

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

  const hasFilters = Boolean(filterStatus || filterCategoria || filterPrioridade || filterCliente || filterResponsavel || showArchived);

  return (
    <div className="page" style={{ maxWidth: 1200 }}>
      <style>{`
        .act-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; margin-bottom: 22px; flex-wrap: wrap; }
        .act-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-bottom: 18px; }
        .act-summary-card { background: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 12px 14px; }
        .act-summary-card strong { display: block; margin-top: 4px; font-size: 20px; line-height: 1; letter-spacing: -0.03em; }
        .act-filters { background: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 14px; display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-end; margin-bottom: 18px; }
        .act-filter-select { height: 36px; border-radius: 9px; border: 1px solid var(--line); background: #fff; padding: 0 10px; font-family: inherit; font-size: 12.5px; color: var(--ink); outline: none; }
        .act-list { display: flex; flex-direction: column; gap: 10px; }
        .act-card { background: #fff; border: 1px solid var(--line); border-radius: 18px; padding: 16px 18px; }
        .act-card-top { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
        .act-card-title { font-size: 15px; font-weight: 800; color: var(--ink); line-height: 1.35; margin-bottom: 4px; }
        .act-card-desc { font-size: 13px; color: var(--muted); line-height: 1.45; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
        .act-card-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 12px; flex-wrap: wrap; }
        .act-card-meta { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .act-tag { font-size: 10px; font-weight: 800; padding: 3px 9px; border-radius: 999px; white-space: nowrap; }
        @media (max-width: 900px) { .act-summary { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 760px) { .act-header { flex-direction: column; align-items: stretch; } .act-card-footer { flex-direction: column; align-items: flex-start; } }
      `}</style>

      {/* Header */}
      <div className="act-header">
        <div>
          <div className="eyebrow">Tucan · Interno</div>
          <h1 className="h1" style={{ marginTop: 6 }}>Atividades</h1>
          <p className="muted" style={{ marginTop: 6, fontSize: 14 }}>
            Tarefas internas da equipe, separadas dos cronogramas de cliente.
          </p>
        </div>
        <Link href={'/admin/atividades/nova' as Route} className="btn btn-primary">
          <Icon name="plus" size={15} /> Nova atividade
        </Link>
      </div>

      {/* Summary */}
      <div className="act-summary">
        <div className="act-summary-card">
          <span className="muted tiny">Total ativas</span>
          <strong style={{ color: 'var(--ink)' }}>{counts.total}</strong>
        </div>
        {(Object.entries(STATUS_CONFIG) as [string, {label: string; color: string; bg: string}][])
          .filter(([k]) => k !== 'arquivada')
          .map(([key, cfg]) => (
            <div key={key} className="act-summary-card">
              <span className="tiny" style={{ color: cfg.color, fontWeight: 800 }}>{cfg.label}</span>
              <strong style={{ color: cfg.color }}>{counts[key as keyof typeof counts] ?? 0}</strong>
            </div>
          ))}
      </div>

      {/* Filters */}
      <form action="/admin/atividades" className="act-filters">
        {showArchived && <input type="hidden" name="arquivadas" value="1" />}

        <div className="field" style={{ gap: 4 }}>
          <label className="field-label" style={{ fontSize: 10 }} htmlFor="af-status">Status</label>
          <select id="af-status" name="status" defaultValue={filterStatus ?? ''} className="act-filter-select">
            <option value="">Todos os status</option>
            {Object.entries(STATUS_CONFIG).filter(([k]) => k !== 'arquivada').map(([v, c]) => (
              <option key={v} value={v}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="field" style={{ gap: 4 }}>
          <label className="field-label" style={{ fontSize: 10 }} htmlFor="af-pri">Prioridade</label>
          <select id="af-pri" name="prioridade" defaultValue={filterPrioridade ?? ''} className="act-filter-select">
            <option value="">Todas</option>
            {Object.entries(PRIORITY_CONFIG).map(([v, c]) => (
              <option key={v} value={v}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="field" style={{ gap: 4 }}>
          <label className="field-label" style={{ fontSize: 10 }} htmlFor="af-cat">Categoria</label>
          <select id="af-cat" name="categoria" defaultValue={filterCategoria ?? ''} className="act-filter-select">
            <option value="">Todas</option>
            {Object.entries(ACTIVITY_CATEGORY_LABEL).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div className="field" style={{ gap: 4 }}>
          <label className="field-label" style={{ fontSize: 10 }} htmlFor="af-cli">Cliente</label>
          <select id="af-cli" name="cliente" defaultValue={filterCliente ?? ''} className="act-filter-select">
            <option value="">Todos</option>
            {(clients ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.company_name ?? c.name}</option>
            ))}
          </select>
        </div>

        <div className="field" style={{ gap: 4 }}>
          <label className="field-label" style={{ fontSize: 10 }} htmlFor="af-resp">Responsável</label>
          <select id="af-resp" name="responsavel" defaultValue={filterResponsavel ?? ''} className="act-filter-select">
            <option value="">Todos</option>
            {(teamMembers ?? []).map((m) => (
              <option key={m.id} value={m.id}>{m.name ?? 'Sem nome'}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', alignItems: 'center' }}>
          <Link
            href={(showArchived ? '/admin/atividades' : '/admin/atividades?arquivadas=1') as Route}
            className="btn btn-ghost btn-sm" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
            {showArchived ? 'Ver ativas' : 'Ver arquivadas'}
          </Link>
          {hasFilters && (
            <Link href={'/admin/atividades' as Route} className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>Limpar</Link>
          )}
          <button type="submit" className="btn btn-primary btn-sm" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
            <Icon name="filter" size={13} /> Filtrar
          </button>
        </div>
      </form>

      {/* Empty */}
      {list.length === 0 && (
        <div className="card" style={{ padding: 'clamp(32px, 6vw, 52px)', textAlign: 'center' }}>
          <p className="muted" style={{ marginBottom: 14 }}>
            {hasFilters ? 'Nenhuma atividade corresponde aos filtros.' : showArchived ? 'Nenhuma atividade arquivada.' : 'Nenhuma atividade criada ainda.'}
          </p>
          {!hasFilters && !showArchived && (
            <Link href={'/admin/atividades/nova' as Route} className="btn btn-primary">
              <Icon name="plus" size={15} /> Criar primeira atividade
            </Link>
          )}
        </div>
      )}

      {/* List */}
      <div className="act-list">
        {list.map((activity) => {
          const client = Array.isArray(activity.client) ? activity.client[0] : activity.client;
          const responsible = Array.isArray(activity.responsible) ? activity.responsible[0] : activity.responsible;
          const priorityCfg = PRIORITY_CONFIG[activity.priority] ?? { label: 'Média', color: '#1d4ed8', bg: '#eff6ff' };
          const statusCfg = STATUS_CONFIG[activity.status] ?? { label: 'Entrada', color: '#6b7280', bg: '#f3f4f6' };
          const overdue = isOverdue(activity.due_date, activity.status);
          const isArchived = activity.status === 'arquivada';
          const catLabel = ACTIVITY_CATEGORY_LABEL[activity.category] ?? activity.category;
          const dueFmt = formatDate(activity.due_date);
          const statusLabel = ACTIVITY_STATUS_LABEL[activity.status] ?? activity.status;

          return (
            <div key={activity.id} className="act-card">
              <div className="act-card-top">
                <span className="act-tag" style={{ background: priorityCfg.bg, color: priorityCfg.color }}>{priorityCfg.label}</span>
                <span className="chip" style={{ fontSize: 10, height: 20 }}>{catLabel}</span>
                <span className="act-tag" style={{ background: statusCfg.bg, color: statusCfg.color }}>{statusLabel}</span>
              </div>

              <div className="act-card-title">{activity.title}</div>

              {activity.description && (
                <div className="act-card-desc">{activity.description}</div>
              )}

              <div className="act-card-footer">
                <div className="act-card-meta">
                  {client && (
                    <span className="muted tiny" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Icon name="user" size={11} />{client.company_name ?? client.name}
                    </span>
                  )}
                  {responsible && (
                    <span className="muted tiny" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Icon name="check" size={11} />{responsible.name}
                    </span>
                  )}
                  {dueFmt && (
                    <span className="tiny" style={{ display: 'flex', alignItems: 'center', gap: 4, color: overdue ? '#dc2626' : 'var(--muted)', fontWeight: overdue ? 800 : 600 }}>
                      <Icon name="calendar" size={11} />
                      {overdue ? '⚠ ' : ''}{dueFmt}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Link href={`/admin/atividades/${activity.id}/editar` as Route} className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>
                    Editar
                  </Link>
                  <ActivityCardActions id={activity.id} currentStatus={activity.status} isArchived={isArchived} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
