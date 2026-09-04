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
  ChevronLeft
} from "lucide-react";
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
  const [paymentMethod, setPaymentMethod] = useState<"mada" | "apple_pay" | "visa" | "cod">("mada");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const deliveryFee = subtotal > 100 ? 0 : 15;
  const vat = (subtotal + deliveryFee) * 0.15;
  const grandTotal = subtotal + deliveryFee + vat;

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
        items: [...items],
        total: grandTotal,
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
        <h1>{isAr ? "شكراً لك، طلبك قيد التجهيز" : "Thank you, your order is being prepared"}</h1>
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
            </span>
          </div>
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

        {/* Step 2: Payment Method */}
        <section className={styles.cardSection}>
          <div className={styles.sectionHeader}>
            <CreditCard size={22} color="#00876F" />
            <div>
              <h2>{isAr ? "2. طريقة الدفع الآمن" : "2. Secure Payment Method"}</h2>
              <p>{isAr ? "جميع المعاملات المالية مشفرة ومتوافقة مع معايير البنك المركزي السعودي (ساما)" : "Encrypted and SAMA-compliant payment options"}</p>
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
                  <strong>{isAr ? "فيزا / ماستركارد" : "Visa / Mastercard"}</strong>
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
        </section>

        {errorMessage && (
          <div className={styles.errorAlert} role="alert">
            {errorMessage}
          </div>
        )}

        <button type="submit" disabled={isSubmitting} className={styles.submitOrderBtn}>
          {isSubmitting ? (
            <span>{isAr ? "جارٍ تأكيد الطلب…" : "Confirming Order…"}</span>
          ) : (
            <>
              <span>{isAr ? `تأكيد الطلب والدفع (${grandTotal.toFixed(2)} ر.س)` : `Confirm & Pay (${grandTotal.toFixed(2)} SAR)`}</span>
              <Direction size={18} />
            </>
          )}
        </button>
      </form>

      {/* Order Summary Aside */}
      <aside className={styles.orderSummaryAside}>
        <div className={styles.summaryCard}>
          <h3>{isAr ? "ملخص طلبك" : "Order Summary"}</h3>
          
          <div className={styles.summaryItemsList}>
            {items.map((item) => (
              <div key={item.id} className={styles.summaryItemRow}>
                <div className={styles.summaryItemTitle}>
                  <strong>{item.name}</strong>
                  <span>{item.qty} × {item.price.toFixed(2)} {isAr ? "ر.س" : "SAR"}</span>
                </div>
                <span className={styles.summaryItemPrice}>
                  {(item.qty * item.price).toFixed(2)} {isAr ? "ر.س" : "SAR"}
                </span>
              </div>
            ))}
          </div>

          <div className={styles.summaryTotals}>
            <div className={styles.summaryRow}>
              <span>{isAr ? "المجموع الفرعي" : "Subtotal"}</span>
              <span>{subtotal.toFixed(2)} {isAr ? "ر.س" : "SAR"}</span>
            </div>
            <div className={styles.summaryRow}>
              <span>{isAr ? "رسوم التوصيل السريع" : "Express Delivery"}</span>
              <span>
                {deliveryFee === 0 
                  ? (isAr ? "مجاني" : "Free")
                  : `${deliveryFee.toFixed(2)} ${isAr ? "ر.س" : "SAR"}`}
              </span>
            </div>
            <div className={styles.summaryRow}>
              <span>{isAr ? "ضريبة القيمة المضافة (15%)" : "VAT (15%)"}</span>
              <span>{vat.toFixed(2)} {isAr ? "ر.س" : "SAR"}</span>
            </div>
            <div className={`${styles.summaryRow} ${styles.grandTotalRow}`}>
              <strong>{isAr ? "الإجمالي النهائي" : "Grand Total"}</strong>
              <strong>{grandTotal.toFixed(2)} {isAr ? "ر.س" : "SAR"}</strong>
            </div>
          </div>

          <div className={styles.guaranteeBox}>
            <ShieldCheck size={18} color="#00876F" />
            <span>{isAr ? "ضمان أدوية ومنتجات أصلية 100% مرخصة من هيئة الغذاء والدواء" : "100% Genuine products licensed by SFDA"}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
