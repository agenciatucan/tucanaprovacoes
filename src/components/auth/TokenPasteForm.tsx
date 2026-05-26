'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { Icon } from '@/components/ui/Icon';

const TOKEN_RE = /[a-f0-9]{64}/i;

export default function TokenPasteForm() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const match = value.trim().match(TOKEN_RE);
    if (!match) {
      setError('Link ou código inválido. Verifique e tente novamente.');
      return;
    }
    router.push(`/acesso/${match[0].toLowerCase()}` as Route);
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="field">
        <label className="field-label" htmlFor="token-input">Link ou código de acesso</label>
        <input
          id="token-input"
          type="text"
          className="input"
          placeholder="https://portaltucan.com.br/acesso/abc123..."
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
