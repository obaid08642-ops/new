// ============================================================
// NabdAdmin_Part2.jsx
// الجزء الثاني — باقي الشاشات (38 صفحة)
// يُدمج مع NabdAdmin_Part1.jsx في ملف واحد نهائي
// ============================================================
// ملاحظة: هذا الملف يحتوي على مكونات الصفحات فقط
// كل التوكنز والـ primitives موجودة في Part1
// للدمج: انسخ كل الـ page components من هنا
// وضعها قبل renderPage() في Part1
// ============================================================

import { useState, useEffect } from "react";

// ── LIVE OPERATIONS ─────────────────────────────────────────
export const LiveOperations = ({ setPage }) => {
  const [filter, setFilter] = useState("all");
  const [drawer, setDrawer] = useState(null);
  const orders = [
    { id:"ORD-8821", patient:"أحمد الزهراني",  provider:"مختبر الدقة",    type:"Lab",      subtype:"سحب منزلي",    status:"in_progress",     amount:320, time:"10:24", assigned:"فني سامي",     priority:"normal", broadcast_radius:4 },
    { id:"ORD-8820", patient:"سارة العتيبي",   provider:null,             type:"Doctor",   subtype:"كشف منزلي",    status:"broadcasting",    amount:180, time:"10:18", assigned:null,           priority:"urgent",  broadcast_radius:4 },
    { id:"ORD-8819", patient:"فاطمة الدوسري", provider:"صيدلية النهدي",  type:"Pharmacy", subtype:"توصيل أدوية", status:"pending_payment", amount:95,  time:"10:05", assigned:"مندوب خالد",   priority:"normal", broadcast_radius:4 },
    { id:"ORD-8818", patient:"خالد المطيري",   provider:"مركز النبض",     type:"Nursing",  subtype:"غيار جرح",     status:"completed",       amount:450, time:"09:45", assigned:"ممرضة نورا",   priority:"normal", broadcast_radius:4 },
    { id:"ORD-8817", patient:"أحمد الزهراني",  provider:null,             type:"Pharmacy", subtype:"روشتة OCR",    status:"pending_approval",amount:0,   time:"09:30", assigned:null,           priority:"normal", broadcast_radius:6 },
  ];
  const filters = [{v:"all",l:"الكل"},{v:"pending",l:"انتظار"},{v:"in_progress",l:"جاري"},{v:"broadcasting",l:"برودكاست"},{v:"urgent",l:"عاجل"}];
  const filtered = filter==="all" ? orders : filter==="urgent" ? orders.filter(o=>o.priority==="urgent") : orders.filter(o=>o.status===filter);
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:26,flexWrap:"wrap",gap:12}}>
        <div>
          <h2 style={{color:"#e8eaf6",margin:0,fontSize:22,fontWeight:900}}>🔴 العمليات المباشرة</h2>
          <p style={{color:"#5c6080",margin:"4px 0 0",fontSize:13}}>تدخل فوري في أي طلب</p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setPage("broadcast")} style={{background:"#00bfa51a",color:"#00bfa5",border:"1px solid #00bfa544",borderRadius:8,padding:"8px 18px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Cairo',sans-serif"}}>📡 برودكاست</button>
          <button onClick={()=>setPage("emergency-live")} style={{background:"#ff17441a",color:"#ff1744",border:"1px solid #ff174444",borderRadius:8,padding:"8px 18px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Cairo',sans-serif"}}>🚨 طوارئ</button>
        </div>
      </div>
      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:14,marginBottom:20}}>
        {[["إجمالي اليوم","1,284","#00b8e6","📦"],["جارية الآن","42","#00e676","⚡"],["برودكاست","2","#00bfa5","📡"],["عاجل","3","#ff1744","🚨"],["مكتملة","1,197","#7c4dff","✅"]].map(([l,v,c,i])=>(
          <div key={l} style={{background:"#0c0d14",border:`1px solid ${c}33`,borderRadius:14,padding:20,boxShadow:`0 0 28px ${c}0e`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div><div style={{color:"#5c6080",fontSize:12,marginBottom:8}}>{l}</div><div style={{color:c,fontSize:22,fontWeight:900,fontFamily:"monospace"}}>{v}</div></div>
              <span style={{fontSize:28}}>{i}</span>
            </div>
          </div>
        ))}
      </div>
      {/* Filters */}
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        {filters.map(f=>(
          <button key={f.v} onClick={()=>setFilter(f.v)} style={{padding:"7px 18px",borderRadius:8,fontSize:13,fontFamily:"'Cairo',sans-serif",cursor:"pointer",background:filter===f.v?"#00b8e622":"transparent",color:filter===f.v?"#00b8e6":"#5c6080",border:`1px solid ${filter===f.v?"#00b8e644":"#1a1c2e"}`}}>{f.l}</button>
        ))}
      </div>
      {/* Table */}
      <div style={{background:"#0c0d14",border:"1px solid #1a1c2e",borderRadius:14,padding:20}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,fontFamily:"'Cairo',sans-serif"}}>
            <thead>
              <tr style={{borderBottom:"1px solid #1a1c2e"}}>
                {["الطلب","المريض","المزود","النوع","النوع الفرعي","الحالة","المبلغ","المسند","الأولوية","إجراءات"].map(h=>(
                  <th key={h} style={{padding:"11px 14px",textAlign:"right",color:"#5c6080",fontWeight:600,fontSize:12,whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(o=>(
                <tr key={o.id} style={{borderBottom:"1px solid #1a1c2e"}}>
                  <td style={{padding:"11px 14px"}}><span style={{color:"#00b8e6",fontFamily:"monospace"}}>{o.id}</span></td>
                  <td style={{padding:"11px 14px",color:"#e8eaf6"}}>{o.patient}</td>
                  <td style={{padding:"11px 14px",color:o.provider?"#e8eaf6":"#5c6080"}}>{o.provider||"لم يُسند"}</td>
                  <td style={{padding:"11px 14px"}}><span style={{background:"#7c4dff22",color:"#7c4dff",border:"1px solid #7c4dff44",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700}}>{o.type}</span></td>
                  <td style={{padding:"11px 14px",color:"#5c6080",fontSize:12}}>{o.subtype}</td>
                  <td style={{padding:"11px 14px"}}>
                    <span style={{background:({in_progress:"#00b8e6",broadcasting:"#00bfa5",pending_payment:"#ffd600",completed:"#00e676",pending_approval:"#7c4dff",pending:"#ff6d00"}[o.status]||"#5c6080")+"22",color:({in_progress:"#00b8e6",broadcasting:"#00bfa5",pending_payment:"#ffd600",completed:"#00e676",pending_approval:"#7c4dff",pending:"#ff6d00"}[o.status]||"#5c6080"),border:`1px solid ${({in_progress:"#00b8e6",broadcasting:"#00bfa5",pending_payment:"#ffd600",completed:"#00e676",pending_approval:"#7c4dff",pending:"#ff6d00"}[o.status]||"#5c6080")}44`,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700,fontFamily:"monospace",whiteSpace:"nowrap"}}>
                      {{in_progress:"جاري",broadcasting:"📡 برودكاست",pending_payment:"انتظار دفع",completed:"مكتمل ✅",pending_approval:"موافقة",pending:"انتظار"}[o.status]||o.status}
                    </span>
                  </td>
                  <td style={{padding:"11px 14px",color:o.amount>0?"#00e676":"#5c6080",fontFamily:"monospace"}}>{o.amount>0?`${o.amount} ر`:"—"}</td>
                  <td style={{padding:"11px 14px",color:o.assigned?"#a78bfa":"#5c6080",fontSize:12}}>{o.assigned||"—"}</td>
                  <td style={{padding:"11px 14px"}}><span style={{background:o.priority==="urgent"?"#ff17441a":"transparent",color:o.priority==="urgent"?"#ff1744":"#5c6080",border:o.priority==="urgent"?"1px solid #ff174444":"none",borderRadius:6,padding:"2px 8px",fontSize:11}}>{o.priority==="urgent"?"🚨 عاجل":"عادي"}</span></td>
                  <td style={{padding:"11px 14px"}}>
                    <div style={{display:"flex",gap:5}}>
                      <button onClick={()=>setDrawer(o)} style={{background:"#00b8e61a",color:"#00b8e6",border:"1px solid #00b8e644",borderRadius:7,padding:"4px 10px",fontSize:11,cursor:"pointer",fontFamily:"'Cairo',sans-serif",fontWeight:700}}>تحكم</button>
                      {o.status==="broadcasting"&&<button style={{background:"#00bfa51a",color:"#00bfa5",border:"1px solid #00bfa544",borderRadius:7,padding:"4px 10px",fontSize:11,cursor:"pointer",fontFamily:"'Cairo',sans-serif",fontWeight:700}}>📍 إسناد</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Drawer */}
      {drawer&&(
        <div style={{position:"fixed",inset:0,zIndex:900}}>
          <div onClick={()=>setDrawer(null)} style={{position:"absolute",inset:0,background:"#000a",backdropFilter:"blur(4px)"}}/>
          <div style={{position:"absolute",right:0,top:0,bottom:0,width:500,background:"#0c0d14",borderLeft:"1px solid #1a1c2e",overflowY:"auto",padding:26}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
              <h3 style={{color:"#e8eaf6",margin:0,fontSize:16,fontWeight:900}}>تحكم: {drawer.id}</h3>
              <button onClick={()=>setDrawer(null)} style={{background:"none",border:"none",color:"#5c6080",cursor:"pointer",fontSize:24}}>✕</button>
            </div>
            <div style={{background:"#10121c",borderRadius:10,padding:14,marginBottom:18}}>
              {[["المريض",drawer.patient],["المزود",drawer.provider||"—"],["النوع",`${drawer.type} — ${drawer.subtype}`],["المبلغ",`${drawer.amount} ر`],["الوقت",drawer.time],["نطاق البرودكاست",`${drawer.broadcast_radius} كم`]].map(([k,v])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #1a1c2e"}}>
                  <span style={{color:"#5c6080",fontSize:12}}>{k}</span>
                  <span style={{color:"#e8eaf6",fontSize:13,fontWeight:600}}>{v}</span>
                </div>
              ))}
            </div>
            {drawer.ocr_items&&(
              <div style={{marginBottom:18}}>
                <h4 style={{color:"#5c6080",fontSize:12,marginBottom:10}}>🔍 أصناف OCR (من الروشتة):</h4>
                {drawer.ocr_items.map((item,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:"#10121c",borderRadius:8,marginBottom:6}}>
                    <span style={{color:"#e8eaf6",fontSize:13}}>{item.name} × {item.qty}</span>
                    <div style={{display:"flex",gap:6}}>
                      {item.rx&&<span style={{background:"#ff17441a",color:"#ff1744",border:"1px solid #ff174444",borderRadius:6,padding:"1px 8px",fontSize:10,fontFamily:"monospace"}}>🔒 RX</span>}
                      <span style={{background:item.found?"#00e67622":"#ff174422",color:item.found?"#00e676":"#ff1744",border:`1px solid ${item.found?"#00e67644":"#ff174444"}`,borderRadius:6,padding:"1px 8px",fontSize:10}}>{item.found?"موجود ✅":"غير موجود ❌"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{marginBottom:18}}>
              <label style={{display:"block",color:"#5c6080",fontSize:11,fontWeight:700,marginBottom:6}}>إسناد إلى مزود</label>
              <select style={{background:"#10121c",border:"1px solid #1a1c2e",color:"#e8eaf6",borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",cursor:"pointer",width:"100%"}}>
                <option>اختر مزوداً</option>
                <option>مستشفى الرحمة التخصصي</option>
                <option>مختبر الدقة الطبي</option>
                <option>صيدلية النهدي</option>
              </select>
            </div>
            <div style={{marginBottom:18}}>
              <label style={{display:"block",color:"#5c6080",fontSize:11,fontWeight:700,marginBottom:6}}>تعديل السعر (ر)</label>
              <input type="number" defaultValue={drawer.amount} style={{background:"#10121c",border:"1px solid #1a1c2e",color:"#e8eaf6",borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",width:"100%"}}/>
            </div>
            <div style={{marginBottom:18}}>
              <label style={{display:"block",color:"#5c6080",fontSize:11,fontWeight:700,marginBottom:6}}>سبب التدخل اليدوي</label>
              <textarea rows={2} placeholder="لماذا تتدخل يدوياً؟" style={{background:"#10121c",border:"1px solid #1a1c2e",color:"#e8eaf6",borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",width:"100%",resize:"none"}}/>
            </div>
            <div style={{height:1,background:"#1a1c2e",margin:"16px 0"}}/>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <button style={{background:"#00b8e61a",color:"#00b8e6",border:"1px solid #00b8e644",borderRadius:8,padding:"8px 16px",fontSize:13,cursor:"pointer",fontFamily:"'Cairo',sans-serif",fontWeight:700}}>📍 إسناد قسري</button>
              <button style={{background:"#ff6d001a",color:"#ff6d00",border:"1px solid #ff6d0044",borderRadius:8,padding:"8px 16px",fontSize:13,cursor:"pointer",fontFamily:"'Cairo',sans-serif",fontWeight:700}}>🔄 إعادة تعيين</button>
              <button style={{background:"#7c4dff1a",color:"#7c4dff",border:"1px solid #7c4dff44",borderRadius:8,padding:"8px 16px",fontSize:13,cursor:"pointer",fontFamily:"'Cairo',sans-serif",fontWeight:700}}>✏️ تعديل العناصر</button>
              <button style={{background:"#ff17441a",color:"#ff1744",border:"1px solid #ff174444",borderRadius:8,padding:"8px 16px",fontSize:13,cursor:"pointer",fontFamily:"'Cairo',sans-serif",fontWeight:700}}>❌ إلغاء الطلب</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── PROVIDERS MANAGEMENT ────────────────────────────────────
export const ProvidersPage = () => {
  const [sel, setSel] = useState([]);
  const [drawer, setDrawer] = useState(null);
  const [search, setSearch] = useState("");
  const providers = [
    {id:"P001",name:"مستشفى الرحمة التخصصي",type:"Hospital",status:"active",rating:4.8,orders:1240,revenue:184200,area:"الرياض - الياسمين",available:true,commission:12,sla:98,sub_accounts:8},
    {id:"P002",name:"د. سارة العمري",type:"Doctor",status:"pending",rating:4.6,orders:0,revenue:0,area:"جدة - الحمراء",available:false,commission:10,sla:0,sub_accounts:0},
    {id:"P003",name:"مختبر الدقة الطبي",type:"Lab",status:"active",rating:4.7,orders:920,revenue:67800,area:"الدمام - الشاطئ",available:true,commission:8,sla:96,sub_accounts:3},
    {id:"P004",name:"صيدلية النهدي",type:"Pharmacy",status:"active",rating:4.5,orders:2100,revenue:98400,area:"الرياض - الياسمين",available:true,commission:5,sla:92,sub_accounts:0},
    {id:"P005",name:"مركز النبض للتمريض",type:"Nursing",status:"active",rating:4.9,orders:340,revenue:42000,area:"الرياض",available:true,commission:15,sla:99,sub_accounts:12},
    {id:"P006",name:"مركز الأشعة التشخيصي",type:"Imaging",status:"suspended",rating:3.8,orders:180,revenue:28000,area:"جدة - النزهة",available:false,commission:10,sla:71,sub_accounts:0},
  ];
  const C = {Hospital:"#ff6d00",Doctor:"#00b8e6",Lab:"#00bfa5",Pharmacy:"#7c4dff",Nursing:"#f50057",Imaging:"#ffd600"};
  const filtered = providers.filter(p=>p.name.includes(search)||p.type.includes(search));
  const statusColor = {active:"#00e676",pending:"#ff6d00",suspended:"#ff1744"};
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:26,flexWrap:"wrap",gap:12}}>
        <div>
          <h2 style={{color:"#e8eaf6",margin:0,fontSize:22,fontWeight:900}}>🏥 إدارة المزودين</h2>
          <p style={{color:"#5c6080",margin:"4px 0 0",fontSize:13}}>{providers.length} مزود مسجل</p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button style={{background:"#00e6761a",color:"#00e676",border:"1px solid #00e67644",borderRadius:8,padding:"8px 18px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Cairo',sans-serif"}}>＋ إضافة مزود</button>
          {sel.length>0&&<button style={{background:"#ff6d001a",color:"#ff6d00",border:"1px solid #ff6d0044",borderRadius:8,padding:"8px 18px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Cairo',sans-serif"}}>{sel.length} محدد — إجراء جماعي</button>}
          <button style={{background:"transparent",color:"#5c6080",border:"1px solid #1a1c2e",borderRadius:8,padding:"8px 18px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Cairo',sans-serif"}}>📤 تصدير</button>
        </div>
      </div>
      <div style={{background:"#0c0d14",border:"1px solid #1a1c2e",borderRadius:14,padding:16,marginBottom:14}}>
        <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
          <input placeholder="🔍 بحث بالاسم أو النوع..." value={search} onChange={e=>setSearch(e.target.value)} style={{flex:1,minWidth:200,background:"#10121c",border:"1px solid #1a1c2e",color:"#e8eaf6",borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none"}}/>
          <select style={{background:"#10121c",border:"1px solid #1a1c2e",color:"#e8eaf6",borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",cursor:"pointer"}}>
            {["كل الأنواع","Hospital","Doctor","Lab","Pharmacy","Nursing","Imaging"].map(o=><option key={o}>{o}</option>)}
          </select>
          <select style={{background:"#10121c",border:"1px solid #1a1c2e",color:"#e8eaf6",borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",cursor:"pointer"}}>
            {["كل الحالات","نشط","انتظار","موقوف"].map(o=><option key={o}>{o}</option>)}
          </select>
        </div>
      </div>
      <div style={{background:"#0c0d14",border:"1px solid #1a1c2e",borderRadius:14,padding:20}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,fontFamily:"'Cairo',sans-serif"}}>
            <thead>
              <tr style={{borderBottom:"1px solid #1a1c2e"}}>
                <th style={{padding:"11px 14px",width:40,textAlign:"right"}}><input type="checkbox" onChange={e=>setSel(e.target.checked?filtered.map(p=>p.id):[])}/></th>
                {["المزود","النوع","الحالة","متاح","التقييم","SLA","الطلبات","الإيرادات","العمولة","حسابات فرعية","إجراءات"].map(h=>(
                  <th key={h} style={{padding:"11px 14px",textAlign:"right",color:"#5c6080",fontWeight:600,fontSize:12,whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p=>(
                <tr key={p.id} style={{borderBottom:"1px solid #1a1c2e"}}>
                  <td style={{padding:"11px 14px"}}><input type="checkbox" checked={sel.includes(p.id)} onChange={e=>{if(e.target.checked)setSel([...sel,p.id]);else setSel(sel.filter(id=>id!==p.id))}}/></td>
                  <td style={{padding:"11px 14px"}}>
                    <div style={{color:"#e8eaf6",fontWeight:700}}>{p.name}</div>
                    <div style={{color:"#5c6080",fontSize:11,marginTop:2}}>{p.area}</div>
                  </td>
                  <td style={{padding:"11px 14px"}}><span style={{background:C[p.type]+"22",color:C[p.type],border:`1px solid ${C[p.type]}44`,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700}}>{p.type}</span></td>
                  <td style={{padding:"11px 14px"}}><span style={{background:statusColor[p.status]+"22",color:statusColor[p.status],border:`1px solid ${statusColor[p.status]}44`,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700,fontFamily:"monospace"}}>{p.status==="active"?"نشط":p.status==="pending"?"انتظار":"موقوف"}</span></td>
                  <td style={{padding:"11px 14px"}}>
                    <div onClick={()=>{}} style={{width:44,height:24,borderRadius:12,background:p.available?"#00e676":"#1e1f2e",cursor:"pointer",position:"relative",border:`1px solid ${p.available?"#00e67666":"#2e2f45"}`}}>
                      <div style={{width:18,height:18,borderRadius:"50%",background:"#fff",position:"absolute",top:2,left:p.available?22:2,transition:"all .3s"}}/>
                    </div>
                  </td>
                  <td style={{padding:"11px 14px",color:"#ffd600"}}>⭐ {p.rating}</td>
                  <td style={{padding:"11px 14px"}}><span style={{background:p.sla>=95?"#00e67622":p.sla>=80?"#ff6d0022":"#ff174422",color:p.sla>=95?"#00e676":p.sla>=80?"#ff6d00":"#ff1744",border:`1px solid ${p.sla>=95?"#00e67644":p.sla>=80?"#ff6d0044":"#ff174444"}`,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700,fontFamily:"monospace"}}>{p.sla}%</span></td>
                  <td style={{padding:"11px 14px",color:"#00b8e6",fontFamily:"monospace"}}>{p.orders.toLocaleString()}</td>
                  <td style={{padding:"11px 14px",color:"#00e676",fontFamily:"monospace"}}>{p.revenue.toLocaleString()} ر</td>
                  <td style={{padding:"11px 14px"}}><span style={{background:"#7c4dff22",color:"#7c4dff",border:"1px solid #7c4dff44",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700}}>{p.commission}%</span></td>
                  <td style={{padding:"11px 14px",color:"#5c6080",fontFamily:"monospace"}}>{p.sub_accounts}</td>
                  <td style={{padding:"11px 14px"}}>
                    <div style={{display:"flex",gap:5}}>
                      <button onClick={()=>setDrawer(p)} style={{background:"#00b8e61a",color:"#00b8e6",border:"1px solid #00b8e644",borderRadius:7,padding:"4px 10px",fontSize:11,cursor:"pointer",fontFamily:"'Cairo',sans-serif",fontWeight:700}}>تعديل</button>
                      <button style={{background:"#ff17441a",color:"#ff1744",border:"1px solid #ff174444",borderRadius:7,padding:"4px 10px",fontSize:11,cursor:"pointer",fontFamily:"'Cairo',sans-serif",fontWeight:700}}>تعليق</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Edit Drawer */}
      {drawer&&(
        <div style={{position:"fixed",inset:0,zIndex:900}}>
          <div onClick={()=>setDrawer(null)} style={{position:"absolute",inset:0,background:"#000a",backdropFilter:"blur(4px)"}}/>
          <div style={{position:"absolute",right:0,top:0,bottom:0,width:500,background:"#0c0d14",borderLeft:"1px solid #1a1c2e",overflowY:"auto",padding:26}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
              <h3 style={{color:"#e8eaf6",margin:0,fontSize:16,fontWeight:900}}>تعديل: {drawer.name}</h3>
              <button onClick={()=>setDrawer(null)} style={{background:"none",border:"none",color:"#5c6080",cursor:"pointer",fontSize:24}}>✕</button>
            </div>
            {[["اسم المزود",drawer.name,"text"],["المنطقة",drawer.area,"text"],["نسبة العمولة %",drawer.commission,"number"]].map(([l,v,t])=>(
              <div key={l} style={{marginBottom:16}}>
                <label style={{display:"block",color:"#5c6080",fontSize:11,fontWeight:700,marginBottom:6}}>{l}</label>
                <input type={t} defaultValue={v} style={{background:"#10121c",border:"1px solid #1a1c2e",color:"#e8eaf6",borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",width:"100%"}}/>
              </div>
            ))}
            <div style={{marginBottom:16}}>
              <label style={{display:"block",color:"#5c6080",fontSize:11,fontWeight:700,marginBottom:8}}>الخدمات المعتمدة</label>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {["Emergency","Clinic","Lab","Imaging","Home Care","Pharmacy","Online"].map(s=>(
                  <button key={s} style={{padding:"5px 12px",borderRadius:8,fontSize:12,cursor:"pointer",background:"#00b8e622",color:"#00b8e6",border:"1px solid #00b8e644",fontFamily:"'Cairo',sans-serif"}}>{s}</button>
                ))}
              </div>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{display:"block",color:"#5c6080",fontSize:11,fontWeight:700,marginBottom:6}}>التوفر</label>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:48,height:26,borderRadius:13,background:drawer.available?"#00e676":"#1e1f2e",cursor:"pointer",position:"relative",border:`1px solid ${drawer.available?"#00e67666":"#2e2f45"}`}}>
                  <div style={{width:20,height:20,borderRadius:"50%",background:"#fff",position:"absolute",top:2,left:drawer.available?25:2}}/>
                </div>
                <span style={{color:"#5c6080",fontSize:13}}>{drawer.available?"متاح الآن":"غير متاح"}</span>
              </div>
            </div>
            <div style={{height:1,background:"#1a1c2e",margin:"18px 0"}}/>
            <div style={{display:"flex",gap:8}}>
              <button style={{flex:1,background:"#00e6761a",color:"#00e676",border:"1px solid #00e67644",borderRadius:8,padding:"8px",fontSize:13,cursor:"pointer",fontFamily:"'Cairo',sans-serif",fontWeight:700}}>💾 حفظ</button>
              <button style={{background:"#ff6d001a",color:"#ff6d00",border:"1px solid #ff6d0044",borderRadius:8,padding:"8px 14px",fontSize:13,cursor:"pointer",fontFamily:"'Cairo',sans-serif",fontWeight:700}}>📄 عقد</button>
              <button style={{background:"#ff17441a",color:"#ff1744",border:"1px solid #ff174444",borderRadius:8,padding:"8px 14px",fontSize:13,cursor:"pointer",fontFamily:"'Cairo',sans-serif",fontWeight:700}}>🗑️</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── PATIENTS MANAGEMENT ─────────────────────────────────────
export const PatientsPage = () => {
  const [drawer, setDrawer] = useState(null);
  const [search, setSearch] = useState("");
  const patients = [
    {id:"U001",name:"أحمد محمد الزهراني",phone:"+966501234567",status:"active",orders:24,wallet:450,joined:"2024-01-15",insurance:"بوبا",policy:"BP-123456",city:"الرياض",flags:[],family_linked:2},
    {id:"U002",name:"سارة عبدالله العتيبي",phone:"+966509876543",status:"active",orders:8,wallet:120,joined:"2024-03-22",insurance:"ميدنت",policy:"MD-789012",city:"جدة",flags:[],family_linked:0},
    {id:"U003",name:"محمد سعد القحطاني",phone:"+966512345678",status:"blocked",orders:3,wallet:0,joined:"2024-05-10",insurance:null,policy:null,city:"الدمام",flags:["suspicious","multiple_accounts"],family_linked:0},
    {id:"U004",name:"فاطمة علي الدوسري",phone:"+966523456789",status:"active",orders:41,wallet:890,joined:"2023-11-08",insurance:"تكافل",policy:"TK-345678",city:"الرياض",flags:[],family_linked:1},
    {id:"U005",name:"خالد عمر المطيري",phone:"+966534567890",status:"active",orders:12,wallet:230,joined:"2024-02-20",insurance:"بوبا",policy:"BP-901234",city:"مكة",flags:["fraud_suspected"],family_linked:0},
  ];
  const filtered = patients.filter(p=>p.name.includes(search)||p.phone.includes(search));
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:26,flexWrap:"wrap",gap:12}}>
        <div>
          <h2 style={{color:"#e8eaf6",margin:0,fontSize:22,fontWeight:900}}>👥 إدارة المرضى</h2>
          <p style={{color:"#5c6080",margin:"4px 0 0",fontSize:13}}>{patients.length} مريض مسجل</p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button style={{background:"#00e6761a",color:"#00e676",border:"1px solid #00e67644",borderRadius:8,padding:"8px 18px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Cairo',sans-serif"}}>＋ إضافة مريض</button>
          <button style={{background:"transparent",color:"#5c6080",border:"1px solid #1a1c2e",borderRadius:8,padding:"8px 18px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Cairo',sans-serif"}}>📤 تصدير</button>
        </div>
      </div>
      <div style={{background:"#0c0d14",border:"1px solid #1a1c2e",borderRadius:14,padding:14,marginBottom:14}}>
        <input placeholder="🔍 بحث بالاسم أو الجوال..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:"100%",background:"#10121c",border:"1px solid #1a1c2e",color:"#e8eaf6",borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",boxSizing:"border-box"}}/>
      </div>
      <div style={{background:"#0c0d14",border:"1px solid #1a1c2e",borderRadius:14,padding:20}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,fontFamily:"'Cairo',sans-serif"}}>
            <thead>
              <tr style={{borderBottom:"1px solid #1a1c2e"}}>
                {["الاسم","الجوال","المدينة","الحالة","الطلبات","المحفظة","التأمين","تاريخ التسجيل","إجراءات"].map(h=>(
                  <th key={h} style={{padding:"11px 14px",textAlign:"right",color:"#5c6080",fontWeight:600,fontSize:12,whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p=>(
                <tr key={p.id} style={{borderBottom:"1px solid #1a1c2e"}}>
                  <td style={{padding:"11px 14px"}}>
                    <div style={{color:"#e8eaf6",fontWeight:700}}>{p.name}</div>
                    {p.flags.length>0&&<div style={{display:"flex",gap:4,marginTop:3}}>{p.flags.map(f=><span key={f} style={{background:"#ff174422",color:"#ff1744",border:"1px solid #ff174444",borderRadius:5,padding:"1px 6px",fontSize:10,fontFamily:"monospace"}}>{f}</span>)}</div>}
                    {p.family_linked>0&&<div style={{color:"#7c4dff",fontSize:11,marginTop:2}}>👨‍👩‍👧 {p.family_linked} حساب عائلي</div>}
                  </td>
                  <td style={{padding:"11px 14px",color:"#5c6080",fontFamily:"monospace",fontSize:12}}>{p.phone}</td>
                  <td style={{padding:"11px 14px",color:"#e8eaf6"}}>{p.city}</td>
                  <td style={{padding:"11px 14px"}}><span style={{background:p.status==="active"?"#00e67622":"#ff174422",color:p.status==="active"?"#00e676":"#ff1744",border:`1px solid ${p.status==="active"?"#00e67644":"#ff174444"}`,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700,fontFamily:"monospace"}}>{p.status==="active"?"نشط ✅":"محظور 🚫"}</span></td>
                  <td style={{padding:"11px 14px"}}><span style={{background:"#00b8e622",color:"#00b8e6",border:"1px solid #00b8e644",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700,fontFamily:"monospace"}}>{p.orders}</span></td>
                  <td style={{padding:"11px 14px",color:"#00e676",fontFamily:"monospace"}}>{p.wallet} ر</td>
                  <td style={{padding:"11px 14px"}}>{p.insurance?<span style={{background:"#7c4dff22",color:"#7c4dff",border:"1px solid #7c4dff44",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700}}>{p.insurance}</span>:<span style={{color:"#5c6080"}}>—</span>}</td>
                  <td style={{padding:"11px 14px",color:"#5c6080",fontSize:12}}>{p.joined}</td>
                  <td style={{padding:"11px 14px"}}>
                    <div style={{display:"flex",gap:5}}>
                      <button onClick={()=>setDrawer(p)} style={{background:"#00b8e61a",color:"#00b8e6",border:"1px solid #00b8e644",borderRadius:7,padding:"4px 10px",fontSize:11,cursor:"pointer",fontFamily:"'Cairo',sans-serif",fontWeight:700}}>تفاصيل</button>
                      <button style={{background:p.status==="active"?"#ff17441a":"#00e6761a",color:p.status==="active"?"#ff1744":"#00e676",border:`1px solid ${p.status==="active"?"#ff174444":"#00e67644"}`,borderRadius:7,padding:"4px 10px",fontSize:11,cursor:"pointer",fontFamily:"'Cairo',sans-serif",fontWeight:700}}>{p.status==="active"?"حظر":"رفع الحظر"}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {drawer&&(
        <div style={{position:"fixed",inset:0,zIndex:900}}>
          <div onClick={()=>setDrawer(null)} style={{position:"absolute",inset:0,background:"#000a",backdropFilter:"blur(4px)"}}/>
          <div style={{position:"absolute",right:0,top:0,bottom:0,width:500,background:"#0c0d14",borderLeft:"1px solid #1a1c2e",overflowY:"auto",padding:26}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
              <h3 style={{color:"#e8eaf6",margin:0,fontSize:16,fontWeight:900}}>المريض: {drawer.name}</h3>
              <button onClick={()=>setDrawer(null)} style={{background:"none",border:"none",color:"#5c6080",cursor:"pointer",fontSize:24}}>✕</button>
            </div>
            <div style={{background:"#10121c",borderRadius:10,padding:14,marginBottom:18,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[["ID",drawer.id],["الجوال",drawer.phone],["المدينة",drawer.city],["الطلبات",drawer.orders],["التأمين",drawer.insurance||"—"],["رقم البوليصة",drawer.policy||"—"],["تاريخ التسجيل",drawer.joined]].map(([k,v])=>(
                <div key={k}><div style={{color:"#5c6080",fontSize:11,marginBottom:2}}>{k}</div><div style={{color:"#e8eaf6",fontSize:13,fontWeight:600}}>{v}</div></div>
              ))}
            </div>
            <div style={{marginBottom:16}}>
              <label style={{display:"block",color:"#5c6080",fontSize:11,fontWeight:700,marginBottom:6}}>تعديل رصيد المحفظة (ر)</label>
              <div style={{display:"flex",gap:8}}>
                <input type="number" defaultValue={drawer.wallet} style={{flex:1,background:"#10121c",border:"1px solid #1a1c2e",color:"#e8eaf6",borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none"}}/>
                <button style={{background:"#00e6761a",color:"#00e676",border:"1px solid #00e67644",borderRadius:8,padding:"8px 14px",fontSize:13,cursor:"pointer",fontFamily:"'Cairo',sans-serif",fontWeight:700}}>تحديث</button>
              </div>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{display:"block",color:"#5c6080",fontSize:11,fontWeight:700,marginBottom:6}}>ملاحظة إدارية</label>
              <textarea rows={3} placeholder="ملاحظة داخلية..." style={{width:"100%",background:"#10121c",border:"1px solid #1a1c2e",color:"#e8eaf6",borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",resize:"none",boxSizing:"border-box"}}/>
            </div>
            <div style={{height:1,background:"#1a1c2e",margin:"16px 0"}}/>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <button style={{background:"#ff6d001a",color:"#ff6d00",border:"1px solid #ff6d0044",borderRadius:8,padding:"8px 14px",fontSize:12,cursor:"pointer",fontFamily:"'Cairo',sans-serif",fontWeight:700}}>🔄 إعادة تعيين</button>
              <button style={{background:"#7c4dff1a",color:"#7c4dff",border:"1px solid #7c4dff44",borderRadius:8,padding:"8px 14px",fontSize:12,cursor:"pointer",fontFamily:"'Cairo',sans-serif",fontWeight:700}}>🔗 دمج حسابات</button>
              <button style={{background:"#00b8e61a",color:"#00b8e6",border:"1px solid #00b8e644",borderRadius:8,padding:"8px 14px",fontSize:12,cursor:"pointer",fontFamily:"'Cairo',sans-serif",fontWeight:700}}>💳 المعاملات</button>
              <button style={{background:"#ff17441a",color:"#ff1744",border:"1px solid #ff174444",borderRadius:8,padding:"8px 14px",fontSize:12,cursor:"pointer",fontFamily:"'Cairo',sans-serif",fontWeight:700}}>🚫 حظر</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── FINANCIAL CONTROL ────────────────────────────────────────
export const FinancialControl = () => {
  const commissions = [
    {type:"Hospital",label:"مستشفيات",rate:12,revenue:480000,icon:"🏥"},
    {type:"Doctor",label:"أطباء",rate:10,revenue:280000,icon:"👨‍⚕️"},
    {type:"Lab",label:"مختبرات",rate:8,revenue:120000,icon:"🧪"},
    {type:"Pharmacy",label:"صيدليات",rate:5,revenue:320000,icon:"💊"},
    {type:"Nursing",label:"تمريض",rate:15,revenue:95000,icon:"💉"},
    {type:"Imaging",label:"أشعة",rate:10,revenue:75000,icon:"📡"},
  ];
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:26,flexWrap:"wrap",gap:12}}>
        <div>
          <h2 style={{color:"#e8eaf6",margin:0,fontSize:22,fontWeight:900}}>💰 التحكم المالي</h2>
          <p style={{color:"#5c6080",margin:"4px 0 0",fontSize:13}}>إدارة شاملة للتدفقات المالية والعمولات</p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button style={{background:"#ff6d001a",color:"#ff6d00",border:"1px solid #ff6d0044",borderRadius:8,padding:"8px 18px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Cairo',sans-serif"}}>↩️ رد مبلغ</button>
          <button style={{background:"transparent",color:"#5c6080",border:"1px solid #1a1c2e",borderRadius:8,padding:"8px 18px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Cairo',sans-serif"}}>📊 تقرير مالي</button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:14,marginBottom:24}}>
        {[["إجمالي الإيرادات (شهري)","1,370,000 ر","#00e676","💰"],["العمولات المحصلة","192,738 ر","#00b8e6","📊"],["المبالغ المستردة","18,240 ر","#ff6d00","↩️"],["الغرامات المطبقة","4,800 ر","#ff1744","⚖️"],["محافظ المزودين","284,500 ر","#7c4dff","💳"],["تحويلات اليوم","48,920 ر","#ffd600","🔄"]].map(([l,v,c,i])=>(
          <div key={l} style={{background:"#0c0d14",border:`1px solid ${c}33`,borderRadius:14,padding:20,boxShadow:`0 0 24px ${c}0e`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div><div style={{color:"#5c6080",fontSize:12,marginBottom:8}}>{l}</div><div style={{color:c,fontSize:20,fontWeight:900,fontFamily:"monospace"}}>{v}</div></div>
              <span style={{fontSize:26}}>{i}</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
        <div style={{background:"#0c0d14",border:"1px solid #1a1c2e",borderRadius:14,padding:20}}>
          <h3 style={{color:"#e8eaf6",margin:"0 0 18px",fontSize:15,fontWeight:700}}>📊 العمولات حسب نوع المزود</h3>
          {commissions.map(c=>(
            <div key={c.type} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:"1px solid #1a1c2e"}}>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                <span style={{fontSize:20}}>{c.icon}</span>
                <span style={{color:"#e8eaf6",fontSize:13}}>{c.label}</span>
              </div>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                <span style={{color:"#00e676",fontFamily:"monospace",fontSize:12}}>{c.revenue.toLocaleString()} ر</span>
                <input type="number" defaultValue={c.rate} style={{width:65,background:"#10121c",border:"1px solid #1a1c2e",color:"#00e676",borderRadius:6,padding:"4px 8px",fontSize:13,fontFamily:"monospace",textAlign:"center",outline:"none"}}/>
                <span style={{color:"#5c6080",fontSize:12}}>%</span>
                <button style={{background:"#00e6761a",color:"#00e676",border:"1px solid #00e67644",borderRadius:6,padding:"3px 10px",fontSize:11,cursor:"pointer",fontFamily:"'Cairo',sans-serif",fontWeight:700}}>حفظ</button>
              </div>
            </div>
          ))}
        </div>
        <div style={{background:"#0c0d14",border:"1px solid #1a1c2e",borderRadius:14,padding:20}}>
          <h3 style={{color:"#e8eaf6",margin:"0 0 18px",fontSize:15,fontWeight:700}}>↩️ إصدار رد مبلغ</h3>
          {[["المريض / رقم الطلب","ابحث بالاسم أو الرقم...","text"],["المبلغ (ر)","0.00","number"]].map(([l,p,t])=>(
            <div key={l} style={{marginBottom:14}}>
              <label style={{display:"block",color:"#5c6080",fontSize:11,fontWeight:700,marginBottom:6}}>{l}</label>
              <input type={t} placeholder={p} style={{width:"100%",background:"#10121c",border:"1px solid #1a1c2e",color:"#e8eaf6",borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",boxSizing:"border-box"}}/>
            </div>
          ))}
          <div style={{marginBottom:14}}>
            <label style={{display:"block",color:"#5c6080",fontSize:11,fontWeight:700,marginBottom:6}}>سبب الرد</label>
            <select style={{width:"100%",background:"#10121c",border:"1px solid #1a1c2e",color:"#e8eaf6",borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",cursor:"pointer"}}>
              {["اختر السبب","خطأ في الطلب","إلغاء المريض","شكوى موثقة","قرار إداري"].map(o=><option key={o}>{o}</option>)}
            </select>
          </div>
          <div style={{marginBottom:14}}>
            <label style={{display:"block",color:"#5c6080",fontSize:11,fontWeight:700,marginBottom:6}}>وجهة الرد</label>
            <select style={{width:"100%",background:"#10121c",border:"1px solid #1a1c2e",color:"#e8eaf6",borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",cursor:"pointer"}}>
              {["المحفظة الرقمية","البطاقة الأصلية","تحويل بنكي"].map(o=><option key={o}>{o}</option>)}
            </select>
          </div>
          <button style={{width:"100%",background:"#ff6d001a",color:"#ff6d00",border:"1px solid #ff6d0044",borderRadius:8,padding:"10px",fontSize:13,cursor:"pointer",fontFamily:"'Cairo',sans-serif",fontWeight:700}}>↩️ إصدار رد المبلغ</button>
          <div style={{height:1,background:"#1a1c2e",margin:"18px 0"}}/>
          <h3 style={{color:"#e8eaf6",margin:"0 0 14px",fontSize:14,fontWeight:700}}>⚖️ إصدار غرامة</h3>
          <div style={{marginBottom:14}}>
            <label style={{display:"block",color:"#5c6080",fontSize:11,fontWeight:700,marginBottom:6}}>المزود</label>
            <select style={{width:"100%",background:"#10121c",border:"1px solid #1a1c2e",color:"#e8eaf6",borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",cursor:"pointer"}}>
              <option>اختر مزوداً</option>
              <option>مستشفى الرحمة التخصصي</option>
              <option>مختبر الدقة الطبي</option>
            </select>
          </div>
          <input type="number" placeholder="مبلغ الغرامة (ر)" style={{width:"100%",background:"#10121c",border:"1px solid #1a1c2e",color:"#e8eaf6",borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",boxSizing:"border-box",marginBottom:14}}/>
          <button style={{width:"100%",background:"#ff17441a",color:"#ff1744",border:"1px solid #ff174444",borderRadius:8,padding:"10px",fontSize:13,cursor:"pointer",fontFamily:"'Cairo',sans-serif",fontWeight:700}}>⚖️ تطبيق الغرامة</button>
        </div>
      </div>
    </div>
  );
};

// ── ANALYTICS ───────────────────────────────────────────────
export const AnalyticsPage = () => {
  const bars = [65,82,45,90,78,95,88,72,85,98,88,94];
  const serviceData = [{label:"Doctor",val:38,color:"#00b8e6"},{label:"Pharmacy",val:28,color:"#7c4dff"},{label:"Lab",val:18,color:"#00bfa5"},{label:"Nursing",val:10,color:"#f50057"},{label:"Imaging",val:6,color:"#ffd600"}];
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:26,flexWrap:"wrap",gap:12}}>
        <div>
          <h2 style={{color:"#e8eaf6",margin:0,fontSize:22,fontWeight:900}}>📈 التحليلات والتقارير</h2>
          <p style={{color:"#5c6080",margin:"4px 0 0",fontSize:13}}>رؤى تشغيلية ومالية شاملة</p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button style={{background:"transparent",color:"#5c6080",border:"1px solid #1a1c2e",borderRadius:8,padding:"8px 18px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Cairo',sans-serif"}}>📊 تصدير Excel</button>
          <button style={{background:"transparent",color:"#5c6080",border:"1px solid #1a1c2e",borderRadius:8,padding:"8px 18px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Cairo',sans-serif"}}>📄 تصدير PDF</button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24}}>
        {[["معدل الإتمام","94.2%","#00e676","✅"],["متوسط قيمة الطلب","341 ر","#00b8e6","💰"],["معدل الإلغاء","5.8%","#ff1744","❌"],["رضا العملاء","4.7/5","#ffd600","⭐"],["مزودون نشطون","342","#ff6d00","🏥"],["بروتكاست نجح","97.2%","#00bfa5","📡"],["متوسط وقت القبول","4.2 د","#7c4dff","⚡"],["طلبات منزلية","68%","#f50057","🏠"]].map(([l,v,c,i])=>(
          <div key={l} style={{background:"#0c0d14",border:`1px solid ${c}33`,borderRadius:14,padding:18}}>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <div><div style={{color:"#5c6080",fontSize:11,marginBottom:6}}>{l}</div><div style={{color:c,fontSize:20,fontWeight:900,fontFamily:"monospace"}}>{v}</div></div>
              <span style={{fontSize:24,opacity:.8}}>{i}</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:20}}>
        {[["📦 الطلبات اليومية (آخر 12 يوم)","#00b8e6"],["💰 الإيرادات الشهرية (آخر 12 شهر)","#00e676"],["🏥 أداء المزودين (SLA)","#ff6d00"],["📡 نسبة نجاح البرودكاست","#00bfa5"]].map(([title,color],ti)=>(
          <div key={title} style={{background:"#0c0d14",border:"1px solid #1a1c2e",borderRadius:14,padding:20}}>
            <h3 style={{color:"#e8eaf6",margin:"0 0 16px",fontSize:14,fontWeight:700}}>{title}</h3>
            <div style={{display:"flex",alignItems:"flex-end",gap:4,height:100}}>
              {bars.map((h,j)=>(
                <div key={j} style={{flex:1,borderRadius:"3px 3px 0 0",background:`${color}${Math.round(h/2+40).toString(16)}`,height:`${h}%`,transition:"height .4s"}}/>
              ))}
            </div>
            <div style={{color:"#5c6080",fontSize:11,textAlign:"center",marginTop:8}}>آخر 12 فترة</div>
          </div>
        ))}
      </div>
      {/* Service Distribution */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
        <div style={{background:"#0c0d14",border:"1px solid #1a1c2e",borderRadius:14,padding:20}}>
          <h3 style={{color:"#e8eaf6",margin:"0 0 18px",fontSize:14,fontWeight:700}}>⚕️ توزيع الطلبات حسب الخدمة</h3>
          {serviceData.map(s=>(
            <div key={s.label} style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                <span style={{color:"#e8eaf6",fontSize:13}}>{s.label}</span>
                <span style={{color:s.color,fontFamily:"monospace",fontWeight:700}}>{s.val}%</span>
              </div>
              <div style={{width:"100%",height:8,background:"#1a1c2e",borderRadius:4}}>
                <div style={{width:`${s.val}%`,height:"100%",background:s.color,borderRadius:4,transition:"width .5s"}}/>
              </div>
            </div>
          ))}
        </div>
        <div style={{background:"#0c0d14",border:"1px solid #1a1c2e",borderRadius:14,padding:20}}>
          <h3 style={{color:"#e8eaf6",margin:"0 0 18px",fontSize:14,fontWeight:700}}>🗺️ توزيع الطلبات حسب المدينة</h3>
          {[{city:"الرياض",val:48,orders:617},{city:"جدة",val:28,orders:360},{city:"الدمام",val:12,orders:154},{city:"مكة",val:8,orders:103},{city:"المدينة",val:4,orders:51}].map(c=>(
            <div key={c.city} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #1a1c2e"}}>
              <span style={{color:"#e8eaf6",fontSize:13}}>{c.city}</span>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                <div style={{width:80,height:6,background:"#1a1c2e",borderRadius:3}}>
                  <div style={{width:`${c.val}%`,height:"100%",background:"#00b8e6",borderRadius:3}}/>
                </div>
                <span style={{color:"#00b8e6",fontFamily:"monospace",fontSize:12,minWidth:40}}>{c.orders}</span>
                <span style={{color:"#5c6080",fontSize:11}}>{c.val}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── THEME BUILDER ────────────────────────────────────────────
export const ThemeBuilder = ({ onThemeChange }) => {
  const [colors, setColors] = useState({
    primary:"#00b8e6", secondary:"#00e676", danger:"#ff1744",
    warning:"#ff6d00", bg_dark:"#07080d", surface:"#0c0d14", text:"#e8eaf6",
  });
  const presets = [
    {name:"Cyber Blue (الافتراضي)",colors:{primary:"#00b8e6",secondary:"#00e676",danger:"#ff1744",warning:"#ff6d00",bg_dark:"#07080d",surface:"#0c0d14",text:"#e8eaf6"}},
    {name:"Forest Green",colors:{primary:"#22c55e",secondary:"#84cc16",danger:"#ef4444",warning:"#f59e0b",bg_dark:"#052e16",surface:"#064e3b",text:"#f0fdf4"}},
    {name:"Royal Purple",colors:{primary:"#a855f7",secondary:"#ec4899",danger:"#f43f5e",warning:"#f59e0b",bg_dark:"#1e1030",surface:"#2d1f4a",text:"#faf5ff"}},
    {name:"Sunset Orange",colors:{primary:"#f97316",secondary:"#fbbf24",danger:"#ef4444",warning:"#06b6d4",bg_dark:"#1a0a00",surface:"#2a1000",text:"#fff7ed"}},
    {name:"Ocean Teal",colors:{primary:"#00bfa5",secondary:"#00e5ff",danger:"#ff1744",warning:"#ff9800",bg_dark:"#001a1a",surface:"#00292a",text:"#e0f7fa"}},
  ];
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:26,flexWrap:"wrap",gap:12}}>
        <div>
          <h2 style={{color:"#e8eaf6",margin:0,fontSize:22,fontWeight:900}}>🎨 Theme Builder — تخصيص التطبيق</h2>
          <p style={{color:"#5c6080",margin:"4px 0 0",fontSize:13}}>غيّر مظهر التطبيق بالكامل من هنا — يُطبَّق فوراً على المستخدمين</p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button style={{background:"#00e6761a",color:"#00e676",border:"1px solid #00e67644",borderRadius:8,padding:"8px 18px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Cairo',sans-serif"}}>💾 حفظ وتطبيق</button>
          <button style={{background:"transparent",color:"#5c6080",border:"1px solid #1a1c2e",borderRadius:8,padding:"8px 18px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Cairo',sans-serif"}}>↩️ إعادة تعيين</button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:20}}>
        <div>
          {/* Presets */}
          <div style={{background:"#0c0d14",border:"1px solid #1a1c2e",borderRadius:14,padding:20,marginBottom:16}}>
            <h3 style={{color:"#e8eaf6",margin:"0 0 18px",fontSize:15,fontWeight:700}}>🎨 الثيمات الجاهزة</h3>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12}}>
              {presets.map(p=>(
                <div key={p.name} onClick={()=>setColors(p.colors)} style={{borderRadius:10,overflow:"hidden",cursor:"pointer",border:`2px solid ${colors.primary===p.colors.primary?p.colors.primary:"transparent"}`,transition:"all .2s"}}>
                  <div style={{height:40,background:`linear-gradient(135deg,${p.colors.primary},${p.colors.secondary})`}}/>
                  <div style={{background:p.colors.surface,padding:"8px 10px"}}>
                    <div style={{color:p.colors.text,fontSize:11,fontWeight:700}}>{p.name}</div>
                    <div style={{display:"flex",gap:4,marginTop:5}}>
                      {[p.colors.primary,p.colors.secondary,p.colors.danger,p.colors.warning].map(c=>(
                        <div key={c} style={{width:14,height:14,borderRadius:"50%",background:c}}/>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Custom Colors */}
          <div style={{background:"#0c0d14",border:"1px solid #1a1c2e",borderRadius:14,padding:20}}>
            <h3 style={{color:"#e8eaf6",margin:"0 0 18px",fontSize:15,fontWeight:700}}>🖌️ تخصيص الألوان يدوياً</h3>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:16}}>
              {Object.entries(colors).map(([key,val])=>(
                <div key={key} style={{display:"flex",alignItems:"center",gap:12}}>
                  <input type="color" value={val} onChange={e=>setColors(prev=>({...prev,[key]:e.target.value}))} style={{width:48,height:48,borderRadius:10,border:"none",cursor:"pointer",padding:2,background:"none"}}/>
                  <div>
                    <div style={{color:"#5c6080",fontSize:11,marginBottom:2}}>{key}</div>
                    <div style={{color:val,fontFamily:"monospace",fontSize:13,fontWeight:700}}>{val}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Preview */}
        <div style={{background:"#0c0d14",border:"1px solid #1a1c2e",borderRadius:14,padding:20}}>
          <h3 style={{color:"#e8eaf6",margin:"0 0 16px",fontSize:15,fontWeight:700}}>👁️ معاينة مباشرة</h3>
          <div style={{background:colors.bg_dark,border:`1px solid ${colors.primary}33`,borderRadius:12,padding:16,marginBottom:16}}>
            <div style={{background:colors.surface,borderRadius:8,padding:12,marginBottom:10}}>
              <div style={{color:colors.text,fontWeight:700,fontSize:14,marginBottom:8}}>بطاقة نموذج</div>
              <div style={{display:"flex",gap:6,marginBottom:8}}>
                <span style={{background:colors.primary+"22",color:colors.primary,border:`1px solid ${colors.primary}44`,borderRadius:6,padding:"2px 10px",fontSize:11}}>نشط</span>
                <span style={{background:colors.danger+"22",color:colors.danger,border:`1px solid ${colors.danger}44`,borderRadius:6,padding:"2px 10px",fontSize:11}}>موقوف</span>
              </div>
              <button style={{background:colors.primary+"22",color:colors.primary,border:`1px solid ${colors.primary}44`,borderRadius:8,padding:"8px 18px",fontSize:13,fontFamily:"'Cairo',sans-serif",cursor:"pointer",fontWeight:700}}>زر أساسي</button>
            </div>
            <div style={{background:colors.surface,borderRadius:8,padding:12}}>
              <div style={{color:colors.secondary,fontSize:22,fontWeight:900,fontFamily:"monospace"}}>48,920 ر</div>
              <div style={{color:colors.text,fontSize:12,opacity:.7,marginTop:4}}>إيرادات اليوم</div>
            </div>
          </div>
          {/* Font & Border Settings */}
          <div style={{marginBottom:14}}>
            <label style={{display:"block",color:"#5c6080",fontSize:11,fontWeight:700,marginBottom:6}}>نوع الخط</label>
            <select style={{width:"100%",background:"#10121c",border:"1px solid #1a1c2e",color:"#e8eaf6",borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",cursor:"pointer"}}>
              {["Cairo (الافتراضي)","Tajawal","Almarai","IBM Plex Arabic"].map(o=><option key={o}>{o}</option>)}
            </select>
          </div>
          <div style={{marginBottom:14}}>
            <label style={{display:"block",color:"#5c6080",fontSize:11,fontWeight:700,marginBottom:6}}>حجم الخط الأساسي</label>
            <select style={{width:"100%",background:"#10121c",border:"1px solid #1a1c2e",color:"#e8eaf6",borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",cursor:"pointer"}}>
              {["12px صغير","13px متوسط (افتراضي)","14px كبير","15px كبير جداً"].map(o=><option key={o}>{o}</option>)}
            </select>
          </div>
          <div style={{marginBottom:20}}>
            <label style={{display:"block",color:"#5c6080",fontSize:11,fontWeight:700,marginBottom:6}}>حدة الزوايا (Border Radius)</label>
            <select style={{width:"100%",background:"#10121c",border:"1px solid #1a1c2e",color:"#e8eaf6",borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",cursor:"pointer"}}>
              {["4px حادة","8px متوسطة","12px ناعمة (افتراضي)","20px دائرية"].map(o=><option key={o}>{o}</option>)}
            </select>
          </div>
          <button style={{width:"100%",background:"#00e6761a",color:"#00e676",border:"1px solid #00e67644",borderRadius:8,padding:"10px",fontSize:13,cursor:"pointer",fontFamily:"'Cairo',sans-serif",fontWeight:700}}>💾 تطبيق الثيم الآن</button>
        </div>
      </div>
    </div>
  );
};

// ── CMS & CONTENT ────────────────────────────────────────────
export const CMSPage = () => {
  const [editing, setEditing] = useState(null);
  const [val, setVal] = useState("");
  const content = [
    {id:"C001",key:"onboarding_title",value:"مرحباً بك في منصة نبض بلس",screen:"Onboarding",last_edit:"2025-05-01"},
    {id:"C002",key:"home_hero_text",value:"أفضل رعاية صحية في بيتك",screen:"Home",last_edit:"2025-05-10"},
    {id:"C003",key:"emergency_cta",value:"اتصل بالطوارئ الآن",screen:"Emergency",last_edit:"2025-04-20"},
    {id:"C004",key:"cancellation_policy",value:"يمكن الإلغاء قبل 30 دقيقة من الموعد مجاناً",screen:"Booking",last_edit:"2025-05-05"},
    {id:"C005",key:"pharmacy_broadcast_msg",value:"جاري البحث عن صيدلية قريبة منك...",screen:"Pharmacy",last_edit:"2025-05-15"},
    {id:"C006",key:"nursing_supplies_warning",value:"هذه الخدمة تشمل أجر يد الممرض فقط — يرجى توفير المستلزمات",screen:"Nursing",last_edit:"2025-05-12"},
    {id:"C007",key:"lab_fasting_alert",value:"⚠️ تنبيه طبي: هذا الفحص يتطلب صيام",screen:"Lab",last_edit:"2025-05-08"},
    {id:"C008",key:"shortage_warning",value:"هذا الدواء قد يكون ناقصاً في السوق حالياً — اضغط لعرض البدائل",screen:"Pharmacy",last_edit:"2025-05-20"},
  ];
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:26,flexWrap:"wrap",gap:12}}>
        <div>
          <h2 style={{color:"#e8eaf6",margin:0,fontSize:22,fontWeight:900}}>✏️ إدارة المحتوى (CMS)</h2>
          <p style={{color:"#5c6080",margin:"4px 0 0",fontSize:13}}>تعديل نصوص وشاشات التطبيق مباشرة بدون برمجة</p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button style={{background:"#00b8e61a",color:"#00b8e6",border:"1px solid #00b8e644",borderRadius:8,padding:"8px 18px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Cairo',sans-serif"}}>🔄 نشر جميع التغييرات</button>
          <button style={{background:"#00e6761a",color:"#00e676",border:"1px solid #00e67644",borderRadius:8,padding:"8px 18px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Cairo',sans-serif"}}>＋ نص جديد</button>
        </div>
      </div>
      <div style={{background:"#0c0d14",border:"1px solid #1a1c2e",borderRadius:14,padding:20}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,fontFamily:"'Cairo',sans-serif"}}>
            <thead>
              <tr style={{borderBottom:"1px solid #1a1c2e"}}>
                {["ID","المفتاح","القيمة الحالية (انقر للتعديل)","الشاشة","آخر تعديل","إجراءات"].map(h=>(
                  <th key={h} style={{padding:"11px 14px",textAlign:"right",color:"#5c6080",fontWeight:600,fontSize:12}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {content.map(c=>(
                <tr key={c.id} style={{borderBottom:"1px solid #1a1c2e"}}>
                  <td style={{padding:"11px 14px",color:"#5c6080",fontFamily:"monospace",fontSize:11}}>{c.id}</td>
                  <td style={{padding:"11px 14px"}}><span style={{color:"#00bfa5",fontFamily:"monospace",fontSize:12}}>{c.key}</span></td>
                  <td style={{padding:"11px 14px",maxWidth:300}}>
                    {editing===c.id
                      ? <input defaultValue={c.value} autoFocus onBlur={()=>setEditing(null)} style={{background:"#10121c",border:"1px solid #00b8e6",color:"#e8eaf6",borderRadius:6,padding:"4px 10px",fontSize:12,fontFamily:"'Cairo',sans-serif",outline:"none",width:280}}/>
                      : <span style={{color:"#e8eaf6",fontSize:12,cursor:"pointer",display:"block",maxWidth:280,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} onClick={()=>setEditing(c.id)} title="انقر للتعديل المباشر">{c.value}</span>
                    }
                  </td>
                  <td style={{padding:"11px 14px"}}><span style={{background:"#7c4dff22",color:"#7c4dff",border:"1px solid #7c4dff44",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700}}>{c.screen}</span></td>
                  <td style={{padding:"11px 14px",color:"#5c6080",fontSize:12}}>{c.last_edit}</td>
                  <td style={{padding:"11px 14px"}}>
                    <div style={{display:"flex",gap:5}}>
                      <button onClick={()=>setEditing(c.id)} style={{background:"#00b8e61a",color:"#00b8e6",border:"1px solid #00b8e644",borderRadius:7,padding:"4px 10px",fontSize:11,cursor:"pointer",fontFamily:"'Cairo',sans-serif",fontWeight:700}}>تعديل</button>
                      <button style={{background:"#ff17441a",color:"#ff1744",border:"1px solid #ff174444",borderRadius:7,padding:"4px 10px",fontSize:11,cursor:"pointer",fontFamily:"'Cairo',sans-serif",fontWeight:700}}>حذف</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ── SYSTEM CONFIG ────────────────────────────────────────────
export const SystemConfig = () => {
  const sections = [
    {title:"الرسوم والعمولات",fields:[{k:"base_fee",l:"رسوم الخدمة الأساسية %",v:"5"},{k:"delivery_fee",l:"رسوم التوصيل ر",v:"15"},{k:"urgent_fee",l:"رسوم الطلبات العاجلة %",v:"20"},{k:"min_order",l:"الحد الأدنى للطلب ر",v:"50"}]},
    {title:"حدود البرودكاست",fields:[{k:"broadcast_radius_1",l:"النطاق الأول كم",v:"4"},{k:"broadcast_wait_1",l:"مدة الانتظار (دقيقة)",v:"3"},{k:"broadcast_radius_2",l:"النطاق الثاني كم",v:"6"},{k:"broadcast_radius_3",l:"النطاق الثالث كم",v:"8"}]},
    {title:"حدود النظام",fields:[{k:"delivery_radius",l:"أقصى نطاق التوصيل كم",v:"25"},{k:"max_bookings",l:"أقصى حجوزات يومياً للمريض",v:"5"},{k:"cancel_window",l:"نافذة الإلغاء (دقيقة)",v:"30"},{k:"auto_cancel_time",l:"إلغاء تلقائي بعد (دقيقة)",v:"20"}]},
    {title:"قواعد الإلغاء والغرامات",fields:[{k:"cancel_fee",l:"غرامة الإلغاء المتأخر %",v:"10"},{k:"cancel_threshold",l:"حد الإلغاء قبل الحظر (مرة)",v:"3"},{k:"provider_cancel_penalty",l:"غرامة إلغاء المزود %",v:"15"}]},
    {title:"إعدادات الطوارئ",fields:[{k:"emergency_radius",l:"نطاق إرسال تنبيه الطوارئ كم",v:"5"},{k:"emergency_wait",l:"وقت الانتظار قبل تدخل الأدمن (ثانية)",v:"30"},{k:"ambulance_eta_threshold",l:"حد ETA للتنبيه (دقيقة)",v:"15"}]},
    {title:"إعدادات AI والخوارزميات",fields:[{k:"llama_enabled",l:"تفعيل Llama-3 لترجمة الروشتات",v:"1"},{k:"rxnav_enabled",l:"تفعيل RxNav للتداخلات الدوائية",v:"1"},{k:"ocr_confidence",l:"الحد الأدنى لدقة OCR %",v:"80"}]},
  ];
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:26,flexWrap:"wrap",gap:12}}>
        <div>
          <h2 style={{color:"#e8eaf6",margin:0,fontSize:22,fontWeight:900}}>⚙️ إعدادات النظام</h2>
          <p style={{color:"#5c6080",margin:"4px 0 0",fontSize:13}}>تحكم في قواعد وسياسات المنصة</p>
        </div>
        <button style={{background:"#00e6761a",color:"#00e676",border:"1px solid #00e67644",borderRadius:8,padding:"8px 18px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Cairo',sans-serif"}}>💾 حفظ جميع الإعدادات</button>
      </div>
      {sections.map(s=>(
        <div key={s.title} style={{background:"#0c0d14",border:"1px solid #1a1c2e",borderRadius:14,padding:20,marginBottom:14}}>
          <h3 style={{color:"#00b8e6",margin:"0 0 18px",fontSize:14,fontWeight:700,paddingBottom:10,borderBottom:"1px solid #1a1c2e"}}>{s.title}</h3>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16}}>
            {s.fields.map(f=>(
              <div key={f.k} style={{marginBottom:0}}>
                <label style={{display:"block",color:"#5c6080",fontSize:11,fontWeight:700,marginBottom:6}}>{f.l}</label>
                <input type={isNaN(f.v)?"text":"number"} defaultValue={f.v} style={{width:"100%",background:"#10121c",border:"1px solid #1a1c2e",color:"#e8eaf6",borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",boxSizing:"border-box"}}/>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// ── PERMISSIONS & ROLES ──────────────────────────────────────
export const PermissionsPage = () => {
  const [modal, setModal] = useState(false);
  const admins = [
    {id:"A001",name:"أحمد الحربي",role:"SUPER_ADMIN",email:"ahmed@nabdah.sa",lastLogin:"الآن",status:"active"},
    {id:"A002",name:"منى العتيبي",role:"OPERATIONS",email:"mona@nabdah.sa",lastLogin:"2 ساعة",status:"active"},
    {id:"A003",name:"سارة الدوسري",role:"FINANCE",email:"sara@nabdah.sa",lastLogin:"أمس",status:"active"},
    {id:"A004",name:"خالد الغامدي",role:"SUPPORT",email:"khaled@nabdah.sa",lastLogin:"3 أيام",status:"inactive"},
    {id:"A005",name:"نورا الشهراني",role:"CONTENT",email:"noura@nabdah.sa",lastLogin:"اليوم",status:"active"},
  ];
  const ROLES_DATA = {
    SUPER_ADMIN:{label:"Super Admin",color:"#ff1744",icon:"👑",perms:["كل الأقسام","Kill Switches","الإعدادات","المالية","API"]},
    OPERATIONS:{label:"Operations",color:"#ff6d00",icon:"⚙️",perms:["المزودون","المرضى","الطلبات","البرودكاست","الطوارئ"]},
    FINANCE:{label:"Finance",color:"#00e676",icon:"💰",perms:["التقارير المالية","العمولات","المبالغ المستردة","الفواتير"]},
    SUPPORT:{label:"Support",color:"#7c4dff",icon:"🎧",perms:["المرضى","الشكاوى","المحادثات","الطلبات (قراءة)"]},
    CONTENT:{label:"Content",color:"#ffd600",icon:"✏️",perms:["CMS","البانرات","الإشعارات","التقييمات"]},
  };
  const statusC = {active:"#00e676",inactive:"#5c6080"};
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:26,flexWrap:"wrap",gap:12}}>
        <div>
          <h2 style={{color:"#e8eaf6",margin:0,fontSize:22,fontWeight:900}}>🔐 الصلاحيات والأدوار</h2>
          <p style={{color:"#5c6080",margin:"4px 0 0",fontSize:13}}>إدارة فريق الإدارة وصلاحياتهم</p>
        </div>
        <button onClick={()=>setModal(true)} style={{background:"#00e6761a",color:"#00e676",border:"1px solid #00e67644",borderRadius:8,padding:"8px 18px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Cairo',sans-serif"}}>＋ إضافة أدمن</button>
      </div>
      {/* Roles Cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:14,marginBottom:24}}>
        {Object.entries(ROLES_DATA).map(([key,r])=>(
          <div key={key} style={{background:"#0c0d14",border:`1px solid ${r.color}33`,borderRadius:14,padding:18,boxShadow:`0 0 24px ${r.color}0e`}}>
            <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10}}>
              <span style={{fontSize:22}}>{r.icon}</span>
              <span style={{color:r.color,fontWeight:700,fontSize:13}}>{r.label}</span>
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
              {r.perms.map(p=><span key={p} style={{background:r.color+"11",color:r.color,fontSize:9,borderRadius:4,padding:"1px 6px"}}>{p}</span>)}
            </div>
          </div>
        ))}
      </div>
      {/* Admins Table */}
      <div style={{background:"#0c0d14",border:"1px solid #1a1c2e",borderRadius:14,padding:20}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,fontFamily:"'Cairo',sans-serif"}}>
            <thead>
              <tr style={{borderBottom:"1px solid #1a1c2e"}}>
                {["ID","الاسم","البريد","الدور","آخر دخول","الحالة","إجراءات"].map(h=>(
                  <th key={h} style={{padding:"11px 14px",textAlign:"right",color:"#5c6080",fontWeight:600,fontSize:12}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {admins.map(a=>(
                <tr key={a.id} style={{borderBottom:"1px solid #1a1c2e"}}>
                  <td style={{padding:"11px 14px",color:"#5c6080",fontFamily:"monospace",fontSize:11}}>{a.id}</td>
                  <td style={{padding:"11px 14px",color:"#e8eaf6",fontWeight:700}}>{a.name}</td>
                  <td style={{padding:"11px 14px",color:"#5c6080",fontSize:12}}>{a.email}</td>
                  <td style={{padding:"11px 14px"}}>
                    <span style={{background:ROLES_DATA[a.role].color+"22",color:ROLES_DATA[a.role].color,border:`1px solid ${ROLES_DATA[a.role].color}44`,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700}}>
                      {ROLES_DATA[a.role].icon} {ROLES_DATA[a.role].label}
                    </span>
                  </td>
                  <td style={{padding:"11px 14px",color:"#5c6080",fontSize:12}}>{a.lastLogin}</td>
                  <td style={{padding:"11px 14px"}}><span style={{background:statusC[a.status]+"22",color:statusC[a.status],border:`1px solid ${statusC[a.status]}44`,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700,fontFamily:"monospace"}}>{a.status==="active"?"نشط":"غير نشط"}</span></td>
                  <td style={{padding:"11px 14px"}}>
                    <div style={{display:"flex",gap:5}}>
                      <button style={{background:"#00b8e61a",color:"#00b8e6",border:"1px solid #00b8e644",borderRadius:7,padding:"4px 10px",fontSize:11,cursor:"pointer",fontFamily:"'Cairo',sans-serif",fontWeight:700}}>تعديل الدور</button>
                      <button style={{background:"#ff17441a",color:"#ff1744",border:"1px solid #ff174444",borderRadius:7,padding:"4px 10px",fontSize:11,cursor:"pointer",fontFamily:"'Cairo',sans-serif",fontWeight:700}}>تعليق</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {modal&&(
        <div onClick={e=>e.target===e.currentTarget&&setModal(false)} style={{position:"fixed",inset:0,background:"#000c",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>
          <div style={{background:"#0c0d14",border:"1px solid #1a1c2e",borderRadius:18,width:480,padding:30}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
              <h3 style={{color:"#e8eaf6",margin:0,fontSize:17,fontWeight:900}}>إضافة أدمن جديد</h3>
              <button onClick={()=>setModal(false)} style={{background:"none",border:"none",color:"#5c6080",cursor:"pointer",fontSize:24}}>✕</button>
            </div>
            {[["الاسم الكامل","الاسم","text"],["البريد الإلكتروني","email@nabdah.sa","email"]].map(([l,p,t])=>(
              <div key={l} style={{marginBottom:16}}>
                <label style={{display:"block",color:"#5c6080",fontSize:11,fontWeight:700,marginBottom:6}}>{l}</label>
                <input type={t} placeholder={p} style={{width:"100%",background:"#10121c",border:"1px solid #1a1c2e",color:"#e8eaf6",borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",boxSizing:"border-box"}}/>
              </div>
            ))}
            <div style={{marginBottom:16}}>
              <label style={{display:"block",color:"#5c6080",fontSize:11,fontWeight:700,marginBottom:6}}>الدور</label>
              <select style={{width:"100%",background:"#10121c",border:"1px solid #1a1c2e",color:"#e8eaf6",borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",cursor:"pointer"}}>
                {Object.entries(ROLES_DATA).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
              <button onClick={()=>setModal(false)} style={{background:"transparent",color:"#5c6080",border:"1px solid #1a1c2e",borderRadius:8,padding:"8px 18px",fontSize:13,cursor:"pointer",fontFamily:"'Cairo',sans-serif",fontWeight:700}}>إلغاء</button>
              <button style={{background:"#00e6761a",color:"#00e676",border:"1px solid #00e67644",borderRadius:8,padding:"8px 18px",fontSize:13,cursor:"pointer",fontFamily:"'Cairo',sans-serif",fontWeight:700}}>✅ إضافة ودعوة</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── CUSTOM REPORTS BUILDER ───────────────────────────────────
export const CustomReports = () => {
  const [cols, setCols] = useState(["المزود","الإيرادات","الطلبات","SLA"]);
  const allCols = ["المزود","الإيرادات","الطلبات","العمولة","التقييم","SLA","المنطقة","النوع","تاريخ الانضمام","عدد الأطباء","حسابات فرعية"];
  const data = [
    {n:"مستشفى الرحمة",rev:"184,200 ر",ord:1240,sla:"98%",comm:"12%",rate:"⭐4.8",area:"الرياض",type:"Hospital"},
    {n:"مختبر الدقة",rev:"67,800 ر",ord:920,sla:"96%",comm:"8%",rate:"⭐4.7",area:"الدمام",type:"Lab"},
    {n:"صيدلية النهدي",rev:"98,400 ر",ord:2100,sla:"92%",comm:"5%",rate:"⭐4.5",area:"الرياض",type:"Pharmacy"},
    {n:"مركز النبض",rev:"42,000 ر",ord:340,sla:"99%",comm:"15%",rate:"⭐4.9",area:"الرياض",type:"Nursing"},
  ];
  const colMap = {"المزود":"n","الإيرادات":"rev","الطلبات":"ord","SLA":"sla","العمولة":"comm","التقييم":"rate","المنطقة":"area","النوع":"type"};
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:26,flexWrap:"wrap",gap:12}}>
        <div>
          <h2 style={{color:"#e8eaf6",margin:0,fontSize:22,fontWeight:900}}>📋 منشئ التقارير المخصصة</h2>
          <p style={{color:"#5c6080",margin:"4px 0 0",fontSize:13}}>بناء تقارير مخصصة بدون برمجة</p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button style={{background:"#00b8e61a",color:"#00b8e6",border:"1px solid #00b8e644",borderRadius:8,padding:"8px 18px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Cairo',sans-serif"}}>⚡ إنشاء التقرير</button>
          <button style={{background:"transparent",color:"#5c6080",border:"1px solid #1a1c2e",borderRadius:8,padding:"8px 18px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Cairo',sans-serif"}}>📊 Excel</button>
          <button style={{background:"transparent",color:"#5c6080",border:"1px solid #1a1c2e",borderRadius:8,padding:"8px 18px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Cairo',sans-serif"}}>📄 PDF</button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"300px 1fr",gap:20}}>
        <div style={{background:"#0c0d14",border:"1px solid #1a1c2e",borderRadius:14,padding:20}}>
          <h3 style={{color:"#e8eaf6",margin:"0 0 16px",fontSize:14,fontWeight:700}}>⚙️ إعداد التقرير</h3>
          <div style={{marginBottom:16}}>
            <label style={{display:"block",color:"#5c6080",fontSize:11,fontWeight:700,marginBottom:6}}>مصدر البيانات</label>
            <select style={{width:"100%",background:"#10121c",border:"1px solid #1a1c2e",color:"#e8eaf6",borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",cursor:"pointer"}}>
              {["المزودون","المرضى","الطلبات","التحاليل","المالية"].map(o=><option key={o}>{o}</option>)}
            </select>
          </div>
          <div style={{marginBottom:16}}>
            <label style={{display:"block",color:"#5c6080",fontSize:11,fontWeight:700,marginBottom:6}}>الفترة الزمنية</label>
            <select style={{width:"100%",background:"#10121c",border:"1px solid #1a1c2e",color:"#e8eaf6",borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",cursor:"pointer"}}>
              {["اليوم","الأسبوع","الشهر","ربع السنة","مخصص"].map(o=><option key={o}>{o}</option>)}
            </select>
          </div>
          <div style={{marginBottom:16}}>
            <label style={{display:"block",color:"#5c6080",fontSize:11,fontWeight:700,marginBottom:8}}>الأعمدة</label>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {allCols.map(c=>(
                <button key={c} onClick={()=>setCols(prev=>prev.includes(c)?prev.filter(x=>x!==c):[...prev,c])} style={{padding:"4px 10px",borderRadius:6,fontSize:11,cursor:"pointer",background:cols.includes(c)?"#00b8e622":"transparent",color:cols.includes(c)?"#00b8e6":"#5c6080",border:`1px solid ${cols.includes(c)?"#00b8e644":"#1a1c2e"}`,fontFamily:"'Cairo',sans-serif"}}>{c}</button>
              ))}
            </div>
          </div>
          <div style={{marginBottom:16}}>
            <label style={{display:"block",color:"#5c6080",fontSize:11,fontWeight:700,marginBottom:6}}>ترتيب حسب</label>
            <select style={{width:"100%",background:"#10121c",border:"1px solid #1a1c2e",color:"#e8eaf6",borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",cursor:"pointer"}}>
              {["الإيرادات تنازلي","الطلبات تنازلي","التقييم تنازلي","SLA تنازلي"].map(o=><option key={o}>{o}</option>)}
            </select>
          </div>
          <div style={{marginBottom:0}}>
            <label style={{display:"block",color:"#5c6080",fontSize:11,fontWeight:700,marginBottom:6}}>الحد الأقصى للنتائج</label>
            <input type="number" defaultValue={50} style={{width:"100%",background:"#10121c",border:"1px solid #1a1c2e",color:"#e8eaf6",borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",boxSizing:"border-box"}}/>
          </div>
        </div>
        <div style={{background:"#0c0d14",border:"1px solid #1a1c2e",borderRadius:14,padding:20}}>
          <h3 style={{color:"#e8eaf6",margin:"0 0 16px",fontSize:14,fontWeight:700}}>👁️ معاينة النتائج</h3>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,fontFamily:"'Cairo',sans-serif"}}>
              <thead>
                <tr style={{borderBottom:"1px solid #1a1c2e"}}>
                  {cols.map(c=><th key={c} style={{padding:"11px 14px",textAlign:"right",color:"#5c6080",fontWeight:600,fontSize:12,whiteSpace:"nowrap"}}>{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.map((row,i)=>(
                  <tr key={i} style={{borderBottom:"1px solid #1a1c2e"}}>
                    {cols.map(c=>{
                      const k=colMap[c];
                      const v=k?row[k]:row[c]||"—";
                      return <td key={c} style={{padding:"11px 14px",color:c==="المزود"?"#e8eaf6":c==="الإيرادات"?"#00e676":c==="SLA"?"#00b8e6":c==="التقييم"?"#ffd600":"#e8eaf6",fontFamily:["الإيرادات","الطلبات","SLA","العمولة"].includes(c)?"monospace":"'Cairo',sans-serif",fontWeight:c==="المزود"?700:400,whiteSpace:"nowrap"}}>{v}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── WORKFLOW AUTOMATION ──────────────────────────────────────
export const WorkflowPage = () => {
  const [modal, setModal] = useState(false);
  const workflows = [
    {id:"WF001",name:"إسناد تلقائي للطلبات",desc:"يُسند الطلب للمزود الأقرب والمتاح تلقائياً عند استقباله",active:true,runs:1240,trigger:"new_order",actions:["find_nearest","notify_provider","start_broadcast"]},
    {id:"WF002",name:"تنبيه الإلغاء المتكرر",desc:"تنبيه الأدمن عند تجاوز المريض 3 إلغاءات يومياً",active:true,runs:42,trigger:"patient_cancels",actions:["check_threshold","notify_admin","flag_patient"]},
    {id:"WF003",name:"تجديد العقود القادم",desc:"تنبيه الأدمن وإشعار المزود قبل 30 يوم من انتهاء العقد",active:true,runs:8,trigger:"contract_expiry_30d",actions:["notify_admin","notify_provider","create_task"]},
    {id:"WF004",name:"تقرير يومي تلقائي",desc:"إرسال ملخص العمليات اليومي للأدمن في نهاية كل يوم",active:false,runs:0,trigger:"daily_cron",actions:["generate_report","send_email"]},
    {id:"WF005",name:"حظر المريض عند الاحتيال",desc:"حظر فوري تلقائي عند رصد نشاط احتيالي متعدد",active:true,runs:3,trigger:"fraud_detected",actions:["block_user","notify_admin","log_action"]},
    {id:"WF006",name:"توسيع البرودكاست التلقائي",desc:"توسيع نطاق البرودكاست تلقائياً عند عدم الاستجابة خلال 3 دقائق",active:true,runs:18,trigger:"broadcast_timeout",actions:["expand_radius","reboadcast","notify_admin_if_8km"]},
  ];
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:26,flexWrap:"wrap",gap:12}}>
        <div>
          <h2 style={{color:"#e8eaf6",margin:0,fontSize:22,fontWeight:900}}>🤖 أتمتة العمليات</h2>
          <p style={{color:"#5c6080",margin:"4px 0 0",fontSize:13}}>سير العمل التلقائي — يُنفَّذ بدون تدخل بشري</p>
        </div>
        <button onClick={()=>setModal(true)} style={{background:"#00e6761a",color:"#00e676",border:"1px solid #00e67644",borderRadius:8,padding:"8px 18px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Cairo',sans-serif"}}>＋ سير عمل جديد</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:16}}>
        {workflows.map(w=>(
          <div key={w.id} style={{background:"#0c0d14",border:`1px solid ${w.active?"#00e67633":"#1a1c2e"}`,borderRadius:14,padding:20,boxShadow:w.active?`0 0 20px #00e6760e`:"none"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
              <div>
                <div style={{color:"#e8eaf6",fontWeight:700,fontSize:14,marginBottom:4}}>{w.name}</div>
                <div style={{color:"#5c6080",fontSize:12,lineHeight:1.6}}>{w.desc}</div>
              </div>
              <div onClick={()=>{}} style={{width:48,height:26,borderRadius:13,background:w.active?"#00e676":"#1e1f2e",cursor:"pointer",position:"relative",border:`1px solid ${w.active?"#00e67666":"#2e2f45"}`,flexShrink:0,marginRight:10}}>
                <div style={{width:20,height:20,borderRadius:"50%",background:"#fff",position:"absolute",top:2,left:w.active?25:2}}/>
              </div>
            </div>
            <div style={{marginBottom:12}}>
              <div style={{color:"#5c6080",fontSize:10,marginBottom:6,fontWeight:700,letterSpacing:.5,textTransform:"uppercase"}}>مشغّل الحدث</div>
              <span style={{background:"#7c4dff22",color:"#7c4dff",border:"1px solid #7c4dff44",borderRadius:6,padding:"2px 10px",fontSize:11,fontFamily:"monospace"}}>{w.trigger}</span>
            </div>
            <div style={{marginBottom:14}}>
              <div style={{color:"#5c6080",fontSize:10,marginBottom:6,fontWeight:700,letterSpacing:.5,textTransform:"uppercase"}}>الإجراءات</div>
              <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                {w.actions.map((a,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:2}}>
                    <span style={{background:"#00b8e622",color:"#00b8e6",border:"1px solid #00b8e644",borderRadius:5,padding:"1px 7px",fontSize:10,fontFamily:"monospace"}}>{a}</span>
                    {i<w.actions.length-1&&<span style={{color:"#5c6080",fontSize:10}}>→</span>}
                  </div>
                ))}
              </div>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{color:"#5c6080",fontSize:12}}>
                تشغيلات: <span style={{color:"#00b8e6",fontFamily:"monospace",fontWeight:700}}>{w.runs.toLocaleString()}</span>
              </div>
              <div style={{display:"flex",gap:6}}>
                <button style={{background:"#00b8e61a",color:"#00b8e6",border:"1px solid #00b8e644",borderRadius:7,padding:"4px 10px",fontSize:11,cursor:"pointer",fontFamily:"'Cairo',sans-serif",fontWeight:700}}>تعديل</button>
                <button style={{background:"transparent",color:"#5c6080",border:"1px solid #1a1c2e",borderRadius:7,padding:"4px 10px",fontSize:11,cursor:"pointer",fontFamily:"'Cairo',sans-serif"}}>السجل</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {modal&&(
        <div onClick={e=>e.target===e.currentTarget&&setModal(false)} style={{position:"fixed",inset:0,background:"#000c",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>
          <div style={{background:"#0c0d14",border:"1px solid #1a1c2e",borderRadius:18,width:560,padding:30,maxHeight:"85vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
              <h3 style={{color:"#e8eaf6",margin:0,fontSize:17,fontWeight:900}}>سير عمل جديد</h3>
              <button onClick={()=>setModal(false)} style={{background:"none",border:"none",color:"#5c6080",cursor:"pointer",fontSize:24}}>✕</button>
            </div>
            {[["اسم سير العمل","مثال: تنبيه عدم الإسناد","text"],["وصف الغرض","ماذا يفعل هذا السير؟","text"]].map(([l,p,t])=>(
              <div key={l} style={{marginBottom:16}}>
                <label style={{display:"block",color:"#5c6080",fontSize:11,fontWeight:700,marginBottom:6}}>{l}</label>
                <input type={t} placeholder={p} style={{width:"100%",background:"#10121c",border:"1px solid #1a1c2e",color:"#e8eaf6",borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",boxSizing:"border-box"}}/>
              </div>
            ))}
            <div style={{marginBottom:16}}>
              <label style={{display:"block",color:"#5c6080",fontSize:11,fontWeight:700,marginBottom:6}}>حدث التشغيل (Trigger)</label>
              <select style={{width:"100%",background:"#10121c",border:"1px solid #1a1c2e",color:"#e8eaf6",borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",cursor:"pointer"}}>
                {["اختر حدثاً","new_order","broadcast_timeout","patient_cancels","contract_expiry_30d","fraud_detected","daily_cron","provider_low_sla"].map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
              <button onClick={()=>setModal(false)} style={{background:"transparent",color:"#5c6080",border:"1px solid #1a1c2e",borderRadius:8,padding:"8px 18px",fontSize:13,cursor:"pointer",fontFamily:"'Cairo',sans-serif",fontWeight:700}}>إلغاء</button>
              <button style={{background:"#00e6761a",color:"#00e676",border:"1px solid #00e67644",borderRadius:8,padding:"8px 18px",fontSize:13,cursor:"pointer",fontFamily:"'Cairo',sans-serif",fontWeight:700}}>✅ إنشاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── AI & API CONFIG ──────────────────────────────────────────
export const AIConfig = () => (
  <div>
    <div style={{marginBottom:26}}>
      <h2 style={{color:"#e8eaf6",margin:0,fontSize:22,fontWeight:900}}>🧠 إعدادات AI والـ APIs الخارجية</h2>
      <p style={{color:"#5c6080",margin:"4px 0 0",fontSize:13}}>إدارة وتكوين الذكاء الاصطناعي والخدمات الخارجية المرتبطة بالمنصة</p>
    </div>
    {[
      {name:"Llama-3 (ترجمة الروشتات)",desc:"يترجم الروشتات من مصطلحات طبية لعامية — يعمل على السيرفر الخاص بدون تكلفة",status:true,endpoint:"http://llama.internal:8080/translate",key:"—",calls_today:342,latency:"1.2 ث"},
      {name:"RxNav API (التداخلات الدوائية)",desc:"يفحص تعارض المواد الفعالة تلقائياً عند بناء السلة الدوائية",status:true,endpoint:"https://rxnav.nlm.nih.gov/REST",key:"مجاني 100%",calls_today:1840,latency:"0.3 ث"},
      {name:"Google Maps + Geocoding",desc:"تحديد الموقع وتحليل الإحداثيات للعناوين التفصيلية",status:true,endpoint:"https://maps.googleapis.com/maps/api",key:"AIza...xxxx",calls_today:2840,latency:"0.4 ث"},
      {name:"Tesseract OCR (قراءة الروشتات)",desc:"يقرأ الروشتات المكتوبة بخط اليد ويستخرج الأدوية",status:true,endpoint:"http://ocr.internal:5000/parse",key:"—",calls_today:89,latency:"2.1 ث"},
      {name:"Unifonic SMS",desc:"إرسال رسائل SMS التحقق والإشعارات",status:true,endpoint:"https://api.unifonic.com/rest/SMS",key:"UNF...xxxx",calls_today:984,latency:"0.8 ث"},
      {name:"Firebase FCM (Push Notifications)",desc:"إشعارات Push للأجهزة — iOS وAndroid",status:true,endpoint:"https://fcm.googleapis.com/fcm/send",key:"AAAA...xxxx",calls_today:2847,latency:"0.2 ث"},
    ].map(api=>(
      <div key={api.name} style={{background:"#0c0d14",border:`1px solid ${api.status?"#00b8e633":"#1a1c2e"}`,borderRadius:14,padding:20,marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
          <div>
            <div style={{color:"#e8eaf6",fontWeight:700,fontSize:14,marginBottom:4}}>{api.name}</div>
            <div style={{color:"#5c6080",fontSize:12,lineHeight:1.6}}>{api.desc}</div>
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center",flexShrink:0,marginRight:14}}>
            <div style={{width:48,height:26,borderRadius:13,background:api.status?"#00e676":"#1e1f2e",cursor:"pointer",position:"relative",border:`1px solid ${api.status?"#00e67666":"#2e2f45"}`}}>
              <div style={{width:20,height:20,borderRadius:"50%",background:"#fff",position:"absolute",top:2,left:api.status?25:2}}/>
            </div>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:12}}>
          {[["Endpoint",api.endpoint,"#00bfa5"],["API Key",api.key,"#ffd600"],["طلبات اليوم",api.calls_today,"#00b8e6"],["زمن الاستجابة",api.latency,"#00e676"]].map(([k,v,c])=>(
            <div key={k} style={{background:"#10121c",borderRadius:8,padding:"8px 12px"}}>
              <div style={{color:"#5c6080",fontSize:10,marginBottom:3,fontWeight:700}}>{k}</div>
              <div style={{color:c,fontSize:12,fontFamily:"monospace",fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:8}}>
          <button style={{background:"#00b8e61a",color:"#00b8e6",border:"1px solid #00b8e644",borderRadius:7,padding:"5px 12px",fontSize:11,cursor:"pointer",fontFamily:"'Cairo',sans-serif",fontWeight:700}}>⚙️ تعديل الإعدادات</button>
          <button style={{background:"transparent",color:"#5c6080",border:"1px solid #1a1c2e",borderRadius:7,padding:"5px 12px",fontSize:11,cursor:"pointer",fontFamily:"'Cairo',sans-serif"}}>🔬 اختبار الاتصال</button>
          <button style={{background:"transparent",color:"#5c6080",border:"1px solid #1a1c2e",borderRadius:7,padding:"5px 12px",fontSize:11,cursor:"pointer",fontFamily:"'Cairo',sans-serif"}}>📊 سجل الطلبات</button>
        </div>
      </div>
    ))}
  </div>
);

// ============================================================
// COMPLETE RENDER MAP — يُضاف لـ renderPage() في Part1
// ============================================================
// استبدل PlaceholderPage في Part1 بهذه:
//
// live:            <LiveOperations setPage={setPage} />,
// providers:       <ProvidersPage />,
// patients:        <PatientsPage />,
// financial:       <FinancialControl />,
// analytics:       <AnalyticsPage />,
// "theme-builder": <ThemeBuilder />,
// cms:             <CMSPage />,
// "system-config": <SystemConfig />,
// permissions:     <PermissionsPage />,
// "custom-reports":<CustomReports />,
// workflow:        <WorkflowPage />,
// "ai-config":     <AIConfig />,
