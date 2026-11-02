import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useSelector } from 'react-redux';
import { apiFetch } from '../utils/api';

import { Appointment, AppointmentStatus, AppointmentMode } from '../types/contracts';

interface ConsultationsContextValue {
  appointments: Appointment[];
  isLoading: boolean;
  error: boolean;
  fetchAppointments: (isRefresh?: boolean) => Promise<void>;
}

const ConsultationsContext = createContext<ConsultationsContextValue | undefined>(undefined);

/** The signed-in patient (not a guest): the list belongs to this account, so it is read again when the account changes. */
function useSignedInUserId(): string | null {
  return useSelector((state: { auth?: { isAuthenticated?: boolean; isGuest?: boolean; user?: { id?: unknown } | null } }) => {
    const auth = state.auth;
    return auth?.isAuthenticated && !auth.isGuest && typeof auth.user?.id === 'string' && auth.user.id ? auth.user.id : null;
  });
}

export function ConsultationsProvider({ children }: { children: ReactNode }) {
  const userId = useSignedInUserId();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchAppointments = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setIsLoading(true);
      setError(false);
      const res = await apiFetch('/care/appointments');
      
      if (res && (Array.isArray(res) || Array.isArray(res?.data))) {
        const raw = Array.isArray(res) ? res : res?.data;
        const mapped = raw.map((a: any) => ({
          id: a._id || a.id,
          docName: a.doctor_name || a.provider_name || '',
          docId: a.doctor_id ? String(a.doctor_id) : undefined,
          // GET /care/appointments sends the specialty's names (specialty_name_ar / specialty_name_en) and the start as
          // slot_start (issue 424: the list read keys the server never sends, so a real row had no date or time).
          spec: a.specialty_name_ar || a.specialty_ar || a.specialty || '',
          specEn: a.specialty_name_en || undefined,
          emoji: '',
          at: a.slot_start || a.appointment_date || a.scheduled_at || undefined,
          time: a.start_time || '',
          type: a.service_type || a.consultation_type || 'online',
          status: a.status || 'pending',
          price: a.consultation_fee || a.price || 0,
        }));
        setAppointments(mapped);
      } else {
        setAppointments([]);
      }
    } catch (err) {
      setError(true);
      setAppointments([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // The provider mounts at app start, before anyone has signed in: that first read is refused (401) and left "Could not load" on the
  // screen for the whole session (native e2e runs 104-106). Read again whenever the signed-in account changes, and drop the list on sign-out.
  useEffect(() => {
    if (userId) {
      void fetchAppointments();
    } else {
      setAppointments([]);
      setError(false);
      setIsLoading(false);
    }
  }, [userId, fetchAppointments]);

  return (
    <ConsultationsContext.Provider value={{ appointments, isLoading, error, fetchAppointments }}>
      {children}
    </ConsultationsContext.Provider>
  );
}

export function useConsultations() {
  const context = useContext(ConsultationsContext);
  if (context === undefined) {
    throw new Error('useConsultations must be used within a ConsultationsProvider');
  }
  return context;
}
