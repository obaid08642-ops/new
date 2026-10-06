import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { PHARMACY_TONE } from "./tones";
import rx from "./rx.module.css";

export type RxMedicine = { name: string; lines: string[] };

/** One white card of medicine rows (canvas/HealthHub: a 40 px service chip, the name, and what the record says about it). */
export function RxMedicineList({ label, items }: { label: string; items: RxMedicine[] }) {
  return (
    <section className={`${rx.card} ${rx.cardFlush}`} aria-label={label}>
      <ul className={rx.list}>
        {items.map((item, index) => (
          <li className={rx.listRow} key={`${item.name}-${index}`}>
            <FIcon icon="pill" tone={PHARMACY_TONE} size={40} />
            <div className={rx.rowBody}>
              <p className={rx.rowTitle}>{item.name}</p>
              {item.lines.map((line) => <span className={rx.rowSub} key={line}>{line}</span>)}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
