# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `client/src/pages/ComponentShowcase.tsx`
- **Member SHA-256:** `d3905f3521d77e97b7d7c6198a6f915bf45f68223c74552e7e728f4fe10ca79a`
- **Line count:** 1437
- **Read range:** `1-1437`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `16: BreadcrumbPage,`
- `182: const [currentPage, setCurrentPage] = useState(2);`
- `187: const [dialogInput, setDialogInput] = useState("");`
- `196: const handleDialogSubmit = () => {`
- `197: console.log("Dialog submitted with value:", dialogInput);`
- `198: sonnerToast.success("Submitted successfully", {`
- `199: description: `Input: ${dialogInput}`,`
- `201: setDialogInput("");`
- `208: handleDialogSubmit();`
- `230: <div className="min-h-screen bg-background text-foreground">`
- `236: <Button variant="outline" size="icon" onClick={toggleTheme}>`
- `714: onClick={() => setProgress(Math.max(0, progress - 10))}`
### backend_consumers_or_contracts
- `222: content: `This is a **demo response**. In a real app, you would call a tRPC mutation here:\n\n\`\`\`typescript\nconst chatMutation = trpc.ai.chat.useMutation({\n  onSuccess: (response) => {\n    setChatMessages(prev => [...prev, {\n      ro`
- `1406: This is a demo with simulated responses. In a real app, you'd connect it to a tRPC mutation.`
- `1419: "How to use tRPC?",`
### auth_ownership
- `89: InputOTP,`
- `90: InputOTPGroup,`
- `91: InputOTPSlot,`
- `92: } from "@/components/ui/input-otp";`
- `187: const [dialogInput, setDialogInput] = useState("");`
- `192: { role: "system", content: "You are a helpful assistant." },`
- `197: console.log("Dialog submitted with value:", dialogInput);`
- `199: description: `Input: ${dialogInput}`,`
- `201: setDialogInput("");`
- `214: const newMessages: Message[] = [...chatMessages, { role: "user", content }];`
- `221: role: "assistant",`
- `222: content: `This is a **demo response**. In a real app, you would call a tRPC mutation here:\n\n\`\`\`typescript\nconst chatMutation = trpc.ai.chat.useMutation({\n  onSuccess: (response) => {\n    setChatMessages(prev => [...prev, {\n      ro`
### state_transitions
- `44: CommandEmpty,`
- `172: import { useState } from "react";`
- `178: const [date, setDate] = useState<Date | undefined>(new Date());`
- `179: const [datePickerDate, setDatePickerDate] = useState<Date>();`
- `180: const [selectedFruits, setSelectedFruits] = useState<string[]>([]);`
- `181: const [progress, setProgress] = useState(33);`
- `182: const [currentPage, setCurrentPage] = useState(2);`
- `183: const [openCombobox, setOpenCombobox] = useState(false);`
- `184: const [selectedFramework, setSelectedFramework] = useState("");`
- `185: const [selectedMonth, setSelectedMonth] = useState("");`
- `186: const [selectedYear, setSelectedYear] = useState("");`
- `187: const [dialogInput, setDialogInput] = useState("");`
### payment_insurance_relevance
- `22: Card,`
- `23: CardContent,`
- `24: CardDescription,`
- `25: CardFooter,`
- `26: CardHeader,`
- `27: CardTitle,`
- `28: } from "@/components/ui/card";`
- `83: HoverCard,`
- `84: HoverCardContent,`
- `85: HoverCardTrigger,`
- `86: } from "@/components/ui/hover-card";`
- `249: <Card>`
### error_empty_loading_retry_cancel
- `44: CommandEmpty,`
- `139: import { Skeleton } from "@/components/ui/skeleton";`
- `194: const [isChatLoading, setIsChatLoading] = useState(false);`
- `218: setIsChatLoading(true);`
- `219: setTimeout(() => {`
- `225: setIsChatLoading(false);`
- `300: Error or destructive action text`
- `564: <CommandEmpty>No framework found</CommandEmpty>`
- `728: <Label>Skeleton</Label>`
- `730: <Skeleton className="h-4 w-full" />`
- `731: <Skeleton className="h-4 w-3/4" />`
- `732: <Skeleton className="h-4 w-1/2" />`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
