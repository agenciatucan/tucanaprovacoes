'use client';
import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';

interface Props {
  text: string;
  label?: string;
}

export default function CopyButton({ text, label = 'Copiar' }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for non-secure context
        const area = document.createElement('textarea');
        area.value = text;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.focus();
        area.select();
        document.execCommand('copy');
        document.body.removeChild(area);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // silent fail
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="btn-text tiny"
      style={{ color: copied ? 'var(--green)' : 'var(--ink-2)', fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', background: 'none', border: 'none', padding: 0, display: 'inline-flex', alignItems: 'center', gap: 4, transition: 'color .15s' }}>
      <Icon name={copied ? 'check' : 'link'} size={12} />
      {copied ? 'Copiado!' : label}
    </button>
  );
}
