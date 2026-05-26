'use client';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';

interface Option {
  value: string;
  label: string;
}

interface Props {
  /** Rota base, ex.: "/admin/kanban" */
  basePath: string;
  /** Nome do query param que este select controla, ex.: "cliente" */
  paramName: string;
  /** Valor atual (vem do searchParams do Server Component pai) */
  value: string;
  /** Outros query params existentes que devem ser preservados na navegação */
  preserveParams?: Record<string, string | undefined>;
  options: Option[];
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function FilterSelect({
  basePath,
  paramName,
  value,
  preserveParams = {},
  options,
  placeholder = 'Todos',
  className = 'input',
  style,
}: Props) {
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newValue = e.target.value;

    const params = new URLSearchParams();

    // Preserva outros params (ignora os undefined/vazios)
    Object.entries(preserveParams).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });

    // Adiciona/remove o param deste select
    if (newValue) params.set(paramName, newValue);

    const qs = params.toString();
    router.push(`${basePath}${qs ? `?${qs}` : ''}` as Route);
  }

  return (
    <select
      className={className}
      style={{ height: 36, fontSize: 13, appearance: 'none', ...style }}
      value={value}
      onChange={handleChange}>
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
