function FeedbackSection({ title, items, variant = 'list' }) {
  if (!items || (Array.isArray(items) && items.length === 0)) {
    return null
  }

  return (
    <section className={`feedback-section feedback-section--${variant}`}>
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
    </section>
  )
}

function AIRecruiterFeedback({ feedback, loading, error, targetRole }) {
  if (loading) {
    return (
      <div className="recruiter-feedback">
        <p className="recruiter-loading">Recruiter analysis in progress…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="recruiter-feedback recruiter-feedback--error">
        <h2>AI Recruiter Feedback</h2>
        <p className="recruiter-error">{error}</p>
      </div>
    )
  }

  if (!feedback) {
    return null
  }

  return (
    <div className="recruiter-feedback">
      <div className="recruiter-header">
        <h2>AI Recruiter Feedback</h2>
        <p className="recruiter-role">Evaluated for: {targetRole}</p>
        <div className="recruiter-score">
          Final score: <strong>{feedback.finalScore}/10</strong>
        </div>
      </div>

      <FeedbackSection title="Overall Recruiter Impression" items={feedback.overallImpression} variant="text" />
      <FeedbackSection title="Strongest Signals" items={feedback.strongestSignals} />
      <FeedbackSection title="Weaknesses / Missing Signals" items={feedback.weaknesses} />
      <FeedbackSection title="Possible Red Flags" items={feedback.redFlags} variant="warning" />
      <FeedbackSection title="Best-Fit Roles" items={feedback.bestFitRoles} />
      <FeedbackSection title="Recommended Projects to Add" items={feedback.recommendedProjects} />
      <FeedbackSection title="Stack Gaps to Fix" items={feedback.stackGaps} />
      <FeedbackSection title="Resume Bullet Suggestions" items={feedback.resumeBullets} />
    </div>
  )
}

export default AIRecruiterFeedback
