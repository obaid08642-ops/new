# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/community/post-detail.tsx`
- **Member SHA-256:** `6ab5a01586714384cbb518eda3d18cfc8c7a102e8c9d42637f58c467bdf7b68c`
- **Line count:** 370
- **Read range:** `1-370`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `13: import { router, useLocalSearchParams } from "expo-router";`
- `28: export default function PostDetailScreen() {`
- `132: <TouchableOpacity onPress={() => router.back()}>`
- `178: onPress={async () => {`
- `189: onPress={() => commentsRef.current?.scrollToEnd?.({ animated: true })}`
- `194: <TouchableOpacity style={styles.actionBtn} onPress={handleVote}>`
- `257: onPress={sendComment}`
- `277: onSubmitEditing={sendComment}`
### backend_consumers_or_contracts
- `53: const res = await apiFetch(`/community/posts/${postId}`);`
- `68: const res = await apiFetch(`/community/posts/${postId}/vote`, {`
- `87: const res = await apiFetch(`/community/posts/${postId}/comment`, {`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useState, useEffect } from "react";`
- `34: const [post, setPost] = useState<any>(null);`
- `35: const [comments, setComments] = useState<any[]>([]);`
- `37: const [loading, setLoading] = useState(true);`
- `38: const [comment, setComment] = useState("");`
- `39: const [voted, setVoted] = useState<"up" | "down" | null>(null);`
- `40: const [voteCount, setVoteCount] = useState(0);`
- `46: setLoading(false);`
- `52: setLoading(true);`
- `58: console.error(err);`
- `60: setLoading(false);`
- `98: if (loading) {`
### payment_insurance_relevance
- `19: Card,`
- `141: styles.postCard,`
- `212: styles.commentCard,`
- `294: postCard: {`
- `334: commentCard: { padding: 12, borderRadius: 16, marginBottom: 8 },`
### error_empty_loading_retry_cancel
- `37: const [loading, setLoading] = useState(true);`
- `46: setLoading(false);`
- `52: setLoading(true);`
- `57: } catch (err) {`
- `58: console.error(err);`
- `60: setLoading(false);`
- `79: } catch (err: any) {`
- `93: } catch (err: any) {`
- `98: if (loading) {`
- `181: } catch {}`
- `198: color={voted === "up" ? colors.error : colors.textTertiary}`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
