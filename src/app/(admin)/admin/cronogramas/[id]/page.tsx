import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Icon } from '@/components/ui/Icon';
import CampaignActions from '@/components/admin/CampaignActions';

export const metadata: Metadata = { title: 'Gerenciar cronograma' };

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

const POST_STATUS_KIND: Record<string, string> = {
  pendente: 'aguardando',
  em_revisao: 'revisao',
  aprovado: 'aprovado',
  em_producao: 'agendado',
  finalizado: 'publicado',
};

interface Props {
  params: Promise<{ id: string }>;
}

function ApprovalDot({
  label,
  status,
}: {
  label: string;
  status: string | null;
}) {
  const color =
    status === 'aprovado'
      ? 'var(--green)'
      : status === 'ajuste_solicitado'
        ? 'var(--orange)'
        : 'var(--muted-2)';

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)]">
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}

export default async function GerenciarCronogramaPage({ params }: Props) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*, clients(id, name, company_name, email)')
    .eq('id', id)
    .single();

  if (!campaign) notFound();

  const { data: items } = await supabase
    .from('content_items')
    .select(
      'id, week_label, order_index, format, title, theme, general_status, theme_status, caption_status, artwork_status, is_locked'
    )
    .eq('campaign_id', id)
    .order('order_index');

  const client = Array.isArray(campaign.clients)
    ? campaign.clients[0]
    : campaign.clients;

  const total = items?.length ?? 0;
  const approved =
    items?.filter((i) => ['aprovado', 'finalizado'].includes(i.general_status))
      .length ?? 0;

  const inReview =
    items?.filter((i) => i.general_status === 'em_revisao').length ?? 0;

  const pending =
    items?.filter((i) => i.general_status === 'pendente').length ?? 0;

  const pct = total ? Math.round((approved / total) * 100) : 0;

  const approvalLink = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/acesso/${campaign.approval_token}`;
  const statusKind = STATUS_KIND[campaign.status] ?? 'rascunho';

  const weeks: Record<string, typeof items> = {};

  items?.forEach((item) => {
    if (!weeks[item.week_label]) weeks[item.week_label] = [];
    weeks[item.week_label]!.push(item);
  });

  const weekKeys = Object.keys(weeks).sort();

  const stats = [
    { label: 'Total de posts', value: total, color: 'var(--ink)' },
    { label: 'Aprovados', value: approved, color: 'var(--green)' },
    { label: 'Em revisão', value: inReview, color: 'var(--orange)' },
    { label: 'Pendentes', value: pending, color: 'var(--muted)' },
  ];

  return (
    <div className="mx-auto w-full max-w-[1320px] overflow-x-hidden px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <div className="crumb mb-5 flex flex-wrap items-center gap-2 text-sm">
        <Link href="/admin/cronogramas">Cronogramas</Link>
        <span>/</span>
        <span className="min-w-0 truncate">{campaign.name}</span>
      </div>

      {/* Campaign header */}
      <div className="mb-6 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <h1 className="text-3xl font-bold leading-tight tracking-[-0.04em] text-[#1f1f1f] sm:text-4xl lg:text-[42px]">
              {campaign.name}
            </h1>

            <div className="shrink-0">
              <StatusBadge
                kind={statusKind as Parameters<typeof StatusBadge>[0]['kind']}
                size="lg"
              />
            </div>
          </div>

          <div className="text-sm leading-relaxed text-[var(--muted)]">
            {client?.company_name ?? client?.name} · {campaign.period_label} ·{' '}
            {FMT_LABEL[campaign.type] ?? campaign.type}
          </div>
        </div>

        <div className="w-full xl:w-auto">
          <CampaignActions
            campaignId={id}
            status={campaign.status}
            approvalLink={approvalLink}
            isLocked={campaign.is_locked}
            editHref={`/admin/cronogramas/${id}/editar`}
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card-flat p-5">
            <div className="eyebrow text-[10px] leading-snug">{s.label}</div>
            <div
              className="mt-2 text-4xl font-bold leading-none tracking-[-0.03em]"
              style={{ color: s.color }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="progress w-full sm:flex-1">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>

          <span className="muted tiny shrink-0 font-semibold">
            {pct}% aprovado
          </span>
        </div>
      )}

      {/* Overview */}
      {campaign.overview && (
        <div className="card mb-6 border border-[var(--green-100)] bg-[var(--green-50)] p-5">
          <div className="eyebrow mb-2 text-[var(--green)]">
            Visão estratégica
          </div>
          <p className="m-0 text-sm leading-relaxed text-[var(--ink-2)]">
            {campaign.overview}
          </p>
        </div>
      )}

<<<<<<< Updated upstream
      {/* Posts */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 className="h2" style={{ fontSize: 18 }}>Posts do cronograma</h2>
        <Link href={`/admin/posts/novo?campaign=${id}`} className="btn btn-primary btn-sm">
          <Icon name="plus" size={14} /> Adicionar post
=======
      {/* Posts header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold tracking-[-0.03em] text-[#1f1f1f]">
          Posts do cronograma
        </h2>

        <Link
          href={`/admin/posts/novo?campaign=${id}` as Route}
          className="btn btn-primary btn-sm w-full justify-center sm:w-auto"
        >
          <Icon name="plus" size={14} />
          Adicionar post
>>>>>>> Stashed changes
        </Link>
      </div>

      {total === 0 ? (
<<<<<<< Updated upstream
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <p className="muted" style={{ marginBottom: 12 }}>Nenhum post ainda. Adicione o primeiro post ao cronograma.</p>
          <Link href={`/admin/posts/novo?campaign=${id}`} className="btn btn-primary">
            <Icon name="plus" size={16} /> Adicionar primeiro post
=======
        <div className="card px-5 py-12 text-center sm:p-12">
          <p className="muted mb-3">
            Nenhum post ainda. Adicione o primeiro post ao cronograma.
          </p>

          <Link
            href={`/admin/posts/novo?campaign=${id}` as Route}
            className="btn btn-primary justify-center"
          >
            <Icon name="plus" size={16} />
            Adicionar primeiro post
>>>>>>> Stashed changes
          </Link>
        </div>
      ) : (
        weekKeys.map((week) => (
          <section key={week} className="mb-8">
            {/* Week header */}
            <div className="mb-3 flex items-center gap-3">
              <h3 className="text-lg font-bold tracking-[-0.03em] text-[var(--ink)]">
                {week}
              </h3>

              <div className="h-px flex-1 bg-[var(--line)]" />

              <span className="muted tiny shrink-0">
                {weeks[week]?.length} posts
              </span>
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-[var(--r)] border border-[var(--line)] bg-white lg:block">
              {weeks[week]?.map((post, i) => {
                const postKind =
                  POST_STATUS_KIND[post.general_status] ?? 'aguardando';

                return (
                  <div
                    key={post.id}
                    className="grid grid-cols-[1.6fr_0.7fr_0.8fr_0.8fr_0.8fr_100px] items-center gap-4 border-b border-[var(--line-soft)] px-5 py-4 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">
                        {post.title}
                      </div>

                      {post.theme && (
                        <div className="muted tiny mt-1 truncate">
                          {post.theme}
                        </div>
                      )}
                    </div>

                    <div>
                      <span
                        className={FMT_CLASS[post.format] ?? 'fmt'}
                        style={{ fontSize: 11 }}
                      >
                        {FMT_LABEL[post.format] ?? post.format}
                      </span>
                    </div>

                    <ApprovalDot label="Tema" status={post.theme_status} />
                    <ApprovalDot label="Legenda" status={post.caption_status} />

                    <div>
                      <StatusBadge
                        kind={
                          postKind as Parameters<typeof StatusBadge>[0]['kind']
                        }
                      />
                    </div>
<<<<<<< Updated upstream
                    <div><StatusBadge kind={postKind as Parameters<typeof StatusBadge>[0]['kind']} /></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                      <Link href={`/admin/posts/${post.id}`} className="btn btn-ghost btn-sm" style={{ height: 30, padding: '0 10px', fontSize: 12 }}>
                        <Icon name="edit" size={12} /> Editar
=======

                    <div className="flex justify-end">
                      <Link
                        href={`/admin/posts/${post.id}` as Route}
                        className="btn btn-ghost btn-sm h-[30px] px-3 text-xs"
                      >
                        <Icon name="edit" size={12} />
                        Editar
>>>>>>> Stashed changes
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile cards */}
            <div className="space-y-3 lg:hidden">
              {weeks[week]?.map((post) => {
                const postKind =
                  POST_STATUS_KIND[post.general_status] ?? 'aguardando';

                return (
                  <div
                    key={post.id}
                    className="rounded-3xl border border-[var(--line)] bg-white p-4 shadow-sm"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h4 className="line-clamp-2 text-base font-bold leading-tight tracking-[-0.03em] text-[#1f1f1f]">
                          {post.title}
                        </h4>

                        {post.theme && (
                          <p className="muted mt-1 line-clamp-2 text-sm">
                            {post.theme}
                          </p>
                        )}
                      </div>

                      <StatusBadge
                        kind={
                          postKind as Parameters<typeof StatusBadge>[0]['kind']
                        }
                      />
                    </div>

                    <div className="mb-4 flex flex-wrap gap-2">
                      <span
                        className={FMT_CLASS[post.format] ?? 'fmt'}
                        style={{ fontSize: 11 }}
                      >
                        {FMT_LABEL[post.format] ?? post.format}
                      </span>

                      <ApprovalDot label="Tema" status={post.theme_status} />
                      <ApprovalDot
                        label="Legenda"
                        status={post.caption_status}
                      />
                    </div>

                    <Link
                      href={`/admin/posts/${post.id}` as Route}
                      className="btn btn-ghost btn-sm w-full justify-center"
                    >
                      <Icon name="edit" size={12} />
                      Editar post
                    </Link>
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}