'use client';

import { useTransition } from 'react';
import { updateActivityStatus, archiveActivity, restoreActivity } from '@/actions/activities';
import { ACTIVITY_STATUSES, ACTIVITY_STATUS_LABEL } from '@/lib/validations/schemas';

interface Props {
  id: string;
  currentStatus: string;
  isArchived: boolean;
}

export default function ActivityCardActions({ id, currentStatus, isArchived }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleStatus(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value;
    startTransition(async () => { await updateActivityStatus(id, newStatus); });
  }

  function handleArchive() {
    if (!window.confirm('Arquivar esta atividade?')) return;
    startTransition(async () => { await archiveActivity(id); });
  }

  function handleRestore() {
    startTransition(async () => { await restoreActivity(id); });
  }

  if (isArchived) {
    return (
      <button type="button" className="btn btn-ghost btn-sm" onClick={handleRestore}
        disabled={isPending} style={{ fontSize: 12 }}>
        {isPending ? 'Restaurando…' : 'Restaurar'}
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <select
        value={currentStatus}
        onChange={handleStatus}
        disabled={isPending}
        style={{
          height: 30, borderRadius: 8, border: '1px solid var(--line)',
          background: '#fff', padding: '0 8px', fontSize: 12,
          fontFamily: 'inherit', color: 'var(--ink)', outline: 'none', cursor: 'pointer',
        }}
      >
        {ACTIVITY_STATUSES.map((s) => (
          <option key={s} value={s}>{ACTIVITY_STATUS_LABEL[s]}</option>
        ))}
      </select>

      <button
        type="button" onClick={handleArchive} disabled={isPending} title="Arquivar"
        style={{
          height: 30, width: 30, borderRadius: 8, border: '1px solid var(--line)',
          background: '#fff', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          color: 'var(--muted)', fontSize: 16, opacity: isPending ? 0.5 : 1,
        }}
      >
        ×
      </button>
    </div>
  );
}
