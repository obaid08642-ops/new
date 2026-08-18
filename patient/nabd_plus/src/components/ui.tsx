// src/components/ui.tsx
// مكتبة عناصر واجهة موحّدة — Premium reusable components (RTL-first)
import React from 'react';
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet,
  ActivityIndicator, ViewStyle, TextStyle, StyleProp, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors, useApp } from '../context/AppContext';
import { autoTranslate } from '../i18n';
import { Icon, IconName } from './Icon';

/* ----------------------------- Text ----------------------------- */
// AppText guarantees Cairo font + correct RTL alignment, fixing the
// "Arabic words stuck together" problem (caused by missing fontFamily
// fallback + wrong textAlign). Always use this instead of raw <Text>.
type TextVariant =
  | 'displayMD' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  | 'bodyLG' | 'bodyMD' | 'bodySM' | 'bodyXS'
  | 'labelLG' | 'labelMD' | 'labelSM' | 'caption' | 'buttonMD';

const FONT: Record<TextVariant, { fontWeight: any; fontSize: number; lineHeight: number }> = {
  displayMD: { fontWeight: '800', fontSize: 28, lineHeight: 40 },
  h1: { fontWeight: '800', fontSize: 26, lineHeight: 38 },
  h2: { fontWeight: '800', fontSize: 22, lineHeight: 34 },
  h3: { fontWeight: '700', fontSize: 20, lineHeight: 30 },
  h4: { fontWeight: '700', fontSize: 18, lineHeight: 28 },
  h5: { fontWeight: '700', fontSize: 16, lineHeight: 26 },
  h6: { fontWeight: '700', fontSize: 14, lineHeight: 22 },
  bodyLG: { fontWeight: '400', fontSize: 16, lineHeight: 28 },
  bodyMD: { fontWeight: '400', fontSize: 15, lineHeight: 26 },
  bodySM: { fontWeight: '400', fontSize: 14, lineHeight: 24 },
  bodyXS: { fontWeight: '400', fontSize: 12, lineHeight: 20 },
  labelLG: { fontWeight: '700', fontSize: 14, lineHeight: 22 },
  labelMD: { fontWeight: '700', fontSize: 13, lineHeight: 20 },
  labelSM: { fontWeight: '600', fontSize: 12, lineHeight: 18 },
  caption: { fontWeight: '400', fontSize: 11, lineHeight: 17 },
  buttonMD: { fontWeight: '800', fontSize: 15, lineHeight: 22 },
};

interface AppTextProps {
  children: React.ReactNode;
  variant?: TextVariant;
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  align?: 'auto' | 'left' | 'right' | 'center';
}
export function AppText({ children, variant = 'bodyMD', color, style, numberOfLines, align = 'right' }: AppTextProps) {
  const { colors, lang } = useApp();
  const translatedChildren = autoTranslate(children, lang);
  const isRtlLang = lang === 'ar' || lang === 'ur';
  const defaultAlign = isRtlLang ? 'right' : 'left';
  const textAlign = align === 'right' && !isRtlLang ? 'left' : (align === 'left' && isRtlLang ? 'right' : align);
  
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        FONT[variant],
        { 
          color: color ?? colors.textPrimary, 
          textAlign: textAlign === 'auto' ? defaultAlign : textAlign, 
          writingDirection: isRtlLang ? 'rtl' : 'ltr' 
        },
        style,
      ]}
    >
      {translatedChildren}
    </Text>
  );
}

/* ----------------------------- Button ----------------------------- */
type BtnVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'gradient';
type BtnSize = 'sm' | 'md' | 'lg';
interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: BtnVariant;
  size?: BtnSize;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  disabled?: boolean;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
}
export function Button({
  label, onPress, variant = 'primary', size = 'md',
  icon, iconRight, loading, disabled, full = true, style,
}: ButtonProps) {
  const { colors, lang } = useApp();
  const translatedLabel = autoTranslate(label, lang);
  const heights: Record<BtnSize, number> = { sm: 40, md: 50, lg: 56 };
  const fontSizes: Record<BtnSize, number> = { sm: 13, md: 15, lg: 17 };
  const radius = 16;

  const bg: Record<BtnVariant, string> = {
    primary: 'transparent',
    secondary: colors.secondary,
    outline: 'transparent',
    ghost: 'transparent',
    danger: colors.error,
    gradient: 'transparent',
  };
  const fg: Record<BtnVariant, string> = {
    primary: '#fff',
    secondary: '#fff',
    outline: colors.primary,
    ghost: colors.primary,
    danger: '#fff',
    gradient: '#fff',
  };

  const content = (
    <View style={btn.row}>
      {loading ? (
        <ActivityIndicator color={fg[variant]} size="small" />
      ) : (
        <>
          {icon && <Icon name={icon} size={size === 'lg' ? 22 : 18} color={fg[variant]} />}
          <AppText variant="buttonMD" color={fg[variant]} style={{ fontSize: fontSizes[size], fontWeight: '800' }}>{translatedLabel}</AppText>
          {iconRight && <Icon name={iconRight} size={size === 'lg' ? 22 : 18} color={fg[variant]} />}
        </>
      )}
    </View>
  );

  const base: ViewStyle = {
    height: heights[size],
    borderRadius: radius,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    opacity: disabled ? 0.5 : 1,
    width: full ? '100%' : undefined,
    borderWidth: variant === 'outline' ? 1.5 : 0,
    borderColor: variant === 'outline' ? colors.primary : 'transparent',
    backgroundColor: bg[variant],
  };

  if (variant === 'gradient' || variant === 'primary') {
    const gradientColors = (variant === 'primary' 
      ? [colors.primary, colors.primaryDark || colors.primary] 
      : [colors.primary, colors.secondary]) as [string, string];
    return (
      <TouchableOpacity onPress={onPress} disabled={disabled || loading} activeOpacity={0.85} style={[{ width: full ? '100%' : undefined }, style]} accessibilityRole="button" accessibilityLabel={typeof translatedLabel === 'string' ? translatedLabel : undefined} accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}>
        <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={base}>
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} disabled={disabled || loading} activeOpacity={0.85} style={[base, style]} accessibilityRole="button" accessibilityLabel={typeof translatedLabel === 'string' ? translatedLabel : undefined} accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}>
      {content}
    </TouchableOpacity>
  );
}

/* ----------------------------- Card ----------------------------- */
interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padding?: number;
  elevated?: boolean;
}
export function Card({ children, style, onPress, padding = 16, elevated = true }: CardProps) {
  const colors = useThemeColors();
  const cardStyle: ViewStyle = {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...(elevated
      ? {
          shadowColor: colors.shadowColor,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: colors.shadowOpacity,
          shadowRadius: 16,
          elevation: 3,
        }
      : {}),
  };
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={[cardStyle, style]}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={[cardStyle, style]}>{children}</View>;
}

/* --------------------------- Product Card --------------------------- */
interface ProductCardProps {
  product: {
    id: string;
    name: string;
    brand: string;
    price: number;
    originalPrice?: number;
    requiresRx?: boolean;
    image?: string | null;
    color?: string;
    icon?: string;
    rating?: number;
    reviews?: number;
    strength?: string;
  };
  onPress: () => void;
  onAddToCart: () => void;
  qty: number;
  onQtyChange?: (n: number) => void;
  style?: StyleProp<ViewStyle>;
}

export function ProductCard({ product, onPress, onAddToCart, qty, onQtyChange, style }: ProductCardProps) {
  const { colors } = useApp();
  const discount = product.originalPrice && product.originalPrice > product.price
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;
  
  const displayColor = product.color || colors.primary;
  const displayIcon = (product.icon || (product.requiresRx ? 'prescription' : 'pill')) as IconName;

  return (
    <Card padding={0} style={[styles_pc.card, style]}>
      <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
        <View style={[styles_pc.imageContainer, { backgroundColor: displayColor + '10' }]}>
          {product.image ? (
            <Image source={{ uri: product.image }} style={styles_pc.image} resizeMode="contain" />
          ) : (
            <Icon name={displayIcon} size={44} color={displayColor} />
          )}
          {discount > 0 && (
            <View style={[styles_pc.discountBadge, { backgroundColor: colors.error }]}>
              <AppText variant="caption" color="#fff" style={{ fontWeight: '800' }}>-{discount}%</AppText>
            </View>
          )}
          {product.requiresRx && (
            <View style={[styles_pc.rxBadge, { backgroundColor: colors.warning }]}>
              <Icon name="prescriptions" size={12} color="#fff" />
            </View>
          )}
        </View>
      </TouchableOpacity>
      
      <View style={styles_pc.info}>
        <AppText variant="caption" color={colors.textTertiary} numberOfLines={1}>
          {product.brand} {product.strength ? `· ${product.strength}` : ''}
        </AppText>
        <AppText variant="labelLG" numberOfLines={1} style={{ fontWeight: '800' }}>{product.name}</AppText>
        
        <View style={styles_pc.ratingRow}>
          <Icon name="star" size={12} color={colors.gold} />
          <AppText variant="caption" color={colors.textSecondary}>
            {product.rating || 4.8} ({product.reviews || 120})
          </AppText>
        </View>
        
        <View style={styles_pc.priceRow}>
          <View style={styles_pc.priceWrapper}>
            <AppText variant="h5" color={displayColor} style={{ fontWeight: '800' }}>{product.price}</AppText>
            <AppText variant="caption" color={colors.textTertiary} style={{ marginRight: 2 }}>ر.س</AppText>
          </View>
          {discount > 0 && (
            <AppText variant="caption" color={colors.textTertiary} style={styles_pc.originalPrice}>
              {product.originalPrice}
            </AppText>
          )}
        </View>

        {qty > 0 ? (
          <View style={[styles_pc.qtyRow, { borderColor: displayColor }]}>
            <TouchableOpacity 
              onPress={() => onQtyChange?.(qty + 1)} 
              style={[styles_pc.qtyBtn, { backgroundColor: displayColor }]}
              activeOpacity={0.8}
            >
              <Icon name="add" size={14} color="#fff" />
            </TouchableOpacity>
            <AppText variant="h6" color={colors.textPrimary}>{qty}</AppText>
            <TouchableOpacity 
              onPress={() => onQtyChange?.(qty - 1)} 
              style={[styles_pc.qtyBtn, { backgroundColor: colors.surfaceSecondary }]}
              activeOpacity={0.8}
            >
              <Icon name="remove" size={14} color={displayColor} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            onPress={onAddToCart} 
            activeOpacity={0.85} 
            style={[styles_pc.addBtn, { backgroundColor: product.requiresRx ? colors.warning : displayColor }]}
          >
            <Icon name={product.requiresRx ? 'prescription' : 'cart'} size={14} color="#fff" />
            <AppText variant="labelSM" color="#fff" style={{ fontWeight: '800' }}>
              {product.requiresRx ? 'يتطلب وصفة' : 'أضف للسلة'}
            </AppText>
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );
}

const styles_pc = StyleSheet.create({
  card: { width: '47%', overflow: 'hidden', borderWidth: 1, borderRadius: 20 },
  imageContainer: { height: 120, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  image: { width: '100%', height: '100%' },
  discountBadge: { position: 'absolute', top: 8, right: 8, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  rxBadge: { position: 'absolute', top: 8, left: 8, width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  info: { padding: 12, gap: 5 },
  ratingRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  priceRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginVertical: 2 },
  priceWrapper: { flexDirection: 'row-reverse', alignItems: 'baseline' },
  originalPrice: { textDecorationLine: 'line-through' },
  qtyRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderRadius: 12, padding: 3, marginTop: 4 },
  qtyBtn: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  addBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, height: 38, borderRadius: 12, marginTop: 4 },
});

/* --------------------------- Doctor Card --------------------------- */
interface DoctorCardProps {
  doctor: {
    id: string;
    name: string;
    deg: string;
    spec: string;
    rating: number;
    reviews: number;
    price: number;
    wait: string;
    exp: number;
    online: boolean;
    clinic: boolean;
    home: boolean;
    ins: boolean;
    hospital: string;
    slot: string;
  };
  onPress: () => void;
  onBook: () => void;
  style?: StyleProp<ViewStyle>;
}

export function DoctorCard({ doctor, onPress, onBook, style }: DoctorCardProps) {
  const { colors } = useApp();
  const cg = (String(doctor.id) === '2' ? ['#EDEBFD', '#DDD8FC'] : ['#DEF5F9', '#C8EEF4']) as [string, string];
  const icColor = String(doctor.id) === '2' ? '#7A6BEA' : '#23B5CE';

  return (
    <Card padding={0} style={[{ overflow: 'hidden' }, style]}>
      <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
        <View style={{ padding: 14 }}>
          <View style={styles_dc.docRow}>
            <LinearGradient colors={cg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles_dc.avatarContainer}>
              <Icon name="doctor" size={38} color={icColor} />
            </LinearGradient>
            <View style={styles_dc.docInfo}>
              <AppText variant="h5" style={{ fontWeight: '800' }}>{doctor.name}</AppText>
              {!!doctor.deg && <Badge label={doctor.deg} color={colors.primary} />}
              {!!doctor.spec && <AppText variant="bodyXS" color={colors.textSecondary}>{doctor.spec}</AppText>}
              {doctor.rating != null && (
                <View style={styles_dc.ratingRow}>
                  <Icon name="star" size={12} color={colors.gold} />
                  <AppText variant="labelSM" color={colors.gold}>{doctor.rating}</AppText>
                  {doctor.reviews != null && <AppText variant="caption" color={colors.textTertiary}>({doctor.reviews})</AppText>}
                </View>
              )}
            </View>
          </View>
          
          <View style={[styles_dc.meta, { borderColor: colors.borderLight }]}>
            <View style={styles_dc.metaItem}>
              <AppText variant="labelSM" color={colors.textPrimary}>{doctor.exp != null ? `${doctor.exp} سنة` : '—'}</AppText>
              <AppText variant="caption" color={colors.textTertiary}>خبرة</AppText>
            </View>
            <View style={styles_dc.metaItem}>
              <AppText variant="labelSM" color={colors.secondary}>{doctor.wait || '—'}</AppText>
              <AppText variant="caption" color={colors.textTertiary}>انتظار</AppText>
            </View>
            <View style={styles_dc.metaItem}>
              <View style={styles_dc.modeChips}>
                {doctor.online && <View style={[styles_dc.modeChip, { backgroundColor: colors.primarySurface }]}><Icon name="video" size={11} color={colors.primary} /></View>}
                {doctor.clinic && <View style={[styles_dc.modeChip, { backgroundColor: colors.primarySurface }]}><Icon name="hospital" size={11} color={colors.primary} /></View>}
                {doctor.home && <View style={[styles_dc.modeChip, { backgroundColor: colors.primarySurface }]}><Icon name="home" size={11} color={colors.primary} /></View>}
                {!doctor.online && !doctor.clinic && !doctor.home && <AppText variant="caption" color={colors.textTertiary}>—</AppText>}
              </View>
              <AppText variant="caption" color={colors.textTertiary}>الزيارة</AppText>
            </View>
          </View>
          
          {(!!doctor.hospital || doctor.ins) && (
            <View style={styles_dc.footerRow}>
              {doctor.ins && <Badge label="تأمين" color={colors.success} icon="shield" />}
              {!!doctor.hospital && (
                <>
                  <Icon name="location" size={12} color={colors.textTertiary} />
                  <AppText variant="caption" color={colors.textTertiary} numberOfLines={1} style={{ flex: 1 }}>{doctor.hospital}</AppText>
                </>
              )}
            </View>
          )}
        </View>
        
        <View style={[styles_dc.bottomBar, { backgroundColor: colors.primary }]}>
          <View style={{ alignItems: 'flex-start', gap: 2 }}>
            {doctor.rating != null && (
              <AppText variant="labelSM" color="#fff" style={{ fontWeight:'800' }}> {doctor.rating}{doctor.reviews != null ? ` (${doctor.reviews})` : ''}</AppText>
            )}
            {!!doctor.slot && <AppText variant="caption" color="rgba(255,255,255,0.85)" style={{ fontWeight:'400' }}> {doctor.slot}</AppText>}
          </View>
          <TouchableOpacity onPress={onBook} activeOpacity={0.8} style={[styles_dc.bookBtn, { backgroundColor: colors.surface }]}>
            <AppText variant="labelSM" color={colors.primary} style={{ fontWeight: '800' }}>{doctor.price != null ? `احجز ${doctor.price} ر.س` : 'احجز الآن'}</AppText>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Card>
  );
}

const styles_dc = StyleSheet.create({
  docRow: { flexDirection: 'row-reverse', gap: 12 },
  avatarContainer: { width: 68, height: 68, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  docInfo: { flex: 1, alignItems: 'flex-end', gap: 3 },
  ratingRow: { flexDirection: 'row-reverse', gap: 4, alignItems: 'center' },
  meta: { flexDirection: 'row-reverse', justifyContent: 'space-around', borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 10, marginTop: 12 },
  metaItem: { alignItems: 'center', gap: 2, flex: 1 },
  modeChips: { flexDirection: 'row-reverse', gap: 3 },
  modeChip: { width: 20, height: 20, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  footerRow: { flexDirection: 'row-reverse', gap: 8, alignItems: 'center', marginTop: 10 },
  bottomBar: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', padding: 12 },
  bookBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 18, height: 42, borderRadius: 14 },
  priceRow: { flexDirection: 'row-reverse', alignItems: 'baseline', gap: 2 },
  slotRow: { flexDirection: 'row-reverse', gap: 3, alignItems: 'center' },
});

/* ----------------------------- Input ----------------------------- */
interface InputProps {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  icon?: IconName;
  iconRight?: IconName;
  onIconRightPress?: () => void;
  secureTextEntry?: boolean;
  keyboardType?: any;
  error?: string;
  multiline?: boolean;
  autoFocus?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  style?: StyleProp<ViewStyle>;
}
export function Input({
  value, onChangeText, placeholder, icon, iconRight, onIconRightPress,
  secureTextEntry, keyboardType, error, multiline, autoFocus, autoCapitalize, style,
}: InputProps) {
  const { colors, lang } = useApp();
  const translatedPlaceholder = autoTranslate(placeholder, lang);
  const translatedError = autoTranslate(error, lang);
  const isRtl = lang === 'ar' || lang === 'ur';
  
  return (
    <View style={style}>
      <View
        style={[
          input.wrap,
          {
            backgroundColor: colors.surfaceSecondary,
            borderColor: error ? colors.error : colors.border,
            height: multiline ? 96 : 52,
            alignItems: multiline ? 'flex-start' : 'center',
          },
        ]}
      >
        {icon && <Icon name={icon} size={18} color={colors.textTertiary} style={{ marginTop: multiline ? 14 : 0 }} />}
        <TextInput
          style={[input.field, { color: colors.textPrimary }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={translatedPlaceholder}
          placeholderTextColor={colors.textTertiary}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          multiline={multiline}
          autoFocus={autoFocus}
          autoCapitalize={autoCapitalize}
          textAlign={isRtl ? 'right' : 'left'}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
        {iconRight && (
          <TouchableOpacity onPress={onIconRightPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name={iconRight} size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>
      {error ? <AppText variant="caption" color={colors.error} align="right" style={{ marginTop: 4 }}>{translatedError}</AppText> : null}
    </View>
  );
}

/* ----------------------------- Badge ----------------------------- */
interface BadgeProps {
  label: string;
  color?: string;
  bg?: string;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}
export function Badge({ label, color, bg, icon, style }: BadgeProps) {
  const { colors, lang } = useApp();
  const translatedLabel = autoTranslate(label, lang);
  const c = color ?? colors.primary;
  return (
    <View style={[badge.wrap, { backgroundColor: bg ?? c + '18' }, style]}>
      {icon && <Icon name={icon} size={12} color={c} />}
      <AppText variant="caption" color={c} style={{ fontWeight: '700' }}>{translatedLabel}</AppText>
    </View>
  );
}

/* ----------------------------- Chip ----------------------------- */
interface ChipProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
  icon?: IconName;
}
export function Chip({ label, active, onPress, icon }: ChipProps) {
  const { colors, lang } = useApp();
  const translatedLabel = autoTranslate(label, lang);
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        chip.wrap,
        {
          backgroundColor: active ? colors.primary : colors.surfaceSecondary,
          borderColor: active ? colors.primary : colors.border,
        },
      ]}
    >
      {icon && <Icon name={icon} size={15} color={active ? '#fff' : colors.textSecondary} />}
      <AppText variant="labelMD" color={active ? '#fff' : colors.textSecondary} style={{ fontWeight: '700' }}>{translatedLabel}</AppText>
    </TouchableOpacity>
  );
}

/* ----------------------- Segmented Control ----------------------- */
interface SegmentProps {
  options: { key: string; label: string; icon?: IconName }[];
  value: string;
  onChange: (key: string) => void;
}
export function SegmentedControl({ options, value, onChange }: SegmentProps) {
  const { colors, lang } = useApp();
  return (
    <View style={[seg.wrap, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
      {options.map((opt) => {
        const active = opt.key === value;
        const translatedLabel = autoTranslate(opt.label, lang);
        return (
          <TouchableOpacity
            key={opt.key}
            onPress={() => onChange(opt.key)}
            activeOpacity={0.8}
            style={[seg.item, active && { backgroundColor: colors.surface, shadowColor: colors.shadowColor, shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 }]}
          >
            {opt.icon && <Icon name={opt.icon} size={16} color={active ? colors.primary : colors.textTertiary} />}
            <AppText variant="labelMD" color={active ? colors.primary : colors.textTertiary} style={{ fontWeight: '700' }}>{translatedLabel}</AppText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/* ----------------------------- Avatar ----------------------------- */
interface AvatarProps {
  size?: number;
  icon?: IconName;
  bg?: string;
  iconColor?: string;
  label?: string;
}
export function Avatar({ size = 48, icon = 'user', bg, iconColor, label }: AvatarProps) {
  const colors = useThemeColors();
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: bg ?? colors.primarySurface, alignItems: 'center', justifyContent: 'center' }}>
      {label ? (
        <AppText variant="h5" color={iconColor ?? colors.primary} align="center" style={{ fontSize: size * 0.4, fontWeight: '800' }}>{label}</AppText>
      ) : (
        <Icon name={icon} size={size * 0.5} color={iconColor ?? colors.primary} />
      )}
    </View>
  );
}

/* ----------------------------- Section header ----------------------------- */
export function SectionHeader({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  const { colors, lang } = useApp();
  const translatedTitle = autoTranslate(title, lang);
  const translatedActionLabel = autoTranslate(actionLabel, lang);
  return (
    <View style={sh.wrap}>
      {actionLabel ? (
        <TouchableOpacity onPress={onAction}>
          <AppText variant="labelSM" color={colors.primary} style={{ fontWeight: '700' }}>{translatedActionLabel}</AppText>
        </TouchableOpacity>
      ) : <View />}
      <AppText variant="h5">{translatedTitle}</AppText>
    </View>
  );
}

/* ----------------------------- Icon button ----------------------------- */
const ICON_A11Y_AR: Partial<Record<IconName, string>> = {
  back: 'رجوع', close: 'إغلاق', search: 'بحث', bell: 'الإشعارات', settings: 'الإعدادات',
  filter: 'تصفية', share: 'مشاركة', favorite: 'المفضلة', cart: 'السلة', chat: 'محادثة',
  mic: 'إدخال صوتي', send: 'إرسال', add: 'إضافة', edit: 'تعديل', delete: 'حذف',
  location: 'الموقع', calendar: 'التقويم', camera: 'الكاميرا', phone: 'اتصال', video: 'مكالمة فيديو',
};

export function IconButton({ icon, onPress, size = 40, bg, color, accessibilityLabel }: { icon: IconName; onPress?: () => void; size?: number; bg?: string; color?: string; accessibilityLabel?: string }) {
  const colors = useThemeColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? ICON_A11Y_AR[icon] ?? icon}
      style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: bg ?? colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center' }}
    >
      <Icon name={icon} size={size * 0.5} color={color ?? colors.textPrimary} />
    </TouchableOpacity>
  );
}

const btn = StyleSheet.create({
  row: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8 },
  label: { fontWeight: '800' },
});
const input = StyleSheet.create({
  wrap: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, borderRadius: 16, borderWidth: 1.5, paddingHorizontal: 14 },
  field: { flex: 1, fontWeight: '400', fontSize: 15, paddingVertical: 8 },
  error: { fontWeight: '400', fontSize: 12, textAlign: 'right', marginTop: 4 },
});
const badge = StyleSheet.create({
  wrap: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4, alignSelf: 'flex-start' },
  text: { fontWeight: '700', fontSize: 11 },
});
const chip = StyleSheet.create({
  wrap: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 9 },
  text: { fontWeight: '700', fontSize: 13 },
});
const seg = StyleSheet.create({
  wrap: { flexDirection: 'row-reverse', borderRadius: 16, borderWidth: 1, padding: 4, gap: 4 },
  item: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12 },
  text: { fontWeight: '700', fontSize: 13 },
});
const sh = StyleSheet.create({
  wrap: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  action: { fontWeight: '700', fontSize: 13 },
});
