'use client';
import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteClient } from '@/actions/clients';

interface Props {
  clientId: string;
  clientName: string;
}

export default function DeleteClientButton({ clientId, clientName }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    const message = `Excluir "${clientName}" definitivamente?\n\nTodos os cronogramas, conteúdos, aprovações e acessos deste cliente serão excluídos permanentemente. Esta ação não pode ser desfeita.`;

    if (!window.confirm(message)) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteClient(clientId);

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.push('/admin/clientes');
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        style={{
          height: 36,
          padding: '0 14px',
          borderRadius: 10,
          border: '1px solid #fecaca',
          background: '#fef2f2',
          color: '#b91c1c',
          fontSize: 13,
          fontWeight: 600,
          cursor: isPending ? 'not-allowed' : 'pointer',
          opacity: isPending ? 0.6 : 1,
          transition: 'opacity .15s',
          fontFamily: 'inherit',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          whiteSpace: 'nowrap',
        }}>
        {isPending ? 'Excluindo…' : '× Excluir cliente'}
      </button>

      {error && (
        <span style={{ fontSize: 12, color: '#b91c1c', fontWeight: 500 }}>
          {error}
        </span>
      )}
    </div>
  );
}
