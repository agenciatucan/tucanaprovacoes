import { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Icon } from '@/components/ui/Icon';
import PostCard from '@/components/cliente/PostCard';

export const metadata: Metadata = { title: 'Cronograma' };

interface Props { params: Promise<{ id: string }>; }

export default async function CronogramaPage({ params }: Props) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles').select('id').eq('auth_user_id', user.id).single();
  if (!profile) redirect('/login');

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, name, status, period_label, overview, client_id, is_locked, clients(name, company_name)')
    .eq('id', id).single();

  if (!campaign) notFound();

  // Verify access
  const { data: access } = await supabase
    .from('client_users').select('id').eq('user_id', profile.id).eq('client_id', campaign.client_id).maybeSingle();
  if (!access) notFound();

  const { data: items } = await supabase
    .from('content_items')
    .select('id, week_label, order_index, format, title, theme, objective, creative_concept, theme_status, caption_status, artwork_status, general_status')
    .eq('campaign_id', id)
    .order('order_index');

  // Group by week
  const weeks: Record<string, typeof items> = {};
  items?.forEach((item) => {
    if (!weeks[item.week_label]) weeks[item.week_label] = [];
    weeks[item.week_label]!.push(item);
  });
  const weekKeys = Object.keys(weeks);

  const client = Array.isArray(campaign.clients) ? campaign.clients[0] : campaign.clients;
  const total = items?.length ?? 0;
  const approved = items?.filter((i) => ['aprovado','finalizado'].includes(i.general_status)).length ?? 0;
  const pct = total ? Math.round((approved / total) * 100) : 0;
  const canApproveAll = approved === total && total > 0;

  return (
    <div className="page">
      {/* Breadcrumb */}
      <div className="crumb">
        <Link href="/cliente">Cronogramas</Link>
        <span>/</span>
        {campaign.name}
      </div>

      {/* Campaign header card — green, from design */}
      <div className="card-lg" style={{ background: 'var(--green)', color: '#fff', border: 'none', position: 'relative', overflow: 'hidden', marginBottom: 28 }}>
        <div style={{ position: 'absolute', right: -40, top: -40, width: 300, height: 300, opacity: 0.06, backgroundImage: 'url(/assets/tucano.png)', backgroundSize: '140px', backgroundRepeat: 'repeat', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
              {client?.company_name ?? client?.name}
            </div>
            <h1 className="h1" style={{ color: '#fff', fontSize: 28 }}>{campaign.name}</h1>
            <div style={{ marginTop: 10, fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>{campaign.period_label}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
            <StatusBadge kind={(campaign.status as any)} size="lg" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="progress" style={{ width: 160, background: 'rgba(255,255,255,0.2)' }}>
                <div className="progress-fill" style={{ width: `${pct}%`, background: '#fff' }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{approved}/{total}</span>
            </div>
          </div>
        </div>

        {campaign.overview && (
          <div style={{ position: 'relative', marginTop: 20, background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 16, display: 'flex', gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(235,96,19,0.25)', color: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="target" size={16} />
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,0.85)' }}>
              <strong style={{ color: '#fff' }}>Visão estratégica:</strong>{' '}{campaign.overview}
            </div>
          </div>
        )}
      </div>

      {/* Week tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--surface)', padding: 4, borderRadius: 12, border: '1px solid var(--line)' }}>
          {weekKeys.map((week) => (
            <span key={week} style={{ height: 36, padding: '0 14px', display: 'inline-flex', alignItems: 'center', borderRadius: 8, fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>
              {week}
              <span style={{ marginLeft: 6, opacity: 0.5, fontSize: 11 }}>{weeks[week]?.length}</span>
            </span>
          ))}
        </div>
        {canApproveAll && !campaign.is_locked && (
          <button className="btn btn-primary">
            <Icon name="check" size={16} /> Aprovar cronograma completo
          </button>
        )}
      </div>

      {/* Posts por semana */}
      {weekKeys.map((week) => (
        <div key={week} style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '0 0 16px', color: 'var(--green)' }}>
            <h2 className="h2" style={{ fontSize: 18, color: 'var(--ink)' }}>{week}</h2>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            {weeks[week]?.map((post) => (
              <PostCard key={post.id} post={post} campaignId={id} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
