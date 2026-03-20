'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { Shield, ArrowRight } from 'lucide-react'

export default function RainHero() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    type Drop = { x: number; y: number; speed: number; length: number; opacity: number }
    const drops: Drop[] = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      speed: 2 + Math.random() * 4,
      length: 10 + Math.random() * 20,
      opacity: 0.1 + Math.random() * 0.3,
    }))

    let raf: number
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      drops.forEach((d) => {
        ctx.beginPath()
        ctx.strokeStyle = `rgba(255,255,255,${d.opacity})`
        ctx.lineWidth = 1
        ctx.moveTo(d.x, d.y)
        ctx.lineTo(d.x - 2, d.y + d.length)
        ctx.stroke()
        d.y += d.speed
        if (d.y > canvas.height) {
          d.y = -d.length
          d.x = Math.random() * canvas.width
        }
      })
      raf = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <section
      style={{
        background: 'var(--brand-secondary)',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {/* Rain canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />

      {/* Gradient overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 60% 50%, rgba(255,107,0,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        className="max-w-6xl mx-auto px-4 py-24"
        style={{ position: 'relative', zIndex: 1, width: '100%' }}
      >
        <div style={{ maxWidth: 680 }}>
          {/* Platform badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(255,107,0,0.15)',
              border: '1px solid rgba(255,107,0,0.3)',
              borderRadius: 100,
              padding: '0.35rem 1rem',
              marginBottom: '2rem',
              fontSize: '0.8rem',
              color: 'var(--brand-primary)',
              fontWeight: 600,
              letterSpacing: '0.03em',
            }}
          >
            <Shield size={14} />
            Guidewire DEVTrails 2026 · Parametric Income Insurance
          </div>

          {/* Headline */}
          <h1
            className="font-display"
            style={{
              fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
              fontWeight: 800,
              color: '#FFFFFF',
              lineHeight: 1.1,
              marginBottom: '1.5rem',
            }}
          >
            Your income.{' '}
            <span style={{ color: 'var(--brand-primary)' }}>Protected.</span>{' '}
            Automatically.
          </h1>

          {/* Subheadline */}
          <p
            style={{
              fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
              color: 'rgba(255,255,255,0.7)',
              lineHeight: 1.7,
              marginBottom: '2.5rem',
              maxWidth: 560,
            }}
          >
            When storms, bad air, or platform outages stop Zomato and Swiggy partners from
            earning, AegiSync pays out automatically — no claim forms, no waiting, no haggling.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Link
              href="/onboarding"
              className="btn-primary"
              style={{
                padding: '0.85rem 2rem',
                fontSize: '1rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                borderRadius: 'var(--radius)',
                textDecoration: 'none',
              }}
            >
              Get Covered — ₹79/week
              <ArrowRight size={18} />
            </Link>
            <a
              href="#how-it-works"
              style={{
                padding: '0.85rem 2rem',
                fontSize: '1rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                borderRadius: 'var(--radius)',
                border: '1px solid rgba(255,255,255,0.25)',
                color: 'rgba(255,255,255,0.85)',
                textDecoration: 'none',
                background: 'rgba(255,255,255,0.05)',
              }}
            >
              See How It Works
            </a>
          </div>

          {/* Trust signals */}
          <div
            style={{
              marginTop: '3rem',
              display: 'flex',
              gap: '2rem',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            {[
              { value: '142+', label: 'Partners Covered' },
              { value: '₹18K', label: 'Paid This Week' },
              { value: '4 min', label: 'Avg Payout Time' },
            ].map((s) => (
              <div key={s.label}>
                <div
                  className="font-display"
                  style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--brand-primary)' }}
                >
                  {s.value}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
