import { useEffect, useState } from 'react';
import { bookingsApi } from '../api/services/bookings.api';
import type { BookingOptions } from '../features/bookings/api/bookingApi';

// One request per page load: the rules rarely change, so every screen shares the same answer
let cached: Promise<BookingOptions | null> | null = null;

function loadOptions(): Promise<BookingOptions | null> {
  if (!cached) {
    cached = bookingsApi
      .options()
      .then((res) => res.options)
      .catch(() => {
        cached = null; // try again next time
        return null;
      });
  }
  return cached;
}

/** Public checkout rules from the server: currency, tax rate, delivery fee, points and cancellation policy. */
export function useBookingOptions(): BookingOptions | null {
  const [options, setOptions] = useState<BookingOptions | null>(null);
  useEffect(() => {
    let active = true;
    void loadOptions().then((value) => {
      if (active) setOptions(value);
    });
    return () => {
      active = false;
    };
  }, []);
  return options;
}
