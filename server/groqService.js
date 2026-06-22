const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.3-70b-versatile'

const SYSTEM_PROMPT = `You are a senior technical recruiter and early-career software hiring manager.
Evaluate the GitHub profile data provided for the selected co-op/internship role.
Be honest, specific, and useful. Focus on evidence from repos, README files, languages, frameworks, project polish, and role fit.
Avoid generic advice. Reference concrete project names and technologies when possible.

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

finalScore must be an integer from 1 to 10 for the selected target role.`

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
