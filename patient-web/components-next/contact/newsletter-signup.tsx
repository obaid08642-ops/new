'use client';

import { useState } from 'react';
import { Mail, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import styles from './newsletter-signup.module.css';

interface NewsletterSignupProps {
  locale?: string;
  title?: string;
  description?: string;
  placeholder?: string;
  buttonText?: string;
  onSubmit?: (email: string) => Promise<void>;
  variant?: 'inline' | 'card' | 'footer';
}

export function NewsletterSignup({
  locale = 'ar',
  title,
  description,
  placeholder,
  buttonText,
  onSubmit,
  variant = 'inline',
}: NewsletterSignupProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const isRTL = locale === 'ar' || locale === 'ur' || locale === 'fa';

  const defaultTexts = {
    ar: {
      title: 'اشترك في نشرتنا البريدية',
      description: 'احصل على أحدث العروض والنصائح الصحية مباشرة في بريدك الإلكتروني',
      placeholder: 'بريدك الإلكتروني',
      button: 'اشترك',
      success: 'شكراً للاشتراك! تحقق من بريدك الإلكتروني لتأكيد الاشتراك.',
      error: 'حدث خطأ. يرجى المحاولة مرة أخرى.',
      invalidEmail: 'يرجى إدخال بريد إلكتروني صحيح',
    },
    en: {
      title: 'Subscribe to our newsletter',
      description: 'Get the latest offers and health tips delivered to your inbox',
      placeholder: 'Your email address',
      button: 'Subscribe',
      success: 'Thanks for subscribing! Check your email to confirm.',
      error: 'Something went wrong. Please try again.',
      invalidEmail: 'Please enter a valid email address',
    },
  };

  const texts = { ...defaultTexts.en, ...defaultTexts[locale as keyof typeof defaultTexts] };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus('error');
      setErrorMessage(texts.invalidEmail);
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      if (onSubmit) {
        await onSubmit(email);
      } else {
        // Default submit to API
        const response = await fetch(`/${locale}/api/newsletter`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        
        if (!response.ok) throw new Error('Failed');
      }
      
      setStatus('success');
      setEmail('');
    } catch {
      setStatus('error');
      setErrorMessage(texts.error);
    }
  };

  const iconMap = {
    success: CheckCircle,
    error: AlertCircle,
    loading: Loader2,
  };

  if (variant === 'card') {
    return (
      <div className={`${styles.card} ${isRTL ? styles.rtl : ''}`}>
        <div className={styles.iconWrapper}>
          <Mail size={32} aria-hidden="true" />
        </div>
        <h3 className={styles.title}>{title || texts.title}</h3>
        <p className={styles.description}>{description || texts.description}</p>
        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={styles.inputWrapper}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={placeholder || texts.placeholder}
              autoComplete="email"
              className={styles.input}
              required
              disabled={status === 'loading'}
              aria-label={texts.placeholder}
            />
            <button
              type="submit"
              disabled={status === 'loading' || !email}
              className={styles.submitBtn}
              aria-label={texts.button}
            >
              {status === 'loading' ? (
                <Loader2 size={20} className={styles.spinner} />
              ) : (
                texts.button
              )}
            </button>
          </div>
          {status === 'success' && (
            <div className={styles.successMsg}>
              <CheckCircle size={20} aria-hidden="true" />
              <span>{texts.success}</span>
            </div>
          )}
          {status === 'error' && (
            <div className={styles.errorMsg}>
              <AlertCircle size={20} aria-hidden="true" />
              <span>{errorMessage || texts.error}</span>
            </div>
          )}
        </form>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`${styles.form} ${variant} ${isRTL ? styles.rtl : ''}`} noValidate>
      {(variant === 'inline' || variant === 'footer') && title && (
        <label htmlFor="newsletter-email" className={styles.label}>
          {title}
        </label>
      )}
      <div className={styles.inputWrapper}>
        <input
          type="email"
          id="newsletter-email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder={placeholder || texts.placeholder}
          autoComplete="email"
          className={styles.input}
          required
          disabled={status === 'loading'}
          aria-label={texts.placeholder}
        />
        <button
          type="submit"
          disabled={status === 'loading' || !email}
          className={styles.submitBtn}
          aria-label={texts.button}
        >
          {status === 'loading' ? (
            <Loader2 size={20} className={styles.spinner} />
          ) : (
            buttonText || texts.button
          )}
        </button>
      </div>
      {status === 'success' && (
        <div className={styles.successMsg}>
          <CheckCircle size={18} aria-hidden="true" />
          <span>{texts.success}</span>
        </div>
      )}
      {status === 'error' && (
        <div className={styles.errorMsg}>
          <AlertCircle size={18} aria-hidden="true" />
          <span>{errorMessage || texts.error}</span>
        </div>
      )}
    </form>
  );
}

export default NewsletterSignup;
