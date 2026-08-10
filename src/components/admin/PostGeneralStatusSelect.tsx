'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateContentItemStatus } from '@/actions/content-items';
import { toast } from 'sonner';

interface Props {
  id: string;
  generalStatus: string;
}

// Mesmos valores aceitos pela coluna content_items.general_status.
const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'pendente', label: 'Aguardando aprovação' },
  { value: 'em_revisao', label: 'Em revisão (ajuste solicitado)' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'em_producao', label: 'Em produção' },
  { value: 'programado', label: 'Programado' },
  { value: 'finalizado', label: 'Concluído' },
];

// Permite ao admin/equipe corrigir manualmente o status geral do post,
// para os casos em que o fluxo automático de aprovação não cobre
// (ex.: cronogramas vindos do Planejamento, correções manuais).
export default function PostGeneralStatusSelect({ id, generalStatus }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(generalStatus);
  const [isPending, startTransition] = useTransition();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value;
    const previous = value;
    setValue(next);

    startTransition(async () => {
      const result = await updateContentItemStatus(id, 'general_status', next);

      if (!result.success) {
        setValue(previous);
        toast.error(result.error);
        return;
      }

      toast.success('Status geral atualizado.');
      router.refresh();
    });
  }

  return (
    <select
      value={value}
      onChange={handleChange}
      disabled={isPending}
      className="input"
      style={{
        minHeight: 32,
        height: 32,
        padding: '0 26px 0 10px',
        fontSize: 11,
        fontWeight: 800,
        borderRadius: 999,
        appearance: 'none',
        width: 'auto',
        maxWidth: 200,
        cursor: isPending ? 'not-allowed' : 'pointer',
        opacity: isPending ? 0.6 : 1,
        background:
          "#fff url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%236b7280' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\") no-repeat right 10px center",
      }}
    >
      {STATUS_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
