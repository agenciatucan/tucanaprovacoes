'use client';
import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';

interface Props { url: string; }

export default function CopyLinkButton({ url }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      style={{ marginTop: 10, width: '100%' }}
      onClick={handleCopy}
    >
      <Icon name={copied ? 'check' : 'copy'} size={14} />
      {copied ? 'Copiado!' : 'Copiar link'}
    </button>
  );
}
