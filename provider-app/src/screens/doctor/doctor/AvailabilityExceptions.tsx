import React, { useState, useRef, useEffect, useCallback } from 'react';

export function AvailabilityExceptions({ ctx }: any) {
  const { theme, AR, exceptions, showAddException, setShowAddException, exStart, setExStart, exEnd, setExEnd, handleAddException, handleDeleteException } = ctx;
  return (
    <>
     {/* Exceptional Settings */}
     <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SP.xl, marginBottom: SP.lg }}>
     <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>
     {AR ? ' إغلاق وحظر استثنائي' : ' Exceptional Blocks & Closures'}
     </Text>
     <TouchableOpacity onPress={() => setShowAddException(true)} style={{ backgroundColor: theme.surface2, paddingHorizontal: SP.md, paddingVertical: SP.xs, borderRadius: R.md }}>
     <Text style={{ color: theme.primary, fontSize: FS.sm, fontWeight: FW.bold }}> {AR ? 'إضافة استثناء' : 'Add Rule'}</Text>
     </TouchableOpacity>
     </View>

     {exceptions.map(x => (
     <NCard key={x.id} style={{ marginBottom: SP.sm, paddingVertical: SP.md }}>
     <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
     <View>
     <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
     {x.date}
     </Text>
     <Text style={{ fontSize: FS.sm, color: x.type === 'exceptional_open' ? theme.success : theme.danger, textAlign: AR ? 'right' : 'left', marginTop: 4 }}>
     {AR ? x.labelAr : x.labelEn}
     </Text>
     </View>
     <TouchableOpacity onPress={() => handleDeleteException(x.id)}>
     <Text style={{ fontSize: FS.xl, color: theme.danger }}>️</Text>
     </TouchableOpacity>
     </View>
     </NCard>
     ))}
     </ScrollView>

     {/* Exception Sheet */}
     <NSheet visible={showAddException} onClose={() => setShowAddException(false)} title={AR ? ' إضافة قاعدة استثنائية' : ' Add Exceptional Rule'} height={500}>
     <View style={{ padding: SP.md }}>
     <NInput label={AR ? 'التاريخ (YYYY-MM-DD)' : 'Date (YYYY-MM-DD)'} value={exDate} onChange={setExDate} />
 
     <Text style={{ fontSize: FS.sm, color: theme.text, marginBottom: SP.xs, textAlign: AR ? 'right' : 'left' }}>
     {AR ? 'نوع القاعدة الاستثنائية' : 'Rule Type'}
     </Text>
     <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginBottom: SP.lg }}>
     {(['close_day', 'block_time', 'exceptional_open'] as const).map(type => (
     <TouchableOpacity key={type} onPress={() => setExType(type)} style={{
     flex: 1, padding: SP.md, borderRadius: R.md, borderWidth: 1.5,
     borderColor: exType === type ? theme.primary : theme.border,
     backgroundColor: exType === type ? theme.primaryLight : theme.surface
     }}>
     <Text style={{ fontSize: 11, fontWeight: FW.bold, color: exType === type ? theme.primary : theme.text, textAlign: 'center' }}>
     {type === 'close_day' ? (AR ? 'إغلاق اليوم' : 'Close Day') : type === 'block_time' ? (AR ? 'حظر وقت' : 'Block Time') : (AR ? 'فتح استثنائي' : 'Open Slot')}
     </Text>
     </TouchableOpacity>
     ))}
     </View>

     {exType !== 'close_day' && (
     <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginBottom: SP.md }}>
     <View style={{ flex: 1 }}>
     <NInput label={AR ? 'من وقت' : 'From Time'} value={exStart} onChange={setExStart} />
     </View>
     <View style={{ flex: 1 }}>
     <NInput label={AR ? 'إلى وقت' : 'To Time'} value={exEnd} onChange={setExEnd} />
     </View>
     </View>
     )}

     <NBtn label={AR ? ' تطبيق القاعدة' : ' Apply Rule'} onPress={handleAddException} style={{ marginTop: SP.md }} />
     </View>
     </NSheet>
    </>
  );
}

