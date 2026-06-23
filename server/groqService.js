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

const MOG_SYSTEM_PROMPT = `You are a hype-filled, witty senior software engineering lead refereeing a "GitHub Profile Showdown" (called MOG Showdown).
Evaluate only the provided GitHub evidence for the target role.
Tone must be competitive, funny, and shareable, but never personally toxic or insulting. Use developer slang (e.g. "cooking", "ship", "lines of code", "repo", "commit", "stars", "forks", "mogged") to keep it entertaining.

You MUST respond with valid JSON only (no markdown fences or extra explanation) matching this structure:
{
  "winner": "string (username of winner or 'tie')",
  "whoMogsWho": "string",
  "whyWinnerWins": "string",
  "user1Strength": "string",
  "user2Strength": "string",
  "biggestWeaknesses": {
    "user1": "string",
    "user2": "string"
  },
  "comebackPlan": "string",
  "twitterShareLine": "string"
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
