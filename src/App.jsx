import { useState, useEffect, useRef } from 'react'
import ProfileCard from './components/ProfileCard.jsx'
import RepoList from './components/RepoList.jsx'
import LanguageChart from './components/LanguageChart.jsx'
import RoleSelector, { TARGET_ROLES } from './components/RoleSelector.jsx'
import StackBadges from './components/StackBadges.jsx'
import AIRecruiterFeedback from './components/AIRecruiterFeedback.jsx'
import IntroPage from './components/IntroPage.jsx'
import CursorGlow from './components/CursorGlow.jsx'
import './App.css'
import {
  fetchGitHubUser,
  fetchGitHubRepos,
  countLanguages,
  enrichReposWithReadmes,
} from './lib/github.js'
import { detectStack } from './lib/stackDetection.js'
import { buildProfileSummary } from './lib/profileSummary.js'
import { fetchRecruiterFeedback } from './lib/recruiterApi.js'

function App() {
  const [showIntro, setShowIntro] = useState(true)
  const [username, setUsername] = useState('')
  const [targetRole, setTargetRole] = useState(TARGET_ROLES[0])
  const [userData, setUserData] = useState(null)
  const [repos, setRepos] = useState([])
  const [languageData, setLanguageData] = useState({})
  const [detectedStack, setDetectedStack] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [recruiterFeedback, setRecruiterFeedback] = useState(null)
  const [recruiterLoading, setRecruiterLoading] = useState(false)
  const [recruiterError, setRecruiterError] = useState(null)
  // Track whether the role changed after feedback was generated
  const [roleChangedAfterFeedback, setRoleChangedAfterFeedback] = useState(false)

  // Keep a ref of the role that was used for the last successful fetch
  const lastAnalyzedRole = useRef(null)

  // When role changes while results are already shown, clear AI feedback
  // and prompt the user to re-analyze
  useEffect(() => {
    if (
      userData &&
      lastAnalyzedRole.current !== null &&
      lastAnalyzedRole.current !== targetRole
    ) {
      setRecruiterFeedback(null)
      setRecruiterError(null)
      setRoleChangedAfterFeedback(true)
    }
  }, [targetRole, userData])

  async function handleSearch() {
    if (!username.trim()) return

    setLoading(true)
    setError(null)
    setUserData(null)
    setRepos([])
    setLanguageData({})
    setDetectedStack([])
    setRecruiterFeedback(null)
    setRecruiterError(null)
    setRoleChangedAfterFeedback(false)

    try {
      const userResult = await fetchGitHubUser(username.trim())
      setUserData(userResult)

      const reposResult = await fetchGitHubRepos(username.trim())
      setRepos(reposResult)

      const languages = countLanguages(reposResult)
      setLanguageData(languages)

      const enrichedRepos = await enrichReposWithReadmes(reposResult, 15)
      const stack = detectStack(enrichedRepos)
      setDetectedStack(stack)

      const profileSummary = buildProfileSummary({
        user: userResult,
        repos: reposResult,
        enrichedRepos,
        languageCounts: languages,
        detectedStack: stack,
        targetRole,
      })

      try {
        setRecruiterLoading(true)
        const feedback = await fetchRecruiterFeedback(profileSummary)
        setRecruiterFeedback(feedback)
        // Record which role this feedback was generated for
        lastAnalyzedRole.current = targetRole
      } catch (aiErr) {
        setRecruiterError(aiErr.message || 'Could not generate recruiter feedback')
      } finally {
        setRecruiterLoading(false)
      }
    } catch (err) {
      setError(err.message || 'Something went wrong')
    }

    setLoading(false)
  }

  const isbusy = loading || recruiterLoading

  if (showIntro) {
    return (
      <>
        <CursorGlow />
        <IntroPage onGetStarted={() => setShowIntro(false)} />
      </>
    )
  }

  return (
    <div className="app">
      <CursorGlow />

      {/* Hero */}
      <div className="hero">
        <h1>
          <span className="hero-accent">GitHub</span> Profile Analyzer
        </h1>
        <p>AI-powered recruiter feedback for developer portfolios</p>
      </div>

      {/* Search panel */}
      <div className="card search-panel">
        <RoleSelector
          value={targetRole}
          onChange={setTargetRole}
          disabled={isbusy}
        />
        <div className="field" style={{ flex: 2, minWidth: 200 }}>
          <label htmlFor="username-input">GitHub username</label>
          <input
            id="username-input"
            type="text"
            placeholder="e.g. torvalds"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            disabled={isbusy}
          />
        </div>
        <button
          className="analyze-btn"
          type="button"
          onClick={handleSearch}
          disabled={isbusy}
        >
          {loading ? 'Loading…' : 'Analyze'}
        </button>
      </div>

      {/* Status */}
      {loading && <p className="status-msg">Loading GitHub profile…</p>}
      {error   && <p className="status-error">{error}</p>}

      {/* Profile */}
      {userData && (
        <div className="card profile-card">
          <ProfileCard user={userData} repos={repos} />
        </div>
      )}

      {/* Repos + Chart grid */}
      {(repos.length > 0 || Object.keys(languageData).length > 0) && (
        <div className="dash-grid">
          {repos.length > 0 && (
            <div className="card">
              <RepoList repos={repos} />
            </div>
          )}
          {Object.keys(languageData).length > 0 && (
            <div className="card">
              <LanguageChart data={languageData} />
            </div>
          )}
        </div>
      )}

      {/* Stack */}
      {detectedStack.length > 0 && (
        <div className="card stack-section">
          <StackBadges stack={detectedStack} />
        </div>
      )}

      {/* Role-changed notice — shown when user switched role after seeing feedback */}
      {roleChangedAfterFeedback && !recruiterFeedback && !recruiterLoading && (
        <div className="role-changed-notice">
          <span className="role-changed-icon">↺</span>
          Role changed to <strong>{targetRole}</strong> — click{' '}
          <strong>Analyze</strong> to get updated feedback for this role.
        </div>
      )}

      {/* AI Feedback */}
      {(recruiterFeedback || recruiterLoading || recruiterError) && (
        <div className="card ai-section">
          <AIRecruiterFeedback
            feedback={recruiterFeedback}
            loading={recruiterLoading}
            error={recruiterError}
            targetRole={targetRole}
          />
        </div>
      )}

    </div>
  )
}

export default App
