# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `client/src/components/DashboardLayout.tsx`
- **Member SHA-256:** `4f5d5829ff8a47b800d92a884848b4d7abddeafebb3af939cf5a96624a24f06c`
- **Line count:** 262
- **Read range:** `1-262`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `22: import { startLogin } from "@/const";`
- `24: import { LayoutDashboard, LogOut, PanelLeft, Users } from "lucide-react";`
- `31: { icon: LayoutDashboard, label: "Page 1", path: "/" },`
- `32: { icon: Users, label: "Page 2", path: "/some-path" },`
- `61: <div className="flex items-center justify-center min-h-screen">`
- `68: Access to this dashboard requires authentication. Continue to launch the login flow.`
- `72: onClick={() => startLogin()}`
- `107: const { user, logout } = useAuth();`
- `163: onClick={toggleSidebar}`
- `187: onClick={() => setLocation(item.path)}`
- `223: onClick={logout}`
- `226: <LogOut className="mr-2 h-4 w-4" />`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `22: import { startLogin } from "@/const";`
- `24: import { LayoutDashboard, LogOut, PanelLeft, Users } from "lucide-react";`
- `68: Access to this dashboard requires authentication. Continue to launch the login flow.`
- `72: onClick={() => startLogin()}`
- `107: const { user, logout } = useAuth();`
- `223: onClick={logout}`
- `226: <LogOut className="mr-2 h-4 w-4" />`
### state_transitions
- `25: import { CSSProperties, useEffect, useRef, useState } from "react";`
- `45: const [sidebarWidth, setSidebarWidth] = useState(() => {`
- `49: const { loading, user } = useAuth();`
- `55: if (loading) {`
- `109: const { state, toggleSidebar } = useSidebar();`
- `110: const isCollapsed = state === "collapsed";`
- `111: const [isResizing, setIsResizing] = useState(false);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `27: import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';`
- `49: const { loading, user } = useAuth();`
- `55: if (loading) {`
- `56: return <DashboardLayoutSkeleton />`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
