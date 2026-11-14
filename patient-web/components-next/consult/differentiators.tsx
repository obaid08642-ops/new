import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import styles from "./consult.module.css";

/** "Late more than N minutes? You get Nabdat points": the text is written by the page from the server's setting; nothing is drawn without it. */
export function GuaranteeLine({ text }: { text?: string | null }) {
  return text ? <p className={styles.guarantee}>{text}</p> : null;
}

/** "Licensed by SCFHS, no. X" with a verified badge when the server verified the licence. No date, no expiry; nothing without a number. */
export function LicenseLine({ text, verifiedLabel }: { text?: string | null; verifiedLabel?: string }) {
  if (!text) return null;
  return (
    <p className={styles.licenseLine}>
      <span>{text}</span>
      {verifiedLabel ? <StatusChip label={verifiedLabel} tone="blue" /> : null}
    </p>
  );
}
