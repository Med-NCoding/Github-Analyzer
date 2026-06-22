// Client-side API helper — Groq key stays on the server
export async function fetchRecruiterFeedback(profileSummary) {
  let response

  try {
    response = await fetch('/api/recruiter-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileSummary),
    })
  } catch {
    throw new Error(
      'Could not reach the API server. Run npm run dev (not just vite) so the backend starts on port 3001.'
    )
  }

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload.error || 'Recruiter analysis failed')
  }

  return payload.feedback
}
