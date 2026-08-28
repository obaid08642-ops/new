/**
 * Analytics — Abstraction layer supporting multiple providers.
 * Never bind directly to Firebase/PostHog/Mixpanel — always use this.
 * Privacy: no events sent unless consent is granted.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, string | number | boolean | null>;
}

export interface AnalyticsUserProperties {
  userId?: string;           // hashed — no PII
  locale?: string;
  country?: string;
  platform?: 'ios' | 'android';
  appVersion?: string;
  isGuest?: boolean;
  isDarkMode?: boolean;
}

export interface AnalyticsProvider {
  readonly name: string;
  initialize(): Promise<void>;
  track(event: AnalyticsEvent): void;
  identify(properties: AnalyticsUserProperties): void;
  screen(name: string, properties?: Record<string, unknown>): void;
  reset(): void;
  setEnabled(enabled: boolean): void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Built-in providers (stubs — swap in real SDK in Phase 3)
// ─────────────────────────────────────────────────────────────────────────────
class ConsoleAnalyticsProvider implements AnalyticsProvider {
  name = 'console';
  async initialize() { /* no-op */ }
  track(event: AnalyticsEvent) {
    if (__DEV__) console.log('[Analytics:track]', event.name, event.properties);
  }
  identify(props: AnalyticsUserProperties) {
    if (__DEV__) console.log('[Analytics:identify]', props);
  }
  screen(name: string) {
    if (__DEV__) console.log('[Analytics:screen]', name);
  }
  reset() { /* no-op */ }
  setEnabled(_: boolean) { /* no-op */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// Analytics Manager — singleton
// ─────────────────────────────────────────────────────────────────────────────
export class AnalyticsManager {
  private providers: AnalyticsProvider[] = [];
  private consentGranted = false;
  private initialized = false;

  async initialize(providers?: AnalyticsProvider[]): Promise<void> {
    this.providers = providers ?? [new ConsoleAnalyticsProvider()];
    await Promise.all(this.providers.map((p) => p.initialize()));
    this.initialized = true;
  }

  registerProvider(provider: AnalyticsProvider): void {
    this.providers.push(provider);
    if (this.initialized) provider.initialize();
  }

  setConsent(granted: boolean): void {
    this.consentGranted = granted;
    this.providers.forEach((p) => p.setEnabled(granted));
  }

  track(eventName: string, properties?: AnalyticsEvent['properties']): void {
    if (!this.consentGranted) return;
    const event: AnalyticsEvent = { name: eventName, properties };
    this.providers.forEach((p) => {
      try { p.track(event); } catch { /* never throw */ }
    });
  }

  identify(properties: AnalyticsUserProperties): void {
    if (!this.consentGranted) return;
    this.providers.forEach((p) => {
      try { p.identify(properties); } catch { /* never throw */ }
    });
  }

  screen(name: string, properties?: Record<string, unknown>): void {
    if (!this.consentGranted) return;
    this.providers.forEach((p) => {
      try { p.screen(name, properties); } catch { /* never throw */ }
    });
  }

  reset(): void {
    this.providers.forEach((p) => {
      try { p.reset(); } catch { /* never throw */ }
    });
  }
}

export const analytics = new AnalyticsManager();

// ─────────────────────────────────────────────────────────────────────────────
// Standard event names (prevents typos, enforces consistency)
// ─────────────────────────────────────────────────────────────────────────────
export const AnalyticsEvents = {
  // Auth
  LOGIN_STARTED:      'login_started',
  LOGIN_SUCCESS:      'login_success',
  LOGIN_FAILED:       'login_failed',
  LOGOUT:             'logout',
  REGISTER_STARTED:   'register_started',
  REGISTER_SUCCESS:   'register_success',

  // Navigation
  SCREEN_VIEW:        'screen_view',
  TAB_CHANGED:        'tab_changed',

  // Modules
  PHARMACY_SEARCH:    'pharmacy_search',
  PHARMACY_ORDER:     'pharmacy_order',
  CONSULT_STARTED:    'consult_started',
  CONSULT_COMPLETED:  'consult_completed',
  LAB_ORDERED:        'lab_ordered',
  NURSING_REQUESTED:  'nursing_requested',

  // Product Discovery
  TOUR_STARTED:       'tour_started',
  TOUR_COMPLETED:     'tour_completed',
  TOUR_SKIPPED:       'tour_skipped',
  STEP_VIEWED:        'step_viewed',
  WHATS_NEW_SHOWN:    'whats_new_shown',

  // General
  ERROR_SHOWN:        'error_shown',
  SEARCH_PERFORMED:   'search_performed',
  NOTIFICATION_TAPPED:'notification_tapped',
} as const;

export type AnalyticsEventName = typeof AnalyticsEvents[keyof typeof AnalyticsEvents];
