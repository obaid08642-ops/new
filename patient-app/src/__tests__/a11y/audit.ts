import { StyleSheet } from 'react-native';

/**
 * Walks a rendered screen (`screen.toJSON()`) and returns what is wrong with its pressable elements: no role, no name (label
 * or visible text), or a touch target under 44pt (own height plus hit slop). Only host elements that take presses are looked at.
 */
type Json = { type: string; props: Record<string, unknown>; children: Array<Json | string> | null };
type Tree = Json | Json[] | null;

const textOf = (node: Json | string): string => (typeof node === 'string' ? node : (node.children ?? []).map(textOf).join(''));
const slopV = (h: unknown) => {
  if (typeof h === 'number') return h * 2;
  const s = (h ?? {}) as Record<string, number>;
  return (s.top ?? 0) + (s.bottom ?? 0);
};
const walk = (node: Json | string, visit: (n: Json) => void) => {
  if (typeof node === 'string') return;
  visit(node);
  for (const child of node.children ?? []) walk(child, visit);
};

export interface Finding { problem: 'role' | 'name' | 'size'; id: string }

export function auditPressables(tree: Tree): { checked: number; findings: Finding[] } {
  const roots = Array.isArray(tree) ? tree : tree ? [tree] : [];
  const findings: Finding[] = [];
  let checked = 0;
  for (const root of roots) {
    walk(root, (el) => {
      if (typeof el.props.onClick !== 'function' || el.props.accessible === false) return;
      checked += 1;
      const id = String(el.props.testID ?? el.props.accessibilityLabel ?? (textOf(el).slice(0, 30) || 'unnamed'));
      if (!el.props.accessibilityRole && !el.props.role) findings.push({ problem: 'role', id });
      const label = el.props.accessibilityLabel;
      if (!(typeof label === 'string' && label.trim()) && !textOf(el).trim()) findings.push({ problem: 'name', id });
      const style = (StyleSheet.flatten(el.props.style as never) ?? {}) as { height?: number; minHeight?: number };
      const h = Math.max(style.height ?? 0, style.minHeight ?? 0);
      // a pressable that sizes itself by its content (no height) is measured on a device, not here
      if (h > 0 && h + slopV(el.props.hitSlop) < 44) findings.push({ problem: 'size', id });
    });
  }
  return { checked, findings };
}
