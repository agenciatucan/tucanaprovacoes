import { Metadata } from 'next';
import Link from 'next/link';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Icon } from '@/components/ui/Icon';

export const metadata: Metadata = { title: 'Visão geral' };

export default async function AdminDashboard() {
  const supabase = await getSupabaseServerClient();

  const [
    { count: activeClients },
    { count: pendingApproval },
    { count: pendingPosts },
    { count: approvedPosts },
    { count: adjustPosts },
    { count: openComments },
    { data: recentComments },
    { data: pendingCampaigns },
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('status', 'ativo'),
    supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('status', 'enviado_para_aprovacao'),
    supabase.from('content_items').select('*', { count: 'exact', head: true }).eq('general_status', 'pendente'),
    supabase.from('content_items').select('*', { count: 'exact', head: true }).eq('general_status', 'aprovado'),
    supabase.from('content_items').select('*', { count: 'exact', head: true }).eq('general_status', 'em_revisao'),
    supabase.from('comments_history').select('*', { count: 'exact', head: true }).eq('status', 'aberta'),
    supabase
      .from('comments_history')
      .select('id, message, created_at, clients(name)')
      .eq('status', 'aberta')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('campaigns')
      .select('id, name, status, clients(name, company_name)')
      .in('status', ['enviado_para_aprovacao', 'em_revisao'])
      .order('updated_at', { ascending: false })
      .limit(6),
  ]);

  const stats = [
    { label: 'Clientes ativos', value: activeClients ?? 0, color: 'var(--green)' },
    { label: 'Aguardando aprovação', value: pendingApproval ?? 0, color: 'var(--orange)' },
    { label: 'Posts pendentes', value: pendingPosts ?? 0, color: '#92400e' },
    { label: 'Posts aprovados', value: approvedPosts ?? 0, color: 'var(--green)' },
    { label: 'Com ajuste solicitado', value: adjustPosts ?? 0, color: '#b54a07' },
    { label: 'Observações abertas', value: openComments ?? 0, color: '#1d4ed8' },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl overflow-x-hidden px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="eyebrow">Tucan · Interno</div>

          <h1 className="mt-2 text-4xl font-bold tracking-[-0.04em] text-[#1f1f1f] sm:text-5xl lg:text-[42px]">
            Visão geral
          </h1>

          <p className="mt-2 max-w-xl text-base leading-relaxed text-[var(--muted)] sm:text-sm">
            Acompanhe tudo que está acontecendo na operação.
          </p>
        </div>

        <div className="grid w-full grid-cols-1 gap-3 sm:w-auto sm:grid-cols-2">
          <Link
            href="/admin/clientes/novo"
            className="btn btn-ghost btn-sm justify-center"
          >
            <Icon name="plus" size={14} />
            Novo cliente
          </Link>

          <Link
            href="/admin/cronogramas/novo"
            className="btn btn-primary justify-center"
          >
            <Icon name="plus" size={16} />
            Novo cronograma
          </Link>
        </div>
      </div>

      {/* Stats grid */}
      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="card-flat p-5">
            <div className="eyebrow text-[10px] leading-snug">{s.label}</div>

            <div
              className="mt-3 text-4xl font-bold leading-none tracking-[-0.03em]"
              style={{ color: s.color }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
        {/* Cronogramas pendentes */}
        <section className="min-w-0">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-xl font-bold tracking-[-0.03em] text-[#1f1f1f]">
                Cronogramas em aprovação
              </h2>
              <p className="muted tiny mt-1">
                Acompanhe o que está esperando o cliente.
              </p>
            </div>

            <Link
              href="/admin/cronogramas"
              className="shrink-0 text-xs font-semibold text-[var(--ink-2)]"
            >
              Ver todos →
            </Link>
          </div>

          <div className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--line)] bg-white">
            {pendingCampaigns?.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-[var(--muted)]">
                Nenhum cronograma aguardando aprovação.
              </div>
            ) : (
              pendingCampaigns?.map((c, i) => {
                const client = Array.isArray(c.clients) ? c.clients[0] : c.clients;

                return (
                  <Link
                    key={c.id}
                    href={`/admin/cronogramas/${c.id}`}
                    className="flex items-center gap-3 border-b border-[var(--line-soft)] px-4 py-4 text-inherit no-underline transition hover:bg-gray-50 last:border-b-0 sm:gap-4 sm:px-5"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--green-50)] text-[var(--green)]">
                      <Icon name="calendar" size={18} stroke={1.8} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">
                        {c.name}
                      </div>
                      <div className="muted tiny mt-1 truncate">
                        {client?.company_name ?? client?.name}
                      </div>
                    </div>

                    <div className="hidden shrink-0 sm:block">
                      <StatusBadge kind={c.status as any} />
                    </div>

                    <Icon name="chevron" size={14} color="var(--muted-2)" />
                  </Link>
                );
              })
            )}
          </div>
        </section>

        {/* Observações abertas */}
        <section className="min-w-0">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-xl font-bold tracking-[-0.03em] text-[#1f1f1f]">
                Observações abertas
              </h2>
              <p className="muted tiny mt-1">Feedbacks dos clientes.</p>
            </div>

            <Link
              href="/admin/observacoes"
              className="shrink-0 text-xs font-semibold text-[var(--ink-2)]"
            >
              Ver todas →
            </Link>
          </div>

          <div className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--line)] bg-white">
            {recentComments?.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-[var(--muted)]">
                Nenhuma observação em aberto.
              </div>
            ) : (
              recentComments?.map((c, i) => {
                const client = Array.isArray(c.clients) ? c.clients[0] : c.clients;

                return (
                  <div
                    key={c.id}
                    className="border-b border-[var(--line-soft)] px-4 py-4 last:border-b-0 sm:px-5"
                  >
                    <div className="line-clamp-2 text-sm leading-relaxed">
                      {c.message}
                    </div>
                    <div className="muted tiny mt-2 truncate">
                      {client?.name}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* Quick actions */}
      <div className="mt-8 grid grid-cols-1 gap-3 sm:flex sm:flex-wrap">
        <Link href="/admin/kanban" className="btn btn-ghost btn-sm justify-center">
          <Icon name="kanban" size={14} />
          Ver Kanban
        </Link>

        <Link href="/admin/calendario" className="btn btn-ghost btn-sm justify-center">
          <Icon name="calendar" size={14} />
          Calendário
        </Link>

        <Link href="/admin/observacoes" className="btn btn-ghost btn-sm justify-center">
          <Icon name="message-circle" size={14} />
          Observações
        </Link>
      </div>
    </div>
  );
}