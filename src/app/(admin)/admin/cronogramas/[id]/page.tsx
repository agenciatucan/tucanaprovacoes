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
    semana?: string;
    formato?: string;
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
      title={`${label}: ${cfg.label}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        borderRadius: 999,
        padding: '4px 8px',
        background: cfg.bg,
        color: cfg.color,
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: 'nowrap',
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

      {label}: {cfg.label}
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

function buildFilterHref(
  campaignId: string,
  filters: {
    status?: string;
    semana?: string;
    formato?: string;
  }
) {
  const params = new URLSearchParams();

  if (filters.status) params.set('status', filters.status);
  if (filters.semana) params.set('semana', filters.semana);
  if (filters.formato) params.set('formato', filters.formato);

  const query = params.toString();

  return `/admin/cronogramas/${campaignId}${query ? `?${query}` : ''}` as Route;
}

export default async function GerenciarCronogramaPage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const {
    status: filterStatus,
    semana: filterWeek,
    formato: filterFormat,
  } = await searchParams;

  const supabase = await getSupabaseServerClient();

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

  const approved = items.filter((i) =>
    ['aprovado', 'finalizado'].includes(i.general_status ?? '')
  ).length;

  const inReview = items.filter(
    (i) => i.general_status === 'em_revisao'
  ).length;

  const pending = items.filter(
    (i) => i.general_status === 'pendente'
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

  const weekOptions = [
    ...new Set(
      items
        .map((item) => item.week_label ?? 'Sem semana')
        .filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));

  const formatOptions = [
    ...new Set(
      items
        .map((item) => item.format ?? 'outro')
        .filter(Boolean)
    ),
  ];

  const filteredItems = items.filter((item) => {
    const itemStatus = item.general_status ?? 'pendente';
    const itemWeek = item.week_label ?? 'Sem semana';
    const itemFormat = item.format ?? 'outro';

    if (filterStatus && itemStatus !== filterStatus) return false;
    if (filterWeek && itemWeek !== filterWeek) return false;
    if (filterFormat && itemFormat !== filterFormat) return false;

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

  const hasFilters = Boolean(filterStatus || filterWeek || filterFormat);

  return (
    <div className="page" style={{ maxWidth: 1320 }}>
      {/* Breadcrumb */}
      <div className="crumb">
        <Link href="/admin/cronogramas">Cronogramas</Link>
        <span>/</span>
        {campaign.name}
      </div>

      {/* Campaign header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 24,
          marginBottom: 18,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ minWidth: 260 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 8,
              flexWrap: 'wrap',
            }}
          >
            <h1 className="h1" style={{ fontSize: 26 }}>
              {campaign.name}
            </h1>

            <StatusBadge
              kind={statusKind as Parameters<typeof StatusBadge>[0]['kind']}
              size="lg"
            />
          </div>

          <div className="muted" style={{ fontSize: 14 }}>
            {client?.company_name ?? client?.name} · {campaign.period_label} ·{' '}
            {FMT_LABEL[campaign.type] ?? campaign.type}
          </div>
        </div>

        <CampaignActions
          campaignId={id}
          status={campaign.status}
          approvalLink={approvalLink}
          isLocked={campaign.is_locked}
          editHref={`/admin/cronogramas/${id}/editar`}
        />
      </div>

      {/* Visibility notice */}
      <div
        style={{
          borderRadius: 14,
          border: `1px solid ${visibility.border}`,
          background: visibility.bg,
          padding: '12px 14px',
          marginBottom: 24,
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
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

      {/* Stats row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 14,
          marginBottom: 24,
        }}
      >
        {[
          { label: 'Total de posts', value: total, color: 'var(--ink)' },
          { label: 'Aprovados', value: approved, color: 'var(--green)' },
          { label: 'Em revisão', value: inReview, color: 'var(--orange)' },
          { label: 'Pendentes', value: pending, color: 'var(--muted)' },
        ].map((s) => (
          <div key={s.label} className="card-flat" style={{ padding: 16 }}>
            <div className="eyebrow" style={{ fontSize: 10 }}>
              {s.label}
            </div>

            <div
              style={{
                fontSize: 32,
                fontWeight: 700,
                letterSpacing: '-0.03em',
                color: s.color,
                marginTop: 4,
                lineHeight: 1,
              }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 24,
          }}
        >
          <div className="progress" style={{ flex: 1 }}>
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>

          <span
            className="muted tiny"
            style={{ fontWeight: 600, whiteSpace: 'nowrap' }}
          >
            {pct}% aprovado
          </span>
        </div>
      )}

      {/* Overview */}
      {campaign.overview && (
        <div
          className="card"
          style={{
            marginBottom: 24,
            background: 'var(--green-50)',
            border: '1px solid var(--green-100)',
          }}
        >
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

      {/* Posts header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
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

      {/* Filters */}
      {total > 0 && (
        <div
          style={{
            background: '#fff',
            border: '1px solid var(--line)',
            borderRadius: 14,
            padding: 12,
            marginBottom: 18,
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <Icon name="filter" size={14} color="var(--muted)" />

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { key: '', label: 'Todos' },
              { key: 'pendente', label: 'Pendentes' },
              { key: 'em_revisao', label: 'Ajustes' },
              { key: 'aprovado', label: 'Aprovados' },
              { key: 'em_producao', label: 'Em produção' },
              { key: 'finalizado', label: 'Finalizados' },
            ].map((status) => {
              const active = (filterStatus ?? '') === status.key;

              return (
                <Link
                  key={status.label}
                  href={buildFilterHref(id, {
                    status: status.key || undefined,
                    semana: filterWeek,
                    formato: filterFormat,
                  })}
                  className="chip"
                  style={{
                    textDecoration: 'none',
                    height: 30,
                    background: active ? 'var(--green)' : undefined,
                    color: active ? '#fff' : undefined,
                  }}
                >
                  {status.label}
                </Link>
              );
            })}
          </div>

          <div style={{ flex: 1 }} />

          {weekOptions.length > 0 && (
            <select
              defaultValue={filterWeek ?? ''}
              onChange={undefined}
              style={{
                height: 34,
                borderRadius: 10,
                border: '1px solid var(--line)',
                padding: '0 10px',
                fontSize: 12,
                color: 'var(--ink-2)',
                background: '#fff',
              }}
            >
              <option value="">Todas as semanas</option>
              {weekOptions.map((week) => (
                <option key={week} value={week}>
                  {week}
                </option>
              ))}
            </select>
          )}

          {formatOptions.length > 0 && (
            <select
              defaultValue={filterFormat ?? ''}
              style={{
                height: 34,
                borderRadius: 10,
                border: '1px solid var(--line)',
                padding: '0 10px',
                fontSize: 12,
                color: 'var(--ink-2)',
                background: '#fff',
              }}
            >
              <option value="">Todos os formatos</option>
              {formatOptions.map((format) => (
                <option key={format} value={format}>
                  {FMT_LABEL[format] ?? format}
                </option>
              ))}
            </select>
          )}

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
      )}

      {/* Posts */}
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
            <div
              style={{
                background: '#fff',
                border: '1px solid var(--line)',
                borderRadius: 'var(--r)',
                overflow: 'hidden',
              }}
            >
              {weeks[week]?.map((post, i) => {
                const postKind =
                  POST_STATUS_KIND[post.general_status ?? 'pendente'] ??
                  'aguardando';

                const format = post.format ?? 'outro';

                return (
                  <div
                    key={post.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        'minmax(220px, 1.5fr) 0.65fr 1.7fr 0.75fr 150px',
                      gap: 14,
                      padding: '14px 18px',
                      alignItems: 'center',
                      borderBottom:
                        i === (weeks[week]!.length - 1)
                          ? 'none'
                          : '1px solid var(--line-soft)',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 13,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {post.title ?? 'Post sem título'}
                      </div>

                      {post.theme && (
                        <div
                          className="muted tiny"
                          style={{
                            marginTop: 2,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {post.theme}
                        </div>
                      )}
                    </div>

                    <div>
                      <span
                        className={FMT_CLASS[format] ?? 'fmt'}
                        style={{ fontSize: 11 }}
                      >
                        {FMT_LABEL[format] ?? format}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        gap: 6,
                        flexWrap: 'wrap',
                        alignItems: 'center',
                      }}
                    >
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

                    <div>
                      <StatusBadge
                        kind={
                          postKind as Parameters<typeof StatusBadge>[0]['kind']
                        }
                        label={
                          POST_STATUS_LABEL[
                            post.general_status ?? 'pendente'
                          ] ?? undefined
                        }
                      />
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 6,
                        flexWrap: 'wrap',
                      }}
                    >
                      <Link
                        href={`/admin/posts/${post.id}` as Route}
                        className="btn btn-ghost btn-sm"
                        style={{
                          height: 30,
                          padding: '0 10px',
                          fontSize: 12,
                        }}
                      >
                        <Icon name="arrow" size={12} />
                        Ver card
                      </Link>
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