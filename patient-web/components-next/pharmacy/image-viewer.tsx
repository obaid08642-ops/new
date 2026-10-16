"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { IconButton } from "@/components-next/ui-generated/components/Button";
import {
  arrowStep,
  clamp,
  clampPan,
  distance,
  isRtl,
  isDoubleTap,
  isSwipeDown,
  midpoint,
  NO_ZOOM,
  pinchScale,
  slideIndex,
  slideOffset,
  toggleZoom,
  zoomAt,
  type Point,
  type Zoom,
} from "./gallery-math";
import styles from "./product-detail.module.css";

type Gesture =
  | { kind: "none" }
  /** one finger (or the mouse): a pan when the picture is zoomed, else a tap or the swipe down; a quick still one is a tap */
  | { kind: "one"; start: Point; client: Point; at: number; moved: boolean; touch: boolean; from: Zoom }
  | { kind: "pinch"; startDistance: number; startMid: Point; from: Zoom };

const MOVE_SLOP = 10;

/**
 * One picture of the viewer, zoomable (issue 1547): pinch, double tap (or double click) at a point, pan while zoomed,
 * the mouse wheel on a desktop, and a swipe down closes the viewer on touch. The transform is written to the element
 * (CSSOM), never as a style attribute. At scale 1 the slide lets the browser scroll the strip sideways (touch-action
 * pan-x), so the swipe between pictures is the strip's own scroll-snap.
 */
function ZoomSlide({ src, alt, active, onZoomed, onSwipeDown }: { src: string; alt: string; active: boolean; onZoomed: (zoomed: boolean) => void; onSwipeDown: () => void }) {
  const slide = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const zoom = useRef<Zoom>(NO_ZOOM);
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<Gesture>({ kind: "none" });
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);

  const box = useCallback(() => {
    const r = slide.current?.getBoundingClientRect();
    return r ? { width: r.width, height: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2 } : { width: 0, height: 0, cx: 0, cy: 0 };
  }, []);
  const local = useCallback((clientX: number, clientY: number): Point => {
    const b = box();
    return { x: clientX - b.cx, y: clientY - b.cy };
  }, [box]);

  const apply = useCallback((next: Zoom, dragY = 0) => {
    zoom.current = next;
    const el = img.current;
    if (el) {
      const still = next.scale === 1 && next.x === 0 && next.y === 0 && dragY === 0;
      el.style.transform = still ? "" : `translate3d(${next.x}px, ${next.y + dragY}px, 0) scale(${next.scale})`;
    }
    const zoomed = next.scale > 1;
    if (slide.current) slide.current.dataset.zoomed = String(zoomed);
    if (slide.current) slide.current.dataset.dragging = String(dragY !== 0);
    onZoomed(zoomed);
  }, [onZoomed]);

  // a picture that is scrolled away goes back to its full view
  useEffect(() => {
    if (!active && zoom.current.scale !== 1) apply(NO_ZOOM);
  }, [active, apply]);

  // the wheel zooms on a desktop (a trackpad pinch is a wheel event with ctrlKey); React's wheel listener is passive
  useEffect(() => {
    const el = slide.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const b = box();
      const factor = Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.002));
      apply(zoomAt(zoom.current, zoom.current.scale * factor, local(event.clientX, event.clientY), b));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [apply, box, local]);

  const startPinch = () => {
    const [a, b] = [...pointers.current.values()];
    gesture.current = { kind: "pinch", startDistance: distance(a, b), startMid: midpoint(a, b), from: zoom.current };
  };

  return (
    <div
      ref={slide}
      className={styles.viewerSlide}
      data-testid="viewer-slide"
      data-zoomed="false"
      onPointerDown={(event) => {
        const p = local(event.clientX, event.clientY);
        pointers.current.set(event.pointerId, p);
        if (pointers.current.size === 2) {
          slide.current?.setPointerCapture(event.pointerId);
          startPinch();
        } else if (pointers.current.size === 1) {
          if (zoom.current.scale > 1) slide.current?.setPointerCapture(event.pointerId);
          gesture.current = { kind: "one", start: p, client: { x: event.clientX, y: event.clientY }, at: event.timeStamp, moved: false, touch: event.pointerType === "touch", from: zoom.current };
        }
      }}
      onPointerMove={(event) => {
        if (!pointers.current.has(event.pointerId)) return;
        const p = local(event.clientX, event.clientY);
        pointers.current.set(event.pointerId, p);
        const g = gesture.current;
        const b = box();
        if (g.kind === "pinch" && pointers.current.size >= 2) {
          const [a, c] = [...pointers.current.values()];
          const mid = midpoint(a, c);
          const scaled = zoomAt(g.from, pinchScale(g.from.scale, g.startDistance, distance(a, c)), g.startMid, b);
          apply(clampPan({ ...scaled, x: scaled.x + mid.x - g.startMid.x, y: scaled.y + mid.y - g.startMid.y }, b));
        } else if (g.kind === "one") {
          const dx = p.x - g.start.x;
          const dy = p.y - g.start.y;
          if (Math.hypot(dx, dy) > MOVE_SLOP) g.moved = true;
          if (g.from.scale > 1) apply(clampPan({ scale: g.from.scale, x: g.from.x + dx, y: g.from.y + dy }, b));
          // touch at scale 1: the picture follows a downward drag (the swipe that closes)
          else if (g.touch && dy > 0 && dy > Math.abs(dx)) apply(NO_ZOOM, dy);
        }
      }}
      onPointerUp={(event) => {
        const g = gesture.current;
        pointers.current.delete(event.pointerId);
        if (g.kind === "pinch") {
          const [rest] = [...pointers.current.values()];
          gesture.current = rest && zoom.current.scale > 1
            ? { kind: "one", start: rest, client: { x: event.clientX, y: event.clientY }, at: event.timeStamp, moved: true, touch: event.pointerType === "touch", from: zoom.current }
            : { kind: "none" };
          return;
        }
        gesture.current = { kind: "none" };
        if (g.kind !== "one") return;
        const p = local(event.clientX, event.clientY);
        if (g.from.scale === 1 && g.touch && isSwipeDown(p.x - g.start.x, p.y - g.start.y)) {
          apply(NO_ZOOM);
          onSwipeDown();
          return;
        }
        apply(zoom.current);
        if (g.moved || event.timeStamp - g.at > 300) return;
        const tap = { t: event.timeStamp, x: g.client.x, y: g.client.y };
        if (isDoubleTap(lastTap.current, tap)) {
          lastTap.current = null;
          apply(toggleZoom(zoom.current, p, box()));
        } else {
          lastTap.current = tap;
        }
      }}
      onPointerCancel={(event) => {
        pointers.current.delete(event.pointerId);
        gesture.current = { kind: "none" };
        apply(zoom.current);
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- the full picture, at its own size, fetched only when the viewer shows it */}
      <img ref={img} src={src} alt={alt} className={styles.viewerImage} loading="lazy" decoding="async" draggable={false} />
    </div>
  );
}

/**
 * The full-screen picture viewer of the product page (issue 1547): a modal <dialog> over the whole screen on the
 * inverse (ink) surface, one picture per slide in a scroll-snap strip (swipe, mirrored right to left by the strip's
 * own direction), the arrow keys and two arrow buttons on a desktop (their carets mirrored right to left by the CSS), a "2 / 4" counter, a close button, Esc and a swipe
 * down to close. `onClose` gives back the picture shown last, so the page's gallery can follow.
 */
export function ImageViewer({ name, images, open, start, onClose }: { name: string; images: string[]; open: boolean; start: number; onClose: (index: number) => void }) {
  const t = useTranslations("PharmacyBrowse");
  const dialog = useRef<HTMLDialogElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(start);
  const shown = useRef(start);
  const [locked, setLocked] = useState(false);
  const total = images.length;

  const go = useCallback((target: number, smooth = true) => {
    const el = track.current;
    if (!el) return;
    const i = clamp(target, 0, total - 1);
    el.scrollTo({ left: slideOffset(i, el.clientWidth, isRtl(el)), behavior: smooth ? "smooth" : "auto" });
    shown.current = i;
    setIndex(i);
  }, [total]);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      go(start, false);
    } else if (!open && d.open) {
      d.close();
    }
  }, [open, start, go]);

  const close = () => dialog.current?.close();

  return (
    <dialog
      ref={dialog}
      className={styles.viewer}
      data-testid="image-viewer"
      aria-label={name}
      onClose={() => {
        setLocked(false);
        onClose(shown.current);
      }}
      onKeyDown={(event) => {
        const step = arrowStep(event.key, isRtl(event.currentTarget));
        if (step !== 0 && total > 1) {
          event.preventDefault();
          go(shown.current + step);
        }
      }}
    >
      <div
        ref={track}
        className={styles.viewerTrack}
        data-testid="viewer-track"
        data-locked={locked ? "true" : "false"}
        onScroll={(event) => {
          const el = event.currentTarget;
          const i = slideIndex(el.scrollLeft, el.clientWidth, total);
          if (i !== shown.current) {
            shown.current = i;
            setIndex(i);
          }
        }}
      >
        {images.map((src, i) => (
          <ZoomSlide
            key={src}
            src={src}
            alt={`${name} (${t("imageOf", { n: i + 1, total })})`}
            // closed, every picture is inactive: it opens again at its full view
            active={open && i === index}
            onZoomed={(zoomed) => { if (i === shown.current) setLocked(zoomed); }}
            onSwipeDown={close}
          />
        ))}
      </div>
      <div className={styles.viewerTop}>
        {total > 1 ? <span className={styles.viewerCounter} aria-live="polite" data-testid="viewer-counter">{t("imageCounter", { n: index + 1, total })}</span> : <span />}
        <IconButton name="close" label={t("closeImage")} variant="outlined" onClick={close} />
      </div>
      {total > 1 ? (
        <>
          <div className={`${styles.viewerNav} ${styles.viewerPrev}`}>
            <IconButton name="caret-left" label={t("previousImage")} variant="outlined" disabled={index === 0} onClick={() => go(shown.current - 1)} />
          </div>
          <div className={`${styles.viewerNav} ${styles.viewerNext}`}>
            <IconButton name="caret-right" label={t("nextImage")} variant="outlined" disabled={index === total - 1} onClick={() => go(shown.current + 1)} />
          </div>
        </>
      ) : null}
    </dialog>
  );
}
