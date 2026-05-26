import Link from 'next/link';
import { StatusBadge } from '@/components/ui/StatusBadge';

// Palette — 6 gradient combos for post preview visual
const PALETTES = [
  { bg: '#e8f0e5', fg: '#25411e' },
  { bg: '#fde5d3', fg: '#eb6013' },
  { bg: '#dbeafe', fg: '#1d4ed8' },
  { bg: '#ede9fe', fg: '#7c3aed' },
  { bg: '#fce7f3', fg: '#db2777' },
  { bg: '#d1fae5', fg: '#065f46' },
];

const FMT_CLASS: Record<string, string> = {
  'reels': 'fmt fmt-reels',
  'carrossel': 'fmt fmt-carrossel',
  'post_estatico': 'fmt fmt-estatico',
  'story': 'fmt fmt-stories',
};

const FMT_LABEL: Record<string, string> = {
  reels: 'Reels', carrossel: 'Carrossel', post_estatico: 'Post estático', story: 'Story', outro: 'Outro',
};

const STATUS_KIND: Record<string, string> = {
  pendente: 'aguardando', em_revisao: 'revisao', aprovado: 'aprovado',
  em_producao: 'agendado', finalizado: 'publicado',
};

interface Post {
  id: string;
  week_label: string;
  format: string;
  title: string;
  theme: string | null;
  objective: string | null;
  general_status: string;
  theme_status: string;
  caption_status: string;
  artwork_status: string;
}

export default function PostCard({ post, campaignId }: { post: Post; campaignId: string }) {
  const palette = PALETTES[post.id.charCodeAt(0) % PALETTES.length]!;
  const fmtClass = FMT_CLASS[post.format] ?? 'fmt';
  const statusKind = (STATUS_KIND[post.general_status] ?? 'rascunho') as any;

  return (
    <Link href={`/cliente/posts/${post.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: 'box-shadow .15s, transform .15s' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-2)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}>
        {/* Preview tile */}
        <div style={{ height: 160, background: palette.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ textAlign: 'center', maxWidth: '100%' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: palette.fg + '20', margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: palette.fg }} />
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: palette.fg, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const }}>
              "{post.title}"
            </div>
          </div>
        </div>

        {/* Card body */}
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className={fmtClass}>{FMT_LABEL[post.format] ?? post.format}</span>
            <StatusBadge kind={statusKind} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
            {post.title}
          </div>
          {post.theme && <div className="muted tiny">{post.theme}</div>}
        </div>
      </div>
    </Link>
  );
}
