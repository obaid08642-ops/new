import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme, useLang, useAuth } from '../../context';
import { NBtn } from '../../components/ui';
import { SP, R, FS, FW } from '../../constants';
import type { ServiceKind } from '../../api/ordering';
import { kindOfRoles, orderingErrorMessage } from './logic';

export interface OrderingScreenProps {
  kind?: ServiceKind;
  onBack: () => void;
  onNav: (screen: string) => void;
}

/** Kind from the dashboard that mounts the screen, else from the signed-in provider's own role. */
export function useKind(kind?: ServiceKind): ServiceKind | null {
  const { user } = useAuth();
  return kind ?? kindOfRoles([user?.role, user?.providerType]);
}

export function useAR(): boolean {
  const { lang } = useLang();
  return lang === 'ar';
}

/** Loads once, exposes loading / error (mapped message) / reload. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[]) {
  const AR = useAR();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await fn()); } catch (e) { setError(orderingErrorMessage(e, AR)); } finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { reload(); }, [reload]);
  return { data, setData, loading, error, reload };
}

export function Chip({ label, on, onPress, disabled }: { label: string; on: boolean; onPress: () => void; disabled?: boolean }) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ selected: on, disabled }}
      style={{ minHeight: 44, minWidth: 44, paddingHorizontal: SP.lg, borderRadius: R.full, alignItems: 'center', justifyContent: 'center',
        backgroundColor: on ? theme.primary : theme.surface2, borderWidth: 1, borderColor: on ? theme.primary : theme.border, opacity: disabled ? 0.5 : 1 }}>
      <Text style={{ fontSize: FS.sm, fontWeight: FW.semi, color: on ? theme.textInv : theme.text }}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Row({ children, style }: { children: React.ReactNode; style?: object }) {
  const { isRTL } = useLang();
  return <View style={[{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', flexWrap: 'wrap', gap: SP.sm }, style]}>{children}</View>;
}

export function Label({ children, sub, bold }: { children: React.ReactNode; sub?: boolean; bold?: boolean }) {
  const { theme } = useTheme();
  const AR = useAR();
  return <Text style={{ fontSize: sub ? FS.sm : FS.md, color: sub ? theme.textSub : theme.text, fontWeight: bold ? FW.bold : FW.reg, textAlign: AR ? 'right' : 'left', marginBottom: SP.xs }}>{children}</Text>;
}

export function LoadState({ loading, error, onRetry, children }: { loading: boolean; error: string | null; onRetry: () => void; children: React.ReactNode }) {
  const { theme } = useTheme();
  const AR = useAR();
  if (loading) return <View style={{ padding: SP.xxxl, alignItems: 'center' }}><ActivityIndicator color={theme.primary} /></View>;
  if (error) {
    return (
      <View style={{ padding: SP.xl, alignItems: 'center', gap: SP.md }}>
        <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.text }}>{AR ? 'تعذّر التحميل' : 'Could not load'}</Text>
        <Text style={{ fontSize: FS.md, color: theme.textSub, textAlign: 'center' }}>{error}</Text>
        <NBtn label={AR ? 'إعادة المحاولة' : 'Try again'} onPress={onRetry} full={false} />
      </View>
    );
  }
  return <>{children}</>;
}

export const fmtMoney = (n: number, ar: boolean) => `${n.toLocaleString(ar ? 'ar-SA' : 'en-US', { maximumFractionDigits: 2 })} ${ar ? 'ر.س' : 'SAR'}`;
