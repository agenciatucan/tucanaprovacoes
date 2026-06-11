import { Metadata } from 'next';
import Link from 'next/link';
import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Icon } from '@/components/ui/Icon';
import { timeAgo } from '@/lib/utils';
import {
  CAMPAIGN_STATUS_KIND,
  CLIENT_VISIBLE_CAMPAIGN_STATUSES,
} from '@/lib/constants/status';

export const metadata: Metadata = { title: 'Meus cronogramas' };

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

function getFirstName(name?: string | null) {
  const cleanName = name?.trim();

  if (!cleanName) return 'Cliente';

  return cleanName.split(' ')[0];
}

function getProgress(total: number, approved: number) {
  if (!total) return 0;

  return Math.round((approved / total) * 100);
}

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
  const firstName = getFirstName(profile.name);

  const primaryClient = clientUsers?.[0];
  const clientData = Array.isArray(primaryClient?.clients)
    ? primaryClient?.clients[0]
    : primaryClient?.clients;

  const [{ data: campaigns }, { data: planningSchedules }] = await Promise.all([
    supabase
      .from('campaigns')
      .select(
        'id, name, type, status, period_label, start_date, created_at, content_items(id, general_status)'
      )
      .in('client_id', clientIds.length > 0 ? clientIds : ['__none__'])
      .in('status', [...CLIENT_VISIBLE_CAMPAIGN_STATUSES])
      .order('created_at', { ascending: false }),
    supabase
      .from('planning_schedules')
      .select('id, title, month_year, status, approval_token')
      .in('client_id', clientIds.length > 0 ? clientIds : ['__none__'])
      .in('status', ['enviado_para_aprovacao', 'em_revisao', 'aprovado'])
      .order('created_at', { ascending: false }),
  ]);

  const campaignIds = campaigns?.map((campaign) => campaign.id) ?? [];

  const { data: pendingItems } =
    campaignIds.length > 0
      ? await supabase
          .from('content_items')
          .select('id, title, format, week_label, campaign_id, campaigns(name)')
          .in('campaign_id', campaignIds)
          .eq('general_status', 'pendente')
          .order('order_index')
          .limit(8)
      : { data: [] };

  const { data: recentActivity } =
    campaignIds.length > 0
      ? await supabase
          .from('comments_history')
          .select('id, message, created_at, content_item_id, content_items(title)')
          .in('campaign_id', campaignIds)
          .eq('status', 'aberta')
          .neq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(5)
      : { data: [] };

  const pendingTotal =
    campaigns?.reduce((acc, campaign) => {
      const items = Array.isArray(campaign.content_items)
        ? campaign.content_items
        : [];

      return (
        acc +
        items.filter(
          (item: { general_status: string }) =>
            item.general_status === 'pendente'
        ).length
      );
    }, 0) ?? 0;

  const approvedTotal =
    campaigns?.reduce((acc, campaign) => {
      const items = Array.isArray(campaign.content_items)
        ? campaign.content_items
        : [];

      return (
        acc +
        items.filter((item: { general_status: string }) =>
          ['aprovado', 'finalizado'].includes(item.general_status)
        ).length
      );
    }, 0) ?? 0;

  const totalItems =
    campaigns?.reduce((acc, campaign) => {
      const items = Array.isArray(campaign.content_items)
        ? campaign.content_items
        : [];

      return acc + items.length;
    }, 0) ?? 0;

  const inReviewTotal =
    campaigns?.reduce((acc, campaign) => {
      const items = Array.isArray(campaign.content_items)
        ? campaign.content_items
        : [];

      return (
        acc +
        items.filter(
          (item: { general_status: string }) =>
            item.general_status === 'em_revisao'
        ).length
      );
    }, 0) ?? 0;

  const latestCampaign = campaigns?.[0];

  return (
    <div className="page">
      <style>
        {`
          .cliente-hero {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 18px;
            align-items: end;
            margin-bottom: 24px;
          }

          .cliente-hero-card {
            background: var(--green);
            border-radius: 28px;
            padding: 28px;
            color: #fff;
            position: relative;
            overflow: hidden;
          }

          .cliente-hero-card::before {
            content: '';
            position: absolute;
            width: 220px;
            height: 220px;
            border-radius: 999px;
            background: rgba(235, 96, 19, .18);
            right: -70px;
            top: -90px;
          }

          .cliente-hero-card::after {
            content: '';
            position: absolute;
            width: 160px;
            height: 160px;
            border-radius: 999px;
            background: rgba(255, 255, 255, .06);
            left: -70px;
            bottom: -90px;
          }

          .cliente-hero-content {
            position: relative;
            z-index: 1;
          }

          .cliente-hero-eyebrow {
            color: rgba(255,255,255,.58);
          }

          .cliente-hero-title {
            margin: 8px 0 0;
            font-size: 34px;
            font-weight: 800;
            letter-spacing: -0.04em;
            line-height: 1.05;
          }

          .cliente-hero-text {
            margin: 10px 0 0;
            max-width: 520px;
            color: rgba(255,255,255,.72);
            font-size: 15px;
            line-height: 1.55;
          }

          .cliente-summary-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 12px;
            margin-bottom: 26px;
          }

          .cliente-summary-card {
            background: #fff;
            border: 1px solid var(--line);
            border-radius: 18px;
            padding: 16px;
          }

          .cliente-summary-card strong {
            display: block;
            margin-top: 6px;
            font-size: 32px;
            line-height: 1;
            letter-spacing: -0.04em;
          }

          .cliente-dashboard-grid {
            display: grid;
            grid-template-columns: minmax(0, 1.15fr) minmax(320px, .85fr);
            gap: 22px;
            align-items: start;
          }

          .cliente-side-column {
            display: flex;
            flex-direction: column;
            gap: 28px;
          }

          .cliente-section-head {
            display: flex;
            justify-content: space-between;
            align-items: end;
            gap: 12px;
            margin-bottom: 14px;
          }

          .cliente-campaign-list,
          .cliente-pending-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .cliente-campaign-card {
            display: grid;
            grid-template-columns: auto minmax(0, 1fr) auto;
            gap: 16px;
            align-items: center;
            background: #fff;
            border: 1px solid var(--line);
            border-radius: 22px;
            padding: 18px;
            text-decoration: none;
            color: inherit;
            transition:
              transform .15s ease,
              box-shadow .15s ease,
              border-color .15s ease;
          }

          .cliente-campaign-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 16px 36px rgba(0,0,0,.07);
            border-color: rgba(37,65,30,.22);
          }

          .cliente-campaign-icon {
            width: 52px;
            height: 52px;
            border-radius: 16px;
            display: grid;
            place-items: center;
            flex-shrink: 0;
          }

          .cliente-campaign-title-row {
            display: flex;
            gap: 10px;
            align-items: center;
            flex-wrap: wrap;
          }

          .cliente-campaign-title {
            font-size: 15px;
            font-weight: 800;
            color: var(--ink);
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .cliente-campaign-progress {
            margin-top: 10px;
            display: grid;
            grid-template-columns: minmax(110px, 1fr) auto;
            gap: 10px;
            align-items: center;
            max-width: 360px;
          }

          .cliente-pending-card {
            display: grid;
            grid-template-columns: auto minmax(0, 1fr) auto;
            gap: 12px;
            align-items: center;
            background: #fff;
            border: 1px solid var(--line);
            border-radius: 18px;
            padding: 14px;
            text-decoration: none;
            color: inherit;
            transition:
              transform .15s ease,
              box-shadow .15s ease,
              border-color .15s ease;
          }

          .cliente-pending-card:hover {
            transform: translateY(-1px);
            box-shadow: 0 12px 26px rgba(0,0,0,.06);
            border-color: rgba(235,96,19,.2);
          }

          .cliente-format-box {
            width: 42px;
            height: 42px;
            border-radius: 14px;
            background: var(--bg-2);
            display: grid;
            place-items: center;
            font-size: 12px;
            font-weight: 900;
            color: var(--ink);
            flex-shrink: 0;
          }

          .cliente-empty-card {
            background: #fff;
            border: 1px dashed var(--line);
            border-radius: 22px;
            padding: 36px 22px;
            text-align: center;
          }

          @media (max-width: 980px) {
            .cliente-hero {
              grid-template-columns: 1fr;
              align-items: stretch;
            }

            .cliente-summary-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .cliente-dashboard-grid {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 640px) {
            .cliente-hero-card {
              padding: 22px;
              border-radius: 24px;
            }

            .cliente-hero-title {
              font-size: 29px;
            }

            .cliente-hero-text {
              font-size: 14px;
            }

            .cliente-summary-grid {
              grid-template-columns: 1fr 1fr;
              gap: 10px;
            }

            .cliente-summary-card {
              padding: 14px;
              border-radius: 16px;
            }

            .cliente-summary-card strong {
              font-size: 27px;
            }

            .cliente-campaign-card {
              grid-template-columns: minmax(0, 1fr);
              padding: 16px;
              gap: 12px;
            }

            .cliente-campaign-icon {
              display: none;
            }

            .cliente-campaign-progress {
              max-width: none;
            }

            .cliente-campaign-card > div:last-child {
              display: flex;
              justify-content: space-between;
              align-items: center;
              gap: 10px;
            }

            .cliente-section-head {
              align-items: flex-start;
              flex-direction: column;
            }
          }

          @media (max-width: 420px) {
            .cliente-summary-grid {
              grid-template-columns: 1fr;
            }

            .cliente-pending-card {
              grid-template-columns: auto minmax(0, 1fr);
            }

            .cliente-pending-card > svg {
              display: none;
            }
          }
        `}
      </style>

      {/* Hero */}
      <div className="cliente-hero">
        <div className="cliente-hero-card">
          <div className="cliente-hero-content">
            <div className="eyebrow cliente-hero-eyebrow">
              {clientData?.company_name ?? clientData?.name ?? 'Portal do cliente'}
            </div>

            <h1 className="cliente-hero-title">Olá, {firstName} 👋</h1>

            <p className="cliente-hero-text">
              Acompanhe seus cronogramas, aprove posts e solicite ajustes de
              forma simples pelo portal.
            </p>

            {pendingTotal > 0 && (
              <div
                style={{
                  marginTop: 18,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  borderRadius: 999,
                  padding: '8px 12px',
                  background: 'rgba(235,96,19,.2)',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                <Icon name="bell" size={14} />
                {pendingTotal}{' '}
                {pendingTotal === 1
                  ? 'post aguardando aprovação'
                  : 'posts aguardando aprovação'}
              </div>
            )}
          </div>
        </div>

        {latestCampaign && (
          <Link
            href={`/cliente/cronogramas/${latestCampaign.id}` as Route}
            className="btn btn-dark"
          >
            Ver cronograma atual
            <Icon name="arrow" size={15} />
          </Link>
        )}
      </div>

      {/* Summary */}
      <div className="cliente-summary-grid">
        {[
          {
            label: 'Aguardando aprovação',
            value: pendingTotal,
            accent: 'var(--orange)',
            sub: 'Posts pendentes',
          },
          {
            label: 'Em revisão',
            value: inReviewTotal,
            accent: '#92400e',
            sub: 'Aguardando equipe Tucan',
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
        ].map((item) => (
          <div key={item.label} className="cliente-summary-card">
            <div className="eyebrow" style={{ fontSize: 10 }}>
              {item.label}
            </div>

            <strong style={{ color: item.accent }}>{item.value}</strong>

            <div className="muted tiny" style={{ marginTop: 6 }}>
              {item.sub}
            </div>
          </div>
        ))}
      </div>

      <div className="cliente-dashboard-grid">
        {/* Cronogramas */}
        <section>
          <div className="cliente-section-head">
            <div>
              <h2 className="h2" style={{ fontSize: 18 }}>
                Cronogramas disponíveis
              </h2>

              <p className="muted tiny" style={{ marginTop: 4 }}>
                Aprove cronograma por cronograma, no seu ritmo.
              </p>
            </div>
          </div>

          {!campaigns || campaigns.length === 0 ? (
            <div className="cliente-empty-card">
              <p className="muted" style={{ margin: 0 }}>
                Nenhum cronograma disponível no momento.
              </p>

              <p className="muted tiny" style={{ margin: '6px 0 0' }}>
                Entre em contato com a Tucan Marketing Digital.
              </p>
            </div>
          ) : (
            <div className="cliente-campaign-list">
              {campaigns.map((campaign, index) => {
                const items = Array.isArray(campaign.content_items)
                  ? campaign.content_items
                  : [];

                const total = items.length;

                const approved = items.filter(
                  (item: { general_status: string }) =>
                    ['aprovado', 'finalizado'].includes(item.general_status)
                ).length;

                const pct = getProgress(total, approved);
                const isCurrent = index === 0 && campaign.status !== 'finalizado';
                const statusKind =
                  CAMPAIGN_STATUS_KIND[campaign.status] ?? 'aguardando';

                return (
                  <Link
                    key={campaign.id}
                    href={`/cliente/cronogramas/${campaign.id}` as Route}
                    className="cliente-campaign-card"
                  >
                    <div
                      className="cliente-campaign-icon"
                      style={{
                        background: isCurrent
                          ? 'var(--green)'
                          : 'var(--bg-2)',
                        color: isCurrent ? '#fff' : 'var(--muted)',
                      }}
                    >
                      <Icon name="calendar" size={22} stroke={1.8} />
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div className="cliente-campaign-title-row">
                        <div className="cliente-campaign-title">
                          {campaign.name}
                        </div>

                        {isCurrent && (
                          <span
                            className="chip"
                            style={{
                              background: 'var(--green-50)',
                              color: 'var(--green)',
                            }}
                          >
                            Atual
                          </span>
                        )}
                      </div>

                      <div className="muted tiny" style={{ marginTop: 4 }}>
                        {campaign.period_label} ·{' '}
                        {FMT_LABEL[campaign.type] ?? campaign.type}
                      </div>

                      {total > 0 && (
                        <div className="cliente-campaign-progress">
                          <div className="progress">
                            <div
                              className="progress-fill"
                              style={{ width: `${pct}%` }}
                            />
                          </div>

                          <span
                            className="tiny"
                            style={{
                              color: 'var(--muted)',
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {approved}/{total} aprovados
                          </span>
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: 10,
                      }}
                    >
                      <StatusBadge kind={statusKind as any} />

                      <Icon
                        name="chevron"
                        size={16}
                        color="var(--muted-2)"
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <div className="cliente-side-column">
          {/* Planejamentos */}
          <section>
            {planningSchedules && planningSchedules.length > 0 && (
              <>
                <div className="cliente-section-head">
                  <div>
                    <h2 className="h2" style={{ fontSize: 18 }}>
                      Planejamentos de temas
                    </h2>
                    <p className="muted tiny" style={{ marginTop: 4 }}>
                      Aprove os temas antes da produção dos posts.
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {planningSchedules.map((p) => {
                  const isPending = p.status === 'enviado_para_aprovacao';
                  const isRevision = p.status === 'em_revisao';
                  const isApproved = p.status === 'aprovado';
                  const [year, month] = p.month_year.split('-');
                  const monthLabel = new Date(Number(year), Number(month) - 1, 1)
                    .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                  return (
                    <a
                      key={p.id}
                      href={`/acesso/planejamento/${p.approval_token}`}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'auto minmax(0,1fr) auto',
                        gap: 14,
                        alignItems: 'center',
                        background: '#fff',
                        border: `1px solid ${isPending ? 'var(--orange)' : 'var(--line)'}`,
                        borderRadius: 18,
                        padding: '16px 18px',
                        textDecoration: 'none',
                        color: 'inherit',
                        transition: 'transform .15s ease, box-shadow .15s ease',
                      }}
                    >
                      <div style={{
                        width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                        background: isPending ? 'var(--orange)' : isRevision ? '#fef3c7' : '#f0fdf4',
                        color: isPending ? '#fff' : isRevision ? '#92400e' : 'var(--green)',
                        display: 'grid', placeItems: 'center',
                      }}>
                        <Icon name={isApproved ? 'check-circle' : 'calendar'} size={20} stroke={1.8} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.title}
                        </div>
                        <div className="muted tiny" style={{ marginTop: 3 }}>{monthLabel}</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                        <StatusBadge
                          kind={isPending ? 'aguardando' : isRevision ? 'revisao' : 'aprovado'}
                          label={isPending ? 'Aguarda aprovação' : isRevision ? 'Em revisão' : 'Aprovado'}
                        />
                        <Icon name="chevron" size={14} color="var(--muted-2)" />
                      </div>
                    </a>
                  );
                  })}
                </div>
              </>
            )}
          </section>

          {/* Atividade recente */}
          {recentActivity && recentActivity.length > 0 && (
            <section>
              <div className="cliente-section-head">
                <div>
                  <h2 className="h2" style={{ fontSize: 18 }}>
                    Atividade recente
                  </h2>

                  <p className="muted tiny" style={{ marginTop: 4 }}>
                    Novidades da equipe sobre seus posts.
                  </p>
                </div>
              </div>

              <div className="cliente-pending-list">
                {recentActivity.map((activity) => {
                  const post = Array.isArray(activity.content_items)
                    ? activity.content_items[0]
                    : activity.content_items;

                  return (
                    <Link
                      key={activity.id}
                      href={`/cliente/posts/${activity.content_item_id}` as Route}
                      className="cliente-pending-card"
                    >
                      <div className="cliente-format-box">
                        <Icon name="message-circle" size={18} stroke={1.8} />
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div className="muted tiny">
                          {timeAgo(activity.created_at)} · {post?.title ?? 'Post'}
                        </div>

                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: 13,
                            marginTop: 2,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {activity.message}
                        </div>
                      </div>

                      <Icon name="arrow" size={14} color="var(--muted-2)" />
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Pendências */}
          <section>
            <div className="cliente-section-head">
              <div>
                <h2 className="h2" style={{ fontSize: 18 }}>
                  Pendências
                </h2>

                <p className="muted tiny" style={{ marginTop: 4 }}>
                  Posts esperando sua aprovação.
                </p>
              </div>
            </div>

            {!pendingItems || pendingItems.length === 0 ? (
              <div className="cliente-empty-card">
                <p className="muted" style={{ margin: 0 }}>
                  Nenhuma pendência no momento.
                </p>

                <p className="muted tiny" style={{ margin: '6px 0 0' }}>
                  Quando houver posts aguardando aprovação, eles aparecerão aqui.
                </p>
              </div>
            ) : (
              <div className="cliente-pending-list">
                {pendingItems.map((item) => {
                  const campaign = Array.isArray(item.campaigns)
                    ? item.campaigns[0]
                    : item.campaigns;

                  const format = item.format ?? 'outro';

                  return (
                    <Link
                      key={item.id}
                      href={`/cliente/posts/${item.id}` as Route}
                      className="cliente-pending-card"
                    >
                      <div className="cliente-format-box">
                        {FMT_LABEL[format]?.charAt(0) ?? 'P'}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div className="muted tiny">
                          {item.week_label} · {FMT_LABEL[format] ?? format}
                        </div>

                        <div
                          style={{
                            fontWeight: 800,
                            fontSize: 14,
                            marginTop: 2,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.title}
                        </div>

                        <div className="muted tiny" style={{ marginTop: 4 }}>
                          {campaign?.name ?? 'Cronograma'}
                        </div>
                      </div>

                      <Icon name="arrow" size={14} color="var(--muted-2)" />
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}