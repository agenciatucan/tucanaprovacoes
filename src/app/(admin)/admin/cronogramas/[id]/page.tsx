import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Route } from 'next';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Icon } from '@/components/ui/Icon';
import CampaignActions from '@/components/admin/CampaignActions';
import WeekSection from '@/components/admin/WeekSection';

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
  outro: 'fmt',
};

const STATUS_KIND: Record<string, Parameters<typeof StatusBadge>[0]['kind']> =
  {
    rascunho: 'rascunho',
    enviado_para_aprovacao: 'aguardando',
    em_revisao: 'revisao',
    aprovado: 'aprovado',
    em_producao: 'agendado',
    finalizado: 'publicado',
    arquivado: 'rascunho',
  };

const POST_STATUS_KIND: Record<
  string,
  Parameters<typeof StatusBadge>[0]['kind']
> = {
  pendente: 'aguardando',
  em_revisao: 'revisao',
  aprovado: 'aprovado',
  em_producao: 'agendado',
  finalizado: 'publicado',
};

const POST_STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente',
  em_revisao: 'Ajustes solicitados',
  aprovado: 'Aprovado',
  em_producao: 'Em produção',
  finalizado: 'Finalizado',
};

const FIELD_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  aguardando: {
    label: 'Aguardando',
    color: 'var(--muted)',
    bg: 'var(--bg-2)',
  },
  aprovado: {
    label: 'Aprovado',
    color: 'var(--green)',
    bg: 'var(--green-50)',
  },
  ajuste_solicitado: {
    label: 'Ajuste solicitado',
    color: 'var(--orange)',
    bg: 'var(--orange-50)',
  },
  substituir_tema: {
    label: 'Substituir tema',
    color: 'var(--orange)',
    bg: 'var(--orange-50)',
  },
};

type ContentItem = {
  id: string;
  week_label: string | null;
  order_index: number | null;
  format: string | null;
  title: string | null;
  theme: string | null;
  general_status: string | null;
  theme_status: string | null;
  caption_status: string | null;
  artwork_status: string | null;
  is_locked: boolean | null;
};

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    status?: string;
  }>;
}

function getFieldStatus(value: string | null) {
  return (
    FIELD_STATUS_CONFIG[value ?? 'aguardando'] ?? {
      label: value ?? 'Aguardando',
      color: 'var(--muted)',
      bg: 'var(--bg-2)',
    }
  );
}

function FieldStatusPill({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  const cfg = getFieldStatus(value);

  return (
    <span
      className="campaign-post-field-pill"
      title={`${label}: ${cfg.label}`}
      style={{
        background: cfg.bg,
        color: cfg.color,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: cfg.color,
          flexShrink: 0,
        }}
      />

      <span>
        {label}: {cfg.label}
      </span>
    </span>
  );
}

function getVisibilityMessage(status: string) {
  if (status === 'rascunho') {
    return {
      title: 'Rascunho · ainda não visível para o cliente',
      description:
        'Este cronograma ainda não foi enviado para aprovação. O cliente não consegue visualizar.',
      bg: '#fffbeb',
      border: '#fde68a',
      color: '#92400e',
    };
  }

  if (status === 'arquivado') {
    return {
      title: 'Arquivado · não visível para o cliente',
      description:
        'Este cronograma está arquivado. Ele não aparece para o cliente e não pode receber novas aprovações.',
      bg: '#f9fafb',
      border: '#e5e7eb',
      color: '#6b7280',
    };
  }

  return {
    title: 'Visível para o cliente',
    description:
      'Este cronograma está disponível para o cliente acompanhar, aprovar ou solicitar ajustes.',
    bg: 'var(--green-50)',
    border: 'var(--green-100)',
    color: 'var(--green)',
  };
}

function buildFilterHref(campaignId: string, status?: string) {
  const params = new URLSearchParams();

  if (status) {
    params.set('status', status);
  }

  const query = params.toString();

  return `/admin/cronogramas/${campaignId}${query ? `?${query}` : ''}` as Route;
}

export default async function GerenciarCronogramaPage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const { status: filterStatus } = await searchParams;

  const supabase = await getSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: currentProfile } = user
    ? await supabase.from('user_profiles').select('role').eq('auth_user_id', user.id).single()
    : { data: null };
  const isAdmin = currentProfile?.role === 'admin';

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*, clients(id, name, company_name, email)')
    .eq('id', id)
    .single();

  if (!campaign) {
    notFound();
  }

  const { data: rawItems } = await supabase
    .from('content_items')
    .select(
      'id, week_label, order_index, format, title, theme, general_status, theme_status, caption_status, artwork_status, is_locked'
    )
    .eq('campaign_id', id)
    .order('order_index');

  const items = (rawItems ?? []) as ContentItem[];

  const client = Array.isArray(campaign.clients)
    ? campaign.clients[0]
    : campaign.clients;

  const total = items.length;

  const approved = items.filter((item) =>
    ['aprovado', 'finalizado'].includes(item.general_status ?? '')
  ).length;

  const inReview = items.filter(
    (item) => item.general_status === 'em_revisao'
  ).length;

  const pending = items.filter(
    (item) => item.general_status === 'pendente'
  ).length;

  const pct = total ? Math.round((approved / total) * 100) : 0;

  const approvalLink = `${
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  }/acesso/${campaign.approval_token}`;

  const statusKind = STATUS_KIND[campaign.status] ?? 'rascunho';

  const visibility = getVisibilityMessage(campaign.status);

  const isArchived = campaign.status === 'arquivado';
  const isLocked = Boolean(campaign.is_locked);
  const canManagePosts = !isArchived && !isLocked;

  const filteredItems = items.filter((item) => {
    const itemStatus = item.general_status ?? 'pendente';

    if (filterStatus && itemStatus !== filterStatus) {
      return false;
    }

    return true;
  });

  const filteredTotal = filteredItems.length;

  const weeks: Record<string, ContentItem[]> = {};

  filteredItems.forEach((item) => {
    const week = item.week_label ?? 'Sem semana';

    if (!weeks[week]) {
      weeks[week] = [];
    }

    weeks[week].push(item);
  });

  const weekKeys = Object.keys(weeks).sort((a, b) =>
    a.localeCompare(b, 'pt-BR', { numeric: true })
  );

  const hasFilters = Boolean(filterStatus);

  return (
    <div className="page campaign-detail-page" style={{ maxWidth: 1320 }}>
      <style>
        {`
          .campaign-detail-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 24px;
            margin-bottom: 18px;
            flex-wrap: wrap;
          }

          .campaign-detail-title-row {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 8px;
            flex-wrap: wrap;
          }

          .campaign-detail-actions {
            display: flex;
            justify-content: flex-end;
          }

          .campaign-visibility-card {
            border-radius: 16px;
            padding: 12px 14px;
            margin-bottom: 24px;
            display: flex;
            gap: 10px;
            align-items: flex-start;
          }

          .campaign-stats-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 14px;
            margin-bottom: 24px;
          }

          .campaign-progress-row {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 24px;
          }

          .campaign-overview-card {
            margin-bottom: 24px;
            background: var(--green-50);
            border: 1px solid var(--green-100);
          }

          .campaign-posts-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 14px;
            gap: 12px;
            flex-wrap: wrap;
          }

          .campaign-filter-bar {
            background: #fff;
            border: 1px solid var(--line);
            border-radius: 16px;
            padding: 12px;
            margin-bottom: 18px;
            display: flex;
            gap: 10px;
            align-items: center;
            flex-wrap: wrap;
          }

          .campaign-filter-chips {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
          }

          .campaign-post-list {
            background: #fff;
            border: 1px solid var(--line);
            border-radius: var(--r);
            overflow: hidden;
          }

          .campaign-post-row {
            display: grid;
            grid-template-columns: minmax(210px, 1.2fr) 130px minmax(260px, 1.3fr) 160px 180px;
            gap: 14px;
            padding: 14px 18px;
            align-items: center;
            border-bottom: 1px solid var(--line-soft);
          }

          .campaign-post-row:last-child {
            border-bottom: none;
          }

          .campaign-post-title {
            font-weight: 800;
            font-size: 13px;
            color: var(--ink);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .campaign-post-theme {
            margin-top: 3px;
            font-size: 12px;
            color: var(--muted);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .campaign-post-field-list {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
            align-items: center;
            min-width: 0;
          }

          .campaign-post-field-pill {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            border-radius: 999px;
            padding: 4px 8px;
            font-size: 11px;
            font-weight: 800;
            white-space: nowrap;
            max-width: 100%;
          }

          .campaign-post-actions {
            display: flex;
            justify-content: flex-end;
            gap: 6px;
            flex-wrap: wrap;
          }

          .campaign-mobile-post-meta {
            display: none;
          }

          @media (max-width: 980px) {
            .campaign-detail-header {
              align-items: stretch;
              flex-direction: column;
            }

            .campaign-detail-actions {
              justify-content: flex-start;
            }

            .campaign-stats-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .campaign-post-row {
              grid-template-columns: minmax(0, 1fr);
              gap: 12px;
              padding: 16px;
              border-bottom: 10px solid var(--bg);
            }

            .campaign-post-row:last-child {
              border-bottom: none;
            }

            .campaign-post-title {
              font-size: 15px;
              white-space: normal;
              line-height: 1.35;
            }

            .campaign-post-theme {
              white-space: normal;
              line-height: 1.45;
            }

            .campaign-post-row > .campaign-post-format-desktop,
            .campaign-post-row > .campaign-post-status-desktop {
              display: none;
            }

            .campaign-mobile-post-meta {
              display: flex;
              align-items: center;
              gap: 8px;
              flex-wrap: wrap;
            }

            .campaign-post-field-list {
              display: grid;
              grid-template-columns: 1fr;
              gap: 7px;
            }

            .campaign-post-field-pill {
              width: 100%;
              justify-content: flex-start;
              padding: 8px 10px;
              border-radius: 12px;
              overflow: hidden;
            }

            .campaign-post-field-pill span:last-child {
              min-width: 0;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }

            .campaign-post-actions {
              display: grid;
              grid-template-columns: 1fr 1fr;
              width: 100%;
            }

            .campaign-post-actions .btn {
              width: 100%;
              justify-content: center;
            }
          }

          @media (max-width: 640px) {
            .campaign-detail-title-row {
              align-items: flex-start;
              flex-direction: column;
              gap: 8px;
            }

            .campaign-stats-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 10px;
            }

            .campaign-stats-grid .card-flat {
              padding: 14px;
              border-radius: 18px;
            }

            .campaign-stats-grid .stat-number {
              font-size: 28px !important;
            }

            .campaign-progress-row {
              align-items: flex-start;
              flex-direction: column;
              gap: 8px;
            }

            .campaign-progress-row .progress {
              width: 100%;
            }

            .campaign-posts-header {
              align-items: stretch;
              flex-direction: column;
            }

            .campaign-posts-header .btn {
              width: 100%;
            }

            .campaign-filter-bar {
              align-items: stretch;
              flex-direction: column;
              border-radius: 18px;
            }

            .campaign-filter-chips {
              overflow-x: auto;
              flex-wrap: nowrap;
              padding-bottom: 2px;
              margin-right: -4px;
            }

            .campaign-filter-chips .chip,
            .campaign-filter-chips .btn {
              flex-shrink: 0;
            }

            .campaign-post-list {
              background: transparent;
              border: none;
              border-radius: 0;
              overflow: visible;
              display: flex;
              flex-direction: column;
              gap: 12px;
            }

            .campaign-post-row {
              background: #fff;
              border: 1px solid var(--line);
              border-radius: 20px;
              box-shadow: 0 1px 2px rgba(0,0,0,.03);
            }

            .campaign-post-actions {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 420px) {
            .campaign-stats-grid {
              grid-template-columns: 1fr;
            }
          }
        `}
      </style>

      <div className="crumb">
        <Link href="/admin/cronogramas">Cronogramas</Link>
        <span>/</span>
        {campaign.name}
      </div>

      <div className="campaign-detail-header">
        <div style={{ minWidth: 260 }}>
          <div className="campaign-detail-title-row">
            <h1 className="h1" style={{ fontSize: 26 }}>
              {campaign.name}
            </h1>

            <StatusBadge kind={statusKind} size="lg" />
          </div>

          <div className="muted" style={{ fontSize: 14 }}>
            {client?.company_name ?? client?.name} · {campaign.period_label} ·{' '}
            {campaign.type}
          </div>
        </div>

        <div className="campaign-detail-actions">
          <CampaignActions
            campaignId={id}
            campaignName={campaign.name}
            status={campaign.status}
            approvalLink={approvalLink}
            accessCode={campaign.access_code}
            isLocked={campaign.is_locked}
            editHref={`/admin/cronogramas/${id}/editar`}
            isAdmin={isAdmin}
          />
        </div>
      </div>

      <div
        className="campaign-visibility-card"
        style={{
          border: `1px solid ${visibility.border}`,
          background: visibility.bg,
        }}
      >
        <Icon name="info" size={16} color={visibility.color} />

        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: visibility.color,
              marginBottom: 2,
            }}
          >
            {visibility.title}
          </div>

          <div
            style={{
              fontSize: 13,
              color: 'var(--ink-2)',
              lineHeight: 1.45,
            }}
          >
            {visibility.description}
          </div>
        </div>
      </div>

      <div className="campaign-stats-grid">
        {[
          { label: 'Total de posts', value: total, color: 'var(--ink)' },
          { label: 'Aprovados', value: approved, color: 'var(--green)' },
          { label: 'Em revisão', value: inReview, color: 'var(--orange)' },
          { label: 'Pendentes', value: pending, color: 'var(--muted)' },
        ].map((item) => (
          <div key={item.label} className="card-flat">
            <div className="eyebrow" style={{ fontSize: 10 }}>
              {item.label}
            </div>

            <div
              className="stat-number"
              style={{
                fontSize: 32,
                fontWeight: 800,
                letterSpacing: '-0.04em',
                color: item.color,
                marginTop: 4,
                lineHeight: 1,
              }}
            >
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {total > 0 && (
        <div className="campaign-progress-row">
          <div className="progress" style={{ flex: 1 }}>
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>

          <span
            className="muted tiny"
            style={{ fontWeight: 800, whiteSpace: 'nowrap' }}
          >
            {pct}% aprovado
          </span>
        </div>
      )}

      {campaign.overview && (
        <div className="card campaign-overview-card">
          <div
            className="eyebrow"
            style={{ color: 'var(--green)', marginBottom: 6 }}
          >
            Visão estratégica
          </div>

          <p
            style={{
              fontSize: 14,
              lineHeight: 1.6,
              color: 'var(--ink-2)',
              margin: 0,
            }}
          >
            {campaign.overview}
          </p>
        </div>
      )}

      <div className="campaign-posts-header">
        <div>
          <h2 className="h2" style={{ fontSize: 18 }}>
            Posts do cronograma
          </h2>

          <p className="muted tiny" style={{ marginTop: 4 }}>
            {filteredTotal} de {total} posts exibidos
          </p>
        </div>

        {canManagePosts ? (
          <Link
            href={`/admin/posts/novo?campaign=${id}` as Route}
            className="btn btn-primary btn-sm"
          >
            <Icon name="plus" size={14} />
            Adicionar post
          </Link>
        ) : (
          <span className="muted tiny">
            {isArchived
              ? 'Cronograma arquivado'
              : 'Cronograma bloqueado para edição'}
          </span>
        )}
      </div>

      {total > 0 && (
        <div className="campaign-filter-bar">
          <Icon name="filter" size={14} color="var(--muted)" />

          <div className="campaign-filter-chips">
            {[
              { key: '', label: 'Todos' },
              { key: 'pendente', label: 'Pendentes' },
              { key: 'em_revisao', label: 'Ajustes' },
              { key: 'aprovado', label: 'Aprovados' },
              { key: 'em_producao', label: 'Em produção' },
              { key: 'finalizado', label: 'Finalizados' },
            ].map((filter) => {
              const active = (filterStatus ?? '') === filter.key;

              return (
                <Link
                  key={filter.label}
                  href={buildFilterHref(id, filter.key || undefined)}
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
                href={`/admin/cronogramas/${id}` as Route}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: 12 }}
              >
                Limpar filtros
              </Link>
            )}
          </div>
        </div>
      )}

      {total === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <p className="muted" style={{ marginBottom: 12 }}>
            Nenhum post ainda. Adicione o primeiro post ao cronograma.
          </p>

          {canManagePosts && (
            <Link
              href={`/admin/posts/novo?campaign=${id}` as Route}
              className="btn btn-primary"
            >
              <Icon name="plus" size={16} />
              Adicionar primeiro post
            </Link>
          )}
        </div>
      ) : filteredTotal === 0 ? (
        <div className="card" style={{ padding: 36, textAlign: 'center' }}>
          <p className="muted" style={{ marginBottom: 12 }}>
            Nenhum post encontrado com os filtros selecionados.
          </p>

          <Link
            href={`/admin/cronogramas/${id}` as Route}
            className="btn btn-ghost btn-sm"
          >
            Limpar filtros
          </Link>
        </div>
      ) : (
        weekKeys.map((week, weekIdx) => (
          <WeekSection
            key={week}
            title={week}
            count={weeks[week]?.length ?? 0}
            defaultOpen={weekIdx === 0}
          >
            <div className="campaign-post-list">
              {weeks[week]?.map((post) => {
                const postKind =
                  POST_STATUS_KIND[post.general_status ?? 'pendente'] ??
                  'aguardando';

                const postLabel =
                  POST_STATUS_LABEL[post.general_status ?? 'pendente'];

                const format = post.format ?? 'outro';

                return (
                  <div key={post.id} className="campaign-post-row">
                    <div style={{ minWidth: 0 }}>
                      <div className="campaign-mobile-post-meta">
                        <span className={FMT_CLASS[format] ?? 'fmt'}>
                          {FMT_LABEL[format] ?? format}
                        </span>

                        <StatusBadge kind={postKind} label={postLabel} />
                      </div>

                      <div
                        className="campaign-post-title"
                        style={{
                          marginTop: 6,
                        }}
                      >
                        {post.title ?? 'Post sem título'}
                      </div>

                      {post.theme && (
                        <div className="campaign-post-theme">{post.theme}</div>
                      )}
                    </div>

                    <div className="campaign-post-format-desktop">
                      <span
                        className={FMT_CLASS[format] ?? 'fmt'}
                        style={{ fontSize: 11 }}
                      >
                        {FMT_LABEL[format] ?? format}
                      </span>
                    </div>

                    <div className="campaign-post-field-list">
                      <FieldStatusPill
                        label="Tema"
                        value={post.theme_status}
                      />

                      <FieldStatusPill
                        label="Legenda"
                        value={post.caption_status}
                      />

                      <FieldStatusPill
                        label="Arte"
                        value={post.artwork_status}
                      />
                    </div>

                    <div className="campaign-post-status-desktop">
                      <StatusBadge kind={postKind} label={postLabel} />
                    </div>

                    <div className="campaign-post-actions">
                      <Link
                        href={`/admin/posts/${post.id}` as Route}
                        className="btn btn-ghost btn-sm"
                      >
                        <Icon name="arrow" size={12} />
                        Ver card
                      </Link>

                      {canManagePosts && (
                        <Link
                          href={`/admin/posts/${post.id}` as Route}
                          className="btn btn-primary btn-sm"
                        >
                          <Icon name="edit" size={12} />
                          Editar
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </WeekSection>
        ))
      )}
    </div>
  );
}