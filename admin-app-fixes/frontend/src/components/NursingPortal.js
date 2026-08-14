import React, { useState, useEffect } from "react";
import { homeCareApi } from "../api/endpoints";

// ============================================================
// DESIGN TOKENS (Shared from Nabd theme for design harmony)
// ============================================================
const T = {
  bg: "#07080d", surface: "#0c0d14", surface2: "#10121c",
  border: "#1a1c2e", borderBright: "#252840",
  text: "#e8eaf6", textMuted: "#5c6080", textDim: "#2e3050",
  accent: "#00b8e6", green: "#00e676", red: "#ff1744",
  orange: "#ff6d00", purple: "#7c4dff", gold: "#ffd600",
  pink: "#f50057", teal: "#00bfa5", cyan: "#00e5ff",
};

// ============================================================
// UI COMPONENTS
// ============================================================
const Badge = ({ children, color = T.accent }) => (
  <span style={{ background: `${color}22`, color, border: `1px solid ${color}44`, borderRadius: 6, padding: "2px 10px", fontSize: 11, fontWeight: 700, fontFamily: "monospace", whiteSpace: "nowrap" }}>
    {children}
  </span>
);

const StatusBadge = ({ status }) => {
  const m = {
    CREATED: { label: "جديد ➕", color: T.accent },
    PROVIDER_ASSIGNED: { label: "تم تعيين ممرض 🏥", color: T.purple },
    CONFIRMED: { label: "مقبول/مؤكد ✅", color: T.green },
    EN_ROUTE: { label: "في الطريق 🚗", color: T.gold },
    IN_PROGRESS: { label: "جاري تقديم الخدمة 💉", color: T.teal },
    COMPLETED: { label: "مكتمل 🏁", color: T.green },
    CANCELLED: { label: "ملغي ❌", color: T.red },
    pending: { label: "قيد الانتظار ⏳", color: T.orange },
    ordered: { label: "تم الطلب 📦", color: T.cyan },
    delivered: { label: "تم التسليم 🚚", color: T.green },
  };
  const s = m[status] || { label: status, color: T.textMuted };
  return <Badge color={s.color}>{s.label}</Badge>;
};

const Card = ({ children, style: s = {}, accent, noPad }) => (
  <div style={{ background: T.surface, border: `1px solid ${accent ? `${accent}33` : T.border}`, borderRadius: 14, padding: noPad ? 0 : 20, ...(accent ? { boxShadow: `0 0 32px ${accent}0e` } : {}), ...s }}>
    {children}
  </div>
);

const Modal = ({ open, onClose, title, children, width = 580 }) => {
  if (!open) return null;
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: "fixed", inset: 0, background: "#000c", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 18, width, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto", padding: 30 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h3 style={{ color: T.text, margin: 0, fontSize: 17, fontWeight: 900 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.textMuted, cursor: "pointer", fontSize: 24, lineHeight: 1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};

const Btn = ({ children, onClick, variant = "primary", small, icon, style: s = {}, disabled }) => {
  const v = {
    primary: { background: `${T.accent}1a`, color: T.accent, border: `1px solid ${T.accent}44` },
    success: { background: `${T.green}1a`, color: T.green, border: `1px solid ${T.green}44` },
    danger: { background: `${T.red}1a`, color: T.red, border: `1px solid ${T.red}44` },
    warning: { background: `${T.orange}1a`, color: T.orange, border: `1px solid ${T.orange}44` },
    ghost: { background: "transparent", color: T.textMuted, border: `1px solid ${T.border}` },
    purple: { background: `${T.purple}1a`, color: T.purple, border: `1px solid ${T.purple}44` },
    gold: { background: `${T.gold}1a`, color: T.gold, border: `1px solid ${T.gold}44` },
    teal: { background: `${T.teal}1a`, color: T.teal, border: `1px solid ${T.teal}44` },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...(v[variant] || v.primary), borderRadius: 8, padding: small ? "4px 12px" : "8px 18px", fontSize: small ? 11 : 13, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "'Cairo',sans-serif", transition: "all .2s", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", opacity: disabled ? .5 : 1, ...s }}>
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
};

const Input = ({ placeholder, value, onChange, type = "text", full, small, style = {} }) => (
  <input type={type} placeholder={placeholder} value={value || ""} onChange={e => onChange(e.target.value)}
    style={{ background: T.surface2, border: `1px solid ${T.border}`, color: T.text, borderRadius: 8, padding: small ? "6px 12px" : "10px 14px", fontSize: 13, fontFamily: "'Cairo',sans-serif", outline: "none", width: full ? "100%" : "auto", boxSizing: "border-box", transition: "border .2s", ...style }}
    onFocus={e => e.target.style.borderColor = T.accent}
    onBlur={e => e.target.style.borderColor = T.border}
  />
);

const Textarea = ({ placeholder, value, onChange, rows = 3 }) => (
  <textarea placeholder={placeholder} value={value || ""} onChange={e => onChange(e.target.value)} rows={rows}
    style={{ background: T.surface2, border: `1px solid ${T.border}`, color: T.text, borderRadius: 8, padding: "10px 14px", fontSize: 13, fontFamily: "'Cairo',sans-serif", outline: "none", width: "100%", resize: "vertical", boxSizing: "border-box" }} />
);

const Sel = ({ options, value, onChange, small }) => (
  <select value={value} onChange={e => onChange(e.target.value)}
    style={{ background: T.surface2, border: `1px solid ${T.border}`, color: T.text, borderRadius: 8, padding: small ? "6px 12px" : "10px 14px", fontSize: 13, fontFamily: "'Cairo',sans-serif", outline: "none", cursor: "pointer" }}>
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

const FormRow = ({ label, children, hint, required }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ display: "block", color: T.textMuted, fontSize: 11, fontWeight: 700, marginBottom: 6, letterSpacing: .5 }}>
      {label}{required && <span style={{ color: T.red, marginRight: 3 }}>*</span>}
    </label>
    {children}
    {hint && <div style={{ color: T.textDim, fontSize: 11, marginTop: 4 }}>{hint}</div>}
  </div>
);

const Table = ({ cols, data, onRowAction, emptyMsg = "لا توجد بيانات" }) => (
  <div style={{ overflowX: "auto" }}>
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: "'Cairo',sans-serif" }}>
      <thead>
        <tr style={{ borderBottom: `1px solid ${T.border}` }}>
          {cols.map(c => <th key={c.key} style={{ padding: "11px 16px", textAlign: "right", color: T.textMuted, fontWeight: 600, whiteSpace: "nowrap", fontSize: 12 }}>{c.label}</th>)}
          {onRowAction && <th style={{ padding: "11px 16px", color: T.textMuted, fontSize: 12, textAlign: "right" }}>إجراءات</th>}
        </tr>
      </thead>
      <tbody>
        {data.length === 0 && (
          <tr>
            <td colSpan={cols.length + (onRowAction ? 1 : 0)} style={{ textAlign: "center", padding: 50, color: T.textMuted, fontSize: 14 }}>
              {emptyMsg}
            </td>
          </tr>
        )}
        {data.map((row, i) => (
          <tr key={row.id || i} onMouseEnter={e => e.currentTarget.style.background = "#ffffff03"} onMouseLeave={e => e.currentTarget.style.background = "transparent"} style={{ borderBottom: `1px solid ${T.border}`, transition: "background .15s" }}>
            {cols.map(c => (
              <td key={c.key} style={{ padding: "11px 16px", color: T.text, whiteSpace: "nowrap" }}>
                {c.render ? c.render(row) : row[c.key]}
              </td>
            ))}
            {onRowAction && (
              <td style={{ padding: "11px 16px" }}>
                <div style={{ display: "flex", gap: 6 }}>{onRowAction(row)}</div>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const SectionHeader = ({ title, subtitle, actions = [] }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 26, flexWrap: "wrap", gap: 12 }}>
    <div>
      <h2 style={{ color: T.text, margin: 0, fontSize: 22, fontWeight: 900 }}>{title}</h2>
      {subtitle && <p style={{ color: T.textMuted, margin: "4px 0 0", fontSize: 13 }}>{subtitle}</p>}
    </div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div>
  </div>
);

// ============================================================
// 1. HOSPITAL DISPATCHER PANEL
// ============================================================
export const HospitalDispatcherPanel = () => {
  const [bookings, setBookings] = useState([]);
  const [nursingStaff, setNursingStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadBookings = async () => {
    try {
      setLoading(true);
      const [bookingsResponse, staffResponse] = await Promise.all([
        homeCareApi.getAllBookings(),
        homeCareApi.listStaff(),
      ]);
      setBookings(bookingsResponse.data || []);
      setNursingStaff(staffResponse.data || []);
    } catch (e) {
      console.error(e);
      showToast("فشل في تحميل الحجوزات الطبية", "danger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const openAssignModal = (booking) => {
    setSelectedBooking(booking);
    setAssignModalOpen(true);
  };

  const handleAssignNurse = async (nurse) => {
    if (!selectedBooking) return;
    try {
      await homeCareApi.assignNurse(selectedBooking.id, nurse.id);
      showToast(`تم تعيين الممرض(ة) ${nurse.full_name} بنجاح للطلب!`, "success");
      setAssignModalOpen(false);
      setSelectedBooking(null);
      loadBookings();
    } catch (err) {
      console.error(err);
      showToast("حدث خطأ أثناء تعيين الممرض", "danger");
    }
  };

  const cols = [
    { key: "id", label: "رقم الحجز", render: r => <span style={{ fontFamily: "monospace", color: T.textMuted }}>{r.id?.substring(0, 8)}...</span> },
    { key: "patient_id", label: "المريض", render: r => <span style={{ fontWeight: 700 }}>{r.patient_name || r.patient_id}</span> },
    { key: "service_name_ar", label: "الخدمة المطلوبة" },
    { key: "scheduled_at", label: "التاريخ والوقت", render: r => <span>{new Date(r.scheduled_at).toLocaleString("ar-SA")}</span> },
    { key: "total", label: "التكلفة", render: r => <span style={{ color: T.green }}>{r.total} ر.س</span> },
    { key: "state", label: "الحالة", render: r => <StatusBadge status={r.state} /> },
    { key: "provider_name", label: "الممرض المعين", render: r => r.provider_name ? <Badge color={T.purple}>{r.provider_name}</Badge> : <span style={{ color: T.textDim }}>غير معين</span> },
  ];

  return (
    <div>
      {toast && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: toast.type === "success" ? T.green : T.red, color: "#fff", padding: "12px 24px", borderRadius: 8, zIndex: 1100, fontWeight: 700, boxShadow: "0 4px 12px rgba(0,0,0,0.5)" }}>
          {toast.msg}
        </div>
      )}

      <SectionHeader
        title="🏥 لوحة توزيع مهام التمريض (Hospital Dispatcher Panel)"
        subtitle="إدارة وتوزيع الحجوزات الطبية لخدمات الرعاية والتمريض المنزلي"
        actions={[
          <Btn key="refresh" variant="primary" icon="🔄" onClick={loadBookings} disabled={loading}>
            تحديث البيانات
          </Btn>,
        ]}
      />

      <Card>
        {loading ? (
          <div style={{ color: T.textMuted, textAlign: "center", padding: 50 }}>جاري تحميل طلبات الحجز الفعالة...</div>
        ) : (
          <Table
            cols={cols}
            data={bookings}
            onRowAction={r => (
              <>
                <Btn small variant="success" icon="👤" onClick={() => openAssignModal(r)}>
                  تعيين ممرض
                </Btn>
              </>
            )}
            emptyMsg="لا توجد طلبات حجز تمريض نشطة حالياً"
          />
        )}
      </Card>

      {/* ASSIGN NURSE MODAL */}
      <Modal open={assignModalOpen} onClose={() => setAssignModalOpen(false)} title="📋 تعيين كادر تمريض للزيارة">
        {selectedBooking && (
          <div style={{ marginBottom: 20, borderBottom: `1px solid ${T.border}`, paddingBottom: 15 }}>
            <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 5 }}>حالة الطلب الحالي:</div>
            <div style={{ fontWeight: 700, color: T.text, fontSize: 14 }}>
              {selectedBooking.service_name_ar} - {selectedBooking.patient_name || selectedBooking.patient_id}
            </div>
            <div style={{ color: T.textMuted, fontSize: 12, marginTop: 4 }}>
              الموعد: {new Date(selectedBooking.scheduled_at).toLocaleString("ar-SA")} | العنوان: {selectedBooking.address?.address || "غير محدد"}
            </div>
          </div>
        )}

        <div style={{ maxHeight: 300, overflowY: "auto" }}>
          {nursingStaff.map(nurse => (
            <div key={nurse.id}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 10, marginBottom: 8, transition: "border .2s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = T.accent}
              onMouseLeave={e => e.currentTarget.style.borderColor = T.border}>
              <div>
                <div style={{ color: T.text, fontWeight: 700, fontSize: 13 }}>{nurse.full_name}</div>
                <div style={{ color: T.textMuted, fontSize: 11, marginTop: 2 }}>{nurse.degree || nurse.specialty || "كادر تمريض"}</div>
                <div style={{ color: T.textDim, fontSize: 11 }}>الهاتف: {nurse.phone}</div>
              </div>
              <Btn small variant="primary" onClick={() => handleAssignNurse(nurse)}>
                اختيار وتعيين
              </Btn>
            </div>
          ))}
          {nursingStaff.length === 0 && <div style={{ color: T.textMuted, padding: 16 }}>لا يوجد كادر تمريض نشط متاح للتعيين.</div>}
        </div>
      </Modal>
    </div>
  );
};

// ============================================================
// 2. NURSE ACTION CENTER & VISIT REPORT
// ============================================================
export const NurseActionCenter = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeJob, setActiveJob] = useState(null);
  const [toast, setToast] = useState(null);

  const [gpsTracking, setGpsTracking] = useState(false);
  const [deviceCoords, setDeviceCoords] = useState(null);
  const [gpsWatchId, setGpsWatchId] = useState(null);

  // Report Form State
  const [checklist, setChecklist] = useState({
    wound_dressing: false,
    iv_infusion: false,
    vitals_check: false,
    medication_given: false,
    patient_education: false,
  });
  const [vitals, setVitals] = useState({ bp: "", pulse: "", temp: "", glucose: "" });
  const [notes, setNotes] = useState("");
  const [attestationConfirmed, setAttestationConfirmed] = useState(false);

  // Supply Request State
  const [suppliesList, setSuppliesList] = useState([]);
  const [newItem, setNewItem] = useState({ name: "", qty: 1, unit: "pack" });

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadMyBookings = async () => {
    try {
      setLoading(true);
      const res = await homeCareApi.getMyBookings();
      const data = res.data || [];
      setBookings(data);

      // Restore active job if still in state
      const currentActive = data.find(b => ["CONFIRMED", "IN_TRANSIT", "ARRIVED", "CARE_IN_PROGRESS"].includes(b.state));
      if (currentActive) {
        setActiveJob(currentActive);
      } else {
        setActiveJob(null);
      }
    } catch (e) {
      console.error(e);
      showToast("خطأ أثناء تحميل طلبات الممرض", "danger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMyBookings();
    return () => {
      if (gpsWatchId !== null && navigator.geolocation) navigator.geolocation.clearWatch(gpsWatchId);
    };
  }, [gpsWatchId]);

  const handleRespond = async (id, accept) => {
    try {
      await homeCareApi.respondBooking(id, accept);
      showToast(accept ? "تم قبول الطلب وبدء تحضير الزيارة!" : "تم رفض الطلب وإعادته للتوزيع", accept ? "success" : "warning");
      loadMyBookings();
    } catch (err) {
      console.error(err);
      showToast("فشل تحديث حالة الطلب", "danger");
    }
  };

  const toggleGpsTracking = (bookingId) => {
    if (gpsTracking) {
      if (gpsWatchId !== null && navigator.geolocation) navigator.geolocation.clearWatch(gpsWatchId);
      setGpsWatchId(null);
      setGpsTracking(false);
      showToast("تم إيقاف تتبع نظام الـ GPS للموقع", "warning");
      return;
    }
    if (!navigator.geolocation) {
      showToast("لا يدعم المتصفح تحديد الموقع. استخدم جهازاً يسمح بالموقع الفعلي.", "danger");
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
        setDeviceCoords(coords);
        try {
          await homeCareApi.updateGps(bookingId, coords.lat, coords.lng);
        } catch (e) {
          console.error("GPS send failed:", e);
        }
      },
      () => showToast("تعذر الوصول إلى الموقع. راجع أذونات الموقع ثم حاول مجدداً.", "danger"),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
    );
    setGpsWatchId(watchId);
    setGpsTracking(true);
    showToast("بدأ تتبع الموقع الفعلي وإرسال الإحداثيات للزيارة.", "success");
  };

  const handleCheckIn = async (booking) => {
    if (!deviceCoords) {
      showToast("شغّل تتبع الموقع الفعلي أولاً قبل تسجيل الدخول للزيارة.", "danger");
      return;
    }
    try {
      await homeCareApi.checkIn(booking.id, {
        lat: deviceCoords.lat,
        lng: deviceCoords.lng,
      });
      showToast("تم تسجيل الدخول للزيارة بنجاح وبدء الخدمة", "success");
      loadMyBookings();
    } catch (err) {
      console.error(err);
      showToast("فشل تسجيل الدخول للزيارة", "danger");
    }
  };

  const submitReport = async () => {
    if (!activeJob) return;
    if (!attestationConfirmed) {
      showToast("يجب تأكيد صحة التقرير قبل الإرسال.", "danger");
      return;
    }

    const completed_tasks = Object.keys(checklist).filter(k => checklist[k]);

    try {
      await homeCareApi.submitVisitReport(activeJob.id, {
        vitals: { bp: vitals.bp, hr: Number(vitals.pulse) || undefined, temp: Number(vitals.temp) || undefined, blood_sugar: Number(vitals.glucose) || undefined },
        clinical_notes: notes,
        recommendations: completed_tasks.join(", "),
        provider_attestation: true,
      });

      showToast("تم رفع تقرير الزيارة بنجاح وإغلاق الطلب!", "success");
      setActiveJob(null);
      setChecklist({ wound_dressing: false, iv_infusion: false, vitals_check: false, medication_given: false, patient_education: false });
      setNotes("");
      setAttestationConfirmed(false);
      loadMyBookings();
    } catch (err) {
      console.error(err);
      showToast("حدث خطأ أثناء إرسال تقرير الزيارة", "danger");
    }
  };

  const handleAddSupply = async () => {
    if (!newItem.name.trim()) {
      showToast("يرجى إدخال اسم المستلزم الطبي", "danger");
      return;
    }

    const requestPayload = {
      items: [{ name: newItem.name, qty: Number(newItem.qty), unit: newItem.unit }],
    };

    if (!activeJob || !Number.isFinite(requestPayload.items[0].qty) || requestPayload.items[0].qty <= 0) {
      showToast("اختر زيارة نشطة وأدخل كمية صحيحة قبل إرسال الطلب.", "danger");
      return;
    }

    try {
      const response = await homeCareApi.requestInventory(activeJob.id, requestPayload.items);
      showToast("تم إرسال طلب المستلزمات الطبية للمستودع", "success");
      const items = response.data?.request?.items || [];
      setSuppliesList(prev => [...prev, ...items.map(item => ({ name: item.name, qty: item.qty, unit: item.unit, status: item.status }))]);
      setNewItem({ name: "", qty: 1, unit: "pack" });
    } catch (e) {
      console.error(e);
      showToast("فشل طلب المستلزمات الطبية", "danger");
    }
  };

  const pendingBookings = bookings.filter(b => b.state === "NEW_REQUEST");
  const activeBookings = bookings.filter(b => ["CONFIRMED", "IN_TRANSIT", "ARRIVED", "CARE_IN_PROGRESS"].includes(b.state));
  const closedBookings = bookings.filter(b => ["COMPLETED", "CANCELLED"].includes(b.state));

  return (
    <div>
      {toast && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: toast.type === "success" ? T.green : toast.type === "warning" ? T.orange : T.red, color: "#fff", padding: "12px 24px", borderRadius: 8, zIndex: 1100, fontWeight: 700, boxShadow: "0 4px 12px rgba(0,0,0,0.5)" }}>
          {toast.msg}
        </div>
      )}

      <SectionHeader
        title="💉 بوابة تقديم الرعاية الطبية (Nurse Action Center)"
        subtitle="واجهة التمريض الميداني لقبول الطلبات، التحديث الجغرافي، وإدخال تقارير المرضى والعلامات الحيوية"
        actions={[]}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 20, alignItems: "start" }}>
        {/* RIGHT COLUMN: BOOKINGS QUEUE */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* PENDING ASSIGNMENTS */}
          <Card accent={T.purple}>
            <div style={{ color: T.purple, fontSize: 15, fontWeight: 900, marginBottom: 12 }}>📥 طلبات تعيين جديدة بانتظار الموافقة ({pendingBookings.length})</div>
            {loading ? (
              <div style={{ color: T.textMuted, fontSize: 13 }}>جاري التحميل...</div>
            ) : pendingBookings.length === 0 ? (
              <div style={{ color: T.textMuted, fontSize: 13, padding: "15px 0" }}>لا توجد طلبات جديدة معلقة حالياً.</div>
            ) : (
              pendingBookings.map(b => (
                <div key={b.id} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 10, padding: 14, marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: T.text }}>{b.service_name_ar}</div>
                    <span style={{ color: T.green, fontSize: 13, fontFamily: "monospace" }}>{b.total} ر.س</span>
                  </div>
                  <div style={{ color: T.textMuted, fontSize: 12, marginTop: 4 }}>المريض: {b.patient_name || b.patient_id}</div>
                  <div style={{ color: T.textDim, fontSize: 11 }}>الموعد المجدول: {new Date(b.scheduled_at).toLocaleString("ar-SA")}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                    <Btn small variant="success" onClick={() => handleRespond(b.id, true)}>قبول الطلب</Btn>
                    <Btn small variant="danger" onClick={() => handleRespond(b.id, false)}>رفض</Btn>
                  </div>
                </div>
              ))
            )}
          </Card>

          {/* ACTIVE JOBS */}
          <Card accent={T.green}>
            <div style={{ color: T.green, fontSize: 15, fontWeight: 900, marginBottom: 12 }}>🚗 الزيارات الحالية والنشطة ({activeBookings.length})</div>
            {activeBookings.length === 0 ? (
              <div style={{ color: T.textMuted, fontSize: 13, padding: "15px 0" }}>لا توجد زيارات مفعلة حالياً. اقبل طلباً للبدء.</div>
            ) : (
              activeBookings.map(b => (
                <div key={b.id} onClick={() => setActiveJob(b)}
                  style={{ background: T.surface2, border: `1px solid ${activeJob?.id === b.id ? T.accent : T.border}`, borderRadius: 10, padding: 14, marginBottom: 8, cursor: "pointer", transition: "all .2s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: T.text }}>{b.service_name_ar}</div>
                    <StatusBadge status={b.state} />
                  </div>
                  <div style={{ color: T.textMuted, fontSize: 12, marginTop: 4 }}>المريض: {b.patient_name || b.patient_id}</div>
                  <div style={{ color: T.textDim, fontSize: 11 }}>العنوان: {b.address?.address || "العنوان غير متاح"}</div>
                  {activeJob?.id === b.id && <div style={{ color: T.accent, fontSize: 11, fontWeight: 700, marginTop: 8 }}>📌 قيد العرض والتجهيز حالياً</div>}
                </div>
              ))
            )}
          </Card>

          {/* ARCHIVE JOBS */}
          <Card>
            <div style={{ color: T.textMuted, fontSize: 14, fontWeight: 900, marginBottom: 12 }}>🏁 سجل الزيارات السابقة ({closedBookings.length})</div>
            <div style={{ maxHeight: 200, overflowY: "auto" }}>
              {closedBookings.map(b => (
                <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${T.border}` }}>
                  <div>
                    <span style={{ fontSize: 12, color: T.text }}>{b.service_name_ar}</span>
                    <div style={{ fontSize: 11, color: T.textDim }}>{b.patient_name || b.patient_id} · {new Date(b.scheduled_at).toLocaleDateString("ar-SA")}</div>
                  </div>
                  <StatusBadge status={b.state} />
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* LEFT COLUMN: ACTIVE VISIT EXECUTION WORKSPACE */}
        <div>
          {activeJob ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* STATUS BAR & STEPS */}
              <Card accent={T.accent}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
                  <h3 style={{ color: T.accent, margin: 0, fontSize: 16, fontWeight: 900 }}>⚙️ لوحة تتبع وتنفيذ الزيارة</h3>
                  <Badge color={T.accent}>{activeJob.id?.substring(0, 8)}</Badge>
                </div>

                {/* Real GPS Tracking */}
                <div style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 10, padding: 14, marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>📍 تتبع الموقع الفعلي</span>
                    {gpsTracking ? (
                      <span style={{ color: T.green, fontSize: 11, animation: "blink 1.5s infinite" }}>● جاري إرسال الموقع...</span>
                    ) : (
                      <span style={{ color: T.textDim, fontSize: 11 }}>متوقف</span>
                    )}
                  </div>
                  <div style={{ color: T.textMuted, fontSize: 12, fontFamily: "monospace", marginBottom: 10 }}>
                    خط العرض (Lat): {deviceCoords?.lat ?? "غير متاح"} | خط الطول (Lng): {deviceCoords?.lng ?? "غير متاح"}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Btn small variant={gpsTracking ? "warning" : "primary"} onClick={() => toggleGpsTracking(activeJob.id)}>
                      {gpsTracking ? "إيقاف تتبع الموقع" : "بدء تتبع GPS الفعلي"}
                    </Btn>

                    {activeJob.state === "CONFIRMED" && (
                      <Btn small variant="success" onClick={() => handleCheckIn(activeJob)}>
                        تسجيل الدخول (Check-in) للزيارة
                      </Btn>
                    )}
                  </div>
                </div>

                {/* Medical Insurance Integration */}
                <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, background: `${T.teal}08` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: T.teal, fontWeight: 700 }}>🛡️ حالة التأمين الطبي للطلب:</span>
                    <Badge color={T.teal}>{activeJob.payment_method === "insurance" ? "تغطية تأمينية" : "دفع نقدي"}</Badge>
                  </div>
                  {activeJob.payment_method === "insurance" && (
                    <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>
                      الشركة: {activeJob.insurance_details?.provider_name || "غير متاح"} | حالة الموافقة: <span style={{ color: T.green, fontWeight: 700 }}>{activeJob.insurance_status || "غير متاحة"}</span>
                    </div>
                  )}
                </div>
              </Card>

              {/* VISIT REPORT SUBMISSION FORM (Available when IN_PROGRESS) */}
              {activeJob.state === "CARE_IN_PROGRESS" ? (
                <>
                  <Card accent={T.teal}>
                    <div style={{ color: T.teal, fontSize: 15, fontWeight: 900, marginBottom: 16 }}>📋 تقرير الزيارة الطبية والعلامات الحيوية</div>

                    <FormRow label="العلامات الحيوية المقاسة (Vitals Logged)" required>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 6 }}>
                        <div>
                          <label style={{ fontSize: 11, color: T.textMuted }}>ضغط الدم (BP)</label>
                          <Input placeholder="120/80" value={vitals.bp} onChange={v => setVitals(prev => ({ ...prev, bp: v }))} full small />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, color: T.textMuted }}>النبض (Pulse / min)</label>
                          <Input type="number" placeholder="80" value={vitals.pulse} onChange={v => setVitals(prev => ({ ...prev, pulse: v }))} full small />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, color: T.textMuted }}>الحرارة (Temp °C)</label>
                          <Input type="number" placeholder="37" value={vitals.temp} onChange={v => setVitals(prev => ({ ...prev, temp: v }))} full small />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, color: T.textMuted }}>مستوى السكر (Glucose mg/dL)</label>
                          <Input type="number" placeholder="110" value={vitals.glucose} onChange={v => setVitals(prev => ({ ...prev, glucose: v }))} full small />
                        </div>
                      </div>
                    </FormRow>

                    <FormRow label="المهام التمريضية المنجزة (Completed Tasks)">
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
                        <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer", color: T.text, fontSize: 13 }}>
                          <input type="checkbox" checked={checklist.wound_dressing} onChange={e => setChecklist(prev => ({ ...prev, wound_dressing: e.target.checked }))} />
                          <span>غيار وتطهير الجرح المتقدم</span>
                        </label>
                        <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer", color: T.text, fontSize: 13 }}>
                          <input type="checkbox" checked={checklist.iv_infusion} onChange={e => setChecklist(prev => ({ ...prev, iv_infusion: e.target.checked }))} />
                          <span>تركيب المحلول والأنبوب الوريدي</span>
                        </label>
                        <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer", color: T.text, fontSize: 13 }}>
                          <input type="checkbox" checked={checklist.vitals_check} onChange={e => setChecklist(prev => ({ ...prev, vitals_check: e.target.checked }))} />
                          <span>قياس وتسجيل العلامات الحيوية</span>
                        </label>
                        <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer", color: T.text, fontSize: 13 }}>
                          <input type="checkbox" checked={checklist.medication_given} onChange={e => setChecklist(prev => ({ ...prev, medication_given: e.target.checked }))} />
                          <span>إعطاء الأدوية الموصوفة للزيارة</span>
                        </label>
                        <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer", color: T.text, fontSize: 13 }}>
                          <input type="checkbox" checked={checklist.patient_education} onChange={e => setChecklist(prev => ({ ...prev, patient_education: e.target.checked }))} />
                          <span>تثقيف وتوعية المريض والمرافق</span>
                        </label>
                      </div>
                    </FormRow>

                    <FormRow label="ملاحظات الممرض وحالة المريض (Visit Notes)">
                      <Textarea placeholder="اكتب ملاحظاتك الطبية هنا بالتفصيل عن حالة المريض الصحية..." value={notes} onChange={setNotes} rows={3} />
                    </FormRow>

                    <FormRow label="إقرار مهني بالتقرير" required hint="يثبت الإقرار هوية المزوّد من الجلسة الموثقة وتوقيت الإرسال في سجل الزيارة.">
                      <label style={{ display: "flex", gap: 8, alignItems: "flex-start", cursor: "pointer", color: T.text, fontSize: 13, lineHeight: 1.6 }}>
                        <input type="checkbox" checked={attestationConfirmed} onChange={e => setAttestationConfirmed(e.target.checked)} />
                        <span>أقر بأن البيانات والعلامات الحيوية المدخلة أعلاه صحيحة وتم تسجيلها خلال هذه الزيارة.</span>
                      </label>
                    </FormRow>

                    <Btn variant="teal" icon="✅" onClick={submitReport} style={{ width: "100%", marginTop: 10 }}>
                      رفع التقرير الطبي وإنهاء الخدمة
                    </Btn>
                  </Card>

                  {/* INVENTORY REQUEST FORM FOR PREPARING BAG */}
                  <Card accent={T.orange}>
                    <div style={{ color: T.orange, fontSize: 14, fontWeight: 900, marginBottom: 12 }}>📦 طلب مستهلكات طبية للحقيبة (Inventory Supplies)</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
                      <Input placeholder="شاش / إبر / محلول..." value={newItem.name} onChange={v => setNewItem(prev => ({ ...prev, name: v }))} small />
                      <Input type="number" placeholder="الكمية" value={newItem.qty} onChange={v => setNewItem(prev => ({ ...prev, qty: v }))} small />
                      <Sel
                        options={[
                          { value: "pack", label: "علبة (Pack)" },
                          { value: "piece", label: "حبة (Piece)" },
                          { value: "ml", label: "مل (ML)" },
                        ]}
                        value={newItem.unit}
                        onChange={v => setNewItem(prev => ({ ...prev, unit: v }))}
                        small
                      />
                    </div>
                    <Btn small variant="warning" icon="＋" onClick={handleAddSupply} style={{ width: "100%" }}>
                      إرسال طلب المستلزم للمستشفى
                    </Btn>

                    {suppliesList.length > 0 && (
                      <div style={{ marginTop: 12, borderTop: `1px solid ${T.border}`, paddingTop: 10 }}>
                        <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 6 }}>المستلزمات المطلوبة حالياً للزيارة:</div>
                        {suppliesList.map((sup, idx) => (
                          <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 8px", background: T.surface2, borderRadius: 6, marginBottom: 4 }}>
                            <span style={{ fontSize: 12, color: T.text }}>{sup.name} ({sup.qty} {sup.unit})</span>
                            <StatusBadge status={sup.status} />
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </>
              ) : (
                <Card>
                  <div style={{ textAlign: "center", padding: 40, color: T.textMuted, fontSize: 13 }}>
                    يرجى تسجيل الدخول للزيارة أولاً (Check-in) لتتمكن من كتابة التقرير الطبي وطلب المستلزمات.
                  </div>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <div style={{ textAlign: "center", padding: 60, color: T.textMuted, fontSize: 14 }}>
                يرجى اختيار زيارة نشطة ومقبولة من القائمة الجانبية للبدء في تتبعها وتعديلها.
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
