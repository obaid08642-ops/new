import { optimizedImageSrc } from "@/lib/media/optimized-image";
import type { ReactNode } from "react";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import type { FillIconName, ServiceTone } from "@/components-next/ui-generated/icons/fill";
import { CONSULT } from "./consult-parts";
import rx from "@/components-next/pharmacy/rx.module.css";
import styles from "./consult.module.css";
import own from "./doctor-schedule.module.css";

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
  photoSrc,
  photoAlt,
  largePhoto = false,
  children,
}: {
  icon?: FillIconName;
  tone?: ServiceTone;
  line?: string;
  tags?: string[];
  stats?: ProfileStat[];
  /** A real photo (the doctor's own, 2-web#3) in place of the service icon; its alt text names the person. */
  photoSrc?: string;
  photoAlt?: string;
  /** The doctor profile: the photo fills the top of the card (4:3, cropped to the face) instead of the 88 px round one. */
  largePhoto?: boolean;
  children?: ReactNode;
}) {
  return (
    <section className={`${rx.card} ${styles.profile}`}>
      {largePhoto ? (
        <figure className={own.photo}>
          {photoSrc ? <img src={optimizedImageSrc(photoSrc, 640)} alt={photoAlt ?? ""} className={own.photoImg} width={640} height={480} decoding="async" fetchPriority="high" /> : <FIcon icon={icon} tone={tone} size={88} />}
        </figure>
      ) : photoSrc ? <img src={optimizedImageSrc(photoSrc, 88)} alt={photoAlt ?? ""} className={styles.profilePhoto} width={88} height={88} decoding="async" /> : <FIcon icon={icon} tone={tone} size={88} />}
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
