'use client';
import { useRouter, useSearchParams } from 'next/navigation';

interface Props {
  clients: { id: string; name: string | null; company_name: string | null }[];
  currentYear?: string;
  currentMonth?: string;
  currentClient?: string;
}

export default function CalendarClientFilter({ clients, currentYear, currentMonth, currentClient }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams();
    if (currentYear) params.set('year', currentYear);
    if (currentMonth) params.set('month', currentMonth);
    if (e.target.value) params.set('cliente', e.target.value);
    router.push(`/admin/calendario?${params.toString()}`);
  }

  return (
    <select
      value={currentClient ?? ''}
      onChange={handleChange}
      className="calendar-filter-select"
    >
      <option value="">Todos os clientes</option>
      {clients.map((c) => (
        <option key={c.id} value={c.id}>
          {c.company_name ?? c.name}
        </option>
      ))}
    </select>
  );
}
