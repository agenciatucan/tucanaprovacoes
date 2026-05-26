import { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Icon } from '@/components/ui/Icon';
import ApprovalPanel from '@/components/aprovacao/ApprovalPanel';

export const metadata: Metadata = { title: 'Post' };

interface Props { params: Promise<{ id: string }>; }

const FMT_LABEL: Record<string, string> = {
  reels: 'Reels', carrossel: 'Carrossel', post_estatico: 'Post estático', story: 'Story', outro: 'Outro',
};
const FMT_CLASS: Record<string, string> = {
  reels: 'fmt fmt-reels', carrossel: 'fmt fmt-carrossel',
  post_estatico: 'fmt fmt-estatico', story: 'fmt fmt-stories',
};

export default async function PostDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles').select('id, name').eq('auth_user_id', user.id).single();
  if (!profile) redirect('/login');

  const { data: post } = await supabase
    .from('content_items')
    .select('*, campaigns(id, name, client_id, is_locked, clients(name, company_name))')
    .eq('id', id).single();

  if (!post) notFound();

  const campaign = Array.isArray(post.campaigns) ? post.campaigns[0] : post.campaigns;
  const client = Array.isArray(campaign?.clients) ? campaign?.clients[0] : campaign?.clients;

  // Verify access
  const { data: access } = await supabase
    .from('client_users').select('id').eq('user_id', profile.id).eq('client_id', campaign?.client_id).maybeSingle();
  if (!access) notFound();

  // Comments history
  const { data: comments } = await supabase
    .from('comments_history')
    .select('id, message, status, created_at, user_profiles(name)')
    .eq('content_item_id', id)
    .order('created_at', { ascending: false })
    .limit(10);

  // Files
  const { data: files } = await supabase
    .from('files')
    .select('id, file_name, file_url, file_type, file_size_bytes')
    .eq('content_item_id', id)
    .eq('visible_to_client', true);

  const STATUS_KIND: Record<string, string> = { pendente: 'aguardando', em_revisao: 'revisao', aprovado: 'aprovado', em_producao: 'agendado', finalizado: 'publicado' };
  const statusKind = STATUS_KIND[post.general_status as string] ?? 'rascunho';

  return (
    <div className="page" style={{ maxWidth: 1320 }}>
      {/* Breadcrumb */}
      <div className="crumb">
        <Link href="/cliente">Cronogramas</Link>
        <span>/</span>
        <Link href={`/cliente/cronogramas/${campaign?.id}`}>{campaign?.name}</Link>
        <span>/</span>
        {post.week_label}
      </div>

      {/* Title row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, gap: 24 }}>
        <div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <span className="chip">{post.week_label}</span>
            <span className={FMT_CLASS[post.format] ?? 'fmt'}>{FMT_LABEL[post.format] ?? post.format}</span>
            <StatusBadge kind={statusKind as any} />
          </div>
          <h1 className="h1" style={{ fontSize: 26, maxWidth: 720 }}>{post.title}</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <Link href={`/cliente/cronogramas/${campaign?.id}`} className="btn btn-ghost btn-sm">
            <Icon name="arrow-left" size={14} /> Voltar
          </Link>
          {(files?.length ?? 0) > 0 && (
            <button className="btn btn-ghost btn-sm"><Icon name="download" size={14} /> Baixar arquivos</button>
          )}
        </div>
      </div>

      {/* Main grid: preview + details */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 24 }}>
        {/* Left — preview + files */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Post preview tile */}
          <div className="card" style={{ padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
            <div style={{ width: '100%', maxWidth: 480, height: 320, borderRadius: 16, background: '#e8f0e5', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ textAlign: 'center', padding: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)', lineHeight: 1.4 }}>"{post.title}"</div>
              </div>
              <div style={{ position: 'absolute', bottom: 12, left: 12, right: 12, background: 'rgba(0,0,0,0.5)', borderRadius: 8, padding: '6px 10px' }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Prévia do conteúdo — {FMT_LABEL[post.format] ?? post.format}</div>
              </div>
            </div>
          </div>

          {/* Files */}
          {files && files.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {files.map((f) => (
                <a key={f.id} href={f.file_url} target="_blank" rel="noreferrer" className="chip chip-outline" style={{ textDecoration: 'none' }}>
                  <Icon name="file" size={12} /> {f.file_name}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Right — content details + approval */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Content details */}
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

          {/* Caption */}
          {post.caption && (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div className="eyebrow">Legenda sugerida</div>
                <button className="btn-text tiny" style={{ color: 'var(--ink-2)', fontWeight: 600 }}>
                  <Icon name="link" size={12} /> Copiar
                </button>
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--ink-2)', whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}>
                {post.caption}
              </div>
            </div>
          )}

          {/* Script (for Reels) */}
          {post.script && (
            <div className="card">
              <div className="eyebrow" style={{ marginBottom: 8 }}>Roteiro</div>
              <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--ink-2)', whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}>
                {post.script}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Approval panel — interactive client component */}
      <div style={{ marginTop: 24 }}>
        <ApprovalPanel
          post={{
            id: post.id,
            campaign_id: campaign?.id ?? '',
            theme_status: post.theme_status,
            caption_status: post.caption_status,
            artwork_status: post.artwork_status,
            general_status: post.general_status,
            is_locked: post.is_locked || campaign?.is_locked,
          }}
          comments={comments ?? []}
        />
      </div>
    </div>
  );
}
