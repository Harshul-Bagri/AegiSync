'use client'

import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, Users, DollarSign, ShieldAlert, TrendingDown, CheckCircle, XCircle, ChevronDown, Loader2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts'
import {
  ADMIN_STATS,
  FRAUD_QUEUE,
  LOSS_RATIO_DATA,
  ZONE_RISK_MAP,
  type FraudQueueItem,
  type Disruption,
  type DisruptionType,
  type Severity,
} from '@/lib/mockData'
import { formatINR, timeAgo, getDisruptionIcon } from '@/lib/utils'
import api from '@/lib/api'
import { getAdminToken, setAdminToken } from '@/lib/auth'

const CITIES = Object.keys(ZONE_RISK_MAP)
const DISRUPTION_TYPES: DisruptionType[] = ['rainfall', 'aqi', 'flood', 'bandh', 'outage']
const SEVERITIES: Severity[] = ['moderate', 'severe', 'extreme']

// ── Shape mapper: backend ClaimOut → frontend FraudQueueItem ─────────────────

interface ClaimOut {
  id: string
  claim_type: string
  fraud_flags: string[] | null
  bas_score: number | null
  fraud_score: number | null
  amount: number
  worker_name: string | null
  worker_city: string | null
  created_at: string
  fraud_method: string | null
  payout_gateway: string | null
}

interface ForecastPoint {
  city: string
  date: string
  disruption_type: DisruptionType
  probability: number
  expected_claims: number
}

const FORECAST_COLORS: Record<DisruptionType, { stroke: string; fill: string }> = {
  rainfall: { stroke: '#FF6B00', fill: 'rgba(255, 107, 0, 0.18)' },
  aqi: { stroke: '#7C3AED', fill: 'rgba(124, 58, 237, 0.16)' },
  flood: { stroke: '#2563EB', fill: 'rgba(37, 99, 235, 0.14)' },
  bandh: { stroke: '#DC2626', fill: 'rgba(220, 38, 38, 0.12)' },
  outage: { stroke: '#059669', fill: 'rgba(5, 150, 105, 0.12)' },
}

const FORECAST_HIGH_RISK_THRESHOLD = 0.6
const AVERAGE_EXPECTED_PAYOUT = 433.33

function mapClaimToFraudItem(c: ClaimOut): FraudQueueItem {
  return {
    id: c.id,
    worker_name: c.worker_name ?? 'Unknown Worker',
    city: c.worker_city ?? '',
    disruption_type: c.claim_type as DisruptionType,
    amount: c.amount,
    fraud_score: c.fraud_score ?? 0,
    bas_score: c.bas_score ?? 0,
    flags: c.fraud_flags ?? [],
    created_at: c.created_at,
    fraud_method: c.fraud_method ?? null,
    payout_gateway: c.payout_gateway ?? null,
  }
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div style={{ background: 'var(--surface-1)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', padding: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        {icon}
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      </div>
      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: accent ?? 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>{sub}</div>}
    </div>
  )
}

// ── Admin Login Form ──────────────────────────────────────────────────────────

function AdminLoginForm({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!username || !password) { setError('Enter credentials'); return }
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/auth/admin/login', { username, password })
      setAdminToken(res.data.token)
      onLogin()
    } catch {
      setError('Invalid credentials. Try admin / devtrails2026')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)',
    border: '1.5px solid var(--border)', fontSize: '0.95rem', outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box', background: 'var(--surface-1)',
    color: 'var(--text-primary)',
  }

  return (
    <div style={{ background: 'var(--surface-2)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: 'var(--surface-1)', borderRadius: 'var(--radius-lg)', padding: '2.5rem', boxShadow: 'var(--shadow-md)', maxWidth: 400, width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <ShieldAlert size={22} style={{ color: 'var(--brand-primary)' }} />
          <span className="font-display" style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
            Admin Portal
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} style={inputStyle} />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleLogin()} style={inputStyle} />
          {error && <p style={{ fontSize: '0.85rem', color: 'var(--brand-danger)' }}>{error}</p>}
          <button className="btn-primary" onClick={() => void handleLogin()} disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {loading ? <><Loader2 size={18} className="spin" /> Signing in…</> : 'Sign In'}
          </button>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1rem', textAlign: 'center' }}>
          Demo credentials: admin / devtrails2026
        </p>
      </div>
      <style jsx global>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

// ── Main Admin Page ───────────────────────────────────────────────────────────

export default function AdminPage() {
  const [adminLoggedIn, setAdminLoggedIn] = useState(false)
  const [secondsAgo, setSecondsAgo] = useState(0)
  const [disruptions, setDisruptions] = useState<Disruption[]>([])
  const [fraudQueue, setFraudQueue] = useState<FraudQueueItem[]>(FRAUD_QUEUE)
  const [adminStats, setAdminStats] = useState<typeof ADMIN_STATS | null>(null)
  const [lossRatio, setLossRatio] = useState(ADMIN_STATS.loss_ratio)
  const [forecast, setForecast] = useState<ForecastPoint[]>([])
  const [forecastCity, setForecastCity] = useState('Bengaluru')
  const [toast, setToast] = useState<string | null>(null)

  // Simulator state
  const [simCity, setSimCity] = useState('Bengaluru')
  const [simZone, setSimZone] = useState(Object.keys(ZONE_RISK_MAP['Bengaluru'])[0])
  const [simType, setSimType] = useState<DisruptionType>('rainfall')
  const [simSeverity, setSimSeverity] = useState<Severity>('extreme')
  const [simLoading, setSimLoading] = useState(false)

  // Check for existing admin token on mount
  useEffect(() => {
    if (getAdminToken()) setAdminLoggedIn(true)
  }, [])

  useEffect(() => {
    const t = setInterval(() => setSecondsAgo((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }, [])

  const fetchDashboard = useCallback(async () => {
    try {
      const [dashRes, disruptRes, fraudRes, lrRes, forecastRes] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/admin/disruptions/active'),
        api.get('/admin/fraud/queue'),
        api.get('/admin/analytics/loss-ratio'),
        api.get('/admin/analytics/forecast'),
      ])
      const totalP: number = lrRes.data.reduce((s: number, r: { premium_collected: number }) => s + r.premium_collected, 0)
      const totalC: number = lrRes.data.reduce((s: number, r: { claims_paid: number }) => s + r.claims_paid, 0)
      const nextLossRatio = totalP > 0 ? Math.round((totalC / totalP) * 100) : ADMIN_STATS.loss_ratio

      setAdminStats({
        active_workers: dashRes.data.total_workers,
        claims_today: dashRes.data.claims_today,
        amount_paid_today: dashRes.data.amount_paid_today,
        fraud_queue_count: dashRes.data.fraud_queue_count,
        loss_ratio: nextLossRatio,
        premium_collected_week: 0,
        claims_paid_week: 0,
      })
      setDisruptions(disruptRes.data)
      setFraudQueue((fraudRes.data as ClaimOut[]).map(mapClaimToFraudItem))
      setForecast(forecastRes.data as ForecastPoint[])
      setSecondsAgo(0)
      setLossRatio(nextLossRatio)
    } catch (e) {
      console.error('[Admin] API failed, using mock data', e)
    }
  }, [])

  useEffect(() => {
    if (!adminLoggedIn) return
    void fetchDashboard()
    const t = setInterval(() => void fetchDashboard(), 30_000)
    return () => clearInterval(t)
  }, [adminLoggedIn, fetchDashboard])

  const triggerDisruption = async () => {
    setSimLoading(true)
    try {
      const res = await api.post('/admin/disruptions/simulate', {
        type: simType, city: simCity, zone: simZone, severity: simSeverity,
      })
      const d = res.data.disruption
      const newD: Disruption = { ...d, workers_affected: res.data.claims_created }
      setDisruptions((prev) => [newD, ...prev])
      setSecondsAgo(0)
      showToast(`🚨 Disruption triggered in ${simZone} — ${res.data.claims_created} workers affected`)
      // Refresh fraud queue a few seconds later — new claims may land there
      setTimeout(() => void fetchDashboard(), 3000)
    } catch (e) {
      console.error('[Admin] Simulate failed', e)
      showToast('❌ Simulate failed — check backend logs')
    } finally {
      setSimLoading(false)
    }
  }

  const handleApprove = async (id: string) => {
    try {
      await api.post(`/admin/claims/${id}/approve`)
      setFraudQueue((q) => q.filter((item) => item.id !== id))
      showToast('✅ Claim approved and payout initiated')
    } catch {
      showToast('❌ Approve failed')
    }
  }

  const handleReject = async (id: string) => {
    try {
      await api.post(`/admin/claims/${id}/reject`, { reason: 'Rejected by admin via fraud queue' })
      setFraudQueue((q) => q.filter((item) => item.id !== id))
      showToast('❌ Claim rejected')
    } catch {
      showToast('❌ Reject failed')
    }
  }

  const getSimZones = () => Object.keys(ZONE_RISK_MAP[simCity] ?? {})
  const fraudScoreColor = (score: number) => score >= 70 ? '#DC2626' : score >= 50 ? '#EA580C' : '#D97706'

  const stats = adminStats ?? ADMIN_STATS
  const selectedForecast = forecast
    .filter((item) => item.city === forecastCity)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const forecastChartData = selectedForecast.reduce<Array<Record<string, string | number>>>((rows, item) => {
    const displayDate = new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    const existing = rows.find((row) => row.date === item.date)
    if (existing) {
      existing[item.disruption_type] = item.probability
      return rows
    }

    rows.push({
      date: item.date,
      displayDate,
      rainfall: 0,
      aqi: 0,
      flood: 0,
      bandh: 0,
      outage: 0,
      [item.disruption_type]: item.probability,
    })
    return rows
  }, [])

  const forecastSummaryByDay = forecastChartData.map((row) => {
    const date = String(row.date)
    const entries = selectedForecast.filter((item) => item.date === date)
    return {
      date,
      highestProbability: entries.reduce((max, item) => Math.max(max, item.probability), 0),
      totalClaims: entries.reduce((sum, item) => sum + item.expected_claims, 0),
    }
  })

  const highRiskDays = forecastSummaryByDay.filter((day) => day.highestProbability >= FORECAST_HIGH_RISK_THRESHOLD).length
  const estimatedClaims = forecastSummaryByDay.reduce((sum, day) => sum + day.totalClaims, 0)
  const estimatedPayouts = Math.round(estimatedClaims * AVERAGE_EXPECTED_PAYOUT)

  if (!adminLoggedIn) {
    return <AdminLoginForm onLogin={() => setAdminLoggedIn(true)} />
  }

  return (
    <div style={{ background: 'var(--surface-2)', minHeight: '100vh', padding: '1.5rem 1rem' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 className="font-display" style={{ fontSize: 'clamp(1.4rem, 4vw, 2rem)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            Admin Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>AegiSync Operations · {new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>
        </div>

        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <KpiCard icon={<Users size={16} style={{ color: 'var(--brand-primary)' }} />} label="Active Workers" value={String(stats.active_workers)} sub="Across 6 cities" />
          <KpiCard icon={<DollarSign size={16} style={{ color: 'var(--brand-accent)' }} />} label="Claims Today" value={String(stats.claims_today)} sub={`${formatINR(stats.amount_paid_today)} paid`} accent="var(--brand-accent)" />
          <KpiCard icon={<ShieldAlert size={16} style={{ color: '#DC2626' }} />} label="Fraud Queue" value={String(fraudQueue.length)} sub="Needs review" accent={fraudQueue.length > 0 ? '#DC2626' : undefined} />
          <KpiCard icon={<TrendingDown size={16} style={{ color: '#9333EA' }} />} label="Loss Ratio" value={`${lossRatio}%`} sub="Claims / premiums" accent={lossRatio > 75 ? '#DC2626' : lossRatio > 60 ? '#EA580C' : '#16A34A'} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>

          {/* Live Disruption Feed */}
          <div style={{ background: 'var(--surface-1)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Live Disruption Feed</h2>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Updated {secondsAgo}s ago</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: 280, overflowY: 'auto' }}>
              {disruptions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  No active disruptions
                </div>
              ) : disruptions.map((d) => (
                <div key={d.id} style={{
                  padding: '0.875rem', borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)', background: 'var(--surface-2)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>{getDisruptionIcon(d.type)}</span>
                    <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', textTransform: 'capitalize' }}>{d.type}</span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: 100, textTransform: 'uppercase', background: d.severity === 'extreme' ? '#FEF2F2' : d.severity === 'severe' ? '#FFF7ED' : '#FFFBEB', color: d.severity === 'extreme' ? '#DC2626' : d.severity === 'severe' ? '#EA580C' : '#D97706' }}>
                      {d.severity}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {d.zone ? `${d.zone}, ` : ''}{d.city} · {d.workers_affected} workers · {timeAgo(d.started_at)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Disruption Simulator */}
          <div style={{ background: 'var(--surface-1)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <AlertTriangle size={16} style={{ color: 'var(--brand-primary)' }} />
              <h2 style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Disruption Simulator</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
              {/* City */}
              <div style={{ position: 'relative' }}>
                <select value={simCity} onChange={(e) => { setSimCity(e.target.value); setSimZone(Object.keys(ZONE_RISK_MAP[e.target.value] ?? {})[0] ?? '') }}
                  style={{ width: '100%', padding: '0.65rem 2rem 0.65rem 0.875rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', fontSize: '0.875rem', fontFamily: 'inherit', appearance: 'none', background: 'var(--surface-1)', color: 'var(--text-primary)', cursor: 'pointer' }}>
                  {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              </div>

              {/* Zone */}
              <div style={{ position: 'relative' }}>
                <select value={simZone} onChange={(e) => setSimZone(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 2rem 0.65rem 0.875rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', fontSize: '0.875rem', fontFamily: 'inherit', appearance: 'none', background: 'var(--surface-1)', color: 'var(--text-primary)', cursor: 'pointer' }}>
                  {getSimZones().map((z) => <option key={z} value={z}>{z}</option>)}
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              </div>

              {/* Type */}
              <div style={{ position: 'relative' }}>
                <select value={simType} onChange={(e) => setSimType(e.target.value as DisruptionType)}
                  style={{ width: '100%', padding: '0.65rem 2rem 0.65rem 0.875rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', fontSize: '0.875rem', fontFamily: 'inherit', appearance: 'none', background: 'var(--surface-1)', color: 'var(--text-primary)', cursor: 'pointer' }}>
                  {DISRUPTION_TYPES.map((t) => <option key={t} value={t}>{getDisruptionIcon(t)} {t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              </div>

              {/* Severity */}
              <div style={{ position: 'relative' }}>
                <select value={simSeverity} onChange={(e) => setSimSeverity(e.target.value as Severity)}
                  style={{ width: '100%', padding: '0.65rem 2rem 0.65rem 0.875rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', fontSize: '0.875rem', fontFamily: 'inherit', appearance: 'none', background: 'var(--surface-1)', color: 'var(--text-primary)', cursor: 'pointer' }}>
                  {SEVERITIES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              </div>
            </div>

            <button className="btn-primary" onClick={() => void triggerDisruption()} disabled={simLoading}
              style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {simLoading ? '⏳ Triggering…' : '🚨 TRIGGER DISRUPTION'}
            </button>

            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem', textAlign: 'center' }}>
              Auto-creates claims for all active workers in this zone
            </p>
          </div>
        </div>

        {/* Loss Ratio Chart (mock data — backend has no per-week breakdown) */}
        <div style={{ background: 'var(--surface-1)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', padding: '1.5rem', marginBottom: '1rem' }}>
          <h2 style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '1.25rem' }}>Loss Ratio - Last 4 Weeks</h2>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={LOSS_RATIO_DATA} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="week" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} domain={[40, 90]} />
                <Tooltip formatter={(v: number) => [`${v}%`]} contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.8rem' }} />
                <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                <Bar dataKey="Bengaluru" fill="#FF6B00" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Mumbai" fill="#3B82F6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Delhi" fill="#8B5CF6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Chennai" fill="#00D4AA" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ background: 'var(--surface-1)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', padding: '1.5rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>Next 7 Days Forecast</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Predicted disruption probability by city and trigger type</p>
            </div>

            <div style={{ position: 'relative', minWidth: 180 }}>
              <select
                value={forecastCity}
                onChange={(e) => setForecastCity(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 2rem 0.65rem 0.875rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', fontSize: '0.875rem', fontFamily: 'inherit', appearance: 'none', background: 'var(--surface-1)', color: 'var(--text-primary)', cursor: 'pointer' }}
              >
                {CITIES.map((city) => <option key={city} value={city}>{city}</option>)}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            </div>
          </div>

          {forecastChartData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.875rem', border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)' }}>
              Forecast data will appear here once the analytics endpoint responds.
            </div>
          ) : (
            <>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={forecastChartData} margin={{ top: 10, right: 10, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="displayDate" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                    <YAxis
                      tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                      domain={[0, 1]}
                      tickFormatter={(value: number) => `${Math.round(value * 100)}%`}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [`${Math.round(value * 100)}%`, name]}
                      labelFormatter={(_: string, payload?: Array<{ payload?: { date?: string } }>) => payload?.[0]?.payload?.date ?? ''}
                      contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.8rem' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                    {DISRUPTION_TYPES.map((type) => (
                      <Area
                        key={type}
                        type="monotone"
                        dataKey={type}
                        name={`${getDisruptionIcon(type)} ${type.charAt(0).toUpperCase() + type.slice(1)}`}
                        stroke={FORECAST_COLORS[type].stroke}
                        fill={FORECAST_COLORS[type].fill}
                        strokeWidth={2}
                        fillOpacity={1}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div style={{ marginTop: '1rem', padding: '0.9rem 1rem', borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                {forecastCity}: {highRiskDays} high-risk {highRiskDays === 1 ? 'day' : 'days'} forecast this week - estimated {estimatedClaims} claims, {formatINR(estimatedPayouts)} expected payouts.
              </div>
            </>
          )}
        </div>

        {/* Fraud Queue */}
        <div style={{ background: 'var(--surface-1)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <ShieldAlert size={16} style={{ color: '#DC2626' }} />
            <h2 style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
              Fraud Review Queue
            </h2>
            {fraudQueue.length > 0 && (
              <span style={{ background: '#FEF2F2', color: '#DC2626', fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 100 }}>
                {fraudQueue.length} pending
              </span>
            )}
          </div>

          {fraudQueue.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              <CheckCircle size={32} style={{ color: '#16A34A', margin: '0 auto 0.75rem' }} />
              Queue is clear — all claims resolved
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {fraudQueue.map((item) => (
                <div key={item.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '1rem', background: 'var(--surface-2)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{item.worker_name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.city}</span>
                        <span>{getDisruptionIcon(item.disruption_type)}</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{formatINR(item.amount)}</span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 100, background: `${fraudScoreColor(item.fraud_score)}20`, color: fraudScoreColor(item.fraud_score) }}>
                          Fraud {item.fraud_score}
                        </span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: 100, background: 'var(--surface-3)', color: 'var(--text-secondary)' }}>
                          BAS {item.bas_score}
                        </span>
                        {item.fraud_method && (
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 100, background: '#EDE9FE', color: '#6D28D9', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {item.fraud_method.replace(/_/g, ' ')}
                          </span>
                        )}
                        {item.payout_gateway && (
                          <span style={{
                            fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 100,
                            background: item.payout_gateway === 'upi' ? '#D1FAE5' : '#DBEAFE',
                            color: item.payout_gateway === 'upi' ? '#065F46' : '#1E40AF',
                          }}>
                            {item.payout_gateway === 'upi' ? '🏦 UPI' : '💳 Razorpay'}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {item.flags.map((flag, i) => (
                          <span key={i} style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem', borderRadius: 4, background: '#FFF7ED', color: '#9A3412', border: '1px solid #FED7AA', maxWidth: 260 }}>
                            {flag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      <button onClick={() => void handleApprove(item.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 0.875rem', borderRadius: 'var(--radius-sm)', border: 'none', background: '#DCFCE7', color: '#16A34A', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                        <CheckCircle size={14} /> Approve
                      </button>
                      <button onClick={() => void handleReject(item.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 0.875rem', borderRadius: 'var(--radius-sm)', border: 'none', background: '#FEF2F2', color: '#DC2626', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                        <XCircle size={14} /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 999,
          background: 'var(--brand-secondary)', color: 'white',
          padding: '0.875rem 1.25rem', borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow-lg)', fontSize: '0.875rem', fontWeight: 600,
          animation: 'slideUp 0.3s ease', maxWidth: 320,
        }}>
          {toast}
        </div>
      )}

      <style jsx global>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
