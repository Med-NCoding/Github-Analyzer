function StackBadges({ stack }) {
  if (!stack || stack.length === 0) {
    return null
  }

  return (
    <div className="stack-badges">
      <h2>Detected Stack &amp; Tools</h2>
      <div className="stack-badge-list">
        {stack.map((item) => (
          <span key={item} className="stack-badge">
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

export default StackBadges
