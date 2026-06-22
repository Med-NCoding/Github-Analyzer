import dotenv from 'dotenv'

dotenv.config()

const PLACEHOLDER_VALUES = new Set([
  'your_groq_api_key_here',
  'your_key_here',
  '',
])

// Supports the existing VITE_GROQ_API_KEY used before the server was added
export function getGroqApiKey() {
  const key =
    process.env.VITE_GROQ_API_KEY ||
    process.env.GROQ_API_KEY

  if (!key || PLACEHOLDER_VALUES.has(key.trim())) {
    return null
  }

  return key.trim()
}

export function hasGroqApiKey() {
  return Boolean(getGroqApiKey())
}
