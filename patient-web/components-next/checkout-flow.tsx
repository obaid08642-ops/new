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
import { useCentralInsurance } from "@/lib/data/use-central-insurance";
import styles from "./checkout-flow.module.css";

type Props = {
  locale: string;
};

export function CheckoutFlow({ locale }: Props) {
  const { items, subtotal, clearCart, hasRxItems } = useCart();
  const isAr = locale === "ar";
  const Direction = isAr ? ArrowLeft : ArrowRight;
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [addressesLoading, setAddressesLoading] = useState(false);

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

  const INSURANCE_CATALOG = useCentralInsurance();
  const selectedInsCompany = INSURANCE_CATALOG.find(c => c.id === insuranceCompany) || INSURANCE_CATALOG[0];

  // HONEST PRICING (P0-03): cart subtotal is a catalog-price estimate only.
  // Delivery fee, VAT, insurance split and the grand total are computed by the
  // pharmacy offer + insurance decision on the server — never in this client.
  // Nothing below is presented as a payable amount.

  const loadSavedAddresses = async (): Promise<any[]> => {
    if (savedAddresses.length) return savedAddresses;
    setAddressesLoading(true);
    try {
      const res = await fetch("/api/patient/users/me/addresses", { credentials: "same-origin" });
      if (res.status === 401) throw new Error("authentication_required");
      const data = await res.json().catch(() => null);
      const list = Array.isArray(data) ? data : data?.data || data?.addresses || [];
      setSavedAddresses(list);
      const def = list.find((a: any) => a.is_default) || list[0];
      if (def && !selectedAddressId) setSelectedAddressId(String(def.id || def._id || ""));
      return list;
    } finally {
      setAddressesLoading(false);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
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

    // Online card payment is not supported for web pharmacy checkout on the backend
    // (server accepts cash-on-delivery / broadcast settlement only). Never fabricate a charge.
    if (paymentMethod === "mada" || paymentMethod === "apple_pay" || paymentMethod === "visa") {
      setErrorMessage(isAr
        ? "الدفع الإلكتروني المباشر غير متاح لطلبات الصيدلية على الويب حالياً — اختر الدفع عند الاستلام أو التأمين، وستتم التسوية الحقيقية عبر الصيدلية بعد قبول طلبك."
        : "Online card payment is not available for web pharmacy orders yet — choose cash on delivery or insurance; real settlement happens via the pharmacy after acceptance.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    try {
      // 1. Saved delivery address with real coordinates (backend requirement)
      const addresses = await loadSavedAddresses();
      const chosen = addresses.find((a: any) => String(a.id || a._id || "") === String(selectedAddressId)) || addresses.find((a: any) => a.is_default) || addresses[0];
      if (!chosen || !Number.isFinite(Number(chosen.lat)) || !Number.isFinite(Number(chosen.lng))) {
        throw new Error(isAr
          ? "يلزم عنوان محفوظ بموقع حقيقي — أضف عنوانك من صفحة العناوين ثم أعد المحاولة."
          : "A saved address with a real location is required — add one from the addresses page and retry.");
      }

      // 2. Prescription gate: Rx items require a saved/active prescription (server enforces too)
      let prescriptionRef: string | null = null;
      if (hasRxItems) {
        const rxRes = await fetch("/api/patient/prescriptions/active", { credentials: "same-origin" });
        if (rxRes.status === 401) throw new Error("authentication_required");
        const rxData = await rxRes.json().catch(() => null);
        const rxList = Array.isArray(rxData) ? rxData : rxData?.data || [];
        const valid = rxList.find((p: any) => p?.id || p?._id);
        if (!valid) {
          throw new Error(isAr
            ? "سلتك تحتوي أدوية بوصفة — ارفع وصفتك أولاً من صفحة مسح الوصفة قبل إتمام الطلب."
            : "Your cart contains prescription medicines — upload your prescription from the scan page first.");
        }
        prescriptionRef = String(valid.id || valid._id);
      }

      // 3. Real broadcast order (same flow as the mobile app): create + submit, idempotent
      const draftItems = items.map((it: any) => ({
        raw_name: String(it.name_ar || it.name || "").trim(),
        name_ar: it.name_ar || it.name,
        name_en: it.name,
        qty: Math.max(1, Number(it.qty) || 1),
        sku: it.sku || it.id,
        intake_source: "cart",
      })).filter((it: any) => it.raw_name);
      if (!draftItems.length) throw new Error(isAr ? "السلة فارغة" : "Cart is empty");
      const key = (globalThis.crypto?.randomUUID && globalThis.crypto.randomUUID()) || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const createRes = await fetch("/api/patient/patient/pharmacy/orders", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json", "idempotency-key": key },
        body: JSON.stringify({
          items: draftItems,
          delivery_address: {
            label: chosen.label || "المنزل",
            street: street || chosen.street || "",
            city: chosen.city || city,
            district: district || chosen.district || "",
            lat: Number(chosen.lat),
            lng: Number(chosen.lng),
            phone,
          },
          patient_notes: paymentMethod === "insurance"
            ? `insurance:${selectedInsCompany.code || insuranceCompany}|policy:${policyNumber}|nid:${nationalId}|tier:${planTier}`
            : `cash:${paymentMethod}|name:${name}`,
          prescription_attachments: prescriptionRef ? [prescriptionRef] : [],
        }),
      });
      if (createRes.status === 401) throw new Error("authentication_required");
      const created = await createRes.json().catch(() => null);
      if (!createRes.ok) throw new Error(created?.message || "order_create_failed");
      const orderId = created?.data?.id || created?.id;
      if (!orderId) throw new Error("governed_pharmacy_order_id_missing");

      const submitRes = await fetch(`/api/patient/patient/pharmacy/orders/${encodeURIComponent(orderId)}/submit`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json", "idempotency-key": `${key}-submit` },
        body: JSON.stringify({}),
      });
      const submitted = await submitRes.json().catch(() => null);
      if (!submitRes.ok) throw new Error(submitted?.message || "order_submit_failed");

      setOrderConfirmed({
        orderId,
        customerName: name,
        customerPhone: phone,
        address: `${chosen.city || city} - ${district} ${street ? ` - ${street}` : ""}`,
        paymentMethod,
        insurancePending: paymentMethod === "insurance",
        insuranceCompanyName: isAr ? selectedInsCompany.nameAr : selectedInsCompany.nameEn,
        items: [...items],
        date: new Date().toLocaleDateString(isAr ? "ar-SA" : "en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      });
      clearCart();
    } catch (err: any) {
      const msg = String(err?.message || "checkout_failed");
      if (msg === "authentication_required") {
        setErrorMessage(isAr ? "سجل الدخول أولاً لإتمام طلبك." : "Please sign in to place your order.");
      } else {
        setErrorMessage(isAr ? `تعذر إنشاء الطلب: ${msg}` : `Order failed: ${msg}`);
      }
    } finally {
      setIsSubmitting(false);
    }
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
              {orderConfirmed.paymentMethod === "insurance" && (isAr ? `تأمين طبي (${orderConfirmed.insuranceCompanyName})` : `Health Insurance (${orderConfirmed.insuranceCompanyName})`)}
            </span>
          </div>

          {orderConfirmed.insurancePending && (
            <div style={{ background: "rgba(0, 135, 111, 0.05)", padding: "12px", borderRadius: "10px", margin: "8px 0", border: "1px solid rgba(0, 135, 111, 0.15)" }}>
              <div className={styles.orderRow} style={{ color: "#00876F", fontWeight: "bold" }}>
                <span>{isAr ? "حالة التغطية التأمينية" : "Insurance Status"}</span>
                <span>{isAr ? "بانتظار مراجعة الصيدلية لبيانات التأمين" : "Pending pharmacy insurance review"}</span>
              </div>
              <div className={styles.orderRow} style={{ fontSize: "0.85rem", marginTop: "4px" }}>
                <span>{isAr ? "الشركة" : "Company"}</span>
                <span style={{ color: "#00876F", fontWeight: "bold" }}>{orderConfirmed.insuranceCompanyName}</span>
              </div>
              <p style={{ fontSize: "0.8rem", color: "#64748B" }}>
                {isAr
                  ? "الصيدلية تحصل على الموافقة عبر نظامها التأميني كما لو كنت حاضراً — ستصلك النتيجة (قبول/رفض/تحمل) هنا."
                  : "The pharmacy obtains authorization through its own insurance system — you will be notified here of the result."}
              </p>
            </div>
          )}

          <div className={styles.orderRowTotal}>
            <span>{isAr ? "السعر النهائي" : "Final Price"}</span>
            <strong>{isAr ? "يحدده عرض الصيدلية المختار" : "Set by chosen pharmacy offer"}</strong>
          </div>
        </div>

        <div className={styles.actionButtons}>
          <Link href={`/${locale}/pharmacy/broadcast-status?orderId=${encodeURIComponent(orderConfirmed.orderId)}`} className={styles.primaryBtn}>
            <span>{isAr ? "تتبع طلبك وعروض الصيدليات" : "Track your order & pharmacy offers"}</span>
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

            <div className={`${styles.formField} ${styles.fullWidth}`}>
              <label htmlFor="saved-address">
                <span>{isAr ? "عنوان التوصيل المحفوظ (بموقع حقيقي) *" : "Saved delivery address (real location) *"}</span>
              </label>
              <select
                id="saved-address"
                value={selectedAddressId}
                onChange={(e) => setSelectedAddressId(e.target.value)}
                onFocus={() => { loadSavedAddresses().catch(() => {}); }}
              >
                <option value="">{addressesLoading ? (isAr ? "جارٍ التحميل…" : "Loading…") : (isAr ? "اختر عنواناً محفوظاً" : "Choose a saved address")}</option>
                {savedAddresses.map((a: any) => (
                  <option key={String(a.id || a._id)} value={String(a.id || a._id)}>
                    {(a.label || "") + " — " + (a.city || "") + " " + (a.district || "")}
                  </option>
                ))}
              </select>
              <p style={{ fontSize: "0.8rem", color: "#64748B" }}>
                <Link href={`/${locale}/profile/addresses`}>{isAr ? "إضافة/تعديل العناوين من هنا" : "Manage addresses here"}</Link>
              </p>
            </div>

            {hasRxItems && (
              <div className={`${styles.formField} ${styles.fullWidth}`} style={{ background: "#FEF3C7", padding: "10px", borderRadius: "10px" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: "bold" }}>
                  {isAr
                    ? "تنبيه: سلتك تحتوي أدوية بوصفة — يلزم وصفة محفوظة وفعّالة، وسيتحقق الخادم منها قبل إنشاء الطلب."
                    : "Notice: your cart has prescription medicines — an active saved prescription is required and verified server-side."}{" "}
                  <Link href={`/${locale}/pharmacy/scan-prescription`}>{isAr ? "رفع وصفة" : "Upload prescription"}</Link>
                </span>
              </div>
            )}
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
                    {INSURANCE_CATALOG.map((company) => (
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

              {/* Coverage is decided by the pharmacy + insurer on the server after review — never computed here. */}
              <div style={{ marginTop: "1rem", padding: "0.85rem 1rem", borderRadius: "12px", background: "#FFFFFF", border: "1px solid rgba(0, 135, 111, 0.15)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Sparkles size={18} color="#00876F" />
                  <span style={{ fontSize: "0.88rem", fontWeight: "700", color: "#16213A" }}>
                    {isAr ? `التغطية عبر ${selectedInsCompany.nameAr}:` : `Coverage via ${selectedInsCompany.nameEn}:`}
                  </span>
                </div>
                <div style={{ fontSize: "0.85rem", color: "#64748B" }}>
                  {isAr
                    ? "التحمل والتغطية يحددهما قرار الصيدلية بعد مراجعة التأمين — لا مبالغ مسبقة هنا."
                    : "Co-pay and coverage are set by the pharmacy decision after review — no amounts upfront."}
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
                  ? (isAr ? `تأكيد الطلب وطلب مراجعة التأمين` : `Confirm Order & Request Insurance Review`)
                  : (isAr ? `تأكيد الطلب` : `Confirm Order`)}
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
              <span>{isAr ? "إجمالي المنتجات (تقديري بأسعار الكتالوج)" : "Items Subtotal (catalog estimate)"}</span>
              <span>{subtotal.toFixed(2)} {isAr ? "ر.س" : "SAR"}</span>
            </div>

            <div className={styles.summaryRow} style={{ color: "#64748B", fontSize: "0.85rem" }}>
              <span>{isAr ? "السعر النهائي والتوصيل والضريبة" : "Final price, delivery & VAT"}</span>
              <span>{isAr ? "يحددها عرض الصيدلية" : "Set by pharmacy offer"}</span>
            </div>

            {paymentMethod === "insurance" && (
              <div className={styles.summaryRow} style={{ color: "#00876F", fontWeight: "bold", fontSize: "0.85rem" }}>
                <span>{isAr ? "التحمل" : "Co-pay"}</span>
                <span>{isAr ? "بعد قرار الصيدلية" : "After pharmacy decision"}</span>
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
