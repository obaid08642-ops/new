'use client';

import { Calendar, Clock } from 'lucide-react';
import styles from './updated-on.module.css';

interface UpdatedOnProps {
  publishedAt: string;
  updatedAt?: string;
  locale?: string;
  showTime?: boolean;
}

export function UpdatedOn({
  publishedAt,
  updatedAt,
  locale = 'ar',
  showTime = false,
}: UpdatedOnProps) {
  const isRTL = locale === 'ar' || locale === 'ur' || locale === 'fa';
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...(showTime && { hour: '2-digit', minute: '2-digit' }),
    }).format(date);
  };

  const formatRelative = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return locale === 'ar' ? 'اليوم' : 'Today';
    } else if (diffDays === 1) {
      return locale === 'ar' ? 'أمس' : 'Yesterday';
    } else if (diffDays < 7) {
      return locale === 'ar' ? `منذ ${diffDays} أيام` : `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return locale === 'ar' ? `منذ ${weeks} ${weeks === 1 ? 'أسبوع' : 'أسابيع'}` : `${weeks} week${weeks === 1 ? '' : 's'} ago`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return locale === 'ar' ? `منذ ${months} ${months === 1 ? 'شهر' : 'أشهر'}` : `${months} month${months === 1 ? '' : 's'} ago`;
    }
    return formatDate(dateStr);
  };

  const hasUpdate = updatedAt && new Date(updatedAt) > new Date(publishedAt);

  return (
    <div className={styles.container} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className={styles.row}>
        <span className={styles.label}>
          <Calendar aria-hidden="true" size={16} />
          {locale === 'ar' ? 'نشر في' : 'Published'}
        </span>
        <time dateTime={publishedAt} className={styles.date}>
          {formatDate(publishedAt)}
        </time>
        <span className={styles.relative}>({formatRelative(publishedAt)})</span>
      </div>
      
      {hasUpdate && (
        <div className={styles.row}>
          <span className={styles.label} style={{ color: 'var(--color-brand)' }}>
            <Clock aria-hidden="true" size={16} />
            {locale === 'ar' ? 'تحديث في' : 'Updated'}
          </span>
          <time dateTime={updatedAt} className={styles.date} style={{ color: 'var(--color-brand)' }}>
            {formatDate(updatedAt!)}
          </time>
          <span className={styles.relative}>({formatRelative(updatedAt!)})</span>
        </div>
      )}
    </div>
  );
}

export default UpdatedOn;
