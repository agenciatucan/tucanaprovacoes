import Link from 'next/link';
import type { Route } from 'next';

interface Props {
  currentPage: number;
  totalPages: number;
  buildHref: (page: number) => string;
}

export default function Pagination({ currentPage, totalPages, buildHref }: Props) {
  if (totalPages <= 1) return null;

  const prev = currentPage - 1;
  const next = currentPage + 1;
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  // Janela de páginas visíveis: sempre mostra até 5 ao redor da atual
  const pages: (number | 'ellipsis')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('ellipsis');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push('ellipsis');
    pages.push(totalPages);
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, paddingTop: 20, paddingBottom: 4 }}>
      <Link
        href={hasPrev ? (buildHref(prev) as Route) : ('#' as Route)}
        aria-disabled={!hasPrev}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 32, height: 32, borderRadius: 8, fontSize: 13, fontWeight: 700,
          border: '1px solid var(--line)',
          background: hasPrev ? '#fff' : 'var(--bg)',
          color: hasPrev ? 'var(--ink)' : 'var(--muted-2)',
          pointerEvents: hasPrev ? 'auto' : 'none',
          textDecoration: 'none',
          transition: 'background .1s',
        }}
      >
        ←
      </Link>

      {pages.map((p, i) =>
        p === 'ellipsis' ? (
          <span key={`e${i}`} style={{ color: 'var(--muted)', fontSize: 13, padding: '0 4px' }}>…</span>
        ) : (
          <Link
            key={p}
            href={buildHref(p) as Route}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, borderRadius: 8, fontSize: 13, fontWeight: 700,
              border: p === currentPage ? 'none' : '1px solid var(--line)',
              background: p === currentPage ? 'var(--green)' : '#fff',
              color: p === currentPage ? '#fff' : 'var(--ink)',
              textDecoration: 'none',
              transition: 'background .1s',
            }}
          >
            {p}
          </Link>
        )
      )}

      <Link
        href={hasNext ? (buildHref(next) as Route) : ('#' as Route)}
        aria-disabled={!hasNext}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 32, height: 32, borderRadius: 8, fontSize: 13, fontWeight: 700,
          border: '1px solid var(--line)',
          background: hasNext ? '#fff' : 'var(--bg)',
          color: hasNext ? 'var(--ink)' : 'var(--muted-2)',
          pointerEvents: hasNext ? 'auto' : 'none',
          textDecoration: 'none',
          transition: 'background .1s',
        }}
      >
        →
      </Link>
    </div>
  );
}
