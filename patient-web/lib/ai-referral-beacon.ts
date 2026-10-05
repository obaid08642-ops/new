/**
 * C6.4: a page visit that arrives from an AI assistant (by Referer host or
 * utm_source) is reported to POST /analytics/ai-referral. The backend checks
 * the host again; this only avoids sending a beacon for every other visit.
 */
const AI_HOSTS = [
  "chat.openai.com",
  "chatgpt.com",
  "perplexity.ai",
  "gemini.google.com",
  "copilot.microsoft.com",
  "claude.ai",
] as const;

export type AiReferralBeacon = {
  referrer?: string;
  path: string;
  utm_source?: string;
  user_agent?: string;
};

function isAiHost(value: string) {
  const host = value.trim().toLowerCase();
  return AI_HOSTS.some((ai) => host === ai || host.endsWith(`.${ai}`));
}

export function aiReferralBeacon(url: URL, headers: Headers): AiReferralBeacon | null {
  const referer = headers.get("referer") || "";
  let fromReferer = false;
  if (referer) {
    try {
      fromReferer = isAiHost(new URL(referer).hostname);
    } catch {
      fromReferer = false;
    }
  }
  const utmSource = url.searchParams.get("utm_source") || "";
  const fromUtm = utmSource !== "" && isAiHost(utmSource);
  if (!fromReferer && !fromUtm) return null;
  const userAgent = headers.get("user-agent");
  return {
    ...(fromReferer ? { referrer: referer.slice(0, 512) } : {}),
    path: url.pathname.slice(0, 512),
    ...(fromUtm ? { utm_source: utmSource.slice(0, 128) } : {}),
    ...(userAgent ? { user_agent: userAgent.slice(0, 512) } : {}),
  };
}
