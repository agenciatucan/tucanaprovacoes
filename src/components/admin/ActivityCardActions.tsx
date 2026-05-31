'use client';

import { useTransition, useRef, useEffect, useState } from 'react';
import { updateActivityStatus, archiveActivity, restoreActivity } from '@/actions/activities';
import { ACTIVITY_STATUSES, ACTIVITY_STATUS_LABEL } from '@/lib/validations/schemas';

interface Props {
  id: string;
  currentStatus: string;
  isArchived: boolean;
}

export default function ActivityCardActions({ id, currentStatus, isArchived }: Props) {
  const [isPending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  function handleStatus(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value;
    startTransition(async () => { await updateActivityStatus(id, newStatus); });
  }

  function handleArchive() {
    setMenuOpen(false);
    if (!window.confirm('Arquivar esta atividade?')) return;
    startTransition(async () => { await archiveActivity(id); });
  }

  function handleRestore() {
    startTransition(async () => { await restoreActivity(id); });
  }

  if (isArchived) {
    return (
      <button type="button" className="btn btn-ghost btn-sm" onClick={handleRestore}
        disabled={isPending} style={{ fontSize: 12 }}>
        {isPending ? 'Restaurando…' : 'Restaurar'}
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {/* Status select */}
      <select
        value={currentStatus}
        onChange={handleStatus}
        disabled={isPending}
        style={{
          height: 32, borderRadius: 8, border: '1px solid var(--line)',
          background: '#fff', padding: '0 8px', fontSize: 12,
          fontFamily: 'inherit', color: 'var(--ink)', outline: 'none', cursor: 'pointer',
          maxWidth: 160,
        }}
      >
        {ACTIVITY_STATUSES.map((s) => (
          <option key={s} value={s}>{ACTIVITY_STATUS_LABEL[s]}</option>
        ))}
      </select>

      {/* ⋯ more options */}
      <div ref={menuRef} style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          disabled={isPending}
          title="Mais opções"
          style={{
            height: 32, width: 32, borderRadius: 8, border: '1px solid var(--line)',
            background: menuOpen ? 'var(--bg)' : '#fff',
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: 'var(--muted)',
            opacity: isPending ? 0.5 : 1, fontSize: 18, fontWeight: 700,
            letterSpacing: '0.04em', lineHeight: 1,
          }}
        >
          ···
        </button>

        {menuOpen && (
          <div style={{
            position: 'absolute', right: 0, bottom: 'calc(100% + 4px)',
            background: '#fff', border: '1px solid var(--line)',
            borderRadius: 12, boxShadow: '0 8px 28px rgba(0,0,0,.13)',
            padding: 5, zIndex: 60, minWidth: 148,
          }}>
            <button
              type="button"
              onClick={handleArchive}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '8px 12px', borderRadius: 7, border: 0,
                background: 'transparent', fontSize: 13,
                fontFamily: 'inherit', color: 'var(--ink-2)', cursor: 'pointer',
                transition: 'background .1s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              Arquivar atividade
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
