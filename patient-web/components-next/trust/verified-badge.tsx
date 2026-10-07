'use client';

import { Shield, Check, Award, Stethoscope, Clock, Truck, ShieldCheck, Star, Users } from 'lucide-react';
import styles from './verified-badge.module.css';

interface VerifiedBadgeProps {
  type: 'provider' | 'pharmacy' | 'payment' | 'delivery' | 'rating' | 'availability';
  locale?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'badge' | 'card' | 'inline';
  data?: {
    licenseNumber?: string;
    verifiedAt?: string;
    rating?: number;
    reviewCount?: number;
    isAvailable?: boolean;
    nextAvailable?: string;
    deliveryTime?: string;
    refundDays?: number;
    securePayment?: boolean;
  };
}

const ICON_MAP = {
  provider: Shield,
  pharmacy: Stethoscope,
  payment: ShieldCheck,
  delivery: Truck,
  rating: Star,
  availability: Clock,
};

const LABELS = {
  ar: {
    provider: 'مقدم خدمة معتمد',
    pharmacy: 'صيدلية مرخصة',
    payment: 'دفع آمن',
    delivery: 'توصيل سريع',
    rating: 'تقييم حقيقي',
    availability: 'متاح الآن',
    verified: 'تم التحقق',
    license: 'رقم الترخيص',
    ratingOutOf: 'من 5',
    reviews: 'تقييم',
    availableNow: 'متاح الآن',
    nextAvailable: 'التوفر القادم',
    deliveryIn: 'توصيل خلال',
    refundPolicy: 'إرجاع خلال',
    days: 'يوم',
    securePayment: 'محمي بـ SSL/TLS',
    verifiedBy: 'معتمد من',
    scfhs: 'الهيئة السعودية للتخصصات الصحية',
  },
  en: {
    provider: 'Verified Provider',
    pharmacy: 'Licensed Pharmacy',
    payment: 'Secure Payment',
    delivery: 'Fast Delivery',
    rating: 'Verified Rating',
    availability: 'Available Now',
    verified: 'Verified',
    license: 'License #',
    ratingOutOf: 'out of 5',
    reviews: 'reviews',
    availableNow: 'Available now',
    nextAvailable: 'Next available',
    deliveryIn: 'Delivery in',
    refundPolicy: 'Refund within',
    days: 'days',
    securePayment: 'Protected by SSL/TLS',
    verifiedBy: 'Verified by',
    scfhs: 'Saudi Commission for Health Specialties',
  },
};

export function VerifiedBadge({
  type,
  locale = 'ar',
  size = 'md',
  variant = 'badge',
  data = {},
}: VerifiedBadgeProps) {
  const t = LABELS[locale as keyof typeof LABELS] || LABELS.en;
  const Icon = ICON_MAP[type];
  const isRTL = locale === 'ar' || locale === 'ur' || locale === 'fa';

  const getContent = () => {
    switch (type) {
      case 'provider':
        return (
          <>
            <span className={styles.label}>{t.provider}</span>
            {data.licenseNumber && (
              <span className={styles.detail}>
                {t.license}: {data.licenseNumber}
              </span>
            )}
            {data.verifiedAt && (
              <span className={styles.detail}>
                {t.verifiedBy} {t.scfhs}
              </span>
            )}
          </>
        );
      case 'pharmacy':
        return (
          <>
            <span className={styles.label}>{t.pharmacy}</span>
            {data.licenseNumber && (
              <span className={styles.detail}>
                {t.license}: {data.licenseNumber}
              </span>
            )}
          </>
        );
      case 'payment':
        return (
          <>
            <span className={styles.label}>{t.payment}</span>
            {data.securePayment && <span className={styles.detail}>{t.securePayment}</span>}
          </>
        );
      case 'delivery':
        return (
          <>
            <span className={styles.label}>{t.delivery}</span>
            {data.deliveryTime && (
              <span className={styles.detail}>
                {t.deliveryIn} {data.deliveryTime}
              </span>
            )}
            {data.refundDays && (
              <span className={styles.detail}>
                {t.refundPolicy} {data.refundDays} {t.days}
              </span>
            )}
          </>
        );
      case 'rating':
        return (
          <>
            <span className={styles.label}>{t.rating}</span>
            {data.rating !== undefined && (
              <span className={styles.rating}>
                {data.rating.toFixed(1)} <span className={styles.outOf}>{t.ratingOutOf}</span>
              </span>
            )}
            {data.reviewCount && (
              <span className={styles.detail}>
                {data.reviewCount} {t.reviews}
              </span>
            )}
          </>
        );
      case 'availability':
        return (
          <>
            {data.isAvailable ? (
              <span className={`${styles.label} ${styles.available}`}>{t.availableNow}</span>
            ) : (
              <span className={styles.label}>{t.availability}</span>
            )}
            {data.nextAvailable && (
              <span className={styles.detail}>
                {t.nextAvailable}: {data.nextAvailable}
              </span>
            )}
          </>
        );
      default:
        return null;
    }
  };

  if (variant === 'card') {
    return (
      <div className={`${styles.card} ${styles[size]} ${isRTL ? styles.rtl : ''}`}>
        <div className={styles.iconWrapper}>
          <Icon size={size === 'sm' ? 20 : size === 'md' ? 28 : 36} aria-hidden="true" />
        </div>
        <div className={styles.content}>
          {getContent()}
        </div>
        <Check size={size === 'sm' ? 16 : size === 'md' ? 20 : 24} className={styles.check} aria-hidden="true" />
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <span className={`${styles.inline} ${styles[size]} ${isRTL ? styles.rtl : ''}`}>
        <Icon size={size === 'sm' ? 14 : size === 'md' ? 18 : 22} aria-hidden="true" />
        {getContent()}
      </span>
    );
  }

  return (
    <div className={`${styles.badge} ${styles[size]} ${type} ${isRTL ? styles.rtl : ''}`}>
      <Icon size={size === 'sm' ? 14 : size === 'md' ? 18 : 22} aria-hidden="true" />
      <span className={styles.labelText}>{getContent()}</span>
      <Check size={size === 'sm' ? 12 : size === 'md' ? 16 : 20} className={styles.check} aria-hidden="true" />
    </div>
  );
}

export default VerifiedBadge;
