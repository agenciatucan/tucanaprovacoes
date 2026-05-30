'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { Icon } from '@/components/ui/Icon';

function extractToken(value: string) {
  const cleanValue = value.trim();

  if (!cleanValue) return null;

  try {
    const url = new URL(cleanValue);
    const parts = url.pathname.split('/').filter(Boolean);
    const accessIndex = parts.indexOf('acesso');

    if (accessIndex >= 0 && parts[accessIndex + 1]) {
      return parts[accessIndex + 1];
    }
  } catch {
    // Não era uma URL completa; continua tratando como código/token.
  }

  const withoutSlashes = cleanValue.replace(/^\/+|\/+$/g, '');
  const parts = withoutSlashes.split('/').filter(Boolean);
  const accessIndex = parts.indexOf('acesso');

  if (accessIndex >= 0 && parts[accessIndex + 1]) {
    return parts[accessIndex + 1];
  }

  return withoutSlashes || null;
}

export default function TokenPasteForm() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const token = extractToken(value);

    if (!token) {
      setError('Link ou código inválido. Verifique e tente novamente.');
      return;
    }

    router.push(`/acesso/${token}` as Route);
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="field">
        <label className="field-label" htmlFor="token-input">Link ou código de acesso</label>
        <input
          id="token-input"
          type="text"
          className="input"
          placeholder="Ex.: TUCAN-4D023E ou link completo"
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(''); }}
          autoComplete="off"
          spellCheck={false}
          required
        />
        {error && <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--red, #c0392b)' }}>{error}</p>}
      </div>

      <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
        Acessar cronograma <Icon name="arrow" size={16} />
      </button>
    </form>
  );
}
