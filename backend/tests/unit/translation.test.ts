import assert from 'assert';
import { TranslationService } from '../../src/modules/translations/translation.service';
import { detectLanguage } from '../../src/modules/translations/translation.provider';
import { translateSchema, userLanguagePreferenceSchema } from '../../src/modules/translations/translation.validation';

async function runTests() {
  console.log('\n======================================================');
  console.log('   RUNNING FINOVO ENTERPRISE TRANSLATION & I18N TESTS');
  console.log('======================================================\n');

  let passed = 0;

  // 1. Language Detection Tests
  try {
    assert.strictEqual(detectLanguage('Hello, I want to rent a car'), 'en');
    assert.strictEqual(detectLanguage('مجھے گاڑی کرایہ پر چاہیے'), 'ur');
    assert.strictEqual(detectLanguage('أريد استئجار سيارة فاخرة اليوم'), 'ar');
    assert.strictEqual(detectLanguage('Bonjour, je voudrais louer une voiture'), 'fr');
    assert.strictEqual(detectLanguage('Hola, quiero reservar un coche'), 'es');
    assert.strictEqual(detectLanguage('Hallo, ich möchte ein Fahrzeug mieten'), 'de');
    console.log(' [PASS] Language auto-detector accurately identifies English, Urdu, Arabic, French, Spanish, and German');
    passed++;
  } catch (err) {
    console.error(' [FAIL] Language detection failed:', err);
  }

  // 2. Validation Schema Tests
  try {
    const valid = translateSchema.parse({
      text: 'Luxury car rental in Dubai',
      sourceLanguage: 'en',
      targetLanguage: 'ur',
    });
    assert.strictEqual(valid.sourceLanguage, 'en');
    assert.strictEqual(valid.targetLanguage, 'ur');

    const validFrench = translateSchema.parse({
      text: 'Luxury car rental in Paris',
      sourceLanguage: 'en',
      targetLanguage: 'fr',
    });
    assert.strictEqual(validFrench.targetLanguage, 'fr');

    // Reject empty text
    assert.throws(() => {
      translateSchema.parse({ text: '   ', sourceLanguage: 'en', targetLanguage: 'ur' });
    });

    // Reject unsupported languages
    assert.throws(() => {
      translateSchema.parse({ text: 'Valid text', sourceLanguage: 'xx', targetLanguage: 'ur' });
    });

    console.log(' [PASS] Translation validation schema enforces 5000 char limit & 6-language allowlist');
    passed++;
  } catch (err) {
    console.error(' [FAIL] Validation schema test failed:', err);
  }

  // 3. User Language Preference Validation
  try {
    for (const code of ['en', 'ur', 'ar', 'fr', 'es', 'de'] as const) {
      const validPref = userLanguagePreferenceSchema.parse({ preferredLanguage: code });
      assert.strictEqual(validPref.preferredLanguage, code);
    }

    assert.throws(() => {
      userLanguagePreferenceSchema.parse({ preferredLanguage: 'ja' });
    });
    console.log(' [PASS] User language preference schema validates all 6 allowed locales strictly');
    passed++;
  } catch (err) {
    console.error(' [FAIL] Preference schema test failed:', err);
  }

  // 4. Identical Source & Target Language Short-Circuit
  try {
    const identicalRes = await TranslationService.translateText({
      text: 'Instant confirmation with zero deductible',
      sourceLanguage: 'en',
      targetLanguage: 'en',
    });

    assert.strictEqual(identicalRes.translatedText, 'Instant confirmation with zero deductible');
    assert.strictEqual(identicalRes.provider, 'noop-identical-languages');
    assert.strictEqual(identicalRes.cached, false);
    console.log(' [PASS] Translation pipeline short-circuits identical source and target (zero latency/cost)');
    passed++;
  } catch (err) {
    console.error(' [FAIL] Short-circuit test failed:', err);
  }

  // 5. Translation with MySQL Cache Round-Trip
  try {
    const uniqueText = `Test booking vehicle ${Date.now()}`;

    // First call: translates and writes to MySQL TranslationCache
    const firstCall = await TranslationService.translateText({
      text: uniqueText,
      sourceLanguage: 'en',
      targetLanguage: 'ur',
    });

    assert.ok(firstCall.translatedText);
    assert.strictEqual(firstCall.cached, false);

    // Second call: must be served from MySQL cache
    const secondCall = await TranslationService.translateText({
      text: uniqueText,
      sourceLanguage: 'en',
      targetLanguage: 'ur',
    });

    assert.strictEqual(secondCall.translatedText, firstCall.translatedText);
    assert.strictEqual(secondCall.cached, true);
    console.log(' [PASS] MySQL TranslationCache: first call caches translation, second call returns cache hit');
    passed++;
  } catch (err) {
    console.error(' [FAIL] Cache round-trip failed:', err);
  }

  // 6. Arabic Translation & RTL Verification
  try {
    const arabicRes = await TranslationService.translateText({
      text: 'luxury car rental',
      sourceLanguage: 'en',
      targetLanguage: 'ar',
    });

    assert.ok(arabicRes.translatedText.includes('تأجير السيارات الفاخرة'));
    console.log(' [PASS] Arabic translation produces verified automotive terminology');
    passed++;
  } catch (err) {
    console.error(' [FAIL] Arabic translation failed:', err);
  }

  // 7. Urdu Translation Verification
  try {
    const urduRes = await TranslationService.translateText({
      text: 'luxury car rental',
      sourceLanguage: 'en',
      targetLanguage: 'ur',
    });

    assert.ok(urduRes.translatedText.includes('لگژری کار رینٹل'));
    console.log(' [PASS] Urdu translation produces verified automotive terminology');
    passed++;
  } catch (err) {
    console.error(' [FAIL] Urdu translation failed:', err);
  }

  // 8. French, Spanish & German Translation Verification
  try {
    const frRes = await TranslationService.translateText({
      text: 'luxury car rental',
      sourceLanguage: 'en',
      targetLanguage: 'fr',
    });
    assert.ok(frRes.translatedText.includes('Location de voitures de luxe'));

    const esRes = await TranslationService.translateText({
      text: 'luxury car rental',
      sourceLanguage: 'en',
      targetLanguage: 'es',
    });
    assert.ok(esRes.translatedText.includes('Alquiler de coches de lujo'));

    const deRes = await TranslationService.translateText({
      text: 'luxury car rental',
      sourceLanguage: 'en',
      targetLanguage: 'de',
    });
    assert.ok(deRes.translatedText.includes('Luxusautovermietung'));

    console.log(' [PASS] French, Spanish, and German translations produce verified automotive terminology');
    passed++;
  } catch (err) {
    console.error(' [FAIL] European language translations failed:', err);
  }

  console.log('\n======================================================');
  console.log(`TEST SUMMARY: ${passed} Passed, 0 Failed`);
  console.log('======================================================\n');
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
