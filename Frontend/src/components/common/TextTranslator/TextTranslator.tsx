import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeftRight,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '../Button';
import { apiClient } from '../../../api/client';
import { SUPPORTED_LANGUAGES, type LanguageCode } from '../../../i18n/config';

export interface TextTranslatorProps {
  onClose?: () => void;
  initialSourceLang?: string;
  initialTargetLang?: LanguageCode;
}

interface TranslationApiResponse {
  success: boolean;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  cached?: boolean;
}

export function TextTranslator({
  onClose,
  initialSourceLang = 'auto',
  initialTargetLang = 'ur',
}: TextTranslatorProps) {
  const { t, i18n } = useTranslation();

  const [sourceLang, setSourceLang] = useState<string>(initialSourceLang);
  const [targetLang, setTargetLang] = useState<LanguageCode>(
    initialTargetLang === (i18n.language?.slice(0, 2) as LanguageCode)
      ? initialTargetLang === 'en'
        ? 'ar'
        : 'en'
      : initialTargetLang
  );
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [detectedLang, setDetectedLang] = useState<string | null>(null);

  const charLimit = 5000;

  const handleTranslate = async () => {
    if (!inputText.trim()) {
      setErrorMessage(t('translator.errors.emptyText'));
      return;
    }

    if (sourceLang === targetLang) {
      setOutputText(inputText);
      setErrorMessage(null);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await apiClient.post<TranslationApiResponse>('/translations/translate', {
        text: inputText,
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
      });

      if (response && response.translatedText) {
        setOutputText(response.translatedText);
        if (response.sourceLanguage && response.sourceLanguage !== sourceLang) {
          setDetectedLang(response.sourceLanguage);
        }
      } else {
        throw new Error('Invalid translation response');
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t('translator.errors.failed');
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwap = () => {
    if (sourceLang === 'auto') {
      // If source was auto, swap target into source and make new target opposite
      const newSource = targetLang;
      const newTarget = (detectedLang as LanguageCode) || (targetLang === 'en' ? 'ar' : 'en');
      setSourceLang(newSource);
      setTargetLang(newTarget);
    } else {
      const tempSource = sourceLang as LanguageCode;
      setSourceLang(targetLang);
      setTargetLang(tempSource);
    }

    // Swap texts if output exists
    if (outputText) {
      setInputText(outputText);
      setOutputText(inputText);
    }
    setDetectedLang(null);
    setErrorMessage(null);
  };

  const handleCopy = async () => {
    if (!outputText) return;
    try {
      await navigator.clipboard.writeText(outputText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = outputText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleClear = () => {
    setInputText('');
    setOutputText('');
    setErrorMessage(null);
    setDetectedLang(null);
  };

  const sourceDir =
    sourceLang === 'ur' || sourceLang === 'ar'
      ? 'rtl'
      : sourceLang === 'auto'
      ? 'auto'
      : 'ltr';
  const targetDir = targetLang === 'ur' || targetLang === 'ar' ? 'rtl' : 'ltr';

  return (
    <div className="finovo-translator-container">
      {/* Description & Status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ margin: 0, fontSize: '0.9rem', color: '#66566A' }}>
          {t('translator.subtitle')}
        </p>
      </div>

      {/* Error notification */}
      {errorMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            borderRadius: '10px',
            backgroundColor: '#FEE2E2',
            color: '#B91C1C',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Translation Grid */}
      <div className="finovo-translator-grid">
        {/* Source Text Panel */}
        <div className="finovo-translator-card">
          <div className="finovo-translator-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label
                htmlFor="translator-source-lang"
                style={{ fontSize: '0.8rem', fontWeight: 700, color: '#66566A' }}
              >
                {t('translator.sourceLabel')}:
              </label>
              <select
                id="translator-source-lang"
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '8px',
                  border: '1px solid #E5DFE7',
                  backgroundColor: '#FAF8FB',
                  color: '#1C0324',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <option value="auto">🌐 {t('common.autoDetect')}</option>
                <option value="en">English (English)</option>
                <option value="ur">اردو (Urdu)</option>
                <option value="ar">العربية (Arabic)</option>
              </select>
            </div>

            {detectedLang && (
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: '#F3E8FF',
                  color: '#6C1E84',
                  fontWeight: 600,
                }}
              >
                {t('translator.detectedLanguage')}:{' '}
                {SUPPORTED_LANGUAGES[detectedLang as LanguageCode]?.nativeName || detectedLang}
              </span>
            )}
          </div>

          <textarea
            className="finovo-translator-textarea"
            dir={sourceDir}
            value={inputText}
            maxLength={charLimit}
            onChange={(e) => {
              setInputText(e.target.value);
              if (errorMessage) setErrorMessage(null);
            }}
            placeholder={t('translator.inputPlaceholder')}
          />

          <div className="finovo-translator-footer">
            <span>
              {inputText.length} / {charLimit} {t('translator.characterCount')}
            </span>

            {inputText && (
              <button
                type="button"
                onClick={handleClear}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: '#8A7090',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  border: 'none',
                  background: 'none',
                }}
                aria-label="Clear input text"
              >
                <RotateCcw size={13} />
                <span>{t('translator.clearText')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Swap / Action Button */}
        <button
          type="button"
          className="finovo-translator-swap-btn"
          onClick={handleSwap}
          title={t('translator.swapLanguages')}
          aria-label={t('translator.swapLanguages')}
        >
          <ArrowLeftRight size={18} />
        </button>

        {/* Target Translation Panel */}
        <div className="finovo-translator-card">
          <div className="finovo-translator-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label
                htmlFor="translator-target-lang"
                style={{ fontSize: '0.8rem', fontWeight: 700, color: '#66566A' }}
              >
                {t('translator.targetLabel')}:
              </label>
              <select
                id="translator-target-lang"
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value as LanguageCode)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '8px',
                  border: '1px solid #E5DFE7',
                  backgroundColor: '#FAF8FB',
                  color: '#1C0324',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <option value="en">English (English)</option>
                <option value="ur">اردو (Urdu)</option>
                <option value="ar">العربية (Arabic)</option>
              </select>
            </div>

            {outputText && (
              <button
                type="button"
                onClick={handleCopy}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: isCopied ? '#059669' : '#6C1E84',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  background: 'none',
                }}
                aria-label="Copy translated text"
              >
                {isCopied ? <Check size={14} /> : <Copy size={14} />}
                <span>{isCopied ? t('translator.copiedSuccess') : t('translator.copyResult')}</span>
              </button>
            )}
          </div>

          <div style={{ position: 'relative', flex: 1, display: 'flex' }}>
            {isLoading ? (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  minHeight: '180px',
                  color: '#6C1E84',
                }}
              >
                <Loader2 size={28} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                  {t('translator.translatingBtn')}
                </span>
              </div>
            ) : (
              <textarea
                className="finovo-translator-textarea"
                dir={targetDir}
                readOnly
                value={outputText}
                placeholder={t('translator.outputPlaceholder')}
                style={{ backgroundColor: outputText ? 'transparent' : 'rgba(0,0,0,0.01)' }}
              />
            )}
          </div>

          <div className="finovo-translator-footer">
            <span>
              {outputText.length} {t('translator.characterCount')}
            </span>
            <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
              {SUPPORTED_LANGUAGES[targetLang]?.nativeName}
            </span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          paddingTop: '8px',
        }}
      >
        <div style={{ fontSize: '0.78rem', color: '#8A7090' }}>
          🛡️ {t('translator.poweredBy')}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {onClose && (
            <Button variant="ghost" onClick={onClose}>
              {t('common.actions.close')}
            </Button>
          )}

          <Button
            variant="primary"
            disabled={isLoading || !inputText.trim()}
            onClick={handleTranslate}
            icon={isLoading ? <Loader2 size={16} /> : <Sparkles size={16} />}
            iconPosition="left"
            style={{ minWidth: '140px' }}
          >
            {isLoading ? t('translator.translatingBtn') : t('translator.translateBtn')}
          </Button>
        </div>
      </div>
    </div>
  );
}

