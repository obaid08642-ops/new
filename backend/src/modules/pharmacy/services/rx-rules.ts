import { BadRequestException } from '@nestjs/common';
import { Connection } from 'mongoose';

/**
 * D-10 (owner decision 10): which pharmacy lines are prescription-only or controlled is decided from the
 * CATALOGUE (`medicines.requires_prescription`, `medicines.controlled`), never from flags the client sends.
 * A line is a catalogue item when it carries that item's `medicine_id`, its `sku`, or exactly its name
 * (`name_ar` / `name_en`, trimmed, case-insensitive).
 */
export interface CatalogueFlags {
  medicine_id: string | null;
  requires_prescription: boolean;
  controlled: boolean;
}

const norm = (v: unknown) => (typeof v === 'string' ? v.trim().toLowerCase() : '');
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function lineNames(line: any): string[] {
  return [line?.name, line?.name_ar, line?.name_en, line?.raw_name].map(norm).filter(Boolean);
}

function lineSku(line: any): string {
  const v = line?.sku ?? line?.matched_sku;
  return v === undefined || v === null ? '' : String(v).trim();
}

/** Flags for each line, in order. Lines that match no catalogue item are neither Rx nor controlled. */
export async function catalogueFlags(conn: Connection, lines: any[]): Promise<CatalogueFlags[]> {
  const ids = [...new Set(lines.map((l) => (typeof l?.medicine_id === 'string' ? l.medicine_id.trim() : '')).filter(Boolean))];
  const skus = [...new Set(lines.map(lineSku).filter(Boolean))];
  const names = [...new Set(lines.flatMap(lineNames))];
  const or: any[] = [];
  if (ids.length) or.push({ id: { $in: ids } });
  if (skus.length) {
    const numeric = skus.map(Number).filter((n) => Number.isFinite(n));
    or.push({ sku: { $in: [...skus, ...numeric] } });
  }
  for (const n of names) {
    const exact = new RegExp(`^\\s*${escapeRegex(n)}\\s*$`, 'i');
    or.push({ name_ar: exact }, { name_en: exact });
  }
  const meds: any[] = or.length
    ? await conn.collection('medicines')
      .find({ $or: or }, { projection: { _id: 0, id: 1, sku: 1, name_ar: 1, name_en: 1, requires_prescription: 1, controlled: 1 } })
      .toArray()
    : [];
  return lines.map((line) => {
    const id = typeof line?.medicine_id === 'string' ? line.medicine_id.trim() : '';
    const sku = lineSku(line);
    const ln = lineNames(line);
    const med = (id && meds.find((m) => m.id === id))
      || (sku && meds.find((m) => m.sku !== undefined && m.sku !== null && String(m.sku) === sku))
      || meds.find((m) => ln.includes(norm(m.name_ar)) || ln.includes(norm(m.name_en)));
    return {
      medicine_id: med?.id ?? (id || null),
      requires_prescription: med?.requires_prescription === true,
      controlled: med?.controlled === true,
    };
  });
}

/** An attached image/pdf with a file, or a `prescription_id` of the same patient's prescription. */
async function hasPrescription(conn: Connection, patientId: string, order: any): Promise<boolean> {
  const files = Array.isArray(order?.prescription_attachments) ? order.prescription_attachments : [];
  if (files.some((f: any) => f && typeof f.uri === 'string' && f.uri.trim())) return true;
  const pid = typeof order?.prescription_id === 'string' ? order.prescription_id.trim() : '';
  if (!pid) return false;
  const rx = await conn.collection('prescriptions').findOne(
    { id: pid, $or: [{ patient_id: patientId }, { patient_account_id: patientId }] },
    { projection: { _id: 1 } },
  );
  return !!rx;
}

/**
 * Checks an order before it is broadcast and stamps each line with the catalogue flags, so later steps
 * (pharmacy quotes, loyalty) read the server's answer. Throws 400 `controlled_item_not_orderable` or
 * `prescription_required`.
 */
export async function enforceRxRules(conn: Connection, patientId: string, order: any): Promise<void> {
  const items: any[] = Array.isArray(order?.items) ? order.items : [];
  const flags = await catalogueFlags(conn, items);
  if (flags.some((f) => f.controlled)) {
    throw new BadRequestException({ code: 'controlled_item_not_orderable', message: 'controlled_item_not_orderable' });
  }
  if (flags.some((f) => f.requires_prescription) && !(await hasPrescription(conn, patientId, order))) {
    throw new BadRequestException({ code: 'prescription_required', message: 'prescription_required' });
  }
  order.items = items.map((it, i) => ({
    ...it,
    medicine_id: flags[i].medicine_id ?? it.medicine_id,
    requires_prescription: flags[i].requires_prescription,
    controlled: flags[i].controlled,
  }));
}
