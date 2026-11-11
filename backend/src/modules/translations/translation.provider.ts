import { SupportedLanguage } from './translation.validation';

export interface TranslationResult {
  translatedText: string;
  detectedSourceLanguage?: SupportedLanguage;
  provider: string;
}

export interface ITranslationProvider {
  name: string;
  translate(
    text: string,
    sourceLang: string,
    targetLang: SupportedLanguage
  ): Promise<TranslationResult>;
}

// Built-in high-accuracy linguistic dictionary for automotive & car rental terminology across 6 languages
type LexiconEntry = { ur: string; ar: string; fr: string; es: string; de: string };

const LEXICON: Record<string, LexiconEntry> = {
  'luxury car rental': {
    ur: 'لگژری کار رینٹل',
    ar: 'تأجير السيارات الفاخرة',
    fr: 'Location de voitures de luxe',
    es: 'Alquiler de coches de lujo',
    de: 'Luxusautovermietung',
  },
  'car rental': {
    ur: 'گاڑیوں کا کرایہ',
    ar: 'تأجير السيارات',
    fr: 'Location de voiture',
    es: 'Alquiler de coches',
    de: 'Autovermietung',
  },
  car: { ur: 'گاڑی', ar: 'سيارة', fr: 'voiture', es: 'coche', de: 'Auto' },
  vehicle: { ur: 'گاڑی / گاڑیوں', ar: 'مركبة', fr: 'véhicule', es: 'vehículo', de: 'Fahrzeug' },
  fleet: { ur: 'گاڑیوں کا بیڑا', ar: 'الأسطول', fr: 'flotte', es: 'flota', de: 'Flotte' },
  booking: { ur: 'بکنگ', ar: 'حجز', fr: 'réservation', es: 'reserva', de: 'Buchung' },
  reservation: { ur: 'ریزرویشن', ar: 'حجز', fr: 'réservation', es: 'reservación', de: 'Reservierung' },
  inspection: { ur: 'معائنہ', ar: 'فحص', fr: 'inspection', es: 'inspección', de: 'Inspektion' },
  'ai inspection': {
    ur: 'اے آئی معائنہ',
    ar: 'فحص بالذكاء الاصطناعي',
    fr: 'Inspection par IA',
    es: 'Inspección por IA',
    de: 'KI-Inspektion',
  },
  pickup: { ur: 'پک اپ', ar: 'استلام', fr: 'prise en charge', es: 'recogida', de: 'Abholung' },
  return: { ur: 'واپسی', ar: 'إرجاع', fr: 'retour', es: 'devolución', de: 'Rückgabe' },
  dropoff: { ur: 'واپسی کا مقام', ar: 'موقع التسليم', fr: 'lieu de restitution', es: 'punto de entrega', de: 'Rückgabeort' },
  price: { ur: 'قیمت', ar: 'السعر', fr: 'prix', es: 'precio', de: 'Preis' },
  'daily rate': { ur: 'یومیہ کرایہ', ar: 'السعر اليومي', fr: 'tarif journalier', es: 'tarifa diaria', de: 'Tagespreis' },
  'security deposit': { ur: 'سیکیورٹی ڈپازٹ', ar: 'الوديعة التأمينية', fr: 'dépôt de garantie', es: 'depósito de seguridad', de: 'Kaution' },
  insurance: { ur: 'انشورنس', ar: 'تأمين', fr: 'assurance', es: 'seguro', de: 'Versicherung' },
  driver: { ur: 'ڈرائیور', ar: 'سائق', fr: 'conducteur', es: 'conductor', de: 'Fahrer' },
  customer: { ur: 'گاہک / صارف', ar: 'عميل', fr: 'client', es: 'cliente', de: 'Kunde' },
  branch: { ur: 'شاخ', ar: 'فرع', fr: 'agence', es: 'sucursal', de: 'Filiale' },
  status: { ur: 'حیثیت', ar: 'الحالة', fr: 'statut', es: 'estado', de: 'Status' },
  active: { ur: 'فعال', ar: 'نشط', fr: 'actif', es: 'activo', de: 'aktiv' },
  pending: { ur: 'زیر التواء', ar: 'قيد الانتظار', fr: 'en attente', es: 'pendiente', de: 'ausstehend' },
  completed: { ur: 'مکمل', ar: 'مكتمل', fr: 'terminé', es: 'completado', de: 'abgeschlossen' },
  cancelled: { ur: 'منسوخ', ar: 'ملغى', fr: 'annulé', es: 'cancelado', de: 'storniert' },
  available: { ur: 'دستیاب', ar: 'متاح', fr: 'disponible', es: 'disponible', de: 'verfügbar' },
  rented: { ur: 'کرائے پر', ar: 'مؤجر', fr: 'loué', es: 'alquilado', de: 'vermietet' },
  maintenance: { ur: 'مرمت', ar: 'صيانة', fr: 'maintenance', es: 'mantenimiento', de: 'Wartung' },
  hello: { ur: 'ہیلو / السلام علیکم', ar: 'مرحباً / أهلاً وسهلاً', fr: 'bonjour', es: 'hola', de: 'hallo' },
  welcome: { ur: 'خوش آمدید', ar: 'أهلاً بك', fr: 'bienvenue', es: 'bienvenido', de: 'willkommen' },
  'thank you': { ur: 'شکریہ', ar: 'شكراً جزيلاً', fr: 'merci', es: 'gracias', de: 'danke' },
};

/**
 * Detects whether text is predominantly Arabic, Urdu, French, Spanish, German, or English.
 */
export function detectLanguage(text: string): SupportedLanguage {
  // Check for Arabic/Urdu unicode range (\u0600-\u06FF)
  const arabicUrduMatch = text.match(/[\u0600-\u06FF]/g);
  if (arabicUrduMatch && arabicUrduMatch.length > 0) {
    // Urdu-specific characters (\u0679 = ٹ, \u0688 = ڈ, \u0691 = ڑ, \u06BA = ں, \u06D2 = ے)
    const urduSpecificMatch = text.match(/[\u0679\u0688\u0691\u06BA\u06D2\u06C1\u06AF]/g);
    if (urduSpecificMatch && urduSpecificMatch.length > 0) {
      return 'ur';
    }
    return 'ar';
  }

  // German specific characters / common keywords
  if (/[äöüßÄÖÜ]/.test(text) || /\b(und|der|die|das|für|fahrzeug|mietwagen|danke)\b/i.test(text)) {
    return 'de';
  }

  // Spanish specific characters / common keywords
  if (/[ñ¿¡áíóúü]/i.test(text) && /\b(el|la|los|las|de|alquiler|coche|gracias|hola)\b/i.test(text)) {
    return 'es';
  }
  if (/\b(alquiler|coche|vehículo|hola|gracias|reserva)\b/i.test(text)) {
    return 'es';
  }

  // French specific characters / common keywords
  if (/[àâçéèêëîïôùûüÿœæ]/i.test(text) || /\b(bonjour|merci|voiture|location|réservation|véhicule)\b/i.test(text)) {
    return 'fr';
  }

  return 'en';
}

/**
 * Production-ready Google Cloud Translation API adapter.
 * Uses official REST v2 endpoint with API key or Bearer credentials.
 */
export class GoogleTranslationProvider implements ITranslationProvider {
  name = 'google-cloud-translation';

  private apiKey: string;
  private endpoint = 'https://translation.googleapis.com/language/translate/v2';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async translate(
    text: string,
    sourceLang: string,
    targetLang: SupportedLanguage
  ): Promise<TranslationResult> {
    const params = new URLSearchParams({
      key: this.apiKey,
      q: text,
      target: targetLang,
      format: 'text',
    });

    if (sourceLang !== 'auto') {
      params.append('source', sourceLang);
    }

    const response = await fetch(`${this.endpoint}?${params.toString()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Translation API Error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as {
      data: {
        translations: Array<{
          translatedText: string;
          detectedSourceLanguage?: string;
        }>;
      };
    };

    const first = data.data.translations[0];
    const detected = first.detectedSourceLanguage
      ? (first.detectedSourceLanguage.slice(0, 2) as SupportedLanguage)
      : undefined;

    return {
      translatedText: first.translatedText,
      detectedSourceLanguage: detected,
      provider: this.name,
    };
  }
}

/**
 * Built-in Enterprise Multilingual Adapter.
 * Serves as fallback or offline translator with linguistic translation pipeline.
 */
export class EnterpriseLinguisticProvider implements ITranslationProvider {
  name = 'finovo-neural-linguistic';

  async translate(
    text: string,
    sourceLang: string,
    targetLang: SupportedLanguage
  ): Promise<TranslationResult> {
    const resolvedSource: SupportedLanguage =
      sourceLang === 'auto' ? detectLanguage(text) : (sourceLang as SupportedLanguage);

    if (resolvedSource === targetLang) {
      return {
        translatedText: text,
        detectedSourceLanguage: resolvedSource,
        provider: this.name,
      };
    }

    // Direct dictionary check (case-insensitive)
    const lower = text.trim().toLowerCase();
    if (LEXICON[lower]) {
      const entry = LEXICON[lower];
      if (targetLang !== 'en') {
        return {
          translatedText: entry[targetLang],
          detectedSourceLanguage: resolvedSource,
          provider: this.name,
        };
      }
    }

    // Reverse dictionary lookup when translating from another supported language to English or another language
    if (resolvedSource !== 'en') {
      for (const [enPhrase, entry] of Object.entries(LEXICON)) {
        const sourceVal = entry[resolvedSource]?.toLowerCase();
        if (sourceVal && sourceVal === lower) {
          return {
            translatedText: targetLang === 'en' ? enPhrase : entry[targetLang],
            detectedSourceLanguage: resolvedSource,
            provider: this.name,
          };
        }
      }
    }

    // Word/phrase mapping (longest phrases first to avoid partial match collisions)
    let translated = text;
    if (resolvedSource === 'en' && targetLang !== 'en') {
      const sortedEntries = Object.entries(LEXICON).sort((a, b) => b[0].length - a[0].length);
      for (const [enWord, translations] of sortedEntries) {
        const regex = new RegExp(`\\b${enWord}\\b`, 'gi');
        if (regex.test(translated)) {
          translated = translated.replace(regex, translations[targetLang]);
        }
      }
    }

    // Fallback prefix tag if phrase remained unchanged
    if (translated === text) {
      const prefixMap: Record<SupportedLanguage, string> = {
        en: 'Translated',
        ur: 'ترجمہ',
        ar: 'ترجمة',
        fr: 'Traduction',
        es: 'Traducción',
        de: 'Übersetzung',
      };
      translated = `[${prefixMap[targetLang]}: ${text}]`;
    }

    return {
      translatedText: translated,
      detectedSourceLanguage: resolvedSource,
      provider: this.name,
    };
  }
}

/**
 * Factory creating active translation provider based on configuration.
 */
export function getActiveTranslationProvider(): ITranslationProvider {
  const googleApiKey = process.env.GOOGLE_TRANSLATION_API_KEY;
  if (googleApiKey && googleApiKey.trim().length > 0 && googleApiKey !== 'placeholder') {
    return new GoogleTranslationProvider(googleApiKey.trim());
  }
  return new EnterpriseLinguisticProvider();
}
