'use client';

import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, X, Mail, Phone, HelpCircle, Loader2 } from 'lucide-react';
import styles from './floating-contact.module.css';

interface FloatingContactProps {
  locale?: string;
  whatsappNumber?: string;
  supportEmail?: string;
  phoneNumber?: string;
  hideOnPaths?: string[]; // Paths where the button should be hidden (e.g., checkout)
  initialPosition?: 'bottom-right' | 'bottom-left';
}

export function FloatingContact({
  locale = 'ar',
  whatsappNumber = '+966500000000',
  supportEmail = 'support@nabd.plus',
  phoneNumber = '+966800000000',
  hideOnPaths = ['/checkout', '/payment', '/order/success'],
  initialPosition = 'bottom-right',
}: FloatingContactProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<'bottom-right' | 'bottom-left'>(initialPosition);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const isRTL = locale === 'ar' || locale === 'ur' || locale === 'fa';

  // Check if current path should hide the button
  const shouldHide = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return hideOnPaths.some(path => window.location.pathname.startsWith(path));
  }, [hideOnPaths]);

  // Hide on checkout paths
  useEffect(() => {
    const checkPath = () => {
      if (shouldHide()) {
        setIsOpen(false);
      }
    };
    checkPath();
    window.addEventListener('popstate', checkPath);
    return () => window.removeEventListener('popstate', checkPath);
  }, [shouldHide]);

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    setIsSubmitting(true);
    setSubmitStatus('idle');
    
    try {
      // Submit to backend
      const response = await fetch(`/${locale}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (response.ok) {
        setSubmitStatus('success');
        (e.target as HTMLFormElement).reset();
      } else {
        setSubmitStatus('error');
      }
    } catch {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactOptions = [
    {
      id: 'whatsapp',
      label: locale === 'ar' ? 'واتساب' : 'WhatsApp',
      icon: MessageSquare,
      color: '#25D366',
      href: `https://wa.me/${whatsappNumber.replace(/\D/g, '')}`,
      external: true,
    },
    {
      id: 'phone',
      label: locale === 'ar' ? 'اتصل بنا' : 'Call Us',
      icon: Phone,
      color: '#10B981',
      href: `tel:${phoneNumber}`,
      external: false,
    },
    {
      id: 'email',
      label: locale === 'ar' ? 'البريد الإلكتروني' : 'Email',
      icon: Mail,
      color: '#EA4335',
      href: `mailto:${supportEmail}`,
      external: false,
    },
    {
      id: 'form',
      label: locale === 'ar' ? 'نموذج تواصل' : 'Contact Form',
      icon: HelpCircle,
      color: '#6366F1',
      href: '#',
      external: false,
      onClick: () => setIsOpen(true),
    },
  ];

  const isHidden = shouldHide();

  if (isHidden) return null;

  return (
    <>
      {/* Main floating button */}
      <button
        type="button"
        className={`${styles.fab} ${position} ${isOpen ? styles.open : ''} ${isRTL ? styles.rtl : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label={isOpen 
          ? (locale === 'ar' ? 'إغلاق خيارات التواصل' : 'Close contact options')
          : (locale === 'ar' ? 'خيارات التواصل' : 'Contact options')}
      >
        <MessageSquare size={24} aria-hidden="true" />
        {isOpen && <X size={24} aria-hidden="true" />}
      </button>

      {/* Options panel */}
      <div className={`${styles.panel} ${position} ${isOpen ? styles.open : ''} ${isRTL ? styles.rtl : ''}`} role="dialog" aria-label={locale === 'ar' ? 'خيارات التواصل' : 'Contact options'}>
        <div className={styles.panelHeader}>
          <h3>{locale === 'ar' ? 'كيف يمكننا مساعدتك؟' : 'How can we help?'}</h3>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className={styles.closeBtn}
            aria-label={locale === 'ar' ? 'إغلاق' : 'Close'}
          >
            <X size={20} />
          </button>
        </div>
        
        <div className={styles.options}>
          {contactOptions.map(option => {
            const Icon = option.icon;
            if (option.onClick) {
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    option.onClick?.();
                    setIsOpen(false);
                  }}
                  className={styles.option}
                  style={{ '--option-color': option.color }}
                >
                  <Icon size={20} />
                  <span>{option.label}</span>
                </button>
              );
            }
            return (
              <a
                key={option.id}
                href={option.href}
                target={option.external ? '_blank' : undefined}
                rel={option.external ? 'noopener noreferrer' : undefined}
                className={styles.option}
                style={{ '--option-color': option.color }}
                onClick={() => setIsOpen(false)}
              >
                <Icon size={20} />
                <span>{option.label}</span>
              </a>
            );
          })}
        </div>

        {/* Contact form */}
        {isOpen && (
          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <h4>{locale === 'ar' ? 'أرسل لنا رسالة' : 'Send us a message'}</h4>
            
            <div className={styles.formGroup}>
              <label htmlFor="contact-name">{locale === 'ar' ? 'الاسم' : 'Name'} *</label>
              <input
                type="text"
                id="contact-name"
                name="name"
                required
                autoComplete="name"
                className={styles.input}
                placeholder={locale === 'ar' ? 'اسمك' : 'Your name'}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="contact-email">{locale === 'ar' ? 'البريد الإلكتروني' : 'Email'} *</label>
              <input
                type="email"
                id="contact-email"
                name="email"
                required
                autoComplete="email"
                className={styles.input}
                placeholder={locale === 'ar' ? 'بريدك الإلكتروني' : 'Your email'}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="contact-phone">{locale === 'ar' ? 'رقم الهاتف' : 'Phone'}</label>
              <input
                type="tel"
                id="contact-phone"
                name="phone"
                autoComplete="tel"
                className={styles.input}
                placeholder={locale === 'ar' ? 'رقم هاتفك (اختياري)' : 'Your phone (optional)'}
                inputMode="tel"
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="contact-subject">{locale === 'ar' ? 'الموضوع' : 'Subject'} *</label>
              <select
                id="contact-subject"
                name="subject"
                required
                className={styles.select}
              >
                <option value="">{locale === 'ar' ? 'اختر موضوعاً' : 'Select a topic'}</option>
                <option value="general">{locale === 'ar' ? 'استفسار عام' : 'General inquiry'}</option>
                <option value="order">{locale === 'ar' ? 'طلب/طلبية' : 'Order issue'}</option>
                <option value="technical">{locale === 'ar' ? 'مشكلة تقنية' : 'Technical issue'}</option>
                <option value="billing">{locale === 'ar' ? 'فوترة/دفع' : 'Billing/Payment'}</option>
                <option value="feedback">{locale === 'ar' ? 'اقتراح/ملاحظة' : 'Feedback'}</option>
                <option value="other">{locale === 'ar' ? 'أخرى' : 'Other'}</option>
              </select>
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="contact-message">{locale === 'ar' ? 'الرسالة' : 'Message'} *</label>
              <textarea
                id="contact-message"
                name="message"
                required
                rows={4}
                className={styles.textarea}
                placeholder={locale === 'ar' ? 'اكتب رسالتك هنا...' : 'Write your message...'}
              />
            </div>
            
            <div className={styles.formActions}>
              <button
                type="submit"
                disabled={isSubmitting}
                className={styles.submitBtn}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className={styles.spinner} />
                    {locale === 'ar' ? 'جاري الإرسال...' : 'Sending...'}
                  </>
                ) : (
                  locale === 'ar' ? 'إرسال الرسالة' : 'Send Message'
                )}
              </button>
              
              {submitStatus === 'success' && (
                <span className={styles.successMsg}>
                  {locale === 'ar' ? 'تم الإرسال بنجاح! سنتواصل معك قريباً.' : 'Message sent! We\'ll get back to you soon.'}
                </span>
              )}
              
              {submitStatus === 'error' && (
                <span className={styles.errorMsg}>
                  {locale === 'ar' ? 'حدث خطأ. يرجى المحاولة مرة أخرى.' : 'Something went wrong. Please try again.'}
                </span>
              )}
            </div>
          </form>
        )}
      </div>
    </>
  );
}

export default FloatingContact;
