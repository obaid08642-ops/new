// 15.8 — a payment that was under way when the app was killed or the phone switched off: on launch and when the app comes
// back to the foreground, take the person to the result screen, which asks the server for the real state.
// Once per payment per app start: a person who leaves the result screen while it is still pending is not pulled back.
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { router, usePathname, type Href } from 'expo-router';
import { useAppSelector } from '../store/hooks';
import { readPaymentInFlight, resumeHref, setPaymentAccount, shouldResume } from '../utils/paymentInFlight';

export default function PaymentResume() {
  const userId = useAppSelector((s) => s.auth?.user?.id ?? null);
  const signedIn = useAppSelector((s) => !!s.auth?.isAuthenticated);
  const pathname = usePathname();
  const here = useRef(pathname);
  here.current = pathname;
  const offered = useRef(new Set<string>());

  useEffect(() => {
    setPaymentAccount(signedIn ? userId : null);
  }, [signedIn, userId]);

  useEffect(() => {
    if (!signedIn || !userId) return;
    let alive = true;
    const resume = async () => {
      const marker = await readPaymentInFlight(userId);
      if (!alive || !marker) return;
      const id = marker.transactionId ?? marker.gatewayId ?? '';
      if (offered.current.has(id) || !shouldResume(marker, here.current)) return;
      offered.current.add(id);
      router.push(resumeHref(marker) as unknown as Href);
    };
    void resume();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void resume();
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, [signedIn, userId]);

  return null;
}
