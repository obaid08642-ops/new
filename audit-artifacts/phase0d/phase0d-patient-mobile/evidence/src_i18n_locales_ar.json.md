# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/i18n/locales/ar.json`
- **Member SHA-256:** `ae2bbb0fef3d151b6f019bb5e46a569fd7b1336312e8d42caf0a239b3cbd681a`
- **Line count:** 117
- **Read range:** `1-117`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `7: "cancel": "إلغاء",`
- `45: "cart.s0": " } ]}>\n          <Text style={[styles.totalLabel, { color: colors.t2 } ]}>المجموع التقديري</Text>\n          <Text style={[styles.totalValue, { color: colors.n } ]}>{subtotal.toFixed(2)} <Text style={{ fontSize: 14, color: colo`
- `48: "cart.s3": ", color: colors.n, fontSize: 24 }}>arrow_forward</Text>\n        </TouchableOpacity>\n        <Text style={[styles.headerTitle, { color: colors.n } ]}>سلة الطلبات ({items.length})</Text>\n        <TouchableOpacity onPress={() =>`
- `49: "cart.s4": ", color: colors.t3, fontSize: 80 }}>remove_shopping_cart</Text>\n        <Text style={[styles.emptyTitle, { color: colors.n } ]}>السلة فارغة</Text>\n        <Text style={[styles.emptySubtitle, { color: colors.t2 } ]}>لم تقم بإضا`
- `52: "cart.s7": ", fontSize: 15 }}>استشارة طبيب للحصول عليها</Text>\n                </TouchableOpacity>\n              </View>\n            )}\n\n            {prescriptionUrl && (\n              <TouchableOpacity onPress={() => setPrescriptionU`
- `67: "checkout.s0": " } ]}>طريقة الاستلام</Text>\n        {hasOnlineExclusive && (\n          <View style={{ backgroundColor: ",`
- `68: "checkout.s1": " } ]}>طريقة الدفع</Text>\n        {[\n          { id: ",`
- `69: "checkout.s2": " } ]}>ملخص الطلب</Text>\n        <View style={[styles.summaryCard, { backgroundColor: colors.s, borderColor: colors.bd } ]}>\n          {items.map(item => (\n            <View key={item.id} style={[styles.summaryRow, { flexD`
- `70: "checkout.s3": " }}>\n              سلتك تحتوي منتجات \"حصري أونلاين\" — الاستلام من الصيدلية فقط\n            </Text>\n          </View>\n        )}\n        <View style={[styles.modeRow, { flexDirection: isRTL ? ",`
- `71: "checkout.s4": " }}>{total.toFixed(2)} ر.س</Text>\n          </View>\n        </View>\n\n      </ScrollView>\n\n      {/* ─── Confirm Button ──────────────────────────────────────────────────── */}\n      <View style={[styles.footer, { back`
- `72: "checkout.s5": " }}>تغيير</Text>\n              </TouchableOpacity>\n            </View>\n          </View>\n        )}\n\n        {/* ─── Payment Mode ────────────────────────────────────────────────────── */}\n        <Text style={[styles`
- `73: "checkout.s6": ", color: colors.n, fontSize: 24 }}>arrow_forward</Text>\n        </TouchableOpacity>\n        <Text style={[styles.headerTitle, { color: colors.n } ]}>إتمام الطلب</Text>\n        <View style={{ width: 44 }}/>\n      </View>\`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `7: "cancel": "إلغاء",`
- `9: "loading": "جاري التحميل...",`
- `49: "cart.s4": ", color: colors.t3, fontSize: 80 }}>remove_shopping_cart</Text>\n        <Text style={[styles.emptyTitle, { color: colors.n } ]}>السلة فارغة</Text>\n        <Text style={[styles.emptySubtitle, { color: colors.t2 } ]}>لم تقم بإضا`
- `99: "pharm.s7": "} />\n      <FlatList\n        data={filtered}\n        keyExtractor={item => item.id.toString()}\n        numColumns={2}\n        columnWrapperStyle={styles.cardsGrid}\n        contentContainerStyle={{ paddingBottom: 120, padd`
### payment_insurance_relevance
- `45: "cart.s0": " } ]}>\n          <Text style={[styles.totalLabel, { color: colors.t2 } ]}>المجموع التقديري</Text>\n          <Text style={[styles.totalValue, { color: colors.n } ]}>{subtotal.toFixed(2)} <Text style={{ fontSize: 14, color: colo`
- `46: "cart.s1": " } ]}>{(item.price * item.qty).toFixed(2)} ر.س</Text>\n\n              {/* Qty Controls */}\n              <View style={[styles.qtyRow, { flexDirection: isRTL ? ",`
- `54: "cart.s9": ", fontSize: 15 }}>لم تجد دواءك؟ أضف صنف يدوياً</Text>\n        </TouchableOpacity>\n\n      </ScrollView>\n\n      {/* ─── Footer ─────────────────────────────────────────────────────────── */}\n      <View style={[styles.footer`
- `69: "checkout.s2": " } ]}>ملخص الطلب</Text>\n        <View style={[styles.summaryCard, { backgroundColor: colors.s, borderColor: colors.bd } ]}>\n          {items.map(item => (\n            <View key={item.id} style={[styles.summaryRow, { flexD`
- `71: "checkout.s4": " }}>{total.toFixed(2)} ر.س</Text>\n          </View>\n        </View>\n\n      </ScrollView>\n\n      {/* ─── Confirm Button ──────────────────────────────────────────────────── */}\n      <View style={[styles.footer, { back`
- `72: "checkout.s5": " }}>تغيير</Text>\n              </TouchableOpacity>\n            </View>\n          </View>\n        )}\n\n        {/* ─── Payment Mode ────────────────────────────────────────────────────── */}\n        <Text style={[styles`
- `74: "checkout.s7": ", fontSize: 13, color: colors.n }}>\n                {(item.price * item.qty).toFixed(2)} ر.س\n              </Text>\n            </View>\n          ))}\n          <View style={[styles.divider, { backgroundColor: colors.bd }`
- `76: "checkout.s9": ", fontSize: 16 }}>تأكيد الطلب ({total.toFixed(2)} ر.س)</Text>\n            </>\n          )}\n        </TouchableOpacity>\n      </View>\n    </View>\n  );\n}\n\nconst styles = StyleSheet.create({\n  container: { flex: 1 },\`
- `92: "pharm.s0": " } ]}>{(m.price || m.p || 0).toFixed(2)}</Text>\n                        <Text style={[styles.currency, { color: colors.t3 } ]}>ر.س</Text>\n                      </View>\n\n                      {qty > 0 ? (\n                  `
- `94: "pharm.s2": " }}>\n                  <Text style={styles.bannerTitle}>وصفة طبية</Text>\n                  <Text style={styles.bannerSub}>ارفع روشتة واطلب</Text>\n                </View>\n                <View style={styles.bannerArrow}>\n  `
- `96: "pharm.s4": " }}>طلب يدوي</Text>\n              </TouchableOpacity>\n            </View>\n          )\n        }\n        renderItem={({ item: m }) => {\n          const qty = getItemQty(m.id);\n          return (\n                  <Toucha`
- `98: "pharm.s6": ", gap: 10 } ]}>\n            {/* وصفة طبية */}\n            <TouchableOpacity\n              style={[styles.bannerCard, { flex: 1, overflow: ",`
### error_empty_loading_retry_cancel
- `7: "cancel": "إلغاء",`
- `9: "loading": "جاري التحميل...",`
- `49: "cart.s4": ", color: colors.t3, fontSize: 80 }}>remove_shopping_cart</Text>\n        <Text style={[styles.emptyTitle, { color: colors.n } ]}>السلة فارغة</Text>\n        <Text style={[styles.emptySubtitle, { color: colors.t2 } ]}>لم تقم بإضا`
- `99: "pharm.s7": "} />\n      <FlatList\n        data={filtered}\n        keyExtractor={item => item.id.toString()}\n        numColumns={2}\n        columnWrapperStyle={styles.cardsGrid}\n        contentContainerStyle={{ paddingBottom: 120, padd`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
