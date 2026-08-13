'use client';

import { useState, useTransition } from 'react';
import { remindClientForPlanningApproval } from '@/actions/planning';
import { Icon } from '@/components/ui/Icon';
import { toast } from 'sonner';

interface Props {
  scheduleId: string;
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

export default function RemindPlanningButton({ scheduleId, lastReminderAt }: Props) {
  const [isPending, startTransition] = useTransition();
  const [lastSentAt, setLastSentAt] = useState<string | null>(lastReminderAt);

  function handleRemind() {
    startTransition(async () => {
      const result = await remindClientForPlanningApproval(scheduleId);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setLastSentAt(new Date().toISOString());
      toast.success('Lembrete enviado ao cliente!');
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
        title="Enviar lembrete WhatsApp sobre aprovação pendente"
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
