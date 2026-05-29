'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import {
  sendCampaignForApproval,
  regenerateApprovalToken,
} from '@/actions/campaigns';
import { Icon } from '@/components/ui/Icon';
import { toast } from 'sonner';

interface Props {
  campaignId: string;
  status: string;
  approvalLink: string;
  isLocked?: boolean | null;
  editHref: string;
}

export default function CampaignActions({
  campaignId,
  status,
  approvalLink,
  isLocked,
  editHref,
}: Props) {
  const router = useRouter();

  const [link, setLink] = useState(approvalLink);
  const [isPending, startTransition] = useTransition();

  const isArchived = status === 'arquivado';
  const canSend = ['rascunho', 'em_revisao'].includes(status) && !isArchived;
  const canEdit = !isLocked && status !== 'aprovado' && !isArchived;

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Link copiado!');
    } catch {
      toast.error('Não foi possível copiar o link.');
    }
  }

  function handleSendForApproval() {
    startTransition(async () => {
      const result = await sendCampaignForApproval(campaignId);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success('Cronograma enviado para aprovação!');
      router.refresh();
    });
  }

  function handleRegenerateLink() {
    startTransition(async () => {
      const result = await regenerateApprovalToken(campaignId);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      const newToken = result.data.approval_token;

      let newLink = link;

      try {
        const url = new URL(link);
        url.pathname = `/acesso/${newToken}`;
        newLink = url.toString();
      } catch {
        newLink = link.replace(/\/acesso\/[^/?#]+/, `/acesso/${newToken}`);
      }

      setLink(newLink);
      toast.success('Novo link gerado!');
      router.refresh();
    });
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      {isArchived && (
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#92400e',
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: 10,
            padding: '8px 10px',
          }}
        >
          Cronograma arquivado
        </span>
      )}

      {canEdit && (
        <Link href={editHref as Route} className="btn btn-ghost btn-sm">
          <Icon name="edit" size={14} />
          Editar
        </Link>
      )}

      {canSend && (
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={handleSendForApproval}
          disabled={isPending}
        >
          <Icon name="send" size={14} />
          {isPending ? 'Enviando…' : 'Enviar para aprovação'}
        </button>
      )}

      {!isArchived && (
        <>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleCopyLink}
            disabled={isPending}
          >
            <Icon name="copy" size={14} />
            Copiar link do cliente
          </button>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleRegenerateLink}
            disabled={isPending}
          >
            Gerar novo link
          </button>
        </>
      )}
    </div>
  );
}