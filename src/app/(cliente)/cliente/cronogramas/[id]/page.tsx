import { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Icon } from '@/components/ui/Icon';
import CronogramaWeekTabs from '@/components/cliente/CronogramaWeekTabs';
import { isCampaignVisibleToClient } from '@/lib/constants/status';

export const metadata: Metadata = { title: 'Cronograma' };

interface Props {
  params: Promise<{ id: string }>;
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
      'id, name, status, period_label, overview, start_date, end_date, client_id, is_locked, clients(name, company_name)'
    )
    .eq('id', id)
    .single();

  if (!campaign) notFound();

  // Segurança: cliente não pode abrir cronograma em rascunho/arquivado nem por link direto.
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

  thumbFiles?.forEach((f) => {
    if (!thumbnailMap[f.content_item_id]) {
      thumbnailMap[f.content_item_id] = f.file_url;
    }
  });

  const weeks: Record<string, (NonNullable<typeof items>[number] & { thumbnail_url?: string })[]> = {};

  items?.forEach((item) => {
    if (!weeks[item.week_label]) weeks[item.week_label] = [];
    weeks[item.week_label]!.push({ ...item, thumbnail_url: thumbnailMap[item.id] });
  });

  const weekKeys = Object.keys(weeks);
  const client = Array.isArray(campaign.clients) ? campaign.clients[0] : campaign.clients;
  const total = items?.length ?? 0;
  const approved = items?.filter((i) => ['aprovado', 'finalizado'].includes(i.general_status)).length ?? 0;
  const pct = total ? Math.round((approved / total) * 100) : 0;

  const startLabel = campaign.start_date
    ? new Date(campaign.start_date + 'T00:00:00')
        .toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
        .replace('.', '')
    : null;

  const endLabel = campaign.end_date
    ? new Date(campaign.end_date + 'T00:00:00')
        .toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
        .replace('.', '')
    : null;

  return (
    <div className="page">
      <div className="crumb">
        <Link href="/cliente">Cronogramas</Link>
        <span>/</span>
        {campaign.name}
      </div>

      <div
        className="card-lg"
        style={{
          background: 'var(--green)',
          color: '#fff',
          border: 'none',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: 28,
        }}
      >
        <div
          style={{
            position: 'absolute',
            right: -20,
            top: -20,
            width: 280,
            height: 280,
            opacity: 0.07,
            backgroundImage: 'url(/assets/tucano.png)',
            backgroundSize: '140px',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'top right',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 24,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.55)',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                marginBottom: 8,
              }}
            >
              {client?.company_name ?? client?.name}
            </div>

            <h1
              style={{
                margin: '0 0 12px',
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: '-0.025em',
                lineHeight: 1.1,
                color: '#fff',
              }}
            >
              {campaign.name}
            </h1>

            <div style={{ display: 'flex', gap: 16, color: 'rgba(255,255,255,0.7)', fontSize: 13, flexWrap: 'wrap' }}>
              {startLabel && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="calendar" size={13} />
                  {startLabel}{endLabel ? ` – ${endLabel}` : ''}
                </span>
              )}

              {!startLabel && campaign.period_label && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="calendar" size={13} /> {campaign.period_label}
                </span>
              )}

              {total > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="image" size={13} /> {total} publicação{total !== 1 ? 'ões' : ''}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, flexShrink: 0 }}>
            <StatusBadge kind={campaign.status as any} size="lg" />

            {total > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="progress" style={{ width: 160, background: 'rgba(255,255,255,0.2)' }}>
                  <div className="progress-fill" style={{ width: `${pct}%`, background: '#fff' }} />
                </div>

                <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>
                  {approved}/{total}
                </span>
              </div>
            )}
          </div>
        </div>

        {campaign.overview && (
          <div
            style={{
              position: 'relative',
              marginTop: 20,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 14,
              padding: 16,
              display: 'flex',
              gap: 14,
              alignItems: 'flex-start',
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(235,96,19,0.25)',
                color: 'var(--orange)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon name="target" size={16} />
            </div>

            <div style={{ fontSize: 13, lineHeight: 1.65, color: 'rgba(255,255,255,0.85)' }}>
              <strong style={{ color: '#fff' }}>Visão estratégica:</strong> {campaign.overview}
            </div>
          </div>
        )}
      </div>

      {weekKeys.length > 0 ? (
        <CronogramaWeekTabs weekKeys={weekKeys} postsByWeek={weeks as Record<string, any[]>} campaignId={id} />
      ) : (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <p className="muted">Nenhum post adicionado a este cronograma ainda.</p>
          <p className="muted tiny">Entre em contato com a Tucan Marketing Digital.</p>
        </div>
      )}
    </div>
  );
}
