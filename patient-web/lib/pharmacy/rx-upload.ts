/**
 * Uploading a prescription photo (canvas/RxUpload): the pure parts of the flow, so they can be tested.
 * The two calls are the ones the mobile app makes: POST /ai/prescription-ocr (read the medicines from the photo), then
 * POST /prescriptions/upload (save the photo and the medicines for the pharmacist to verify).
 */

export const MAX_RX_FILE_BYTES = 10 * 1024 * 1024;
/** The longest side of the photo that is sent: enough to read a printed prescription, small enough to upload quickly. */
export const MAX_RX_SIDE_PX = 1600;

export type RxFileCheck = "ok" | "type" | "size";

/** An image the browser can draw: not an SVG (it can carry script) and not larger than 10 MB. */
export function checkRxFile(file: { type: string; size: number }): RxFileCheck {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return "type";
  if (file.size > MAX_RX_FILE_BYTES) return "size";
  return "ok";
}

/** The size the photo is drawn at, longest side at most `max`, never enlarged. */
export function fitWithin(width: number, height: number, max: number = MAX_RX_SIDE_PX): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= max) return { width, height };
  const scale = max / longest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => (typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("read_failed")));
    reader.onerror = () => reject(new Error("read_failed"));
    reader.readAsDataURL(file);
  });
}

/** The photo as a JPEG data URL no larger than MAX_RX_SIDE_PX; the original when the browser cannot decode it. */
export async function prepareRxImage(file: File): Promise<string> {
  try {
    const bitmap = await createImageBitmap(file);
    const size = fitWithin(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("no_canvas");
    context.drawImage(bitmap, 0, 0, size.width, size.height);
    bitmap.close?.();
    return canvas.toDataURL("image/jpeg", 0.82);
  } catch {
    return readAsDataUrl(file);
  }
}

type Row = Record<string, unknown>;
const row = (value: unknown): Row | null => (value && typeof value === "object" && !Array.isArray(value) ? (value as Row) : null);

export type RxItem = { name: string; quantity: number };

/**
 * The medicines the OCR read. The OCR answers `{ items: [{ raw_name_string, requested_quantity }] }`, while the upload
 * endpoint reads `name` and `quantity` (backend prescriptions.service.ts uploadByPatient): an OCR item sent as it came
 * has no name there and is dropped, so the fields are mapped here. A line without a name is not sent.
 */
export function ocrItems(payload: unknown): RxItem[] {
  const root = row(payload);
  const list = Array.isArray(root?.items) ? root.items : [];
  return list.slice(0, 50).flatMap((entry) => {
    const item = row(entry);
    if (!item) return [];
    const name = [item.raw_name_string, item.name, item.medicine_name, item.name_ar, item.name_en].find((value): value is string => typeof value === "string" && value.trim().length > 0);
    if (!name) return [];
    const quantity = Number(item.requested_quantity ?? item.quantity);
    return [{ name: name.trim().slice(0, 240), quantity: Number.isFinite(quantity) && quantity >= 1 ? Math.min(Math.floor(quantity), 100) : 1 }];
  });
}

export function uploadedPrescriptionId(payload: unknown): string | null {
  const root = row(payload);
  const source = row(root?.data) ?? root;
  return typeof source?.id === "string" && source.id.trim() ? source.id : null;
}

export type JsonPostResult = { status: number; body: unknown };

/**
 * POST a JSON body and report the bytes sent as they go (fetch cannot report upload progress). The progress is the
 * browser's own count of what it has sent, not an estimate.
 */
export function postJsonWithProgress(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  onProgress: (fraction: number) => void,
): Promise<JsonPostResult> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", url);
    request.withCredentials = true;
    request.setRequestHeader("content-type", "application/json");
    for (const [name, value] of Object.entries(headers)) request.setRequestHeader(name, value);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onProgress(Math.min(1, event.loaded / event.total));
    };
    request.onload = () => {
      let parsed: unknown = null;
      try { parsed = request.responseText ? JSON.parse(request.responseText) : null; } catch { parsed = null; }
      resolve({ status: request.status, body: parsed });
    };
    request.onerror = () => reject(new Error("network"));
    request.onabort = () => reject(new Error("aborted"));
    request.send(JSON.stringify(body));
  });
}
