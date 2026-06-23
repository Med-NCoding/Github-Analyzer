import { useState } from 'react'
import {
  fetchGitHubUser,
  fetchGitHubRepos,
  fetchRepoContents,
  fetchRepoFileByUrl,
  fetchRepoReadme,
} from '../lib/github.js'
import { fetchMogVerdict } from '../lib/recruiterApi.js'

const MOG_ROLES = [
  'Software Engineering',
  'AI Engineering',
  'Machine Learning',
  'Data Science',
  'Frontend',
  'Backend',
  'Full-Stack',
]

const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 30 * 6

// Helper: select top N repos based on authenticity (forks), stars, size, and pushes
function selectTopRepos(repos, limit = 3) {
  return [...repos]
    .sort((a, b) => {
      if (a.fork !== b.fork) return a.fork ? 1 : -1
      if (b.stargazers_count !== a.stargazers_count) return b.stargazers_count - a.stargazers_count
      if (b.size !== a.size) return b.size - a.size
      return new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime()
    })
    .slice(0, limit)
}

// ── New Deep Evidence Profile & Scoring Scanner ───────────────────────
async function fetchEvidenceProfile(username, repos, targetRole, followers) {
  if (repos.length === 0) {
    return {
      detectedLanguages: [],
      detectedFrameworks: [],
      roleSpecificSignals: [],
      documentationQuality: { hasReadmeCount: 0, averageReadmeLength: 0, hasScreenshots: false, hasStructure: false, details: [] },
      deploymentSignals: { hasDeploymentLink: false, deploymentUrls: [], details: [] },
      activityConsistency: { recentPushedCount: 0, lastPushedDate: '', activeMonthsCount: 0, details: [] },
      topRepoStrength: { name: '', stars: 0, forks: 0, sizeKb: 0, hasReadme: false, hasDependencies: false, dependencyCount: 0, details: [] },
      projectDepth: { backendScore: 0, databaseScore: 0, mlScore: 0, devopsScore: 0, details: [] },
      missingSignals: [],
      publicSignal: { followers, totalStars: 0, totalForks: 0, score: 0 },
      scoreBreakdown: { positives: [], negatives: [] },
      totalStars: 0,
      totalForks: 0,
      topLang: '—',
      langCount: 0,
      langMap: {},
      recentCount: 0,
      top3: [],
      topRepoStars: 0,
      reposWithDesc: 0,
      reposWithHomepage: 0,
      nonForksCount: 0,
      frameworkCount: 0,
      calculatedScore: { total: 0, categories: {} }
    }
  }

  // 1. Core metadata metrics
  const totalStars = repos.reduce((s, r) => s + r.stargazers_count, 0)
  const totalForks = repos.reduce((s, r) => s + r.forks_count, 0)

  const langMap = {}
  repos.forEach(r => {
    if (r.language) langMap[r.language] = (langMap[r.language] || 0) + 1
  })
  const sortedLangs = Object.entries(langMap).sort((a, b) => b[1] - a[1])
  const topLang = sortedLangs[0]?.[0] ?? '—'
  const langCount = Object.keys(langMap).length

  // Calculate language breakdown with percentage
  const totalLangRepos = Object.values(langMap).reduce((a, b) => a + b, 0)
  const detectedLanguages = sortedLangs.map(([language, count]) => ({
    language,
    count,
    percentage: totalLangRepos > 0 ? Math.round((count / totalLangRepos) * 100) : 0
  }))

  const now = Date.now()
  const recentCount = repos.filter(r => now - new Date(r.pushed_at).getTime() < SIX_MONTHS_MS).length
  const nonForksCount = repos.filter(r => !r.fork).length
  const reposWithDesc = repos.filter(r => r.description && r.description.trim().length > 6).length
  const reposWithHomepage = repos.filter(r => r.homepage && r.homepage.trim() !== '').length

  // 2. Select top 3 repos for deep scanning
  const top3 = selectTopRepos(repos, 3)
  const topRepoStars = top3[0]?.stargazers_count ?? 0

  // 3. Scan each of the top 3 repos
  let readmeLengths = []
  let readmeCount = 0
  let screenshotFound = false
  let structureFound = false
  let deploymentUrls = []
  let devopsDetected = false
  let testingDetected = false
  let backendDetected = false
  let dbDetected = false
  let mlDetected = false
  let dependencyCount = 0
  let topRepoDetails = {}

  // We accumulate detected frameworks/tools in a Set
  const detectedFrameworks = new Set()
  const projectDepthDetails = []
  const deploymentDetails = []
  const documentationDetails = []
  
  // Basic framework/tool patterns to search in text
  const TEXT_KEYWORDS = [
    { name: 'React', pattern: /\breact(\.js)?\b/i },
    { name: 'Next.js', pattern: /\bnext\.?js\b/i },
    { name: 'Vue', pattern: /\bvue(\.js)?\b/i },
    { name: 'Angular', pattern: /\bangular\b/i },
    { name: 'Svelte', pattern: /\bsvelte\b/i },
    { name: 'Express', pattern: /\bexpress(\.js)?\b/i },
    { name: 'NestJS', pattern: /\bnestjs\b/i },
    { name: 'FastAPI', pattern: /\bfastapi\b/i },
    { name: 'Flask', pattern: /\bflask\b/i },
    { name: 'Django', pattern: /\bdjango\b/i },
    { name: 'Spring Boot', pattern: /\bspring\s*boot\b/i },
    { name: 'PostgreSQL', pattern: /\bpostgres(ql)?\b/i },
    { name: 'MongoDB', pattern: /\bmongodb\b|\bmongo\b/i },
    { name: 'MySQL', pattern: /\bmysql\b/i },
    { name: 'SQLite', pattern: /\bsqlite\b/i },
    { name: 'Redis', pattern: /\bredis\b/i },
    { name: 'Prisma', pattern: /\bprisma\b/i },
    { name: 'Drizzle', pattern: /\bdrizzle\b/i },
    { name: 'Docker', pattern: /\bdocker\b/i },
    { name: 'Kubernetes', pattern: /\bkubernetes\b|\bk8s\b/i },
    { name: 'AWS', pattern: /\baws\b|\bamazon web services\b/i },
    { name: 'Firebase', pattern: /\bfirebase\b/i },
    { name: 'Supabase', pattern: /\bsupabase\b/i },
    { name: 'GraphQL', pattern: /\bgraphql\b/i },
    { name: 'PyTorch', pattern: /\bpytorch\b/i },
    { name: 'TensorFlow', pattern: /\btensorflow\b/i },
    { name: 'scikit-learn', pattern: /\bscikit-?learn\b|\bsklearn\b/i },
    { name: 'pandas', pattern: /\bpandas\b/i },
    { name: 'NumPy', pattern: /\bnumpy\b/i },
    { name: 'LangChain', pattern: /\blangchain\b/i },
    { name: 'OpenAI', pattern: /\bopenai\b/i }
  ]

  // Go through top 3 repos in parallel
  await Promise.all(top3.map(async (repo, repoIdx) => {
    const owner = username
    const repoName = repo.name

    // A. Fetch file list in root
    const contents = await fetchRepoContents(owner, repoName)

    // B. Check for files
    const hasPkgJson = contents.find(c => c.name === 'package.json' && c.type === 'file')
    const hasReqTxt = contents.find(c => c.name === 'requirements.txt' && c.type === 'file')
    const hasPyProject = contents.find(c => c.name === 'pyproject.toml' && c.type === 'file')
    const hasDockerfile = contents.some(c => (c.name.toLowerCase() === 'dockerfile' || c.name.toLowerCase().startsWith('docker-compose')) && c.type === 'file')
    const hasGithubDir = contents.some(c => c.name === '.github' && c.type === 'dir')
    const hasIpynb = contents.some(c => c.name.endsWith('.ipynb') && c.type === 'file')

    if (hasDockerfile) {
      devopsDetected = true
      detectedFrameworks.add('Docker')
    }
    if (hasGithubDir) {
      devopsDetected = true
      detectedFrameworks.add('GitHub Actions')
    }
    if (hasIpynb) {
      mlDetected = true
      detectedFrameworks.add('Jupyter')
    }

    // C. Fetch & Parse dependencies
    let repoDepsCount = 0
    if (hasPkgJson && hasPkgJson.download_url) {
      const pkgContent = await fetchRepoFileByUrl(hasPkgJson.download_url)
      if (pkgContent) {
        try {
          const pkg = JSON.parse(pkgContent)
          const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) }
          const depKeys = Object.keys(allDeps)
          repoDepsCount += depKeys.length

          // Check standard libraries
          if (allDeps['react'] || allDeps['react-dom']) detectedFrameworks.add('React')
          if (allDeps['next']) detectedFrameworks.add('Next.js')
          if (allDeps['vue'] || allDeps['nuxt']) detectedFrameworks.add('Vue')
          if (allDeps['@angular/core']) detectedFrameworks.add('Angular')
          if (allDeps['svelte'] || allDeps['@sveltejs/kit']) detectedFrameworks.add('Svelte')
          if (allDeps['express']) { detectedFrameworks.add('Express'); backendDetected = true }
          if (allDeps['@nestjs/core']) { detectedFrameworks.add('NestJS'); backendDetected = true }
          if (allDeps['mongodb'] || allDeps['mongoose']) { detectedFrameworks.add('MongoDB'); dbDetected = true }
          if (allDeps['pg'] || allDeps['pg-promise']) { detectedFrameworks.add('PostgreSQL'); dbDetected = true }
          if (allDeps['mysql'] || allDeps['mysql2']) { detectedFrameworks.add('MySQL'); dbDetected = true }
          if (allDeps['prisma']) { detectedFrameworks.add('Prisma'); dbDetected = true }
          if (allDeps['drizzle-orm']) { detectedFrameworks.add('Drizzle'); dbDetected = true }
          if (allDeps['redis'] || allDeps['ioredis']) { detectedFrameworks.add('Redis'); dbDetected = true }
          if (allDeps['firebase'] || allDeps['firebase-admin']) { detectedFrameworks.add('Firebase') }
          if (allDeps['@supabase/supabase-js']) { detectedFrameworks.add('Supabase') }
          if (allDeps['graphql']) { detectedFrameworks.add('GraphQL') }
          if (depKeys.some(k => k.includes('jest') || k.includes('vitest') || k.includes('cypress') || k.includes('playwright') || k.includes('mocha') || k.includes('testing-library'))) {
            testingDetected = true
          }
        } catch (e) {
          console.warn("Failed to parse package.json for", repoName, e)
        }
      }
    }

    if (hasReqTxt && hasReqTxt.download_url) {
      const reqContent = await fetchRepoFileByUrl(hasReqTxt.download_url)
      if (reqContent) {
        const lines = reqContent.split('\n')
        const libs = lines.map(line => {
          const clean = line.trim().split('#')[0].trim()
          const match = clean.match(/^([a-zA-Z0-9_\-]+)/)
          return match ? match[1].toLowerCase() : ''
        }).filter(Boolean)
        repoDepsCount += libs.length

        if (libs.includes('tensorflow')) detectedFrameworks.add('TensorFlow')
        if (libs.includes('torch') || libs.includes('pytorch')) detectedFrameworks.add('PyTorch')
        if (libs.includes('scikit-learn') || libs.includes('sklearn')) detectedFrameworks.add('scikit-learn')
        if (libs.includes('pandas')) detectedFrameworks.add('pandas')
        if (libs.includes('numpy')) detectedFrameworks.add('NumPy')
        if (libs.includes('langchain')) detectedFrameworks.add('LangChain')
        if (libs.includes('openai')) detectedFrameworks.add('OpenAI')
        if (libs.includes('fastapi')) { detectedFrameworks.add('FastAPI'); backendDetected = true }
        if (libs.includes('flask')) { detectedFrameworks.add('Flask'); backendDetected = true }
        if (libs.includes('django')) { detectedFrameworks.add('Django'); backendDetected = true }
        if (libs.includes('psycopg2')) { detectedFrameworks.add('PostgreSQL'); dbDetected = true }
        if (libs.includes('pymongo')) { detectedFrameworks.add('MongoDB'); dbDetected = true }
        if (libs.includes('sqlalchemy')) { detectedFrameworks.add('SQLAlchemy'); dbDetected = true }
        if (libs.includes('pytest') || libs.includes('unittest') || libs.includes('mock')) {
          testingDetected = true
        }
      }
    }

    if (hasPyProject && hasPyProject.download_url) {
      const pyContent = await fetchRepoFileByUrl(hasPyProject.download_url)
      if (pyContent) {
        const pyProjectLibs = []
        const lines = pyContent.split('\n')
        let inDeps = false
        for (const line of lines) {
          if (line.trim().startsWith('[') && line.trim().includes('dependencies')) {
            inDeps = true
            continue
          }
          if (inDeps && line.trim().startsWith('[')) {
            inDeps = false
          }
          if (inDeps) {
            const match = line.match(/^\s*([a-zA-Z0-9_\-]+)\s*=/)
            if (match) {
              pyProjectLibs.push(match[1].toLowerCase())
            }
          }
        }
        repoDepsCount += pyProjectLibs.length

        if (pyProjectLibs.includes('tensorflow')) detectedFrameworks.add('TensorFlow')
        if (pyProjectLibs.includes('torch') || pyProjectLibs.includes('pytorch')) detectedFrameworks.add('PyTorch')
        if (pyProjectLibs.includes('scikit-learn') || pyProjectLibs.includes('sklearn')) detectedFrameworks.add('scikit-learn')
        if (pyProjectLibs.includes('pandas')) detectedFrameworks.add('pandas')
        if (pyProjectLibs.includes('numpy')) detectedFrameworks.add('NumPy')
        if (pyProjectLibs.includes('langchain')) detectedFrameworks.add('LangChain')
        if (pyProjectLibs.includes('openai')) detectedFrameworks.add('OpenAI')
        if (pyProjectLibs.includes('fastapi')) { detectedFrameworks.add('FastAPI'); backendDetected = true }
        if (pyProjectLibs.includes('flask')) { detectedFrameworks.add('Flask'); backendDetected = true }
        if (pyProjectLibs.includes('django')) { detectedFrameworks.add('Django'); backendDetected = true }
        if (pyProjectLibs.includes('pytest')) {
          testingDetected = true
        }
      }
    }

    dependencyCount += repoDepsCount

    // D. Fetch & Scan README content
    const readmeText = await fetchRepoReadme(owner, repoName)
    if (readmeText) {
      readmeCount++
      readmeLengths.push(readmeText.length)

      // Look for screenshots
      if (/!\[.*?\]\(.*?\)/.test(readmeText) || /<img.*?src=.*?>/i.test(readmeText) || /\.gif/i.test(readmeText)) {
        screenshotFound = true
      }

      // Look for headers suggesting structure (Setup, Install, Usage, Features)
      if (/#+\s*(setup|install|usage|features|get\s+started|run)/i.test(readmeText)) {
        structureFound = true
      }

      // Search keywords in README
      const textToSearch = `${repo.name} ${repo.description || ''} ${readmeText}`.toLowerCase()
      TEXT_KEYWORDS.forEach(kw => {
        if (kw.pattern.test(textToSearch)) {
          detectedFrameworks.add(kw.name)
        }
      })

      // Search deployment links in README
      const DEPLOYMENT_PATTERN = /\b(vercel\.app|netlify\.app|herokuapp\.com|github\.io|render\.com|railway\.app)\b/i
      const deploymentMatches = readmeText.match(/https?:\/\/[^\s\)]+/g)
      if (deploymentMatches) {
        deploymentMatches.forEach(url => {
          if (DEPLOYMENT_PATTERN.test(url)) {
            const cleanUrl = url.replace(/[\.,;\)\]]+$/, '')
            if (!deploymentUrls.includes(cleanUrl)) {
              deploymentUrls.push(cleanUrl)
            }
          }
        })
      }
    } else {
      const textToSearch = `${repo.name} ${repo.description || ''}`.toLowerCase()
      TEXT_KEYWORDS.forEach(kw => {
        if (kw.pattern.test(textToSearch)) {
          detectedFrameworks.add(kw.name)
        }
      })
    }

    if (repo.homepage && repo.homepage.trim() !== '') {
      if (!deploymentUrls.includes(repo.homepage.trim())) {
        deploymentUrls.push(repo.homepage.trim())
      }
    }

    if (repoIdx === 0) {
      topRepoDetails = {
        name: repo.name,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        sizeKb: repo.size,
        hasReadme: !!readmeText,
        hasDependencies: repoDepsCount > 0,
        dependencyCount: repoDepsCount,
        details: []
      }
    }
  }))

  const frameworkCount = detectedFrameworks.size

  // Collect topics
  repos.forEach(r => {
    if (r.topics) {
      r.topics.forEach(t => {
        const tag = t.toLowerCase()
        TEXT_KEYWORDS.forEach(kw => {
          if (kw.name.toLowerCase() === tag || tag.includes(kw.name.toLowerCase())) {
            detectedFrameworks.add(kw.name)
          }
        })
      })
    }
  })

  // 4. Role specific fit calculations
  const ROLE_MAP = {
    'Frontend': ['React', 'Next.js', 'Vue', 'Angular', 'Svelte', 'Tailwind CSS', 'Bootstrap', 'JavaScript', 'TypeScript', 'HTML', 'CSS'],
    'Backend': ['Node.js', 'Express', 'NestJS', 'FastAPI', 'Flask', 'Django', 'Spring Boot', 'Go', 'Rust', 'Java', 'Python', 'C#', 'PostgreSQL', 'MongoDB', 'MySQL', 'SQLite', 'Redis', 'Prisma', 'Drizzle', 'GraphQL', 'REST API', 'Docker'],
    'Full-Stack': ['React', 'Next.js', 'Vue', 'Svelte', 'Node.js', 'Express', 'NestJS', 'FastAPI', 'Flask', 'Django', 'PostgreSQL', 'MongoDB', 'MySQL', 'SQLite', 'Redis', 'Prisma', 'Drizzle', 'GraphQL', 'REST API', 'Docker'],
    'AI Engineering': ['Python', 'Jupyter', 'OpenAI', 'LangChain', 'Groq', 'Hugging Face', 'FastAPI', 'TensorFlow', 'PyTorch'],
    'Machine Learning': ['Python', 'Jupyter', 'TensorFlow', 'PyTorch', 'scikit-learn', 'pandas', 'NumPy'],
    'Data Science': ['Python', 'Jupyter', 'pandas', 'NumPy', 'matplotlib', 'R', 'SQL'],
    'Software Engineering': ['C', 'C++', 'Go', 'Rust', 'Java', 'Python', 'JavaScript', 'TypeScript', 'Docker', 'Git']
  }

  const roleKeywords = ROLE_MAP[targetRole] || ROLE_MAP['Software Engineering']
  const roleSpecificSignals = roleKeywords.filter(kw => {
    return detectedLanguages.some(l => l.language.toLowerCase() === kw.toLowerCase()) ||
           [...detectedFrameworks].some(f => f.toLowerCase() === kw.toLowerCase())
  })

  // 5. Build sub-metrics objects
  const avgReadmeLength = readmeLengths.length > 0 ? Math.round(readmeLengths.reduce((a,b)=>a+b,0) / readmeLengths.length) : 0
  if (readmeCount > 0) documentationDetails.push(`${readmeCount}/3 repos have READMEs`)
  if (avgReadmeLength > 0) documentationDetails.push(`Avg README length is ${avgReadmeLength} chars`)
  if (screenshotFound) documentationDetails.push(`README screenshots/demo media detected`)
  if (structureFound) documentationDetails.push(`Structured installation/usage docs`)

  const documentationQuality = {
    hasReadmeCount: readmeCount,
    averageReadmeLength: avgReadmeLength,
    hasScreenshots: screenshotFound,
    hasStructure: structureFound,
    details: documentationDetails
  }

  if (deploymentUrls.length > 0) deploymentDetails.push(`Found ${deploymentUrls.length} live deployment links`)
  if (reposWithHomepage > 0) deploymentDetails.push(`${reposWithHomepage} repos have GitHub homepage links`)
  const deploymentSignals = {
    hasDeploymentLink: deploymentUrls.length > 0,
    deploymentUrls,
    details: deploymentDetails
  }

  if (backendDetected) projectDepthDetails.push('Backend server or API configuration')
  if (dbDetected) projectDepthDetails.push('Database connection / ORM models')
  if (devopsDetected) projectDepthDetails.push('DevOps workflow / Docker infrastructure')
  if (mlDetected || detectedFrameworks.has('PyTorch') || detectedFrameworks.has('TensorFlow')) projectDepthDetails.push('ML notebooks / model training logs')
  if (testingDetected) projectDepthDetails.push('Testing suites configured')

  const activityDetails = []
  const lastPushedRepo = [...repos].sort((a,b)=> new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime())[0]
  const lastPushedDate = lastPushedRepo ? new Date(lastPushedRepo.pushed_at).toLocaleDateString() : 'N/A'
  activityDetails.push(`${recentCount} repos pushed to in the last 6 months`)
  if (lastPushedDate !== 'N/A') activityDetails.push(`Last update pushed on ${lastPushedDate}`)
  const activityConsistency = {
    recentPushedCount: recentCount,
    lastPushedDate,
    details: activityDetails
  }

  if (topRepoDetails.name) {
    if (topRepoDetails.stars > 0) topRepoDetails.details.push(`${topRepoDetails.stars} stargazers`)
    if (topRepoDetails.sizeKb > 0) topRepoDetails.details.push(`Repo size is ${Math.round(topRepoDetails.sizeKb / 1024 * 10) / 10} MB`)
    if (topRepoDetails.hasDependencies) topRepoDetails.details.push(`Tech stack includes dependencies (${topRepoDetails.dependencyCount})`)
  }

  const missingSignals = roleKeywords.filter(kw => {
    return !detectedLanguages.some(l => l.language.toLowerCase() === kw.toLowerCase()) &&
           ![...detectedFrameworks].some(f => f.toLowerCase() === kw.toLowerCase())
  })

  // 6. Compute scores out of 100
  // Project Depth (max 20)
  let projectDepth = 3 // base
  if (backendDetected) projectDepth += 4
  if (dbDetected) projectDepth += 4
  if (devopsDetected) projectDepth += 4
  if (mlDetected || detectedFrameworks.has('PyTorch') || detectedFrameworks.has('TensorFlow')) projectDepth += 4
  if (testingDetected) projectDepth += 2
  const totalSize = top3.reduce((acc, r) => acc + r.size, 0)
  if (totalSize > 10000) projectDepth += 2
  else if (totalSize > 1000) projectDepth += 1
  projectDepth = Math.min(20, projectDepth)

  // Stack Strength (max 15)
  let stackStrScore = 3
  stackStrScore += (langCount * 1.5)
  stackStrScore += (frameworkCount * 1.5)
  const stackStrength = Math.min(15, Math.round(stackStrScore))

  // Role Fit (max 15)
  let roleFit = 4
  if (roleSpecificSignals.length >= 3) roleFit = 15
  else if (roleSpecificSignals.length === 2) roleFit = 11
  else if (roleSpecificSignals.length === 1) roleFit = 7
  roleFit = Math.min(15, roleFit)

  // Documentation / README Quality (max 10)
  let readmeQualityVal = 1.0
  readmeQualityVal += (readmeCount * 1.5)
  readmeQualityVal += (readmeLengths.filter(l => l > 1000).length * 1.0)
  if (screenshotFound) readmeQualityVal += 1.5
  if (structureFound) readmeQualityVal += 1.0
  const readmeQuality = Math.min(10, Math.round(readmeQualityVal))

  // Activity / Consistency (max 10)
  let actScore = 1.0
  const lastPushDays = lastPushedRepo ? (now - new Date(lastPushedRepo.pushed_at).getTime()) / (1000 * 60 * 60 * 24) : 999
  if (lastPushDays <= 30) actScore += 4
  else if (lastPushDays <= 90) actScore += 3
  else if (lastPushDays <= 180) actScore += 2
  else if (lastPushDays <= 365) actScore += 1

  if (recentCount >= 3) actScore += 4
  else if (recentCount >= 1) actScore += 2

  if (repos.some(r => r.size > 500)) actScore += 1.5
  const activityConsistencyVal = Math.min(10, Math.round(actScore))

  // Deployment / Polish (max 10)
  let deployPolishScore = 1
  deployPolishScore += (repos.filter(r => r.homepage && r.homepage.trim() !== '').length * 2.0)
  if (deploymentUrls.length > 0 && !repos.some(r => r.homepage)) deployPolishScore += 2.0
  if (reposWithDesc === repos.length) deployPolishScore += 2.0
  else if (reposWithDesc > 0) deployPolishScore += 1.0
  if (repos.some(r => r.topics && r.topics.length > 0)) deployPolishScore += 1.0
  const deploymentPolish = Math.min(10, Math.round(deployPolishScore))

  // Top Repo Strength (max 10)
  let topRepoScore = 1
  if (top3[0] && !top3[0].fork) topRepoScore += 2
  if (topRepoStars >= 50) topRepoScore += 4
  else if (topRepoStars >= 10) topRepoScore += 3
  else if (topRepoStars >= 2) topRepoScore += 2
  else if (topRepoStars >= 1) topRepoScore += 1

  const topRepoForks = top3[0]?.forks_count ?? 0
  if (topRepoForks >= 5) topRepoScore += 2
  else if (topRepoForks >= 1) topRepoScore += 1

  const topRepoSize = top3[0]?.size ?? 0
  if (topRepoSize > 5000) topRepoScore += 2
  else if (topRepoSize > 1000) topRepoScore += 1

  if (topRepoDetails.dependencyCount >= 3) topRepoScore += 1
  const topRepoStrength = Math.min(10, topRepoScore)

  // Public Signal (max 10)
  let pubSigScore = 0
  if (followers >= 100) pubSigScore += 4
  else if (followers >= 20) pubSigScore += 3
  else if (followers >= 5) pubSigScore += 2
  else if (followers >= 1) pubSigScore += 1

  if (totalStars >= 50) pubSigScore += 4
  else if (totalStars >= 10) pubSigScore += 3
  else if (totalStars >= 2) pubSigScore += 2
  else if (totalStars >= 1) pubSigScore += 1

  if (totalForks >= 10) pubSigScore += 2
  else if (totalForks >= 1) pubSigScore += 1
  const publicSignal = Math.min(10, pubSigScore)

  const total = projectDepth + stackStrength + roleFit + readmeQuality + activityConsistencyVal + deploymentPolish + topRepoStrength + publicSignal

  // 7. Positive and Negative bullets for score breakdown
  const positives = []
  const negatives = []

  if (backendDetected) positives.push("React/API project evidence or Backend server framework detected")
  if (dbDetected) positives.push("Database/ORM integration found (Postgres/Mongo/Prisma)")
  if (devopsDetected) positives.push("DevOps tooling configured (Docker/CI-CD workflows)")
  if (mlDetected || detectedFrameworks.has('PyTorch') || detectedFrameworks.has('TensorFlow')) positives.push("Python/ML framework detected (PyTorch/TensorFlow/pandas)")
  if (screenshotFound) positives.push("README includes screenshots or demo graphics")
  if (readmeCount >= 2 && avgReadmeLength > 1000) positives.push("Strong README stack section & comprehensive docs")
  if (deploymentUrls.length > 0) positives.push("Live deployed application link or demo found")
  if (roleSpecificSignals.length >= 3) positives.push(`Tech stack aligns strongly with target role: ${targetRole}`)
  if (topRepoStars >= 5) positives.push(`Top repository has organic public signals (★${topRepoStars} stars)`)
  if (recentCount >= 2) positives.push("Consistent repository activity in last 6 months")

  if (!backendDetected && !dbDetected) negatives.push("No backend server or database evidence detected")
  if (deploymentUrls.length === 0) negatives.push("No deployment or live hosting links found")
  if (readmeCount < 2) negatives.push("Weak documentation: missing detailed READMEs")
  if (!devopsDetected) negatives.push("No DevOps, Docker, or CI/CD config files detected")
  if (lastPushDays > 180) negatives.push("Low recent repository activity")
  if (roleSpecificSignals.length < 2) negatives.push(`Low tech stack alignment with ${targetRole} requirements`)
  if (topRepoSize < 200 && dependencyCount < 3) negatives.push("Repository contents look like static pages or shallow landing pages")

  if (positives.length === 0) positives.push("Basic GitHub profile metadata present")
  if (negatives.length === 0) negatives.push("No critical missing signals identified")

  return {
    detectedLanguages,
    detectedFrameworks: [...detectedFrameworks].sort(),
    roleSpecificSignals,
    documentationQuality,
    deploymentSignals,
    activityConsistency,
    topRepoStrength: topRepoDetails,
    projectDepth: {
      backendScore: backendDetected ? 4 : 0,
      databaseScore: dbDetected ? 4 : 0,
      mlScore: mlDetected ? 4 : 0,
      devopsScore: devopsDetected ? 4 : 0,
      details: projectDepthDetails
    },
    missingSignals,
    publicSignal: {
      followers,
      totalStars,
      totalForks,
      score: publicSignal
    },
    scoreBreakdown: { positives: positives.slice(0, 4), negatives: negatives.slice(0, 4) },
    totalStars,
    totalForks,
    topLang,
    langCount,
    langMap,
    recentCount,
    top3,
    topRepoStars,
    reposWithDesc,
    reposWithHomepage,
    nonForksCount,
    frameworkCount,
    calculatedScore: {
      total,
      categories: {
        projectDepth,
        stackStrength,
        roleFit,
        readmeQuality,
        activityConsistency: activityConsistencyVal,
        deploymentPolish,
        topRepoStrength,
        publicSignal
      }
    }
  }
}

// ── Stat box ──────────────────────────────────────────────────
function Stat({ value, label }) {
  return (
    <div className="mog-stat">
      <span className="mog-stat-value">{typeof value === 'number' ? value.toLocaleString() : value}</span>
      <span className="mog-stat-label">{label}</span>
    </div>
  )
}

// ── Score ring display ─────────────────────────────────────────
function ScoreRing({ score, login, isWinner }) {
  return (
    <div className={`mog-score-ring ${isWinner ? 'mog-score-ring--winner' : ''}`}>
      <span className="mog-score-number">{score}</span>
      <span className="mog-score-100">/100</span>
      <span className="mog-score-login">@{login}</span>
    </div>
  )
}

// ── Category comparison row ────────────────────────────────────
function CategoryRow({ label, s1, s2, max }) {
  const pct1 = Math.round((s1 / max) * 100)
  const pct2 = Math.round((s2 / max) * 100)
  const winner = s1 > s2 ? 'left' : s2 > s1 ? 'right' : 'tie'
  return (
    <div className="mog-cat-row">
      <div className="mog-cat-bar-wrap">
        <div
          className={`mog-cat-bar mog-cat-bar--left ${winner === 'left' ? 'mog-cat-bar--win' : ''}`}
          style={{ width: `${pct1}%` }}
        />
      </div>
      <div className="mog-cat-label">{label}</div>
      <div className="mog-cat-bar-wrap">
        <div
          className={`mog-cat-bar mog-cat-bar--right ${winner === 'right' ? 'mog-cat-bar--win' : ''}`}
          style={{ width: `${pct2}%` }}
        />
      </div>
    </div>
  )
}

// ── Player column (profile + metrics + top repos) ─────────────
function MogPlayerCard({ user, repos, metrics, side, isWinner }) {
  return (
    <div className={`mog-player-col mog-player-col--${side}${isWinner ? ' mog-player-col--winner' : ''}`}>
      <div className="card mog-profile-card" style={{ position: 'relative' }}>
        {isWinner && <div className="mog-leader-badge">👑 LEADER</div>}
        <div className="mog-profile-top">
          <img className="mog-profile-avatar" src={user.avatar_url} alt={user.login} />
          <div className="mog-profile-names">
            {user.name && <h3 className="mog-profile-name">{user.name}</h3>}
            <p className="mog-profile-login">@{user.login}</p>
          </div>
        </div>
        {user.bio && <p className="mog-profile-bio">{user.bio}</p>}
        {user.location && <p className="mog-profile-location">📍 {user.location}</p>}
        <div className="mog-profile-stats">
          <Stat value={user.followers} label="Followers" />
          <Stat value={user.public_repos} label="Repos" />
          <Stat value={user.following} label="Following" />
        </div>
      </div>

      <div className="card mog-metrics-card">
        <p className="mog-metrics-title">Repo Metrics</p>
        <div className="mog-profile-stats">
          <Stat value={repos.length} label="Analyzed" />
          <Stat value={metrics.totalStars} label="Stars" />
          <Stat value={metrics.totalForks} label="Forks" />
          <Stat value={metrics.topLang} label="Top Lang" />
          <Stat value={metrics.recentCount} label="Active (6mo)" />
        </div>
      </div>

      {metrics.top3.length > 0 && (
        <div className="card mog-top-repos-card">
          <p className="mog-metrics-title">Top Repos (Enriched)</p>
          <div className="mog-top-repos-list">
            {metrics.top3.map(repo => (
              <a
                key={repo.id}
                href={repo.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mog-repo-item"
              >
                <span className="mog-repo-name">{repo.name}</span>
                <span className="mog-repo-meta">
                  {repo.language && <span className="repo-lang">{repo.language}</span>}
                  <span className="mog-repo-stars">★ {repo.stargazers_count}</span>
                </span>
                {repo.description && <span className="mog-repo-desc">{repo.description}</span>}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────
export default function MogShowdown({ onBack }) {
  const [user1, setUser1] = useState('')
  const [user2, setUser2] = useState('')
  const [role, setRole]   = useState(MOG_ROLES[0])

  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [data, setData]       = useState(null)

  const [aiVerdict, setAiVerdict] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState(null)

  async function handleRunShowdown() {
    const u1 = user1.trim()
    const u2 = user2.trim()
    if (!u1 || !u2) { setError('Please enter both GitHub usernames.'); return }

    setLoading(true); setError(null); setData(null)
    setAiVerdict(null); setAiLoading(false); setAiError(null)

    let calculatedData = null

    try {
      const [p1, p2, r1, r2] = await Promise.all([
        fetchGitHubUser(u1), fetchGitHubUser(u2),
        fetchGitHubRepos(u1), fetchGitHubRepos(u2),
      ])
      
      const m1 = await fetchEvidenceProfile(u1, r1, role, p1.followers)
      const m2 = await fetchEvidenceProfile(u2, r2, role, p2.followers)
      const s1 = m1.calculatedScore
      const s2 = m2.calculatedScore
      
      calculatedData = { p1, p2, r1, r2, m1, m2, s1, s2, role }
      setData(calculatedData)
    } catch (err) {
      setError(err.message || 'Could not load one or both profiles.')
      setLoading(false)
      return
    }

    setLoading(false)

    // Trigger AI verdict asynchronously in the background
    if (calculatedData) {
      setAiLoading(true)
      try {
        const { r1, r2, ...compactData } = calculatedData
        const verdictRes = await fetchMogVerdict(compactData)
        setAiVerdict(verdictRes)
      } catch (err) {
        console.error('AI Verdict failed:', err.message)
        setAiError(err.message || 'Failed to generate AI verdict.')
      } finally {
        setAiLoading(false)
      }
    }
  }


  // Derived verdict
  const verdict = data
    ? data.s1.total - data.s2.total > 5
      ? `🏆 @${data.p1.login} is mogging`
      : data.s2.total - data.s1.total > 5
        ? `🏆 @${data.p2.login} is mogging`
        : '🤝 Close Match'
    : null

  const CAT_MAX = {
    projectDepth: 20,
    stackStrength: 15,
    roleFit: 15,
    readmeQuality: 10,
    activityConsistency: 10,
    deploymentPolish: 10,
    topRepoStrength: 10,
    publicSignal: 10
  }
  const CAT_LABELS = {
    projectDepth: 'Project Depth',
    stackStrength: 'Stack Strength',
    roleFit: 'Role Fit',
    readmeQuality: 'README Quality',
    activityConsistency: 'Consistency',
    deploymentPolish: 'Deployment & Polish',
    topRepoStrength: 'Top Repo Strength',
    publicSignal: 'Public Signal',
  }

  return (
    <div className="app">
      <button className="mog-back-btn" onClick={onBack}>← Back to Analyzer</button>

      <div className="mog-hero">
        <div className="mog-hero-badge">⚔️ Battle Mode</div>
        <h1 className="mog-hero-title"><span className="mog-hero-accent">MOG</span> Showdown</h1>
        <p className="mog-hero-main">Wanna see if your GitHub profile mogs someone else's?</p>
        <p className="mog-hero-sub">Enter two profiles, pick a target role, and find out who has the stronger developer portfolio.</p>
      </div>

      <div className="card mog-form-card">
        <div className="mog-form-grid">
          <div className="field">
            <label htmlFor="mog-user1">Your GitHub username</label>
            <input id="mog-user1" type="text" placeholder="e.g. torvalds" value={user1}
              onChange={e => { setUser1(e.target.value); setError(null); setData(null) }}
              onKeyDown={e => e.key === 'Enter' && handleRunShowdown()} disabled={loading} />
          </div>
          <div className="mog-vs-divider" aria-hidden="true">VS</div>
          <div className="field">
            <label htmlFor="mog-user2">Opponent's GitHub username</label>
            <input id="mog-user2" type="text" placeholder="e.g. gvanrossum" value={user2}
              onChange={e => { setUser2(e.target.value); setError(null); setData(null) }}
              onKeyDown={e => e.key === 'Enter' && handleRunShowdown()} disabled={loading} />
          </div>
        </div>
        <div className="field mog-role-field">
          <label htmlFor="mog-role">Target role</label>
          <select id="mog-role" value={role} onChange={e => setRole(e.target.value)} disabled={loading}>
            {MOG_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        {error && <p className="mog-status-error">⚠️ {error}</p>}
        <button className="mog-run-btn" onClick={handleRunShowdown} disabled={loading}>
          {loading ? 'Loading…' : 'Run Showdown ⚔️'}
        </button>
      </div>

      {loading && <p className="status-msg" style={{ textAlign: 'center' }}>Fetching profiles and repos…</p>}

      {data && (
        <>
          {/* ── Score rings ── */}
          <div className="card mog-score-card">
            <p className="mog-metrics-title" style={{ textAlign: 'center', marginBottom: '20px' }}>
              Portfolio Score — {data.role}
            </p>
            <div className="mog-score-row">
              <ScoreRing score={data.s1.total} login={data.p1.login} isWinner={data.s1.total > data.s2.total} />
              <div className="mog-score-divider">vs</div>
              <ScoreRing score={data.s2.total} login={data.p2.login} isWinner={data.s2.total > data.s1.total} />
            </div>

            {/* ── Category comparison bars ── */}
            <div className="mog-categories">
              <div className="mog-cat-header">
                <span>@{data.p1.login}</span>
                <span></span>
                <span>@{data.p2.login}</span>
              </div>
              {Object.keys(CAT_LABELS).map(key => (
                <CategoryRow
                  key={key}
                  label={CAT_LABELS[key]}
                  s1={data.s1.categories[key]}
                  s2={data.s2.categories[key]}
                  max={CAT_MAX[key]}
                />
              ))}
            </div>

            {/* ── Evidence Breakdown ── */}
            <div className="mog-evidence-breakdown-section">
              <p className="mog-evidence-title" style={{ textAlign: 'center', marginTop: '28px', marginBottom: '16px', fontWeight: '700' }}>
                Evidence Profile Breakdown
              </p>
              <div className="mog-evidence-grid">
                <div className="mog-evidence-col">
                  <h4 className="mog-evidence-col-title">@{data.p1.login} Details</h4>
                  <ul className="mog-evidence-list">
                    {data.m1.scoreBreakdown.positives.map((item, idx) => (
                      <li key={idx} className="mog-evidence-item mog-evidence-item--pos">✓ {item}</li>
                    ))}
                    {data.m1.scoreBreakdown.negatives.map((item, idx) => (
                      <li key={idx} className="mog-evidence-item mog-evidence-item--neg">✗ {item}</li>
                    ))}
                  </ul>
                </div>
                <div className="mog-evidence-col">
                  <h4 className="mog-evidence-col-title">@{data.p2.login} Details</h4>
                  <ul className="mog-evidence-list">
                    {data.m2.scoreBreakdown.positives.map((item, idx) => (
                      <li key={idx} className="mog-evidence-item mog-evidence-item--pos">✓ {item}</li>
                    ))}
                    {data.m2.scoreBreakdown.negatives.map((item, idx) => (
                      <li key={idx} className="mog-evidence-item mog-evidence-item--neg">✗ {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* ── Verdict ── */}
            <div className={`mog-verdict ${verdict === '🤝 Close Match' ? 'mog-verdict--tie' : 'mog-verdict--win'}`}>{verdict}</div>
          </div>

          {/* ── AI final verdict ── */}
          {aiLoading && (
            <div className="card mog-ai-loading">
              <div className="mog-pulse-loader"></div>
              <p className="mog-ai-loading-text">⚔️ Consulting the Groq AI oracle for the final verdict...</p>
            </div>
          )}

          {aiError && (
            <div className="mog-status-error" style={{ margin: '12px 0 20px' }}>
              ⚠️ AI Verdict failed: {aiError}. Displaying raw portfolio scores instead.
            </div>
          )}

          {aiVerdict && (
            <div className="card mog-ai-card">
              <div className="mog-ai-header">
                <div className="mog-ai-badge-row">
                  <span className="mog-ai-badge">🤖 AI SHOWDOWN VERDICT</span>
                  <span className="mog-ai-role-badge">Role: {data.role}</span>
                </div>
                
                <h2 className="mog-ai-winner-line">
                  {data.s1.total - data.s2.total > 5 
                    ? `@${data.p1.login} MOGS @${data.p2.login}` 
                    : data.s2.total - data.s1.total > 5 
                      ? `@${data.p2.login} MOGS @${data.p1.login}` 
                      : `🤝 CLOSE SHOWDOWN TIE`}
                </h2>

                <div className="mog-ai-score-badges">
                  <div className={`mog-ai-score-pill ${data.s1.total >= data.s2.total ? 'mog-ai-score-pill--leader' : ''}`}>
                    <span className="mog-score-pill-login">@{data.p1.login}</span>
                    <span className="mog-score-pill-val">{data.s1.total}</span>
                  </div>
                  <div className="mog-ai-score-vs">VS</div>
                  <div className={`mog-ai-score-pill ${data.s2.total >= data.s1.total ? 'mog-ai-score-pill--leader' : ''}`}>
                    <span className="mog-score-pill-login">@{data.p2.login}</span>
                    <span className="mog-score-pill-val">{data.s2.total}</span>
                  </div>
                </div>
              </div>

              <div className="mog-ai-body">
                <div className="mog-ai-section">
                  <h4 className="mog-ai-sec-title">🏆 Verdict Analysis</h4>
                  <p className="mog-ai-text">{aiVerdict.whyWinnerWins}</p>
                </div>
                
                <div className="mog-ai-split-grid">
                  <div className="mog-ai-split-box">
                    <h5 className="mog-ai-split-title">💪 @{data.p1.login} Strengths</h5>
                    {aiVerdict.user1?.strengths && aiVerdict.user1.strengths.length > 0 ? (
                      <ul className="mog-ai-list">
                        {aiVerdict.user1.strengths.map((str, idx) => <li key={idx} className="mog-ai-list-item">{str}</li>)}
                      </ul>
                    ) : <p className="mog-ai-text">No standout strengths visible.</p>}
                  </div>
                  <div className="mog-ai-split-box">
                    <h5 className="mog-ai-split-title">💪 @{data.p2.login} Strengths</h5>
                    {aiVerdict.user2?.strengths && aiVerdict.user2.strengths.length > 0 ? (
                      <ul className="mog-ai-list">
                        {aiVerdict.user2.strengths.map((str, idx) => <li key={idx} className="mog-ai-list-item">{str}</li>)}
                      </ul>
                    ) : <p className="mog-ai-text">No standout strengths visible.</p>}
                  </div>
                </div>

                <div className="mog-ai-split-grid">
                  <div className="mog-ai-split-box mog-ai-split-box--weakness">
                    <h5 className="mog-ai-split-title">⚠️ @{data.p1.login} Weaknesses</h5>
                    {aiVerdict.user1?.weaknesses && aiVerdict.user1.weaknesses.length > 0 ? (
                      <div className="mog-ai-weakness-list">
                        {aiVerdict.user1.weaknesses.map((w, idx) => (
                          <div key={idx} className="mog-ai-weakness-item">
                            <p className="mog-weakness-title"><strong>{w.weakness}</strong></p>
                            <p className="mog-weakness-detail">🔍 <strong>Evidence:</strong> {w.evidence}</p>
                            <p className="mog-weakness-detail">🎯 <strong>Why it matters:</strong> {w.whyItMatters}</p>
                            <p className="mog-weakness-fix">🛠️ <strong>Fix:</strong> {w.fix}</p>
                          </div>
                        ))}
                      </div>
                    ) : <p className="mog-ai-text">No critical weaknesses identified.</p>}
                  </div>
                  <div className="mog-ai-split-box mog-ai-split-box--weakness">
                    <h5 className="mog-ai-split-title">⚠️ @{data.p2.login} Weaknesses</h5>
                    {aiVerdict.user2?.weaknesses && aiVerdict.user2.weaknesses.length > 0 ? (
                      <div className="mog-ai-weakness-list">
                        {aiVerdict.user2.weaknesses.map((w, idx) => (
                          <div key={idx} className="mog-ai-weakness-item">
                            <p className="mog-weakness-title"><strong>{w.weakness}</strong></p>
                            <p className="mog-weakness-detail">🔍 <strong>Evidence:</strong> {w.evidence}</p>
                            <p className="mog-weakness-detail">🎯 <strong>Why it matters:</strong> {w.whyItMatters}</p>
                            <p className="mog-weakness-fix">🛠️ <strong>Fix:</strong> {w.fix}</p>
                          </div>
                        ))}
                      </div>
                    ) : <p className="mog-ai-text">No critical weaknesses identified.</p>}
                  </div>
                </div>

                <div className="mog-ai-split-grid">
                  <div className="mog-ai-split-box">
                    <h5 className="mog-ai-split-title">🚀 @{data.p1.login} Target Action Plan</h5>
                    {aiVerdict.user1?.missingSignals && aiVerdict.user1.missingSignals.length > 0 && (
                      <div className="mog-ai-signals-list">
                        <strong>Missing Signals:</strong>
                        <div className="mog-ai-badges-container">
                          {aiVerdict.user1.missingSignals.map((sig, idx) => <span key={idx} className="mog-ai-signal-badge">{sig}</span>)}
                        </div>
                      </div>
                    )}
                    <p className="mog-ai-text" style={{ marginTop: '8px' }}>
                      📚 <strong>Next to learn:</strong> {aiVerdict.user1?.nextStackToLearn || 'No suggestions needed.'}
                    </p>
                    <p className="mog-ai-text">
                      💡 <strong>Next Project:</strong> {aiVerdict.user1?.nextProjectRecommendation || 'No suggestions needed.'}
                    </p>
                  </div>
                  
                  <div className="mog-ai-split-box">
                    <h5 className="mog-ai-split-title">🚀 @{data.p2.login} Target Action Plan</h5>
                    {aiVerdict.user2?.missingSignals && aiVerdict.user2.missingSignals.length > 0 && (
                      <div className="mog-ai-signals-list">
                        <strong>Missing Signals:</strong>
                        <div className="mog-ai-badges-container">
                          {aiVerdict.user2.missingSignals.map((sig, idx) => <span key={idx} className="mog-ai-signal-badge">{sig}</span>)}
                        </div>
                      </div>
                    )}
                    <p className="mog-ai-text" style={{ marginTop: '8px' }}>
                      📚 <strong>Next to learn:</strong> {aiVerdict.user2?.nextStackToLearn || 'No suggestions needed.'}
                    </p>
                    <p className="mog-ai-text">
                      💡 <strong>Next Project:</strong> {aiVerdict.user2?.nextProjectRecommendation || 'No suggestions needed.'}
                    </p>
                  </div>
                </div>

                <div className="mog-ai-section">
                  <h4 className="mog-ai-sec-title">📈 Comeback Plan</h4>
                  <p className="mog-ai-text">{aiVerdict.comebackPlan}</p>
                </div>

                <div className="mog-ai-share-box">
                  <div className="mog-ai-tweet-preview">
                    <span className="mog-ai-share-label">Share Verdict on X:</span>
                    <p className="mog-tweet-preview-text">"{aiVerdict.twitterShareLine}"</p>
                  </div>
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(aiVerdict.twitterShareLine)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mog-share-btn"
                  >
                    Post on X 🐦
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* ── Profile + repo detail ── */}
          <div className="mog-results-grid">
            <MogPlayerCard user={data.p1} repos={data.r1} metrics={data.m1} side="left" isWinner={data.s1.total > data.s2.total} />
            <div className="mog-results-vs" aria-hidden="true">VS</div>
            <MogPlayerCard user={data.p2} repos={data.r2} metrics={data.m2} side="right" isWinner={data.s2.total > data.s1.total} />
          </div>
        </>
      )}
    </div>
  )
}
