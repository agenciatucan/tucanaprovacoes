'use client';
import { useState } from 'react';
import { savePlanningItemNote } from '@/actions/planning';
import { Icon } from '@/components/ui/Icon';
import { toast } from 'sonner';

interface Props {
  token: string;
  itemId: string;
  initialNote: string;
}

export default function PlanningItemNote({ token, itemId, initialNote }: Props) {
  const [savedNote, setSavedNote] = useState(initialNote);
  const [editing, setEditing]     = useState(false);
  const [draft, setDraft]         = useState(initialNote);
  const [saving, setSaving]       = useState(false);

  async function handleSave() {
    setSaving(true);
    const result = await savePlanningItemNote(token, itemId, draft);
    setSaving(false);
    if (!result.success) { toast.error(result.error); return; }
    setSavedNote(draft.trim());
    setEditing(false);
    toast.success(draft.trim() ? 'Observação salva!' : 'Observação removida');
  }

  if (editing) {
    return (
      <div style={{ marginTop: 8, paddingLeft: 4 }}>
        <textarea
          autoFocus
          rows={2}
          className="input"
          placeholder="Ex.: Gostaria de mudar o foco deste tema para…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          style={{ width: '100%', marginBottom: 8, fontSize: 13 }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => { setDraft(savedNote); setEditing(false); }}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
          {savedNote && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ color: '#b91c1c' }}
              disabled={saving}
              onClick={() => { setDraft(''); handleSave(); }}
            >
              Remover
            </button>
          )}
        </div>
      </div>
    );
  }

  if (savedNote) {
    return (
      <div style={{
        marginTop: 6, padding: '8px 12px', borderRadius: 8,
        background: '#fff7ed', border: '1px solid #fed7aa',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8,
      }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', flex: 1 }}>
          <span style={{ flexShrink: 0, marginTop: 1, lineHeight: 1 }}><Icon name="chat" size={13} color="#c2410c" /></span>
          <span style={{ fontSize: 13, color: '#7c2d12', lineHeight: 1.5 }}>{savedNote}</span>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          style={{ fontSize: 11, padding: '2px 8px', flexShrink: 0 }}
          onClick={() => { setDraft(savedNote); setEditing(true); }}
        >
          Editar
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6,
        padding: '4px 10px', borderRadius: 8, fontFamily: 'inherit',
        background: 'transparent', border: '1px dashed var(--line)',
        cursor: 'pointer', fontSize: 12, color: 'var(--muted)',
      }}
      onClick={() => { setDraft(''); setEditing(true); }}
    >
      <Icon name="chat" size={12} /> Adicionar observação
    </button>
  );
}
