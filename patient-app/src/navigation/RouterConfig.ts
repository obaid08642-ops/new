/**
 * Navigation Architecture & Types
 */
import { Href } from 'expo-router';

// Centralized route definitions to avoid hardcoded strings
export const Routes = {
  // Tabs
  Home: '/' as Href,
  Consultations: '/consultations' as Href,
  Pharmacy: '/pharmacy' as Href,
  Profile: '/profile' as Href,
  
  // Auth
  Login: '/(auth)/login' as Href,
  Register: '/(auth)/register' as Href,
  ForgotPassword: '/(auth)/forgot-password' as Href,
  
  // Modals
  GuidedTour: '/guided-tour' as Href,
  
  // Dynamic Helpers
  DoctorProfile: (id: string | number) => `/consultations/doctor/${id}` as Href,
  ProductDetails: (id: string | number) => `/pharmacy/product/${id}` as Href,
};

export type AppRoutes = keyof typeof Routes;
