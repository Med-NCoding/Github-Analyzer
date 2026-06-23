export default function MogShowdown({ onBack }) {
  return (
    <div className="app">
      {/* Header row */}
      <div className="hero" style={{ position: 'relative' }}>
        <button
          className="mog-back-btn"
          onClick={onBack}
          aria-label="Back to analyzer"
        >
          ← Back
        </button>
        <h1>
          <span className="hero-accent">MOG</span> Showdown
        </h1>
        <p>Head-to-head GitHub profile comparison — coming soon.</p>
      </div>

      {/* Placeholder card */}
      <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
        <div className="mog-placeholder-icon">⚔️</div>
        <h2 className="mog-placeholder-title">Feature In Progress</h2>
        <p className="mog-placeholder-sub">
          MOG Showdown will let you compare two GitHub profiles side-by-side
          with AI-powered scoring. Stay tuned.
        </p>
      </div>
    </div>
  )
}
