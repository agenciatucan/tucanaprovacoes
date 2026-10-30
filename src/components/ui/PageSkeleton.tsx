// Esqueleto exibido por loading.tsx enquanto a página busca dados no servidor —
// a navegação responde na hora em vez de "travar" na página anterior.
export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando" style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px' }}>
      <div className="skeleton" style={{ width: 220, height: 28, marginBottom: 10 }} />
      <div className="skeleton" style={{ width: 320, height: 14, marginBottom: 28 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton" style={{ height: 96 }} />
        ))}
      </div>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="skeleton" style={{ height: 56, marginBottom: 10 }} />
      ))}
    </div>
  );
}
