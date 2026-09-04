"use client";

import React, { useState } from "react";
import { 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Home, 
  Building2, 
  MapPin, 
  Phone, 
  User, 
  ShieldCheck, 
  CreditCard, 
  X,
  Sparkles
} from "lucide-react";
import styles from "./service-booking-modal.module.css";

type Props = {
  locale: string;
  serviceId: string;
  serviceName: string;
  servicePrice?: number;
  serviceType: "lab" | "radiology" | "nursing";
  homeVisitSupported?: boolean;
  buttonLabel?: string;
};

export function ServiceBookingModal({
  locale,
  serviceId,
  serviceName,
  servicePrice = 250,
  serviceType,
  homeVisitSupported = true,
  buttonLabel,
}: Props) {
  const isAr = locale === "ar";
  const [isOpen, setIsOpen] = useState(false);
  const [visitType, setVisitType] = useState<"home" | "facility">(homeVisitSupported ? "home" : "facility");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [slot, setSlot] = useState("09:00 ص - 12:00 م");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"mada" | "apple_pay" | "cash">("mada");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedData, setConfirmedData] = useState<any | null>(null);
  const [error, setError] = useState("");

  const defaultBtnText = buttonLabel || (isAr ? "احجز الخدمة الآن" : "Book Service Now");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(isAr ? "يرجى كتابة اسم المريض" : "Please enter patient name");
      return;
    }
    if (!phone.trim() || phone.trim().length < 9) {
      setError(isAr ? "يرجى كتابة رقم جوال صحيح (05xxxxxxxx)" : "Please enter a valid mobile number");
      return;
    }
    if (visitType === "home" && !address.trim()) {
      setError(isAr ? "يرجى كتابة عنوان المنزل (المدينة والحي)" : "Please enter home address");
      return;
    }

    setIsSubmitting(true);
    setError("");

    setTimeout(() => {
      const prefix = serviceType === "lab" ? "LAB" : serviceType === "radiology" ? "RAD" : "NUR";
      const bookingRef = `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;
      setConfirmedData({
        ref: bookingRef,
        serviceName,
        date,
        slot,
        name,
        phone,
        visitType: visitType === "home" ? (isAr ? "زيارة منزلية" : "Home Visit") : (isAr ? "في المركز الطبي" : "Clinic Visit"),
        address: address || (isAr ? "مركز نبض الطبي - الرياض" : "Nabd Medical Center"),
        price: servicePrice,
      });
      setIsSubmitting(false);
    }, 900);
  };

  const close = () => {
    setIsOpen(false);
    setConfirmedData(null);
  };

  return (
    <>
      <button 
        type="button" 
        onClick={() => setIsOpen(true)}
        className={styles.triggerBtn}
      >
        <Sparkles size={18} />
        <span>{defaultBtnText}</span>
      </button>

      {isOpen && (
        <div className={styles.modalBackdrop} onClick={close}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <button type="button" className={styles.closeBtn} onClick={close} aria-label="Close">
              <X size={20} />
            </button>

            {confirmedData ? (
              <div className={styles.successState}>
                <div className={styles.successIcon}>
                  <CheckCircle2 size={54} color="#00876F" />
                </div>
                <div className={styles.confirmedBadge}>
                  <ShieldCheck size={16} />
                  <span>{isAr ? "تم تأكيد الحجز بنجاح" : "Booking Confirmed"}</span>
                </div>
                <h2>{isAr ? "تم استلام طلب حجزك بنجاح" : "Your booking is confirmed"}</h2>
                <p className={styles.confirmSub}>
                  {isAr 
                    ? `رقم الحجز المرجعي الخاص بك هو #${confirmedData.ref}. ستصلك رسالة تأكيد عبر الجوال.`
                    : `Booking reference #${confirmedData.ref}. You will receive an SMS confirmation.`}
                </p>

                <div className={styles.confirmReceipt}>
                  <div className={styles.receiptRow}>
                    <span>{isAr ? "الخدمة المحجوزة" : "Service"}</span>
                    <strong>{confirmedData.serviceName}</strong>
                  </div>
                  <div className={styles.receiptRow}>
                    <span>{isAr ? "نوع الزيارة" : "Visit Type"}</span>
                    <span>{confirmedData.visitType}</span>
                  </div>
                  <div className={styles.receiptRow}>
                    <span>{isAr ? "الموعد المحدد" : "Scheduled Time"}</span>
                    <span>{confirmedData.date} ({confirmedData.slot})</span>
                  </div>
                  <div className={styles.receiptRow}>
                    <span>{isAr ? "اسم المريض" : "Patient"}</span>
                    <span>{confirmedData.name} ({confirmedData.phone})</span>
                  </div>
                  <div className={styles.receiptRowTotal}>
                    <span>{isAr ? "المبلغ المستحق" : "Total Amount"}</span>
                    <strong>{confirmedData.price} {isAr ? "ر.س" : "SAR"}</strong>
                  </div>
                </div>

                <button type="button" onClick={close} className={styles.doneBtn}>
                  {isAr ? "تم، العودة للصفحة" : "Done"}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className={styles.bookingForm}>
                <div className={styles.header}>
                  <div className={styles.serviceBadge}>
                    <ShieldCheck size={15} />
                    <span>{isAr ? "حجز فوري معتمد" : "Verified Booking"}</span>
                  </div>
                  <h2>{serviceName}</h2>
                  <p className={styles.priceTag}>
                    {isAr ? "تكلفة الخدمة:" : "Price:"} <strong>{servicePrice} {isAr ? "ر.س" : "SAR"}</strong>
                  </p>
                </div>

                {homeVisitSupported && (
                  <div className={styles.visitTypeToggle}>
                    <button
                      type="button"
                      className={`${styles.toggleBtn} ${visitType === "home" ? styles.toggleActive : ""}`}
                      onClick={() => setVisitType("home")}
                    >
                      <Home size={18} />
                      <span>{isAr ? "زيارة منزلية" : "Home Visit"}</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.toggleBtn} ${visitType === "facility" ? styles.toggleActive : ""}`}
                      onClick={() => setVisitType("facility")}
                    >
                      <Building2 size={18} />
                      <span>{isAr ? "في المركز الطبي" : "At Center"}</span>
                    </button>
                  </div>
                )}

                <div className={styles.fieldsGrid}>
                  <div className={styles.field}>
                    <label>
                      <User size={15} />
                      <span>{isAr ? "اسم المريض" : "Patient Name"} *</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={isAr ? "الاسم الكامل" : "Full Name"}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div className={styles.field}>
                    <label>
                      <Phone size={15} />
                      <span>{isAr ? "رقم الجوال" : "Mobile Phone"} *</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="05XXXXXXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  <div className={styles.field}>
                    <label>
                      <Calendar size={15} />
                      <span>{isAr ? "التاريخ المفضل" : "Preferred Date"}</span>
                    </label>
                    <input
                      type="date"
                      value={date}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>

                  <div className={styles.field}>
                    <label>
                      <Clock size={15} />
                      <span>{isAr ? "الفترة الزمنية" : "Time Slot"}</span>
                    </label>
                    <select value={slot} onChange={(e) => setSlot(e.target.value)}>
                      <option value="09:00 ص - 12:00 م">{isAr ? "صباحية (09:00 ص - 12:00 م)" : "Morning (09:00 - 12:00)"}</option>
                      <option value="01:00 م - 04:00 م">{isAr ? "ظهيرة (01:00 م - 04:00 م)" : "Afternoon (13:00 - 16:00)"}</option>
                      <option value="05:00 م - 09:00 م">{isAr ? "مسائية (05:00 م - 09:00 م)" : "Evening (17:00 - 21:00)"}</option>
                    </select>
                  </div>

                  {visitType === "home" && (
                    <div className={`${styles.field} ${styles.fullWidth}`}>
                      <label>
                        <MapPin size={15} />
                        <span>{isAr ? "عنوان المنزل والحي" : "Address & Neighborhood"} *</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={isAr ? "مثال: الرياض - حي الملقا، شارع الأمير محمد" : "City, District, Street"}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div className={styles.paymentSelect}>
                  <label className={styles.paymentLabel}>
                    <CreditCard size={16} />
                    <span>{isAr ? "طريقة الدفع" : "Payment Method"}</span>
                  </label>
                  <div className={styles.paymentPills}>
                    <button
                      type="button"
                      className={`${styles.paymentPill} ${paymentMethod === "mada" ? styles.paymentPillActive : ""}`}
                      onClick={() => setPaymentMethod("mada")}
                    >
                      <span>{isAr ? "بطاقة مدى / فيزا" : "Mada / Visa"}</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.paymentPill} ${paymentMethod === "apple_pay" ? styles.paymentPillActive : ""}`}
                      onClick={() => setPaymentMethod("apple_pay")}
                    >
                      <span>Apple Pay</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.paymentPill} ${paymentMethod === "cash" ? styles.paymentPillActive : ""}`}
                      onClick={() => setPaymentMethod("cash")}
                    >
                      <span>{isAr ? "الدفع عند الزيارة" : "Pay at Visit"}</span>
                    </button>
                  </div>
                </div>

                {error && <p className={styles.errorText}>{error}</p>}

                <button type="submit" disabled={isSubmitting} className={styles.confirmBtn}>
                  {isSubmitting 
                    ? (isAr ? "جارٍ تأكيد الحجز…" : "Confirming…")
                    : (isAr ? `تأكيد حجز الموعد (${servicePrice} ر.س)` : `Confirm Booking (${servicePrice} SAR)`)}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
