import { Redirect } from 'expo-router';

/** The old address of the receipts list: it is the Receipts screen (/receipts) now. */
export default function ReceiptsRedirect() {
  return <Redirect href="/receipts" />;
}
