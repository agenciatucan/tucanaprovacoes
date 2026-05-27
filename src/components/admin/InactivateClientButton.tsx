'use client';
import { useTransition, useState } from 'react';
import { inactivateClient, reactivateClient } from '@/actions/clients';

interface Props {
  clientId: string;
  currentStatus: 'ativo' | 'inativo';
  clientName: string;
}

export default function InactivateClientButton({ clientId, currentStatus, clientName }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isInativo = currentStatus === 'inativo';

  function handleClick() {
    const message = isInativo
      ? `Reativar "${clientName}"?\n\nO cliente voltará a ficar ativo. Os cronogramas arquivados precisam ser reabertos manualmente.`
      : `Inativar "${clientName}"?\n\nTodos os cronogramas em andamento serão arquivados automaticamente. Esta ação pode ser desfeita reativando o cliente.`;

    if (!window.confirm(message)) return;

    setError(null);
    startTransition(async () => {
      const result = isInativo
        ? await reactivateClient(clientId)
        : await inactivateClient(clientId);

      if (!result.success) {
        setError(result.error);
      }
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
          border: isInativo ? '1px solid var(--green-100)' : '1px solid #fecaca',
          background: isInativo ? 'var(--green-50)' : '#fef2f2',
          color: isInativo ? 'var(--green)' : '#b91c1c',
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
        {isPending
          ? (isInativo ? 'Reativando…' : 'Inativando…')
          : (isInativo ? '↩ Reativar cliente' : '× Inativar cliente')}
      </button>

      {error && (
        <span style={{ fontSize: 12, color: '#b91c1c', fontWeight: 500 }}>
          {error}
        </span>
      )}
    </div>
  );
}
