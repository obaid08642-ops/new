import { Redirect } from 'expo-router';

/** Free-form AI medical chat is unavailable; users are routed to the safer structured triage flow. */
export default function ChatDoctorRedirect() {
  return <Redirect href="/ai/triage" />;
}
