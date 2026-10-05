import { randomBytes } from 'node:crypto';

/**
 * 7C-C2: enroll this browser's device id for the admin who just signed in, so
 * the mandatory device allow-list accepts the session. Every login path (email
 * 2FA and passkey) must call this, or the new session gets device_not_enrolled
 * on every request. Returns the admin_device cookie to set.
 */
/** This browser's device id: the existing admin_device cookie, or a new random one. */
export function loginDeviceId(existing: string | undefined): string {
  return existing && existing.length >= 16 ? existing : [...randomBytes(32)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** The HttpOnly admin_device cookie for a device id. */
export function deviceCookie(deviceId: string): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `admin_device=${encodeURIComponent(deviceId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365}${secure}`;
}

/**
 * Enroll through POST /admin/devices/enroll. X4: the backend allows this only
 * for a bootstrap admin (no passkey yet) or a break-glass recovery session; a
 * passkey login binds the device itself (passkey-verify sends device_id).
 */
export async function enrollLoginDevice(backendBase: string, token: string, existing: string | undefined): Promise<string> {
  const deviceId = loginDeviceId(existing);
  try {
    const headers: Record<string, string> = { 'content-type': 'application/json', authorization: `Bearer ${token}`, 'x-admin-device': deviceId };
    if (process.env.ADMIN_GATE_TOKEN) headers['x-admin-gate-token'] = process.env.ADMIN_GATE_TOKEN;
    await fetch(`${backendBase}/api/v1/admin/devices/enroll`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ device_id: deviceId, name: 'admin-browser' }),
    }).catch(() => null);
  } catch { /* enrollment failure surfaces as device_not_enrolled on next call */ }
  return deviceCookie(deviceId);
}
