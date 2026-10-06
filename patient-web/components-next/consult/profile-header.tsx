import type { ReactNode } from "react";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import type { FillIconName, ServiceTone } from "@/components-next/ui-generated/icons/fill";
import { CONSULT } from "./consult-parts";
import rx from "@/components-next/pharmacy/rx.module.css";
import styles from "./consult.module.css";

export type ProfileStat = { value: string; label: string };

/**
 * The top of a doctor or clinic page (canvas/DoctorFull): the tile, the line under the name (degree, specialty, clinic),
 * a few tags and the figures the server sent (rating, years of experience). The name itself is the page's title.
 * A figure that the server did not send is not passed, so it is not drawn.
 */
export function ProfileHeader({
  icon = CONSULT.icon,
  tone = CONSULT.tone,
  line,
  tags = [],
  stats = [],
  children,
}: {
  icon?: FillIconName;
  tone?: ServiceTone;
  line?: string;
  tags?: string[];
  stats?: ProfileStat[];
  children?: ReactNode;
}) {
  return (
    <section className={`${rx.card} ${styles.profile}`}>
      <FIcon icon={icon} tone={tone} size={88} />
      {line ? <p className={styles.heroSub}>{line}</p> : null}
      {tags.length > 0 ? <div className={styles.chips}>{tags.map((tag) => <span key={tag} className={styles.tag}>{tag}</span>)}</div> : null}
      {stats.length > 0 ? (
        <dl className={styles.stats}>
          {stats.map((stat) => (
            <div className={styles.stat} key={stat.label}>
              <dt className={styles.statLabel}>{stat.label}</dt>
              <dd className={styles.statValue}>{stat.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {children}
    </section>
  );
}
