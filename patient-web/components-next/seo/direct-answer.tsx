import styles from "./direct-answer.module.css";

/** CSS class the JSON-LD `speakable` points at (voice assistants read it). */
export const DIRECT_ANSWER_CLASS = "nabd-direct-answer";

/**
 * AEO: the page's answer in two or three sentences, right under the title, built only from the
 * entity's own fields (no invented content). Nothing is drawn when there is nothing to say.
 */
export function DirectAnswer({ sentences }: { sentences: Array<string | null | undefined | false> }) {
  const text = sentences.filter((s): s is string => typeof s === "string" && s.trim().length > 0).join(" ");
  if (!text) return null;
  return <p className={`${DIRECT_ANSWER_CLASS} ${styles.answer}`} dir="auto">{text}</p>;
}

/** schema.org SpeakableSpecification for the title and the direct answer. */
export const speakableSpec = { "@type": "SpeakableSpecification", cssSelector: ["h1", `.${DIRECT_ANSWER_CLASS}`] };
