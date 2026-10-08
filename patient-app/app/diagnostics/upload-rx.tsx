// @ts-nocheck
// Legacy route — prescription scanning/upload lives in /pharmacy/rx-order?via=photo.
// This file previously rendered a bare "Upload" placeholder stub.
import { Redirect } from "expo-router";
export default function R() {
  return <Redirect href="/pharmacy/rx-order?via=photo" />;
}
