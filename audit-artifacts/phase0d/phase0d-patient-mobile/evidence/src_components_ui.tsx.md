# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/components/ui.tsx`
- **Member SHA-256:** `3af22e58dc1ae29c96b42fd7bfe1751208bfa946a6d58aeb8787520e8e5f52b8`
- **Line count:** 673
- **Read range:** `1-673`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `79: onPress?: () => void;`
- `90: label, onPress, variant = 'primary', size = 'md',`
- `149: <TouchableOpacity onPress={onPress} disabled={disabled || loading} activeOpacity={0.88} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} style={[{ width: full ? '100%' : undefined }, style]} accessibilityRole="button" accessibilityLabel={`
- `158: <TouchableOpacity onPress={onPress} disabled={disabled || loading} activeOpacity={0.88} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} style={[base, style]} accessibilityRole="button" accessibilityLabel={typeof translatedLabel === 'stri`
- `168: onPress?: () => void;`
- `172: export function Card({ children, style, onPress, padding = 16, elevated = true }: CardProps) {`
- `190: if (onPress) {`
- `192: <TouchableOpacity onPress={onPress} activeOpacity={0.9} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }} accessibilityRole="button" style={[cardStyle, style]}>`
- `216: onPress: () => void;`
- `223: export function ProductCard({ product, onPress, onAddToCart, qty, onQtyChange, style }: ProductCardProps) {`
- `234: <TouchableOpacity activeOpacity={0.9} onPress={onPress}>`
- `282: onPress={() => onQtyChange?.(qty + 1)}`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `149: <TouchableOpacity onPress={onPress} disabled={disabled || loading} activeOpacity={0.88} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} style={[{ width: full ? '100%' : undefined }, style]} accessibilityRole="button" accessibilityLabel={`
- `158: <TouchableOpacity onPress={onPress} disabled={disabled || loading} activeOpacity={0.88} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} style={[base, style]} accessibilityRole="button" accessibilityLabel={typeof translatedLabel === 'stri`
- `192: <TouchableOpacity onPress={onPress} activeOpacity={0.9} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }} accessibilityRole="button" style={[cardStyle, style]}>`
- `639: accessibilityRole="button"`
### state_transitions
- `84: loading?: boolean;`
- `91: icon, iconRight, loading, disabled, full = true, style,`
- `105: danger: colors.error,`
- `119: {loading ? (`
- `149: <TouchableOpacity onPress={onPress} disabled={disabled || loading} activeOpacity={0.88} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} style={[{ width: full ? '100%' : undefined }, style]} accessibilityRole="button" accessibilityLabel={`
- `158: <TouchableOpacity onPress={onPress} disabled={disabled || loading} activeOpacity={0.88} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} style={[base, style]} accessibilityRole="button" accessibilityLabel={typeof translatedLabel === 'stri`
- `242: <View style={[styles_pc.discountBadge, { backgroundColor: colors.error }]}>`
- `403: {doctor.ins && <Badge label="تأمين" color={colors.success} icon="shield" />}`
- `456: error?: string;`
- `464: secureTextEntry, keyboardType, error, multiline, autoFocus, autoCapitalize, style,`
- `468: const translatedError = autoTranslate(error, lang);`
- `478: borderColor: error ? colors.error : colors.border,`
### payment_insurance_relevance
- `164: /* ----------------------------- Card ----------------------------- */`
- `165: interface CardProps {`
- `172: export function Card({ children, style, onPress, padding = 16, elevated = true }: CardProps) {`
- `174: const cardStyle: ViewStyle = {`
- `192: <TouchableOpacity onPress={onPress} activeOpacity={0.9} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }} accessibilityRole="button" style={[cardStyle, style]}>`
- `197: return <View style={[cardStyle, style]}>{children}</View>;`
- `200: /* --------------------------- Product Card --------------------------- */`
- `201: interface ProductCardProps {`
- `206: price: number;`
- `207: originalPrice?: number;`
- `223: export function ProductCard({ product, onPress, onAddToCart, qty, onQtyChange, style }: ProductCardProps) {`
- `225: const discount = product.originalPrice && product.originalPrice > product.price`
### error_empty_loading_retry_cancel
- `84: loading?: boolean;`
- `91: icon, iconRight, loading, disabled, full = true, style,`
- `105: danger: colors.error,`
- `119: {loading ? (`
- `149: <TouchableOpacity onPress={onPress} disabled={disabled || loading} activeOpacity={0.88} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} style={[{ width: full ? '100%' : undefined }, style]} accessibilityRole="button" accessibilityLabel={`
- `158: <TouchableOpacity onPress={onPress} disabled={disabled || loading} activeOpacity={0.88} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} style={[base, style]} accessibilityRole="button" accessibilityLabel={typeof translatedLabel === 'stri`
- `242: <View style={[styles_pc.discountBadge, { backgroundColor: colors.error }]}>`
- `456: error?: string;`
- `464: secureTextEntry, keyboardType, error, multiline, autoFocus, autoCapitalize, style,`
- `468: const translatedError = autoTranslate(error, lang);`
- `478: borderColor: error ? colors.error : colors.border,`
- `505: {error ? <AppText variant="caption" color={colors.error} align="right" style={{ marginTop: 4 }}>{translatedError}</AppText> : null}`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
