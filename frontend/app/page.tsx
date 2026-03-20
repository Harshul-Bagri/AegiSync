import Link from 'next/link'
import { CheckCircle, ChevronDown } from 'lucide-react'
import RainHero from '@/components/shared/RainHero'

// ─── Disruption Coverage Cards ────────────────────────────────────────────────

const DISRUPTIONS = [
  {
    icon: '🌧️',
    type: 'Heavy Rainfall',
    source: 'OpenWeatherMap / IMD',
    threshold: '>60mm in 3 hours in your pincode',
    payout: '70% of daily avg per disrupted hour',
    color: '#3B82F6',
  },
  {
    icon: '😷',
    type: 'Severe AQI',
    source: 'OpenAQ / CPCB',
    threshold: 'PM2.5 >250 µg/m³ in your zone',
    payout: '60% of daily avg for the full day',
    color: '#8B5CF6',
  },
  {
    icon: '🌊',
    type: 'Flood Alert',
    source: 'NDMA Disaster Feed',
    threshold: 'Official red/orange flood alert for zone',
    payout: '80% of daily avg, up to 2 days',
    color: '#0EA5E9',
  },
  {
    icon: '🚫',
    type: 'Bandh / Curfew',
    source: 'Govt alerts + NLP signal analysis',
    threshold: 'Official notice OR >80% keyword confidence',
    payout: '75% of daily avg for covered hours',
    color: '#EF4444',
  },
  {
    icon: '📱',
    type: 'Platform Outage',
    source: 'Zomato / Swiggy uptime monitor',
    threshold: '>2 hrs downtime during peak hours',
    payout: '50% of hourly avg × hours lost',
    color: '#F59E0B',
  },
]

// ─── Pricing Tiers ────────────────────────────────────────────────────────────

const TIERS = [
  {
    name: 'Basic',
    weekly: 79,
    dailyCap: 400,
    maxDays: 2,
    maxHours: 4,
    recommended: false,
    features: ['Up to ₹400/day coverage', '2 disruption days/week', '4 hours covered/day', 'Auto-claim processing', 'UPI instant payout'],
  },
  {
    name: 'Standard',
    weekly: 129,
    dailyCap: 650,
    maxDays: 3,
    maxHours: 6,
    recommended: true,
    features: ['Up to ₹650/day coverage', '3 disruption days/week', '6 hours covered/day', 'Auto-claim processing', 'UPI instant payout', 'Priority support'],
  },
  {
    name: 'Premium',
    weekly: 199,
    dailyCap: 900,
    maxDays: 5,
    maxHours: 8,
    recommended: false,
    features: ['Up to ₹900/day coverage', '5 disruption days/week', '8 hours covered/day', 'Auto-claim processing', 'UPI instant payout', 'Priority support', 'Retroactive payout safety net'],
  },
]

// ─── Testimonials ─────────────────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    name: 'Rajesh Kumar',
    city: 'Bengaluru',
    platform: 'Swiggy',
    initials: 'RK',
    quote: 'Last monsoon I lost 4 working days to flooding. This year I got ₹2,600 directly in my UPI without even opening the app. AegiSync is the real deal.',
    rating: 5,
  },
  {
    name: 'Meena Kumari',
    city: 'Delhi',
    platform: 'Zomato',
    initials: 'MK',
    quote: 'Delhi ki pollution mein jab Zomato band ho jaata hai, ab mujhe tension nahi hoti. ₹650 aa jaata hai automatically. Bahut achha hai yeh.',
    rating: 5,
  },
  {
    name: 'Suresh Patil',
    city: 'Pune',
    platform: 'Swiggy',
    initials: 'SP',
    quote: 'There was a bandh called overnight. By 10 AM my payout was already in my account. I didn\'t even know how they detected it so fast.',
    rating: 5,
  },
]

// ─── FAQ ──────────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: 'What disruptions are covered?',
    a: 'AegiSync covers 5 types: Heavy rainfall (>60mm/3hr), Severe AQI (PM2.5 >250), Official flood alerts, Bandh/curfew events, and Platform outages lasting >2 hours during peak delivery time. All triggers are verified by external APIs — no manual claim needed.',
  },
  {
    q: 'How fast will I get paid?',
    a: 'Most claims are auto-approved and paid within 15 minutes of the disruption being detected. A small number of claims undergo a secondary check and are paid within 2 hours. You will receive an SMS notification when the payout is initiated.',
  },
  {
    q: 'Do I need to file a claim manually?',
    a: 'No. AegiSync monitors disruption signals 24/7. When a trigger threshold is crossed in your zone, claims are automatically created for all active policyholders in that area. You just get paid.',
  },
  {
    q: 'What determines my weekly premium?',
    a: 'Your premium = Tier base price × Zone risk multiplier × Seasonal factor. Workers in high-flood zones (like Mumbai Andheri) pay more than those in lower-risk zones. Premiums are higher during monsoon months (June–September). Long-term low-claim members get discounts.',
  },
  {
    q: 'Can I pause or cancel my coverage?',
    a: 'Yes. You can pause your coverage anytime from the dashboard. Paused weeks are not charged. You can cancel with 7 days notice. Unused premium for the current week is refunded pro-rata.',
  },
  {
    q: 'What is NOT covered?',
    a: 'AegiSync covers income loss ONLY. We do not cover: health/medical expenses, vehicle damage or repair, personal accidents, injuries, theft, or any situation not caused by a verified external disruption event. This is not a health insurance or vehicle insurance product.',
  },
]

// ─── FAQ Accordion (client component) ────────────────────────────────────────
import FaqAccordion from '@/components/shared/FaqAccordion'

// ─── Landing Page ─────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div>
      {/* 1. HERO */}
      <RainHero />

      {/* 2. HOW IT WORKS */}
      <section id="how-it-works" style={{ background: 'var(--surface-1)', padding: '5rem 1rem' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p style={{ color: 'var(--brand-primary)', fontWeight: 600, fontSize: '0.875rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Simple & Automatic
            </p>
            <h2 className="font-display font-bold" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', color: 'var(--text-primary)' }}>
              How AegiSync Works
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: '01', icon: '✍️', title: 'Register in 3 minutes', desc: 'Enter your name, phone, UPI ID, and delivery zone. Choose your coverage tier. Done.' },
              { step: '02', icon: '🛰️', title: 'Disruption detected automatically', desc: 'Our engine monitors weather APIs, AQI sensors, platform signals, and government alerts 24/7.' },
              { step: '03', icon: '⚡', title: 'Money in your UPI instantly', desc: 'Trigger crossed → claim auto-approved → ₹ transferred to your UPI. You don\'t lift a finger.' },
            ].map(({ step, icon, title, desc }) => (
              <div key={step} className="card p-6 text-center" style={{ position: 'relative' }}>
                <div
                  style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: 'var(--brand-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 1rem',
                    fontSize: '1.5rem',
                  }}
                >
                  {icon}
                </div>
                <div style={{ position: 'absolute', top: 16, right: 16, fontSize: '0.75rem', fontWeight: 700, color: 'var(--brand-primary)', opacity: 0.4 }}>
                  {step}
                </div>
                <h3 className="font-display font-semibold mb-2" style={{ fontSize: '1rem' }}>{title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. DISRUPTION COVERAGE */}
      <section style={{ background: 'var(--surface-2)', padding: '5rem 1rem' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p style={{ color: 'var(--brand-primary)', fontWeight: 600, fontSize: '0.875rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              5 Trigger Types
            </p>
            <h2 className="font-display font-bold" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', color: 'var(--text-primary)' }}>
              What Triggers a Payout
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.75rem', maxWidth: 560, margin: '0.75rem auto 0' }}>
              All triggers are objective and API-verified. No worker testimony needed. No adjuster. Just data.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DISRUPTIONS.map((d) => (
              <div key={d.type} className="card p-5" style={{ borderLeft: `4px solid ${d.color}` }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{d.icon}</div>
                <h3 className="font-display font-semibold mb-1" style={{ fontSize: '1rem' }}>{d.type}</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>{d.source}</p>
                <div style={{ background: 'var(--surface-2)', borderRadius: 6, padding: '0.5rem 0.75rem', marginBottom: '0.5rem' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Threshold</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{d.threshold}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--brand-accent)', fontWeight: 600 }}>✓</span>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 500 }}>{d.payout}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. PRICING */}
      <section id="pricing" style={{ background: 'var(--surface-1)', padding: '5rem 1rem' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p style={{ color: 'var(--brand-primary)', fontWeight: 600, fontSize: '0.875rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Simple Pricing
            </p>
            <h2 className="font-display font-bold" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', color: 'var(--text-primary)' }}>
              Choose Your Coverage
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              Final premium adjusted by your zone risk and season. No hidden fees.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TIERS.map((tier) => (
              <div
                key={tier.name}
                className="card p-6"
                style={{
                  border: tier.recommended ? '2px solid var(--brand-primary)' : '1px solid var(--border)',
                  position: 'relative',
                  transform: tier.recommended ? 'scale(1.02)' : 'none',
                }}
              >
                {tier.recommended && (
                  <div
                    style={{
                      position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                      background: 'var(--brand-primary)', color: 'white',
                      padding: '0.2rem 0.9rem', borderRadius: 20,
                      fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap',
                    }}
                  >
                    Most Popular
                  </div>
                )}
                <h3 className="font-display font-bold mb-1" style={{ fontSize: '1.1rem' }}>{tier.name}</h3>
                <div style={{ marginBottom: '0.25rem' }}>
                  <span className="font-display font-bold" style={{ fontSize: '2.25rem', color: 'var(--brand-primary)' }}>
                    ₹{tier.weekly}
                  </span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>/week</span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '1.25rem' }}>
                  ≈ ₹{tier.weekly * 4}/month · ₹{tier.dailyCap}/day cap
                </p>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: '1.5rem' }}>
                  {tier.features.map((f) => (
                    <li key={f} style={{ display: 'flex', gap: 8, fontSize: '0.875rem', color: 'var(--text-secondary)', alignItems: 'flex-start' }}>
                      <CheckCircle size={15} style={{ color: 'var(--brand-accent)', flexShrink: 0, marginTop: 2 }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/onboarding"
                  className="btn-primary"
                  style={{
                    width: '100%', justifyContent: 'center', textDecoration: 'none',
                    background: tier.recommended ? 'var(--brand-primary)' : 'transparent',
                    color: tier.recommended ? 'white' : 'var(--brand-primary)',
                    border: tier.recommended ? 'none' : '2px solid var(--brand-primary)',
                  }}
                >
                  Get {tier.name} — ₹{tier.weekly}/week
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. SOCIAL PROOF */}
      <section style={{ background: 'var(--surface-2)', padding: '5rem 1rem' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p style={{ color: 'var(--brand-primary)', fontWeight: 600, fontSize: '0.875rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Real Stories
            </p>
            <h2 className="font-display font-bold" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', color: 'var(--text-primary)' }}>
              Delivery Partners Love AegiSync
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="card p-6">
                <div style={{ display: 'flex', gap: 2, marginBottom: '1rem' }}>
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <span key={i} style={{ color: '#F59E0B', fontSize: '1rem' }}>★</span>
                  ))}
                </div>
                <p style={{ color: 'var(--text-primary)', lineHeight: 1.7, fontSize: '0.9rem', marginBottom: '1.25rem', fontStyle: 'italic' }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: 'var(--brand-primary)', color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: '0.875rem', fontFamily: 'Sora, sans-serif',
                    }}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{t.name}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.city} · {t.platform}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. FAQ */}
      <section style={{ background: 'var(--surface-1)', padding: '5rem 1rem' }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p style={{ color: 'var(--brand-primary)', fontWeight: 600, fontSize: '0.875rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Questions
            </p>
            <h2 className="font-display font-bold" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', color: 'var(--text-primary)' }}>
              Frequently Asked
            </h2>
          </div>
          <FaqAccordion items={FAQ_ITEMS} />
        </div>
      </section>

      {/* CTA Banner */}
      <section
        style={{
          background: 'var(--brand-primary)',
          padding: '4rem 1rem',
          textAlign: 'center',
        }}
      >
        <div className="max-w-2xl mx-auto">
          <h2 className="font-display font-bold text-white mb-4" style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)' }}>
            Ready to protect your income?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.85)', marginBottom: '2rem', fontSize: '1rem' }}>
            Join 142+ delivery partners already protected across Bengaluru, Mumbai, Delhi, and Chennai.
          </p>
          <Link
            href="/onboarding"
            style={{
              background: 'white',
              color: 'var(--brand-primary)',
              padding: '0.875rem 2rem',
              borderRadius: 10,
              fontWeight: 700,
              fontSize: '1rem',
              textDecoration: 'none',
              display: 'inline-block',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            Get Covered — ₹79/week
          </Link>
        </div>
      </section>
    </div>
  )
}
