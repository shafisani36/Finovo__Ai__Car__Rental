import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, GitCompareArrows, Minus, Star, X } from 'lucide-react';
import { vehiclesApi } from '../../api/services/vehicles.api';
import type { Vehicle } from '../../features/fleet/types/fleet.types';
import { MAX_COMPARE, useCompareCars } from '../../hooks/useCarShortlists';
import { formatMoney, getCarImage, resolveVehiclePricing } from '../../utils/carImageHelper';

/** Side-by-side comparison of up to three cars, all from live data. Shareable via ?ids=a,b,c */
export function CompareCarsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { compare, toggleCompare } = useCompareCars();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // A shared link wins; otherwise use this browser's compare list
  const ids = useMemo(() => {
    const fromUrl = (searchParams.get('ids') || '').split(',').map((id) => id.trim()).filter(Boolean);
    return Array.from(new Set(fromUrl.length ? fromUrl : compare)).slice(0, MAX_COMPARE);
  }, [searchParams, compare]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all(ids.map((id) => vehiclesApi.getById(id).then((r) => r.vehicle).catch(() => null))).then((list) => {
      if (!active) return;
      setVehicles(list.filter((v): v is Vehicle => v !== null));
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [ids]);

  const remove = (id: string) => {
    if (compare.includes(id)) toggleCompare(id);
    const rest = ids.filter((x) => x !== id);
    navigate(rest.length ? `/compare?ids=${rest.join(',')}` : '/compare', { replace: true });
  };

  const prices = vehicles.map((v) => resolveVehiclePricing(v).dailyRate).filter((p) => p > 0);
  const cheapest = prices.length > 1 ? Math.min(...prices) : null;

  const featureNames = Array.from(
    new Set(vehicles.flatMap((v) => (v.vehicleFeatures || []).map((f) => f.feature?.name).filter(Boolean) as string[]))
  ).sort();
  const hasFeature = (v: Vehicle, name: string) => (v.vehicleFeatures || []).some((f) => f.feature?.name === name);

  const enumLabel = (value?: string | null) => (value ? value.charAt(0) + value.slice(1).toLowerCase() : '');
  const dash = <Minus size={16} aria-label={t('compare.notListed')} color="#B8AEC2" />;

  const rows: { label: string; render: (v: Vehicle) => React.ReactNode }[] = [
    {
      label: t('compare.pricePerDay'),
      render: (v) => {
        const p = resolveVehiclePricing(v);
        const isCheapest = cheapest !== null && p.dailyRate === cheapest;
        return (
          <span className={isCheapest ? 'compare-best' : undefined}>
            <strong>{formatMoney(p.dailyRate, p.currency)}</strong>
            {isCheapest && <em>{t('compare.lowestPrice')}</em>}
          </span>
        );
      },
    },
    {
      label: t('compare.deposit'),
      render: (v) => {
        const p = resolveVehiclePricing(v);
        return p.securityDeposit > 0 ? formatMoney(p.securityDeposit, p.currency) : dash;
      },
    },
    {
      label: t('compare.rating'),
      render: (v) =>
        v.rating?.count && v.rating.average !== null ? (
          <span className="compare-rating">
            <Star size={14} fill="#FAB826" color="#FAB826" /> {Number(v.rating.average).toFixed(1)}
            <small>{t('cars.details.reviewCount', { count: v.rating.count })}</small>
          </span>
        ) : (
          <span className="compare-muted">{t('compare.noReviews')}</span>
        ),
    },
    { label: t('compare.category'), render: (v) => v.category?.name || dash },
    { label: t('compare.year'), render: (v) => v.year || dash },
    { label: t('compare.transmission'), render: (v) => enumLabel(v.transmission) || dash },
    { label: t('compare.fuel'), render: (v) => enumLabel(v.fuelType) || dash },
    { label: t('compare.seats'), render: (v) => v.seats || dash },
    { label: t('compare.doors'), render: (v) => v.doors || dash },
    { label: t('compare.engine'), render: (v) => [v.engineSize, v.horsePower ? `${v.horsePower} hp` : ''].filter(Boolean).join(' · ') || dash },
    { label: t('compare.drivetrain'), render: (v) => v.drivetrain || dash },
    {
      label: t('compare.mileage'),
      render: (v) => (v.mileageLimitPerDay ? `${v.mileageLimitPerDay} km` : t('cars.unlimitedMileage')),
    },
    { label: t('compare.location'), render: (v) => [v.branch?.name, v.branch?.city].filter(Boolean).join(', ') || dash },
  ];

  return (
    <div className="compare-page">
      <section className="compare-hero">
        <div className="container">
          <GitCompareArrows size={28} color="#FAB826" aria-hidden="true" />
          <h1>{t('compare.title')}</h1>
          <p>{t('compare.subtitle', { count: MAX_COMPARE })}</p>
        </div>
      </section>

      <div className="container compare-body">
        {loading ? (
          <div className="compare-empty" role="status">{t('compare.loading')}</div>
        ) : vehicles.length === 0 ? (
          <div className="compare-empty">
            <h2>{t('compare.emptyTitle')}</h2>
            <p>{t('compare.emptyBody')}</p>
            <Link to="/cars" className="compare-cta">{t('compare.browseCars')}</Link>
          </div>
        ) : (
          <div className="compare-table-wrap">
            <table className="compare-table">
              <thead>
                <tr>
                  <th scope="col" className="compare-rowhead">
                    <span className="sr-only">{t('compare.feature')}</span>
                  </th>
                  {vehicles.map((v) => (
                    <th key={v.id} scope="col">
                      <div className="compare-car">
                        <button type="button" className="compare-remove" onClick={() => remove(v.id)} aria-label={t('shortlists.removeCompare')}>
                          <X size={14} />
                        </button>
                        <img src={getCarImage(v)} alt={`${v.brand} ${v.model}`} />
                        <span className="compare-car-name">{v.brand} {v.model}</span>
                        <Link to={`/cars/${v.id}`} className="compare-cta">{t('compare.viewAndBook')}</Link>
                      </div>
                    </th>
                  ))}
                  {vehicles.length < MAX_COMPARE && (
                    <th scope="col">
                      <Link to="/cars" className="compare-add">{t('shortlists.addAnother')}</Link>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row" className="compare-rowhead">{row.label}</th>
                    {vehicles.map((v) => (
                      <td key={v.id}>{row.render(v)}</td>
                    ))}
                    {vehicles.length < MAX_COMPARE && <td />}
                  </tr>
                ))}
                {featureNames.length > 0 && (
                  <tr className="compare-section">
                    <th scope="rowgroup" colSpan={vehicles.length + 1 + (vehicles.length < MAX_COMPARE ? 1 : 0)}>
                      {t('compare.features')}
                    </th>
                  </tr>
                )}
                {featureNames.map((name) => (
                  <tr key={name}>
                    <th scope="row" className="compare-rowhead">{name}</th>
                    {vehicles.map((v) => (
                      <td key={v.id}>
                        {hasFeature(v, name) ? (
                          <Check size={18} color="#059669" aria-label={t('compare.included')} />
                        ) : (
                          <X size={16} color="#C2B8CB" aria-label={t('compare.notIncluded')} />
                        )}
                      </td>
                    ))}
                    {vehicles.length < MAX_COMPARE && <td />}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        .compare-page { background: #FAF8FC; min-height: 100vh; padding-bottom: 80px; }
        .compare-hero { background: linear-gradient(155deg, #160122 0%, #2C0644 55%, #4C126E 100%); color: #FFFFFF; padding: 120px 0 44px; }
        .compare-hero h1 { font-size: clamp(1.8rem, 4vw, 2.6rem); font-weight: 800; margin: 10px 0 8px; }
        .compare-hero p { margin: 0; color: rgba(255, 255, 255, 0.8); max-width: 640px; }
        .compare-body { margin-top: 32px; }
        .compare-empty { background: #FFFFFF; border: 1px solid #ECE6F1; border-radius: 18px; padding: 48px 24px; text-align: center; color: #4B4453; }
        .compare-empty h2 { color: #1E0426; margin: 0 0 8px; }
        .compare-table-wrap { overflow-x: auto; background: #FFFFFF; border: 1px solid #ECE6F1; border-radius: 18px; }
        .compare-table { width: 100%; min-width: 640px; border-collapse: collapse; table-layout: fixed; }
        .compare-table th, .compare-table td { padding: 14px 16px; border-bottom: 1px solid #F1ECF5; text-align: start; vertical-align: middle; font-size: 0.92rem; color: #2A1A35; }
        .compare-table thead th { vertical-align: top; }
        .compare-rowhead { width: 180px; font-weight: 700; color: #6B5A78 !important; font-size: 0.85rem !important; }
        .compare-car { position: relative; display: flex; flex-direction: column; gap: 10px; }
        .compare-car img { width: 100%; aspect-ratio: 16 / 10; object-fit: cover; border-radius: 12px; background: #F4F0F7; }
        .compare-car-name { font-weight: 800; color: #1E0426; font-size: 1rem; }
        .compare-remove { position: absolute; top: 8px; inset-inline-end: 8px; width: 28px; height: 28px; border-radius: 50%; border: none; background: rgba(30, 4, 38, 0.7); color: #FFFFFF; display: grid; place-items: center; cursor: pointer; }
        .compare-cta { display: inline-flex; justify-content: center; padding: 10px 14px; border-radius: 10px; background: #FAB826; color: #1E0426; font-weight: 800; text-decoration: none; font-size: 0.88rem; }
        .compare-add { display: grid; place-items: center; min-height: 160px; border: 2px dashed #DCD2E4; border-radius: 12px; color: #6C1E84; font-weight: 700; text-decoration: none; }
        .compare-best strong { color: #047857; }
        .compare-best em { display: block; font-style: normal; font-size: 0.72rem; font-weight: 800; color: #047857; text-transform: uppercase; letter-spacing: 0.04em; }
        .compare-rating { display: inline-flex; align-items: center; gap: 6px; font-weight: 700; }
        .compare-rating small { font-weight: 500; color: #6B5A78; }
        .compare-muted { color: #9A8FA5; font-size: 0.85rem; }
        .compare-section th { background: #FAF6FD; font-weight: 800; color: #1E0426; }
        .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
        @media (max-width: 560px) { .compare-hero { padding: 100px 0 32px; } .compare-rowhead { width: 120px; } }
      `}</style>
    </div>
  );
}
