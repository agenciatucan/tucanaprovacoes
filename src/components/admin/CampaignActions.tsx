'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { sendCampaignForApproval, regenerateApprovalToken } from '@/actions/campaigns';
import { Icon } from '@/components/ui/Icon';
import { toast } from 'sonner';

interface Props {
  campaignId: string;
  status: string;
  approvalLink: string;
  isLocked: boolean;
  editHref: string;
}

export default function CampaignActions({ campaignId, status, approvalLink, isLocked, editHref }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [link, setLink] = useState(approvalLink);

  async function handleSendForApproval() {
    setLoading('send');
    const result = await sendCampaignForApproval(campaignId);
    if (!result.success) {
      toast.error(result.error);
    } else {
      toast.success('Cronograma enviado para aprovação!');
    }
    setLoading(null);
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRegenerateToken() {
    if (!confirm('Isso vai invalidar o link atual. Continuar?')) return;
    setLoading('regen');
    const result = await regenerateApprovalToken(campaignId);
    if (!result.success) {
      toast.error(result.error);
    } else {
      const newLink = link.replace(/\/acesso\/[a-f0-9]+$/, `/acesso/${(result as { success: true; data: { token: string } }).data.token}`);
      setLink(newLink);
      toast.success('Link regenerado!');
    }
    setLoading(null);
  }

  const canSend = ['rascunho', 'em_revisao'].includes(status);
  const canEdit = !isLocked && status !== 'aprovado';

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, flexShrink: 0 }}>
      {canEdit && (
        <Link href={editHref as Route} className="btn btn-ghost btn-sm">
          <Icon name="edit" size={14} /> Editar
        </Link>
      )}

      {/* Copy link */}
      <button className="btn btn-ghost btn-sm" onClick={handleCopyLink} style={{ maxWidth: 220, overflow: 'hidden' }}>
        <Icon name="link" size={14} />
        {copied ? 'Copiado!' : 'Copiar link'}
      </button>

      {/* Regenerate token */}
      <button
        className="btn btn-ghost btn-sm"
        onClick={handleRegenerateToken}
        disabled={loading === 'regen'}
        title="Gerar novo link (invalida o antigo)">
        <Icon name="upload" size={14} />
        {loading === 'regen' ? 'Gerando…' : 'Novo link'}
      </button>

      {/* Send for approval */}
      {canSend && (
        <button
          className="btn btn-primary btn-sm"
          onClick={handleSendForApproval}
          disabled={loading === 'send'}>
          <Icon name="arrow" size={14} />
          {loading === 'send' ? 'Enviando…' : 'Enviar para aprovação'}
        </button>
      )}
    </div>
  );
}
