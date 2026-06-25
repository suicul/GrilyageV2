export default function AdminLoading() {
  return (
    <div className="admin-theme">
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <div className="admin-sidebar-header">
            <div style={{ height: 16, width: 120, background: 'var(--bg3)', borderRadius: 6 }} />
          </div>
          <nav className="admin-nav">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 14, background: 'var(--bg3)', borderRadius: 4,
                  margin: '8px 12px',
                }}
              />
            ))}
          </nav>
        </aside>
        <main className="admin-main">
          <div style={{ padding: 24 }}>
            <div
              style={{
                height: 24, width: 160, background: 'var(--bg3)',
                borderRadius: 6, marginBottom: 24,
              }}
            />
            <div style={{ display: 'grid', gap: 12 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: 48, background: 'var(--bg3)',
                    borderRadius: 8,
                  }}
                />
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
