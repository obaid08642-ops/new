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
  Sparkles,
  FileCheck2
} from "lucide-react";
import { SAUDI_INSURANCE_COMPANIES } from "@/lib/data/insurance-companies";
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
  const [paymentMethod, setPaymentMethod] = useState<"mada" | "apple_pay" | "cash" | "insurance">("mada");
  
  // Insurance state
  const [insuranceCompany, setInsuranceCompany] = useState("bupa");
  const [policyNumber, setPolicyNumber] = useState("");
  const [nationalId, setNationalId] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedData, setConfirmedData] = useState<any | null>(null);
  const [error, setError] = useState("");

  const selectedInsCompany = SAUDI_INSURANCE_COMPANIES.find(c => c.id === insuranceCompany) || SAUDI_INSURANCE_COMPANIES[0];
  const patientCoPay = Math.min(servicePrice * selectedInsCompany.defaultCoPay, selectedInsCompany.maxCoPaySar);
  const insuranceCovered = servicePrice - patientCoPay;

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

    if (paymentMethod === "insurance") {
      if (!policyNumber.trim()) {
        setError(isAr ? "يرجى إدخال رقم بطاقة التأمين" : "Please enter insurance policy number");
        return;
      }
      if (!nationalId.trim() || nationalId.trim().length < 10) {
        setError(isAr ? "يرجى إدخال رقم الهوية أو الإقامة (10 أرقام)" : "Please enter 10-digit National ID");
        return;
      }
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
        price: paymentMethod === "insurance" ? patientCoPay : servicePrice,
        paymentMethod,
        insuranceDetails: paymentMethod === "insurance" ? {
          company: isAr ? selectedInsCompany.nameAr : selectedInsCompany.nameEn,
          policyNumber,
          covered: insuranceCovered,
          copay: patientCoPay
        } : null
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
        <span>{defaultBtnText}</span>
      </button>

      {isOpen && (
        <div className={styles.backdrop} onClick={close}>
          <div 
            className={styles.modal} 
            onClick={(e) => e.stopPropagation()}
            dir={isAr ? "rtl" : "ltr"}
          >
            <button type="button" onClick={close} className={styles.closeBtn} aria-label="Close modal">
              <X size={20} />
            </button>

            {confirmedData ? (
              <div className={styles.confirmedBox}>
                <div className={styles.successIcon}>
                  <CheckCircle2 size={54} color="#00876F" />
                </div>
                <h2>{isAr ? "تم تأكيد موعدك بنجاح!" : "Booking Confirmed!"}</h2>
                <p className={styles.refCode}>
                  {isAr ? "رقم مرجع الحجز:" : "Booking Reference:"} <strong>#{confirmedData.ref}</strong>
                </p>

                <div className={styles.receipt}>
                  <div className={styles.receiptRow}>
                    <span>{isAr ? "الخدمة المطلوبة:" : "Service:"}</span>
                    <strong>{confirmedData.serviceName}</strong>
                  </div>
                  <div className={styles.receiptRow}>
                    <span>{isAr ? "المريض:" : "Patient:"}</span>
                    <span>{confirmedData.name} ({confirmedData.phone})</span>
                  </div>
                  <div className={styles.receiptRow}>
                    <span>{isAr ? "الموعد:" : "Schedule:"}</span>
                    <span>{confirmedData.date} | {confirmedData.slot}</span>
                  </div>
                  <div className={styles.receiptRow}>
                    <span>{isAr ? "نوع ومكان الزيارة:" : "Location:"}</span>
                    <span>{confirmedData.visitType} - {confirmedData.address}</span>
                  </div>

                  {confirmedData.insuranceDetails && (
                    <div style={{ background: "rgba(0, 135, 111, 0.06)", padding: "10px", borderRadius: "8px", margin: "8px 0" }}>
                      <div className={styles.receiptRow} style={{ color: "#00876F", fontWeight: "bold" }}>
                        <span>{isAr ? "تغطية التأمين:" : "Insurance:"}</span>
                        <span>{confirmedData.insuranceDetails.company} (معتمدة ✓)</span>
                      </div>
                      <div className={styles.receiptRow} style={{ fontSize: "0.85rem" }}>
                        <span>{isAr ? "تحمل المريض (Co-pay):" : "Patient Co-pay:"}</span>
                        <strong>{confirmedData.insuranceDetails.copay.toFixed(2)} {isAr ? "ر.س" : "SAR"}</strong>
                      </div>
                    </div>
                  )}

                  <div className={styles.receiptRowTotal}>
                    <span>{isAr ? "المبلغ المطلوب سداده:" : "Amount to Pay:"}</span>
                    <strong style={{ color: "#00876F", fontSize: "1.2rem" }}>
                      {confirmedData.price.toFixed(2)} {isAr ? "ر.س" : "SAR"}
                    </strong>
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

                {/* Payment & Insurance Selector */}
                <div className={styles.paymentSelect}>
                  <label className={styles.paymentLabel}>
                    <CreditCard size={16} />
                    <span>{isAr ? "طريقة الدفع والتغطية" : "Payment & Coverage"}</span>
                  </label>
                  <div className={styles.paymentPills}>
                    <button
                      type="button"
                      className={`${styles.paymentPill} ${paymentMethod === "mada" ? styles.paymentPillActive : ""}`}
                      onClick={() => setPaymentMethod("mada")}
                    >
                      <span>{isAr ? "مدى / بطاقة" : "Mada / Card"}</span>
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
                      className={`${styles.paymentPill} ${paymentMethod === "insurance" ? styles.paymentPillActive : ""}`}
                      onClick={() => setPaymentMethod("insurance")}
                    >
                      <span style={{ fontWeight: "bold" }}>{isAr ? "تأمين طبي" : "Insurance"}</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.paymentPill} ${paymentMethod === "cash" ? styles.paymentPillActive : ""}`}
                      onClick={() => setPaymentMethod("cash")}
                    >
                      <span>{isAr ? "عند الزيارة" : "At Visit"}</span>
                    </button>
                  </div>
                </div>

                {/* Insurance Details Form inside Modal */}
                {paymentMethod === "insurance" && (
                  <div style={{ padding: "12px", background: "rgba(0, 135, 111, 0.05)", borderRadius: "10px", border: "1px solid rgba(0, 135, 111, 0.18)", marginTop: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px", color: "#00876F" }}>
                      <FileCheck2 size={16} />
                      <strong style={{ fontSize: "0.9rem" }}>{isAr ? "بيانات وثيقة التأمين" : "Insurance Policy"}</strong>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <div>
                        <label style={{ fontSize: "0.78rem", fontWeight: "bold", color: "#475569" }}>
                          {isAr ? "شركة التأمين" : "Company"}
                        </label>
                        <select 
                          value={insuranceCompany} 
                          onChange={(e) => setInsuranceCompany(e.target.value)}
                          style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "0.85rem" }}
                        >
                          {SAUDI_INSURANCE_COMPANIES.map((c) => (
                            <option key={c.id} value={c.id}>
                              {isAr ? c.nameAr : c.nameEn}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: "0.78rem", fontWeight: "bold", color: "#475569" }}>
                          {isAr ? "رقم بطاقة التأمين" : "Policy Number"}
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 1048291"
                          value={policyNumber}
                          onChange={(e) => setPolicyNumber(e.target.value)}
                          style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "0.85rem" }}
                        />
                      </div>

                      <div style={{ gridColumn: "1 / -1" }}>
                        <label style={{ fontSize: "0.78rem", fontWeight: "bold", color: "#475569" }}>
                          {isAr ? "رقم الهوية الوطنية / الإقامة" : "National ID / Iqama"}
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={10}
                          placeholder="10XXXXXXXX"
                          value={nationalId}
                          onChange={(e) => setNationalId(e.target.value)}
                          style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "0.85rem" }}
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: "8px", display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "#00876F", fontWeight: "bold" }}>
                      <span>{isAr ? `تغطية التأمين: ${insuranceCovered.toFixed(2)} ر.س` : `Covered: ${insuranceCovered.toFixed(2)} SAR`}</span>
                      <span style={{ color: "#B45309" }}>{isAr ? `مبلغ التحمل: ${patientCoPay.toFixed(2)} ر.س` : `Co-pay: ${patientCoPay.toFixed(2)} SAR`}</span>
                    </div>
                  </div>
                )}

                {error && <p className={styles.errorText}>{error}</p>}

                <button type="submit" disabled={isSubmitting} className={styles.confirmBtn}>
                  {isSubmitting 
                    ? (isAr ? "جارٍ تأكيد الحجز…" : "Confirming…")
                    : paymentMethod === "insurance"
                    ? (isAr ? `تأكيد الحجز بموافقة التأمين (${patientCoPay.toFixed(2)} ر.س)` : `Confirm Booking with Insurance (${patientCoPay.toFixed(2)} SAR)`)
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
