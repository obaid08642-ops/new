"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import forms from "@/components-next/consult/consult.module.css";
import styles from "./camera-scanner.module.css";

type Detector = { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>> };
type DetectorCtor = new (options: { formats: string[] }) => Detector;

/** The browser's own barcode reader (BarcodeDetector), when the browser has one; nothing is loaded from elsewhere. */
function detectorClass(): DetectorCtor | null {
  const ctor = (globalThis as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
  return typeof ctor === "function" && typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia) ? ctor : null;
}

export const QR_FORMATS = ["qr_code"];
export const PACK_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"];

/**
 * Scan with the camera on the website (issues 499, 694): the rear camera through getUserMedia and the browser's
 * BarcodeDetector. The first code read is handed back and the camera is stopped. In a browser without BarcodeDetector the
 * button is not drawn, and the typed or pasted field next to it stays the way in.
 */
export function CameraScanner({ formats, onResult }: { formats: string[]; onResult: (value: string) => void }) {
  const t = useTranslations("CameraScan");
  const [supported, setSupported] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const video = useRef<HTMLVideoElement | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const done = useRef(false);

  useEffect(() => { setSupported(detectorClass() !== null); }, []);

  function stop() {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    setOpen(false);
  }

  useEffect(() => () => stream.current?.getTracks().forEach((track) => track.stop()), []);

  useEffect(() => {
    if (!open) return;
    const Ctor = detectorClass();
    if (!Ctor) return;
    const detector = new Ctor({ formats });
    done.current = false;
    let cancelled = false;
    (async () => {
      try {
        stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (cancelled || !video.current) return;
        video.current.srcObject = stream.current;
        await video.current.play();
        while (!cancelled && !done.current) {
          const found = await detector.detect(video.current).catch(() => []);
          const value = found.find((code) => typeof code.rawValue === "string" && code.rawValue.trim())?.rawValue?.trim();
          if (value) {
            done.current = true;
            stop();
            onResult(value);
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      } catch {
        if (!cancelled) { setError(t("cameraFailed")); stop(); }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!supported) return null;
  return (
    <div className={styles.box}>
      {open ? (
        <>
          <video ref={video} className={styles.video} playsInline muted aria-label={t("viewfinder")} />
          <p className={styles.hint} role="status">{t("pointCamera")}</p>
          <Button type="button" variant="outline" label={t("stop")} onClick={stop} />
        </>
      ) : (
        <Button type="button" variant="outline" startIcon="scan" label={t("start")} onClick={() => { setError(null); setOpen(true); }} />
      )}
      {error ? <p className={forms.error} role="alert">{error}</p> : null}
    </div>
  );
}
