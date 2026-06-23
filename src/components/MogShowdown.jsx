import { useState } from 'react'
import { fetchGitHubUser } from '../lib/github.js'

const MOG_ROLES = [
  'Software Engineering',
  'AI Engineering',
  'Machine Learning',
  'Data Science',
  'Frontend',
  'Backend',
  'Full-Stack',
]

// Mini profile card — avatar, name, bio, stats
function MogProfileCard({ user, side }) {
  return (
    <div className={`card mog-profile-card mog-profile-card--${side}`}>
      <div className="mog-profile-top">
        <img
          className="mog-profile-avatar"
          src={user.avatar_url}
          alt={user.login}
        />
        <div className="mog-profile-names">
          {user.name && <h3 className="mog-profile-name">{user.name}</h3>}
          <p className="mog-profile-login">@{user.login}</p>
        </div>
      </div>
      {user.bio && <p className="mog-profile-bio">{user.bio}</p>}
      <div className="mog-profile-stats">
        <div className="mog-stat">
          <span className="mog-stat-value">{user.followers.toLocaleString()}</span>
          <span className="mog-stat-label">Followers</span>
        </div>
        <div className="mog-stat">
          <span className="mog-stat-value">{user.following.toLocaleString()}</span>
          <span className="mog-stat-label">Following</span>
        </div>
        <div className="mog-stat">
          <span className="mog-stat-value">{user.public_repos}</span>
          <span className="mog-stat-label">Repos</span>
        </div>
        {user.public_gists > 0 && (
          <div className="mog-stat">
            <span className="mog-stat-value">{user.public_gists}</span>
            <span className="mog-stat-label">Gists</span>
          </div>
        )}
      </div>
      {user.location && (
        <p className="mog-profile-location">📍 {user.location}</p>
      )}
    </div>
  )
}

export default function MogShowdown({ onBack }) {
  const [user1, setUser1] = useState('')
  const [user2, setUser2] = useState('')
  const [role, setRole] = useState(MOG_ROLES[0])

  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [profiles, setProfiles]   = useState(null) // { p1, p2 }

  async function handleRunShowdown() {
    const u1 = user1.trim()
    const u2 = user2.trim()

    if (!u1 || !u2) {
      setError('Please enter both GitHub usernames.')
      return
    }

    setLoading(true)
    setError(null)
    setProfiles(null)

    try {
      // Fetch both profiles in parallel — reuse existing github.js helper
      const [p1, p2] = await Promise.all([
        fetchGitHubUser(u1),
        fetchGitHubUser(u2),
      ])
      setProfiles({ p1, p2 })
    } catch (err) {
      setError(err.message || 'Could not load one or both profiles. Check the usernames and try again.')
    } finally {
      setLoading(false)
    }
  }

  const isBusy = loading

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
          <div className="field">
            <label htmlFor="mog-user1">Your GitHub username</label>
            <input
              id="mog-user1"
              type="text"
              placeholder="e.g. torvalds"
              value={user1}
              onChange={e => { setUser1(e.target.value); setError(null); setProfiles(null) }}
              onKeyDown={e => e.key === 'Enter' && handleRunShowdown()}
              disabled={isBusy}
            />
          </div>

          <div className="mog-vs-divider" aria-hidden="true">VS</div>

          <div className="field">
            <label htmlFor="mog-user2">Opponent's GitHub username</label>
            <input
              id="mog-user2"
              type="text"
              placeholder="e.g. gvanrossum"
              value={user2}
              onChange={e => { setUser2(e.target.value); setError(null); setProfiles(null) }}
              onKeyDown={e => e.key === 'Enter' && handleRunShowdown()}
              disabled={isBusy}
            />
          </div>
        </div>

        <div className="field mog-role-field">
          <label htmlFor="mog-role">Target role</label>
          <select
            id="mog-role"
            value={role}
            onChange={e => setRole(e.target.value)}
            disabled={isBusy}
          >
            {MOG_ROLES.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* Inline error */}
        {error && <p className="mog-status-error">⚠️ {error}</p>}

        <button className="mog-run-btn" onClick={handleRunShowdown} disabled={isBusy}>
          {loading ? 'Loading profiles…' : 'Run Showdown ⚔️'}
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <p className="status-msg" style={{ textAlign: 'center' }}>
          Fetching GitHub profiles…
        </p>
      )}

      {/* Side-by-side profile cards */}
      {profiles && (
        <div className="mog-results-grid">
          <MogProfileCard user={profiles.p1} side="left" />
          <div className="mog-results-vs" aria-hidden="true">VS</div>
          <MogProfileCard user={profiles.p2} side="right" />
        </div>
      )}
    </div>
  )
}
