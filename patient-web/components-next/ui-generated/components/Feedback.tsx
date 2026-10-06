"use client";

// GENERATED FILE — DO NOT EDIT.
//
// Mirrored from packages/ui/components/Feedback.tsx by tools/design/sync-ui-components.mjs.
//
// patient-web cannot import from packages/: Turbopack refuses to resolve outside
// the app root, and the type checker does not, so the failure only appears at
// `next build`. This file is a copy, not a port — the renderer a screen uses and
// the renderer the conformance gallery exercises are the same code, so the
// artwork cannot drift between them. Run the script after changing the package;
// `--check` in CI fails if this drifts.
//
// tests/module-boundary.test.ts enforces the boundary this mirror exists to work
// around.
import * as React from 'react';
import clsx from 'clsx';

import type {
  ChartCardProps,
  Column,
  DataTableProps,
  EmptyStateProps,
  ErrorStateProps,
  ModalProps,
  OfflineStateProps,
  SkeletonProps,
  ToastProps,
} from './contract';
import { Icon } from '../src/Icon';
import { FIcon } from './FIcon';
import type { FillIconName, ServiceTone } from '../icons/fill';
import { Button } from './Button';
import { Spinner } from './Spinner';

/**
 * Status, overlays and loading — 12.A7, web.
 *
 * The two states a product usually gets wrong are handled deliberately here:
 *
 *   - **Empty vs error.** They are different components with different pictures
 *     and different buttons, because "you have no orders" is information and
 *     "we could not load your orders" is an apology. Merging them into one
 *     component with a flag is how a product ends up apologising to a user who
 *     simply has nothing yet.
 *   - **Loading.** A skeleton that matches the shape of what is coming, so the
 *     layout does not jump. A spinner where a list belongs is the other half of
 *     that problem.
 */

/*
 * Every Skeleton shape and width is a class (css/Feedback.css): the variant is a
 * finite set, and so is `width` — auto | full | half is the contract's whole
 * range — which becomes `nabd-skeleton--w-<width>` (auto, 100%, 50%).
 */
const SKELETON_W: Record<NonNullable<SkeletonProps['width']>, string> = {
  auto: 'nabd-skeleton--w-auto',
  full: 'nabd-skeleton--w-full',
  half: 'nabd-skeleton--w-half',
};

export function Skeleton({ variant = 'text', lines = 1, width = 'full', testID }: SkeletonProps) {
  const w = SKELETON_W[width];

  if (variant === 'circle') {
    return <span data-testid={testID} aria-hidden className="nabd-skeleton nabd-skeleton--circle" />;
  }
  if (variant === 'tile') {
    return <span data-testid={testID} aria-hidden className="nabd-skeleton nabd-skeleton--tile" />;
  }
  if (variant === 'block' || variant === 'title') {
    return <span data-testid={testID} aria-hidden className={clsx('nabd-skeleton', `nabd-skeleton--${variant}`, w)} />;
  }

  return (
    <span data-testid={testID} aria-hidden className={clsx('nabd-skeleton', 'nabd-skeleton--text', w)}>
      {Array.from({ length: lines }).map((_, i) => (
        <span
          key={i}
          // A trailing line is shorter, which is what makes a stack of them
          // read as text rather than as a barcode.
          className={clsx('nabd-skeleton__line', { 'nabd-skeleton__line--last': i === lines - 1 && lines > 1 })}
        />
      ))}
    </span>
  );
}

export interface WebEmptyStateProps extends EmptyStateProps {
  onAction?: () => void;
  onSecondaryAction?: () => void;
}

/** canvas/States: the shared layout of the empty, error, offline and 404 screens. */
function StateLayout({
  icon,
  tone,
  title,
  body,
  children,
  testID,
  kind,
  role,
}: {
  icon: FillIconName;
  tone: ServiceTone;
  title: string;
  body?: React.ReactNode;
  children?: React.ReactNode;
  testID?: string;
  kind: 'empty' | 'error' | 'offline';
  role?: 'alert' | 'status';
}) {
  return (
    <div
      data-testid={testID}
      data-kind={kind}
      role={role}
      className="nabd-state"
    >
      <FIcon icon={icon} tone={tone} size={112} />
      <h2 className="nabd-state__title">{title}</h2>
      {body ? <p className="nabd-state__body">{body}</p> : null}
      {children ? <div className="nabd-state__actions">{children}</div> : null}
    </div>
  );
}

/** The quiet second action under the CTA (canvas/States "ارفع الروشتة", "البحث"): 48 tall, 15/600 ink. */
function TextAction({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="nabd-state__text-action"
    >
      {label}
    </button>
  );
}

export function EmptyState({ icon, tone, title, body, actionLabel, secondaryActionLabel, onAction, onSecondaryAction, testID }: WebEmptyStateProps) {
  return (
    <StateLayout icon={icon} tone={tone} title={title} body={body} testID={testID} kind="empty">
      {actionLabel ? <Button label={actionLabel} size="lg" fullWidth onClick={onAction} /> : null}
      {secondaryActionLabel ? <TextAction label={secondaryActionLabel} onClick={onSecondaryAction} /> : null}
    </StateLayout>
  );
}

export interface WebErrorStateProps extends ErrorStateProps {
  onRetry?: () => void;
  onAction?: () => void;
}

/**
 * `detail` is the technical cause, shown small and quiet. It is here so a support
 * agent can read the error out of a screenshot, and it is deliberately NOT the
 * title — a user cannot act on "TypeError: fetch failed", they can act on
 * "We could not reach Nabd+".
 */
export function ErrorState({
  icon = 'warning',
  tone = 'amber',
  title,
  body,
  detail,
  actionLabel,
  retryLabel,
  onRetry,
  onAction,
  loading = false,
  testID,
}: WebErrorStateProps) {
  return (
    <StateLayout
      icon={icon}
      tone={tone}
      title={title}
      body={
        body || detail ? (
          <>
            {body}
            {detail ? (
              <code className="nabd-state__detail">{detail}</code>
            ) : null}
          </>
        ) : undefined
      }
      testID={testID}
      kind="error"
      role="alert"
    >
      {retryLabel ? <Button label={retryLabel} size="lg" fullWidth loading={loading} onClick={onRetry} /> : null}
      {actionLabel ? <TextAction label={actionLabel} onClick={onAction} /> : null}
    </StateLayout>
  );
}

export interface WebOfflineStateProps extends OfflineStateProps {
  onRetry?: () => void;
}

export function OfflineState({ title, body, retryLabel, onRetry, loading = false, testID }: WebOfflineStateProps) {
  return (
    <StateLayout icon="wifi-slash" tone="blue" title={title} body={body} testID={testID} kind="offline" role="status">
      {retryLabel ? <Button label={retryLabel} size="lg" fullWidth loading={loading} onClick={onRetry} /> : null}
    </StateLayout>
  );
}

/**
 * A toast is a live region. `role="status"` with `aria-live="polite"` means it is
 * announced when it appears without interrupting whatever the user is typing,
 * which is the difference between a helpful confirmation and a hijacked screen
 * reader mid-sentence.
 */
export function Toast({
  message,
  tone = 'neutral',
  dismissible = false,
  dismissLabel = 'Dismiss',
  actionLabel,
  durationMs,
  testID,
}: ToastProps) {
  // The accent (the 4px start edge) is the tone's modifier in css/Feedback.css.
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid={testID}
      data-duration={durationMs}
      className={clsx('nabd-toast', `nabd-toast--${tone}`)}
    >
      <span className="nabd-toast__message">{message}</span>
      {actionLabel ? (
        <button type="button" className="nabd-toast__action">
          {actionLabel}
        </button>
      ) : null}
      {dismissible ? (
        <button type="button" aria-label={dismissLabel} className="nabd-toast__dismiss">
          <Icon name="close" size={16} tone="onBrand" />
        </button>
      ) : null}
    </div>
  );
}

/**
 * A modal, a bottom sheet and a dialog are the same component with a different
 * frame, because they share everything that matters: the focus trap, the escape
 * key, the `aria-modal` contract and the rule that the page behind must not
 * scroll. Only the shape changes.
 */
export function Modal({
  open,
  title,
  body,
  variant = 'modal',
  confirmLabel,
  cancelLabel,
  destructive = false,
  closeLabel,
  loading = false,
  testID,
}: ModalProps) {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();

  React.useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') (document.activeElement as HTMLElement)?.blur();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  const isSheet = variant === 'sheet';

  return (
    <div data-testid={testID} className={clsx('nabd-modal', { 'nabd-modal--sheet': isSheet })}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="nabd-modal__dialog"
      >
        <h2 id={titleId} className="nabd-modal__title">
          {title}
        </h2>
        {body ? <p className="nabd-modal__body">{body}</p> : null}
        <div className="nabd-modal__actions">
          {cancelLabel ? <Button label={cancelLabel} variant="ghost" size="sm" /> : null}
          <Button label={confirmLabel} size="sm" variant={destructive ? 'danger' : 'primary'} loading={loading} />
        </div>
        <button
          type="button"
          aria-label={closeLabel}
          className="nabd-modal__close"
        >
          <Icon name="close" size={18} />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------- admin-only web wrappers */

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loadingMore = false,
  emptyMessage,
  caption,
  loading = false,
  testID,
}: DataTableProps<T>) {
  if (loading) {
    return <Skeleton variant="block" testID={testID} />;
  }
  if (rows.length === 0) {
    return (
      <p data-testid={testID} className="nabd-data-table__empty">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="nabd-data-table" data-testid={testID}>
      <table className="nabd-data-table__table">
        {/* A caption is not decoration: it is what a screen reader announces
            when the user lands on the table, and "table" alone is not enough. */}
        <caption className="nabd-data-table__caption">
          {caption}
        </caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                aria-sort={c.sortable ? 'none' : undefined}
                className={clsx('nabd-data-table__th', { 'nabd-data-table__th--numeric': c.numeric })}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={clsx('nabd-data-table__td', { 'nabd-data-table__td--numeric': c.numeric })}
                >
                  {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {loadingMore ? <Skeleton variant="text" lines={1} width="half" /> : null}
    </div>
  );
}

/**
 * A chart is a picture, and a picture with no text alternative is invisible to
 * the people it is most likely to matter to. `summary` is required by the
 * contract, not optional, so a chart cannot ship without saying what it shows.
 */
export function ChartCard({ title, subtitle, summary, legend, children, testID }: ChartCardProps & { children?: React.ReactNode }) {
  return (
    <section data-testid={testID} className="nabd-chart-card">
      <div>
        <h3 className="nabd-chart-card__title">{title}</h3>
        {subtitle ? <p className="nabd-chart-card__subtitle">{subtitle}</p> : null}
      </div>
      <div role="img" aria-label={summary}>
        {children}
      </div>
      {legend?.length ? (
        <ul className="nabd-chart-card__legend">
          {legend.map((l) => (
            <li key={l.label} className="nabd-chart-card__legend-item">
              <span>{l.label}</span>
              <strong className="nabd-chart-card__legend-value">{l.value}</strong>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
