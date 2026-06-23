function RepoList({ repos }) {
  const topRepos = [...repos]
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 5)

  return (
    <div className="repo-list">
      <p className="section-label">Top Repositories</p>
      {topRepos.map((repo) => (
        <div key={repo.id} className="repo-item">
          <div className="repo-main">
            <span className="repo-name">{repo.name}</span>
            {repo.description && (
              <span className="repo-desc">{repo.description}</span>
            )}
          </div>
          <div className="repo-right">
            <span className="repo-stars">★ {repo.stargazers_count}</span>
            <span className="repo-lang">{repo.language || 'N/A'}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

export default RepoList