import express from 'express'
import cors from 'cors'
import { generateRecruiterFeedback, generateMogVerdict } from './groqService.js'
import { getGroqApiKey } from './env.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, hasGroqKey: Boolean(getGroqApiKey()) })
})

app.post('/api/recruiter-feedback', async (req, res) => {
  const apiKey = getGroqApiKey()

  if (!apiKey) {
    return res.status(500).json({
      error:
        'API key missing. Add VITE_GROQ_API_KEY to your .env file (same key as before).',
    })
  }

  if (!req.body?.username || !req.body?.targetRole) {
    return res.status(400).json({
      error: 'Invalid profile summary. username and targetRole are required.',
    })
  }

  try {
    const feedback = await generateRecruiterFeedback(apiKey, req.body)
    res.json({ feedback })
  } catch (err) {
    console.error('Recruiter feedback error:', err.message)
    res.status(500).json({
      error: err.message || 'Failed to generate recruiter feedback',
    })
  }
})

app.post('/api/mog-verdict', async (req, res) => {
  const apiKey = getGroqApiKey()

  if (!apiKey) {
    return res.status(500).json({
      error:
        'API key missing. Add VITE_GROQ_API_KEY to your .env file.',
    })
  }

  try {
    const verdict = await generateMogVerdict(apiKey, req.body)
    res.json({ verdict })
  } catch (err) {
    console.error('Mog verdict error:', err.message)
    res.status(500).json({
      error: err.message || 'Failed to generate Mog verdict',
    })
  }
})

app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`)
})
