function Block({ title, items, className, fullWidth }) {
  if (!items || (Array.isArray(items) && items.length === 0)) return null

  return (
    <div className={`feedback-block ${className ?? ''} ${fullWidth ? 'feedback-block--full' : ''}`}>
      <h3>{title}</h3>
      {Array.isArray(items) ? (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p>{items}</p>
      )}
    </div>
  )
}

function AIRecruiterFeedback({ feedback, loading, error, targetRole }) {
  if (loading) {
    return (
      <>
        <div className="ai-header">
          <p className="ai-title">AI Recruiter Feedback</p>
        </div>
        <p className="ai-loading">Recruiter analysis in progress…</p>
      </>
    )
  }

  if (error) {
    return (
      <>
        <div className="ai-header">
          <p className="ai-title">AI Recruiter Feedback</p>
        </div>
        <p className="ai-error">{error}</p>
      </>
    )
  }

  if (!feedback) return null

  return (
    <>
      {/* Header row */}
      <div className="ai-header">
        <p className="ai-title">AI Recruiter Feedback</p>
        <span className="ai-role-tag">{targetRole}</span>
        {feedback.finalScore != null && (
          <span className="ai-score-tag">
            Score <strong>{feedback.finalScore}/10</strong>
          </span>
        )}
      </div>

      {/* Feedback cards grid */}
      <div className="feedback-grid">
        <Block
          title="Overall Impression"
          items={feedback.overallImpression}
          className="fb--impression"
          fullWidth
        />
        <Block title="Strongest Signals"        items={feedback.strongestSignals}   className="fb--signals"  />
        <Block title="Weaknesses / Missing"      items={feedback.weaknesses}         className="fb--weakness" />
        <Block title="Possible Red Flags"        items={feedback.redFlags}           className="fb--flags"    />
        <Block title="Best-Fit Roles"            items={feedback.bestFitRoles}       className="fb--roles"    />
        <Block title="Recommended Projects"      items={feedback.recommendedProjects} className="fb--recs"   />
        <Block title="Stack Gaps to Fix"         items={feedback.stackGaps}          className="fb--gaps"    />
        <Block title="Resume Bullet Suggestions" items={feedback.resumeBullets}      className="fb--resume"  />
      </div>
    </>
  )
}

export default AIRecruiterFeedback
