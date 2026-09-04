import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: ["/", "/(ar|en|ur|hi|bn|fil)/:path*", "/((?!_next|_vercel|.*\\..*).*)"],
};
