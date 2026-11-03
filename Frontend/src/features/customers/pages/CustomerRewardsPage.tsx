import { useState, useEffect } from 'react';
import {
  Gift,
  Copy,
  Check,
  Zap,
  Share2,
} from 'lucide-react';
import { customerPortalApi, type RewardsSummary } from '../api/customerPortalApi';
import './CustomerPortal.css';

export function CustomerRewardsPage() {
  const [rewards, setRewards] = useState<RewardsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadRewards() {
      try {
        setIsLoading(true);
        const res = await customerPortalApi.getRewards();
        if (isMounted && res.success) {
          setRewards(res);
        }
      } catch (err) {
        console.error('Error fetching rewards:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadRewards();
    return () => { isMounted = false; };
  }, []);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(label);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  if (isLoading) {
    return (
      <div className="cp-page-container">
        <div className="cp-card cp-skeleton" style={{ height: '400px' }} />
      </div>
    );
  }

  const data = rewards || {
    tier: 'Gold',
    nextTier: 'Platinum',
    progressPercent: 68,
    pointsBalance: 1250,
    totalSpent: 1850,
    referralCode: 'FIN-GOLD-7821',
    referralBonusPoints: 500,
    vouchers: [
      {
        code: 'FINOVO-WEEKEND20',
        discount: '20% OFF',
        description: 'Valid on 3+ days weekend rental across all SUVs & Sedans',
        validUntil: '2026-12-31',
        isAvailable: true,
      },
      {
        code: 'AIRPORT-FASTPASS',
        discount: 'FREE TOLL PASS',
        description: 'Complimentary unlimited highway fast-pass on your next trip',
        validUntil: '2026-11-30',
        isAvailable: true,
      },
    ],
  };

  return (
    <div className="cp-page-container">
      {/* Header */}
      <div className="cp-page-header">
        <div>
          <h1 className="cp-page-title">Finovo Rewards & Loyalty Club</h1>
          <p className="cp-page-subtitle">Earn reward points on every trip and unlock exclusive VIP privileges.</p>
        </div>
      </div>

      {/* Tier & Balance Hero Banner */}
      <div
        className="cp-card"
        style={{
          background: 'linear-gradient(135deg, #1E0528 0%, #340D42 100%)',
          color: '#FFFFFF',
          padding: '32px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '28px', alignItems: 'center' }}>
          {/* Left: Tier & Progress */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span className="cp-badge cp-badge-accent">{data.tier} Tier Member</span>
              <span style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                Next: <strong>{data.nextTier}</strong>
              </span>
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: '4px 0 16px 0' }}>
              VIP Driver Privileges
            </h2>

            {/* Progress Bar */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Progress to {data.nextTier}</span>
                <span style={{ fontWeight: 700, color: '#FAB826' }}>{data.progressPercent}%</span>
              </div>
              <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.2)', borderRadius: '999px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${data.progressPercent}%`,
                    background: '#FAB826',
                    borderRadius: '999px',
                    transition: 'width 0.8s ease',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Right: Points Stats */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(8px)',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              display: 'flex',
              justifyContent: 'space-around',
            }}
          >
            <div>
              <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.8)' }}>Available Points</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#FAB826' }}>
                {data.pointsBalance.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.7)' }}>= ${(data.pointsBalance / 10).toFixed(2)} in rental credit</div>
            </div>

            <div style={{ borderLeft: '1px solid rgba(255, 255, 255, 0.15)', paddingLeft: '24px' }}>
              <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.8)' }}>Total Spent</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#FFFFFF' }}>
                ${data.totalSpent.toFixed(2)}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.7)' }}>Lifetime customer spend</div>
            </div>
          </div>
        </div>
      </div>

      {/* Referral Program Card */}
      <div className="cp-card">
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(280px, 1fr)', gap: '24px', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Gift size={20} color="#FAB826" />
              <span className="cp-badge cp-badge-accent">Refer & Earn Program</span>
            </div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--cp-primary)', margin: '0 0 8px 0' }}>
              Give $50 Off, Earn {data.referralBonusPoints} Points
            </h3>
            <p style={{ color: 'var(--cp-text-muted)', fontSize: '0.9rem', margin: '0 0 16px 0', lineHeight: '1.5' }}>
              Share your personal Finovo referral code with friends, colleagues, or family. When they book their first rental, they get a $50 discount and you receive {data.referralBonusPoints} points instantly.
            </p>

            {/* Code Box */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div
                style={{
                  background: '#F8F6F9',
                  border: '1.5px dashed var(--cp-primary)',
                  borderRadius: '10px',
                  padding: '10px 20px',
                  fontFamily: 'monospace',
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  color: 'var(--cp-primary)',
                  letterSpacing: '0.08em',
                }}
              >
                {data.referralCode}
              </div>

              <button
                className="cp-btn-primary"
                onClick={() => handleCopy(data.referralCode, 'code')}
              >
                {copiedCode === 'code' ? <Check size={16} /> : <Copy size={16} />}
                {copiedCode === 'code' ? 'Copied to Clipboard!' : 'Copy Referral Code'}
              </button>

              <button
                className="cp-btn-outline"
                onClick={() =>
                  handleCopy(`https://finovo.rentals/register?ref=${data.referralCode}`, 'link')
                }
              >
                <Share2 size={16} />
                {copiedCode === 'link' ? 'Link Copied!' : 'Copy Invite Link'}
              </button>
            </div>
          </div>

          <div
            style={{
              background: '#F8F6F9',
              borderRadius: '16px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              fontSize: '0.88rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--cp-primary)' }}>
              <Zap size={16} color="#FAB826" />
              How Points Work
            </div>
            <div style={{ color: 'var(--cp-text-muted)' }}>
              1. Earn <strong>10 points</strong> for every $1 spent on all vehicle rentals.
            </div>
            <div style={{ color: 'var(--cp-text-muted)' }}>
              2. Redeem points at checkout for direct discounts on your reservations.
            </div>
            <div style={{ color: 'var(--cp-text-muted)' }}>
              3. Reach Platinum tier to get free priority upgrades and waived deposits.
            </div>
          </div>
        </div>
      </div>

      {/* Available Promo Vouchers */}
      <div className="cp-card">
        <h2 className="cp-card-title" style={{ marginBottom: '16px' }}>Your Available Discount Vouchers</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          {data.vouchers.map((v, idx) => (
            <div
              key={idx}
              style={{
                border: '1px solid var(--cp-border)',
                borderRadius: '12px',
                padding: '20px',
                background: '#FFFFFF',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="cp-badge cp-badge-accent">{v.discount}</span>
                <span style={{ fontSize: '0.78rem', color: 'var(--cp-text-subtle)' }}>
                  Expires: {v.validUntil}
                </span>
              </div>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--cp-primary)' }}>
                {v.description}
              </h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--cp-primary)', fontSize: '0.95rem' }}>
                  {v.code}
                </span>
                <button
                  className="cp-btn-outline"
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  onClick={() => handleCopy(v.code, v.code)}
                >
                  {copiedCode === v.code ? <Check size={14} /> : <Copy size={14} />}
                  {copiedCode === v.code ? 'Applied' : 'Copy'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
