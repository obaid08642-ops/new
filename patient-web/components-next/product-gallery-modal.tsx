"use client";

import React, { useState } from "react";
import { Pill, ZoomIn, X, ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./product-gallery-modal.module.css";

interface ProductGalleryModalProps {
  name: string;
  images: string[];
}

export function ProductGalleryModal({ name, images }: ProductGalleryModalProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  const currentImage = images[activeIdx] || images[0];

  return (
    <div className={styles.galleryWrapper}>
      {/* Main Image Viewport with Zoom Button */}
      <div className={styles.mainMediaWrap}>
        {currentImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentImage}
            alt={`${name} - ${activeIdx + 1}`}
            className={styles.mainImg}
            onClick={() => setIsZoomOpen(true)}
            fetchPriority="high"
          />
        ) : (
          <div className={styles.fallbackIcon}>
            <Pill size={64} color="#00876F" />
          </div>
        )}

        {currentImage && (
          <button
            type="button"
            className={styles.zoomTrigger}
            onClick={() => setIsZoomOpen(true)}
            aria-label="تكبير الصورة"
            title="انقر لتكبير وفحص علبة الدواء"
          >
            <ZoomIn size={18} />
            <span>تكبير</span>
          </button>
        )}
      </div>

      {/* Thumbnails list if multiple images exist */}
      {images.length > 1 && (
        <div className={styles.thumbStrip}>
          {images.map((img, idx) => (
            <button
              type="button"
              key={idx}
              className={`${styles.thumbBtn} ${idx === activeIdx ? styles.thumbActive : ""}`}
              onClick={() => setActiveIdx(idx)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt={`صورة مصغرة ${idx + 1}`} className={styles.thumbImg} />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox / Zoom Modal */}
      {isZoomOpen && currentImage && (
        <div className={styles.modalOverlay} onClick={() => setIsZoomOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={() => setIsZoomOpen(false)}
              aria-label="إغلاق"
            >
              <X size={22} />
            </button>

            <div className={styles.zoomImgContainer}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={currentImage} alt={name} className={styles.zoomedImg} />
            </div>

            {images.length > 1 && (
              <div className={styles.modalNav}>
                <button
                  type="button"
                  className={styles.navBtn}
                  onClick={() => setActiveIdx((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                >
                  <ChevronRight size={24} />
                </button>
                <span className={styles.navCounter}>
                  {activeIdx + 1} / {images.length}
                </span>
                <button
                  type="button"
                  className={styles.navBtn}
                  onClick={() => setActiveIdx((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                >
                  <ChevronLeft size={24} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
