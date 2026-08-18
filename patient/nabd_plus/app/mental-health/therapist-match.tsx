import { Redirect } from 'expo-router';

/** Consultation discovery is provided through the verified consultation flow rather than an unverified AI matching claim. */
export default function TherapistMatchRedirect() {
  return <Redirect href="/(tabs)/consultations" />;
}
