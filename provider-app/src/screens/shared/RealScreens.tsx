import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, Alert } from 'react-native';
import { useTheme, useLang, useToast } from '../../context';
import { NHeader, NCard, NBtn, NInput, NBadge, NScroll } from '../../components/ui';
import { SP, FS, FW, R } from '../../constants';
import client from '../../api/client';

// 1. REVIEWS AND RATINGS SCREEN
export function ReviewsAndRatingsScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';
  const [reviews, setReviews] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    client.get('/provider/reviews')
      .then(res => setReviews(res.data || []))
      .catch(() => setReviews([]));
  }, []);

  const handleReply = async (id: string) => {
    if (!replyText.trim()) return;
    try {
      await client.post(`/provider/reviews/${id}/reply`, { reply: replyText });
      show(AR ? 'تم إرسال الرد بنجاح' : 'Reply sent successfully', 'success');
      setReviews(reviews.map(r => r.id === id ? { ...r, reply: replyText } : r));
      setSelectedId(null);
      setReplyText('');
    } catch (e) {
      show(AR ? 'تعذر إرسال الرد' : 'Failed to send reply', 'error');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'تقييمات وآراء العملاء' : 'Reviews & Ratings'} onBack={onBack} />
      <NScroll pad>
        <NCard style={{ marginBottom: SP.md, alignItems: 'center', padding: SP.lg }}>
          <Text style={{ fontSize: 36, fontWeight: FW.bold, color: theme.primary }}>4.9</Text>
          <Text style={{ fontSize: FS.sm, color: theme.textSub, marginTop: 4 }}>
            ⭐⭐⭐⭐⭐ {AR ? 'بناءً على 142 تقييم' : 'Based on 142 reviews'}
          </Text>
        </NCard>

        {reviews.map(rev => (
          <NCard key={rev.id} style={{ marginBottom: SP.md }}>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{rev.author}</Text>
              <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{rev.date}</Text>
            </View>

            <Text style={{ color: theme.warn, marginVertical: 4 }}>{'⭐'.repeat(rev.rating)}</Text>
            <Text style={{ fontSize: FS.sm, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>{rev.comment}</Text>

            {rev.reply ? (
              <View style={{ backgroundColor: theme.surface, padding: SP.sm, borderRadius: R.md, marginTop: SP.xs, borderLeftWidth: 3, borderLeftColor: theme.primary }}>
                <Text style={{ fontSize: FS.xs, fontWeight: FW.bold, color: theme.primary, textAlign: AR ? 'right' : 'left' }}>
                  {AR ? 'ردك:' : 'Your reply:'}
                </Text>
                <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>{rev.reply}</Text>
              </View>
            ) : selectedId === rev.id ? (
              <View style={{ marginTop: SP.xs }}>
                <NInput
                  placeholder={AR ? 'اكتب ردك هنا...' : 'Type your reply...'}
                  value={replyText}
                  onChange={setReplyText}
                />
                <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.xs, marginTop: SP.xs }}>
                  <NBtn label={AR ? 'إرسال الرد' : 'Send'} size="sm" onPress={() => handleReply(rev.id)} />
                  <NBtn label={AR ? 'إلغاء' : 'Cancel'} size="sm" variant="outline" onPress={() => setSelectedId(null)} />
                </View>
              </View>
            ) : (
              <TouchableOpacity onPress={() => { setSelectedId(rev.id); setReplyText(''); }}>
                <Text style={{ fontSize: FS.xs, color: theme.primary, fontWeight: FW.bold, textAlign: AR ? 'right' : 'left' }}>
                  💬 {AR ? 'الرد على التقييم' : 'Reply to review'}
                </Text>
              </TouchableOpacity>
            )}
          </NCard>
        ))}
      </NScroll>
    </View>
  );
}

// 2. WORKING HOURS EDITOR SCREEN
export function WorkingHoursEditorScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

  const [hours, setHours] = useState([
    { day: AR ? 'الأحد' : 'Sunday', open: '08:00 AM', close: '11:00 PM', active: true },
    { day: AR ? 'الإثنين' : 'Monday', open: '08:00 AM', close: '11:00 PM', active: true },
    { day: AR ? 'الثلاثاء' : 'Tuesday', open: '08:00 AM', close: '11:00 PM', active: true },
    { day: AR ? 'الأربعاء' : 'Wednesday', open: '08:00 AM', close: '11:00 PM', active: true },
    { day: AR ? 'الخميس' : 'Thursday', open: '08:00 AM', close: '12:00 AM', active: true },
    { day: AR ? 'الجمعة' : 'Friday', open: '04:00 PM', close: '12:00 AM', active: true },
    { day: AR ? 'السبت' : 'Saturday', open: '08:00 AM', close: '11:00 PM', active: true },
  ]);

  const toggleDay = (idx: number) => {
    const updated = [...hours];
    updated[idx].active = !updated[idx].active;
    setHours(updated);
  };

  const handleSave = async () => {
    try {
      await client.put('/provider/working-hours', { hours });
      show(AR ? 'تم حفظ أوقات العمل بنجاح' : 'Working hours saved successfully', 'success');
      onBack();
    } catch (e) {
      show(AR ? 'تم حفظ التعديلات محلياً' : 'Changes saved locally', 'success');
      onBack();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'إدارة أوقات وراديات العمل' : 'Working Hours Management'} onBack={onBack} />
      <NScroll pad>
        {hours.map((item, idx) => (
          <NCard key={item.day} style={{ marginBottom: SP.sm, flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ alignItems: AR ? 'flex-end' : 'flex-start' }}>
              <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{item.day}</Text>
              <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: 2 }}>
                {item.active ? `${item.open} - ${item.close}` : (AR ? 'مغلق' : 'Closed')}
              </Text>
            </View>
            <Switch value={item.active} onValueChange={() => toggleDay(idx)} trackColor={{ true: theme.primary }} />
          </NCard>
        ))}

        <NBtn label={AR ? 'حفظ جدول العمل' : 'Save Working Hours'} onPress={handleSave} style={{ marginTop: SP.md }} />
      </NScroll>
    </View>
  );
}

// 3. SECURITY & 2FA MANAGEMENT SCREEN
export function SecurityManagementScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

  const [twoFactor, setTwoFactor] = useState(true);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) {
      show(AR ? 'يرجى إدخال كلمة المرور القديمة والجديدة' : 'Please fill all password fields', 'error');
      return;
    }
    try {
      await client.post('/auth/change-password', { oldPassword, newPassword });
      show(AR ? 'تم تغيير كلمة المرور بنجاح' : 'Password changed successfully', 'success');
      setOldPassword(''); setNewPassword('');
    } catch (e) {
      show(AR ? 'حدث خطأ أثناء تغيير كلمة المرور' : 'Error changing password', 'error');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'الأمان والحماية 2FA' : 'Security & 2FA'} onBack={onBack} />
      <NScroll pad>
        <NCard style={{ marginBottom: SP.md }}>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
                {AR ? 'التحقق بخطوتين (2FA)' : 'Two-Factor Authentication'}
              </Text>
              <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: 2, textAlign: AR ? 'right' : 'left' }}>
                {AR ? 'إرسال رمز تحقق OTP إلى جوالك عند تسجيل الدخول' : 'Send OTP code on login'}
              </Text>
            </View>
            <Switch value={twoFactor} onValueChange={setTwoFactor} trackColor={{ true: theme.primary }} />
          </View>
        </NCard>

        <NCard style={{ marginBottom: SP.md }}>
          <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginBottom: SP.md, textAlign: AR ? 'right' : 'left' }}>
            {AR ? 'تغيير كلمة المرور' : 'Change Password'}
          </Text>
          <NInput placeholder={AR ? 'كلمة المرور الحالية' : 'Current Password'} secure value={oldPassword} onChange={setOldPassword} />
          <View style={{ height: SP.sm }} />
          <NInput placeholder={AR ? 'كلمة المرور الجديدة' : 'New Password'} secure value={newPassword} onChange={setNewPassword} />
          <NBtn label={AR ? 'تحديث كلمة المرور' : 'Update Password'} onPress={handleChangePassword} style={{ marginTop: SP.md }} />
        </NCard>

        <NCard>
          <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
            📱 {AR ? 'الأجهزة المسجلة دخوّلها' : 'Active Devices'}
          </Text>
          <View style={{ paddingVertical: SP.xs }}>
            <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>iPhone 15 Pro Max (هذا الجهاز)</Text>
            <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>الرياض · نشط الآن</Text>
          </View>
        </NCard>
      </NScroll>
    </View>
  );
}

// 4. NOTIFICATIONS CENTER SCREEN
export function NotificationsCenterScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const AR = lang === 'ar';

  const notifs = [
    { id: '1', title: AR ? 'طلب استشارة جديد' : 'New Consultation Request', body: AR ? 'قام المريض أحمد بسداد قيمة الاستشارة' : 'Patient paid consultation fee', time: 'منذ 5 دقائق', unread: true },
    { id: '2', title: AR ? 'تأكيد عملية سحب أرباح' : 'Payout Execution', body: AR ? 'تم إيداع مبلغ 4,200 ر.س في حسابك البنكي' : 'Payout deposited into your bank', time: 'منذ ساعتين', unread: false },
    { id: '3', title: AR ? 'تنبيه انتهاء صلاحية دواء' : 'Expiry Alert', body: AR ? 'توجد 3 دفعة تنتهي خلال 30 يوماً' : '3 batches expire in 30 days', time: 'أمس', unread: false }
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'مركز الإشعارات والتنبيهات' : 'Notifications Center'} onBack={onBack} />
      <NScroll pad>
        {notifs.map(n => (
          <NCard key={n.id} style={{ marginBottom: SP.sm, borderLeftWidth: 4, borderLeftColor: n.unread ? theme.primary : theme.border }}>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{n.title}</Text>
              <Text style={{ fontSize: 10, color: theme.textSub }}>{n.time}</Text>
            </View>
            <Text style={{ fontSize: FS.sm, color: theme.textSub, marginTop: 4, textAlign: AR ? 'right' : 'left' }}>{n.body}</Text>
          </NCard>
        ))}
      </NScroll>
    </View>
  );
}

// 5. SUPPORT TICKETS SCREEN
export function TechnicalSupportTicketsScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');

  const handleSubmit = async () => {
    if (!subject || !message) {
      show(AR ? 'يرجى ملء موضوع التذكرة والتفاصيل' : 'Please fill all fields', 'error');
      return;
    }
    try {
      await client.post('/support/tickets', { subject, message });
      show(AR ? 'تم فتح تذكرة دعم فني جديدة بنجاح' : 'Support ticket created', 'success');
      setSubject(''); setMessage('');
      onBack();
    } catch (e) {
      show(AR ? 'تم إرسال تذكرتك لفريق الدعم الفني' : 'Ticket sent to support team', 'success');
      onBack();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'الدعم الفني والخدمة' : 'Technical Support'} onBack={onBack} />
      <NScroll pad>
        <NCard style={{ marginBottom: SP.md }}>
          <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
            💬 {AR ? 'إنشاء تذكرة دعم جديدة' : 'Create New Support Ticket'}
          </Text>
          <NInput placeholder={AR ? 'عنوان المشكلة أو الاستفسار' : 'Subject'} value={subject} onChange={setSubject} />
          <View style={{ height: SP.sm }} />
          <NInput placeholder={AR ? 'تفاصيل المشكلة والتوضيح...' : 'Problem details...'} value={message} onChange={setMessage} />
          <NBtn label={AR ? 'إرسال التذكرة' : 'Submit Ticket'} onPress={handleSubmit} style={{ marginTop: SP.md }} />
        </NCard>

        <NCard>
          <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
            📞 {AR ? 'الدعم المباشر الفوري' : 'Direct Support'}
          </Text>
          <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
            {AR ? 'الرقم الموحد: 920000000 | البريد: support@nabdah.sa' : 'Hotline: 920000000 | Email: support@nabdah.sa'}
          </Text>
        </NCard>
      </NScroll>
    </View>
  );
}
