import { callPatientApi } from "@/lib/api/upstream";
export function getPatientHomeCareProviders(accessToken:string,city?:string){const query=city?.trim()?`?city=${encodeURIComponent(city.trim())}`:"";return callPatientApi(`/home-care/providers${query}`,{method:"GET",cache:"no-store",headers:{accept:"application/json"}},accessToken);}
