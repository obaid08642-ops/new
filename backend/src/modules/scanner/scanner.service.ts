import { BadGatewayException, BadRequestException, Injectable, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { AiGatewayService } from '../ai/ai-gateway.service';
import { AiService } from '../ai/ai.service';
import { MedicinesService } from '../medicines/medicines.service';
import { PrescriptionsService } from '../prescriptions/prescriptions.service';
import { SCAN_IMAGE_TYPES, ScanReadingDto } from './scanner.dto';

/** Stored with an uploaded prescription for the pharmacy staff, the same tag the app's photo intake writes. */
export const SCAN_RX_NOTE = 'AI scanner photo; OCR extraction; requires pharmacy review';
/** Below this the reading is not trusted and no match is offered. */
export const SCAN_MIN_CONFIDENCE = 0.35;
const MAX_MATCHES = 5;

export const SCAN_PROMPT = [
  'You read one photo taken by a patient in a pharmacy app. It shows a medicine pack, a barcode, a QR code, or a prescription.',
  'Answer with ONLY one JSON object, no prose, no code fence, exactly these keys:',
  '{"kind":"pack|barcode|qr|prescription","name":string|null,"strength":string|null,"form":string|null,"confidence":number}',
  'kind: "prescription" for any doctor\'s prescription (handwritten or printed); "barcode" or "qr" when the photo is mainly that code; otherwise "pack".',
  'name: the medicine brand or generic name printed on the pack or next to the code, in Latin letters when printed; null for a prescription or when not readable. Never guess a name from the barcode digits.',
  'strength: e.g. "500 mg", "5 mg/ml"; form: e.g. "tablet", "capsule", "syrup", "cream"; null when not printed.',
  'confidence: 0 to 1, how sure you are of the name.',
].join('\n');

export type ScanMatch = Record<string, unknown> & { id: string; scan_score: number };

function norm(value: unknown): string {
  return String(value ?? '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}.]+/gu, ' ').trim();
}

/** Digits of a strength ("500 mg" → "500"), compared on the number only. */
function strengthNumber(value: unknown): string {
  return (String(value ?? '').match(/\d+(?:[.,]\d+)?/) || [''])[0].replace(',', '.');
}

/**
 * Ranks catalogue rows against what the photo was read as: the name first (same name, then starts with, then contains,
 * then only the active ingredient), then the same strength number, then the same form. Ties keep the catalogue order.
 */
export function rankScanMatches(rows: any[], reading: { name?: string | null; strength?: string | null; form?: string | null }): ScanMatch[] {
  const name = norm(reading.name);
  const strength = strengthNumber(reading.strength);
  const form = norm(reading.form);
  const scored = rows
    .filter((row) => row && typeof row.id === 'string')
    .map((row, index) => {
      const names = [row.name_en, row.name_ar].map(norm).filter(Boolean);
      let score = 0;
      if (names.some((n) => n === name)) score = 60;
      else if (names.some((n) => n.startsWith(name))) score = 45;
      else if (names.some((n) => n.includes(name))) score = 35;
      else if (norm(row.active_ingredient).includes(name)) score = 20;
      else score = 10;
      const rowStrength = strengthNumber(row.strength) || strengthNumber(names.join(' ').match(/\d+(?:[.,]\d+)?\s*(mg|mcg|g|ml|iu|%)/i)?.[0]);
      if (strength && rowStrength === strength) score += 25;
      if (form && norm(row.form) && (norm(row.form).includes(form) || form.includes(norm(row.form)))) score += 15;
      return { row, index, score };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index);
  return scored.slice(0, MAX_MATCHES).map(({ row, score }) => ({ ...row, scan_score: score / 100 }));
}

/** The model's text as the strict reading, or null when it is not that JSON. */
export function parseScanReading(text: string): ScanReadingDto | null {
  let raw: unknown;
  try {
    raw = JSON.parse(String(text || '').replace(/```json/gi, '').replace(/```/g, '').trim());
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const allowed = new Set(['kind', 'name', 'strength', 'form', 'confidence']);
  const picked: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) if (allowed.has(key)) picked[key] = value === null ? undefined : value;
  const reading = plainToInstance(ScanReadingDto, picked);
  return validateSync(reading, { forbidUnknownValues: false }).length === 0 ? reading : null;
}

@Injectable()
export class ScannerService {
  constructor(
    private readonly gateway: AiGatewayService,
    private readonly ai: AiService,
    private readonly medicines: MedicinesService,
    private readonly prescriptions: PrescriptionsService,
  ) {}

  private splitImage(input: string, mimeType?: string): { base64: string; mime: string } {
    const match = /^data:(image\/(?:jpeg|png|webp));base64,/.exec(input);
    const mime = match?.[1] || mimeType || 'image/jpeg';
    if (!(SCAN_IMAGE_TYPES as readonly string[]).includes(mime)) throw new BadRequestException('image_type_unsupported');
    const base64 = (match ? input.slice(match[0].length) : input).replace(/\s+/g, '');
    if (base64.length < 100) throw new BadRequestException('image_base64_invalid');
    return { base64, mime };
  }

  async scan(user: { id?: string; role?: string }, imageInput: string, mimeType?: string) {
    const { base64, mime } = this.splitImage(imageInput, mimeType);
    let text: string;
    try {
      text = (await this.gateway.generate({ prompt: SCAN_PROMPT, feature: 'aiScanner', imageBase64: base64, mimeType: mime })).text;
    } catch (e) {
      if (e instanceof ServiceUnavailableException || e instanceof BadGatewayException) throw e;
      throw new BadGatewayException('ai_upstream_error');
    }
    const reading = parseScanReading(text);
    if (!reading) throw new UnprocessableEntityException('scan_unreadable');

    if (reading.kind === 'prescription') return this.prescription(user, base64, mime);

    const name = String(reading.name || '').trim();
    const base = { kind: reading.kind, reading: { name: name || null, strength: reading.strength || null, form: reading.form || null, confidence: reading.confidence } };
    if (name.length < 2 || reading.confidence < SCAN_MIN_CONFIDENCE) return { ...base, matches: [] };
    const rows = await this.medicines.publicScanCandidates(name, 25);
    return { ...base, matches: rankScanMatches(rows, reading) };
  }

  /**
   * A prescription is never turned into purchasable items here: it goes through the normal prescription flow, the same
   * calls the upload screen makes (prescription OCR, then the patient's upload, stored with the photo as health data in
   * the prescriptions collection), and the client opens the prescription order for the pharmacist's review.
   */
  private async prescription(user: { id?: string; role?: string }, base64: string, mime: string) {
    const image = `data:${mime};base64,${base64}`;
    const ocr: { items?: unknown[] } = await this.ai.prescriptionOcr(base64);
    const items = Array.isArray(ocr?.items) ? ocr.items : [];
    if (items.length === 0) return { kind: 'prescription' as const, status: 'unreadable' as const, prescription_id: null, route: null, matches: [] };
    const saved: { id?: string } = await this.prescriptions.uploadByPatient(user, { upload_image: image, items, notes: SCAN_RX_NOTE });
    const id = String(saved?.id || '');
    if (!id) throw new BadGatewayException('prescription_save_failed');
    return {
      kind: 'prescription' as const,
      status: 'saved' as const,
      prescription_id: id,
      route: `/pharmacy/rx-order?prescriptionId=${encodeURIComponent(id)}`,
      matches: [],
    };
  }
}
