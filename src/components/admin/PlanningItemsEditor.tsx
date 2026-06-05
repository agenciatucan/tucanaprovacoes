'use client';
import { useState, useTransition } from 'react';
import { createPlanningItem, updatePlanningItem, deletePlanningItem } from '@/actions/planning';
import { Icon } from '@/components/ui/Icon';
import { toast } from 'sonner';

type ContentType = 'arte' | 'reels' | 'carrossel' | 'story' | 'outro';

interface Item {
  id: string;
  week_label: string;
  title: string;
  content_type: ContentType;
  order_index: number;
  notes: string | null;
  client_note: string | null;
}

interface Props {
  scheduleId: string;
  clientId: string;
  items: Item[];
  isEditable: boolean;
}

const CONTENT_TYPE_LABEL: Record<ContentType, string> = {
  arte:      'Arte',
  reels:     'Reels',
  carrossel: 'Carrossel',
  story:     'Story',
  outro:     'Outro',
};

const CONTENT_TYPE_COLOR: Record<ContentType, string> = {
  arte:      '#1d4ed8',
  reels:     '#7c3aed',
  carrossel: '#0891b2',
  story:     '#d97706',
  outro:     '#6b7280',
};

const WEEKS = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4', 'Semana 5'];

const BLANK_FORM = { week_label: 'Semana 1', title: '', content_type: 'arte' as ContentType, notes: '' };

export default function PlanningItemsEditor({ scheduleId, clientId, items: initialItems, isEditable }: Props) {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(BLANK_FORM);
  const [editForm, setEditForm] = useState(BLANK_FORM);
  const [, startTransition] = useTransition();

  function setF(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setEF(key: string, value: string) {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Informe o título do tema'); return; }

    const result = await createPlanningItem({
      planning_schedule_id: scheduleId,
      client_id:            clientId,
      week_label:           form.week_label,
      title:                form.title.trim(),
      content_type:         form.content_type,
      order_index:          items.length,
      notes:                form.notes || null,
    });

    if (!result.success) { toast.error(result.error); return; }

    startTransition(() => {
      setItems((prev) => [...prev, {
        id:           result.data.id,
        week_label:   form.week_label,
        title:        form.title.trim(),
        content_type: form.content_type,
        order_index:  prev.length,
        notes:        form.notes || null,
        client_note:  null,
      }]);
    });
    setForm(BLANK_FORM);
    setAdding(false);
    toast.success('Tema adicionado');
  }

  function startEdit(item: Item) {
    setEditingId(item.id);
    setEditForm({
      week_label:   item.week_label,
      title:        item.title,
      content_type: item.content_type,
      notes:        item.notes ?? '',
    });
  }

  async function handleUpdate(id: string) {
    if (!editForm.title.trim()) { toast.error('Informe o título'); return; }

    const result = await updatePlanningItem(id, {
      week_label:   editForm.week_label,
      title:        editForm.title.trim(),
      content_type: editForm.content_type,
      notes:        editForm.notes || null,
    });

    if (!result.success) { toast.error(result.error); return; }

    setItems((prev) => prev.map((it) =>
      it.id === id
        ? { ...it, week_label: editForm.week_label, title: editForm.title.trim(), content_type: editForm.content_type, notes: editForm.notes || null }
        : it
    ));
    setEditingId(null);
    toast.success('Tema atualizado');
  }

  async function handleDelete(id: string) {
    const result = await deletePlanningItem(id, scheduleId);
    if (!result.success) { toast.error(result.error); return; }
    setItems((prev) => prev.filter((it) => it.id !== id));
    toast.success('Tema removido');
  }

  // Group by week
  const byWeek = items.reduce<Record<string, Item[]>>((acc, item) => {
    if (!acc[item.week_label]) acc[item.week_label] = [];
    acc[item.week_label]!.push(item);
    return acc;
  }, {});

  const weeks = Object.keys(byWeek).sort();

  return (
    <div>
      {/* Item list */}
      {items.length === 0 && !adding && (
        <div style={{ padding: '24px 0', textAlign: 'center' }}>
          <p className="muted tiny" style={{ marginBottom: 12 }}>
            {isEditable ? 'Nenhum tema ainda. Adicione os temas do mês.' : 'Nenhum tema cadastrado.'}
          </p>
        </div>
      )}

      {weeks.map((week) => (
        <div key={week} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted-2)', marginBottom: 8 }}>
            {week}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(byWeek[week] ?? []).map((item) => (
              <div key={item.id}>
                {editingId === item.id ? (
                  /* Edit inline */
                  <div style={{ padding: '14px', borderRadius: 10, border: '1px solid var(--orange)', background: 'var(--bg)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 120px', gap: 10, marginBottom: 10 }}>
                      <select className="input" value={editForm.week_label} onChange={(e) => setEF('week_label', e.target.value)} style={{ appearance: 'none' }}>
                        {WEEKS.map((w) => <option key={w} value={w}>{w}</option>)}
                      </select>
                      <input className="input" placeholder="Título do tema" value={editForm.title} onChange={(e) => setEF('title', e.target.value)} />
                      <select className="input" value={editForm.content_type} onChange={(e) => setEF('content_type', e.target.value as ContentType)} style={{ appearance: 'none' }}>
                        {Object.entries(CONTENT_TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>Cancelar</button>
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => handleUpdate(item.id)}>
                        <Icon name="check" size={14} /> Salvar
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Display row */
                  <div>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', borderRadius: item.client_note ? '10px 10px 0 0' : 10,
                      border: `1px solid ${item.client_note ? '#fed7aa' : 'var(--line)'}`,
                      borderBottom: item.client_note ? 'none' : undefined,
                      background: 'var(--bg)',
                    }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                        background: CONTENT_TYPE_COLOR[item.content_type] + '18',
                        color: CONTENT_TYPE_COLOR[item.content_type],
                        textTransform: 'uppercase', letterSpacing: '.04em', flexShrink: 0,
                      }}>
                        {CONTENT_TYPE_LABEL[item.content_type]}
                      </span>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{item.title}</span>
                      {isEditable && (
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '4px 8px' }}
                            onClick={() => startEdit(item)}
                            title="Editar"
                          >
                            <Icon name="edit" size={13} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '4px 8px', color: '#b91c1c' }}
                            onClick={() => handleDelete(item.id)}
                            title="Remover"
                          >
                            <Icon name="trash" size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                    {item.client_note && (
                      <div style={{
                        padding: '8px 14px', borderRadius: '0 0 10px 10px',
                        background: '#fff7ed', border: '1px solid #fed7aa',
                        display: 'flex', alignItems: 'flex-start', gap: 6,
                      }}>
                        <Icon name="chat" size={12} color="#c2410c" />
                        <span style={{ fontSize: 12, color: '#7c2d12', lineHeight: 1.5 }}>
                          <strong style={{ color: '#c2410c' }}>Obs. do cliente:</strong> {item.client_note}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Add form */}
      {isEditable && (
        <div style={{ marginTop: 12 }}>
          {adding ? (
            <form onSubmit={handleAdd} style={{ padding: '14px', borderRadius: 10, border: '1px dashed var(--line)', background: 'var(--bg)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 120px', gap: 10, marginBottom: 10 }}>
                <select className="input" value={form.week_label} onChange={(e) => setF('week_label', e.target.value)} style={{ appearance: 'none' }}>
                  {WEEKS.map((w) => <option key={w} value={w}>{w}</option>)}
                </select>
                <input
                  autoFocus
                  className="input"
                  placeholder="Título do tema"
                  value={form.title}
                  onChange={(e) => setF('title', e.target.value)}
                />
                <select className="input" value={form.content_type} onChange={(e) => setF('content_type', e.target.value as ContentType)} style={{ appearance: 'none' }}>
                  {Object.entries(CONTENT_TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setAdding(false); setForm(BLANK_FORM); }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  <Icon name="plus" size={14} /> Adicionar
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ width: '100%', justifyContent: 'center', borderStyle: 'dashed' }}
              onClick={() => setAdding(true)}
            >
              <Icon name="plus" size={14} /> Adicionar tema
            </button>
          )}
        </div>
      )}
    </div>
  );
}
