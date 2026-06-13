function ProfileCard({ user }) {
  if (!user) return null

  const displayName = user.name || user.login

  return (
    <div className="profile-card">
      <img
        className="profile-avatar"
        src={user.avatar_url}
        alt={`${displayName} avatar`}
        width={120}
        height={120}
      />
      <div className="profile-info">
        <h2>{displayName}</h2>
        <p className="profile-login">{user.login}</p>
        {user.bio && <p className="profile-bio">{user.bio}</p>}
        <div className="profile-stats">
          <span>{user.followers} followers</span>
          <span>{user.public_repos} public repos</span>
        </div>
      </div>
    </div>
  )
}

export default ProfileCard
