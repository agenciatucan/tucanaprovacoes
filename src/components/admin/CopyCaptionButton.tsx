'use client';
import { toast } from 'sonner';
import { Icon } from '@/components/ui/Icon';

interface Props {
  caption: string;
}

export default function CopyCaptionButton({ caption }: Props) {
  async function handleCopy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    try {
      await navigator.clipboard.writeText(caption);
      toast.success('Legenda copiada!');
    } catch {
      toast.error('Erro ao copiar legenda');
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      style={{
        flex: 1, height: 28, borderRadius: 8, border: '1px solid var(--line)',
        background: '#fff', color: 'var(--ink)', fontSize: 11, fontWeight: 700,
        cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.02em',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
      }}
    >
      <Icon name="copy" size={11} />
      Copiar legenda
    </button>
  );
}
