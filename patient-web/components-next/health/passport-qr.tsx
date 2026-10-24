import { qrPath } from "@/lib/health/qr";
import styles from "./passport-qr.module.css";

const QUIET_ZONE = 4;

/** The health ID as a QR code (the same text the patient app draws), drawn on the server as one SVG path. */
export function PassportQr({ text, label }: { text: string; label: string }) {
  const { size, path } = qrPath(text);
  const box = size + QUIET_ZONE * 2;
  return (
    <svg className={styles.qr} viewBox={`${-QUIET_ZONE} ${-QUIET_ZONE} ${box} ${box}`} role="img" aria-label={label} shapeRendering="crispEdges">
      <rect className={styles.ground} x={-QUIET_ZONE} y={-QUIET_ZONE} width={box} height={box} />
      <path className={styles.modules} d={path} />
    </svg>
  );
}
