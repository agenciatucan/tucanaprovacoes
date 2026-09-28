import { Metadata } from 'next';
import Link from 'next/link';
import type { Route } from 'next';
import { notFound } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Icon } from '@/components/ui/Icon';
import ClientForm from '@/components/admin/ClientForm';
import InactivateClientButton from '@/components/admin/InactivateClientButton';
import DeleteClientButton from '@/components/admin/DeleteClientButton';
import ClientAccessPanel from '@/components/admin/ClientAccessPanel';
import OnboardingChecklist from '@/components/admin/OnboardingChecklist';

export const metadata: Metadata = { title: 'Cliente' };

const STATUS_KIND: Record<string, string> = {
  rascunho: 'rascunho', enviado_para_aprovacao: 'aguardando', em_revisao: 'revisao',
  aprovado: 'aprovado', em_producao: 'agendado', finalizado: 'publicado', arquivado: 'rascunho',
};

const PLANNING_STATUS_KIND: Record<string, string> = {
  rascunho: 'rascunho', enviado_para_aprovacao: 'aguardando',
  em_revisao: 'revisao', aprovado: 'aprovado',
};

const PLANNING_STATUS_LABEL: Record<string, string> = {
  rascunho: 'Rascunho', enviado_para_aprovacao: 'Aguardando',
  em_revisao: 'Em revisão', aprovado: 'Aprovado',
};

function formatMonthYear(value: string) {
  const [year, month] = value.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
}

interface Props { params: Promise<{ id: string }>; }

export default async function ClienteDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: currentProfile } = user
    ? await supabase.from('user_profiles').select('role').eq('auth_user_id', user.id).single()
    : { data: null };
  const isAdmin = currentProfile?.role === 'admin';

  const [{ data: client }, { data: staffUsers }, { data: clientUsers }] = await Promise.all([
    supabase
      .from('clients')
      .select('*, user_profiles(id, name)')
      .eq('id', id)
      .single(),
    supabase
      .from('user_profiles')
      .select('id, name')
      .in('role', ['admin', 'equipe'])
      .order('name'),
    supabase
      .from('client_users')
      .select('id, role, user_profiles(id, name, email)')
      .eq('client_id', id)
      .order('created_at'),
  ]);

  if (!client) notFound();

  const [
    { data: campaigns },
    { data: planningSchedules },
    { data: onboardingSections },
    { data: onboardingTemplateItems },
    { data: onboardingDoneRows },
  ] = await Promise.all([
    supabase
      .from('campaigns')
      .select('id, name, type, status, period_label, content_items(id, general_status)')
      .eq('client_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('planning_schedules')
      .select('id, title, month_year, status')
      .eq('client_id', id)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('onboarding_sections').select('*').order('order_index'),
    supabase.from('onboarding_items').select('*').order('order_index'),
    supabase
      .from('client_onboarding_items')
      .select('item_id')
      .eq('client_id', id)
      .eq('done', true),
  ]);

  const onboardingDoneIds = (onboardingDoneRows ?? []).map((i) => i.item_id);
  const onboardingTotal = onboardingTemplateItems?.length ?? 0;
  const onboardingComplete = onboardingTotal > 0 && onboardingDoneIds.length >= onboardingTotal;

  const owner = Array.isArray(client.user_profiles) ? client.user_profiles[0] : client.user_profiles;

  return (
    <div className="page" style={{ maxWidth: 1100 }}>
      {/* Breadcrumb */}
      <div className="crumb" style={{ marginBottom: 20 }}>
        <Link href="/admin/clientes">Clientes</Link>
        <span>/</span>
        {client.name}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 28 }}>
        {/* Left — info + edit */}
        <div>
          {/* Client header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--green)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18, flexShrink: 0, overflow: 'hidden' }}>
              {client.logo_url
                ? <img src={client.logo_url} alt={client.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                : client.name.slice(0, 2).toUpperCase()
              }
            </div>
            <div>
              <h1 className="h1" style={{ fontSize: 24 }}>{client.name}</h1>
              <div className="muted" style={{ fontSize: 14, marginTop: 2 }}>{client.company_name}</div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              {!onboardingComplete && onboardingTotal > 0 && (
                <span
                  className="tiny"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '5px 10px', borderRadius: 999, fontWeight: 700,
                    background: 'var(--orange-50)', color: 'var(--orange)', border: '1px solid var(--orange-100)',
                  }}
                >
                  <Icon name="flag" size={11} /> Onboarding {onboardingDoneIds.length}/{onboardingTotal}
                </span>
              )}
              <StatusBadge kind={client.status === 'ativo' ? 'aprovado' : 'rascunho'} label={client.status === 'ativo' ? 'Ativo' : 'Inativo'} />
            </div>
          </div>

          {/* Edit form */}
          <div className="card card-lg">
            <div style={{ marginBottom: 20 }}>
              <h2 className="h2" style={{ fontSize: 16 }}>Dados do cliente</h2>
            </div>
            <ClientForm
              staffUsers={staffUsers ?? []}
              initial={{
                id: client.id,
                name: client.name,
                company_name: client.company_name,
                email: client.email,
                whatsapp: client.whatsapp,
                internal_owner_id: client.internal_owner_id,
                status: client.status,
                internal_notes: client.internal_notes,
                logo_url: client.logo_url,
                requires_planning_approval: client.requires_planning_approval,
                specialty: client.specialty,
                professional_register: client.professional_register,
                plan_name: client.plan_name,
                monthly_value: client.monthly_value,
                contract_start_date: client.contract_start_date,
                contract_end_date: client.contract_end_date,
                main_objective: client.main_objective,
                instagram_url: client.instagram_url,
                website_url: client.website_url,
                google_business_url: client.google_business_url,
              }}
            />
          </div>

          {/* Onboarding */}
          <div className="card card-lg" style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
              <div>
                <h2 className="h2" style={{ fontSize: 16 }}>Checklist de onboarding</h2>
                <p className="muted tiny" style={{ marginTop: 4 }}>Uso interno da agência — o cliente não vê esta etapa.</p>
              </div>
              {isAdmin && (
                <Link href={"/admin/configuracoes/onboarding" as Route} className="btn-text tiny" style={{ color: 'var(--muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  <Icon name="settings" size={12} /> Editar checklist
                </Link>
              )}
            </div>
            <OnboardingChecklist
              clientId={id}
              sections={onboardingSections ?? []}
              items={onboardingTemplateItems ?? []}
              doneItemIds={onboardingDoneIds}
            />
          </div>
        </div>

        {/* Right — stats + campaigns */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Info card */}
          <div className="card">
            <div className="eyebrow" style={{ marginBottom: 14 }}>Informações</div>
            {[
              { label: 'E-mail', value: client.email },
              { label: 'WhatsApp', value: client.whatsapp ?? '—' },
              { label: 'Responsável interno', value: owner?.name ?? '—' },
              { label: 'Especialidade', value: client.specialty ?? '—' },
              { label: 'CRM / RQE', value: client.professional_register ?? '—' },
              {
                label: 'Plano',
                value: client.plan_name
                  ? `${client.plan_name}${client.monthly_value ? ` · R$ ${Number(client.monthly_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}`
                  : '—',
              },
              {
                label: 'Vigência',
                value: client.contract_start_date
                  ? `${new Date(client.contract_start_date + 'T00:00:00').toLocaleDateString('pt-BR')}${client.contract_end_date ? ` — ${new Date(client.contract_end_date + 'T00:00:00').toLocaleDateString('pt-BR')}` : ''}`
                  : '—',
              },
              { label: 'Objetivo principal', value: client.main_objective ?? '—' },
              { label: 'Desde', value: new Date(client.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) },
            ].map((row) => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line-soft)' }}>
                <span className="muted tiny">{row.label}</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Perfis */}
          {(client.instagram_url || client.website_url || client.google_business_url) && (
            <div className="card">
              <div className="eyebrow" style={{ marginBottom: 14 }}>Perfis</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {client.instagram_url && (
                  <a href={client.instagram_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-2)', textDecoration: 'none' }}>
                    <Icon name="link" size={13} color="var(--muted-2)" /> Instagram
                  </a>
                )}
                {client.website_url && (
                  <a href={client.website_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-2)', textDecoration: 'none' }}>
                    <Icon name="link" size={13} color="var(--muted-2)" /> Site
                  </a>
                )}
                {client.google_business_url && (
                  <a href={client.google_business_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-2)', textDecoration: 'none' }}>
                    <Icon name="link" size={13} color="var(--muted-2)" /> Google Meu Negócio
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Portal access */}
          <div className="card">
            <div className="eyebrow" style={{ marginBottom: 14 }}>Acesso ao portal</div>
            <ClientAccessPanel
              clientId={id}
              clientUsers={clientUsers ?? []}
            />
          </div>

          {/* Campaigns + Planejamentos (mesmo card) */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div className="eyebrow">Cronogramas</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {client.requires_planning_approval && (
                  <Link href={"/admin/planejamento/novo" as Route} className="btn-text tiny" style={{ color: 'var(--green)', fontWeight: 600 }}>
                    <Icon name="plus" size={12} /> Planejamento
                  </Link>
                )}
                <Link href={`/admin/cronogramas/novo`} className="btn-text tiny" style={{ color: 'var(--orange)', fontWeight: 600 }}>
                  <Icon name="plus" size={12} /> Cronograma
                </Link>
              </div>
            </div>

            {/* Planejamentos de temas */}
            {client.requires_planning_approval && planningSchedules && planningSchedules.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted-2)', marginBottom: 6 }}>
                  Planejamentos
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {planningSchedules.map((p) => (
                    <Link key={p.id} href={`/admin/planejamento/${p.id}` as Route} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, background: 'var(--bg)', textDecoration: 'none', color: 'inherit' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                        <div className="muted tiny" style={{ marginTop: 2 }}>{formatMonthYear(p.month_year)}</div>
                      </div>
                      <StatusBadge kind={PLANNING_STATUS_KIND[p.status] as Parameters<typeof StatusBadge>[0]['kind']} label={PLANNING_STATUS_LABEL[p.status]} />
                    </Link>
                  ))}
                </div>
                {(campaigns && campaigns.length > 0) && (
                  <div style={{ borderTop: '1px solid var(--line-soft)', margin: '12px 0 10px' }} />
                )}
              </div>
            )}

            {/* Cronogramas */}
            {(!campaigns || campaigns.length === 0) ? (
              <p className="muted tiny">Nenhum cronograma ainda.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {campaigns.map((c) => {
                  const items = Array.isArray(c.content_items) ? c.content_items : [];
                  const total = items.length;
                  const approved = items.filter((it: { general_status: string }) => ['aprovado', 'finalizado'].includes(it.general_status)).length;
                  const kind = STATUS_KIND[c.status] ?? 'rascunho';
                  return (
                    <Link key={c.id} href={`/admin/cronogramas/${c.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'var(--bg)', textDecoration: 'none', color: 'inherit' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                        <div className="muted tiny" style={{ marginTop: 2 }}>{approved}/{total} aprovados</div>
                      </div>
                      <StatusBadge kind={kind as Parameters<typeof StatusBadge>[0]['kind']} />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Danger zone */}
          <div className="card" style={{ border: '1px solid #fecaca' }}>
            <div className="eyebrow" style={{ color: '#b91c1c', marginBottom: 10 }}>
              {client.status === 'inativo' ? 'Conta inativa' : 'Zona de risco'}
            </div>
            {client.status === 'inativo' && (
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.5 }}>
                Este cliente está inativo. Seus cronogramas foram arquivados automaticamente.
              </p>
            )}
            {client.status === 'ativo' && (
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.5 }}>
                Inativar o cliente arquiva automaticamente todos os cronogramas em andamento.
              </p>
            )}
            <InactivateClientButton
              clientId={client.id}
              currentStatus={client.status as 'ativo' | 'inativo'}
              clientName={client.name}
            />

            {isAdmin && (
              <>
                <div style={{ borderTop: '1px solid var(--line-soft)', margin: '14px 0' }} />
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.5 }}>
                  Excluir o cliente remove permanentemente todos os seus cronogramas, conteúdos, aprovações e acessos. Apenas administradores podem fazer isso.
                </p>
                <DeleteClientButton clientId={client.id} clientName={client.name} />
              </>
            )}
          </div>

          {/* Notes */}
          {client.internal_notes && (
            <div className="card" style={{ background: 'var(--orange-50)', border: '1px solid var(--orange-100)' }}>
              <div className="eyebrow" style={{ color: 'var(--orange)', marginBottom: 8 }}>Notas internas</div>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--ink-2)' }}>{client.internal_notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
