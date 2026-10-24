import { useState, useEffect } from 'react';
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Compass,
  Search,
  ExternalLink,
} from 'lucide-react';
import { branchesApi } from '../../../api/services/branches.api';
import './CustomerPortal.css';

interface BranchDisplay {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  city: string;
  phone?: string | null;
  email?: string | null;
  openingHours?: string | null;
}

const FALLBACK_BRANCHES: BranchDisplay[] = [
  {
    id: 'b1',
    name: 'Finovo Central Luxury Hub',
    code: 'FIN-CENTRAL-01',
    address: 'King Fahd Road, Luxury Motor Complex, Al Olaya',
    city: 'Riyadh',
    phone: '+966 11 400 9000',
    email: 'riyadh.central@finovo.com',
    openingHours: 'Open 24/7 (Continuous Dispatch & Key Drop)',
  },
  {
    id: 'b2',
    name: 'King Khalid International Airport (KKIA - T5)',
    code: 'FIN-AIRPORT-02',
    address: 'Terminal 5 Arrivals Hall, Fast-Lane Rental Area',
    city: 'Riyadh',
    phone: '+966 11 400 9001',
    email: 'kkia.t5@finovo.com',
    openingHours: 'Open 24/7 (Flight Tracking Automatic Hold)',
  },
  {
    id: 'b3',
    name: 'Jeddah Corniche Executive Center',
    code: 'FIN-JEDDAH-03',
    address: 'Al Andalus District, North Corniche Road',
    city: 'Jeddah',
    phone: '+966 12 600 8000',
    email: 'jeddah.corniche@finovo.com',
    openingHours: '08:00 AM – 02:00 AM Daily',
  },
];

export function CustomerLocationsPage() {
  const [branches, setBranches] = useState<BranchDisplay[]>([]);
  const [searchCity, setSearchCity] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadBranches() {
      try {
        setIsLoading(true);
        const res = await branchesApi.list();
        if (isMounted && res.success && res.branches && res.branches.length > 0) {
          const mapped = res.branches.map((b: any) => ({
            id: b.id,
            name: b.name,
            code: b.code || 'FIN-LOC',
            address: b.address || 'King Fahd Road, Luxury Motor Complex',
            city: b.city || 'Riyadh',
            phone: b.phone || '+966 11 400 9000',
            email: b.email || 'support@finovo.com',
            openingHours: b.openingHours || 'Open 24/7 (VIP Fast-Lane Handover)',
          }));
          setBranches(mapped);
        } else if (isMounted) {
          setBranches(FALLBACK_BRANCHES);
        }
      } catch (err) {
        console.error('Error loading branches:', err);
        if (isMounted) setBranches(FALLBACK_BRANCHES);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadBranches();
    return () => { isMounted = false; };
  }, []);

  const filteredBranches = branches.filter(
    (b) =>
      b.city.toLowerCase().includes(searchCity.toLowerCase()) ||
      b.name.toLowerCase().includes(searchCity.toLowerCase()) ||
      (b.address && b.address.toLowerCase().includes(searchCity.toLowerCase()))
  );

  return (
    <div className="cp-page-container">
      {/* Header */}
      <div className="cp-page-header">
        <div>
          <h1 className="cp-page-title">Pickup & Return Stations</h1>
          <p className="cp-page-subtitle">
            Find airport fast-lanes, luxury city hubs, and 24/7 key drop-off stations.
          </p>
        </div>

        <div className="cp-header-actions" style={{ minWidth: '280px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--cp-text-muted)' }} />
            <input
              type="text"
              placeholder="Filter by city or location..."
              className="cp-input"
              style={{ paddingLeft: '38px' }}
              value={searchCity}
              onChange={(e) => setSearchCity(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 24/7 Roadside Assistance Top Card */}
      <div
        className="cp-card"
        style={{
          background: 'linear-gradient(135deg, #1E0528 0%, #2F093D 100%)',
          color: '#FFFFFF',
          padding: '24px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'rgba(250, 184, 38, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Compass size={24} color="#FAB826" />
            </div>
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: 800 }}>
                Anywhere Return & Roadside VIP Dispatch
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                Need to change your return station mid-trip? Or need urgent roadside assistance? We're available 24/7 nationwide.
              </p>
            </div>
          </div>

          <a
            href="tel:+966114009000"
            className="cp-btn-primary"
            style={{ textDecoration: 'none' }}
          >
            <Phone size={16} />
            Call Concierge: +966 11 400 9000
          </a>
        </div>
      </div>

      {/* Grid of Branches */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="cp-card cp-skeleton" style={{ height: '240px' }} />
          ))}
        </div>
      ) : filteredBranches.length === 0 ? (
        <div className="cp-card cp-empty-state">
          <MapPin size={32} color="var(--cp-primary)" />
          <h3 className="cp-empty-title">No Stations Found</h3>
          <p className="cp-empty-desc">We couldn't find any rental stations matching your search.</p>
          <button className="cp-btn-secondary" onClick={() => setSearchCity('')}>
            Show All Locations
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
          {filteredBranches.map((branch) => (
            <div key={branch.id} className="cp-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span className="cp-badge cp-badge-primary">{branch.city}</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--cp-text-subtle)', fontFamily: 'monospace' }}>
                    {branch.code}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--cp-primary)', margin: '0 0 6px 0' }}>
                  {branch.name}
                </h3>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.88rem', color: 'var(--cp-text-muted)' }}>
                  <MapPin size={16} color="var(--cp-accent)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{branch.address}</span>
                </div>
              </div>

              {/* Station details */}
              <div
                style={{
                  background: '#F8F6F9',
                  borderRadius: '12px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontSize: '0.84rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--cp-text-main)' }}>
                  <Clock size={14} color="var(--cp-primary)" />
                  <span>{branch.openingHours}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--cp-text-main)' }}>
                  <Phone size={14} color="var(--cp-primary)" />
                  <a href={`tel:${branch.phone}`} style={{ color: 'inherit', textDecoration: 'none', fontWeight: 600 }}>
                    {branch.phone}
                  </a>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--cp-text-main)' }}>
                  <Mail size={14} color="var(--cp-primary)" />
                  <span>{branch.email}</span>
                </div>
              </div>

              {/* Amenities */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '0.75rem' }}>
                <span className="cp-badge cp-badge-success">Automated Key Drop</span>
                <span className="cp-badge cp-badge-info">High-Speed EV Chargers</span>
                <span className="cp-badge cp-badge-accent">AI Inspection Bay</span>
              </div>

              {/* Action Buttons */}
              <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--cp-border)' }}>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(`${branch.name} ${branch.address}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cp-btn-outline"
                  style={{ width: '100%', boxSizing: 'border-box', textAlign: 'center' }}
                >
                  <ExternalLink size={14} />
                  Open in Google Maps
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
