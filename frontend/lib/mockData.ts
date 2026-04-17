// ─── Types ────────────────────────────────────────────────────────────────────

export type Platform = 'zomato' | 'swiggy'
export type PolicyTier = 'basic' | 'standard' | 'premium'
export type PolicyStatus = 'active' | 'paused' | 'expired' | 'cancelled'
export type ClaimStatus = 'approved' | 'pending' | 'rejected' | 'manual_review'
export type DisruptionType = 'rainfall' | 'aqi' | 'flood' | 'bandh' | 'outage'
export type Severity = 'moderate' | 'severe' | 'extreme'

export interface Worker {
  id: string
  name: string
  phone: string
  email: string
  city: string
  zone: string
  pincode: string
  platform: Platform
  platform_id: string
  upi_id: string
  avg_daily_earning: number
  years_active: number
  risk_score: number
  is_verified: boolean
}

export interface Policy {
  id: string
  worker_id: string
  tier: PolicyTier
  weekly_premium: number
  base_premium: number
  coverage_per_day: number
  max_days_per_week: number
  max_hours_per_day: number
  status: PolicyStatus
  start_date: string
  zone_risk_score: number
  seasonal_factor: number
  claim_history_factor: number
}

export interface Claim {
  id: string
  disruption_type: DisruptionType
  city: string
  zone: string
  status: ClaimStatus
  amount: number
  hours_lost: number
  created_at: string
  auto_approved: boolean
  bas_score: number
  fraud_score: number
  processing_time: string
  fraud_flags: string[]
  review_reason?: string
}

export interface Disruption {
  id: string
  type: DisruptionType
  city: string
  zone: string | null
  severity: Severity
  trigger_value: number
  threshold_value: number
  api_source: string
  started_at: string
  is_active: boolean
  workers_affected: number
}

export interface FraudQueueItem {
  id: string
  worker_name: string
  city: string
  disruption_type: DisruptionType
  amount: number
  fraud_score: number
  bas_score: number
  flags: string[]
  created_at: string
  fraud_method: string | null
  payout_gateway?: string | null
}

// ─── Tier Config (from CLAUDE.md Phase 2 Step 2.4) ────────────────────────────

export const TIER_CONFIG = {
  basic: { base: 79, dailyCap: 400, maxDays: 2, maxHours: 4 },
  standard: { base: 129, dailyCap: 650, maxDays: 3, maxHours: 6 },
  premium: { base: 199, dailyCap: 900, maxDays: 5, maxHours: 8 },
} as const

export const SEASONAL_FACTORS: Record<number, number> = {
  1: 1.05, 2: 1.0, 3: 1.0, 4: 1.02, 5: 1.05,
  6: 1.15, 7: 1.20, 8: 1.18, 9: 1.12,
  10: 1.05, 11: 1.10, 12: 1.08,
}

// ─── Zone Risk Map (matches backend zone_risk_profiles seed) ──────────────────

export const ZONE_RISK_MAP: Record<string, Record<string, { pincode: string; overall_risk: number; flood_risk: number; aqi_risk: number }>> = {
  Bengaluru: {
    Koramangala: { pincode: '560034', overall_risk: 1.28, flood_risk: 0.75, aqi_risk: 0.35 },
    Indiranagar: { pincode: '560038', overall_risk: 1.10, flood_risk: 0.50, aqi_risk: 0.35 },
    Whitefield: { pincode: '560066', overall_risk: 0.92, flood_risk: 0.30, aqi_risk: 0.40 },
    'BTM Layout': { pincode: '560076', overall_risk: 1.30, flood_risk: 0.80, aqi_risk: 0.35 },
  },
  Mumbai: {
    'Andheri West': { pincode: '400058', overall_risk: 1.38, flood_risk: 0.85, aqi_risk: 0.55 },
    Bandra: { pincode: '400050', overall_risk: 1.25, flood_risk: 0.70, aqi_risk: 0.55 },
    Powai: { pincode: '400076', overall_risk: 1.12, flood_risk: 0.60, aqi_risk: 0.50 },
  },
  Delhi: {
    Dwarka: { pincode: '110075', overall_risk: 1.25, flood_risk: 0.40, aqi_risk: 0.95 },
    'Lajpat Nagar': { pincode: '110024', overall_risk: 1.22, flood_risk: 0.35, aqi_risk: 0.90 },
    Rohini: { pincode: '110085', overall_risk: 1.15, flood_risk: 0.30, aqi_risk: 0.92 },
  },
  Chennai: {
    'T Nagar': { pincode: '600017', overall_risk: 1.18, flood_risk: 0.65, aqi_risk: 0.40 },
    Velachery: { pincode: '600042', overall_risk: 1.32, flood_risk: 0.85, aqi_risk: 0.40 },
  },
  Pune: {
    Kothrud: { pincode: '411038', overall_risk: 0.98, flood_risk: 0.35, aqi_risk: 0.45 },
    Hadapsar: { pincode: '411028', overall_risk: 1.08, flood_risk: 0.50, aqi_risk: 0.45 },
  },
  Hyderabad: {
    'Banjara Hills': { pincode: '500034', overall_risk: 0.97, flood_risk: 0.40, aqi_risk: 0.50 },
    'LB Nagar': { pincode: '500074', overall_risk: 1.16, flood_risk: 0.65, aqi_risk: 0.50 },
  },
}

// ─── Demo Worker ──────────────────────────────────────────────────────────────

export const DEMO_WORKER: Worker = {
  id: 'w-demo-001',
  name: 'Rajesh Kumar',
  phone: '9876543210',
  email: 'rajesh.kumar@example.com',
  city: 'Bengaluru',
  zone: 'Koramangala',
  pincode: '560034',
  platform: 'swiggy',
  platform_id: 'SWG847291',
  upi_id: 'rajesh.kumar@okaxis',
  avg_daily_earning: 750,
  years_active: 3,
  risk_score: 1.28,
  is_verified: true,
}

// ─── Demo Policy (Standard, ₹149/week) ───────────────────────────────────────
// Premium: 129 × 1.28 (zone) × 1.0 (seasonal-March) × 0.90 (history) ≈ ₹149

export const DEMO_POLICY: Policy = {
  id: 'p-demo-001',
  worker_id: 'w-demo-001',
  tier: 'standard',
  weekly_premium: 149,
  base_premium: 129,
  coverage_per_day: 650,
  max_days_per_week: 3,
  max_hours_per_day: 6,
  status: 'active',
  start_date: '2026-03-17',
  zone_risk_score: 1.28,
  seasonal_factor: 1.0,
  claim_history_factor: 0.90,
}

// ─── Demo Claims (8 total) ────────────────────────────────────────────────────

export const DEMO_CLAIMS: Claim[] = [
  {
    id: 'c-001',
    disruption_type: 'rainfall',
    city: 'Bengaluru',
    zone: 'Koramangala',
    status: 'approved',
    amount: 325,
    hours_lost: 3.5,
    created_at: '2026-03-15T14:30:00',
    auto_approved: true,
    bas_score: 82,
    fraud_score: 18,
    processing_time: '3m',
    fraud_flags: [],
  },
  {
    id: 'c-002',
    disruption_type: 'aqi',
    city: 'Bengaluru',
    zone: 'Koramangala',
    status: 'approved',
    amount: 487,
    hours_lost: 5.0,
    created_at: '2026-03-10T10:00:00',
    auto_approved: true,
    bas_score: 78,
    fraud_score: 22,
    processing_time: '4m',
    fraud_flags: [],
  },
  {
    id: 'c-003',
    disruption_type: 'outage',
    city: 'Bengaluru',
    zone: 'Koramangala',
    status: 'approved',
    amount: 243,
    hours_lost: 2.5,
    created_at: '2026-03-05T19:15:00',
    auto_approved: true,
    bas_score: 85,
    fraud_score: 14,
    processing_time: '2m',
    fraud_flags: [],
  },
  {
    id: 'c-004',
    disruption_type: 'rainfall',
    city: 'Bengaluru',
    zone: 'Koramangala',
    status: 'pending',
    amount: 406,
    hours_lost: 4.5,
    created_at: '2026-03-19T15:30:00',
    auto_approved: false,
    bas_score: 65,
    fraud_score: 34,
    processing_time: '—',
    fraud_flags: [],
  },
  {
    id: 'c-005',
    disruption_type: 'bandh',
    city: 'Bengaluru',
    zone: 'Koramangala',
    status: 'pending',
    amount: 325,
    hours_lost: 3.5,
    created_at: '2026-03-18T08:00:00',
    auto_approved: false,
    bas_score: 72,
    fraud_score: 28,
    processing_time: '—',
    fraud_flags: [],
  },
  {
    id: 'c-006',
    disruption_type: 'rainfall',
    city: 'Bengaluru',
    zone: 'Koramangala',
    status: 'manual_review',
    amount: 487,
    hours_lost: 5.0,
    created_at: '2026-03-20T14:35:00',
    auto_approved: false,
    bas_score: 52,
    fraud_score: 68,
    processing_time: '—',
    review_reason: 'Multiple behavioural signals inconsistent with outdoor storm conditions.',
    fraud_flags: [
      'GPS signal quality 94% — inconsistent with severe rainfall conditions',
      'Network switched 0 times in 4 hours — suggests indoor WiFi connection',
      'Motion score 0.03 — device stationary for entire disruption window',
    ],
  },
  {
    id: 'c-007',
    disruption_type: 'aqi',
    city: 'Bengaluru',
    zone: 'Koramangala',
    status: 'rejected',
    amount: 325,
    hours_lost: 3.5,
    created_at: '2026-03-01T11:00:00',
    auto_approved: false,
    bas_score: 28,
    fraud_score: 87,
    processing_time: '—',
    fraud_flags: [
      'Platform order rate normal during claimed disruption period',
      'Registered in same 48-hour burst as 12 other claimants',
    ],
  },
  {
    id: 'c-008',
    disruption_type: 'outage',
    city: 'Bengaluru',
    zone: 'Koramangala',
    status: 'rejected',
    amount: 162,
    hours_lost: 2.0,
    created_at: '2026-02-25T20:45:00',
    auto_approved: false,
    bas_score: 35,
    fraud_score: 82,
    processing_time: '—',
    fraud_flags: [
      'velocity_anomaly — 4 claims filed in past 7 days',
      'Motion score 0.01 — no movement detected',
    ],
  },
]

// ─── Active Disruption ────────────────────────────────────────────────────────

export const ACTIVE_DISRUPTION: Disruption = {
  id: 'd-active-001',
  type: 'rainfall',
  city: 'Bengaluru',
  zone: 'Koramangala',
  severity: 'extreme',
  trigger_value: 72.5,
  threshold_value: 60.0,
  api_source: 'OpenWeatherMap',
  started_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  is_active: true,
  workers_affected: 12,
}

// ─── Admin Stats ──────────────────────────────────────────────────────────────

export const ADMIN_STATS = {
  active_workers: 142,
  claims_today: 23,
  amount_paid_today: 18400,
  fraud_queue_count: 3,
  loss_ratio: 61,
  premium_collected_week: 21200,
  claims_paid_week: 12932,
}

// ─── Fraud Queue ──────────────────────────────────────────────────────────────

export const FRAUD_QUEUE: FraudQueueItem[] = [
  {
    id: 'fq-001',
    worker_name: 'Suresh Nair',
    city: 'Bengaluru',
    disruption_type: 'rainfall',
    amount: 487,
    fraud_score: 68,
    bas_score: 52,
    flags: [
      'gps_spoofing_detected',
      'HDOP 0.82 — GPS precision implausibly high for reported storm conditions',
      'Location jump 1240m in <30s — physically impossible movement',
      'Mock location provider detected on device (com.lexa.fakegps)',
    ],
    created_at: '2026-03-20T14:35:00',
    fraud_method: 'gps_spoofing',
  },
  {
    id: 'fq-002',
    worker_name: 'Aakash Tiwari',
    city: 'Delhi',
    disruption_type: 'aqi',
    amount: 650,
    fraud_score: 79,
    bas_score: 34,
    flags: [
      'No historical weather event found for Delhi at disruption time — claimed aqi disruption not corroborated by archived weather records',
      'Platform order rate normal during claimed AQI disruption',
      'velocity_anomaly — 3 claims in 7 days at maximum allowable limit',
    ],
    created_at: '2026-03-20T12:20:00',
    fraud_method: 'weather_mismatch',
  },
  {
    id: 'fq-003',
    worker_name: 'Amol Deshmukh',
    city: 'Mumbai',
    disruption_type: 'outage',
    amount: 325,
    fraud_score: 74,
    bas_score: 41,
    flags: [
      'temporal_clustering — 19% of zone claims arrived within 3-minute window',
      'cohort_registration_burst — registered with 14 others in 48 hours',
      'GPS signal quality 92% — inconsistent with severe outage conditions',
    ],
    created_at: '2026-03-20T10:05:00',
    fraud_method: 'ring_signal',
  },
]

// ─── Loss Ratio Chart Data (4 weeks × 4 cities) ───────────────────────────────

export const LOSS_RATIO_DATA = [
  { week: 'Mar W1', Bengaluru: 58, Mumbai: 72, Delhi: 65, Chennai: 54 },
  { week: 'Mar W2', Bengaluru: 63, Mumbai: 68, Delhi: 71, Chennai: 60 },
  { week: 'Mar W3', Bengaluru: 55, Mumbai: 78, Delhi: 62, Chennai: 57 },
  { week: 'Mar W4', Bengaluru: 61, Mumbai: 74, Delhi: 69, Chennai: 63 },
]

export const LOSS_RATIO_PREMIUM_DATA = [
  { city: 'Bengaluru', premiums: 8200, claims: 5002, loss_ratio: 61 },
  { city: 'Mumbai', premiums: 6100, claims: 4514, loss_ratio: 74 },
  { city: 'Delhi', premiums: 4800, claims: 3312, loss_ratio: 69 },
  { city: 'Chennai', premiums: 2100, claims: 1323, loss_ratio: 63 },
]
