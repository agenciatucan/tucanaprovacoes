import { Metadata } from 'next';
import Link from 'next/link';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Icon } from '@/components/ui/Icon';

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

export default async function AdminClientesPage() {
  const supabase = await getSupabaseServerClient();
<<<<<<< Updated upstream
  const { data: clients } = await supabase
=======

  let query = supabase
>>>>>>> Stashed changes
    .from('clients')
    .select('id, name, company_name, email, status, internal_owner_id, created_at, user_profiles(name)')
    .order('created_at', { ascending: false });

<<<<<<< Updated upstream
  const total = clients?.length ?? 0;
=======
  if (filterStatus && filterStatus !== 'todos') {
    query = query.eq('status', filterStatus);
  }

  if (filterSearch?.trim()) {
    const q = filterSearch.trim();
    query = query.or(`name.ilike.%${q}%,company_name.ilike.%${q}%,email.ilike.%${q}%`);
  }

  const { data: clients } = await query;

  const { data: allClients } = await supabase.from('clients').select('id, status');

  const totalAll = allClients?.length ?? 0;
  const totalAtivos = allClients?.filter((c) => c.status === 'ativo').length ?? 0;
  const totalInat = allClients?.filter((c) => c.status === 'inativo').length ?? 0;
  const totalShown = clients?.length ?? 0;

  const filterChips = [
    { key: 'todos', label: `Todos · ${totalAll}` },
    { key: 'ativo', label: `Ativos · ${totalAtivos}` },
    { key: 'inativo', label: `Inativos · ${totalInat}` },
  ];

  function chipHref(key: string) {
    const base = '/admin/clientes';
    const params = new URLSearchParams();

    if (filterSearch) params.set('search', filterSearch);
    if (key !== 'todos') params.set('status', key);

    const qs = params.toString();
    return `${base}${qs ? `?${qs}` : ''}` as Route;
  }
>>>>>>> Stashed changes

  return (
    <div className="mx-auto w-full max-w-[1320px] overflow-x-hidden px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="eyebrow">Tucan · Interno</div>
<<<<<<< Updated upstream
          <h1 className="h1" style={{ marginTop: 6 }}>Clientes</h1>
          <p className="muted" style={{ marginTop: 6, fontSize: 14 }}>{total} clientes cadastrados</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm"><Icon name="download" size={14} /> Exportar</button>
          <Link href="/admin/clientes/novo" className="btn btn-primary">
            <Icon name="plus" size={16} /> Novo cliente
          </Link>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: 12, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 380 }}>
          <div style={{ position: 'absolute', left: 12, top: 11, pointerEvents: 'none' }}>
            <Icon name="search" size={16} color="var(--muted-2)" />
          </div>
          <input className="input" placeholder="Buscar cliente, empresa…" style={{ paddingLeft: 38, height: 38, borderColor: 'transparent', background: 'var(--bg)' }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="chip" style={{ height: 30, background: 'var(--green)', color: '#fff' }}>Todos · {total}</span>
          <span className="chip" style={{ height: 30 }}>Ativos · {clients?.filter(c => c.status === 'ativo').length ?? 0}</span>
          <span className="chip" style={{ height: 30 }}>Inativos · {clients?.filter(c => c.status === 'inativo').length ?? 0}</span>
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost btn-sm"><Icon name="filter" size={14} /> Filtros</button>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
        {/* Head */}
        <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1.4fr 1fr 0.8fr 60px', gap: 16, padding: '12px 20px', background: 'var(--bg)', borderBottom: '1px solid var(--line)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)' }}>
          <div>Cliente</div>
          <div>E-mail</div>
          <div>Responsável</div>
          <div>Status</div>
          <div />
        </div>

        {clients?.length === 0 && (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
            Nenhum cliente cadastrado ainda.{' '}
            <Link href="/admin/clientes/novo" style={{ color: 'var(--orange)', fontWeight: 600 }}>Adicionar o primeiro →</Link>
=======

          <h1 className="mt-2 text-4xl font-bold tracking-[-0.04em] text-[#1f1f1f] sm:text-5xl lg:text-[42px]">
            Clientes
          </h1>

          <p className="mt-2 text-base leading-relaxed text-[var(--muted)] sm:text-sm">
            {filterSearch || (filterStatus && filterStatus !== 'todos')
              ? `${totalShown} resultado${totalShown !== 1 ? 's' : ''} encontrado${totalShown !== 1 ? 's' : ''}`
              : `${totalAll} clientes cadastrados`}
          </p>
        </div>

        <Link
          href="/admin/clientes/novo"
          className="btn btn-primary w-full justify-center sm:w-auto"
        >
          <Icon name="plus" size={16} />
          Novo cliente
        </Link>
      </div>

      {/* Filter bar */}
      <div className="mb-5 rounded-2xl border border-[var(--line)] bg-white p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="w-full lg:max-w-sm">
            <SearchInput
              basePath="/admin/clientes"
              paramName="search"
              defaultValue={filterSearch ?? ''}
              preserveParams={{
                status: filterStatus && filterStatus !== 'todos' ? filterStatus : undefined,
              }}
              placeholder="Buscar cliente, empresa, e-mail…"
            />
>>>>>>> Stashed changes
          </div>

          <div className="flex w-full gap-2 overflow-x-auto pb-1 lg:w-auto lg:flex-wrap lg:overflow-visible lg:pb-0">
            {filterChips.map((f) => {
              const active = (!filterStatus && f.key === 'todos') || filterStatus === f.key;

<<<<<<< Updated upstream
          return (
            <Link key={c.id} href={`/admin/clientes/${c.id}`} style={{ display: 'grid', gridTemplateColumns: '2.2fr 1.4fr 1fr 0.8fr 60px', gap: 16, padding: '14px 20px', alignItems: 'center', borderBottom: i === clients.length - 1 ? 'none' : '1px solid var(--line-soft)', textDecoration: 'none', color: 'inherit', cursor: 'pointer', transition: 'background .12s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: accentColor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                  {initials}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                  <div className="muted tiny">{c.company_name}</div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{c.email}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>{owner?.name ?? '—'}</div>
              <div><StatusBadge kind={c.status === 'ativo' ? 'aprovado' : 'rascunho'} label={c.status === 'ativo' ? 'Ativo' : 'Inativo'} /></div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Icon name="chevron" size={14} color="var(--muted-2)" />
              </div>
            </Link>
          );
        })}
=======
              return (
                <Link
                  key={f.key}
                  href={chipHref(f.key)}
                  className="chip shrink-0 no-underline"
                  style={{
                    height: 34,
                    background: active ? 'var(--green)' : undefined,
                    color: active ? '#fff' : undefined,
                  }}
                >
                  {f.label}
                </Link>
              );
            })}

            {(filterStatus || filterSearch) && (
              <Link
                href="/admin/clientes"
                className="btn btn-ghost btn-sm shrink-0 text-xs"
              >
                Limpar filtros
              </Link>
            )}
          </div>
        </div>
>>>>>>> Stashed changes
      </div>

      {/* Empty */}
      {(!clients || clients.length === 0) && (
        <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-white px-5 py-12 text-center text-sm text-[var(--muted)]">
          {filterSearch || filterStatus ? (
            'Nenhum cliente corresponde aos filtros aplicados.'
          ) : (
            <>
              Nenhum cliente cadastrado ainda.{' '}
              <Link
                href="/admin/clientes/novo"
                className="font-semibold text-[var(--orange)]"
              >
                Adicionar o primeiro →
              </Link>
            </>
          )}
        </div>
      )}

      {clients && clients.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-[var(--r-lg)] border border-[var(--line)] bg-white lg:block">
            <div className="grid grid-cols-[2.2fr_1.4fr_1fr_0.8fr_60px] gap-4 border-b border-[var(--line)] bg-[var(--bg)] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">
              <div>Cliente</div>
              <div>E-mail</div>
              <div>Responsável</div>
              <div>Status</div>
              <div />
            </div>

            {clients.map((c, i) => {
              const initials = c.name
                .split(' ')
                .slice(0, 2)
                .map((w: string) => w[0])
                .join('')
                .toUpperCase();

              const accentColor = ACCENT_COLORS[i % ACCENT_COLORS.length]!;
              const owner = Array.isArray(c.user_profiles) ? c.user_profiles[0] : c.user_profiles;

              return (
                <Link
                  key={c.id}
                  href={`/admin/clientes/${c.id}` as Route}
                  className="grid grid-cols-[2.2fr_1.4fr_1fr_0.8fr_60px] items-center gap-4 border-b border-[var(--line-soft)] px-5 py-4 text-inherit no-underline transition hover:bg-gray-50 last:border-b-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[13px] font-bold text-white"
                      style={{ background: accentColor }}
                    >
                      {initials}
                    </div>

                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{c.name}</div>
                      <div className="muted tiny truncate">{c.company_name}</div>
                    </div>
                  </div>

                  <div className="truncate text-sm text-[var(--ink-2)]">
                    {c.email}
                  </div>

                  <div className="truncate text-sm text-[var(--muted)]">
                    {owner?.name ?? '—'}
                  </div>

                  <div>
                    <StatusBadge
                      kind={c.status === 'ativo' ? 'aprovado' : 'rascunho'}
                      label={c.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Icon name="chevron" size={14} color="var(--muted-2)" />
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 lg:hidden">
            {clients.map((c, i) => {
              const initials = c.name
                .split(' ')
                .slice(0, 2)
                .map((w: string) => w[0])
                .join('')
                .toUpperCase();

              const accentColor = ACCENT_COLORS[i % ACCENT_COLORS.length]!;
              const owner = Array.isArray(c.user_profiles) ? c.user_profiles[0] : c.user_profiles;

              return (
                <Link
                  key={c.id}
                  href={`/admin/clientes/${c.id}` as Route}
                  className="block rounded-3xl border border-[var(--line)] bg-white p-4 text-inherit no-underline shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white"
                      style={{ background: accentColor }}
                    >
                      {initials}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="truncate text-lg font-bold tracking-[-0.03em] text-[#1f1f1f]">
                            {c.name}
                          </h2>
                          <p className="muted mt-1 truncate text-sm">
                            {c.company_name}
                          </p>
                        </div>

                        <StatusBadge
                          kind={c.status === 'ativo' ? 'aprovado' : 'rascunho'}
                          label={c.status === 'ativo' ? 'Ativo' : 'Inativo'}
                        />
                      </div>

                      <div className="mt-4 space-y-2 text-sm">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">
                            E-mail
                          </p>
                          <p className="break-words text-[var(--ink-2)]">
                            {c.email}
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">
                            Responsável
                          </p>
                          <p className="text-[var(--ink-2)]">
                            {owner?.name ?? '—'}
                          </p>
                        </div>
                      </div>
                    </div>
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