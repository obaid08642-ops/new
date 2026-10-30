/** The backend's password minimum (backend/src/common/password-security.service.ts MIN_PASSWORD_LENGTH). */
export const MIN_PASSWORD_LENGTH = 8;
/** The most the website proxy forwards (app/api/auth/register/route.ts). */
export const MAX_PASSWORD_LENGTH = 128;

export type RegisterProblem = "errName" | "errIdentifier" | "errPassword" | "errMismatch" | "errAgree";

/** The first rule a registration breaks, in the order of the fields; null when the form can be sent. */
export function registerProblem(form: { name: string; identifier: string; password: string; confirm: string }, agreed: boolean): RegisterProblem | null {
  if (form.name.trim().length < 2) return "errName";
  if (form.identifier.trim().length < 3) return "errIdentifier";
  if (form.password.length < MIN_PASSWORD_LENGTH) return "errPassword";
  if (form.password !== form.confirm) return "errMismatch";
  if (!agreed) return "errAgree";
  return null;
}
