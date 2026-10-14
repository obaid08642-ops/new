import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";
import { doseTone, type DoseRow } from "@/lib/health/doses";
import { TakeDoseButton } from "./reminder-actions";
import styles from "./health.module.css";

type Labels = { statuses: Record<DoseRow["status"], string>; medicineUnavailable: string };

/**
 * Today's doses as the board's rows (canvas/HealthHub "أدوية اليوم"): a soft pill tile, the medicine and its dose, the time of
 * day and the dose's state. With `withAction`, a dose that is still to take carries the "taken" button (the same log endpoint
 * the reminders page used).
 */
export function DoseRows({ rows, labels, withAction = false }: { rows: DoseRow[]; labels: Labels; withAction?: boolean }) {
  const pharmacy = SERVICE_ICONS.pharmacy;
  return (
    <>
      {rows.map((row) => (
        <li key={`${row.reminder.id}-${row.timeKey}`}>
          <div className={styles.row}>
            <FIcon icon={pharmacy.icon} tone={pharmacy.tone} size={40} />
            <span className={styles.rowBody}>
              <span className={styles.rowTitle}>{row.reminder.medicineName ?? labels.medicineUnavailable}</span>
              <span className={styles.rowSub}>{row.reminder.dose ? <><bdi>{row.reminder.dose}</bdi> · </> : null}<bdi>{row.timeKey}</bdi></span>
              <StatusChip label={labels.statuses[row.status]} tone={doseTone(row.status)} />
            </span>
            {withAction && row.status === "pending" ? <TakeDoseButton id={row.reminder.id} timeKey={row.timeKey} /> : null}
          </div>
        </li>
      ))}
    </>
  );
}
