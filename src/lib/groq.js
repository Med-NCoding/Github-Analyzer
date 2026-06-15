const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.3-70b-versatile'

export async function fetchAIInsight(languageData, repos) {
  try {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY

    if (!apiKey) {
      throw new Error('Missing VITE_GROQ_API_KEY')
    }

    const topLanguages = Object.entries(languageData)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([lang]) => lang)
      .join(', ')

    const topRepos = [...repos]
      .sort((a, b) => b.stargazers_count - a.stargazers_count)
      .slice(0, 3)
      .map(repo => repo.name)
      .join(', ')

    const prompt = `A developer's GitHub profile shows they primarily use these languages: ${topLanguages}. Their top repositories by stars are: ${topRepos}. In exactly 3 sentences, summarize this developer's coding strengths and the kind of projects they appear to build based on this data. Then in one final sentence, give one specific technology or skill they should learn next to grow as a developer.`

    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 250,
        temperature: 0.7
      })
    })

    if (!response.ok) {
      throw new Error('Groq request failed')
    }

    const data = await response.json()

    const text = data?.choices?.[0]?.message?.content

    if (!text) {
      throw new Error('Groq returned no insight')
    }

    return text.trim()
  } catch (err) {
    throw new Error('Could not generate AI insight: ' + err.message, { cause: err })
  }
}
