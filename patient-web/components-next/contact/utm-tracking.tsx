'use client';

import { useEffect, useCallback } from 'react';

const UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid', 'msclid'] as const;
type UtmParam = typeof UTM_PARAMS[number];

interface UtmData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  gclid?: string;
  fbclid?: string;
  msclid?: string;
  referrer?: string;
  landing_page?: string;
  timestamp: string;
}

const STORAGE_KEY = 'nabd_utm_data';
const EXPIRY_DAYS = 90;

export function useUtmTracking() {
  const captureUtm = useCallback((): UtmData | null => {
    if (typeof window === 'undefined') return null;
    
    const urlParams = new URLSearchParams(window.location.search);
    const utmData: UtmData = { timestamp: new Date().toISOString() };
    let hasUtm = false;
    
    for (const param of UTM_PARAMS) {
      const value = urlParams.get(param);
      if (value) {
        utmData[param] = value;
        hasUtm = true;
      }
    }
    
    // Add referrer and landing page
    utmData.referrer = document.referrer || 'direct';
    utmData.landing_page = window.location.pathname + window.location.search;
    
    if (hasUtm) {
      // Store with expiry
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + EXPIRY_DAYS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ data: utmData, expiry: expiry.toISOString() }));
    }
    
    return hasUtm ? utmData : null;
  }, []);

  const getStoredUtm = useCallback((): UtmData | null => {
    if (typeof window === 'undefined') return null;
    
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    try {
      const { data, expiry } = JSON.parse(stored);
      if (new Date(expiry) < new Date()) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }, []);

  const clearUtm = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return { captureUtm, getStoredUtm, clearUtm };
}

/**
 * Hook to attach UTM data to form submissions
 */
export function useUtmFormData() {
  const { getStoredUtm } = useUtmTracking();
  
  const enhanceFormData = useCallback((formData: FormData | Record<string, any>) => {
    const utm = getStoredUtm();
    if (!utm) return formData;
    
    if (formData instanceof FormData) {
      for (const [key, value] of Object.entries(utm)) {
        if (value) formData.append(key, value);
      }
      return formData;
    }
    
    return { ...formData, ...utm };
  }, [getStoredUtm]);
  
  return { enhanceFormData };
}

/**
 * Auto-capture UTM on page load
 */
export function UtmTracker() {
  const { captureUtm } = useUtmTracking();
  
  useEffect(() => {
    captureUtm();
  }, [captureUtm]);
  
  return null;
}

export default useUtmTracking;
