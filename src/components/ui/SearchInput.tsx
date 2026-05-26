'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Route } from 'next';
import { Icon } from '@/components/ui/Icon';

interface Props {
  /** Rota base, ex.: "/admin/clientes" */
  basePath: string;
  /** Nome do query param de busca (padrão: "search") */
  paramName?: string;
  /** Valor atual vindo do searchParams do Server Component */
  defaultValue?: string;
  /** Outros params que devem ser mantidos na navegação */
  preserveParams?: Record<string, string | undefined>;
  placeholder?: string;
  style?: React.CSSProperties;
}

export default function SearchInput({
  basePath,
  paramName = 'search',
  defaultValue = '',
  preserveParams = {},
  placeholder = 'Buscar…',
  style,
}: Props) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  function navigate(val: string) {
    const params = new URLSearchParams();
    // Preserva outros params (status, cliente, etc.)
    Object.entries(preserveParams).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    if (val.trim()) params.set(paramName, val.trim());
    const qs = params.toString();
    router.push(`${basePath}${qs ? `?${qs}` : ''}` as Route);
  }

  return (
    <div style={{ position: 'relative', flex: 1, width: '100%', maxWidth: 380, minWidth: 220 }}>
      <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
        <Icon name="search" size={16} color="var(--muted-2)" />
      </div>
      <input
        type="search"
        className="input"
        placeholder={placeholder}
        value={value}
        style={{ paddingLeft: 38, height: 38, borderColor: 'transparent', background: 'var(--bg)', ...style }}
        onChange={(e) => {
          setValue(e.target.value);
          // Limpa a busca imediatamente quando o campo é apagado
          if (e.target.value === '') navigate('');
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') navigate(value);
        }}
      />
    </div>
  );
}
