const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

export async function fetchAIInsight(languageData, repos) {
  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY

    if (!apiKey) {
      throw new Error('Missing VITE_GEMINI_API_KEY')
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

    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ]
      })
    })

    if (!response.ok) {
      throw new Error('Gemini request failed')
    }

    const data = await response.json()

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!text) {
      throw new Error('Gemini returned no insight')
    }

    return text.trim()
  } catch (err) {
    throw new Error('Could not generate AI insight: ' + err.message, { cause: err })
  }
}
