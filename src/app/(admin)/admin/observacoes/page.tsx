import { Metadata } from 'next';
import Link from 'next/link';
import type { Route } from 'next';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { Icon } from '@/components/ui/Icon';
import { StatusBadge } from '@/components/ui/StatusBadge';
import ResolveCommentButton from '@/components/admin/ResolveCommentButton';
import FilterSelect from '@/components/ui/FilterSelect';

export const metadata: Metadata = { title: 'Observações' };

function formatDate(value?: string | null) {
  if (!value) return '—';

  return new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function buildStatusHref(status: string, cliente?: string) {
  const params = new URLSearchParams();

  if (status !== 'aberta') {
    params.set('status', status);
  }

  if (cliente) {
    params.set('cliente', cliente);
  }

  const query = params.toString();

  return `/admin/observacoes${query ? `?${query}` : ''}` as Route;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

export default async function ObservacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; cliente?: string }>;
}) {
  const { status: filterStatus, cliente: filterCliente } = await searchParams;

  const supabase = await getSupabaseServerClient();

  let query = supabase
    .from('comments_history')
    .select(
      `
      id,
      message,
      status,
      created_at,
      resolved_at,
      user_profiles!user_id(name),
      campaigns(id, name),
      content_items(id, title, format),
      clients(id, name, company_name)
    `
    )
    .order('created_at', { ascending: false });

  if (filterStatus && filterStatus !== 'todos') {
    query = query.eq('status', filterStatus);
  } else if (!filterStatus) {
    query = query.eq('status', 'aberta');
  }

  if (filterCliente) {
    query = query.eq('client_id', filterCliente);
  }

  const [{ data: comments }, { data: clients }, { data: allComments }] =
    await Promise.all([
      query.limit(100),
      supabase
        .from('clients')
        .select('id, name, company_name')
        .eq('status', 'ativo')
        .order('name'),
      supabase.from('comments_history').select('id, status'),
    ]);

  const total = comments?.length ?? 0;

  const totalAbertas =
    allComments?.filter((comment) => comment.status === 'aberta').length ?? 0;

  const totalResolvidas =
    allComments?.filter((comment) => comment.status === 'resolvida').length ??
    0;

  const totalTodas = allComments?.length ?? 0;

  const showing =
    filterStatus === 'resolvida'
      ? 'Resolvidas'
      : filterStatus === 'todos'
        ? 'Todas'
        : 'Abertas';

  const hasFilters = Boolean(filterStatus || filterCliente);

  const statusFilters = [
    { key: 'aberta', label: `Abertas · ${totalAbertas}` },
    { key: 'resolvida', label: `Resolvidas · ${totalResolvidas}` },
    { key: 'todos', label: `Todas · ${totalTodas}` },
  ];

  return (
    <div className="page" style={{ maxWidth: 1180 }}>
      <style>
        {`
          .observations-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            gap: 18px;
            margin-bottom: 22px;
          }

          .observations-summary-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
            margin-bottom: 16px;
          }

          .observations-summary-card {
            background: #fff;
            border: 1px solid var(--line);
            border-radius: 16px;
            padding: 14px 16px;
          }

          .observations-summary-card strong {
            display: block;
            margin-top: 4px;
            font-size: 26px;
            line-height: 1;
            letter-spacing: -0.04em;
          }

          .observations-filter-bar {
            background: #fff;
            border: 1px solid var(--line);
            border-radius: 16px;
            padding: 12px;
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 18px;
            flex-wrap: wrap;
          }

          .observations-filter-chips {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
          }

          .observations-client-filter {
            min-width: 220px;
          }

          .observations-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .observation-card {
            border-radius: 22px;
            padding: 18px;
            background: #fff;
            border: 1px solid var(--line);
          }

          .observation-card.open {
            border-color: var(--orange-100);
            background: var(--orange-50);
          }

          .observation-card-inner {
            display: grid;
            grid-template-columns: auto minmax(0, 1fr) auto;
            gap: 16px;
            align-items: flex-start;
          }

          .observation-avatar {
            width: 38px;
            height: 38px;
            border-radius: 50%;
            background: var(--orange);
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 12px;
            flex-shrink: 0;
          }

          .observation-content {
            min-width: 0;
          }

          .observation-topline {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 10px;
            align-items: center;
          }

          .observation-author {
            font-weight: 800;
            font-size: 13px;
            color: var(--ink);
          }

          .observation-message {
            margin: 0;
            font-size: 14px;
            line-height: 1.6;
            color: var(--ink-2);
            word-break: break-word;
          }

          .observation-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-top: 12px;
            align-items: center;
          }

          .observation-meta-item {
            color: var(--muted);
            font-size: 12px;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            min-width: 0;
          }

          .observation-meta-link {
            color: var(--green);
            font-weight: 700;
            text-decoration: none;
          }

          .observation-meta-link:hover {
            text-decoration: underline;
          }

          .observation-actions {
            display: flex;
            flex-direction: column;
            gap: 8px;
            align-items: flex-end;
            flex-shrink: 0;
          }

          .observation-empty {
            padding: clamp(32px, 8vw, 52px);
            text-align: center;
          }

          @media (max-width: 900px) {
            .observations-header {
              align-items: stretch;
              flex-direction: column;
            }

            .observations-summary-grid {
              grid-template-columns: repeat(3, minmax(0, 1fr));
            }

            .observations-filter-bar {
              align-items: stretch;
              flex-direction: column;
            }

            .observations-filter-chips {
              overflow-x: auto;
              flex-wrap: nowrap;
              padding-bottom: 2px;
            }

            .observations-filter-chips .chip,
            .observations-filter-chips .btn {
              flex-shrink: 0;
            }

            .observations-client-filter {
              min-width: 0;
              width: 100%;
            }

            .observation-card-inner {
              grid-template-columns: auto minmax(0, 1fr);
            }

            .observation-actions {
              grid-column: 1 / -1;
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              width: 100%;
              align-items: stretch;
            }

            .observation-actions .btn {
              width: 100%;
            }
          }

          @media (max-width: 640px) {
            .observations-summary-grid {
              grid-template-columns: 1fr;
            }

            .observation-card {
              border-radius: 20px;
              padding: 16px;
            }

            .observation-card-inner {
              gap: 12px;
            }

            .observation-avatar {
              width: 34px;
              height: 34px;
              font-size: 11px;
            }

            .observation-actions {
              grid-template-columns: 1fr;
            }

            .observation-meta {
              gap: 9px;
            }

            .observation-meta-item {
              max-width: 100%;
            }
          }
        `}
      </style>

      {/* Header */}
      <div className="observations-header">
        <div>
          <div className="eyebrow">Tucan · Interno</div>

          <h1 className="h1" style={{ marginTop: 6 }}>
            Observações
          </h1>

          <p className="muted" style={{ marginTop: 6, fontSize: 14 }}>
            {total} observação{total !== 1 ? 'ões' : ''}{' '}
            {showing.toLowerCase()} encontrada{total !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="observations-summary-grid">
        <div className="observations-summary-card">
          <span
            className="tiny"
            style={{ color: 'var(--orange)', fontWeight: 800 }}
          >
            Abertas
          </span>
          <strong style={{ color: 'var(--orange)' }}>{totalAbertas}</strong>
        </div>

        <div className="observations-summary-card">
          <span
            className="tiny"
            style={{ color: 'var(--green)', fontWeight: 800 }}
          >
            Resolvidas
          </span>
          <strong style={{ color: 'var(--green)' }}>{totalResolvidas}</strong>
        </div>

        <div className="observations-summary-card">
          <span className="muted tiny">Total</span>
          <strong>{totalTodas}</strong>
        </div>
      </div>

      {/* Filter bar */}
      <div className="observations-filter-bar">
        <div className="observations-filter-chips">
          {statusFilters.map((filter) => {
            const active =
              (!filterStatus && filter.key === 'aberta') ||
              filterStatus === filter.key;

            return (
              <Link
                key={filter.key}
                href={buildStatusHref(filter.key, filterCliente)}
                className="chip"
                style={{
                  textDecoration: 'none',
                  height: 32,
                  background: active ? 'var(--green)' : undefined,
                  color: active ? '#fff' : undefined,
                }}
              >
                {filter.label}
              </Link>
            );
          })}

          {hasFilters && (
            <Link
              href="/admin/observacoes"
              className="btn btn-ghost btn-sm"
              style={{ fontSize: 12 }}
            >
              Limpar filtros
            </Link>
          )}
        </div>

        <div style={{ flex: 1 }} />

        {clients && clients.length > 0 && (
          <div className="observations-client-filter">
            <FilterSelect
              basePath="/admin/observacoes"
              paramName="cliente"
              value={filterCliente ?? ''}
              preserveParams={{
                status:
                  filterStatus && filterStatus !== 'aberta'
                    ? filterStatus
                    : undefined,
              }}
              placeholder="Todos os clientes"
              options={clients.map((client) => ({
                value: client.id,
                label: client.company_name || client.name || 'Cliente',
              }))}
              style={{
                width: '100%',
                height: 38,
                borderRadius: 12,
              }}
            />
          </div>
        )}
      </div>

      {/* List */}
      <div className="observations-list">
        {total === 0 && (
          <div className="card observation-empty">
            <Icon
              name="message-circle"
              size={28}
              color="var(--muted-2)"
            />

            <p className="muted" style={{ margin: '12px 0 0' }}>
              Nenhuma observação {showing.toLowerCase()} encontrada.
            </p>

            {hasFilters && (
              <Link
                href="/admin/observacoes"
                className="btn btn-ghost btn-sm"
                style={{ marginTop: 14 }}
              >
                Limpar filtros
              </Link>
            )}
          </div>
        )}

        {comments?.map((comment) => {
          const authorProfile = Array.isArray(comment.user_profiles)
            ? comment.user_profiles[0]
            : comment.user_profiles;

          const author = authorProfile?.name ?? 'Usuário';

          const campaign = Array.isArray(comment.campaigns)
            ? comment.campaigns[0]
            : comment.campaigns;

          const item = Array.isArray(comment.content_items)
            ? comment.content_items[0]
            : comment.content_items;

          const client = Array.isArray(comment.clients)
            ? comment.clients[0]
            : comment.clients;

          const isOpen = comment.status === 'aberta';

          return (
            <div
              key={comment.id}
              className={`observation-card ${isOpen ? 'open' : ''}`}
            >
              <div className="observation-card-inner">
                {/* Avatar */}
                <div
                  className="observation-avatar"
                  style={{
                    background: isOpen ? 'var(--orange)' : 'var(--green)',
                  }}
                >
                  {getInitials(author)}
                </div>

                {/* Content */}
                <div className="observation-content">
                  <div className="observation-topline">
                    <span className="observation-author">{author}</span>

                    {client && (
                      <span className="chip" style={{ fontSize: 11 }}>
                        {client.company_name ?? client.name}
                      </span>
                    )}

                    <StatusBadge
                      kind={isOpen ? 'aguardando' : 'aprovado'}
                      label={isOpen ? 'Aberta' : 'Resolvida'}
                    />
                  </div>

                  <p className="observation-message">{comment.message}</p>

                  <div className="observation-meta">
                    <span className="observation-meta-item">
                      <Icon name="clock" size={12} />
                      Criada em {formatDate(comment.created_at)}
                    </span>

                    {!isOpen && comment.resolved_at && (
                      <span className="observation-meta-item">
                        <Icon name="check" size={12} />
                        Resolvida em {formatDate(comment.resolved_at)}
                      </span>
                    )}

                    {campaign && (
                      <Link
                        href={`/admin/cronogramas/${campaign.id}` as Route}
                        className="observation-meta-item observation-meta-link"
                      >
                        <Icon name="calendar" size={12} />
                        <span>{campaign.name}</span>
                      </Link>
                    )}

                    {item && (
                      <Link
                        href={`/admin/posts/${item.id}` as Route}
                        className="observation-meta-item observation-meta-link"
                      >
                        <Icon name="file" size={12} />
                        <span>{item.title}</span>
                      </Link>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="observation-actions">
                  {item && (
                    <Link
                      href={`/admin/posts/${item.id}` as Route}
                      className="btn btn-primary btn-sm"
                      style={{
                        whiteSpace: 'nowrap',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon name="arrow" size={14} />
                      Ver card
                    </Link>
                  )}

                  {isOpen && <ResolveCommentButton commentId={comment.id} />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}