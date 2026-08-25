# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `client/src/components/AIChatBox.tsx`
- **Member SHA-256:** `c97ae745ae8f4db0b5e1a96d851fe9fd6943c53bc1bc6c28603bce36058ce28a`
- **Line count:** 335
- **Read range:** `1-335`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `74: * const ChatPage = () => {`
- `168: const handleSubmit = (e: React.FormEvent) => {`
- `186: handleSubmit(e);`
- `214: onClick={() => onSendMessage(prompt)}`
- `308: onSubmit={handleSubmit}`
- `321: type="submit"`
### backend_consumers_or_contracts
- `26: * Typically you'll call a tRPC mutation here to invoke the LLM.`
- `79: *   const chatMutation = trpc.ai.chat.useMutation({`
- `81: *       // Assuming your tRPC endpoint returns the AI response as a string`
### auth_ownership
- `13: role: "system" | "user" | "assistant";`
- `76: *     { role: "system", content: "You are a helpful assistant." }`
- `83: *         role: "assistant",`
- `94: *     const newMessages = [...messages, { role: "user", content }];`
- `130: const displayMessages = messages.filter((msg) => msg.role !== "system");`
- `239: message.role === "user"`
- `249: {message.role === "assistant" && (`
- `258: message.role === "user"`
- `263: {message.role === "assistant" ? (`
- `274: {message.role === "user" && (`
### state_transitions
- `6: import { useState, useEffect, useRef } from "react";`
- `33: isLoading?: boolean;`
- `51: * Empty state message to display when no messages`
- `53: emptyStateMessage?: string;`
- `56: * Suggested prompts to display in empty state`
- `69: * - Loading states`
- `75: *   const [messages, setMessages] = useState<Message[]>([`
- `80: *     onSuccess: (response) => {`
- `87: *     onError: (error) => {`
- `88: *       console.error("Chat error:", error);`
- `89: *       // Optionally show error message to user`
- `103: *       isLoading={chatMutation.isPending}`
### payment_insurance_relevance
- `194: "flex flex-col bg-card text-card-foreground rounded-lg border shadow-sm",`
- `216: className="rounded-lg border border-border bg-card px-4 py-2 text-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"`
### error_empty_loading_retry_cancel
- `33: isLoading?: boolean;`
- `51: * Empty state message to display when no messages`
- `53: emptyStateMessage?: string;`
- `56: * Suggested prompts to display in empty state`
- `69: * - Loading states`
- `87: *     onError: (error) => {`
- `88: *       console.error("Chat error:", error);`
- `89: *       // Optionally show error message to user`
- `103: *       isLoading={chatMutation.isPending}`
- `116: isLoading = false,`
- `120: emptyStateMessage = "Start a conversation with AI",`
- `171: if (!trimmedInput || isLoading) return;`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
