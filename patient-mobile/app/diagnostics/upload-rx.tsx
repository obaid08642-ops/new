// @ts-nocheck
// Legacy route — prescription scanning/upload lives in /pharmacy/scan-prescription.
// This file previously rendered a bare "Upload" placeholder stub.
import { Redirect } from "expo-router";
export default function R() {
  return <Redirect href="/pharmacy/scan-prescription" />;
}
