function AIInsights({ aiInsight, aiLoading }) {
  if (aiLoading) {
    return (
      <div className="ai-insights">
        <p className="ai-loading">Generating AI insights...</p>
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
