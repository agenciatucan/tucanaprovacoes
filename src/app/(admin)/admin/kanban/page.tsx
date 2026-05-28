import { Metadata } from 'next';
import Link from 'next/link';
import type { Route } from 'next';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { Icon } from '@/components/ui/Icon';

export const metadata: Metadata = { title: 'Kanban' };

const COLUMNS = [
  {
    key: 'pendente',
    label: 'Pendente',
    color: 'var(--muted-2)',
    bg: 'var(--bg-2)',
  },
  {
    key: 'em_revisao',
    label: 'Ajustes solicitados',
    color: 'var(--st-revisao-fg)',
    bg: 'var(--st-revisao-bg)',
  },
  {
    key: 'aprovado',
    label: 'Aprovado',
    color: 'var(--st-aprovado-fg)',
    bg: 'var(--st-aprovado-bg)',
  },
  {
    key: 'em_producao',
    label: 'Em produção',
    color: 'var(--st-agendado-fg)',
    bg: 'var(--st-agendado-bg)',
  },
  {
    key: 'finalizado',
    label: 'Finalizado',
    color: 'var(--st-publicado-fg)',
    bg: 'var(--st-publicado-bg)',
  },
];

const FMT_LABEL: Record<string, string> = {
  reels: 'Reels',
  carrossel: 'Carrossel',
  post_estatico: 'Post estático',
  story: 'Story',
  outro: 'Outro',
};

const FMT_CLASS: Record<string, string> = {
  reels: 'fmt fmt-reels',
  carrossel: 'fmt fmt-carrossel',
  post_estatico: 'fmt fmt-estatico',
  story: 'fmt fmt-stories',
  outro: 'fmt',
};

type KanbanItem = {
  id: string;
  title: string | null;
  format: string | null;
  week_label: string | null;
  general_status: string | null;
  campaign_id: string | null;
  campaigns:
    | {
        id: string;
        name: string | null;
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
      }
    | {
        id: string;
        name: string | null;
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
      }[]
    | null;
};

function normalize(value?: string) {
  return value?.trim() || '';
}

function buildClearHref() {
  return '/admin/kanban' as Route;
}

export default async function KanbanPage({
  searchParams,
}: {
  searchParams: Promise<{
    cliente?: string;
    cronograma?: string;
    semana?: string;
    formato?: string;
    q?: string;
  }>;
}) {
  const {
    cliente: filterClient,
    cronograma: filterCampaign,
    semana: filterWeek,
    formato: filterFormat,
    q: searchTerm,
  } = await searchParams;

  const supabase = await getSupabaseServerClient();

  const search = normalize(searchTerm);

  let query = supabase
    .from('content_items')
    .select(
      `
      id,
      title,
      format,
      week_label,
      general_status,
      campaign_id,
      campaigns(
        id,
        name,
        clients(name, company_name)
      )
    `
    )
    .order('order_index');

  if (filterCampaign) {
    query = query.eq('campaign_id', filterCampaign);
  }

  if (filterClient) {
    query = query.eq('client_id', filterClient);
  }

  if (filterWeek) {
    query = query.eq('week_label', filterWeek);
  }

  if (filterFormat) {
    query = query.eq('format', filterFormat);
  }

  if (search) {
    query = query.ilike('title', `%${search}%`);
  }

  const { data: items } = await query.limit(300);

  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, company_name')
    .eq('status', 'ativo')
    .order('name');

  const allItems = (items ?? []) as KanbanItem[];

  const weekOptions = [
    ...new Set([
      'Semana 1',
      'Semana 2',
      'Semana 3',
      'Semana 4',
      'Semana 5',
      ...allItems
        .map((item) => item.week_label)
        .filter((week): week is string => Boolean(week)),
    ]),
  ];

  const grouped = COLUMNS.reduce<Record<string, KanbanItem[]>>((acc, col) => {
    acc[col.key] = [];
    return acc;
  }, {});

  allItems.forEach((item) => {
    const status = item.general_status ?? 'pendente';

    if (grouped[status]) {
      grouped[status].push(item);
    } else {
      grouped.pendente.push(item);
    }
  });

  const totalPosts = allItems.length;
  const hasFilters =
    Boolean(filterClient) ||
    Boolean(filterCampaign) ||
    Boolean(filterWeek) ||
    Boolean(filterFormat) ||
    Boolean(search);

  return (
    <div className="page" style={{ maxWidth: 1600, paddingBottom: 60 }}>
      <style>
        {`
          .kanban-card-link {
            position: relative;
            border: 1px solid var(--line);
            transition:
              transform .16s ease,
              box-shadow .16s ease,
              border-color .16s ease,
              background .16s ease;
          }

          .kanban-card-link:hover {
            transform: translateY(-2px);
            border-color: rgba(37, 65, 30, .28);
            box-shadow: 0 14px 32px rgba(0, 0, 0, .07);
            background: #fff;
          }

          .kanban-card-arrow {
            opacity: 0;
            transform: translateX(-2px);
            transition: opacity .16s ease, transform .16s ease;
          }

          .kanban-card-link:hover .kanban-card-arrow {
            opacity: 1;
            transform: translateX(0);
          }

          .kanban-board-scroll {
            overflow-x: auto;
            padding-bottom: 10px;
          }

          .kanban-board-scroll::-webkit-scrollbar {
            height: 8px;
          }

          .kanban-board-scroll::-webkit-scrollbar-thumb {
            background: rgba(0, 0, 0, .12);
            border-radius: 999px;
          }

          .kanban-filter-input {
            height: 38px;
            border-radius: 10px;
            border: 1px solid var(--line);
            background: #fff;
            padding: 0 12px;
            font-family: inherit;
            font-size: 13px;
            color: var(--ink);
            outline: none;
          }

          .kanban-filter-input:focus {
            border-color: rgba(37, 65, 30, .35);
            box-shadow: 0 0 0 3px rgba(37, 65, 30, .08);
          }

          .kanban-summary-card {
            background: #fff;
            border: 1px solid var(--line);
            border-radius: 14px;
            padding: 12px 14px;
            min-width: 130px;
          }

          .kanban-summary-card strong {
            display: block;
            margin-top: 4px;
            font-size: 22px;
            line-height: 1;
            letter-spacing: -0.03em;
          }

          @media (max-width: 760px) {
            .kanban-filter-form {
              display: grid !important;
              grid-template-columns: 1fr !important;
            }

            .kanban-summary-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            }
          }
        `}
      </style>

      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: 20,
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div className="eyebrow">Tucan · Interno</div>

          <h1 className="h1" style={{ marginTop: 6 }}>
            Kanban
          </h1>

          <p className="muted" style={{ marginTop: 6, fontSize: 14 }}>
            Visão geral de todos os posts por status.
          </p>
        </div>
      </div>

      {/* Summary */}
      <div
        className="kanban-summary-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
          gap: 10,
          marginBottom: 16,
        }}
      >
        <div className="kanban-summary-card">
          <span className="muted tiny">Total</span>
          <strong>{totalPosts}</strong>
        </div>

        {COLUMNS.map((col) => {
          const count = grouped[col.key]?.length ?? 0;

          return (
            <div key={col.key} className="kanban-summary-card">
              <span
                className="tiny"
                style={{
                  color: col.color,
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: col.color,
                  }}
                />
                {col.label}
              </span>

              <strong>{count}</strong>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <form
        action="/admin/kanban"
        className="kanban-filter-form"
        style={{
          background: '#fff',
          border: '1px solid var(--line)',
          borderRadius: 14,
          padding: 14,
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr 1fr 1fr auto',
          gap: 10,
          marginBottom: 20,
          alignItems: 'end',
        }}
      >
        {filterCampaign && (
          <input type="hidden" name="cronograma" value={filterCampaign} />
        )}

        <div className="field" style={{ gap: 6 }}>
          <label className="field-label" htmlFor="kanban-search">
            Buscar post
          </label>

          <input
            id="kanban-search"
            name="q"
            defaultValue={search}
            className="kanban-filter-input"
            placeholder="Digite o título do post..."
          />
        </div>

        <div className="field" style={{ gap: 6 }}>
          <label className="field-label" htmlFor="kanban-client">
            Cliente
          </label>

          <select
            id="kanban-client"
            name="cliente"
            defaultValue={filterClient ?? ''}
            className="kanban-filter-input"
          >
            <option value="">Todos os clientes</option>

            {(clients ?? []).map((client) => (
              <option key={client.id} value={client.id}>
                {client.company_name ?? client.name ?? 'Sem nome'}
              </option>
            ))}
          </select>
        </div>

        <div className="field" style={{ gap: 6 }}>
          <label className="field-label" htmlFor="kanban-week">
            Semana
          </label>

          <select
            id="kanban-week"
            name="semana"
            defaultValue={filterWeek ?? ''}
            className="kanban-filter-input"
          >
            <option value="">Todas as semanas</option>

            {weekOptions.map((week) => (
              <option key={week} value={week}>
                {week}
              </option>
            ))}
          </select>
        </div>

        <div className="field" style={{ gap: 6 }}>
          <label className="field-label" htmlFor="kanban-format">
            Formato
          </label>

          <select
            id="kanban-format"
            name="formato"
            defaultValue={filterFormat ?? ''}
            className="kanban-filter-input"
          >
            <option value="">Todos os formatos</option>

            {Object.entries(FMT_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            justifyContent: 'flex-end',
          }}
        >
          {hasFilters && (
            <Link
              href={buildClearHref()}
              className="btn btn-ghost btn-sm"
              style={{ fontSize: 12, whiteSpace: 'nowrap' }}
            >
              Limpar
            </Link>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-sm"
            style={{ fontSize: 12, whiteSpace: 'nowrap' }}
          >
            <Icon name="filter" size={13} />
            Filtrar
          </button>
        </div>
      </form>

      {/* Kanban board */}
      <div className="kanban-board-scroll">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, minmax(250px, 1fr))',
            gap: 14,
            alignItems: 'start',
            minWidth: 1320,
          }}
        >
          {COLUMNS.map((col) => {
            const colItems = grouped[col.key] ?? [];
            const isReviewColumn = col.key === 'em_revisao';

            return (
              <div key={col.key}>
                {/* Column header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 10,
                    padding: '9px 12px',
                    borderRadius: 10,
                    background: col.bg,
                    border: isReviewColumn
                      ? '1px solid rgba(180, 83, 9, .18)'
                      : '1px solid transparent',
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: col.color,
                      flexShrink: 0,
                    }}
                  />

                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: col.color,
                      flex: 1,
                    }}
                  >
                    {col.label}
                  </span>

                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: col.color,
                      opacity: 0.75,
                    }}
                  >
                    {colItems.length}
                  </span>
                </div>

                {/* Cards */}
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                >
                  {colItems.map((item) => {
                    const campaign = Array.isArray(item.campaigns)
                      ? item.campaigns[0]
                      : item.campaigns;

                    const client = Array.isArray(campaign?.clients)
                      ? campaign?.clients[0]
                      : campaign?.clients;

                    const title = item.title ?? 'Post sem título';
                    const format = item.format ?? 'outro';
                    const week = item.week_label ?? 'Sem semana';

                    return (
                      <Link
                        key={item.id}
                        href={`/admin/posts/${item.id}` as Route}
                        className="card kanban-card-link"
                        style={{
                          padding: 12,
                          textDecoration: 'none',
                          color: 'inherit',
                          display: 'block',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: 6,
                            marginBottom: 8,
                          }}
                        >
                          <span
                            className={FMT_CLASS[format] ?? 'fmt'}
                            style={{ fontSize: 11 }}
                          >
                            {FMT_LABEL[format] ?? format}
                          </span>

                          <span
                            className="chip"
                            style={{
                              fontSize: 10,
                              height: 18,
                              background: 'var(--bg-2)',
                            }}
                          >
                            {week}
                          </span>
                        </div>

                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            lineHeight: 1.35,
                            marginBottom: 6,
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical' as const,
                          }}
                        >
                          {title}
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 10,
                          }}
                        >
                          <div
                            className="muted tiny"
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              minWidth: 0,
                            }}
                          >
                            {client?.company_name ?? client?.name ?? '—'}
                          </div>

                          <span
                            className="kanban-card-arrow"
                            style={{
                              color: 'var(--green)',
                              fontSize: 14,
                              flexShrink: 0,
                              fontWeight: 700,
                            }}
                          >
                            →
                          </span>
                        </div>
                      </Link>
                    );
                  })}

                  {colItems.length === 0 && (
                    <div
                      style={{
                        padding: '14px 12px',
                        borderRadius: 10,
                        border: '2px dashed var(--line)',
                        textAlign: 'center',
                        background: 'rgba(255,255,255,.45)',
                      }}
                    >
                      <span className="muted tiny">Nenhum post</span>
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