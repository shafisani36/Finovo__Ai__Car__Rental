import { useEffect, useState } from 'react';
import { bookingsApi } from '../api/services/bookings.api';
import type {
  BookingAddon,
  BookingAddonCode,
  QuoteAvailability,
  QuoteExtras,
  QuoteResult,
} from '../features/bookings/api/bookingApi';

export interface BookingQuoteState {
  quote: QuoteResult | null;
  availability: QuoteAvailability | null;
  addonCatalog: BookingAddon[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Fetches the server-authoritative price and availability for a vehicle and date/time range.
 * All amounts come from the backend pricing engine, so what the customer sees is what Stripe charges.
 */
export function useBookingQuote(
  vehicleId: string | null | undefined,
  pickupDateTime: string | null,
  returnDateTime: string | null,
  addons: BookingAddonCode[],
  extras: QuoteExtras = {}
): BookingQuoteState {
  const [state, setState] = useState<BookingQuoteState>({
    quote: null,
    availability: null,
    addonCatalog: [],
    isLoading: false,
    error: null,
  });
  const addonsKey = [...addons].sort().join(',');
  const promoCode = extras.promoCode?.trim() || '';
  const points = extras.points && extras.points > 0 ? Math.floor(extras.points) : 0;
  const deliveryAddress = extras.deliveryAddress?.trim() || '';
  const collectionAddress = extras.collectionAddress?.trim() || '';

  useEffect(() => {
    if (!vehicleId || !pickupDateTime || !returnDateTime) {
      setState((prev) => ({ ...prev, quote: null, availability: null, isLoading: false, error: null }));
      return;
    }
    if (new Date(pickupDateTime) >= new Date(returnDateTime)) {
      setState((prev) => ({
        ...prev,
        quote: null,
        availability: { available: false, conflictReason: 'Return date must be after the pickup date.' },
        isLoading: false,
        error: null,
      }));
      return;
    }

    let active = true;
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    // Small debounce so rapid date edits do not flood the API
    const timer = window.setTimeout(async () => {
      try {
        const res = await bookingsApi.quote({
          vehicleId,
          pickupDateTime,
          returnDateTime,
          ...(addonsKey ? { addons: addonsKey } : {}),
          ...(promoCode ? { promoCode } : {}),
          ...(points ? { points } : {}),
          ...(deliveryAddress ? { deliveryAddress } : {}),
          ...(collectionAddress ? { collectionAddress } : {}),
        });
        if (!active) return;
        setState({
          quote: res.quote,
          availability: res.availability,
          addonCatalog: res.addonCatalog || [],
          isLoading: false,
          error: null,
        });
      } catch (err) {
        if (!active) return;
        setState((prev) => ({
          ...prev,
          quote: null,
          availability: null,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Unable to calculate price',
        }));
      }
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [vehicleId, pickupDateTime, returnDateTime, addonsKey, promoCode, points, deliveryAddress, collectionAddress]);

  return state;
}

/** Combines a local date (YYYY-MM-DD) and time (HH:mm) into an ISO timestamp in the user's time zone. */
export function toLocalIso(date: string, time = '10:00'): string | null {
  if (!date) return null;
  const parsed = new Date(`${date}T${time}:00`);
  return isNaN(parsed.getTime()) ? null : parsed.toISOString();
}
