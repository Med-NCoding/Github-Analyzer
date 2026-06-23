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
