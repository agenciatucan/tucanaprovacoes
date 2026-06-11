import { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Route } from 'next';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Icon } from '@/components/ui/Icon';
import ApprovalPanel from '@/components/aprovacao/ApprovalPanel';
import MediaGallery from '@/components/cliente/MediaGallery';
import CopyButton from '@/components/cliente/CopyButton';
import {
  isCampaignVisibleToClient,
  POST_STATUS_KIND,
} from '@/lib/constants/status';

export const metadata: Metadata = { title: 'Post' };

interface Props {
  params: Promise<{ id: string }>;
}

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

function getFieldStatus(value?: string | null) {
  return (
    FIELD_STATUS_CONFIG[value ?? 'aguardando'] ?? {
      label: value ?? 'Aguardando',
      color: 'var(--muted)',
      bg: 'var(--bg-2)',
    }
  );
}

function MiniStatus({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  const cfg = getFieldStatus(value);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        minHeight: 28,
        borderRadius: 999,
        padding: '5px 9px',
        background: cfg.bg,
        color: cfg.color,
        fontSize: 11,
        fontWeight: 800,
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

export default async function PostDetailPage({ params }: Props) {
  const { id } = await params;

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

  const { data: post } = await supabase
    .from('content_items')
    .select(
      '*, campaigns(id, name, status, client_id, is_locked, clients(name, company_name, logo_url))'
    )
    .eq('id', id)
    .single();

  if (!post) notFound();

  const campaign = Array.isArray(post.campaigns)
    ? post.campaigns[0]
    : post.campaigns;

  if (!campaign) notFound();

  const client = Array.isArray(campaign.clients)
    ? campaign.clients[0]
    : campaign.clients;

  const clientName = client?.company_name || client?.name || null;
  const clientLogoUrl = client?.logo_url || null;

  if (!isCampaignVisibleToClient(campaign.status)) {
    notFound();
  }

  const { data: access } = await supabase
    .from('client_users')
    .select('id')
    .eq('user_id', profile.id)
    .eq('client_id', campaign.client_id)
    .maybeSingle();

  if (!access) notFound();

  const { data: comments } = await supabase
    .from('comments_history')
    .select('id, message, status, created_at, user_profiles!user_id(name)')
    .eq('content_item_id', id)
    .order('created_at', { ascending: false })
    .limit(10);

  const { data: files } = await supabase
    .from('files')
    .select('id, file_name, file_url, file_type, file_size_bytes')
    .eq('content_item_id', id)
    .eq('visible_to_client', true)
    .order('created_at', { ascending: true });

  const postTitle = post.title ?? 'Post sem título';
  const postFormat = post.format ?? 'outro';
  const statusKind =
    POST_STATUS_KIND[post.general_status as string] ?? 'rascunho';
  const fmtClass = FMT_CLASS[postFormat] ?? 'fmt';
  const fmtLabel = FMT_LABEL[postFormat] ?? postFormat;

  return (
    <div className="page" style={{ maxWidth: 1320 }}>
      <style>
        {`
          .client-post-header {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 18px;
            align-items: end;
            margin-bottom: 22px;
          }

          .client-post-title-wrap {
            min-width: 0;
          }

          .client-post-meta-row {
            display: flex;
            gap: 8px;
            align-items: center;
            margin-bottom: 10px;
            flex-wrap: wrap;
          }

          .client-post-title {
            font-size: 30px;
            max-width: 760px;
            line-height: 1.08;
            letter-spacing: -0.04em;
          }

          .client-post-grid {
            display: grid;
            grid-template-columns: minmax(320px, 1fr) minmax(320px, .95fr);
            gap: 24px;
            align-items: start;
          }

          .client-post-content-stack {
            display: flex;
            flex-direction: column;
            gap: 16px;
            min-width: 0;
          }

          .client-post-section-card {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          .client-post-text-card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 12px;
            gap: 12px;
          }

          .client-post-scroll-text {
            font-size: 14px;
            line-height: 1.75;
            color: var(--ink-2);
            white-space: pre-wrap;
            max-height: 280px;
            overflow-y: auto;
            padding-right: 4px;
          }

          .client-post-status-strip {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            margin-bottom: 18px;
          }

          .client-post-approval-wrap {
            margin-top: 24px;
          }

          @media (max-width: 980px) {
            .client-post-header {
              grid-template-columns: 1fr;
              align-items: stretch;
            }

            .client-post-header .btn {
              width: fit-content;
            }

            .client-post-grid {
              grid-template-columns: 1fr;
            }

            .client-post-title {
              font-size: 28px;
            }
          }

          @media (max-width: 640px) {
            .client-post-title {
              font-size: 25px;
            }

            .client-post-header .btn {
              width: 100%;
            }

            .client-post-status-strip {
              overflow-x: auto;
              flex-wrap: nowrap;
              padding-bottom: 2px;
              margin-left: -2px;
              margin-right: -2px;
            }

            .client-post-status-strip > span {
              flex-shrink: 0;
            }

            .client-post-text-card-header {
              align-items: flex-start;
              flex-direction: column;
            }

            .client-post-scroll-text {
              max-height: none;
              font-size: 14px;
            }
          }
        `}
      </style>

      <div className="crumb">
        <Link href="/cliente">Cronogramas</Link>
        <span>/</span>
        <Link href={`/cliente/cronogramas/${campaign.id}` as Route}>
          {campaign.name}
        </Link>
        <span>/</span>
        {post.week_label ?? 'Post'}
      </div>

      <div className="client-post-header">
        <div className="client-post-title-wrap">
          <div className="client-post-meta-row">
            <span className="chip">{post.week_label ?? 'Sem semana'}</span>
            <span className={fmtClass}>{fmtLabel}</span>
            <StatusBadge kind={statusKind as any} />
          </div>

          <h1 className="h1 client-post-title">{postTitle}</h1>
        </div>

        <Link
          href={`/cliente/cronogramas/${campaign.id}` as Route}
          className="btn btn-ghost btn-sm"
        >
          <Icon name="arrow-left" size={14} />
          Voltar ao cronograma
        </Link>
      </div>

      <div className="client-post-status-strip">
        <MiniStatus label="Tema" value={post.theme_status} />
        <MiniStatus label="Legenda" value={post.caption_status} />
        <MiniStatus label="Arte" value={post.artwork_status} />
      </div>

      <div className="client-post-grid">
        <MediaGallery
          files={files ?? []}
          postTitle={postTitle}
          postFormat={fmtLabel}
          format={postFormat}
          caption={post.caption}
          clientName={clientName}
          clientLogoUrl={clientLogoUrl}
        />

        <div className="client-post-content-stack">
          {post.theme && (
            <div className="card client-post-section-card">
              <div>
                <div className="eyebrow">Tema</div>
                <div
                  style={{
                    marginTop: 4,
                    fontWeight: 700,
                    fontSize: 15,
                    lineHeight: 1.45,
                  }}
                >
                  {post.theme}
                </div>
              </div>
            </div>
          )}

          {post.caption && (
            <div className="card">
              <div className="client-post-text-card-header">
                <div>
                  <div className="eyebrow">Legenda sugerida</div>
                  <p className="muted tiny" style={{ margin: '4px 0 0' }}>
                    Texto proposto para publicação.
                  </p>
                </div>

                <CopyButton text={post.caption} />
              </div>

              <div className="client-post-scroll-text">{post.caption}</div>
            </div>
          )}

          {post.script && (
            <div className="card">
              <div className="client-post-text-card-header">
                <div>
                  <div className="eyebrow">Roteiro</div>
                  <p className="muted tiny" style={{ margin: '4px 0 0' }}>
                    Estrutura sugerida para gravação.
                  </p>
                </div>

                <CopyButton text={post.script} />
              </div>

              <div className="client-post-scroll-text">{post.script}</div>
            </div>
          )}
        </div>
      </div>

      <div className="client-post-approval-wrap">
        <ApprovalPanel
          post={{
            id: post.id,
            campaign_id: campaign.id,
            theme_status: post.theme_status ?? 'aguardando',
            caption_status: post.caption_status ?? 'aguardando',
            artwork_status: post.artwork_status ?? 'aguardando',
            general_status: post.general_status ?? 'pendente',
            is_locked: Boolean(post.is_locked || campaign.is_locked),
          }}
          comments={comments ?? []}
        />
      </div>
    </div>
  );
}