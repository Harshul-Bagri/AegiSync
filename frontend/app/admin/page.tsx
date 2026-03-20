'use client'

import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, Users, DollarSign, ShieldAlert, TrendingDown, CheckCircle, XCircle, ChevronDown } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import {
  ADMIN_STATS,
  FRAUD_QUEUE,
  ACTIVE_DISRUPTION,
  LOSS_RATIO_DATA,
  ZONE_RISK_MAP,
  type FraudQueueItem,
  type Disruption,
  type DisruptionType,
  type Severity,
} from '@/lib/mockData'
import { formatINR, timeAgo, getDisruptionIcon } from '@/lib/utils'

const CITIES = Object.keys(ZONE_RISK_MAP)
const DISRUPTION_TYPES: DisruptionType[] = ['rainfall', 'aqi', 'flood', 'bandh', 'outage']
const SEVERITIES: Severity[] = ['moderate', 'severe', 'extreme']

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

export default function AdminPage() {
  const [secondsAgo, setSecondsAgo] = useState(0)
  const [disruptions, setDisruptions] = useState<Disruption[]>([ACTIVE_DISRUPTION])
  const [fraudQueue, setFraudQueue] = useState<FraudQueueItem[]>(FRAUD_QUEUE)
  const [toast, setToast] = useState<string | null>(null)

  // Simulator state
  const [simCity, setSimCity] = useState('Bengaluru')
  const [simZone, setSimZone] = useState(Object.keys(ZONE_RISK_MAP['Bengaluru'])[0])
  const [simType, setSimType] = useState<DisruptionType>('rainfall')
  const [simSeverity, setSimSeverity] = useState<Severity>('extreme')
  const [simLoading, setSimLoading] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setSecondsAgo((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }, [])

  const triggerDisruption = async () => {
    setSimLoading(true)
    await new Promise((r) => setTimeout(r, 1500))

    const zones = ZONE_RISK_MAP[simCity] ?? {}
    const zoneData = zones[simZone]
    const workersAffected = Math.floor(Math.random() * 15) + 5

    const newDisruption: Disruption = {
      id: `d-sim-${Date.now()}`,
      type: simType,
      city: simCity,
      zone: simZone,
      severity: simSeverity,
      trigger_value: simType === 'rainfall' ? 65 + Math.random() * 20 : simType === 'aqi' ? 255 + Math.random() * 50 : 1,
      threshold_value: simType === 'rainfall' ? 60 : simType === 'aqi' ? 250 : 1,
      api_source: simType === 'rainfall' ? 'OpenWeatherMap' : simType === 'aqi' ? 'OpenAQ' : 'Platform Monitor',
      started_at: new Date().toISOString(),
      is_active: true,
      workers_affected: workersAffected,
    }

    setDisruptions((prev) => [newDisruption, ...prev])
    setSimLoading(false)
    setSecondsAgo(0)
    showToast(`🚨 Disruption triggered in ${simZone} — ${workersAffected} workers affected`)
    void zoneData
  }

  const handleApprove = (id: string) => {
    setFraudQueue((q) => q.filter((item) => item.id !== id))
    showToast('✅ Claim approved and payout initiated')
  }

  const handleReject = (id: string) => {
    setFraudQueue((q) => q.filter((item) => item.id !== id))
    showToast('❌ Claim rejected')
  }

  const getSimZones = () => Object.keys(ZONE_RISK_MAP[simCity] ?? {})

  const fraudScoreColor = (score: number) => score >= 70 ? '#DC2626' : score >= 50 ? '#EA580C' : '#D97706'

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
          <KpiCard icon={<Users size={16} style={{ color: 'var(--brand-primary)' }} />} label="Active Workers" value={String(ADMIN_STATS.active_workers)} sub="Across 6 cities" />
          <KpiCard icon={<DollarSign size={16} style={{ color: 'var(--brand-accent)' }} />} label="Claims Today" value={String(ADMIN_STATS.claims_today)} sub={`${formatINR(ADMIN_STATS.amount_paid_today)} paid`} accent="var(--brand-accent)" />
          <KpiCard icon={<ShieldAlert size={16} style={{ color: '#DC2626' }} />} label="Fraud Queue" value={String(fraudQueue.length)} sub="Needs review" accent={fraudQueue.length > 0 ? '#DC2626' : undefined} />
          <KpiCard icon={<TrendingDown size={16} style={{ color: '#9333EA' }} />} label="Loss Ratio" value={`${ADMIN_STATS.loss_ratio}%`} sub="Claims / premiums" accent={ADMIN_STATS.loss_ratio > 75 ? '#DC2626' : ADMIN_STATS.loss_ratio > 60 ? '#EA580C' : '#16A34A'} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>

          {/* Live Disruption Feed */}
          <div style={{ background: 'var(--surface-1)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Live Disruption Feed</h2>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Updated {secondsAgo}s ago</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: 280, overflowY: 'auto' }}>
              {disruptions.map((d) => (
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

            <button className="btn-primary" onClick={triggerDisruption} disabled={simLoading}
              style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {simLoading ? '⏳ Triggering…' : '🚨 TRIGGER DISRUPTION'}
            </button>

            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem', textAlign: 'center' }}>
              Auto-creates claims for all active workers in this zone
            </p>
          </div>
        </div>

        {/* Loss Ratio Chart */}
        <div style={{ background: 'var(--surface-1)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', padding: '1.5rem', marginBottom: '1rem' }}>
          <h2 style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '1.25rem' }}>Loss Ratio — Last 4 Weeks</h2>
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
                      <button onClick={() => handleApprove(item.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 0.875rem', borderRadius: 'var(--radius-sm)', border: 'none', background: '#DCFCE7', color: '#16A34A', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                        <CheckCircle size={14} /> Approve
                      </button>
                      <button onClick={() => handleReject(item.id)}
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
    </div>
  )
}
