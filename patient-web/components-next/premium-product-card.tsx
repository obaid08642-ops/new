"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

type Props = {
  id: string;
  slug: string;
  name: string;
  price: number;
  oldPrice?: number | null;
  image?: string | null;
  images?: string[];
  locale: string;
};

export function PremiumProductCard({ slug, name, price, oldPrice, image, images, locale }: Props) {
  const allImages = images && images.length > 0 ? images : image ? [image] : [];
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (allImages.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % allImages.length), 1800);
    return () => clearInterval(t);
  }, [allImages.length]);

  const href = `/${locale}/p/${encodeURIComponent(slug)}`;

  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div
        style={{
          background: 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid #E8EDEE',
          borderRadius: 20,
          overflow: 'hidden',
          transition: 'transform 0.3s cubic-bezier(.22,1,.36,1), box-shadow 0.3s',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 16px 40px rgba(30,51,46,.12)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = 'none';
          (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
        }}
      >
        {/* Image carousel */}
        <div style={{ aspectRatio: '1', position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #FDFDFC 0%, #F0FDF9 100%)' }}>
          {allImages.length > 0 ? (
            <>
              <Image
                src={allImages[idx]}
                alt={name}
                fill
                style={{ objectFit: 'contain', padding: 16, transition: 'opacity 0.5s ease' }}
                sizes="(max-width: 640px) 50vw, 200px"
              />
              {allImages.length > 1 && (
                <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 4 }}>
                  {allImages.slice(0, 3).map((_, i) => (
                    <span
                      key={i}
                      style={{
                        width: i === idx ? 12 : 4,
                        height: 4,
                        borderRadius: 999,
                        background: i === idx ? '#1E332E' : 'rgba(30,51,46,.2)',
                        transition: 'all 0.3s',
                      }}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#94A3B8', fontSize: 11 }}>صورة المنتج</div>
          )}
          <span style={{ position: 'absolute', top: 8, right: 8, fontSize: 10, background: '#ECFDF5', color: '#065F46', padding: '4px 8px', borderRadius: 999, border: '1px solid #A7F3D0', fontWeight: 700 }}>متوفر</span>
        </div>

        {/* Body */}
        <div style={{ padding: 12 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#1E332E',
              lineHeight: 1.4,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              minHeight: 36,
            }}
          >
            {name}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#1E332E' }}>SAR {price.toFixed(2)}</span>
            {oldPrice && oldPrice > price && <s style={{ fontSize: 11, color: '#94A3B8' }}>SAR {oldPrice.toFixed(2)}</s>}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <span style={{ fontSize: 11, color: '#6B7C6E' }}>التوصيل مجاني</span>
            <span style={{ width: 32, height: 32, borderRadius: 999, background: '#1E332E', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 14 }}>＋</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
