import { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Icon } from '@/components/ui/Icon';
import ApprovalPanel from '@/components/aprovacao/ApprovalPanel';
import MediaGallery from '@/components/cliente/MediaGallery';
import CopyButton from '@/components/cliente/CopyButton';
import { isCampaignVisibleToClient, POST_STATUS_KIND } from '@/lib/constants/status';

export const metadata: Metadata = { title: 'Post' };

interface Props {
  params: Promise<{ id: string }>;
}

const FMT_LABEL: Record<string, string> = {
  reels: 'Reels',
  carrossel: 'Carrossel',
  post_estatico: 'Post estático',
  story: 'Story',
  outro: 'Outro',
};

const FMT_CLASS: Record<string, string> = {
  reels: 'fmt fmt-reels',
  carrossel: 'fmt fmt-carrossel',
  post_estatico: 'fmt fmt-estatico',
  story: 'fmt fmt-stories',
};

export default async function PostDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, name')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile) redirect('/login');

  const { data: post } = await supabase
    .from('content_items')
    .select(
      '*, campaigns(id, name, status, client_id, is_locked, clients(name, company_name))'
    )
    .eq('id', id)
    .single();

  if (!post) notFound();

  const campaign = Array.isArray(post.campaigns) ? post.campaigns[0] : post.campaigns;

  if (!campaign) notFound();

  // Segurança: cliente não pode abrir post de cronograma em rascunho/arquivado nem por link direto.
  if (!isCampaignVisibleToClient(campaign.status)) {
    notFound();
  }

  const { data: access } = await supabase
    .from('client_users')
    .select('id')
    .eq('user_id', profile.id)
    .eq('client_id', campaign.client_id)
    .maybeSingle();

  if (!access) notFound();

  const { data: comments } = await supabase
    .from('comments_history')
    .select('id, message, status, created_at, user_profiles!user_id(name)')
    .eq('content_item_id', id)
    .order('created_at', { ascending: false })
    .limit(10);

  const { data: files } = await supabase
    .from('files')
    .select('id, file_name, file_url, file_type, file_size_bytes')
    .eq('content_item_id', id)
    .eq('visible_to_client', true)
    .order('created_at', { ascending: true });

  const statusKind = POST_STATUS_KIND[post.general_status as string] ?? 'rascunho';
  const fmtClass = FMT_CLASS[post.format] ?? 'fmt';
  const fmtLabel = FMT_LABEL[post.format] ?? post.format;

  return (
    <div className="page" style={{ maxWidth: 1320 }}>
      <div className="crumb">
        <Link href="/cliente">Cronogramas</Link>
        <span>/</span>
        <Link href={`/cliente/cronogramas/${campaign.id}`}>{campaign.name}</Link>
        <span>/</span>
        {post.week_label}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, gap: 24, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
            <span className="chip">{post.week_label}</span>
            <span className={fmtClass}>{fmtLabel}</span>
            <StatusBadge kind={statusKind as any} />
          </div>

          <h1 className="h1" style={{ fontSize: 26, maxWidth: 720 }}>
            {post.title}
          </h1>
        </div>

        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <Link href={`/cliente/cronogramas/${campaign.id}`} className="btn btn-ghost btn-sm">
            <Icon name="arrow-left" size={14} /> Voltar
          </Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
        <MediaGallery files={files ?? []} postTitle={post.title} postFormat={fmtLabel} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {(post.theme || post.objective || post.creative_concept) && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {post.theme && (
                <div>
                  <div className="eyebrow">Tema</div>
                  <div style={{ marginTop: 4, fontWeight: 600, fontSize: 15 }}>{post.theme}</div>
                </div>
              )}

              {post.theme && post.objective && <div className="divider" />}

              {post.objective && (
                <div>
                  <div className="eyebrow">Objetivo</div>
                  <div style={{ marginTop: 4, fontSize: 14, lineHeight: 1.55, color: 'var(--ink-2)' }}>{post.objective}</div>
                </div>
              )}

              {post.objective && post.creative_concept && <div className="divider" />}

              {post.creative_concept && (
                <div>
                  <div className="eyebrow">Conceito criativo</div>
                  <div style={{ marginTop: 4, fontSize: 14, lineHeight: 1.55, color: 'var(--ink-2)' }}>{post.creative_concept}</div>
                </div>
              )}
            </div>
          )}

          {post.caption && (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12 }}>
                <div className="eyebrow">Legenda sugerida</div>
                <CopyButton text={post.caption} />
              </div>

              <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--ink-2)', whiteSpace: 'pre-wrap', maxHeight: 240, overflowY: 'auto', paddingRight: 4 }}>
                {post.caption}
              </div>
            </div>
          )}

          {post.script && (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12 }}>
                <div className="eyebrow">Roteiro</div>
                <CopyButton text={post.script} />
              </div>

              <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--ink-2)', whiteSpace: 'pre-wrap', maxHeight: 240, overflowY: 'auto', paddingRight: 4 }}>
                {post.script}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <ApprovalPanel
          post={{
            id: post.id,
            campaign_id: campaign.id,
            theme_status: post.theme_status,
            caption_status: post.caption_status,
            artwork_status: post.artwork_status,
            general_status: post.general_status,
            is_locked: post.is_locked || campaign.is_locked,
          }}
          comments={comments ?? []}
        />
      </div>
    </div>
  );
}
