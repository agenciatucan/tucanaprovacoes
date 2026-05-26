import { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Icon } from '@/components/ui/Icon';

export const metadata: Metadata = { title: 'Meus cronogramas' };

const CAMPAIGN_STATUS_KIND: Record<string, string> = {
  enviado_para_aprovacao: 'aguardando',
  em_revisao: 'revisao',
  aprovado: 'aprovado',
  em_producao: 'agendado',
  finalizado: 'publicado',
  rascunho: 'rascunho',
};

export default async function ClienteDashboard() {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, name')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile) redirect('/login');

  const { data: clientUsers } = await supabase
    .from('client_users')
    .select('client_id, clients(name, company_name)')
    .eq('user_id', profile.id);

  const clientIds = clientUsers?.map((cu) => cu.client_id) ?? [];
  const firstName = profile.name.split(' ')[0];

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, name, type, status, period_label, created_at, content_items(id, general_status)')
    .in('client_id', clientIds)
    .not('status', 'in', '("arquivado")')
    .order('created_at', { ascending: false });

  const pendingTotal =
    campaigns?.reduce((acc, c) => {
      const items = Array.isArray(c.content_items) ? c.content_items : [];
      return acc + items.filter((i: any) => i.general_status === 'pendente').length;
    }, 0) ?? 0;

  const approvedTotal =
    campaigns?.reduce((acc, c) => {
      const items = Array.isArray(c.content_items) ? c.content_items : [];
      return acc + items.filter((i: any) => ['aprovado', 'finalizado'].includes(i.general_status)).length;
    }, 0) ?? 0;

  const totalItems =
    campaigns?.reduce((acc, c) => {
      return acc + (Array.isArray(c.content_items) ? c.content_items.length : 0);
    }, 0) ?? 0;

  const primaryClient = clientUsers?.[0];
  const clientData = Array.isArray(primaryClient?.clients)
    ? primaryClient?.clients[0]
    : primaryClient?.clients;

  const stats = [
    {
      label: 'Aguardando aprovação',
      value: pendingTotal,
      accent: 'var(--orange)',
      sub: 'Posts pendentes',
    },
    {
      label: 'Aprovados',
      value: approvedTotal,
      accent: 'var(--green)',
      sub: `De ${totalItems} publicações`,
    },
    {
      label: 'Cronogramas',
      value: campaigns?.length ?? 0,
      accent: 'var(--ink)',
      sub: 'Disponíveis para você',
    },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl overflow-x-hidden px-4 py-8 sm:px-6 lg:px-8">
      {/* Greeting */}
      <div className="mb-7">
        <div className="eyebrow">
          {clientData?.company_name ?? clientData?.name}
        </div>

        <h1 className="mt-2 text-4xl font-bold tracking-[-0.04em] text-[#1f1f1f] sm:text-5xl lg:text-[42px]">
          Olá, {firstName} 👋
        </h1>

        {pendingTotal > 0 && (
          <p className="mt-3 max-w-xl text-base leading-relaxed text-[var(--muted)] sm:text-sm">
            Você tem{' '}
            <strong style={{ color: 'var(--orange)' }}>
              {pendingTotal} {pendingTotal === 1 ? 'post' : 'posts'}
            </strong>{' '}
            aguardando aprovação.
          </p>
        )}
      </div>

      {/* Stat row */}
      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="card-flat p-5">
            <div className="eyebrow text-[10px] leading-snug">{s.label}</div>

            <div
              className="mt-3 text-4xl font-bold leading-none tracking-[-0.03em]"
              style={{ color: s.accent }}
            >
              {s.value}
            </div>

            <div className="muted tiny mt-2">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Cronogramas */}
      <section>
        <h2 className="mb-4 text-xl font-bold tracking-[-0.03em] text-[#1f1f1f]">
          Cronogramas disponíveis
        </h2>

        {!campaigns || campaigns.length === 0 ? (
          <div className="card px-5 py-12 text-center sm:p-12">
            <p className="muted">Nenhum cronograma disponível no momento.</p>
            <p className="muted tiny mt-1">
              Entre em contato com a Tucan Marketing Digital.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {campaigns.map((c, i) => {
              const items = Array.isArray(c.content_items) ? c.content_items : [];
              const total = items.length;
              const approved = items.filter((it: any) =>
                ['aprovado', 'finalizado'].includes(it.general_status)
              ).length;
              const pct = total ? Math.round((approved / total) * 100) : 0;
              const isCurrent = i === 0 && c.status !== 'finalizado';
              const statusKind = CAMPAIGN_STATUS_KIND[c.status] ?? 'rascunho';

              return (
                <Link
                  key={c.id}
                  href={`/cliente/cronogramas/${c.id}`}
                  className="block text-inherit no-underline"
                >
                  <div
                    className={`card flex flex-col gap-4 p-5 transition hover:shadow-sm sm:flex-row sm:items-center sm:gap-5 ${
                      isCurrent
                        ? 'border border-[var(--green-100)]'
                        : 'border border-[var(--line)]'
                    }`}
                  >
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                        isCurrent
                          ? 'bg-[var(--green)] text-white'
                          : 'bg-[var(--bg-2)] text-[var(--muted)]'
                      }`}
                    >
                      <Icon name="calendar" size={22} stroke={1.8} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-lg font-bold tracking-[-0.03em] text-[#1f1f1f]">
                          {c.name}
                        </div>

                        {isCurrent && (
                          <span className="chip bg-[var(--green-50)] text-[var(--green)]">
                            Atual
                          </span>
                        )}
                      </div>

                      <div className="muted tiny mt-1">{c.period_label}</div>

                      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                        <div className="progress w-full sm:max-w-60">
                          <div
                            className="progress-fill"
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        <span className="tiny shrink-0 font-semibold text-[var(--muted)]">
                          {approved}/{total} aprovados
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <StatusBadge kind={statusKind as any} />
                      <Icon name="chevron" size={16} color="var(--muted-2)" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}