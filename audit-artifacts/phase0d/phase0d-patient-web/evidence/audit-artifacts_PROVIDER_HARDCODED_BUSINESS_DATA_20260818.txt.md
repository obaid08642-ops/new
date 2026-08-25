# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PROVIDER_HARDCODED_BUSINESS_DATA_20260818.txt`
- **Member SHA-256:** `da42f784b0dd25a3cf8e98d44e12cfa2b2cbff54ab746d9126dac46146c88406`
- **Line count:** 135
- **Read range:** `1-135`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `2: provider-app/src/screens/doctor/DoctorDashboard.tsx:419:  <NInput label={AR ? 'نسبة تحمل المريض (SAR)' : 'Patient Co-Pay (SAR)'} value={patientCopay} onChange={setPatientCopay} kbType="numeric" placeholder="e.g. 50" icon="" />`
- `3: provider-app/src/screens/doctor/DoctorDashboard.tsx:420:  <NInput label={AR ? 'تحمل شركة التأمين (SAR)' : 'Insurance Coverage (SAR)'} value={insuranceCoverage} onChange={setInsuranceCoverage} kbType="numeric" placeholder="e.g. 150" icon="" `
- `4: provider-app/src/screens/doctor/DoctorDashboard.tsx:465:    { id: 'apt1', patient: AR ? 'سارة المطيري' : 'Sara Al-Mutairi', time: '09:30', type: 'video', status: 'confirmed', price: 150, raw: {} },`
- `5: provider-app/src/screens/doctor/DoctorDashboard.tsx:466:    { id: 'apt2', patient: AR ? 'أحمد السالم' : 'Ahmed Al-Salem', time: '11:00', type: 'clinic', status: 'confirmed', price: 200, raw: {} },`
- `6: provider-app/src/screens/doctor/DoctorDashboard.tsx:467:    { id: 'apt3', patient: AR ? 'فيصل الحربي' : 'Faisal Al-Harbi', time: '14:30', type: 'home', status: 'confirmed', price: 300, raw: {} },`
- `7: provider-app/src/screens/doctor/DoctorDashboard.tsx:538: {item.type === 'video'?'':item.type==='clinic'?'':''} {item.price} {AR?'ر':'SAR'}`
- `8: provider-app/src/screens/doctor/DoctorDashboard.tsx:599: { icon:'dollarSign', ar:'الرسوم', en:'Fee', val:`${apt?.price ?? 200} ${AR?'ريال':'SAR'}` },`
- `9: provider-app/src/screens/doctor/DoctorDashboard.tsx:875: { id: 't1', name: 'Paracetamol 500mg', dose: 'قرص واحد عند الحاجة', freq: 'عند الحاجة', duration: '5 أيام', notes: 'بعد الأكل' },`
- `10: provider-app/src/screens/doctor/DoctorDashboard.tsx:1816: <NBadge label={`${noShowFee} ${AR?'ر':'SAR'}`} variant="danger" size="xs" />`
- `11: provider-app/src/screens/doctor/DoctorDashboard.tsx:1848:          { id: '1', date: '2026-07-16', type: 'CREDIT', amount: 150, title: AR ? 'استشارة أونلاين' : 'Online Consultation' },`
- `12: provider-app/src/screens/doctor/DoctorDashboard.tsx:1850:          { id: '3', date: '2026-07-14', type: 'CREDIT', amount: 300, title: AR ? 'زيارة منزلية' : 'Home Visit' },`
- `13: provider-app/src/screens/doctor/DoctorDashboard.tsx:1866:        <NStatCard label={AR ? 'الرصيد المتاح للسحب' : 'Available for Withdrawal'} value={`${wallet.available} SAR`} icon="wallet" />`
### backend_consumers_or_contracts
- `56: provider-app/src/screens/shared/InsuranceRequestsScreen.tsx:155:                  {(AR ? 'السعر: ' : 'Price: ') + (req.price ?? '—') + (AR ? ' ر.س' : ' SAR')}`
- `57: provider-app/src/screens/shared/InsuranceRequestsScreen.tsx:164:                    {(AR ? 'copay المطلوب من المريض: ' : 'Patient copay due: ') + (req.copay_amount ?? '—') + (AR ? ` ر.س (${req.copay_percent}%)` : ` SAR (${req.copay_percent}`
- `58: provider-app/src/screens/shared/InsuranceRequestsScreen.tsx:195:              {target ? `${target.patient_name || ''} · ${target.service_type || ''} · ${target.price ?? ''} ${AR ? 'ر.س' : 'SAR'}` : ''}`
- `59: provider-app/src/screens/shared/InsuranceRequestsScreen.tsx:239:                    {AR ? `يدفع المريض: ${copayPreview} ر.س` : `Patient pays: ${copayPreview} SAR`}`
- `88: provider-app/src/screens/nursing/NursingDashboard.tsx:263: <NStatCard icon="◈" label={AR?'الإيرادات':'Revenue'} value={String(totalRev)} unit={AR?'ر':'SAR'} color="#E91E63" style={{width:'47%'}} />`
- `89: provider-app/src/screens/nursing/NursingDashboard.tsx:306: <Text style={{fontSize:FS.md,fontWeight:FW.xbold,color:'#E91E63',marginTop:2}}>{order.total || order.price || 0} {AR?'ر':'SAR'}</Text>`
- `90: provider-app/src/screens/nursing/NursingDashboard.tsx:392:              <Text style={{ color: theme.textSub, marginTop: SP.sm, textAlign: AR ? 'right' : 'left' }}>{order.svc} - {order.price} SAR</Text>`
- `91: provider-app/src/screens/nursing/NursingDashboard.tsx:476: <Text style={{fontSize:FS.xl,fontWeight:FW.xbold,color:'#E91E63'}}>{order?.price??0} {AR?'ريال':'SAR'}</Text>`
- `92: provider-app/src/screens/nursing/NursingDashboard.tsx:1070: <Text style={{color:'rgba(255,255,255,0.8)'}}>{AR?'ريال سعودي — نقدي فقط':'SAR — Cash Only'}</Text>`
- `93: provider-app/src/screens/nursing/NursingDashboard.tsx:1071: {!loading && earned > 0 && <Text style={{color:'rgba(255,255,255,0.7)',fontSize:FS.xs,marginTop:SP.xs}}>{AR?`إجمالي المكتسب: ${earned.toLocaleString()} ر`:`Total earned: ${earned.t`
- `94: provider-app/src/screens/nursing/NursingDashboard.tsx:1093: <Text style={{fontSize:FS.md,fontWeight:FW.bold,color:isCredit?'#4CAF50':'#F44336'}}>{isCredit?'+':'-'}{amt.toLocaleString()} {AR?'ر':'SAR'}</Text>`
- `95: provider-app/src/screens/nursing/NursingDashboard.tsx:1340: <NPriceInput label={AR ? 'سعر الساعة (ريال)' : 'Hourly Fee (SAR)'} value={hourlyPrice} onChange={setHourlyPrice} />`
### auth_ownership
- `72: provider-app/src/screens/shared/SharedScreens.tsx:1090:                : `Your ${amount} SAR request is now under finance-admin review. You will be notified of its status.`}`
### state_transitions
- `4: provider-app/src/screens/doctor/DoctorDashboard.tsx:465:    { id: 'apt1', patient: AR ? 'سارة المطيري' : 'Sara Al-Mutairi', time: '09:30', type: 'video', status: 'confirmed', price: 150, raw: {} },`
- `5: provider-app/src/screens/doctor/DoctorDashboard.tsx:466:    { id: 'apt2', patient: AR ? 'أحمد السالم' : 'Ahmed Al-Salem', time: '11:00', type: 'clinic', status: 'confirmed', price: 200, raw: {} },`
- `6: provider-app/src/screens/doctor/DoctorDashboard.tsx:467:    { id: 'apt3', patient: AR ? 'فيصل الحربي' : 'Faisal Al-Harbi', time: '14:30', type: 'home', status: 'confirmed', price: 300, raw: {} },`
- `10: provider-app/src/screens/doctor/DoctorDashboard.tsx:1816: <NBadge label={`${noShowFee} ${AR?'ر':'SAR'}`} variant="danger" size="xs" />`
- `18: provider-app/src/screens/doctor/DoctorDashboard.tsx:1927:          { id: 'c1', patient_name: 'أحمد السالم', status: 'OPEN', last_message: 'متى موعدي القادم؟', unread: 2 },`
- `19: provider-app/src/screens/doctor/DoctorDashboard.tsx:1928:          { id: 'c2', patient_name: 'سارة المطيري', status: 'FOLLOW_UP', last_message: 'شكراً دكتور على الاستشارة', unread: 0 },`
- `20: provider-app/src/screens/doctor/DoctorDashboard.tsx:1929:          { id: 'c3', patient_name: 'فيصل الحربي', status: 'CLOSED', last_message: 'تمت الاستشارة بنجاح', unread: 0 }`
- `33: provider-app/src/screens/facility/FacilityDashboard.tsx:1613: <NStatCard icon="" label={AR?'مقبولة هذا الشهر':'Approved this month'} value={`${(totalAmt/1000).toFixed(1)}K`} unit={AR?'ر':'SAR'} color="#4CAF50" style={{ flex:1 }} />`
- `34: provider-app/src/screens/facility/FacilityDashboard.tsx:1614: <NStatCard icon="" label={AR?'قيد الانتظار':'Pending'} value={`${(pendingAmt/1000).toFixed(1)}K`} unit={AR?'ر':'SAR'} color="#FF9800" style={{ flex:1 }} />`
- `63: provider-app/src/screens/shared/BlueprintScreens.tsx:735: {loading ? '…' : `${monthEarnings.toLocaleString()} ${AR ? 'ريال' : 'SAR'}`}`
- `72: provider-app/src/screens/shared/SharedScreens.tsx:1090:                : `Your ${amount} SAR request is now under finance-admin review. You will be notified of its status.`}`
- `74: provider-app/src/screens/shared/SharedScreens.tsx:1109:              {AR ? `قيد التسوية (ضمان): ${balance!.pending.toFixed(2)} ريال` : `In escrow (pending): ${balance!.pending.toFixed(2)} SAR`}`
### payment_insurance_relevance
- `2: provider-app/src/screens/doctor/DoctorDashboard.tsx:419:  <NInput label={AR ? 'نسبة تحمل المريض (SAR)' : 'Patient Co-Pay (SAR)'} value={patientCopay} onChange={setPatientCopay} kbType="numeric" placeholder="e.g. 50" icon="" />`
- `3: provider-app/src/screens/doctor/DoctorDashboard.tsx:420:  <NInput label={AR ? 'تحمل شركة التأمين (SAR)' : 'Insurance Coverage (SAR)'} value={insuranceCoverage} onChange={setInsuranceCoverage} kbType="numeric" placeholder="e.g. 150" icon="" `
- `4: provider-app/src/screens/doctor/DoctorDashboard.tsx:465:    { id: 'apt1', patient: AR ? 'سارة المطيري' : 'Sara Al-Mutairi', time: '09:30', type: 'video', status: 'confirmed', price: 150, raw: {} },`
- `5: provider-app/src/screens/doctor/DoctorDashboard.tsx:466:    { id: 'apt2', patient: AR ? 'أحمد السالم' : 'Ahmed Al-Salem', time: '11:00', type: 'clinic', status: 'confirmed', price: 200, raw: {} },`
- `6: provider-app/src/screens/doctor/DoctorDashboard.tsx:467:    { id: 'apt3', patient: AR ? 'فيصل الحربي' : 'Faisal Al-Harbi', time: '14:30', type: 'home', status: 'confirmed', price: 300, raw: {} },`
- `7: provider-app/src/screens/doctor/DoctorDashboard.tsx:538: {item.type === 'video'?'':item.type==='clinic'?'':''} {item.price} {AR?'ر':'SAR'}`
- `8: provider-app/src/screens/doctor/DoctorDashboard.tsx:599: { icon:'dollarSign', ar:'الرسوم', en:'Fee', val:`${apt?.price ?? 200} ${AR?'ريال':'SAR'}` },`
- `13: provider-app/src/screens/doctor/DoctorDashboard.tsx:1866:        <NStatCard label={AR ? 'الرصيد المتاح للسحب' : 'Available for Withdrawal'} value={`${wallet.available} SAR`} icon="wallet" />`
- `14: provider-app/src/screens/doctor/DoctorDashboard.tsx:1867:        <NStatCard label={AR ? 'مبالغ معلقة التأمين' : 'Insurance Escrow'} value={`${wallet.escrow} SAR`} icon="shield" color={theme.warn} />`
- `15: provider-app/src/screens/doctor/DoctorDashboard.tsx:1868:        <NStatCard label={AR ? 'مستحقات المنصة / المديونية' : 'Nabdah Dues'} value={`${wallet.dues} SAR`} icon="info" color={theme.danger} />`
- `21: provider-app/src/screens/doctor/DoctorDashboard.tsx:2322: {AR ? ` صافي المطالبة للتأمين: ${net} ريال` : ` Net insurance claim: ${net} SAR`}`
- `22: provider-app/src/screens/doctor/DoctorDashboard.tsx:3056:  {s.price} {AR ? 'ريال' : 'SAR'}`
### error_empty_loading_retry_cancel
- `34: provider-app/src/screens/facility/FacilityDashboard.tsx:1614: <NStatCard icon="" label={AR?'قيد الانتظار':'Pending'} value={`${(pendingAmt/1000).toFixed(1)}K`} unit={AR?'ر':'SAR'} color="#FF9800" style={{ flex:1 }} />`
- `63: provider-app/src/screens/shared/BlueprintScreens.tsx:735: {loading ? '…' : `${monthEarnings.toLocaleString()} ${AR ? 'ريال' : 'SAR'}`}`
- `74: provider-app/src/screens/shared/SharedScreens.tsx:1109:              {AR ? `قيد التسوية (ضمان): ${balance!.pending.toFixed(2)} ريال` : `In escrow (pending): ${balance!.pending.toFixed(2)} SAR`}`
- `85: provider-app/src/screens/shared/SharedScreens.tsx:2976:          <NStatCard icon="clock" label={AR ? 'أرصدة معلقة (Escrow)' : 'Pending (Escrow)'} value={String(pendingEscrow)} unit={AR ? 'ر' : 'SAR'} color={theme.warn} style={{ flex: 1 }} /`
- `93: provider-app/src/screens/nursing/NursingDashboard.tsx:1071: {!loading && earned > 0 && <Text style={{color:'rgba(255,255,255,0.7)',fontSize:FS.xs,marginTop:SP.xs}}>{AR?`إجمالي المكتسب: ${earned.toLocaleString()} ر`:`Total earned: ${earned.t`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
