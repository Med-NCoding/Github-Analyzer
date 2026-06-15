export async function fetchAIInsight(languageData, repos) {
    try {
      // Get top 3 languages sorted by count
      const topLanguages = Object.entries(languageData)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([lang]) => lang)
        .join(', ')
  
      // Get top 3 repo names sorted by stars
      const topRepos = [...repos]
        .sort((a, b) => b.stargazers_count - a.stargazers_count)
        .slice(0, 3)
        .map(repo => repo.name)
        .join(', ')
  
      // Build the prompt
      const prompt = `A developer's GitHub profile shows they primarily use these 
  languages: ${topLanguages}. Their top repositories by stars are: ${topRepos}. 
  In exactly 3 sentences, summarize this developer's coding strengths based on 
  this data. Then in one final sentence, give one specific technology or skill 
  they should learn next to grow as a developer.`
  
      // Make POST request to OpenAI
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 200
        })
      })
  
      if (!response.ok) {
        throw new Error('OpenAI request failed')
      }
  
      const data = await response.json()
  
      // Extract just the text from the response
      return data.choices[0].message.content
  
    } catch (err) {
      throw new Error('Could not generate AI insight: ' + err.message)
    }
  }