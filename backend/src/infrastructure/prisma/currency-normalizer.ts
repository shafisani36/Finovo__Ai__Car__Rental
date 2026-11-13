import { prisma } from './prisma.client';
import { env } from '../../config/env.config';

/**
 * Moves every stored price, booking, invoice and payment record to the single app currency.
 *
 * The site charges in one currency only (env.CURRENCY), so rows saved earlier with another
 * code (PKR, USD) would show mixed currencies and could not be paid through Stripe correctly.
 * Only the currency code changes; amounts are kept as they are.
 * Safe to run on every start: when all rows already match, every update touches nothing.
 */
export async function normalizeStoredCurrency(): Promise<void> {
  const currency = env.CURRENCY;
  const notAppCurrency = { currency: { not: currency } };
  const data = { currency };

  const results = await prisma.$transaction([
    prisma.vehicle.updateMany({ where: notAppCurrency, data }),
    prisma.vehicleMaintenance.updateMany({ where: notAppCurrency, data }),
    prisma.vehicleDamageReport.updateMany({ where: notAppCurrency, data }),
    prisma.vehiclePricingTier.updateMany({ where: notAppCurrency, data }),
    prisma.booking.updateMany({ where: notAppCurrency, data }),
    prisma.bookingPricingSnapshot.updateMany({ where: notAppCurrency, data }),
    prisma.bookingPricingBreakdown.updateMany({ where: notAppCurrency, data }),
    prisma.damage_charges.updateMany({ where: notAppCurrency, data }),
    prisma.payments.updateMany({ where: notAppCurrency, data }),
    prisma.price_quotes.updateMany({ where: notAppCurrency, data }),
  ]);

  const changed = results.reduce((sum, result) => sum + result.count, 0);
  if (changed > 0) {
    console.log(` Currency: ${changed} stored record(s) moved to ${currency}`);
  }
}
