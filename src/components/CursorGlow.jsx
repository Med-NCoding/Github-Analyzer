import { useEffect, useRef } from 'react'

/**
 * CursorTrail
 * -----------
 * Canvas-based neon trail that follows the cursor.
 * - Stores the last N mouse positions as a polyline
 * - Each frame: clears canvas, draws a tapered glowing stroke
 * - Points age out (fade + shrink) over ~400ms
 * - pointer-events: none, z-index: 99999
 * - Hidden on touch-only devices
 */
export default function CursorGlow() {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (window.matchMedia('(hover: none)').matches) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    // Resize canvas to fill viewport
    function resize() {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize, { passive: true })

    // Trail point: { x, y, t } where t is timestamp
    const points = []
    const TRAIL_DURATION = 420   // ms a point lives
    const MAX_POINTS = 60        // cap history length

    function onMouseMove(e) {
      points.push({ x: e.clientX, y: e.clientY, t: performance.now() })
      if (points.length > MAX_POINTS) points.shift()
    }
    window.addEventListener('mousemove', onMouseMove, { passive: true })

    let rafId

    function draw() {
      rafId = requestAnimationFrame(draw)

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const now = performance.now()

      // Cull expired points
      while (points.length > 0 && now - points[0].t > TRAIL_DURATION) {
        points.shift()
      }

      if (points.length < 2) return

      // Draw segments from oldest → newest
      // Each segment gets a lineWidth and alpha based on its age
      for (let i = 1; i < points.length; i++) {
        const p0 = points[i - 1]
        const p1 = points[i]

        // progress: 0 = oldest tail, 1 = newest (cursor tip)
        const progress = i / (points.length - 1)
        // age factor: newest point = 1, oldest = near 0
        const ageFactor = 1 - (now - p1.t) / TRAIL_DURATION

        const alpha = Math.max(0, ageFactor * progress * 0.9)
        const width = Math.max(0.5, progress * 2.5)

        // Neon gradient along the segment matching title gradient
        // indigo → violet → purple
        const hue = Math.round(245 + progress * 30)   // 245→275
        const sat = 85 + progress * 10                // 85%→95%
        const lig = 60 + progress * 15               // 60%→75%

        ctx.beginPath()
        ctx.moveTo(p0.x, p0.y)
        ctx.lineTo(p1.x, p1.y)

        ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${lig}%, ${alpha})`
        ctx.lineWidth = width
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        // Glow: draw the same segment wider + more transparent underneath
        ctx.shadowColor = `hsla(${hue}, 100%, 70%, ${alpha * 0.8})`
        ctx.shadowBlur = 8 + progress * 6

        ctx.stroke()
      }

      // Reset shadow so it doesn't bleed into clearRect next frame
      ctx.shadowBlur = 0
    }

    draw()

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouseMove)
      cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 99999,
      }}
    />
  )
}
