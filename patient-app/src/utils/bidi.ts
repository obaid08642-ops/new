/** Phone-like runs (+966 5x…) keep their own left-to-right order inside a right-to-left line (needs-review issue 671). */
export function isolateNumbers(text: string): string {
  return text.replace(/\+?\d[\d\s()-]{5,}\d/g, (run) => `\u2066${run}\u2069`);
}
