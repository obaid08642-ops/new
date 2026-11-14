/** An old insurance page that is now the page of one request: `/insurance/requests/<id>`; the old amount in the URL is not carried (the server's amount is shown). */
export function insuranceRequestHref(locale: string, requestId: string): string {
  return `/${locale}/insurance/requests/${requestId}`;
}
