/** Arabic-Indic (٠-٩) and Eastern Arabic-Indic (۰-۹) to Latin. The one digit table (auth and checkout re-use it). */
export function normalizeDigits(input: string): string {
  return input
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}
