import { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Route } from 'next';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Icon } from '@/components/ui/Icon';
import CronogramaWeekTabs from '@/components/cliente/CronogramaWeekTabs';
import {
  isCampaignVisibleToClient,
  CAMPAIGN_STATUS_KIND,
  CAMPAIGN_STATUS_LABEL,
} from '@/lib/constants/status';

export const metadata: Metadata = { title: 'Cronograma' };

const FMT_LABEL: Record<string, string> = {
  reels: 'Reels',
  carrossel: 'Carrossel',
  post_estatico: 'Post estático',
  story: 'Story',
  outro: 'Outro',
};

interface Props {
  params: Promise<{ id: string }>;
}

type ContentItem = {
  id: string;
  week_label: string | null;
  order_index: number | null;
  format: string | null;
  title: string | null;
  theme: string | null;
  objective: string | null;
  creative_concept: string | null;
  theme_status: string | null;
  caption_status: string | null;
  artwork_status: string | null;
  general_status: string | null;
  thumbnail_url?: string;
};

function formatShortDate(value?: string | null) {
  if (!value) return null;

  return new Date(`${value}T00:00:00`)
    .toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    })
    .replace('.', '');
}

function getProgress(total: number, approved: number) {
  if (!total) return 0;

  return Math.round((approved / total) * 100);
}

export default async function CronogramaPage({ params }: Props) {
  const { id } = await params;

  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile) redirect('/login');

  const { data: campaign } = await supabase
    .from('campaigns')
    .select(
      'id, name, status, period_label, overview, start_date, end_date, client_id, is_locked, clients(name, company_name, logo_url)'
    )
    .eq('id', id)
    .single();

  if (!campaign) notFound();

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

  const { data: items } = await supabase
    .from('content_items')
    .select(
      'id, week_label, order_index, format, title, theme, objective, creative_concept, theme_status, caption_status, artwork_status, general_status'
    )
    .eq('campaign_id', id)
    .order('order_index');

  const { data: thumbFiles } = await supabase
    .from('files')
    .select('content_item_id, file_url')
    .eq('campaign_id', id)
    .eq('visible_to_client', true)
    .in('file_type', ['imagem', 'capa'])
    .order('created_at', { ascending: true });

  const thumbnailMap: Record<string, string> = {};

  thumbFiles?.forEach((file) => {
    if (file.content_item_id && !thumbnailMap[file.content_item_id]) {
      thumbnailMap[file.content_item_id] = file.file_url;
    }
  });

  const enrichedItems: ContentItem[] = (items ?? []).map((item) => ({
    ...item,
    thumbnail_url: thumbnailMap[item.id],
  }));

  const weeks: Record<string, ContentItem[]> = {};

  enrichedItems.forEach((item) => {
    const week = item.week_label ?? 'Sem semana';

    if (!weeks[week]) {
      weeks[week] = [];
    }

    weeks[week].push(item);
  });

  const weekKeys = Object.keys(weeks).sort((a, b) =>
    a.localeCompare(b, 'pt-BR', { numeric: true })
  );

  const client = Array.isArray(campaign.clients)
    ? campaign.clients[0]
    : campaign.clients;

  const total = enrichedItems.length;

  const approved = enrichedItems.filter((item) =>
    ['aprovado', 'finalizado'].includes(item.general_status ?? '')
  ).length;

  const pending = enrichedItems.filter(
    (item) => item.general_status === 'pendente'
  ).length;

  const inReview = enrichedItems.filter(
    (item) => item.general_status === 'em_revisao'
  ).length;

  const pct = getProgress(total, approved);

  const startLabel = formatShortDate(campaign.start_date);
  const endLabel = formatShortDate(campaign.end_date);

  return (
    <div className="page">
      <style>
        {`
          .client-campaign-hero {
            background: var(--green);
            color: #fff;
            border: none;
            position: relative;
            overflow: hidden;
            margin-bottom: 22px;
            border-radius: 28px;
            padding: 30px;
          }

          .client-campaign-hero::before {
            content: '';
            position: absolute;
            right: -40px;
            top: -60px;
            width: 260px;
            height: 260px;
            opacity: .08;
            background-image: url('/assets/tucano.png');
            background-size: 140px;
            background-repeat: no-repeat;
            background-position: top right;
            pointer-events: none;
          }

          .client-campaign-hero::after {
            content: '';
            position: absolute;
            left: -90px;
            bottom: -120px;
            width: 240px;
            height: 240px;
            border-radius: 999px;
            background: rgba(235, 96, 19, .16);
            pointer-events: none;
          }

          .client-campaign-hero-inner {
            position: relative;
            z-index: 1;
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 24px;
            align-items: start;
          }

          .client-campaign-kicker {
            font-size: 11px;
            font-weight: 800;
            color: rgba(255,255,255,.58);
            text-transform: uppercase;
            letter-spacing: .14em;
            margin-bottom: 10px;
          }

          .client-campaign-title {
            margin: 0;
            font-size: 32px;
            font-weight: 800;
            letter-spacing: -0.04em;
            line-height: 1.08;
            color: #fff;
          }

          .client-campaign-meta {
            display: flex;
            gap: 14px;
            color: rgba(255,255,255,.72);
            font-size: 13px;
            flex-wrap: wrap;
            margin-top: 14px;
          }

          .client-campaign-meta span {
            display: inline-flex;
            align-items: center;
            gap: 6px;
          }

          .client-campaign-progress-box {
            min-width: 210px;
            background: rgba(255,255,255,.08);
            border: 1px solid rgba(255,255,255,.1);
            border-radius: 18px;
            padding: 14px;
          }

          .client-campaign-progress-label {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            margin-top: 12px;
            font-size: 13px;
            color: rgba(255,255,255,.86);
            font-weight: 700;
          }

          .client-campaign-overview {
            position: relative;
            z-index: 1;
            margin-top: 20px;
            background: rgba(255,255,255,.08);
            border: 1px solid rgba(255,255,255,.1);
            border-radius: 16px;
            padding: 16px;
            display: flex;
            gap: 14px;
            align-items: flex-start;
          }

          .client-campaign-overview-icon {
            width: 34px;
            height: 34px;
            border-radius: 10px;
            background: rgba(235,96,19,.25);
            color: var(--orange);
            display: grid;
            place-items: center;
            flex-shrink: 0;
          }

          .client-campaign-overview-text {
            font-size: 13px;
            line-height: 1.65;
            color: rgba(255,255,255,.85);
          }

          .client-campaign-summary {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 12px;
            margin-bottom: 24px;
          }

          .client-campaign-summary-card {
            background: #fff;
            border: 1px solid var(--line);
            border-radius: 18px;
            padding: 16px;
          }

          .client-campaign-summary-card strong {
            display: block;
            margin-top: 5px;
            font-size: 28px;
            line-height: 1;
            letter-spacing: -0.04em;
          }

          .client-campaign-empty {
            padding: 44px 20px;
            text-align: center;
            border-radius: 22px;
          }

          @media (max-width: 820px) {
            .client-campaign-hero {
              padding: 24px;
              border-radius: 24px;
            }

            .client-campaign-hero-inner {
              grid-template-columns: 1fr;
            }

            .client-campaign-progress-box {
              min-width: 0;
              width: 100%;
            }

            .client-campaign-summary {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
          }

          @media (max-width: 560px) {
            .client-campaign-hero {
              padding: 20px;
            }

            .client-campaign-title {
              font-size: 27px;
            }

            .client-campaign-meta {
              flex-direction: column;
              gap: 8px;
            }

            .client-campaign-overview {
              flex-direction: column;
              gap: 10px;
            }

            .client-campaign-summary {
              grid-template-columns: 1fr;
            }
          }
        `}
      </style>

      <div className="crumb">
        <Link href="/cliente">Cronogramas</Link>
        <span>/</span>
        {campaign.name}
      </div>

      <div className="client-campaign-hero">
        <div className="client-campaign-hero-inner">
          <div style={{ minWidth: 0 }}>
            {(client as any)?.logo_url && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(255,255,255,0.12)', borderRadius: 10,
                padding: '5px 10px', marginBottom: 10,
              }}>
                <img
                  src={(client as any).logo_url}
                  alt={client?.company_name ?? ''}
                  style={{ height: 28, width: 'auto', maxWidth: 120, objectFit: 'contain' }}
                />
              </div>
            )}
            <div className="client-campaign-kicker">
              {client?.company_name ?? client?.name ?? 'Portal do cliente'}
            </div>

            <h1 className="client-campaign-title">{campaign.name}</h1>

            <div className="client-campaign-meta">
              {startLabel && (
                <span>
                  <Icon name="calendar" size={13} />
                  {startLabel}
                  {endLabel ? ` – ${endLabel}` : ''}
                </span>
              )}

              {!startLabel && campaign.period_label && (
                <span>
                  <Icon name="calendar" size={13} />
                  {campaign.period_label}
                </span>
              )}

              {total > 0 && (
                <span>
                  <Icon name="image" size={13} />
                  {total} {total === 1 ? 'publicação' : 'publicações'}
                </span>
              )}
            </div>
          </div>

          <div className="client-campaign-progress-box">
            <StatusBadge
              kind={(CAMPAIGN_STATUS_KIND[campaign.status] ?? 'aguardando') as any}
              label={CAMPAIGN_STATUS_LABEL[campaign.status] ?? campaign.status}
              size="lg"
            />

            {total > 0 && (
              <>
                <div
                  className="progress"
                  style={{
                    marginTop: 14,
                    background: 'rgba(255,255,255,.22)',
                  }}
                >
                  <div
                    className="progress-fill"
                    style={{
                      width: `${pct}%`,
                      background: '#fff',
                    }}
                  />
                </div>

                <div className="client-campaign-progress-label">
                  <span>{pct}% aprovado</span>
                  <span>
                    {approved}/{total}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

      </div>

      {total > 0 && (
        <div className="client-campaign-summary">
          {[
            {
              label: 'Total',
              value: total,
              color: 'var(--ink)',
              sub: 'Posts no cronograma',
            },
            {
              label: 'Aprovados',
              value: approved,
              color: 'var(--green)',
              sub: `${pct}% concluído`,
            },
            {
              label: 'Pendentes',
              value: pending,
              color: 'var(--orange)',
              sub: 'Aguardando sua aprovação',
            },
            {
              label: 'Em revisão',
              value: inReview,
              color: '#92400e',
              sub: 'Com a equipe Tucan',
            },
          ].map((item) => (
            <div key={item.label} className="client-campaign-summary-card">
              <div className="eyebrow" style={{ fontSize: 10 }}>
                {item.label}
              </div>

              <strong style={{ color: item.color }}>{item.value}</strong>

              <div className="muted tiny" style={{ marginTop: 6 }}>
                {item.sub}
              </div>
            </div>
          ))}
        </div>
      )}

      {weekKeys.length > 0 ? (
        <CronogramaWeekTabs
          weekKeys={weekKeys}
          postsByWeek={weeks}
          campaignId={id}
        />
      ) : (
        <div className="card client-campaign-empty">
          <p className="muted" style={{ marginBottom: 6 }}>
            Nenhum post adicionado a este cronograma ainda.
          </p>

          <p className="muted tiny" style={{ margin: 0 }}>
            Entre em contato com a Tucan Marketing Digital.
          </p>
        </div>
      )}
    </div>
  );
}