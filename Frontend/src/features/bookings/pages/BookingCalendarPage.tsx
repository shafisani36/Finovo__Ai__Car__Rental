import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { bookingApi, type CalendarEvent } from '../api/bookingApi';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  ArrowLeft,
  RotateCcw,
} from 'lucide-react';

export function BookingCalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Calendar month state
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const startOfMonth = new Date(year, month, 1);
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

      const res = await bookingApi.getCalendarEvents(startOfMonth.toISOString(), endOfMonth.toISOString());
      if (res?.events) {
        setEvents(res.events);
      }
    } catch (err) {
      console.error('Failed to load calendar events:', err);
    } finally {
      setIsLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Month grid calculations
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday

  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  // Get events that overlap with a specific calendar day
  const getEventsForDay = (dayNum: number) => {
    const dayStart = new Date(year, month, dayNum, 0, 0, 0);
    const dayEnd = new Date(year, month, dayNum, 23, 59, 59);

    return events.filter((ev) => {
      const evStart = new Date(ev.start);
      const evEnd = new Date(ev.end);
      return evStart <= dayEnd && evEnd >= dayStart;
    });
  };

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', color: '#1C0324' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <Link
            to="/admin/bookings"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#6C1E84',
              fontSize: '0.875rem',
              fontWeight: 700,
              textDecoration: 'none',
              marginBottom: '10px',
            }}
          >
            <ArrowLeft size={16} />
            <span>Back to Table View</span>
          </Link>
          <h1
            style={{
              fontSize: 'clamp(1.75rem, 2.4vw, 2.2rem)',
              fontWeight: 800,
              color: '#1A0322',
              fontFamily: 'var(--font-family-display, "Archivo", sans-serif)',
              margin: '0 0 4px 0',
              letterSpacing: '-0.02em',
            }}
          >
            Fleet Availability Calendar
          </h1>
          <p style={{ margin: 0, fontSize: '0.925rem', color: '#66566A' }}>
            Visual dispatch schedule and multi-day vehicle reservation timeline
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #ECEAEF', padding: '4px' }}>
            <button
              onClick={handlePrevMonth}
              style={{ border: 'none', background: 'none', padding: '8px', cursor: 'pointer', borderRadius: '6px' }}
            >
              <ChevronLeft size={18} />
            </button>
            <span style={{ padding: '0 12px', fontWeight: 700, fontSize: '0.95rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span>{monthName} {year}</span>
              {isLoading && <RotateCcw size={12} style={{ animation: 'spin 1s linear infinite' }} />}
            </span>
            <button
              onClick={handleNextMonth}
              style={{ border: 'none', background: 'none', padding: '8px', cursor: 'pointer', borderRadius: '6px' }}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <Link
            to="/admin/bookings/new"
            style={{
              backgroundColor: '#FAB826',
              color: '#1A0322',
              fontWeight: 700,
              fontSize: '0.9rem',
              padding: '10px 18px',
              borderRadius: '10px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(250, 184, 38, 0.35)',
            }}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>New Booking</span>
          </Link>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #ECEAEF',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          overflow: 'hidden',
        }}
      >
        {/* Days of week header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            backgroundColor: '#FAF9FB',
            borderBottom: '1px solid #ECEAEF',
            textAlign: 'center',
            fontSize: '0.8rem',
            fontWeight: 700,
            color: '#6B7280',
            padding: '12px 0',
          }}
        >
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        {/* Calendar days grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {/* Empty cells before month start */}
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <div key={`empty-${i}`} style={{ minHeight: '120px', borderRight: '1px solid #F3F4F6', borderBottom: '1px solid #F3F4F6', backgroundColor: '#FAFAFC' }} />
          ))}

          {/* Month days */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const dayEvents = getEventsForDay(dayNum);
            const isToday =
              new Date().getDate() === dayNum &&
              new Date().getMonth() === month &&
              new Date().getFullYear() === year;

            return (
              <div
                key={`day-${dayNum}`}
                style={{
                  minHeight: '120px',
                  borderRight: '1px solid #F3F4F6',
                  borderBottom: '1px solid #F3F4F6',
                  padding: '8px',
                  boxSizing: 'border-box',
                  backgroundColor: isToday ? '#FAF5FB' : '#FFFFFF',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isToday ? '#6C1E84' : 'transparent',
                      color: isToday ? '#FFFFFF' : '#374151',
                    }}
                  >
                    {dayNum}
                  </span>
                  {dayEvents.length > 0 && (
                    <span style={{ fontSize: '0.725rem', color: '#6B7280', fontWeight: 600 }}>
                      {dayEvents.length} car{dayEvents.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Event tags for this day */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {dayEvents.slice(0, 3).map((ev) => {
                    const isConfirmed = ev.status === 'CONFIRMED';
                    const isActive = ev.status === 'ACTIVE';
                    return (
                      <div
                        key={ev.id}
                        title={`${ev.vehicleName} (${ev.registration}) - ${ev.customerName}`}
                        style={{
                          fontSize: '0.725rem',
                          padding: '3px 6px',
                          borderRadius: '4px',
                          fontWeight: 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          backgroundColor: isActive ? '#EFF6FF' : isConfirmed ? '#ECFDF5' : '#F3F4F6',
                          color: isActive ? '#1D4ED8' : isConfirmed ? '#047857' : '#4B5563',
                          borderLeft: `3px solid ${isActive ? '#2563EB' : isConfirmed ? '#059669' : '#9CA3AF'}`,
                        }}
                      >
                        {ev.vehicleName} • {ev.customerName.split(' ')[0]}
                      </div>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <div style={{ fontSize: '0.7rem', color: '#6B7280', paddingLeft: '4px' }}>
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
