'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Cookie, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import styles from './consent-banner.module.css';

interface ConsentPreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
}

const DEFAULT_PREFERENCES: ConsentPreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
  preferences: false,
};

const STORAGE_KEY = 'nabd-consent-preferences';
const BANNER_DISMISSED_KEY = 'nabd-consent-dismissed';

export function ConsentBanner({
  locale = 'ar',
  privacyPolicyUrl = '/privacy',
  cookiePolicyUrl = '/cookies',
  onConsentChange,
}: {
  locale?: string;
  privacyPolicyUrl?: string;
  cookiePolicyUrl?: string;
  onConsentChange?: (prefs: ConsentPreferences) => void;
}) {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<ConsentPreferences>(DEFAULT_PREFERENCES);
  const [isSaving, setIsSaving] = useState(false);
  const isRTL = locale === 'ar' || locale === 'ur' || locale === 'fa';

  // Load preferences from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const dismissed = localStorage.getItem(BANNER_DISMISSED_KEY);
    if (dismissed === 'true') {
      setShowBanner(false);
      return;
    }
    
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
        setShowBanner(false); // Already consented
      } catch {
        setShowBanner(true);
      }
    } else {
      setShowBanner(true); // First visit
    }
  }, []);

  const savePreferences = useCallback(async (newPrefs: ConsentPreferences) => {
    setIsSaving(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs));
      localStorage.setItem(BANNER_DISMISSED_KEY, 'true');
      setPreferences(newPrefs);
      setShowBanner(false);
      onConsentChange?.(newPrefs);
      
      // If analytics enabled, initialize analytics
      if (newPrefs.analytics && typeof window !== 'undefined') {
        // Initialize analytics here (e.g., gtag, plausible, etc.)
        // eslint-disable-next-line no-console
        console.log('Analytics consent granted');
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to save consent preferences:', error);
    } finally {
      setIsSaving(false);
    }
  }, [onConsentChange]);

  const acceptAll = () => savePreferences({ necessary: true, analytics: true, marketing: true, preferences: true });
  const rejectAll = () => savePreferences({ necessary: true, analytics: false, marketing: false, preferences: false });
  const saveCustom = () => savePreferences(preferences);

  const toggleDetail = () => setShowDetails(!showDetails);

  const categoryLabels = {
    necessary: { ar: 'ضرورية', en: 'Necessary', desc: { ar: 'مطلوبة لعمل الموقع، لا يمكن تعطيلها', en: 'Required for the site to function, cannot be disabled' } },
    analytics: { ar: 'تحليلية', en: 'Analytics', desc: { ar: 'تساعدنا على فهم كيفية استخدام الزوار للموقع', en: 'Help us understand how visitors use the site' } },
    marketing: { ar: 'تسويقية', en: 'Marketing', desc: { ar: 'تستخدم لعرض إعلانات ذات صلة', en: 'Used to show relevant advertisements' } },
    preferences: { ar: 'تفضيلات', en: 'Preferences', desc: { ar: 'تتذكر إعداداتك مثل اللغة والمنطقة', en: 'Remember your settings like language and region' } },
  };

  if (!showBanner) return null;

  return (
    <>
      <div className={styles.overlay} onClick={() => setShowBanner(false)} aria-hidden="true" />
      
      <aside 
        className={`${styles.banner} ${isRTL ? styles.rtl : ''}`} 
        role="dialog" 
        aria-labelledby="consent-title"
        aria-describedby="consent-desc"
      >
        <div className={styles.content}>
          <div className={styles.header}>
            <div className={styles.iconWrapper}>
              <Cookie size={24} aria-hidden="true" />
            </div>
            <div>
              <h3 id="consent-title" className={styles.title}>
                {locale === 'ar' ? 'نحن نهتم بخصوصيتك' : 'We value your privacy'}
              </h3>
              <p id="consent-desc" className={styles.description}>
                {locale === 'ar' 
                  ? 'نستخدم ملفات تعريف الارتباط لتحسين تجربتك، وتحليل حركة المرور، وتخصيص المحتوى. يمكنك قبول الجميع أو تخصيص تفضيلاتك.'
                  : 'We use cookies to enhance your experience, analyze traffic, and personalize content. Accept all or customize your preferences.'}
              </p>
            </div>
          </div>

          {showDetails && (
            <div className={styles.details}>
              <button
                type="button"
                onClick={toggleDetail}
                className={styles.toggleBtn}
                aria-expanded={showDetails}
              >
                <span>{locale === 'ar' ? 'إدارة التفضيلات' : 'Manage preferences'}</span>
                <ChevronUp size={18} aria-hidden="true" />
              </button>
              
              <div className={styles.categories}>
                {(Object.keys(DEFAULT_PREFERENCES) as Array<keyof ConsentPreferences>).map(key => {
                  const cat = categoryLabels[key];
                  const disabled = key === 'necessary';
                  return (
                    <label key={key} className={`${styles.category} ${disabled ? styles.disabled : ''}`}>
                      <div className={styles.categoryInfo}>
                        <input
                          type="checkbox"
                          checked={preferences[key]}
                          onChange={e => setPreferences(prev => ({ ...prev, [key]: e.target.checked }))}
                          disabled={disabled}
                          className={styles.checkbox}
                          id={`consent-${key}`}
                        />
                        <div className={styles.categoryText}>
                          <span className={styles.categoryName}>{cat[locale as keyof typeof cat] || cat.en}</span>
                          <span className={styles.categoryDesc}>{cat.desc[locale as keyof typeof cat.desc] || cat.desc.en}</span>
                        </div>
                        {disabled && <Shield size={16} className={styles.shield} aria-label={locale === 'ar' ? 'مطلوب' : 'Required'} />}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {!showDetails && (
            <button
              type="button"
              onClick={toggleDetail}
              className={styles.toggleBtn}
              aria-expanded={showDetails}
            >
              <span>{locale === 'ar' ? 'إدارة التفضيلات' : 'Manage preferences'}</span>
              <ChevronDown size={18} aria-hidden="true" />
            </button>
          )}
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            onClick={rejectAll}
            className={styles.btnSecondary}
            disabled={isSaving}
          >
            {locale === 'ar' ? 'رفض الجميع' : 'Reject all'}
          </button>
          <button
            type="button"
            onClick={acceptAll}
            className={styles.btnPrimary}
            disabled={isSaving}
          >
            {isSaving 
              ? (locale === 'ar' ? 'جاري الحفظ...' : 'Saving...')
              : (locale === 'ar' ? 'قبول الجميع' : 'Accept all')}
          </button>
        </div>

        <div className={styles.footer}>
          <a href={privacyPolicyUrl} target="_blank" rel="noopener noreferrer" className={styles.link}>
            {locale === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}
          </a>
          <span className={styles.separator}>|</span>
          <a href={cookiePolicyUrl} target="_blank" rel="noopener noreferrer" className={styles.link}>
            {locale === 'ar' ? 'سياسة ملفات تعريف الارتباط' : 'Cookie Policy'}
          </a>
        </div>
      </aside>
    </>
  );
}

export default ConsentBanner;
