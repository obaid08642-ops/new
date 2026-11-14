import styles from "./not-found-help.module.css";

/** The places a patient most often wants, as links (the same sections as the search page's browse row). */
const POPULAR: Array<{ label: "catPharmacy" | "catConsult" | "catLab" | "catRadiology" | "catNursing" | "catMind"; path: string }> = [
  { label: "catPharmacy", path: "/pharmacy" }, // i18n-ok: label is a Search message key
  { label: "catConsult", path: "/consultations/doctors" }, // i18n-ok: label is a Search message key
  { label: "catLab", path: "/diagnostics/labs" }, // i18n-ok: label is a Search message key
  { label: "catRadiology", path: "/diagnostics/radiology" }, // i18n-ok: label is a Search message key
  { label: "catNursing", path: "/home-care" }, // i18n-ok: label is a Search message key
  { label: "catMind", path: "/mental-health" }, // i18n-ok: label is a Search message key
];

/**
 * 17.1: what a patient can do from a page that does not exist: search the site (the search page reads `q`) or open one of
 * the popular sections. Plain links and a GET form, so it works before the page is interactive and without script.
 */
export type NotFoundHelpLabels = {
  searchLabel: string;
  searchButton: string;
  popularTitle: string;
  searchPlaceholder: string;
  category: Record<(typeof POPULAR)[number]["label"], string>;
};

export function NotFoundHelp({ locale, labels }: { locale: string; labels: NotFoundHelpLabels }) {
  return (
    <section className={styles.help} aria-labelledby="not-found-help-title">
      <form role="search" action={`/${locale}/search`} method="get" className={styles.form}>
        <label htmlFor="not-found-q" className={styles.label}>{labels.searchLabel}</label>
        <div className={styles.row}>
          <input id="not-found-q" name="q" type="search" minLength={2} maxLength={80} placeholder={labels.searchPlaceholder} className={styles.input} />
          <button type="submit" className={styles.submit}>{labels.searchButton}</button>
        </div>
      </form>
      <h2 id="not-found-help-title" className={styles.title}>{labels.popularTitle}</h2>
      <ul className={styles.list}>
        {POPULAR.map((item) => (
          <li key={item.path}>
            <a className={styles.link} href={`/${locale}${item.path}`}>{labels.category[item.label]}</a>
          </li>
        ))}
      </ul>
    </section>
  );
}
