'use client';

import { useState } from 'react';
import { Share2, Copy, ExternalLink, MessageSquare, Mail, Link } from 'lucide-react';
import styles from './share-buttons.module.css';

interface ShareButtonsProps {
  url?: string;
  title?: string;
  text?: string;
  locale?: string;
  variant?: 'inline' | 'floating' | 'compact';
  showLabel?: boolean;
}

const PLATFORMS = [
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: MessageSquare,
    color: '#25D366',
    url: (u: string, t: string) => `https://wa.me/?text=${encodeURIComponent(t + ' ' + u)}`,
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    icon: ExternalLink,
    color: '#000000',
    url: (u: string, t: string) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(t)}&url=${encodeURIComponent(u)}`,
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: ExternalLink,
    color: '#1877F2',
    url: (u: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}`,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: ExternalLink,
    color: '#0A66C2',
    url: (u: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(u)}`,
  },
  {
    id: 'email',
    name: 'Email',
    icon: Mail,
    color: '#EA4335',
    url: (u: string, t: string) => `mailto:?subject=${encodeURIComponent(t)}&body=${encodeURIComponent(t + '\n\n' + u)}`,
  },
  {
    id: 'copy',
    name: 'Copy Link',
    icon: Copy,
    color: '#6366F1',
    url: () => '',
  },
  {
    id: 'native',
    name: 'Share',
    icon: Share2,
    color: '#10B981',
    url: () => '',
  },
];

export function ShareButtons({
  url = typeof window !== 'undefined' ? window.location.href : '',
  title = typeof document !== 'undefined' ? document.title : '',
  text = '',
  locale = 'ar',
  variant = 'inline',
  showLabel = variant !== 'compact',
}: ShareButtonsProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const isRTL = locale === 'ar' || locale === 'ur' || locale === 'fa';

  const shareText = text || title;

  const handleShare = async (platform: typeof PLATFORMS[0]) => {
    if (platform.id === 'copy') {
      try {
        await navigator.clipboard.writeText(url);
        setCopied('copy');
        setTimeout(() => setCopied(null), 2000);
      } catch {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = url;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopied('copy');
        setTimeout(() => setCopied(null), 2000);
      }
      return;
    }

    if (platform.id === 'native' && navigator.share) {
      try {
        await navigator.share({ title, text: shareText, url });
      } catch {
        // User cancelled or error
      }
      return;
    }

    // Open in new window
    const shareUrl = platform.url(url, shareText);
    window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=400');
  };

  const platformLabels: Record<string, { ar: string; en: string }> = {
    whatsapp: { ar: 'واتساب', en: 'WhatsApp' },
    twitter: { ar: 'إكس (تويتر)', en: 'X (Twitter)' },
    facebook: { ar: 'فيسبوك', en: 'Facebook' },
    linkedin: { ar: 'لينكدإن', en: 'LinkedIn' },
    email: { ar: 'البريد الإلكتروني', en: 'Email' },
    copy: { ar: 'نسخ الرابط', en: 'Copy Link' },
    native: { ar: 'مشاركة', en: 'Share' },
  };

  const getLabel = (id: string) => platformLabels[id]?.[locale as keyof typeof platformLabels[string]] || platformLabels[id]?.en || id;

  if (variant === 'floating') {
    return (
      <div className={`${styles.floating} ${isRTL ? styles.rtl : ''}`} role="toolbar" aria-label="Share options">
        {PLATFORMS.map(platform => {
          const Icon = platform.icon;
          const isCopied = copied === platform.id;
          return (
            <button
              key={platform.id}
              type="button"
              onClick={() => handleShare(platform)}
              className={`${styles.floatingBtn} ${isCopied ? styles.copied : ''}`}
              style={{ background: platform.color }}
              aria-label={getLabel(platform.id)}
            >
              <Icon size={20} color="white" />
              {showLabel && <span className={styles.floatingLabel}>{getLabel(platform.id)}</span>}
              {isCopied && <span className={styles.checkmark}>✓</span>}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${styles[variant]} ${isRTL ? styles.rtl : ''}`} role="toolbar" aria-label="Share options">
      {PLATFORMS.map(platform => {
        const Icon = platform.icon;
        const isCopied = copied === platform.id;
        return (
          <button
            key={platform.id}
            type="button"
            onClick={() => handleShare(platform)}
            className={`${styles.btn} ${platform.id} ${isCopied ? styles.copied : ''}`}
            style={{ '--platform-color': platform.color }}
            aria-label={getLabel(platform.id)}
          >
            <Icon size={18} />
            {showLabel && <span>{getLabel(platform.id)}</span>}
            {isCopied && <span className={styles.checkmark}>✓</span>}
          </button>
        );
      })}
    </div>
  );
}

export default ShareButtons;
