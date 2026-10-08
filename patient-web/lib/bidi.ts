/**
 * A value from the server (a program's duration, a title) put inside a translated sentence: wrapped in Unicode isolates so its
 * own direction never reorders the words of the sentence around it (an English duration inside an Arabic line, and the reverse).
 */
export function isolate(value: string): string {
  return `⁨${value}⁩`;
}
