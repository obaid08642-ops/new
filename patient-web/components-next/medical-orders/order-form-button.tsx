import styles from "./medical-orders.module.css";

/**
 * A button that posts to a route handler (no client JS needed). The handler sends the patient on to `next`.
 * `disabled` renders the button without a form, so an expired order cannot be sent.
 */
export function OrderFormButton({
  action,
  fields,
  label,
  next,
  primary = false,
  disabled = false,
}: {
  action: string;
  fields: Record<string, string>;
  label: string;
  next: string;
  primary?: boolean;
  disabled?: boolean;
}) {
  const cls = `${styles.button} ${primary ? styles.primary : ""}`;
  if (disabled) return <button type="button" className={cls} disabled>{label}</button>;
  return (
    <form method="post" action={action} className={styles.form}>
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <input type="hidden" name="next" value={next} />
      <button type="submit" className={cls}>{label}</button>
    </form>
  );
}
