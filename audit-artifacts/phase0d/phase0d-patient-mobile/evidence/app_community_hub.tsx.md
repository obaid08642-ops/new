# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/community/hub.tsx`
- **Member SHA-256:** `4cfbdd96ccfa0337517d045ba3afb357d0dd177aab6eb08e1e5b3ec0f0e6d491`
- **Line count:** 313
- **Read range:** `1-313`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `16: import { router } from "expo-router";`
- `33: export default function Screen() {`
- `59: const res = await apiFetch(`/community/posts?page=1&limit=20${qs}`);`
- `98: onPress={() => setShowComposer(true)}`
- `107: onPress={() => router.back()}`
- `143: onPress={() => setActiveCategory(cat.key)}`
- `171: onPress={() =>`
- `172: router.push({`
- `238: onPress={() => setPostCategory(c.key)}`
- `260: onPress={publishPost}`
- `264: <Button label="إلغاء" variant="ghost" onPress={() => setShowComposer(false)} />`
### backend_consumers_or_contracts
- `59: const res = await apiFetch(`/community/posts?page=1&limit=20${qs}`);`
- `74: await apiFetch("/community/posts", {`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useState, useEffect } from "react";`
- `7: StatusBar,`
- `36: const [posts, setPosts] = useState<any[]>([]);`
- `37: const [loading, setLoading] = useState(true);`
- `45: const [activeCategory, setActiveCategory] = useState("");`
- `46: const [showComposer, setShowComposer] = useState(false);`
- `47: const [postText, setPostText] = useState("");`
- `48: const [postCategory, setPostCategory] = useState("question");`
- `49: const [publishing, setPublishing] = useState(false);`
- `57: setLoading(true);`
- `63: console.error(err);`
- `65: setLoading(false);`
### payment_insurance_relevance
- `23: Card,`
- `170: <Card`
- `177: style={st.postCard}`
- `221: </Card>`
- `230: <View style={[st.composerCard, { backgroundColor: colors.surface }]}>`
- `276: composerCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34 },`
- `299: postCard: { padding: 14, gap: 4 },`
### error_empty_loading_retry_cancel
- `37: const [loading, setLoading] = useState(true);`
- `57: setLoading(true);`
- `62: } catch (err) {`
- `63: console.error(err);`
- `65: setLoading(false);`
- `82: } catch (e: any) {`
- `112: {loading ? (`
- `162: ListEmptyComponent={`
- `215: <Icon name="favorite" size={14} color={colors.error} />`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
