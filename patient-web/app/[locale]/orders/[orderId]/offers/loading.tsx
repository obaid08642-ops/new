import styles from "./offers.module.css";

export default function LoadingPharmacyOffers() {
  return <main className={`main ${styles.page}`} aria-busy="true"><section className={styles.state}><p>Loading pharmacy offers…</p></section></main>;
}
