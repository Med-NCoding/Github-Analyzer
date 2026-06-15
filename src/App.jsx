import { useState } from 'react'
import SearchBar from './components/SearchBar'
import ProfileCard from './components/ProfileCard.jsx'
import RepoList from './components/RepoList.jsx'
import LanguageChart from './components/LanguageChart.jsx'
import AIInsights from './components/AIInsights.jsx'
import './App.css'
import { fetchGitHubUser, fetchGitHubRepos, countLanguages } from './lib/github.js'
import { fetchAIInsight } from './lib/groq.js'

function App() {
  const [username, setUsername] = useState('')
  const [userData, setUserData] = useState(null)
  const [repos, setRepos] = useState([])
  const [languageData, setLanguageData] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [aiInsight, setAiInsight] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')

  async function handleSearch() {
    if (!username.trim()) return

    setLoading(true)
    setError(null)
    setUserData(null)
    setRepos([])
    setLanguageData({})
    setAiInsight('')
    setAiError('')

    try {
      const userResult = await fetchGitHubUser(username.trim())
      setUserData(userResult)

      const reposResult = await fetchGitHubRepos(username.trim())
      setRepos(reposResult)

      const languages = countLanguages(reposResult)
      setLanguageData(languages)

      setAiLoading(true)
      try {
        const insight = await fetchAIInsight(languages, reposResult)
        setAiInsight(insight)
      } catch (aiErr) {
        console.error('AI insight failed:', aiErr)
        setAiError(aiErr.message || 'Could not generate AI insight')
      } finally {
        setAiLoading(false)
      }
    } catch (err) {
      setError(err.message || 'Something went wrong')
    }

    setLoading(false)
  }

  return (
    <div className="app">
      <h1>GitHub Profile Analyzer</h1>
      <SearchBar
        value={username}
        onChange={setUsername}
        onSearch={handleSearch}
        disabled={loading}
      />
      {loading && <p className="status">Loading...</p>}
      {error && <p className="status error">{error}</p>}
      {userData && <ProfileCard user={userData} />}
      {repos.length > 0 && <RepoList repos={repos} />}
      {Object.keys(languageData).length > 0 && <LanguageChart data={languageData} />}
      <AIInsights aiInsight={aiInsight} aiLoading={aiLoading} aiError={aiError} />
    </div>
  )
}

export default App
