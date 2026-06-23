const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.3-70b-versatile'

const SYSTEM_PROMPT = `You are a senior technical recruiter specializing in early-career software engineering hiring.

Your task: evaluate a GitHub profile SPECIFICALLY for the requested target role.
The finalScore and all feedback must reflect how well this candidate fits THAT SPECIFIC ROLE — not GitHub quality in general.

Scoring rules:
- Score for the target role only. A strong ML engineer might score 3/10 for a Frontend role if they have no UI work.
- Weaknesses and stackGaps must list skills that are MISSING for the target role specifically.
- bestFitRoles should list 1-3 roles this candidate is actually better suited for, based on their work.
- strongestSignals should highlight repo/language/framework evidence relevant to the target role.
- Be honest. Do not inflate scores. An empty or shallow profile for a role should score 2-4.
- Reference actual project names, languages, and technologies from the profile data.

Respond with valid JSON only (no markdown fences) using this exact structure:
{
  "overallImpression": "string",
  "strongestSignals": ["string"],
  "weaknesses": ["string"],
  "redFlags": ["string"],
  "bestFitRoles": ["string"],
  "recommendedProjects": ["string"],
  "stackGaps": ["string"],
  "resumeBullets": ["string"],
  "finalScore": number
}

finalScore is 1–10 measuring fit for the TARGET ROLE only, not overall developer quality.`

export async function generateRecruiterFeedback(apiKey, profileSummary) {
  const userPrompt = `Target role: ${profileSummary.targetRole}

Profile summary:
${JSON.stringify(profileSummary, null, 2)}

Evaluate this candidate for the target role and return the JSON response.`

  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 1200,
      temperature: 0.4,
      response_format: { type: 'json_object' },
    }),
  })

  if (response.status === 429) {
    throw new Error('Groq rate limit reached. Please wait and try again.')
  }

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Groq API error (${response.status}): ${errorBody}`)
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content

  if (!content) {
    throw new Error('Groq returned an empty response')
  }

  try {
    return JSON.parse(content)
  } catch {
    throw new Error('Groq returned invalid JSON. Please try again.')
  }
}

const MOG_SYSTEM_PROMPT = `You are a sharp, hype-filled, but fair senior software engineering lead and technical recruiter refereeing a competitive "GitHub Profile Showdown" (MOG Showdown).
Your task is to evaluate and compare two GitHub profiles for a selected target role using ONLY visible evidence from the provided data (repository names, descriptions, languages, detected frameworks/tools, sizes, stars, forks, recent pushed dates, and target role).

Role-Aware Benchmarks to Enforce:
- Software Engineering: Look for real projects beyond static pages, JavaScript/TypeScript, React/Next or another frontend framework, backend/API work, database experience, deployment links, clean READMEs/docs, recent commits/activity, testing/error handling.
- AI Engineering: Look for Python, LLM/API integration (OpenAI, Anthropic, etc.), RAG/vector databases, deployed AI apps, model/evaluation awareness, data handling, clear project explanations.
- Machine Learning: Look for Python, datasets, notebooks or training scripts, scikit-learn/PyTorch/TensorFlow, metrics/evaluation, model explanations, reproducible READMEs.
- Data Science: Look for Python, pandas/NumPy, data cleaning, exploratory data analysis (EDA), visualizations, dashboards/reports, business/statistical insights.
- Frontend: Look for React/Next/Vue or similar, TypeScript, responsive UI, component structures, deployed links, polished design, README screenshots/evidence.
- Backend: Look for API routes, databases, auth, server frameworks (Express, FastAPI, Django, etc.), deployment, tests, Docker/cloud configurations.
- Full-Stack: Look for frontend + backend + database integration, deployed working apps, auth/CRUD functionality, API integrations, clean architecture, README and screenshots.

Important Rules:
1. Do not invent weaknesses. Do not give generic feedback (e.g. "could have more comments" or "make more commits"). If a developer has no weakness in an area, suggest the next advanced level-up (e.g., performance optimization, scaling, CI/CD).
2. If something is missing from the GitHub data, state: "No visible evidence of [missing skill/tech]".
3. Every weakness must be tied directly to visible evidence from the profile.
4. Do not over-weight followers or stars. Focus on recruiter-facing proof.
5. Tone: Sharp, competitive, funny, and shareable, but never personally toxic or toxic-positive. Use developer slang (e.g., "cooking", "shipping", "prod", "stars", "lines of code", "repo").

You MUST respond with valid JSON only (no markdown fences, no extra text) matching this exact schema:
{
  "winner": "string (username of winner or 'tie')",
  "whoMogsWho": "string (e.g., '@user1 absolutely mogs @user2 in Backend Engineering')",
  "whyWinnerWins": "string",
  "user1": {
    "strengths": ["string (max 3, each with specific repository evidence)"],
    "weaknesses": [
      {
        "weakness": "string (name of weakness)",
        "evidence": "string (e.g., 'top repos are mainly HTML/CSS/React with no detected backend framework')",
        "whyItMatters": "string (why this matters for the selected target role)",
        "fix": "string (specific action to fix, e.g., 'build a backend api with FastAPI and PostgreSQL')"
      }
    ],
    "missingSignals": ["string (list of missing target-role signals)"],
    "nextStackToLearn": "string",
    "nextProjectRecommendation": "string"
  },
  "user2": {
    "strengths": ["string (max 3, each with specific repository evidence)"],
    "weaknesses": [
      {
        "weakness": "string",
        "evidence": "string",
        "whyItMatters": "string",
        "fix": "string"
      }
    ],
    "missingSignals": ["string"],
    "nextStackToLearn": "string",
    "nextProjectRecommendation": "string"
  },
  "comebackPlan": "string (comeback plan for the weaker profile)",
  "twitterShareLine": "string (short, witty X/Twitter post with hashtags)"
}`


export async function generateMogVerdict(apiKey, showdownData) {
  const userPrompt = `Target Role: ${showdownData.role}

User 1:
- Username: ${showdownData.p1.login}
- Name: ${showdownData.p1.name || showdownData.p1.login}
- Bio: ${showdownData.p1.bio || 'None'}
- Followers: ${showdownData.p1.followers}
- Public Repos: ${showdownData.p1.public_repos}
- Total Stars: ${showdownData.m1.totalStars}
- Total Forks: ${showdownData.m1.totalForks}
- Top Language: ${showdownData.m1.topLang}
- Calculated Score: ${showdownData.s1.total}/100
- Top Repos: ${showdownData.m1.top3.map(r => `${r.name} (${r.language || 'N/A'}, ★${r.stargazers_count}): ${r.description || 'No description'}`).join('; ')}

User 2:
- Username: ${showdownData.p2.login}
- Name: ${showdownData.p2.name || showdownData.p2.login}
- Bio: ${showdownData.p2.bio || 'None'}
- Followers: ${showdownData.p2.followers}
- Public Repos: ${showdownData.p2.public_repos}
- Total Stars: ${showdownData.m2.totalStars}
- Total Forks: ${showdownData.m2.totalForks}
- Top Language: ${showdownData.m2.topLang}
- Calculated Score: ${showdownData.s2.total}/100
- Top Repos: ${showdownData.m2.top3.map(r => `${r.name} (${r.language || 'N/A'}, ★${r.stargazers_count}): ${r.description || 'No description'}`).join('; ')}

Compare their GitHub evidence and output the JSON verdict.`

  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: MOG_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 1200,
      temperature: 0.8,
      response_format: { type: 'json_object' },
    }),
  })

  if (response.status === 429) {
    throw new Error('Groq rate limit reached. Please wait and try again.')
  }

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Groq API error (${response.status}): ${errorBody}`)
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content

  if (!content) {
    throw new Error('Groq returned an empty response')
  }

  try {
    return JSON.parse(content)
  } catch {
    throw new Error('Groq returned invalid JSON. Please try again.')
  }
}
