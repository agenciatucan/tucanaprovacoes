import { Metadata } from 'next';
import Link from 'next/link';
import type { Route } from 'next';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { Icon } from '@/components/ui/Icon';
import { ACTIVITY_CATEGORY_LABEL, ACTIVITY_STATUS_LABEL } from '@/lib/validations/schemas';

export const metadata: Metadata = { title: 'Kanban' };

// ── Colunas do novo fluxo da agência ─────────────────────────
const COLUMNS = [
  { key: 'entrada',      label: 'Entrada',       color: '#6b7280', bg: '#f3f4f6' },
  { key: 'em_analise',   label: 'Em análise',    color: '#7c3aed', bg: '#f5f3ff' },
  { key: 'atribuido',    label: 'Atribuído',     color: '#4338ca', bg: '#eef2ff' },
  { key: 'em_producao',  label: 'Em produção',   color: '#ea580c', bg: '#fff7ed' },
  { key: 'em_aprovacao', label: 'Em aprovação',  color: '#d97706', bg: '#fffbeb' },
  { key: 'ajustes',      label: 'Ajustes',       color: '#dc2626', bg: '#fef2f2' },
  { key: 'concluido',    label: 'Concluído',     color: '#166534', bg: '#f0fdf4' },
] as const;

type KanbanColumn = (typeof COLUMNS)[number]['key'];
const COLUMN_KEYS = COLUMNS.map((c) => c.key) as KanbanColumn[];

// ── Mapeamento: status antigo dos posts → coluna nova ─────────
// content_items usam: pendente | em_revisao | aprovado | em_producao | finalizado
// Mapeamento para o fluxo interno da agência:
//   pendente    → em_aprovacao  (aguardando aprovação do cliente)
//   em_producao → em_producao   (sendo produzido pela equipe)
//   em_revisao  → ajustes       (cliente pediu ajustes)
//   aprovado    → concluido     (cliente aprovou)
//   finalizado  → concluido     (publicado)
function postStatusToColumn(status: string): KanbanColumn {
  const map: Record<string, KanbanColumn> = {
    pendente:    'em_aprovacao',
    em_producao: 'em_producao',
    em_revisao:  'ajustes',
    aprovado:    'concluido',
    finalizado:  'concluido',
  };
  return map[status] ?? 'entrada';
}

function activityStatusToColumn(status: string): KanbanColumn {
  return COLUMN_KEYS.includes(status as KanbanColumn)
    ? (status as KanbanColumn)
    : 'entrada';
}

// ── Formatos dos posts ────────────────────────────────────────
const FMT_LABEL: Record<string, string> = {
  reels: 'Reels', carrossel: 'Carrossel', post_estatico: 'Post estático',
  story: 'Story', outro: 'Outro',
};

// ── Prioridades ───────────────────────────────────────────────
const PRIORITY_COLOR: Record<string, string> = {
  baixa: '#6b7280', media: '#1d4ed8', alta: '#ea580c', urgente: '#dc2626',
};
const PRIORITY_BG: Record<string, string> = {
  baixa: '#f3f4f6', media: '#eff6ff', alta: '#fff7ed', urgente: '#fef2f2',
};
const PRIORITY_LABEL: Record<string, string> = {
  baixa: 'Baixa', media: 'Média', alta: 'Alta', urgente: 'Urgente',
};

// ── Tipos unificados ──────────────────────────────────────────
type PostCard = {
  type: 'post';
  id: string;
  title: string;
  format: string | null;
  week_label: string | null;
  campaign_name: string | null;
  client_name: string | null;
  column: KanbanColumn;
};

type ActivityCard = {
  type: 'activity';
  id: string;
  title: string;
  category: string;
  priority: string;
  client_name: string | null;
  responsible_name: string | null;
  due_date: string | null;
  status: string;
  column: KanbanColumn;
};

type KanbanCard = PostCard | ActivityCard;

function createEmptyGrouped(): Record<KanbanColumn, KanbanCard[]> {
  return {
    entrada: [], em_analise: [], atribuido: [],
    em_producao: [], em_aprovacao: [], ajustes: [], concluido: [],
  };
}

function normalize(v?: string) { return v?.trim() || ''; }

function formatDue(date?: string | null) {
  if (!date) return null;
  return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function isOverdue(date?: string | null) {
  if (!date) return false;
  return new Date(date + 'T23:59:59') < new Date();
}

export default async function KanbanPage({
  searchParams,
}: {
  searchParams: Promise<{
    tipo?: string;
    q?: string;
    cliente?: string;
    responsavel?: string;
    semana?: string;
    categoria?: string;
    prioridade?: string;
  }>;
}) {
  const {
    tipo: filterTipo,
    q: searchTerm,
    cliente: filterClient,
    responsavel: filterResponsavel,
    semana: filterWeek,
    categoria: filterCategoria,
    prioridade: filterPriority,
  } = await searchParams;

  const supabase = await getSupabaseServerClient();
  const search = normalize(searchTerm);
  const showPosts      = !filterTipo || filterTipo === 'todos' || filterTipo === 'cronograma';
  const showActivities = !filterTipo || filterTipo === 'todos' || filterTipo === 'atividade';

  // ── Query: posts de cronograma ────────────────────────────────
  let postsQuery = supabase
    .from('content_items')
    .select('id, title, format, week_label, general_status, campaign_id, campaigns(id, name, clients(name, company_name))')
    .order('order_index');

  if (filterClient) postsQuery = postsQuery.eq('client_id', filterClient);
  if (filterWeek)   postsQuery = postsQuery.eq('week_label', filterWeek);
  if (search)       postsQuery = postsQuery.ilike('title', `%${search}%`);

  // ── Query: atividades ─────────────────────────────────────────
  let activitiesQuery = supabase
    .from('activities')
    .select('id, title, category, priority, status, kanban_column, due_date, client:clients(name, company_name), responsible:user_profiles!responsible_id(name)')
    .is('archived_at', null)
    .not('status', 'eq', 'arquivada')
    .order('due_date', { ascending: true, nullsFirst: false });

  if (filterClient)    activitiesQuery = activitiesQuery.eq('client_id', filterClient);
  if (filterResponsavel) activitiesQuery = activitiesQuery.eq('responsible_id', filterResponsavel);
  if (filterCategoria) activitiesQuery = activitiesQuery.eq('category', filterCategoria);
  if (filterPriority)  activitiesQuery = activitiesQuery.eq('priority', filterPriority);
  if (search)          activitiesQuery = activitiesQuery.ilike('title', `%${search}%`);

  // ── Executa em paralelo ───────────────────────────────────────
  const [
    { data: rawPosts },
    { data: rawActivities },
    { data: clients },
    { data: teamMembers },
  ] = await Promise.all([
    showPosts      ? postsQuery.limit(300)      : Promise.resolve({ data: [] }),
    showActivities ? activitiesQuery.limit(300) : Promise.resolve({ data: [] }),
    supabase.from('clients').select('id, name, company_name').eq('status', 'ativo').order('name'),
    supabase.from('user_profiles').select('id, name').in('role', ['admin', 'equipe']).order('name'),
  ]);

  // ── Normaliza posts ───────────────────────────────────────────
  const postCards: PostCard[] = (rawPosts ?? []).map((item: any) => {
    const campaign = Array.isArray(item.campaigns) ? item.campaigns[0] : item.campaigns;
    const client   = Array.isArray(campaign?.clients) ? campaign?.clients[0] : campaign?.clients;
    return {
      type: 'post',
      id: item.id,
      title: item.title ?? 'Post sem título',
      format: item.format,
      week_label: item.week_label,
      campaign_name: campaign?.name ?? null,
      client_name: client?.company_name ?? client?.name ?? null,
      column: postStatusToColumn(item.general_status ?? 'pendente'),
    };
  });

  // ── Normaliza atividades ──────────────────────────────────────
  const activityCards: ActivityCard[] = (rawActivities ?? []).map((item: any) => {
    const client      = Array.isArray(item.client)      ? item.client[0]      : item.client;
    const responsible = Array.isArray(item.responsible) ? item.responsible[0] : item.responsible;
    return {
      type: 'activity',
      id: item.id,
      title: item.title,
      category: item.category,
      priority: item.priority,
      client_name: client?.company_name ?? client?.name ?? null,
      responsible_name: responsible?.name ?? null,
      due_date: item.due_date,
      status: item.status,
      column: activityStatusToColumn(item.kanban_column ?? item.status),
    };
  });

  // ── Agrupa por coluna ─────────────────────────────────────────
  const grouped = createEmptyGrouped();
  [...postCards, ...activityCards].forEach((card) => grouped[card.column].push(card));

  const totalAll  = postCards.length + activityCards.length;

  const weekOptions = [
    ...new Set([
      'Semana 1', 'Semana 2', 'Semana 3', 'Semana 4', 'Semana 5',
      ...postCards.map((c) => c.week_label).filter((w): w is string => Boolean(w)),
    ]),
  ];

  const hasFilters = Boolean(
    (filterTipo && filterTipo !== 'todos') ||
    filterClient || filterResponsavel || filterWeek || filterCategoria || filterPriority || search
  );

  return (
    <div className="page" style={{ maxWidth: 1800, paddingBottom: 60 }}>
      <style>{`
        .kanban-card-link {
          position: relative; border: 1px solid var(--line);
          transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease, background .16s ease;
        }
        .kanban-card-link:hover {
          transform: translateY(-2px); border-color: rgba(37,65,30,.28);
          box-shadow: 0 14px 32px rgba(0,0,0,.07); background: #fff;
        }
        .kanban-card-arrow { opacity: 0; transform: translateX(-2px); transition: opacity .16s ease, transform .16s ease; }
        .kanban-card-link:hover .kanban-card-arrow { opacity: 1; transform: translateX(0); }
        .kanban-board-scroll { overflow-x: auto; padding-bottom: 12px; }
        .kanban-board-scroll::-webkit-scrollbar { height: 8px; }
        .kanban-board-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,.12); border-radius: 999px; }
        .kanban-filter-input {
          height: 36px; border-radius: 9px; border: 1px solid var(--line);
          background: #fff; padding: 0 10px; font-family: inherit; font-size: 12.5px; color: var(--ink); outline: none;
        }
        .kanban-filter-input:focus { border-color: rgba(37,65,30,.35); box-shadow: 0 0 0 3px rgba(37,65,30,.08); }
        .kanban-summary-card {
          background: #fff; border: 1px solid var(--line); border-radius: 14px;
          padding: 10px 12px; min-width: 100px;
        }
        .kanban-summary-card strong { display: block; margin-top: 4px; font-size: 20px; line-height: 1; letter-spacing: -0.03em; }
        .kb-type-badge {
          font-size: 9px; font-weight: 900; padding: 2px 7px; border-radius: 999px;
          letter-spacing: 0.05em; text-transform: uppercase; white-space: nowrap;
        }
        @media (max-width: 760px) {
          .kanban-filter-grid { display: grid !important; grid-template-columns: 1fr !important; }
          .kanban-summary-grid { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div className="eyebrow">Tucan · Interno</div>
          <h1 className="h1" style={{ marginTop: 6 }}>Kanban</h1>
          <p className="muted" style={{ marginTop: 6, fontSize: 14 }}>
            Fluxo de trabalho: Entrada → Em análise → Atribuído → Em produção → Em aprovação → Ajustes → Concluído
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="kanban-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(8, minmax(0, 1fr))', gap: 8, marginBottom: 16 }}>
        <div className="kanban-summary-card">
          <span className="muted tiny">Total</span>
          <strong>{totalAll}</strong>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.key} className="kanban-summary-card">
            <span className="tiny" style={{ color: col.color, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
              {col.label}
            </span>
            <strong>{grouped[col.key].length}</strong>
          </div>
        ))}
      </div>

      {/* Filters */}
      <form action="/admin/kanban" className="kanban-filter-grid" style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: 14, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) auto', gap: 10, marginBottom: 20, alignItems: 'end' }}>
        {/* Linha 1 */}
        <div className="field" style={{ gap: 5 }}>
          <label className="field-label" htmlFor="k-tipo">Tipo</label>
          <select id="k-tipo" name="tipo" defaultValue={filterTipo ?? 'todos'} className="kanban-filter-input">
            <option value="todos">Todos</option>
            <option value="cronograma">Cronograma</option>
            <option value="atividade">Atividades</option>
          </select>
        </div>

        <div className="field" style={{ gap: 5 }}>
          <label className="field-label" htmlFor="k-q">Buscar</label>
          <input id="k-q" name="q" defaultValue={search} className="kanban-filter-input" placeholder="Título..." />
        </div>

        <div className="field" style={{ gap: 5 }}>
          <label className="field-label" htmlFor="k-client">Cliente</label>
          <select id="k-client" name="cliente" defaultValue={filterClient ?? ''} className="kanban-filter-input">
            <option value="">Todos</option>
            {(clients ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.company_name ?? c.name}</option>
            ))}
          </select>
        </div>

        <div className="field" style={{ gap: 5 }}>
          <label className="field-label" htmlFor="k-resp">Responsável</label>
          <select id="k-resp" name="responsavel" defaultValue={filterResponsavel ?? ''} className="kanban-filter-input">
            <option value="">Todos</option>
            {(teamMembers ?? []).map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        {/* Linha 2 */}
        <div className="field" style={{ gap: 5 }}>
          <label className="field-label" htmlFor="k-week">Semana</label>
          <select id="k-week" name="semana" defaultValue={filterWeek ?? ''} className="kanban-filter-input">
            <option value="">Todas</option>
            {weekOptions.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>

        <div className="field" style={{ gap: 5 }}>
          <label className="field-label" htmlFor="k-cat">Categoria</label>
          <select id="k-cat" name="categoria" defaultValue={filterCategoria ?? ''} className="kanban-filter-input">
            <option value="">Todas</option>
            {Object.entries(ACTIVITY_CATEGORY_LABEL).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div className="field" style={{ gap: 5 }}>
          <label className="field-label" htmlFor="k-pri">Prioridade</label>
          <select id="k-pri" name="prioridade" defaultValue={filterPriority ?? ''} className="kanban-filter-input">
            <option value="">Todas</option>
            {Object.entries(PRIORITY_LABEL).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          {hasFilters && (
            <Link href={'/admin/kanban' as Route} className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>Limpar</Link>
          )}
          <button type="submit" className="btn btn-primary btn-sm" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
            <Icon name="filter" size={13} /> Filtrar
          </button>
        </div>
      </form>

      {/* Board — 7 colunas */}
      <div className="kanban-board-scroll">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(230px, 1fr))', gap: 12, alignItems: 'start', minWidth: 1700 }}>
          {COLUMNS.map((col) => {
            const colItems = grouped[col.key];

            return (
              <div key={col.key}>
                {/* Cabeçalho da coluna */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '8px 12px', borderRadius: 10, background: col.bg }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: col.color, flex: 1 }}>{col.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: col.color, opacity: 0.75 }}>{colItems.length}</span>
                </div>

                {/* Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {colItems.map((card) => {
                    if (card.type === 'post') {
                      return (
                        <Link
                          key={`post-${card.id}`}
                          href={`/admin/posts/${card.id}` as Route}
                          className="card kanban-card-link"
                          style={{ padding: 12, textDecoration: 'none', color: 'inherit', display: 'block' }}
                        >
                          {/* Topo: badge origem + formato */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, marginBottom: 8 }}>
                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', minWidth: 0 }}>
                              <span className="kb-type-badge" style={{ background: '#e8f5e2', color: 'var(--green)' }}>
                                Cronograma
                              </span>
                              {card.format && (
                                <span className="chip" style={{ fontSize: 9, height: 18 }}>
                                  {FMT_LABEL[card.format] ?? card.format}
                                </span>
                              )}
                            </div>
                            {card.week_label && (
                              <span className="chip" style={{ fontSize: 9, height: 18, background: 'var(--bg-2)', flexShrink: 0 }}>
                                {card.week_label}
                              </span>
                            )}
                          </div>

                          {/* Título */}
                          <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.35, marginBottom: 6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                            {card.title}
                          </div>

                          {/* Rodapé */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                            <span className="muted tiny" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                              {card.client_name ?? card.campaign_name ?? '—'}
                            </span>
                            <span className="kanban-card-arrow" style={{ color: 'var(--green)', fontSize: 14, flexShrink: 0, fontWeight: 700 }}>→</span>
                          </div>
                        </Link>
                      );
                    }

                    // ── Card de Atividade ─────────────────────────────
                    const overdue  = isOverdue(card.due_date);
                    const pColor   = PRIORITY_COLOR[card.priority] ?? '#6b7280';
                    const pBg      = PRIORITY_BG[card.priority]    ?? '#f3f4f6';
                    const pLabel   = PRIORITY_LABEL[card.priority]  ?? card.priority;
                    const catLabel = ACTIVITY_CATEGORY_LABEL[card.category] ?? card.category;
                    const dueFmt   = formatDue(card.due_date);
                    const colStatus = ACTIVITY_STATUS_LABEL[card.status] ?? card.status;

                    return (
                      <Link
                        key={`act-${card.id}`}
                        href={`/admin/atividades/${card.id}/editar` as Route}
                        className="card kanban-card-link"
                        style={{ padding: 12, textDecoration: 'none', color: 'inherit', display: 'block', borderLeft: `3px solid ${pColor}` }}
                      >
                        {/* Topo: badge origem + prioridade */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, marginBottom: 8 }}>
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', minWidth: 0 }}>
                            <span className="kb-type-badge" style={{ background: '#fff3e8', color: '#ea580c' }}>
                              Atividade
                            </span>
                            <span className="chip" style={{ fontSize: 9, height: 18, background: pBg, color: pColor }}>
                              {pLabel}
                            </span>
                          </div>
                          <span className="chip" style={{ fontSize: 9, height: 18, background: 'var(--bg-2)', flexShrink: 0 }}>
                            {catLabel}
                          </span>
                        </div>

                        {/* Título */}
                        <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.35, marginBottom: 6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                          {card.title}
                        </div>

                        {/* Rodapé */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 8 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                            {card.client_name && (
                              <span className="muted tiny" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {card.client_name}
                              </span>
                            )}
                            {card.responsible_name && (
                              <span className="muted tiny">👤 {card.responsible_name}</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                            {dueFmt && (
                              <span style={{ fontSize: 10, fontWeight: 700, color: overdue ? '#dc2626' : 'var(--muted)', whiteSpace: 'nowrap' }}>
                                {overdue ? '⚠ ' : ''}{dueFmt}
                              </span>
                            )}
                            <span className="kanban-card-arrow" style={{ color: '#ea580c', fontSize: 14, fontWeight: 700 }}>→</span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}

                  {colItems.length === 0 && (
                    <div style={{ padding: '14px 12px', borderRadius: 10, border: '2px dashed var(--line)', textAlign: 'center', background: 'rgba(255,255,255,.45)' }}>
                      <span className="muted tiny">Nenhum card</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
