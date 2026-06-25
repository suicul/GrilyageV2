export default function RootLoading() {
  return (
    <div className="site-loading">
      <header className="site-header skeleton">
        <div className="header-inner">
          <div className="skeleton-logo" />
          <div className="skeleton-nav">
            <span /><span /><span />
          </div>
        </div>
      </header>
      <section className="hero-skeleton">
        <div className="skeleton-hero-content">
          <div className="skeleton-title" />
          <div className="skeleton-text" />
          <div className="skeleton-btn" />
        </div>
      </section>
      <section className="menu-skeleton">
        <div className="skeleton-section-title" />
        <div className="skeleton-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton-card">
              <div className="skeleton-img" />
              <div className="skeleton-card-title" />
              <div className="skeleton-price" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
