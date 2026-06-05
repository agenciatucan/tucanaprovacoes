'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { sendPlanningForApproval } from '@/actions/planning';
import { Icon } from '@/components/ui/Icon';
import { toast } from 'sonner';

interface Props {
  scheduleId: string;
  canSend: boolean;
}

export default function SendPlanningButton({ scheduleId, canSend }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSend() {
    if (!canSend) {
      toast.error('Adicione ao menos um tema antes de enviar');
      return;
    }
    setLoading(true);
    const result = await sendPlanningForApproval(scheduleId);
    if (!result.success) {
      toast.error(result.error);
      setLoading(false);
      return;
    }
    toast.success('Planejamento enviado para aprovação!');
    router.refresh();
  }

  return (
    <button
      type="button"
      className="btn btn-primary btn-sm"
      disabled={loading || !canSend}
      onClick={handleSend}
      title={!canSend ? 'Adicione ao menos um tema' : undefined}
    >
      {loading ? 'Enviando…' : <><Icon name="send" size={14} /> Enviar para aprovação</>}
    </button>
  );
}
