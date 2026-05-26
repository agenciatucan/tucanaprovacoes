import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Route } from 'next';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Icon } from '@/components/ui/Icon';
import CampaignActions from '@/components/admin/CampaignActions';

export const metadata: Metadata = { title: 'Gerenciar cronograma' };

const FMT_LABEL: Record<string, string> = {
  reels: 'Reels', carrossel: 'Carrossel', post_estatico: 'Post estático', story: 'Story', outro: 'Outro',
};
const FMT_CLASS: Record<string, string> = {
  reels: 'fmt fmt-reels', carrossel: 'fmt fmt-carrossel',
  post_estatico: 'fmt fmt-estatico', story: 'fmt fmt-stories',
};
const STATUS_KIND: Record<string, string> = {
  rascunho: 'rascunho', enviado_para_aprovacao: 'aguardando', em_revisao: 'revisao',
  aprovado: 'aprovado', em_producao: 'agendado', finalizado: 'publicado', arquivado: 'rascunho',
};
const POST_STATUS_KIND: Record<string, string> = {
  pendente: 'aguardando', em_revisao: 'revisao', aprovado: 'aprovado',
  em_producao: 'agendado', finalizado: 'publicado',
};

interface Props { params: Promise<{ id: string }>; }

export default async function GerenciarCronogramaPage({ params }: Props) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*, clients(id, name, company_name, email)')
    .eq('id', id)
    .single();

  if (!campaign) notFound();

  const { data: items } = await supabase
    .from('content_items')
    .select('id, week_label, order_index, format, title, theme, general_status, theme_status, caption_status, artwork_status, is_locked')
    .eq('campaign_id', id)
    .order('order_index');

  const client = Array.isArray(campaign.clients) ? campaign.clients[0] : campaign.clients;
  const total = items?.length ?? 0;
  const approved = items?.filter((i) => ['aprovado', 'finalizado'].includes(i.general_status)).length ?? 0;
  const pct = total ? Math.round((approved / total) * 100) : 0;
  const approvalLink = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/acesso/${campaign.approval_token}`;
  const statusKind = STATUS_KIND[campaign.status] ?? 'rascunho';

  // Agrupar por semana
  const weeks: Record<string, typeof items> = {};
  items?.forEach((item) => {
    if (!weeks[item.week_label]) weeks[item.week_label] = [];
    weeks[item.week_label]!.push(item);
  });
  const weekKeys = Object.keys(weeks).sort();

  return (
    <div className="page" style={{ maxWidth: 1320 }}>
      {/* Breadcrumb */}
      <div className="crumb">
        <Link href="/admin/cronogramas">Cronogramas</Link>
        <span>/</span>
        {campaign.name}
      </div>

      {/* Campaign header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <h1 className="h1" style={{ fontSize: 26 }}>{campaign.name}</h1>
            <StatusBadge kind={statusKind as Parameters<typeof StatusBadge>[0]['kind']} size="lg" />
          </div>
          <div className="muted" style={{ fontSize: 14 }}>
            {client?.company_name ?? client?.name} · {campaign.period_label} · {FMT_LABEL[campaign.type] ?? campaign.type}
          </div>
        </div>

        <CampaignActions
          campaignId={id}
          status={campaign.status}
          approvalLink={approvalLink}
          isLocked={campaign.is_locked}
          editHref={`/admin/cronogramas/${id}/editar`}
        />
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total de posts', value: total, color: 'var(--ink)' },
          { label: 'Aprovados', value: approved, color: 'var(--green)' },
          { label: 'Em revisão', value: items?.filter(i => i.general_status === 'em_revisao').length ?? 0, color: 'var(--orange)' },
          { label: 'Pendentes', value: items?.filter(i => i.general_status === 'pendente').length ?? 0, color: 'var(--muted)' },
        ].map((s) => (
          <div key={s.label} className="card-flat" style={{ padding: 16 }}>
            <div className="eyebrow" style={{ fontSize: 10 }}>{s.label}</div>
            <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', color: s.color, marginTop: 4, lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div className="progress" style={{ flex: 1 }}>
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="muted tiny" style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{pct}% aprovado</span>
        </div>
      )}

      {/* Overview */}
      {campaign.overview && (
        <div className="card" style={{ marginBottom: 24, background: 'var(--green-50)', border: '1px solid var(--green-100)' }}>
          <div className="eyebrow" style={{ color: 'var(--green)', marginBottom: 6 }}>Visão estratégica</div>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink-2)', margin: 0 }}>{campaign.overview}</p>
        </div>
      )}

      {/* Posts */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 className="h2" style={{ fontSize: 18 }}>Posts do cronograma</h2>
        <Link href={`/admin/posts/novo?campaign=${id}` as Route} className="btn btn-primary btn-sm">
          <Icon name="plus" size={14} /> Adicionar post
        </Link>
      </div>

      {total === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <p className="muted" style={{ marginBottom: 12 }}>Nenhum post ainda. Adicione o primeiro post ao cronograma.</p>
          <Link href={`/admin/posts/novo?campaign=${id}` as Route} className="btn btn-primary">
            <Icon name="plus" size={16} /> Adicionar primeiro post
          </Link>
        </div>
      ) : (
        weekKeys.map((week) => (
          <div key={week} style={{ marginBottom: 28 }}>
            {/* Week header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <h3 className="h3" style={{ color: 'var(--ink)' }}>{week}</h3>
              <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
              <span className="muted tiny">{weeks[week]?.length} posts</span>
            </div>

            {/* Posts table for this week */}
            <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
              {weeks[week]?.map((post, i) => {
                const postKind = POST_STATUS_KIND[post.general_status] ?? 'aguardando';
                return (
                  <div key={post.id} style={{ display: 'grid', gridTemplateColumns: '1.6fr 0.7fr 0.8fr 0.8fr 0.8fr 100px', gap: 14, padding: '12px 18px', alignItems: 'center', borderBottom: i === (weeks[week]!.length - 1) ? 'none' : '1px solid var(--line-soft)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.title}</div>
                      {post.theme && <div className="muted tiny" style={{ marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.theme}</div>}
                    </div>
                    <div><span className={FMT_CLASS[post.format] ?? 'fmt'} style={{ fontSize: 11 }}>{FMT_LABEL[post.format] ?? post.format}</span></div>
                    <div style={{ fontSize: 11 }}>
                      <span title="Tema" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: post.theme_status === 'aprovado' ? 'var(--green)' : post.theme_status === 'ajuste_solicitado' ? 'var(--orange)' : 'var(--muted-2)', flexShrink: 0 }} />
                        Tema
                      </span>
                    </div>
                    <div style={{ fontSize: 11 }}>
                      <span title="Legenda" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: post.caption_status === 'aprovado' ? 'var(--green)' : post.caption_status === 'ajuste_solicitado' ? 'var(--orange)' : 'var(--muted-2)', flexShrink: 0 }} />
                        Legenda
                      </span>
                    </div>
                    <div><StatusBadge kind={postKind as Parameters<typeof StatusBadge>[0]['kind']} /></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                      <Link href={`/admin/posts/${post.id}` as Route} className="btn btn-ghost btn-sm" style={{ height: 30, padding: '0 10px', fontSize: 12 }}>
                        <Icon name="edit" size={12} /> Editar
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
