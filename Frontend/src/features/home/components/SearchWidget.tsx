import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, Car, Search, AlertCircle } from 'lucide-react';
import { CustomSelect } from '../../../components/common/CustomSelect';
import { vehiclesApi } from '../../../api/services/vehicles.api';

const ALL_CATEGORIES = '';

function localDateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

/** Real vehicle categories from the fleet (empty list while loading or when there are none). */
function useCategoryNames(): string[] {
  const [names, setNames] = useState<string[]>([]);
  useEffect(() => {
    let active = true;
    vehiclesApi
      .getCategories()
      .then((res) => {
        if (!active) return;
        const unique = Array.from(new Set((res?.categories || []).map((c) => c.name).filter(Boolean)));
        setNames(unique.sort((a, b) => a.localeCompare(b)));
      })
      .catch(() => {
        if (active) setNames([]);
      });
    return () => {
      active = false;
    };
  }, []);
  return names;
}

/**
 * Hero booking bar: car category, pick-up date and return date.
 * Opens the cars catalog with only the cars that are free for those dates.
 */
export function SearchWidget() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const categories = useCategoryNames();
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [pickupDate, setPickupDate] = useState(() => localDateOffset(1));
  const [returnDate, setReturnDate] = useState(() => localDateOffset(4));
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!pickupDate || !returnDate || returnDate < pickupDate) {
      setValidationError(t('cars.dateErrorOrder'));
      return;
    }
    if (pickupDate < localDateOffset(0)) {
      setValidationError(t('cars.dateErrorPast'));
      return;
    }
    setValidationError(null);
    const query = new URLSearchParams({ pickupDate, returnDate });
    if (category) query.set('category', category);
    navigate(`/cars?${query.toString()}`);
  };

  const carIcon = <Car size={15} color="var(--color-accent-500)" />;

  return (
    <div id="search-form" className="finovo-search-bar">
      <form
        onSubmit={handleSubmit}
        className={`finovo-search-bar-form${categories.length > 0 ? ' has-category' : ''}`}
        noValidate
      >
        {categories.length > 0 && (
          <div className="finovo-search-field">
            <label htmlFor="car-category-select" className="finovo-search-label">
              {t('home.searchWidget.vehicleType')}
            </label>
            <CustomSelect
              id="car-category-select"
              variant="dark"
              value={category}
              onChange={(value) => setCategory(value)}
              options={[
                { value: ALL_CATEGORIES, label: t('home.searchWidget.allCategories'), icon: carIcon },
                ...categories.map((name) => ({ value: name, label: name, icon: carIcon })),
              ]}
            />
          </div>
        )}

        <div className="finovo-search-field">
          <label htmlFor="pickup-date" className="finovo-search-label">
            {t('home.searchWidget.pickupDate')}
          </label>
          <div className="hero-booking-input">
            <Calendar size={15} color="var(--color-accent-500)" style={{ flexShrink: 0 }} />
            <input
              id="pickup-date"
              type="date"
              min={localDateOffset(0)}
              value={pickupDate}
              onChange={(e) => setPickupDate(e.target.value)}
            />
          </div>
        </div>

        <div className="finovo-search-field">
          <label htmlFor="dropoff-date" className="finovo-search-label">
            {t('home.searchWidget.returnDate')}
          </label>
          <div className="hero-booking-input">
            <Calendar size={15} color="var(--color-accent-500)" style={{ flexShrink: 0 }} />
            <input
              id="dropoff-date"
              type="date"
              min={pickupDate || localDateOffset(0)}
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
            />
          </div>
        </div>

        <button type="submit" className="finovo-search-submit">
          <Search size={17} />
          <span>{t('home.searchWidget.searchCars')}</span>
        </button>
      </form>

      {validationError && (
        <div className="finovo-search-error" role="alert">
          <AlertCircle size={14} style={{ flexShrink: 0 }} />
          <span>{validationError}</span>
        </div>
      )}

      <style>{`
        .finovo-search-bar {
          width: 100%;
          background-color: rgba(24, 3, 38, 0.84);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 22px;
          padding: 16px 18px;
          box-shadow: 0 24px 50px rgba(14, 1, 24, 0.45);
        }
        .finovo-search-bar-form {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
          gap: 12px;
          align-items: end;
        }
        .finovo-search-bar-form.has-category {
          grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr) minmax(0, 1fr) auto;
        }
        .finovo-search-field {
          min-width: 0;
        }
        .finovo-search-label {
          display: block;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.72);
          margin-bottom: 6px;
        }
        .hero-booking-input {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 12px;
          min-height: 46px;
          background-color: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 12px;
          transition: border-color var(--transition-fast);
        }
        .hero-booking-input:focus-within {
          border-color: var(--color-accent-500);
        }
        .hero-booking-input input {
          background: transparent;
          border: none;
          outline: none;
          width: 100%;
          min-width: 0;
          color: #FFFFFF;
          font-size: 0.9rem;
          font-weight: 600;
          color-scheme: dark;
          /* Dates read left to right in every language, so RTL never clips the year */
          direction: ltr;
          text-align: start;
        }
        .finovo-search-bar .custom-select-container {
          width: 100%;
        }
        .finovo-search-submit {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 46px;
          padding: 0 22px;
          border: none;
          border-radius: 12px;
          background-color: var(--color-accent-500);
          color: #180226;
          font-weight: 800;
          font-size: 0.95rem;
          cursor: pointer;
          box-shadow: 0 8px 24px rgba(245, 183, 22, 0.35);
          transition: transform var(--transition-fast), box-shadow var(--transition-fast);
          white-space: nowrap;
        }
        .finovo-search-submit:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 28px rgba(245, 183, 22, 0.45);
        }
        .finovo-search-error {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 10px;
          color: #F87171;
          font-size: 0.82rem;
        }
        /* Tablets and phones: two columns, category and button span the full width */
        @media (max-width: 900px) {
          .finovo-search-bar-form,
          .finovo-search-bar-form.has-category {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .finovo-search-bar-form.has-category .finovo-search-field:first-child,
          .finovo-search-submit {
            grid-column: 1 / -1;
          }
        }
        @media (max-width: 560px) {
          .finovo-search-bar {
            padding: 14px;
            border-radius: 18px;
          }
          .hero-booking-input {
            padding: 0 10px;
            gap: 6px;
          }
          .hero-booking-input input {
            font-size: 0.8rem;
            font-weight: 600;
            letter-spacing: -0.01em;
          }
          /* The native date picker already shows a calendar icon on small phones */
          .hero-booking-input > svg {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
