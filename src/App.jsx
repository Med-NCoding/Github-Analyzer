import { useState } from 'react'
import SearchBar from './components/SearchBar'
import ProfileCard from './components/ProfileCard.jsx'
import RepoList from './components/RepoList.jsx'
import LanguageChart from './components/LanguageChart.jsx'
import './App.css'
import { fetchGitHubUser, fetchGitHubRepos, countLanguages } from './lib/github.js'

function App() {
  const [username, setUsername] = useState('')
  const [userData, setUserData] = useState(null)
  const [repos, setRepos] = useState([])
  const [languageData, setLanguageData] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSearch() {
    if (!username.trim()) return

    setLoading(true)
    setError(null)
    setUserData(null)
    setRepos([])
    setLanguageData({})

    try {
      const userResult = await fetchGitHubUser(username.trim())
      setUserData(userResult)

      const reposResult = await fetchGitHubRepos(username.trim())
      setRepos(reposResult)
      setLanguageData(countLanguages(reposResult))
    } catch (err) {
      setError(err.message || 'Something went wrong')
    }

    setLoading(false)

    console.log("Searching for:", username.trim())
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
    </div>
  )
}

export default App
