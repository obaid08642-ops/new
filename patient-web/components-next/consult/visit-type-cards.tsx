import Link from "next/link";
import styles from "./consult.module.css";
import { FIconByName } from "@/components-next/icons/ficon-by-name";

export type VisitTypeCard = { value: string; title: string; subtitle: string; href: string; icon: "hospital" | "video-camera" | "house"; tone: "blue" | "violet" | "peach" };

/**
 * The visit type as three cards (owner layout decision 13): Clinic, Video consultation, Home visit. Each is a link to the same
 * list with another `type` (so it works before the page is interactive and the choice is in the URL): a service-tone icon tile,
 * the title and a short line; the chosen card has the coral border and tint. `aria-current` marks it.
 */
export function VisitTypeCards({ label, value, cards }: { label: string; value: string; cards: VisitTypeCard[] }) {
  return (
    <nav className={styles.visitCards} aria-label={label}>
      {cards.map((card) => (
        <Link key={card.value} href={card.href} replace className={styles.visitCard} aria-current={card.value === value ? "page" : undefined}>
          <FIconByName icon={card.icon} tone={card.tone} size={44} />
          <span className={styles.visitCardTitle}>{card.title}</span>
          <span className={styles.visitCardSub}>{card.subtitle}</span>
        </Link>
      ))}
    </nav>
  );
}
