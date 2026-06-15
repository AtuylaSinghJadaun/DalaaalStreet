'use client'

import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  rot: number
  vrot: number
  color: string
  shape: 'rect' | 'circle'
}

const COLORS = ['#34e0e8', '#3ddc84', '#ffd23f', '#ff5470', '#b537f2', '#ffffff']

/**
 * Dependency-free canvas confetti. While `run` is true it keeps emitting an
 * initial burst plus a light continuous rain; when `run` flips to false the
 * existing particles fall out and the canvas clears. Fixed, full-viewport,
 * never intercepts clicks.
 */
export default function Confetti({ run }: { run: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)
  const particlesRef = useRef<Particle[]>([])
  const runningRef = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const spawn = (count: number, fromTop: boolean) => {
      const w = canvas.width
      const h = canvas.height
      for (let i = 0; i < count; i++) {
        if (fromTop) {
          particlesRef.current.push({
            x: Math.random() * w,
            y: -20,
            vx: (Math.random() - 0.5) * 4,
            vy: Math.random() * 3 + 2,
            size: Math.random() * 8 + 4,
            rot: Math.random() * Math.PI,
            vrot: (Math.random() - 0.5) * 0.3,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            shape: Math.random() > 0.5 ? 'rect' : 'circle',
          })
        } else {
          // burst from bottom-center, fountain style
          const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.4
          const speed = Math.random() * 16 + 10
          particlesRef.current.push({
            x: w / 2 + (Math.random() - 0.5) * w * 0.3,
            y: h * 0.55,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: Math.random() * 10 + 5,
            rot: Math.random() * Math.PI,
            vrot: (Math.random() - 0.5) * 0.4,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            shape: Math.random() > 0.5 ? 'rect' : 'circle',
          })
        }
      }
    }

    let frame = 0
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (runningRef.current) {
        // continuous gentle rain
        if (frame % 3 === 0) spawn(6, true)
      }
      frame++

      const gravity = 0.35
      particlesRef.current = particlesRef.current.filter((p) => {
        p.vy += gravity
        p.x += p.vx
        p.y += p.vy
        p.vx *= 0.99
        p.rot += p.vrot

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
        } else {
          ctx.beginPath()
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()

        return p.y < canvas.height + 30
      })

      rafRef.current = requestAnimationFrame(tick)
    }
    tick()

    return () => {
      window.removeEventListener('resize', resize)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      particlesRef.current = []
    }
  }, [])

  // React to `run` toggling: kick off a big burst on the rising edge.
  useEffect(() => {
    runningRef.current = run
    if (run) {
      const canvas = canvasRef.current
      if (!canvas) return
      const w = canvas.width
      const h = canvas.height
      for (let i = 0; i < 180; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.6
        const speed = Math.random() * 18 + 8
        particlesRef.current.push({
          x: w / 2 + (Math.random() - 0.5) * w * 0.4,
          y: h * 0.55,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * 10 + 5,
          rot: Math.random() * Math.PI,
          vrot: (Math.random() - 0.5) * 0.4,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          shape: Math.random() > 0.5 ? 'rect' : 'circle',
        })
      }
    }
  }, [run])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-50"
      aria-hidden
    />
  )
}
