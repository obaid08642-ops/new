"use client";

import { Rating } from "@/components-next/ui-generated/components/Surfaces";

/** Client wrapper: `Rating` takes a formatter function, which a server page cannot pass, so it gets the finished label text. */
export function ReviewScore({ value, label }: { value: number; label: string }) {
  return <Rating value={value} count={1} formatLabel={() => label} />;
}
