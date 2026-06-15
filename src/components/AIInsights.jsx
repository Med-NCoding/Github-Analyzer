function AIInsights({ insight, aiLoading }) {
    // Still loading — show spinner text
    if (aiLoading) {
      return (
        <div className="ai-insights">
          <p className="ai-loading">Generating AI insights...</p>
        </div>
      )
    }
  
    // No insight yet — render nothing
    if (!insight) {
      return null
    }
  
    // Insight ready — show the card
    return (
      <div className="ai-insights">
        <h2>AI Insights</h2>
        <p className="ai-text">{insight}</p>
      </div>
    )
  }
  
  export default AIInsights