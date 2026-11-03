export interface DecodedVehicleSpecs {
  vin: string;
  brand: string;
  model: string;
  year: number;
  trim?: string;
  bodyType?: string;
  fuelType: 'PETROL' | 'DIESEL' | 'HYBRID' | 'ELECTRIC';
  transmission: 'AUTOMATIC' | 'MANUAL';
  doors?: number;
  engineSize?: string;
  horsePower?: number;
  drivetrain?: string;
  suggestedCategory?: string;
}

export class VinService {
  /**
   * Decode a 17-character VIN using the official NHTSA vPIC database.
   */
  static async decodeVin(vin: string): Promise<DecodedVehicleSpecs> {
    const cleanVin = vin.trim().toUpperCase();
    if (cleanVin.length < 11 || cleanVin.length > 17) {
      throw new Error('Invalid VIN length. VIN must be between 11 and 17 characters.');
    }

    const url = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${encodeURIComponent(cleanVin)}?format=json`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`NHTSA API responded with status ${response.status}`);
      }

      const data = (await response.json()) as { Results: Array<{ Variable: string; Value: string | null }> };
      const map: Record<string, string> = {};

      for (const item of data.Results || []) {
        if (item.Value && item.Value !== 'Not Applicable' && item.Value !== '0') {
          map[item.Variable] = item.Value.trim();
        }
      }

      const rawMake = map['Make'] || '';
      const rawModel = map['Model'] || '';
      const rawYear = parseInt(map['Model Year'] || '0', 10);
      const rawBody = map['Body Class'] || '';
      const rawFuel = (map['Fuel Type - Primary'] || '').toUpperCase();
      const rawTrans = (map['Transmission Style'] || '').toUpperCase();
      const rawDoors = parseInt(map['Doors'] || '0', 10);
      const rawDisp = map['Displacement (L)'] ? `${map['Displacement (L)']}L` : undefined;
      const rawHP = parseInt(map['Engine Brake (hp) From'] || map['Engine HP'] || '0', 10);
      const rawDrive = map['Drive Type'] || undefined;

      // Title case format helper
      const formatName = (str: string) => {
        if (!str) return '';
        return str
          .toLowerCase()
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
      };

      // Map Fuel Type
      let fuelType: 'PETROL' | 'DIESEL' | 'HYBRID' | 'ELECTRIC' = 'PETROL';
      if (rawFuel.includes('ELECTRIC')) fuelType = 'ELECTRIC';
      else if (rawFuel.includes('HYBRID')) fuelType = 'HYBRID';
      else if (rawFuel.includes('DIESEL')) fuelType = 'DIESEL';

      // Map Transmission
      let transmission: 'AUTOMATIC' | 'MANUAL' = 'AUTOMATIC';
      if (rawTrans.includes('MANUAL')) transmission = 'MANUAL';

      // Guess Category
      let suggestedCategory = 'Sedan';
      const bodyLower = rawBody.toLowerCase();
      if (bodyLower.includes('sport utility') || bodyLower.includes('suv')) suggestedCategory = 'SUV';
      else if (bodyLower.includes('coupe') || bodyLower.includes('convertible')) suggestedCategory = 'Sports';
      else if (bodyLower.includes('van') || bodyLower.includes('minivan')) suggestedCategory = 'Van';
      else if (bodyLower.includes('pickup') || bodyLower.includes('truck')) suggestedCategory = 'Truck';
      else if (bodyLower.includes('luxury') || rawMake.toUpperCase().includes('PORSCHE') || rawMake.toUpperCase().includes('MERCEDES')) suggestedCategory = 'Luxury';

      return {
        vin: cleanVin,
        brand: formatName(rawMake),
        model: rawModel,
        year: rawYear || new Date().getFullYear(),
        trim: map['Trim'] || map['Series'] || undefined,
        bodyType: rawBody || undefined,
        fuelType,
        transmission,
        doors: rawDoors > 0 ? rawDoors : 4,
        engineSize: rawDisp,
        horsePower: rawHP > 0 ? rawHP : undefined,
        drivetrain: rawDrive,
        suggestedCategory,
      };
    } catch (err: any) {
      clearTimeout(timeout);
      throw new Error(`Failed to decode VIN: ${err.message || 'Unknown network error'}`);
    }
  }
}
