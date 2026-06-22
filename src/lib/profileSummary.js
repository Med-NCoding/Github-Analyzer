const README_PREVIEW_LENGTH = 400
const DEPLOYMENT_PATTERN = /\b(vercel\.app|netlify\.app|herokuapp\.com|github\.io|render\.com|railway\.app)\b/i
const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 30 * 6

function getTopLanguages(languageCounts) {
  return Object.entries(languageCounts)
    .filter(([lang]) => lang && lang !== 'null')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([lang, count]) => ({ language: lang, count }))
}

function buildTopRepos(enrichedRepos) {
  return [...enrichedRepos]
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 10)
    .map((repo) => ({
      name: repo.name,
      description: repo.description || '',
      language: repo.language || 'Unknown',
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      topics: repo.topics || [],
      readmePreview: repo.readmeContent
        ? repo.readmeContent.slice(0, README_PREVIEW_LENGTH)
        : '',
      url: repo.html_url,
    }))
}

function buildProfileSignals(repos, enrichedRepos, detectedStack) {
  const now = Date.now()
  const hasDescriptions = repos.some((repo) => Boolean(repo.description))
  const hasReadmes = enrichedRepos.some((repo) => Boolean(repo.readmeContent))
  const hasPinnedStyleProjects = repos.some(
    (repo) => repo.stargazers_count >= 3 || (repo.description && repo.stargazers_count >= 1)
  )
  const hasDeploymentLinks = enrichedRepos.some((repo) =>
    DEPLOYMENT_PATTERN.test(repo.readmeContent || '')
  )
  const hasRecentActivity = repos.some((repo) => {
    const updated = new Date(repo.updated_at).getTime()
    return now - updated < SIX_MONTHS_MS
  })
  const hasMultipleStacks = detectedStack.length >= 3

  return {
    hasPinnedStyleProjects,
    hasDescriptions,
    hasReadmes,
    hasDeploymentLinks,
    hasRecentActivity,
    hasMultipleStacks,
  }
}

export function buildProfileSummary({
  user,
  repos,
  enrichedRepos,
  languageCounts,
  detectedStack,
  targetRole,
}) {
  const totalStars = repos.reduce((sum, repo) => sum + repo.stargazers_count, 0)
  const totalForks = repos.reduce((sum, repo) => sum + repo.forks_count, 0)

  return {
    username: user.login,
    name: user.name || user.login,
    bio: user.bio || '',
    targetRole,
    totalRepos: repos.length,
    totalStars,
    totalForks,
    topLanguages: getTopLanguages(languageCounts),
    detectedStack,
    topRepos: buildTopRepos(enrichedRepos),
    profileSignals: buildProfileSignals(repos, enrichedRepos, detectedStack),
  }
}
