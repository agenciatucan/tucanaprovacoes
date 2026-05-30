import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Route } from 'next';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import TokenAccessForm from '@/components/auth/TokenAccessForm';
import { getPublicCampaignByAccess, getPublicSession } from '@/actions/public-access';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Icon } from '@/components/ui/Icon';
import PublicSessionLogout from '@/components/aprovacao/PublicSessionLogout';

export const metadata: Metadata = {
  title: 'Cronograma público',
};

interface Props {
  params: Promise<{ token: string }>;
}

const FMT_LABEL: Record<string, string> = {
  reels: 'Reels',
  carrossel: 'Carrossel',
  post_estatico: 'Post estático',
  story: 'Story',
  outro: 'Outro',
};

const POST_STATUS_KIND: Record<string, Parameters<typeof StatusBadge>[0]['kind']> = {
  pendente: 'aguardando',
  em_revisao: 'revisao',
  aprovado: 'aprovado',
  em_producao: 'agendado',
  finalizado: 'publicado',
};

function getClientName(client: any) {
  if (!client) return 'Cliente';

  return client.company_name ?? client.name ?? 'Cliente';
}

function getProgress(total: number, approved: number) {
  if (!total) return 0;

  return Math.round((approved / total) * 100);
}

export default async function PublicCampaignPage({ params }: Props) {
  const { token } = await params;

  const campaignResult = await getPublicCampaignByAccess(token);

  if (!campaignResult.success) {
    notFound();
  }

  const campaign = campaignResult.data.campaign;

  const session = await getPublicSession(campaign.id);

  if (!session) {
    return (
      <TokenAccessForm
        mode="identify-only"
        defaultAccess={token}
        campaignName={campaign.name}
      />
    );
  }

  const supabase = await getSupabaseServerClient();

  const { data: items } = await supabase
    .from('content_items')
    .select(
      'id, week_label, order_index, format, title, theme, objective, general_status, theme_status, caption_status, artwork_status'
    )
    .eq('campaign_id', campaign.id)
    .order('order_index');

  const posts = items ?? [];

  const total = posts.length;

  const approved = posts.filter((post) =>
    ['aprovado', 'finalizado'].includes(post.general_status ?? '')
  ).length;

  const pending = posts.filter(
    (post) => post.general_status === 'pendente'
  ).length;

  const inReview = posts.filter(
    (post) => post.general_status === 'em_revisao'
  ).length;

  const pct = getProgress(total, approved);

  const client = Array.isArray(campaign.clients)
    ? campaign.clients[0]
    : campaign.clients;

  return (
    <div className="page public-campaign-page" style={{ maxWidth: 1120 }}>
      <style>
        {`
          .public-campaign-hero {
            background: var(--green);
            color: #fff;
            border-radius: 28px;
            padding: 30px;
            margin-bottom: 22px;
            position: relative;
            overflow: hidden;
          }

          .public-campaign-hero::before {
            content: '';
            position: absolute;
            width: 260px;
            height: 260px;
            right: -90px;
            top: -110px;
            border-radius: 999px;
            background: rgba(235, 96, 19, .2);
          }

          .public-campaign-hero-inner {
            position: relative;
            z-index: 1;
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 22px;
            align-items: end;
          }

          .public-campaign-title {
            color: #fff;
            margin-top: 8px;
            font-size: 34px;
          }

          .public-campaign-text {
            margin: 10px 0 0;
            color: rgba(255,255,255,.74);
            font-size: 15px;
            line-height: 1.55;
            max-width: 560px;
          }

          .public-campaign-session {
            background: rgba(255,255,255,.1);
            border: 1px solid rgba(255,255,255,.12);
            border-radius: 18px;
            padding: 14px;
            min-width: 220px;
          }

          .public-campaign-summary {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 12px;
            margin-bottom: 24px;
          }

          .public-campaign-summary-card {
            background: #fff;
            border: 1px solid var(--line);
            border-radius: 18px;
            padding: 16px;
          }

          .public-campaign-summary-card strong {
            display: block;
            margin-top: 5px;
            font-size: 30px;
            line-height: 1;
            letter-spacing: -0.04em;
          }

          .public-campaign-progress {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 24px;
          }

          .public-post-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .public-post-card {
            background: #fff;
            border: 1px solid var(--line);
            border-radius: 22px;
            padding: 18px;
            color: inherit;
            text-decoration: none;
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 14px;
            align-items: center;
          }

          .public-post-title {
            font-size: 15px;
            font-weight: 800;
            color: var(--ink);
            line-height: 1.35;
          }

          .public-post-theme {
            margin-top: 5px;
            color: var(--muted);
            font-size: 13px;
            line-height: 1.45;
          }

          .public-post-meta {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            margin-top: 12px;
          }

          @media (max-width: 760px) {
            .public-campaign-hero {
              padding: 24px;
              border-radius: 24px;
            }

            .public-campaign-hero-inner {
              grid-template-columns: 1fr;
            }

            .public-campaign-session {
              min-width: 0;
            }

            .public-campaign-title {
              font-size: 28px;
            }

            .public-campaign-summary {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .public-campaign-progress {
              align-items: flex-start;
              flex-direction: column;
            }

            .public-campaign-progress .progress {
              width: 100%;
            }

            .public-post-card {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 460px) {
            .public-campaign-summary {
              grid-template-columns: 1fr;
            }
          }
        `}
      </style>

      <div className="public-campaign-hero">
        <div className="public-campaign-hero-inner">
          <div>
            <div
              className="eyebrow"
              style={{ color: 'rgba(255,255,255,.58)' }}
            >
              {getClientName(client)}
            </div>

            <h1 className="h1 public-campaign-title">{campaign.name}</h1>

            <p className="public-campaign-text">
              Revise os posts do cronograma, aprove o que estiver correto ou
              solicite ajustes para a equipe Tucan.
            </p>
          </div>

          <div className="public-campaign-session">
            <div
              className="eyebrow"
              style={{
                color: 'rgba(255,255,255,.55)',
                fontSize: 10,
              }}
            >
              Acesso identificado
            </div>

            <div
              style={{
                marginTop: 6,
                fontSize: 16,
                fontWeight: 900,
                color: '#fff',
              }}
            >
              {session.visitor_name}
            </div>

            <div
              style={{
                marginTop: 4,
                color: 'rgba(255,255,255,.65)',
                fontSize: 12,
              }}
            >
              Suas aprovações serão registradas com esse nome.
            </div>

            <PublicSessionLogout campaignId={campaign.id} token={token} />
          </div>
        </div>
      </div>

      <div className="public-campaign-summary">
        <div className="public-campaign-summary-card">
          <span className="muted tiny">Total</span>
          <strong>{total}</strong>
        </div>

        <div className="public-campaign-summary-card">
          <span
            className="tiny"
            style={{ color: 'var(--green)', fontWeight: 800 }}
          >
            Aprovados
          </span>
          <strong style={{ color: 'var(--green)' }}>{approved}</strong>
        </div>

        <div className="public-campaign-summary-card">
          <span
            className="tiny"
            style={{ color: 'var(--orange)', fontWeight: 800 }}
          >
            Pendentes
          </span>
          <strong style={{ color: 'var(--orange)' }}>{pending}</strong>
        </div>

        <div className="public-campaign-summary-card">
          <span
            className="tiny"
            style={{ color: '#92400e', fontWeight: 800 }}
          >
            Em revisão
          </span>
          <strong style={{ color: '#92400e' }}>{inReview}</strong>
        </div>
      </div>

      {total > 0 && (
        <div className="public-campaign-progress">
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

      <div style={{ marginBottom: 14 }}>
        <h2 className="h2" style={{ fontSize: 20 }}>
          Posts do cronograma
        </h2>

        <p className="muted tiny" style={{ marginTop: 4 }}>
          Clique em um post para revisar detalhes, legenda e arquivos.
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <p className="muted" style={{ margin: 0 }}>
            Nenhum post disponível neste cronograma.
          </p>
        </div>
      ) : (
        <div className="public-post-list">
          {posts.map((post) => {
            const statusKind =
              POST_STATUS_KIND[post.general_status ?? 'pendente'] ??
              'aguardando';

            return (
              <Link
                key={post.id}
                href={`/acesso/${campaign.approval_token}/posts/${post.id}` as Route}
                className="public-post-card"
              >
                <div style={{ minWidth: 0 }}>
                  <div className="muted tiny">
                    {post.week_label ?? 'Sem semana'} ·{' '}
                    {FMT_LABEL[post.format ?? 'outro'] ?? post.format}
                  </div>

                  <div className="public-post-title">
                    {post.title ?? 'Post sem título'}
                  </div>

                  {post.theme && (
                    <div className="public-post-theme">{post.theme}</div>
                  )}

                  <div className="public-post-meta">
                    <span className="chip">Tema: {post.theme_status ?? 'aguardando'}</span>
                    <span className="chip">Legenda: {post.caption_status ?? 'aguardando'}</span>
                    <span className="chip">Arte: {post.artwork_status ?? 'aguardando'}</span>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                  }}
                >
                  <StatusBadge kind={statusKind} />
                  <Icon name="chevron" size={15} color="var(--muted-2)" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}