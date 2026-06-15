function AIInsights({ aiInsight, aiLoading, aiError }) {
  if (aiLoading) {
    return (
      <div className="ai-insights">
        <p className="ai-loading">Generating AI insights...</p>
      </div>
    )
  }

  if (aiError) {
    const missingKey = aiError.includes('VITE_GROQ_API_KEY')
    return (
      <div className="ai-insights">
        <h2>AI Developer Insights</h2>
        <p className="ai-error">
          {missingKey
            ? 'Add a Groq API key (VITE_GROQ_API_KEY) to your .env to enable AI insights.'
            : 'Could not generate AI insights right now. Please try again.'}
        </p>
      </div>
    )
  }

  if (!aiInsight) {
    return null
  }

  return (
    <div className="ai-insights">
      <h2>AI Developer Insights</h2>
      <p className="ai-text">{aiInsight}</p>
    </div>
  )
}

export default AIInsights
