import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Route } from 'next';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { Icon } from '@/components/ui/Icon';
import PostForm from '@/components/admin/PostForm';

export const metadata: Metadata = { title: 'Post' };

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ campaign?: string }>;
}

export default async function AdminPostPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { campaign: campaignIdParam } = await searchParams;
  const isNew = id === 'novo';
  const supabase = await getSupabaseServerClient();

  // ── Modo novo ──────────────────────────────────
  if (isNew) {
    if (!campaignIdParam) notFound();

    // Busca campanha e semanas existentes em paralelo
    const [{ data: campaign }, { data: existingItems }] = await Promise.all([
      supabase
        .from('campaigns')
        .select('id, name, client_id, clients(name, company_name)')
        .eq('id', campaignIdParam)
        .single(),
      supabase
        .from('content_items')
        .select('week_label')
        .eq('campaign_id', campaignIdParam)
        .order('order_index'),
    ]);

    if (!campaign) notFound();

    // Semanas já existentes no cronograma, sem repetição, na ordem em que aparecem
    const existingWeeks = [...new Set(existingItems?.map((i) => i.week_label) ?? [])];

    const client = Array.isArray(campaign.clients) ? campaign.clients[0] : campaign.clients;

    return (
      <div className="page" style={{ maxWidth: 860 }}>
        <div className="crumb" style={{ marginBottom: 20 }}>
          <Link href="/admin/cronogramas">Cronogramas</Link>
          <span>/</span>
          <Link href={`/admin/cronogramas/${campaign.id}` as Route}>{campaign.name}</Link>
          <span>/</span>
          Novo post
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <div className="eyebrow">{client?.company_name ?? client?.name}</div>
            <h1 className="h1" style={{ marginTop: 6 }}>Novo post</h1>
            <p className="muted" style={{ marginTop: 6, fontSize: 14 }}>Adicionar ao cronograma: <strong>{campaign.name}</strong></p>
          </div>
          <Link href={`/admin/cronogramas/${campaign.id}` as Route} className="btn btn-ghost btn-sm">
            <Icon name="arrow-left" size={14} /> Voltar
          </Link>
        </div>

        <div className="card card-lg">
          <PostForm
            campaignId={campaign.id}
            returnHref={`/admin/cronogramas/${campaign.id}`}
            existingWeeks={existingWeeks}
          />
        </div>
      </div>
    );
  }

  // ── Modo edição ──────────────────────────────────
  const { data: post } = await supabase
    .from('content_items')
    .select('*, campaigns(id, name, client_id, clients(name, company_name))')
    .eq('id', id)
    .single();

  if (!post) notFound();

  const campaign = Array.isArray(post.campaigns) ? post.campaigns[0] : post.campaigns;
  const client = Array.isArray(campaign?.clients) ? campaign?.clients[0] : campaign?.clients;

  // Histórico de comentários
  const { data: comments } = await supabase
    .from('comments_history')
    .select('id, message, status, created_at, user_profiles(name)')
    .eq('content_item_id', id)
    .order('created_at', { ascending: false })
    .limit(10);

  return (
    <div className="page" style={{ maxWidth: 1100 }}>
      <div className="crumb" style={{ marginBottom: 20 }}>
        <Link href="/admin/cronogramas">Cronogramas</Link>
        <span>/</span>
        <Link href={`/admin/cronogramas/${campaign?.id}`}>{campaign?.name}</Link>
        <span>/</span>
        {post.title}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div className="eyebrow">{client?.company_name ?? client?.name}</div>
          <h1 className="h1" style={{ marginTop: 6, fontSize: 26 }}>{post.title}</h1>
          <div className="muted" style={{ marginTop: 4, fontSize: 14 }}>{post.week_label}</div>
        </div>
        <Link href={`/admin/cronogramas/${campaign?.id}`} className="btn btn-ghost btn-sm">
          <Icon name="arrow-left" size={14} /> Voltar ao cronograma
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24, alignItems: 'start' }}>
        {/* Form */}
        <div className="card card-lg">
          <h2 className="h2" style={{ fontSize: 16, marginBottom: 20 }}>Editar conteúdo</h2>
          <PostForm
            campaignId={campaign?.id ?? ''}
            returnHref={`/admin/cronogramas/${campaign?.id}`}
            initial={{
              id: post.id,
              campaign_id: campaign?.id ?? '',
              week_label: post.week_label,
              order_index: post.order_index,
              format: post.format,
              title: post.title,
              theme: post.theme,
              objective: post.objective,
              creative_concept: post.creative_concept,
              caption: post.caption,
              script: post.script,
              reference_url: post.reference_url,
              internal_notes: post.internal_notes,
            }}
          />
        </div>

        {/* Status + Comments */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Approval status */}
          <div className="card">
            <div className="eyebrow" style={{ marginBottom: 14 }}>Status de aprovação</div>
            {[
              { label: 'Tema',    value: post.theme_status   },
              { label: 'Legenda', value: post.caption_status },
              { label: 'Arte',    value: post.artwork_status },
              { label: 'Geral',   value: post.general_status },
            ].map((row) => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--line-soft)' }}>
                <span className="muted tiny">{row.label}</span>
                <span style={{
                  fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                  background: row.value === 'aprovado' ? 'var(--st-aprovado-bg)' : row.value === 'ajuste_solicitado' ? 'var(--st-aguardando-bg)' : 'var(--st-rascunho-bg)',
                  color: row.value === 'aprovado' ? 'var(--st-aprovado-fg)' : row.value === 'ajuste_solicitado' ? 'var(--st-aguardando-fg)' : 'var(--st-rascunho-fg)',
                }}>
                  {row.value?.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </div>

          {/* Comments history */}
          {comments && comments.length > 0 && (
            <div className="card">
              <div className="eyebrow" style={{ marginBottom: 14 }}>Observações do cliente</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {comments.map((c) => {
                  const author = (Array.isArray(c.user_profiles) ? c.user_profiles[0] : c.user_profiles)?.name ?? '?';
                  return (
                    <div key={c.id} style={{ padding: '10px 12px', borderRadius: 10, background: c.status === 'aberta' ? 'var(--orange-50)' : 'var(--bg)', border: `1px solid ${c.status === 'aberta' ? 'var(--orange-100)' : 'var(--line-soft)'}` }}>
                      <div style={{ fontSize: 13, lineHeight: 1.5 }}>{c.message}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                        <span className="muted tiny">{author}</span>
                        <span className="muted tiny">{new Date(c.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
