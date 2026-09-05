"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { 
  FlaskConical, 
  ScanLine, 
  FileText, 
  Search, 
  X, 
  Home, 
  Building2, 
  ShieldCheck, 
  Clock, 
  AlertCircle,
  CalendarDays,
  Sparkles,
  ArrowUpLeft,
  ArrowUpRight
} from "lucide-react";
import { 
  getDiagnosticVector, 
  VectorLabs,
  VectorRadiology
} from "./vector-illustrations";
import { ServiceBookingModal } from "./service-booking-modal";
import styles from "./diagnostics-hub.module.css";

export type DiagnosticsHubProps = {
  locale: string;
  labServices: any[];
  radiologyServices: any[];
  labPackages: any[];
  bookingDomains?: Array<{
    domain: "labs" | "radiology";
    bookings: any[];
  }>;
};

export function DiagnosticsHubClient({
  locale,
  labServices = [],
  radiologyServices = [],
  labPackages = [],
  bookingDomains = [],
}: DiagnosticsHubProps) {
  const isAr = locale === "ar";
  const rtl = locale === "ar" || locale === "ur";
  const Arrow = rtl ? ArrowUpLeft : ArrowUpRight;

  const totalBookings = bookingDomains.reduce((acc, d) => acc + (d.bookings?.length || 0), 0);

  const [mainTab, setMainTab] = useState<"labs" | "radiology" | "bookings">("labs");
  const [serviceType, setServiceType] = useState<"home" | "clinic">("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  // Filter chips definition
  const labFilters = [
    { id: "all", label: isAr ? "الكل" : "All" },
    { id: "vitamin_d", label: isAr ? "فيتامين د" : "Vitamin D" },
    { id: "sugar", label: isAr ? "سكر الدم والتراكمي" : "Sugar & HbA1c" },
    { id: "thyroid", label: isAr ? "الغدة الدرقية" : "Thyroid" },
    { id: "lipids", label: isAr ? "الدهون والكوليسترول" : "Lipids Profile" },
    { id: "cbc", label: isAr ? "صورة الدم CBC" : "Blood CBC" },
    { id: "pregnancy", label: isAr ? "فحص الحمل" : "Pregnancy" },
    { id: "organs", label: isAr ? "وظائف الكبد والكلى" : "Liver & Kidney" },
  ];

  const radFilters = [
    { id: "all", label: isAr ? "الكل" : "All" },
    { id: "ultrasound", label: isAr ? "سونار وتلفزيونية" : "Ultrasound / Sonar" },
    { id: "xray", label: isAr ? "أشعة سينية X-Ray" : "X-Ray" },
    { id: "mri", label: isAr ? "رنين مغناطيسي MRI" : "MRI Scan" },
    { id: "ct", label: isAr ? "أشعة مقطعية CT" : "CT Scan" },
    { id: "echo", label: isAr ? "إيكو القلب" : "Echocardiogram" },
  ];

  // Filtered lab services
  const filteredLabs = useMemo(() => {
    return labServices.filter((item) => {
      const name = `${item.nameAr || item.name_ar || ""} ${item.nameEn || item.name_en || ""} ${item.shortCode || item.short_code || ""}`.toLowerCase();
      
      // Service type filter
      if (serviceType === "home" && item.homeVisitSupported === false && item.home_visit_supported === false) {
        // keep items that support home visit, or if undefined default to supported
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        if (!name.includes(q)) return false;
      }

      // Category filter chip
      if (activeFilter === "vitamin_d") {
        return name.includes("فيتامين د") || name.includes("vitamin d") || name.includes("25-oh") || name.includes("vit d");
      }
      if (activeFilter === "sugar") {
        return name.includes("سكر") || name.includes("تراكمي") || name.includes("hba1c") || name.includes("glucose") || name.includes("fbs");
      }
      if (activeFilter === "thyroid") {
        return name.includes("غدة") || name.includes("درقية") || name.includes("tsh") || name.includes("thyroid") || name.includes("t3") || name.includes("t4");
      }
      if (activeFilter === "lipids") {
        return name.includes("دهن") || name.includes("كولسترول") || name.includes("lipid") || name.includes("cholesterol") || name.includes("ldl") || name.includes("hdl");
      }
      if (activeFilter === "cbc") {
        return name.includes("cbc") || name.includes("دم شامل") || name.includes("هيموجلوبين") || name.includes("دم كامل") || name.includes("complete blood");
      }
      if (activeFilter === "pregnancy") {
        return name.includes("حمل") || name.includes("pregnancy") || name.includes("hcg");
      }
      if (activeFilter === "organs") {
        return name.includes("كبد") || name.includes("كلى") || name.includes("liver") || name.includes("kidney") || name.includes("وظائف") || name.includes("creatinine") || name.includes("alt") || name.includes("ast");
      }

      return true;
    });
  }, [labServices, serviceType, searchQuery, activeFilter]);

  // Filtered radiology services
  const filteredRadiology = useMemo(() => {
    return radiologyServices.filter((item) => {
      const name = `${item.nameAr || item.name_ar || ""} ${item.nameEn || item.name_en || ""} ${item.modality || ""} ${item.bodyPart || item.body_part || ""}`.toLowerCase();

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        if (!name.includes(q)) return false;
      }

      // Filter chips
      const mod = (item.modality || "").toLowerCase();
      if (activeFilter === "ultrasound") {
        return mod === "ultrasound" || name.includes("سونار") || name.includes("تلفزيونية") || name.includes("sonar");
      }
      if (activeFilter === "xray") {
        return mod === "xray" || name.includes("سينية") || name.includes("x-ray") || name.includes("xray") || name.includes("صدر");
      }
      if (activeFilter === "mri") {
        return mod === "mri" || name.includes("رنين");
      }
      if (activeFilter === "ct") {
        return mod === "ct" || name.includes("مقطعية");
      }
      if (activeFilter === "echo") {
        return name.includes("إيكو") || name.includes("echo") || name.includes("قلب");
      }

      return true;
    });
  }, [radiologyServices, searchQuery, activeFilter]);

  return (
    <div className={styles.hubContainer} dir={rtl ? "rtl" : "ltr"}>
      {/* Top Header Controls: Dual Tab Bar & Bookings */}
      <div className={styles.topTabBar}>
        <div className={styles.tabPillGroup}>
          <button
            type="button"
            className={`${styles.tabPill} ${mainTab === "labs" ? styles.tabPillActive : ""}`}
            onClick={() => {
              setMainTab("labs");
              setActiveFilter("all");
            }}
          >
            <FlaskConical size={18} aria-hidden="true" />
            <span>{isAr ? "التحاليل الطبية" : "Laboratory Tests"}</span>
          </button>

          <button
            type="button"
            className={`${styles.tabPill} ${mainTab === "radiology" ? styles.tabPillActive : ""}`}
            onClick={() => {
              setMainTab("radiology");
              setActiveFilter("all");
            }}
          >
            <ScanLine size={18} aria-hidden="true" />
            <span>{isAr ? "الأشعة التشخيصية" : "Diagnostic Radiology"}</span>
          </button>

          {totalBookings > 0 && (
            <button
              type="button"
              className={`${styles.tabPill} ${mainTab === "bookings" ? styles.tabPillActive : ""}`}
              onClick={() => setMainTab("bookings")}
            >
              <FileText size={18} aria-hidden="true" />
              <span>{isAr ? "طلباتي ونتائجي" : "My Bookings"}</span>
              <span className={styles.badgeCount}>{totalBookings}</span>
            </button>
          )}
        </div>
      </div>

      {/* Insurance Golden Prompt */}
      <div className={styles.insuranceBanner}>
        <div className={styles.insuranceContent}>
          <span className={styles.insuranceIcon}>
            <ShieldCheck size={28} />
          </span>
          <div>
            <h3>{isAr ? "هل لديك تأمين طبي أو وصفة فحص؟" : "Have health insurance or doctor prescription?"}</h3>
            <p>{isAr ? "ارفع الوصفة لمعرفة نسبة التغطية التأمينية وتأكيد موعدك المباشر" : "Upload your request to check insurance approvals and confirm your booking"}</p>
          </div>
        </div>
        <Link href={`/${locale}/diagnostics`} className={styles.insuranceAction}>
          <span>{isAr ? "تحقق من التغطية" : "Check Coverage"}</span>
        </Link>
      </div>

      {/* When mainTab is Bookings */}
      {mainTab === "bookings" && (
        <section className={styles.bookingsSection}>
          <h2>{isAr ? "حجوزاتي ونتائج الفحوصات" : "My Diagnostic Bookings"}</h2>
          <div className={styles.bookingDomainsGrid}>
            {bookingDomains.map(({ domain, bookings }) => {
              const DomainIcon = domain === "labs" ? FlaskConical : ScanLine;
              return (
                <div key={domain} className={styles.bookingDomainCard}>
                  <div className={styles.domainHeader}>
                    <span className={styles.domainIconWrap}>
                      <DomainIcon size={20} />
                    </span>
                    <h3>{domain === "labs" ? (isAr ? "حجوزات المختبر" : "Lab Bookings") : (isAr ? "حجوزات الأشعة" : "Radiology Bookings")}</h3>
                  </div>

                  {bookings.length === 0 ? (
                    <p className={styles.emptyBookings}>{isAr ? "لا توجد حجوزات نشطة حالياً" : "No active bookings currently"}</p>
                  ) : (
                    <div className={styles.bookingsList}>
                      {bookings.map((booking: any) => (
                        <Link 
                          key={booking.id} 
                          href={`/${locale}/diagnostics/${domain}/${booking.id}`}
                          className={styles.bookingCardItem}
                        >
                          <div className={styles.bookingItemInfo}>
                            <strong>{isAr ? (booking.scanNameAr || (domain === "labs" ? "تحليل مخبري" : "فحص إشعاعي")) : (booking.scanNameEn || booking.scanNameAr || "Diagnostic Test")}</strong>
                            <span className={styles.bookingStateBadge}>{booking.state || "CONFIRMED"}</span>
                            {booking.scheduledAt && (
                              <span className={styles.bookingDate}>
                                <CalendarDays size={13} />
                                {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(booking.scheduledAt))}
                              </span>
                            )}
                          </div>
                          <span className={styles.bookingItemOpen}>
                            {isAr ? "عرض التفاصيل" : "View"}
                            <Arrow size={14} />
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* When mainTab is Labs or Radiology */}
      {mainTab !== "bookings" && (
        <>
          {/* Controls: Search Bar & Visit Mode Switcher */}
          <div className={styles.controlsRow}>
            {/* Search Input */}
            <div className={styles.searchBox}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={mainTab === "labs" ? (isAr ? "ابحث عن تحليل، باقة، أو فحص دم..." : "Search lab test, package, or blood test...") : (isAr ? "ابحث عن نوع الأشعة، العضو، أو الفحص..." : "Search radiology scan, organ, or scan type...")}
                className={styles.searchInput}
              />
              {searchQuery.length > 0 && (
                <button type="button" onClick={() => setSearchQuery("")} className={styles.clearBtn} aria-label="Clear search">
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Home vs Center Visit Switcher */}
            <div className={styles.serviceToggleWrap}>
              <button
                type="button"
                className={`${styles.serviceToggleBtn} ${serviceType === "home" ? styles.serviceToggleActive : ""}`}
                onClick={() => setServiceType("home")}
              >
                <Home size={16} />
                <span>{mainTab === "labs" ? (isAr ? "سحب عينة منزلي" : "Home Sample") : (isAr ? "أشعة منزلية" : "Home Scan")}</span>
              </button>
              <button
                type="button"
                className={`${styles.serviceToggleBtn} ${serviceType === "clinic" ? styles.serviceToggleActive : ""}`}
                onClick={() => setServiceType("clinic")}
              >
                <Building2 size={16} />
                <span>{mainTab === "labs" ? (isAr ? "زيارة المختبر" : "Visit Lab") : (isAr ? "زيارة المركز" : "Visit Center")}</span>
              </button>
            </div>
          </div>

          {/* Fast Filter Chips */}
          <div className={styles.filterChipsRow}>
            {(mainTab === "labs" ? labFilters : radFilters).map((filter) => (
              <button
                key={filter.id}
                type="button"
                className={`${styles.filterChip} ${activeFilter === filter.id ? styles.filterChipActive : ""}`}
                onClick={() => setActiveFilter(filter.id)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Featured Lab Packages Section (Only on Labs Tab and when no search query) */}
          {mainTab === "labs" && !searchQuery && labPackages.length > 0 && (
            <section className={styles.packagesSection}>
              <div className={styles.sectionHeading}>
                <h2>{isAr ? "باقات التحاليل الشاملة" : "Comprehensive Lab Packages"}</h2>
                <span className={styles.packagesSub}>{isAr ? "فحوصات دورية وقائية متكاملة بأسعار مميزة" : "Comprehensive periodic preventive checkups"}</span>
              </div>
              <div className={styles.packagesGrid}>
                {labPackages.slice(0, 4).map((pkg) => {
                  const name = isAr ? (pkg.name_ar || pkg.nameAr || "باقة الفحص الشامل") : (pkg.name_en || pkg.nameEn || "Comprehensive Lab Package");
                  const desc = isAr ? (pkg.description_ar || pkg.descriptionAr || "تشمل فحوصات الدم الكاملة والمؤشرات الحيوية.") : (pkg.description_en || pkg.descriptionEn || "Includes vital signs and complete diagnostic tests.");
                  const price = pkg.price || 450;
                  return (
                    <div key={pkg.id} className={styles.packageCard}>
                      <div className={styles.packageBadge}>{isAr ? "الأكثر طلباً" : "Most Popular"}</div>
                      <div className={styles.packageTop}>
                        <span className={styles.packageIconWrap}>
                          <VectorLabs size={42} />
                        </span>
                        <h3>{name}</h3>
                      </div>
                      <p className={styles.packageDesc}>{desc}</p>
                      <div className={styles.packageFooter}>
                        <div className={styles.priceContainer}>
                          <span className={styles.priceVal}>{price}</span>
                          <span className={styles.priceCurrency}>{isAr ? "ر.س" : "SAR"}</span>
                        </div>
                        <ServiceBookingModal
                          locale={locale}
                          serviceId={pkg.id}
                          serviceName={name}
                          servicePrice={price}
                          serviceType="lab"
                          homeVisitSupported={true}
                          buttonLabel={isAr ? "احجز الباقة" : "Book Package"}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Main Tests & Scans Grid */}
          <section className={styles.servicesGridSection}>
            <div className={styles.sectionHeading}>
              <h2>
                {mainTab === "labs" 
                  ? (isAr ? "قائمة التحاليل المخبرية الفردية" : "Individual Clinical Tests") 
                  : (isAr ? "قائمة الفحوصات الإشعاعية والتصوير" : "Radiology & Imaging Scans")}
              </h2>
              <span className={styles.countBadge}>
                {mainTab === "labs" ? `${filteredLabs.length} ${isAr ? "تحليل" : "tests"}` : `${filteredRadiology.length} ${isAr ? "فحص" : "scans"}`}
              </span>
            </div>

            {/* Empty State */}
            {(mainTab === "labs" ? filteredLabs.length === 0 : filteredRadiology.length === 0) ? (
              <div className={styles.noResultsBox}>
                <AlertCircle size={42} className={styles.noResultsIcon} />
                <h3>{isAr ? "لم نجد نتائج مطابقة لبحثك" : "No matching diagnostic tests found"}</h3>
                <p>{isAr ? "جرّب تغيير كلمات البحث أو إعادة ضبط الفلتر لعرض جميع الخدمات" : "Try adjusting your search terms or filter to see all services"}</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setActiveFilter("all");
                  }}
                  className={styles.resetFilterBtn}
                >
                  {isAr ? "عرض جميع الفحوصات" : "View All Tests"}
                </button>
              </div>
            ) : (
              <div className={styles.cardsGrid}>
                {(mainTab === "labs" ? filteredLabs : filteredRadiology).map((item) => {
                  const nameAr = item.name_ar || item.nameAr || "";
                  const nameEn = item.name_en || item.nameEn || "";
                  const displayName = isAr ? (nameAr || nameEn) : (nameEn || nameAr);
                  const subName = isAr ? nameEn : nameAr;
                  const price = item.price || (mainTab === "labs" ? 180 : 250);
                  const categoryOrModality = item.category || item.modality || "";
                  const fasting = Boolean(item.fasting_required || item.fastingRequired);
                  const homeSupported = Boolean(item.home_visit_supported ?? item.homeVisitSupported ?? true);
                  const turnaround = item.turnaround_hours || item.turnaroundHours || 24;

                  return (
                    <div key={item.id} className={styles.testCard}>
                      <div className={styles.cardHeader}>
                        <div className={styles.cardVectorWrap}>
                          {getDiagnosticVector(nameAr || nameEn, categoryOrModality, 44)}
                        </div>
                        <div className={styles.cardTitleWrap}>
                          <h3 className={styles.testName}>{displayName}</h3>
                          {subName ? <span className={styles.testSubName}>{subName}</span> : null}
                        </div>
                      </div>

                      {/* Tag badges */}
                      <div className={styles.tagsRow}>
                        {categoryOrModality ? (
                          <span className={styles.categoryTag}>{categoryOrModality}</span>
                        ) : null}
                        {fasting && (
                          <span className={styles.fastingTag}>
                            <Clock size={12} />
                            {isAr ? "يتطلب صيام" : "Fasting Required"}
                          </span>
                        )}
                        {homeSupported && (
                          <span className={styles.homeTag}>
                            <Home size={12} />
                            {isAr ? "سحب منزلي" : "Home Visit"}
                          </span>
                        )}
                        <span className={styles.turnaroundTag}>
                          <Sparkles size={12} />
                          {isAr ? `النتيجة خلال ${turnaround} ساعة` : `Results in ${turnaround}h`}
                        </span>
                      </div>

                      {/* Card Footer: Price & Booking Action */}
                      <div className={styles.cardFooter}>
                        <div className={styles.cardPrice}>
                          <strong className={styles.priceNum}>{price}</strong>
                          <span className={styles.priceCurr}>{isAr ? "ر.س" : "SAR"}</span>
                        </div>

                        <ServiceBookingModal
                          locale={locale}
                          serviceId={item.id}
                          serviceName={displayName}
                          servicePrice={price}
                          serviceType={mainTab === "labs" ? "lab" : "radiology"}
                          homeVisitSupported={homeSupported}
                          buttonLabel={isAr ? "احجز الموعد" : "Book Now"}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
