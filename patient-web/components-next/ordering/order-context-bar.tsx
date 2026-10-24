import Link from "next/link";
import ctx from "./order-context-bar.module.css";

type Option = { value: string; label: string; href: string };

/**
 * Ord01 (canvas/Ord01-ContextBar): the one context bar of the service screens. Place and payment are links (the choice stays in
 * the URL, as the hub's filters did); the saved address and insurance come from the profile, and a missing one offers the place to
 * add it. Without a session only the two choices show.
 */
export function OrderContextBar({
  label,
  placeLabel,
  place,
  placeOptions,
  payLabel,
  pay,
  payOptions,
  address,
  insurance,
  addressHref,
  insuranceHref,
  copy,
}: {
  label: string;
  place: string;
  placeOptions: Option[];
  placeLabel: string;
  pay?: string;
  payOptions?: Option[];
  payLabel: string;
  /** undefined = not read (signed out); null = read, nothing saved. */
  address?: string | null;
  insurance?: { hasPolicy: boolean; cls: string | null };
  addressHref: string;
  insuranceHref: string;
  copy: { hint: string; addAddress: string; addInsurance: string; insuranceSub: string; insuranceName: string };
}) {
  const chosen = (opts: Option[] | undefined, value: string | undefined) => opts?.find((o) => o.value === value)?.label ?? "";
  const placeValue = [chosen(placeOptions, place), address || null].filter(Boolean).join(" · ");
  const payValue = [chosen(payOptions, pay), insurance?.hasPolicy && pay === "insurance" && insurance.cls ? insurance.cls : null].filter(Boolean).join(" · ");
  return (
    <div className={ctx.bar} role="group" aria-label={label} data-testid="order-context-bar">
      <div className={ctx.chips}>
        <Chip label={placeLabel} value={placeValue}>
          <ul className={ctx.list}>
            {placeOptions.map((o) => (
              <li key={o.value}><Link href={o.href} className={ctx.opt} aria-current={o.value === place ? "page" : undefined} scroll={false}>{o.label}</Link></li>
            ))}
          </ul>
          {address !== undefined ? (
            <p className={ctx.note}>{address ? address : <Link href={addressHref} className={ctx.add}>{copy.addAddress}</Link>}</p>
          ) : null}
        </Chip>
        {payOptions && pay ? (
          <Chip label={payLabel} value={payValue}>
            <ul className={ctx.list}>
              {payOptions.map((o) => (
                <li key={o.value}><Link href={o.href} className={ctx.opt} aria-current={o.value === pay ? "page" : undefined} scroll={false}>{o.label}</Link></li>
              ))}
            </ul>
            {insurance !== undefined ? (
              <p className={ctx.note}>
                {insurance?.hasPolicy ? (
                  <>
                    {copy.insuranceName}
                    {insurance.cls ? ` · ${insurance.cls}` : ""}
                    <br />
                    <small>{copy.insuranceSub}</small>
                  </>
                ) : (
                  <Link href={insuranceHref} className={ctx.add}>{copy.addInsurance}</Link>
                )}
              </p>
            ) : null}
          </Chip>
        ) : null}
      </div>
      <small className={ctx.hint}>{copy.hint}</small>
    </div>
  );
}

/** One chip: a native <details> (no script) whose panel holds link choices, so the choice stays in the URL. */
function Chip({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <details className={ctx.chipBox} name="order-context">
      <summary className={ctx.chip}>
        <span className={ctx.chipLabel}>{label}</span>
        <span className={ctx.chipValue}>{value}</span>
      </summary>
      <div className={ctx.panel}>{children}</div>
    </details>
  );
}
