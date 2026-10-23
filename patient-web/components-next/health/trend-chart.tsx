import { chartPoints } from "@/lib/health/view";
import type { ServiceTone } from "@/components-next/ui-generated/icons/fill";
import styles from "./health.module.css";

/** A small line chart of one vital's readings (tokens only: the line takes the vital's service tone). The data is read out in `label`. */
export function TrendChart({ values, tone, label }: { values: number[]; tone: ServiceTone; label: string }) {
  const points = chartPoints(values);
  if (points.length === 0) return null;
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" role="img" aria-label={label} className={`${styles.trendChart} ${styles[`trend_${tone}`]}`}>
      {points.length > 1 ? <polyline points={points.map(([x, y]) => `${x},${y}`).join(" ")} fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /> : null}
      {points.map(([x, y], index) => <circle key={index} cx={x} cy={y} r={1.6} stroke="none" />)}
    </svg>
  );
}
