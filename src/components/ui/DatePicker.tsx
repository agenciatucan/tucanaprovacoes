'use client';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';

const WEEKDAY_SHORT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

interface Props {
  value: string; // yyyy-mm-dd
  onChange: (iso: string) => void;
  min?: string;
  max?: string;
  className?: string;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toIso(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseIso(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export default function DatePicker({ value, onChange, min, max, className }: Props) {
  const [open, setOpen] = useState(false);
  const selected = value ? parseIso(value) : new Date();
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  function openPicker() {
    const s = value ? parseIso(value) : new Date();
    setViewYear(s.getFullYear());
    setViewMonth(s.getMonth());
    setOpen(true);
  }

  const minDate = min ? parseIso(min) : null;
  const maxDate = max ? parseIso(max) : null;

  function isDisabled(d: Date) {
    if (minDate && d < minDate) return true;
    if (maxDate && d > maxDate) return true;
    return false;
  }

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startOffset = firstOfMonth.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d));

  const monthLabelRaw = firstOfMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const monthLabel = monthLabelRaw.charAt(0).toUpperCase() + monthLabelRaw.slice(1);

  const todayIso = toIso(new Date());

  function goPrevMonth() {
    const d = new Date(viewYear, viewMonth - 1, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }
  function goNextMonth() {
    const d = new Date(viewYear, viewMonth + 1, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  function pick(d: Date) {
    if (isDisabled(d)) return;
    onChange(toIso(d));
    setOpen(false);
  }

  const displayLabel = value
    ? parseIso(value).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')
    : 'Selecionar data';

  return (
    <div ref={rootRef} style={{ position: 'relative' }} className={className}>
      <button
        type="button"
        className="input"
        onClick={() => (open ? setOpen(false) : openPicker())}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          cursor: 'pointer', textAlign: 'left', width: '100%',
        }}
      >
        <span>{displayLabel}</span>
        <Icon name="calendar" size={14} />
      </button>

      {open && (
        <div className="dpicker-pop">
          <div className="dpicker-head">
            <button type="button" onClick={goPrevMonth} className="dpicker-nav" aria-label="Mês anterior">
              <Icon name="arrow-left" size={12} />
            </button>
            <span className="dpicker-label">{monthLabel}</span>
            <button type="button" onClick={goNextMonth} className="dpicker-nav" aria-label="Próximo mês">
              <Icon name="arrow" size={12} />
            </button>
          </div>

          <div className="dpicker-weekdays">
            {WEEKDAY_SHORT.map((w, i) => <span key={i}>{w}</span>)}
          </div>

          <div className="dpicker-grid">
            {cells.map((d, i) => {
              if (!d) return <span key={`blank-${i}`} />;
              const iso = toIso(d);
              const disabled = isDisabled(d);
              const isSelected = iso === value;
              const isToday = iso === todayIso;
              return (
                <button
                  type="button"
                  key={iso}
                  disabled={disabled}
                  onClick={() => pick(d)}
                  className={`dpicker-day${isSelected ? ' dpicker-day-selected' : ''}${isToday && !isSelected ? ' dpicker-day-today' : ''}`}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="dpicker-today"
            onClick={() => {
              const t = new Date();
              if (!isDisabled(t)) pick(t);
            }}
          >
            Hoje
          </button>
        </div>
      )}

      <style>{`
        .dpicker-pop {
          position: absolute; top: calc(100% + 6px); left: 0; z-index: 40;
          width: 264px; background: #fff; border: 1px solid var(--line);
          border-radius: 14px; box-shadow: 0 12px 32px -12px rgba(0,0,0,0.22);
          padding: 12px;
        }
        .dpicker-head {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 10px;
        }
        .dpicker-label { font-size: 13px; font-weight: 800; }
        .dpicker-nav {
          width: 26px; height: 26px; border-radius: 8px; border: 1px solid var(--line);
          background: #fff; display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: var(--ink);
        }
        .dpicker-nav:hover { background: var(--bg); }
        .dpicker-weekdays {
          display: grid; grid-template-columns: repeat(7, 1fr);
          margin-bottom: 4px;
        }
        .dpicker-weekdays span {
          text-align: center; font-size: 10px; font-weight: 800; color: var(--muted);
        }
        .dpicker-grid {
          display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px;
        }
        .dpicker-day {
          height: 30px; border-radius: 8px; border: none; background: transparent;
          font-size: 12.5px; font-weight: 600; color: var(--ink); cursor: pointer;
        }
        .dpicker-day:hover:not(:disabled) { background: var(--bg); }
        .dpicker-day:disabled { color: var(--muted-2); cursor: not-allowed; opacity: 0.4; }
        .dpicker-day-today { color: var(--orange); font-weight: 800; }
        .dpicker-day-selected { background: var(--orange); color: #fff; }
        .dpicker-day-selected:hover { background: var(--orange); }
        .dpicker-today {
          margin-top: 8px; width: 100%; text-align: center;
          font-size: 12px; font-weight: 700; color: var(--green);
          background: transparent; border: none; cursor: pointer; padding: 6px 0;
        }
        .dpicker-today:hover { text-decoration: underline; }
      `}</style>
    </div>
  );
}
