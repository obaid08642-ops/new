import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { Button } from '../../../../packages/ui-native/src';
import { Notice } from '../health/HealthKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { apiFetch } from '../../utils/api';
import { logError } from '../../utils/logger';
import { matchInsuranceCompany, buildChiPolicyPayload } from '../../utils/insurance-chi-contract';
import { InsuranceScreen } from './InsuranceKit';

/**
 * The automatic lookup in the portal of the Council of Health Insurance (the old hub's WebView scraper, moved here
 * unchanged in behaviour): the patient enters the national id on the portal, the injected script reads the result
 * table, and a policy is saved only for an insurer the directory knows (POST /insurance/save-policy). Nothing is
 * invented and nothing is claimed as verified.
 */

// ─── CHI Portal URL ──────────────────────────────────────────────────────────
const CHI_URL = 'https://www.chi.gov.sa/ar/Services/Pages/BeneficiaryInquiry.aspx';

// ─── JavaScript injected into WebView to auto-scrape CHI result table ────────
const CHI_INJECTED_JS = `
(function() {
  // Poll every 800ms for the result table to appear
  var maxTries = 60; // 60 x 800ms = 48s timeout
  var tries = 0;
  var interval = setInterval(function() {
    tries++;
    if (tries > maxTries) {
      clearInterval(interval);
      window.ReactNativeWebView.postMessage(JSON.stringify({ status: 'timeout' }));
      return;
    }

    // Try multiple possible table/result selectors (CHI portal varies)
    var rows = document.querySelectorAll('table tr, .results-table tr, .beneficiary-result tr');
    if (rows.length > 1) {
      clearInterval(interval);
      var extracted = [];
      rows.forEach(function(row, i) {
        if (i === 0) return; // skip header
        var cells = row.querySelectorAll('td');
        if (cells.length >= 3) {
          extracted.push({
            company: cells[0] ? cells[0].innerText.trim() : '',
            class: cells[1] ? cells[1].innerText.trim() : '',
            policy_number: cells[2] ? cells[2].innerText.trim() : '',
            network: cells[3] ? cells[3].innerText.trim() : '',
            expiry: cells[4] ? cells[4].innerText.trim() : '',
          });
        }
      });
      if (extracted.length > 0) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ status: 'success', data: extracted }));
      }
    }

    // Also check for error messages
    var errEl = document.querySelector('.error-message, .no-result, [class*="error"]');
    if (errEl && errEl.innerText.trim().length > 0) {
      clearInterval(interval);
      window.ReactNativeWebView.postMessage(JSON.stringify({ status: 'error', message: errEl.innerText.trim() }));
    }
  }, 800);
  true; // required return value
})();
`;

export function ChiLookup({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const { k, t, c, theme, flow } = useScreenUi();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'danger' | 'success' | 'warning'; text: string } | null>(null);
  const webviewRef = useRef<WebView>(null);

  const handleMessage = useCallback(
    async (event: { nativeEvent: { data: string } }) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data);
        if (msg.status === 'timeout') {
          setMessage({ tone: 'warning', text: k('insurance.chi.timeout') });
          return;
        }
        if (msg.status === 'error') {
          setMessage({ tone: 'danger', text: msg.message || k('insurance.chi.queryFailed') });
          return;
        }
        if (msg.status === 'success' && msg.data?.length > 0) {
          const item = msg.data[0];
          // LJ-04: only save a real policy for a company we can map to an active insurer. Never invent a policy number
          // and never claim verification.
          const companiesRes = await apiFetch<unknown>('/insurance/companies').catch(() => []);
          const companies = (Array.isArray(companiesRes) ? companiesRes : (companiesRes as { data?: unknown[] } | null)?.data || []) as Parameters<typeof matchInsuranceCompany>[0];
          const company = matchInsuranceCompany(companies, item.company);
          if (!company) {
            setMessage({ tone: 'danger', text: k('insurance.chi.unknownCompany', { name: String(item.company ?? '') }) });
            return;
          }
          const payload = buildChiPolicyPayload(company, item);
          if (!payload) {
            setMessage({ tone: 'danger', text: k('insurance.chi.noPolicyNumber') });
            return;
          }
          setSaving(true);
          try {
            await apiFetch('/insurance/save-policy', { method: 'POST', body: JSON.stringify(payload) });
            setMessage(null);
            onSaved();
          } catch (err) {
            logError('insurance:chi:save', err);
            setMessage({ tone: 'danger', text: k('insurance.chi.saveFailed') });
          } finally {
            setSaving(false);
          }
        }
      } catch {
        // JSON parse error: ignore
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [k, onSaved],
  );

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <InsuranceScreen title={k('insurance.chi.title')} onBack={onClose} scroll={false} testID="chi-lookup">
        <Notice tone="info" text={k('insurance.chi.help')} />
        {message ? <Notice tone={message.tone} text={message.text} testID="chi-message" /> : null}
        {loading || saving ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} accessibilityState={{ busy: true }}>
            <ActivityIndicator size="small" color={c.text.primary} />
            <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{saving ? k('insurance.chi.saving') : k('insurance.chi.loading')}</Text>
          </View>
        ) : null}
        <View style={{ flex: 1, minHeight: 420, borderRadius: 20, overflow: 'hidden' }}>
          <WebView
            ref={webviewRef}
            source={{ uri: CHI_URL }}
            injectedJavaScript={CHI_INJECTED_JS}
            onMessage={handleMessage}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState={false}
            style={{ flex: 1 }}
          />
        </View>
        <Button label={k('insurance.chi.close')} variant="outline" fullWidth onPress={onClose} theme={theme} testID="chi-close" />
      </InsuranceScreen>
    </Modal>
  );
}
