// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, FlatList, TextInput, Image, ActivityIndicator, Platform, Alert, StatusBar, KeyboardAvoidingView, Modal, I18nManager, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../src/components/ui';
import { useApp } from '../../src/context/AppContext';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import Animated, { FadeIn, ZoomIn, SlideInUp } from 'react-native-reanimated';
import { useDiagnosticsCart } from '../../src/context/DiagnosticsCartContext';
import { apiFetch } from '../../src/utils/api';

const { width } = Dimensions.get('window');

type ApprovalState = 'pending' | 'full' | 'partial' | 'rejected';

export default function InsuranceApproval() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const labName = (params.labName as string) || 'المختبر المختار';
  const visitType = (params.visitType as string) || 'clinic';
  
  const { colors } = useApp();
  
  const [status, setStatus] = useState<ApprovalState>('pending');
  const [approvalDetails, setApprovalDetails] = useState<any>(null);
  const [optedInCashItems, setOptedInCashItems] = useState<string[]>([]); // Array of item IDs that user opted to pay cash for
  const orderId = params.orderId as string;

  useEffect(() => {
    if (!orderId) return;

    let intervalId: any;

    const fetchOrder = async () => {
      try {
        const res = await apiFetch(`/orders/${orderId}`);
        const data = res?.data || res;
        
        if (data.status === 'APPROVED_FULL' || data.status === 'APPROVED_PARTIAL' || data.status === 'REJECTED') {
          let newStatus = 'full';
          if (data.status === 'APPROVED_PARTIAL') newStatus = 'partial';
          if (data.status === 'REJECTED') newStatus = 'rejected';
          
          setStatus(newStatus as ApprovalState);
          setApprovalDetails({
            totalAmount: data.totalAmount || 0,
            coveragePercent: data.coveragePercent || 0,
            coveredAmount: data.coveredAmount || 0,
            copayAmount: data.copayAmount || 0,
            items: data.items || [] 
          });
          clearInterval(intervalId);
        }
      } catch (err) {
        console.error(err);
      }
    };

    intervalId = setInterval(() => {
      fetchOrder();
    }, 3000);

    return () => clearInterval(intervalId);
  }, [orderId]);

  const toggleCashItem = async (item: any) => {
    const isOptedIn = optedInCashItems.includes(item.id || item.name);
    const newOptIn = !isOptedIn;
    const identifier = item.id || item.name;
    
    setOptedInCashItems(prev => 
      newOptIn ? [...prev, identifier] : prev.filter(i => i !== identifier)
    );

    try {
      if (orderId && item.id) {
        await apiFetch(`/orders/${orderId}/items/${item.id}/opt-in-cash`, {
          method: 'PATCH',
          body: JSON.stringify({ optIn: newOptIn })
        });
      }
    } catch (e) {
      console.error(e);
      setOptedInCashItems(prev => 
        !newOptIn ? [...prev, identifier] : prev.filter(i => i !== identifier)
      );
    }
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'full': return { icon: 'check-decagram', color: '#4CAF50', title: 'تمت الموافقة بنجاح!', desc: `من قبل ${labName}` };
      case 'partial': return { icon: 'shield-half-full', color: '#FF9800', title: 'موافقة جزئية', desc: 'تمت الموافقة على بعض التحاليل فقط' };
      case 'rejected': return { icon: 'close-octagon', color: '#F44336', title: 'تم الرفض', desc: 'عذراً، التغطية التأمينية لا تشمل هذه التحاليل' };
      default: return null;
    }
  };

  const config = getStatusConfig();
  
  // Calculate Hybrid Total
  let hybridCashAdditions = 0;
  if (approvalDetails) {
    approvalDetails.items.forEach((item: any) => {
      const identifier = item.id || item.name;
      if (item.status === 'مرفوض' && optedInCashItems.includes(identifier)) {
        hybridCashAdditions += item.price;
      }
    });
  }

  const finalTotalToPay = approvalDetails ? (approvalDetails.copayAmount + hybridCashAdditions + (visitType === 'home' ? 50 : 0)) : 0;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background } ]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={[styles.topHeader, { backgroundColor: colors.background } ]}>
        <View style={{ width: 40 }}/>
        <AppText style={{ fontSize: 18, fontWeight: 'bold', color: colors.textPrimary }}>حالة الموافقة</AppText>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Icon name={I18nManager.isRTL ? 'arrow-right' : 'arrow-left'} size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {status === 'pending' && (
          <Animated.View entering={FadeIn} style={styles.centerContainer}>
            <View style={[styles.pulseCircle, { borderColor: colors.primary, backgroundColor: `${colors.primary}15` }]} >
              <Icon name="file-clock" size={48} color={colors.primary} />
            </View>
            <AppText style={{ fontSize: 20, fontWeight: 'bold', color: colors.textPrimary, marginTop: 24, textAlign: 'center' }}>
              تم إرسال الطلب إلى {labName}
            </AppText>
            <AppText style={{ fontSize: 14, color: colors.textSecondary, marginTop: 12, textAlign: 'center', lineHeight: 22 }}>
              يقوم المختبر الآن بمراجعة الوصفة المرفوعة وإصدار الموافقة وتحديد نسبة التحمل.
            </AppText>
          </Animated.View>
        )}

        {status !== 'pending' && config && approvalDetails && (
          <Animated.View entering={SlideInUp.duration(500)}>
            
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: `${config.color}15`, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Icon name={config.icon as any} size={48} color={config.color} />
              </View>
              <AppText style={{ fontSize: 22, fontWeight: 'bold', color: config.color }}>{config.title}</AppText>
              <AppText style={{ fontSize: 14, color: colors.textSecondary, marginTop: 8 }}>{config.desc}</AppText>
            </View>

            {/* Items */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border } ]}>
              <AppText variant="h3" style={{ marginBottom: 16, textAlign: I18nManager.isRTL ? 'right' : 'left' }}>تفاصيل التغطية</AppText>
              
              {approvalDetails.items.map((item: any, idx: number) => {
                const isCovered = item.status === 'مغطى';
                const isOptedIn = optedInCashItems.includes(item.id || item.name);
                
                return (
                  <View key={idx} style={{ paddingVertical: 12, borderBottomWidth: idx < approvalDetails.items.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
                    <View style={{ flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', flex: 1 }}>
                        <Icon name={isCovered ? "shield-check" : "shield-remove"} size={18} color={isCovered ? "#4CAF50" : "#F44336"} style={{ marginRight: I18nManager.isRTL ? 0 : 8, marginLeft: I18nManager.isRTL ? 8 : 0 }}/>
                        <AppText style={{ fontWeight: 'bold', flexShrink: 1, textAlign: I18nManager.isRTL ? 'left' : 'right' }}>{item.name}</AppText>
                      </View>
                      <AppText style={{ color: colors.textSecondary }}>{item.price} ر.س</AppText>
                    </View>
                    
                    {/* Rejection / Hybrid Billing Option */}
                    {!isCovered && status !== 'rejected' && (
                      <View style={{ marginTop: 8, padding: 12, backgroundColor: '#FFEBEE', borderRadius: 12 }}>
                        <AppText style={{ fontSize: 12, color: '#D32F2F', textAlign: I18nManager.isRTL ? 'right' : 'left', marginBottom: 8 }}>
                          سبب الرفض: {item.rejectReason}
                        </AppText>
                        
                        {/* Checkbox for Hybrid Billing */}
                        <TouchableOpacity 
                          style={{ flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center' }} onPress={() => toggleCashItem(item)}
                        >
                          <Icon name={isOptedIn ? "checkbox-marked" : "checkbox-blank-outline"} size={20} color={isOptedIn ? colors.primary : colors.textSecondary} />
                          <AppText style={{ fontSize: 13, color: colors.textPrimary, marginLeft: I18nManager.isRTL ? 0 : 8, marginRight: I18nManager.isRTL ? 8 : 0 }}>
                            أرغب بدفع هذا التحليل نقداً (+ {item.price} ر.س)
                          </AppText>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Financial Summary */}
            {status !== 'rejected' && (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 16 } ]}>
                <View style={styles.finRow}>
                  <AppText style={{ color: colors.textSecondary }}>إجمالي التكلفة</AppText>
                  <AppText style={{ fontWeight: 'bold' }}>{approvalDetails.totalAmount} ر.س</AppText>
                </View>
                <View style={styles.finRow}>
                  <AppText style={{ color: '#4CAF50' }}>يغطيه التأمين ({approvalDetails.coveragePercent}%)</AppText>
                  <AppText style={{ fontWeight: 'bold', color: '#4CAF50' }}>- {approvalDetails.coveredAmount} ر.س</AppText>
                </View>
                
                {visitType === 'home' && (
                  <View style={styles.finRow}>
                    <AppText style={{ color: colors.textSecondary }}>رسوم الزيارة المنزلية</AppText>
                    <AppText style={{ fontWeight: 'bold' }}>+ 50 ر.س</AppText>
                  </View>
                )}
                
                {hybridCashAdditions > 0 && (
                  <View style={styles.finRow}>
                    <AppText style={{ color: colors.primary }}>تحاليل إضافية (نقداً)</AppText>
                    <AppText style={{ fontWeight: 'bold', color: colors.primary }}>+ {hybridCashAdditions} ر.س</AppText>
                  </View>
                )}

                <View style={[styles.finRow, { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border } ]}>
                  <AppText style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary }}>المبلغ المطلوب دفعه</AppText>
                  <AppText style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary }}>{finalTotalToPay} ر.س</AppText>
                </View>
              </View>
            )}

          </Animated.View>
        )}

      </ScrollView>

      {status !== 'pending' && (
        <Animated.View entering={SlideInUp.duration(400)} style={[styles.floatingBottom, { backgroundColor: colors.surface, borderTopColor: colors.border } ]}>
          {status === 'rejected' ? (
            <View style={{ flexDirection: 'column', gap: 12 }}>
              <TouchableOpacity 
                style={[styles.confirmBtn, { backgroundColor: colors.primary }]} 
                onPress={() => {
                  (router.push as any)({ 
                    pathname: '/diagnostics/checkout',
                    params: { visitType, isInsurance: 'false', total: approvalDetails.totalAmount + (visitType === 'home' ? 50 : 0) }
                  });
                }}
              >
                <AppText style={{ color: '#fff', fontSize: 15, fontWeight: 'bold' }}>تنفيذ الطلب على حسابي الخاص</AppText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.confirmBtn, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.primary }]} 
                onPress={() => (router.push as any)('/consultations')}
              >
                <AppText style={{ color: colors.primary, fontSize: 15, fontWeight: 'bold' }}>اطلب استشارة طبية</AppText>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={[styles.confirmBtn, { backgroundColor: colors.primary }]} 
              onPress={() => {
                (router.push as any)({ 
                  pathname: '/diagnostics/checkout',
                  params: { visitType, isInsurance: 'hybrid', copay: finalTotalToPay }
                });
              }}
            >
              <AppText style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>المتابعة للدفع وحجز الموعد</AppText>
              <Icon name="arrow-left" size={20} color="#fff" style={{ marginLeft: I18nManager.isRTL ? 0 : 8, marginRight: I18nManager.isRTL ? 8 : 0 }}/>
            </TouchableOpacity>
          )}
        </Animated.View>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  topHeader: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1 },
  headerBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20, paddingBottom: 150 },
  centerContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  pulseCircle: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  card: { padding: 20, borderRadius: 16, borderWidth: 1 },
  finRow: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', justifyContent: 'space-between', marginBottom: 12 },
  floatingBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 40, borderTopWidth: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  confirmBtn: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16 },
});
