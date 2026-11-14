import "./site-notice.css";

/**
 * A thin notice above the header on every page: the site is under construction / a trial version. Informational only.
 * It is part of the page markup (the same for everyone, so cached HTML stays valid), shows on every visit, and the
 * owner turns it off without a deploy with the public flag `site_notice_enabled` (admin feature flags, GET /config);
 * an absent flag or an unreadable config leaves it ON.
 */
export function SiteNotice({ text }: { text: string }) {
  return <div className="site-notice" role="note" data-testid="site-notice">{text}</div>;
}
