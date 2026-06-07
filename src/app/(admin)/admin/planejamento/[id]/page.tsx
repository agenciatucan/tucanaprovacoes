import { Metadata } from 'next';
import Link from 'next/link';
import type { Route } from 'next';
import { notFound } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { Icon } from '@/components/ui/Icon';
import { StatusBadge } from '@/components/ui/StatusBadge';
import PlanningItemsEditor from '@/components/admin/PlanningItemsEditor';
import SendPlanningButton from '@/components/admin/SendPlanningButton';
import DeletePlanningButton from '@/components/admin/DeletePlanningButton';
import ArchivePlanningButton from '@/components/admin/ArchivePlanningButton';
import CopyLinkButton from '@/components/admin/CopyLinkButton';

export const metadata: Metadata = { title: 'Planejamento' };

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
  em_revisao:             'Em revisão — cliente solicitou ajustes',
  aprovado:               'Aprovado pelo cliente',
  arquivado:              'Arquivado',
};

function formatMonthYear(value: string) {
  const [year, month] = value.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

interface Props { params: Promise<{ id: string }>; }

export default async function PlanejamentoDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();

  const [{ data: schedule }, { data: items }] = await Promise.all([
    supabase
      .from('planning_schedules')
      .select('*, clients(id, name, company_name, logo_url)')
      .eq('id', id)
      .single(),
    supabase
      .from('planning_items')
      .select('*')
      .eq('planning_schedule_id', id)
      .order('order_index'),
  ]);

  if (!schedule) notFound();

  const client = Array.isArray(schedule.clients) ? schedule.clients[0] : schedule.clients;
  const clientName = client?.company_name ?? client?.name ?? '—';
  const isEditable = ['rascunho', 'em_revisao'].includes(schedule.status);
  const canSend = isEditable && (items?.length ?? 0) > 0;

  const approvalLink = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/acesso/planejamento/${schedule.approval_token}`;

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      {/* Breadcrumb */}
      <div className="crumb" style={{ marginBottom: 20 }}>
        <Link href={"/admin/planejamento" as Route}>Planejamentos</Link>
        <span>/</span>
        {schedule.title}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, flexShrink: 0,
            background: 'var(--green)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 16, overflow: 'hidden',
          }}>
            {client?.logo_url
              ? <img src={client.logo_url} alt={clientName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              : clientName.slice(0, 2).toUpperCase()
            }
          </div>
          <div>
            <h1 className="h1" style={{ fontSize: 22 }}>{schedule.title}</h1>
            <div className="muted" style={{ fontSize: 13, marginTop: 3 }}>
              {clientName} · {formatMonthYear(schedule.month_year)}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <StatusBadge
            kind={STATUS_KIND[schedule.status] ?? 'rascunho'}
            label={STATUS_LABEL[schedule.status]}
          />
          {isEditable && (
            <SendPlanningButton scheduleId={id} canSend={canSend} />
          )}
        </div>
      </div>

      {/* Banner: em revisão */}
      {schedule.status === 'em_revisao' && schedule.notes && (
        <div style={{
          padding: '14px 18px', borderRadius: 12, marginBottom: 20,
          background: 'var(--orange-50)', border: '1px solid var(--orange-100)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--orange)', marginBottom: 4 }}>
            Ajuste solicitado pelo cliente:
          </div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>{schedule.notes}</p>
        </div>
      )}

      {/* Banner: aprovado */}
      {schedule.status === 'aprovado' && (
        <div style={{
          padding: '14px 18px', borderRadius: 12, marginBottom: 20,
          background: '#f0fdf4', border: '1px solid #bbf7d0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="check-circle" size={16} color="#16a34a" />
            <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 600 }}>
              Planejamento aprovado pelo cliente. A equipe pode iniciar a produção.
            </span>
          </div>
          {(schedule as any).campaign_id && (
            <Link
              href={`/admin/cronogramas/${(schedule as any).campaign_id}` as Route}
              className="btn btn-primary btn-sm"
              style={{ flexShrink: 0 }}
            >
              <Icon name="calendar" size={13} /> Ver cronograma
            </Link>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        {/* Itens do planejamento */}
        <div style={{ gridColumn: '1 / -1' }}>
          <div className="card card-lg">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 className="h2" style={{ fontSize: 16 }}>
                Temas do mês
                <span className="muted" style={{ fontWeight: 400, marginLeft: 8 }}>
                  ({items?.length ?? 0} {(items?.length ?? 0) === 1 ? 'tema' : 'temas'})
                </span>
              </h2>
            </div>
            <PlanningItemsEditor
              scheduleId={id}
              clientId={schedule.client_id}
              items={items ?? []}
              isEditable={isEditable}
            />
          </div>
        </div>

        {/* Link de aprovação */}
        <div className="card">
          <div className="eyebrow" style={{ marginBottom: 14 }}>Link de aprovação</div>
          {schedule.status === 'enviado_para_aprovacao' || schedule.status === 'em_revisao' || schedule.status === 'aprovado' ? (
            <div>
              <p className="muted tiny" style={{ marginBottom: 10 }}>
                Envie este link para o cliente aprovar os temas:
              </p>
              <div style={{
                padding: '10px 12px', borderRadius: 8, background: 'var(--bg)',
                border: '1px solid var(--line)', fontSize: 12, fontFamily: 'monospace',
                wordBreak: 'break-all', color: 'var(--ink-2)',
              }}>
                {approvalLink}
              </div>
              <CopyLinkButton url={approvalLink} />
            </div>
          ) : (
            <p className="muted tiny">
              O link será exibido após enviar para aprovação.
            </p>
          )}
        </div>

        {/* Ações */}
        <div className="card">
          <div className="eyebrow" style={{ marginBottom: 14 }}>Ações</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Link
              href={`/admin/clientes/${schedule.client_id}` as Route}
              className="btn btn-ghost btn-sm"
              style={{ justifyContent: 'flex-start' }}
            >
              <Icon name="user" size={14} /> Ver cliente
            </Link>
            {(schedule as any).campaign_id && (
              <Link
                href={`/admin/cronogramas/${(schedule as any).campaign_id}` as Route}
                className="btn btn-ghost btn-sm"
                style={{ justifyContent: 'flex-start' }}
              >
                <Icon name="calendar" size={14} /> Ver cronograma gerado
              </Link>
            )}
            {isEditable && (
              <DeletePlanningButton scheduleId={id} />
            )}
            {schedule.status !== 'arquivado' && (
              <ArchivePlanningButton scheduleId={id} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
