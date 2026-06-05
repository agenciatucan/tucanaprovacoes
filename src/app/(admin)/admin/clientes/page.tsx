import { Metadata } from 'next';
import Link from 'next/link';
import type { Route } from 'next';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Icon } from '@/components/ui/Icon';
import SearchInput from '@/components/ui/SearchInput';

export const metadata: Metadata = { title: 'Clientes' };

const ACCENT_COLORS = [
  '#25411e',
  '#eb6013',
  '#92400e',
  '#1d4ed8',
  '#7c3aed',
  '#db2777',
  '#066a3a',
  '#5a5a5a',
];

function getClientInitials(name?: string | null, companyName?: string | null) {
  const base = name?.trim() || companyName?.trim() || 'Cliente';

  return base
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

function formatClientName(name?: string | null) {
  return name?.trim() || 'Cliente sem nome';
}

function formatCompanyName(companyName?: string | null) {
  return companyName?.trim() || 'Sem empresa cadastrada';
}

function formatEmail(email?: string | null) {
  return email?.trim() || 'Sem e-mail cadastrado';
}

export default async function AdminClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>;
}) {
  const { status: filterStatus, search: filterSearch } = await searchParams;

  const supabase = await getSupabaseServerClient();

  let query = supabase
    .from('clients')
    .select(
      'id, name, company_name, email, status, internal_owner_id, created_at, logo_url, user_profiles(name)'
    )
    .order('created_at', { ascending: false });

  if (filterStatus && filterStatus !== 'todos') {
    query = query.eq('status', filterStatus);
  }

  if (filterSearch?.trim()) {
    const q = filterSearch.trim();

    query = query.or(
      `name.ilike.%${q}%,company_name.ilike.%${q}%,email.ilike.%${q}%`
    );
  }

  const { data: clients } = await query;

  const { data: allClients } = await supabase
    .from('clients')
    .select('id, status');

  const totalAll = allClients?.length ?? 0;
  const totalAtivos =
    allClients?.filter((client) => client.status === 'ativo').length ?? 0;
  const totalInativos =
    allClients?.filter((client) => client.status === 'inativo').length ?? 0;
  const totalShown = clients?.length ?? 0;

  const filterChips = [
    { key: 'todos', label: `Todos · ${totalAll}` },
    { key: 'ativo', label: `Ativos · ${totalAtivos}` },
    { key: 'inativo', label: `Inativos · ${totalInativos}` },
  ];

  function chipHref(key: string) {
    const base = '/admin/clientes';
    const params = new URLSearchParams();

    if (filterSearch) {
      params.set('search', filterSearch);
    }

    if (key !== 'todos') {
      params.set('status', key);
    }

    const qs = params.toString();

    return `${base}${qs ? `?${qs}` : ''}` as Route;
  }

  return (
    <div className="page" style={{ maxWidth: 1320 }}>
      <style>
        {`
          .clients-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            gap: 18px;
            margin-bottom: 22px;
          }

          .clients-summary-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
            margin-bottom: 16px;
          }

          .clients-summary-card {
            background: #fff;
            border: 1px solid var(--line);
            border-radius: 16px;
            padding: 14px 16px;
          }

          .clients-summary-card strong {
            display: block;
            margin-top: 4px;
            font-size: 26px;
            line-height: 1;
            letter-spacing: -0.04em;
          }

          .clients-filter-bar {
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

          .clients-filter-search {
            min-width: 280px;
            flex: 1;
          }

          .clients-filter-chips {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
          }

          .clients-table {
            background: #fff;
            border: 1px solid var(--line);
            border-radius: var(--r-lg);
            overflow: hidden;
          }

          .clients-table-head,
          .clients-table-row {
            display: grid;
            grid-template-columns: 2.2fr 1.4fr 1fr 0.8fr 60px;
            gap: 16px;
            align-items: center;
          }

          .clients-table-head {
            padding: 12px 20px;
            background: var(--bg);
            border-bottom: 1px solid var(--line);
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: var(--muted);
          }

          .clients-table-row {
            padding: 14px 20px;
            text-decoration: none;
            color: inherit;
            border-bottom: 1px solid var(--line-soft);
            transition: background .12s ease;
          }

          .clients-table-row:hover {
            background: #fafafa;
          }

          .clients-table-row:last-child {
            border-bottom: 0;
          }

          .clients-mobile-list {
            display: none;
          }

          .client-avatar {
            width: 38px;
            height: 38px;
            border-radius: 12px;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 13px;
            flex-shrink: 0;
          }

          .client-main {
            display: flex;
            align-items: center;
            gap: 12px;
            min-width: 0;
          }

          .client-title {
            font-weight: 700;
            font-size: 14px;
            color: var(--ink);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .client-subtitle {
            margin-top: 2px;
            color: var(--muted);
            font-size: 12px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .client-mobile-card {
            display: block;
            background: #fff;
            border: 1px solid var(--line);
            border-radius: 20px;
            padding: 16px;
            color: inherit;
            text-decoration: none;
            box-shadow: 0 1px 2px rgba(0,0,0,.03);
          }

          .client-mobile-card + .client-mobile-card {
            margin-top: 10px;
          }

          .client-mobile-card-top {
            display: flex;
            gap: 12px;
            align-items: flex-start;
          }

          .client-mobile-card-content {
            min-width: 0;
            flex: 1;
          }

          .client-mobile-card-row {
            display: flex;
            align-items: center;
            gap: 7px;
            margin-top: 10px;
            color: var(--muted);
            font-size: 12px;
            min-width: 0;
          }

          .client-mobile-card-row span {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .client-mobile-card-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            margin-top: 14px;
            padding-top: 12px;
            border-top: 1px solid var(--line-soft);
          }

          @media (max-width: 900px) {
            .clients-header {
              align-items: stretch;
              flex-direction: column;
            }

            .clients-summary-grid {
              grid-template-columns: repeat(3, minmax(0, 1fr));
            }

            .clients-filter-bar {
              align-items: stretch;
              flex-direction: column;
            }

            .clients-filter-search {
              min-width: 0;
              width: 100%;
            }

            .clients-filter-chips {
              overflow-x: auto;
              flex-wrap: nowrap;
              padding-bottom: 2px;
            }

            .clients-filter-chips .chip,
            .clients-filter-chips .btn {
              flex-shrink: 0;
            }

            .clients-desktop-table {
              display: none;
            }

            .clients-mobile-list {
              display: block;
            }
          }

          @media (max-width: 640px) {
            .clients-summary-grid {
              grid-template-columns: 1fr;
            }

            .clients-summary-card {
              padding: 13px 14px;
            }

            .clients-summary-card strong {
              font-size: 24px;
            }
          }
        `}
      </style>

      {/* Header */}
      <div className="clients-header">
        <div>
          <div className="eyebrow">Tucan · Interno</div>

          <h1 className="h1" style={{ marginTop: 6 }}>
            Clientes
          </h1>

          <p className="muted" style={{ marginTop: 6, fontSize: 14 }}>
            {filterSearch || (filterStatus && filterStatus !== 'todos')
              ? `${totalShown} resultado${totalShown !== 1 ? 's' : ''} encontrado${
                  totalShown !== 1 ? 's' : ''
                }`
              : `${totalAll} clientes cadastrados`}
          </p>
        </div>

        <Link href="/admin/clientes/novo" className="btn btn-primary">
          <Icon name="plus" size={16} />
          Novo cliente
        </Link>
      </div>

      {/* Summary */}
      <div className="clients-summary-grid">
        <div className="clients-summary-card">
          <span className="muted tiny">Total</span>
          <strong>{totalAll}</strong>
        </div>

        <div className="clients-summary-card">
          <span
            className="tiny"
            style={{ color: 'var(--green)', fontWeight: 800 }}
          >
            Ativos
          </span>
          <strong style={{ color: 'var(--green)' }}>{totalAtivos}</strong>
        </div>

        <div className="clients-summary-card">
          <span
            className="tiny"
            style={{ color: 'var(--muted)', fontWeight: 800 }}
          >
            Inativos
          </span>
          <strong style={{ color: 'var(--muted)' }}>{totalInativos}</strong>
        </div>
      </div>

      {/* Filter bar */}
      <div className="clients-filter-bar">
        <div className="clients-filter-search">
          <SearchInput
            basePath="/admin/clientes"
            paramName="search"
            defaultValue={filterSearch ?? ''}
            preserveParams={{
              status:
                filterStatus && filterStatus !== 'todos'
                  ? filterStatus
                  : undefined,
            }}
            placeholder="Buscar cliente, empresa, e-mail…"
          />
        </div>

        <div className="clients-filter-chips">
          {filterChips.map((filter) => {
            const active =
              (!filterStatus && filter.key === 'todos') ||
              filterStatus === filter.key;

            return (
              <Link
                key={filter.key}
                href={chipHref(filter.key)}
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

          {(filterStatus || filterSearch) && (
            <Link
              href="/admin/clientes"
              className="btn btn-ghost btn-sm"
              style={{ fontSize: 12 }}
            >
              Limpar filtros
            </Link>
          )}
        </div>
      </div>

      {(!clients || clients.length === 0) && (
        <div
          className="card"
          style={{
            padding: 'clamp(32px, 8vw, 52px)',
            textAlign: 'center',
          }}
        >
          <p className="muted" style={{ marginBottom: 12 }}>
            {filterSearch || filterStatus
              ? 'Nenhum cliente corresponde aos filtros aplicados.'
              : 'Nenhum cliente cadastrado ainda.'}
          </p>

          {!filterSearch && !filterStatus && (
            <Link href="/admin/clientes/novo" className="btn btn-primary">
              <Icon name="plus" size={16} />
              Adicionar primeiro cliente
            </Link>
          )}
        </div>
      )}

      {clients && clients.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="clients-table clients-desktop-table">
            <div className="clients-table-head">
              <div>Cliente</div>
              <div>E-mail</div>
              <div>Responsável</div>
              <div>Status</div>
              <div />
            </div>

            {clients.map((client, index) => {
              const initials = getClientInitials(
                client.name,
                client.company_name
              );
              const accentColor =
                ACCENT_COLORS[index % ACCENT_COLORS.length]!;
              const owner = Array.isArray(client.user_profiles)
                ? client.user_profiles[0]
                : client.user_profiles;

              return (
                <Link
                  key={client.id}
                  href={`/admin/clientes/${client.id}` as Route}
                  className="clients-table-row"
                >
                  <div className="client-main">
                    <div
                      className="client-avatar"
                      style={{ background: client.logo_url ? 'var(--bg)' : accentColor, border: client.logo_url ? '1px solid var(--line)' : 'none', overflow: 'hidden' }}
                    >
                      {client.logo_url
                        ? <img src={client.logo_url} alt={client.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }} />
                        : initials}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div className="client-title">
                        {formatClientName(client.name)}
                      </div>

                      <div className="client-subtitle">
                        {formatCompanyName(client.company_name)}
                      </div>
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
                    {formatEmail(client.email)}
                  </div>

                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--muted)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {owner?.name ?? '—'}
                  </div>

                  <div>
                    <StatusBadge
                      kind={
                        client.status === 'ativo' ? 'aprovado' : 'rascunho'
                      }
                      label={client.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Icon
                      name="chevron"
                      size={14}
                      color="var(--muted-2)"
                    />
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Mobile cards */}
          <div className="clients-mobile-list">
            {clients.map((client, index) => {
              const initials = getClientInitials(
                client.name,
                client.company_name
              );
              const accentColor =
                ACCENT_COLORS[index % ACCENT_COLORS.length]!;
              const owner = Array.isArray(client.user_profiles)
                ? client.user_profiles[0]
                : client.user_profiles;

              return (
                <Link
                  key={client.id}
                  href={`/admin/clientes/${client.id}` as Route}
                  className="client-mobile-card"
                >
                  <div className="client-mobile-card-top">
                    <div
                      className="client-avatar"
                      style={{
                        background: client.logo_url ? 'var(--bg)' : accentColor,
                        border: client.logo_url ? '1px solid var(--line)' : 'none',
                        width: 44,
                        height: 44,
                        borderRadius: 16,
                        overflow: 'hidden',
                      }}
                    >
                      {client.logo_url
                        ? <img src={client.logo_url} alt={client.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }} />
                        : initials}
                    </div>

                    <div className="client-mobile-card-content">
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 10,
                          alignItems: 'flex-start',
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 16,
                              fontWeight: 800,
                              lineHeight: 1.2,
                              letterSpacing: '-0.03em',
                              color: 'var(--ink)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {formatClientName(client.name)}
                          </div>

                          <div className="muted tiny" style={{ marginTop: 3 }}>
                            {formatCompanyName(client.company_name)}
                          </div>
                        </div>

                        <Icon
                          name="chevron"
                          size={16}
                          color="var(--muted-2)"
                        />
                      </div>

                      <div className="client-mobile-card-row">
                        <Icon name="file" size={12} />
                        <span>{formatEmail(client.email)}</span>
                      </div>

                      <div className="client-mobile-card-row">
                        <Icon name="user" size={12} />
                        <span>Responsável: {owner?.name ?? '—'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="client-mobile-card-footer">
                    <StatusBadge
                      kind={
                        client.status === 'ativo' ? 'aprovado' : 'rascunho'
                      }
                      label={client.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    />

                    <span
                      className="tiny"
                      style={{
                        color: 'var(--green)',
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      Abrir
                      <Icon name="arrow" size={12} />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}