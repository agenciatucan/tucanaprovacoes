import { Metadata } from 'next';
import Link from 'next/link';
import type { Route } from 'next';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Icon } from '@/components/ui/Icon';

export const metadata: Metadata = { title: 'Visão geral' };

type StatusKind = Parameters<typeof StatusBadge>[0]['kind'];

const STATUS_KIND: Record<string, StatusKind> = {
  rascunho: 'rascunho',
  enviado_para_aprovacao: 'aguardando',
  em_revisao: 'revisao',
  aprovado: 'aprovado',
  em_producao: 'agendado',
  finalizado: 'publicado',
  arquivado: 'rascunho',
};

const STATUS_LABEL: Record<string, string> = {
  rascunho: 'Rascunho',
  enviado_para_aprovacao: 'Aguardando aprovação',
  em_revisao: 'Em revisão',
  aprovado: 'Aprovado',
  em_producao: 'Em produção',
  finalizado: 'Finalizado',
  arquivado: 'Arquivado',
};

function getClientName(client: any) {
  if (!client) return 'Cliente';

  return client.company_name ?? client.name ?? 'Cliente';
}

function formatDate(value?: string | null) {
  if (!value) return '—';

  return new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
}

export default async function AdminDashboard() {
  const supabase = await getSupabaseServerClient();

  const [
    { count: activeClients },
    { count: pendingApproval },
    { count: pendingPosts },
    { count: approvedPosts },
    { count: adjustPosts },
    { count: openComments },
    { data: recentComments },
    { data: pendingCampaigns },
    { data: recentCampaigns },
  ] = await Promise.all([
    supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'ativo'),

    supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'enviado_para_aprovacao'),

    supabase
      .from('content_items')
      .select('*', { count: 'exact', head: true })
      .eq('general_status', 'pendente'),

    supabase
      .from('content_items')
      .select('*', { count: 'exact', head: true })
      .eq('general_status', 'aprovado'),

    supabase
      .from('content_items')
      .select('*', { count: 'exact', head: true })
      .eq('general_status', 'em_revisao'),

    supabase
      .from('comments_history')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'aberta'),

    supabase
      .from('comments_history')
      .select('id, message, created_at, clients(id, name, company_name)')
      .eq('status', 'aberta')
      .order('created_at', { ascending: false })
      .limit(5),

    supabase
      .from('campaigns')
      .select('id, name, status, updated_at, clients(id, name, company_name)')
      .in('status', ['enviado_para_aprovacao', 'em_revisao'])
      .order('updated_at', { ascending: false })
      .limit(6),

    supabase
      .from('campaigns')
      .select('id, name, status, updated_at, clients(id, name, company_name)')
      .neq('status', 'arquivado')
      .order('updated_at', { ascending: false })
      .limit(5),
  ]);

  const stats = [
    {
      label: 'Clientes ativos',
      value: activeClients ?? 0,
      color: 'var(--green)',
      icon: 'users',
      href: '/admin/clientes',
    },
    {
      label: 'Aguardando aprovação',
      value: pendingApproval ?? 0,
      color: 'var(--orange)',
      icon: 'clock',
      href: '/admin/cronogramas?status=enviado_para_aprovacao',
    },
    {
      label: 'Posts pendentes',
      value: pendingPosts ?? 0,
      color: '#92400e',
      icon: 'flag',
      href: '/admin/kanban',
    },
    {
      label: 'Posts aprovados',
      value: approvedPosts ?? 0,
      color: 'var(--green)',
      icon: 'check',
      href: '/admin/kanban',
    },
    {
      label: 'Com ajuste solicitado',
      value: adjustPosts ?? 0,
      color: '#b54a07',
      icon: 'edit',
      href: '/admin/observacoes',
    },
    {
      label: 'Observações abertas',
      value: openComments ?? 0,
      color: '#1d4ed8',
      icon: 'message-circle',
      href: '/admin/observacoes',
    },
  ];

  const quickActions = [
    {
      href: '/admin/clientes/novo',
      label: 'Novo cliente',
      icon: 'users',
      primary: true,
    },
    {
      href: '/admin/cronogramas/novo',
      label: 'Novo cronograma',
      icon: 'calendar',
      primary: true,
    },
    {
      href: '/admin/kanban',
      label: 'Ver Kanban',
      icon: 'kanban',
      primary: false,
    },
    {
      href: '/admin/calendario',
      label: 'Calendário',
      icon: 'calendar',
      primary: false,
    },
    {
      href: '/admin/observacoes',
      label: 'Observações',
      icon: 'message-circle',
      primary: false,
    },
  ];

  return (
    <div className="page dashboard-page">
      <style>
        {`
          .dashboard-hero {
            background: var(--green);
            color: #fff;
            border-radius: 28px;
            padding: 30px;
            margin-bottom: 22px;
            position: relative;
            overflow: hidden;
          }

          .dashboard-hero::before {
            content: '';
            position: absolute;
            right: -70px;
            top: -100px;
            width: 260px;
            height: 260px;
            border-radius: 999px;
            background: rgba(235, 96, 19, .2);
          }

          .dashboard-hero::after {
            content: '';
            position: absolute;
            left: -90px;
            bottom: -120px;
            width: 240px;
            height: 240px;
            border-radius: 999px;
            background: rgba(255,255,255,.06);
          }

          .dashboard-hero-inner {
            position: relative;
            z-index: 1;
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 24px;
            align-items: end;
          }

          .dashboard-hero-title {
            color: #fff;
            margin-top: 8px;
            font-size: 34px;
          }

          .dashboard-hero-text {
            margin: 10px 0 0;
            max-width: 560px;
            color: rgba(255,255,255,.72);
            font-size: 15px;
            line-height: 1.55;
          }

          .dashboard-hero-actions {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            justify-content: flex-end;
          }

          .dashboard-stats-grid {
            display: grid;
            grid-template-columns: repeat(6, minmax(0, 1fr));
            gap: 12px;
            margin-bottom: 28px;
          }

          .dashboard-stat-card {
            display: block;
            background: #fff;
            border: 1px solid var(--line);
            border-radius: 18px;
            padding: 16px;
            text-decoration: none;
            color: inherit;
            transition:
              transform .15s ease,
              box-shadow .15s ease,
              border-color .15s ease;
          }

          .dashboard-stat-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 14px 34px rgba(0,0,0,.07);
            border-color: rgba(37,65,30,.2);
          }

          .dashboard-stat-icon {
            width: 36px;
            height: 36px;
            border-radius: 13px;
            display: grid;
            place-items: center;
            margin-bottom: 12px;
          }

          .dashboard-stat-card strong {
            display: block;
            margin-top: 5px;
            font-size: 32px;
            line-height: 1;
            letter-spacing: -0.04em;
          }

          .dashboard-main-grid {
            display: grid;
            grid-template-columns: minmax(0, 1.35fr) minmax(320px, .85fr);
            gap: 24px;
            align-items: start;
          }

          .dashboard-section-head {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            gap: 14px;
            margin-bottom: 14px;
          }

          .dashboard-section-link {
            color: var(--ink-2);
            font-size: 12px;
            font-weight: 800;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            white-space: nowrap;
          }

          .dashboard-section-link:hover {
            color: var(--green);
          }

          .dashboard-list-card {
            background: #fff;
            border: 1px solid var(--line);
            border-radius: 22px;
            overflow: hidden;
          }

          .dashboard-campaign-row {
            display: grid;
            grid-template-columns: auto minmax(0, 1fr) auto auto;
            gap: 14px;
            align-items: center;
            padding: 15px 18px;
            color: inherit;
            text-decoration: none;
            border-bottom: 1px solid var(--line-soft);
            transition: background .12s ease;
          }

          .dashboard-campaign-row:hover {
            background: #fafafa;
          }

          .dashboard-campaign-row:last-child {
            border-bottom: 0;
          }

          .dashboard-campaign-icon {
            width: 42px;
            height: 42px;
            border-radius: 14px;
            background: var(--green-50);
            color: var(--green);
            display: grid;
            place-items: center;
            flex-shrink: 0;
          }

          .dashboard-campaign-title {
            font-weight: 800;
            font-size: 14px;
            color: var(--ink);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .dashboard-campaign-subtitle {
            margin-top: 3px;
            color: var(--muted);
            font-size: 12px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .dashboard-comment-row {
            display: block;
            padding: 16px 18px;
            border-bottom: 1px solid var(--line-soft);
            text-decoration: none;
            color: inherit;
          }

          .dashboard-comment-row:last-child {
            border-bottom: 0;
          }

          .dashboard-comment-text {
            font-size: 13px;
            line-height: 1.55;
            color: var(--ink-2);
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
          }

          .dashboard-comment-meta {
            margin-top: 8px;
            display: flex;
            justify-content: space-between;
            gap: 10px;
            color: var(--muted);
            font-size: 12px;
          }

          .dashboard-empty {
            padding: 34px 20px;
            text-align: center;
            color: var(--muted);
            font-size: 14px;
          }

          .dashboard-recent-card {
            margin-top: 24px;
          }

          .dashboard-recent-grid {
            display: grid;
            grid-template-columns: repeat(5, minmax(0, 1fr));
            gap: 10px;
          }

          .dashboard-recent-item {
            background: #fff;
            border: 1px solid var(--line);
            border-radius: 18px;
            padding: 14px;
            color: inherit;
            text-decoration: none;
            min-width: 0;
          }

          .dashboard-recent-title {
            font-size: 13px;
            font-weight: 800;
            color: var(--ink);
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            min-height: 35px;
          }

          .dashboard-recent-sub {
            margin-top: 7px;
            color: var(--muted);
            font-size: 12px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          @media (max-width: 1180px) {
            .dashboard-stats-grid {
              grid-template-columns: repeat(3, minmax(0, 1fr));
            }

            .dashboard-recent-grid {
              grid-template-columns: repeat(3, minmax(0, 1fr));
            }
          }

          @media (max-width: 900px) {
            .dashboard-hero {
              padding: 24px;
              border-radius: 24px;
            }

            .dashboard-hero-inner {
              grid-template-columns: 1fr;
            }

            .dashboard-hero-actions {
              justify-content: flex-start;
            }

            .dashboard-main-grid {
              grid-template-columns: 1fr;
            }

            .dashboard-campaign-row {
              grid-template-columns: auto minmax(0, 1fr);
            }

            .dashboard-campaign-row > .status,
            .dashboard-campaign-row > svg {
              grid-column: 2 / -1;
            }

            .dashboard-campaign-row > .status {
              width: fit-content;
            }
          }

          @media (max-width: 640px) {
            .dashboard-hero {
              padding: 22px;
            }

            .dashboard-hero-title {
              font-size: 28px;
            }

            .dashboard-hero-text {
              font-size: 14px;
            }

            .dashboard-hero-actions {
              display: grid;
              grid-template-columns: 1fr;
            }

            .dashboard-stats-grid,
            .dashboard-recent-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 10px;
            }

            .dashboard-stat-card {
              padding: 14px;
            }

            .dashboard-stat-icon {
              width: 34px;
              height: 34px;
              margin-bottom: 10px;
            }

            .dashboard-stat-card strong {
              font-size: 28px;
            }

            .dashboard-section-head {
              align-items: flex-start;
              flex-direction: column;
            }

            .dashboard-comment-meta {
              flex-direction: column;
              gap: 3px;
            }
          }

          @media (max-width: 420px) {
            .dashboard-stats-grid,
            .dashboard-recent-grid {
              grid-template-columns: 1fr;
            }

            .dashboard-campaign-icon {
              display: none;
            }

            .dashboard-campaign-row {
              grid-template-columns: minmax(0, 1fr);
            }

            .dashboard-campaign-row > .status,
            .dashboard-campaign-row > svg {
              grid-column: auto;
            }
          }
        `}
      </style>

      {/* Hero */}
      <div className="dashboard-hero">
        <div className="dashboard-hero-inner">
          <div>
            <div
              className="eyebrow"
              style={{ color: 'rgba(255,255,255,.58)' }}
            >
              Tucan · Interno
            </div>

            <h1 className="h1 dashboard-hero-title">Visão geral</h1>

            <p className="dashboard-hero-text">
              Acompanhe a operação, veja pendências de aprovação e acesse
              rapidamente as principais áreas do portal.
            </p>
          </div>

          <div className="dashboard-hero-actions">
            <Link href="/admin/cronogramas/novo" className="btn btn-primary">
              <Icon name="plus" size={15} />
              Novo cronograma
            </Link>

            <Link href="/admin/clientes/novo" className="btn btn-ghost">
              <Icon name="users" size={15} />
              Novo cliente
            </Link>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="dashboard-stats-grid">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href as Route}
            className="dashboard-stat-card"
          >
            <div
              className="dashboard-stat-icon"
              style={{
                background: `${stat.color}18`,
                color: stat.color,
              }}
            >
              <Icon name={stat.icon} size={17} />
            </div>

            <div className="eyebrow" style={{ fontSize: 10 }}>
              {stat.label}
            </div>

            <strong style={{ color: stat.color }}>{stat.value}</strong>
          </Link>
        ))}
      </div>

      {/* Main grid */}
      <div className="dashboard-main-grid">
        {/* Cronogramas pendentes */}
        <section>
          <div className="dashboard-section-head">
            <div>
              <h2 className="h2" style={{ fontSize: 18 }}>
                Cronogramas em aprovação
              </h2>

              <p className="muted tiny" style={{ marginTop: 4 }}>
                Acompanhe o que está esperando o cliente ou voltou com ajuste.
              </p>
            </div>

            <Link href="/admin/cronogramas" className="dashboard-section-link">
              Ver todos
              <Icon name="arrow" size={12} />
            </Link>
          </div>

          <div className="dashboard-list-card">
            {!pendingCampaigns || pendingCampaigns.length === 0 ? (
              <div className="dashboard-empty">
                Nenhum cronograma aguardando aprovação.
              </div>
            ) : (
              pendingCampaigns.map((campaign, index) => {
                const client = Array.isArray(campaign.clients)
                  ? campaign.clients[0]
                  : campaign.clients;

                const kind = STATUS_KIND[campaign.status] ?? 'rascunho';
                const label = STATUS_LABEL[campaign.status];

                return (
                  <Link
                    key={campaign.id}
                    href={`/admin/cronogramas/${campaign.id}` as Route}
                    className="dashboard-campaign-row"
                    style={{
                      borderBottom:
                        index === pendingCampaigns.length - 1
                          ? 'none'
                          : undefined,
                    }}
                  >
                    <div className="dashboard-campaign-icon">
                      <Icon name="calendar" size={18} stroke={1.8} />
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div className="dashboard-campaign-title">
                        {campaign.name}
                      </div>

                      <div className="dashboard-campaign-subtitle">
                        {getClientName(client)} · Atualizado em{' '}
                        {formatDate(campaign.updated_at)}
                      </div>
                    </div>

                    <StatusBadge kind={kind} label={label} />

                    <Icon name="chevron" size={14} color="var(--muted-2)" />
                  </Link>
                );
              })
            )}
          </div>
        </section>

        {/* Observações abertas */}
        <section>
          <div className="dashboard-section-head">
            <div>
              <h2 className="h2" style={{ fontSize: 18 }}>
                Observações abertas
              </h2>

              <p className="muted tiny" style={{ marginTop: 4 }}>
                Feedbacks recentes enviados pelos clientes.
              </p>
            </div>

            <Link href="/admin/observacoes" className="dashboard-section-link">
              Ver todas
              <Icon name="arrow" size={12} />
            </Link>
          </div>

          <div className="dashboard-list-card">
            {!recentComments || recentComments.length === 0 ? (
              <div className="dashboard-empty">
                Nenhuma observação em aberto.
              </div>
            ) : (
              recentComments.map((comment) => {
                const client = Array.isArray(comment.clients)
                  ? comment.clients[0]
                  : comment.clients;

                return (
                  <Link
                    key={comment.id}
                    href="/admin/observacoes"
                    className="dashboard-comment-row"
                  >
                    <div className="dashboard-comment-text">
                      {comment.message}
                    </div>

                    <div className="dashboard-comment-meta">
                      <span>{getClientName(client)}</span>
                      <span>{formatDate(comment.created_at)}</span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* Recent campaigns */}
      {recentCampaigns && recentCampaigns.length > 0 && (
        <section className="dashboard-recent-card">
          <div className="dashboard-section-head">
            <div>
              <h2 className="h2" style={{ fontSize: 18 }}>
                Últimos cronogramas atualizados
              </h2>

              <p className="muted tiny" style={{ marginTop: 4 }}>
                Acesso rápido aos cronogramas movimentados recentemente.
              </p>
            </div>
          </div>

          <div className="dashboard-recent-grid">
            {recentCampaigns.map((campaign) => {
              const client = Array.isArray(campaign.clients)
                ? campaign.clients[0]
                : campaign.clients;

              const kind = STATUS_KIND[campaign.status] ?? 'rascunho';

              return (
                <Link
                  key={campaign.id}
                  href={`/admin/cronogramas/${campaign.id}` as Route}
                  className="dashboard-recent-item"
                >
                  <StatusBadge kind={kind} label={STATUS_LABEL[campaign.status]} />

                  <div className="dashboard-recent-title" style={{ marginTop: 10 }}>
                    {campaign.name}
                  </div>

                  <div className="dashboard-recent-sub">
                    {getClientName(client)}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}