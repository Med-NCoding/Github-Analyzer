/**
 * Forensic Scanner
 * ─────────────────────────────────────────────────────────────────────
 * Scans already-fetched enrichedRepos (README text, topics, language,
 * description, name) and the detectedStack array to produce structured
 * ForensicFlag objects — one per matched category.
 *
 * Zero extra API calls: everything runs against data already in memory.
 *
 * ForensicFlag shape:
 * {
 *   id:       string,           // stable identifier
 *   category: string,           // human-readable resume category
 *   keywords: string[],         // ATS keywords embedded in bullets
 *   evidence: string[],         // plain-language proof strings
 *   repos:    RepoRef[],        // top 3 repos that triggered this flag
 * }
 *
 * RepoRef shape:
 * { name: string, url: string, description: string, language: string }
 */

// ── Detection rules ──────────────────────────────────────────────────
const RULES = [
  {
    id: 'cicd',
    category: 'CI/CD & DevOps Automation',
    keywords: ['GitHub Actions', 'CI/CD pipelines', 'automated deployment', 'workflow automation'],
    patterns: {
      topics:  ['ci', 'cd', 'github-actions', 'cicd', 'devops', 'pipeline', 'actions'],
      readme:  [/\.github\/workflows/i, /github\s+actions/i, /ci\/cd/i, /jenkinsfile/i,
                /travis[\s-]ci/i, /circle[\s-]ci/i, /automated?\s+(deploy|pipeline|build|release)/i,
                /workflow\s+automation/i, /gitlab[\s-]ci/i],
      name:    [/workflow/i, /pipeline/i, /cicd/i, /devops/i, /actions/i],
      desc:    [/github actions/i, /ci\/cd/i, /automated deploy/i],
    },
  },
  {
    id: 'cloud',
    category: 'Cloud Infrastructure (AWS / GCP / Azure)',
    keywords: ['AWS', 'GCP', 'Azure', 'cloud infrastructure', 'serverless functions', 'S3', 'Lambda'],
    patterns: {
      topics:  ['aws', 'gcp', 'azure', 'cloud', 'serverless', 'lambda', 's3', 'ec2', 'cloudflare'],
      readme:  [/boto3/i, /@aws-sdk/i, /google-cloud/i, /azure-sdk/i, /aws\s+lambda/i,
                /amazon\s+s3/i, /ec2/i, /cloud\s+functions/i, /firebase/i, /supabase/i,
                /cloudflare\s+workers/i, /vercel\s+edge/i],
      stack:   ['AWS', 'GCP', 'Azure', 'boto3', 'Serverless', 'Firebase', 'Supabase', 'Cloudflare'],
      name:    [/cloud/i, /serverless/i, /lambda/i],
    },
  },
  {
    id: 'database',
    category: 'Database Architecture & Query Optimization',
    keywords: ['SQL optimization', 'database design', 'NoSQL', 'ORM', 'data modeling', 'schema migrations'],
    patterns: {
      topics:  ['database', 'sql', 'postgresql', 'mongodb', 'redis', 'prisma',
                'mongoose', 'orm', 'sqlite', 'mysql', 'nosql'],
      readme:  [/postgresql/i, /mysql/i, /sqlite/i, /mongodb/i, /redis/i, /prisma/i,
                /mongoose/i, /sequelize/i, /typeorm/i, /migration/i, /schema/i,
                /query\s+optim/i, /database\s+design/i, /drizzle/i, /supabase/i],
      stack:   ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Prisma', 'Mongoose', 'SQLite', 'Drizzle'],
      name:    [/db/i, /database/i, /mongo/i, /postgres/i, /redis/i],
    },
  },
  {
    id: 'testing',
    category: 'Automated Testing & QA',
    keywords: ['unit testing', 'integration testing', 'E2E testing', 'test coverage', 'TDD'],
    patterns: {
      topics:  ['testing', 'jest', 'pytest', 'cypress', 'tdd', 'bdd', 'qa', 'vitest', 'playwright'],
      readme:  [/jest/i, /pytest/i, /cypress/i, /mocha/i, /vitest/i, /test\s+coverage/i,
                /unit\s+test/i, /integration\s+test/i, /e2e\s+test/i, /playwright/i,
                /supertest/i, /testing\s+library/i],
      stack:   ['Jest', 'Pytest', 'Cypress', 'Vitest', 'Playwright', 'Mocha'],
      name:    [/test/i, /spec/i, /qa/i],
    },
  },
  {
    id: 'containers',
    category: 'Containerization & Orchestration',
    keywords: ['Docker', 'Kubernetes', 'containerized deployment', 'microservices', 'container orchestration'],
    patterns: {
      topics:  ['docker', 'kubernetes', 'k8s', 'containerization', 'microservices', 'helm'],
      readme:  [/dockerfile/i, /docker-compose/i, /docker\s+container/i,
                /kubernetes/i, /\bk8s\b/i, /helm\s+chart/i, /containeriz/i],
      stack:   ['Docker', 'Kubernetes', 'Helm'],
      name:    [/docker/i, /kubernetes/i, /k8s/i, /container/i],
    },
  },
  {
    id: 'ml',
    category: 'Machine Learning & AI Engineering',
    keywords: ['model training', 'ML pipelines', 'NLP', 'neural networks', 'data preprocessing', 'LLM integration'],
    patterns: {
      topics:  ['machine-learning', 'ml', 'ai', 'deep-learning', 'nlp',
                'data-science', 'tensorflow', 'pytorch', 'llm', 'generative-ai'],
      readme:  [/tensorflow/i, /pytorch/i, /scikit[\s-]learn/i, /sklearn/i,
                /model\s+train/i, /neural\s+network/i, /\bnlp\b/i, /transformers/i,
                /hugging\s*face/i, /langchain/i, /openai/i, /\bllm\b/i, /\brag\b/i],
      stack:   ['TensorFlow', 'PyTorch', 'scikit-learn', 'Keras', 'LangChain', 'OpenAI'],
      name:    [/ml/i, /model/i, /nlp/i, /ai[_-]/i, /llm/i],
    },
  },
  {
    id: 'api',
    category: 'RESTful API & Backend Architecture',
    keywords: ['REST APIs', 'GraphQL', 'backend architecture', 'API design', 'authentication', 'middleware'],
    patterns: {
      topics:  ['api', 'rest', 'graphql', 'backend', 'fastapi', 'express', 'flask', 'django', 'nestjs'],
      readme:  [/rest\s*api/i, /graphql/i, /fastapi/i, /\bexpress/i, /\bflask\b/i,
                /\bdjango\b/i, /\bnestjs\b/i, /\bendpoint/i, /swagger/i,
                /openapi/i, /jwt/i, /oauth/i, /middleware/i],
      stack:   ['FastAPI', 'Express', 'Flask', 'Django', 'NestJS', 'GraphQL', 'Node.js'],
      name:    [/api/i, /backend/i, /server/i],
    },
  },
  {
    id: 'frontend',
    category: 'Modern Frontend Development',
    keywords: ['React', 'component architecture', 'state management', 'responsive design', 'TypeScript'],
    patterns: {
      topics:  ['react', 'vue', 'angular', 'nextjs', 'frontend', 'typescript', 'tailwind', 'svelte'],
      readme:  [/\breact\b/i, /next\.js/i, /\bvue\b/i, /\bangular\b/i,
                /typescript/i, /tailwind/i, /redux/i, /zustand/i,
                /\bsvelte\b/i, /responsive\s+design/i, /component/i],
      stack:   ['React', 'Vue', 'Angular', 'Next.js', 'TypeScript', 'Tailwind CSS', 'Svelte'],
      name:    [/frontend/i, /ui/i, /web[_-]app/i, /portfolio/i],
    },
  },
]

// ── Helpers ──────────────────────────────────────────────────────────

/** Test a list of regex patterns against a string; return first match text or null */
function matchAny(patterns, text) {
  for (const pat of patterns) {
    const m = text.match(pat)
    if (m) return m[0].trim()
  }
  return null
}

// ── Main export ──────────────────────────────────────────────────────

/**
 * runForensicScan
 * @param {object[]} enrichedRepos  Repos with readmeContent, topics, language, etc.
 * @param {string[]} detectedStack  Already-detected tech stack items
 * @returns {ForensicFlag[]}
 */
export function runForensicScan(enrichedRepos = [], detectedStack = []) {
  const results = []

  for (const rule of RULES) {
    const matchingRepos = []
    const evidenceSet   = new Set()

    for (const repo of enrichedRepos) {
      const hits = []
      const readme = repo.readmeContent || ''
      const repoTopics = (repo.topics || []).map(t => t.toLowerCase())
      const repoName   = repo.name || ''
      const repoDesc   = repo.description || ''

      // 1. Topics
      const topicHits = repoTopics.filter(t => rule.patterns.topics?.includes(t))
      if (topicHits.length > 0) {
        hits.push(`Topic tag: "${topicHits[0]}" in ${repoName}`)
      }

      // 2. Repo name
      if (rule.patterns.name) {
        const nm = matchAny(rule.patterns.name, repoName)
        if (nm) hits.push(`Repo name match: "${repoName}"`)
      }

      // 3. Description
      if (rule.patterns.desc) {
        const dm = matchAny(rule.patterns.desc, repoDesc)
        if (dm) hits.push(`Repo description mentions "${dm}"`)
      }

      // 4. README content
      if (rule.patterns.readme && readme) {
        const rm = matchAny(rule.patterns.readme, readme)
        if (rm) hits.push(`README mentions "${rm}"`)
      }

      // 5. Detected stack cross-check
      if (rule.patterns.stack) {
        const stackHit = detectedStack.find(s =>
          rule.patterns.stack.some(kw =>
            s.toLowerCase().includes(kw.toLowerCase())
          )
        )
        if (stackHit) hits.push(`Stack: ${stackHit}`)
      }

      if (hits.length > 0) {
        matchingRepos.push({
          name:        repo.name,
          url:         repo.html_url,
          description: repo.description || '',
          language:    repo.language || '',
          stars:       repo.stargazers_count || 0,
        })
        hits.forEach(h => evidenceSet.add(h))
      }
    }

    if (matchingRepos.length > 0) {
      // De-duplicate repos by url, keep highest-star ones, cap at 3
      const uniqueRepos = [...new Map(matchingRepos.map(r => [r.url, r])).values()]
        .sort((a, b) => b.stars - a.stars)
        .slice(0, 3)

      results.push({
        id:       rule.id,
        category: rule.category,
        keywords: rule.keywords,
        evidence: [...evidenceSet].slice(0, 6),
        repos:    uniqueRepos,
      })
    }
  }

  return results
}
