import { z } from "zod";

const tokenPairSchema = z.object({ accessToken: z.string().min(1), refreshToken: z.string().min(1) });

export function refreshRequestBody(refreshToken: string) {
  return JSON.stringify({ refresh_token: refreshToken });
}

export function parseRefreshedTokens(payload: unknown) {
  const parsed = tokenPairSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}
