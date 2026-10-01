import * as React from 'react';
import clsx from 'clsx';

import type {
  ChartCardProps,
  Column,
  DataTableProps,
  EmptyStateProps,
  ErrorStateProps,
  ModalProps,
  SkeletonProps,
  ToastProps,
} from './contract';
import { Icon } from '../src/Icon';
import { Illustration } from '../src/Icon';
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

const SKELETON_W: Record<NonNullable<SkeletonProps['width']>, string> = {
  auto: 'auto',
  full: '100%',
  half: '50%',
};

export function Skeleton({ variant = 'text', lines = 1, width = 'full', testID }: SkeletonProps) {
  const w = SKELETON_W[width];

  if (variant === 'circle') {
    return (
      <span
        data-testid={testID}
        aria-hidden
        style={{ display: 'inline-block', width: 44, height: 44, borderRadius: 'var(--nabd-radius-pill)', background: 'var(--nabd-color-bg-sunken)' }}
      />
    );
  }
  if (variant === 'tile') {
    return (
      <span
        data-testid={testID}
        aria-hidden
        style={{ display: 'inline-block', width: 128, height: 128, borderRadius: 'var(--nabd-radius-2xl)', background: 'var(--nabd-color-bg-sunken)' }}
      />
    );
  }
  if (variant === 'block' || variant === 'title') {
    const height = variant === 'title' ? 'var(--nabd-font-size-h3)' : 64;
    return (
      <span
        data-testid={testID}
        aria-hidden
        style={{ display: 'block', width: w, height, borderRadius: 'var(--nabd-radius-md)', background: 'var(--nabd-color-bg-sunken)' }}
      />
    );
  }

  return (
    <span data-testid={testID} aria-hidden style={{ display: 'grid', gap: 'var(--nabd-space-2xs)', width: w }}>
      {Array.from({ length: lines }).map((_, i) => (
        <span
          key={i}
          style={{
            display: 'block',
            height: 12,
            // A trailing line is shorter, which is what makes a stack of them
            // read as text rather than as a barcode.
            width: i === lines - 1 && lines > 1 ? '60%' : '100%',
            borderRadius: 'var(--nabd-radius-pill)',
            background: 'var(--nabd-color-bg-sunken)',
          }}
        />
      ))}
    </span>
  );
}

export function EmptyState({ illustration, title, body, actionLabel, secondaryActionLabel, testID }: EmptyStateProps) {
  return (
    <div
      data-testid={testID}
      data-kind="empty"
      style={{
        display: 'grid',
        justifyItems: 'center',
        gap: 'var(--nabd-space-sm)',
        padding: 'var(--nabd-space-xl)',
        textAlign: 'center',
      }}
    >
      <Illustration name={illustration as never} size={128} />
      <div style={{ display: 'grid', gap: 'var(--nabd-space-3xs)' }}>
        <h3 style={{ margin: 0, fontSize: 'var(--nabd-font-size-h4)', color: 'var(--nabd-color-text-primary)' }}>{title}</h3>
        {body ? (
          <p style={{ margin: 0, maxInlineSize: '32ch', fontSize: 'var(--nabd-font-size-body)', color: 'var(--nabd-color-text-secondary)' }}>
            {body}
          </p>
        ) : null}
      </div>
      {actionLabel || secondaryActionLabel ? (
        <div style={{ display: 'flex', gap: 'var(--nabd-space-2xs)', flexWrap: 'wrap', justifyContent: 'center' }}>
          {secondaryActionLabel ? <Button label={secondaryActionLabel} variant="ghost" size="sm" /> : null}
          {actionLabel ? <Button label={actionLabel} size="sm" /> : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * `detail` is the technical cause, shown small and quiet. It is here so a support
 * agent can read the error out of a screenshot, and it is deliberately NOT the
 * title — a user cannot act on "TypeError: fetch failed", they can act on
 * "We could not reach Nabd+".
 */
export function ErrorState({
  illustration = 'errorServer',
  title,
  body,
  detail,
  actionLabel,
  retryLabel,
  loading = false,
  testID,
}: ErrorStateProps) {
  return (
    <div
      data-testid={testID}
      data-kind="error"
      role="alert"
      style={{
        display: 'grid',
        justifyItems: 'center',
        gap: 'var(--nabd-space-sm)',
        padding: 'var(--nabd-space-xl)',
        textAlign: 'center',
        background: 'var(--nabd-color-status-danger-bg)',
        borderRadius: 'var(--nabd-radius-lg)',
      }}
    >
      <Illustration name={illustration as never} size={128} />
      <div style={{ display: 'grid', gap: 'var(--nabd-space-3xs)' }}>
        <h3 style={{ margin: 0, fontSize: 'var(--nabd-font-size-h4)', color: 'var(--nabd-color-text-primary)' }}>{title}</h3>
        {body ? (
          <p style={{ margin: 0, maxInlineSize: '36ch', fontSize: 'var(--nabd-font-size-body)', color: 'var(--nabd-color-text-secondary)' }}>
            {body}
          </p>
        ) : null}
        {detail ? (
          <code style={{ fontSize: 'var(--nabd-font-size-micro)', color: 'var(--nabd-color-text-tertiary)' }}>{detail}</code>
        ) : null}
      </div>
      {retryLabel || actionLabel ? (
        <div style={{ display: 'flex', gap: 'var(--nabd-space-2xs)', flexWrap: 'wrap', justifyContent: 'center' }}>
          {retryLabel ? (
            <Button label={retryLabel} variant="secondary" size="sm" loading={loading} startIcon="download" />
          ) : null}
          {actionLabel ? <Button label={actionLabel} size="sm" /> : null}
        </div>
      ) : null}
    </div>
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
  const accent = {
    neutral: 'var(--nabd-color-text-secondary)',
    primary: 'var(--nabd-color-action-primary-bg)',
    success: 'var(--nabd-color-status-success-fg)',
    warning: 'var(--nabd-color-status-warning-fg)',
    danger: 'var(--nabd-color-status-danger-fg)',
    info: 'var(--nabd-color-status-info-fg)',
  }[tone];

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid={testID}
      data-duration={durationMs}
      style={{
        position: 'fixed',
        insetInline: 'var(--nabd-space-md)',
        bottom: 'calc(var(--nabd-space-4xl) + env(safe-area-inset-bottom))',
        zIndex: 'var(--nabd-z-toast)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--nabd-space-2xs)',
        padding: 'var(--nabd-space-sm)',
        borderRadius: 'var(--nabd-radius-md)',
        background: 'var(--nabd-color-bg-inverse)',
        color: 'var(--nabd-color-text-onInverse)',
        boxShadow: 'var(--nabd-shadow-raised)',
        borderInlineStart: `4px solid ${accent}`,
      }}
    >
      <span style={{ flex: 1, fontSize: 'var(--nabd-font-size-body)' }}>{message}</span>
      {actionLabel ? (
        <button type="button" style={{ background: 'transparent', border: 0, color: 'inherit', fontWeight: 700, cursor: 'pointer' }}>
          {actionLabel}
        </button>
      ) : null}
      {dismissible ? (
        <button
          type="button"
          aria-label={dismissLabel}
          style={{ background: 'transparent', border: 0, color: 'inherit', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
        >
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
    <div
      data-testid={testID}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--nabd-z-modal)',
        display: 'grid',
        placeItems: isSheet ? 'end center' : 'center',
        background: 'color-mix(in srgb, var(--nabd-color-bg-inverse) 55%, transparent)',
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={{
          width: isSheet ? '100%' : 'min(480px, calc(100vw - var(--nabd-space-xl)))',
          maxBlockSize: isSheet ? '85vh' : undefined,
          overflow: 'auto',
          padding: 'var(--nabd-space-lg)',
          borderRadius: isSheet ? 'var(--nabd-radius-3xl) var(--nabd-radius-3xl) 0 0' : 'var(--nabd-radius-2xl)',
          background: 'var(--nabd-color-bg-elevated)',
          boxShadow: 'var(--nabd-shadow-raised)',
          display: 'grid',
          gap: 'var(--nabd-space-sm)',
        }}
      >
        <h2 id={titleId} style={{ margin: 0, fontSize: 'var(--nabd-font-size-h3)', color: 'var(--nabd-color-text-primary)' }}>
          {title}
        </h2>
        {body ? (
          <p style={{ margin: 0, fontSize: 'var(--nabd-font-size-body)', color: 'var(--nabd-color-text-secondary)' }}>
            {body}
          </p>
        ) : null}
        <div style={{ display: 'flex', gap: 'var(--nabd-space-2xs)', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          {cancelLabel ? <Button label={cancelLabel} variant="ghost" size="sm" /> : null}
          <Button label={confirmLabel} size="sm" variant={destructive ? 'danger' : 'primary'} loading={loading} />
        </div>
        <button
          type="button"
          aria-label={closeLabel}
          style={{
            position: 'absolute',
            top: 'var(--nabd-space-2xs)',
            insetInlineEnd: 'var(--nabd-space-2xs)',
            minWidth: 44,
            minHeight: 44,
            display: 'grid',
            placeItems: 'center',
            background: 'transparent',
            border: 0,
            cursor: 'pointer',
          }}
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
      <p data-testid={testID} style={{ padding: 'var(--nabd-space-lg)', color: 'var(--nabd-color-text-secondary)' }}>
        {emptyMessage}
      </p>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }} data-testid={testID}>
      <table style={{ inlineSize: '100%', borderCollapse: 'collapse' }}>
        {/* A caption is not decoration: it is what a screen reader announces
            when the user lands on the table, and "table" alone is not enough. */}
        <caption style={{ textAlign: 'start', padding: 'var(--nabd-space-2xs)', color: 'var(--nabd-color-text-secondary)' }}>
          {caption}
        </caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                aria-sort={c.sortable ? 'none' : undefined}
                style={{
                  textAlign: c.numeric ? 'end' : 'start',
                  padding: 'var(--nabd-space-2xs)',
                  fontSize: 'var(--nabd-font-size-label)',
                  color: 'var(--nabd-color-text-tertiary)',
                  borderBottom: '1px solid var(--nabd-color-border-default)',
                  whiteSpace: 'nowrap',
                }}
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
                  style={{
                    textAlign: c.numeric ? 'end' : 'start',
                    padding: 'var(--nabd-space-2xs)',
                    fontVariantNumeric: c.numeric ? 'tabular-nums' : undefined,
                    borderBottom: '1px solid var(--nabd-color-border-default)',
                  }}
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
    <section
      data-testid={testID}
      style={{ display: 'grid', gap: 'var(--nabd-space-2xs)', padding: 'var(--nabd-space-md)', background: 'var(--nabd-color-bg-surface)', borderRadius: 'var(--nabd-radius-lg)' }}
    >
      <div>
        <h3 style={{ margin: 0, fontSize: 'var(--nabd-font-size-bodyStrong)', color: 'var(--nabd-color-text-primary)' }}>{title}</h3>
        {subtitle ? (
          <p style={{ margin: 0, fontSize: 'var(--nabd-font-size-caption)', color: 'var(--nabd-color-text-secondary)' }}>{subtitle}</p>
        ) : null}
      </div>
      <div role="img" aria-label={summary}>
        {children}
      </div>
      {legend?.length ? (
        <ul style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--nabd-space-sm)', listStyle: 'none', margin: 0, padding: 0 }}>
          {legend.map((l) => (
            <li key={l.label} style={{ display: 'flex', gap: 'var(--nabd-space-3xs)', fontSize: 'var(--nabd-font-size-caption)' }}>
              <span>{l.label}</span>
              <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{l.value}</strong>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
