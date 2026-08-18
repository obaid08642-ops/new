import client from './client';

/**
 * Real email OTP for provider onboarding final submission.
 * Backend: POST /provider/auth/send-otp  { email, purpose }
 *          POST /provider/auth/verify-email { email, code }
 * Delivery uses the server mailer (Resend in production).
 */
export async function sendEmailOtp(email: string) {
  const res = await client.post('/provider/auth/send-otp', {
    email: (email || '').trim(),
    purpose: 'email_verification',
  });
  return res.data;
}

export async function verifyEmailOtp(email: string, code: string): Promise<boolean> {
  try {
    await client.post('/provider/auth/verify-email', {
      email: (email || '').trim(),
      code: (code || '').trim(),
    });
    return true;
  } catch {
    return false;
  }
}
