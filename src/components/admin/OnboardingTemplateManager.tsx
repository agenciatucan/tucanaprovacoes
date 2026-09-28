'use client';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Icon } from '@/components/ui/Icon';
import {
  createOnboardingSection, updateOnboardingSection, deleteOnboardingSection,
  createOnboardingItem, updateOnboardingItem, deleteOnboardingItem,
} from '@/actions/onboarding';
import type { OnboardingSection, OnboardingTemplateItem } from '@/types/database.types';

interface Props {
  initialSections: OnboardingSection[];
  initialItems: OnboardingTemplateItem[];
}

function slugify(text: string): string {
  return text
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
}

export default function OnboardingTemplateManager({ initialSections, initialItems }: Props) {
  const [sections, setSections] = useState(initialSections);
  const [items, setItems] = useState(initialItems);
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  const [addingSection, setAddingSection] = useState(false);
  const [newSection, setNewSection] = useState({ key: '', title: '', description: '' });
  const [newSectionKeyTouched, setNewSectionKeyTouched] = useState(false);

  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editSectionForm, setEditSectionForm] = useState({ key: '', title: '', description: '', order_index: 0 });

  const [addingItemSectionId, setAddingItemSectionId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ key: '', label: '' });
  const [newItemKeyTouched, setNewItemKeyTouched] = useState(false);

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemForm, setEditItemForm] = useState({ section_id: '', key: '', label: '', order_index: 0 });

  function itemsOf(sectionId: string) {
    return items.filter((i) => i.section_id === sectionId).sort((a, b) => a.order_index - b.order_index);
  }

  // ── Seções ───────────────────────────────────────────────────
  function handleAddSection(e: React.FormEvent) {
    e.preventDefault();
    if (!newSection.key.trim() || !newSection.title.trim()) return;
    setBusy(true);
    startTransition(async () => {
      const result = await createOnboardingSection({
        key: newSection.key.trim(),
        title: newSection.title.trim(),
        description: newSection.description.trim() || null,
        order_index: 0,
      });
      setBusy(false);
      if (!result.success) { toast.error(result.error); return; }
      setSections((prev) => [...prev, {
        id: result.data.id,
        key: newSection.key.trim(),
        title: newSection.title.trim(),
        description: newSection.description.trim() || null,
        order_index: prev.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }]);
      setNewSection({ key: '', title: '', description: '' });
      setNewSectionKeyTouched(false);
      setAddingSection(false);
      toast.success('Seção criada!');
    });
  }

  function startEditSection(section: OnboardingSection) {
    setEditingSectionId(section.id);
    setEditSectionForm({
      key: section.key, title: section.title,
      description: section.description ?? '', order_index: section.order_index,
    });
  }

  function handleSaveSection(id: string) {
    if (!editSectionForm.key.trim() || !editSectionForm.title.trim()) return;
    setBusy(true);
    startTransition(async () => {
      const payload = {
        key: editSectionForm.key.trim(),
        title: editSectionForm.title.trim(),
        description: editSectionForm.description.trim() || null,
        order_index: editSectionForm.order_index,
      };
      const result = await updateOnboardingSection(id, payload);
      setBusy(false);
      if (!result.success) { toast.error(result.error); return; }
      setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...payload } : s))
        .sort((a, b) => a.order_index - b.order_index));
      setEditingSectionId(null);
      toast.success('Seção atualizada!');
    });
  }

  function handleDeleteSection(section: OnboardingSection) {
    const count = itemsOf(section.id).length;
    const warning = count > 0
      ? `Excluir "${section.title}" também remove ${count} ${count === 1 ? 'item' : 'itens'} — e o progresso já marcado por qualquer cliente nesses itens. Continuar?`
      : `Excluir a seção "${section.title}"?`;
    if (!window.confirm(warning)) return;

    setBusy(true);
    startTransition(async () => {
      const result = await deleteOnboardingSection(section.id);
      setBusy(false);
      if (!result.success) { toast.error(result.error); return; }
      setSections((prev) => prev.filter((s) => s.id !== section.id));
      setItems((prev) => prev.filter((i) => i.section_id !== section.id));
      toast.success('Seção excluída');
    });
  }

  // ── Itens ────────────────────────────────────────────────────
  function handleAddItem(sectionId: string) {
    if (!newItem.key.trim() || !newItem.label.trim()) return;
    setBusy(true);
    startTransition(async () => {
      const result = await createOnboardingItem({
        section_id: sectionId,
        key: newItem.key.trim(),
        label: newItem.label.trim(),
        order_index: 0,
      });
      setBusy(false);
      if (!result.success) { toast.error(result.error); return; }
      setItems((prev) => [...prev, {
        id: result.data.id,
        section_id: sectionId,
        key: newItem.key.trim(),
        label: newItem.label.trim(),
        order_index: itemsOf(sectionId).length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }]);
      setNewItem({ key: '', label: '' });
      setNewItemKeyTouched(false);
      setAddingItemSectionId(null);
      toast.success('Item adicionado a todos os clientes como pendente.');
    });
  }

  function startEditItem(item: OnboardingTemplateItem) {
    setEditingItemId(item.id);
    setEditItemForm({ section_id: item.section_id, key: item.key, label: item.label, order_index: item.order_index });
  }

  function handleSaveItem(id: string) {
    if (!editItemForm.key.trim() || !editItemForm.label.trim()) return;
    setBusy(true);
    startTransition(async () => {
      const payload = {
        section_id: editItemForm.section_id,
        key: editItemForm.key.trim(),
        label: editItemForm.label.trim(),
        order_index: editItemForm.order_index,
      };
      const result = await updateOnboardingItem(id, payload);
      setBusy(false);
      if (!result.success) { toast.error(result.error); return; }
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...payload } : i)));
      setEditingItemId(null);
      toast.success('Item atualizado!');
    });
  }

  function handleDeleteItem(item: OnboardingTemplateItem) {
    if (!window.confirm(`Excluir o item "${item.label}"? Isso também remove o progresso já marcado por qualquer cliente nele.`)) return;
    setBusy(true);
    startTransition(async () => {
      const result = await deleteOnboardingItem(item.id);
      setBusy(false);
      if (!result.success) { toast.error(result.error); return; }
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      toast.success('Item excluído');
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {sections.sort((a, b) => a.order_index - b.order_index).map((section) => {
        const sectionItems = itemsOf(section.id);
        const isEditingSection = editingSectionId === section.id;

        return (
          <div key={section.id} className="card" style={{ padding: 18 }}>
            {isEditingSection ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <input className="input" placeholder="Chave (slug)" value={editSectionForm.key}
                    onChange={(e) => setEditSectionForm((f) => ({ ...f, key: slugify(e.target.value) }))} />
                  <input className="input" placeholder="Título" value={editSectionForm.title}
                    onChange={(e) => setEditSectionForm((f) => ({ ...f, title: e.target.value }))} />
                </div>
                <textarea className="input" rows={2} placeholder="Descrição (aparece como legenda da seção)"
                  value={editSectionForm.description}
                  onChange={(e) => setEditSectionForm((f) => ({ ...f, description: e.target.value }))} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" disabled={busy} className="btn btn-primary btn-sm" onClick={() => handleSaveSection(section.id)}>Salvar</button>
                  <button type="button" disabled={busy} className="btn btn-ghost btn-sm" onClick={() => setEditingSectionId(null)}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{section.title}</div>
                  {section.description && <p className="muted tiny" style={{ marginTop: 4, lineHeight: 1.5 }}>{section.description}</p>}
                  <div className="muted tiny" style={{ marginTop: 4 }}>{sectionItems.length} {sectionItems.length === 1 ? 'item' : 'itens'} · chave: {section.key}</div>
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button type="button" disabled={busy} onClick={() => startEditSection(section)} title="Editar seção"
                    style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="edit" size={14} />
                  </button>
                  <button type="button" disabled={busy} onClick={() => handleDeleteSection(section)} title="Excluir seção"
                    style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'transparent', color: '#b91c1c', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Itens */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 4, borderLeft: '2px solid var(--line-soft)' }}>
              {sectionItems.map((item) => {
                const isEditingItem = editingItemId === item.id;
                return (
                  <div key={item.id} style={{ padding: '8px 0 8px 12px' }}>
                    {isEditingItem ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8 }}>
                          <input className="input" style={{ height: 34, fontSize: 13 }} placeholder="Chave (slug)" value={editItemForm.key}
                            onChange={(e) => setEditItemForm((f) => ({ ...f, key: slugify(e.target.value) }))} />
                          <select className="input" style={{ height: 34, fontSize: 13, appearance: 'none', cursor: 'pointer' }} value={editItemForm.section_id}
                            onChange={(e) => setEditItemForm((f) => ({ ...f, section_id: e.target.value }))}>
                            {sections.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                          </select>
                        </div>
                        <textarea className="input" rows={2} style={{ fontSize: 13 }} placeholder="Texto do item" value={editItemForm.label}
                          onChange={(e) => setEditItemForm((f) => ({ ...f, label: e.target.value }))} />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button type="button" disabled={busy} className="btn btn-primary btn-sm" onClick={() => handleSaveItem(item.id)}>Salvar</button>
                          <button type="button" disabled={busy} className="btn btn-ghost btn-sm" onClick={() => setEditingItemId(null)}>Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <span style={{ fontSize: 13, lineHeight: 1.5, flex: 1 }}>{item.label}</span>
                        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                          <button type="button" disabled={busy} onClick={() => startEditItem(item)} title="Editar item"
                            style={{ width: 24, height: 24, borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon name="edit" size={12} />
                          </button>
                          <button type="button" disabled={busy} onClick={() => handleDeleteItem(item)} title="Excluir item"
                            style={{ width: 24, height: 24, borderRadius: 6, border: 'none', background: 'transparent', color: '#b91c1c', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon name="trash" size={12} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Adicionar item */}
              {addingItemSectionId === section.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0 4px 12px' }}>
                  <textarea
                    autoFocus className="input" rows={2} style={{ fontSize: 13 }}
                    placeholder="Texto do item (ex.: Contrato assinado)"
                    value={newItem.label}
                    onChange={(e) => {
                      const label = e.target.value;
                      setNewItem((f) => ({ ...f, label, key: newItemKeyTouched ? f.key : slugify(label) }));
                    }}
                  />
                  <input
                    className="input" style={{ height: 34, fontSize: 13 }}
                    placeholder="Chave (slug, gerada automaticamente)"
                    value={newItem.key}
                    onChange={(e) => { setNewItemKeyTouched(true); setNewItem((f) => ({ ...f, key: slugify(e.target.value) })); }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" disabled={busy || !newItem.key || !newItem.label} className="btn btn-primary btn-sm" onClick={() => handleAddItem(section.id)}>Adicionar</button>
                    <button type="button" disabled={busy} className="btn btn-ghost btn-sm" onClick={() => { setAddingItemSectionId(null); setNewItem({ key: '', label: '' }); setNewItemKeyTouched(false); }}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <button type="button" disabled={busy} onClick={() => setAddingItemSectionId(section.id)}
                  className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start', fontSize: 12, marginTop: 2 }}>
                  <Icon name="plus" size={12} /> Adicionar item
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Adicionar seção */}
      <div className="card" style={{ padding: 18 }}>
        {addingSection ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              autoFocus className="input" placeholder="Título da seção (ex.: 8. Renovação)"
              value={newSection.title}
              onChange={(e) => {
                const title = e.target.value;
                setNewSection((f) => ({ ...f, title, key: newSectionKeyTouched ? f.key : slugify(title) }));
              }}
            />
            <input
              className="input" placeholder="Chave (slug, gerada automaticamente)"
              value={newSection.key}
              onChange={(e) => { setNewSectionKeyTouched(true); setNewSection((f) => ({ ...f, key: slugify(e.target.value) })); }}
            />
            <textarea className="input" rows={2} placeholder="Descrição (opcional)" value={newSection.description}
              onChange={(e) => setNewSection((f) => ({ ...f, description: e.target.value }))} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" disabled={busy || !newSection.key || !newSection.title} className="btn btn-primary btn-sm" onClick={handleAddSection}>Criar seção</button>
              <button type="button" disabled={busy} className="btn btn-ghost btn-sm" onClick={() => { setAddingSection(false); setNewSection({ key: '', title: '', description: '' }); setNewSectionKeyTouched(false); }}>Cancelar</button>
            </div>
          </div>
        ) : (
          <button type="button" disabled={busy} onClick={() => setAddingSection(true)} className="btn btn-ghost btn-sm">
            <Icon name="plus" size={14} /> Adicionar seção
          </button>
        )}
      </div>
    </div>
  );
}
