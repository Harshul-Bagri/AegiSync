'use client'

import { useState, useEffect, useCallback } from 'react'
import { Shield, AlertTriangle, TrendingUp, Clock, CheckCircle, XCircle, Eye } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { useTranslations } from 'next-intl'
import {
  DEMO_WORKER,
  DEMO_POLICY,
  DEMO_CLAIMS,
  ACTIVE_DISRUPTION,
  type Claim,
  type Disruption,
} from '@/lib/mockData'
import { formatINR, formatDate, timeAgo, getDisruptionIcon, getStatusColor, getStatusBg } from '@/lib/utils'
import api from '@/lib/api'

export default function DashboardPage() {
  const t = useTranslations('dashboard')

  const DONUT_DATA = [
    { name: t('chart.rainfall'), value: 60, color: '#3B82F6' },
    { name: t('chart.aqi'), value: 25, color: '#8B5CF6' },
    { name: t('chart.outage'), value: 15, color: '#F59E0B' },
  ]

  const [workerData, setWorkerData] = useState<typeof DEMO_WORKER & {
    policy: typeof DEMO_POLICY | null
    recent_claims: Array<{
      id: string; status: string; claim_type: string; amount: number
      hours_lost: number | null; fraud_score: number | null; auto_approved: boolean; created_at: string
    }>
    total_earnings_protected: number
  } | null>(null)
  const [activeDisruptions, setActiveDisruptions] = useState<Disruption[]>([])
  const [apiLoaded, setApiLoaded] = useState(false)
  const [showBanner, setShowBanner] = useState(false)
  const [progress, setProgress] = useState(35)

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/workers/me')
      setWorkerData(res.data)
      setApiLoaded(true)
      const city = res.data.city
      const zone = res.data.zone
      const dres = await api.get(`/disruptions/active?city=${encodeURIComponent(city)}&zone=${encodeURIComponent(zone)}`)
      setActiveDisruptions(dres.data)
      if (dres.data.length > 0) setShowBanner(true)
    } catch (e) {
      console.error('[Dashboard] API call failed, using mock data', e)
      setApiLoaded(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const t = setInterval(fetchData, 10_000)
    return () => clearInterval(t)
  }, [fetchData])

  useEffect(() => {
    if (!showBanner) return
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 5, 85))
    }, 2000)
    return () => clearInterval(interval)
  }, [showBanner])

  // ── Derived display values ─────────────────────────────────────────────────

  const worker = workerData ?? DEMO_WORKER
  const policy = workerData?.policy ?? DEMO_POLICY

  const claims: Claim[] = workerData?.recent_claims
    ? workerData.recent_claims.map((c) => ({
      id: c.id,
      disruption_type: c.claim_type as Claim['disruption_type'],
      city: workerData.city,
      zone: workerData.zone,
      status: c.status as Claim['status'],
      amount: c.amount,
      hours_lost: c.hours_lost ?? 0,
      created_at: c.created_at,
      auto_approved: c.auto_approved,
      bas_score: 0,
      fraud_score: c.fraud_score ?? 0,
      processing_time: c.auto_approved ? '4m' : '—',
      fraud_flags: [],
      gateway: (c as { gateway?: string }).gateway ?? null,
    }))
    : DEMO_CLAIMS

  const totalProtected = workerData
    ? workerData.total_earnings_protected
    : DEMO_CLAIMS.filter((c) => c.status === 'approved').reduce((sum, c) => sum + c.amount, 0)

  const approvedCount = claims.filter((c) => c.status === 'approved').length
  const approvalRate = claims.length > 0 ? Math.round((approvedCount / claims.length) * 100) : 0

  const activeDisruption: Disruption | null =
    activeDisruptions.length > 0
      ? activeDisruptions[0]
      : apiLoaded
        ? null
        : ACTIVE_DISRUPTION

  const expectedPayout = Math.round((worker.avg_daily_earning / 8) * 3.5)

  const policyStats = [
    { label: t('policy.weeklyPremium'), value: formatINR(policy.weekly_premium) },
    { label: t('policy.coveragePerDay'), value: `${t('policy.upTo')} ${formatINR(policy.coverage_per_day)}` },
    { label: t('policy.maxCoveredDays'), value: `${policy.max_days_per_week} ${t('policy.daysPerWeek')}` },
  ]

  const quickStats = [
    { icon: <AlertTriangle size={16} style={{ color: '#F59E0B' }} />, label: t('quickStats.totalClaims'), value: claims.length },
    { icon: <CheckCircle size={16} style={{ color: '#16A34A' }} />, label: t('quickStats.approvalRate'), value: `${approvalRate}%` },
    { icon: <Clock size={16} style={{ color: 'var(--brand-primary)' }} />, label: t('quickStats.avgPayoutTime'), value: t('quickStats.avgPayoutValue') },
  ]

  return (
    <div style={{ background: 'var(--surface-2)', minHeight: '100vh', padding: '1.5rem 1rem' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 className="font-display" style={{ fontSize: 'clamp(1.4rem, 4vw, 2rem)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            {t('greeting', { name: worker.name.split(' ')[0] })}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {worker.zone}, {worker.city} · {worker.platform === 'swiggy' ? '🟠 Swiggy' : '🔴 Zomato'} {t('partner')}
          </p>
        </div>

        {/* Disruption Alert Banner */}
        {showBanner && activeDisruption && (
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
                {getDisruptionIcon(activeDisruption.type)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem', textTransform: 'capitalize' }}>
                    {t('alert.active', { type: activeDisruption.type })}
                  </span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 100, background: '#FEF2F2', color: '#DC2626', textTransform: 'uppercase' }}>
                    {activeDisruption.severity}
                  </span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  {activeDisruption.zone ? `${activeDisruption.zone}, ` : ''}{activeDisruption.city} · {t('alert.since', { timeAgo: timeAgo(activeDisruption.started_at) })} · {activeDisruption.trigger_value}mm/hr
                </p>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  {t('alert.processing')}{' '}
                  <strong style={{ color: 'var(--brand-primary)' }}>{t('alert.expectedPayout')} {formatINR(expectedPayout)}</strong>
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
                  <span>{t('alert.validating')}</span>
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
                      {t('policy.title')}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                      {t('policy.planWeek', { tier: policy.tier, date: formatDate(policy.start_date) })}
                    </div>
                  </div>
                </div>
                <span style={{ background: '#DCFCE7', color: '#16A34A', fontSize: '0.75rem', fontWeight: 700, padding: '0.3rem 0.75rem', borderRadius: 100 }}>
                  {t('policy.active')}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
                {policyStats.map((s) => (
                  <div key={s.label}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>{s.label}</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{s.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button className="btn-outline" style={{ padding: '0.55rem 1.25rem', fontSize: '0.875rem' }}>{t('policy.managePolicy')}</button>
                <button style={{ padding: '0.55rem 1.25rem', fontSize: '0.875rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid #DC262640', background: '#FEF2F2', color: '#DC2626', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {t('policy.pauseCoverage')}
                </button>
              </div>
            </div>
          </div>

          {/* Earnings Widget */}
          <div style={{ background: 'var(--surface-1)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <TrendingUp size={18} style={{ color: 'var(--brand-accent)' }} />
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{t('earnings.title')}</span>
            </div>
            <div style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              {formatINR(totalProtected)}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              {t('earnings.acrossApproved', { count: approvedCount })}
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
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>{t('quickStats.title')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {quickStats.map((s) => (
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
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('quickStats.riskProfile')}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ flex: 1, height: 6, background: 'var(--surface-3)', borderRadius: 100, overflow: 'hidden' }}>
                  <div style={{ width: `${((Number(worker.risk_score) - 0.7) / 0.7) * 100}%`, height: '100%', background: 'var(--brand-primary)', borderRadius: 100 }} />
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--brand-primary)' }}>{Number(worker.risk_score).toFixed(2)}</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{t('quickStats.zoneRiskScore', { zone: worker.zone })}</div>
            </div>
          </div>
        </div>

        {/* Claims Timeline */}
        <div style={{ background: 'var(--surface-1)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', padding: '1.5rem', marginTop: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h2 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{t('claims.title')}</h2>
            <a href="/claims" style={{ fontSize: '0.8rem', color: 'var(--brand-primary)', fontWeight: 600, textDecoration: 'none' }}>{t('claims.viewAll')}</a>
          </div>

          {claims.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {t('claims.empty')}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {claims.map((claim, i) => (
                <div
                  key={claim.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.875rem 0',
                    borderBottom: i < claims.length - 1 ? '1px solid var(--border)' : 'none',
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
                      {formatDate(claim.created_at)} · {claim.hours_lost}{t('claims.hLost')}
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    {formatINR(claim.amount)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 100,
                      background: getStatusBg(claim.status as Parameters<typeof getStatusBg>[0]),
                      color: getStatusColor(claim.status as Parameters<typeof getStatusColor>[0]),
                      textTransform: 'capitalize', whiteSpace: 'nowrap',
                    }}>
                      {claim.status.replace('_', ' ')}
                    </span>
                    {claim.status === 'approved' && (claim as { gateway?: string | null }).gateway && (
                      <span style={{
                        fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: 100,
                        background: (claim as { gateway?: string | null }).gateway === 'upi' ? '#D1FAE5' : '#DBEAFE',
                        color: (claim as { gateway?: string | null }).gateway === 'upi' ? '#065F46' : '#1E40AF',
                        whiteSpace: 'nowrap',
                      }}>
                        {(claim as { gateway?: string | null }).gateway === 'upi' ? '🏦 via UPI' : '💳 via Razorpay'}
                      </span>
                    )}
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
          )}
        </div>
      </div>
    </div>
  )
}
