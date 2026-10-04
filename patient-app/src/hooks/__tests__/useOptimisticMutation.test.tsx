/**
 * 15.3 — the rendered half: a forced 500 must roll the visible list back and
 * explain the failure; a payment must show "processing" until the server
 * confirms.
 *
 * Two deliberate choices, both about determinism:
 *
 * 1. The design-system toast host is MOCKED, not mounted. The real one animates
 *    in and auto-dismisses on a 3.5 s timer; a timer still pending when Jest
 *    tears an environment down fires inside a LATER test. Asserting the toast
 *    *payload* through a fake host is deterministic and is a stronger statement
 *    anyway: it proves the exact catalogue message and next step reach the user.
 *
 * 2. The payment describe runs FIRST. `runOptimistic` / `runCommitted` are async,
 *    so a test that triggers a write leaves a continuation in flight; when the
 *    rollback describe runs first, that continuation resolves after its test has
 *    torn down and the reconciler hands the next `render` an empty container.
 *    Putting the synchronous-state payment tests first removes the overlap.
 *
 * The state-level proof lives in `src/utils/optimistic.test.ts`.
 */
jest.mock('react-native-localize', () => ({
  getLocales: () => [{ languageCode: 'ar', languageTag: 'ar-SA', isRTL: true, regionCode: 'SA' }],
  findBestAvailableLanguage: () => undefined,
  getNumberFormatSettings: () => ({ decimalSeparator: '.', groupingSeparator: ',' }),
}));

const mockShowToast = jest.fn();
jest.mock('../../design-system', () => ({
  useToast: () => ({ show: mockShowToast, hide: jest.fn() }),
}));

import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useOptimisticMutation, useCommittedMutation } from '../useOptimisticMutation';
import { ApiError } from '../../services/http/errors';

// React 19 refuses to drive updates through act() unless this flag is set.
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

/** A forced 500, exactly as the single client would produce it. */
const forced500 = () =>
  new ApiError({
    code: 'SERVER_ERROR',
    reason: 'api_error',
    catalogCode: 'SERVICE_UNAVAILABLE',
    status: 500,
    locale: 'en',
  });

const refusedPayment = () =>
  new ApiError({
    code: 'VALIDATION_ERROR',
    reason: 'api_error',
    catalogCode: 'PAYMENT_REQUIRED',
    status: 402,
    locale: 'en',
  });

const onSuccess = jest.fn();

interface Deferred {
  promise: Promise<void>;
  release: () => void;
}
const deferred = (): Deferred => {
  let release: () => void = () => undefined;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
};

type Row = { id: string; read: boolean };

function NotificationsHarness({ fail }: { fail: boolean }) {
  const [rows, setRows] = useState<Row[]>([
    { id: 'n1', read: false },
    { id: 'n2', read: false },
  ]);
  const mutation = useOptimisticMutation<Row[]>({
    kind: 'mark-read',
    read: () => rows,
    write: setRows,
    apply: (current) => current.map((row) => ({ ...row, read: true })),
    locale: 'en',
  });

  return (
    <View>
      {rows.map((row) => (
        <Text key={row.id} testID={`row-${row.id}`}>
          {row.id}:{row.read ? 'read' : 'unread'}
        </Text>
      ))}
      <TouchableOpacity
        testID="mark-all"
        disabled={mutation.pending}
        onPress={() => {
          void mutation.run(() => (fail ? Promise.reject(forced500()) : Promise.resolve(undefined)));
        }}
      >
        <Text>mark all</Text>
      </TouchableOpacity>
    </View>
  );
}

function PaymentHarness({ fail, gate }: { fail: boolean; gate: Deferred }) {
  const [paid, setPaid] = useState(false);
  const mutation = useCommittedMutation<void>({ kind: 'payment', payment: true, locale: 'en', onSuccess });

  return (
    <View>
      <Text testID="status">{paid ? 'paid' : 'unpaid'}</Text>
      <Text testID="processing">{mutation.processing ? 'processing' : 'idle'}</Text>
      <TouchableOpacity
        testID="pay"
        onPress={() => {
          void mutation.run(async () => {
            // Held open by the test, so the in-flight window is deterministic
            // rather than a race against a short timer.
            await gate.promise;
            if (fail) throw refusedPayment();
            // Only the server response may flip this. Nothing local did.
            setPaid(true);
          });
        }}
      >
        <Text>pay</Text>
      </TouchableOpacity>
    </View>
  );
}

beforeEach(() => {
  mockShowToast.mockClear();
  onSuccess.mockClear();
});

describe('15.3 · payment shows "processing" until the server confirms', () => {
  it('is processing while in flight and never shows paid before the server answers', async () => {
    const gate = deferred();
    const view = await render(<PaymentHarness fail={false} gate={gate} />);

    expect(view.getByTestId('status')).toHaveTextContent('unpaid');
    expect(view.getByTestId('processing')).toHaveTextContent('idle');

    fireEvent.press(view.getByTestId('pay'));

    await waitFor(() => expect(view.getByTestId('processing')).toHaveTextContent('processing'));
    // Still unpaid while the request is in flight: "processing", never "paid".
    expect(view.getByTestId('status')).toHaveTextContent('unpaid');

    gate.release();
    await waitFor(() => expect(view.getByTestId('status')).toHaveTextContent('paid'));
    expect(view.getByTestId('processing')).toHaveTextContent('idle');
  });

  it('reports success to the caller only after the server confirmed', async () => {
    const gate = deferred();
    const view = await render(<PaymentHarness fail={false} gate={gate} />);

    fireEvent.press(view.getByTestId('pay'));
    await waitFor(() => expect(view.getByTestId('processing')).toHaveTextContent('processing'));
    // Still in flight: nothing has been reported as successful.
    expect(onSuccess).not.toHaveBeenCalled();

    gate.release();
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });

  it('a refused payment never becomes paid and ends with an explanation', async () => {
    const gate = deferred();
    const view = await render(<PaymentHarness fail gate={gate} />);

    fireEvent.press(view.getByTestId('pay'));

    await waitFor(() => expect(view.getByTestId('processing')).toHaveTextContent('processing'));
    gate.release();
    await waitFor(() => expect(view.getByTestId('processing')).toHaveTextContent('idle'));

    expect(view.getByTestId('status')).toHaveTextContent('unpaid');
    expect(onSuccess).not.toHaveBeenCalled();
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledTimes(1));
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        message: 'Payment is required to complete this. Complete the payment to continue.',
      }),
    );
  });
});

describe('15.3 · the UI rolls back and explains on a forced 500', () => {
  it('the rows come back as unread and a toast carries the explanation', async () => {
    const view = await render(<NotificationsHarness fail />);

    expect(view.getByTestId('row-n1')).toHaveTextContent('n1:unread');

    fireEvent.press(view.getByTestId('mark-all'));

    // Rolled back: the visible state is exactly what it was.
    await waitFor(() => expect(view.getByTestId('row-n1')).toHaveTextContent('n1:unread'));
    expect(view.getByTestId('row-n2')).toHaveTextContent('n2:unread');

    // Explained: the catalogue message and the next step are what the user sees.
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledTimes(1));
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        title: 'The change was rolled back',
        message: 'This service is temporarily unavailable. Please try again in a little while.',
      }),
    );
  });

  it('the optimistic change stays when the server accepts', async () => {
    const view = await render(<NotificationsHarness fail={false} />);

    fireEvent.press(view.getByTestId('mark-all'));

    await waitFor(() => expect(view.getByTestId('row-n1')).toHaveTextContent('n1:read'));
    expect(view.getByTestId('row-n2')).toHaveTextContent('n2:read');
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('a double tap does not apply the optimistic change twice', async () => {
    const view = await render(<NotificationsHarness fail={false} />);
    const button = view.getByTestId('mark-all');

    fireEvent.press(button);
    fireEvent.press(button);

    await waitFor(() => expect(view.getByTestId('row-n1')).toHaveTextContent('n1:read'));
    expect(mockShowToast).not.toHaveBeenCalled();
  });
});
