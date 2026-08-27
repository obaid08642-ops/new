import { Redirect } from 'expo-router';

/** Camera recognition is not accepted as a verified nutrition record in the current contract. */
export default function FoodScannerRedirect() {
  return <Redirect href="/nutrition/log-meal" />;
}
