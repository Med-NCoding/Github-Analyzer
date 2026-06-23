function ProfileCard({ user, repos }) {
  if (!user) return null

  const displayName = user.name || user.login

  // Total stars across repos
  const totalStars = repos
    ? repos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0)
    : 0

  return (
    <>
      {/* Top row: avatar + name + github button */}
      <div className="profile-top">
        <img
          className="profile-avatar"
          src={user.avatar_url}
          alt={`${displayName} avatar`}
          width={56}
          height={56}
        />
        <div className="profile-names">
          <h2>{displayName}</h2>
          <p className="profile-login">@{user.login}</p>
        </div>
        <a
          className="profile-github-btn"
          href={`https://github.com/${user.login}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          View Profile ↗
        </a>
      </div>

      {/* Meta: location / joined */}
      {(user.location || user.created_at) && (
        <div className="profile-meta">
          {user.location && <span>📍 {user.location}</span>}
          {user.created_at && (
            <span>
              🗓 Joined{' '}
              {new Date(user.created_at).toLocaleDateString('en-US', {
                month: 'short',
                year: 'numeric',
              })}
            </span>
          )}
        </div>
      )}

      {/* Bio */}
      {user.bio && <p className="profile-bio">{user.bio}</p>}

      {/* Stat boxes */}
      <div className="profile-stats">
        <div className="stat-box">
          <span className="stat-value">{user.followers ?? 0}</span>
          <span className="stat-label">Followers</span>
        </div>
        <div className="stat-box">
          <span className="stat-value">{user.public_repos ?? 0}</span>
          <span className="stat-label">Public Repos</span>
        </div>
        <div className="stat-box">
          <span className="stat-value">{user.following ?? 0}</span>
          <span className="stat-label">Following</span>
        </div>
        <div className="stat-box">
          <span className="stat-value">{totalStars}</span>
          <span className="stat-label">Total Stars</span>
        </div>
      </div>
    </>
  )
}

export default ProfileCard
