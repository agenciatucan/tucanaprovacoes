import { Metadata } from 'next';
import Link from 'next/link';
import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Icon } from '@/components/ui/Icon';

export const metadata: Metadata = { title: 'Aprovados — Portal Tucan' };

const FMT_LABEL: Record<string, string> = {
  reels: 'Reels', carrossel: 'Carrossel', post_estatico: 'Post estático', story: 'Story', outro: 'Outro',
};
const FMT_CLASS: Record<string, string> = {
  reels: 'fmt fmt-reels', carrossel: 'fmt fmt-carrossel',
  post_estatico: 'fmt fmt-estatico', story: 'fmt fmt-stories',
};

export default async function AprovadosPage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles').select('id, name').eq('auth_user_id', user.id).single();
  if (!profile) redirect('/login');

  // Clientes que o usuário tem acesso
  const { data: clientUsers } = await supabase
    .from('client_users').select('client_id').eq('user_id', profile.id);

  const clientIds = clientUsers?.map((cu) => cu.client_id) ?? [];

  // Campanhas dos clientes
  const { data: campaigns } = clientIds.length > 0
    ? await supabase
        .from('campaigns')
        .select('id, name, client_id')
        .in('client_id', clientIds)
    : { data: [] };

  const campaignIds = campaigns?.map((c) => c.id) ?? [];

  // Posts aprovados ou finalizados
  const { data: rawItems } = campaignIds.length > 0
    ? await supabase
        .from('content_items')
        .select('id, title, format, week_label, general_status, campaign_id, campaigns(id, name)')
        .in('campaign_id', campaignIds)
        .in('general_status', ['aprovado', 'finalizado'])
        .order('campaign_id')
        .order('week_label')
    : { data: null };
  const items = rawItems ?? [];

  // Agrupar por campanha
  const byCampaign: Record<string, { campaignName: string; campaignId: string; items: typeof items }> = {};
  items?.forEach((item) => {
    if (!byCampaign[item.campaign_id]) {
      const camp = Array.isArray(item.campaigns) ? item.campaigns[0] : item.campaigns;
      byCampaign[item.campaign_id] = {
        campaignId: item.campaign_id,
        campaignName: camp?.name ?? 'Cronograma',
        items: [],
      };
    }
    byCampaign[item.campaign_id]!.items!.push(item);
  });

  const groups = Object.values(byCampaign);
  const total  = items?.length ?? 0;

  return (
    <div className="page">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div className="eyebrow">Conteúdo aprovado</div>
        <h1 className="h1" style={{ marginTop: 6 }}>Aprovados</h1>
        {total > 0 && (
          <p className="muted" style={{ marginTop: 6, fontSize: 15 }}>
            <strong style={{ color: 'var(--green)' }}>{total}</strong> post{total !== 1 ? 's' : ''} aprovado{total !== 1 ? 's' : ''} no total.
          </p>
        )}
      </div>

      {groups.length === 0 ? (
        <div className="card" style={{ padding: 56, textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, background: 'var(--bg-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            color: 'var(--muted)',
          }}>
            <Icon name="check" size={22} stroke={1.5} />
          </div>
          <p className="muted" style={{ fontSize: 14 }}>Nenhum post aprovado ainda.</p>
          <p className="muted tiny" style={{ marginTop: 4 }}>Quando você aprovar posts no cronograma, eles aparecerão aqui.</p>
          <Link href="/cliente" className="btn btn-ghost btn-sm" style={{ marginTop: 16, display: 'inline-flex' }}>
            Ver cronogramas →
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {groups.map((group) => (
            <div key={group.campaignId}>
              {/* Cabeçalho da campanha */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h2 className="h2" style={{ fontSize: 17 }}>{group.campaignName}</h2>
                <Link
                  href={`/cliente/cronogramas/${group.campaignId}` as Route}
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: 12 }}
                >
                  Ver cronograma →
                </Link>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {group.items?.map((item) => {
                  const fmtClass = FMT_CLASS[item.format] ?? 'fmt';
                  const fmtLabel = FMT_LABEL[item.format] ?? item.format;
                  const isPublished = item.general_status === 'finalizado';

                  return (
                    <Link
                      key={item.id}
                      href={`/cliente/posts/${item.id}` as Route}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      <div className="card" style={{
                        padding: 16,
                        display: 'flex', flexDirection: 'column', gap: 10,
                        borderLeft: `3px solid ${isPublished ? 'var(--green)' : 'var(--green-100)'}`,
                        transition: 'box-shadow .15s',
                        height: '100%',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className={fmtClass} style={{ fontSize: 10 }}>{fmtLabel}</span>
                          <span className="chip" style={{ fontSize: 10 }}>{item.week_label}</span>
                          {isPublished && (
                            <StatusBadge kind="publicado" />
                          )}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4, flex: 1 }}>
                          {item.title}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--muted)', fontSize: 12 }}>
                          <Icon name="arrow" size={12} />
                          <span>Ver detalhes</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
