import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Route } from 'next';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { Icon } from '@/components/ui/Icon';
import PostForm from '@/components/admin/PostForm';
import MediaUploader from '@/components/admin/MediaUploader';
import PostTimeline from '@/components/admin/PostTimeline';

export const metadata: Metadata = { title: 'Post' };

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ campaign?: string }>;
}

const STATUS_CFG: Record<string, { label: string; bg: string; fg: string }> = {
  aguardando: {
    label: 'Aguardando',
    bg: '#f9fafb',
    fg: '#6b7280',
  },
  aprovado: {
    label: 'Aprovado',
    bg: '#f0fdf4',
    fg: '#166534',
  },
  ajuste_solicitado: {
    label: 'Ajuste solicitado',
    bg: '#fffbeb',
    fg: '#92400e',
  },
  substituir_tema: {
    label: 'Substituir tema',
    bg: '#fffbeb',
    fg: '#92400e',
  },
  nao_se_aplica: {
    label: 'Não se aplica',
    bg: '#f3f4f6',
    fg: '#9ca3af',
  },
  pendente: {
    label: 'Pendente',
    bg: '#f9fafb',
    fg: '#6b7280',
  },
  em_revisao: {
    label: 'Em revisão',
    bg: '#eff6ff',
    fg: '#1d4ed8',
  },
  em_producao: {
    label: 'Em produção',
    bg: '#f5f3ff',
    fg: '#6d28d9',
  },
  finalizado: {
    label: 'Finalizado',
    bg: '#f0fdf4',
    fg: '#166534',
  },
};

const FORMAT_LABEL: Record<string, string> = {
  reels: 'Reels',
  carrossel: 'Carrossel',
  post_estatico: 'Post estático',
  story: 'Story',
  outro: 'Outro',
};

const FORMAT_CLASS: Record<string, string> = {
  reels: 'fmt fmt-reels',
  carrossel: 'fmt fmt-carrossel',
  post_estatico: 'fmt fmt-estatico',
  story: 'fmt fmt-stories',
  outro: 'fmt',
};

function getStatusConfig(status?: string | null) {
  return (
    STATUS_CFG[status ?? 'aguardando'] ?? {
      label: status ?? 'Aguardando',
      bg: '#f9fafb',
      fg: '#6b7280',
    }
  );
}

function StatusPill({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  const cfg = getStatusConfig(value);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        padding: '10px 0',
        borderBottom: '1px solid var(--line-soft)',
      }}
    >
      <span className="muted tiny">{label}</span>

      <span
        style={{
          fontSize: 11,
          fontWeight: 800,
          padding: '4px 9px',
          borderRadius: 999,
          background: cfg.bg,
          color: cfg.fg,
          whiteSpace: 'nowrap',
        }}
      >
        {cfg.label}
      </span>
    </div>
  );
}

export default async function AdminPostPage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const { campaign: campaignIdParam } = await searchParams;

  const isNew = id === 'novo';

  const supabase = await getSupabaseServerClient();

  if (isNew) {
    if (!campaignIdParam) {
      notFound();
    }

    const [{ data: campaign }, { data: existingItems }] = await Promise.all([
      supabase
        .from('campaigns')
        .select('id, name, client_id, clients(name, company_name)')
        .eq('id', campaignIdParam)
        .single(),
      supabase
        .from('content_items')
        .select('week_label')
        .eq('campaign_id', campaignIdParam)
        .order('order_index'),
    ]);

    if (!campaign) {
      notFound();
    }

    const existingWeeks = [
      ...new Set(
        (existingItems ?? [])
          .map((item) => item.week_label)
          .filter((week): week is string => Boolean(week))
      ),
    ];

    const client = Array.isArray(campaign.clients)
      ? campaign.clients[0]
      : campaign.clients;

    return (
      <div className="page admin-post-page" style={{ maxWidth: 920 }}>
        <style>
          {`
            .admin-post-header {
              display: flex;
              align-items: flex-end;
              justify-content: space-between;
              gap: 18px;
              margin-bottom: 24px;
            }

            .admin-post-form-card {
              border-radius: 24px;
            }

            @media (max-width: 760px) {
              .admin-post-header {
                align-items: stretch;
                flex-direction: column;
              }

              .admin-post-header .btn {
                width: 100%;
              }

              .admin-post-form-card {
                padding: 18px;
                border-radius: 20px;
              }
            }
          `}
        </style>

        <div className="crumb" style={{ marginBottom: 18 }}>
          <Link href="/admin/cronogramas">Cronogramas</Link>
          <span>/</span>
          <Link href={`/admin/cronogramas/${campaign.id}` as Route}>
            {campaign.name}
          </Link>
          <span>/</span>
          Novo post
        </div>

        <div className="admin-post-header">
          <div>
            <div className="eyebrow">
              {client?.company_name ?? client?.name ?? 'Cliente'}
            </div>

            <h1 className="h1" style={{ marginTop: 6 }}>
              Novo post
            </h1>

            <p className="muted" style={{ marginTop: 6, fontSize: 14 }}>
              Adicionar ao cronograma: <strong>{campaign.name}</strong>
            </p>
          </div>

          <Link
            href={`/admin/cronogramas/${campaign.id}` as Route}
            className="btn btn-ghost btn-sm"
          >
            <Icon name="arrow-left" size={14} />
            Voltar
          </Link>
        </div>

        <div className="card card-lg admin-post-form-card">
          <PostForm
            campaignId={campaign.id}
            returnHref={`/admin/cronogramas/${campaign.id}`}
            existingWeeks={existingWeeks}
          />
        </div>
      </div>
    );
  }

  const { data: post } = await supabase
    .from('content_items')
    .select('*, campaigns(id, name, client_id, clients(name, company_name))')
    .eq('id', id)
    .single();

  if (!post) {
    notFound();
  }

  const campaign = Array.isArray(post.campaigns)
    ? post.campaigns[0]
    : post.campaigns;

  const client = Array.isArray(campaign?.clients)
    ? campaign?.clients[0]
    : campaign?.clients;

  const [
    { data: creatorProfile },
    { data: approvalHistory },
    { data: postFiles },
  ] = await Promise.all([
    post.created_by
      ? supabase
          .from('user_profiles')
          .select('name')
          .eq('id', post.created_by)
          .maybeSingle()
      : Promise.resolve({ data: null }),

    supabase
      .from('approvals')
      .select(
        'id, approval_type, status, note, created_at, approved_by, user_profiles!approved_by(name, role)'
      )
      .eq('content_item_id', id)
      .order('created_at', { ascending: true }),

    supabase
      .from('files')
      .select(
        'id, file_name, file_url, file_type, file_size_bytes, visible_to_client'
      )
      .eq('content_item_id', id)
      .order('created_at', { ascending: true }),
  ]);

  const { data: comments } = await supabase
    .from('comments_history')
    .select('id, message, created_at, user_profiles!user_id(name)')
    .eq('content_item_id', id)
    .order('created_at', { ascending: false })
    .limit(10);

  const returnHref = `/admin/cronogramas/${campaign?.id}`;

  const normalizedHistory = (approvalHistory ?? []).map((event) => ({
    ...event,
    user_profiles: Array.isArray(event.user_profiles)
      ? event.user_profiles[0] ?? null
      : event.user_profiles,
  }));

  const format = post.format ?? 'outro';
  const formatLabel = FORMAT_LABEL[format] ?? format;
  const formatClass = FORMAT_CLASS[format] ?? 'fmt';

  return (
    <div className="page admin-post-page" style={{ maxWidth: 1280 }}>
      <style>
        {`
          .admin-post-header {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            gap: 18px;
            margin-bottom: 24px;
          }

          .admin-post-title-wrap {
            min-width: 0;
          }

          .admin-post-title {
            margin-top: 6px;
            font-size: 28px;
            line-height: 1.12;
            max-width: 820px;
          }

          .admin-post-meta {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            align-items: center;
            margin-top: 10px;
          }

          .admin-post-layout {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 320px;
            gap: 28px;
            align-items: start;
          }

          .admin-post-main {
            min-width: 0;
          }

          .admin-post-sidebar {
            display: flex;
            flex-direction: column;
            gap: 16px;
            min-width: 0;
          }

          .admin-post-sidebar-card {
            border-radius: 20px;
          }

          .admin-post-sidebar-title {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 14px;
          }

          .admin-post-file-note {
            margin-top: 10px;
            padding: 10px 12px;
            border-radius: 14px;
            background: var(--bg);
            color: var(--muted);
            font-size: 12px;
            line-height: 1.5;
          }

          @media (max-width: 980px) {
            .admin-post-layout {
              grid-template-columns: 1fr;
            }

            .admin-post-sidebar {
              order: -1;
            }

            .admin-post-sidebar {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
          }

          @media (max-width: 720px) {
            .admin-post-header {
              align-items: stretch;
              flex-direction: column;
            }

            .admin-post-header .btn {
              width: 100%;
            }

            .admin-post-title {
              font-size: 25px;
            }

            .admin-post-sidebar {
              grid-template-columns: 1fr;
            }

            .admin-post-sidebar-card {
              padding: 16px;
              border-radius: 18px;
            }

            .admin-post-meta {
              overflow-x: auto;
              flex-wrap: nowrap;
              padding-bottom: 2px;
            }

            .admin-post-meta > * {
              flex-shrink: 0;
            }
          }
        `}
      </style>

      <div className="crumb" style={{ marginBottom: 18 }}>
        <Link href="/admin/cronogramas">Cronogramas</Link>
        <span>/</span>
        <Link href={returnHref as Route}>{campaign?.name}</Link>
        <span>/</span>
        {post.title}
      </div>

      <div className="admin-post-header">
        <div className="admin-post-title-wrap">
          <div className="eyebrow">
            {client?.company_name ?? client?.name ?? 'Cliente'}
          </div>

          <h1 className="h1 admin-post-title">
            {post.title ?? 'Post sem título'}
          </h1>

          <div className="admin-post-meta">
            <span className="chip">{post.week_label ?? 'Sem semana'}</span>
            <span className={formatClass}>{formatLabel}</span>

            {post.general_status && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '5px 9px',
                  borderRadius: 999,
                  background: getStatusConfig(post.general_status).bg,
                  color: getStatusConfig(post.general_status).fg,
                }}
              >
                {getStatusConfig(post.general_status).label}
              </span>
            )}
          </div>
        </div>

        <Link href={returnHref as Route} className="btn btn-ghost btn-sm">
          <Icon name="arrow-left" size={14} />
          Voltar ao cronograma
        </Link>
      </div>

      <div className="admin-post-layout">
        <div className="admin-post-main">
          <PostTimeline
            post={{
              id: post.id,
              campaign_id: campaign?.id ?? '',
              week_label: post.week_label,
              order_index: post.order_index,
              format: post.format,
              title: post.title,
              theme: post.theme,
              objective: post.objective,
              creative_concept: post.creative_concept,
              caption: post.caption,
              script: post.script,
              reference_url: post.reference_url,
              internal_notes: post.internal_notes,
              scheduled_date: post.scheduled_date,
              theme_status: post.theme_status,
              caption_status: post.caption_status,
              artwork_status: post.artwork_status,
              general_status: post.general_status,
              created_at: post.created_at,
            }}
            campaignId={campaign?.id ?? ''}
            createdByName={creatorProfile?.name ?? null}
            approvalHistory={normalizedHistory}
            comments={comments ?? []}
            returnHref={returnHref}
          />
        </div>

        <aside className="admin-post-sidebar">
          <div className="card admin-post-sidebar-card">
            <div className="admin-post-sidebar-title">
              <Icon name="check" size={15} color="var(--green)" />
              <div className="eyebrow">Status de aprovação</div>
            </div>

            <StatusPill label="Tema" value={post.theme_status} />
            <StatusPill label="Legenda" value={post.caption_status} />
            <StatusPill label="Arte" value={post.artwork_status} />

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                padding: '10px 0 0',
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: 'var(--ink)',
                }}
              >
                Geral
              </span>

              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '4px 9px',
                  borderRadius: 999,
                  background: getStatusConfig(post.general_status).bg,
                  color: getStatusConfig(post.general_status).fg,
                  whiteSpace: 'nowrap',
                }}
              >
                {getStatusConfig(post.general_status).label}
              </span>
            </div>
          </div>

          <div className="card admin-post-sidebar-card">
            <div className="admin-post-sidebar-title">
              <Icon name="upload" size={15} color="var(--orange)" />
              <div className="eyebrow">Arquivos do post</div>
            </div>

            <MediaUploader
              contentItemId={post.id}
              campaignId={campaign?.id ?? ''}
              clientId={campaign?.client_id ?? ''}
              initialFiles={postFiles ?? []}
            />

            <div className="admin-post-file-note">
              Marque como visível ao cliente apenas os arquivos finais ou
              arquivos que ele precisa aprovar.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}