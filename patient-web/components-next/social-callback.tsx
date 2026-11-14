"use client";

import { useEffect } from "react";

/** The popup's return page for X and Snapchat: hands { code, state } to the opener (same origin only) and closes. */
export function SocialCallback() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (window.opener && code) {
      window.opener.postMessage({ type: "nabd-social-callback", code, state: params.get("state") || "" }, window.location.origin);
    }
    window.close();
  }, []);
  return null;
}
