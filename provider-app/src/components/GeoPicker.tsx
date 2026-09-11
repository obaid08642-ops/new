import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { apiFetch } from '../utils/api';

type Opt = { code: string; name_ar: string; name_en: string; parent_code?: string };

export function GeoPicker({ value, onChange, locale = 'ar' }: {
  value?: { region?: string; city?: string; district?: string };
  onChange: (v: { region: string; city: string; district: string }) => void;
  locale?: string;
}) {
  const [regions, setRegions] = useState<Opt[]>([]);
  const [cities, setCities] = useState<Opt[]>([]);
  const [districts, setDistricts] = useState<Opt[]>([]);
  const [region, setRegion] = useState(value?.region || '');
  const [city, setCity] = useState(value?.city || '');
  const [district, setDistrict] = useState(value?.district || '');
  const [open, setOpen] = useState<'region'|'city'|'district'|null>(null);
  const isAr = locale === 'ar';
  const t = (ar:string,en:string)=> isAr?ar:en;

  useEffect(() => {
    apiFetch('/locations/regions').then((d:any)=> setRegions(Array.isArray(d)?d:[])).catch(()=>{});
    apiFetch('/locations/cities').then((d:any)=> setCities(Array.isArray(d)?d:[])).catch(()=>{});
  }, []);
  useEffect(() => {
    if(!city) { setDistricts([]); return; }
    apiFetch(`/locations/districts?city=${encodeURIComponent(city)}`).then((d:any)=> setDistricts(Array.isArray(d)?d:[])).catch(()=>{});
  }, [city]);

  const filteredCities = region ? cities.filter((c:any)=>c.parent_code===region) : cities;
  const display = (code:string, list:Opt[]) => list.find(x=>x.code===code)?.[isAr?'name_ar':'name_en'] || code || t('اختر','Select');

  const PickerModal = ({ opts, onSelect, title }: { opts: Opt[]; onSelect: (c:string)=>void; title:string }) => (
    <Modal visible={!!open} transparent animationType="slide">
      <TouchableOpacity style={s.backdrop} onPress={()=>setOpen(null)} activeOpacity={1}>
        <View style={s.sheet}>
          <Text style={s.sheetTitle}>{title}</Text>
          <ScrollView style={{maxHeight:400}}>
            {opts.map(o=> (
              <TouchableOpacity key={o.code} style={s.row} onPress={()=>{onSelect(o.code); setOpen(null);}}>
                <Text style={s.rowText}>{isAr?o.name_ar:o.name_en}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <View style={{gap:8}}>
      <TouchableOpacity style={s.input} onPress={()=>setOpen('region')}><Text style={s.inputText}>{display(region, regions) || t('المنطقة','Region')}</Text></TouchableOpacity>
      <TouchableOpacity style={s.input} onPress={()=>region&&setOpen('city')}><Text style={[s.inputText, !region&&{color:'#999'}]}>{display(city, filteredCities) || t('المدينة','City')}</Text></TouchableOpacity>
      <TouchableOpacity style={s.input} onPress={()=>city&&setOpen('district')}><Text style={[s.inputText, !city&&{color:'#999'}]}>{display(district, districts) || t('الحي','District')}</Text></TouchableOpacity>
      {open==='region' && <PickerModal opts={regions} title={t('اختر المنطقة','Select region')} onSelect={c=>{setRegion(c); setCity(''); setDistrict(''); onChange({region:c, city:'', district:''});}}/>}
      {open==='city' && <PickerModal opts={filteredCities} title={t('اختر المدينة','Select city')} onSelect={c=>{setCity(c); setDistrict(''); onChange({region, city:c, district:''});}}/>}
      {open==='district' && <PickerModal opts={districts} title={t('اختر الحي','Select district')} onSelect={c=>{setDistrict(c); onChange({region, city, district:c});}}/>}
    </View>
  );
}
const s = StyleSheet.create({
  input:{borderWidth:1, borderColor:'#e2e8f0', borderRadius:12, padding:12, backgroundColor:'#fff'},
  inputText:{fontWeight:'700', color:'#0f172a'},
  backdrop:{flex:1, backgroundColor:'rgba(0,0,0,0.4)', justifyContent:'flex-end'},
  sheet:{backgroundColor:'#fff', borderTopLeftRadius:16, borderTopRightRadius:16, padding:16, maxHeight:'70%'},
  sheetTitle:{fontWeight:'800', fontSize:16, marginBottom:12, textAlign:'center'},
  row:{paddingVertical:14, borderBottomWidth:1, borderBottomColor:'#f1f5f9'},
  rowText:{fontSize:15, color:'#0f172a'},
});
