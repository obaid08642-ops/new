"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * Makes the GET filter form around it filter as you type (the app filters the loaded list in place): after a short pause
 * in typing, or at once when a select changes, the form's fields go to the same page as the query and the list re-renders.
 * The form still works without script (the Apply button).
 */
export function LiveFilter() {
  const anchor = useRef<HTMLSpanElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    const form = anchor.current?.closest("form");
    if (!form) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const go = () => {
      const params = new URLSearchParams();
      for (const [key, value] of new FormData(form)) if (typeof value === "string" && value.trim()) params.set(key, value.trim());
      router.replace(params.size ? `${pathname}?${params.toString()}` : pathname, { scroll: false });
    };
    const onInput = (event: Event) => {
      clearTimeout(timer);
      timer = setTimeout(go, event.target instanceof HTMLSelectElement ? 0 : 400);
    };
    form.addEventListener("input", onInput);
    form.addEventListener("change", onInput);
    return () => {
      clearTimeout(timer);
      form.removeEventListener("input", onInput);
      form.removeEventListener("change", onInput);
    };
  }, [router, pathname]);
  return <span ref={anchor} hidden />;
}
