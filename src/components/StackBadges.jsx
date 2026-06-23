function StackBadges({ stack }) {
  if (!stack || stack.length === 0) return null

  return (
    <>
      <p className="section-label">Detected Stack &amp; Tools</p>
      <div className="badge-list">
        {stack.map((item) => (
          <span key={item} className="badge">{item}</span>
        ))}
      </div>
    </>
  )
}

export default StackBadges
