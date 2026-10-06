import Link from "next/link";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { MODE_VISUAL, type Mode } from "@/lib/consult/appointment-view";
import { SERVICE_ICONS, type ServiceTone } from "@/components-next/ui-generated/icons/fill";
import { LocalTile } from "./local-tile";
import styles from "./consult.module.css";

export type CardAction = { href: string; label: string };

/**
 * One appointment as the board draws it (canvas/Appointments): a date tile, the title, the specialty and time line, the
 * mode and status chips and up to two actions. Everything shown is what the appointment row carries; an action is a link
 * to a screen that already exists. The time is written in the reader's own zone (LocalTile / LocalLine).
 */
export function AppointmentCard({
  locale,
  href,
  title,
  mode,
  modeLabel,
  statusLabel,
  statusTone,
  slotStart,
  specialty,
  timeLine,
  primary,
  secondary,
}: {
  locale: string;
  href: string;
  title: string;
  mode: Mode | null;
  modeLabel?: string;
  statusLabel: string;
  statusTone: ServiceTone;
  slotStart?: string;
  specialty?: string;
  /** The time, already written for the reader (client-side), shown beside the specialty. */
  timeLine?: React.ReactNode;
  primary?: CardAction;
  secondary?: CardAction;
}) {
  const visual = mode ? MODE_VISUAL[mode] : null;
  return (
    <li className={styles.appt}>
      <Link href={href} className={styles.apptLink}>
        {slotStart ? <LocalTile iso={slotStart} locale={locale} tone={SERVICE_ICONS.health.tone} /> : visual ? <FIcon icon={visual.icon} tone={visual.tone} size={52} /> : null}
        <span className={styles.apptText}>
          <span className={styles.apptTitle}>{title}</span>
          {specialty || timeLine ? <span className={styles.apptMeta}>{specialty}{specialty && timeLine ? " · " : ""}{timeLine}</span> : null}
          <span className={styles.chips}>
            {mode && modeLabel && visual ? <StatusChip label={modeLabel} tone={visual.tone} /> : null}
            <StatusChip label={statusLabel} tone={statusTone} />
          </span>
        </span>
      </Link>
      {primary || secondary ? (
        <div className={styles.apptActions}>
          {primary ? <ButtonLink href={primary.href} label={primary.label} size="md" /> : null}
          {secondary ? <ButtonLink href={secondary.href} label={secondary.label} variant="outline" size="md" /> : null}
        </div>
      ) : null}
    </li>
  );
}
