import qrcode from "qrcode-generator";

export type QrPath = { size: number; path: string };

/**
 * The QR code of a text as one SVG path (one 1x1 square per dark module, a module grid of `size`). Medium error correction, the
 * smallest version that fits. Drawn on the server, so the page needs no script for it.
 */
export function qrPath(text: string): QrPath {
  const code = qrcode(0, "M");
  code.addData(text);
  code.make();
  const size = code.getModuleCount();
  let path = "";
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (code.isDark(row, col)) path += `M${col} ${row}h1v1h-1z`;
    }
  }
  return { size, path };
}

/** What the patient app puts in the same QR (patient-app/app/reports/passport.tsx), so one provider scan reads both. */
export function passportQrText(format: string, version: number, token: string): string {
  return JSON.stringify({ t: format, v: version, token });
}
