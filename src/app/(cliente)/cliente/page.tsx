import { Metadata } from 'next';
import Link from 'next/link';
import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Icon } from '@/components/ui/Icon';

export const metadata: Metadata = { title: 'Meus cronogramas' };

const CAMPAIGN_STATUS_KIND: Record<string, string> = {
  enviado_para_aprovacao: 'aguardando', em_revisao: 'revisao',
  aprovado: 'aprovado', em_producao: 'agendado', finalizado: 'publicado', rascunho: 'rascunho',
};

const FMT_LABEL: Record<string, string> = {
  reels: 'Reels', carrossel: 'Carrossel', post_estatico: 'Post estático', story: 'Story', outro: 'Outro',
};
const FMT_CLASS: Record<string, string> = {
  reels: 'fmt fmt-reels', carrossel: 'fmt fmt-carrossel',
  post_estatico: 'fmt fmt-estatico', story: 'fmt fmt-stories',
};

export default async function ClienteDashboard() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles').select('id, name').eq('auth_user_id', user.id).single();
  if (!profile) redirect('/login');

  const { data: clientUsers } = await supabase
    .from('client_users').select('client_id, clients(name, company_name)').eq('user_id', profile.id);

  const clientIds = clientUsers?.map((cu) => cu.client_id) ?? [];
  const firstName = profile.name.split(' ')[0];

  const primaryClient = clientUsers?.[0];
  const clientData = Array.isArray(primaryClient?.clients) ? primaryClient?.clients[0] : primaryClient?.clients;

  // Campaigns with their content items
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, name, type, status, period_label, start_date, created_at, content_items(id, general_status)')
    .in('client_id', clientIds.length > 0 ? clientIds : ['__none__'])
    .not('status', 'in', '("arquivado")')
    .order('created_at', { ascending: false });

  // Pending posts — for the "pendências" column
  const campaignIds = campaigns?.map((c) => c.id) ?? [];
  const { data: pendingItems } = campaignIds.length > 0
    ? await supabase
        .from('content_items')
        .select('id, title, format, week_label, campaign_id, campaigns(name)')
        .in('campaign_id', campaignIds)
        .eq('general_status', 'pendente')
        .order('order_index')
        .limit(8)
    : { data: [] };

  // Metrics
  const pendingTotal = campaigns?.reduce((acc, c) => {
    const items = Array.isArray(c.content_items) ? c.content_items : [];
    return acc + items.filter((i: { general_status: string }) => i.general_status === 'pendente').length;
  }, 0) ?? 0;

  const approvedTotal = campaigns?.reduce((acc, c) => {
    const items = Array.isArray(c.content_items) ? c.content_items : [];
    return acc + items.filter((i: { general_status: string }) => ['aprovado', 'finalizado'].includes(i.general_status)).length;
  }, 0) ?? 0;

  const totalItems = campaigns?.reduce((acc, c) => {
    return acc + (Array.isArray(c.content_items) ? c.content_items.length : 0);
  }, 0) ?? 0;

  const inReviewTotal = campaigns?.reduce((acc, c) => {
    const items = Array.isArray(c.content_items) ? c.content_items : [];
    return acc + items.filter((i: { general_status: string }) => i.general_status === 'em_revisao').length;
  }, 0) ?? 0;

  return (
    <div className="page">
      {/* Greeting */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
        <div>
          <div className="eyebrow">{clientData?.company_name ?? clientData?.name}</div>
          <h1 className="h1" style={{ marginTop: 6 }}>Olá, {firstName} 👋</h1>
          {pendingTotal > 0 && (
            <p className="muted" style={{ marginTop: 6, fontSize: 15 }}>
              Você tem <strong style={{ color: 'var(--orange)' }}>{pendingTotal} {pendingTotal === 1 ? 'post' : 'posts'}</strong> aguardando aprovação.
            </p>
          )}
        </div>
        {campaigns && campaigns.length > 0 && (
          <Link href={`/cliente/cronogramas/${campaigns[0]!.id}` as Route} className="btn btn-dark btn-sm">
            Ver cronograma atual <Icon name="arrow" size={14} />
          </Link>
        )}
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Aguardando aprovação', value: pendingTotal,   accent: 'var(--orange)', sub: 'Posts pendentes' },
          { label: 'Em revisão',           value: inReviewTotal, accent: '#92400e',        sub: 'Aguardando equipe Tucan' },
          { label: 'Aprovados',            value: approvedTotal, accent: 'var(--green)',   sub: `De ${totalItems} publicações` },
          { label: 'Cronogramas',          value: campaigns?.length ?? 0, accent: 'var(--ink)', sub: 'Disponíveis para você' },
        ].map((s) => (
          <div key={s.label} className="card-flat" style={{ padding: 18 }}>
            <div className="eyebrow" style={{ fontSize: 10 }}>{s.label}</div>
            <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em', color: s.accent, marginTop: 6, lineHeight: 1 }}>
              {s.value}
            </div>
            <div className="muted tiny" style={{ marginTop: 6 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Two-column layout: cronogramas + pendências */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24, alignItems: 'flex-start' }}>
        {/* Left — Cronogramas disponíveis */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
            <div>
              <h2 className="h2" style={{ fontSize: 18 }}>Cronogramas disponíveis</h2>
              <p className="muted tiny" style={{ marginTop: 4 }}>Aprove cronograma por cronograma, no seu ritmo.</p>
            </div>
          </div>

          {(!campaigns || campaigns.length === 0) ? (
            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
              <p className="muted">Nenhum cronograma disponível no momento.</p>
              <p className="muted tiny">Entre em contato com a Tucan Marketing Digital.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {campaigns.map((c, i) => {
                const items   = Array.isArray(c.content_items) ? c.content_items : [];
                const total   = items.length;
                const approved = items.filter((it: { general_status: string }) => ['aprovado', 'finalizado'].includes(it.general_status)).length;
                const pct      = total ? Math.round((approved / total) * 100) : 0;
                const isCurrent = i === 0 && c.status !== 'finalizado';
                const statusKind = CAMPAIGN_STATUS_KIND[c.status] ?? 'rascunho';

                return (
                  <Link
                    key={c.id}
                    href={`/cliente/cronogramas/${c.id}` as Route}
                    style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="card" style={{
                      padding: 20,
                      display: 'flex', alignItems: 'center', gap: 20,
                      border: isCurrent ? '1px solid var(--green-100)' : '1px solid var(--line)',
                      transition: 'box-shadow .15s',
                    }}>
                      <div style={{
                        width: 52, height: 52, borderRadius: 14,
                        background: isCurrent ? 'var(--green)' : 'var(--bg-2)',
                        color: isCurrent ? '#fff' : 'var(--muted)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Icon name="calendar" size={22} stroke={1.8} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="h3">{c.name}</div>
                          {isCurrent && (
                            <span className="chip" style={{ background: 'var(--green-50)', color: 'var(--green)' }}>Atual</span>
                          )}
                        </div>
                        <div className="muted tiny" style={{ marginTop: 4 }}>{c.period_label}</div>
                        {total > 0 && (
                          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div className="progress" style={{ flex: 1, maxWidth: 240 }}>
                              <div className="progress-fill" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="tiny" style={{ color: 'var(--muted)', fontWeight: 600 }}>
                              {approved}/{total} aprovados
                            </span>
                          </div>
                        )}
                      </div>
                      <StatusBadge kind={statusKind as any} />
                      <Icon name="chevron" size={16} color="var(--muted-2)" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Right — Pendências */}
        <div>
          <div style={{ marginBottom: 16 }}>
            <h2 className="h2" style={{ fontSize: 18 }}>Pendências</h2>
            <p className="muted tiny" style={{ marginTop: 4 }}>Posts esperando sua aprovação.</p>
          </div>

          {(!pendingItems || pendingItems.length === 0) ? (
            <div className="card" style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--green-50)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Icon name="check" size={18} stroke={2} />
              </div>
              <p className="muted" style={{ fontSize: 13 }}>Nenhum post pendente.</p>
              <p className="muted tiny">Tudo em dia! 🎉</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pendingItems.map((p) => {
                const camp = Array.isArray(p.campaigns) ? p.campaigns[0] : p.campaigns;
                const fmtClass = FMT_CLASS[p.format] ?? 'fmt';
                const fmtLabel = FMT_LABEL[p.format] ?? p.format;

                return (
                  <Link
                    key={p.id}
                    href={`/cliente/posts/${p.id}` as Route}
                    style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="card" style={{ padding: 14, display: 'flex', gap: 14, alignItems: 'center', transition: 'box-shadow .15s' }}>
                      {/* Format color bar */}
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span className={fmtClass} style={{ fontSize: 10 }}>{fmtLabel.charAt(0)}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
                          {p.week_label} · {fmtLabel}
                          {camp?.name && <span style={{ color: 'var(--muted-2)' }}> · {camp.name}</span>}
                        </div>
                        <div style={{
                          fontSize: 13, fontWeight: 600, lineHeight: 1.3, marginTop: 3,
                          overflow: 'hidden', textOverflow: 'ellipsis',
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
                        }}>
                          {p.title}
                        </div>
                      </div>
                      <Icon name="arrow" size={14} color="var(--muted-2)" />
                    </div>
                  </Link>
                );
              })}

              {pendingTotal > (pendingItems?.length ?? 0) && (
                <Link
                  href={campaigns?.[0] ? `/cliente/cronogramas/${campaigns[0].id}` as Route : '/cliente' as Route}
                  style={{ alignSelf: 'flex-start', marginTop: 4, color: 'var(--orange)', fontWeight: 600, fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Ver todos os {pendingTotal} pendentes →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
