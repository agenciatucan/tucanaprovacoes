import { Metadata } from 'next';
import Link from 'next/link';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { Icon } from '@/components/ui/Icon';
import { StatusBadge } from '@/components/ui/StatusBadge';

export const metadata: Metadata = { title: 'Calendário' };

const STATUS_KIND: Record<string, string> = {
  rascunho: 'rascunho', enviado_para_aprovacao: 'aguardando', em_revisao: 'revisao',
  aprovado: 'aprovado', em_producao: 'agendado', finalizado: 'publicado', arquivado: 'rascunho',
};

export default async function CalendarioPage() {
  const supabase = await getSupabaseServerClient();

  // Busca campanhas ativas com datas — organiza por mês de início
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, name, type, status, start_date, end_date, period_label, clients(name, company_name), content_items(id, general_status)')
    .not('status', 'in', '("arquivado","finalizado")')
    .order('start_date', { ascending: true });

  // Agrupar por mês/ano de início
  const byMonth: Record<string, typeof campaigns> = {};
  campaigns?.forEach((c) => {
    const date = new Date(c.start_date + 'T00:00:00');
    const key = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const capitalKey = key.charAt(0).toUpperCase() + key.slice(1);
    if (!byMonth[capitalKey]) byMonth[capitalKey] = [];
    byMonth[capitalKey]!.push(c);
  });

  const monthKeys = Object.keys(byMonth);

  return (
    <div className="page" style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div className="eyebrow">Tucan · Interno</div>
          <h1 className="h1" style={{ marginTop: 6 }}>Calendário</h1>
          <p className="muted" style={{ marginTop: 6, fontSize: 14 }}>Visão cronológica dos cronogramas em andamento.</p>
        </div>
        <Link href="/admin/cronogramas/novo" className="btn btn-primary btn-sm">
          <Icon name="plus" size={14} /> Novo cronograma
        </Link>
      </div>

      {monthKeys.length === 0 ? (
        <div className="card" style={{ padding: 'clamp(32px, 8vw, 64px)', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--green-50)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Icon name="calendar" size={28} stroke={1.5} />
          </div>
          <p className="muted" style={{ marginBottom: 16 }}>Nenhum cronograma ativo no momento.</p>
          <Link href="/admin/cronogramas/novo" className="btn btn-primary">
            <Icon name="plus" size={16} /> Criar cronograma
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {monthKeys.map((month) => {
            const monthItems = byMonth[month] ?? [];
            return (
              <div key={month}>
                {/* Month header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--green)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="calendar" size={16} />
                  </div>
                  <h2 className="h2" style={{ fontSize: 20 }}>{month}</h2>
                  <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
                  <span className="muted tiny">{monthItems.length} cronograma{monthItems.length !== 1 ? 's' : ''}</span>
                </div>

                {/* Timeline cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 'clamp(0px, 5vw, 52px)' }}>
                  {monthItems.map((c) => {
                    const client = Array.isArray(c.clients) ? c.clients[0] : c.clients;
                    const items = Array.isArray(c.content_items) ? c.content_items : [];
                    const total = items.length;
                    const approved = items.filter((it: { general_status: string }) => ['aprovado', 'finalizado'].includes(it.general_status)).length;
                    const pct = total ? Math.round((approved / total) * 100) : 0;
                    const kind = STATUS_KIND[c.status] ?? 'rascunho';
                    const startDate = new Date(c.start_date + 'T00:00:00');
                    const endDate = c.end_date ? new Date(c.end_date + 'T00:00:00') : null;

                    return (
                      <Link key={c.id} href={`/admin/cronogramas/${c.id}`} className="card" style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '16px 20px', textDecoration: 'none', color: 'inherit', transition: 'box-shadow .15s' }}>
                        {/* Date badge */}
                        <div style={{ textAlign: 'center', minWidth: 44, flexShrink: 0 }}>
                          <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1, color: 'var(--green)' }}>
                            {startDate.getDate()}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>
                            {startDate.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                          </div>
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                            <div style={{ fontWeight: 600, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                            <StatusBadge kind={kind as Parameters<typeof StatusBadge>[0]['kind']} />
                          </div>
                          <div className="muted tiny">
                            {client?.company_name ?? client?.name} · {c.period_label}
                            {endDate && ` · até ${endDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')}`}
                          </div>
                        </div>

                        {total > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                            <div className="progress" style={{ width: 100 }}>
                              <div className="progress-fill" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="muted tiny" style={{ fontWeight: 600 }}>{approved}/{total}</span>
                          </div>
                        )}

                        <Icon name="chevron" size={14} color="var(--muted-2)" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
