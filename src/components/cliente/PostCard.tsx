'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Icon } from '@/components/ui/Icon';

const PALETTES = [
  { bg: '#e8f0e5', fg: '#25411e' },
  { bg: '#fde5d3', fg: '#eb6013' },
  { bg: '#dbeafe', fg: '#1d4ed8' },
  { bg: '#ede9fe', fg: '#7c3aed' },
  { bg: '#fce7f3', fg: '#db2777' },
  { bg: '#d1fae5', fg: '#065f46' },
];

const FMT_CLASS: Record<string, string> = {
  reels: 'fmt fmt-reels',
  carrossel: 'fmt fmt-carrossel',
  post_estatico: 'fmt fmt-estatico',
  story: 'fmt fmt-stories',
  outro: 'fmt',
};

const FMT_LABEL: Record<string, string> = {
  reels: 'Reels',
  carrossel: 'Carrossel',
  post_estatico: 'Post estático',
  story: 'Story',
  outro: 'Outro',
};

const STATUS_KIND: Record<string, string> = {
  pendente: 'aguardando',
  em_revisao: 'revisao',
  aprovado: 'aprovado',
  em_producao: 'agendado',
  finalizado: 'publicado',
};

const STATUS_LABEL: Record<string, string> = {
  em_producao: 'Em produção',
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
    label: 'Ajuste',
    color: 'var(--orange)',
    bg: 'var(--orange-50)',
  },
  substituir_tema: {
    label: 'Substituir',
    color: 'var(--orange)',
    bg: 'var(--orange-50)',
  },
};

interface Post {
  id: string;
  week_label: string | null;
  format: string | null;
  title: string | null;
  theme: string | null;
  objective: string | null;
  general_status: string | null;
  theme_status: string | null;
  caption_status: string | null;
  artwork_status: string | null;
  thumbnail_url?: string;
}

function getFieldConfig(value: string | null) {
  return (
    FIELD_STATUS_CONFIG[value ?? 'aguardando'] ?? {
      label: value ?? 'Aguardando',
      color: 'var(--muted)',
      bg: 'var(--bg-2)',
    }
  );
}

function FieldMiniStatus({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  const cfg = getFieldConfig(value);

  return (
    <span
      title={`${label}: ${cfg.label}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '4px 7px',
        borderRadius: 999,
        background: cfg.bg,
        color: cfg.color,
        fontSize: 10,
        fontWeight: 800,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: cfg.color,
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
}

export default function PostCard({
  post,
  campaignId,
}: {
  post: Post;
  campaignId: string;
}) {
  const palette = PALETTES[post.id.charCodeAt(0) % PALETTES.length]!;
  const format = post.format ?? 'outro';
  const title = post.title ?? 'Post sem título';

  const fmtClass = FMT_CLASS[format] ?? 'fmt';
  const statusKind = (STATUS_KIND[post.general_status ?? 'pendente'] ??
    'rascunho') as any;
  const statusLabel = STATUS_LABEL[post.general_status ?? ''];

  return (
    <Link
      href={`/cliente/posts/${post.id}` as Route}
      style={{ textDecoration: 'none', color: 'inherit' }}
      aria-label={`Abrir post ${title}`}
    >
      <div className="client-post-card">
        <style>
          {`
            .client-post-card {
              background: #fff;
              border: 1px solid var(--line);
              border-radius: 22px;
              overflow: hidden;
              display: flex;
              flex-direction: column;
              cursor: pointer;
              transition:
                box-shadow .15s ease,
                transform .15s ease,
                border-color .15s ease;
              min-height: 100%;
            }

            .client-post-card:hover {
              transform: translateY(-2px);
              box-shadow: 0 18px 42px rgba(0, 0, 0, .08);
              border-color: rgba(37, 65, 30, .2);
            }

            .client-post-card-preview {
              height: 160px;
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;
              position: relative;
            }

            .client-post-card-body {
              padding: 16px;
              display: flex;
              flex-direction: column;
              gap: 11px;
              flex: 1;
            }

            .client-post-card-top {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 10px;
            }

            .client-post-card-title {
              font-size: 15px;
              font-weight: 800;
              line-height: 1.35;
              letter-spacing: -0.02em;
              color: var(--ink);
              overflow: hidden;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
            }

            .client-post-card-theme {
              color: var(--muted);
              font-size: 12px;
              line-height: 1.45;
              overflow: hidden;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
            }

            .client-post-card-statuses {
              display: flex;
              flex-wrap: wrap;
              gap: 6px;
              margin-top: auto;
            }

            .client-post-card-action {
              margin-top: 2px;
              padding-top: 12px;
              border-top: 1px solid var(--line-soft);
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 10px;
              color: var(--green);
              font-size: 12px;
              font-weight: 900;
            }

            @media (max-width: 640px) {
              .client-post-card {
                border-radius: 20px;
              }

              .client-post-card-preview {
                height: 190px;
              }

              .client-post-card-title {
                font-size: 16px;
              }
            }
          `}
        </style>

        <div
          className="client-post-card-preview"
          style={{
            background: palette.bg,
            padding: post.thumbnail_url ? 0 : 20,
          }}
        >
          {post.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.thumbnail_url}
              alt={title}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          ) : (
            <div style={{ textAlign: 'center', maxWidth: '100%' }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: `${palette.fg}20`,
                  margin: '0 auto 12px',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 4,
                    background: palette.fg,
                  }}
                />
              </div>

              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: palette.fg,
                  lineHeight: 1.45,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical' as const,
                }}
              >
                “{title}”
              </div>
            </div>
          )}
        </div>

        <div className="client-post-card-body">
          <div className="client-post-card-top">
            <span className={fmtClass}>{FMT_LABEL[format] ?? format}</span>
            <StatusBadge kind={statusKind} label={statusLabel} />
          </div>

          <div className="client-post-card-title">{title}</div>

          {post.theme && (
            <div className="client-post-card-theme">{post.theme}</div>
          )}

          <div className="client-post-card-statuses">
            <FieldMiniStatus label="Tema" value={post.theme_status} />
            <FieldMiniStatus label="Legenda" value={post.caption_status} />
            <FieldMiniStatus label="Arte" value={post.artwork_status} />
          </div>

          <div className="client-post-card-action">
            <span>Abrir para revisar</span>
            <Icon name="arrow" size={13} />
          </div>
        </div>
      </div>
    </Link>
  );
}