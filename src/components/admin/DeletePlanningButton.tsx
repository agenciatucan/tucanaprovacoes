'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { deletePlanningSchedule } from '@/actions/planning';
import { Icon } from '@/components/ui/Icon';
import { toast } from 'sonner';

interface Props { scheduleId: string; }

export default function DeletePlanningButton({ scheduleId }: Props) {
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    const result = await deletePlanningSchedule(scheduleId);
    if (!result.success) {
      toast.error(result.error);
      setLoading(false);
      return;
    }
    toast.success('Planejamento excluído');
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
          className="btn btn-sm"
          style={{ background: '#b91c1c', color: '#fff' }}
          disabled={loading}
          onClick={handleDelete}
        >
          {loading ? 'Excluindo…' : 'Confirmar exclusão'}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      style={{ color: '#b91c1c', justifyContent: 'flex-start' }}
      onClick={() => setConfirming(true)}
    >
      <Icon name="trash-2" size={14} /> Excluir planejamento
    </button>
  );
}
