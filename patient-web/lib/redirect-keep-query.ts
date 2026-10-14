import { redirect } from "next/navigation";

/**
 * An old route that now lives on another screen (merge maps): redirect there and keep the query string, so a link or a
 * notification with `?x=y` still opens the same thing. `set` adds or replaces query values (the tab the old page became).
 */
export function redirectKeepingQuery(path: string, query: Record<string, string | string[] | undefined>, set: Record<string, string> = {}): never {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (key in set) continue;
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) params.append(key, item);
  }
  for (const [key, value] of Object.entries(set)) params.set(key, value);
  const text = params.toString();
  redirect(text ? `${path}?${text}` : path);
}
