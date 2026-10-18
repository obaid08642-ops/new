/**
 * 22.3 pharmacist-safe promotion. An alternative or a "frequently bought together" suggestion never shows a prescription
 * or a controlled medicine: those are not sold by suggestion, the pharmacist's rules decide them.
 */
export const NOT_PROMOTABLE_FILTER = { requires_prescription: { $ne: true }, controlled: { $ne: true } } as const;
