"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components-next/ui-generated/components/Button";

/**
 * A full-width board button that goes to a page. One real <button> that navigates on click: wrapping the design
 * system's Button (a <button>) in a <Link> nests two interactive elements in one tab stop (axe nested-interactive).
 */
export function LinkButton({ href, label, variant = "primary" }: { href: string; label: string; variant?: "primary" | "outline" }) {
  const router = useRouter();
  return <Button variant={variant} size="lg" fullWidth label={label} onClick={() => router.push(href)} />;
}
