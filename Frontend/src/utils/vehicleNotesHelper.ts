/**
 * Finovo Vehicle Notes & Specifications Serialization Engine.
 * 
 * Solves the recursive JSON stringification bug where vehicle.notes
 * stores both human operational notes and pre-trained OEM specs (extraSpecs).
 */

export interface VehicleExtraSpecs {
  luggageCapacityBags?: number;
  cabinBagsCapacity?: number;
  acceleration0to100?: string | number;
  topSpeed?: string | number;
  torqueNm?: string | number;
  fuelEconomy?: string | number;
  minAge?: number;
  minLicenseYears?: number;
  fuelPolicy?: string;
  depositRefundHours?: number;
  smokingAllowed?: boolean;
  petFriendly?: boolean;
}

export interface ParsedVehicleNotes {
  notesText: string;
  extraSpecs: VehicleExtraSpecs | null;
}

/**
 * Recursively parses and unwraps vehicle notes up to 10 levels deep.
 * Safely extracts:
 * 1. Clean human operator text (strips away any JSON formatting)
 * 2. Pre-trained and OEM extra specifications
 */
export function parseVehicleNotes(rawNotes: string | null | undefined): ParsedVehicleNotes {
  if (!rawNotes || typeof rawNotes !== 'string') {
    return { notesText: '', extraSpecs: null };
  }

  let current: any = rawNotes.trim();
  let collectedSpecs: VehicleExtraSpecs | null = null;
  let depth = 0;

  while (typeof current === 'string' && depth < 10) {
    const trimmed = current.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('"') && !trimmed.startsWith('[')) {
      break;
    }

    try {
      const parsed = JSON.parse(trimmed);
      depth++;

      if (parsed && typeof parsed === 'object') {
        if (parsed.extraSpecs && typeof parsed.extraSpecs === 'object') {
          // Merge specs prioritizing newly encountered valid specs
          collectedSpecs = { ...(collectedSpecs || {}), ...parsed.extraSpecs };
        }
        if (parsed.notes !== undefined) {
          current = parsed.notes;
        } else {
          // Object without notes field
          break;
        }
      } else if (typeof parsed === 'string') {
        current = parsed;
      } else {
        break;
      }
    } catch {
      // Not valid JSON, current is raw text
      break;
    }
  }

  const cleanText = typeof current === 'string' ? current.trim() : '';

  return {
    notesText: cleanText,
    extraSpecs: collectedSpecs,
  };
}

/**
 * Cleanly packages human operator notes and OEM extraSpecs into a single non-nested JSON payload.
 * Ensures the `notes` field inside never contains serialized JSON.
 */
export function stringifyVehicleNotes(notes: string, extraSpecs?: VehicleExtraSpecs): string {
  const { notesText } = parseVehicleNotes(notes);
  return JSON.stringify({
    notes: notesText,
    extraSpecs: extraSpecs || {},
  });
}
