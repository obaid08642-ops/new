// ============================================================
// NabdAdmin_Part3.jsx — الجزء الثالث والأخير
// 30 شاشة متبقية — تُضاف لـ Part1
// ============================================================

import { useState, useEffect } from "react";

// ── SHARED COLORS (نسخ من Part1 للاستقلالية) ───────────────
const C = {
  bg:"#07080d", surface:"#0c0d14", s2:"#10121c",
  border:"#1a1c2e", text:"#e8eaf6", muted:"#5c6080", dim:"#2e3050",
  accent:"#00b8e6", green:"#00e676", red:"#ff1744",
  orange:"#ff6d00", purple:"#7c4dff", gold:"#ffd600",
  pink:"#f50057", teal:"#00bfa5", cyan:"#00e5ff",
};

// ── MINI UI HELPERS (مستقل عن Part1) ────────────────────────
const Bd = ({children,color=C.accent})=>(
  <span style={{background:color+"22",color,border:`1px solid ${color}44`,borderRadius:6,padding:"2px 9px",fontSize:11,fontWeight:700,fontFamily:"monospace",whiteSpace:"nowrap"}}>{children}</span>
);
const Tog = ({value,onChange})=>(
  <div onClick={()=>onChange(!value)} style={{width:46,height:25,borderRadius:13,background:value?C.green:"#1e1f2e",cursor:"pointer",position:"relative",border:`1px solid ${value?C.green+"66":"#2e2f45"}`,flexShrink:0,transition:"all .3s"}}>
    <div style={{width:19,height:19,borderRadius:"50%",background:"#fff",position:"absolute",top:2,left:value?24:2,transition:"all .3s"}}/>
  </div>
);
const Btn3 = ({children,onClick,v="primary",sm,icon,style:s={}})=>{
  const vs={primary:{background:C.accent+"1a",color:C.accent,border:`1px solid ${C.accent}44`},success:{background:C.green+"1a",color:C.green,border:`1px solid ${C.green}44`},danger:{background:C.red+"1a",color:C.red,border:`1px solid ${C.red}44`},warning:{background:C.orange+"1a",color:C.orange,border:`1px solid ${C.orange}44`},ghost:{background:"transparent",color:C.muted,border:`1px solid ${C.border}`},purple:{background:C.purple+"1a",color:C.purple,border:`1px solid ${C.purple}44`},gold:{background:C.gold+"1a",color:C.gold,border:`1px solid ${C.gold}44`},teal:{background:C.teal+"1a",color:C.teal,border:`1px solid ${C.teal}44`}};
  return <button onClick={onClick} style={{...(vs[v]||vs.primary),borderRadius:8,padding:sm?"4px 11px":"8px 16px",fontSize:sm?11:13,fontWeight:700,cursor:"pointer",fontFamily:"'Cairo',sans-serif",transition:"all .2s",display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap",...s}}>{icon&&<span>{icon}</span>}{children}</button>;
};
const Inp = ({placeholder,value,onChange,type="text",full})=>(
  <input type={type} placeholder={placeholder} value={value||""} onChange={e=>onChange(e.target.value)} style={{background:C.s2,border:`1px solid ${C.border}`,color:C.text,borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",width:full?"100%":"auto",boxSizing:"border-box"}} onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
);
const Sel3 = ({options,value,onChange})=>(
  <select value={value} onChange={e=>onChange(e.target.value)} style={{background:C.s2,border:`1px solid ${C.border}`,color:C.text,borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",cursor:"pointer"}}>
    {options.map(o=><option key={o.v||o} value={o.v||o}>{o.l||o}</option>)}
  </select>
);
const Card3 = ({children,style:s={},accent,noPad})=>(
  <div style={{background:C.surface,border:`1px solid ${accent?accent+"33":C.border}`,borderRadius:14,padding:noPad?0:20,...(accent?{boxShadow:`0 0 28px ${accent}0e`}:{}),...s}}>{children}</div>
);
const SH = ({title,sub,actions=[]})=>(
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:26,flexWrap:"wrap",gap:12}}>
    <div><h2 style={{color:C.text,margin:0,fontSize:22,fontWeight:900}}>{title}</h2>{sub&&<p style={{color:C.muted,margin:"4px 0 0",fontSize:13}}>{sub}</p>}</div>
    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{actions}</div>
  </div>
);
const Divider3 = ()=><div style={{height:1,background:C.border,margin:"16px 0"}}/>;
const FR = ({label,children,hint,req})=>(
  <div style={{marginBottom:16}}>
    <label style={{display:"block",color:C.muted,fontSize:11,fontWeight:700,marginBottom:6}}>{label}{req&&<span style={{color:C.red}}>*</span>}</label>
    {children}
    {hint&&<div style={{color:C.dim,fontSize:11,marginTop:4}}>{hint}</div>}
  </div>
);
const Drawer3 = ({open,onClose,title,children,width=480})=>(
  <div style={{position:"fixed",inset:0,zIndex:900,pointerEvents:open?"all":"none"}}>
    <div onClick={onClose} style={{position:"absolute",inset:0,background:open?"#000a":"transparent",transition:"background .3s",backdropFilter:open?"blur(4px)":undefined}}/>
    <div style={{position:"absolute",right:0,top:0,bottom:0,width,background:C.surface,borderLeft:`1px solid ${C.border}`,transform:open?"translateX(0)":"translateX(100%)",transition:"transform .35s cubic-bezier(.4,0,.2,1)",overflowY:"auto",padding:24}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <h3 style={{color:C.text,margin:0,fontSize:16,fontWeight:900}}>{title}</h3>
        <button onClick={onClose} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:24}}>✕</button>
      </div>
      {children}
    </div>
  </div>
);
const Modal3 = ({open,onClose,title,children,width=560})=>{
  if(!open)return null;
  return(
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"#000c",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:18,width,maxWidth:"95vw",maxHeight:"90vh",overflowY:"auto",padding:28}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
          <h3 style={{color:C.text,margin:0,fontSize:17,fontWeight:900}}>{title}</h3>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:24}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};
const Tbl = ({cols,data,onRowAction,emptyMsg="لا توجد بيانات"})=>(
  <div style={{overflowX:"auto"}}>
    <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,fontFamily:"'Cairo',sans-serif"}}>
      <thead><tr style={{borderBottom:`1px solid ${C.border}`}}>{cols.map(c=><th key={c.key} style={{padding:"11px 14px",textAlign:"right",color:C.muted,fontWeight:600,fontSize:12,whiteSpace:"nowrap"}}>{c.label}</th>)}{onRowAction&&<th style={{padding:"11px 14px",color:C.muted,fontSize:12}}>إجراءات</th>}</tr></thead>
      <tbody>
        {data.length===0&&<tr><td colSpan={cols.length+1} style={{textAlign:"center",padding:40,color:C.muted}}>{emptyMsg}</td></tr>}
        {data.map((row,i)=>(
          <tr key={row.id||i} onMouseEnter={e=>e.currentTarget.style.background="#ffffff03"} onMouseLeave={e=>e.currentTarget.style.background="transparent"} style={{borderBottom:`1px solid ${C.border}`,transition:"background .15s"}}>
            {cols.map(c=><td key={c.key} style={{padding:"11px 14px",color:C.text,whiteSpace:"nowrap"}}>{c.render?c.render(row):row[c.key]}</td>)}
            {onRowAction&&<td style={{padding:"11px 14px"}}><div style={{display:"flex",gap:5}}>{onRowAction(row)}</div></td>}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
const StatCard3 = ({label,value,change,color,icon,onClick})=>(
  <Card3 accent={color} style={{padding:18,cursor:onClick?"pointer":"default"}} onClick={onClick}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
      <div><div style={{color:C.muted,fontSize:12,marginBottom:6}}>{label}</div><div style={{color,fontSize:20,fontWeight:900,fontFamily:"monospace",letterSpacing:-1}}>{value}</div>{change&&<div style={{color:change==="!"||change==="urgent"?C.red:C.green,fontSize:11,marginTop:4,fontWeight:700}}>{change}</div>}</div>
      <span style={{fontSize:26,opacity:.85}}>{icon}</span>
    </div>
  </Card3>
);

// ============================================================
// ── 1. DOCTORS MANAGEMENT ───────────────────────────────────
// ============================================================
export const DoctorsPage = () => {
  const [drawer,setDrawer]=useState(null);
  const [modal,setModal]=useState(false);
  const doctors=[
    {id:"D001",name:"د. سامي عبدالله الغامدي",specialty:"باطنية",degree:"استشاري",provider:"مستشفى الرحمة التخصصي",status:"active",rating:4.9,patients_today:8,services:["Clinic","Online","Home"],scfhs:"SCFHS-DR-001",available:true,commission:10},
    {id:"D002",name:"د. ريم فهد العمري",specialty:"جلدية",degree:"أخصائية أولى",provider:"عيادة مستقلة",status:"active",rating:4.7,patients_today:5,services:["Clinic","Online"],scfhs:"SCFHS-DR-002",available:true,commission:10},
    {id:"D003",name:"د. نورا أحمد الشهراني",specialty:"أطفال",degree:"أخصائية",provider:"مستشفى الرحمة التخصصي",status:"pending",rating:0,patients_today:0,services:["Clinic"],scfhs:"SCFHS-DR-003",available:false,commission:10},
    {id:"D004",name:"د. عبدالرحمن خالد المطيري",specialty:"قلب",degree:"استشاري",provider:"عيادة مستقلة",status:"active",rating:4.8,patients_today:6,services:["Clinic","Online"],scfhs:"SCFHS-DR-004",available:true,commission:10},
    {id:"D005",name:"د. فاطمة علي الزهراني",specialty:"نساء وولادة",degree:"استشارية",provider:"مستشفى الرحمة التخصصي",status:"suspended",rating:4.2,patients_today:0,services:["Clinic"],scfhs:"SCFHS-DR-005",available:false,commission:10},
  ];
  const sC={active:C.green,pending:C.orange,suspended:C.red};
  return (
    <div>
      <SH title="👨‍⚕️ إدارة الأطباء" sub={`${doctors.length} طبيب مسجل`} actions={[
        <Btn3 key="a" v="success" onClick={()=>setModal(true)} icon="＋">إضافة طبيب</Btn3>,
        <Btn3 key="p" v="warning" icon="⏳">بانتظار الموافقة ({doctors.filter(d=>d.status==="pending").length})</Btn3>,
        <Btn3 key="e" v="ghost" icon="📤">تصدير</Btn3>,
      ]}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:20}}>
        <StatCard3 label="أطباء نشطون" value={doctors.filter(d=>d.status==="active").length} color={C.green} icon="👨‍⚕️"/>
        <StatCard3 label="بانتظار الموافقة" value={doctors.filter(d=>d.status==="pending").length} color={C.orange} icon="⏳"/>
        <StatCard3 label="مرضى اليوم" value={doctors.reduce((a,d)=>a+d.patients_today,0)} color={C.accent} icon="👥"/>
        <StatCard3 label="أعلى تقييم" value="4.9 ⭐" color={C.gold} icon="🏆"/>
      </div>
      <Card3>
        <Tbl cols={[
          {key:"id",label:"ID",render:r=><span style={{color:C.muted,fontFamily:"monospace",fontSize:11}}>{r.id}</span>},
          {key:"name",label:"الطبيب",render:r=><div><div style={{color:C.text,fontWeight:700}}>{r.name}</div><div style={{color:C.muted,fontSize:11}}>{r.scfhs}</div></div>},
          {key:"specialty",label:"التخصص",render:r=><Bd color={C.accent}>{r.specialty}</Bd>},
          {key:"degree",label:"الدرجة",render:r=><Bd color={C.gold}>{r.degree}</Bd>},
          {key:"provider",label:"المنشأة",render:r=><span style={{color:C.muted,fontSize:12}}>{r.provider}</span>},
          {key:"status",label:"الحالة",render:r=><Bd color={sC[r.status]}>{r.status==="active"?"نشط":r.status==="pending"?"انتظار":"موقوف"}</Bd>},
          {key:"available",label:"متاح",render:r=><Tog value={r.available} onChange={()=>{}}/>},
          {key:"rating",label:"التقييم",render:r=><span style={{color:C.gold}}>{r.rating>0?`⭐ ${r.rating}`:"—"}</span>},
          {key:"patients_today",label:"مرضى اليوم",render:r=><Bd color={C.teal}>{r.patients_today}</Bd>},
          {key:"services",label:"الخدمات",render:r=><div style={{display:"flex",gap:4}}>{r.services.map(s=><Bd key={s} color={C.purple}>{s}</Bd>)}</div>},
        ]} data={doctors} onRowAction={r=><>
          <Btn3 sm v="primary" onClick={()=>setDrawer(r)}>تعديل</Btn3>
          {r.status==="pending"&&<Btn3 sm v="success">موافقة</Btn3>}
          <Btn3 sm v={r.status==="active"?"danger":"success"}>{r.status==="active"?"تعليق":"تفعيل"}</Btn3>
        </>}/>
      </Card3>
      <Drawer3 open={!!drawer} onClose={()=>setDrawer(null)} title={`تعديل: ${drawer?.name}`}>
        {drawer&&<div>
          <div style={{background:C.s2,borderRadius:10,padding:14,marginBottom:18}}>
            {[["الاسم",drawer.name],["التخصص",drawer.specialty],["الدرجة",drawer.degree],["رقم SCFHS",drawer.scfhs],["المنشأة",drawer.provider]].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${C.border}`}}>
                <span style={{color:C.muted,fontSize:12}}>{k}</span>
                <span style={{color:C.text,fontSize:13,fontWeight:600}}>{v}</span>
              </div>
            ))}
          </div>
          <FR label="الخدمات المقدمة">
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {["Clinic","Online","Home"].map(s=>(
                <button key={s} style={{padding:"5px 12px",borderRadius:8,fontSize:12,cursor:"pointer",background:drawer.services.includes(s)?C.accent+"22":"transparent",color:drawer.services.includes(s)?C.accent:C.muted,border:`1px solid ${drawer.services.includes(s)?C.accent+"44":C.border}`,fontFamily:"'Cairo',sans-serif"}}>{s}</button>
              ))}
            </div>
          </FR>
          <FR label="نسبة العمولة %"><Inp type="number" value={drawer.commission} onChange={()=>{}}/></FR>
          <FR label="التوفر"><Tog value={drawer.available} onChange={()=>{}}/></FR>
          <Divider3/>
          <div style={{display:"flex",gap:8}}>
            <Btn3 v="success" style={{flex:1,justifyContent:"center"}}>💾 حفظ</Btn3>
            <Btn3 v="warning">📅 جدول المواعيد</Btn3>
            <Btn3 v="danger">تعليق</Btn3>
          </div>
        </div>}
      </Drawer3>
      <Modal3 open={modal} onClose={()=>setModal(false)} title="إضافة طبيب جديد" width={580}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <FR label="الاسم الكامل" req><Inp placeholder="د. الاسم الكامل" value="" onChange={()=>{}} full/></FR>
          <FR label="رقم SCFHS" req><Inp placeholder="SCFHS-DR-XXXX" value="" onChange={()=>{}} full/></FR>
          <FR label="التخصص" req><Sel3 options={["طب الأسرة","باطنية","أطفال","جلدية","نساء وولادة","قلب","عظام","عيون","أنف وأذن","نفسية"].map(o=>({v:o,l:o}))} value="" onChange={()=>{}}/></FR>
          <FR label="الدرجة العلمية" req><Sel3 options={["طبيب ممارس عام","أخصائي","أخصائي أول","استشاري","أستاذ دكتور"].map(o=>({v:o,l:o}))} value="" onChange={()=>{}}/></FR>
          <FR label="المنشأة الأم"><Sel3 options={["مستقل","مستشفى الرحمة التخصصي","مختبر الدقة","مركز النبض"].map(o=>({v:o,l:o}))} value="" onChange={()=>{}}/></FR>
          <FR label="نسبة العمولة %"><Inp type="number" value="" onChange={()=>{}} full/></FR>
        </div>
        <FR label="الخدمات المقدمة">
          <div style={{display:"flex",gap:8}}>
            {["Clinic — كشف عيادة","Online — أونلاين","Home — منزلي"].map(s=>(
              <label key={s} style={{display:"flex",gap:6,alignItems:"center",cursor:"pointer"}}><input type="checkbox"/><span style={{color:C.text,fontSize:13}}>{s}</span></label>
            ))}
          </div>
        </FR>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
          <Btn3 v="ghost" onClick={()=>setModal(false)}>إلغاء</Btn3>
          <Btn3 v="success" icon="✅">إضافة الطبيب</Btn3>
        </div>
      </Modal3>
    </div>
  );
};

// ── 2. FAMILY CARDS ─────────────────────────────────────────
export const FamilyCards = () => {
  const data=[
    {id:"FC001",owner:"أحمد الزهراني",members:[{name:"سارة الزهراني",relation:"زوجة",age:35},{name:"محمد الزهراني",relation:"ابن",age:12}],linked_at:"2024-02-01",status:"active",orders_family:31},
    {id:"FC002",owner:"فاطمة الدوسري",members:[{name:"والدة فاطمة",relation:"أم",age:65}],linked_at:"2024-03-15",status:"active",orders_family:18},
    {id:"FC003",owner:"خالد المطيري",members:[],linked_at:null,status:"inactive",orders_family:0},
  ];
  return (
    <div>
      <SH title="👨‍👩‍👧 كارت العائلة" sub="إدارة الحسابات العائلية المرتبطة" actions={[<Btn3 key="e" v="ghost" icon="📤">تصدير</Btn3>]}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:20}}>
        <StatCard3 label="عائلات مرتبطة" value={data.filter(d=>d.status==="active").length} color={C.accent} icon="👨‍👩‍👧"/>
        <StatCard3 label="إجمالي أفراد" value={data.reduce((a,d)=>a+d.members.length,0)} color={C.purple} icon="👥"/>
        <StatCard3 label="طلبات العائلة اليوم" value={data.reduce((a,d)=>a+d.orders_family,0)} color={C.green} icon="📦"/>
      </div>
      <Card3>
        {data.map(fc=>(
          <div key={fc.id} style={{padding:"16px 0",borderBottom:`1px solid ${C.border}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div>
                <div style={{color:C.text,fontWeight:700,fontSize:14}}>{fc.owner}</div>
                <div style={{color:C.muted,fontSize:12,marginTop:2}}>مرتبط منذ: {fc.linked_at||"—"} · طلبات العائلة: {fc.orders_family}</div>
              </div>
              <Bd color={fc.status==="active"?C.green:C.muted}>{fc.status==="active"?"نشط":"غير نشط"}</Bd>
            </div>
            {fc.members.length>0?(
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {fc.members.map((m,i)=>(
                  <div key={i} style={{background:C.s2,borderRadius:8,padding:"6px 12px",display:"flex",gap:8,alignItems:"center"}}>
                    <span style={{color:C.text,fontSize:12,fontWeight:600}}>{m.name}</span>
                    <Bd color={C.purple}>{m.relation}</Bd>
                    <span style={{color:C.muted,fontSize:11}}>{m.age} سنة</span>
                  </div>
                ))}
              </div>
            ):<div style={{color:C.muted,fontSize:12}}>لا يوجد أفراد مرتبطون</div>}
            <div style={{display:"flex",gap:6,marginTop:10}}>
              <Btn3 sm v="primary">إدارة الأفراد</Btn3>
              <Btn3 sm v="ghost">سجل الطلبات</Btn3>
              {fc.status==="active"&&<Btn3 sm v="danger">إلغاء الربط</Btn3>}
            </div>
          </div>
        ))}
      </Card3>
    </div>
  );
};

// ── 3. WALLET & TRANSACTIONS ────────────────────────────────
export const WalletTx = () => {
  const [drawer,setDrawer]=useState(null);
  const txs=[
    {id:"TX001",user:"أحمد الزهراني",user_type:"patient",type:"payment",amount:320,method:"visa",order:"ORD-8821",date:"2025-05-28 10:24",status:"success"},
    {id:"TX002",user:"سارة العتيبي",user_type:"patient",type:"refund",amount:180,method:"wallet",order:"ORD-8800",date:"2025-05-28 09:15",status:"success"},
    {id:"TX003",user:"مستشفى الرحمة",user_type:"provider",type:"withdrawal",amount:12400,method:"bank_transfer",order:"—",date:"2025-05-28 08:00",status:"pending"},
    {id:"TX004",user:"فاطمة الدوسري",user_type:"patient",type:"topup",amount:500,method:"mada",order:"—",date:"2025-05-27 20:30",status:"success"},
    {id:"TX005",user:"خالد المطيري",user_type:"patient",type:"payment",amount:95,method:"visa",order:"ORD-8790",date:"2025-05-27 18:45",status:"failed"},
    {id:"TX006",user:"مختبر الدقة",user_type:"provider",type:"earning",amount:2840,method:"internal",order:"ORD-8821,8810",date:"2025-05-27 23:59",status:"success"},
  ];
  const typeC={payment:C.accent,refund:C.orange,withdrawal:C.purple,topup:C.green,earning:C.teal};
  const typeL={payment:"دفع",refund:"استرداد",withdrawal:"سحب",topup:"شحن محفظة",earning:"أرباح"};
  return (
    <div>
      <SH title="💳 المحافظ والمعاملات" sub="سجل تفصيلي لكل معاملة مالية" actions={[
        <Btn3 key="r" v="warning" icon="↩️">رد مبلغ جديد</Btn3>,
        <Btn3 key="e" v="ghost" icon="📤">تصدير</Btn3>,
      ]}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:20}}>
        <StatCard3 label="حجم معاملات اليوم" value="284,920 ر" color={C.green} icon="💰"/>
        <StatCard3 label="معاملات اليوم" value="1,284" color={C.accent} icon="🔄"/>
        <StatCard3 label="مستردة اليوم" value="18,240 ر" color={C.orange} icon="↩️"/>
        <StatCard3 label="معاملات فاشلة" value="4" color={C.red} icon="❌"/>
      </div>
      <Card3>
        <Tbl cols={[
          {key:"id",label:"ID",render:r=><span style={{color:C.muted,fontFamily:"monospace",fontSize:11}}>{r.id}</span>},
          {key:"user",label:"المستخدم",render:r=><div><div style={{color:C.text,fontWeight:700}}>{r.user}</div><Bd color={r.user_type==="patient"?C.accent:C.purple}>{r.user_type==="patient"?"مريض":"مزود"}</Bd></div>},
          {key:"type",label:"النوع",render:r=><Bd color={typeC[r.type]}>{typeL[r.type]}</Bd>},
          {key:"amount",label:"المبلغ",render:r=><span style={{color:r.type==="refund"||r.type==="withdrawal"?C.orange:C.green,fontFamily:"monospace",fontWeight:700}}>{r.amount.toLocaleString()} ر</span>},
          {key:"method",label:"الطريقة",render:r=><Bd color={C.muted}>{r.method}</Bd>},
          {key:"order",label:"الطلب",render:r=><span style={{color:C.accent,fontFamily:"monospace",fontSize:11}}>{r.order}</span>},
          {key:"date",label:"التاريخ",render:r=><span style={{color:C.muted,fontSize:11}}>{r.date}</span>},
          {key:"status",label:"الحالة",render:r=><Bd color={r.status==="success"?C.green:r.status==="pending"?C.orange:C.red}>{r.status==="success"?"ناجح":r.status==="pending"?"جاري":"فاشل"}</Bd>},
        ]} data={txs} onRowAction={r=><>
          <Btn3 sm v="primary" onClick={()=>setDrawer(r)}>تفاصيل</Btn3>
          {r.status==="success"&&r.type==="payment"&&<Btn3 sm v="warning">رد</Btn3>}
        </>}/>
      </Card3>
      <Drawer3 open={!!drawer} onClose={()=>setDrawer(null)} title={`معاملة: ${drawer?.id}`}>
        {drawer&&<div>
          <div style={{background:C.s2,borderRadius:10,padding:14,marginBottom:18}}>
            {[["المستخدم",drawer.user],["النوع",typeL[drawer.type]],["المبلغ",`${drawer.amount.toLocaleString()} ريال`],["الطريقة",drawer.method],["الطلب",drawer.order],["التاريخ",drawer.date],["الحالة",drawer.status]].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${C.border}`}}>
                <span style={{color:C.muted,fontSize:12}}>{k}</span>
                <span style={{color:C.text,fontSize:13,fontWeight:600}}>{v}</span>
              </div>
            ))}
          </div>
          {drawer.type==="payment"&&drawer.status==="success"&&<>
            <FR label="مبلغ الاسترداد (ر)"><Inp type="number" value={drawer.amount} onChange={()=>{}} full/></FR>
            <FR label="سبب الرد"><Sel3 options={["اختر السبب","خطأ في الطلب","إلغاء المريض","شكوى موثقة","قرار إداري"].map(o=>({v:o,l:o}))} value="" onChange={()=>{}}/></FR>
            <Btn3 v="warning" style={{width:"100%",justifyContent:"center"}} icon="↩️">إصدار رد المبلغ</Btn3>
          </>}
        </div>}
      </Drawer3>
    </div>
  );
};

// ── 4. BLACKLIST ─────────────────────────────────────────────
export const BlacklistPage = () => {
  const [modal,setModal]=useState(false);
  const data=[
    {id:"BL001",entity:"محمد القحطاني",type:"patient",reason:"إساءة متكررة للمزودين",date:"2025-05-10",by:"أحمد (Admin)",duration:"دائم",active:true},
    {id:"BL002",entity:"+966555000111",type:"phone",reason:"رقم مزيف مستخدم في احتيال",date:"2025-05-15",by:"منى (Ops)",duration:"دائم",active:true},
    {id:"BL003",entity:"صيدلية مشبوهة",type:"provider",reason:"مخالفة الشروط — بيع أدوية بدون وصفة",date:"2025-05-20",by:"أحمد (Admin)",duration:"6 أشهر",active:true},
    {id:"BL004",entity:"192.168.50.100",type:"ip",reason:"محاولات تسجيل دخول متكررة",date:"2025-05-22",by:"النظام",duration:"7 أيام",active:false},
  ];
  const typeC={patient:C.red,phone:C.orange,provider:C.purple,ip:C.gold};
  return (
    <div>
      <SH title="🚫 القائمة السوداء" sub={`${data.length} مدخلات`} actions={[
        <Btn3 key="a" v="danger" onClick={()=>setModal(true)} icon="＋">إضافة للقائمة</Btn3>,
        <Btn3 key="e" v="ghost" icon="📤">تصدير</Btn3>,
      ]}/>
      <Card3>
        <Tbl cols={[
          {key:"id",label:"ID",render:r=><span style={{color:C.muted,fontFamily:"monospace",fontSize:11}}>{r.id}</span>},
          {key:"entity",label:"الكيان",render:r=><span style={{color:C.text,fontWeight:700}}>{r.entity}</span>},
          {key:"type",label:"النوع",render:r=><Bd color={typeC[r.type]}>{r.type==="patient"?"مريض":r.type==="phone"?"رقم هاتف":r.type==="provider"?"مزود":"عنوان IP"}</Bd>},
          {key:"reason",label:"السبب",render:r=><span style={{color:C.muted,fontSize:12}}>{r.reason}</span>},
          {key:"duration",label:"المدة",render:r=><Bd color={r.duration==="دائم"?C.red:C.orange}>{r.duration}</Bd>},
          {key:"date",label:"تاريخ الحظر"},
          {key:"by",label:"بواسطة",render:r=><span style={{color:C.muted,fontSize:12}}>{r.by}</span>},
          {key:"active",label:"الحالة",render:r=><Bd color={r.active?C.red:C.muted}>{r.active?"محظور 🚫":"منتهي"}</Bd>},
        ]} data={data} onRowAction={r=><>
          {r.active&&<Btn3 sm v="success">رفع الحظر</Btn3>}
          <Btn3 sm v="ghost">السجل</Btn3>
        </>}/>
      </Card3>
      <Modal3 open={modal} onClose={()=>setModal(false)} title="إضافة للقائمة السوداء" width={460}>
        <FR label="الكيان (اسم / رقم هاتف / IP)" req><Inp placeholder="الاسم أو الرقم أو العنوان" value="" onChange={()=>{}} full/></FR>
        <FR label="النوع" req><Sel3 options={["مريض","رقم هاتف","مزود","عنوان IP"].map(o=>({v:o,l:o}))} value="" onChange={()=>{}}/></FR>
        <FR label="سبب الحظر" req>
          <textarea placeholder="اكتب سبب الحظر بوضوح..." rows={3} style={{width:"100%",background:C.s2,border:`1px solid ${C.border}`,color:C.text,borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",resize:"none",boxSizing:"border-box"}}/>
        </FR>
        <FR label="مدة الحظر" req><Sel3 options={["دائم","30 يوم","7 أيام","24 ساعة"].map(o=>({v:o,l:o}))} value="" onChange={()=>{}}/></FR>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
          <Btn3 v="ghost" onClick={()=>setModal(false)}>إلغاء</Btn3>
          <Btn3 v="danger" icon="🚫">إضافة للقائمة</Btn3>
        </div>
      </Modal3>
    </div>
  );
};

// ── 5. FRAUD DETECTION ──────────────────────────────────────
export const FraudDetection = () => {
  const alerts=[
    {id:"FA001",user:"خالد المطيري",user_type:"patient",type:"velocity",detail:"8 طلبات في 20 دقيقة من نفس الجهاز",risk:"high",status:"open",detected:"10:15"},
    {id:"FA002",user:"محمد القحطاني",user_type:"patient",type:"multi_account",detail:"3 حسابات مرتبطة برقم هاتف واحد",risk:"critical",status:"blocked",detected:"09:30"},
    {id:"FA003",user:"مجهول",user_type:"unknown",type:"card_fraud",detail:"بطاقة فيزا مرفوضة 5 مرات متتالية",risk:"medium",status:"watching",detected:"08:45"},
    {id:"FA004",user:"د. سامي الغامدي",user_type:"provider",type:"fake_prescription",detail:"وصفة طبية مكررة بتواريخ مختلفة",risk:"high",status:"open",detected:"07:20"},
  ];
  const riskC={critical:C.red,high:C.orange,medium:C.gold,low:C.muted};
  const statusC={open:C.red,blocked:C.purple,watching:C.orange,resolved:C.green};
  return (
    <div>
      <SH title="🕵️ كشف الاحتيال" sub="مراقبة النشاط المشبوه في الوقت الفعلي" actions={[
        <Btn3 key="r" v="primary" icon="🔄">تحديث</Btn3>,
        <Btn3 key="s" v="ghost" icon="⚙️">إعدادات الكشف</Btn3>,
      ]}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:20}}>
        <StatCard3 label="تنبيهات نشطة" value={alerts.filter(a=>a.status==="open").length} color={C.red} icon="🚨"/>
        <StatCard3 label="تحت المراقبة" value={alerts.filter(a=>a.status==="watching").length} color={C.orange} icon="👁️"/>
        <StatCard3 label="تم الحجب" value={alerts.filter(a=>a.status==="blocked").length} color={C.purple} icon="🚫"/>
        <StatCard3 label="نسبة الاحتيال" value="0.3%" color={C.gold} icon="📊"/>
      </div>
      <Card3>
        <Tbl cols={[
          {key:"id",label:"ID",render:r=><span style={{color:C.muted,fontFamily:"monospace",fontSize:11}}>{r.id}</span>},
          {key:"user",label:"المستخدم",render:r=><div><div style={{color:C.text,fontWeight:700}}>{r.user}</div><Bd color={C.muted}>{r.user_type}</Bd></div>},
          {key:"type",label:"نوع التنبيه",render:r=><Bd color={C.orange}>{r.type}</Bd>},
          {key:"detail",label:"التفاصيل",render:r=><span style={{color:C.muted,fontSize:12,maxWidth:260,display:"block",overflow:"hidden",textOverflow:"ellipsis"}}>{r.detail}</span>},
          {key:"risk",label:"مستوى الخطر",render:r=><Bd color={riskC[r.risk]}>{r.risk}</Bd>},
          {key:"status",label:"الحالة",render:r=><Bd color={statusC[r.status]}>{r.status}</Bd>},
          {key:"detected",label:"اكتُشف"},
        ]} data={alerts} onRowAction={r=><>
          <Btn3 sm v="danger">حجب فوري</Btn3>
          <Btn3 sm v="warning">مراقبة</Btn3>
          <Btn3 sm v="success">تجاهل</Btn3>
        </>}/>
      </Card3>
    </div>
  );
};

// ── 6. ORDERS MANAGEMENT ────────────────────────────────────
export const OrdersPage = () => {
  const [drawer,setDrawer]=useState(null);
  const [sel,setSel]=useState([]);
  const orders=[
    {id:"ORD-8821",patient:"أحمد الزهراني",provider:"مختبر الدقة",type:"Lab",subtype:"سحب منزلي",status:"in_progress",amount:320,time:"10:24",assigned:"فني سامي",priority:"normal",broadcast_radius:4},
    {id:"ORD-8820",patient:"سارة العتيبي",provider:null,type:"Doctor",subtype:"كشف منزلي",status:"broadcasting",amount:180,time:"10:18",assigned:null,priority:"urgent",broadcast_radius:4},
    {id:"ORD-8819",patient:"فاطمة الدوسري",provider:"صيدلية النهدي",type:"Pharmacy",subtype:"توصيل أدوية",status:"pending_payment",amount:95,time:"10:05",assigned:"مندوب خالد",priority:"normal",broadcast_radius:4},
    {id:"ORD-8818",patient:"خالد المطيري",provider:"مركز النبض",type:"Nursing",subtype:"غيار جرح",status:"completed",amount:450,time:"09:45",assigned:"ممرضة نورا",priority:"normal",broadcast_radius:4},
    {id:"ORD-8817",patient:"أحمد الزهراني",provider:null,type:"Pharmacy",subtype:"روشتة OCR",status:"pending_approval",amount:0,time:"09:30",assigned:null,priority:"normal",broadcast_radius:6},
  ];
  const sC={in_progress:C.accent,broadcasting:C.teal,pending_payment:C.gold,completed:C.green,pending_approval:C.purple,pending:C.orange,cancelled:C.red};
  const sL={in_progress:"جاري",broadcasting:"📡 برودكاست",pending_payment:"انتظار دفع",completed:"مكتمل ✅",pending_approval:"موافقة",pending:"انتظار",cancelled:"ملغي"};
  return (
    <div>
      <SH title="📦 التحكم في الطلبات" sub={`${orders.length} طلب — تدخل كامل`} actions={[
        <Btn3 key="a" v="success" icon="＋">طلب جديد</Btn3>,
        sel.length>0&&<Btn3 key="b" v="warning">{sel.length} محدد</Btn3>,
        <Btn3 key="e" v="ghost" icon="📤">تصدير</Btn3>,
      ]}/>
      <Card3>
        <Tbl cols={[
          {key:"id",label:"الطلب",render:r=><span style={{color:C.accent,fontFamily:"monospace"}}>{r.id}</span>},
          {key:"patient",label:"المريض"},{key:"provider",label:"المزود",render:r=><span style={{color:r.provider?C.text:C.muted}}>{r.provider||"—"}</span>},
          {key:"type",label:"النوع",render:r=><Bd color={C.purple}>{r.type}</Bd>},
          {key:"subtype",label:"النوع الفرعي",render:r=><span style={{color:C.muted,fontSize:12}}>{r.subtype}</span>},
          {key:"status",label:"الحالة",render:r=><Bd color={sC[r.status]||C.muted}>{sL[r.status]||r.status}</Bd>},
          {key:"amount",label:"المبلغ",render:r=><span style={{color:r.amount>0?C.green:C.muted,fontFamily:"monospace"}}>{r.amount>0?`${r.amount} ر`:"—"}</span>},
          {key:"assigned",label:"المسند",render:r=><span style={{color:r.assigned?C.purple:C.muted,fontSize:12}}>{r.assigned||"—"}</span>},
          {key:"priority",label:"الأولوية",render:r=><Bd color={r.priority==="urgent"?C.red:C.muted}>{r.priority==="urgent"?"🚨 عاجل":"عادي"}</Bd>},
        ]} data={orders} onRowAction={r=><Btn3 sm v="primary" onClick={()=>setDrawer(r)}>تحكم</Btn3>}/>
      </Card3>
      <Drawer3 open={!!drawer} onClose={()=>setDrawer(null)} title={`تحكم: ${drawer?.id}`}>
        {drawer&&<div>
          <div style={{background:C.s2,borderRadius:10,padding:14,marginBottom:18}}>
            {[["المريض",drawer.patient],["المزود",drawer.provider||"—"],["النوع",`${drawer.type} — ${drawer.subtype}`],["المبلغ",`${drawer.amount} ر`],["نطاق البرودكاست",`${drawer.broadcast_radius} كم`]].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${C.border}`}}>
                <span style={{color:C.muted,fontSize:12}}>{k}</span><span style={{color:C.text,fontSize:13,fontWeight:600}}>{v}</span>
              </div>
            ))}
          </div>
          <FR label="إسناد إلى مزود"><Sel3 options={["اختر مزوداً","مستشفى الرحمة","مختبر الدقة","صيدلية النهدي","مركز النبض"].map(o=>({v:o,l:o}))} value="" onChange={()=>{}}/></FR>
          <FR label="تعديل السعر (ر)"><Inp type="number" value={drawer.amount} onChange={()=>{}} full/></FR>
          <FR label="سبب التدخل اليدوي">
            <textarea rows={2} placeholder="سبب التدخل..." style={{width:"100%",background:C.s2,border:`1px solid ${C.border}`,color:C.text,borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",resize:"none",boxSizing:"border-box"}}/>
          </FR>
          <Divider3/>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <Btn3 v="primary" icon="📍">إسناد قسري</Btn3>
            <Btn3 v="warning" icon="🔄">إعادة تعيين</Btn3>
            <Btn3 v="purple" icon="✏️">تعديل العناصر</Btn3>
            <Btn3 v="danger" icon="❌">إلغاء الطلب</Btn3>
          </div>
        </div>}
      </Drawer3>
    </div>
  );
};

// ── 7. APPOINTMENTS ──────────────────────────────────────────
export const AppointmentsPage = () => {
  const [drawer,setDrawer]=useState(null);
  const apts=[
    {id:"APT-001",patient:"فاطمة الدوسري",doctor:"د. ريم العمري",specialty:"باطنية",date:"2025-05-28",time:"11:00",status:"confirmed",type:"clinic",amount:180},
    {id:"APT-002",patient:"أحمد الزهراني",doctor:"د. سامي الغامدي",specialty:"طب أسرة",date:"2025-05-28",time:"14:30",status:"pending",type:"home_care",amount:280},
    {id:"APT-003",patient:"سارة العتيبي",doctor:"د. نورا الشهراني",specialty:"جلدية",date:"2025-05-29",time:"10:00",status:"cancelled",type:"clinic",amount:0},
    {id:"APT-004",patient:"خالد المطيري",doctor:"د. عبدالرحمن المطيري",specialty:"قلب",date:"2025-05-29",time:"09:00",status:"confirmed",type:"online",amount:120},
  ];
  const sC={confirmed:C.green,pending:C.orange,cancelled:C.red,completed:C.teal};
  const tL={clinic:"عيادة 🏥",home_care:"منزلي 🏠",online:"أونلاين 🎥"};
  return (
    <div>
      <SH title="📅 التحكم في المواعيد" sub={`${apts.length} مواعيد`} actions={[
        <Btn3 key="a" v="success" icon="＋">موعد جديد</Btn3>,
        <Btn3 key="c" v="ghost" icon="📆">تقويم</Btn3>,
      ]}/>
      <Card3>
        <Tbl cols={[
          {key:"id",label:"رقم الموعد",render:r=><span style={{color:C.accent,fontFamily:"monospace"}}>{r.id}</span>},
          {key:"patient",label:"المريض"},{key:"doctor",label:"الطبيب",render:r=><span style={{color:C.purple}}>{r.doctor}</span>},
          {key:"specialty",label:"التخصص"},{key:"date",label:"التاريخ",render:r=><Bd color={C.accent}>{r.date}</Bd>},
          {key:"time",label:"الوقت",render:r=><span style={{fontFamily:"monospace"}}>{r.time}</span>},
          {key:"type",label:"النوع",render:r=><Bd color={C.orange}>{tL[r.type]}</Bd>},
          {key:"status",label:"الحالة",render:r=><Bd color={sC[r.status]}>{r.status}</Bd>},
          {key:"amount",label:"المبلغ",render:r=><span style={{color:r.amount>0?C.green:C.muted,fontFamily:"monospace"}}>{r.amount>0?`${r.amount} ر`:"—"}</span>},
        ]} data={apts} onRowAction={r=><Btn3 sm v="primary" onClick={()=>setDrawer(r)}>تحكم</Btn3>}/>
      </Card3>
      <Drawer3 open={!!drawer} onClose={()=>setDrawer(null)} title={`موعد: ${drawer?.id}`}>
        {drawer&&<div>
          <div style={{background:C.s2,borderRadius:10,padding:14,marginBottom:18}}>
            {[["المريض",drawer.patient],["الطبيب",drawer.doctor],["التخصص",drawer.specialty],["التاريخ",drawer.date],["الوقت",drawer.time],["النوع",tL[drawer.type]]].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${C.border}`}}>
                <span style={{color:C.muted,fontSize:12}}>{k}</span><span style={{color:C.text,fontSize:13,fontWeight:600}}>{v}</span>
              </div>
            ))}
          </div>
          <FR label="تاريخ جديد"><Inp type="date" value={drawer.date} onChange={()=>{}} full/></FR>
          <FR label="وقت جديد"><Inp type="time" value={drawer.time} onChange={()=>{}}/></FR>
          <FR label="تغيير الطبيب"><Inp placeholder="ابحث عن طبيب..." value="" onChange={()=>{}} full/></FR>
          <FR label="سبب التعديل">
            <textarea rows={2} placeholder="سبب التعديل..." style={{width:"100%",background:C.s2,border:`1px solid ${C.border}`,color:C.text,borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",resize:"none",boxSizing:"border-box"}}/>
          </FR>
          <Divider3/>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <Btn3 v="primary" icon="📅">إعادة جدولة</Btn3>
            <Btn3 v="warning" icon="🔓">فتح التوفر</Btn3>
            <Btn3 v="success" icon="✅">إغلاق الموعد</Btn3>
            <Btn3 v="danger" icon="❌">إلغاء</Btn3>
          </div>
        </div>}
      </Drawer3>
    </div>
  );
};

// ── 8. WAITLIST ──────────────────────────────────────────────
export const WaitlistPage = () => {
  const data=[
    {id:"WL001",patient:"أحمد الزهراني",specialty:"أطفال",provider:"مستشفى الرحمة",position:1,since:"08:00",notified:false,wait:"35 د"},
    {id:"WL002",patient:"سارة العتيبي",specialty:"جلدية",provider:"عيادة الشفاء",position:2,since:"09:15",notified:false,wait:"22 د"},
    {id:"WL003",patient:"فاطمة الدوسري",specialty:"باطنية",provider:"مستشفى الرحمة",position:3,since:"09:45",notified:true,wait:"8 د"},
  ];
  return (
    <div>
      <SH title="⏳ قائمة الانتظار" sub={`${data.length} مرضى ينتظرون`} actions={[
        <Btn3 key="n" v="primary" icon="📢">إشعار الكل</Btn3>,
        <Btn3 key="r" v="ghost" icon="🔄">تحديث</Btn3>,
      ]}/>
      <Card3>
        <Tbl cols={[
          {key:"position",label:"الترتيب",render:r=><span style={{color:C.accent,fontWeight:900,fontFamily:"monospace",fontSize:18}}>#{r.position}</span>},
          {key:"patient",label:"المريض"},{key:"specialty",label:"التخصص",render:r=><Bd color={C.purple}>{r.specialty}</Bd>},
          {key:"provider",label:"المزود"},{key:"since",label:"منذ",render:r=><Bd color={C.orange}>{r.since}</Bd>},
          {key:"wait",label:"وقت الانتظار",render:r=><Bd color={C.red}>{r.wait}</Bd>},
          {key:"notified",label:"تم الإشعار",render:r=><Tog value={r.notified} onChange={()=>{}}/>},
        ]} data={data} onRowAction={()=><>
          <Btn3 sm v="success">تحديد موعد</Btn3>
          <Btn3 sm v="primary">إشعار</Btn3>
          <Btn3 sm v="danger">إزالة</Btn3>
        </>}/>
      </Card3>
    </div>
  );
};

// ── 9. REFERRALS ─────────────────────────────────────────────
export const ReferralsPage = () => {
  const [modal,setModal]=useState(false);
  const data=[
    {id:"REF001",from:"مستشفى الرحمة",to:"مختبر الدقة",patient:"أحمد الزهراني",reason:"تحاليل متخصصة",date:"2025-05-28",status:"completed"},
    {id:"REF002",from:"عيادة الشفاء",to:"مركز الأشعة الحديث",patient:"سارة العتيبي",reason:"أشعة مقطعية",date:"2025-05-27",status:"pending"},
  ];
  return (
    <div>
      <SH title="🔄 التحويلات الطبية" sub={`${data.length} تحويلات`} actions={[<Btn3 key="a" v="success" onClick={()=>setModal(true)} icon="＋">إنشاء تحويل</Btn3>]}/>
      <Card3>
        <Tbl cols={[
          {key:"id",label:"ID",render:r=><span style={{color:C.muted,fontFamily:"monospace",fontSize:11}}>{r.id}</span>},
          {key:"patient",label:"المريض"},{key:"from",label:"من",render:r=><Bd color={C.accent}>{r.from}</Bd>},
          {key:"to",label:"إلى",render:r=><Bd color={C.purple}>{r.to}</Bd>},
          {key:"reason",label:"السبب"},{key:"date",label:"التاريخ"},
          {key:"status",label:"الحالة",render:r=><Bd color={r.status==="completed"?C.green:C.orange}>{r.status==="completed"?"مكتمل":"انتظار"}</Bd>},
        ]} data={data} onRowAction={()=><><Btn3 sm v="primary">تفاصيل</Btn3><Btn3 sm v="danger">إلغاء</Btn3></>}/>
      </Card3>
      <Modal3 open={modal} onClose={()=>setModal(false)} title="إنشاء تحويل طبي" width={500}>
        <FR label="المريض" req><Inp placeholder="ابحث بالاسم أو ID" value="" onChange={()=>{}} full/></FR>
        <FR label="من مزود" req><Sel3 options={["اختر","مستشفى الرحمة","عيادة الشفاء","مختبر الدقة"].map(o=>({v:o,l:o}))} value="" onChange={()=>{}}/></FR>
        <FR label="إلى مزود" req><Sel3 options={["اختر","مختبر الدقة","مركز الأشعة","مركز النبض"].map(o=>({v:o,l:o}))} value="" onChange={()=>{}}/></FR>
        <FR label="سبب التحويل" req><Inp placeholder="مثال: تحاليل متخصصة" value="" onChange={()=>{}} full/></FR>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
          <Btn3 v="ghost" onClick={()=>setModal(false)}>إلغاء</Btn3>
          <Btn3 v="success" icon="🔄">إنشاء التحويل</Btn3>
        </div>
      </Modal3>
    </div>
  );
};

// ── 10. CHAT CONTROL ─────────────────────────────────────────
export const ChatControl = () => {
  const [sel,setSel]=useState(null);
  const [msg,setMsg]=useState("");
  const chats=[
    {id:"C001",patient:"أحمد الزهراني",provider:"مستشفى الرحمة",status:"dispute",msgs:12,last:"لم أتلقَّ الخدمة المدفوعة!"},
    {id:"C002",patient:"سارة العتيبي",provider:"عيادة الشفاء",status:"active",msgs:5,last:"متى سيصل الطبيب؟"},
    {id:"C003",patient:"فاطمة الدوسري",provider:"مختبر الدقة",status:"active",msgs:3,last:"شكراً على الخدمة"},
  ];
  return (
    <div>
      <SH title="💬 مراقبة المحادثات" sub="تدخل في النزاعات وإرسال رسائل النظام"/>
      <div style={{display:"grid",gridTemplateColumns:"280px 1fr",gap:16}}>
        <Card3 noPad>
          {chats.map(c=>(
            <div key={c.id} onClick={()=>setSel(c)} style={{padding:14,borderBottom:`1px solid ${C.border}`,cursor:"pointer",background:sel?.id===c.id?`${C.accent}08`:"transparent",borderRight:sel?.id===c.id?`3px solid ${C.accent}`:"3px solid transparent"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{color:C.text,fontSize:13,fontWeight:700}}>{c.patient}</span>
                <Bd color={c.status==="dispute"?C.red:C.green}>{c.status==="dispute"?"نزاع ⚠️":"نشط"}</Bd>
              </div>
              <div style={{color:C.muted,fontSize:11,marginBottom:4}}>{c.provider}</div>
              <div style={{color:C.muted,fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.last}</div>
            </div>
          ))}
        </Card3>
        <Card3>
          {sel?(
            <>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <h3 style={{color:C.text,margin:0,fontSize:15,fontWeight:700}}>{sel.patient} ↔ {sel.provider}</h3>
                <Bd color={sel.status==="dispute"?C.red:C.green}>{sel.status==="dispute"?"⚠️ نزاع":"✅ عادي"}</Bd>
              </div>
              <div style={{background:C.s2,borderRadius:10,minHeight:220,marginBottom:14,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <span style={{color:C.muted,fontSize:13}}>💬 سجل المحادثة — {sel.msgs} رسالة</span>
              </div>
              <div style={{display:"flex",gap:8,marginBottom:10}}>
                <input value={msg} onChange={e=>setMsg(e.target.value)} placeholder="رسالة من النظام للطرفين..." style={{flex:1,background:C.s2,border:`1px solid ${C.border}`,color:C.text,borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none"}}/>
                <Btn3 v="primary">إرسال</Btn3>
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <Btn3 sm v="danger">🔒 قفل المحادثة</Btn3>
                <Btn3 sm v="warning">⚖️ حل النزاع</Btn3>
                <Btn3 sm v="purple">👨‍⚕️ إشعار الطرفين</Btn3>
                <Btn3 sm v="ghost">📋 تصدير السجل</Btn3>
              </div>
            </>
          ):<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:300,color:C.muted}}>اختر محادثة من القائمة</div>}
        </Card3>
      </div>
    </div>
  );
};

// ── 11. PHARMACY ORDERS ──────────────────────────────────────
export const PharmacyOrders = () => {
  const [drawer,setDrawer]=useState(null);
  const orders=[
    {id:"PH001",patient:"أحمد الزهراني",pharmacy:"صيدلية النهدي",items:[{name:"بنادول اكسترا",qty:2,price:15,found:true,rx:false},{name:"أموكسيسيلين 500mg",qty:1,price:45,found:true,rx:true},{name:"كريم إيفاكلار",qty:1,price:0,found:false,rx:false}],total:60,status:"pending_approval",input_type:"ocr",time:"09:30"},
    {id:"PH002",patient:"فاطمة الدوسري",pharmacy:"صيدلية الحياة",items:[{name:"باراسيتامول",qty:3,price:12,found:true,rx:false}],total:36,status:"in_progress",input_type:"search",time:"10:15"},
    {id:"PH003",patient:"سارة العتيبي",pharmacy:"صيدلية النهدي",items:[{name:"فنتولين بخاخ",qty:1,price:38,found:false,rx:true,shortage:true}],total:0,status:"shortage_alert",input_type:"search",time:"10:22"},
  ];
  return (
    <div>
      <SH title="💊 طلبات الصيدلية" sub="مراجعة وتعديل وموافقة البدائل" actions={[<Btn3 key="r" v="primary" icon="🔄">تحديث</Btn3>]}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:20}}>
        <StatCard3 label="بانتظار الموافقة" value={orders.filter(o=>o.status==="pending_approval").length} color={C.orange} icon="⏳"/>
        <StatCard3 label="تنبيه نقص دواء" value={orders.filter(o=>o.status==="shortage_alert").length} color={C.red} icon="⚠️"/>
        <StatCard3 label="جارية" value={orders.filter(o=>o.status==="in_progress").length} color={C.accent} icon="🔄"/>
        <StatCard3 label="طلبات OCR اليوم" value="89" color={C.purple} icon="📷"/>
      </div>
      <Card3>
        <Tbl cols={[
          {key:"id",label:"الطلب",render:r=><span style={{color:C.accent,fontFamily:"monospace"}}>{r.id}</span>},
          {key:"patient",label:"المريض"},{key:"pharmacy",label:"الصيدلية"},
          {key:"items",label:"الأصناف",render:r=><Bd color={C.purple}>{r.items.length} صنف</Bd>},
          {key:"total",label:"الإجمالي",render:r=><span style={{color:r.total>0?C.green:C.muted,fontFamily:"monospace"}}>{r.total>0?`${r.total} ر`:"—"}</span>},
          {key:"input_type",label:"طريقة الإدخال",render:r=><Bd color={C.gold}>{r.input_type==="ocr"?"📷 OCR":r.input_type==="search"?"🔍 بحث":"✏️ يدوي"}</Bd>},
          {key:"status",label:"الحالة",render:r=><Bd color={r.status==="pending_approval"?C.orange:r.status==="shortage_alert"?C.red:r.status==="in_progress"?C.accent:C.green}>{r.status==="pending_approval"?"انتظار موافقة":r.status==="shortage_alert"?"⚠️ نقص دواء":r.status==="in_progress"?"جاري":"مكتمل"}</Bd>},
          {key:"time",label:"الوقت"},
        ]} data={orders} onRowAction={r=><>
          <Btn3 sm v="primary" onClick={()=>setDrawer(r)}>مراجعة السلة</Btn3>
          {r.status==="shortage_alert"&&<Btn3 sm v="warning">اقتراح بديل</Btn3>}
        </>}/>
      </Card3>
      <Drawer3 open={!!drawer} onClose={()=>setDrawer(null)} title={`سلة الطلب: ${drawer?.id}`} width={500}>
        {drawer&&<div>
          <div style={{background:C.s2,borderRadius:10,padding:14,marginBottom:18}}>
            {[["المريض",drawer.patient],["الصيدلية",drawer.pharmacy],["الوقت",drawer.time]].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${C.border}`}}>
                <span style={{color:C.muted,fontSize:12}}>{k}</span><span style={{color:C.text,fontSize:13,fontWeight:600}}>{v}</span>
              </div>
            ))}
          </div>
          <h4 style={{color:C.muted,fontSize:12,marginBottom:10}}>الأصناف:</h4>
          {drawer.items.map((item,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:C.s2,borderRadius:8,marginBottom:8}}>
              <div>
                <div style={{color:C.text,fontSize:13,fontWeight:600}}>{item.name}</div>
                <div style={{display:"flex",gap:4,marginTop:3}}>
                  {item.rx&&<Bd color={C.red}>🔒 RX</Bd>}
                  {item.shortage&&<Bd color={C.red}>⚠️ ناقص بالسوق</Bd>}
                  <Bd color={item.found?C.green:C.red}>{item.found?"موجود ✅":"غير موجود ❌"}</Bd>
                </div>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <span style={{color:C.green,fontFamily:"monospace",fontSize:12}}>{item.price>0?`${item.price} ر`:"—"}</span>
                <input type="number" defaultValue={item.qty} style={{width:55,background:C.bg,border:`1px solid ${C.border}`,color:C.text,borderRadius:6,padding:"3px 8px",fontSize:12,fontFamily:"monospace",textAlign:"center",outline:"none"}}/>
              </div>
            </div>
          ))}
          <Divider3/>
          <div style={{display:"flex",gap:8}}>
            <Btn3 v="success" style={{flex:1,justifyContent:"center"}} icon="✅">تأكيد وإرسال للدفع</Btn3>
            <Btn3 v="warning" icon="🔄">تعديل السلة</Btn3>
          </div>
        </div>}
      </Drawer3>
    </div>
  );
};

// ── 12. LAB RESULTS MONITOR ──────────────────────────────────
export const LabResultsMonitor = () => {
  const results=[
    {id:"LR001",patient:"أحمد الزهراني",lab:"مختبر الدقة",tests:["CBC","Lipid Profile"],status:"uploaded",uploaded_at:"2025-05-28 10:15",notified:true,doctor_forwarded:false},
    {id:"LR002",patient:"فاطمة الدوسري",lab:"مختبر الدقة",tests:["HbA1c"],status:"processing",uploaded_at:null,notified:false,doctor_forwarded:false},
    {id:"LR003",patient:"سارة العتيبي",lab:"مختبر الرياض",tests:["Vitamin D","TSH"],status:"uploaded",uploaded_at:"2025-05-28 09:30",notified:true,doctor_forwarded:true},
  ];
  return (
    <div>
      <SH title="🔬 مراقبة نتائج التحاليل" sub="تتبع رفع النتائج وإرسالها للمرضى والأطباء" actions={[<Btn3 key="r" v="primary" icon="🔄">تحديث</Btn3>]}/>
      <Card3>
        <Tbl cols={[
          {key:"id",label:"ID",render:r=><span style={{color:C.muted,fontFamily:"monospace",fontSize:11}}>{r.id}</span>},
          {key:"patient",label:"المريض"},{key:"lab",label:"المختبر"},
          {key:"tests",label:"التحاليل",render:r=><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{r.tests.map(t=><Bd key={t} color={C.accent}>{t}</Bd>)}</div>},
          {key:"status",label:"الحالة",render:r=><Bd color={r.status==="uploaded"?C.green:C.orange}>{r.status==="uploaded"?"مرفوع ✅":"قيد المعالجة"}</Bd>},
          {key:"uploaded_at",label:"وقت الرفع",render:r=><span style={{color:C.muted,fontSize:11}}>{r.uploaded_at||"—"}</span>},
          {key:"notified",label:"أُشعر المريض",render:r=><Bd color={r.notified?C.green:C.red}>{r.notified?"نعم ✅":"لا ❌"}</Bd>},
          {key:"doctor_forwarded",label:"أُرسل للطبيب",render:r=><Bd color={r.doctor_forwarded?C.green:C.muted}>{r.doctor_forwarded?"نعم ✅":"لا"}</Bd>},
        ]} data={results} onRowAction={r=><>
          {!r.notified&&r.status==="uploaded"&&<Btn3 sm v="success">إشعار المريض</Btn3>}
          {!r.doctor_forwarded&&r.status==="uploaded"&&<Btn3 sm v="primary">إرسال للطبيب</Btn3>}
          <Btn3 sm v="ghost">عرض النتيجة</Btn3>
        </>}/>
      </Card3>
    </div>
  );
};

// ── 13. COMPLAINTS & DISPUTES ────────────────────────────────
export const ComplaintsPage = () => {
  const [drawer,setDrawer]=useState(null);
  const data=[
    {id:"CMP001",patient:"أحمد الزهراني",provider:"مستشفى الرحمة",subject:"تأخر في الاستجابة — 45 دقيقة",status:"open",priority:"high",date:"2025-05-27",type:"service_quality"},
    {id:"CMP002",patient:"سارة العتيبي",provider:"عيادة الشفاء",subject:"خطأ في الفاتورة — مبلغ مضاعف",status:"resolved",priority:"medium",date:"2025-05-25",type:"billing"},
    {id:"CMP003",patient:"فاطمة الدوسري",provider:"صيدلية الأمل",subject:"دواء خاطئ في الطلب",status:"open",priority:"urgent",date:"2025-05-28",type:"wrong_item"},
  ];
  const pC={urgent:C.red,high:C.orange,medium:C.gold,low:C.muted};
  return (
    <div>
      <SH title="⚖️ الشكاوى والنزاعات" sub={`${data.filter(c=>c.status==="open").length} مفتوحة`} actions={[
        <Btn3 key="a" v="success" icon="＋">شكوى جديدة</Btn3>,
        <Btn3 key="e" v="ghost" icon="📤">تصدير</Btn3>,
      ]}/>
      <Card3>
        <Tbl cols={[
          {key:"id",label:"ID",render:r=><span style={{color:C.muted,fontFamily:"monospace",fontSize:11}}>{r.id}</span>},
          {key:"patient",label:"المريض"},{key:"provider",label:"المزود"},
          {key:"subject",label:"الموضوع",render:r=><span style={{color:C.text,fontSize:12}}>{r.subject}</span>},
          {key:"type",label:"النوع",render:r=><Bd color={C.accent}>{r.type}</Bd>},
          {key:"priority",label:"الأولوية",render:r=><Bd color={pC[r.priority]}>{r.priority}</Bd>},
          {key:"status",label:"الحالة",render:r=><Bd color={r.status==="open"?C.red:C.green}>{r.status==="open"?"مفتوح":"محلول ✅"}</Bd>},
          {key:"date",label:"التاريخ"},
        ]} data={data} onRowAction={r=><>
          <Btn3 sm v="primary" onClick={()=>setDrawer(r)}>معالجة</Btn3>
          {r.status==="open"&&<Btn3 sm v="success">حل</Btn3>}
        </>}/>
      </Card3>
      <Drawer3 open={!!drawer} onClose={()=>setDrawer(null)} title={`شكوى: ${drawer?.id}`}>
        {drawer&&<div>
          <div style={{background:C.s2,borderRadius:10,padding:14,marginBottom:18}}>
            {[["المريض",drawer.patient],["المزود",drawer.provider],["الموضوع",drawer.subject],["التاريخ",drawer.date],["النوع",drawer.type]].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${C.border}`}}>
                <span style={{color:C.muted,fontSize:12}}>{k}</span><span style={{color:C.text,fontSize:13,fontWeight:600}}>{v}</span>
              </div>
            ))}
          </div>
          <FR label="قرار الأدمن" req><Sel3 options={["اختر القرار","خطأ المزود","خطأ المريض","خطأ النظام","خلاف مشترك"].map(o=>({v:o,l:o}))} value="" onChange={()=>{}}/></FR>
          <FR label="الإجراء" req><Sel3 options={["اختر","رد المبلغ للمريض","تحذير للمزود","غرامة مالية","إغلاق فقط"].map(o=>({v:o,l:o}))} value="" onChange={()=>{}}/></FR>
          <FR label="ملاحظة للمستخدم">
            <textarea rows={3} placeholder="رسالة للمستخدم..." style={{width:"100%",background:C.s2,border:`1px solid ${C.border}`,color:C.text,borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",resize:"none",boxSizing:"border-box"}}/>
          </FR>
          <Divider3/>
          <div style={{display:"flex",gap:8}}>
            <Btn3 v="success" style={{flex:1,justifyContent:"center"}} icon="✅">حل الشكوى</Btn3>
            <Btn3 v="danger">رفض</Btn3>
          </div>
        </div>}
      </Drawer3>
    </div>
  );
};

// ── 14. TASK MANAGER ─────────────────────────────────────────
export const TaskManager = () => {
  const [modal,setModal]=useState(false);
  const tasks=[
    {id:"T001",title:"مراجعة وثائق مركز الطب التخصصي",assigned:"منى العتيبي",priority:"high",status:"pending",due:"2025-05-29",tags:["KYC","موافقة"]},
    {id:"T002",title:"معالجة شكوى CMP003 — دواء خاطئ",assigned:"خالد الغامدي",priority:"urgent",status:"in_progress",due:"2025-05-28",tags:["شكوى","عاجل"]},
    {id:"T003",title:"تحديث عمولات الصيدليات",assigned:"سارة الدوسري",priority:"medium",status:"done",due:"2025-05-27",tags:["مالية"]},
    {id:"T004",title:"إنشاء تقرير الأداء الشهري",assigned:"أحمد الحربي",priority:"low",status:"pending",due:"2025-05-31",tags:["تقارير"]},
  ];
  const pC={urgent:C.red,high:C.orange,medium:C.gold,low:C.muted};
  const cols=["pending","in_progress","done"];
  const colL={pending:"⏳ انتظار",in_progress:"🔄 جاري",done:"✅ منجز"};
  const colC={pending:C.orange,in_progress:C.accent,done:C.green};
  return (
    <div>
      <SH title="✔️ مدير المهام الإداري" sub="مهام فريق الإدارة" actions={[<Btn3 key="a" v="success" onClick={()=>setModal(true)} icon="＋">مهمة جديدة</Btn3>]}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
        {cols.map(status=>(
          <div key={status}>
            <div style={{color:colC[status],fontSize:13,fontWeight:700,marginBottom:12,padding:"8px 0",borderBottom:`2px solid ${colC[status]}`}}>{colL[status]} ({tasks.filter(t=>t.status===status).length})</div>
            {tasks.filter(t=>t.status===status).map(t=>(
              <Card3 key={t.id} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <span style={{color:C.text,fontSize:13,fontWeight:700,flex:1,lineHeight:1.4}}>{t.title}</span>
                  <Bd color={pC[t.priority]}>{t.priority}</Bd>
                </div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>
                  {t.tags.map(tag=><Bd key={tag} color={C.teal}>{tag}</Bd>)}
                </div>
                <div style={{color:C.muted,fontSize:12,marginBottom:4}}>👤 {t.assigned}</div>
                <div style={{color:C.muted,fontSize:11}}>📅 {t.due}</div>
                <div style={{display:"flex",gap:6,marginTop:10}}>
                  {status!=="done"&&<Btn3 sm v="success">إتمام</Btn3>}
                  <Btn3 sm v="primary">تعديل</Btn3>
                  <Btn3 sm v="danger">حذف</Btn3>
                </div>
              </Card3>
            ))}
          </div>
        ))}
      </div>
      <Modal3 open={modal} onClose={()=>setModal(false)} title="مهمة جديدة" width={480}>
        <FR label="عنوان المهمة" req><Inp placeholder="وصف المهمة" value="" onChange={()=>{}} full/></FR>
        <FR label="المسؤول" req><Sel3 options={["اختر","أحمد الحربي","منى العتيبي","سارة الدوسري","خالد الغامدي"].map(o=>({v:o,l:o}))} value="" onChange={()=>{}}/></FR>
        <FR label="الأولوية"><Sel3 options={["urgent","high","medium","low"].map(o=>({v:o,l:o}))} value="medium" onChange={()=>{}}/></FR>
        <FR label="تاريخ الاستحقاق"><Inp type="date" value="" onChange={()=>{}} full/></FR>
        <FR label="الوسوم (مفصولة بفاصلة)"><Inp placeholder="KYC، مالية، شكوى..." value="" onChange={()=>{}} full/></FR>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
          <Btn3 v="ghost" onClick={()=>setModal(false)}>إلغاء</Btn3>
          <Btn3 v="success" icon="✅">إنشاء المهمة</Btn3>
        </div>
      </Modal3>
    </div>
  );
};

// ── 15. SERVICES CATALOG ─────────────────────────────────────
export const ServicesCatalog = () => {
  const [modal,setModal]=useState(false);
  const data=[
    {id:"SV001",name:"استشارة طبية أونلاين",category:"Consultation",price_min:80,price_max:300,active:true,providers:124},
    {id:"SV002",name:"كشف عيادة حضوري",category:"Clinic",price_min:100,price_max:500,active:true,providers:89},
    {id:"SV003",name:"زيارة طبية منزلية",category:"Home Visit",price_min:200,price_max:800,active:true,providers:45},
    {id:"SV004",name:"سحب تحاليل منزلي",category:"Lab Home",price_min:80,price_max:200,active:true,providers:28},
    {id:"SV005",name:"أشعة تشخيصية",category:"Imaging",price_min:200,price_max:2000,active:false,providers:12},
    {id:"SV006",name:"رعاية تمريضية منزلية",category:"Nursing",price_min:60,price_max:500,active:true,providers:67},
  ];
  return (
    <div>
      <SH title="⚕️ كتالوج الخدمات" sub={`${data.length} خدمات مسجلة`} actions={[
        <Btn3 key="a" v="success" onClick={()=>setModal(true)} icon="＋">إضافة خدمة</Btn3>,
        <Btn3 key="b" v="primary" icon="📤">رفع Excel</Btn3>,
      ]}/>
      <Card3>
        <Tbl cols={[
          {key:"id",label:"ID",render:r=><span style={{color:C.muted,fontFamily:"monospace",fontSize:11}}>{r.id}</span>},
          {key:"name",label:"الخدمة",render:r=><span style={{color:C.text,fontWeight:700}}>{r.name}</span>},
          {key:"category",label:"الفئة",render:r=><Bd color={C.accent}>{r.category}</Bd>},
          {key:"price_range",label:"نطاق السعر",render:r=><span style={{color:C.green,fontFamily:"monospace"}}>{r.price_min}—{r.price_max} ر</span>},
          {key:"providers",label:"المزودون",render:r=><Bd color={C.purple}>{r.providers}</Bd>},
          {key:"active",label:"الحالة",render:r=><Tog value={r.active} onChange={()=>{}}/>},
        ]} data={data} onRowAction={()=><><Btn3 sm v="primary">تعديل</Btn3><Btn3 sm v="danger">حذف</Btn3></>}/>
      </Card3>
      <Modal3 open={modal} onClose={()=>setModal(false)} title="إضافة خدمة جديدة" width={520}>
        <FR label="اسم الخدمة" req><Inp placeholder="استشارة طبية أونلاين" value="" onChange={()=>{}} full/></FR>
        <FR label="الفئة" req><Sel3 options={["Consultation","Clinic","Home Visit","Lab","Lab Home","Imaging","Nursing","Pharmacy"].map(o=>({v:o,l:o}))} value="" onChange={()=>{}}/></FR>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <FR label="أدنى سعر (ر)" req><Inp type="number" value="" onChange={()=>{}} full/></FR>
          <FR label="أعلى سعر (ر)" req><Inp type="number" value="" onChange={()=>{}} full/></FR>
        </div>
        <FR label="الوصف"><textarea rows={3} placeholder="وصف الخدمة..." style={{width:"100%",background:C.s2,border:`1px solid ${C.border}`,color:C.text,borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",resize:"none",boxSizing:"border-box"}}/></FR>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
          <Btn3 v="ghost" onClick={()=>setModal(false)}>إلغاء</Btn3>
          <Btn3 v="success" icon="✅">إضافة</Btn3>
        </div>
      </Modal3>
    </div>
  );
};

// ── 16. IMAGING SERVICES ─────────────────────────────────────
export const ImagingServices = () => {
  const [modal,setModal]=useState(false);
  const data=[
    {id:"IMG001",name:"X-Ray — أشعة سينية",requirements:"إزالة المعادن والمجوهرات",price_ref:120,turnaround:"فوري",home_available:false,active:true},
    {id:"IMG002",name:"CT Scan — أشعة مقطعية",requirements:"صيام 4 ساعات",price_ref:800,turnaround:"2 ساعة",home_available:false,active:true},
    {id:"IMG003",name:"MRI — رنين مغناطيسي",requirements:"إزالة كل المعادن · لا pacemaker",price_ref:1500,turnaround:"3 ساعات",home_available:false,active:true},
    {id:"IMG004",name:"Ultrasound — سونار",requirements:"مثانة ممتلئة (فحص البطن)",price_ref:350,turnaround:"فوري",home_available:true,active:true},
    {id:"IMG005",name:"ECG — تخطيط القلب",requirements:"لا تحضيرات خاصة",price_ref:180,turnaround:"فوري",home_available:true,active:true},
  ];
  return (
    <div>
      <SH title="📡 خدمات الأشعة التشخيصية" sub={`${data.length} أنواع أشعة`} actions={[
        <Btn3 key="a" v="success" onClick={()=>setModal(true)} icon="＋">إضافة نوع أشعة</Btn3>,
      ]}/>
      <Card3>
        <Tbl cols={[
          {key:"id",label:"ID",render:r=><span style={{color:C.muted,fontFamily:"monospace",fontSize:11}}>{r.id}</span>},
          {key:"name",label:"نوع الأشعة",render:r=><span style={{color:C.text,fontWeight:700}}>{r.name}</span>},
          {key:"requirements",label:"المتطلبات",render:r=><span style={{color:C.muted,fontSize:12}}>{r.requirements}</span>},
          {key:"price_ref",label:"السعر المرجعي",render:r=><span style={{color:C.green,fontFamily:"monospace"}}>{r.price_ref} ر</span>},
          {key:"turnaround",label:"وقت النتيجة",render:r=><Bd color={C.teal}>{r.turnaround}</Bd>},
          {key:"home_available",label:"منزلي",render:r=>r.home_available?<Bd color={C.green}>🏠 متاح</Bd>:<Bd color={C.muted}>مركز فقط</Bd>},
          {key:"active",label:"الحالة",render:r=><Tog value={r.active} onChange={()=>{}}/>},
        ]} data={data} onRowAction={()=><><Btn3 sm v="primary">تعديل</Btn3><Btn3 sm v="danger">حذف</Btn3></>}/>
      </Card3>
      <Modal3 open={modal} onClose={()=>setModal(false)} title="إضافة نوع أشعة جديد" width={520}>
        <FR label="نوع الأشعة" req><Inp placeholder="مثال: PET Scan" value="" onChange={()=>{}} full/></FR>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <FR label="السعر المرجعي (ر)" req><Inp type="number" value="" onChange={()=>{}} full/></FR>
          <FR label="وقت إصدار النتيجة" req><Inp placeholder="فوري / ساعة / يوم" value="" onChange={()=>{}} full/></FR>
        </div>
        <FR label="متطلبات التحضير"><textarea rows={2} placeholder="تعليمات التحضير للمريض..." style={{width:"100%",background:C.s2,border:`1px solid ${C.border}`,color:C.text,borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",resize:"none",boxSizing:"border-box"}}/></FR>
        <label style={{display:"flex",gap:8,alignItems:"center",cursor:"pointer",marginBottom:16}}><input type="checkbox"/><span style={{color:C.text,fontSize:13}}>🏠 متاح كخدمة منزلية</span></label>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <Btn3 v="ghost" onClick={()=>setModal(false)}>إلغاء</Btn3>
          <Btn3 v="success" icon="✅">إضافة</Btn3>
        </div>
      </Modal3>
    </div>
  );
};

// ── 17. BULK UPLOAD ──────────────────────────────────────────
export const BulkUpload = () => {
  const [step,setStep]=useState(1);
  const [type,setType]=useState("medicines");
  const [uploaded,setUploaded]=useState(false);
  const [dragging,setDragging]=useState(false);
  const types=[{v:"medicines",l:"الأدوية",i:"💊"},{v:"lab_tests",l:"التحاليل",i:"🧪"},{v:"providers",l:"المزودون",i:"🏥"},{v:"insurance",l:"التأمين",i:"🛡️"},{v:"imaging",l:"الأشعة",i:"📡"},{v:"services",l:"الخدمات",i:"⚕️"},{v:"doctors",l:"الأطباء",i:"👨‍⚕️"},{v:"specialties",l:"التخصصات",i:"🩺"},{v:"nursing",l:"التمريض",i:"💉"},{v:"coupons",l:"الكوبونات",i:"🎟️"}];
  return (
    <div>
      <SH title="📤 رفع البيانات بالجملة (Excel)" sub="رفع آلاف السجلات دفعة واحدة"/>
      {/* Steps */}
      <div style={{display:"flex",marginBottom:32,position:"relative"}}>
        {["اختر النوع","حمّل Template","ارفع الملف","مراجعة وتأكيد"].map((s,i)=>(
          <div key={s} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",position:"relative"}}>
            <div style={{width:38,height:38,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:step>i+1?C.green:step===i+1?C.accent:"#1e1f2e",color:step>=i+1?"#000":"#555",fontWeight:900,fontSize:14,zIndex:1}}>{step>i+1?"✓":i+1}</div>
            <div style={{color:step===i+1?C.text:C.muted,fontSize:12,marginTop:8,textAlign:"center"}}>{s}</div>
            {i<3&&<div style={{position:"absolute",top:19,left:"50%",width:"100%",height:2,background:step>i+1?C.green:"#1e1f2e",zIndex:0}}/>}
          </div>
        ))}
      </div>
      {step===1&&<Card3>
        <h3 style={{color:C.text,marginBottom:20}}>ما الذي تريد رفعه؟</h3>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12}}>
          {types.map(t=>(
            <div key={t.v} onClick={()=>setType(t.v)} style={{padding:16,borderRadius:12,border:`2px solid ${type===t.v?C.accent:C.border}`,background:type===t.v?`${C.accent}08`:"transparent",cursor:"pointer",textAlign:"center",transition:"all .2s"}}>
              <div style={{fontSize:28,marginBottom:8}}>{t.i}</div>
              <div style={{color:type===t.v?C.accent:C.muted,fontSize:12}}>{t.l}</div>
            </div>
          ))}
        </div>
        <div style={{marginTop:24,display:"flex",justifyContent:"flex-end"}}><Btn3 v="primary" onClick={()=>setStep(2)}>التالي ←</Btn3></div>
      </Card3>}
      {step===2&&<Card3>
        <h3 style={{color:C.text,marginBottom:16}}>تحميل قالب Excel</h3>
        <div style={{background:C.s2,border:`1px solid ${C.border}`,borderRadius:10,padding:20,marginBottom:20}}>
          <p style={{color:C.muted,fontSize:13,lineHeight:1.8,margin:0}}>حمّل القالب الجاهز واملأ بياناتك. لا تغيّر أسماء الأعمدة ولا تحذف الصفوف الأولى.</p>
        </div>
        <Btn3 v="success" icon="⬇️">تحميل قالب Excel</Btn3>
        <div style={{marginTop:24,display:"flex",gap:8,justifyContent:"flex-end"}}>
          <Btn3 v="ghost" onClick={()=>setStep(1)}>السابق</Btn3>
          <Btn3 v="primary" onClick={()=>setStep(3)}>لقد ملأت القالب ←</Btn3>
        </div>
      </Card3>}
      {step===3&&<Card3>
        <h3 style={{color:C.text,marginBottom:16}}>رفع الملف</h3>
        <div onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);setUploaded(true)}} onClick={()=>setUploaded(true)}
          style={{border:`2px dashed ${dragging?C.accent:uploaded?C.green:C.border}`,borderRadius:16,padding:60,textAlign:"center",background:dragging?`${C.accent}08`:uploaded?`${C.green}08`:"transparent",cursor:"pointer",transition:"all .3s"}}>
          <div style={{fontSize:48,marginBottom:12}}>{uploaded?"✅":"📂"}</div>
          <div style={{color:uploaded?C.green:C.muted,fontSize:15}}>{uploaded?"تم رفع الملف بنجاح":"اسحب وأفلت أو اضغط للاختيار"}</div>
          {uploaded&&<div style={{color:C.muted,fontSize:12,marginTop:8}}>data_file.xlsx — 1,240 سجل</div>}
        </div>
        <div style={{marginTop:24,display:"flex",gap:8,justifyContent:"flex-end"}}>
          <Btn3 v="ghost" onClick={()=>setStep(2)}>السابق</Btn3>
          {uploaded&&<Btn3 v="primary" onClick={()=>setStep(4)}>مراجعة ←</Btn3>}
        </div>
      </Card3>}
      {step===4&&<Card3>
        <h3 style={{color:C.text,marginBottom:16}}>مراجعة وتأكيد الاستيراد</h3>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:20}}>
          {[["✅ صالح","1,198",C.green],["⚠️ تحذيرات","32",C.orange],["❌ أخطاء","10",C.red]].map(([l,v,co])=>(
            <div key={l} style={{background:C.s2,borderRadius:10,padding:16,textAlign:"center",border:`1px solid ${co}33`}}>
              <div style={{color:co,fontSize:22,fontWeight:900,fontFamily:"monospace"}}>{v}</div>
              <div style={{color:C.muted,fontSize:12,marginTop:4}}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{background:`${C.red}0a`,border:`1px solid ${C.red}33`,borderRadius:10,padding:12,marginBottom:8}}>
          <div style={{color:C.red,fontSize:12}}>❌ صف 45: حقل "الاسم العلمي" فارغ</div>
          <div style={{color:C.red,fontSize:12}}>❌ صف 112: سعر غير صالح "-50"</div>
        </div>
        <div style={{background:`${C.orange}0a`,border:`1px solid ${C.orange}33`,borderRadius:10,padding:12,marginBottom:20}}>
          <div style={{color:C.orange,fontSize:12}}>⚠️ صف 78: بديل غير موجود في النظام</div>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <Btn3 v="ghost" onClick={()=>{setStep(1);setUploaded(false);}}>إلغاء</Btn3>
          <Btn3 v="warning">استيراد الصالح فقط (1,198)</Btn3>
          <Btn3 v="success">استيراد الكل مع تجاوز الأخطاء</Btn3>
        </div>
      </Card3>}
    </div>
  );
};

// ── 18. INSURANCE COMPANIES ──────────────────────────────────
export const InsuranceCompanies = () => {
  const [modal,setModal]=useState(false);
  const data=[
    {id:"I001",name:"بوبا العربية",plans:4,providers:89,claims_pending:12,active:true,license:"SAMA-INS-001"},
    {id:"I002",name:"ميدنت",plans:6,providers:134,claims_pending:3,active:true,license:"SAMA-INS-002"},
    {id:"I003",name:"تكافل الراجحي",plans:3,providers:56,claims_pending:8,active:true,license:"SAMA-INS-003"},
    {id:"I004",name:"ميدغلف",plans:5,providers:78,claims_pending:1,active:true,license:"SAMA-INS-004"},
    {id:"I005",name:"ملاذ",plans:2,providers:23,claims_pending:0,active:false,license:"SAMA-INS-005"},
  ];
  return (
    <div>
      <SH title="🛡️ إدارة شركات التأمين" sub={`${data.length} شركات`} actions={[
        <Btn3 key="a" v="success" onClick={()=>setModal(true)} icon="＋">إضافة شركة</Btn3>,
        <Btn3 key="c" v="warning" icon="📋">المطالبات المعلقة</Btn3>,
      ]}/>
      <Card3>
        <Tbl cols={[
          {key:"id",label:"ID",render:r=><span style={{color:C.muted,fontFamily:"monospace",fontSize:11}}>{r.id}</span>},
          {key:"name",label:"الشركة",render:r=><span style={{color:C.text,fontWeight:700}}>{r.name}</span>},
          {key:"license",label:"رقم الترخيص",render:r=><span style={{color:C.muted,fontFamily:"monospace",fontSize:11}}>{r.license}</span>},
          {key:"plans",label:"الخطط",render:r=><Bd color={C.accent}>{r.plans} خطط</Bd>},
          {key:"providers",label:"المزودون",render:r=><Bd color={C.purple}>{r.providers}</Bd>},
          {key:"claims_pending",label:"مطالبات معلقة",render:r=><Bd color={r.claims_pending>5?C.red:r.claims_pending>0?C.orange:C.green}>{r.claims_pending}</Bd>},
          {key:"active",label:"الحالة",render:r=><Tog value={r.active} onChange={()=>{}}/>},
        ]} data={data} onRowAction={()=><>
          <Btn3 sm v="primary">الخطط</Btn3>
          <Btn3 sm v="purple">ربط مزودين</Btn3>
          <Btn3 sm v="warning">المطالبات</Btn3>
        </>}/>
      </Card3>
      <Modal3 open={modal} onClose={()=>setModal(false)} title="إضافة شركة تأمين جديدة" width={480}>
        <FR label="اسم الشركة" req><Inp placeholder="بوبا العربية" value="" onChange={()=>{}} full/></FR>
        <FR label="رقم ترخيص SAMA" req><Inp placeholder="SAMA-INS-XXX" value="" onChange={()=>{}} full/></FR>
        <FR label="نوع التغطية"><Sel3 options={["أساسي","معزز","بريميوم","VIP"].map(o=>({v:o,l:o}))} value="" onChange={()=>{}}/></FR>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
          <Btn3 v="ghost" onClick={()=>setModal(false)}>إلغاء</Btn3>
          <Btn3 v="success" icon="✅">إضافة</Btn3>
        </div>
      </Modal3>
    </div>
  );
};

// ── 19. COMMISSIONS ──────────────────────────────────────────
export const CommissionsPage = () => {
  const providers=[
    {id:"P001",name:"مستشفى الرحمة",type:"Hospital",commission:12,revenue:184200,earnings:22104},
    {id:"P002",name:"مختبر الدقة",type:"Lab",commission:8,revenue:67800,earnings:5424},
    {id:"P003",name:"صيدلية النهدي",type:"Pharmacy",commission:5,revenue:98400,earnings:4920},
    {id:"P004",name:"مركز النبض للتمريض",type:"Nursing",commission:15,revenue:42000,earnings:6300},
    {id:"P005",name:"مركز الأشعة",type:"Imaging",commission:10,revenue:28000,earnings:2800},
  ];
  return (
    <div>
      <SH title="📊 إدارة العمولات" sub="تعديل نسب العمولة لكل مزود" actions={[<Btn3 key="s" v="success" icon="💾">حفظ جميع التغييرات</Btn3>]}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:20}}>
        <StatCard3 label="إجمالي العمولات (شهري)" value="41,548 ر" color={C.green} icon="💰"/>
        <StatCard3 label="متوسط نسبة العمولة" value="9.2%" color={C.accent} icon="📊"/>
        <StatCard3 label="أعلى عمولة" value="مركز النبض 15%" color={C.purple} icon="🏆"/>
      </div>
      <Card3>
        <Tbl cols={[
          {key:"name",label:"المزود",render:r=><span style={{color:C.text,fontWeight:700}}>{r.name}</span>},
          {key:"type",label:"النوع",render:r=><Bd color={C.orange}>{r.type}</Bd>},
          {key:"revenue",label:"الإيرادات (شهري)",render:r=><span style={{color:C.text,fontFamily:"monospace"}}>{r.revenue.toLocaleString()} ر</span>},
          {key:"commission",label:"العمولة (%)",render:r=>(
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <input type="number" defaultValue={r.commission} style={{width:70,background:C.s2,border:`1px solid ${C.border}`,color:C.green,borderRadius:6,padding:"4px 8px",fontSize:13,fontFamily:"monospace",textAlign:"center",outline:"none"}}/>
              <span style={{color:C.muted}}>%</span>
            </div>
          )},
          {key:"earnings",label:"أرباح المنصة",render:r=><span style={{color:C.green,fontFamily:"monospace",fontWeight:700}}>{r.earnings.toLocaleString()} ر</span>},
        ]} data={providers} onRowAction={()=><Btn3 sm v="success" icon="💾">حفظ</Btn3>}/>
      </Card3>
    </div>
  );
};

// ── 20. REFUNDS ──────────────────────────────────────────────
export const RefundsPage = () => {
  const [modal,setModal]=useState(false);
  const data=[
    {id:"RF001",patient:"أحمد الزهراني",order:"ORD-8800",amount:180,reason:"إلغاء قبل الموعد",status:"pending",date:"2025-05-27",method:"wallet"},
    {id:"RF002",patient:"سارة العتيبي",order:"ORD-8790",amount:95,reason:"خطأ في الفاتورة",status:"approved",date:"2025-05-26",method:"visa"},
    {id:"RF003",patient:"فاطمة الدوسري",order:"ORD-8750",amount:320,reason:"جودة الخدمة",status:"rejected",date:"2025-05-25",method:"mada"},
  ];
  return (
    <div>
      <SH title="↩️ المبالغ المستردة" sub={`${data.length} طلبات`} actions={[
        <Btn3 key="n" v="warning" onClick={()=>setModal(true)} icon="＋">رد مبلغ جديد</Btn3>,
        <Btn3 key="e" v="ghost" icon="📤">تصدير</Btn3>,
      ]}/>
      <Card3>
        <Tbl cols={[
          {key:"id",label:"ID",render:r=><span style={{color:C.muted,fontFamily:"monospace",fontSize:11}}>{r.id}</span>},
          {key:"patient",label:"المريض"},{key:"order",label:"الطلب",render:r=><Bd color={C.accent}>{r.order}</Bd>},
          {key:"amount",label:"المبلغ",render:r=><span style={{color:C.orange,fontFamily:"monospace",fontWeight:700}}>{r.amount} ر</span>},
          {key:"reason",label:"السبب",render:r=><span style={{color:C.muted,fontSize:12}}>{r.reason}</span>},
          {key:"method",label:"طريقة الرد",render:r=><Bd color={C.teal}>{r.method}</Bd>},
          {key:"status",label:"الحالة",render:r=><Bd color={r.status==="approved"?C.green:r.status==="pending"?C.orange:C.red}>{r.status==="approved"?"موافق ✅":r.status==="pending"?"انتظار":"مرفوض ❌"}</Bd>},
          {key:"date",label:"التاريخ"},
        ]} data={data} onRowAction={r=><>
          {r.status==="pending"&&<><Btn3 sm v="success">موافقة</Btn3><Btn3 sm v="danger">رفض</Btn3></>}
          <Btn3 sm v="ghost">تفاصيل</Btn3>
        </>}/>
      </Card3>
      <Modal3 open={modal} onClose={()=>setModal(false)} title="إصدار رد مبلغ جديد" width={460}>
        <FR label="المريض / رقم الطلب" req><Inp placeholder="ابحث بالاسم أو رقم الطلب" value="" onChange={()=>{}} full/></FR>
        <FR label="المبلغ (ر)" req><Inp type="number" placeholder="0.00" value="" onChange={()=>{}} full/></FR>
        <FR label="سبب الرد" req><Sel3 options={["اختر السبب","إلغاء المريض","خطأ في الفاتورة","جودة الخدمة","قرار إداري","خطأ في الطلب"].map(o=>({v:o,l:o}))} value="" onChange={()=>{}}/></FR>
        <FR label="وجهة الرد" req><Sel3 options={["المحفظة الرقمية","البطاقة الأصلية","تحويل بنكي"].map(o=>({v:o,l:o}))} value="" onChange={()=>{}}/></FR>
        <FR label="ملاحظة"><Inp placeholder="ملاحظة اختيارية" value="" onChange={()=>{}} full/></FR>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
          <Btn3 v="ghost" onClick={()=>setModal(false)}>إلغاء</Btn3>
          <Btn3 v="warning" icon="↩️">إصدار الرد</Btn3>
        </div>
      </Modal3>
    </div>
  );
};

// ── 21. COUPONS & OFFERS ─────────────────────────────────────
export const CouponsPage = () => {
  const [modal,setModal]=useState(false);
  const data=[
    {id:"CPN001",code:"NABDAH20",discount:20,type:"percent",min_order:100,uses:142,max_uses:500,expiry:"2025-12-31",active:true,applicable:"all"},
    {id:"CPN002",code:"LAB50",discount:50,type:"fixed",min_order:150,uses:89,max_uses:200,expiry:"2025-08-01",active:true,applicable:"lab_only"},
    {id:"CPN003",code:"NURSE30",discount:30,type:"percent",min_order:200,uses:201,max_uses:200,expiry:"2025-06-30",active:false,applicable:"nursing_only"},
    {id:"CPN004",code:"WELCOME100",discount:100,type:"fixed",min_order:300,uses:0,max_uses:1000,expiry:"2025-12-31",active:true,applicable:"new_users"},
  ];
  return (
    <div>
      <SH title="🎟️ الكوبونات والعروض" sub={`${data.length} كوبونات`} actions={[
        <Btn3 key="a" v="success" onClick={()=>setModal(true)} icon="＋">كوبون جديد</Btn3>,
        <Btn3 key="r" v="ghost" icon="📊">تقرير الاستخدام</Btn3>,
      ]}/>
      <Card3>
        <Tbl cols={[
          {key:"code",label:"الكود",render:r=><span style={{color:C.accent,fontFamily:"monospace",fontWeight:700,fontSize:14}}>{r.code}</span>},
          {key:"discount",label:"الخصم",render:r=><Bd color={C.green}>{r.discount}{r.type==="percent"?"%":" ر"}</Bd>},
          {key:"min_order",label:"أدنى طلب",render:r=><span style={{color:C.muted,fontFamily:"monospace"}}>{r.min_order} ر</span>},
          {key:"uses",label:"الاستخدام",render:r=>(
            <div>
              <div style={{fontSize:12,fontFamily:"monospace",color:C.text}}>{r.uses}/{r.max_uses}</div>
              <div style={{width:80,height:5,background:C.border,borderRadius:3,marginTop:3}}>
                <div style={{width:`${Math.min(r.uses/r.max_uses*100,100)}%`,height:"100%",background:r.uses>=r.max_uses?C.red:C.green,borderRadius:3}}/>
              </div>
            </div>
          )},
          {key:"applicable",label:"يُطبَّق على",render:r=><Bd color={C.purple}>{r.applicable}</Bd>},
          {key:"expiry",label:"الانتهاء",render:r=><Bd color={new Date(r.expiry)<new Date()?C.red:C.muted}>{r.expiry}</Bd>},
          {key:"active",label:"الحالة",render:r=><Tog value={r.active} onChange={()=>{}}/>},
        ]} data={data} onRowAction={()=><><Btn3 sm v="primary">تعديل</Btn3><Btn3 sm v="ghost">المستخدمون</Btn3><Btn3 sm v="danger">حذف</Btn3></>}/>
      </Card3>
      <Modal3 open={modal} onClose={()=>setModal(false)} title="كوبون خصم جديد" width={520}>
        <FR label="كود الكوبون" req><Inp placeholder="WELCOME20" value="" onChange={()=>{}} full/></FR>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <FR label="قيمة الخصم" req><Inp type="number" placeholder="20" value="" onChange={()=>{}} full/></FR>
          <FR label="نوع الخصم" req><Sel3 options={["نسبة مئوية %","مبلغ ثابت ر"].map(o=>({v:o,l:o}))} value="" onChange={()=>{}}/></FR>
          <FR label="أدنى قيمة طلب (ر)"><Inp type="number" placeholder="100" value="" onChange={()=>{}} full/></FR>
          <FR label="أقصى عدد استخدامات"><Inp type="number" placeholder="500" value="" onChange={()=>{}} full/></FR>
          <FR label="تاريخ الانتهاء" req><Inp type="date" value="" onChange={()=>{}} full/></FR>
          <FR label="يُطبَّق على"><Sel3 options={["الكل","مرضى جدد","Lab فقط","Nursing فقط","Pharmacy فقط"].map(o=>({v:o,l:o}))} value="" onChange={()=>{}}/></FR>
        </div>
        <FR label="شروط الاستخدام"><textarea rows={2} placeholder="شروط وقيود الكوبون..." style={{width:"100%",background:C.s2,border:`1px solid ${C.border}`,color:C.text,borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",resize:"none",boxSizing:"border-box"}}/></FR>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
          <Btn3 v="ghost" onClick={()=>setModal(false)}>إلغاء</Btn3>
          <Btn3 v="success" icon="🎟️">إنشاء الكوبون</Btn3>
        </div>
      </Modal3>
    </div>
  );
};

// ── 22. CONTRACTS ────────────────────────────────────────────
export const ContractsPage = () => {
  const [modal,setModal]=useState(false);
  const data=[
    {id:"CT001",provider:"مستشفى الرحمة",start:"2025-01-01",end:"2026-01-01",value:500000,status:"active",commission:12,days_left:215},
    {id:"CT002",provider:"عيادة الشفاء",start:"2024-09-15",end:"2025-09-15",value:120000,status:"expiring",commission:10,days_left:108},
    {id:"CT003",provider:"صيدلية الأمل",start:"2024-07-01",end:"2025-07-01",value:60000,status:"expiring",commission:5,days_left:32},
    {id:"CT004",provider:"مركز الأشعة",start:"2024-01-01",end:"2025-01-01",value:80000,status:"expired",commission:10,days_left:-148},
  ];
  return (
    <div>
      <SH title="📄 إدارة العقود" sub={`${data.length} عقود`} actions={[
        <Btn3 key="a" v="success" onClick={()=>setModal(true)} icon="＋">عقد جديد</Btn3>,
        <Btn3 key="e" v="ghost" icon="📤">تصدير</Btn3>,
      ]}/>
      <Card3>
        <Tbl cols={[
          {key:"id",label:"ID",render:r=><span style={{color:C.muted,fontFamily:"monospace",fontSize:11}}>{r.id}</span>},
          {key:"provider",label:"المزود",render:r=><span style={{color:C.text,fontWeight:700}}>{r.provider}</span>},
          {key:"start",label:"البداية",render:r=><Bd color={C.accent}>{r.start}</Bd>},
          {key:"end",label:"النهاية",render:r=><Bd color={r.status==="expired"?C.red:r.status==="expiring"?C.orange:C.muted}>{r.end}</Bd>},
          {key:"value",label:"القيمة",render:r=><span style={{color:C.green,fontFamily:"monospace"}}>{r.value.toLocaleString()} ر</span>},
          {key:"commission",label:"العمولة",render:r=><Bd color={C.purple}>{r.commission}%</Bd>},
          {key:"days_left",label:"الأيام المتبقية",render:r=><span style={{color:r.days_left<0?C.red:r.days_left<60?C.orange:C.green,fontFamily:"monospace",fontWeight:700}}>{r.days_left<0?`منتهي منذ ${Math.abs(r.days_left)}د`:`${r.days_left} يوم`}</span>},
          {key:"status",label:"الحالة",render:r=><Bd color={r.status==="active"?C.green:r.status==="expiring"?C.orange:C.red}>{r.status==="active"?"ساري":r.status==="expiring"?"ينتهي قريباً":"منتهي ❌"}</Bd>},
        ]} data={data} onRowAction={r=><>
          <Btn3 sm v="primary">تجديد</Btn3>
          <Btn3 sm v="ghost">PDF</Btn3>
          {r.status!=="expired"&&<Btn3 sm v="danger">إنهاء</Btn3>}
        </>}/>
      </Card3>
      <Modal3 open={modal} onClose={()=>setModal(false)} title="عقد جديد" width={520}>
        <FR label="المزود" req><Sel3 options={["اختر مزوداً","مستشفى الرحمة","مختبر الدقة","صيدلية النهدي","مركز النبض"].map(o=>({v:o,l:o}))} value="" onChange={()=>{}}/></FR>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <FR label="تاريخ البداية" req><Inp type="date" value="" onChange={()=>{}} full/></FR>
          <FR label="تاريخ الانتهاء" req><Inp type="date" value="" onChange={()=>{}} full/></FR>
          <FR label="قيمة العقد (ر)" req><Inp type="number" value="" onChange={()=>{}} full/></FR>
          <FR label="نسبة العمولة %" req><Inp type="number" value="" onChange={()=>{}} full/></FR>
        </div>
        <FR label="شروط خاصة"><textarea rows={3} placeholder="أي شروط إضافية..." style={{width:"100%",background:C.s2,border:`1px solid ${C.border}`,color:C.text,borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",resize:"none",boxSizing:"border-box"}}/></FR>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
          <Btn3 v="ghost" onClick={()=>setModal(false)}>إلغاء</Btn3>
          <Btn3 v="success" icon="📄">إنشاء العقد</Btn3>
        </div>
      </Modal3>
    </div>
  );
};

// ── 23. PROVIDER DOCS / KYC ──────────────────────────────────
export const ProviderDocs = () => {
  const data=[
    {id:"P001",name:"مستشفى الرحمة",type:"Hospital",docs:{cr:"approved",scfhs:null,license:"approved",iban:"approved",photos:"approved"},missing:0},
    {id:"P002",name:"د. سارة العمري",type:"Doctor",docs:{cr:null,scfhs:"approved",license:"approved",iban:"approved",photos:"approved"},missing:1},
    {id:"P003",name:"مختبر الدقة",type:"Lab",docs:{cr:"approved",scfhs:null,license:"approved",iban:"pending",photos:"approved"},missing:2},
    {id:"P004",name:"صيدلية النهدي",type:"Pharmacy",docs:{cr:"approved",scfhs:null,license:"approved",iban:"approved",photos:"approved"},missing:0},
  ];
  const dL={cr:"السجل التجاري CR",scfhs:"ترخيص SCFHS",license:"الترخيص الطبي",iban:"IBAN البنكي",photos:"صور المنشأة"};
  const dC={approved:C.green,pending:C.orange,rejected:C.red,null:C.red};
  return (
    <div>
      <SH title="🗂️ وثائق وشهادات المزودين (KYC)" sub="مراجعة الوثائق الرسمية لجميع المزودين" actions={[<Btn3 key="r" v="primary" icon="🔄">تحديث</Btn3>]}/>
      <Card3>
        {data.map(p=>(
          <div key={p.id} style={{padding:"16px 0",borderBottom:`1px solid ${C.border}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
              <div>
                <div style={{color:C.text,fontWeight:700,fontSize:14}}>{p.name}</div>
                <div style={{color:C.muted,fontSize:12,marginTop:2}}>{p.type}</div>
              </div>
              {p.missing>0
                ? <Bd color={C.red}>⚠️ {p.missing} وثيقة ناقصة</Bd>
                : <Bd color={C.green}>✅ مكتمل</Bd>
              }
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
              {Object.entries(p.docs).map(([key,status])=>(
                <div key={key} style={{display:"flex",gap:4,alignItems:"center",background:C.s2,borderRadius:8,padding:"5px 10px"}}>
                  <span style={{color:C.muted,fontSize:11}}>{dL[key]}:</span>
                  <Bd color={status?dC[status]:C.red}>{status==="approved"?"✅":status==="pending"?"⏳ انتظار":status===null?"❌ مفقود":"مرفوض"}</Bd>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:6}}>
              <Btn3 sm v="primary">عرض الوثائق</Btn3>
              {p.missing>0&&<Btn3 sm v="warning">طلب الوثائق الناقصة</Btn3>}
            </div>
          </div>
        ))}
      </Card3>
    </div>
  );
};

// ── 24. SLA MONITOR ──────────────────────────────────────────
export const SLAMonitor = () => {
  const providers=[
    {id:"P001",name:"مستشفى الرحمة",type:"Hospital",sla:98,response_time:"3.2 د",completion_rate:99,cancellations:12,orders:1240},
    {id:"P003",name:"مختبر الدقة",type:"Lab",sla:96,response_time:"4.1 د",completion_rate:97,cancellations:28,orders:920},
    {id:"P004",name:"صيدلية النهدي",type:"Pharmacy",sla:92,response_time:"5.8 د",completion_rate:94,cancellations:45,orders:2100},
    {id:"P005",name:"مركز النبض",type:"Nursing",sla:99,response_time:"2.8 د",completion_rate:100,cancellations:4,orders:340},
    {id:"P006",name:"مركز الأشعة",type:"Imaging",sla:71,response_time:"12.4 د",completion_rate:78,cancellations:89,orders:180},
  ];
  return (
    <div>
      <SH title="📊 مراقبة مستوى الخدمة (SLA)" sub="تتبع أداء والتزام المزودين" actions={[<Btn3 key="e" v="ghost" icon="📊">تصدير تقرير</Btn3>]}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:20}}>
        <StatCard3 label="مزودون SLA > 95%" value={providers.filter(p=>p.sla>=95).length} color={C.green} icon="✅"/>
        <StatCard3 label="SLA بين 80-95%" value={providers.filter(p=>p.sla>=80&&p.sla<95).length} color={C.orange} icon="⚠️"/>
        <StatCard3 label="SLA < 80% (خطر)" value={providers.filter(p=>p.sla<80).length} color={C.red} icon="❌"/>
      </div>
      <Card3>
        <Tbl cols={[
          {key:"name",label:"المزود",render:r=><span style={{color:C.text,fontWeight:700}}>{r.name}</span>},
          {key:"type",label:"النوع",render:r=><Bd color={C.orange}>{r.type}</Bd>},
          {key:"sla",label:"نسبة SLA",render:r=>(
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              <div style={{width:80,height:8,background:C.border,borderRadius:4}}>
                <div style={{width:`${r.sla}%`,height:"100%",background:r.sla>=95?C.green:r.sla>=80?C.orange:C.red,borderRadius:4}}/>
              </div>
              <span style={{color:r.sla>=95?C.green:r.sla>=80?C.orange:C.red,fontFamily:"monospace",fontWeight:700}}>{r.sla}%</span>
            </div>
          )},
          {key:"response_time",label:"وقت الاستجابة",render:r=><Bd color={C.teal}>{r.response_time}</Bd>},
          {key:"completion_rate",label:"معدل الإتمام",render:r=><span style={{color:C.text,fontFamily:"monospace"}}>{r.completion_rate}%</span>},
          {key:"cancellations",label:"الإلغاءات",render:r=><Bd color={r.cancellations>50?C.red:C.muted}>{r.cancellations}</Bd>},
          {key:"orders",label:"الطلبات",render:r=><Bd color={C.accent}>{r.orders}</Bd>},
        ]} data={providers} onRowAction={r=><>
          <Btn3 sm v="primary">تفاصيل</Btn3>
          {r.sla<80&&<Btn3 sm v="warning">تحذير رسمي</Btn3>}
          {r.sla<70&&<Btn3 sm v="danger">إجراء تأديبي</Btn3>}
        </>}/>
      </Card3>
    </div>
  );
};

// ── 25. SHIFTS & SCHEDULES ───────────────────────────────────
export const ShiftsSchedules = () => {
  const [modal,setModal]=useState(false);
  const data=[
    {id:"SH001",provider:"مستشفى الرحمة",day:"السبت",start:"08:00",end:"20:00",capacity:30,booked:24,service_type:"Clinic"},
    {id:"SH002",provider:"مستشفى الرحمة",day:"الأحد",start:"08:00",end:"20:00",capacity:30,booked:18,service_type:"Clinic"},
    {id:"SH003",provider:"عيادة الشفاء",day:"السبت",start:"09:00",end:"18:00",capacity:15,booked:15,service_type:"Clinic"},
    {id:"SH004",provider:"مختبر الدقة",day:"السبت",start:"07:00",end:"22:00",capacity:50,booked:31,service_type:"Lab"},
    {id:"SH005",provider:"مركز النبض",day:"الأحد",start:"00:00",end:"23:59",capacity:20,booked:8,service_type:"Nursing"},
  ];
  return (
    <div>
      <SH title="🗓️ الجداول والمناوبات" sub="إدارة جداول عمل المزودين" actions={[
        <Btn3 key="a" v="success" onClick={()=>setModal(true)} icon="＋">إضافة مناوبة</Btn3>,
      ]}/>
      <Card3>
        <Tbl cols={[
          {key:"id",label:"ID",render:r=><span style={{color:C.muted,fontFamily:"monospace",fontSize:11}}>{r.id}</span>},
          {key:"provider",label:"المزود",render:r=><span style={{color:C.text,fontWeight:700}}>{r.provider}</span>},
          {key:"service_type",label:"الخدمة",render:r=><Bd color={C.accent}>{r.service_type}</Bd>},
          {key:"day",label:"اليوم"},{key:"start",label:"البداية",render:r=><Bd color={C.green}>{r.start}</Bd>},
          {key:"end",label:"النهاية",render:r=><Bd color={C.orange}>{r.end}</Bd>},
          {key:"capacity",label:"الطاقة",render:r=>(
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <span style={{fontFamily:"monospace",color:C.text}}>{r.booked}/{r.capacity}</span>
              <div style={{width:60,height:6,background:C.border,borderRadius:3}}>
                <div style={{width:`${Math.min(r.booked/r.capacity*100,100)}%`,height:"100%",background:r.booked>=r.capacity?C.red:r.booked/r.capacity>=0.8?C.orange:C.green,borderRadius:3}}/>
              </div>
            </div>
          )},
        ]} data={data} onRowAction={()=><><Btn3 sm v="primary">تعديل</Btn3><Btn3 sm v="danger">حذف</Btn3></>}/>
      </Card3>
      <Modal3 open={modal} onClose={()=>setModal(false)} title="إضافة مناوبة جديدة" width={480}>
        <FR label="المزود" req><Sel3 options={["اختر","مستشفى الرحمة","عيادة الشفاء","مختبر الدقة","مركز النبض"].map(o=>({v:o,l:o}))} value="" onChange={()=>{}}/></FR>
        <FR label="نوع الخدمة"><Sel3 options={["Clinic","Lab","Nursing","Pharmacy","Imaging"].map(o=>({v:o,l:o}))} value="" onChange={()=>{}}/></FR>
        <FR label="اليوم"><Sel3 options={["السبت","الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة"].map(o=>({v:o,l:o}))} value="" onChange={()=>{}}/></FR>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <FR label="وقت البداية"><Inp type="time" value="" onChange={()=>{}} full/></FR>
          <FR label="وقت النهاية"><Inp type="time" value="" onChange={()=>{}} full/></FR>
          <FR label="الطاقة الاستيعابية"><Inp type="number" placeholder="30" value="" onChange={()=>{}} full/></FR>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
          <Btn3 v="ghost" onClick={()=>setModal(false)}>إلغاء</Btn3>
          <Btn3 v="success" icon="✅">إضافة المناوبة</Btn3>
        </div>
      </Modal3>
    </div>
  );
};

// ── 26. PROVIDER SCORECARD ───────────────────────────────────
export const ProviderScorecard = () => {
  const providers=[
    {id:"P001",name:"مستشفى الرحمة",type:"Hospital",rating:4.8,sla:98,orders:1240,revenue:184200,completion:99,cancellations:12,response:"3.2 د",score:96},
    {id:"P003",name:"مختبر الدقة",type:"Lab",rating:4.7,sla:96,orders:920,revenue:67800,completion:97,cancellations:28,response:"4.1 د",score:91},
    {id:"P004",name:"صيدلية النهدي",type:"Pharmacy",rating:4.5,sla:92,orders:2100,revenue:98400,completion:94,cancellations:45,response:"5.8 د",score:85},
    {id:"P005",name:"مركز النبض",type:"Nursing",rating:4.9,sla:99,orders:340,revenue:42000,completion:100,cancellations:4,response:"2.8 د",score:98},
    {id:"P006",name:"مركز الأشعة",type:"Imaging",rating:3.8,sla:71,orders:180,revenue:28000,completion:78,cancellations:89,response:"12.4 د",score:54},
  ];
  const scoreColor = (s) => s>=90?C.green:s>=70?C.orange:C.red;
  return (
    <div>
      <SH title="🏆 تقييم أداء المزودين" sub="تقرير شامل للأداء الكلي لكل مزود" actions={[<Btn3 key="e" v="ghost" icon="📊">تصدير</Btn3>]}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16}}>
        {providers.sort((a,b)=>b.score-a.score).map((p,rank)=>(
          <Card3 key={p.id} accent={scoreColor(p.score)}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
              <div>
                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
                  <span style={{color:rank===0?C.gold:rank===1?C.muted:rank===2?C.orange:C.dim,fontSize:20}}>
                    {rank===0?"🥇":rank===1?"🥈":rank===2?"🥉":`#${rank+1}`}
                  </span>
                  <span style={{color:C.text,fontWeight:700,fontSize:14}}>{p.name}</span>
                </div>
                <Bd color={C.orange}>{p.type}</Bd>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{color:scoreColor(p.score),fontSize:28,fontWeight:900,fontFamily:"monospace"}}>{p.score}</div>
                <div style={{color:C.muted,fontSize:10}}>نقاط الأداء</div>
              </div>
            </div>
            {[["⭐ التقييم",`${p.rating}/5`,C.gold],["📊 SLA",`${p.sla}%`,p.sla>=95?C.green:C.orange],["📦 الطلبات",p.orders,C.accent],["💰 الإيرادات",`${(p.revenue/1000).toFixed(0)}k ر`,C.green],["⚡ الاستجابة",p.response,C.teal],["❌ الإلغاءات",p.cancellations,p.cancellations>50?C.red:C.muted]].map(([l,v,co])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${C.border}`}}>
                <span style={{color:C.muted,fontSize:12}}>{l}</span>
                <span style={{color:co,fontFamily:"monospace",fontWeight:700,fontSize:12}}>{v}</span>
              </div>
            ))}
            <div style={{display:"flex",gap:8,marginTop:14}}>
              <Btn3 sm v="primary" style={{flex:1,justifyContent:"center"}}>تقرير كامل</Btn3>
              {p.score<70&&<Btn3 sm v="warning">تحذير</Btn3>}
            </div>
          </Card3>
        ))}
      </div>
    </div>
  );
};

// ── 27. BANNERS & ADS ────────────────────────────────────────
export const BannersAds = () => {
  const [modal,setModal]=useState(false);
  const [banners,setBanners]=useState([
    {id:"BN001",title:"عروض رمضان 30%",position:"home_top",status:true,clicks:1420,impressions:28400,ctr:"5%",start:"2025-05-01",end:"2025-06-01",emoji:"🎉"},
    {id:"BN002",title:"خدمة منزلية جديدة",position:"home_middle",status:true,clicks:890,impressions:18200,ctr:"4.9%",start:"2025-05-15",end:"2025-07-01",emoji:"🏠"},
    {id:"BN003",title:"تحاليل بسعر خاص",position:"lab_page",status:false,clicks:320,impressions:9800,ctr:"3.3%",start:"2025-04-01",end:"2025-05-01",emoji:"🧪"},
    {id:"BN004",title:"استشارة أونلاين مجانية",position:"doctor_page",status:true,clicks:2100,impressions:42000,ctr:"5%",start:"2025-05-20",end:"2025-06-30",emoji:"🎥"},
  ]);
  const posL={home_top:"الرئيسية — أعلى",home_middle:"الرئيسية — وسط",lab_page:"صفحة التحاليل",doctor_page:"صفحة الأطباء",pharmacy_page:"صفحة الصيدلية"};
  return (
    <div>
      <SH title="🖼️ البانرات والإعلانات" sub={`${banners.length} بانرات`} actions={[
        <Btn3 key="a" v="success" onClick={()=>setModal(true)} icon="＋">بانر جديد</Btn3>,
        <Btn3 key="e" v="ghost" icon="📊">تقرير الأداء</Btn3>,
      ]}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16,marginBottom:20}}>
        {banners.map(b=>(
          <Card3 key={b.id} accent={b.status?C.green:C.border}>
            <div style={{height:80,background:`linear-gradient(135deg,${C.bg},${C.s2})`,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:40,marginBottom:12}}>{b.emoji}</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <span style={{color:C.text,fontWeight:700,fontSize:14}}>{b.title}</span>
              <Tog value={b.status} onChange={v=>setBanners(prev=>prev.map(bn=>bn.id===b.id?{...bn,status:v}:bn))}/>
            </div>
            <div style={{color:C.muted,fontSize:12,marginBottom:6}}>📍 {posL[b.position]||b.position}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
              {[["👆 نقرات",b.clicks,C.accent],["👁️ مشاهدات",b.impressions,C.purple],["📊 CTR",b.ctr,C.green]].map(([l,v,co])=>(
                <div key={l} style={{background:C.s2,borderRadius:6,padding:"6px 8px",textAlign:"center"}}>
                  <div style={{color:co,fontSize:13,fontWeight:700,fontFamily:"monospace"}}>{typeof v==="number"?v.toLocaleString():v}</div>
                  <div style={{color:C.muted,fontSize:10,marginTop:2}}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{color:C.muted,fontSize:11,marginBottom:10}}>{b.start} → {b.end}</div>
            <div style={{display:"flex",gap:6}}>
              <Btn3 sm v="primary" style={{flex:1,justifyContent:"center"}}>تعديل</Btn3>
              <Btn3 sm v="danger">حذف</Btn3>
            </div>
          </Card3>
        ))}
      </div>
      <Modal3 open={modal} onClose={()=>setModal(false)} title="بانر إعلاني جديد" width={520}>
        <FR label="عنوان البانر" req><Inp placeholder="عروض رمضان 30%" value="" onChange={()=>{}} full/></FR>
        <FR label="الموقع" req><Sel3 options={Object.entries(posL).map(([v,l])=>({v,l}))} value="" onChange={()=>{}}/></FR>
        <FR label="رابط الصورة" req><Inp placeholder="https://..." value="" onChange={()=>{}} full/></FR>
        <FR label="الرابط عند الضغط"><Inp placeholder="https://... (اختياري)" value="" onChange={()=>{}} full/></FR>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <FR label="تاريخ البداية" req><Inp type="date" value="" onChange={()=>{}} full/></FR>
          <FR label="تاريخ الانتهاء" req><Inp type="date" value="" onChange={()=>{}} full/></FR>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
          <Btn3 v="ghost" onClick={()=>setModal(false)}>إلغاء</Btn3>
          <Btn3 v="success" icon="🖼️">نشر البانر</Btn3>
        </div>
      </Modal3>
    </div>
  );
};

// ── 28. REVIEWS & RATINGS ────────────────────────────────────
export const ReviewsRatings = () => {
  const [filter,setFilter]=useState("all");
  const reviews=[
    {id:"R001",patient:"أحمد الزهراني",provider:"مستشفى الرحمة",rating:5,comment:"خدمة ممتازة وسريعة جداً — أنصح بها",status:"published",date:"2025-05-26",flagged:false},
    {id:"R002",patient:"سارة العتيبي",provider:"عيادة الشفاء",rating:2,comment:"تأخر كبير في الوصول ولم يُعتذر",status:"published",date:"2025-05-25",flagged:false},
    {id:"R003",patient:"مجهول",provider:"صيدلية الأمل",rating:1,comment:"محتوى مسيء وكلام غير لائق ####",status:"flagged",date:"2025-05-24",flagged:true},
    {id:"R004",patient:"فاطمة الدوسري",provider:"مختبر الدقة",rating:4,comment:"نتائج دقيقة وسريعة",status:"published",date:"2025-05-23",flagged:false},
    {id:"R005",patient:"خالد المطيري",provider:"مركز النبض",rating:5,comment:"ممرضة محترفة ومتعاونة جداً",status:"published",date:"2025-05-22",flagged:false},
  ];
  const filtered=filter==="all"?reviews:filter==="flagged"?reviews.filter(r=>r.flagged):reviews.filter(r=>!r.flagged);
  return (
    <div>
      <SH title="⭐ التقييمات والمراجعات" sub={`${reviews.length} تقييم — ${reviews.filter(r=>r.flagged).length} مُبلَّغ عنها`} actions={[
        <Btn3 key="f" v="warning" icon="🚩">المُبلَّغ عنها ({reviews.filter(r=>r.flagged).length})</Btn3>,
        <Btn3 key="e" v="ghost" icon="📤">تصدير</Btn3>,
      ]}/>
      <div style={{display:"flex",gap:8,marginBottom:20}}>
        {[{v:"all",l:"الكل"},{v:"clean",l:"✅ نظيفة"},{v:"flagged",l:"🚩 مُبلَّغ عنها"}].map(f=>(
          <button key={f.v} onClick={()=>setFilter(f.v)} style={{padding:"7px 18px",borderRadius:8,fontSize:13,fontFamily:"'Cairo',sans-serif",cursor:"pointer",background:filter===f.v?`${C.accent}22`:"transparent",color:filter===f.v?C.accent:C.muted,border:`1px solid ${filter===f.v?`${C.accent}44`:C.border}`}}>{f.l}</button>
        ))}
      </div>
      <Card3>
        <Tbl cols={[
          {key:"id",label:"ID",render:r=><span style={{color:C.muted,fontFamily:"monospace",fontSize:11}}>{r.id}</span>},
          {key:"patient",label:"المريض"},{key:"provider",label:"المزود"},
          {key:"rating",label:"التقييم",render:r=><span style={{color:C.gold}}>{"⭐".repeat(r.rating)} {r.rating}/5</span>},
          {key:"comment",label:"التعليق",render:r=><span style={{color:r.flagged?C.red:C.text,fontSize:12,maxWidth:240,display:"block",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.comment}</span>},
          {key:"status",label:"الحالة",render:r=><Bd color={r.flagged?C.red:C.green}>{r.flagged?"🚩 مُبلَّغ":"منشور ✅"}</Bd>},
          {key:"date",label:"التاريخ"},
        ]} data={filtered} onRowAction={r=><>
          {r.flagged&&<Btn3 sm v="danger">🗑️ حذف</Btn3>}
          <Btn3 sm v="warning">إخفاء</Btn3>
          {r.flagged&&<Btn3 sm v="success">قبول</Btn3>}
          {!r.flagged&&<Btn3 sm v="ghost">تفاصيل</Btn3>}
        </>}/>
      </Card3>
    </div>
  );
};

// ── 29. ALERT RULES ENGINE ───────────────────────────────────
export const AlertRulesEngine = () => {
  const [modal,setModal]=useState(false);
  const [rules,setRules]=useState([
    {id:"AR001",name:"تنبيه عدم الإسناد",condition:"order_unassigned > 10min",action:"notify_ops + expand_broadcast",active:true,triggered_today:8},
    {id:"AR002",name:"تقييم منخفض",condition:"provider_rating < 3.5",action:"flag_provider + notify_admin",active:true,triggered_today:2},
    {id:"AR003",name:"إلغاءات متكررة",condition:"patient_cancels > 3/day",action:"flag_patient + notify_ops",active:false,triggered_today:0},
    {id:"AR004",name:"إيراد منخفض",condition:"daily_revenue < 20000",action:"alert_finance",active:true,triggered_today:0},
    {id:"AR005",name:"SLA منخفض",condition:"provider_sla < 80%",action:"warning_email + create_task",active:true,triggered_today:1},
    {id:"AR006",name:"نشاط احتيالي",condition:"fraud_score > 0.8",action:"block_user + alert_security",active:true,triggered_today:3},
  ]);
  return (
    <div>
      <SH title="🔔 محرك قواعد التنبيه" sub="أتمتة التنبيهات بناءً على شروط محددة" actions={[
        <Btn3 key="a" v="success" onClick={()=>setModal(true)} icon="＋">قاعدة جديدة</Btn3>,
      ]}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:20}}>
        <StatCard3 label="قواعد نشطة" value={rules.filter(r=>r.active).length} color={C.green} icon="✅"/>
        <StatCard3 label="تنبيهات اليوم" value={rules.reduce((a,r)=>a+r.triggered_today,0)} color={C.accent} icon="🔔"/>
        <StatCard3 label="قواعد موقوفة" value={rules.filter(r=>!r.active).length} color={C.muted} icon="⏸️"/>
      </div>
      <Card3>
        <Tbl cols={[
          {key:"id",label:"ID",render:r=><span style={{color:C.muted,fontFamily:"monospace",fontSize:11}}>{r.id}</span>},
          {key:"name",label:"اسم القاعدة",render:r=><span style={{color:C.text,fontWeight:700}}>{r.name}</span>},
          {key:"condition",label:"الشرط",render:r=><span style={{color:C.teal,fontFamily:"monospace",fontSize:12}}>{r.condition}</span>},
          {key:"action",label:"الإجراء",render:r=><span style={{color:C.purple,fontSize:12}}>{r.action}</span>},
          {key:"triggered_today",label:"أُطلق اليوم",render:r=><Bd color={r.triggered_today>0?C.orange:C.muted}>{r.triggered_today}</Bd>},
          {key:"active",label:"مفعّل",render:r=><Tog value={r.active} onChange={v=>setRules(prev=>prev.map(rl=>rl.id===r.id?{...rl,active:v}:rl))}/>},
        ]} data={rules} onRowAction={()=><><Btn3 sm v="primary">تعديل</Btn3><Btn3 sm v="danger">حذف</Btn3></>}/>
      </Card3>
      <Modal3 open={modal} onClose={()=>setModal(false)} title="قاعدة تنبيه جديدة" width={520}>
        <FR label="اسم القاعدة" req><Inp placeholder="تنبيه عدم الإسناد" value="" onChange={()=>{}} full/></FR>
        <FR label="حدث التشغيل" req><Sel3 options={["order_unassigned","provider_low_sla","patient_cancels","fraud_detected","revenue_low","provider_low_rating","contract_expiry","license_expiry"].map(o=>({v:o,l:o}))} value="" onChange={()=>{}}/></FR>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <FR label="المشغّل (قيمة)"><Inp type="number" placeholder="10" value="" onChange={()=>{}} full/></FR>
          <FR label="الوحدة"><Sel3 options={["دقائق","عدد","نسبة مئوية","ريال","أيام"].map(o=>({v:o,l:o}))} value="" onChange={()=>{}}/></FR>
        </div>
        <FR label="الإجراء عند التشغيل" req><Sel3 options={["notify_ops","notify_admin","notify_finance","flag_provider","flag_patient","block_user","create_task","send_email","expand_broadcast"].map(o=>({v:o,l:o}))} value="" onChange={()=>{}}/></FR>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
          <Btn3 v="ghost" onClick={()=>setModal(false)}>إلغاء</Btn3>
          <Btn3 v="success" icon="✅">حفظ القاعدة</Btn3>
        </div>
      </Modal3>
    </div>
  );
};

// ── 30. MAP & HEATMAP ────────────────────────────────────────
export const MapHeatmap = () => {
  const [filter,setFilter]=useState("all");
  const providers=[
    {id:"P001",name:"مستشفى الرحمة",type:"Hospital",area:"الرياض - الياسمين",available:true,active_orders:12,emoji:"🏥"},
    {id:"P003",name:"مختبر الدقة",type:"Lab",area:"الدمام - الشاطئ",available:true,active_orders:8,emoji:"🧪"},
    {id:"P004",name:"صيدلية النهدي",type:"Pharmacy",area:"الرياض - الياسمين",available:true,active_orders:24,emoji:"💊"},
    {id:"P005",name:"مركز النبض",type:"Nursing",area:"الرياض",available:true,active_orders:3,emoji:"💉"},
    {id:"P002",name:"د. سارة العمري",type:"Doctor",area:"جدة - الحمراء",available:false,active_orders:0,emoji:"👨‍⚕️"},
    {id:"P006",name:"مركز الأشعة",type:"Imaging",area:"جدة - النزهة",available:false,active_orders:0,emoji:"📡"},
  ];
  const cities=[{name:"الرياض",orders:617,providers:180,lat:"24.7",lng:"46.6"},{name:"جدة",orders:360,providers:98,lat:"21.5",lng:"39.2"},{name:"الدمام",orders:154,providers:42,lat:"26.4",lng:"50.1"},{name:"مكة",orders:103,providers:28,lat:"21.4",lng:"39.8"},{name:"المدينة",orders:51,providers:14,lat:"24.5",lng:"39.6"}];
  return (
    <div>
      <SH title="🗺️ الخريطة الحرارية والتوزيع الجغرافي" sub="عرض المزودين والطلبات على الخريطة" actions={[
        <Btn3 key="r" v="primary" icon="🔄">تحديث</Btn3>,
        <Btn3 key="e" v="ghost" icon="📊">تصدير</Btn3>,
      ]}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:20}}>
        {/* Map Simulation */}
        <Card3 style={{minHeight:480}}>
          <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
            {["all","Hospital","Lab","Pharmacy","Nursing","Doctor","Imaging"].map(f=>(
              <button key={f} onClick={()=>setFilter(f)} style={{padding:"5px 14px",borderRadius:8,fontSize:12,fontFamily:"'Cairo',sans-serif",cursor:"pointer",background:filter===f?`${C.accent}22`:"transparent",color:filter===f?C.accent:C.muted,border:`1px solid ${filter===f?`${C.accent}44`:C.border}`}}>{f==="all"?"الكل":f}</button>
            ))}
          </div>
          <div style={{background:`repeating-linear-gradient(0deg,${C.bg} 0,${C.bg} 39px,${C.border} 40px),repeating-linear-gradient(90deg,${C.bg} 0,${C.bg} 39px,${C.border} 40px)`,borderRadius:10,minHeight:380,position:"relative",display:"flex",alignItems:"center",justifyContent:"center",flexWrap:"wrap",gap:20,padding:20}}>
            <style>{`@keyframes mapPulse{0%,100%{box-shadow:0 0 0 0 rgba(0,184,230,.6)}70%{box-shadow:0 0 0 16px transparent}}`}</style>
            {providers.filter(p=>filter==="all"||p.type===filter).map(p=>(
              <div key={p.id} style={{position:"relative",display:"inline-flex",flexDirection:"column",alignItems:"center",gap:4}}>
                <div style={{width:50,height:50,borderRadius:"50%",background:p.available?`${C.accent}33`:`${C.red}33`,border:`2px solid ${p.available?C.accent:C.red}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,cursor:"pointer",animation:p.available&&p.active_orders>0?"mapPulse 2s infinite":undefined}}>
                  {p.emoji}
                </div>
                {p.active_orders>0&&<div style={{position:"absolute",top:-4,right:-4,background:C.accent,color:"#000",borderRadius:"50%",width:18,height:18,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:900}}>{p.active_orders}</div>}
                <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:6,padding:"2px 8px",fontSize:10,color:C.text,whiteSpace:"nowrap",maxWidth:120,overflow:"hidden",textOverflow:"ellipsis"}}>{p.name}</div>
                <Bd color={p.available?C.green:C.red}>{p.available?"متاح":"غير متاح"}</Bd>
              </div>
            ))}
            <div style={{position:"absolute",bottom:10,left:10,color:C.muted,fontSize:11}}>🗺️ خريطة تفاعلية — يتطلب Google Maps API للإنتاج</div>
          </div>
        </Card3>
        {/* City Stats */}
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <Card3>
            <h3 style={{color:C.text,margin:"0 0 14px",fontSize:14,fontWeight:700}}>📊 توزيع الطلبات بالمدن</h3>
            {cities.map(city=>(
              <div key={city.name} style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{color:C.text,fontSize:13,fontWeight:600}}>{city.name}</span>
                  <div style={{display:"flex",gap:8}}>
                    <Bd color={C.accent}>{city.orders} طلب</Bd>
                    <Bd color={C.purple}>{city.providers} مزود</Bd>
                  </div>
                </div>
                <div style={{width:"100%",height:6,background:C.border,borderRadius:3}}>
                  <div style={{width:`${city.orders/617*100}%`,height:"100%",background:`linear-gradient(90deg,${C.accent},${C.purple})`,borderRadius:3}}/>
                </div>
              </div>
            ))}
          </Card3>
          <Card3 accent={C.green}>
            <h3 style={{color:C.green,margin:"0 0 12px",fontSize:14,fontWeight:700}}>🟢 متاحون الآن</h3>
            {providers.filter(p=>p.available).map(p=>(
              <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:`1px solid ${C.border}`}}>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <span style={{fontSize:16}}>{p.emoji}</span>
                  <span style={{color:C.text,fontSize:12}}>{p.name}</span>
                </div>
                <Bd color={p.active_orders>0?C.accent:C.muted}>{p.active_orders} طلب نشط</Bd>
              </div>
            ))}
          </Card3>
          <Card3 accent={C.red}>
            <h3 style={{color:C.red,margin:"0 0 12px",fontSize:14,fontWeight:700}}>🔴 غير متاحين</h3>
            {providers.filter(p=>!p.available).map(p=>(
              <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:`1px solid ${C.border}`}}>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <span style={{fontSize:16}}>{p.emoji}</span>
                  <span style={{color:C.text,fontSize:12}}>{p.name}</span>
                </div>
                <Btn3 sm v="primary">تفعيل قسري</Btn3>
              </div>
            ))}
          </Card3>
        </div>
      </div>
    </div>
  );
};

// ── 31. BROADCAST CONFIG ─────────────────────────────────────
export const BroadcastConfig = () => {
  const [config,setConfig]=useState({radius_1:4,wait_1:3,radius_2:6,wait_2:3,radius_3:8,wait_3:5,admin_notify_on_fail:true,auto_assign_on_timeout:false,max_attempts:3});
  return (
    <div>
      <SH title="📡 إعدادات نظام البرودكاست" sub="تحكم في قواعد وحدود البرودكاست الجغرافي" actions={[<Btn3 key="s" v="success" icon="💾">حفظ الإعدادات</Btn3>]}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
        <Card3>
          <h3 style={{color:C.teal,margin:"0 0 18px",fontSize:15,fontWeight:700}}>📍 مراحل التوسع الجغرافي</h3>
          <div style={{marginBottom:20,padding:14,background:`${C.teal}0a`,border:`1px solid ${C.teal}33`,borderRadius:10}}>
            <div style={{color:C.teal,fontSize:12,fontWeight:700,marginBottom:4}}>كيف يعمل البرودكاست:</div>
            <div style={{color:C.muted,fontSize:12,lineHeight:1.8}}>
              عند إنشاء طلب ← يُرسل للمزودين في النطاق الأول ← إذا لم يقبل أحد خلال المدة ← يتوسع للنطاق الثاني ← وهكذا
            </div>
          </div>
          {[{n:"المرحلة الأولى",r:"radius_1",w:"wait_1"},{n:"المرحلة الثانية",r:"radius_2",w:"wait_2"},{n:"المرحلة الثالثة",r:"radius_3",w:"wait_3"}].map((stage,i)=>(
            <div key={stage.n} style={{display:"flex",gap:12,alignItems:"center",marginBottom:14,padding:12,background:C.s2,borderRadius:10}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:`${[C.green,C.orange,C.red][i]}22`,border:`2px solid ${[C.green,C.orange,C.red][i]}`,display:"flex",alignItems:"center",justifyContent:"center",color:[C.green,C.orange,C.red][i],fontWeight:900,fontSize:14,flexShrink:0}}>{i+1}</div>
              <div style={{flex:1}}>
                <div style={{color:C.text,fontSize:13,fontWeight:600,marginBottom:8}}>{stage.n}</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div>
                    <label style={{display:"block",color:C.muted,fontSize:10,marginBottom:4}}>النطاق (كم)</label>
                    <input type="number" value={config[stage.r]} onChange={e=>setConfig(prev=>({...prev,[stage.r]:e.target.value}))} style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,color:C.teal,borderRadius:6,padding:"5px 8px",fontSize:13,fontFamily:"monospace",outline:"none"}}/>
                  </div>
                  <div>
                    <label style={{display:"block",color:C.muted,fontSize:10,marginBottom:4}}>مدة الانتظار (دقيقة)</label>
                    <input type="number" value={config[stage.w]} onChange={e=>setConfig(prev=>({...prev,[stage.w]:e.target.value}))} style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,color:C.orange,borderRadius:6,padding:"5px 8px",fontSize:13,fontFamily:"monospace",outline:"none"}}/>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </Card3>
        <Card3>
          <h3 style={{color:C.text,margin:"0 0 18px",fontSize:15,fontWeight:700}}>⚙️ إعدادات متقدمة</h3>
          {[{label:"أقصى عدد محاولات برودكاست",key:"max_attempts",type:"number"}].map(f=>(
            <div key={f.key} style={{marginBottom:16}}>
              <label style={{display:"block",color:C.muted,fontSize:11,fontWeight:700,marginBottom:6}}>{f.label}</label>
              <input type={f.type} value={config[f.key]} onChange={e=>setConfig(prev=>({...prev,[f.key]:e.target.value}))} style={{width:"100%",background:C.s2,border:`1px solid ${C.border}`,color:C.text,borderRadius:8,padding:"10px 14px",fontSize:13,fontFamily:"'Cairo',sans-serif",outline:"none",boxSizing:"border-box"}}/>
            </div>
          ))}
          <Divider3/>
          {[{key:"admin_notify_on_fail",label:"إشعار الأدمن عند فشل البرودكاست",desc:"يُرسل تنبيهاً للأدمن عند وصول النطاق الأقصى بدون قبول"},{key:"auto_assign_on_timeout",label:"إسناد تلقائي عند انتهاء المدة",desc:"يُسند الطلب تلقائياً لأقرب مزود حتى لو لم يقبل"}].map(opt=>(
            <div key={opt.key} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"12px 0",borderBottom:`1px solid ${C.border}`}}>
              <div>
                <div style={{color:C.text,fontSize:13,fontWeight:600,marginBottom:4}}>{opt.label}</div>
                <div style={{color:C.muted,fontSize:12,lineHeight:1.5}}>{opt.desc}</div>
              </div>
              <Tog value={config[opt.key]} onChange={v=>setConfig(prev=>({...prev,[opt.key]:v}))}/>
            </div>
          ))}
          <div style={{background:`${C.orange}0a`,border:`1px solid ${C.orange}33`,borderRadius:10,padding:14,marginTop:16}}>
            <div style={{color:C.orange,fontSize:13,fontWeight:700,marginBottom:6}}>📊 إحصائيات البرودكاست اليوم</div>
            {[["طلبات قُبلت في النطاق الأول","84%"],["طلبات احتاجت توسعاً","14%"],["طلبات فشلت","2%"]].map(([l,v])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"4px 0"}}>
                <span style={{color:C.muted,fontSize:12}}>{l}</span>
                <span style={{color:C.orange,fontFamily:"monospace",fontWeight:700}}>{v}</span>
              </div>
            ))}
          </div>
        </Card3>
      </div>
    </div>
  );
};

// ============================================================
// COMPLETE RENDER MAP — أضف هذا لـ renderPage() في Part1
// ============================================================
// استبدل PlaceholderPage في Part1 بهذه الصفحات:
//
// "doctors":           <DoctorsPage />,
// "family-cards":      <FamilyCards />,
// "wallet-tx":         <WalletTx />,
// "blacklist":         <BlacklistPage />,
// "fraud":             <FraudDetection />,
// "orders":            <OrdersPage />,
// "appointments":      <AppointmentsPage />,
// "waitlist":          <WaitlistPage />,
// "referrals":         <ReferralsPage />,
// "chat":              <ChatControl />,
// "pharmacy-orders":   <PharmacyOrders />,
// "lab-results":       <LabResultsMonitor />,
// "complaints":        <ComplaintsPage />,
// "task-manager":      <TaskManager />,
// "services":          <ServicesCatalog />,
// "imaging":           <ImagingServices />,
// "bulk-upload":       <BulkUpload />,
// "insurance":         <InsuranceCompanies />,
// "commissions":       <CommissionsPage />,
// "refunds":           <RefundsPage />,
// "coupons":           <CouponsPage />,
// "contracts":         <ContractsPage />,
// "provider-docs":     <ProviderDocs />,
// "sla-monitor":       <SLAMonitor />,
// "shifts":            <ShiftsSchedules />,
// "scorecard":         <ProviderScorecard />,
// "banners":           <BannersAds />,
// "reviews":           <ReviewsRatings />,
// "alert-rules":       <AlertRulesEngine />,
// "map-heatmap":       <MapHeatmap />,
// "broadcast-config":  <BroadcastConfig />,
