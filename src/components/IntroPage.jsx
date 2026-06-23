import { useEffect, useState } from 'react'
import './IntroPage.css'

export default function IntroPage({ onGetStarted }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Tiny delay so the CSS transition fires after mount
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className={`intro-page${visible ? ' intro-visible' : ''}`}>
      {/* Glow orbs */}
      <div className="intro-glow intro-glow-1" />
      <div className="intro-glow intro-glow-2" />
      <div className="intro-glow intro-glow-3" />

      <div className="intro-content">
        <div className="intro-badge">AI-Powered · GitHub · Insights</div>
        <h1 className="intro-title">GitHub Analyzer AI</h1>
        <p className="intro-subtitle">
          AI-powered GitHub profile analysis, recruiter feedback, and project insights.
        </p>
        <button className="intro-btn" onClick={onGetStarted}>
          Get Started
          <span className="intro-btn-arrow">→</span>
        </button>
      </div>
    </div>
  )
}
