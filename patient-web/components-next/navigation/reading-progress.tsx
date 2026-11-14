"use client";

import { useCallback, useState } from "react";
import { readingRatio } from "@/lib/navigation/scroll";
import { useWindowScroll } from "@/components-next/navigation/use-window-scroll";

/** A thin bar across the top of the page that fills as the reader scrolls an article. */
export function ReadingProgress({ label }: Readonly<{ label: string }>) {
  const [ratio, setRatio] = useState(0);
  const update = useCallback(
    () => setRatio(readingRatio(window.scrollY, document.documentElement.scrollHeight, window.innerHeight)),
    [],
  );
  useWindowScroll(update);

  return (
    <div className="reading-progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ratio * 100)}>
      <span style={{ transform: `scaleX(${ratio})` }} />
    </div>
  );
}
