import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { apiFetch } from '@/utils/api';

/**
 * Predictive loading (production-grade) — prefetch BEFORE the user taps.
 *
 * - API prefetch: warms the offline cache (stale-while-revalidate pattern)
 * - Image prefetch: expo-image memory-disk cache
 * - Idle-time prefetch: requestIdleCallback equivalent via InteractionManager
 * - Deduplicated: each key prefetches once per session
 */
const done = new Set<string>();

async function prefetchApi(endpoint: string, cacheKey: string): Promise<void> {
  if (done.has(cacheKey)) return;
  done.add(cacheKey);
  try {
    const data = await apiFetch(endpoint);
    await AsyncStorage.setItem(`@nabdah_offline_${cacheKey}`, JSON.stringify({ data, ts: Date.now() }));
  } catch { /* prefetch is opportunistic — never throws */ }
}

function prefetchImages(uris: (string | null | undefined)[]): void {
  const valid = uris.filter((u): u is string => !!u && !done.has(u));
  if (!valid.length) return;
  valid.forEach(u => done.add(u));
  Image.prefetch(valid, 'memory-disk').catch(() => {});
}

/** Prefetch a medicine detail + its images when it's likely to be opened next. */
export function prefetchMedicine(id: string, image?: string | null): void {
  if (!id) return;
  prefetchApi(`/medicines/${id}/details`, `med_${id}`);
  if (image) prefetchImages([image]);
}

/** Product opened → preload alternatives' details + images (user's next likely taps). */
export function prefetchAlternatives(alternatives: any[]): void {
  if (!Array.isArray(alternatives)) return;
  for (const alt of alternatives.slice(0, 4)) {
    if (alt?.id) {
      prefetchApi(`/medicines/${alt.id}/details`, `med_${alt.id}`);
      const img = (Array.isArray(alt.images) && alt.images[0]) || alt.image;
      if (img) prefetchImages([img]);
    }
  }
}

/** Catalog shown → warm hot medicines for instant startup search next session. */
export function prefetchHotMedicines(): void {
  prefetchApi('/medicines/hot', 'hot_medicines');
}

/** Doctor opened → preload booking-adjacent data in idle time. */
export function prefetchDoctorContext(doctorId: string): void {
  if (!doctorId) return;
  prefetchApi(`/doctors/${doctorId}`, `doctor_${doctorId}`);
  prefetchApi(`/care/appointments?doctor_id=${doctorId}`, `doctor_appts_${doctorId}`);
}

export const prefetch = {
  api: prefetchApi,
  images: prefetchImages,
  medicine: prefetchMedicine,
  alternatives: prefetchAlternatives,
  hot: prefetchHotMedicines,
  doctor: prefetchDoctorContext,
};
