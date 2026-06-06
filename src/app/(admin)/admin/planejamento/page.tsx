import { Metadata } from 'next';
import Link from 'next/link';
import type { Route } from 'next';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Icon } from '@/components/ui/Icon';

export const metadata: Metadata = { title: 'Planejamentos' };

const STATUS_KIND: Record<string, Parameters<typeof StatusBadge>[0]['kind']> = {
  rascunho:               'rascunho',
  enviado_para_aprovacao: 'aguardando',
  em_revisao:             'revisao',
  aprovado:               'aprovado',
  arquivado:              'rascunho',
};

const STATUS_LABEL: Record<string, string> = {
  rascunho:               'Rascunho',
  enviado_para_aprovacao: 'Aguardando aprovação',
  em_revisao:             'Em revisão',
  aprovado:               'Aprovado',
  arquivado:              'Arquivado',
};

function formatMonthYear(value: string) {
  const [year, month] = value.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export default async function PlanejamentoPage() {
  const supabase = await getSupabaseServerClient();

  const { data: schedules } = await supabase
    .from('planning_schedules')
    .select('*, clients(id, name, company_name, logo_url)')
    .order('created_at', { ascending: false });

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 className="h1">Planejamentos</h1>
          <p className="muted" style={{ marginTop: 6, fontSize: 14 }}>
            Cronogramas de temas enviados para aprovação antes da produção.
          </p>
        </div>
        <Link href={"/admin/planejamento/novo" as Route} className="btn btn-primary btn-sm">
          <Icon name="plus" size={14} /> Novo planejamento
        </Link>
      </div>

      {(!schedules || schedules.length === 0) ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <p className="muted" style={{ marginBottom: 16 }}>Nenhum planejamento criado ainda.</p>
          <Link href={"/admin/planejamento/novo" as Route} className="btn btn-primary btn-sm">
            <Icon name="plus" size={14} /> Criar planejamento
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {schedules.map((s) => {
            const client = Array.isArray(s.clients) ? s.clients[0] : s.clients;
            const clientName = client?.company_name ?? client?.name ?? '—';
            return (
              <Link
                key={s.id}
                href={`/admin/planejamento/${s.id}` as Route}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 18px', borderRadius: 12,
                  border: '1px solid var(--line)', background: 'var(--card)',
                  textDecoration: 'none', color: 'inherit',
                }}
              >
                {/* Logo/iniciais */}
                <div style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  background: 'var(--green)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 14, overflow: 'hidden',
                }}>
                  {client?.logo_url
                    ? <img src={client.logo_url} alt={clientName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    : clientName.slice(0, 2).toUpperCase()
                  }
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.title}
                  </div>
                  <div className="muted tiny" style={{ marginTop: 2 }}>
                    {clientName} · {formatMonthYear(s.month_year)}
                  </div>
                </div>

                <StatusBadge
                  kind={STATUS_KIND[s.status] ?? 'rascunho'}
                  label={STATUS_LABEL[s.status]}
                />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
