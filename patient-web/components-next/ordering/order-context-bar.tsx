import Link from "next/link";
import { LinkSegmented } from "@/components-next/consult/link-segmented";
import styles from "@/components-next/diagnostics/diag.module.css";

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
  return (
    <div className={styles.filters} role="group" aria-label={label} data-testid="order-context-bar">
      <LinkSegmented label={placeLabel} value={place} options={placeOptions} />
      {payOptions && pay ? <LinkSegmented label={payLabel} value={pay} options={payOptions} /> : null}
      {address !== undefined ? (
        <p>
          {address ? address : <Link href={addressHref}>{copy.addAddress}</Link>}
        </p>
      ) : null}
      {insurance !== undefined ? (
        <p>
          {insurance?.hasPolicy ? (
            <>
              {copy.insuranceName}
              {insurance.cls ? ` · ${insurance.cls}` : ""}
              <br />
              <small>{copy.insuranceSub}</small>
            </>
          ) : (
            <Link href={insuranceHref}>{copy.addInsurance}</Link>
          )}
        </p>
      ) : null}
      <small>{copy.hint}</small>
    </div>
  );
}
