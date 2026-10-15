/**
 * 10-web#2 (issue 742): an article's body as the website shows it. The body is HTML written in the admin's editor; it is
 * never put into the page as HTML. It is read into a short list of blocks (headings, paragraphs, list items) holding
 * plain text only, which React then writes escaped: scripts, styles, frames, links, images, attributes and inline markup
 * are dropped, so nothing in an article can run or change the page.
 */
export type ArticleBlock = { kind: "h2" | "h3" | "p" | "li"; text: string };

const MAX_HTML = 200_000;
const MAX_BLOCKS = 400;
// the end tag as browsers read it: attributes and spaces are allowed ("</script foo>")
const DROPPED = /<\s*(script|style|iframe|object|embed|template|noscript|svg|math)\b[\s\S]*?<\s*\/\s*\1\b[^>]*>/gi;
// a comment also ends at "--!>"
const COMMENT = /<!--[\s\S]*?--!?>/g;
const BLOCK_TAG = /<\s*(\/?)\s*(h[1-6]|p|li|br|div|ul|ol|blockquote|section|article|tr)\b[^>]*>/gi;
const NAMED: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function decode(text: string): string {
  return text.replace(/&(#x[0-9a-f]{1,6}|#\d{1,7}|[a-z]{2,6});/gi, (whole, ref: string) => {
    if (ref[0] === "#") {
      const code = ref[1] === "x" || ref[1] === "X" ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
    }
    return NAMED[ref.toLowerCase()] ?? whole;
  });
}

// inline tags (strong, em, a, span) take no space of their own, as in the browser: "<strong>x</strong>." reads "x."
// Any "<" or ">" left after the tags are removed (a broken tag such as "<scr<b>ipt") is dropped too, before decoding.
const plain = (fragment: string): string => decode(fragment.replace(/<[^>]*>?/g, "").replace(/[<>]/g, "")).replace(/\s+/g, " ").trim();

export function articleBlocks(html: unknown): ArticleBlock[] {
  if (typeof html !== "string" || !html.trim()) return [];
  const source = html.slice(0, MAX_HTML).replace(COMMENT, "").replace(DROPPED, " ");
  const blocks: ArticleBlock[] = [];
  let kind: ArticleBlock["kind"] = "p";
  let last = 0;
  const flush = (end: number) => {
    const text = plain(source.slice(last, end));
    if (text && blocks.length < MAX_BLOCKS) blocks.push({ kind, text });
  };
  for (const match of source.matchAll(BLOCK_TAG)) {
    const at = match.index ?? 0;
    flush(at);
    last = at + match[0].length;
    const closing = match[1] === "/";
    const tag = match[2].toLowerCase();
    if (closing || tag === "br") kind = kind === "li" && !closing ? "li" : "p";
    else if (tag === "h1" || tag === "h2") kind = "h2";
    else if (/^h[3-6]$/.test(tag)) kind = "h3";
    else if (tag === "li") kind = "li";
    else kind = "p";
  }
  flush(source.length);
  return blocks;
}

/** The body in the language the page shows the article in (the same rule as its title): Arabic first on Arabic pages. */
export function articleBodyHtml(payload: unknown, locale: string): string | undefined {
  const root = payload && typeof payload === "object" && !Array.isArray(payload) ? (payload as Record<string, unknown>) : null;
  const row = root && root.data && typeof root.data === "object" && !Array.isArray(root.data) ? (root.data as Record<string, unknown>) : root;
  if (!row) return undefined;
  const ar = typeof row.body_ar === "string" && row.body_ar.trim() ? row.body_ar : undefined;
  const en = typeof row.body_en === "string" && row.body_en.trim() ? row.body_en : undefined;
  return locale === "ar" ? ar ?? en : en ?? ar;
}
