'use client';

import { useState } from 'react';
import { ChevronDown, CheckCircle } from 'lucide-react';
import styles from './expandable-faq.module.css';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category?: string;
}

interface ExpandableFAQProps {
  items: FAQItem[];
  title?: string;
  locale?: string;
  schemaType?: 'FAQPage' | 'Article';
}

export function ExpandableFAQ({
  items,
  title,
  locale = 'ar',
  schemaType = 'FAQPage',
}: ExpandableFAQProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setOpenIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isRTL = locale === 'ar' || locale === 'ur' || locale === 'fa';

  // JSON-LD structured data for FAQPage
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': schemaType === 'FAQPage' ? 'FAQPage' : 'Article',
    mainEntity: items.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <section className={styles.container} aria-labelledby={title ? 'faq-title' : undefined}>
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {title && (
        <h2 id="faq-title" className={styles.title}>
          {title}
        </h2>
      )}

      <dl className={styles.list}>
        {items.map((item) => {
          const isOpen = openIds.has(item.id);
          return (
            <div key={item.id} className={styles.item}>
              <dt>
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  className={styles.question}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${item.id}`}
                  dir={isRTL ? 'rtl' : 'ltr'}
                >
                  <span className={styles.questionText}>{item.question}</span>
                  <ChevronDown
                    className={`${styles.chevron} ${isOpen ? styles.open : ''}`}
                    aria-hidden="true"
                  />
                </button>
              </dt>
              <dd
                id={`faq-answer-${item.id}`}
                className={`${styles.answer} ${isOpen ? styles.open : ''}`}
                role="region"
                aria-label={item.question}
              >
                <div className={styles.answerContent} dangerouslySetInnerHTML={{ __html: item.answer }} />
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

export default ExpandableFAQ;
