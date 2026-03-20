import Link from 'next/link'
import { Shield } from 'lucide-react'

export default function Footer() {
  return (
    <footer style={{ background: 'var(--brand-secondary)', color: 'white' }}>
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 font-display font-bold text-xl mb-3">
              <Shield size={22} style={{ color: 'var(--brand-primary)' }} />
              <span>Gig<span style={{ color: 'var(--brand-primary)' }}>Shield</span></span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', lineHeight: 1.6 }}>
              When rain stops you,<br />we pay you.
            </p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginTop: '1rem' }}>
              © 2026 AegiSync. All rights reserved.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-display font-semibold mb-4" style={{ fontSize: '0.875rem', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
              Product
            </h4>
            <ul className="space-y-2">
              {['How It Works', 'Coverage Plans', 'Premium Calculator', 'Claims Process'].map((item) => (
                <li key={item}>
                  <Link href="/onboarding" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '0.875rem' }}>
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-display font-semibold mb-4" style={{ fontSize: '0.875rem', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
              Support
            </h4>
            <ul className="space-y-2">
              {['Help Centre', 'WhatsApp Support', 'File a Claim', 'Contact Us'].map((item) => (
                <li key={item}>
                  <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '0.875rem' }}>
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-display font-semibold mb-4" style={{ fontSize: '0.875rem', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
              Legal
            </h4>
            <ul className="space-y-2">
              {['Privacy Policy', 'Terms of Service', 'Insurance Disclosures', 'Grievance Redressal'].map((item) => (
                <li key={item}>
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', cursor: 'default' }}>
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.1)',
            marginTop: '2rem',
            paddingTop: '1.5rem',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
            AegiSync is not a registered insurer. Income protection offered under a parametric contract. IRDAI regulations apply.
          </p>
          <div className="flex gap-4">
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>Guidewire DEVTrails 2026</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
