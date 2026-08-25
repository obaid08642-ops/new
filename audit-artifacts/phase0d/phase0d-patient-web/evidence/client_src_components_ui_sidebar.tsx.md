# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `client/src/components/ui/sidebar.tsx`
- **Member SHA-256:** `782ec3ba8a570c9a0f6ec12d7e1c1efdee5e02eb2da7aa46131c734e7f7bbea8`
- **Line count:** 734
- **Read range:** `1-734`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `265: onClick,`
- `277: onClick={event => {`
- `278: onClick?.(event);`
- `298: onClick={toggleSidebar}`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `27: const SIDEBAR_COOKIE_NAME = "sidebar_state";`
- `28: const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;`
- `84: // This sets the cookie to keep the sidebar state.`
- `85: document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;`
### state_transitions
- `27: const SIDEBAR_COOKIE_NAME = "sidebar_state";`
- `35: state: "expanded" | "collapsed";`
- `49: throw new Error("useSidebar must be used within a SidebarProvider.");`
- `69: const [openMobile, setOpenMobile] = React.useState(false);`
- `71: // This is the internal state of the sidebar.`
- `73: const [_open, _setOpen] = React.useState(defaultOpen);`
- `77: const openState = typeof value === "function" ? value(open) : value;`
- `79: setOpenProp(openState);`
- `81: _setOpen(openState);`
- `84: // This sets the cookie to keep the sidebar state.`
- `85: document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;`
- `111: // We add a state so that we can do data-state="expanded" or "collapsed".`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `13: import { Skeleton } from "@/components/ui/skeleton";`
- `49: throw new Error("useSidebar must be used within a SidebarProvider.");`
- `609: function SidebarMenuSkeleton({`
- `623: data-slot="sidebar-menu-skeleton"`
- `624: data-sidebar="menu-skeleton"`
- `629: <Skeleton`
- `631: data-sidebar="menu-skeleton-icon"`
- `634: <Skeleton`
- `635: className="h-4 max-w-(--skeleton-width) flex-1"`
- `636: data-sidebar="menu-skeleton-text"`
- `639: "--skeleton-width": width,`
- `724: SidebarMenuSkeleton,`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
