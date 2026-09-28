'use client';
import { useMemo, useState, useTransition } from 'react';
import { toggleOnboardingItem } from '@/actions/onboarding';
import { Icon } from '@/components/ui/Icon';
import { toast } from 'sonner';
import type { OnboardingSection, OnboardingTemplateItem } from '@/types/database.types';

interface Props {
  clientId: string;
  sections: OnboardingSection[];
  items: OnboardingTemplateItem[];
  doneItemIds: string[];
}

export default function OnboardingChecklist({ clientId, sections, items, doneItemIds }: Props) {
  const [done, setDone] = useState<Set<string>>(() => new Set(doneItemIds));
  const [openSection, setOpenSection] = useState<string | null>(() => {
    const firstIncomplete = sections.find((s) =>
      items.some((i) => i.section_id === s.id && !doneItemIds.includes(i.id))
    );
    return firstIncomplete?.id ?? sections[0]?.id ?? null;
  });
  const [, startTransition] = useTransition();

  const totalItems = items.length;
  const totalDone = done.size;
  const overallPct = totalItems ? Math.round((totalDone / totalItems) * 100) : 0;
  const isComplete = totalItems > 0 && totalDone >= totalItems;

  const sectionStats = useMemo(
    () => sections.map((section) => {
      const sectionItems = items.filter((i) => i.section_id === section.id);
      return {
        section,
        sectionItems,
        doneCount: sectionItems.filter((i) => done.has(i.id)).length,
      };
    }),
    [sections, items, done]
  );

  function handleToggle(itemId: string, checked: boolean) {
    setDone((prev) => {
      const next = new Set(prev);
      if (checked) next.add(itemId); else next.delete(itemId);
      return next;
    });

    startTransition(async () => {
      const result = await toggleOnboardingItem({ client_id: clientId, item_id: itemId, done: checked });
      if (!result.success) {
        toast.error(result.error);
        setDone((prev) => {
          const next = new Set(prev);
          if (checked) next.delete(itemId); else next.add(itemId);
          return next;
        });
      }
    });
  }

  if (totalItems === 0) {
    return <p className="muted tiny">Nenhum item de checklist cadastrado ainda.</p>;
  }

  return (
    <div>
      {/* Progresso geral */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <div style={{ flex: 1, height: 8, borderRadius: 999, background: 'var(--line-soft)', overflow: 'hidden' }}>
          <div
            style={{
              width: `${overallPct}%`, height: '100%',
              background: isComplete ? 'var(--green)' : 'var(--orange)',
              transition: 'width .2s',
            }}
          />
        </div>
        <span className="muted tiny" style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
          {totalDone}/{totalItems} concluídos
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sectionStats.map(({ section, sectionItems, doneCount }) => {
          const sectionComplete = sectionItems.length > 0 && doneCount === sectionItems.length;
          const isOpen = openSection === section.id;

          return (
            <div key={section.id} style={{ border: '1px solid var(--line-soft)', borderRadius: 12, overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => setOpenSection(isOpen ? null : section.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: 12, padding: '12px 14px', background: 'var(--bg)', border: 'none', cursor: 'pointer', textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <div
                    style={{
                      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: sectionComplete ? 'var(--green)' : 'var(--line)', color: '#fff',
                    }}
                  >
                    {sectionComplete
                      ? <Icon name="check" size={12} />
                      : <span style={{ fontSize: 11, fontWeight: 700 }}>{doneCount}</span>}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {section.title}
                    </div>
                    <div className="muted tiny" style={{ marginTop: 1 }}>{doneCount}/{sectionItems.length}</div>
                  </div>
                </div>
                <Icon name={isOpen ? 'chevron-down' : 'chevron'} size={14} color="var(--muted-2)" />
              </button>

              {isOpen && (
                <div style={{ padding: '4px 14px 14px' }}>
                  {section.description && (
                    <p className="muted tiny" style={{ margin: '0 0 10px', lineHeight: 1.5 }}>{section.description}</p>
                  )}
                  {sectionItems.length === 0 ? (
                    <p className="muted tiny">Nenhum item nesta seção.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {sectionItems.map((item) => {
                        const checked = done.has(item.id);
                        return (
                          <label key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => handleToggle(item.id, e.target.checked)}
                              style={{ marginTop: 3, width: 16, height: 16, flexShrink: 0, accentColor: 'var(--green)', cursor: 'pointer' }}
                            />
                            <span
                              style={{
                                fontSize: 13, lineHeight: 1.5,
                                textDecoration: checked ? 'line-through' : 'none',
                                color: checked ? 'var(--muted)' : 'inherit',
                              }}
                            >
                              {item.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
