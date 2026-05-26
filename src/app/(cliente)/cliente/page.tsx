import { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Icon } from '@/components/ui/Icon';

export const metadata: Metadata = { title: 'Meus cronogramas' };

const CAMPAIGN_STATUS_LABEL: Record<string, string> = {
  rascunho: 'Rascunho', enviado_para_aprovacao: 'Aguardando aprovação',
  em_revisao: 'Em revisão', aprovado: 'Aprovado',
  em_producao: 'Em produção', finalizado: 'Finalizado', arquivado: 'Arquivado',
};
const CAMPAIGN_STATUS_KIND: Record<string, string> = {
  enviado_para_aprovacao: 'aguardando', em_revisao: 'revisao',
  aprovado: 'aprovado', em_producao: 'agendado', finalizado: 'publicado', rascunho: 'rascunho',
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

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, name, type, status, period_label, created_at, content_items(id, general_status)')
    .in('client_id', clientIds)
    .not('status', 'in', '("arquivado")')
    .order('created_at', { ascending: false });

  const pendingTotal = campaigns?.reduce((acc, c) => {
    const items = Array.isArray(c.content_items) ? c.content_items : [];
    return acc + items.filter((i: any) => i.general_status === 'pendente').length;
  }, 0) ?? 0;

  const approvedTotal = campaigns?.reduce((acc, c) => {
    const items = Array.isArray(c.content_items) ? c.content_items : [];
    return acc + items.filter((i: any) => ['aprovado','finalizado'].includes(i.general_status)).length;
  }, 0) ?? 0;

  const totalItems = campaigns?.reduce((acc, c) => {
    return acc + (Array.isArray(c.content_items) ? c.content_items.length : 0);
  }, 0) ?? 0;

  const primaryClient = clientUsers?.[0];
  const clientData = Array.isArray(primaryClient?.clients) ? primaryClient?.clients[0] : primaryClient?.clients;

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
      </div>

      {/* Stat row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Aguardando aprovação', value: pendingTotal,   accent: 'var(--orange)', sub: 'Posts pendentes' },
          { label: 'Aprovados',             value: approvedTotal, accent: 'var(--green)',  sub: `De ${totalItems} publicações` },
          { label: 'Cronogramas',           value: campaigns?.length ?? 0, accent: 'var(--ink)', sub: 'Disponíveis para você' },
        ].map((s) => (
          <div key={s.label} className="card-flat" style={{ padding: 18 }}>
            <div className="eyebrow" style={{ fontSize: 10 }}>{s.label}</div>
            <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em', color: s.accent, marginTop: 6, lineHeight: 1 }}>{s.value}</div>
            <div className="muted tiny" style={{ marginTop: 6 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Cronogramas */}
      <div>
        <h2 className="h2" style={{ fontSize: 18, marginBottom: 16 }}>Cronogramas disponíveis</h2>

        {!campaigns || campaigns.length === 0 ? (
          <div className="card" style={{ padding: 48, textAlign: 'center' }}>
            <p className="muted">Nenhum cronograma disponível no momento.</p>
            <p className="muted tiny">Entre em contato com a Tucan Marketing Digital.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {campaigns.map((c, i) => {
              const items = Array.isArray(c.content_items) ? c.content_items : [];
              const total = items.length;
              const approved = items.filter((it: any) => ['aprovado','finalizado'].includes(it.general_status)).length;
              const pct = total ? Math.round((approved / total) * 100) : 0;
              const isCurrent = i === 0 && c.status !== 'finalizado';
              const statusKind = CAMPAIGN_STATUS_KIND[c.status] ?? 'rascunho';

              return (
                <Link key={c.id} href={`/cliente/cronogramas/${c.id}`} style={{ display: 'flex', alignItems: 'center', gap: 20, textDecoration: 'none', color: 'inherit' }}>
                  <div className="card" style={{ flex: 1, padding: 20, display: 'flex', alignItems: 'center', gap: 20, border: isCurrent ? '1px solid var(--green-100)' : '1px solid var(--line)', transition: 'box-shadow .15s' }}>
                    <div style={{ width: 52, height: 52, borderRadius: 14, background: isCurrent ? 'var(--green)' : 'var(--bg-2)', color: isCurrent ? '#fff' : 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon name="calendar" size={22} stroke={1.8} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="h3">{c.name}</div>
                        {isCurrent && <span className="chip" style={{ background: 'var(--green-50)', color: 'var(--green)' }}>Atual</span>}
                      </div>
                      <div className="muted tiny" style={{ marginTop: 4 }}>{c.period_label}</div>
                      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="progress" style={{ flex: 1, maxWidth: 240 }}>
                          <div className="progress-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="tiny" style={{ color: 'var(--muted)', fontWeight: 600 }}>{approved}/{total} aprovados</span>
                      </div>
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
    </div>
  );
}
