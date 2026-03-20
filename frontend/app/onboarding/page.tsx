'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Check, ChevronDown, Loader2 } from 'lucide-react'
import { TIER_CONFIG, ZONE_RISK_MAP, SEASONAL_FACTORS } from '@/lib/mockData'
import { formatINR } from '@/lib/utils'

type Step = 1 | 2 | 3 | 4

interface FormData {
  name: string
  phone: string
  otp: string
  platform: 'zomato' | 'swiggy' | ''
  platform_id: string
  years_active: number
  avg_daily_earning: number
  city: string
  zone: string
  upi_id: string
  tier: 'basic' | 'standard' | 'premium' | ''
}

const CITIES = Object.keys(ZONE_RISK_MAP)

function ProgressBar({ step }: { step: Step }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2.5rem' }}>
      {([1, 2, 3, 4] as Step[]).map((s, i) => (
        <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < 3 ? 1 : undefined }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.85rem',
              flexShrink: 0,
              background: step > s ? 'var(--brand-primary)' : step === s ? 'var(--brand-primary)' : 'var(--surface-3)',
              color: step >= s ? 'white' : 'var(--text-muted)',
              transition: 'all 0.2s',
            }}
          >
            {step > s ? <Check size={16} /> : s}
          </div>
          {i < 3 && (
            <div
              style={{
                flex: 1,
                height: 2,
                background: step > s ? 'var(--brand-primary)' : 'var(--surface-3)',
                margin: '0 0.25rem',
                transition: 'background 0.3s',
              }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

function StepLabel({ step }: { step: Step }) {
  const labels: Record<Step, string> = {
    1: 'Personal Details',
    2: 'Platform & Earnings',
    3: 'Your Zone',
    4: 'Choose Your Plan',
  }
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>
        Step {step} of 4
      </div>
      <h2 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
        {labels[step]}
      </h2>
    </div>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [form, setForm] = useState<FormData>({
    name: '',
    phone: '',
    otp: '',
    platform: '',
    platform_id: '',
    years_active: 2,
    avg_daily_earning: 750,
    city: '',
    zone: '',
    upi_id: '',
    tier: '',
  })
  const [otpSent, setOtpSent] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpError, setOtpError] = useState('')
  const [activating, setActivating] = useState(false)
  const [success, setSuccess] = useState(false)

  const set = (key: keyof FormData, value: string | number) =>
    setForm((f) => ({ ...f, [key]: value }))

  const sendOtp = async () => {
    if (!/^\d{10}$/.test(form.phone)) {
      setOtpError('Enter a valid 10-digit phone number')
      return
    }
    setOtpError('')
    setOtpLoading(true)
    await new Promise((r) => setTimeout(r, 1500))
    setOtpLoading(false)
    setOtpSent(true)
  }

  const verifyOtp = () => {
    if (form.otp !== '123456') {
      setOtpError('Incorrect OTP. Use 123456 for demo.')
      return
    }
    setOtpError('')
    setStep(2)
  }

  const getZones = () => (form.city ? Object.keys(ZONE_RISK_MAP[form.city] ?? {}) : [])

  const getZoneRisk = () =>
    form.city && form.zone ? ZONE_RISK_MAP[form.city]?.[form.zone]?.overall_risk ?? 1.0 : null

  const getRiskBadge = (risk: number | null) => {
    if (!risk) return null
    if (risk >= 1.3) return { label: 'Very High Risk Zone', color: '#DC2626', icon: '🌧️' }
    if (risk >= 1.2) return { label: 'High Risk Zone', color: '#EA580C', icon: '⚠️' }
    if (risk >= 1.1) return { label: 'Moderate Risk Zone', color: '#D97706', icon: '🔶' }
    return { label: 'Lower Risk Zone', color: '#16A34A', icon: '✅' }
  }

  const getMonthlyFactor = () => SEASONAL_FACTORS[new Date().getMonth() + 1] ?? 1.0

  const getQuote = (tier: 'basic' | 'standard' | 'premium') => {
    const config = TIER_CONFIG[tier]
    const risk = getZoneRisk() ?? 1.0
    const seasonal = getMonthlyFactor()
    return Math.round(config.base * risk * seasonal)
  }

  const activate = async () => {
    if (!form.tier) return
    setActivating(true)
    await new Promise((r) => setTimeout(r, 1500))
    const policy = {
      worker_name: form.name,
      platform: form.platform,
      city: form.city,
      zone: form.zone,
      tier: form.tier,
      weekly_premium: getQuote(form.tier as 'basic' | 'standard' | 'premium'),
      coverage_per_day: TIER_CONFIG[form.tier as 'basic' | 'standard' | 'premium'].dailyCap,
      status: 'active',
    }
    localStorage.setItem('aegisync_policy', JSON.stringify(policy))
    setActivating(false)
    setSuccess(true)
    await new Promise((r) => setTimeout(r, 1200))
    router.push('/dashboard')
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-sm)',
    border: '1.5px solid var(--border)',
    fontSize: '0.95rem',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    background: 'var(--surface-1)',
    color: 'var(--text-primary)',
  }

  return (
    <div style={{ background: 'var(--surface-2)', minHeight: '100vh', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <div
          style={{
            background: 'var(--surface-1)',
            borderRadius: 'var(--radius-lg)',
            padding: 'clamp(1.5rem, 5vw, 2.5rem)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
            <Shield size={22} style={{ color: 'var(--brand-primary)' }} />
            <span className="font-display" style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
              Gig<span style={{ color: 'var(--brand-primary)' }}>Shield</span>
            </span>
          </div>

          <ProgressBar step={step} />
          <StepLabel step={step} />

          {/* ── Step 1 ── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.4rem' }}>
                  Full Name
                </label>
                <input type="text" placeholder="Rajesh Kumar" value={form.name} onChange={(e) => set('name', e.target.value)} style={inputStyle} />
              </div>

              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.4rem' }}>
                  Phone Number
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ padding: '0.75rem 1rem', background: 'var(--surface-2)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>+91</span>
                  <input type="tel" placeholder="9876543210" value={form.phone} maxLength={10} onChange={(e) => set('phone', e.target.value.replace(/\D/g, ''))} style={{ ...inputStyle, flex: 1, width: 'auto' }} />
                </div>
              </div>

              {!otpSent ? (
                <button className="btn-primary" onClick={sendOtp} disabled={otpLoading || !form.name || form.phone.length !== 10}
                  style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', opacity: (!form.name || form.phone.length !== 10) ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {otpLoading ? <><Loader2 size={18} className="spin" /> Sending OTP…</> : 'Send OTP'}
                </button>
              ) : (
                <>
                  <div>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.4rem' }}>Enter OTP</label>
                    <input type="text" placeholder="123456" value={form.otp} maxLength={6} autoFocus
                      onChange={(e) => set('otp', e.target.value.replace(/\D/g, ''))}
                      style={{ ...inputStyle, letterSpacing: '0.3em', textAlign: 'center', border: '1.5px solid var(--brand-primary)' }} />
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                      Demo: use code <strong style={{ color: 'var(--brand-primary)' }}>123456</strong>
                    </p>
                  </div>
                  <button className="btn-primary" onClick={verifyOtp} disabled={form.otp.length !== 6}
                    style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', opacity: form.otp.length !== 6 ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Verify &amp; Continue
                  </button>
                </>
              )}

              {otpError && <p style={{ fontSize: '0.85rem', color: 'var(--brand-danger)', textAlign: 'center' }}>{otpError}</p>}
            </div>
          )}

          {/* ── Step 2 ── */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.75rem' }}>Your Platform</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {(['zomato', 'swiggy'] as const).map((p) => (
                    <button key={p} onClick={() => set('platform', p)}
                      style={{
                        padding: '1rem', borderRadius: 'var(--radius-sm)',
                        border: `2px solid ${form.platform === p ? 'var(--brand-primary)' : 'var(--border)'}`,
                        background: form.platform === p ? 'rgba(255,107,0,0.06)' : 'var(--surface-1)',
                        cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem',
                        color: form.platform === p ? 'var(--brand-primary)' : 'var(--text-secondary)',
                        transition: 'all 0.15s', fontFamily: 'inherit',
                      }}>
                      {p === 'zomato' ? '🔴 Zomato' : '🟠 Swiggy'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.4rem' }}>
                  Partner ID <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
                </label>
                <input type="text" placeholder="SWG847291" value={form.platform_id} onChange={(e) => set('platform_id', e.target.value)} style={inputStyle} />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Years on Platform</label>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--brand-primary)' }}>{form.years_active} yr{form.years_active !== 1 ? 's' : ''}</span>
                </div>
                <input type="range" min={0} max={10} step={1} value={form.years_active} onChange={(e) => set('years_active', Number(e.target.value))} style={{ width: '100%' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>0</span><span>10+</span>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Avg Daily Earnings</label>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--brand-primary)' }}>{formatINR(form.avg_daily_earning)}/day</span>
                </div>
                <input type="range" min={300} max={1500} step={50} value={form.avg_daily_earning} onChange={(e) => set('avg_daily_earning', Number(e.target.value))} style={{ width: '100%' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>₹300</span><span>₹1,500</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  Weekly earnings estimate: <strong style={{ color: 'var(--text-primary)' }}>~{formatINR(form.avg_daily_earning * 6)}</strong>
                </p>
              </div>

              <button className="btn-primary" onClick={() => setStep(3)} disabled={!form.platform}
                style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', opacity: !form.platform ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Continue
              </button>
            </div>
          )}

          {/* ── Step 3 ── */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.4rem' }}>City</label>
                <div style={{ position: 'relative' }}>
                  <select value={form.city} onChange={(e) => { set('city', e.target.value); set('zone', '') }}
                    style={{ ...inputStyle, paddingRight: '2.5rem', appearance: 'none', cursor: 'pointer', color: form.city ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    <option value="">Select your city…</option>
                    {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown size={16} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.4rem' }}>Zone / Neighbourhood</label>
                <div style={{ position: 'relative' }}>
                  <select value={form.zone} onChange={(e) => set('zone', e.target.value)} disabled={!form.city}
                    style={{ ...inputStyle, paddingRight: '2.5rem', appearance: 'none', cursor: form.city ? 'pointer' : 'not-allowed', color: form.zone ? 'var(--text-primary)' : 'var(--text-muted)', opacity: form.city ? 1 : 0.6, background: form.city ? 'var(--surface-1)' : 'var(--surface-2)' }}>
                    <option value="">Select your zone…</option>
                    {getZones().map((z) => <option key={z} value={z}>{z}</option>)}
                  </select>
                  <ChevronDown size={16} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                </div>
              </div>

              {form.zone && (() => {
                const risk = getZoneRisk()
                const badge = getRiskBadge(risk)
                return badge ? (
                  <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', background: `${badge.color}15`, border: `1px solid ${badge.color}40`, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: badge.color }}>
                    <span>{badge.icon}</span>
                    {badge.label} · Risk score {risk?.toFixed(2)}
                  </div>
                ) : null
              })()}

              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.4rem' }}>UPI ID</label>
                <input type="text" placeholder="yourname@upibank" value={form.upi_id} onChange={(e) => set('upi_id', e.target.value)}
                  style={{ ...inputStyle, border: `1.5px solid ${form.upi_id && !form.upi_id.includes('@') ? 'var(--brand-danger)' : 'var(--border)'}` }} />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>Payouts land directly here. Format: name@bank</p>
              </div>

              <button className="btn-primary" onClick={() => setStep(4)} disabled={!form.city || !form.zone || !form.upi_id.includes('@')}
                style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', opacity: (!form.city || !form.zone || !form.upi_id.includes('@')) ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                View My Plans
              </button>
              <button onClick={() => setStep(2)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'inherit' }}>← Back</button>
            </div>
          )}

          {/* ── Step 4 ── */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {(['basic', 'standard', 'premium'] as const).map((tier) => {
                const config = TIER_CONFIG[tier]
                const price = getQuote(tier)
                const isSelected = form.tier === tier
                const isRecommended = tier === 'standard'
                return (
                  <div key={tier} onClick={() => set('tier', tier)}
                    style={{
                      border: `2px solid ${isSelected ? 'var(--brand-primary)' : isRecommended && !form.tier ? 'var(--brand-primary)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius)', padding: '1.25rem', cursor: 'pointer',
                      background: isSelected ? 'rgba(255,107,0,0.05)' : 'var(--surface-1)',
                      position: 'relative', transition: 'all 0.15s',
                    }}>
                    {isRecommended && (
                      <div style={{ position: 'absolute', top: '-12px', left: '1rem', background: 'var(--brand-primary)', color: 'white', fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 100, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                        Recommended
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 700, textTransform: 'capitalize', fontSize: '1rem', color: 'var(--text-primary)' }}>{tier}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          Up to {formatINR(config.dailyCap)}/day · {config.maxDays} days/wk · {config.maxHours} hrs/day
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--brand-primary)' }}>₹{price}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/week</div>
                      </div>
                    </div>
                    <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {[`≈₹${price * 4}/mo`, tier === 'basic' ? 'Rainfall only' : 'All 5 events', tier === 'premium' ? 'Priority payouts' : tier === 'standard' ? 'Auto-approve' : 'Basic coverage'].map((f) => (
                        <span key={f} style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: 100, background: 'var(--surface-2)', color: 'var(--text-secondary)', fontWeight: 500 }}>{f}</span>
                      ))}
                    </div>
                  </div>
                )
              })}

              {success ? (
                <div style={{ padding: '1.25rem', borderRadius: 'var(--radius)', background: '#DCFCE7', border: '1px solid #16A34A40', textAlign: 'center', color: '#16A34A', fontWeight: 700 }}>
                  ✅ Policy activated! Redirecting to dashboard…
                </div>
              ) : (
                <button className="btn-primary" onClick={activate} disabled={!form.tier || activating}
                  style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', marginTop: '0.5rem', opacity: !form.tier ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {activating
                    ? <><Loader2 size={18} className="spin" /> Activating…</>
                    : form.tier ? `Activate for ₹${getQuote(form.tier as 'basic' | 'standard' | 'premium')}/week` : 'Select a Plan'}
                </button>
              )}

              <button onClick={() => setStep(3)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'inherit' }}>← Back</button>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
