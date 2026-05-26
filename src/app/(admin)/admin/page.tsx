import { Metadata } from 'next';
import Link from 'next/link';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Icon } from '@/components/ui/Icon';

export const metadata: Metadata = { title: 'Visão geral' };

export default async function AdminDashboard() {
  const supabase = await getSupabaseServerClient();

  const [
    { count: activeClients },
    { count: pendingApproval },
    { count: pendingPosts },
    { count: approvedPosts },
    { count: adjustPosts },
    { count: openComments },
    { data: recentComments },
    { data: pendingCampaigns },
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('status', 'ativo'),
    supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('status', 'enviado_para_aprovacao'),
    supabase.from('content_items').select('*', { count: 'exact', head: true }).eq('general_status', 'pendente'),
    supabase.from('content_items').select('*', { count: 'exact', head: true }).eq('general_status', 'aprovado'),
    supabase.from('content_items').select('*', { count: 'exact', head: true }).eq('general_status', 'em_revisao'),
    supabase.from('comments_history').select('*', { count: 'exact', head: true }).eq('status', 'aberta'),
    supabase.from('comments_history').select('id, message, created_at, clients(name)').eq('status', 'aberta').order('created_at', { ascending: false }).limit(5),
    supabase.from('campaigns').select('id, name, status, clients(name, company_name)').in('status', ['enviado_para_aprovacao', 'em_revisao']).order('updated_at', { ascending: false }).limit(6),
  ]);

  const stats = [
    { label: 'Clientes ativos',            value: activeClients ?? 0,   color: 'var(--green)',  icon: 'users' },
    { label: 'Aguardando aprovação',        value: pendingApproval ?? 0, color: 'var(--orange)', icon: 'clock' },
    { label: 'Posts pendentes',             value: pendingPosts ?? 0,    color: '#92400e',       icon: 'flag' },
    { label: 'Posts aprovados',             value: approvedPosts ?? 0,   color: 'var(--green)',  icon: 'check' },
    { label: 'Com ajuste solicitado',       value: adjustPosts ?? 0,     color: '#b54a07',       icon: 'edit' },
    { label: 'Observações abertas',         value: openComments ?? 0,    color: '#1d4ed8',       icon: 'message-circle' },
  ];

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
        <div>
          <div className="eyebrow">Tucan · Interno</div>
          <h1 className="h1" style={{ marginTop: 6 }}>Visão geral</h1>
          <p className="muted" style={{ marginTop: 6, fontSize: 14 }}>Acompanhe tudo que está acontecendo na operação.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/admin/clientes/novo" className="btn btn-ghost btn-sm">
            <Icon name="plus" size={14} /> Novo cliente
          </Link>
          <Link href="/admin/cronogramas/novo" className="btn btn-primary">
            <Icon name="plus" size={16} /> Novo cronograma
          </Link>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14, marginBottom: 32 }}>
        {stats.map((s) => (
          <div key={s.label} className="card-flat" style={{ padding: 18 }}>
            <div className="eyebrow" style={{ fontSize: 10 }}>{s.label}</div>
            <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em', color: s.color, marginTop: 6, lineHeight: 1 }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Two columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24 }}>
        {/* Cronogramas pendentes */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
            <div>
              <h2 className="h2" style={{ fontSize: 18 }}>Cronogramas em aprovação</h2>
              <p className="muted tiny" style={{ marginTop: 4 }}>Acompanhe o que está esperando o cliente.</p>
            </div>
            <Link href="/admin/cronogramas" className="btn-text tiny" style={{ color: 'var(--ink-2)', fontWeight: 600, fontSize: 12 }}>Ver todos →</Link>
          </div>

          <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
            {pendingCampaigns?.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
                Nenhum cronograma aguardando aprovação.
              </div>
            ) : pendingCampaigns?.map((c, i) => {
              const client = Array.isArray(c.clients) ? c.clients[0] : c.clients;
              return (
                <Link key={c.id} href={`/admin/cronogramas/${c.id}`} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', borderBottom: i === (pendingCampaigns.length - 1) ? 'none' : '1px solid var(--line-soft)', textDecoration: 'none', color: 'inherit', transition: 'background .12s' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--green-50)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon name="calendar" size={18} stroke={1.8} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                    <div className="muted tiny" style={{ marginTop: 2 }}>{client?.company_name ?? client?.name}</div>
                  </div>
                  <StatusBadge kind={c.status as any} />
                  <Icon name="chevron" size={14} color="var(--muted-2)" />
                </Link>
              );
            })}
          </div>
        </div>

        {/* Observações abertas */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
            <div>
              <h2 className="h2" style={{ fontSize: 18 }}>Observações abertas</h2>
              <p className="muted tiny" style={{ marginTop: 4 }}>Feedbacks dos clientes.</p>
            </div>
            <Link href="/admin/observacoes" className="btn-text tiny" style={{ color: 'var(--ink-2)', fontWeight: 600, fontSize: 12 }}>Ver todas →</Link>
          </div>

          <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
            {recentComments?.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
                Nenhuma observação em aberto.
              </div>
            ) : recentComments?.map((c, i) => {
              const client = Array.isArray(c.clients) ? c.clients[0] : c.clients;
              return (
                <div key={c.id} style={{ padding: '14px 20px', borderBottom: i === (recentComments.length - 1) ? 'none' : '1px solid var(--line-soft)' }}>
                  <div style={{ fontSize: 13, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{c.message}</div>
                  <div className="muted tiny" style={{ marginTop: 6 }}>{client?.name}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 32 }}>
        <Link href="/admin/kanban"     className="btn btn-ghost btn-sm"><Icon name="kanban" size={14} /> Ver Kanban</Link>
        <Link href="/admin/calendario" className="btn btn-ghost btn-sm"><Icon name="calendar" size={14} /> Calendário</Link>
        <Link href="/admin/observacoes" className="btn btn-ghost btn-sm"><Icon name="message-circle" size={14} /> Observações</Link>
      </div>
    </div>
  );
}
