// @ts-nocheck
// Redirects to the new family invite screen
import { Redirect } from "expo-router";
export default function AddFamilyMemberRedirect() {
  return <Redirect href="/family/invite" />;
}
