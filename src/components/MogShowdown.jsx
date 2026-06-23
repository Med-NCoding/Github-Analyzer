import { useState } from 'react'
import { fetchGitHubUser, fetchGitHubRepos } from '../lib/github.js'
import { fetchMogVerdict } from '../lib/recruiterApi.js'

const MOG_ROLES = [
  'Software Engineering',
  'AI Engineering',
  'Machine Learning',
  'Data Science',
  'Frontend',
  'Backend',
  'Full-Stack',
]

const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 30 * 6

// ── Role keyword signals (used for Role Fit category) ─────────
const ROLE_SIGNALS = {
  'Frontend':            ['JavaScript', 'TypeScript', 'CSS', 'HTML', 'Vue', 'React', 'Svelte'],
  'Backend':             ['Go', 'Rust', 'Java', 'Python', 'Ruby', 'PHP', 'C#', 'Node'],
  'Full-Stack':          ['JavaScript', 'TypeScript', 'Python', 'Ruby', 'PHP'],
  'AI Engineering':      ['Python', 'Jupyter Notebook', 'C++'],
  'Machine Learning':    ['Python', 'Jupyter Notebook', 'R', 'Julia'],
  'Data Science':        ['Python', 'R', 'Jupyter Notebook', 'Julia'],
  'Software Engineering':['C', 'C++', 'Go', 'Rust', 'Java', 'Python', 'JavaScript'],
}

// ── Pure metric helpers ───────────────────────────────────────
function calcMetrics(repos) {
  const totalStars = repos.reduce((s, r) => s + r.stargazers_count, 0)
  const totalForks = repos.reduce((s, r) => s + r.forks_count, 0)

  // Language distribution
  const langMap = {}
  repos.forEach(r => {
    if (r.language) langMap[r.language] = (langMap[r.language] || 0) + 1
  })
  const topLang     = Object.entries(langMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
  const langCount   = Object.keys(langMap).length   // variety = number of distinct languages

  const now = Date.now()
  const recentCount = repos.filter(r => now - new Date(r.pushed_at).getTime() < SIX_MONTHS_MS).length

  const top3 = [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 3)
  const topRepoStars = top3[0]?.stargazers_count ?? 0

  // Polish metrics
  const reposWithDesc = repos.filter(r => r.description && r.description.trim().length > 6).length
  const reposWithHomepage = repos.filter(r => r.homepage && r.homepage.trim() !== '').length
  const nonForksCount = repos.filter(r => !r.fork).length

  // Framework detection keywords
  const frameworkKeywords = ['react', 'next', 'vue', 'angular', 'svelte', 'express', 'node', 'django', 'flask', 'spring', 'rails', 'laravel', 'pytorch', 'tensorflow', 'docker', 'kubernetes', 'aws', 'firebase', 'postgres', 'mongo', 'graphql'];
  const detectedFrameworks = new Set()
  repos.forEach(r => {
    const text = `${r.name} ${r.description || ''}`.toLowerCase()
    frameworkKeywords.forEach(kw => {
      if (text.includes(kw)) detectedFrameworks.add(kw)
    })
  })
  const frameworkCount = detectedFrameworks.size

  return { 
    totalStars, 
    totalForks, 
    topLang, 
    langCount, 
    langMap, 
    recentCount, 
    top3, 
    topRepoStars,
    reposWithDesc,
    reposWithHomepage,
    nonForksCount,
    frameworkCount
  }
}

// ── Scoring engine (0–100, five weighted categories) ─────────
/*
  Categories and max points:
    projectVolume  20 — original non-fork repos counts
    publicSignal   25 — log-scaled total stars, forks, and followers
    stackStrength  20 — language variety + framework counts
    recentActivity 20 — recent active count + descriptions + homepages
    roleFit        15 — how many of user's languages match target role

  This recalibrated logic handles beginners fairly (40-55 for a couple real projects)
  while keeping cracked profiles at 90+ based on rich evidence.
*/
function calcScore(repos, metrics, role, followers = 0) {
  if (repos.length === 0) {
    return {
      total: 0,
      categories: { projectVolume: 0, publicSignal: 0, stackStrength: 0, recentActivity: 0, roleFit: 0 },
    }
  }

  // 1. Project Volume & Authenticity (max 20)
  const projectVolume = Math.min(20, Math.round(5 + (metrics.nonForksCount * 1.5)))

  // 2. Public Signal (max 25)
  const starScore = Math.log10(metrics.totalStars + 1) * 6
  const forkScore = Math.log10(metrics.totalForks + 1) * 3
  const followerScore = Math.log10(followers + 1) * 2
  const publicSignal = Math.min(25, Math.round(starScore + forkScore + followerScore))

  // 3. Stack & Framework Strength (max 20)
  const stackStrength = Math.min(20, Math.round(5 + (metrics.langCount * 1.5) + (metrics.frameworkCount * 2.0)))

  // 4. Recent Activity & Polish (max 20)
  const recentActivity = Math.min(20, Math.round(
    4 + 
    (metrics.recentCount * 2.0) + 
    (metrics.reposWithDesc * 1.0) + 
    (metrics.reposWithHomepage * 2.5)
  ))

  // 5. Role Fit (max 15)
  const signals = ROLE_SIGNALS[role] ?? []
  const matched = signals.filter(lang => metrics.langMap[lang] > 0).length
  const roleFit = signals.length > 0
    ? Math.min(15, Math.round((matched / signals.length) * 15))
    : 8

  const total = projectVolume + publicSignal + stackStrength + recentActivity + roleFit

  return {
    total,
    categories: { projectVolume, publicSignal, stackStrength, recentActivity, roleFit },
  }
}

// ── Stat box ──────────────────────────────────────────────────
function Stat({ value, label }) {
  return (
    <div className="mog-stat">
      <span className="mog-stat-value">{typeof value === 'number' ? value.toLocaleString() : value}</span>
      <span className="mog-stat-label">{label}</span>
    </div>
  )
}

// ── Score ring display ─────────────────────────────────────────
function ScoreRing({ score, login, isWinner }) {
  return (
    <div className={`mog-score-ring ${isWinner ? 'mog-score-ring--winner' : ''}`}>
      <span className="mog-score-number">{score}</span>
      <span className="mog-score-100">/100</span>
      <span className="mog-score-login">@{login}</span>
    </div>
  )
}

// ── Category comparison row ────────────────────────────────────
function CategoryRow({ label, s1, s2, max }) {
  const pct1 = Math.round((s1 / max) * 100)
  const pct2 = Math.round((s2 / max) * 100)
  const winner = s1 > s2 ? 'left' : s2 > s1 ? 'right' : 'tie'
  return (
    <div className="mog-cat-row">
      <div className="mog-cat-bar-wrap">
        <div
          className={`mog-cat-bar mog-cat-bar--left ${winner === 'left' ? 'mog-cat-bar--win' : ''}`}
          style={{ width: `${pct1}%` }}
        />
      </div>
      <div className="mog-cat-label">{label}</div>
      <div className="mog-cat-bar-wrap">
        <div
          className={`mog-cat-bar mog-cat-bar--right ${winner === 'right' ? 'mog-cat-bar--win' : ''}`}
          style={{ width: `${pct2}%` }}
        />
      </div>
    </div>
  )
}

// ── Player column (profile + metrics + top repos) ─────────────
function MogPlayerCard({ user, repos, metrics, side, isWinner }) {
  return (
    <div className={`mog-player-col mog-player-col--${side}${isWinner ? ' mog-player-col--winner' : ''}`}>
      <div className="card mog-profile-card" style={{ position: 'relative' }}>
        {isWinner && <div className="mog-leader-badge">👑 LEADER</div>}
        <div className="mog-profile-top">
          <img className="mog-profile-avatar" src={user.avatar_url} alt={user.login} />
          <div className="mog-profile-names">
            {user.name && <h3 className="mog-profile-name">{user.name}</h3>}
            <p className="mog-profile-login">@{user.login}</p>
          </div>
        </div>
        {user.bio && <p className="mog-profile-bio">{user.bio}</p>}
        {user.location && <p className="mog-profile-location">📍 {user.location}</p>}
        <div className="mog-profile-stats">
          <Stat value={user.followers} label="Followers" />
          <Stat value={user.public_repos} label="Repos" />
          <Stat value={user.following} label="Following" />
        </div>
      </div>

      <div className="card mog-metrics-card">
        <p className="mog-metrics-title">Repo Metrics</p>
        <div className="mog-profile-stats">
          <Stat value={repos.length} label="Analyzed" />
          <Stat value={metrics.totalStars} label="Stars" />
          <Stat value={metrics.totalForks} label="Forks" />
          <Stat value={metrics.topLang} label="Top Lang" />
          <Stat value={metrics.recentCount} label="Active (6mo)" />
        </div>
      </div>

      {metrics.top3.length > 0 && (
        <div className="card mog-top-repos-card">
          <p className="mog-metrics-title">Top Repos</p>
          <div className="mog-top-repos-list">
            {metrics.top3.map(repo => (
              <a
                key={repo.id}
                href={repo.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mog-repo-item"
              >
                <span className="mog-repo-name">{repo.name}</span>
                <span className="mog-repo-meta">
                  {repo.language && <span className="repo-lang">{repo.language}</span>}
                  <span className="mog-repo-stars">★ {repo.stargazers_count}</span>
                </span>
                {repo.description && <span className="mog-repo-desc">{repo.description}</span>}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────
export default function MogShowdown({ onBack }) {
  const [user1, setUser1] = useState('')
  const [user2, setUser2] = useState('')
  const [role, setRole]   = useState(MOG_ROLES[0])

  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [data, setData]       = useState(null)

  const [aiVerdict, setAiVerdict] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState(null)

  async function handleRunShowdown() {
    const u1 = user1.trim()
    const u2 = user2.trim()
    if (!u1 || !u2) { setError('Please enter both GitHub usernames.'); return }

    setLoading(true); setError(null); setData(null)
    setAiVerdict(null); setAiLoading(false); setAiError(null)

    let calculatedData = null

    try {
      const [p1, p2, r1, r2] = await Promise.all([
        fetchGitHubUser(u1), fetchGitHubUser(u2),
        fetchGitHubRepos(u1), fetchGitHubRepos(u2),
      ])
      const m1 = calcMetrics(r1)
      const m2 = calcMetrics(r2)
      const s1 = calcScore(r1, m1, role, p1.followers)
      const s2 = calcScore(r2, m2, role, p2.followers)
      calculatedData = { p1, p2, r1, r2, m1, m2, s1, s2, role }
      setData(calculatedData)
    } catch (err) {
      setError(err.message || 'Could not load one or both profiles.')
      setLoading(false)
      return
    }

    setLoading(false)

    // Trigger AI verdict asynchronously in the background
    if (calculatedData) {
      setAiLoading(true)
      try {
        const { r1, r2, ...compactData } = calculatedData
        const verdictRes = await fetchMogVerdict(compactData)
        setAiVerdict(verdictRes)
      } catch (err) {
        console.error('AI Verdict failed:', err.message)
        setAiError(err.message || 'Failed to generate AI verdict.')
      } finally {
        setAiLoading(false)
      }
    }
  }

  // Derived verdict
  const verdict = data
    ? data.s1.total - data.s2.total > 5
      ? `🏆 @${data.p1.login} is mogging`
      : data.s2.total - data.s1.total > 5
        ? `🏆 @${data.p2.login} is mogging`
        : '🤝 Close Match'
    : null

  const CAT_MAX = { projectVolume: 20, publicSignal: 25, stackStrength: 20, recentActivity: 20, roleFit: 15 }
  const CAT_LABELS = {
    projectVolume: 'Project Volume',
    publicSignal:  'Public Signal',
    stackStrength: 'Stack Strength',
    recentActivity:'Recent Activity',
    roleFit:       'Role Fit',
  }

  return (
    <div className="app">
      <button className="mog-back-btn" onClick={onBack}>← Back to Analyzer</button>

      <div className="mog-hero">
        <div className="mog-hero-badge">⚔️ Battle Mode</div>
        <h1 className="mog-hero-title"><span className="mog-hero-accent">MOG</span> Showdown</h1>
        <p className="mog-hero-main">Wanna see if your GitHub profile mogs someone else's?</p>
        <p className="mog-hero-sub">Enter two profiles, pick a target role, and find out who has the stronger developer portfolio.</p>
      </div>

      <div className="card mog-form-card">
        <div className="mog-form-grid">
          <div className="field">
            <label htmlFor="mog-user1">Your GitHub username</label>
            <input id="mog-user1" type="text" placeholder="e.g. torvalds" value={user1}
              onChange={e => { setUser1(e.target.value); setError(null); setData(null) }}
              onKeyDown={e => e.key === 'Enter' && handleRunShowdown()} disabled={loading} />
          </div>
          <div className="mog-vs-divider" aria-hidden="true">VS</div>
          <div className="field">
            <label htmlFor="mog-user2">Opponent's GitHub username</label>
            <input id="mog-user2" type="text" placeholder="e.g. gvanrossum" value={user2}
              onChange={e => { setUser2(e.target.value); setError(null); setData(null) }}
              onKeyDown={e => e.key === 'Enter' && handleRunShowdown()} disabled={loading} />
          </div>
        </div>
        <div className="field mog-role-field">
          <label htmlFor="mog-role">Target role</label>
          <select id="mog-role" value={role} onChange={e => setRole(e.target.value)} disabled={loading}>
            {MOG_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        {error && <p className="mog-status-error">⚠️ {error}</p>}
        <button className="mog-run-btn" onClick={handleRunShowdown} disabled={loading}>
          {loading ? 'Loading…' : 'Run Showdown ⚔️'}
        </button>
      </div>

      {loading && <p className="status-msg" style={{ textAlign: 'center' }}>Fetching profiles and repos…</p>}

      {data && (
        <>
          {/* ── Score rings ── */}
          <div className="card mog-score-card">
            <p className="mog-metrics-title" style={{ textAlign: 'center', marginBottom: '20px' }}>
              Portfolio Score — {data.role}
            </p>
            <div className="mog-score-row">
              <ScoreRing score={data.s1.total} login={data.p1.login} isWinner={data.s1.total > data.s2.total} />
              <div className="mog-score-divider">vs</div>
              <ScoreRing score={data.s2.total} login={data.p2.login} isWinner={data.s2.total > data.s1.total} />
            </div>

            {/* ── Category comparison bars ── */}
            <div className="mog-categories">
              <div className="mog-cat-header">
                <span>@{data.p1.login}</span>
                <span></span>
                <span>@{data.p2.login}</span>
              </div>
              {Object.keys(CAT_LABELS).map(key => (
                <CategoryRow
                  key={key}
                  label={CAT_LABELS[key]}
                  s1={data.s1.categories[key]}
                  s2={data.s2.categories[key]}
                  max={CAT_MAX[key]}
                />
              ))}
            </div>

            {/* ── Verdict ── */}
            <div className={`mog-verdict ${verdict === '🤝 Close Match' ? 'mog-verdict--tie' : 'mog-verdict--win'}`}>{verdict}</div>
          </div>

          {/* ── AI final verdict ── */}
          {aiLoading && (
            <div className="card mog-ai-loading">
              <div className="mog-pulse-loader"></div>
              <p className="mog-ai-loading-text">⚔️ Consulting the Groq AI oracle for the final verdict...</p>
            </div>
          )}

          {aiError && (
            <div className="mog-status-error" style={{ margin: '12px 0 20px' }}>
              ⚠️ AI Verdict failed: {aiError}. Displaying raw portfolio scores instead.
            </div>
          )}

          {aiVerdict && (
            <div className="card mog-ai-card">
              <div className="mog-ai-header">
                <div className="mog-ai-badge-row">
                  <span className="mog-ai-badge">🤖 AI SHOWDOWN VERDICT</span>
                  <span className="mog-ai-role-badge">Role: {data.role}</span>
                </div>
                
                <h2 className="mog-ai-winner-line">
                  {data.s1.total - data.s2.total > 5 
                    ? `@${data.p1.login} MOGS @${data.p2.login}` 
                    : data.s2.total - data.s1.total > 5 
                      ? `@${data.p2.login} MOGS @${data.p1.login}` 
                      : `🤝 CLOSE SHOWDOWN TIE`}
                </h2>

                <div className="mog-ai-score-badges">
                  <div className={`mog-ai-score-pill ${data.s1.total >= data.s2.total ? 'mog-ai-score-pill--leader' : ''}`}>
                    <span className="mog-score-pill-login">@{data.p1.login}</span>
                    <span className="mog-score-pill-val">{data.s1.total}</span>
                  </div>
                  <div className="mog-ai-score-vs">VS</div>
                  <div className={`mog-ai-score-pill ${data.s2.total >= data.s1.total ? 'mog-ai-score-pill--leader' : ''}`}>
                    <span className="mog-score-pill-login">@{data.p2.login}</span>
                    <span className="mog-score-pill-val">{data.s2.total}</span>
                  </div>
                </div>
              </div>

              <div className="mog-ai-body">
                <div className="mog-ai-section">
                  <h4 className="mog-ai-sec-title">🏆 Verdict Analysis</h4>
                  <p className="mog-ai-text">{aiVerdict.whyWinnerWins}</p>
                </div>
                
                <div className="mog-ai-split-grid">
                  <div className="mog-ai-split-box">
                    <h5 className="mog-ai-split-title">💪 @{data.p1.login} Strengths</h5>
                    <p className="mog-ai-text">{aiVerdict.user1Strength}</p>
                  </div>
                  <div className="mog-ai-split-box">
                    <h5 className="mog-ai-split-title">💪 @{data.p2.login} Strengths</h5>
                    <p className="mog-ai-text">{aiVerdict.user2Strength}</p>
                  </div>
                </div>

                <div className="mog-ai-split-grid">
                  <div className="mog-ai-split-box mog-ai-split-box--weakness">
                    <h5 className="mog-ai-split-title">⚠️ @{data.p1.login} Weakness</h5>
                    <p className="mog-ai-text">{aiVerdict.biggestWeaknesses?.user1 || 'None identified.'}</p>
                  </div>
                  <div className="mog-ai-split-box mog-ai-split-box--weakness">
                    <h5 className="mog-ai-split-title">⚠️ @{data.p2.login} Weakness</h5>
                    <p className="mog-ai-text">{aiVerdict.biggestWeaknesses?.user2 || 'None identified.'}</p>
                  </div>
                </div>

                <div className="mog-ai-section">
                  <h4 className="mog-ai-sec-title">📈 Comeback Plan</h4>
                  <p className="mog-ai-text">{aiVerdict.comebackPlan}</p>
                </div>

                <div className="mog-ai-share-box">
                  <div className="mog-ai-tweet-preview">
                    <span className="mog-ai-share-label">Share Verdict on X:</span>
                    <p className="mog-tweet-preview-text">"{aiVerdict.twitterShareLine}"</p>
                  </div>
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(aiVerdict.twitterShareLine)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mog-share-btn"
                  >
                    Post on X 🐦
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* ── Profile + repo detail ── */}
          <div className="mog-results-grid">
            <MogPlayerCard user={data.p1} repos={data.r1} metrics={data.m1} side="left" isWinner={data.s1.total > data.s2.total} />
            <div className="mog-results-vs" aria-hidden="true">VS</div>
            <MogPlayerCard user={data.p2} repos={data.r2} metrics={data.m2} side="right" isWinner={data.s2.total > data.s1.total} />
          </div>
        </>
      )}
    </div>
  )
}
