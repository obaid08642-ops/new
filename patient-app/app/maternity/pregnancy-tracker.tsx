import { Redirect } from 'expo-router';
/** Pregnancy estimates are shown only from a user-configured maternity profile. */
export default function PregnancyTrackerRedirect() { return <Redirect href="/maternity/hub" />; }
