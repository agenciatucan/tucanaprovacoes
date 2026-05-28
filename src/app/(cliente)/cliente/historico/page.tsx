import { Metadata } from 'next';
import Link from 'next/link';
import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Icon } from '@/components/ui/Icon';

export const metadata: Metadata = { title: 'Histórico — Portal Tucan' };

export default async function ClienteHistoricoPage() {
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
    .select('client_id')
    .eq('user_id', profile.id);

  const clientIds = clientUsers?.map((cu) => cu.client_id) ?? [];

  // Histórico do cliente:
  // Mostra somente cronogramas finalizados.
  // Não mostra rascunho, arquivado ou cronogramas ainda em andamento.
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select(
      'id, name, status, period_label, created_at, updated_at, content_items(id, general_status)'
    )
    .in('client_id', clientIds.length > 0 ? clientIds : ['__none__'])
    .eq('status', 'finalizado')
    .order('updated_at', { ascending: false });

  function formatDate(date?: string | null) {
    if (!date) return 'Sem data';

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(new Date(date));
  }

  return (
    <div className="page">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div className="eyebrow">Cronogramas finalizados</div>

        <h1 className="h1" style={{ marginTop: 6 }}>
          Histórico
        </h1>

        <p className="muted" style={{ marginTop: 6, fontSize: 14 }}>
          {campaigns?.length ?? 0}{' '}
          {(campaigns?.length ?? 0) === 1
            ? 'cronograma finalizado'
            : 'cronogramas finalizados'}
        </p>
      </div>

      {!campaigns || campaigns.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <p className="muted">Nenhum cronograma finalizado ainda.</p>

          <p className="muted tiny" style={{ marginTop: 6 }}>
            Quando um cronograma for finalizado pela equipe Tucan, ele aparecerá aqui.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {campaigns.map((campaign) => {
            const items = Array.isArray(campaign.content_items)
              ? campaign.content_items
              : [];

            const total = items.length;

            const approved = items.filter((item: { general_status: string }) =>
              ['aprovado', 'finalizado'].includes(item.general_status)
            ).length;

            const pct = total ? Math.round((approved / total) * 100) : 0;

            return (
              <Link
                key={campaign.id}
                href={`/cliente/cronogramas/${campaign.id}` as Route}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div
                  className="card"
                  style={{
                    padding: 20,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 18,
                    border: '1px solid var(--line)',
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 14,
                      background: 'var(--bg-2)',
                      color: 'var(--muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon name="calendar" size={22} stroke={1.8} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="h3">{campaign.name}</div>

                    <div className="muted tiny" style={{ marginTop: 4 }}>
                      {formatDate(campaign.updated_at ?? campaign.created_at)}
                    </div>

                    {total > 0 && (
                      <div
                        style={{
                          marginTop: 10,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          flexWrap: 'wrap',
                        }}
                      >
                        <div
                          className="progress"
                          style={{ flex: 1, maxWidth: 240, minWidth: 120 }}
                        >
                          <div
                            className="progress-fill"
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        <span
                          className="tiny"
                          style={{
                            color: 'var(--muted)',
                            fontWeight: 600,
                          }}
                        >
                          {approved}/{total} aprovados
                        </span>
                      </div>
                    )}
                  </div>

                  <StatusBadge kind="publicado" label="Finalizado" />

                  <Icon name="chevron" size={16} color="var(--muted-2)" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}