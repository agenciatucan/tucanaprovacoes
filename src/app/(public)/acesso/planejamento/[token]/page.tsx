import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPlanningByToken } from '@/actions/planning';
import PlanningApprovalPanel from '@/components/aprovacao/PlanningApprovalPanel';

export const metadata: Metadata = { title: 'Aprovação de planejamento' };

interface Props { params: Promise<{ token: string }>; }

const CONTENT_TYPE_LABEL: Record<string, string> = {
  arte:      'Arte',
  reels:     'Reels',
  carrossel: 'Carrossel',
  story:     'Story',
  outro:     'Outro',
};

const CONTENT_TYPE_COLOR: Record<string, string> = {
  arte:      '#1d4ed8',
  reels:     '#7c3aed',
  carrossel: '#0891b2',
  story:     '#d97706',
  outro:     '#6b7280',
};

function formatMonthYear(value: string) {
  const [year, month] = value.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export default async function PublicPlanningPage({ params }: Props) {
  const { token } = await params;
  const result = await getPlanningByToken(token);

  if (!result.success) notFound();

  const { schedule, items } = result.data;
  const client = (schedule as any).clients;
  const clientName = client?.company_name ?? client?.name ?? 'Cliente';
  const isApproved = (schedule as any).status === 'aprovado';
  const isEditable = ['enviado_para_aprovacao', 'em_revisao'].includes((schedule as any).status);

  // Group items by week
  const byWeek = (items as any[]).reduce<Record<string, any[]>>((acc, item) => {
    if (!acc[item.week_label]) acc[item.week_label] = [];
    acc[item.week_label]!.push(item);
    return acc;
  }, {});
  const weeks = Object.keys(byWeek).sort();

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', padding: '0 0 60px' }}>
      {/* Hero */}
      <div style={{
        background: 'var(--green)', color: '#fff',
        padding: '32px 24px 28px',
        marginBottom: 32,
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          {/* Logo + nome */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12, flexShrink: 0,
              background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 18, overflow: 'hidden',
            }}>
              {client?.logo_url
                ? <img src={client.logo_url} alt={clientName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                : clientName.slice(0, 2).toUpperCase()
              }
            </div>
            <div>
              <div style={{ fontSize: 12, opacity: .7, textTransform: 'uppercase', letterSpacing: '.06em' }}>Aprovação de planejamento</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{clientName}</div>
            </div>
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: '#fff' }}>
            {(schedule as any).title}
          </h1>
          <p style={{ margin: '8px 0 0', fontSize: 14, opacity: .75 }}>
            {formatMonthYear((schedule as any).month_year)} · {(items as any[]).length} {(items as any[]).length === 1 ? 'tema' : 'temas'}
          </p>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px' }}>

        {/* Status: aprovado */}
        {isApproved && (
          <div style={{
            padding: '16px 20px', borderRadius: 14, marginBottom: 24,
            background: '#f0fdf4', border: '1px solid #bbf7d0',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 24 }}>✅</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#16a34a' }}>Planejamento aprovado!</div>
              <div style={{ fontSize: 13, color: '#15803d', marginTop: 2 }}>
                Obrigado pela sua aprovação. A equipe já pode iniciar a produção.
              </div>
            </div>
          </div>
        )}

        {/* Notas de revisão */}
        {(schedule as any).status === 'em_revisao' && (schedule as any).notes && (
          <div style={{
            padding: '14px 18px', borderRadius: 12, marginBottom: 24,
            background: '#fff7ed', border: '1px solid #fed7aa',
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#c2410c', marginBottom: 4 }}>
              Ajuste solicitado anteriormente:
            </div>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: '#7c2d12' }}>
              {(schedule as any).notes}
            </p>
          </div>
        )}

        {/* Temas por semana */}
        <div style={{ marginBottom: 28 }}>
          {weeks.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <p className="muted">Nenhum tema cadastrado neste planejamento.</p>
            </div>
          )}
          {weeks.map((week) => (
            <div key={week} style={{ marginBottom: 24 }}>
              <div style={{
                fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '.07em', color: 'var(--muted-2)', marginBottom: 10,
              }}>
                {week}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(byWeek[week] ?? []).map((item) => (
                  <div key={item.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px', borderRadius: 12,
                    border: '1px solid var(--line)', background: 'var(--card)',
                  }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                      background: (CONTENT_TYPE_COLOR[item.content_type] ?? '#6b7280') + '18',
                      color: CONTENT_TYPE_COLOR[item.content_type] ?? '#6b7280',
                      textTransform: 'uppercase', letterSpacing: '.04em', flexShrink: 0,
                    }}>
                      {CONTENT_TYPE_LABEL[item.content_type] ?? item.content_type}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>{item.title}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Painel de aprovação */}
        {!isApproved && (
          <PlanningApprovalPanel token={token} isEditable={isEditable} status={(schedule as any).status} />
        )}
      </div>
    </div>
  );
}
