'use client';

import { useState, useTransition } from 'react';
import { remindClientForApproval } from '@/actions/campaigns';
import { Icon } from '@/components/ui/Icon';
import { toast } from 'sonner';

interface Props {
  campaignId: string;
  pendingCount: number;
  lastReminderAt: string | null;
}

function formatRelative(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes} min atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  return `${days}d atrás`;
}

export default function RemindClientButton({
  campaignId,
  pendingCount,
  lastReminderAt,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [lastSentAt, setLastSentAt] = useState<string | null>(lastReminderAt);

  if (pendingCount === 0) return null;

  function handleRemind() {
    startTransition(async () => {
      const result = await remindClientForApproval(campaignId);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setLastSentAt(new Date().toISOString());
      toast.success(
        `Lembrete enviado! Cliente tem ${result.data.pendingCount} ${result.data.pendingCount === 1 ? 'post pendente' : 'posts pendentes'}.`
      );
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={handleRemind}
        disabled={isPending}
        style={{ color: '#d97706' }}
        title={`Enviar lembrete WhatsApp — ${pendingCount} ${pendingCount === 1 ? 'post pendente' : 'posts pendentes'}`}
      >
        <Icon name="bell" size={14} />
        {isPending ? 'Enviando…' : 'Lembrar cliente'}
      </button>

      {lastSentAt && (
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
          Último lembrete: {formatRelative(lastSentAt)}
        </span>
      )}
    </div>
  );
}
