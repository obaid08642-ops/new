import type { ReactNode } from "react";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { ProgressRing } from "@/components-next/ui-generated/components/Cards";
import type { FillIconName, ServiceTone } from "@/components-next/ui-generated/icons/fill";
import health from "@/components-next/health/health.module.css";
import styles from "./care.module.css";

/**
 * The summary card of the care hubs (canvas/CareHub: a tinted card with a ring and three lines). With `ring` it draws the
 * board's progress ring (pregnancy week, today's calories); without it, the service glyph. Every text is the caller's, from the
 * message files or the server; a hub with nothing to say passes no `lines`.
 */
export function CareHero({
  tone,
  icon,
  ring,
  title,
  lines = [],
  badge,
  label,
}: {
  tone: ServiceTone;
  icon: FillIconName;
  ring?: { value: number; label: string; valueText: string; caption?: string };
  title: string;
  lines?: ReactNode[];
  badge?: string;
  label: string;
}) {
  return (
    <section className={`${styles.hero} nabd-tone--${tone}`} aria-label={label}>
      <span className={styles.heroMark}>
        {ring ? <ProgressRing value={ring.value} tone={tone} label={ring.label} valueText={ring.valueText} caption={ring.caption} /> : <FIcon icon={icon} tone={tone} size={64} chip="solid" />}
      </span>
      <div className={styles.heroBody}>
        <h2 className={styles.heroTitle}>{title}</h2>
        {lines.map((line, index) => <span key={index} className={styles.heroLine}>{line}</span>)}
        {badge ? <span className={styles.badge}>{badge}</span> : null}
      </div>
    </section>
  );
}

/** One record on a white card (a meal, a mood entry, a growth entry, a session): the glyph, a title, up to three lines and an end value. */
export function RecordRow({ icon, tone, title, sub = [], end, muted = false }: { icon: FillIconName; tone: ServiceTone; title: ReactNode; sub?: ReactNode[]; end?: ReactNode; muted?: boolean }) {
  return (
    <div className={health.row}>
      <FIcon icon={icon} tone={tone} size={40} />
      <span className={health.rowBody}>
        <span className={`${health.rowTitle} ${muted ? styles.sessionDone : ""}`}>{title}</span>
        {sub.map((line, index) => <span key={index} className={health.rowSub}>{line}</span>)}
      </span>
      {end ? <span className={styles.end}>{end}</span> : null}
    </div>
  );
}
