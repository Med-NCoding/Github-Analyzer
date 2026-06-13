function RepoList({ repos }) {
    const topRepos = [...repos]
      .sort((a, b) => b.stargazers_count - a.stargazers_count)
      .slice(0, 5)
  
    return (
      <div className="repo-list">
        <h2>Top Repos</h2>
        {topRepos.map(repo => (
          <div key={repo.id} className="repo-item">
            <span className="repo-name">{repo.name}</span>
            <span className="repo-stars">⭐ {repo.stargazers_count}</span>
            <span className="repo-language">{repo.language || 'N/A'}</span>
          </div>
        ))}
      </div>
    )
  }
  
  export default RepoList