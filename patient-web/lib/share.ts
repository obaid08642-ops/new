import { copyText } from "@/lib/copy-text";

/**
 * Share a page (issue 752): the browser's share sheet (`navigator.share`) where it exists, otherwise the link is copied.
 * "cancelled" is the person closing the sheet (not an error); "failed" is a share that errored and a copy the browser refused,
 * so a screen says "Shared" or "Link copied" only when one of them really happened.
 */
export type ShareOutcome = "shared" | "copied" | "cancelled" | "failed";
export type ShareData = { title: string; url: string };

export async function shareOrCopy(
  data: ShareData,
  deps: { share?: (data: ShareData) => Promise<void>; copy?: (text: string) => Promise<boolean> } = {},
): Promise<ShareOutcome> {
  const share = deps.share ?? (typeof navigator !== "undefined" && typeof navigator.share === "function" ? (d: ShareData) => navigator.share(d) : undefined);
  const copy = deps.copy ?? copyText;
  if (share) {
    try {
      await share(data);
      return "shared";
    } catch (error) {
      if (error && typeof error === "object" && (error as { name?: string }).name === "AbortError") return "cancelled";
      // the sheet failed for another reason: the link can still be copied
    }
  }
  return (await copy(data.url)) ? "copied" : "failed";
}
