'use client';

import { useTransition } from 'react';
import { updateContentItemStatus } from '@/actions/content-items';

interface Props {
  id: string;
  generalStatus: string;
}

// Permite alternar manualmente entre "Pendente" e "Em produção" para
// sinalizar que a equipe já está trabalhando no post. Só aparece para
// posts que ainda não entraram no fluxo de aprovação do cliente.
export default function PostProductionToggle({ id, generalStatus }: Props) {
  const [isPending, startTransition] = useTransition();

  if (generalStatus !== 'pendente' && generalStatus !== 'em_producao') {
    return null;
  }

  const isInProduction = generalStatus === 'em_producao';

  function handleClick() {
    const nextStatus = isInProduction ? 'pendente' : 'em_producao';
    startTransition(async () => {
      await updateContentItemStatus(id, 'general_status', nextStatus);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="btn btn-ghost btn-sm"
      style={{ fontSize: 11 }}
    >
      {isPending
        ? 'Salvando...'
        : isInProduction
          ? 'Tirar de produção'
          : 'Marcar em produção'}
    </button>
  );
}
