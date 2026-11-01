import type { ReceiptView } from "./model";

/** Every string the receipt card and its actions show, read once from the `Receipt` namespace (server pages and tests build the same object). */
export const RECEIPT_LABEL_KEYS = [
  "region", "simplified", "creditNoteTitle", "invoiceNo", "vatNumber", "crNumber", "address", "issuedBy", "notConfigured", "bookingNo", "dateTime", "status",
  "statePaid", "statePartial", "stateRefunded", "refunded", "creditNoteRow",
  "subtotal", "vat", "total", "qr", "downloadPdf", "saveImage", "saveImageFailed", "share", "shareTitle", "brand",
  "providerHeading", "providerName", "providerType", "licence",
  "typeDoctor", "typePharmacy", "typeLab", "typeRadiology", "typeNursing", "typeClinic", "typeHospital",
  "shareLink", "linkTitle", "linkBody", "linkDays", "linkCreate", "linkCopy", "linkCopied", "linkOnce", "linkExpires", "linkViews",
  "linkStatusActive", "linkStatusExpired", "linkStatusRevoked", "linkRevoke", "linkFailed", "linkLimit", "linkRevokeFailed", "linkNone",
] as const;
export type ReceiptLabelKey = (typeof RECEIPT_LABEL_KEYS)[number];
export type ReceiptLabels = Readonly<Record<ReceiptLabelKey, string>>;

/** `translate(key, values)` is the page's `getTranslations("Receipt")` (or the translator a test passes); the VAT label carries the rate. */
export function receiptLabels(translate: (key: string, values?: Record<string, string | number>) => string, receipt: Pick<ReceiptView, "invoiceNo" | "vatRate">, formatRate: (percent: number) => string): ReceiptLabels {
  const out = {} as Record<ReceiptLabelKey, string>;
  for (const key of RECEIPT_LABEL_KEYS) {
    out[key] = key === "vat" ? translate("vat", { rate: formatRate(Math.round(receipt.vatRate * 100)) })
      : key === "shareTitle" ? translate("shareTitle", { no: receipt.invoiceNo })
      // a client fills these per row: the placeholder is kept in the text
      : key === "creditNoteRow" ? translate(key, { no: "{no}" })
      : key === "linkExpires" ? translate(key, { date: "{date}" })
      : key === "linkViews" ? translate(key, { n: "{n}" })
      : key === "region" ? translate("title")
      : translate(key);
  }
  return out;
}

const TYPE_KEY: Record<string, ReceiptLabelKey> = {
  doctor: "typeDoctor", pharmacy: "typePharmacy", lab: "typeLab", laboratory: "typeLab", radiology: "typeRadiology", nursing: "typeNursing", home_care: "typeNursing", clinic: "typeClinic", hospital: "typeHospital",
};
export const providerTypeKey = (type: string | null): ReceiptLabelKey | null => (type ? TYPE_KEY[type.toLowerCase()] ?? null : null);
