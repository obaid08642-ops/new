import styles from "./health.module.css";

const RADIUS = 38;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** The score ring of the app's hub card: the value out of 100 in the middle, the arc filled to it (tone from the status, tokens only). */
export function ScoreRing({ value, label, valueText, caption, tone }: { value: number; label: string; valueText: string; caption: string; tone: "success" | "info" | "warning" | "danger" }) {
  const filled = (Math.min(100, Math.max(0, value)) / 100) * CIRCUMFERENCE;
  return (
    <div className={styles.ring} role="img" aria-label={`${label} ${valueText}${caption}`}>
      <svg viewBox="0 0 88 88" width={88} height={88} aria-hidden="true" className={styles.ringSvg}>
        <circle cx={44} cy={44} r={RADIUS} fill="none" strokeWidth={8} className={styles.ringTrack} />
        <circle cx={44} cy={44} r={RADIUS} fill="none" strokeWidth={8} strokeLinecap="round" strokeDasharray={`${filled} ${CIRCUMFERENCE}`} transform="rotate(-90 44 44)" className={`${styles.ringArc} ${styles[`ring_${tone}`]}`} />
      </svg>
      <span className={styles.ringText} aria-hidden="true"><bdi className={styles.ringValue}>{valueText}</bdi><span className={styles.ringCaption}>{caption}</span></span>
    </div>
  );
}
