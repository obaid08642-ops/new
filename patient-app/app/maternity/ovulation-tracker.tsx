import { Redirect } from 'expo-router';
/** Fertility estimates are displayed with their source and safety notice in the maternity hub. */
export default function OvulationTrackerRedirect() { return <Redirect href="/maternity/hub" />; }
