'use client';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { updatePostQuickField } from '@/actions/content-items';

interface Props {
  postId: string;
  field: 'theme' | 'caption';
  label: string;
  initialValue: string | null;
}

export default function QuickAdjustField({ postId, field, label, initialValue }: Props) {
  const [value, setValue] = useState(initialValue ?? '');
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(true);

  function handleSave() {
    startTransition(async () => {
      const result = await updatePostQuickField(postId, field, value);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setSaved(true);
      toast.success(`${label} atualizado(a)!`);
    });
  }

  return (
    <div style={{ padding: '12px 16px', borderBottom: '1px solid #fde68a' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Corrigir {label.toLowerCase()}
      </div>
      <textarea
        value={value}
        onChange={(e) => { setValue(e.target.value); setSaved(false); }}
        rows={field === 'caption' ? 4 : 2}
        placeholder={`${label} do post`}
        className="input"
        style={{ resize: 'vertical', width: '100%', background: '#fff' }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || saved}
          className="btn btn-sm"
          style={{
            background: saved ? '#fff' : '#f59e0b',
            color: saved ? '#92400e' : '#fff',
            border: '1px solid #f59e0b',
            opacity: isPending ? 0.7 : 1,
          }}
        >
          {isPending ? 'Salvando…' : saved ? 'Salvo' : `Salvar ${label.toLowerCase()}`}
        </button>
      </div>
    </div>
  );
}
