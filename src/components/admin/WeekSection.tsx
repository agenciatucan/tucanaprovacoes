'use client';
import { useState } from 'react';

interface Props {
  title: string;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export default function WeekSection({ title, count, defaultOpen = true, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Week header — clickable */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: open ? 12 : 0,
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <h3
          className="h3"
          style={{ color: 'var(--ink)', margin: 0, fontSize: 14, fontWeight: 700 }}
        >
          {title}
        </h3>
        <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
        <span className="muted tiny">{count} {count === 1 ? 'post' : 'posts'}</span>
        {/* Chevron */}
        <svg
          width={14}
          height={14}
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--muted)"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transition: 'transform .18s ease',
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
            flexShrink: 0,
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Collapsible content */}
      {open && children}
    </div>
  );
}
