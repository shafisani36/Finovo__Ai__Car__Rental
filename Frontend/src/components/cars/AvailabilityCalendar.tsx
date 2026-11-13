import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { vehiclesApi } from '../../api/services/vehicles.api';

interface Props {
  vehicleId: string;
  /** Selected dates as YYYY-MM-DD (local) */
  selectedStart?: string;
  selectedEnd?: string;
  onSelectRange?: (start: string, end: string) => void;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function toKey(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Two-month availability calendar for one car. Busy days come from GET /vehicles/:id/busy-periods,
 * which returns time ranges only. Picking two free days fills the booking dates.
 */
export function AvailabilityCalendar({ vehicleId, selectedStart, selectedEnd, onSelectRange }: Props) {
  const { t, i18n } = useTranslation();
  const [busy, setBusy] = useState<{ start: number; end: number }[]>([]);
  const [horizon, setHorizon] = useState<number | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);
  const [pendingStart, setPendingStart] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    vehiclesApi
      .getBusyPeriods(vehicleId)
      .then((res) => {
        if (!active) return;
        setBusy(res.busy.map((b) => ({ start: new Date(b.start).getTime(), end: new Date(b.end).getTime() })));
        setHorizon(new Date(res.to).getTime());
        setUnavailable(res.vehicleUnavailable);
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => {
      active = false;
    };
  }, [vehicleId]);

  const today = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);

  const isBusy = (day: Date) => {
    const start = day.getTime();
    const end = start + DAY_MS;
    return busy.some((b) => b.start < end && b.end > start);
  };
  const isOutOfRange = (day: Date) => day < today || (horizon !== null && day.getTime() > horizon);

  const weekdayNames = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(i18n.language, { weekday: 'narrow' });
    // 2023-01-01 was a Sunday
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2023, 0, 1 + i)));
  }, [i18n.language]);

  const months = [0, 1].map((i) => new Date(today.getFullYear(), today.getMonth() + monthOffset + i, 1));
  const maxOffset = horizon ? Math.max(0, Math.ceil((horizon - today.getTime()) / (30 * DAY_MS)) - 1) : 0;

  const rangeStart = pendingStart ?? selectedStart;
  const rangeEnd = pendingStart ? undefined : selectedEnd;

  const pick = (key: string) => {
    if (!onSelectRange) return;
    setNotice(null);
    if (!pendingStart) {
      setPendingStart(key);
      return;
    }
    if (key <= pendingStart) {
      setPendingStart(key);
      return;
    }
    // A rental cannot run across a day that is already booked
    for (let d = fromKey(pendingStart); d <= fromKey(key); d = new Date(d.getTime() + DAY_MS)) {
      if (isBusy(d)) {
        setNotice(t('availability.rangeBlocked'));
        setPendingStart(null);
        return;
      }
    }
    onSelectRange(pendingStart, key);
    setPendingStart(null);
  };

  return (
    <div className="avail-card">
      <div className="avail-head">
        <div className="avail-title">
          <CalendarDays size={20} color="#FAB826" aria-hidden="true" />
          <div>
            <h2>{t('availability.title')}</h2>
            <p>{onSelectRange ? t('availability.hintPick') : t('availability.hint')}</p>
          </div>
        </div>
        <div className="avail-nav">
          <button type="button" onClick={() => setMonthOffset((m) => Math.max(0, m - 1))} disabled={monthOffset === 0} aria-label={t('availability.previous')}>
            <ChevronLeft size={18} className="rtl-mirror-arrow" />
          </button>
          <button type="button" onClick={() => setMonthOffset((m) => Math.min(maxOffset, m + 1))} disabled={monthOffset >= maxOffset} aria-label={t('availability.next')}>
            <ChevronRight size={18} className="rtl-mirror-arrow" />
          </button>
        </div>
      </div>

      {loadError ? (
        <p className="avail-message">{t('availability.loadError')}</p>
      ) : unavailable ? (
        <p className="avail-message">{t('availability.unavailable')}</p>
      ) : (
        <div className="avail-months">
          {months.map((month) => {
            const first = new Date(month.getFullYear(), month.getMonth(), 1);
            const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
            const blanks = first.getDay();
            return (
              <div key={month.toISOString()} className="avail-month">
                <h3>{new Intl.DateTimeFormat(i18n.language, { month: 'long', year: 'numeric' }).format(month)}</h3>
                <div className="avail-grid" role="grid">
                  {weekdayNames.map((name, i) => (
                    <span key={`w-${i}`} className="avail-weekday" aria-hidden="true">{name}</span>
                  ))}
                  {Array.from({ length: blanks }).map((_, i) => (
                    <span key={`b-${i}`} />
                  ))}
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = new Date(month.getFullYear(), month.getMonth(), i + 1);
                    const key = toKey(day);
                    const out = isOutOfRange(day);
                    const booked = !out && isBusy(day);
                    const inRange = !!rangeStart && !!rangeEnd && key >= rangeStart && key <= rangeEnd;
                    const isEdge = key === rangeStart || key === rangeEnd;
                    const label = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'full' }).format(day);
                    return (
                      <button
                        key={key}
                        type="button"
                        role="gridcell"
                        className={`avail-day${out ? ' is-out' : ''}${booked ? ' is-busy' : ''}${inRange ? ' is-range' : ''}${isEdge ? ' is-edge' : ''}`}
                        disabled={out || booked || !onSelectRange}
                        onClick={() => pick(key)}
                        aria-label={`${label}: ${booked ? t('availability.booked') : out ? t('availability.notBookable') : t('availability.free')}`}
                        aria-pressed={isEdge}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="avail-legend">
        <span><i className="dot free" />{t('availability.free')}</span>
        <span><i className="dot busy" />{t('availability.booked')}</span>
        <span><i className="dot range" />{t('availability.yourDates')}</span>
      </div>
      {(notice || pendingStart) && (
        <p className="avail-notice" role="status">{notice || t('availability.pickReturn')}</p>
      )}

      <style>{`
        .avail-card { background: #FFFFFF; border: 1px solid #ECE6F1; border-radius: 20px; padding: 22px; }
        .avail-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 16px; }
        .avail-title { display: flex; gap: 12px; align-items: flex-start; }
        .avail-title h2 { margin: 0; font-size: 1.15rem; font-weight: 800; color: #1E0426; }
        .avail-title p { margin: 4px 0 0; font-size: 0.85rem; color: #6B5A78; }
        .avail-nav { display: flex; gap: 6px; }
        .avail-nav button { width: 36px; height: 36px; border-radius: 10px; border: 1px solid #E5DDEB; background: #FFFFFF; display: grid; place-items: center; cursor: pointer; color: #1E0426; }
        .avail-nav button:disabled { opacity: 0.35; cursor: default; }
        .avail-months { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 420px)); gap: 32px; }
        .avail-month h3 { margin: 0 0 10px; font-size: 0.95rem; font-weight: 700; color: #1E0426; text-transform: capitalize; }
        .avail-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; max-width: 420px; }
        .avail-weekday { text-align: center; font-size: 0.72rem; font-weight: 700; color: #9A8FA5; padding-bottom: 4px; }
        .avail-day { height: 40px; border: none; border-radius: 10px; background: #F3FBF6; color: #14532D; font-weight: 700; font-size: 0.85rem; cursor: pointer; }
        .avail-day:hover:not(:disabled) { outline: 2px solid #FAB826; }
        .avail-day:focus-visible { outline: 2px solid #6C1E84; outline-offset: 1px; }
        .avail-day.is-out { background: transparent; color: #C9C1D1; cursor: default; }
        .avail-day.is-busy { background: repeating-linear-gradient(135deg, #FDE8E8, #FDE8E8 4px, #FBD5D5 4px, #FBD5D5 8px); color: #9B1C1C; text-decoration: line-through; cursor: not-allowed; }
        .avail-day.is-range { background: #FFF3D6; color: #1E0426; }
        .avail-day.is-edge { background: #FAB826; color: #1E0426; }
        .avail-day:disabled:not(.is-busy):not(.is-out) { cursor: default; }
        .avail-legend { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 16px; font-size: 0.8rem; color: #4B4453; }
        .avail-legend span { display: inline-flex; align-items: center; gap: 6px; }
        .avail-legend .dot { width: 12px; height: 12px; border-radius: 4px; display: inline-block; }
        .avail-legend .dot.free { background: #DCF5E6; }
        .avail-legend .dot.busy { background: #FBD5D5; }
        .avail-legend .dot.range { background: #FAB826; }
        .avail-message, .avail-notice { margin: 8px 0 0; font-size: 0.85rem; color: #6B5A78; }
        .avail-notice { color: #9A3412; font-weight: 600; }
      `}</style>
    </div>
  );
}
