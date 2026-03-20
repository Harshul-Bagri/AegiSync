'use client'

import * as Accordion from '@radix-ui/react-accordion'
import { ChevronDown } from 'lucide-react'

const FAQS = [
  {
    q: 'What disruptions are covered?',
    a: 'AegiSync covers five types of verified disruptions: heavy rainfall (>60mm/hr), extreme AQI pollution (PM2.5 >250), NDMA-confirmed floods, city-wide bandh or curfew events (>80% confidence), and Zomato/Swiggy platform outages lasting more than 2 hours.',
  },
  {
    q: 'How does the automatic payout work?',
    a: 'Our engine monitors live weather APIs, government alerts, and platform uptime every 5 minutes. When a trigger threshold is crossed in your zone, your claim is created automatically and processed within minutes. The payout lands in your UPI account — you don\'t need to file anything.',
  },
  {
    q: 'How is my weekly premium calculated?',
    a: 'Your premium = base tier rate × your zone\'s risk score × a seasonal factor. Koramangala in Bengaluru during monsoon will cost more than Whitefield in March. Workers with a clean claims history also get a loyalty discount. All-in, premiums range from ₹79 to ₹275/week.',
  },
  {
    q: 'When do I receive the payout?',
    a: 'Auto-approved claims are processed within 2–5 minutes of the disruption being confirmed. Payouts are sent instantly to your registered UPI ID via Razorpay. For claims flagged for manual review, our team reviews within 4 business hours.',
  },
  {
    q: 'Can I pause or cancel my policy?',
    a: 'Yes. You can pause your policy at any time from the dashboard — no premium is charged during pause periods. You can reactivate anytime. Cancellations are also immediate, and any unused portion of the current week is not refunded (as the risk window has already opened).',
  },
  {
    q: 'What is NOT covered?',
    a: 'AegiSync covers income loss only. We do NOT cover: medical expenses or hospitalisation, vehicle repair or maintenance, accidents or injuries, food spoilage or order cancellation fees, or any disruption lasting less than the minimum threshold. This is not a health or vehicle insurance product.',
  },
]

interface FaqItem { q: string; a: string }

export default function FaqAccordion({ items }: { items?: FaqItem[] }) {
  const list = items ?? FAQS
  return (
    <Accordion.Root type="single" collapsible style={{ width: '100%' }}>
      {list.map((faq, i) => (
        <Accordion.Item
          key={i}
          value={`item-${i}`}
          style={{
            borderBottom: '1px solid var(--border)',
            overflow: 'hidden',
          }}
        >
          <Accordion.Header>
            <Accordion.Trigger
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1.25rem 0',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                gap: '1rem',
                fontSize: '1rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
              }}
              className="faq-trigger"
            >
              <span>{faq.q}</span>
              <ChevronDown
                size={20}
                style={{
                  flexShrink: 0,
                  color: 'var(--brand-primary)',
                  transition: 'transform 0.2s ease',
                }}
                className="faq-chevron"
              />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content
            style={{
              overflow: 'hidden',
            }}
            className="accordion-content"
          >
            <p
              style={{
                paddingBottom: '1.25rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.7,
                fontSize: '0.95rem',
              }}
            >
              {faq.a}
            </p>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  )
}
