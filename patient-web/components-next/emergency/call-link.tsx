import { Icon } from "@/components-next/ui-generated/src/Icon";
import rx from "@/components-next/pharmacy/rx.module.css";

/** The one number everyone can dial in an emergency (owner decision 14). The urgent-help number the admin sets is a different, separate one. */
export const EMERGENCY_NUMBER = "997";

/**
 * A real `tel:` link drawn as the design system's large primary button with the phone icon. A plain anchor, so it dials before the
 * page is interactive. `dial` is what `tel:` calls; `label` is the translated text.
 */
export function CallLink({ dial, label, variant = "primary" }: { dial: string; label: string; variant?: "primary" | "outline" }) {
  return (
    <a href={`tel:${dial}`} className={`nabd-button nabd-button--${variant} nabd-button--lg nabd-button--full ${rx.linkButton}`} data-testid={`call-${dial}`}>
      <Icon name="phone" size={22} tone={variant === "primary" ? "onBrand" : "primary"} />
      <span className="nabd-button__label">{label}</span>
    </a>
  );
}
