import { Metadata } from 'next';
import Link from 'next/link';
import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Icon } from '@/components/ui/Icon';

export const metadata: Metadata = { title: 'Histórico — Portal Tucan' };

const CAMPAIGN_STATUS_KIND: Record<string, string> = {
  enviado_para_aprovacao: 'aguardando',
  em_revisao: 'revisao',
  aprovado: 'aprovado',
  em_producao: 'agendado',
  finalizado: 'publicado',
  rascunho: 'rascunho',
  arquivado: 'rascunho',
};

export default async function HistoricoPage() {
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

  // Todos os cronogramas — incluindo finalizados e arquivados
  const { data: campaigns } = clientIds.length > 0
    ? await supabase
        .from('campaigns')
        .select('id, name, status, period_label, start_date, end_date, created_at, content_items(id, general_status)')
        .in('client_id', clientIds)
        .order('created_at', { ascending: false })
    : { data: [] };

  const total = campaigns?.length ?? 0;
  const finalizados = campaigns?.filter((c) => c.status === 'finalizado' || c.status === 'arquivado').length ?? 0;

  return (
    <div className="page">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div className="eyebrow">Todos os cronogramas</div>
        <h1 className="h1" style={{ marginTop: 6 }}>Histórico</h1>
        {total > 0 && (
          <p className="muted" style={{ marginTop: 6, fontSize: 15 }}>
            <strong>{total}</strong> cronograma{total !== 1 ? 's' : ''} no total
            {finalizados > 0 && (
              <span style={{ color: 'var(--muted-2)' }}> · {finalizados} finalizado{finalizados !== 1 ? 's' : ''}</span>
            )}
          </p>
        )}
      </div>

      {(!campaigns || campaigns.length === 0) ? (
        <div className="card" style={{ padding: 56, textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, background: 'var(--bg-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            color: 'var(--muted)',
          }}>
            <Icon name="calendar" size={22} stroke={1.5} />
          </div>
          <p className="muted" style={{ fontSize: 14 }}>Nenhum cronograma disponível ainda.</p>
          <p className="muted tiny" style={{ marginTop: 4 }}>Entre em contato com a equipe Tucan.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {campaigns.map((c) => {
            const items    = Array.isArray(c.content_items) ? c.content_items : [];
            const total    = items.length;
            const approved = items.filter((i: { general_status: string }) =>
              ['aprovado', 'finalizado'].includes(i.general_status)).length;
            const pct      = total ? Math.round((approved / total) * 100) : 0;
            const statusKind = CAMPAIGN_STATUS_KIND[c.status] ?? 'rascunho';
            const isArchived = c.status === 'arquivado';

            const startLabel = c.start_date
              ? new Date(c.start_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '')
              : null;
            const endLabel = c.end_date
              ? new Date(c.end_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '')
              : null;

            return (
              <Link
                key={c.id}
                href={`/cliente/cronogramas/${c.id}` as Route}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div className="card" style={{
                  padding: 20,
                  display: 'flex', alignItems: 'center', gap: 20,
                  opacity: isArchived ? 0.6 : 1,
                  transition: 'box-shadow .15s',
                }}>
                  {/* Ícone */}
                  <div style={{
                    width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                    background: c.status === 'finalizado' ? 'var(--green-50)' : 'var(--bg-2)',
                    color: c.status === 'finalizado' ? 'var(--green)' : 'var(--muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name="calendar" size={20} stroke={1.8} />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div className="h3" style={{ fontSize: 15 }}>{c.name}</div>
                    </div>
                    <div className="muted tiny">
                      {startLabel && endLabel
                        ? `${startLabel} – ${endLabel}`
                        : startLabel ?? c.period_label ?? '—'}
                    </div>
                    {total > 0 && (
                      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="progress" style={{ width: 160 }}>
                          <div className="progress-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="tiny" style={{ color: 'var(--muted)', fontWeight: 600 }}>
                          {approved}/{total} aprovados
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                    <StatusBadge kind={statusKind as any} />
                    <Icon name="chevron" size={16} color="var(--muted-2)" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
