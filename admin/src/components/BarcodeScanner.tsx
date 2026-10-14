import React, { useEffect, useRef, useState } from 'react';

type Detected = { rawValue?: string };
type Detector = { detect: (source: CanvasImageSource) => Promise<Detected[]> };
type DetectorCtor = new (options?: { formats?: string[] }) => Detector;

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'data_matrix', 'qr_code'];

/** True when the browser can read barcodes from the camera (BarcodeDetector + getUserMedia). */
export function canScanWithCamera(): boolean {
  return typeof window !== 'undefined'
    && 'BarcodeDetector' in window
    && !!navigator.mediaDevices?.getUserMedia;
}

/**
 * Camera barcode scan with the browser's BarcodeDetector. When the browser has no detector or the camera is refused,
 * the same dialog stays usable with a typed code, so the screen never depends on the camera.
 */
export function BarcodeScanner({ onCode, onClose }: { onCode: (code: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [typed, setTyped] = useState('');
  const [note, setNote] = useState('');
  const [live, setLive] = useState(false);
  const onCodeRef = useRef(onCode);
  useEffect(() => { onCodeRef.current = onCode; }, [onCode]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer = 0;
    let stopped = false;

    async function start() {
      if (!canScanWithCamera()) {
        setNote('الماسح غير مدعوم في هذا المتصفح — اكتب رمز الباركود.');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (stopped) { stream.getTracks().forEach((t) => t.stop()); return; }
        const el = video.current;
        if (!el) return;
        el.srcObject = stream;
        await el.play().catch(() => undefined);
        setLive(true);
        const Ctor = (window as unknown as { BarcodeDetector: DetectorCtor }).BarcodeDetector;
        const detector = new Ctor({ formats: FORMATS });
        const tick = async () => {
          if (stopped) return;
          try {
            const found = await detector.detect(el);
            const code = found.find((f) => f.rawValue)?.rawValue;
            if (code) { onCodeRef.current(code); return; }
          } catch { /* a frame that cannot be read is skipped */ }
          timer = window.setTimeout(tick, 250);
        };
        void tick();
      } catch {
        setNote('تعذر فتح الكاميرا — اسمح بالوصول إليها أو اكتب رمز الباركود.');
      }
    }
    void start();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="مسح الباركود" onClick={onClose}>
      <div dir="rtl" className="w-full max-w-md space-y-3 rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900">مسح الباركود</h2>
          <button type="button" onClick={onClose} className="rounded-lg border px-3 py-1 text-sm font-bold">إغلاق</button>
        </div>
        {/* The video is only a viewfinder: no recording, nothing is stored. */}
        <video ref={video} muted playsInline className={`w-full rounded-xl bg-slate-900 ${live ? '' : 'hidden'}`} />
        {note ? <p role="status" className="text-sm text-slate-600">{note}</p> : null}
        {!note && !live ? <p role="status" className="text-sm text-slate-500">جارٍ فتح الكاميرا…</p> : null}
        <form
          className="flex gap-2"
          onSubmit={(e) => { e.preventDefault(); if (typed.trim()) onCode(typed.trim()); }}
        >
          <input value={typed} onChange={(e) => setTyped(e.target.value)} inputMode="numeric" dir="ltr" placeholder="أو اكتب الباركود" aria-label="رمز الباركود" className="min-w-0 flex-1 rounded border px-3 py-2 text-sm" />
          <button type="submit" disabled={!typed.trim()} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">بحث</button>
        </form>
      </div>
    </div>
  );
}
