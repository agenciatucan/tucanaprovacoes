import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Route } from 'next';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { Icon } from '@/components/ui/Icon';
import PostForm from '@/components/admin/PostForm';
import MediaUploader from '@/components/admin/MediaUploader';
import PostTimeline from '@/components/admin/PostTimeline';

export const metadata: Metadata = { title: 'Post' };

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ campaign?: string }>;
}

const STATUS_CFG: Record<string, { label: string; bg: string; fg: string }> = {
  aguardando:        { label: 'Aguardando',        bg: '#f9fafb', fg: '#6b7280' },
  aprovado:          { label: 'Aprovado',           bg: '#f0fdf4', fg: '#166534' },
  ajuste_solicitado: { label: 'Ajuste solicitado',  bg: '#fffbeb', fg: '#92400e' },
  substituir_tema:   { label: 'Substituir tema',    bg: '#fffbeb', fg: '#92400e' },
  nao_se_aplica:     { label: 'Não se aplica',      bg: '#f3f4f6', fg: '#9ca3af' },
  pendente:          { label: 'Pendente',            bg: '#f9fafb', fg: '#6b7280' },
  em_revisao:        { label: 'Em revisão',          bg: '#eff6ff', fg: '#1d4ed8' },
  em_producao:       { label: 'Em produção',         bg: '#f5f3ff', fg: '#6d28d9' },
  finalizado:        { label: 'Finalizado',          bg: '#f0fdf4', fg: '#166534' },
};

export default async function AdminPostPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { campaign: campaignIdParam } = await searchParams;
  const isNew = id === 'novo';
  const supabase = await getSupabaseServerClient();

  // ── Modo novo ───────────────────────────────────────────────
  if (isNew) {
    if (!campaignIdParam) notFound();

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
            <p className="muted" style={{ marginTop: 6, fontSize: 14 }}>
              Adicionar ao cronograma: <strong>{campaign.name}</strong>
            </p>
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

  // ── Modo edição ─────────────────────────────────────────────
  const { data: post } = await supabase
    .from('content_items')
    .select('*, campaigns(id, name, client_id, clients(name, company_name))')
    .eq('id', id)
    .single();

  if (!post) notFound();

  const campaign = Array.isArray(post.campaigns) ? post.campaigns[0] : post.campaigns;
  const client   = Array.isArray(campaign?.clients) ? campaign?.clients[0] : campaign?.clients;

  // Buscar em paralelo: quem criou, aprovações, arquivos
  const [
    { data: creatorProfile },
    { data: approvalHistory },
    { data: postFiles },
  ] = await Promise.all([
    // Quem criou o post (user_profiles.created_by)
    post.created_by
      ? supabase
          .from('user_profiles')
          .select('name')
          .eq('id', post.created_by)
          .maybeSingle()
      : Promise.resolve({ data: null }),

    // Histórico de aprovações com nome do aprovador
    supabase
      .from('approvals')
      .select('id, approval_type, status, note, created_at, approved_by, user_profiles!approved_by(name, role)')
      .eq('content_item_id', id)
      .order('created_at', { ascending: true }),

    // Arquivos do post
    supabase
      .from('files')
      .select('id, file_name, file_url, file_type, file_size_bytes, visible_to_client')
      .eq('content_item_id', id)
      .order('created_at', { ascending: true }),
  ]);

  // Comentários para o ResendApprovalPanel (observações do cliente)
  const { data: comments } = await supabase
    .from('comments_history')
    .select('id, message, created_at, user_profiles!user_id(name)')
    .eq('content_item_id', id)
    .order('created_at', { ascending: false })
    .limit(10);

  const returnHref = `/admin/cronogramas/${campaign?.id}`;

  // Normalizar approvalHistory para o tipo esperado
  const normalizedHistory = (approvalHistory ?? []).map((ev) => ({
    ...ev,
    user_profiles: Array.isArray(ev.user_profiles) ? ev.user_profiles[0] ?? null : ev.user_profiles,
  }));

  return (
    <div className="page" style={{ maxWidth: 1200 }}>
      {/* Breadcrumb */}
      <div className="crumb" style={{ marginBottom: 20 }}>
        <Link href="/admin/cronogramas">Cronogramas</Link>
        <span>/</span>
        <Link href={returnHref as Route}>{campaign?.name}</Link>
        <span>/</span>
        {post.title}
      </div>

      {/* Título */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div className="eyebrow">{client?.company_name ?? client?.name}</div>
          <h1 className="h1" style={{ marginTop: 6, fontSize: 26 }}>{post.title}</h1>
          <div className="muted" style={{ marginTop: 4, fontSize: 14 }}>{post.week_label}</div>
        </div>
        <Link href={returnHref as Route} className="btn btn-ghost btn-sm">
          <Icon name="arrow-left" size={14} /> Voltar ao cronograma
        </Link>
      </div>

      {/* Layout: timeline (esq) + sidebar (dir) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 32, alignItems: 'start' }}>

        {/* ── Coluna esquerda: linha do tempo ── */}
        <div style={{ minWidth: 0 }}>
        <PostTimeline
          post={{
            id:               post.id,
            campaign_id:      campaign?.id ?? '',
            week_label:       post.week_label,
            order_index:      post.order_index,
            format:           post.format,
            title:            post.title,
            theme:            post.theme,
            objective:        post.objective,
            creative_concept: post.creative_concept,
            caption:          post.caption,
            script:           post.script,
            reference_url:    post.reference_url,
            internal_notes:   post.internal_notes,
            theme_status:     post.theme_status,
            caption_status:   post.caption_status,
            artwork_status:   post.artwork_status,
            general_status:   post.general_status,
            created_at:       post.created_at,
          }}
          campaignId={campaign?.id ?? ''}
          createdByName={creatorProfile?.name ?? null}
          approvalHistory={normalizedHistory}
          comments={comments ?? []}
          returnHref={returnHref}
        />
        </div>

        {/* ── Coluna direita: status + arquivos ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Status de aprovação */}
          <div className="card">
            <div className="eyebrow" style={{ marginBottom: 14 }}>Status de aprovação</div>
            {[
              { label: 'Tema',    value: post.theme_status   },
              { label: 'Legenda', value: post.caption_status },
              { label: 'Arte',    value: post.artwork_status },
            ].map((row) => {
              const cfg = STATUS_CFG[row.value] ?? { label: row.value, bg: '#f9fafb', fg: '#6b7280' };
              return (
                <div key={row.label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '9px 0', borderBottom: '1px solid var(--line-soft)',
                }}>
                  <span className="muted tiny">{row.label}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    padding: '3px 9px', borderRadius: 6,
                    background: cfg.bg, color: cfg.fg,
                  }}>
                    {cfg.label}
                  </span>
                </div>
              );
            })}
            {/* Status geral separado */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '9px 0 0',
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink)' }}>Geral</span>
              {(() => {
                const cfg = STATUS_CFG[post.general_status] ?? { label: post.general_status, bg: '#f9fafb', fg: '#6b7280' };
                return (
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    padding: '3px 9px', borderRadius: 6,
                    background: cfg.bg, color: cfg.fg,
                  }}>
                    {cfg.label}
                  </span>
                );
              })()}
            </div>
          </div>

          {/* Arquivos / Mídia */}
          <div className="card">
            <div className="eyebrow" style={{ marginBottom: 14 }}>Arquivos do post</div>
            <MediaUploader
              contentItemId={post.id}
              campaignId={campaign?.id ?? ''}
              clientId={campaign?.client_id ?? ''}
              initialFiles={postFiles ?? []}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
