'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { archivePlanningSchedule } from '@/actions/planning';
import { Icon } from '@/components/ui/Icon';
import { toast } from 'sonner';

interface Props { scheduleId: string; }

export default function ArchivePlanningButton({ scheduleId }: Props) {
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();

  async function handleArchive() {
    setLoading(true);
    const result = await archivePlanningSchedule(scheduleId);
    if (!result.success) {
      toast.error(result.error);
      setLoading(false);
      return;
    }
    toast.success('Planejamento arquivado');
    router.push('/admin/planejamento' as Route);
  }

  if (confirming) {
    return (
      <div style={{ display: 'flex', gap: 6 }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)}>
          Cancelar
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          style={{ color: '#92400e' }}
          disabled={loading}
          onClick={handleArchive}
        >
          {loading ? 'Arquivando…' : 'Confirmar arquivamento'}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      style={{ color: '#92400e', justifyContent: 'flex-start' }}
      onClick={() => setConfirming(true)}
    >
      <Icon name="file" size={14} /> Arquivar planejamento
    </button>
  );
}
