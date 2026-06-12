'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { toast } from 'sonner';
import { submitApproval } from '@/actions/approvals';

const FMT_LABEL: Record<string, string> = {
  reels: 'Reels',
  carrossel: 'Carrossel',
  post_estatico: 'Post estático',
  story: 'Story',
  outro: 'Outro',
};

export interface PendingPost {
  id: string;
  title: string | null;
  format: string | null;
  week_label: string | null;
  campaign_id: string;
  campaign_name: string | null;
}

interface Props {
  post: PendingPost;
  onResolved: (id: string) => void;
}

export default function PendingPostRow({ post, onResolved }: Props) {
  const [isPending, startTransition] = useTransition();

  const format = post.format ?? 'outro';

  function handleApprove() {
    startTransition(async () => {
      const result = await submitApproval({
        content_item_id: post.id,
        campaign_id: post.campaign_id,
        approval_type: 'post_completo',
        status: 'aprovado',
      });

      if (result.success) {
        toast.success('Post aprovado!');
        onResolved(post.id);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="cliente-pending-item">
      <div className="cliente-pending-row">
        <div className="cliente-format-box">
          {FMT_LABEL[format]?.charAt(0) ?? 'P'}
        </div>

        <Link
          href={`/cliente/posts/${post.id}` as Route}
          style={{ minWidth: 0, textDecoration: 'none', color: 'inherit' }}
        >
          <div className="muted tiny">
            {post.week_label} · {FMT_LABEL[format] ?? format}
          </div>

          <div
            style={{
              fontWeight: 800,
              fontSize: 14,
              marginTop: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {post.title}
          </div>

          <div className="muted tiny" style={{ marginTop: 4 }}>
            {post.campaign_name ?? 'Cronograma'}
          </div>
        </Link>

        <div className="cliente-pending-actions">
          <button
            type="button"
            className="btn btn-dark btn-sm"
            onClick={handleApprove}
            disabled={isPending}
          >
            Aprovar
          </button>
        </div>
      </div>
    </div>
  );
}
