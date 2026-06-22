// Technologies to detect across repo metadata and README text
const STACK_KEYWORDS = [
  { name: 'React', pattern: /\breact(\.js)?\b/i },
  { name: 'Next.js', pattern: /\bnext\.?js\b/i },
  { name: 'Vue', pattern: /\bvue(\.js)?\b/i },
  { name: 'Angular', pattern: /\bangular\b/i },
  { name: 'Tailwind CSS', pattern: /\btailwind(\s*css)?\b/i },
  { name: 'Bootstrap', pattern: /\bbootstrap\b/i },
  { name: 'HTML', pattern: /\bhtml\b/i },
  { name: 'CSS', pattern: /\bcss\b/i },
  { name: 'JavaScript', pattern: /\bjavascript\b|\bjs\b/i },
  { name: 'TypeScript', pattern: /\btypescript\b|\bts\b/i },
  { name: 'Node.js', pattern: /\bnode(\.js)?\b/i },
  { name: 'Express', pattern: /\bexpress(\.js)?\b/i },
  { name: 'FastAPI', pattern: /\bfastapi\b/i },
  { name: 'Flask', pattern: /\bflask\b/i },
  { name: 'Django', pattern: /\bdjango\b/i },
  { name: 'Spring Boot', pattern: /\bspring\s*boot\b/i },
  { name: 'REST API', pattern: /\brest(\s*api)?\b/i },
  { name: 'GraphQL', pattern: /\bgraphql\b/i },
  { name: 'MongoDB', pattern: /\bmongodb\b|\bmongo\b/i },
  { name: 'PostgreSQL', pattern: /\bpostgres(ql)?\b/i },
  { name: 'MySQL', pattern: /\bmysql\b/i },
  { name: 'SQLite', pattern: /\bsqlite\b/i },
  { name: 'Supabase', pattern: /\bsupabase\b/i },
  { name: 'Firebase', pattern: /\bfirebase\b/i },
  { name: 'Prisma', pattern: /\bprisma\b/i },
  { name: 'Python', pattern: /\bpython\b/i },
  { name: 'TensorFlow', pattern: /\btensorflow\b/i },
  { name: 'PyTorch', pattern: /\bpytorch\b/i },
  { name: 'scikit-learn', pattern: /\bscikit-?learn\b|\bsklearn\b/i },
  { name: 'pandas', pattern: /\bpandas\b/i },
  { name: 'NumPy', pattern: /\bnumpy\b/i },
  { name: 'LangChain', pattern: /\blangchain\b/i },
  { name: 'OpenAI', pattern: /\bopenai\b/i },
  { name: 'Groq', pattern: /\bgroq\b/i },
  { name: 'Hugging Face', pattern: /\bhugging\s*face\b|\btransformers\b/i },
  { name: 'Jupyter', pattern: /\bjupyter\b/i },
  { name: 'Matplotlib', pattern: /\bmatplotlib\b/i },
  { name: 'Git', pattern: /\bgit\b/i },
  { name: 'GitHub', pattern: /\bgithub\b/i },
  { name: 'Docker', pattern: /\bdocker\b/i },
  { name: 'Vercel', pattern: /\bvercel\b/i },
  { name: 'Netlify', pattern: /\bnetlify\b/i },
  { name: 'AWS', pattern: /\baws\b|\bamazon web services\b/i },
  { name: 'Azure', pattern: /\bazure\b/i },
  { name: 'GCP', pattern: /\bgcp\b|\bgoogle cloud\b/i },
  { name: 'CI/CD', pattern: /\bci\/?cd\b|\bgithub actions\b|\bjenkins\b/i },
  { name: 'Swift', pattern: /\bswift\b/i },
  { name: 'SwiftUI', pattern: /\bswiftui\b/i },
  { name: 'React Native', pattern: /\breact native\b/i },
  { name: 'Flutter', pattern: /\bflutter\b/i },
  { name: 'Kotlin', pattern: /\bkotlin\b/i },
]

const LANGUAGE_MAP = {
  JavaScript: 'JavaScript',
  TypeScript: 'TypeScript',
  Python: 'Python',
  HTML: 'HTML',
  CSS: 'CSS',
  Swift: 'Swift',
  Kotlin: 'Kotlin',
}

function collectTextFromRepo(repo) {
  const parts = [
    repo.language || '',
    repo.description || '',
    ...(repo.topics || []),
    repo.readmeContent || '',
  ]
  return parts.join(' ')
}

export function detectStack(repos) {
  const detected = new Set()

  for (const repo of repos) {
    if (repo.language && LANGUAGE_MAP[repo.language]) {
      detected.add(LANGUAGE_MAP[repo.language])
    } else if (repo.language) {
      detected.add(repo.language)
    }

    const text = collectTextFromRepo(repo)

    for (const { name, pattern } of STACK_KEYWORDS) {
      if (pattern.test(text)) {
        detected.add(name)
      }
    }
  }

  return [...detected].sort()
}
