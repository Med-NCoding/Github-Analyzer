import { useState } from 'react'
import SearchBar from './components/SearchBar'
import ProfileCard from './components/ProfileCard.jsx'
import './App.css'
import { fetchGitHubUser } from './lib/github.js'

function App() {
  const [username, setUsername] = useState('')
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSearch() {
    if (!username.trim()) return

    setLoading(true)
    setError(null)
    setUserData(null)

    try {
      const data = await fetchGitHubUser(username.trim())
      setUserData(data)
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
    </div>
  )
}

export default App
