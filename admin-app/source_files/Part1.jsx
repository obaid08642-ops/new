import { useState, useEffect } from "react";

// ============================================================
// DESIGN TOKENS — نبض بلس
// ============================================================
const T = {
  bg:"#07080d", surface:"#0c0d14", surface2:"#10121c",
  border:"#1a1c2e", borderBright:"#252840",
  text:"#e8eaf6", textMuted:"#5c6080", textDim:"#2e3050",
  accent:"#00b8e6", green:"#00e676", red:"#ff1744",
  orange:"#ff6d00", purple:"#7c4dff", gold:"#ffd600",
  pink:"#f50057", teal:"#00bfa5", cyan:"#00e5ff",
};

const ROLES = {
  SUPER_ADMIN:{ label:"Super Admin", color:T.red,    icon:"👑" },
  OPERATIONS: { label:"Operations",  color:T.orange, icon:"⚙️" },
  FINANCE:    { label:"Finance",     color:T.green,  icon:"💰" },
  SUPPORT:    { label:"Support",     color:T.purple, icon:"🎧" },
  CONTENT:    { label:"Content",     color:T.gold,   icon:"✏️" },
};

// ============================================================
// NAV — 58 صفحة
// ============================================================
const NAV = [
  { id:"dashboard",          icon:"⚡", label:"Control Center",          group:"MAIN" },
  { id:"live",               icon:"🔴", label:"Live Operations",          group:"MAIN", badge:12 },
  { id:"broadcast",          icon:"📡", label:"Broadcast Monitor",        group:"MAIN", badge:2 },
  { id:"map-heatmap",        icon:"🗺️", label:"Map & Heatmap",           group:"MAIN" },
  { id:"emergency-live",     icon:"🚨", label:"Emergency Control",        group:"MAIN", badge:2 },
  { id:"kill-switches",      icon:"🔌", label:"Kill Switches",            group:"MAIN" },
  { id:"analytics",          icon:"📈", label:"Analytics & Reports",      group:"MAIN" },
  { id:"custom-reports",     icon:"📋", label:"Custom Reports",           group:"MAIN" },
  { id:"alert-rules",        icon:"🔔", label:"Alert Rules Engine",       group:"MAIN" },
  { id:"providers",          icon:"🏥", label:"Providers",                group:"PROVIDERS" },
  { id:"provider-approval",  icon:"✅", label:"Provider Approval",        group:"PROVIDERS", badge:4 },
  { id:"doctors",            icon:"👨‍⚕️",label:"Doctors",                 group:"PROVIDERS" },
  { id:"sub-accounts",       icon:"🏢", label:"Sub-Accounts",             group:"PROVIDERS" },
  { id:"contracts",          icon:"📄", label:"Contracts",                group:"PROVIDERS" },
  { id:"provider-docs",      icon:"🗂️", label:"Documents & KYC",         group:"PROVIDERS" },
  { id:"sla-monitor",        icon:"📊", label:"SLA Monitor",              group:"PROVIDERS" },
  { id:"shifts",             icon:"🗓️", label:"Shifts & Schedules",      group:"PROVIDERS" },
  { id:"scorecard",          icon:"🏆", label:"Provider Scorecard",       group:"PROVIDERS" },
  { id:"compliance",         icon:"⚠️", label:"License Compliance",       group:"PROVIDERS" },
  { id:"transport",          icon:"🚗", label:"Transport & Couriers",     group:"PROVIDERS" },
  { id:"patients",           icon:"👥", label:"Patients",                 group:"USERS" },
  { id:"family-cards",       icon:"👨‍👩‍👧",label:"Family Cards",          group:"USERS" },
  { id:"wallet-tx",          icon:"💳", label:"Wallet & Transactions",    group:"USERS" },
  { id:"blacklist",          icon:"🚫", label:"Blacklist",                group:"USERS" },
  { id:"fraud",              icon:"🕵️", label:"Fraud Detection",         group:"USERS" },
  { id:"admins",             icon:"🔐", label:"Admins & Roles",           group:"USERS" },
  { id:"orders",             icon:"📦", label:"Orders",                   group:"OPERATIONS" },
  { id:"broadcast-orders",   icon:"📡", label:"Broadcast Orders",         group:"OPERATIONS" },
  { id:"appointments",       icon:"📅", label:"Appointments",             group:"OPERATIONS" },
  { id:"waitlist",           icon:"⏳", label:"Waitlist",                 group:"OPERATIONS" },
  { id:"referrals",          icon:"🔄", label:"Referrals",                group:"OPERATIONS" },
  { id:"emergency-orders",   icon:"🚨", label:"Emergency Orders",         group:"OPERATIONS" },
  { id:"chat",               icon:"💬", label:"Chat Control",             group:"OPERATIONS" },
  { id:"pharmacy-orders",    icon:"💊", label:"Pharmacy Orders",          group:"OPERATIONS" },
  { id:"b2b-supply",         icon:"🏭", label:"B2B Supply Requests",      group:"OPERATIONS" },
  { id:"lab-results",        icon:"🔬", label:"Lab Results Monitor",      group:"OPERATIONS" },
  { id:"complaints",         icon:"⚖️", label:"Complaints & Disputes",    group:"OPERATIONS" },
  { id:"task-manager",       icon:"✔️", label:"Task Manager",            group:"OPERATIONS" },
  { id:"specialties",        icon:"🩺", label:"Specialties & Degrees",    group:"MASTER DATA" },
  { id:"services",           icon:"⚕️", label:"Services Catalog",         group:"MASTER DATA" },
  { id:"medicines",          icon:"💉", label:"Medicines DB",             group:"MASTER DATA" },
  { id:"market-shortage",    icon:"⚠️", label:"Market Shortage",          group:"MASTER DATA" },
  { id:"labtests",           icon:"🧪", label:"Lab Tests DB",             group:"MASTER DATA" },
  { id:"imaging",            icon:"📡", label:"Imaging Services",         group:"MASTER DATA" },
  { id:"nursing-services",   icon:"💉", label:"Nursing Services",         group:"MASTER DATA" },
  { id:"bulk-upload",        icon:"📤", label:"Bulk Upload",              group:"MASTER DATA" },
  { id:"insurance",          icon:"🛡️", label:"Insurance",               group:"FINANCIAL" },
  { id:"insurance-claims",   icon:"📋", label:"Insurance Claims",         group:"FINANCIAL" },
  { id:"financial",          icon:"💰", label:"Financial Control",        group:"FINANCIAL" },
  { id:"commissions",        icon:"📊", label:"Commissions",              group:"FINANCIAL" },
  { id:"refunds",            icon:"↩️", label:"Refunds",                 group:"FINANCIAL" },
  { id:"coupons",            icon:"🎟️", label:"Coupons & Offers",        group:"FINANCIAL" },
  { id:"notifications-mgr",  icon:"📱", label:"Notifications Manager",    group:"CONTENT" },
  { id:"auto-notifications",  icon:"🤖", label:"Auto-Notifications",       group:"CONTENT" },
  { id:"cms",                icon:"✏️", label:"CMS & Content",            group:"CONTENT" },
  { id:"banners",            icon:"🖼️", label:"Banners & Ads",           group:"CONTENT" },
  { id:"reviews",            icon:"⭐", label:"Reviews & Ratings",        group:"CONTENT" },
  { id:"theme-builder",      icon:"🎨", label:"Theme Builder",            group:"SYSTEM" },
  { id:"system-config",      icon:"⚙️", label:"System Config",            group:"SYSTEM" },
  { id:"broadcast-config",   icon:"📡", label:"Broadcast Config",         group:"SYSTEM" },
  { id:"permissions",        icon:"🔑", label:"Permissions",              group:"SYSTEM" },
  { id:"audit-logs",         icon:"📋", label:"Audit Logs",               group:"SYSTEM" },
  { id:"workflow",           icon:"🤖", label:"Workflow Automation",      group:"SYSTEM" },
  { id:"ai-config",          icon:"🧠", label:"AI & API Config",          group:"SYSTEM" },
];

// ============================================================
// MOCK DATA — نبض بلس الحقيقي
// ============================================================
const MOCK = {
  providers:[
    { id:"P001", name:"مستشفى الرحمة التخصصي", type:"Hospital", status:"active", rating:4.8, orders:1240, revenue:184200, area:"الرياض - حي الياسمين", services:["Emergency","Clinic","Lab","Imaging"], available:true, commission:12, sla:98, contract_end:"2026-01-01", iban:"SA12345678901234567890", cr:"1234567890", scfhs:null, sub_accounts:8, insurance:["بوبا","ميدغلف","التعاونية"], has_courier:false },
    { id:"P002", name:"د. سارة العمري", type:"Doctor", status:"pending", rating:4.6, orders:0, revenue:0, area:"جدة - حي الحمراء", services:["Clinic","Online","Home"], available:false, commission:10, sla:0, contract_end:null, iban:"SA98765432109876543210", cr:null, scfhs:"SCFHS-2024-1234", sub_accounts:0, insurance:["بوبا"], has_courier:false },
    { id:"P003", name:"مختبر الدقة الطبي", type:"Lab", status:"active", rating:4.7, orders:920, revenue:67800, area:"الدمام - حي الشاطئ", services:["Lab","Home Lab"], available:true, commission:8, sla:96, contract_end:"2026-03-01", iban:"SA11122233344455566677", cr:"9876543210", scfhs:null, sub_accounts:3, insurance:["التعاونية","ملاذ"], has_courier:false },
    { id:"P004", name:"صيدلية النهدي - فرع الياسمين", type:"Pharmacy", status:"active", rating:4.5, orders:2100, revenue:98400, area:"الرياض - حي الياسمين", services:["Pharmacy","Delivery"], available:true, commission:5, sla:92, contract_end:"2026-06-01", iban:"SA55566677788899900011", cr:"1122334455", scfhs:null, sub_accounts:0, insurance:[], has_courier:true },
    { id:"P005", name:"مركز النبض للتمريض المنزلي", type:"Nursing", status:"active", rating:4.9, orders:340, revenue:42000, area:"الرياض", services:["Nursing","Home Care"], available:true, commission:15, sla:99, contract_end:"2026-09-01", iban:"SA33344455566677788899", cr:"5566778899", scfhs:"SCFHS-NUR-5678", sub_accounts:12, insurance:["بوبا","ميدغلف"], has_courier:false },
    { id:"P006", name:"مركز الأشعة التشخيصي", type:"Imaging", status:"suspended", rating:3.8, orders:180, revenue:28000, area:"جدة - حي النزهة", services:["Imaging"], available:false, commission:10, sla:71, contract_end:"2025-08-01", iban:"SA77788899900011122233", cr:"6677889900", scfhs:null, sub_accounts:0, insurance:["التعاونية"], has_courier:false },
  ],
  patients:[
    { id:"U001", name:"أحمد محمد الزهراني", phone:"+966501234567", status:"active", orders:24, wallet:450, joined:"2024-01-15", insurance:"بوبا", policy:"BP-123456", city:"الرياض", flags:[], family_linked:2 },
    { id:"U002", name:"سارة عبدالله العتيبي", phone:"+966509876543", status:"active", orders:8, wallet:120, joined:"2024-03-22", insurance:"ميدنت", policy:"MD-789012", city:"جدة", flags:[], family_linked:0 },
    { id:"U003", name:"محمد سعد القحطاني", phone:"+966512345678", status:"blocked", orders:3, wallet:0, joined:"2024-05-10", insurance:null, policy:null, city:"الدمام", flags:["suspicious","multiple_accounts"], family_linked:0 },
    { id:"U004", name:"فاطمة علي الدوسري", phone:"+966523456789", status:"active", orders:41, wallet:890, joined:"2023-11-08", insurance:"تكافل", policy:"TK-345678", city:"الرياض", flags:[], family_linked:1 },
    { id:"U005", name:"خالد عمر المطيري", phone:"+966534567890", status:"active", orders:12, wallet:230, joined:"2024-02-20", insurance:"بوبا", policy:"BP-901234", city:"مكة", flags:["fraud_suspected"], family_linked:0 },
  ],
  orders:[
    { id:"ORD-8821", patient:"أحمد الزهراني", provider:"مختبر الدقة", type:"Lab", subtype:"سحب منزلي", status:"in_progress", amount:320, time:"10:24", assigned:"فني سامي", priority:"normal", broadcast_radius:4 },
    { id:"ORD-8820", patient:"سارة العتيبي", provider:null, type:"Doctor", subtype:"كشف منزلي", status:"broadcasting", amount:180, time:"10:18", assigned:null, priority:"urgent", broadcast_radius:4 },
    { id:"ORD-8819", patient:"فاطمة الدوسري", provider:"صيدلية النهدي", type:"Pharmacy", subtype:"توصيل أدوية", status:"pending_payment", amount:95, time:"10:05", assigned:"مندوب خالد", priority:"normal", broadcast_radius:4 },
    { id:"ORD-8818", patient:"خالد المطيري", provider:"مركز النبض", type:"Nursing", subtype:"غيار جرح", status:"completed", amount:450, time:"09:45", assigned:"ممرضة نورا", priority:"normal", broadcast_radius:4 },
    { id:"ORD-8817", patient:"أحمد الزهراني", provider:null, type:"Pharmacy", subtype:"روشتة OCR", status:"pending_approval", amount:0, time:"09:30", assigned:null, priority:"normal", broadcast_radius:6, ocr_items:[{name:"بنادول",qty:2,found:true,rx:false},{name:"أموكسيسيلين 500mg",qty:1,found:true,rx:true},{name:"كريم إيفاكلار",qty:1,found:false,rx:false}] },
  ],
  pending_approvals:[
    { id:"PA001", name:"مركز الطب التخصصي المتكامل", type:"Hospital", submitted:"2025-05-26", docs:{cr:"✅",scfhs:null,iban:"✅",license:"✅",photos:"✅"}, services:["Emergency","Clinic","Lab","Imaging"], score:87, commission_proposed:12, iban_verified:true, city:"الرياض", contact:"+966501111111" },
    { id:"PA002", name:"د. عبدالله محمد الغامدي", type:"Doctor", submitted:"2025-05-27", docs:{cr:null,scfhs:"✅",iban:"✅",license:"✅",photos:"✅"}, services:["Clinic","Online"], score:92, commission_proposed:10, iban_verified:true, specialty:"باطنية", degree:"استشاري", city:"جدة", contact:"+966502222222" },
    { id:"PA003", name:"صيدلية الحياة - فرع الروضة", type:"Pharmacy", submitted:"2025-05-27", docs:{cr:"✅",scfhs:null,iban:"⚠️",license:"✅",photos:"✅"}, services:["Pharmacy","Delivery"], score:74, commission_proposed:5, iban_verified:false, city:"الرياض", contact:"+966503333333" },
    { id:"PA004", name:"مركز رؤية للأشعة التشخيصية", type:"Imaging", submitted:"2025-05-28", docs:{cr:"✅",scfhs:"✅",iban:"✅",license:"✅",photos:"⚠️"}, services:["Imaging"], score:81, commission_proposed:10, iban_verified:true, city:"الدمام", contact:"+966504444444" },
  ],
  medicines:[
    { id:"M001", name_ar:"باراسيتامول", generic:"Paracetamol", brand:"بنادول", category:"مسكن", rx:false, price_ref:15, alternatives:["M002"], status:"active", active_ingredient:"Paracetamol 500mg", shortage:false },
    { id:"M002", name_ar:"أدول", generic:"Paracetamol", brand:"أدول", category:"مسكن", rx:false, price_ref:18, alternatives:["M001"], status:"active", active_ingredient:"Paracetamol 500mg", shortage:false },
    { id:"M003", name_ar:"أموكسيسيلين", generic:"Amoxicillin", brand:"أموكسيل", category:"مضاد حيوي", rx:true, price_ref:45, alternatives:["M004"], status:"active", active_ingredient:"Amoxicillin 500mg", shortage:false },
    { id:"M004", name_ar:"أوجمنتين", generic:"Amoxicillin/Clavulanate", brand:"أوجمنتين", category:"مضاد حيوي", rx:true, price_ref:85, alternatives:["M003"], status:"active", active_ingredient:"Amoxicillin 875mg", shortage:false },
    { id:"M005", name_ar:"فنتولين", generic:"Salbutamol", brand:"فنتولين", category:"تنفسية", rx:true, price_ref:38, alternatives:[], status:"active", active_ingredient:"Salbutamol 100mcg", shortage:true, shortage_reporter:"صيدلية النهدي" },
  ],
  lab_tests:[
    { id:"L001", name:"CBC - صورة دم كاملة", category:"دم", fasting:false, fasting_hours:0, price_ref:80, turnaround:"2 ساعة", home_available:true, preparation:"لا يتطلب تحضيراً", normal_range:[{param:"WBC",min:4,max:11,unit:"×10³/μL"},{param:"HGB",min:12,max:17,unit:"g/dL"},{param:"PLT",min:150,max:400,unit:"×10³/μL"}] },
    { id:"L002", name:"HbA1c - سكر تراكمي", category:"سكري", fasting:false, fasting_hours:0, price_ref:120, turnaround:"4 ساعات", home_available:true, preparation:"لا يشترط الصيام", normal_range:[{param:"HbA1c",min:0,max:5.7,unit:"%"}] },
    { id:"L003", name:"Lipid Profile - دهون الدم", category:"قلب", fasting:true, fasting_hours:12, price_ref:150, turnaround:"3 ساعات", home_available:true, preparation:"صيام كامل 12 ساعة عن الأكل والشرب عدا الماء", normal_range:[{param:"Total Cholesterol",min:0,max:200,unit:"mg/dL"},{param:"LDL",min:0,max:100,unit:"mg/dL"}] },
    { id:"L004", name:"Vitamin D - فيتامين د", category:"فيتامينات", fasting:false, fasting_hours:0, price_ref:180, turnaround:"6 ساعات", home_available:true, preparation:"يفضل الصيام لساعتين", normal_range:[{param:"Vitamin D",min:30,max:100,unit:"ng/mL"}] },
    { id:"L005", name:"TSH - الغدة الدرقية", category:"هرمونات", fasting:false, fasting_hours:0, price_ref:140, turnaround:"4 ساعات", home_available:false, preparation:"أبلغ طبيبك عن أدوية الغدة", normal_range:[{param:"TSH",min:0.4,max:4.0,unit:"mIU/L"}] },
  ],
  specialties:[
    { id:"SP001", name_ar:"طب الأسرة والمجتمع", name_en:"Family Medicine", icon:"🏠", scfhs_code:"FM", degree_required:"أخصائي", providers:124, active:true },
    { id:"SP002", name_ar:"طب باطني", name_en:"Internal Medicine", icon:"🫀", scfhs_code:"IM", degree_required:"استشاري", providers:89, active:true },
    { id:"SP003", name_ar:"طب أطفال", name_en:"Pediatrics", icon:"👶", scfhs_code:"PED", degree_required:"أخصائي", providers:67, active:true },
    { id:"SP004", name_ar:"جلدية وتجميل", name_en:"Dermatology", icon:"🧴", scfhs_code:"DERM", degree_required:"أخصائي", providers:45, active:true },
    { id:"SP005", name_ar:"نساء وولادة", name_en:"OB/GYN", icon:"🤱", scfhs_code:"OBG", degree_required:"استشاري", providers:38, active:true },
    { id:"SP006", name_ar:"عظام وكسور", name_en:"Orthopedics", icon:"🦴", scfhs_code:"ORTH", degree_required:"أخصائي", providers:31, active:false },
  ],
  broadcast_live:[
    { id:"BC001", order_id:"ORD-8820", type:"Doctor", patient:"سارة العتيبي", area:"جدة - حي الحمراء", radius:4, started:"10:15", elapsed:"8 دقائق", providers_notified:12, accepted:0, status:"expanding", next_expand:"10:18" },
    { id:"BC002", order_id:"ORD-8817", type:"Pharmacy", patient:"أحمد الزهراني", area:"الرياض - الياسمين", radius:4, started:"09:30", elapsed:"5 دقائق", providers_notified:8, accepted:0, status:"active", next_expand:"09:33" },
  ],
  emergency_live:[
    { id:"EM001", patient:"محمد العمري", location:"الرياض - حي الصحافة", type:"قلبية", started:"10:20", hospitals_notified:5, accepted_by:"مستشفى الرحمة التخصصي", eta:"7 دقائق", status:"dispatched", ambulance_id:"AMB-004" },
    { id:"EM002", patient:"نورا الشهراني", location:"جدة - حي الحمراء", type:"إصابة", started:"10:28", hospitals_notified:3, accepted_by:null, eta:null, status:"searching", ambulance_id:null },
  ],
  b2b_requests:[
    { id:"B2B001", pharmacy:"صيدلية النهدي - الياسمين", items:[{name:"بنادول اكسترا 500mg",qty:50,unit:"كرتون"},{name:"فنتولين بخاخ",qty:30,unit:"علبة"}], total_items:2, status:"pending", submitted:"2025-05-28T08:00:00", input_method:"voice", notes:"طلب صوتي — تم تحليله بالـ AI" },
    { id:"B2B002", pharmacy:"صيدلية الحياة", items:[{name:"أموكسيسيلين 500mg",qty:100,unit:"علبة"},{name:"أوميبرازول 20mg",qty:60,unit:"علبة"},{name:"ميتفورمين 1000mg",qty:40,unit:"علبة"}], total_items:3, status:"confirmed", submitted:"2025-05-27T14:00:00", input_method:"ocr", notes:"OCR قرأ 3 أصناف من شيت النواقص" },
  ],
  market_shortage:[
    { id:"SH001", medicine_name:"فنتولين بخاخ 100mcg", reporter:"صيدلية النهدي", reported_at:"2025-05-28T09:00:00", confirmed:false, alternatives:["سالبوتامول بخاخ","فنتودل"], warning_shown:false },
    { id:"SH002", medicine_name:"أنسولين نوفوميكس", reporter:"صيدلية الحياة", reported_at:"2025-05-27T11:00:00", confirmed:true, alternatives:["ميكستار","هيومالوج ميكس"], warning_shown:true },
  ],
  insurance_claims:[
    { id:"CLM001", patient:"أحمد الزهراني", provider:"مختبر الدقة", service:"CBC + Lipid Profile", insurance_co:"بوبا", policy:"BP-123456", category:"فئة A", total_amount:230, insurance_covers:207, patient_copay:23, copay_percent:10, status:"pending_manual" },
    { id:"CLM002", patient:"فاطمة الدوسري", provider:"مستشفى الرحمة", service:"كشف باطنية + وصفة", insurance_co:"تكافل", policy:"TK-345678", category:"VIP", total_amount:350, insurance_covers:315, patient_copay:35, copay_percent:10, status:"approved", approved_by:"موظف التأمين" },
    { id:"CLM003", patient:"سارة العتيبي", provider:"د. سامي الغامدي", service:"استشارة أونلاين", insurance_co:"ميدنت", policy:"MD-789012", category:"فئة B", total_amount:120, insurance_covers:96, patient_copay:24, copay_percent:20, status:"rejected", rejection_reason:"الاستشارات الأونلاين غير مشمولة في الفئة B" },
  ],
  sub_accounts:[
    { id:"SA001", parent_provider:"مستشفى الرحمة", parent_id:"P001", name:"د. سامي الغامدي", role:"doctor", specialty:"باطنية", degree:"استشاري", email:"sami@alrahma.com", status:"active", orders_today:8 },
    { id:"SA002", parent_provider:"مستشفى الرحمة", parent_id:"P001", name:"ريم العمري", role:"insurance_officer", specialty:null, degree:null, email:"reem.ins@alrahma.com", status:"active", orders_today:0 },
    { id:"SA003", parent_provider:"مستشفى الرحمة", parent_id:"P001", name:"أحمد النمر", role:"lab_tech", specialty:"تحاليل", degree:null, email:"ahmed.lab@alrahma.com", status:"active", orders_today:15 },
    { id:"SA004", parent_provider:"مركز النبض للتمريض", parent_id:"P005", name:"ممرضة نورا أحمد", role:"nurse", specialty:"تمريض منزلي", degree:null, email:"noura@nabdnursing.com", status:"active", orders_today:3 },
  ],
  auto_notification_rules:[
    { id:"AN001", trigger:"cart_abandoned",           delay:"30 دقيقة",           title:"نسيت شيئاً؟ 🛒",                     body:"سلتك في انتظارك — أكمل طلبك الآن",                              target:"patient",  channel:"push",       active:true,  sent_today:24 },
    { id:"AN002", trigger:"booking_incomplete",       delay:"15 دقيقة",           title:"حجز طبيبك لم يكتمل 👨‍⚕️",           body:"طبيب متاح الآن — أكمل حجزك قبل امتلاء المواعيد",               target:"patient",  channel:"push",       active:true,  sent_today:18 },
    { id:"AN003", trigger:"prescription_issued",      delay:"5 دقائق",            title:"وصفتك الطبية جاهزة 💊",              body:"تم إصدار وصفتك — اضغط لإرسالها للصيدلية مباشرة",              target:"patient",  channel:"push",       active:true,  sent_today:31 },
    { id:"AN004", trigger:"lab_results_ready",        delay:"فوري",               title:"نتائج تحاليلك جاهزة 🧪",            body:"نتائجك متاحة الآن — اضغط لعرضها",                              target:"patient",  channel:"push+sms",   active:true,  sent_today:12 },
    { id:"AN005", trigger:"appointment_reminder_24h", delay:"24 ساعة قبل",        title:"تذكير: موعدك غداً ⏰",               body:"لديك موعد طبي غداً — تأكد من تواجدك",                           target:"patient",  channel:"push+sms",   active:true,  sent_today:45 },
    { id:"AN006", trigger:"appointment_reminder_1h",  delay:"ساعة قبل",           title:"موعدك بعد ساعة 🏥",                 body:"موعدك قريب — استعد",                                           target:"patient",  channel:"push",       active:true,  sent_today:28 },
    { id:"AN007", trigger:"order_confirmed",          delay:"فوري",               title:"تم تأكيد طلبك ✅",                  body:"مزود الخدمة قبل طلبك وفي الطريق",                              target:"patient",  channel:"push",       active:true,  sent_today:67 },
    { id:"AN008", trigger:"provider_new_order",       delay:"فوري",               title:"طلب جديد ينتظرك 📦",               body:"لديك طلب جديد — اقبله الآن قبل أن يذهب لغيرك",                  target:"provider", channel:"push+sms",   active:true,  sent_today:89 },
    { id:"AN009", trigger:"review_request",           delay:"ساعتان بعد الإتمام", title:"قيّم تجربتك ⭐",                    body:"كيف كانت الخدمة؟ رأيك يهمنا",                                  target:"patient",  channel:"push",       active:true,  sent_today:34 },
    { id:"AN010", trigger:"wallet_low",               delay:"فوري",               title:"رصيد محفظتك منخفض 💳",              body:"رصيدك أقل من 50 ريال — اشحن الآن",                             target:"patient",  channel:"push",       active:false, sent_today:0  },
    { id:"AN011", trigger:"license_expiring_30d",     delay:"30 يوم قبل",         title:"ترخيصك يقترب من الانتهاء ⚠️",      body:"ترخيصك ينتهي خلال 30 يوماً — جدد الآن لاستمرار الخدمة",       target:"provider", channel:"push+email",  active:true,  sent_today:3  },
    { id:"AN012", trigger:"medicine_shortage_alert",  delay:"فوري",               title:"تحذير: دواء قد يكون ناقصاً ⚠️",    body:"هذا الدواء قد يكون ناقصاً في السوق — اضغط لعرض البدائل",      target:"patient",  channel:"push",       active:true,  sent_today:8  },
  ],
  kill_switches:[
    { id:"KS001", name:"الشات الكامل",                  key:"chat_enabled",            value:true,  description:"إيقاف يوقف جميع المحادثات في التطبيق فوراً",             danger:true  },
    { id:"KS002", name:"الكشوفات الأونلاين",            key:"online_consultations",    value:true,  description:"إيقاف حجوزات الفيديو والاستشارات عن بعد",               danger:true  },
    { id:"KS003", name:"سحب الأرباح للمزودين",          key:"provider_withdrawals",    value:true,  description:"تجميد سحب الأرباح من محافظ المزودين",                   danger:true  },
    { id:"KS004", name:"بروكاست الصيدلية",              key:"pharmacy_broadcast",      value:true,  description:"إيقاف إرسال طلبات الأدوية للصيدليات",                   danger:false },
    { id:"KS005", name:"بروكاست التمريض",               key:"nursing_broadcast",       value:true,  description:"إيقاف إرسال طلبات التمريض المنزلي",                     danger:false },
    { id:"KS006", name:"التسجيل الجديد",                key:"new_registrations",       value:true,  description:"إيقاف تسجيل مزودين ومرضى جدد",                         danger:false },
    { id:"KS007", name:"نظام الطوارئ والإسعاف",         key:"emergency_system",        value:true,  description:"إيقاف زر الاستغاثة وإرسال الإسعاف",                    danger:true  },
    { id:"KS008", name:"نشر التقييمات",                  key:"reviews_enabled",         value:true,  description:"إيقاف نشر تقييمات ومراجعات المرضى الجديدة",            danger:false },
    { id:"KS009", name:"الدفع الإلكتروني",              key:"online_payments",         value:true,  description:"إيقاف بوابات الدفع — الطلبات كاش فقط",                  danger:true  },
    { id:"KS010", name:"الإشعارات التلقائية",            key:"auto_notifications",       value:true,  description:"إيقاف جميع الإشعارات التلقائية والمجدولة",              danger:false },
  ],
  compliance:[
    { id:"C001", provider:"مستشفى الرحمة التخصصي", type:"CR",        number:"1234567890",      expiry:"2026-03-15", status:"valid",         days_remaining:290 },
    { id:"C002", provider:"مركز النبض للتمريض",     type:"SCFHS",     number:"SCFHS-NUR-5678",  expiry:"2025-07-01", status:"expiring_soon", days_remaining:32  },
    { id:"C003", provider:"مختبر الدقة الطبي",      type:"License",   number:"LAB-2024-003",    expiry:"2025-06-15", status:"expiring_soon", days_remaining:17  },
    { id:"C004", provider:"مركز الأشعة التشخيصي",   type:"CR",        number:"6677889900",      expiry:"2025-05-30", status:"expired",       days_remaining:-1  },
    { id:"C005", provider:"صيدلية النهدي",           type:"MOH",       number:"PHM-2024-789",    expiry:"2026-09-01", status:"valid",         days_remaining:460 },
  ],
  transport:[
    { id:"TR001", name:"أرامكس للشحن الطبي",         type:"courier",            covers:["الرياض","جدة","الدمام"],                  active:true,  commission:8 },
    { id:"TR002", name:"سمسا للتوصيل السريع",         type:"courier",            covers:["الرياض","جدة"],                           active:true,  commission:7 },
    { id:"TR003", name:"أوبر بيزنس (نقل المزودين)",  type:"provider_transport", covers:["الرياض","جدة","الدمام","مكة","المدينة"],  active:true,  commission:0 },
    { id:"TR004", name:"كريم بيزنس",                  type:"provider_transport", covers:["الرياض","جدة"],                           active:false, commission:0 },
  ],
  nursing_services:[
    { id:"NS001", name:"تغيير الجروح والضمادات",    category:"جروح وعمليات",   home_available:true,  price_base:150, price_unit:null,    supplies_included:false, duration_minutes:30,  active:true  },
    { id:"NS002", name:"تركيب المغذي والمحاليل IV", category:"علاج وريدي",     home_available:true,  price_base:200, price_unit:null,    supplies_included:false, duration_minutes:60,  active:true  },
    { id:"NS003", name:"سحب عينات المختبر",          category:"تحاليل منزلية", home_available:true,  price_base:80,  price_unit:null,    supplies_included:true,  duration_minutes:20,  active:true  },
    { id:"NS004", name:"قياس العلامات الحيوية",      category:"متابعة صحية",   home_available:true,  price_base:60,  price_unit:null,    supplies_included:true,  duration_minutes:20,  active:true  },
    { id:"NS005", name:"رعاية كبار السن",            category:"رعاية مستمرة",  home_available:true,  price_base:120, price_unit:"ساعة",  supplies_included:false, duration_minutes:null,active:true  },
    { id:"NS006", name:"رعاية ما بعد الولادة",       category:"رعاية الأمومة", home_available:true,  price_base:180, price_unit:null,    supplies_included:false, duration_minutes:90,  active:true  },
    { id:"NS007", name:"حقن العلاج الكيميائي",       category:"علاج متخصص",    home_available:true,  price_base:500, price_unit:null,    supplies_included:false, duration_minutes:120, active:false },
  ],
  audit_logs:[
    { id:1, admin:"أحمد الحربي (Super Admin)", action:"تعليق مزود",           entity:"مركز الأشعة التشخيصي", entity_type:"provider", before:"active",   after:"suspended",  time:"2025-05-28T10:32:00", type:"danger"  },
    { id:2, admin:"منى العتيبي (Operations)",  action:"رفع عمولة",             entity:"مختبر الدقة",          entity_type:"provider", before:"7%",        after:"8%",         time:"2025-05-28T10:15:00", type:"warning" },
    { id:3, admin:"سارة الدوسري (Finance)",   action:"رد مبلغ",               entity:"U004",                 entity_type:"patient",  before:"0 ريال",    after:"+250 ريال",  time:"2025-05-28T10:05:00", type:"info"    },
    { id:4, admin:"أحمد الحربي (Super Admin)", action:"Kill Switch: سحب",      entity:"النظام",               entity_type:"system",   before:"مفعل",      after:"موقوف",      time:"2025-05-27T18:00:00", type:"danger"  },
    { id:5, admin:"أحمد الحربي (Super Admin)", action:"موافقة مزود",           entity:"د. عبدالله الغامدي",  entity_type:"provider", before:"pending",   after:"approved",   time:"2025-05-27T15:00:00", type:"success" },
  ],
  notifications_history:[
    { id:"N001", title:"عرض خاص — تحاليل صيف 2025",  target:"all_patients",    channel:"push",     sent:28400, opened:18200, ctr:"64%", sent_at:"2025-05-25T10:00:00", status:"delivered" },
    { id:"N002", title:"تذكير: موعدك غداً",           target:"specific_users",  channel:"push+sms", sent:142,   opened:138,   ctr:"97%", sent_at:"2025-05-27T18:00:00", status:"delivered" },
    { id:"N003", title:"طلبك في الطريق 🚗",           target:"order_based",     channel:"push",     sent:89,    opened:89,    ctr:"100%",sent_at:"2025-05-28T10:15:00", status:"delivered" },
  ],
};

// ============================================================
// UI PRIMITIVES
// ============================================================
const Badge = ({ children, color = T.accent }) => (
  <span style={{ background:`${color}22`, color, border:`1px solid ${color}44`, borderRadius:6, padding:"2px 10px", fontSize:11, fontWeight:700, fontFamily:"monospace", whiteSpace:"nowrap" }}>{children}</span>
);

const StatusBadge = ({ status }) => {
  const m = {
    active:{label:"نشط",color:T.green}, pending:{label:"انتظار",color:T.orange},
    suspended:{label:"موقوف",color:T.red}, blocked:{label:"محظور",color:T.red},
    in_progress:{label:"جاري",color:T.accent}, completed:{label:"مكتمل",color:T.green},
    pending_payment:{label:"انتظار دفع",color:T.gold}, pending_approval:{label:"موافقة",color:T.purple},
    broadcasting:{label:"📡 برودكاست",color:T.teal}, confirmed:{label:"مؤكد",color:T.green},
    cancelled:{label:"ملغي",color:T.red}, approved:{label:"موافق",color:T.green},
    rejected:{label:"مرفوض",color:T.red}, open:{label:"مفتوح",color:T.red},
    resolved:{label:"محلول",color:T.green}, expiring_soon:{label:"ينتهي قريباً",color:T.orange},
    expired:{label:"منتهي ❌",color:T.red}, valid:{label:"ساري ✅",color:T.green},
    dispatched:{label:"أُرسل الإسعاف ✅",color:T.green}, searching:{label:"يبحث...",color:T.orange},
    expanding:{label:"توسيع النطاق",color:T.gold}, delivered:{label:"تم الإرسال",color:T.green},
    pending_manual:{label:"انتظار يدوي",color:T.orange}, done:{label:"منجز",color:T.green},
    inactive:{label:"غير نشط",color:T.textMuted}, success:{label:"ناجح",color:T.green},
    failed:{label:"فاشل",color:T.red},
  };
  const s = m[status] || { label:status, color:T.textMuted };
  return <Badge color={s.color}>{s.label}</Badge>;
};

const Toggle = ({ value, onChange, disabled }) => (
  <div onClick={() => !disabled && onChange(!value)}
    style={{ width:48, height:26, borderRadius:13, background:value?T.green:"#1e1f2e", cursor:disabled?"not-allowed":"pointer", transition:"all .3s", position:"relative", flexShrink:0, border:`1px solid ${value?`${T.green}66`:"#2e2f45"}`, opacity:disabled?.5:1 }}>
    <div style={{ width:20, height:20, borderRadius:"50%", background:"#fff", position:"absolute", top:2, left:value?25:2, transition:"all .3s", boxShadow:"0 2px 4px #0008" }} />
  </div>
);

const Btn = ({ children, onClick, variant="primary", small, icon, style:s={}, disabled }) => {
  const v = {
    primary:{ background:`${T.accent}1a`, color:T.accent,  border:`1px solid ${T.accent}44`  },
    success:{ background:`${T.green}1a`,  color:T.green,   border:`1px solid ${T.green}44`   },
    danger: { background:`${T.red}1a`,    color:T.red,     border:`1px solid ${T.red}44`     },
    warning:{ background:`${T.orange}1a`, color:T.orange,  border:`1px solid ${T.orange}44`  },
    ghost:  { background:"transparent",   color:T.textMuted,border:`1px solid ${T.border}`   },
    purple: { background:`${T.purple}1a`, color:T.purple,  border:`1px solid ${T.purple}44`  },
    gold:   { background:`${T.gold}1a`,   color:T.gold,    border:`1px solid ${T.gold}44`    },
    teal:   { background:`${T.teal}1a`,   color:T.teal,    border:`1px solid ${T.teal}44`    },
    pink:   { background:`${T.pink}1a`,   color:T.pink,    border:`1px solid ${T.pink}44`    },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...(v[variant]||v.primary), borderRadius:8, padding:small?"4px 12px":"8px 18px", fontSize:small?11:13, fontWeight:700, cursor:disabled?"not-allowed":"pointer", fontFamily:"'Cairo',sans-serif", transition:"all .2s", display:"flex", alignItems:"center", gap:6, whiteSpace:"nowrap", opacity:disabled?.5:1, ...s }}>
      {icon&&<span>{icon}</span>}{children}
    </button>
  );
};

const Input = ({ placeholder, value, onChange, type="text", full, small }) => (
  <input type={type} placeholder={placeholder} value={value||""} onChange={e=>onChange(e.target.value)}
    style={{ background:T.surface2, border:`1px solid ${T.border}`, color:T.text, borderRadius:8, padding:small?"6px 12px":"10px 14px", fontSize:13, fontFamily:"'Cairo',sans-serif", outline:"none", width:full?"100%":"auto", boxSizing:"border-box", transition:"border .2s" }}
    onFocus={e=>e.target.style.borderColor=T.accent}
    onBlur={e=>e.target.style.borderColor=T.border}
  />
);

const Textarea = ({ placeholder, value, onChange, rows=3 }) => (
  <textarea placeholder={placeholder} value={value||""} onChange={e=>onChange(e.target.value)} rows={rows}
    style={{ background:T.surface2, border:`1px solid ${T.border}`, color:T.text, borderRadius:8, padding:"10px 14px", fontSize:13, fontFamily:"'Cairo',sans-serif", outline:"none", width:"100%", resize:"vertical", boxSizing:"border-box" }} />
);

const Sel = ({ options, value, onChange, small }) => (
  <select value={value} onChange={e=>onChange(e.target.value)}
    style={{ background:T.surface2, border:`1px solid ${T.border}`, color:T.text, borderRadius:8, padding:small?"6px 12px":"10px 14px", fontSize:13, fontFamily:"'Cairo',sans-serif", outline:"none", cursor:"pointer" }}>
    {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

const FormRow = ({ label, children, hint, required }) => (
  <div style={{ marginBottom:16 }}>
    <label style={{ display:"block", color:T.textMuted, fontSize:11, fontWeight:700, marginBottom:6, letterSpacing:.5 }}>
      {label}{required&&<span style={{color:T.red,marginRight:3}}>*</span>}
    </label>
    {children}
    {hint&&<div style={{ color:T.textDim, fontSize:11, marginTop:4 }}>{hint}</div>}
  </div>
);

const Card = ({ children, style:s={}, accent, noPad }) => (
  <div style={{ background:T.surface, border:`1px solid ${accent?`${accent}33`:T.border}`, borderRadius:14, padding:noPad?0:20, ...(accent?{boxShadow:`0 0 32px ${accent}0e`}:{}), ...s }}>{children}</div>
);

const Modal = ({ open, onClose, title, children, width=580 }) => {
  if (!open) return null;
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{ position:"fixed", inset:0, background:"#000c", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(4px)" }}>
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:18, width, maxWidth:"95vw", maxHeight:"90vh", overflowY:"auto", padding:30 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
          <h3 style={{ color:T.text, margin:0, fontSize:17, fontWeight:900 }}>{title}</h3>
          <button onClick={onClose} style={{ background:"none", border:"none", color:T.textMuted, cursor:"pointer", fontSize:24, lineHeight:1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};

const Drawer = ({ open, onClose, title, children, width=500 }) => (
  <div style={{ position:"fixed", inset:0, zIndex:900, pointerEvents:open?"all":"none" }}>
    <div onClick={onClose} style={{ position:"absolute", inset:0, background:open?"#000a":"transparent", transition:"background .3s", backdropFilter:open?"blur(4px)":undefined }} />
    <div style={{ position:"absolute", right:0, top:0, bottom:0, width, background:T.surface, borderLeft:`1px solid ${T.border}`, transform:open?"translateX(0)":"translateX(100%)", transition:"transform .38s cubic-bezier(.4,0,.2,1)", overflowY:"auto", padding:26 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:26 }}>
        <h3 style={{ color:T.text, margin:0, fontSize:16, fontWeight:900 }}>{title}</h3>
        <button onClick={onClose} style={{ background:"none", border:"none", color:T.textMuted, cursor:"pointer", fontSize:24 }}>✕</button>
      </div>
      {children}
    </div>
  </div>
);

const ConfirmModal = ({ open, onClose, onConfirm, title, message, danger }) => (
  <Modal open={open} onClose={onClose} title={title} width={440}>
    <p style={{ color:T.textMuted, fontSize:14, lineHeight:1.9, marginBottom:26 }}>{message}</p>
    <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
      <Btn variant="ghost" onClick={onClose}>إلغاء</Btn>
      <Btn variant={danger?"danger":"success"} onClick={()=>{onConfirm();onClose();}}>تأكيد</Btn>
    </div>
  </Modal>
);

const Divider = () => <div style={{ height:1, background:T.border, margin:"18px 0" }} />;

const SectionHeader = ({ title, subtitle, actions=[] }) => (
  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:26, flexWrap:"wrap", gap:12 }}>
    <div>
      <h2 style={{ color:T.text, margin:0, fontSize:22, fontWeight:900 }}>{title}</h2>
      {subtitle&&<p style={{ color:T.textMuted, margin:"4px 0 0", fontSize:13 }}>{subtitle}</p>}
    </div>
    <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>{actions}</div>
  </div>
);

const Table = ({ cols, data, onRowAction, selectable, selected=[], onSelect, emptyMsg="لا توجد بيانات" }) => (
  <div style={{ overflowX:"auto" }}>
    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13, fontFamily:"'Cairo',sans-serif" }}>
      <thead>
        <tr style={{ borderBottom:`1px solid ${T.border}` }}>
          {selectable&&<th style={{ padding:"12px 16px", width:40, textAlign:"right" }}>
            <input type="checkbox" onChange={e=>onSelect(e.target.checked?data.map(d=>d.id):[])} />
          </th>}
          {cols.map(c=><th key={c.key} style={{ padding:"11px 16px", textAlign:"right", color:T.textMuted, fontWeight:600, whiteSpace:"nowrap", fontSize:12, letterSpacing:.4 }}>{c.label}</th>)}
          {onRowAction&&<th style={{ padding:"11px 16px", color:T.textMuted, fontSize:12 }}>إجراءات</th>}
        </tr>
      </thead>
      <tbody>
        {data.length===0&&<tr><td colSpan={cols.length+2} style={{ textAlign:"center", padding:50, color:T.textMuted, fontSize:14 }}>{emptyMsg}</td></tr>}
        {data.map((row,i)=>(
          <tr key={row.id||i} onMouseEnter={e=>e.currentTarget.style.background="#ffffff03"} onMouseLeave={e=>e.currentTarget.style.background="transparent"} style={{ borderBottom:`1px solid ${T.border}`, transition:"background .15s" }}>
            {selectable&&<td style={{ padding:"11px 16px" }}><input type="checkbox" checked={selected.includes(row.id)} onChange={e=>{ if(e.target.checked) onSelect([...selected,row.id]); else onSelect(selected.filter(id=>id!==row.id)); }} /></td>}
            {cols.map(c=><td key={c.key} style={{ padding:"11px 16px", color:T.text, whiteSpace:"nowrap" }}>{c.render?c.render(row):row[c.key]}</td>)}
            {onRowAction&&<td style={{ padding:"11px 16px" }}><div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>{onRowAction(row)}</div></td>}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const StatCard = ({ label, value, change, color, icon, onClick }) => (
  <Card accent={color} style={{ padding:20, cursor:onClick?"pointer":"default" }} onClick={onClick}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
      <div>
        <div style={{ color:T.textMuted, fontSize:12, marginBottom:8 }}>{label}</div>
        <div style={{ color, fontSize:22, fontWeight:900, fontFamily:"monospace", letterSpacing:-1 }}>{value}</div>
        {change&&<div style={{ color:change==="urgent"||change==="!"||change==="new"?T.red:T.green, fontSize:11, marginTop:6, fontWeight:700 }}>{change}</div>}
      </div>
      <span style={{ fontSize:30, opacity:.85 }}>{icon}</span>
    </div>
  </Card>
);

// ============================================================
// ── DASHBOARD ──────────────────────────────────────────────
// ============================================================
const Dashboard = ({ setPage }) => {
  const [tick, setTick] = useState(0);
  useEffect(()=>{ const t=setInterval(()=>setTick(x=>x+1),1000); return()=>clearInterval(t); },[]);
  const now = new Date();
  return (
    <div>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:.5}} @keyframes pulse{0%{box-shadow:0 0 0 0 ${T.red}66}70%{box-shadow:0 0 0 14px transparent}100%{box-shadow:0 0 0 0 transparent}}`}</style>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ color:T.text, margin:0, fontSize:26, fontWeight:900 }}>
            <span style={{ color:T.accent }}>نبض</span> بلس
            <span style={{ color:T.red, marginRight:8 }}>❤️</span>
            مركز التحكم
            <span style={{ fontSize:12, color:T.textMuted, marginRight:12, fontWeight:400 }}>v3.0</span>
          </h1>
          <p style={{ color:T.textMuted, margin:"6px 0 0", fontSize:12 }}>
            {now.toLocaleDateString("ar-SA",{weekday:"long",year:"numeric",month:"long",day:"numeric"})} — {now.toLocaleTimeString("ar-SA")}
          </p>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <Btn variant="danger" onClick={()=>setPage("emergency-live")} icon="🚨">طوارئ (2)</Btn>
          <Btn variant="teal" onClick={()=>setPage("broadcast")} icon="📡">برودكاست (2)</Btn>
          <Btn variant="warning" onClick={()=>setPage("kill-switches")} icon="🔌">Kill Switches</Btn>
          <Btn variant="primary" onClick={()=>setPage("live")} icon="🔴">مباشر</Btn>
        </div>
      </div>

      {/* Alerts Bar */}
      <div style={{ background:`${T.red}11`, border:`1px solid ${T.red}33`, borderRadius:12, padding:"12px 20px", marginBottom:20, display:"flex", gap:16, flexWrap:"wrap", alignItems:"center" }}>
        <span style={{ color:T.red, fontWeight:900, fontSize:13, animation:"blink 1.5s infinite" }}>🚨 تنبيهات عاجلة تستوجب تدخلاً فورياً:</span>
        <Btn small variant="danger" onClick={()=>setPage("emergency-live")}>2 طوارئ نشطة — واحدة لم تُقبل!</Btn>
        <Btn small variant="warning" onClick={()=>setPage("compliance")}>3 تراخيص تنتهي قريباً</Btn>
        <Btn small variant="warning" onClick={()=>setPage("market-shortage")}>2 بلاغات نقص أدوية</Btn>
        <Btn small variant="gold" onClick={()=>setPage("fraud")}>3 تنبيهات احتيال</Btn>
      </div>

      {/* KPI Grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(165px,1fr))", gap:14, marginBottom:24 }}>
        <StatCard label="طلبات اليوم" value="1,284" change="+18%" color={T.accent} icon="📦" onClick={()=>setPage("orders")} />
        <StatCard label="إيرادات اليوم (ر)" value="48,920" change="+24%" color={T.green} icon="💰" onClick={()=>setPage("financial")} />
        <StatCard label="مزودون نشطون" value="342" change="+3" color={T.orange} icon="🏥" onClick={()=>setPage("providers")} />
        <StatCard label="مرضى اليوم" value="2,180" change="+12%" color={T.purple} icon="👥" onClick={()=>setPage("patients")} />
        <StatCard label="موافقات معلقة" value="4" change="urgent" color={T.red} icon="⏳" onClick={()=>setPage("provider-approval")} />
        <StatCard label="برودكاست نشط" value="2" change="!" color={T.teal} icon="📡" onClick={()=>setPage("broadcast")} />
        <StatCard label="إشعارات تلقائية اليوم" value="358" change="+8%" color={T.gold} icon="🤖" onClick={()=>setPage("auto-notifications")} />
        <StatCard label="مطالبات تأمين معلقة" value="1" change="urgent" color={T.orange} icon="🛡️" onClick={()=>setPage("insurance-claims")} />
      </div>

      {/* Main 3-col Grid */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 340px", gap:18 }}>
        {/* Orders */}
        <Card>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <h3 style={{ color:T.text, margin:0, fontSize:15, fontWeight:700 }}>📦 آخر الطلبات</h3>
            <Btn small variant="ghost" onClick={()=>setPage("orders")}>عرض الكل</Btn>
          </div>
          {MOCK.orders.map(o=>(
            <div key={o.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:`1px solid ${T.border}` }}>
              <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                {o.priority==="urgent"&&<span style={{ color:T.red, fontSize:14 }}>🚨</span>}
                <div>
                  <div style={{ color:T.text, fontSize:12, fontWeight:600 }}>{o.id} — {o.patient}</div>
                  <div style={{ color:T.textMuted, fontSize:11 }}>{o.type} · {o.subtype} · {o.time}</div>
                </div>
              </div>
              <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                <StatusBadge status={o.status} />
                <span style={{ color:T.green, fontFamily:"monospace", fontSize:11 }}>{o.amount>0?`${o.amount} ر`:"—"}</span>
              </div>
            </div>
          ))}
        </Card>

        {/* Broadcast Live */}
        <Card accent={T.teal}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <h3 style={{ color:T.teal, margin:0, fontSize:15, fontWeight:700 }}>📡 برودكاست مباشر</h3>
            <Btn small variant="teal" onClick={()=>setPage("broadcast")}>إدارة</Btn>
          </div>
          {MOCK.broadcast_live.map(b=>(
            <div key={b.id} style={{ background:T.surface2, borderRadius:10, padding:14, marginBottom:12, border:`1px solid ${T.teal}22` }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                <span style={{ color:T.text, fontSize:13, fontWeight:700 }}>{b.order_id}</span>
                <StatusBadge status={b.status} />
              </div>
              <div style={{ color:T.textMuted, fontSize:12, marginBottom:10 }}>{b.patient} · {b.area}</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:10 }}>
                {[["النطاق",`${b.radius} كم`,T.teal],["مُبلَّغون",b.providers_notified,T.orange],["انقضى",b.elapsed,T.red]].map(([k,v,c])=>(
                  <div key={k} style={{ textAlign:"center" }}>
                    <div style={{ color:c, fontSize:18, fontWeight:900, fontFamily:"monospace" }}>{v}</div>
                    <div style={{ color:T.textMuted, fontSize:10 }}>{k}</div>
                  </div>
                ))}
              </div>
              {/* Radius Visual */}
              <div style={{ display:"flex", gap:4, alignItems:"center", marginBottom:8 }}>
                {[4,6,8].map((r,i)=>(
                  <div key={r} style={{ display:"flex", alignItems:"center", gap:4 }}>
                    <div style={{ width:28,height:28,borderRadius:"50%",border:`2px solid ${b.radius>=r?T.teal:T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:b.radius>=r?T.teal:T.textMuted,fontWeight:700,background:b.radius>=r?`${T.teal}11`:"transparent" }}>{r}</div>
                    {i<2&&<div style={{ width:16,height:2,background:b.radius>r?T.teal:T.border }}/>}
                  </div>
                ))}
                <span style={{ color:T.textMuted, fontSize:10, marginRight:4 }}>كم</span>
              </div>
              {b.next_expand&&<div style={{ color:T.gold, fontSize:11, marginBottom:10 }}>⏰ توسيع تلقائي: {b.next_expand}</div>}
              <div style={{ display:"flex", gap:6 }}>
                <Btn small variant="primary">📍 إسناد يدوي</Btn>
                <Btn small variant="warning">⬆️ توسيع الآن</Btn>
                <Btn small variant="danger">❌ إلغاء</Btn>
              </div>
            </div>
          ))}
        </Card>

        {/* Right Column */}
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {/* Emergency */}
          <Card accent={T.red}>
            <h3 style={{ color:T.red, margin:"0 0 12px", fontSize:14, fontWeight:700 }}>🚨 طوارئ نشطة</h3>
            {MOCK.emergency_live.map(em=>(
              <div key={em.id} style={{ padding:"8px 0", borderBottom:`1px solid ${T.border}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ color:T.text, fontSize:12, fontWeight:700 }}>{em.patient}</span>
                  <StatusBadge status={em.status} />
                </div>
                <div style={{ color:T.textMuted, fontSize:11, marginBottom:4 }}>📍 {em.location} · {em.type}</div>
                {em.accepted_by
                  ? <div style={{ color:T.green, fontSize:11 }}>✅ {em.accepted_by} · ETA: {em.eta}</div>
                  : <div style={{ color:T.red, fontSize:11, animation:"blink 1s infinite", fontWeight:700 }}>⚠️ لم تقبل أي مستشفى! تدخل فوري</div>
                }
              </div>
            ))}
            <Btn small variant="danger" style={{ marginTop:10, width:"100%", justifyContent:"center" }} onClick={()=>setPage("emergency-live")}>إدارة الطوارئ</Btn>
          </Card>

          {/* Pending Approvals */}
          <Card accent={T.orange}>
            <h3 style={{ color:T.orange, margin:"0 0 12px", fontSize:14, fontWeight:700 }}>⏳ موافقات ({MOCK.pending_approvals.length})</h3>
            {MOCK.pending_approvals.map(p=>(
              <div key={p.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${T.border}` }}>
                <div>
                  <div style={{ color:T.text, fontSize:12, fontWeight:600 }}>{p.name}</div>
                  <div style={{ color:T.textMuted, fontSize:11 }}>{p.type} · نقاط: {p.score}</div>
                  {!p.iban_verified&&<div style={{ color:T.red, fontSize:10, fontWeight:700 }}>⚠️ IBAN غير مؤكد</div>}
                </div>
                <Btn small variant="warning" onClick={()=>setPage("provider-approval")}>مراجعة</Btn>
              </div>
            ))}
          </Card>

          {/* Compliance */}
          <Card accent={T.gold}>
            <h3 style={{ color:T.gold, margin:"0 0 12px", fontSize:14, fontWeight:700 }}>⚠️ تراخيص تنتهي</h3>
            {MOCK.compliance.filter(c=>c.status!=="valid").slice(0,3).map(c=>(
              <div key={c.id} style={{ padding:"6px 0", borderBottom:`1px solid ${T.border}` }}>
                <div style={{ color:T.text, fontSize:12, fontWeight:600 }}>{c.provider}</div>
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:2 }}>
                  <span style={{ color:T.textMuted, fontSize:11 }}>{c.type} · {c.expiry}</span>
                  <span style={{ color:c.days_remaining<0?T.red:T.orange, fontFamily:"monospace", fontSize:11, fontWeight:700 }}>
                    {c.days_remaining<0?`متأخر ${Math.abs(c.days_remaining)}د`:`${c.days_remaining} يوم`}
                  </span>
                </div>
              </div>
            ))}
            <Btn small variant="gold" style={{ marginTop:10, width:"100%", justifyContent:"center" }} onClick={()=>setPage("compliance")}>إدارة الكل</Btn>
          </Card>
        </div>
      </div>
    </div>
  );
};

// ── BROADCAST MONITOR ───────────────────────────────────────
const BroadcastMonitor = () => {
  const [expandConfirm, setExpandConfirm] = useState(null);
  const [manualModal, setManualModal] = useState(null);
  return (
    <div>
      <SectionHeader title="📡 مراقبة البرودكاست المباشر" subtitle="تتبع وتدخل في عمليات البرودكاست لحظة بلحظة" actions={[
        <Btn key="r" variant="primary" icon="🔄">تحديث</Btn>,
        <Btn key="c" variant="ghost" onClick={()=>{}} icon="⚙️">إعدادات البرودكاست</Btn>,
      ]} />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:24 }}>
        <StatCard label="برودكاست نشط الآن" value="2" color={T.teal} icon="📡" />
        <StatCard label="متوسط وقت القبول" value="4.2 د" color={T.green} icon="⚡" />
        <StatCard label="توسعت نطاقها اليوم" value="18" color={T.orange} icon="⬆️" />
        <StatCard label="لم تجد مزوداً اليوم" value="3" color={T.red} icon="❌" />
      </div>
      {MOCK.broadcast_live.map(b=>(
        <Card key={b.id} accent={T.teal} style={{ marginBottom:16 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:16, alignItems:"start" }}>
            <div>
              <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:12 }}>
                <span style={{ color:T.teal, fontFamily:"monospace", fontWeight:900, fontSize:16 }}>{b.order_id}</span>
                <StatusBadge status={b.status} />
                <Badge color={T.purple}>{b.type}</Badge>
                <span style={{ color:T.textMuted, fontSize:12 }}>{b.patient} · {b.area}</span>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:12, marginBottom:14 }}>
                {[["النطاق",`${b.radius} كم`,T.teal],["بدأ",b.started,T.textMuted],["انقضى",b.elapsed,T.orange],["مُبلَّغون",b.providers_notified,T.purple],["قبلوا",b.accepted||0,T.green],["التوسيع القادم",b.next_expand||"—",T.gold]].map(([k,v,c])=>(
                  <div key={k}><div style={{ color:T.textMuted, fontSize:10, marginBottom:2 }}>{k}</div><div style={{ color:c, fontSize:14, fontWeight:700 }}>{v}</div></div>
                ))}
              </div>
              {/* Radius Progress */}
              <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                {[4,6,8].map((r,i)=>(
                  <div key={r} style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <div style={{ width:36,height:36,borderRadius:"50%",border:`2px solid ${b.radius>=r?T.teal:T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:b.radius>=r?T.teal:T.textMuted,fontWeight:900,background:b.radius>=r?`${T.teal}1a`:T.surface2 }}>{r}</div>
                    {i<2&&<div style={{ width:24,height:2,background:b.radius>r?T.teal:T.border }}/>}
                  </div>
                ))}
                <span style={{ color:T.textMuted, fontSize:11, marginRight:6 }}>كيلومتر</span>
                {b.status==="expanding"&&<Badge color={T.gold}>جاري التوسيع الآن...</Badge>}
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8, minWidth:160 }}>
              <Btn variant="primary" onClick={()=>setManualModal(b)} icon="📍">إسناد يدوي</Btn>
              <Btn variant="warning" onClick={()=>setExpandConfirm(b)} icon="⬆️">توسيع فوري</Btn>
              <Btn variant="danger" icon="❌">إلغاء الطلب</Btn>
              <Btn variant="ghost" icon="📊">السجل</Btn>
            </div>
          </div>
        </Card>
      ))}
      {/* Manual Assign Modal */}
      <Modal open={!!manualModal} onClose={()=>setManualModal(null)} title={`إسناد يدوي: ${manualModal?.order_id}`} width={480}>
        <FormRow label="اختر المزود" required>
          <Sel options={[{value:"",label:"اختر مزوداً"}, ...MOCK.providers.filter(p=>p.available&&p.status==="active").map(p=>({value:p.id,label:`${p.name} (${p.area})`}))]} value="" onChange={()=>{}} />
        </FormRow>
        <FormRow label="سبب الإسناد اليدوي" required><Textarea placeholder="لماذا تتدخل يدوياً؟" value="" onChange={()=>{}} rows={2} /></FormRow>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:16 }}>
          <Btn variant="ghost" onClick={()=>setManualModal(null)}>إلغاء</Btn>
          <Btn variant="success" icon="📍">تأكيد الإسناد</Btn>
        </div>
      </Modal>
      <ConfirmModal open={!!expandConfirm} onClose={()=>setExpandConfirm(null)} onConfirm={()=>{}} title="توسيع النطاق يدوياً"
        message={`توسيع نطاق ${expandConfirm?.order_id} من ${expandConfirm?.radius} كم إلى ${(expandConfirm?.radius||0)+2} كم فوراً؟`} />
    </div>
  );
};

// ── EMERGENCY LIVE ──────────────────────────────────────────
const EmergencyLive = () => {
  const [manualModal, setManualModal] = useState(false);
  return (
    <div>
      <style>{`@keyframes emergencyPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}`}</style>
      <SectionHeader title="🚨 التحكم في الطوارئ المباشرة" subtitle="مراقبة وتدخل فوري في حالات الطوارئ" actions={[
        <Btn key="m" variant="danger" onClick={()=>setManualModal(true)} icon="🚨">إرسال إسعاف يدوي</Btn>,
        <Btn key="r" variant="primary" icon="🔄">تحديث الآن</Btn>,
      ]} />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18, marginBottom:20 }}>
        {MOCK.emergency_live.map(em=>(
          <Card key={em.id} accent={em.status==="searching"?T.red:T.green} style={{ position:"relative" }}>
            {em.status==="searching"&&(
              <div style={{ position:"absolute", top:16, left:16, width:14, height:14, borderRadius:"50%", background:T.red, animation:"pulse 1.5s infinite" }} />
            )}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
              <div>
                <div style={{ color:T.text, fontWeight:900, fontSize:17 }}>{em.patient}</div>
                <div style={{ color:T.textMuted, fontSize:13, marginTop:2 }}>📍 {em.location}</div>
                <Badge color={em.type==="قلبية"?T.red:T.orange} style={{ marginTop:6 }}>{em.type}</Badge>
              </div>
              <StatusBadge status={em.status} />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:14 }}>
              {[["بدأت",em.started,T.textMuted],["مستشفيات مُبلَّغة",em.hospitals_notified,T.purple],["ETA",em.eta||"—",T.green]].map(([k,v,c])=>(
                <div key={k} style={{ textAlign:"center" }}>
                  <div style={{ color:c, fontSize:20, fontWeight:900, fontFamily:"monospace" }}>{v}</div>
                  <div style={{ color:T.textMuted, fontSize:10, marginTop:2 }}>{k}</div>
                </div>
              ))}
            </div>
            <div style={{ padding:12, borderRadius:8, background:em.status==="dispatched"?`${T.green}11`:`${T.red}11`, border:`1px solid ${em.status==="dispatched"?T.green:T.red}33`, marginBottom:14 }}>
              {em.status==="dispatched"
                ? <div style={{ color:T.green, fontSize:13, fontWeight:700 }}>✅ {em.accepted_by} — الإسعاف في الطريق</div>
                : <div style={{ color:T.red, fontSize:13, fontWeight:700, animation:"blink 1s infinite" }}>⚠️ لم تقبل أي مستشفى! تدخل يدوي مطلوب الآن</div>
              }
            </div>
            <div style={{ display:"flex", gap:8 }}>
              {em.status==="searching"&&<Btn variant="danger" style={{flex:1,justifyContent:"center"}} icon="🏥">إسناد يدوي فوري</Btn>}
              <Btn variant="primary" icon="📍">تتبع الخريطة</Btn>
              <Btn variant="ghost" icon="📋">تفاصيل</Btn>
            </div>
          </Card>
        ))}
      </div>
      {/* Override Panel */}
      <Card accent={T.orange}>
        <h3 style={{ color:T.orange, margin:"0 0 18px", fontSize:15 }}>⚡ تجاوز التوجيه التلقائي — إسناد يدوي مباشر</h3>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <FormRow label="موقع المريض"><Input placeholder="العنوان أو الإحداثيات" value="" onChange={()=>{}} full /></FormRow>
          <FormRow label="نوع الطوارئ">
            <Sel options={[{value:"",label:"اختر"},{value:"cardiac",label:"🫀 قلبية"},{value:"trauma",label:"🩹 إصابة/حادث"},{value:"stroke",label:"🧠 جلطة دماغية"},{value:"breathing",label:"🫁 صعوبة تنفس"},{value:"other",label:"أخرى"}]} value="" onChange={()=>{}} />
          </FormRow>
          <FormRow label="المستشفى المختار">
            <Sel options={[{value:"",label:"اختر مستشفى"},...MOCK.providers.filter(p=>p.type==="Hospital").map(p=>({value:p.id,label:p.name}))]} value="" onChange={()=>{}} />
          </FormRow>
          <FormRow label="سبب التجاوز"><Input placeholder="سبب الإسناد اليدوي..." value="" onChange={()=>{}} full /></FormRow>
        </div>
        <Btn variant="danger" icon="🚨">تفعيل الطوارئ وإرسال الإسعاف الآن</Btn>
      </Card>
      <Modal open={manualModal} onClose={()=>setManualModal(false)} title="إرسال إسعاف يدوي جديد" width={500}>
        <FormRow label="موقع المريض" required><Input placeholder="العنوان التفصيلي" value="" onChange={()=>{}} full /></FormRow>
        <FormRow label="نوع الحالة" required><Sel options={[{value:"",label:"اختر"},{value:"cardiac",label:"🫀 قلبية"},{value:"trauma",label:"🩹 إصابة"},{value:"stroke",label:"🧠 جلطة"},{value:"breathing",label:"🫁 تنفس"},{value:"other",label:"أخرى"}]} value="" onChange={()=>{}} /></FormRow>
        <FormRow label="المستشفى" required><Sel options={[{value:"",label:"اختر مستشفى"},...MOCK.providers.filter(p=>p.type==="Hospital").map(p=>({value:p.id,label:p.name}))]} value="" onChange={()=>{}} /></FormRow>
        <FormRow label="رقم الإسعاف"><Input placeholder="AMB-XXX (اختياري)" value="" onChange={()=>{}} /></FormRow>
        <Divider />
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <Btn variant="ghost" onClick={()=>setManualModal(false)}>إلغاء</Btn>
          <Btn variant="danger" icon="🚨">إرسال الإسعاف الآن</Btn>
        </div>
      </Modal>
    </div>
  );
};

// ── KILL SWITCHES ───────────────────────────────────────────
const KillSwitches = () => {
  const [switches, setSwitches] = useState(MOCK.kill_switches);
  const [confirm, setConfirm] = useState(null);
  const toggle = (sw) => {
    if (sw.danger) { setConfirm(sw); return; }
    setSwitches(prev=>prev.map(s=>s.id===sw.id?{...s,value:!s.value}:s));
  };
  return (
    <div>
      <SectionHeader title="🔌 Kill Switches — التحكم الشامل الفوري" subtitle="إيقاف وتشغيل أي ميزة في النظام في ثوانٍ" />
      <div style={{ background:`${T.red}11`, border:`1px solid ${T.red}33`, borderRadius:12, padding:16, marginBottom:24 }}>
        <div style={{ color:T.red, fontWeight:700, fontSize:14, marginBottom:6 }}>⚠️ تحذير: هذه التغييرات تُطبَّق فوراً على جميع المستخدمين</div>
        <div style={{ color:T.textMuted, fontSize:13, lineHeight:1.8 }}>المفاتيح باللون الأحمر تحتاج تأكيداً إضافياً. كل تغيير يُسجَّل في سجل الإجراءات (Audit Log) مع اسم الأدمن والوقت.</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        {switches.map(sw=>(
          <Card key={sw.id} accent={sw.value?(sw.danger?T.orange:T.green):T.red}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:6 }}>
                  <span style={{ color:T.text, fontWeight:700, fontSize:14 }}>{sw.name}</span>
                  {sw.danger&&<Badge color={T.red}>⚠️ خطر عالٍ</Badge>}
                </div>
                <div style={{ color:T.textMuted, fontSize:12, lineHeight:1.7, marginBottom:8 }}>{sw.description}</div>
                <div style={{ fontSize:12 }}>
                  الحالة الحالية: <span style={{ color:sw.value?T.green:T.red, fontWeight:700 }}>{sw.value?"مفعّل ✅":"موقوف 🔴"}</span>
                </div>
              </div>
              <div style={{ marginRight:16, marginTop:4 }}>
                <Toggle value={sw.value} onChange={()=>toggle(sw)} />
              </div>
            </div>
          </Card>
        ))}
      </div>
      <ConfirmModal open={!!confirm} onClose={()=>setConfirm(null)} danger
        title={`تأكيد ${confirm?.value?"إيقاف":"تفعيل"}: ${confirm?.name}`}
        message={`أنت على وشك ${confirm?.value?"إيقاف":"تفعيل"} "${confirm?.name}". هذا الإجراء يؤثر فوراً على جميع المستخدمين. هل أنت متأكد تماماً؟`}
        onConfirm={()=>setSwitches(prev=>prev.map(s=>s.id===confirm?.id?{...s,value:!s.value}:s))}
      />
    </div>
  );
};

// ── PROVIDER APPROVAL (Full KYC Workflow) ───────────────────
const ProviderApproval = () => {
  const [sel, setSel] = useState(null);
  const [rejectModal, setRejectModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [reason, setReason] = useState("");
  const [commissionVal, setCommissionVal] = useState("");

  const docBadge = (val) => ({
    "✅": <Badge color={T.green}>✅ مؤكد</Badge>,
    "⚠️": <Badge color={T.orange}>⚠️ ناقص</Badge>,
    null: <Badge color={T.red}>❌ مفقود</Badge>,
  }[val]);

  return (
    <div>
      <SectionHeader title="✅ نظام موافقة المزودين (KYC كامل)" subtitle={`${MOCK.pending_approvals.length} طلبات تنتظر المراجعة`} actions={[
        <Btn key="ba" variant="success">✅ موافقة جماعية</Btn>,
        <Btn key="br" variant="danger">❌ رفض جماعي</Btn>,
      ]} />
      <div style={{ display:"grid", gridTemplateColumns:sel?"1fr 1fr":"1fr", gap:20 }}>
        {/* List */}
        <Card>
          {MOCK.pending_approvals.map(p=>(
            <div key={p.id} onClick={()=>setSel(p)} style={{ padding:16, borderRadius:12, border:`1px solid ${sel?.id===p.id?`${T.accent}44`:T.border}`, background:sel?.id===p.id?`${T.accent}06`:"transparent", cursor:"pointer", marginBottom:12, transition:"all .2s" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                <div>
                  <div style={{ color:T.text, fontWeight:800, fontSize:14, marginBottom:4 }}>{p.name}</div>
                  <div style={{ color:T.textMuted, fontSize:12 }}>{p.type} · {p.city} · تقدّم: {p.submitted}</div>
                  {p.specialty&&<div style={{ color:T.accent, fontSize:12 }}>{p.specialty} — {p.degree}</div>}
                </div>
                <div style={{ textAlign:"center" }}>
                  <div style={{ color:p.score>=80?T.green:p.score>=60?T.orange:T.red, fontSize:24, fontWeight:900, fontFamily:"monospace" }}>{p.score}</div>
                  <div style={{ color:T.textMuted, fontSize:10 }}>نقاط</div>
                </div>
              </div>
              {/* Doc Status */}
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:8 }}>
                {Object.entries(p.docs).map(([k,v])=>(
                  <div key={k} style={{ display:"flex", gap:4, alignItems:"center" }}>
                    <span style={{ color:T.textMuted, fontSize:10 }}>{k}:</span>
                    {docBadge(v)}
                  </div>
                ))}
              </div>
              {!p.iban_verified&&<div style={{ color:T.red, fontSize:11, fontWeight:700, marginBottom:6 }}>⚠️ IBAN غير مؤكد — لا تُوافق قبل التحقق!</div>}
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {p.services.map(s=><Badge key={s} color={T.purple}>{s}</Badge>)}
              </div>
            </div>
          ))}
        </Card>
        {/* Detail Panel */}
        {sel&&(
          <Card accent={T.accent}>
            <h3 style={{ color:T.accent, marginBottom:18, fontSize:16, fontWeight:800 }}>مراجعة تفصيلية: {sel.name}</h3>
            <div style={{ background:T.surface2, borderRadius:10, padding:14, marginBottom:16 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                {[["النوع",sel.type],["المدينة",sel.city],["التواصل",sel.contact],["العمولة المقترحة",`${sel.commission_proposed}%`],["التخصص",sel.specialty||"—"],["الدرجة العلمية",sel.degree||"—"]].map(([k,v])=>(
                  <div key={k}><div style={{ color:T.textMuted, fontSize:11, marginBottom:2 }}>{k}</div><div style={{ color:T.text, fontSize:13, fontWeight:600 }}>{v}</div></div>
                ))}
              </div>
            </div>
            {/* Doc Review */}
            <h4 style={{ color:T.textMuted, fontSize:12, marginBottom:10, fontWeight:700 }}>مراجعة الوثائق الرسمية:</h4>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:16 }}>
              {Object.entries(sel.docs).map(([key,val])=>(
                <div key={key} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 12px", background:T.surface2, borderRadius:8 }}>
                  <span style={{ color:T.text, fontSize:12 }}>{key}</span>
                  <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                    {docBadge(val)}
                    <Btn small variant="ghost">📄 عرض</Btn>
                  </div>
                </div>
              ))}
            </div>
            {/* Selective Service Approval */}
            <h4 style={{ color:T.textMuted, fontSize:12, marginBottom:10, fontWeight:700 }}>موافقة انتقائية على الخدمات:</h4>
            {sel.services.map(s=>(
              <div key={s} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${T.border}` }}>
                <span style={{ color:T.text, fontSize:13 }}>{s}</span>
                <div style={{ display:"flex", gap:6 }}>
                  <Btn small variant="success">✅ موافقة</Btn>
                  <Btn small variant="danger">❌ رفض</Btn>
                </div>
              </div>
            ))}
            {/* Commission Override */}
            <div style={{ marginTop:16, padding:14, background:T.surface2, borderRadius:10 }}>
              <div style={{ color:T.textMuted, fontSize:12, marginBottom:8 }}>تعديل نسبة العمولة (الافتراضية: {sel.commission_proposed}%)</div>
              <div style={{ display:"flex", gap:8 }}>
                <Input type="number" value={commissionVal||sel.commission_proposed} onChange={setCommissionVal} />
                <Btn variant="primary">تطبيق</Btn>
              </div>
            </div>
            {!sel.iban_verified&&(
              <div style={{ marginTop:12, padding:12, background:`${T.red}11`, border:`1px solid ${T.red}33`, borderRadius:10 }}>
                <div style={{ color:T.red, fontWeight:700 }}>⚠️ تحذير: IBAN غير مؤكد</div>
                <div style={{ color:T.textMuted, fontSize:12, marginTop:4 }}>يجب التحقق من IBAN وتطابقه مع السجل التجاري أو ترخيص SCFHS قبل الموافقة</div>
              </div>
            )}
            <Divider />
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <Btn variant="success" style={{flex:1,justifyContent:"center"}} disabled={!sel.iban_verified}>✅ موافقة كاملة وتفعيل</Btn>
              <Btn variant="warning" onClick={()=>setEditModal(true)}>📝 طلب تعديلات</Btn>
              <Btn variant="danger" onClick={()=>setRejectModal(true)}>❌ رفض</Btn>
            </div>
            {!sel.iban_verified&&<div style={{ color:T.red, fontSize:11, marginTop:8, textAlign:"center" }}>⚠️ الموافقة معطّلة حتى يتم التحقق من IBAN</div>}
          </Card>
        )}
      </div>
      {/* Reject Modal */}
      <Modal open={rejectModal} onClose={()=>setRejectModal(false)} title="سبب رفض المزود" width={460}>
        <FormRow label="سبب الرفض (سيُرسل للمزود)" required><Textarea value={reason} onChange={setReason} placeholder="اكتب سبب الرفض بوضوح..." rows={4} /></FormRow>
        <FormRow label="هل يُسمح بإعادة التقديم؟">
          <Sel options={[{value:"yes",label:"نعم — بعد تصحيح المستندات"},{value:"no",label:"لا — رفض نهائي ودائم"}]} value="yes" onChange={()=>{}} />
        </FormRow>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:16 }}>
          <Btn variant="ghost" onClick={()=>setRejectModal(false)}>إلغاء</Btn>
          <Btn variant="danger" onClick={()=>setRejectModal(false)} icon="❌">إرسال الرفض</Btn>
        </div>
      </Modal>
      {/* Request Edit Modal */}
      <Modal open={editModal} onClose={()=>setEditModal(false)} title="طلب تعديلات من المزود" width={460}>
        <div style={{ color:T.textMuted, fontSize:13, marginBottom:14 }}>حدد ما يجب على المزود تعديله أو إضافته:</div>
        {["السجل التجاري CR","IBAN البنكي وتطابقه","ترخيص هيئة التخصصات SCFHS","صور المنشأة","نطاق الخدمات وأسعارها","معلومات التأمين","معلومات وسيلة النقل"].map(item=>(
          <label key={item} style={{ display:"flex", gap:8, alignItems:"center", marginBottom:10, cursor:"pointer" }}>
            <input type="checkbox" />
            <span style={{ color:T.text, fontSize:13 }}>{item}</span>
          </label>
        ))}
        <FormRow label="ملاحظات إضافية"><Textarea placeholder="تفاصيل إضافية..." value="" onChange={()=>{}} rows={3} /></FormRow>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:16 }}>
          <Btn variant="ghost" onClick={()=>setEditModal(false)}>إلغاء</Btn>
          <Btn variant="warning" onClick={()=>setEditModal(false)} icon="📝">إرسال طلب التعديل</Btn>
        </div>
      </Modal>
    </div>
  );
};

// ── SUB-ACCOUNTS ────────────────────────────────────────────
const SubAccounts = () => {
  const [modal, setModal] = useState(false);
  const [filter, setFilter] = useState("all");
  const roleLabels = { doctor:"طبيب", insurance_officer:"موظف تأمين", lab_tech:"فني مختبر", nurse:"ممرض/ممرضة", receptionist:"موظف استقبال" };
  const roleColors = { doctor:T.accent, insurance_officer:T.gold, lab_tech:T.teal, nurse:T.pink, receptionist:T.purple };
  const filtered = filter==="all" ? MOCK.sub_accounts : MOCK.sub_accounts.filter(s=>s.parent_id===filter);
  return (
    <div>
      <SectionHeader title="🏢 الحسابات الفرعية (Sub-Accounts)" subtitle={`${MOCK.sub_accounts.length} حساب فرعي نشط`} actions={[
        <Btn key="a" variant="success" onClick={()=>setModal(true)} icon="＋">إنشاء حساب فرعي</Btn>,
        <Btn key="e" variant="ghost" icon="📤">تصدير</Btn>,
      ]} />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:20 }}>
        <StatCard label="إجمالي الحسابات" value={MOCK.sub_accounts.length} color={T.accent} icon="🏢" />
        <StatCard label="أطباء" value={MOCK.sub_accounts.filter(s=>s.role==="doctor").length} color={T.purple} icon="👨‍⚕️" />
        <StatCard label="موظفو تأمين" value={MOCK.sub_accounts.filter(s=>s.role==="insurance_officer").length} color={T.gold} icon="🛡️" />
        <StatCard label="فنيو مختبر" value={MOCK.sub_accounts.filter(s=>s.role==="lab_tech").length} color={T.teal} icon="🧪" />
      </div>
      <Card style={{ marginBottom:14 }}>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {[{id:"all",label:"الكل"},...MOCK.providers.filter(p=>p.sub_accounts>0).map(p=>({id:p.id,label:p.name}))].map(f=>(
            <button key={f.id} onClick={()=>setFilter(f.id)} style={{ padding:"6px 16px", borderRadius:8, fontSize:12, fontFamily:"'Cairo',sans-serif", cursor:"pointer", background:filter===f.id?`${T.accent}22`:"transparent", color:filter===f.id?T.accent:T.textMuted, border:`1px solid ${filter===f.id?`${T.accent}44`:T.border}` }}>{f.label}</button>
          ))}
        </div>
      </Card>
      <Card>
        <Table cols={[
          {key:"id",label:"ID",render:r=><span style={{color:T.textMuted,fontFamily:"monospace",fontSize:11}}>{r.id}</span>},
          {key:"parent",label:"المنشأة الأم",render:r=><span style={{color:T.accent,fontSize:12}}>{r.parent_provider}</span>},
          {key:"name",label:"الاسم",render:r=><span style={{color:T.text,fontWeight:700}}>{r.name}</span>},
          {key:"role",label:"الدور",render:r=><Badge color={roleColors[r.role]}>{roleLabels[r.role]}</Badge>},
          {key:"specialty",label:"التخصص/القسم",render:r=><span style={{color:T.textMuted}}>{r.specialty||"—"}</span>},
          {key:"email",label:"البريد",render:r=><span style={{color:T.textMuted,fontSize:12}}>{r.email}</span>},
          {key:"orders_today",label:"طلبات اليوم",render:r=><Badge color={T.green}>{r.orders_today}</Badge>},
          {key:"status",label:"الحالة",render:r=><StatusBadge status={r.status}/>},
        ]} data={filtered} onRowAction={r=><>
          <Btn small variant="primary">تعديل</Btn>
          <Btn small variant="ghost">إعادة كلمة المرور</Btn>
          <Btn small variant="danger">تعليق</Btn>
        </>} />
      </Card>
      <Modal open={modal} onClose={()=>setModal(false)} title="إنشاء حساب فرعي جديد" width={560}>
        <FormRow label="المنشأة الأم" required>
          <Sel options={MOCK.providers.map(p=>({value:p.id,label:p.name}))} value="" onChange={()=>{}} />
        </FormRow>
        <FormRow label="دور الحساب الفرعي" required>
          <Sel options={[{value:"",label:"اختر الدور"},{value:"doctor",label:"👨‍⚕️ طبيب"},{value:"insurance_officer",label:"🛡️ موظف تأمين"},{value:"lab_tech",label:"🧪 فني مختبر"},{value:"nurse",label:"💉 ممرض/ممرضة"},{value:"receptionist",label:"📞 موظف استقبال"}]} value="" onChange={()=>{}} />
        </FormRow>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <FormRow label="الاسم الكامل" required><Input placeholder="الاسم الكامل" value="" onChange={()=>{}} full /></FormRow>
          <FormRow label="البريد الإلكتروني" required><Input type="email" placeholder="email@example.com" value="" onChange={()=>{}} full /></FormRow>
          <FormRow label="التخصص / القسم"><Input placeholder="باطنية / تحاليل / تمريض..." value="" onChange={()=>{}} full /></FormRow>
          <FormRow label="رقم SCFHS (إن وجد)"><Input placeholder="SCFHS-XXXX-XXXX" value="" onChange={()=>{}} full /></FormRow>
        </div>
        <div style={{ background:`${T.accent}11`, border:`1px solid ${T.accent}33`, borderRadius:10, padding:12, marginBottom:16 }}>
          <div style={{ color:T.accent, fontSize:13, fontWeight:700, marginBottom:4 }}>📧 آلية الإنشاء التلقائي</div>
          <div style={{ color:T.textMuted, fontSize:12, lineHeight:1.7 }}>سيُنشئ النظام Sub-ID فريد + كلمة مرور عشوائية، ويُرسلهما فوراً للبريد المحدد. يستطيع الطبيب تسجيل الدخول بهما في تطبيق نبض بلس (إصدار المزود).</div>
        </div>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <Btn variant="ghost" onClick={()=>setModal(false)}>إلغاء</Btn>
          <Btn variant="success" icon="🏢">إنشاء وإرسال البيانات</Btn>
        </div>
      </Modal>
    </div>
  );
};

// ── AUTO-NOTIFICATIONS ENGINE ────────────────────────────────
const AutoNotifications = () => {
  const [rules, setRules] = useState(MOCK.auto_notification_rules);
  const [modal, setModal] = useState(false);
  const [editRule, setEditRule] = useState(null);
  const targetColors = { patient:T.accent, provider:T.purple };

  return (
    <div>
      <SectionHeader title="🤖 محرك الإشعارات التلقائية" subtitle="إدارة كاملة للإشعارات المُشروطة والمُجدولة" actions={[
        <Btn key="a" variant="success" onClick={()=>{ setEditRule(null); setModal(true); }} icon="＋">قاعدة جديدة</Btn>,
        <Btn key="e" variant="ghost" icon="📊">تقرير الأداء</Btn>,
      ]} />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:24 }}>
        <StatCard label="قواعد نشطة" value={rules.filter(r=>r.active).length} color={T.green} icon="✅" />
        <StatCard label="مُرسل اليوم" value={rules.reduce((a,r)=>a+r.sent_today,0)} color={T.accent} icon="📤" />
        <StatCard label="قواعد موقوفة" value={rules.filter(r=>!r.active).length} color={T.red} icon="⏸️" />
        <StatCard label="معدل التحويل" value="34%" color={T.gold} icon="🎯" />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        {rules.map(rule=>(
          <Card key={rule.id} accent={rule.active?T.green:T.border}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
              <div style={{ flex:1 }}>
                <div style={{ color:T.text, fontWeight:700, fontSize:14, marginBottom:6 }}>{rule.title}</div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:8 }}>
                  <Badge color={targetColors[rule.target]}>{rule.target==="patient"?"👤 للمريض":"🏥 للمزود"}</Badge>
                  <Badge color={T.textMuted}>{rule.channel.toUpperCase()}</Badge>
                  <Badge color={T.purple}>{rule.trigger}</Badge>
                </div>
              </div>
              <Toggle value={rule.active} onChange={v=>setRules(prev=>prev.map(r=>r.id===rule.id?{...r,active:v}:r))} />
            </div>
            <div style={{ background:T.surface2, borderRadius:8, padding:10, marginBottom:10 }}>
              <div style={{ color:T.textMuted, fontSize:11, marginBottom:4 }}>نص الرسالة:</div>
              <div style={{ color:T.text, fontSize:12, lineHeight:1.6 }}>{rule.body}</div>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ color:T.textMuted, fontSize:12 }}>
                ⏱️ {rule.delay} · 📤 مُرسل اليوم: <span style={{ color:T.green, fontFamily:"monospace", fontWeight:700 }}>{rule.sent_today}</span>
              </div>
              <div style={{ display:"flex", gap:6 }}>
                <Btn small variant="primary" onClick={()=>{ setEditRule(rule); setModal(true); }}>تعديل</Btn>
                <Btn small variant="danger">حذف</Btn>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Modal open={modal} onClose={()=>{ setModal(false); setEditRule(null); }} title={editRule?"تعديل قاعدة إشعار":"قاعدة إشعار تلقائي جديدة"} width={620}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <FormRow label="حدث التشغيل (Trigger)" required>
            <Sel options={[{value:"",label:"اختر الحدث"},{value:"cart_abandoned",label:"سلة متروكة"},{value:"booking_incomplete",label:"حجز غير مكتمل"},{value:"prescription_issued",label:"وصفة طبية صدرت"},{value:"lab_results_ready",label:"نتائج تحاليل جاهزة"},{value:"appointment_reminder_24h",label:"تذكير موعد 24ساعة"},{value:"appointment_reminder_1h",label:"تذكير موعد ساعة"},{value:"order_confirmed",label:"تأكيد طلب"},{value:"provider_new_order",label:"طلب جديد للمزود"},{value:"review_request",label:"طلب تقييم"},{value:"wallet_low",label:"رصيد منخفض"},{value:"license_expiring_30d",label:"ترخيص ينتهي قريباً"},{value:"medicine_shortage_alert",label:"تحذير نقص دواء"}]} value={editRule?.trigger||""} onChange={()=>{}} />
          </FormRow>
          <FormRow label="المستهدف">
            <Sel options={[{value:"patient",label:"👤 المريض"},{value:"provider",label:"🏥 المزود"},{value:"both",label:"كلاهما"}]} value={editRule?.target||"patient"} onChange={()=>{}} />
          </FormRow>
          <FormRow label="قنوات الإرسال">
            <Sel options={[{value:"push",label:"Push فقط"},{value:"sms",label:"SMS فقط"},{value:"push+sms",label:"Push + SMS"},{value:"push+email",label:"Push + Email"},{value:"all",label:"كل القنوات"}]} value={editRule?.channel||"push"} onChange={()=>{}} />
          </FormRow>
          <FormRow label="التأخير بعد الحدث">
            <Input placeholder="مثال: 30 دقيقة / فوري / 24 ساعة قبل" value={editRule?.delay||""} onChange={()=>{}} full />
          </FormRow>
        </div>
        <FormRow label="عنوان الإشعار" required><Input placeholder="عنوان الإشعار..." value={editRule?.title||""} onChange={()=>{}} full /></FormRow>
        <FormRow label="نص الرسالة" required><Textarea placeholder="نص الإشعار..." value={editRule?.body||""} onChange={()=>{}} /></FormRow>
        <div style={{ background:`${T.accent}11`, border:`1px solid ${T.accent}33`, borderRadius:10, padding:12, marginBottom:16 }}>
          <div style={{ color:T.accent, fontSize:12, fontWeight:700, marginBottom:6 }}>🔧 متغيرات ديناميكية:</div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {["{{patient_name}}","{{doctor_name}}","{{service_type}}","{{appointment_time}}","{{order_id}}","{{medicine_name}}","{{amount}}","{{eta}}","{{provider_name}}"].map(v=>(
              <span key={v} style={{ background:T.surface2, color:T.teal, fontFamily:"monospace", fontSize:11, padding:"2px 8px", borderRadius:4, cursor:"pointer" }}>{v}</span>
            ))}
          </div>
        </div>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <Btn variant="ghost" onClick={()=>{ setModal(false); setEditRule(null); }}>إلغاء</Btn>
          <Btn variant="success" icon="✅">حفظ القاعدة</Btn>
        </div>
      </Modal>
    </div>
  );
};

// ── NOTIFICATIONS MANAGER ────────────────────────────────────
const NotificationsManager = () => {
  const [modal, setModal] = useState(false);
  const [tab, setTab] = useState("history");
  const [targetType, setTargetType] = useState("all");
  return (
    <div>
      <SectionHeader title="📱 مدير الإشعارات اليدوية" subtitle="إرسال إشعارات مخصصة لأي مستخدم أو مجموعة" actions={[
        <Btn key="n" variant="success" onClick={()=>setModal(true)} icon="📤">إشعار جديد</Btn>,
      ]} />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:20 }}>
        <StatCard label="مُرسل اليوم" value="2,847" color={T.green} icon="📤" />
        <StatCard label="معدل الفتح" value="68%" color={T.accent} icon="👁️" />
        <StatCard label="SMS مُرسل" value="342" color={T.gold} icon="📱" />
        <StatCard label="معدل التحويل" value="12%" color={T.purple} icon="🎯" />
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:20 }}>
        {[{v:"history",l:"📋 السجل"},{v:"settings",l:"⚙️ القنوات"},{v:"templates",l:"📝 القوالب"}].map(t=>(
          <button key={t.v} onClick={()=>setTab(t.v)} style={{ padding:"8px 20px", borderRadius:8, fontSize:13, fontFamily:"'Cairo',sans-serif", cursor:"pointer", background:tab===t.v?`${T.accent}22`:"transparent", color:tab===t.v?T.accent:T.textMuted, border:`1px solid ${tab===t.v?`${T.accent}44`:T.border}` }}>{t.l}</button>
        ))}
      </div>
      {tab==="history"&&<Card>
        <Table cols={[
          {key:"id",label:"ID",render:r=><span style={{color:T.textMuted,fontFamily:"monospace",fontSize:11}}>{r.id}</span>},
          {key:"title",label:"العنوان",render:r=><span style={{color:T.text,fontWeight:700}}>{r.title}</span>},
          {key:"target",label:"المستهدف",render:r=><Badge color={T.purple}>{r.target}</Badge>},
          {key:"channel",label:"القناة",render:r=><Badge color={T.accent}>{r.channel.toUpperCase()}</Badge>},
          {key:"sent",label:"مُرسل",render:r=><span style={{color:T.text,fontFamily:"monospace"}}>{r.sent.toLocaleString()}</span>},
          {key:"opened",label:"مفتوح",render:r=><span style={{color:T.green,fontFamily:"monospace"}}>{r.opened.toLocaleString()} ({r.ctr})</span>},
          {key:"status",label:"الحالة",render:r=><StatusBadge status={r.status}/>},
        ]} data={MOCK.notifications_history} onRowAction={()=><Btn small variant="ghost">تفاصيل</Btn>} />
      </Card>}
      {tab==="settings"&&<Card>
        <h3 style={{ color:T.text, marginBottom:20, fontSize:15, fontWeight:700 }}>إعدادات القنوات</h3>
        {[{name:"Push Notifications",status:true,provider:"Firebase FCM"},{name:"SMS",status:true,provider:"Unifonic"},{name:"Email",status:true,provider:"SendGrid"},{name:"WhatsApp Business",status:false,provider:"360Dialog"}].map(c=>(
          <div key={c.name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 0", borderBottom:`1px solid ${T.border}` }}>
            <div>
              <div style={{ color:T.text, fontWeight:700, fontSize:14 }}>{c.name}</div>
              <div style={{ color:T.textMuted, fontSize:12, marginTop:2 }}>مزود: <span style={{ color:T.accent }}>{c.provider}</span></div>
            </div>
            <div style={{ display:"flex", gap:12, alignItems:"center" }}>
              <Toggle value={c.status} onChange={()=>{}} />
              <Btn small variant="ghost">⚙️ إعداد</Btn>
            </div>
          </div>
        ))}
      </Card>}
      {tab==="templates"&&<Card style={{ textAlign:"center", padding:60 }}>
        <div style={{ fontSize:40, marginBottom:12 }}>📝</div>
        <div style={{ color:T.text, fontSize:15, fontWeight:700, marginBottom:8 }}>قوالب الإشعارات</div>
        <Btn variant="success" style={{ margin:"0 auto" }} icon="＋">إنشاء قالب جديد</Btn>
      </Card>}
      {/* Send Modal */}
      <Modal open={modal} onClose={()=>setModal(false)} title="إرسال إشعار جديد" width={620}>
        <FormRow label="المستلمون" required>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:10 }}>
            {[{v:"all",l:"🌍 الكل"},{v:"all_patients",l:"👥 كل المرضى"},{v:"all_providers",l:"🏥 كل المزودين"},{v:"specific_users",l:"👤 مستخدمين محددين"},{v:"city",l:"📍 مدينة محددة"},{v:"service_type",l:"⚕️ نوع خدمة"}].map(t=>(
              <button key={t.v} onClick={()=>setTargetType(t.v)} style={{ padding:"6px 14px", borderRadius:8, fontSize:12, fontFamily:"'Cairo',sans-serif", cursor:"pointer", background:targetType===t.v?`${T.accent}22`:"transparent", color:targetType===t.v?T.accent:T.textMuted, border:`1px solid ${targetType===t.v?`${T.accent}44`:T.border}` }}>{t.l}</button>
            ))}
          </div>
          {targetType==="specific_users"&&<Input placeholder="أدخل أرقام الجوال أو IDs مفصولة بفاصلة" value="" onChange={()=>{}} full />}
          {targetType==="city"&&<Sel options={[{value:"riyadh",label:"الرياض"},{value:"jeddah",label:"جدة"},{value:"dammam",label:"الدمام"},{value:"mecca",label:"مكة"},{value:"medina",label:"المدينة المنورة"}]} value="riyadh" onChange={()=>{}} />}
        </FormRow>
        <FormRow label="قنوات الإرسال" required>
          <div style={{ display:"flex", gap:16 }}>
            {["Push","SMS","Email","WhatsApp"].map(ch=>(
              <label key={ch} style={{ display:"flex", gap:6, alignItems:"center", cursor:"pointer" }}>
                <input type="checkbox" defaultChecked={ch==="Push"} />
                <span style={{ color:T.text, fontSize:13 }}>{ch}</span>
              </label>
            ))}
          </div>
        </FormRow>
        <FormRow label="عنوان الإشعار (عربي)" required><Input placeholder="عنوان الإشعار..." value="" onChange={()=>{}} full /></FormRow>
        <FormRow label="نص الرسالة (عربي)" required><Textarea placeholder="نص الإشعار..." value="" onChange={()=>{}} /></FormRow>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <FormRow label="اللغة"><Sel options={[{value:"ar",label:"عربي فقط"},{value:"en",label:"English only"},{value:"both",label:"الاثنان"}]} value="ar" onChange={()=>{}} /></FormRow>
          <FormRow label="الجدولة"><Sel options={[{value:"now",label:"⚡ إرسال الآن"},{value:"scheduled",label:"🕐 جدولة لوقت محدد"}]} value="now" onChange={()=>{}} /></FormRow>
        </div>
        <Divider />
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <Btn variant="ghost" onClick={()=>setModal(false)}>إلغاء</Btn>
          <Btn variant="primary" icon="👁️">معاينة</Btn>
          <Btn variant="success" icon="📤">إرسال الآن</Btn>
        </div>
      </Modal>
    </div>
  );
};

// ── MARKET SHORTAGE ─────────────────────────────────────────
const MarketShortage = () => (
  <div>
    <SectionHeader title="⚠️ نقص الأدوية في السوق" subtitle="إدارة بلاغات نقص الأدوية وتحذيرات المرضى" actions={[<Btn key="r" variant="primary" icon="🔄">تحديث</Btn>]} />
    <div style={{ background:`${T.orange}11`, border:`1px solid ${T.orange}33`, borderRadius:12, padding:14, marginBottom:20 }}>
      <div style={{ color:T.orange, fontSize:13, fontWeight:700, marginBottom:4 }}>كيف يعمل النظام؟</div>
      <div style={{ color:T.textMuted, fontSize:13, lineHeight:1.8 }}>
        الصيدلي يُبلّغ عن نقص دواء ← الأدمن يُراجع ويُؤكد ← النظام يُظهر تحذيراً للمرضى عند البحث عن الدواء ← اقتراح البدائل تلقائياً
      </div>
    </div>
    <Card>
      <Table cols={[
        {key:"id",label:"ID",render:r=><span style={{color:T.textMuted,fontFamily:"monospace",fontSize:11}}>{r.id}</span>},
        {key:"medicine_name",label:"الدواء",render:r=><span style={{color:T.text,fontWeight:700}}>{r.medicine_name}</span>},
        {key:"reporter",label:"أبلغ عنه",render:r=><Badge color={T.purple}>{r.reporter}</Badge>},
        {key:"reported_at",label:"وقت البلاغ",render:r=><span style={{color:T.textMuted,fontSize:12}}>{new Date(r.reported_at).toLocaleString("ar-SA")}</span>},
        {key:"confirmed",label:"تأكيد الأدمن",render:r=><Toggle value={r.confirmed} onChange={()=>{}} />},
        {key:"warning_shown",label:"تحذير للمرضى",render:r=><Toggle value={r.warning_shown} onChange={()=>{}} />},
        {key:"alternatives",label:"البدائل المقترحة",render:r=><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{r.alternatives.map(a=><Badge key={a} color={T.teal}>{a}</Badge>)}</div>},
      ]} data={MOCK.market_shortage} onRowAction={r=><>
        {!r.confirmed&&<Btn small variant="warning">تأكيد النقص</Btn>}
        <Btn small variant="primary">تعديل البدائل</Btn>
        <Btn small variant="danger">إغلاق البلاغ</Btn>
      </>} />
    </Card>
  </div>
);

// ── B2B SUPPLY REQUESTS ─────────────────────────────────────
const B2BSupply = () => {
  const [drawer, setDrawer] = useState(null);
  const methodIcons = { voice:"🎤 صوتي (AI)", ocr:"📷 OCR (شيت)", manual:"✏️ يدوي" };
  return (
    <div>
      <SectionHeader title="🏭 طلبيات نواقص الصيدليات (B2B)" subtitle="استقبال ومعالجة طلبيات المستودع من الصيدليات" actions={[<Btn key="e" variant="ghost" icon="📤">تصدير</Btn>]} />
      <div style={{ background:`${T.accent}11`, border:`1px solid ${T.accent}33`, borderRadius:12, padding:14, marginBottom:20 }}>
        <div style={{ color:T.accent, fontSize:13, fontWeight:700, marginBottom:4 }}>آليات إدخال الطلبيات المدعومة:</div>
        <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
          <div style={{ color:T.textMuted, fontSize:13 }}>🎤 <strong style={{color:T.text}}>صوتي:</strong> يسجّل الصيدلي صوته والـ AI يحوّله لطلبية</div>
          <div style={{ color:T.textMuted, fontSize:13 }}>📷 <strong style={{color:T.text}}>OCR:</strong> يرفع صورة شيت النواقص والـ AI يقرأ الأصناف</div>
          <div style={{ color:T.textMuted, fontSize:13 }}>✏️ <strong style={{color:T.text}}>يدوي:</strong> إدخال الأصناف مباشرة</div>
        </div>
      </div>
      <Card>
        <Table cols={[
          {key:"id",label:"رقم الطلبية",render:r=><span style={{color:T.accent,fontFamily:"monospace"}}>{r.id}</span>},
          {key:"pharmacy",label:"الصيدلية",render:r=><span style={{color:T.text,fontWeight:700}}>{r.pharmacy}</span>},
          {key:"total_items",label:"الأصناف",render:r=><Badge color={T.purple}>{r.total_items} صنف</Badge>},
          {key:"input_method",label:"طريقة الإدخال",render:r=><Badge color={T.gold}>{methodIcons[r.input_method]}</Badge>},
          {key:"submitted",label:"وقت الإرسال",render:r=><span style={{color:T.textMuted,fontSize:12}}>{new Date(r.submitted).toLocaleString("ar-SA")}</span>},
          {key:"status",label:"الحالة",render:r=><StatusBadge status={r.status}/>},
          {key:"notes",label:"ملاحظات",render:r=><span style={{color:T.textMuted,fontSize:11}}>{r.notes}</span>},
        ]} data={MOCK.b2b_requests} onRowAction={r=><>
          <Btn small variant="primary" onClick={()=>setDrawer(r)}>مراجعة الطلبية</Btn>
          {r.status==="pending"&&<><Btn small variant="success">تأكيد</Btn><Btn small variant="danger">رفض</Btn></>}
        </>} />
      </Card>
      <Drawer open={!!drawer} onClose={()=>setDrawer(null)} title={`مراجعة الطلبية: ${drawer?.id}`}>
        {drawer&&<div>
          <div style={{ background:T.surface2, borderRadius:10, padding:14, marginBottom:18 }}>
            <div style={{ color:T.text, fontWeight:700, marginBottom:6 }}>{drawer.pharmacy}</div>
            <div style={{ color:T.textMuted, fontSize:12, marginBottom:8 }}>{drawer.notes}</div>
            <Badge color={T.gold}>{methodIcons[drawer.input_method]}</Badge>
          </div>
          <h4 style={{ color:T.textMuted, fontSize:12, marginBottom:12 }}>الأصناف المطلوبة (قابلة للتعديل):</h4>
          {drawer.items.map((item,i)=>(
            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 12px", background:T.surface2, borderRadius:8, marginBottom:8 }}>
              <span style={{ color:T.text, fontSize:13, flex:1 }}>{item.name}</span>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <input type="number" defaultValue={item.qty} style={{ width:65, background:T.bg, border:`1px solid ${T.border}`, color:T.green, borderRadius:6, padding:"4px 8px", fontSize:12, fontFamily:"monospace", textAlign:"center" }} />
                <Badge color={T.textMuted}>{item.unit}</Badge>
              </div>
            </div>
          ))}
          <Btn small variant="success" style={{ marginBottom:16 }} icon="＋">إضافة صنف</Btn>
          <Divider />
          <FormRow label="ملاحظة للصيدلية"><Textarea placeholder="رسالة للصيدلية..." value="" onChange={()=>{}} rows={2} /></FormRow>
          <div style={{ display:"flex", gap:8 }}>
            <Btn variant="success" style={{flex:1,justifyContent:"center"}} icon="✅">تأكيد الطلبية</Btn>
            <Btn variant="warning">تعديل</Btn>
            <Btn variant="danger">رفض</Btn>
          </div>
        </div>}
      </Drawer>
    </div>
  );
};

// ── INSURANCE CLAIMS ─────────────────────────────────────────
const InsuranceClaims = () => {
  const [drawer, setDrawer] = useState(null);
  const [copayPercent, setCopayPercent] = useState("");
  return (
    <div>
      <SectionHeader title="🛡️ مطالبات التأمين" subtitle="مراجعة ومعالجة المطالبات التأمينية يدوياً" actions={[
        <Btn key="e" variant="ghost" icon="📤">تصدير</Btn>,
        <Btn key="r" variant="primary" icon="🔄">تحديث</Btn>,
      ]} />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:20 }}>
        <StatCard label="معلقة" value={MOCK.insurance_claims.filter(c=>c.status==="pending_manual").length} color={T.orange} icon="⏳" />
        <StatCard label="موافق عليها" value={MOCK.insurance_claims.filter(c=>c.status==="approved").length} color={T.green} icon="✅" />
        <StatCard label="مرفوضة" value={MOCK.insurance_claims.filter(c=>c.status==="rejected").length} color={T.red} icon="❌" />
        <StatCard label="إجمالي مُعالَج" value="23,450 ر" color={T.accent} icon="💰" />
      </div>
      <Card>
        <Table cols={[
          {key:"id",label:"رقم المطالبة",render:r=><span style={{color:T.accent,fontFamily:"monospace"}}>{r.id}</span>},
          {key:"patient",label:"المريض"},{key:"provider",label:"المزود"},
          {key:"service",label:"الخدمة",render:r=><span style={{color:T.text,fontSize:12}}>{r.service}</span>},
          {key:"insurance_co",label:"شركة التأمين",render:r=><Badge color={T.purple}>{r.insurance_co}</Badge>},
          {key:"category",label:"الفئة",render:r=><Badge color={T.gold}>{r.category}</Badge>},
          {key:"total_amount",label:"الإجمالي",render:r=><span style={{color:T.text,fontFamily:"monospace"}}>{r.total_amount} ر</span>},
          {key:"copay",label:"تحمل المريض",render:r=><span style={{color:T.orange,fontFamily:"monospace"}}>{r.patient_copay} ر ({r.copay_percent}%)</span>},
          {key:"status",label:"الحالة",render:r=><StatusBadge status={r.status}/>},
        ]} data={MOCK.insurance_claims} onRowAction={r=><Btn small variant="primary" onClick={()=>{ setDrawer(r); setCopayPercent(String(r.copay_percent)); }}>معالجة</Btn>} />
      </Card>
      <Drawer open={!!drawer} onClose={()=>setDrawer(null)} title={`معالجة المطالبة: ${drawer?.id}`} width={520}>
        {drawer&&<div>
          <div style={{ background:T.surface2, borderRadius:10, padding:14, marginBottom:18 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {[["المريض",drawer.patient],["المزود",drawer.provider],["الخدمة",drawer.service],["شركة التأمين",drawer.insurance_co],["رقم البوليصة",drawer.policy],["الفئة التأمينية",drawer.category]].map(([k,v])=>(
                <div key={k}><div style={{ color:T.textMuted, fontSize:11, marginBottom:2 }}>{k}</div><div style={{ color:T.text, fontSize:13, fontWeight:600 }}>{v}</div></div>
              ))}
            </div>
          </div>
          {/* Financial Calculation Engine */}
          <Card accent={T.gold} style={{ marginBottom:16 }}>
            <h4 style={{ color:T.gold, margin:"0 0 14px", fontSize:14 }}>🧮 حسبة تحمل التأمين</h4>
            <div style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:`1px solid ${T.border}` }}>
              <span style={{ color:T.textMuted }}>إجمالي المبلغ</span>
              <span style={{ color:T.text, fontFamily:"monospace", fontWeight:700 }}>{drawer.total_amount} ريال</span>
            </div>
            <FormRow label="نسبة تحمل المريض (%)" hint="أدخل النسبة لحساب المبالغ تلقائياً">
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <Input type="number" value={copayPercent} onChange={setCopayPercent} />
                <span style={{ color:T.textMuted }}>%</span>
              </div>
            </FormRow>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:12 }}>
              <div style={{ background:`${T.green}11`, border:`1px solid ${T.green}33`, borderRadius:10, padding:14, textAlign:"center" }}>
                <div style={{ color:T.green, fontSize:20, fontWeight:900, fontFamily:"monospace" }}>{Math.round(drawer.total_amount*(1-Number(copayPercent||drawer.copay_percent)/100))} ر</div>
                <div style={{ color:T.textMuted, fontSize:11, marginTop:4 }}>تغطي شركة التأمين</div>
              </div>
              <div style={{ background:`${T.orange}11`, border:`1px solid ${T.orange}33`, borderRadius:10, padding:14, textAlign:"center" }}>
                <div style={{ color:T.orange, fontSize:20, fontWeight:900, fontFamily:"monospace" }}>{Math.round(drawer.total_amount*Number(copayPercent||drawer.copay_percent)/100)} ر</div>
                <div style={{ color:T.textMuted, fontSize:11, marginTop:4 }}>يدفع المريض (Co-pay)</div>
              </div>
            </div>
          </Card>
          <FormRow label="قرار المطالبة" required>
            <Sel options={[{value:"",label:"اختر القرار"},{value:"full",label:"✅ موافقة كاملة على جميع الأصناف"},{value:"partial",label:"⚠️ موافقة جزئية (بعض الأصناف فقط)"},{value:"rejected",label:"❌ رفض المطالبة كاملاً"}]} value="" onChange={()=>{}} />
          </FormRow>
          <FormRow label="ملاحظة"><Textarea placeholder="ملاحظة للمطالبة..." value="" onChange={()=>{}} rows={2} /></FormRow>
          {drawer.status==="rejected"&&(
            <div style={{ background:`${T.red}11`, border:`1px solid ${T.red}33`, borderRadius:10, padding:12, marginBottom:16 }}>
              <div style={{ color:T.red, fontSize:13, fontWeight:700 }}>سبب الرفض السابق:</div>
              <div style={{ color:T.textMuted, fontSize:13, marginTop:4 }}>{drawer.rejection_reason}</div>
            </div>
          )}
          <Divider />
          <Btn variant="success" style={{ width:"100%", justifyContent:"center" }} icon="✅">إرسال القرار وإشعار المريض والمزود</Btn>
        </div>}
      </Drawer>
    </div>
  );
};

// ── COMPLIANCE MONITOR ───────────────────────────────────────
const Compliance = () => (
  <div>
    <SectionHeader title="⚠️ مراقبة الامتثال والتراخيص" subtitle="تتبع تواريخ انتهاء تراخيص المزودين" actions={[
      <Btn key="n" variant="warning" icon="📢">إشعار الجميع بالتجديد</Btn>,
      <Btn key="e" variant="ghost" icon="📊">تصدير تقرير</Btn>,
    ]} />
    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:20 }}>
      <StatCard label="تراخيص سارية" value={MOCK.compliance.filter(c=>c.status==="valid").length} color={T.green} icon="✅" />
      <StatCard label="تنتهي خلال 30 يوم" value={MOCK.compliance.filter(c=>c.status==="expiring_soon").length} color={T.orange} icon="⚠️" />
      <StatCard label="منتهية الصلاحية!" value={MOCK.compliance.filter(c=>c.status==="expired").length} color={T.red} icon="❌" />
    </div>
    <Card>
      <Table cols={[
        {key:"provider",label:"المزود",render:r=><span style={{color:T.text,fontWeight:700}}>{r.provider}</span>},
        {key:"type",label:"نوع الترخيص",render:r=><Badge color={T.accent}>{r.type}</Badge>},
        {key:"number",label:"الرقم",render:r=><span style={{color:T.textMuted,fontFamily:"monospace",fontSize:12}}>{r.number}</span>},
        {key:"expiry",label:"تاريخ الانتهاء",render:r=><Badge color={r.status==="expired"?T.red:r.status==="expiring_soon"?T.orange:T.green}>{r.expiry}</Badge>},
        {key:"days_remaining",label:"الأيام المتبقية",render:r=>(
          <span style={{ color:r.days_remaining<0?T.red:r.days_remaining<30?T.orange:T.green, fontFamily:"monospace", fontWeight:700 }}>
            {r.days_remaining<0?`متأخر ${Math.abs(r.days_remaining)} يوم`:`${r.days_remaining} يوم`}
          </span>
        )},
        {key:"status",label:"الحالة",render:r=><StatusBadge status={r.status}/>},
      ]} data={MOCK.compliance} onRowAction={r=><>
        <Btn small variant="primary">تجديد</Btn>
        <Btn small variant="warning">إشعار المزود</Btn>
        {r.status==="expired"&&<Btn small variant="danger">إيقاف الخدمة</Btn>}
      </>} />
    </Card>
  </div>
);

// ── TRANSPORT ────────────────────────────────────────────────
const Transport = () => {
  const [modal, setModal] = useState(false);
  return (
    <div>
      <SectionHeader title="🚗 إدارة النقل والتوصيل" subtitle="شركات شحن الأدوية ونقل مقدمي الخدمة" actions={[
        <Btn key="a" variant="success" onClick={()=>setModal(true)} icon="＋">إضافة شركة</Btn>,
      ]} />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }}>
        <Card accent={T.accent}>
          <h3 style={{ color:T.accent, margin:"0 0 14px", fontSize:14, fontWeight:700 }}>📦 شركات شحن الأدوية</h3>
          <div style={{ color:T.textMuted, fontSize:12, lineHeight:1.7, marginBottom:12 }}>تُستخدم عندما لا تملك الصيدلية مندوب توصيل خاص بها.</div>
          {MOCK.transport.filter(t=>t.type==="courier").map(t=>(
            <div key={t.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:`1px solid ${T.border}` }}>
              <div>
                <div style={{ color:T.text, fontSize:13, fontWeight:600 }}>{t.name}</div>
                <div style={{ color:T.textMuted, fontSize:11 }}>تغطي: {t.covers.join(" · ")}</div>
                <Badge color={T.green}>عمولة: {t.commission}%</Badge>
              </div>
              <Toggle value={t.active} onChange={()=>{}} />
            </div>
          ))}
        </Card>
        <Card accent={T.purple}>
          <h3 style={{ color:T.purple, margin:"0 0 14px", fontSize:14, fontWeight:700 }}>🚖 نقل مقدمي الخدمة</h3>
          <div style={{ color:T.textMuted, fontSize:12, lineHeight:1.7, marginBottom:12 }}>عندما لا يملك الطبيب/الممرض/فني المختبر سيارة، يطلب النظام نقله عبر هذه الخدمات.</div>
          {MOCK.transport.filter(t=>t.type==="provider_transport").map(t=>(
            <div key={t.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:`1px solid ${T.border}` }}>
              <div>
                <div style={{ color:T.text, fontSize:13, fontWeight:600 }}>{t.name}</div>
                <div style={{ color:T.textMuted, fontSize:11 }}>تغطي: {t.covers.join(" · ")}</div>
              </div>
              <Toggle value={t.active} onChange={()=>{}} />
            </div>
          ))}
        </Card>
      </div>
      <Modal open={modal} onClose={()=>setModal(false)} title="إضافة شركة نقل/شحن جديدة" width={500}>
        <FormRow label="اسم الشركة" required><Input placeholder="اسم الشركة" value="" onChange={()=>{}} full /></FormRow>
        <FormRow label="نوع الخدمة" required><Sel options={[{value:"courier",label:"📦 شحن الأدوية والمنتجات"},{value:"provider_transport",label:"🚖 نقل مقدمي الخدمة"}]} value="" onChange={()=>{}} /></FormRow>
        <FormRow label="المدن المغطاة"><Input placeholder="الرياض، جدة، الدمام..." value="" onChange={()=>{}} full /></FormRow>
        <FormRow label="نسبة العمولة (%)"><Input type="number" placeholder="5" value="" onChange={()=>{}} /></FormRow>
        <FormRow label="معلومات التواصل / API Endpoint"><Input placeholder="+966XXXXXXXXX أو رابط API" value="" onChange={()=>{}} full /></FormRow>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:16 }}>
          <Btn variant="ghost" onClick={()=>setModal(false)}>إلغاء</Btn>
          <Btn variant="success" icon="✅">إضافة</Btn>
        </div>
      </Modal>
    </div>
  );
};

// ── NURSING SERVICES ────────────────────────────────────────
const NursingServices = () => {
  const [modal, setModal] = useState(false);
  return (
    <div>
      <SectionHeader title="💉 خدمات التمريض المنزلي المعتمدة" subtitle={`${MOCK.nursing_services.length} خدمات تمريضية`} actions={[
        <Btn key="a" variant="success" onClick={()=>setModal(true)} icon="＋">إضافة خدمة</Btn>,
        <Btn key="b" variant="primary" icon="📤">رفع Excel</Btn>,
      ]} />
      <div style={{ background:`${T.teal}11`, border:`1px solid ${T.teal}33`, borderRadius:12, padding:12, marginBottom:16 }}>
        <div style={{ color:T.teal, fontSize:13, fontWeight:700, marginBottom:4 }}>ملاحظة تشغيلية:</div>
        <div style={{ color:T.textMuted, fontSize:13 }}>عندما تكون "المستلزمات غير مشمولة" سيظهر للمريض تنبيه: "هذه الخدمة تشمل أجر يد الممرض فقط — يرجى توفير المستلزمات أو اختر إضافة حقيبة المستلزمات"</div>
      </div>
      <Card>
        <Table cols={[
          {key:"id",label:"ID",render:r=><span style={{color:T.textMuted,fontFamily:"monospace",fontSize:11}}>{r.id}</span>},
          {key:"name",label:"الخدمة",render:r=><span style={{color:T.text,fontWeight:700}}>{r.name}</span>},
          {key:"category",label:"الفئة",render:r=><Badge color={T.accent}>{r.category}</Badge>},
          {key:"home_available",label:"منزلي",render:r=>r.home_available?<Badge color={T.green}>🏠 متاح</Badge>:<Badge color={T.textMuted}>في المركز</Badge>},
          {key:"price",label:"السعر",render:r=><span style={{color:T.green,fontFamily:"monospace"}}>{r.price_base} ر{r.price_unit?` / ${r.price_unit}`:""}</span>},
          {key:"supplies_included",label:"المستلزمات",render:r=>r.supplies_included?<Badge color={T.green}>✅ مشمولة</Badge>:<Badge color={T.orange}>⚠️ غير مشمولة</Badge>},
          {key:"duration_minutes",label:"المدة",render:r=>r.duration_minutes?<Badge color={T.purple}>{r.duration_minutes} د</Badge>:<Badge color={T.textMuted}>متغيرة</Badge>},
          {key:"active",label:"الحالة",render:r=><Toggle value={r.active} onChange={()=>{}} />},
        ]} data={MOCK.nursing_services} onRowAction={()=><><Btn small variant="primary">تعديل</Btn><Btn small variant="danger">حذف</Btn></>} />
      </Card>
      <Modal open={modal} onClose={()=>setModal(false)} title="إضافة خدمة تمريضية جديدة" width={580}>
        <FormRow label="اسم الخدمة" required><Input placeholder="مثال: تغيير الجروح والضمادات" value="" onChange={()=>{}} full /></FormRow>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <FormRow label="الفئة" required><Sel options={[{value:"",label:"اختر"},{value:"جروح وعمليات",label:"جروح وعمليات"},{value:"علاج وريدي",label:"علاج وريدي"},{value:"تحاليل منزلية",label:"تحاليل منزلية"},{value:"متابعة صحية",label:"متابعة صحية"},{value:"رعاية مستمرة",label:"رعاية مستمرة"},{value:"رعاية الأمومة",label:"رعاية الأمومة"},{value:"علاج متخصص",label:"علاج متخصص"}]} value="" onChange={()=>{}} /></FormRow>
          <FormRow label="السعر الأساسي (ر)" required><Input type="number" placeholder="150" value="" onChange={()=>{}} /></FormRow>
          <FormRow label="وحدة السعر"><Sel options={[{value:"fixed",label:"سعر ثابت للزيارة"},{value:"ساعة",label:"بالساعة"},{value:"اليوم",label:"باليوم"},{value:"الشهر",label:"بالشهر"}]} value="fixed" onChange={()=>{}} /></FormRow>
          <FormRow label="مدة الخدمة (دقيقة)"><Input type="number" placeholder="30" value="" onChange={()=>{}} /></FormRow>
        </div>
        <div style={{ display:"flex", gap:20, marginBottom:16 }}>
          <label style={{ display:"flex", gap:8, alignItems:"center", cursor:"pointer" }}><input type="checkbox" /><span style={{ color:T.text, fontSize:13 }}>🏠 متاح كخدمة منزلية</span></label>
          <label style={{ display:"flex", gap:8, alignItems:"center", cursor:"pointer" }}><input type="checkbox" /><span style={{ color:T.text, fontSize:13 }}>✅ المستلزمات مشمولة</span></label>
        </div>
        <FormRow label="ملاحظات للمريض" hint="تُعرض للمريض عند اختيار الخدمة"><Textarea placeholder="مثال: هذه الخدمة تشمل أجر يد الممرض فقط..." value="" onChange={()=>{}} rows={2} /></FormRow>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <Btn variant="ghost" onClick={()=>setModal(false)}>إلغاء</Btn>
          <Btn variant="success" icon="✅">إضافة الخدمة</Btn>
        </div>
      </Modal>
    </div>
  );
};

// ── SPECIALTIES ──────────────────────────────────────────────
const Specialties = () => {
  const [modal, setModal] = useState(false);
  const degrees = ["طبيب ممارس عام","أخصائي","أخصائي أول","استشاري","أستاذ دكتور"];
  return (
    <div>
      <SectionHeader title="🩺 التخصصات والدرجات العلمية" subtitle={`${MOCK.specialties.length} تخصص مسجل — مستوحى من SCFHS`} actions={[
        <Btn key="a" variant="success" onClick={()=>setModal(true)} icon="＋">إضافة تخصص</Btn>,
        <Btn key="b" variant="primary" icon="📤">رفع Excel</Btn>,
      ]} />
      <Card style={{ marginBottom:16 }}>
        <h3 style={{ color:T.text, margin:"0 0 14px", fontSize:14, fontWeight:700 }}>📚 الدرجات العلمية المعتمدة (SCFHS)</h3>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {degrees.map(d=>(
            <div key={d} style={{ display:"flex", gap:8, alignItems:"center", background:T.surface2, borderRadius:8, padding:"8px 14px" }}>
              <span style={{ color:T.text, fontSize:13 }}>{d}</span>
              <button style={{ background:"none", border:"none", color:T.textMuted, cursor:"pointer", fontSize:14 }}>✏️</button>
              <button style={{ background:"none", border:"none", color:T.red, cursor:"pointer", fontSize:14 }}>🗑️</button>
            </div>
          ))}
          <Btn small variant="success" icon="＋">إضافة درجة علمية</Btn>
        </div>
      </Card>
      <Card>
        <Table cols={[
          {key:"icon",label:"أيقونة",render:r=><span style={{fontSize:22}}>{r.icon}</span>},
          {key:"name_ar",label:"التخصص (عربي)",render:r=><span style={{color:T.text,fontWeight:700}}>{r.name_ar}</span>},
          {key:"name_en",label:"(English)",render:r=><span style={{color:T.textMuted,fontStyle:"italic"}}>{r.name_en}</span>},
          {key:"scfhs_code",label:"كود SCFHS",render:r=><Badge color={T.teal}>{r.scfhs_code}</Badge>},
          {key:"degree_required",label:"الدرجة المطلوبة",render:r=><Badge color={T.gold}>{r.degree_required}</Badge>},
          {key:"providers",label:"المزودون",render:r=><Badge color={T.accent}>{r.providers}</Badge>},
          {key:"active",label:"الحالة",render:r=><Toggle value={r.active} onChange={()=>{}} />},
        ]} data={MOCK.specialties} onRowAction={()=><><Btn small variant="primary">تعديل</Btn><Btn small variant="danger">حذف</Btn></>} />
      </Card>
      <Modal open={modal} onClose={()=>setModal(false)} title="إضافة تخصص طبي جديد" width={540}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <FormRow label="الاسم العربي" required><Input placeholder="طب الأعصاب" value="" onChange={()=>{}} full /></FormRow>
          <FormRow label="الاسم الإنجليزي" required><Input placeholder="Neurology" value="" onChange={()=>{}} full /></FormRow>
          <FormRow label="أيقونة (Emoji)" required><Input placeholder="🧠" value="" onChange={()=>{}} /></FormRow>
          <FormRow label="كود SCFHS"><Input placeholder="NEUR" value="" onChange={()=>{}} /></FormRow>
          <FormRow label="الدرجة العلمية المطلوبة">
            <Sel options={degrees.map(d=>({value:d,label:d}))} value="أخصائي" onChange={()=>{}} />
          </FormRow>
        </div>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:16 }}>
          <Btn variant="ghost" onClick={()=>setModal(false)}>إلغاء</Btn>
          <Btn variant="success" icon="✅">إضافة</Btn>
        </div>
      </Modal>
    </div>
  );
};

// ── LAB TESTS ────────────────────────────────────────────────
const LabTests = () => {
  const [modal, setModal] = useState(false);
  const [rangeModal, setRangeModal] = useState(null);
  return (
    <div>
      <SectionHeader title="🧪 قاعدة بيانات التحاليل" subtitle={`${MOCK.lab_tests.length} تحليل مسجل`} actions={[
        <Btn key="a" variant="success" onClick={()=>setModal(true)} icon="＋">إضافة تحليل</Btn>,
        <Btn key="b" variant="primary" icon="📤">رفع Excel</Btn>,
        <Btn key="t" variant="ghost" icon="⬇️">Template</Btn>,
      ]} />
      <Card>
        <Table cols={[
          {key:"id",label:"ID",render:r=><span style={{color:T.textMuted,fontFamily:"monospace",fontSize:11}}>{r.id}</span>},
          {key:"name",label:"التحليل",render:r=><span style={{color:T.text,fontWeight:700}}>{r.name}</span>},
          {key:"category",label:"الفئة",render:r=><Badge color={T.accent}>{r.category}</Badge>},
          {key:"fasting",label:"صيام",render:r=>r.fasting?<Badge color={T.orange}>⚠️ {r.fasting_hours} ساعة</Badge>:<Badge color={T.textMuted}>لا يلزم</Badge>},
          {key:"home_available",label:"منزلي",render:r=>r.home_available?<Badge color={T.green}>🏠 متاح</Badge>:<Badge color={T.textMuted}>مركز فقط</Badge>},
          {key:"price_ref",label:"السعر",render:r=><span style={{color:T.green,fontFamily:"monospace"}}>{r.price_ref} ر</span>},
          {key:"turnaround",label:"وقت النتيجة",render:r=><Badge color={T.teal}>{r.turnaround}</Badge>},
          {key:"normal_range",label:"نطاقات الريفرنس",render:r=><span style={{color:T.textMuted,fontSize:11}}>{r.normal_range.length} معامل</span>},
        ]} data={MOCK.lab_tests} onRowAction={r=><>
          <Btn small variant="primary">تعديل</Btn>
          <Btn small variant="gold" onClick={()=>setRangeModal(r)}>نطاقات الريفرنس</Btn>
          <Btn small variant="danger">حذف</Btn>
        </>} />
      </Card>
      {/* Reference Range Modal */}
      <Modal open={!!rangeModal} onClose={()=>setRangeModal(null)} title={`نطاقات الريفرنس: ${rangeModal?.name}`} width={600}>
        <div style={{ color:T.textMuted, fontSize:12, marginBottom:16 }}>
          يمكن للمختبر تعديل هذه القيم حسب معايرة أجهزته — تُعرض للمريض مع نتيجته لمقارنتها
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 80px 80px 100px", gap:10, marginBottom:8 }}>
          {["المعامل","الحد الأدنى","الحد الأعلى","الوحدة"].map(h=><div key={h} style={{ color:T.textMuted, fontSize:11, fontWeight:700 }}>{h}</div>)}
        </div>
        {rangeModal?.normal_range.map((param,i)=>(
          <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 80px 80px 100px", gap:10, marginBottom:10 }}>
            <Input value={param.param} onChange={()=>{}} full />
            <Input type="number" value={param.min} onChange={()=>{}} />
            <Input type="number" value={param.max} onChange={()=>{}} />
            <Input value={param.unit} onChange={()=>{}} />
          </div>
        ))}
        <Btn small variant="success" style={{ marginBottom:16 }} icon="＋">إضافة معامل جديد</Btn>
        <Divider />
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <Btn variant="ghost" onClick={()=>setRangeModal(null)}>إلغاء</Btn>
          <Btn variant="success" icon="💾">حفظ النطاقات</Btn>
        </div>
      </Modal>
      {/* Add Lab Test Modal */}
      <Modal open={modal} onClose={()=>setModal(false)} title="إضافة تحليل جديد" width={620}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <FormRow label="اسم التحليل" required><Input placeholder="CBC - صورة دم كاملة" value="" onChange={()=>{}} full /></FormRow>
          <FormRow label="الفئة" required><Input placeholder="دم / سكري / هرمونات..." value="" onChange={()=>{}} full /></FormRow>
          <FormRow label="السعر المرجعي (ر)" required><Input type="number" placeholder="80" value="" onChange={()=>{}} /></FormRow>
          <FormRow label="وقت إصدار النتيجة" required><Input placeholder="2 ساعة" value="" onChange={()=>{}} /></FormRow>
          <FormRow label="ساعات الصيام (إن وجد)"><Input type="number" placeholder="0 = لا يلزم صيام" value="" onChange={()=>{}} /></FormRow>
        </div>
        <div style={{ display:"flex", gap:20, marginBottom:16 }}>
          <label style={{ display:"flex", gap:8, alignItems:"center", cursor:"pointer" }}><input type="checkbox" defaultChecked /><span style={{ color:T.text, fontSize:13 }}>🏠 متاح كخدمة منزلية (سحب عينة منزلي)</span></label>
        </div>
        <FormRow label="تعليمات التحضير للمريض" required hint="⚠️ تظهر كتحذير طبي مضيء للمريض قبل الدفع مباشرة">
          <Textarea placeholder="مثال: صيام كامل 12 ساعة عن الأكل والشرب عدا الماء. توقف عن مميعات الدم 24 ساعة قبل الفحص باستشارة طبيبك." value="" onChange={()=>{}} />
        </FormRow>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <Btn variant="ghost" onClick={()=>setModal(false)}>إلغاء</Btn>
          <Btn variant="success" icon="✅">حفظ التحليل</Btn>
        </div>
      </Modal>
    </div>
  );
};

// ── MEDICINES DB ─────────────────────────────────────────────
const Medicines = () => {
  const [modal, setModal] = useState(false);
  const [altModal, setAltModal] = useState(null);
  return (
    <div>
      <SectionHeader title="💉 قاعدة بيانات الأدوية" subtitle={`${MOCK.medicines.length} دواء مسجل`} actions={[
        <Btn key="a" variant="success" onClick={()=>setModal(true)} icon="＋">إضافة دواء</Btn>,
        <Btn key="b" variant="primary" icon="📤">رفع Excel</Btn>,
        <Btn key="s" variant="warning" onClick={()=>{}} icon="⚠️">نواقص السوق ({MOCK.market_shortage.length})</Btn>,
      ]} />
      <Card>
        <Table cols={[
          {key:"id",label:"ID",render:r=><span style={{color:T.textMuted,fontFamily:"monospace",fontSize:11}}>{r.id}</span>},
          {key:"name_ar",label:"الاسم",render:r=><div><span style={{color:T.text,fontWeight:700}}>{r.name_ar}</span>{r.shortage&&<Badge color={T.red} style={{marginRight:6}}>⚠️ ناقص</Badge>}</div>},
          {key:"generic",label:"المادة الفعالة",render:r=><span style={{color:T.textMuted,fontSize:12}}>{r.generic}</span>},
          {key:"brand",label:"العلامة",render:r=><Badge color={T.accent}>{r.brand}</Badge>},
          {key:"active_ingredient",label:"التركيز",render:r=><span style={{color:T.textMuted,fontSize:11,fontFamily:"monospace"}}>{r.active_ingredient}</span>},
          {key:"category",label:"الفئة"},
          {key:"rx",label:"وصفة",render:r=>r.rx?<Badge color={T.red}>🔒 RX</Badge>:<Badge color={T.green}>OTC</Badge>},
          {key:"price_ref",label:"السعر",render:r=><span style={{color:T.green,fontFamily:"monospace"}}>{r.price_ref} ر</span>},
          {key:"alternatives",label:"البدائل",render:r=><Badge color={T.purple}>{r.alternatives.length} بديل</Badge>},
          {key:"status",label:"الحالة",render:r=><StatusBadge status={r.status}/>},
        ]} data={MOCK.medicines} onRowAction={r=><>
          <Btn small variant="primary">تعديل</Btn>
          <Btn small variant="gold" onClick={()=>setAltModal(r)}>البدائل</Btn>
          {r.shortage&&<Btn small variant="warning">تأكيد النقص</Btn>}
          <Btn small variant="danger">حذف</Btn>
        </>} />
      </Card>
      {/* Alternatives Modal */}
      <Modal open={!!altModal} onClose={()=>setAltModal(null)} title={`بدائل: ${altModal?.name_ar} — ${altModal?.active_ingredient}`} width={500}>
        <div style={{ color:T.textMuted, fontSize:12, marginBottom:14 }}>البدائل يجب أن تكون من نفس المادة الفعالة لضمان السلامة الطبية</div>
        <h4 style={{ color:T.text, margin:"0 0 12px", fontSize:13, fontWeight:700 }}>البدائل الحالية:</h4>
        {altModal?.alternatives.map(id=>{
          const alt = MOCK.medicines.find(m=>m.id===id);
          return alt ? (
            <div key={id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 12px", background:T.surface2, borderRadius:8, marginBottom:8 }}>
              <div>
                <span style={{ color:T.text, fontSize:13, fontWeight:600 }}>{alt.name_ar} ({alt.brand})</span>
                <div style={{ color:T.textMuted, fontSize:11, marginTop:2 }}>{alt.active_ingredient}</div>
              </div>
              <div style={{ display:"flex", gap:6 }}>
                <Badge color={T.teal}>{alt.price_ref} ر</Badge>
                <Btn small variant="danger">إزالة</Btn>
              </div>
            </div>
          ) : null;
        })}
        <div style={{ background:T.surface2, borderRadius:8, padding:12, marginTop:8 }}>
          <div style={{ color:T.textMuted, fontSize:12, marginBottom:8 }}>إضافة بديل جديد:</div>
          <div style={{ display:"flex", gap:8 }}>
            <Sel options={[{value:"",label:"اختر دواء بديل"},...MOCK.medicines.filter(m=>m.id!==altModal?.id).map(m=>({value:m.id,label:`${m.name_ar} (${m.brand}) — ${m.active_ingredient}`}))]} value="" onChange={()=>{}} />
            <Btn variant="success" icon="＋">إضافة</Btn>
          </div>
        </div>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:16 }}>
          <Btn variant="ghost" onClick={()=>setAltModal(null)}>إغلاق</Btn>
          <Btn variant="success" icon="💾">حفظ</Btn>
        </div>
      </Modal>
      {/* Add Medicine Modal */}
      <Modal open={modal} onClose={()=>setModal(false)} title="إضافة دواء جديد للداتابيز" width={640}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <FormRow label="الاسم العربي" required><Input placeholder="باراسيتامول" value="" onChange={()=>{}} full /></FormRow>
          <FormRow label="الاسم العلمي (Generic)" required><Input placeholder="Paracetamol" value="" onChange={()=>{}} full /></FormRow>
          <FormRow label="العلامة التجارية (Brand)" required><Input placeholder="بنادول" value="" onChange={()=>{}} full /></FormRow>
          <FormRow label="المادة الفعالة والتركيز" required><Input placeholder="Paracetamol 500mg" value="" onChange={()=>{}} full /></FormRow>
          <FormRow label="الفئة">
            <Sel options={[{value:"",label:"اختر"},{value:"مسكن",label:"مسكن"},{value:"مضاد حيوي",label:"مضاد حيوي"},{value:"تنفسية",label:"تنفسية"},{value:"قلب",label:"قلب وأوعية"},{value:"سكري",label:"سكري"},{value:"معدة",label:"معدة وهضم"},{value:"أعصاب",label:"أعصاب"},{value:"تجميل",label:"مستحضرات تجميل"},{value:"مكمل",label:"مكملات غذائية"}]} value="" onChange={()=>{}} />
          </FormRow>
          <FormRow label="السعر المرجعي (ر)"><Input type="number" placeholder="15" value="" onChange={()=>{}} /></FormRow>
          <FormRow label="رقم التسجيل الصحي"><Input placeholder="SA-XXXX-XXXX" value="" onChange={()=>{}} full /></FormRow>
        </div>
        <div style={{ display:"flex", gap:20, marginBottom:16 }}>
          <label style={{ display:"flex", gap:8, alignItems:"center", cursor:"pointer" }}><input type="checkbox" /><span style={{ color:T.text, fontSize:13 }}>🔒 يتطلب وصفة طبية (RX)</span></label>
        </div>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <Btn variant="ghost" onClick={()=>setModal(false)}>إلغاء</Btn>
          <Btn variant="success" icon="✅">حفظ الدواء</Btn>
        </div>
      </Modal>
    </div>
  );
};

// ── AUDIT LOGS ───────────────────────────────────────────────
const AuditLogs = () => {
  const typeColors = { danger:T.red, warning:T.orange, info:T.accent, success:T.green };
  return (
    <div>
      <SectionHeader title="📋 سجل الإجراءات الكامل" subtitle="تتبع كل تغيير في النظام — من؟ ماذا؟ متى؟" actions={[
        <Btn key="ep" variant="ghost" icon="📄">تصدير PDF</Btn>,
        <Btn key="ee" variant="ghost" icon="📊">تصدير Excel</Btn>,
      ]} />
      <Card style={{ marginBottom:14 }}>
        <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
          <div style={{ flex:1, minWidth:200 }}><Input placeholder="🔍 بحث..." value="" onChange={()=>{}} full /></div>
          <Input type="date" value="" onChange={()=>{}} />
          <Sel options={[{value:"all",label:"كل الأنواع"},{value:"danger",label:"🔴 خطر"},{value:"warning",label:"🟠 تحذير"},{value:"info",label:"🔵 معلومة"},{value:"success",label:"🟢 نجاح"}]} value="all" onChange={()=>{}} />
          <Sel options={[{value:"all",label:"كل الأقسام"},{value:"provider",label:"مزودون"},{value:"patient",label:"مرضى"},{value:"system",label:"النظام"}]} value="all" onChange={()=>{}} />
        </div>
      </Card>
      <Card>
        {MOCK.audit_logs.map(log=>(
          <div key={log.id} style={{ display:"flex", gap:16, padding:"14px 0", borderBottom:`1px solid ${T.border}`, alignItems:"flex-start" }}>
            <div style={{ width:10, height:10, borderRadius:"50%", background:typeColors[log.type], marginTop:5, flexShrink:0, boxShadow:`0 0 8px ${typeColors[log.type]}` }} />
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                <span style={{ color:T.text, fontSize:13, fontWeight:700 }}>{log.action}</span>
                <span style={{ color:T.textMuted, fontSize:12 }}>على</span>
                <Badge color={typeColors[log.type]}>{log.entity}</Badge>
                <Badge color={T.textMuted}>{log.entity_type}</Badge>
              </div>
              <div style={{ color:T.textMuted, fontSize:12, marginTop:4 }}>
                👤 {log.admin} · 🕐 {new Date(log.time).toLocaleString("ar-SA")}
              </div>
            </div>
            <div style={{ flexShrink:0, textAlign:"right" }}>
              <div style={{ color:T.red, fontSize:11, fontFamily:"monospace" }}>قبل: {log.before}</div>
              <div style={{ color:T.green, fontSize:11, fontFamily:"monospace" }}>بعد: {log.after}</div>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
};

// ── PLACEHOLDER ──────────────────────────────────────────────
const PlaceholderPage = ({ title, icon, desc }) => (
  <div>
    <SectionHeader title={`${icon} ${title}`} subtitle={desc} />
    <Card style={{ textAlign:"center", padding:70 }}>
      <div style={{ fontSize:64, marginBottom:18, opacity:.7 }}>{icon}</div>
      <div style={{ color:T.text, fontSize:18, fontWeight:700, marginBottom:8 }}>{title}</div>
      <div style={{ color:T.textMuted, fontSize:14 }}>هذه الصفحة معدّة — الجزء الثاني يكملها</div>
    </Card>
  </div>
);

// ============================================================
// PAGE ROUTER
// ============================================================
const renderPage = (page, setPage) => {
  const map = {
    dashboard:           <Dashboard setPage={setPage} />,
    live:                <PlaceholderPage icon="🔴" title="العمليات المباشرة" desc="تدخل فوري في الطلبات" />,
    broadcast:           <BroadcastMonitor />,
    "map-heatmap":       <PlaceholderPage icon="🗺️" title="الخريطة الحرارية" desc="توزيع الطلبات جغرافياً — الجزء الثاني" />,
    "emergency-live":    <EmergencyLive />,
    "kill-switches":     <KillSwitches />,
    analytics:           <PlaceholderPage icon="📈" title="التحليلات والتقارير" desc="الجزء الثاني" />,
    "custom-reports":    <PlaceholderPage icon="📋" title="التقارير المخصصة" desc="الجزء الثاني" />,
    "alert-rules":       <PlaceholderPage icon="🔔" title="قواعد التنبيه" desc="الجزء الثاني" />,
    providers:           <PlaceholderPage icon="🏥" title="إدارة المزودين" desc="الجزء الثاني" />,
    "provider-approval": <ProviderApproval />,
    doctors:             <PlaceholderPage icon="👨‍⚕️" title="الأطباء" desc="الجزء الثاني" />,
    "sub-accounts":      <SubAccounts />,
    contracts:           <PlaceholderPage icon="📄" title="العقود" desc="الجزء الثاني" />,
    "provider-docs":     <PlaceholderPage icon="🗂️" title="وثائق KYC" desc="الجزء الثاني" />,
    "sla-monitor":       <PlaceholderPage icon="📊" title="SLA Monitor" desc="الجزء الثاني" />,
    shifts:              <PlaceholderPage icon="🗓️" title="الجداول" desc="الجزء الثاني" />,
    scorecard:           <PlaceholderPage icon="🏆" title="Scorecard" desc="الجزء الثاني" />,
    compliance:          <Compliance />,
    transport:           <Transport />,
    patients:            <PlaceholderPage icon="👥" title="إدارة المرضى" desc="الجزء الثاني" />,
    "family-cards":      <PlaceholderPage icon="👨‍👩‍👧" title="كارت العائلة" desc="الجزء الثاني" />,
    "wallet-tx":         <PlaceholderPage icon="💳" title="المحافظ والمعاملات" desc="الجزء الثاني" />,
    blacklist:           <PlaceholderPage icon="🚫" title="القائمة السوداء" desc="الجزء الثاني" />,
    fraud:               <PlaceholderPage icon="🕵️" title="كشف الاحتيال" desc="الجزء الثاني" />,
    admins:              <PlaceholderPage icon="🔐" title="الإداريون والأدوار" desc="الجزء الثاني" />,
    orders:              <PlaceholderPage icon="📦" title="الطلبات" desc="الجزء الثاني" />,
    "broadcast-orders":  <PlaceholderPage icon="📡" title="طلبات البرودكاست" desc="الجزء الثاني" />,
    appointments:        <PlaceholderPage icon="📅" title="المواعيد" desc="الجزء الثاني" />,
    waitlist:            <PlaceholderPage icon="⏳" title="قائمة الانتظار" desc="الجزء الثاني" />,
    referrals:           <PlaceholderPage icon="🔄" title="التحويلات الطبية" desc="الجزء الثاني" />,
    "emergency-orders":  <PlaceholderPage icon="🚨" title="طلبات الطوارئ" desc="الجزء الثاني" />,
    chat:                <PlaceholderPage icon="💬" title="مراقبة المحادثات" desc="الجزء الثاني" />,
    "pharmacy-orders":   <PlaceholderPage icon="💊" title="طلبات الصيدلية" desc="الجزء الثاني" />,
    "b2b-supply":        <B2BSupply />,
    "lab-results":       <PlaceholderPage icon="🔬" title="نتائج التحاليل" desc="الجزء الثاني" />,
    complaints:          <PlaceholderPage icon="⚖️" title="الشكاوى" desc="الجزء الثاني" />,
    "task-manager":      <PlaceholderPage icon="✔️" title="مدير المهام" desc="الجزء الثاني" />,
    specialties:         <Specialties />,
    services:            <PlaceholderPage icon="⚕️" title="كتالوج الخدمات" desc="الجزء الثاني" />,
    medicines:           <Medicines />,
    "market-shortage":   <MarketShortage />,
    labtests:            <LabTests />,
    imaging:             <PlaceholderPage icon="📡" title="خدمات الأشعة" desc="الجزء الثاني" />,
    "nursing-services":  <NursingServices />,
    "bulk-upload":       <PlaceholderPage icon="📤" title="رفع بالجملة" desc="الجزء الثاني" />,
    insurance:           <PlaceholderPage icon="🛡️" title="التأمين" desc="الجزء الثاني" />,
    "insurance-claims":  <InsuranceClaims />,
    financial:           <PlaceholderPage icon="💰" title="التحكم المالي" desc="الجزء الثاني" />,
    commissions:         <PlaceholderPage icon="📊" title="العمولات" desc="الجزء الثاني" />,
    refunds:             <PlaceholderPage icon="↩️" title="المبالغ المستردة" desc="الجزء الثاني" />,
    coupons:             <PlaceholderPage icon="🎟️" title="الكوبونات" desc="الجزء الثاني" />,
    "notifications-mgr": <NotificationsManager />,
    "auto-notifications": <AutoNotifications />,
    cms:                 <PlaceholderPage icon="✏️" title="CMS والمحتوى" desc="الجزء الثاني" />,
    banners:             <PlaceholderPage icon="🖼️" title="البانرات" desc="الجزء الثاني" />,
    reviews:             <PlaceholderPage icon="⭐" title="التقييمات" desc="الجزء الثاني" />,
    "theme-builder":     <PlaceholderPage icon="🎨" title="Theme Builder" desc="الجزء الثاني" />,
    "system-config":     <PlaceholderPage icon="⚙️" title="إعدادات النظام" desc="الجزء الثاني" />,
    "broadcast-config":  <PlaceholderPage icon="📡" title="إعدادات البرودكاست" desc="الجزء الثاني" />,
    permissions:         <PlaceholderPage icon="🔑" title="الصلاحيات" desc="الجزء الثاني" />,
    "audit-logs":        <AuditLogs />,
    workflow:            <PlaceholderPage icon="🤖" title="أتمتة العمليات" desc="الجزء الثاني" />,
    "ai-config":         <PlaceholderPage icon="🧠" title="AI & API Config" desc="الجزء الثاني" />,
  };
  return map[page] || <Dashboard setPage={setPage} />;
};

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [page, setPage] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const role = "SUPER_ADMIN";
  const groups = [...new Set(NAV.map(n=>n.group))];

  useEffect(()=>{
    const h = e => { if((e.ctrlKey||e.metaKey)&&e.key==="k"){ e.preventDefault(); setSearchOpen(true); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  return (
    <div style={{ display:"flex", height:"100vh", background:T.bg, fontFamily:"'Cairo',sans-serif", direction:"rtl", overflow:"hidden", color:T.text }}>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:.5}} @keyframes pulse{0%{box-shadow:0 0 0 0 rgba(255,23,68,.7)}70%{box-shadow:0 0 0 14px transparent}100%{box-shadow:0 0 0 0 transparent}} * { box-sizing: border-box; }`}</style>

      {/* SIDEBAR */}
      <div style={{ width:collapsed?62:240, flexShrink:0, background:T.surface, borderLeft:`1px solid ${T.border}`, overflowY:"auto", overflowX:"hidden", transition:"width .32s cubic-bezier(.4,0,.2,1)", display:"flex", flexDirection:"column" }}>
        {/* Logo */}
        <div style={{ padding:collapsed?"14px 10px":"14px 16px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", gap:10, flexShrink:0, minHeight:60 }}>
          <div style={{ width:38, height:38, borderRadius:11, background:`linear-gradient(135deg,${T.red},${T.purple})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0, boxShadow:`0 0 24px ${T.red}44` }}>❤️</div>
          {!collapsed&&<div>
            <div style={{ color:T.text, fontWeight:900, fontSize:15, letterSpacing:.5 }}>نبض بلس</div>
            <div style={{ color:T.textMuted, fontSize:10 }}>Admin Control Center</div>
          </div>}
        </div>

        {/* Nav Items */}
        <div style={{ flex:1, paddingTop:8, paddingBottom:8 }}>
          {groups.map(group=>(
            <div key={group}>
              {!collapsed&&<div style={{ padding:"10px 16px 4px", color:T.textDim, fontSize:9, fontWeight:800, letterSpacing:2, textTransform:"uppercase" }}>{group}</div>}
              {NAV.filter(n=>n.group===group).map(item=>(
                <div key={item.id} onClick={()=>setPage(item.id)} title={collapsed?item.label:""}
                  style={{ display:"flex", alignItems:"center", gap:10, padding:collapsed?"10px 14px":"9px 14px", cursor:"pointer", borderRadius:9, margin:"1px 6px", background:page===item.id?`${T.accent}1a`:"transparent", borderRight:page===item.id?`3px solid ${T.accent}`:"3px solid transparent", transition:"all .15s", position:"relative" }}
                  onMouseEnter={e=>{ if(page!==item.id) e.currentTarget.style.background="#ffffff05"; }}
                  onMouseLeave={e=>{ if(page!==item.id) e.currentTarget.style.background="transparent"; }}>
                  <span style={{ fontSize:14, flexShrink:0 }}>{item.icon}</span>
                  {!collapsed&&<>
                    <span style={{ color:page===item.id?T.accent:T.textMuted, fontSize:12, fontWeight:page===item.id?700:400, flex:1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{item.label}</span>
                    {item.badge&&<div style={{ background:T.red, color:"#fff", borderRadius:10, padding:"1px 7px", fontSize:10, fontWeight:900, flexShrink:0 }}>{item.badge}</div>}
                  </>}
                  {collapsed&&item.badge&&<div style={{ position:"absolute", top:4, right:4, width:7, height:7, borderRadius:"50%", background:T.red, boxShadow:`0 0 6px ${T.red}` }} />}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* User */}
        {!collapsed&&<div style={{ padding:"12px 16px", borderTop:`1px solid ${T.border}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:34, height:34, borderRadius:9, background:`${ROLES[role].color}22`, border:`1px solid ${ROLES[role].color}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>{ROLES[role].icon}</div>
            <div>
              <div style={{ color:T.text, fontSize:12, fontWeight:700 }}>أحمد الحربي</div>
              <div style={{ color:ROLES[role].color, fontSize:10, fontWeight:700 }}>{ROLES[role].label}</div>
            </div>
          </div>
        </div>}
      </div>

      {/* MAIN */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {/* TOP BAR */}
        <div style={{ height:56, background:T.surface, borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", padding:"0 20px", gap:12, flexShrink:0 }}>
          <button onClick={()=>setCollapsed(c=>!c)} style={{ background:"none", border:"none", color:T.textMuted, cursor:"pointer", fontSize:20, padding:4, flexShrink:0 }}>☰</button>
          <div style={{ flex:1, maxWidth:440 }}>
            <div onClick={()=>setSearchOpen(true)} style={{ display:"flex", alignItems:"center", background:T.surface2, border:`1px solid ${T.border}`, borderRadius:10, padding:"7px 14px", gap:8, cursor:"text" }}>
              <span style={{ color:T.textDim }}>🔍</span>
              <span style={{ color:T.textDim, fontSize:12 }}>بحث عالمي... (Ctrl+K)</span>
            </div>
          </div>
          <div style={{ flex:1 }} />
          <button onClick={()=>setPage("emergency-live")} style={{ background:`${T.red}1a`, border:`1px solid ${T.red}44`, color:T.red, borderRadius:8, padding:"5px 14px", cursor:"pointer", fontSize:12, fontWeight:700, fontFamily:"'Cairo',sans-serif", animation:"blink 1.5s infinite" }}>
            🚨 طوارئ (2)
          </button>
          <button onClick={()=>setPage("kill-switches")} style={{ background:`${T.orange}1a`, border:`1px solid ${T.orange}44`, color:T.orange, borderRadius:8, padding:"5px 14px", cursor:"pointer", fontSize:12, fontWeight:700, fontFamily:"'Cairo',sans-serif" }}>
            🔌 Kill Switches
          </button>
          <div style={{ position:"relative", cursor:"pointer", flexShrink:0 }} onClick={()=>setPage("notifications-mgr")}>
            <span style={{ fontSize:22 }}>🔔</span>
            <div style={{ position:"absolute", top:-2, right:-2, width:9, height:9, borderRadius:"50%", background:T.red, boxShadow:`0 0 8px ${T.red}` }} />
          </div>
          <div style={{ background:`${ROLES[role].color}22`, color:ROLES[role].color, border:`1px solid ${ROLES[role].color}44`, borderRadius:6, padding:"2px 10px", fontSize:11, fontWeight:700, fontFamily:"monospace", whiteSpace:"nowrap" }}>
            {ROLES[role].icon} {ROLES[role].label}
          </div>
        </div>

        {/* PAGE CONTENT */}
        <div style={{ flex:1, overflowY:"auto", padding:26 }}>
          {renderPage(page, setPage)}
        </div>
      </div>

      {/* GLOBAL SEARCH */}
      {searchOpen&&(
        <div onClick={()=>{ setSearchOpen(false); setSearchQuery(""); }} style={{ position:"fixed", inset:0, background:"#000d", zIndex:2000, backdropFilter:"blur(6px)" }}>
          <div onClick={e=>e.stopPropagation()} style={{ position:"absolute", top:70, left:"50%", transform:"translateX(-50%)", width:680, background:T.surface, border:`1px solid ${T.border}`, borderRadius:18, padding:24, maxWidth:"95vw", boxShadow:"0 40px 100px #0008" }}>
            <Input placeholder="🔍 ابحث عن مريض، مزود، دواء، طلب، تحليل..." value={searchQuery} onChange={setSearchQuery} full />
            {searchQuery.length>1?(
              <div style={{ marginTop:14 }}>
                {MOCK.providers.filter(p=>p.name.includes(searchQuery)).map(p=>(
                  <div key={p.id} onClick={()=>{ setPage("providers"); setSearchOpen(false); setSearchQuery(""); }} style={{ padding:"12px 14px", borderRadius:10, cursor:"pointer", marginBottom:4, background:T.surface2, display:"flex", gap:12, alignItems:"center" }}>
                    <span style={{ fontSize:20 }}>🏥</span>
                    <div>
                      <div style={{ color:T.text, fontSize:13, fontWeight:700 }}>{p.name}</div>
                      <div style={{ color:T.textMuted, fontSize:11 }}>{p.type} · {p.area}</div>
                    </div>
                    <div style={{ background:`${T.accent}22`, color:T.accent, borderRadius:6, padding:"2px 8px", fontSize:11, fontFamily:"monospace", marginRight:"auto" }}>مزود</div>
                  </div>
                ))}
                {MOCK.patients.filter(p=>p.name.includes(searchQuery)).map(p=>(
                  <div key={p.id} onClick={()=>{ setPage("patients"); setSearchOpen(false); setSearchQuery(""); }} style={{ padding:"12px 14px", borderRadius:10, cursor:"pointer", marginBottom:4, background:T.surface2, display:"flex", gap:12, alignItems:"center" }}>
                    <span style={{ fontSize:20 }}>👤</span>
                    <div>
                      <div style={{ color:T.text, fontSize:13, fontWeight:700 }}>{p.name}</div>
                      <div style={{ color:T.textMuted, fontSize:11 }}>مريض · {p.phone} · {p.city}</div>
                    </div>
                    <div style={{ background:`${T.purple}22`, color:T.purple, borderRadius:6, padding:"2px 8px", fontSize:11, fontFamily:"monospace", marginRight:"auto" }}>مريض</div>
                  </div>
                ))}
                {MOCK.medicines.filter(m=>m.name_ar.includes(searchQuery)||m.generic.toLowerCase().includes(searchQuery.toLowerCase())).map(m=>(
                  <div key={m.id} onClick={()=>{ setPage("medicines"); setSearchOpen(false); setSearchQuery(""); }} style={{ padding:"12px 14px", borderRadius:10, cursor:"pointer", marginBottom:4, background:T.surface2, display:"flex", gap:12, alignItems:"center" }}>
                    <span style={{ fontSize:20 }}>💊</span>
                    <div>
                      <div style={{ color:T.text, fontSize:13, fontWeight:700 }}>{m.name_ar}</div>
                      <div style={{ color:T.textMuted, fontSize:11 }}>{m.generic} · {m.brand} · {m.active_ingredient}</div>
                    </div>
                    <div style={{ background:`${T.gold}22`, color:T.gold, borderRadius:6, padding:"2px 8px", fontSize:11, fontFamily:"monospace", marginRight:"auto" }}>دواء</div>
                  </div>
                ))}
                {[...MOCK.providers,...MOCK.patients,...MOCK.medicines].filter(x=>(x.name||x.name_ar||"").includes(searchQuery)).length===0&&(
                  <div style={{ color:T.textMuted, textAlign:"center", padding:24, fontSize:14 }}>لا توجد نتائج لـ "{searchQuery}"</div>
                )}
              </div>
            ):(
              <div>
                <div style={{ color:T.textMuted, fontSize:12, margin:"14px 0 10px" }}>⚡ وصول سريع للصفحات الحرجة:</div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {["emergency-live","broadcast","kill-switches","provider-approval","compliance","market-shortage","b2b-supply","insurance-claims","auto-notifications","audit-logs","sub-accounts","transport"].map(p=>(
                    <button key={p} onClick={()=>{ setPage(p); setSearchOpen(false); }} style={{ padding:"6px 14px", borderRadius:8, fontSize:11, cursor:"pointer", background:T.surface2, color:T.textMuted, border:`1px solid ${T.border}`, fontFamily:"'Cairo',sans-serif" }}>
                      {NAV.find(n=>n.id===p)?.icon} {NAV.find(n=>n.id===p)?.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
