import { useState } from 'react'

const MOG_ROLES = [
  'Software Engineering',
  'AI Engineering',
  'Machine Learning',
  'Data Science',
  'Frontend',
  'Backend',
  'Full-Stack',
]

export default function MogShowdown({ onBack }) {
  const [user1, setUser1] = useState('')
  const [user2, setUser2] = useState('')
  const [role, setRole] = useState(MOG_ROLES[0])
  const [status, setStatus] = useState(null) // { type: 'error'|'ready', msg: string }

  function handleRunShowdown() {
    if (!user1.trim() || !user2.trim()) {
      setStatus({ type: 'error', msg: 'Please enter both GitHub usernames.' })
      return
    }
    setStatus({ type: 'ready', msg: `Ready to compare @${user1.trim()} vs @${user2.trim()} for ${role}.` })
  }

  return (
    <div className="app">
      {/* Back nav */}
      <button className="mog-back-btn" onClick={onBack} aria-label="Back to analyzer">
        ← Back to Analyzer
      </button>

      {/* Hero */}
      <div className="mog-hero">
        <div className="mog-hero-badge">⚔️ Battle Mode</div>
        <h1 className="mog-hero-title">
          <span className="mog-hero-accent">MOG</span> Showdown
        </h1>
        <p className="mog-hero-main">
          Wanna see if your GitHub profile mogs someone else's?
        </p>
        <p className="mog-hero-sub">
          Enter two profiles, pick a target role, and find out who has the stronger developer portfolio.
        </p>
      </div>

      {/* Input form card */}
      <div className="card mog-form-card">
        <div className="mog-form-grid">
          {/* Username 1 */}
          <div className="field">
            <label htmlFor="mog-user1">Your GitHub username</label>
            <input
              id="mog-user1"
              type="text"
              placeholder="e.g. torvalds"
              value={user1}
              onChange={e => { setUser1(e.target.value); setStatus(null) }}
              onKeyDown={e => e.key === 'Enter' && handleRunShowdown()}
            />
          </div>

          {/* VS divider */}
          <div className="mog-vs-divider" aria-hidden="true">VS</div>

          {/* Username 2 */}
          <div className="field">
            <label htmlFor="mog-user2">Opponent's GitHub username</label>
            <input
              id="mog-user2"
              type="text"
              placeholder="e.g. gvanrossum"
              value={user2}
              onChange={e => { setUser2(e.target.value); setStatus(null) }}
              onKeyDown={e => e.key === 'Enter' && handleRunShowdown()}
            />
          </div>
        </div>

        {/* Role selector */}
        <div className="field mog-role-field">
          <label htmlFor="mog-role">Target role</label>
          <select
            id="mog-role"
            value={role}
            onChange={e => setRole(e.target.value)}
          >
            {MOG_ROLES.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* Status message */}
        {status && (
          <p className={status.type === 'error' ? 'mog-status-error' : 'mog-status-ready'}>
            {status.type === 'ready' ? '✅ ' : '⚠️ '}{status.msg}
          </p>
        )}

        {/* Submit */}
        <button className="mog-run-btn" onClick={handleRunShowdown}>
          Run Showdown ⚔️
        </button>
      </div>
    </div>
  )
}
