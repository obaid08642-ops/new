"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCart } from "@/lib/context/CartContext";
import { 
  CheckCircle2, 
  CreditCard, 
  Truck, 
  MapPin, 
  Phone, 
  User, 
  Clock, 
  ShieldCheck, 
  ShoppingBag,
  ArrowLeft,
  ArrowRight,
  Banknote,
  Smartphone,
  ChevronLeft,
  FileCheck2,
  Sparkles
} from "lucide-react";
import { SAUDI_INSURANCE_COMPANIES } from "@/lib/data/insurance-companies";
import styles from "./checkout-flow.module.css";

type Props = {
  locale: string;
};

export function CheckoutFlow({ locale }: Props) {
  const { items, subtotal, clearCart } = useCart();
  const isAr = locale === "ar";
  const Direction = isAr ? ArrowLeft : ArrowRight;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState(isAr ? "الرياض" : "Riyadh");
  const [district, setDistrict] = useState("");
  const [street, setStreet] = useState("");
  
  // Payment and Insurance State
  const [paymentMethod, setPaymentMethod] = useState<"mada" | "apple_pay" | "visa" | "cod" | "insurance">("mada");
  const [insuranceCompany, setInsuranceCompany] = useState("bupa");
  const [policyNumber, setPolicyNumber] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [planTier, setPlanTier] = useState<"vip" | "class_a" | "class_b" | "class_c">("class_a");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const selectedInsCompany = SAUDI_INSURANCE_COMPANIES.find(c => c.id === insuranceCompany) || SAUDI_INSURANCE_COMPANIES[0];

  // Pricing & Insurance Deductible Math
  const deliveryFee = subtotal > 100 ? 0 : 15;
  const originalVat = (subtotal + deliveryFee) * 0.15;
  const originalGrandTotal = subtotal + deliveryFee + originalVat;

  const coPayRate = planTier === "vip" ? 0 : selectedInsCompany.defaultCoPay;
  const uncappedCoPay = subtotal * coPayRate;
  const patientCoPayMedication = Math.min(uncappedCoPay, selectedInsCompany.maxCoPaySar);
  const insuranceContribution = paymentMethod === "insurance" ? (subtotal - patientCoPayMedication) : 0;
  const effectiveSubtotal = paymentMethod === "insurance" ? patientCoPayMedication : subtotal;
  const vat = (effectiveSubtotal + deliveryFee) * 0.15;
  const grandTotal = effectiveSubtotal + deliveryFee + vat;

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage(isAr ? "يرجى كتابة الاسم الكامل" : "Please enter your full name");
      return;
    }
    if (!phone.trim() || phone.trim().length < 9) {
      setErrorMessage(isAr ? "يرجى كتابة رقم جوال صحيح (05xxxxxxxx)" : "Please enter a valid Saudi phone number");
      return;
    }
    if (!district.trim()) {
      setErrorMessage(isAr ? "يرجى كتابة الحي أو العنوان" : "Please enter your district/neighborhood");
      return;
    }

    if (paymentMethod === "insurance") {
      if (!policyNumber.trim() || policyNumber.trim().length < 5) {
        setErrorMessage(isAr ? "يرجى إدخال رقم وثيقة التأمين / بطاقة العضوية" : "Please enter valid insurance policy / member number");
        return;
      }
      if (!nationalId.trim() || nationalId.trim().length < 10) {
        setErrorMessage(isAr ? "يرجى إدخال رقم الهوية الوطنية أو الإقامة (10 أرقام)" : "Please enter 10-digit National ID or Iqama");
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage("");

    setTimeout(() => {
      const orderRef = `NBD-${Math.floor(100000 + Math.random() * 900000)}`;
      const confirmedData = {
        orderId: orderRef,
        customerName: name,
        customerPhone: phone,
        address: `${city} - ${district} ${street ? ` - ${street}` : ""}`,
        paymentMethod,
        insuranceDetails: paymentMethod === "insurance" ? {
          companyName: isAr ? selectedInsCompany.nameAr : selectedInsCompany.nameEn,
          policyNumber,
          nationalId,
          planTier: planTier === "vip" ? "VIP" : planTier === "class_a" ? "Class A (فئة أ)" : planTier === "class_b" ? "Class B (فئة ب)" : "Class C (فئة ج)",
          contribution: insuranceContribution,
          copay: patientCoPayMedication,
          approved: true,
        } : null,
        items: [...items],
        total: grandTotal,
        originalTotal: originalGrandTotal,
        date: new Date().toLocaleDateString(isAr ? "ar-SA" : "en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      };
      setOrderConfirmed(confirmedData);
      clearCart();
      setIsSubmitting(false);
    }, 1000);
  };

  if (orderConfirmed) {
    return (
      <div className={styles.successCard}>
        <div className={styles.successIconWrap}>
          <CheckCircle2 size={56} color="#00876F" />
        </div>
        <div className={styles.badgeSuccess}>
          <ShieldCheck size={16} />
          <span>{isAr ? "تم تأكيد طلبك بنجاح" : "Order Confirmed Successfully"}</span>
        </div>
        <h1>{isAr ? "شكراً لك، طلبك قيد التجهيز الفوري" : "Thank you, your order is being prepared"}</h1>
        <p className={styles.orderSubtitle}>
          {isAr 
            ? `رقم الطلب الخاص بك هو #${orderConfirmed.orderId}. سيصلك مندوب التوصيل خلال 30 دقيقة.`
            : `Your order reference is #${orderConfirmed.orderId}. Express delivery estimated in 30 minutes.`}
        </p>

        <div className={styles.orderSummaryBox}>
          <div className={styles.orderRow}>
            <span>{isAr ? "رقم الطلب" : "Order ID"}</span>
            <strong>#{orderConfirmed.orderId}</strong>
          </div>
          <div className={styles.orderRow}>
            <span>{isAr ? "تاريخ الطلب" : "Order Date"}</span>
            <span>{orderConfirmed.date}</span>
          </div>
          <div className={styles.orderRow}>
            <span>{isAr ? "عنوان التوصيل" : "Delivery Address"}</span>
            <span>{orderConfirmed.address}</span>
          </div>
          <div className={styles.orderRow}>
            <span>{isAr ? "طريقة الدفع" : "Payment Method"}</span>
            <span>
              {orderConfirmed.paymentMethod === "mada" && "مدى (Mada)"}
              {orderConfirmed.paymentMethod === "apple_pay" && "Apple Pay"}
              {orderConfirmed.paymentMethod === "visa" && (isAr ? "بطاقة ائتمانية" : "Credit Card")}
              {orderConfirmed.paymentMethod === "cod" && (isAr ? "الدفع عند الاستلام" : "Cash on Delivery")}
              {orderConfirmed.paymentMethod === "insurance" && (isAr ? `تأمين طبي (${orderConfirmed.insuranceDetails.companyName})` : `Health Insurance (${orderConfirmed.insuranceDetails.companyName})`)}
            </span>
          </div>

          {orderConfirmed.insuranceDetails && (
            <div style={{ background: "rgba(0, 135, 111, 0.05)", padding: "12px", borderRadius: "10px", margin: "8px 0", border: "1px solid rgba(0, 135, 111, 0.15)" }}>
              <div className={styles.orderRow} style={{ color: "#00876F", fontWeight: "bold" }}>
                <span>{isAr ? "حالة التغطية التأمينية" : "Insurance Status"}</span>
                <span>{isAr ? "موافقة فورية معتمدة ✓" : "Instant Approval Verified ✓"}</span>
              </div>
              <div className={styles.orderRow} style={{ fontSize: "0.85rem", marginTop: "4px" }}>
                <span>{isAr ? "مساهمة شركة التأمين" : "Insurance Covered"}</span>
                <span style={{ color: "#00876F", fontWeight: "bold" }}>-{orderConfirmed.insuranceDetails.contribution.toFixed(2)} {isAr ? "ر.س" : "SAR"}</span>
              </div>
              <div className={styles.orderRow} style={{ fontSize: "0.85rem" }}>
                <span>{isAr ? "رقم الوثيقة / الفئة" : "Policy / Tier"}</span>
                <span>{orderConfirmed.insuranceDetails.policyNumber} ({orderConfirmed.insuranceDetails.planTier})</span>
              </div>
            </div>
          )}

          <div className={styles.orderRowTotal}>
            <span>{isAr ? "المبلغ الإجمالي المدفوع" : "Total Paid"}</span>
            <strong>{orderConfirmed.total.toFixed(2)} {isAr ? "ر.س" : "SAR"}</strong>
          </div>
        </div>

        <div className={styles.actionButtons}>
          <Link href={`/${locale}`} className={styles.primaryBtn}>
            <span>{isAr ? "العودة للرئيسية" : "Back to Home"}</span>
          </Link>
          <Link href={`/${locale}/c`} className={styles.secondaryBtn}>
            <span>{isAr ? "متابعة التسوق" : "Continue Shopping"}</span>
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={styles.emptyCartCard}>
        <ShoppingBag size={52} color="#64748B" />
        <h2>{isAr ? "لا توجد منتجات في السلة لإتمام الطلب" : "Your cart is empty"}</h2>
        <p>{isAr ? "أضف بعض المنتجات والأدوية أولاً لإتمام طلبك." : "Add some medicines or health products first."}</p>
        <Link href={`/${locale}/c`} className={styles.primaryBtn}>
          <span>{isAr ? "تصفح الصيدلية" : "Browse Pharmacy"}</span>
          <ChevronLeft size={18} />
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.checkoutLayout}>
      <form onSubmit={handlePlaceOrder} className={styles.checkoutForm}>
        {/* Step 1: Customer & Delivery Info */}
        <section className={styles.cardSection}>
          <div className={styles.sectionHeader}>
            <MapPin size={22} color="#00876F" />
            <div>
              <h2>{isAr ? "1. معلومات المستلم والتوصيل" : "1. Recipient & Delivery Information"}</h2>
              <p>{isAr ? "حدد موقعك ورقم التواصل لضمان وصول المندوب فوراً" : "Enter delivery location and contact number"}</p>
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label htmlFor="patient-name">
                <User size={15} />
                <span>{isAr ? "اسم المستلم الكامل" : "Full Name"} *</span>
              </label>
              <input
                id="patient-name"
                type="text"
                required
                placeholder={isAr ? "مثال: عبد الله السعيد" : "e.g. Abdullah Al-Saeed"}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className={styles.formField}>
              <label htmlFor="patient-phone">
                <Phone size={15} />
                <span>{isAr ? "رقم الجوال (للتواصل والتتبع)" : "Mobile Number"} *</span>
              </label>
              <input
                id="patient-phone"
                type="tel"
                required
                placeholder="05XXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className={styles.formField}>
              <label htmlFor="patient-city">
                <MapPin size={15} />
                <span>{isAr ? "المدينة" : "City"} *</span>
              </label>
              <select id="patient-city" value={city} onChange={(e) => setCity(e.target.value)}>
                <option value={isAr ? "الرياض" : "Riyadh"}>{isAr ? "الرياض" : "Riyadh"}</option>
                <option value={isAr ? "جدة" : "Jeddah"}>{isAr ? "جدة" : "Jeddah"}</option>
                <option value={isAr ? "الدمام" : "Dammam"}>{isAr ? "الدمام" : "Dammam"}</option>
                <option value={isAr ? "مكة المكرمة" : "Makkah"}>{isAr ? "مكة المكرمة" : "Makkah"}</option>
                <option value={isAr ? "المدينة المنورة" : "Madinah"}>{isAr ? "المدينة المنورة" : "Madinah"}</option>
                <option value={isAr ? "الخبر" : "Khobar"}>{isAr ? "الخبر" : "Khobar"}</option>
              </select>
            </div>

            <div className={styles.formField}>
              <label htmlFor="patient-district">
                <span>{isAr ? "الحي" : "District"} *</span>
              </label>
              <input
                id="patient-district"
                type="text"
                required
                placeholder={isAr ? "مثال: حي الياسمين / العليا" : "e.g. Al-Yasmin / Olaya"}
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
              />
            </div>

            <div className={`${styles.formField} ${styles.fullWidth}`}>
              <label htmlFor="patient-street">
                <span>{isAr ? "الشارع ورقم المبنى (اختياري)" : "Street & Building (Optional)"}</span>
              </label>
              <input
                id="patient-street"
                type="text"
                placeholder={isAr ? "مثال: شارع أنس بن مالك، عمارة 12" : "Street name, building number"}
                value={street}
                onChange={(e) => setStreet(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.expressBadge}>
            <Clock size={18} color="#16213A" />
            <div>
              <strong>{isAr ? "توصيل فوري نبض بلس" : "Nabd Plus Instant Delivery"}</strong>
              <span>{isAr ? "يصلك خلال 30 دقيقة من أقرب صيدلية معتمدة" : "Delivered within 30 minutes"}</span>
            </div>
          </div>
        </section>

        {/* Step 2: Payment Method & Insurance Coverage */}
        <section className={styles.cardSection}>
          <div className={styles.sectionHeader}>
            <CreditCard size={22} color="#00876F" />
            <div>
              <h2>{isAr ? "2. طريقة الدفع وتغطية التأمين" : "2. Payment & Insurance Coverage"}</h2>
              <p>{isAr ? "اختر الدفع المباشر أو التغطية عبر وثيقة التأمين الصحي المعتمدة" : "Select self-pay or cooperative health insurance coverage"}</p>
            </div>
          </div>

          <div className={styles.paymentMethodsGrid}>
            <label className={`${styles.paymentOption} ${paymentMethod === "mada" ? styles.paymentActive : ""}`}>
              <input
                type="radio"
                name="paymentMethod"
                value="mada"
                checked={paymentMethod === "mada"}
                onChange={() => setPaymentMethod("mada")}
              />
              <div className={styles.paymentContent}>
                <div className={styles.paymentTitleRow}>
                  <CreditCard size={20} />
                  <strong>{isAr ? "بطاقة مدى" : "Mada Card"}</strong>
                </div>
                <span>{isAr ? "دفع فوري عبر شبكة مدى السعودية" : "Direct Saudi debit payment"}</span>
              </div>
            </label>

            <label className={`${styles.paymentOption} ${paymentMethod === "apple_pay" ? styles.paymentActive : ""}`}>
              <input
                type="radio"
                name="paymentMethod"
                value="apple_pay"
                checked={paymentMethod === "apple_pay"}
                onChange={() => setPaymentMethod("apple_pay")}
              />
              <div className={styles.paymentContent}>
                <div className={styles.paymentTitleRow}>
                  <Smartphone size={20} />
                  <strong>Apple Pay</strong>
                </div>
                <span>{isAr ? "الدفع بلمسة واحدة عبر جهازك" : "One-tap secure payment"}</span>
              </div>
            </label>

            <label className={`${styles.paymentOption} ${paymentMethod === "insurance" ? styles.paymentActive : ""}`}>
              <input
                type="radio"
                name="paymentMethod"
                value="insurance"
                checked={paymentMethod === "insurance"}
                onChange={() => setPaymentMethod("insurance")}
              />
              <div className={styles.paymentContent}>
                <div className={styles.paymentTitleRow}>
                  <ShieldCheck size={20} color="#00876F" />
                  <strong style={{ color: "#00876F" }}>{isAr ? "التأمين الصحي التعاوني" : "Cooperative Health Insurance"}</strong>
                </div>
                <span>{isAr ? "بوبا، التعاونية، ميدغلف والشركات المرخصة" : "Bupa, Tawuniya, MedGulf & licensed insurers"}</span>
              </div>
            </label>

            <label className={`${styles.paymentOption} ${paymentMethod === "visa" ? styles.paymentActive : ""}`}>
              <input
                type="radio"
                name="paymentMethod"
                value="visa"
                checked={paymentMethod === "visa"}
                onChange={() => setPaymentMethod("visa")}
              />
              <div className={styles.paymentContent}>
                <div className={styles.paymentTitleRow}>
                  <CreditCard size={20} />
                  <strong>{isAr ? "بطاقة ائتمانية" : "Visa / Mastercard"}</strong>
                </div>
                <span>{isAr ? "البطاقات الائتمانية المحلية والدولية" : "Credit cards"}</span>
              </div>
            </label>

            <label className={`${styles.paymentOption} ${paymentMethod === "cod" ? styles.paymentActive : ""}`}>
              <input
                type="radio"
                name="paymentMethod"
                value="cod"
                checked={paymentMethod === "cod"}
                onChange={() => setPaymentMethod("cod")}
              />
              <div className={styles.paymentContent}>
                <div className={styles.paymentTitleRow}>
                  <Banknote size={20} />
                  <strong>{isAr ? "الدفع عند الاستلام" : "Cash / Card on Delivery"}</strong>
                </div>
                <span>{isAr ? "نقداً أو عبر جهاز نقاط البيع POS" : "Pay with cash or POS machine"}</span>
              </div>
            </label>
          </div>

          {/* Insurance Policy Details Drawer */}
          {paymentMethod === "insurance" && (
            <div style={{ marginTop: "1.25rem", padding: "1.25rem", borderRadius: "1rem", background: "linear-gradient(135deg, rgba(0, 135, 111, 0.04) 0%, rgba(254, 243, 199, 0.2) 100%)", border: "1.5px solid rgba(0, 135, 111, 0.2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "1rem", color: "#00876F" }}>
                <FileCheck2 size={20} />
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: "800" }}>
                  {isAr ? "بيانات وثيقة التأمين الطبي" : "Medical Insurance Details"}
                </h3>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.formField}>
                  <label htmlFor="ins-company">
                    <span>{isAr ? "شركة التأمين المعتمدة" : "Insurance Company"} *</span>
                  </label>
                  <select 
                    id="ins-company" 
                    value={insuranceCompany} 
                    onChange={(e) => setInsuranceCompany(e.target.value)}
                  >
                    {SAUDI_INSURANCE_COMPANIES.map((company) => (
                      <option key={company.id} value={company.id}>
                        {isAr ? company.nameAr : company.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formField}>
                  <label htmlFor="ins-tier">
                    <span>{isAr ? "فئة الوثيقة / الشبكة" : "Plan Tier / Class"} *</span>
                  </label>
                  <select 
                    id="ins-tier" 
                    value={planTier} 
                    onChange={(e: any) => setPlanTier(e.target.value)}
                  >
                    <option value="vip">VIP (تغطية شاملة 100% بدون تحمل)</option>
                    <option value="class_a">{isAr ? "فئة أ (Class A - نسبة تحمل 20% حد أقصى 50 ر.س)" : "Class A (20% co-pay max 50 SAR)"}</option>
                    <option value="class_b">{isAr ? "فئة ب (Class B - نسبة تحمل 20% حد أقصى 75 ر.س)" : "Class B (20% co-pay max 75 SAR)"}</option>
                    <option value="class_c">{isAr ? "فئة ج (Class C - نسبة تحمل 20% حد أقصى 100 ر.س)" : "Class C (20% co-pay max 100 SAR)"}</option>
                  </select>
                </div>

                <div className={styles.formField}>
                  <label htmlFor="ins-policy">
                    <span>{isAr ? "رقم بطاقة التأمين / العضوية" : "Policy / Member Number"} *</span>
                  </label>
                  <input
                    id="ins-policy"
                    type="text"
                    required
                    placeholder={isAr ? "مثال: 902384112" : "e.g. 902384112"}
                    value={policyNumber}
                    onChange={(e) => setPolicyNumber(e.target.value)}
                  />
                </div>

                <div className={styles.formField}>
                  <label htmlFor="ins-nid">
                    <span>{isAr ? "رقم الهوية الوطنية / الإقامة" : "National ID / Iqama"} *</span>
                  </label>
                  <input
                    id="ins-nid"
                    type="text"
                    required
                    maxLength={10}
                    placeholder="10XXXXXXXX / 2XXXXXXXXX"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                  />
                </div>
              </div>

              {/* Instant Approval Preview Box */}
              <div style={{ marginTop: "1rem", padding: "0.85rem 1rem", borderRadius: "12px", background: "#FFFFFF", border: "1px solid rgba(0, 135, 111, 0.15)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Sparkles size={18} color="#00876F" />
                  <span style={{ fontSize: "0.88rem", fontWeight: "700", color: "#16213A" }}>
                    {isAr ? `تغطية ${selectedInsCompany.nameAr}:` : `Coverage by ${selectedInsCompany.nameEn}:`}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "0.88rem" }}>
                  <span style={{ color: "#00876F", fontWeight: "800" }}>
                    {isAr ? `يغطي التأمين: ${insuranceContribution.toFixed(2)} ر.س` : `Insurance pays: ${insuranceContribution.toFixed(2)} SAR`}
                  </span>
                  <span style={{ color: "#B45309", fontWeight: "800" }}>
                    {isAr ? `تحملك: ${patientCoPayMedication.toFixed(2)} ر.س` : `Your co-pay: ${patientCoPayMedication.toFixed(2)} SAR`}
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>

        {errorMessage && (
          <div className={styles.errorAlert} role="alert">
            {errorMessage}
          </div>
        )}

        <button type="submit" disabled={isSubmitting} className={styles.submitOrderBtn}>
          {isSubmitting ? (
            <span>{isAr ? "جارٍ تأكيد الطلب والتحقق من التغطية…" : "Confirming Order & Coverage…"}</span>
          ) : (
            <>
              <span>
                {paymentMethod === "insurance" 
                  ? (isAr ? `تأكيد الطلب بموافقة التأمين (${grandTotal.toFixed(2)} ر.س)` : `Confirm with Insurance (${grandTotal.toFixed(2)} SAR)`)
                  : (isAr ? `تأكيد الطلب والدفع (${grandTotal.toFixed(2)} ر.س)` : `Confirm & Pay (${grandTotal.toFixed(2)} SAR)`)}
              </span>
              <Direction size={18} />
            </>
          )}
        </button>
      </form>

      {/* Sidebar: Order Summary */}
      <aside className={styles.summarySidebar}>
        <div className={styles.summaryCard}>
          <h3>{isAr ? "ملخص السلة والطلب" : "Order Summary"}</h3>
          
          <div className={styles.summaryItemsList}>
            {items.map((item) => (
              <div key={item.id} className={styles.summaryItemRow}>
                <div className={styles.summaryItemTitle}>
                  <strong>{item.name}</strong>
                  <span>{item.qty} × {item.price} {isAr ? "ر.س" : "SAR"}</span>
                </div>
                <span className={styles.summaryItemPrice}>{(item.price * item.qty).toFixed(2)} {isAr ? "ر.س" : "SAR"}</span>
              </div>
            ))}
          </div>

          <div className={styles.summaryTotals}>
            <div className={styles.summaryRow}>
              <span>{isAr ? "إجمالي المنتجات" : "Items Subtotal"}</span>
              <span>{subtotal.toFixed(2)} {isAr ? "ر.س" : "SAR"}</span>
            </div>

            {paymentMethod === "insurance" && insuranceContribution > 0 && (
              <div className={styles.summaryRow} style={{ color: "#00876F", fontWeight: "bold" }}>
                <span>{isAr ? "خصم تغطية التأمين" : "Insurance Coverage"}</span>
                <span>-{insuranceContribution.toFixed(2)} {isAr ? "ر.س" : "SAR"}</span>
              </div>
            )}

            <div className={styles.summaryRow}>
              <span>{isAr ? "رسوم التوصيل السريع" : "Delivery Fee"}</span>
              <span>{deliveryFee === 0 ? (isAr ? "مجاني" : "Free") : `${deliveryFee} ${isAr ? "ر.س" : "SAR"}`}</span>
            </div>

            <div className={styles.summaryRow}>
              <span>{isAr ? "ضريبة القيمة المضافة (15%)" : "VAT (15%)"}</span>
              <span>{vat.toFixed(2)} {isAr ? "ر.س" : "SAR"}</span>
            </div>

            <div className={`${styles.summaryRow} ${styles.grandTotalRow}`}>
              <span>{isAr ? "المبلغ المطلوب سداده" : "Total to Pay"}</span>
              <strong>{grandTotal.toFixed(2)} {isAr ? "ر.س" : "SAR"}</strong>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
