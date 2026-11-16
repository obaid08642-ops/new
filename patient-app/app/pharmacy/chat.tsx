// The web's pharmacist chat lives at /pharmacy/chat (?orderId= or ?id=); a shared link, a curated Home card or a push that carries that
// path opens the app's own screen. One screen, one set of calls (GET /pharmacy/chat/threads, .../messages): nothing is drawn twice.
export { default } from './pharmacist-chat';
