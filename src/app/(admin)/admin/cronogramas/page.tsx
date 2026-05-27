import { Metadata } from 'next';
import Link from 'next/link';
import type { Route } from 'next';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Icon } from '@/components/ui/Icon';
import SearchInput from '@/components/ui/SearchInput';

export const metadata: Metadata = { title: 'Cronogramas' };

const TYPE_LABEL: Record<string, string> = {
  mensal: 'Mensal',
  quinzenal: 'Quinzenal',
  semanal: 'Semanal',
  campanha: 'Campanha',
};

const STATUS_KIND: Record<string, string> = {
  rascunho: 'rascunho',
  enviado_para_aprovacao: 'aguardando',
  em_revisao: 'revisao',
  aprovado: 'aprovado',
  em_producao: 'agendado',
  finalizado: 'publicado',
  arquivado: 'rascunho',
};

export default async function AdminCronogramasPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>;
}) {
  const { status: filterStatus, search: filterSearch } = await searchParams;
  const supabase = await getSupabaseServerClient();

  let query = supabase
    .from('campaigns')
    .select(
      'id, name, type, status, period_label, created_at, updated_at, clients(id, name, company_name), content_items(id, general_status)'
    )
    .order('updated_at', { ascending: false });

  if (filterStatus && filterStatus !== 'todos') {
    query = query.eq('status', filterStatus);
  }

  if (filterSearch?.trim()) {
    query = query.ilike('name', `%${filterSearch.trim()}%`);
  }

  const { data: campaigns } = await query;

  const filters = [
    { key: 'todos', label: 'Todos' },
    { key: 'rascunho', label: 'Rascunho' },
    { key: 'enviado_para_aprovacao', label: 'Aguardando' },
    { key: 'em_revisao', label: 'Em revisão' },
    { key: 'aprovado', label: 'Aprovados' },
    { key: 'em_producao', label: 'Em produção' },
    { key: 'finalizado', label: 'Finalizados' },
  ];

  return (
    <div className="mx-auto w-full max-w-[1320px] overflow-x-hidden px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="eyebrow">Tucan · Interno</div>

          <h1 className="mt-2 text-4xl font-bold tracking-[-0.04em] text-[#1f1f1f] sm:text-5xl lg:text-[42px]">
            Cronogramas
          </h1>

          <p className="mt-2 text-base leading-relaxed text-[var(--muted)] sm:text-sm">
            {campaigns?.length ?? 0} cronogramas encontrados
          </p>
        </div>

        <Link
          href="/admin/cronogramas/novo"
          className="btn btn-primary w-full justify-center sm:w-auto"
        >
          <Icon name="plus" size={16} />
          Novo cronograma
        </Link>
      </div>

      {/* Filter bar */}
<<<<<<< Updated upstream
      <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <SearchInput
          basePath="/admin/cronogramas"
          paramName="search"
          defaultValue={filterSearch ?? ''}
          preserveParams={{ status: filterStatus && filterStatus !== 'todos' ? filterStatus : undefined }}
          placeholder="Buscar cronograma…"
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {filters.map((f) => {
            const active = (!filterStatus && f.key === 'todos') || filterStatus === f.key;
            const search = filterSearch ? `&search=${filterSearch}` : '';
            const href = (f.key === 'todos'
              ? `/admin/cronogramas${filterSearch ? `?search=${filterSearch}` : ''}`
              : `/admin/cronogramas?status=${f.key}${search}`) as Route;
            return (
              <Link
                key={f.key}
                href={href}
                className="chip"
                style={{ height: 30, textDecoration: 'none', background: active ? 'var(--green)' : undefined, color: active ? '#fff' : undefined }}>
                {f.label}
              </Link>
            );
          })}
        </div>
        {(filterStatus || filterSearch) && (
          <Link href="/admin/cronogramas" className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>
            Limpar filtros
          </Link>
        )}
      </div>

      {/* List */}
      <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
        {/* Head */}
        <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.2fr 0.8fr 1fr 0.9fr 60px', gap: 16, padding: '11px 20px', background: 'var(--bg)', borderBottom: '1px solid var(--line)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)' }}>
          <div>Cronograma</div>
          <div>Cliente</div>
          <div>Tipo</div>
          <div>Progresso</div>
          <div>Status</div>
          <div />
        </div>

        {(!campaigns || campaigns.length === 0) && (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
            Nenhum cronograma encontrado.{' '}
            <Link href="/admin/cronogramas/novo" style={{ color: 'var(--orange)', fontWeight: 600 }}>Criar o primeiro →</Link>
=======
      <div className="mb-5 rounded-2xl border border-[var(--line)] bg-white p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="w-full lg:max-w-sm">
            <SearchInput
              basePath="/admin/cronogramas"
              paramName="search"
              defaultValue={filterSearch ?? ''}
              preserveParams={{
                status: filterStatus && filterStatus !== 'todos' ? filterStatus : undefined,
              }}
              placeholder="Buscar cronograma…"
            />
>>>>>>> Stashed changes
          </div>

          <div className="flex w-full gap-2 overflow-x-auto pb-1 lg:w-auto lg:flex-wrap lg:overflow-visible lg:pb-0">
            {filters.map((f) => {
              const active = (!filterStatus && f.key === 'todos') || filterStatus === f.key;
              const search = filterSearch ? `&search=${filterSearch}` : '';
              const href = (
                f.key === 'todos'
                  ? `/admin/cronogramas${filterSearch ? `?search=${filterSearch}` : ''}`
                  : `/admin/cronogramas?status=${f.key}${search}`
              ) as Route;

              return (
                <Link
                  key={f.key}
                  href={href}
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
                href="/admin/cronogramas"
                className="btn btn-ghost btn-sm shrink-0 text-xs"
              >
                Limpar filtros
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Empty */}
      {(!campaigns || campaigns.length === 0) && (
        <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-white px-5 py-12 text-center text-sm text-[var(--muted)]">
          Nenhum cronograma encontrado.{' '}
          <Link
            href="/admin/cronogramas/novo"
            className="font-semibold text-[var(--orange)]"
          >
            Criar o primeiro →
          </Link>
        </div>
      )}

      {campaigns && campaigns.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-[var(--r-lg)] border border-[var(--line)] bg-white lg:block">
            <div className="grid grid-cols-[2.5fr_1.2fr_0.8fr_1fr_0.9fr_60px] gap-4 border-b border-[var(--line)] bg-[var(--bg)] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">
              <div>Cronograma</div>
              <div>Cliente</div>
              <div>Tipo</div>
              <div>Progresso</div>
              <div>Status</div>
              <div />
            </div>

            {campaigns.map((c, i) => {
              const client = Array.isArray(c.clients) ? c.clients[0] : c.clients;
              const items = Array.isArray(c.content_items) ? c.content_items : [];
              const total = items.length;
              const approved = items.filter((it: { general_status: string }) =>
                ['aprovado', 'finalizado'].includes(it.general_status)
              ).length;
              const pct = total ? Math.round((approved / total) * 100) : 0;
              const kind = STATUS_KIND[c.status] ?? 'rascunho';

              return (
                <Link
                  key={c.id}
                  href={`/admin/cronogramas/${c.id}`}
                  className="grid grid-cols-[2.5fr_1.2fr_0.8fr_1fr_0.9fr_60px] items-center gap-4 border-b border-[var(--line-soft)] px-5 py-4 text-inherit no-underline transition hover:bg-gray-50 last:border-b-0"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{c.name}</div>
                    <div className="muted tiny mt-1 truncate">{c.period_label}</div>
                  </div>

                  <div className="truncate text-sm text-[var(--ink-2)]">
                    {client?.company_name ?? client?.name ?? '—'}
                  </div>

                  <div>
                    <span className="chip text-[11px]">
                      {TYPE_LABEL[c.type] ?? c.type}
                    </span>
                  </div>

                  <div>
                    {total > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="progress max-w-[100px] flex-1">
                          <div
                            className="progress-fill"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="tiny muted shrink-0">
                          {approved}/{total}
                        </span>
                      </div>
                    ) : (
                      <span className="muted tiny">Sem posts</span>
                    )}
                  </div>

                  <div>
                    <StatusBadge
                      kind={kind as Parameters<typeof StatusBadge>[0]['kind']}
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
            {campaigns.map((c) => {
              const client = Array.isArray(c.clients) ? c.clients[0] : c.clients;
              const items = Array.isArray(c.content_items) ? c.content_items : [];
              const total = items.length;
              const approved = items.filter((it: { general_status: string }) =>
                ['aprovado', 'finalizado'].includes(it.general_status)
              ).length;
              const pct = total ? Math.round((approved / total) * 100) : 0;
              const kind = STATUS_KIND[c.status] ?? 'rascunho';

              return (
                <Link
                  key={c.id}
                  href={`/admin/cronogramas/${c.id}`}
                  className="block rounded-3xl border border-[var(--line)] bg-white p-4 text-inherit no-underline shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--green-50)] text-[var(--green)]">
                      <Icon name="calendar" size={22} stroke={1.8} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="line-clamp-2 text-lg font-bold leading-tight tracking-[-0.03em] text-[#1f1f1f]">
                            {c.name}
                          </h2>

                          <p className="muted mt-1 truncate text-sm">
                            {client?.company_name ?? client?.name ?? '—'}
                          </p>
                        </div>

                        <Icon
                          name="chevron"
                          size={16}
                          color="var(--muted-2)"
                        />
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="chip text-[11px]">
                          {TYPE_LABEL[c.type] ?? c.type}
                        </span>

                        <StatusBadge
                          kind={kind as Parameters<typeof StatusBadge>[0]['kind']}
                        />
                      </div>

                      <div className="muted tiny mt-3">
                        {c.period_label}
                      </div>

                      <div className="mt-4">
                        {total > 0 ? (
                          <>
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <span className="tiny font-semibold text-[var(--muted)]">
                                Progresso
                              </span>
                              <span className="tiny font-semibold text-[var(--muted)]">
                                {approved}/{total} aprovados
                              </span>
                            </div>

                            <div className="progress w-full">
                              <div
                                className="progress-fill"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </>
                        ) : (
                          <span className="muted tiny">Sem posts cadastrados</span>
                        )}
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