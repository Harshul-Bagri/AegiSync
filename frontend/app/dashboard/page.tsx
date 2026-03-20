'use client'

import { useState, useEffect } from 'react'
import { Shield, AlertTriangle, TrendingUp, Clock, CheckCircle, XCircle, Eye } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import {
  DEMO_WORKER,
  DEMO_POLICY,
  DEMO_CLAIMS,
  ACTIVE_DISRUPTION,
} from '@/lib/mockData'
import { formatINR, formatDate, timeAgo, getDisruptionIcon, getStatusColor, getStatusBg } from '@/lib/utils'

const DONUT_DATA = [
  { name: 'Rainfall', value: 60, color: '#3B82F6' },
  { name: 'AQI', value: 25, color: '#8B5CF6' },
  { name: 'Outage', value: 15, color: '#F59E0B' },
]

const totalProtected = DEMO_CLAIMS
  .filter((c) => c.status === 'approved')
  .reduce((sum, c) => sum + c.amount, 0)

const approvedCount = DEMO_CLAIMS.filter((c) => c.status === 'approved').length
const approvalRate = Math.round((approvedCount / DEMO_CLAIMS.length) * 100)

export default function DashboardPage() {
  const [showBanner, setShowBanner] = useState(false)
  const [progress, setProgress] = useState(35)

  useEffect(() => {
    const t = setTimeout(() => setShowBanner(true), 5000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!showBanner) return
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 5, 85))
    }, 2000)
    return () => clearInterval(interval)
  }, [showBanner])

  const expectedPayout = Math.round(
    (DEMO_WORKER.avg_daily_earning / 8) * 3.5
  )

  return (
    <div style={{ background: 'var(--surface-2)', minHeight: '100vh', padding: '1.5rem 1rem' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 className="font-display" style={{ fontSize: 'clamp(1.4rem, 4vw, 2rem)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            Hey, {DEMO_WORKER.name.split(' ')[0]} 👋
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {DEMO_WORKER.zone}, {DEMO_WORKER.city} · {DEMO_WORKER.platform === 'swiggy' ? '🟠 Swiggy' : '🔴 Zomato'} Partner
          </p>
        </div>

        {/* Disruption Alert Banner */}
        {showBanner && (
          <div
            style={{
              background: 'var(--surface-1)',
              border: '2px solid var(--brand-primary)',
              borderRadius: 'var(--radius)',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              animation: 'fadeIn 0.4s ease',
              boxShadow: '0 0 0 4px rgba(255,107,0,0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>
                {getDisruptionIcon(ACTIVE_DISRUPTION.type)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                    ACTIVE: Heavy Rainfall Alert
                  </span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 100, background: '#FEF2F2', color: '#DC2626', textTransform: 'uppercase' }}>
                    {ACTIVE_DISRUPTION.severity}
                  </span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  {ACTIVE_DISRUPTION.zone}, {ACTIVE_DISRUPTION.city} · Since {timeAgo(ACTIVE_DISRUPTION.started_at)} · {ACTIVE_DISRUPTION.trigger_value}mm/hr
                </p>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  Your claim is being processed automatically.{' '}
                  <strong style={{ color: 'var(--brand-primary)' }}>Expected payout: {formatINR(expectedPayout)}</strong>
                </p>
                {/* Progress bar */}
                <div style={{ background: 'var(--surface-3)', borderRadius: 100, height: 8, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${progress}%`,
                      background: 'var(--brand-primary)',
                      borderRadius: 100,
                      transition: 'width 1.5s ease',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  <span>Validating telemetry…</span>
                  <span>{progress}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>

          {/* Policy Card */}
          <div
            style={{
              background: 'var(--surface-1)',
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow-sm)',
              overflow: 'hidden',
              gridColumn: '1 / -1',
            }}
          >
            <div style={{ borderLeft: '4px solid var(--brand-primary)', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ background: 'rgba(255,107,0,0.1)', borderRadius: 'var(--radius-sm)', padding: '0.6rem' }}>
                    <Shield size={22} style={{ color: 'var(--brand-primary)' }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                      AegiSync ACTIVE
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Standard Plan · Week of {formatDate(DEMO_POLICY.start_date)} – 23 Mar
                    </div>
                  </div>
                </div>
                <span style={{ background: '#DCFCE7', color: '#16A34A', fontSize: '0.75rem', fontWeight: 700, padding: '0.3rem 0.75rem', borderRadius: 100 }}>
                  ACTIVE
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
                {[
                  { label: 'Weekly Premium', value: formatINR(DEMO_POLICY.weekly_premium) },
                  { label: 'Coverage / Day', value: `Up to ${formatINR(DEMO_POLICY.coverage_per_day)}` },
                  { label: 'Max Covered Days', value: `${DEMO_POLICY.max_days_per_week} days/week` },
                ].map((s) => (
                  <div key={s.label}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>{s.label}</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{s.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button className="btn-outline" style={{ padding: '0.55rem 1.25rem', fontSize: '0.875rem' }}>Manage Policy</button>
                <button style={{ padding: '0.55rem 1.25rem', fontSize: '0.875rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid #DC262640', background: '#FEF2F2', color: '#DC2626', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Pause Coverage
                </button>
              </div>
            </div>
          </div>

          {/* Earnings Widget */}
          <div style={{ background: 'var(--surface-1)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <TrendingUp size={18} style={{ color: 'var(--brand-accent)' }} />
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Earnings Protected</span>
            </div>
            <div style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              {formatINR(totalProtected)}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Across {approvedCount} approved claims this month
            </div>
            <div style={{ height: 120 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={DONUT_DATA} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" paddingAngle={2}>
                    {DONUT_DATA.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`${v}%`, '']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              {DONUT_DATA.map((d) => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                  {d.name} {d.value}%
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div style={{ background: 'var(--surface-1)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', padding: '1.5rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>Quick Stats</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { icon: <AlertTriangle size={16} style={{ color: '#F59E0B' }} />, label: 'Total Claims', value: DEMO_CLAIMS.length },
                { icon: <CheckCircle size={16} style={{ color: '#16A34A' }} />, label: 'Approval Rate', value: `${approvalRate}%` },
                { icon: <Clock size={16} style={{ color: 'var(--brand-primary)' }} />, label: 'Avg Payout Time', value: '4 min' },
              ].map((s) => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {s.icon}
                    {s.label}
                  </div>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{s.value}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '1.5rem', padding: '0.75rem', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Risk Profile</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ flex: 1, height: 6, background: 'var(--surface-3)', borderRadius: 100, overflow: 'hidden' }}>
                  <div style={{ width: `${((DEMO_WORKER.risk_score - 0.7) / 0.7) * 100}%`, height: '100%', background: 'var(--brand-primary)', borderRadius: 100 }} />
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--brand-primary)' }}>{DEMO_WORKER.risk_score}</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Zone risk score · Koramangala</div>
            </div>
          </div>
        </div>

        {/* Claims Timeline */}
        <div style={{ background: 'var(--surface-1)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', padding: '1.5rem', marginTop: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h2 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>Claims History</h2>
            <a href="/claims" style={{ fontSize: '0.8rem', color: 'var(--brand-primary)', fontWeight: 600, textDecoration: 'none' }}>View all →</a>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {DEMO_CLAIMS.map((claim, i) => (
              <div
                key={claim.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.875rem 0',
                  borderBottom: i < DEMO_CLAIMS.length - 1 ? '1px solid var(--border)' : 'none',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ fontSize: '1.5rem', flexShrink: 0, width: 36, textAlign: 'center' }}>
                  {getDisruptionIcon(claim.disruption_type)}
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                    {claim.disruption_type.replace('_', ' ')}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {formatDate(claim.created_at)} · {claim.hours_lost}h lost
                  </div>
                </div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  {formatINR(claim.amount)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{
                    fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 100,
                    background: getStatusBg(claim.status), color: getStatusColor(claim.status),
                    textTransform: 'capitalize', whiteSpace: 'nowrap',
                  }}>
                    {claim.status.replace('_', ' ')}
                  </span>
                  {claim.processing_time !== '—' && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      <Clock size={10} style={{ display: 'inline', marginRight: 2 }} />{claim.processing_time}
                    </span>
                  )}
                </div>
                {claim.status === 'approved' ? (
                  <CheckCircle size={16} style={{ color: '#16A34A', flexShrink: 0 }} />
                ) : claim.status === 'rejected' ? (
                  <XCircle size={16} style={{ color: '#DC2626', flexShrink: 0 }} />
                ) : claim.status === 'manual_review' ? (
                  <Eye size={16} style={{ color: '#9333EA', flexShrink: 0 }} />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
