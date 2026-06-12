'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Route } from 'next';
import { toast } from 'sonner';
import { Icon } from '@/components/ui/Icon';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { approveAllPending } from '@/actions/approvals';
import PendingPostRow, { type PendingPost } from './PendingPostRow';

const FMT_LABEL: Record<string, string> = {
  reels: 'Reels',
  carrossel: 'Carrossel',
  post_estatico: 'Post estático',
  story: 'Story',
  outro: 'Outro',
};

interface Props {
  initialItems: PendingPost[];
  reviewItems: PendingPost[];
  currentCampaignId: string | null;
}

export default function PendingSection({
  initialItems,
  reviewItems,
  currentCampaignId,
}: Props) {
  const [items, setItems] = useState(initialItems);
  const [isBulkPending, startBulkTransition] = useTransition();
  const router = useRouter();

  function handleResolved(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
    router.refresh();
  }

  function handleApproveAll() {
    if (!currentCampaignId) return;

    startBulkTransition(async () => {
      const result = await approveAllPending({ campaign_id: currentCampaignId });

      if (result.success) {
        const approvedIds = new Set(result.data.approvedIds);
        setItems((prev) => prev.filter((item) => !approvedIds.has(item.id)));
        toast.success('Todos os posts foram aprovados!');
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const showApproveAll =
    currentCampaignId !== null &&
    items.some((item) => item.campaign_id === currentCampaignId);

  return (
    <section>
      <div className="cliente-section-head">
        <div>
          <h2 className="h2" style={{ fontSize: 18 }}>
            Pendências
          </h2>

          <p className="muted tiny" style={{ marginTop: 4 }}>
            Posts esperando sua aprovação.
          </p>
        </div>

        {showApproveAll && (
          <button
            type="button"
            className="btn btn-dark btn-sm"
            onClick={handleApproveAll}
            disabled={isBulkPending}
          >
            {isBulkPending ? 'Aprovando...' : 'Aprovar todos'}
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="cliente-empty-card">
          <Icon name="check-circle" size={28} color="var(--green)" />

          <h3 className="h3" style={{ marginTop: 10 }}>
            Tudo aprovado!
          </h3>

          <p className="muted tiny" style={{ margin: '6px 0 0' }}>
            Você está em dia com todas as aprovações.
          </p>
        </div>
      ) : (
        <div className="cliente-pending-list">
          {items.map((post) => (
            <PendingPostRow key={post.id} post={post} onResolved={handleResolved} />
          ))}
        </div>
      )}

      {reviewItems.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>
            Em revisão pela equipe
          </div>

          <div className="cliente-pending-list">
            {reviewItems.map((post) => {
              const format = post.format ?? 'outro';

              return (
                <Link
                  key={post.id}
                  href={`/cliente/posts/${post.id}` as Route}
                  className="cliente-pending-card cliente-pending-card-muted"
                >
                  <div className="cliente-format-box">
                    {FMT_LABEL[format]?.charAt(0) ?? 'P'}
                  </div>

                  <div style={{ minWidth: 0 }}>
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
                  </div>

                  <StatusBadge kind="revisao" />
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
