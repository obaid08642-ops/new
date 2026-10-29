import { optimizedImageSrc } from "@/lib/media/optimized-image";
import { ReviewScore } from "./review-score";
import { SectionCard } from "./consult-parts";
import styles from "./consult.module.css";

/** The short facts under a doctor card (years, gender, insurance, wait): only those the server sent are passed. */
export function DoctorFacts({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return <ul className={styles.docFacts} aria-label={label}>{items.map((item) => <li key={item} className={styles.docFact}>{item}</li>)}</ul>;
}

export type ReviewItem = { key: string; score: number; text?: string; who: string; date?: string; subs?: Array<{ label: string; value: string }> };

/** Written reviews: the score, the reviewer's first name, the date, the comment and the sub-ratings the server sent. */
export function ReviewList({ items, scoreLabel }: { items: ReviewItem[]; scoreLabel: (score: number) => string }) {
  return (
    <ul className={styles.reviewList}>
      {items.map((r) => (
        <li key={r.key} className={styles.review}>
          <div className={styles.reviewHead}>
            <span className={styles.reviewWho}>{r.who}</span>
            <ReviewScore value={r.score} label={scoreLabel(r.score)} />
          </div>
          {r.date ? <span className={styles.reviewDate}>{r.date}</span> : null}
          {r.text ? <p className={styles.body}>{r.text}</p> : null}
          {r.subs?.length ? <ul className={styles.reviewSubs}>{r.subs.map((s) => <li key={s.label} className={styles.docFact}>{s.label} · {s.value}</li>)}</ul> : null}
        </li>
      ))}
    </ul>
  );
}

/** A list of name + price rows (services, follow-up). */
export function PriceRows({ rows }: { rows: Array<{ label: string; price?: string }> }) {
  return (
    <div>
      {rows.map((row) => (
        <div key={row.label} className={styles.priceRow}>
          <span>{row.label}</span>
          {row.price ? <span className={styles.priceValue}>{row.price}</span> : null}
        </div>
      ))}
    </div>
  );
}

/** OpenStreetMap embed, the same pattern as the map explorer (the CSP allows only this origin); a point the server sent. */
export function osmEmbedSrc(lat: number, lng: number): string {
  const d = 0.008;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d}%2C${lat - d}%2C${lng + d}%2C${lat + d}&layer=mapnik&marker=${lat}%2C${lng}`;
}

export function ClinicMap({ id, title, address, mapTitle, openLabel, point }: { id: string; title: string; address?: string; mapTitle: string; openLabel: string; point?: { lat: number; lng: number } }) {
  if (!address && !point) return null;
  return (
    <SectionCard id={id} title={title}>
      {address ? <p className={styles.body}>{address}</p> : null}
      {point ? (
        <>
          <iframe title={mapTitle} className={styles.mapFrame} loading="lazy" referrerPolicy="no-referrer" src={osmEmbedSrc(point.lat, point.lng)} />
          <a className="nabd-button nabd-button--outline nabd-button--sm" href={`https://www.openstreetmap.org/?mlat=${point.lat}&mlon=${point.lng}#map=16/${point.lat}/${point.lng}`} target="_blank" rel="noopener noreferrer"><span className="nabd-button__label">{openLabel}</span></a>
        </>
      ) : null}
    </SectionCard>
  );
}

/** The clinic's photos; the whole section is left out when the server sent none. */
export function ClinicGallery({ id, title, photos, openLabel, altLabel }: { id: string; title: string; photos: string[] | undefined; openLabel: (n: number) => string; altLabel: (n: number) => string }) {
  if (!photos?.length) return null;
  return (
    <SectionCard id={id} title={title}>
      <ul className={styles.gallery}>
        {photos.map((src, index) => (
          <li key={src}><a href={optimizedImageSrc(src, 1200)} target="_blank" rel="noopener noreferrer" aria-label={openLabel(index + 1)}><img src={optimizedImageSrc(src, 192)} alt={altLabel(index + 1)} className={styles.galleryImg} loading="lazy" decoding="async" /></a></li>
        ))}
      </ul>
    </SectionCard>
  );
}

/** The About text; left out when the server sent none. */
export function BioSection({ id, title, bio }: { id: string; title: string; bio: string | undefined }) {
  if (!bio) return null;
  return <SectionCard id={id} title={title}><p className={styles.body}>{bio}</p></SectionCard>;
}

/** Education rows (already joined into one line each). With no rows: the empty text, or nothing when `emptyText` is not passed. */
export function EducationSection({ id, title, rows, emptyText }: { id: string; title: string; rows: string[]; emptyText?: string }) {
  if (rows.length === 0 && !emptyText) return null;
  return (
    <SectionCard id={id} title={title}>
      {rows.length ? <ul className={styles.plain}>{rows.map((row, i) => <li key={`${row}-${i}`}>{row}</li>)}</ul> : <p className={`${styles.body} ${styles.muted}`}>{emptyText}</p>}
    </SectionCard>
  );
}
