export type LegalBlock = { kind: "heading" | "paragraph" | "bullet"; text: string };

/**
 * The policy text the legal service answers, as blocks: blank lines split paragraphs, `•`, `-` and `*` lead bullets and `#`
 * leads a heading. The same rules as the app's legal screens (patient-app/src/components/legal/LegalKit.tsx), so a policy
 * reads the same on both.
 */
export function parseLegal(content: string): LegalBlock[] {
  const blocks: LegalBlock[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ kind: "paragraph", text: paragraph.join(" ") });
    paragraph = [];
  };
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      flush();
    } else if (/^#{1,6}\s+/.test(line)) {
      flush();
      blocks.push({ kind: "heading", text: line.replace(/^#{1,6}\s+/, "") });
    } else if (/^[•\-*]\s+/.test(line)) {
      flush();
      blocks.push({ kind: "bullet", text: line.replace(/^[•\-*]\s+/, "") });
    } else {
      paragraph.push(line);
    }
  }
  flush();
  return blocks;
}
