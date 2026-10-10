/**
 * Copy text to the clipboard. Uses `navigator.clipboard` (secure contexts); when it is missing or refuses, falls back to a
 * temporary selected textarea and `document.execCommand("copy")`. Resolves `true` only when the browser accepted the copy,
 * `false` otherwise, so a screen shows "Copied" only when it is true.
 */
export async function copyText(text: string): Promise<boolean> {
  if (!text || typeof navigator === "undefined") return false;
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* denied or not allowed here: try the fallback */
  }
  if (typeof document === "undefined" || typeof document.execCommand !== "function") return false;
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.insetBlockStart = "0";
  area.style.opacity = "0";
  document.body.appendChild(area);
  try {
    area.select();
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(area);
  }
}
