import { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import TeamMemberRow from '@/components/admin/TeamMemberRow';
import TeamInviteForm from '@/components/admin/TeamInviteForm';
import GoogleCalendarConnectionCard from '@/components/admin/GoogleCalendarConnectionCard';
import { Icon } from '@/components/ui/Icon';

export const metadata: Metadata = { title: 'Configurações' };

const ROLE_COLOR: Record<string, { bg: string; fg: string }> = {
  admin: { bg: 'var(--st-aprovado-bg)', fg: 'var(--st-aprovado-fg)' },
  equipe: { bg: 'var(--st-agendado-bg)', fg: 'var(--st-agendado-fg)' },
  cliente: { bg: 'var(--st-rascunho-bg)', fg: 'var(--st-rascunho-fg)' },
};

const DEFAULT_COLORS = {
  bg: 'var(--st-rascunho-bg)',
  fg: 'var(--st-rascunho-fg)',
};

export default async function ConfiguracoesPage() {
  const me = await requireAdmin();
  const supabase = await getSupabaseServerClient();

  const [
    { data: teamMembers },
    { count: totalClients },
    { count: totalCampaigns },
    { count: totalPosts },
    { count: totalFiles },
    { data: googleConnectionRow },
  ] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('id, name, email, role, created_at')
      .in('role', ['admin', 'equipe'])
      .order('role')
      .order('name'),
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase.from('campaigns').select('*', { count: 'exact', head: true }),
    supabase
      .from('content_items')
      .select('*', { count: 'exact', head: true }),
    supabase.from('files').select('*', { count: 'exact', head: true }),
    supabase
      .from('google_calendar_connections')
      .select('google_account_email, last_synced_at')
      .limit(1)
      .maybeSingle(),
  ]);

  const googleConnection = googleConnectionRow
    ? { email: googleConnectionRow.google_account_email as string, lastSyncedAt: googleConnectionRow.last_synced_at as string | null }
    : null;

  const adminsCount =
    teamMembers?.filter((member) => member.role === 'admin').length ?? 0;

  const equipeCount =
    teamMembers?.filter((member) => member.role === 'equipe').length ?? 0;

  const summaryItems = [
    {
      label: 'Clientes',
      value: totalClients ?? 0,
      icon: 'users',
      color: 'var(--green)',
    },
    {
      label: 'Cronogramas',
      value: totalCampaigns ?? 0,
      icon: 'calendar',
      color: 'var(--orange)',
    },
    {
      label: 'Posts',
      value: totalPosts ?? 0,
      icon: 'grid',
      color: '#1d4ed8',
    },
    {
      label: 'Arquivos',
      value: totalFiles ?? 0,
      icon: 'file',
      color: '#7c3aed',
    },
    {
      label: 'Admins',
      value: adminsCount,
      icon: 'settings',
      color: 'var(--green)',
    },
    {
      label: 'Equipe',
      value: equipeCount,
      icon: 'user',
      color: '#1d4ed8',
    },
  ];

  return (
    <div className="page settings-page" style={{ maxWidth: 1120 }}>
      <style>
        {`
          .settings-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            gap: 18px;
            margin-bottom: 24px;
          }

          .settings-header-card {
            background: var(--green);
            color: #fff;
            border-radius: 28px;
            padding: 28px;
            margin-bottom: 24px;
            position: relative;
            overflow: hidden;
          }

          .settings-header-card::before {
            content: '';
            position: absolute;
            right: -80px;
            top: -110px;
            width: 260px;
            height: 260px;
            border-radius: 999px;
            background: rgba(235, 96, 19, .2);
          }

          .settings-header-card::after {
            content: '';
            position: absolute;
            left: -90px;
            bottom: -120px;
            width: 240px;
            height: 240px;
            border-radius: 999px;
            background: rgba(255, 255, 255, .06);
          }

          .settings-header-content {
            position: relative;
            z-index: 1;
          }

          .settings-summary-grid {
            display: grid;
            grid-template-columns: repeat(6, minmax(0, 1fr));
            gap: 12px;
            margin-bottom: 24px;
          }

          .settings-summary-card {
            background: #fff;
            border: 1px solid var(--line);
            border-radius: 18px;
            padding: 16px;
          }

          .settings-summary-icon {
            width: 36px;
            height: 36px;
            border-radius: 13px;
            display: grid;
            place-items: center;
            margin-bottom: 12px;
          }

          .settings-summary-card strong {
            display: block;
            font-size: 28px;
            line-height: 1;
            letter-spacing: -0.04em;
            margin-top: 5px;
          }

          .settings-section-head {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 16px;
            flex-wrap: wrap;
          }

          .settings-team-shell {
            background: #fff;
            border: 1px solid var(--line);
            border-radius: 22px;
            overflow: hidden;
          }

          .settings-team-empty {
            padding: 34px 20px;
            text-align: center;
            color: var(--muted);
            font-size: 14px;
          }

          .settings-role-card {
            background: #fff;
            border: 1px solid var(--line);
            border-radius: 22px;
            padding: 20px;
          }

          .settings-role-list {
            display: flex;
            flex-direction: column;
            gap: 14px;
          }

          .settings-role-row {
            display: grid;
            grid-template-columns: 92px minmax(0, 1fr);
            gap: 12px;
            align-items: flex-start;
          }

          .settings-role-badge {
            font-size: 11px;
            font-weight: 800;
            padding: 5px 9px;
            border-radius: 8px;
            flex-shrink: 0;
            text-align: center;
            text-transform: capitalize;
          }

          .settings-role-desc {
            font-size: 13px;
            color: var(--ink-2);
            line-height: 1.55;
          }

          @media (max-width: 1100px) {
            .settings-summary-grid {
              grid-template-columns: repeat(3, minmax(0, 1fr));
            }
          }

          @media (max-width: 720px) {
            .settings-header-card {
              padding: 24px;
              border-radius: 24px;
            }

            .settings-summary-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .settings-section-head {
              align-items: flex-start;
              flex-direction: column;
            }

            .settings-role-row {
              grid-template-columns: 1fr;
              gap: 8px;
            }

            .settings-role-badge {
              width: fit-content;
            }
          }

          @media (max-width: 460px) {
            .settings-summary-grid {
              grid-template-columns: 1fr;
            }

            .settings-header-card {
              padding: 22px;
            }
          }
        `}
      </style>

      {/* Header */}
      <div className="settings-header-card">
        <div className="settings-header-content">
          <div
            className="eyebrow"
            style={{ color: 'rgba(255,255,255,.58)' }}
          >
            Admin · acesso restrito
          </div>

          <h1
            className="h1"
            style={{
              marginTop: 8,
              color: '#fff',
              fontSize: 32,
            }}
          >
            Configurações
          </h1>

          <p
            style={{
              margin: '10px 0 0',
              color: 'rgba(255,255,255,.72)',
              fontSize: 15,
              lineHeight: 1.55,
              maxWidth: 560,
            }}
          >
            Gerencie equipe, convites, permissões e dados principais do
            workspace Tucan.
          </p>
        </div>
      </div>

      {/* Stats do workspace */}
      <div className="settings-summary-grid">
        {summaryItems.map((item) => (
          <div key={item.label} className="settings-summary-card">
            <div
              className="settings-summary-icon"
              style={{
                background: `${item.color}18`,
                color: item.color,
              }}
            >
              <Icon name={item.icon} size={17} />
            </div>

            <div className="muted tiny">{item.label}</div>

            <strong style={{ color: item.color }}>{item.value}</strong>
          </div>
        ))}
      </div>

      {/* Criar novo usuário interno */}
      <TeamInviteForm />

      {/* Membros da equipe */}
      <section style={{ marginBottom: 28 }}>
        <div className="settings-section-head">
          <div>
            <h2 className="h2" style={{ fontSize: 20 }}>
              Equipe Tucan
            </h2>

            <p className="muted tiny" style={{ marginTop: 5, lineHeight: 1.5 }}>
              Altere permissões, reenvie convites ou remova membros da equipe.
            </p>
          </div>

          <span
            className="chip"
            style={{
              background: 'var(--green-50)',
              color: 'var(--green)',
              fontWeight: 800,
            }}
          >
            {teamMembers?.length ?? 0}{' '}
            {(teamMembers?.length ?? 0) === 1 ? 'membro' : 'membros'}
          </span>
        </div>

        <div className="settings-team-shell">
          {!teamMembers || teamMembers.length === 0 ? (
            <div className="settings-team-empty">
              Nenhum membro encontrado.
            </div>
          ) : (
            teamMembers.map((member, i) => (
              <TeamMemberRow
                key={member.id}
                member={member}
                isMe={member.id === me.id}
                isLast={i === teamMembers.length - 1}
              />
            ))
          )}
        </div>
      </section>

      {/* Integrações */}
      <section style={{ marginBottom: 28 }}>
        <div className="settings-section-head">
          <div>
            <h2 className="h2" style={{ fontSize: 20 }}>
              Integrações
            </h2>

            <p className="muted tiny" style={{ marginTop: 5, lineHeight: 1.5 }}>
              Conecte ferramentas externas para sincronizar a agenda interna da Tucan.
            </p>
          </div>
        </div>

        <GoogleCalendarConnectionCard connection={googleConnection} />
      </section>

      {/* Zona de acesso — legenda de roles */}
      <section className="settings-role-card">
        <div className="eyebrow" style={{ marginBottom: 14 }}>
          Acesso e permissões
        </div>

        <div className="settings-role-list">
          {[
            {
              role: 'admin',
              desc: 'Acesso total: gerenciar equipe, configurações, clientes, cronogramas e posts.',
            },
            {
              role: 'equipe',
              desc: 'Acesso operacional: criar e editar cronogramas, posts, clientes e observações. Não acessa Configurações.',
            },
            {
              role: 'cliente',
              desc: 'Acesso apenas ao portal do cliente: ver cronogramas, aprovar e comentar posts.',
            },
          ].map((row) => {
            const colors = ROLE_COLOR[row.role] ?? DEFAULT_COLORS;

            return (
              <div key={row.role} className="settings-role-row">
                <span
                  className="settings-role-badge"
                  style={{
                    background: colors.bg,
                    color: colors.fg,
                  }}
                >
                  {row.role === 'equipe'
                    ? 'Equipe'
                    : row.role === 'admin'
                      ? 'Admin'
                      : 'Cliente'}
                </span>

                <span className="settings-role-desc">{row.desc}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}