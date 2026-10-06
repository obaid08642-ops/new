import { Skeleton } from "@/components-next/ui-generated/components/Feedback";
import styles from "@/components-next/pharmacy-offers/offers.module.css";

/** While the offers are read: card-shaped placeholders (no spinner inside a list). */
export default function LoadingPharmacyOffers() {
  return (
    <main className="main" aria-busy="true">
      <div className={styles.page}>
        <div className={styles.skeleton}>
          <Skeleton variant="block" />
          <Skeleton variant="block" />
          <Skeleton variant="block" />
        </div>
      </div>
    </main>
  );
}
