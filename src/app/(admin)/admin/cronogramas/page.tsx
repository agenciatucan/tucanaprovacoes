import { Metadata } from 'next';
import Link from 'next/link';
import type { Route } from 'next';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Icon } from '@/components/ui/Icon';
import SearchInput from '@/components/ui/SearchInput';
import Pagination from '@/components/ui/Pagination';

const PAGE_SIZE = 20;

export const metadata: Metadata = { title: 'Cronogramas' };

const TYPE_LABEL: Record<string, string> = {
  mensal: 'Mensal',
  quinzenal: 'Quinzenal',
  semanal: 'Semanal',
  campanha: 'Campanha',
};

const STATUS_KIND: Record<string, Parameters<typeof StatusBadge>[0]['kind']> = {
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

function formatDate(value?: string | null) {
  if (!value) return '—';

  return new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getClientName(client: any) {
  if (!client) return '—';

  return client.company_name ?? client.name ?? '—';
}

function getProgress(items: Array<{ general_status: string }>) {
  const total = items.length;

  const approved = items.filter((item) =>
    ['aprovado', 'finalizado'].includes(item.general_status)
  ).length;

  const percentage = total ? Math.round((approved / total) * 100) : 0;

  return {
    total,
    approved,
    percentage,
  };
}

function buildFilterHref(status: string, search?: string) {
  const params = new URLSearchParams();

  if (status !== 'todos') {
    params.set('status', status);
  }

  if (search?.trim()) {
    params.set('search', search.trim());
  }

  const query = params.toString();

  return `/admin/cronogramas${query ? `?${query}` : ''}` as Route;
}

function buildPageHref(page: number, status?: string, search?: string) {
  const params = new URLSearchParams();

  if (status && status !== 'todos') params.set('status', status);
  if (search?.trim()) params.set('search', search.trim());
  if (page > 1) params.set('page', String(page));

  const query = params.toString();
  return `/admin/cronogramas${query ? `?${query}` : ''}`;
}

export default async function AdminCronogramasPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>;
}) {
  const { status: filterStatus, search: filterSearch, page: pageParam } = await searchParams;

  const currentPage = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const supabase = await getSupabaseServerClient();

  let baseQuery = supabase
    .from('campaigns')
    .select(
      'id, name, type, status, period_label, created_at, updated_at, clients(id, name, company_name), content_items(id, general_status)',
      { count: 'exact' }
    )
    .order('updated_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (filterStatus && filterStatus !== 'todos') {
    baseQuery = baseQuery.eq('status', filterStatus);
  } else {
    baseQuery = baseQuery.not('status', 'eq', 'arquivado');
  }

  if (filterSearch?.trim()) {
    baseQuery = baseQuery.ilike('name', `%${filterSearch.trim()}%`);
  }

  const [{ data: campaigns, count: totalCount }, { data: allCampaigns }] = await Promise.all([
    baseQuery,
    supabase.from('campaigns').select('id, status'),
  ]);

  const campaignList = campaigns ?? [];
  const allCampaignList = allCampaigns ?? [];
  const totalPages = Math.ceil((totalCount ?? 0) / PAGE_SIZE);

  const totalAtivos = allCampaignList.filter(
    (campaign) => campaign.status !== 'arquivado'
  ).length;

  const totalRascunhos = allCampaignList.filter(
    (campaign) => campaign.status === 'rascunho'
  ).length;

  const totalAguardando = allCampaignList.filter(
    (campaign) => campaign.status === 'enviado_para_aprovacao'
  ).length;

  const totalRevisao = allCampaignList.filter(
    (campaign) => campaign.status === 'em_revisao'
  ).length;

  const totalArquivados = allCampaignList.filter(
    (campaign) => campaign.status === 'arquivado'
  ).length;

  const filters = [
    { key: 'todos', label: `Ativos · ${totalAtivos}` },
    { key: 'rascunho', label: `Rascunho · ${totalRascunhos}` },
    {
      key: 'enviado_para_aprovacao',
      label: `Aguardando · ${totalAguardando}`,
    },
    { key: 'em_revisao', label: `Em revisão · ${totalRevisao}` },
    { key: 'aprovado', label: 'Aprovados' },
    { key: 'em_producao', label: 'Em produção' },
    { key: 'finalizado', label: 'Finalizados' },
    { key: 'arquivado', label: `Arquivados · ${totalArquivados}` },
  ];

  const hasFilters = Boolean(filterStatus || filterSearch);

  return (
    <div className="page" style={{ maxWidth: 1320 }}>
      <style>
        {`
          .campaigns-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            gap: 18px;
            margin-bottom: 22px;
          }

          .campaigns-summary-grid {
            display: grid;
            grid-template-columns: repeat(5, minmax(0, 1fr));
            gap: 12px;
            margin-bottom: 16px;
          }

          .campaigns-summary-card {
            background: #fff;
            border: 1px solid var(--line);
            border-radius: 16px;
            padding: 14px 16px;
          }

          .campaigns-summary-card strong {
            display: block;
            margin-top: 4px;
            font-size: 26px;
            line-height: 1;
            letter-spacing: -0.04em;
          }

          .campaigns-filter-bar {
            background: #fff;
            border: 1px solid var(--line);
            border-radius: 16px;
            padding: 12px;
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 16px;
            flex-wrap: wrap;
          }

          .campaigns-filter-search {
            min-width: 280px;
            flex: 1;
          }

          .campaigns-filter-chips {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
          }

          .campaigns-table {
            background: #fff;
            border: 1px solid var(--line);
            border-radius: var(--r-lg);
            overflow: hidden;
          }

          .campaigns-table-head,
          .campaigns-table-row {
            display: grid;
            grid-template-columns: 2.3fr 1.2fr .8fr 1fr .9fr 50px;
            gap: 16px;
            align-items: center;
          }

          .campaigns-table-head {
            padding: 12px 20px;
            background: var(--bg);
            border-bottom: 1px solid var(--line);
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: var(--muted);
          }

          .campaigns-table-row {
            padding: 15px 20px;
            text-decoration: none;
            color: inherit;
            border-bottom: 1px solid var(--line-soft);
            transition: background .12s ease;
          }

          .campaigns-table-row:hover {
            background: #fafafa;
          }

          .campaigns-table-row:last-child {
            border-bottom: 0;
          }

          .campaigns-title {
            font-weight: 800;
            font-size: 14px;
            color: var(--ink);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .campaigns-subtitle {
            margin-top: 3px;
            color: var(--muted);
            font-size: 12px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .campaigns-mobile-list {
            display: none;
          }

          .campaign-mobile-card {
            display: block;
            background: #fff;
            border: 1px solid var(--line);
            border-radius: 22px;
            padding: 16px;
            color: inherit;
            text-decoration: none;
            box-shadow: 0 1px 2px rgba(0,0,0,.03);
          }

          .campaign-mobile-card + .campaign-mobile-card {
            margin-top: 10px;
          }

          .campaign-mobile-top {
            display: flex;
            gap: 13px;
            align-items: flex-start;
          }

          .campaign-mobile-icon {
            width: 46px;
            height: 46px;
            border-radius: 16px;
            background: var(--green-50);
            color: var(--green);
            display: grid;
            place-items: center;
            flex-shrink: 0;
          }

          .campaign-mobile-content {
            flex: 1;
            min-width: 0;
          }

          .campaign-mobile-title-row {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 10px;
          }

          .campaign-mobile-title {
            color: var(--ink);
            font-size: 16px;
            font-weight: 800;
            line-height: 1.25;
            letter-spacing: -0.03em;
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
          }

          .campaign-mobile-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 12px;
          }

          .campaign-mobile-progress {
            margin-top: 14px;
            padding-top: 12px;
            border-top: 1px solid var(--line-soft);
          }

          .campaign-mobile-progress-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 8px;
          }

          .campaign-mobile-footer {
            margin-top: 14px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
          }

          @media (max-width: 1020px) {
            .campaigns-summary-grid {
              grid-template-columns: repeat(3, minmax(0, 1fr));
            }

            .campaigns-filter-bar {
              align-items: stretch;
              flex-direction: column;
            }

            .campaigns-filter-search {
              min-width: 0;
              width: 100%;
            }

            .campaigns-filter-chips {
              overflow-x: auto;
              flex-wrap: nowrap;
              padding-bottom: 2px;
            }

            .campaigns-filter-chips .chip,
            .campaigns-filter-chips .btn {
              flex-shrink: 0;
            }

            .campaigns-desktop-table {
              display: none;
            }

            .campaigns-mobile-list {
              display: block;
            }
          }

          @media (max-width: 760px) {
            .campaigns-header {
              align-items: stretch;
              flex-direction: column;
            }

            .campaigns-summary-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
          }

          @media (max-width: 520px) {
            .campaigns-summary-grid {
              grid-template-columns: 1fr;
            }

            .campaign-mobile-top {
              gap: 10px;
            }

            .campaign-mobile-icon {
              display: none;
            }

            .campaign-mobile-footer {
              align-items: flex-start;
              flex-direction: column;
            }
          }
        `}
      </style>

      {/* Header */}
      <div className="campaigns-header">
        <div>
          <div className="eyebrow">Tucan · Interno</div>

          <h1 className="h1" style={{ marginTop: 6 }}>
            Cronogramas
          </h1>

          <p className="muted" style={{ marginTop: 6, fontSize: 14 }}>
            {totalCount ?? 0}{' '}
            {(totalCount ?? 0) === 1
              ? 'cronograma encontrado'
              : 'cronogramas encontrados'}
          </p>
        </div>

        <Link href="/admin/cronogramas/novo" className="btn btn-primary">
          <Icon name="plus" size={16} />
          Novo cronograma
        </Link>
      </div>

      {/* Summary */}
      <div className="campaigns-summary-grid">
        <div className="campaigns-summary-card">
          <span className="muted tiny">Ativos</span>
          <strong>{totalAtivos}</strong>
        </div>

        <div className="campaigns-summary-card">
          <span
            className="tiny"
            style={{ color: 'var(--muted)', fontWeight: 800 }}
          >
            Rascunhos
          </span>
          <strong style={{ color: 'var(--muted)' }}>{totalRascunhos}</strong>
        </div>

        <div className="campaigns-summary-card">
          <span
            className="tiny"
            style={{ color: 'var(--orange)', fontWeight: 800 }}
          >
            Aguardando
          </span>
          <strong style={{ color: 'var(--orange)' }}>
            {totalAguardando}
          </strong>
        </div>

        <div className="campaigns-summary-card">
          <span
            className="tiny"
            style={{ color: '#92400e', fontWeight: 800 }}
          >
            Em revisão
          </span>
          <strong style={{ color: '#92400e' }}>{totalRevisao}</strong>
        </div>

        <div className="campaigns-summary-card">
          <span
            className="tiny"
            style={{ color: 'var(--muted)', fontWeight: 800 }}
          >
            Arquivados
          </span>
          <strong style={{ color: 'var(--muted)' }}>
            {totalArquivados}
          </strong>
        </div>
      </div>

      {/* Filters */}
      <div className="campaigns-filter-bar">
        <div className="campaigns-filter-search">
          <SearchInput
            basePath="/admin/cronogramas"
            paramName="search"
            defaultValue={filterSearch ?? ''}
            preserveParams={{
              status:
                filterStatus && filterStatus !== 'todos'
                  ? filterStatus
                  : undefined,
            }}
            placeholder="Buscar cronograma…"
          />
        </div>

        <div className="campaigns-filter-chips">
          {filters.map((filter) => {
            const active =
              (!filterStatus && filter.key === 'todos') ||
              filterStatus === filter.key;

            return (
              <Link
                key={filter.key}
                href={buildFilterHref(filter.key, filterSearch)}
                className="chip"
                style={{
                  height: 32,
                  textDecoration: 'none',
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
              href="/admin/cronogramas"
              className="btn btn-ghost btn-sm"
              style={{ fontSize: 12 }}
            >
              Limpar filtros
            </Link>
          )}
        </div>
      </div>

      {/* Empty */}
      {campaignList.length === 0 && (
        <div
          className="card"
          style={{
            padding: 'clamp(32px, 8vw, 52px)',
            textAlign: 'center',
          }}
        >
          <p className="muted" style={{ marginBottom: 12 }}>
            {hasFilters
              ? 'Nenhum cronograma corresponde aos filtros aplicados.'
              : 'Nenhum cronograma cadastrado ainda.'}
          </p>

          {!hasFilters && (
            <Link href="/admin/cronogramas/novo" className="btn btn-primary">
              <Icon name="plus" size={16} />
              Criar primeiro cronograma
            </Link>
          )}
        </div>
      )}

      {campaignList.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="campaigns-table campaigns-desktop-table">
            <div className="campaigns-table-head">
              <div>Cronograma</div>
              <div>Cliente</div>
              <div>Tipo</div>
              <div>Progresso</div>
              <div>Status</div>
              <div />
            </div>

            {campaignList.map((campaign) => {
              const client = Array.isArray(campaign.clients)
                ? campaign.clients[0]
                : campaign.clients;

              const items = Array.isArray(campaign.content_items)
                ? campaign.content_items
                : [];

              const { total, approved, percentage } = getProgress(items);
              const kind = STATUS_KIND[campaign.status] ?? 'rascunho';
              const label = STATUS_LABEL[campaign.status];

              return (
                <Link
                  key={campaign.id}
                  href={`/admin/cronogramas/${campaign.id}` as Route}
                  className="campaigns-table-row"
                >
                  <div style={{ minWidth: 0 }}>
                    <div className="campaigns-title">{campaign.name}</div>

                    <div className="campaigns-subtitle">
                      {campaign.period_label || 'Sem período'} · Atualizado em{' '}
                      {formatDate(campaign.updated_at ?? campaign.created_at)}
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--ink-2)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {getClientName(client)}
                  </div>

                  <div>
                    <span className="chip" style={{ fontSize: 11 }}>
                      {TYPE_LABEL[campaign.type] ?? campaign.type}
                    </span>
                  </div>

                  <div>
                    {total > 0 ? (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <div
                          className="progress"
                          style={{ flex: 1, maxWidth: 110 }}
                        >
                          <div
                            className="progress-fill"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>

                        <span className="tiny muted" style={{ flexShrink: 0 }}>
                          {approved}/{total}
                        </span>
                      </div>
                    ) : (
                      <span className="muted tiny">Sem posts</span>
                    )}
                  </div>

                  <div>
                    <StatusBadge kind={kind} label={label} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Icon name="chevron" size={14} color="var(--muted-2)" />
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Paginação desktop */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            buildHref={(p) => buildPageHref(p, filterStatus, filterSearch)}
          />

          {/* Mobile cards */}
          <div className="campaigns-mobile-list">
            {campaignList.map((campaign) => {
              const client = Array.isArray(campaign.clients)
                ? campaign.clients[0]
                : campaign.clients;

              const items = Array.isArray(campaign.content_items)
                ? campaign.content_items
                : [];

              const { total, approved, percentage } = getProgress(items);
              const kind = STATUS_KIND[campaign.status] ?? 'rascunho';
              const label = STATUS_LABEL[campaign.status];

              return (
                <Link
                  key={campaign.id}
                  href={`/admin/cronogramas/${campaign.id}` as Route}
                  className="campaign-mobile-card"
                >
                  <div className="campaign-mobile-top">
                    <div className="campaign-mobile-icon">
                      <Icon name="calendar" size={22} stroke={1.8} />
                    </div>

                    <div className="campaign-mobile-content">
                      <div className="campaign-mobile-title-row">
                        <div style={{ minWidth: 0 }}>
                          <div className="campaign-mobile-title">
                            {campaign.name}
                          </div>

                          <div
                            className="muted tiny"
                            style={{
                              marginTop: 5,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {getClientName(client)}
                          </div>
                        </div>

                        <Icon
                          name="chevron"
                          size={16}
                          color="var(--muted-2)"
                        />
                      </div>

                      <div className="campaign-mobile-meta">
                        <span className="chip" style={{ fontSize: 11 }}>
                          {TYPE_LABEL[campaign.type] ?? campaign.type}
                        </span>

                        <StatusBadge kind={kind} label={label} />
                      </div>

                      <div className="muted tiny" style={{ marginTop: 12 }}>
                        {campaign.period_label || 'Sem período'} · Atualizado em{' '}
                        {formatDate(
                          campaign.updated_at ?? campaign.created_at
                        )}
                      </div>

                      <div className="campaign-mobile-progress">
                        {total > 0 ? (
                          <>
                            <div className="campaign-mobile-progress-row">
                              <span className="tiny muted">
                                Progresso
                              </span>

                              <span
                                className="tiny"
                                style={{
                                  color: 'var(--muted)',
                                  fontWeight: 800,
                                }}
                              >
                                {approved}/{total} aprovados
                              </span>
                            </div>

                            <div className="progress">
                              <div
                                className="progress-fill"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </>
                        ) : (
                          <span className="muted tiny">
                            Sem posts cadastrados
                          </span>
                        )}
                      </div>

                      <div className="campaign-mobile-footer">
                        <span
                          className="tiny"
                          style={{
                            color: 'var(--green)',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                          }}
                        >
                          Abrir cronograma
                          <Icon name="arrow" size={12} />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Paginação mobile */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            buildHref={(p) => buildPageHref(p, filterStatus, filterSearch)}
          />
        </>
      )}
    </div>
  );
}