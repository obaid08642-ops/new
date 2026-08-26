import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Appointment, AppointmentStatus, AppointmentMode } from '../../types/contracts';

interface AppointmentsState {
  upcoming: Appointment[];
  past: Appointment[];
  isLoading: boolean;
}

const appointmentsSlice = createSlice({
  name: 'appointments',
  initialState: { upcoming: [], past: [], isLoading: false } as AppointmentsState,
  reducers: {
    setUpcoming: (state, action: PayloadAction<Appointment[]>) => {
      state.upcoming = action.payload;
    },
    setPast: (state, action: PayloadAction<Appointment[]>) => {
      state.past = action.payload;
    },
    addAppointment: (state, action: PayloadAction<Appointment>) => {
      state.upcoming.unshift(action.payload);
    },
    updateAppointment: (state, action: PayloadAction<Appointment>) => {
      const idx = state.upcoming.findIndex((a) => a.id === action.payload.id);
      if (idx !== -1) state.upcoming[idx] = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});
export const { setUpcoming, setPast, addAppointment, updateAppointment, setLoading } = appointmentsSlice.actions;
export default appointmentsSlice.reducer;
