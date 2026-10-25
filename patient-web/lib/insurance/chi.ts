/**
 * The Council of Health Insurance's own page where a beneficiary looks up their insurance. The address comes from the
 * backend's /config (`links.chi_inquiry`, an https chi.gov.sa address), never from a screen: a missing or odd value
 * means no link is shown.
 */
export function chiInquiryUrl(config: unknown): string | null {
  const raw = (config as { links?: { chi_inquiry?: unknown } } | null)?.links?.chi_inquiry;
  if (typeof raw !== "string") return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && (url.hostname === "chi.gov.sa" || url.hostname.endsWith(".chi.gov.sa")) ? url.toString() : null;
  } catch {
    return null;
  }
}
