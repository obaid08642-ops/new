import { FIcon } from "@/components-next/ui-generated/components/FIcon";

/**
 * What a deep link into a switched-off module shows. A SERVER component (no hooks, no handlers): the locale layout renders it and
 * hands it to ModuleRouteGate, which shows it only for a blocked path. Because it never runs in the browser, the icon outlines stay
 * out of the first-load JS of every page; "Home" is a plain link.
 */
export function ModuleBlocked({ locale, title, body, homeLabel }: { locale: string; title: string; body: string; homeLabel: string }) {
  return (
    <main data-module-unavailable="">
      {/* The markup of ErrorState (Feedback.tsx) without importing it: that file is a client module, and a client module imported
          here would go into the first-load JS of every page. FIcon is not one, so it is drawn on the server. */}
      <div data-kind="error" role="alert" className="nabd-state">
        <FIcon icon="warning" tone="amber" size={112} />
        <h2 className="nabd-state__title">{title}</h2>
        <p className="nabd-state__body">{body}</p>
        <div className="nabd-state__actions">
          <a className="nabd-button nabd-button--primary nabd-button--lg nabd-button--full" href={`/${locale}`}><span className="nabd-button__label">{homeLabel}</span></a>
        </div>
      </div>
    </main>
  );
}
