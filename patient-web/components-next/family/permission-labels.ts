import type { PermissionKey } from "@/lib/family/view";

/** The message key of each grant (FamilyWeb.perm.<key>), so a label is never written in a component. */
export const PERMISSION_LABEL: Record<PermissionKey, "perm.vitals" | "perm.meds" | "perm.reports" | "perm.appointments"> = {
  vitals: "perm.vitals",
  meds: "perm.meds",
  reports: "perm.reports",
  appointments: "perm.appointments",
};
