'use client';
import { useState, useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import {
  getNotifications,
  markAllRead,
  markOneRead,
  type NotificationItem,
} from '@/actions/notifications';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return 'agora';
  if (m < 60) return `${m}min`;
  if (h < 24) return `${h}h`;
  return `${d}d`;
}

const TYPE_ICON: Record<string, string> = {
  post_aprovado:      '✓',
  ajuste_solicitado:  '↩',
};

export default function NotificationBell({ initialCount }: { initialCount: number }) {
  const router  = useRouter();
  const [open, setOpen]       = useState(false);
  const [count, setCount]     = useState(initialCount);
  const [items, setItems]     = useState<NotificationItem[]>([]);
  const [loaded, setLoaded]   = useState(false);
  const [, startTransition]   = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleOpen() {
    if (open) { setOpen(false); return; }
    setOpen(true);

    if (!loaded) {
      const data = await getNotifications();
      setItems(data);
      setLoaded(true);
    }

    // Marcar como lidas
    if (count > 0) {
      startTransition(async () => {
        await markAllRead();
        setCount(0);
        setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
      });
    }
  }

  async function handleItemClick(item: NotificationItem) {
    await markOneRead(item.id);
    setOpen(false);

    if (item.content_item_id) {
      router.push(`/admin/posts/${item.content_item_id}` as Route);
    } else if (item.campaign_id) {
      router.push(`/admin/cronogramas/${item.campaign_id}` as Route);
    }
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={handleOpen}
        style={{
          position: 'relative',
          width: 34, height: 34, borderRadius: 10,
          background: open ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)',
          border: 'none', cursor: 'pointer',
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background .15s',
        }}
        aria-label="Notificações"
      >
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {count > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            minWidth: 18, height: 18, borderRadius: 9,
            background: 'var(--orange)', color: '#fff',
            fontSize: 10, fontWeight: 700, lineHeight: '18px',
            textAlign: 'center', padding: '0 4px',
            border: '2px solid var(--green-dark, #1a3d18)',
          }}>
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: 340, maxHeight: 420, overflowY: 'auto',
          background: '#fff', borderRadius: 14,
          boxShadow: '0 8px 32px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08)',
          border: '1px solid var(--line)',
          zIndex: 200,
        }}>
          {/* Header */}
          <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Notificações</span>
            {items.some((n) => !n.read_at) && (
              <button
                onClick={() => { markAllRead(); setCount(0); setItems((p) => p.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))); }}
                style={{ fontSize: 11, color: 'var(--orange)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          {/* Lista */}
          {items.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              Nenhuma notificação
            </div>
          ) : (
            items.map((item) => {
              const isUnread = !item.read_at;
              const icon = TYPE_ICON[item.type] ?? '•';
              return (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--line-soft)',
                    cursor: 'pointer',
                    background: isUnread ? 'var(--green-50)' : '#fff',
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                    transition: 'background .1s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = isUnread ? '#d1f0c7' : 'var(--bg)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = isUnread ? 'var(--green-50)' : '#fff'; }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: item.type === 'post_aprovado' ? 'var(--green-50)' : '#fef3c7',
                    color: item.type === 'post_aprovado' ? 'var(--green)' : '#92400e',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700,
                  }}>
                    {icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>
                      {item.title}
                      {isUnread && (
                        <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--orange)', marginLeft: 6, verticalAlign: 'middle' }} />
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.message}
                    </div>
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--muted)', flexShrink: 0, marginTop: 2 }}>
                    {timeAgo(item.created_at)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
