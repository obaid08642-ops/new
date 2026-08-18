import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, Alert, ActivityIndicator } from 'react-native';
import { useTheme, useLang, useToast } from '../../context';
import { NHeader, NCard, NBtn, NInput, NBadge, NScroll, NEmpty } from '../../components/ui';
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
             {AR?'بناءً على 142 تقييم':'Based on 142 reviews'}
          </Text>
        </NCard>

        {reviews.map(rev => (
          <NCard key={rev.id} style={{ marginBottom: SP.md }}>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{rev.author}</Text>
              <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{rev.date}</Text>
            </View>

            <Text style={{ color: theme.warn, marginVertical: 4 }}>{''.repeat(rev.rating)}</Text>
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
                   {AR?'الرد على التقييم':'Reply to review'}
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
const DAY_DEFS = [
  { key: 'sunday', ar: 'الأحد', en: 'Sunday' },
  { key: 'monday', ar: 'الإثنين', en: 'Monday' },
  { key: 'tuesday', ar: 'الثلاثاء', en: 'Tuesday' },
  { key: 'wednesday', ar: 'الأربعاء', en: 'Wednesday' },
  { key: 'thursday', ar: 'الخميس', en: 'Thursday' },
  { key: 'friday', ar: 'الجمعة', en: 'Friday' },
  { key: 'saturday', ar: 'السبت', en: 'Saturday' },
];

export function WorkingHoursEditorScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hours, setHours] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true); setLoadErr(false);
    try {
      const res = await client.get('/provider/working-hours');
      const saved = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.hours) ? res.data.hours : null);
      if (saved && saved.length) {
        // Merge saved hours onto the canonical 7-day template
        setHours(DAY_DEFS.map((d) => {
          const s = saved.find((x: any) => x.day === d.key);
          return { day: d.key, open: s?.open || '08:00', close: s?.close || '22:00', closed: s ? !!s.closed : true };
        }));
      } else {
        // No saved schedule yet — start from an honest all-closed template
        setHours(DAY_DEFS.map((d) => ({ day: d.key, open: '08:00', close: '22:00', closed: true })));
      }
    } catch {
      setLoadErr(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleDay = (idx: number) => {
    const updated = [...hours];
    updated[idx].closed = !updated[idx].closed;
    setHours(updated);
  };

  const setTime = (idx: number, field: 'open' | 'close', v: string) => {
    const clean = v.replace(/[^0-9:]/g, '').slice(0, 5);
    const updated = [...hours];
    updated[idx][field] = clean;
    setHours(updated);
  };

  const timeValid = (t: string) => /^([01]?\d|2[0-3]):[0-5]\d$/.test(t);

  const handleSave = async () => {
    const bad = hours.find((h) => !h.closed && (!timeValid(h.open) || !timeValid(h.close)));
    if (bad) {
      show(AR ? 'تأكد من صيغة الوقت (HH:MM) لكل يوم مفعّل' : 'Check time format (HH:MM) for every active day', 'error');
      return;
    }
    setSaving(true);
    try {
      await client.put('/provider/working-hours', { hours });
      show(AR ? 'تم حفظ أوقات العمل بنجاح' : 'Working hours saved successfully', 'success');
      onBack();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      show(typeof msg === 'string' ? msg : (AR ? 'تعذر حفظ أوقات العمل — تحقق من الاتصال وحاول مجدداً' : 'Could not save working hours — check connection and retry'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const dayLabel = (key: string) => {
    const d = DAY_DEFS.find((x) => x.key === key);
    return AR ? d?.ar : d?.en;
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'إدارة أوقات العمل' : 'Working Hours Management'} onBack={onBack} />
      {loading ? (
        <View style={{ alignItems: 'center', paddingVertical: SP.huge }}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : loadErr ? (
        <NEmpty
          icon="⚠️"
          title={AR ? 'تعذر تحميل أوقات العمل' : 'Could not load working hours'}
          sub={AR ? 'تحقق من اتصالك بالإنترنت ثم أعد المحاولة' : 'Check your connection and try again'}
          actionLabel={AR ? 'إعادة المحاولة' : 'Retry'}
          onAction={load}
        />
      ) : (
        <NScroll pad>
          {hours.map((item, idx) => (
            <NCard key={item.day} style={{ marginBottom: SP.sm }}>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ alignItems: AR ? 'flex-end' : 'flex-start' }}>
                  <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{dayLabel(item.day)}</Text>
                  <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: 2 }}>
                    {!item.closed ? `${item.open} - ${item.close}` : (AR ? 'مغلق' : 'Closed')}
                  </Text>
                </View>
                <Switch value={!item.closed} onValueChange={() => toggleDay(idx)} trackColor={{ true: theme.primary }} />
              </View>
              {!item.closed && (
                <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginTop: SP.sm }}>
                  <View style={{ flex: 1 }}>
                    <NInput label={AR ? 'من (HH:MM)' : 'From (HH:MM)'} value={item.open} onChange={(v) => setTime(idx, 'open', v)} kbType="numeric" maxLen={5} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <NInput label={AR ? 'إلى (HH:MM)' : 'To (HH:MM)'} value={item.close} onChange={(v) => setTime(idx, 'close', v)} kbType="numeric" maxLen={5} />
                  </View>
                </View>
              )}
            </NCard>
          ))}

          <NBtn label={AR ? 'حفظ جدول العمل' : 'Save Working Hours'} onPress={handleSave} loading={saving} disabled={saving} style={{ marginTop: SP.md }} />
        </NScroll>
      )}
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
      await client.post('/users/me/change-password', { oldPassword, newPassword });
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
             {AR?'الأجهزة المسجلة دخوّلها':'Active Devices'}
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

  const [notifs, setNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const timeAgo = (d: any) => {
    if (!d) return '';
    const mins = Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 60000));
    if (mins < 1) return AR ? 'الآن' : 'now';
    if (mins < 60) return AR ? `منذ ${mins} دقيقة` : `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return AR ? `منذ ${hrs} ساعة` : `${hrs}h ago`;
    return AR ? `منذ ${Math.floor(hrs / 24)} يوم` : `${Math.floor(hrs / 24)}d ago`;
  };

  const load = () => {
    setLoading(true);
    client.get('/provider/notifications')
      .then(res => {
        const data = res.data || {};
        setNotifs((data.items || []).map((n: any) => ({
          id: n.id || n._id,
          title: n.title_ar || n.title || '—',
          body: n.body_ar || n.body || n.message || '',
          time: timeAgo(n.createdAt || n.created_at),
          unread: !n.read,
        })));
        setUnreadCount(data.unread_count || 0);
      })
      .catch(() => setNotifs([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? `مركز الإشعارات والتنبيهات${unreadCount ? ` (${unreadCount})` : ''}` : 'Notifications Center'} onBack={onBack} />
      <NScroll pad>
        {loading && <Text style={{ textAlign: 'center', color: theme.textSub, marginVertical: SP.xl }}>{AR ? 'جاري التحميل…' : 'Loading…'}</Text>}
        {!loading && notifs.length === 0 && (
          <NCard style={{ alignItems: 'center', paddingVertical: SP.xxl }}>
            <Text style={{ color: theme.textSub }}>{AR ? 'لا توجد إشعارات بعد' : 'No notifications yet'}</Text>
          </NCard>
        )}
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
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!subject || !message) {
      show(AR ? 'يرجى ملء موضوع التذكرة والتفاصيل' : 'Please fill all fields', 'error');
      return;
    }
    setSending(true);
    try {
      await client.post('/support/tickets', { subject: subject.trim(), message: message.trim() });
      show(AR ? 'تم فتح تذكرة دعم فني جديدة بنجاح' : 'Support ticket created', 'success');
      setSubject(''); setMessage('');
      onBack();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      show(typeof msg === 'string' ? msg : (AR ? 'تعذر إرسال التذكرة — تحقق من الاتصال وحاول مجدداً' : 'Could not send ticket — check connection and retry'), 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'الدعم الفني والخدمة' : 'Technical Support'} onBack={onBack} />
      <NScroll pad>
        <NCard style={{ marginBottom: SP.md }}>
          <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
             {AR?'إنشاء تذكرة دعم جديدة':'Create New Support Ticket'}
          </Text>
          <NInput placeholder={AR ? 'عنوان المشكلة أو الاستفسار' : 'Subject'} value={subject} onChange={setSubject} />
          <View style={{ height: SP.sm }} />
          <NInput placeholder={AR ? 'تفاصيل المشكلة والتوضيح...' : 'Problem details...'} value={message} onChange={setMessage} />
          <NBtn label={AR ? 'إرسال التذكرة' : 'Submit Ticket'} onPress={handleSubmit} loading={sending} disabled={sending} style={{ marginTop: SP.md }} />
        </NCard>

        <NCard>
          <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
             {AR?'الدعم المباشر الفوري':'Direct Support'}
          </Text>
          <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
            {AR ? 'الرقم الموحد: 920000000 | البريد: support@nabdah.sa' : 'Hotline: 920000000 | Email: support@nabdah.sa'}
          </Text>
        </NCard>
      </NScroll>
    </View>
  );
}
