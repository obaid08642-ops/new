"use client";

import { useEffect } from "react";

/**
 * The Snapchat bridge page (lib/auth/app-callback): opens the app's deep link at once and leaves a button for browsers that need a
 * tap. The target is built on the server from validated values; nothing is logged and the page is never indexed or cached.
 */
export function AppCallback({ target, title, openLabel }: { target: string; title: string; openLabel: string }) {
  useEffect(() => {
    window.location.replace(target);
  }, [target]);
  return (
    <main style={{ display: "grid", placeItems: "center", minHeight: "100dvh", padding: 24, textAlign: "center" }}>
      <div>
        <p>{title}</p>
        <a href={target}>{openLabel}</a>
      </div>
    </main>
  );
}
