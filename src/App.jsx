import { useState } from 'react'
import SearchBar from './components/SearchBar'
import ProfileCard from './components/ProfileCard.jsx'
import RepoList from './components/RepoList.jsx'
import LanguageChart from './components/LanguageChart.jsx'
import RoleSelector, { TARGET_ROLES } from './components/RoleSelector.jsx'
import StackBadges from './components/StackBadges.jsx'
import AIRecruiterFeedback from './components/AIRecruiterFeedback.jsx'
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

    try {
      const userResult = await fetchGitHubUser(username.trim())
      setUserData(userResult)

      const reposResult = await fetchGitHubRepos(username.trim())
      setRepos(reposResult)

      const languages = countLanguages(reposResult)
      setLanguageData(languages)

      // Fetch READMEs for top repos (safe — failures return null per repo)
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

      // AI recruiter feedback — isolated so GitHub data still displays on failure
      try {
        setRecruiterLoading(true)
        const feedback = await fetchRecruiterFeedback(profileSummary)
        setRecruiterFeedback(feedback)
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

  return (
    <div className="app">
      <h1>GitHub Profile Analyzer</h1>
      <RoleSelector
        value={targetRole}
        onChange={setTargetRole}
        disabled={loading || recruiterLoading}
      />
      <SearchBar
        value={username}
        onChange={setUsername}
        onSearch={handleSearch}
        disabled={loading || recruiterLoading}
      />
      {loading && <p className="status">Loading GitHub profile...</p>}
      {error && <p className="status error">{error}</p>}
      {userData && <ProfileCard user={userData} />}
      {repos.length > 0 && <RepoList repos={repos} />}
      {Object.keys(languageData).length > 0 && <LanguageChart data={languageData} />}
      {detectedStack.length > 0 && <StackBadges stack={detectedStack} />}
      <AIRecruiterFeedback
        feedback={recruiterFeedback}
        loading={recruiterLoading}
        error={recruiterError}
        targetRole={targetRole}
      />
    </div>
  )
}

export default App
