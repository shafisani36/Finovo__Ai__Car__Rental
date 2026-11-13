import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GitCompareArrows, X } from 'lucide-react';
import { vehiclesApi } from '../../api/services/vehicles.api';
import { MAX_COMPARE, useCompareCars } from '../../hooks/useCarShortlists';
import { getCarImage } from '../../utils/carImageHelper';

interface TrayCar {
  id: string;
  name: string;
  image: string;
}

const trayCache = new Map<string, TrayCar | null>();

/** Floating bar listing the cars picked for side-by-side comparison. */
export function CompareTray() {
  const { t } = useTranslation();
  const { compare, toggleCompare, clearCompare } = useCompareCars();
  const [cars, setCars] = useState<TrayCar[]>([]);

  useEffect(() => {
    let active = true;
    Promise.all(
      compare.map(async (id) => {
        if (trayCache.has(id)) return trayCache.get(id) ?? null;
        try {
          const { vehicle } = await vehiclesApi.getById(id);
          const car = { id, name: `${vehicle.brand} ${vehicle.model}`, image: getCarImage(vehicle) };
          trayCache.set(id, car);
          return car;
        } catch {
          // A car that no longer exists drops out of the list
          trayCache.set(id, null);
          return null;
        }
      })
    ).then((result) => {
      if (!active) return;
      const found = result.filter((c): c is TrayCar => c !== null);
      setCars(found);
      compare.filter((id) => trayCache.get(id) === null).forEach((id) => toggleCompare(id));
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compare.join(',')]);

  if (compare.length === 0) return null;

  return (
    <>
    {/* Keeps the end of the page visible above the floating bar */}
    <div aria-hidden="true" style={{ height: '96px' }} />
    <div className="compare-tray" role="region" aria-label={t('shortlists.compareTitle')}>
      <div className="compare-tray-inner">
        <div className="compare-tray-cars">
          {cars.map((car) => (
            <div key={car.id} className="compare-tray-car">
              <img src={car.image} alt="" />
              <span>{car.name}</span>
              <button type="button" onClick={() => toggleCompare(car.id)} aria-label={t('shortlists.removeCompare')}>
                <X size={14} />
              </button>
            </div>
          ))}
          {Array.from({ length: MAX_COMPARE - cars.length }).map((_, i) => (
            <div key={`slot-${i}`} className="compare-tray-slot">
              {t('shortlists.addAnother')}
            </div>
          ))}
        </div>
        <div className="compare-tray-actions">
          <button type="button" className="compare-tray-clear" onClick={clearCompare}>
            {t('shortlists.clear')}
          </button>
          {compare.length >= 2 ? (
            <Link to={`/compare?ids=${compare.join(',')}`} className="compare-tray-go">
              <GitCompareArrows size={16} />
              {t('shortlists.compareNow', { count: compare.length })}
            </Link>
          ) : (
            <span className="compare-tray-hint">{t('shortlists.pickOneMore')}</span>
          )}
        </div>
      </div>
      <style>{`
        .compare-tray {
          position: fixed;
          inset-inline: 0;
          bottom: 16px;
          z-index: 900;
          display: flex;
          justify-content: center;
          padding: 0 12px;
          pointer-events: none;
        }
        .compare-tray-inner {
          pointer-events: auto;
          width: min(100%, 980px);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          flex-wrap: wrap;
          padding: 12px 14px;
          border-radius: 18px;
          background: #1E0426;
          color: #FFFFFF;
          box-shadow: 0 18px 40px rgba(30, 4, 38, 0.35);
        }
        .compare-tray-cars {
          display: flex;
          gap: 10px;
          flex: 1 1 420px;
          min-width: 0;
          overflow-x: auto;
        }
        .compare-tray-car,
        .compare-tray-slot {
          flex: 1 1 0;
          min-width: 140px;
          height: 52px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.08);
          font-size: 0.82rem;
          font-weight: 600;
        }
        .compare-tray-slot {
          justify-content: center;
          border: 1px dashed rgba(255, 255, 255, 0.3);
          background: transparent;
          color: rgba(255, 255, 255, 0.6);
          font-weight: 500;
        }
        .compare-tray-car img {
          width: 56px;
          height: 38px;
          object-fit: cover;
          border-radius: 8px;
          flex-shrink: 0;
          background: #FFFFFF;
        }
        .compare-tray-car span {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .compare-tray-car button {
          border: none;
          background: rgba(255, 255, 255, 0.12);
          color: #FFFFFF;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          cursor: pointer;
          flex-shrink: 0;
        }
        .compare-tray-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .compare-tray-clear {
          border: none;
          background: none;
          color: rgba(255, 255, 255, 0.75);
          font-weight: 600;
          cursor: pointer;
          font-size: 0.85rem;
        }
        .compare-tray-go {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 11px 18px;
          border-radius: 12px;
          background: #FAB826;
          color: #1E0426;
          font-weight: 800;
          text-decoration: none;
          white-space: nowrap;
        }
        .compare-tray-hint {
          font-size: 0.82rem;
          color: rgba(255, 255, 255, 0.75);
        }
        @media (max-width: 640px) {
          .compare-tray { bottom: 8px; }
          .compare-tray-car, .compare-tray-slot { min-width: 120px; }
          .compare-tray-actions { width: 100%; justify-content: space-between; }
        }
      `}</style>
    </div>
    </>
  );
}
