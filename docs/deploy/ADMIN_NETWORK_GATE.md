# Admin Network Gate

**Phase 7C — C3.** Two layers protect the admin UI and every `/admin/*` API:

1. **Edge gate (recommended: Cloudflare Access)** — only the owner's devices can
   reach the admin origin at all. Everything else is blocked before it hits
   the backend.
2. **Backend gate check** — the backend independently rejects any `/admin/*`
   request that did not come through the gate (header/cert check). The edge
   alone is never trusted.

---

## Option A — Cloudflare Access (recommended)

Cloudflare Access applies identity + device posture at the edge. The owner's
MacBook and iPhone are enrolled; every other device is denied before the
request reaches the backend.

### Step-by-step

1. **Add the admin origin to Cloudflare**
   - Dashboard → Websites → add `admin.nabd.plus` (or your admin subdomain).
   - Set the origin DNS record to your backend/load balancer.

2. **Create an Access application**
   - Access → Applications → Add an application.
   - Application domain: `admin.nabd.plus`.
   - Session duration: 15 minutes (matches the idle timeout).

3. **Configure the policy**
   - Policy rule: `Allow` → `Emails` → `Obaid08642@gmail.com` (the owner).
   - Add a second rule: `Block` → `Everyone else` (default deny).
   - Enable **Device posture** → require the Cloudflare WARP client or a
     valid mTLS client certificate on the owner's devices.

4. **Enroll the owner's devices**
   - MacBook: install Cloudflare WARP, sign in with the owner's email.
   - iPhone: install Cloudflare WARP (1.1.1.1), sign in with the same email.
   - The break-glass hardware key is NOT enrolled here — it is used only for
     recovery (see C6).

5. **Verify**
   - From the owner's MacBook: `curl -I https://admin.nabd.plus` → 200.
   - From any other device: `curl -I https://admin.nabd.plus` → 403 (blocked
     at the edge, never reaches the backend).

6. **Backend header check**
   - Cloudflare Access injects `Cf-Access-Jwt-Assertion` on every allowed
     request. The backend verifies this header (or a shared-secret header set
     by your reverse proxy) on every `/admin/*` route. See the backend gate
     check below.

---

## Option B — mTLS client certificate

An mTLS client certificate held only by the owner's devices. The reverse proxy
(Nginx/Traefik) terminates TLS and rejects connections without a valid client
cert.

### Step-by-step

1. **Create a private CA**
   ```bash
   openssl genrsa -out ca.key 4096
   openssl req -new -x509 -key ca.key -out ca.crt -days 3650 -subj "/CN=Nabd Admin CA"
   ```

2. **Issue client certificates for each device**
   ```bash
   # MacBook
   openssl genrsa -out mbook.key 2048
   openssl req -new -key mbook.key -out mbook.csr -subj "/CN=owner-macbook"
   openssl x509 -req -in mbook.csr -CA ca.crt -CAkey ca.key -out mbook.crt -days 365

   # iPhone (export as .p12 and install via Apple Configurator or MDM)
   openssl genrsa -out iphone.key 2048
   openssl req -new -key iphone.key -out iphone.csr -subj "/CN=owner-iphone"
   openssl x509 -req -in iphone.csr -CA ca.crt -CAkey ca.key -out iphone.crt -days 365
   openssl pkcs12 -export -inkey iphone.key -in ipphone.crt -out iphone.p12
   ```

3. **Configure the reverse proxy (Nginx example)**
   ```nginx
   server {
     listen 443 ssl;
     server_name admin.nabd.plus;

     ssl_certificate     /etc/nginx/certs/server.crt;
     ssl_certificate_key /etc/nginx/certs/server.key;
     ssl_client_certificate /etc/nginx/certs/ca.crt;
     ssl_verify_client on;

     location / {
       proxy_pass http://backend;
       proxy_set_header X-Forwarded-For $remote_addr;
     }
   }
   ```

4. **Backend header check**
   - Nginx sets `X-SSL-Client-Verify: SUCCESS` on every verified request. The
     backend rejects any `/admin/*` request without this header.

5. **Verify**
   - From the owner's MacBook (with the client cert installed): → 200.
   - From any other device: → 403 (TLS handshake fails, never reaches the
     backend).

---

## Backend gate check (both options)

The backend independently rejects `/admin/*` requests that did not come
through the gate. This is a defense-in-depth measure: even if the edge is
misconfigured or bypassed, the backend still denies access.

### Header-based check (Cloudflare Access)

The backend expects a shared-secret header (e.g. `X-Admin-Gate-Token`) injected
by the reverse proxy on every allowed request. Requests without this header
are rejected with 403.

```typescript
// backend/src/common/admin-gate.guard.ts
@Injectable()
export class AdminGateGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const path = req.path || req.url || '';
    if (!path.startsWith('/api/v1/admin')) return true;
    const token = req.headers['x-admin-gate-token'];
    if (token !== process.env.ADMIN_GATE_TOKEN) {
      throw new ForbiddenException('admin_gate_required');
    }
    return true;
  }
}
```

### mTLS-based check

The reverse proxy sets `X-SSL-Client-Verify: SUCCESS` on verified requests.
The backend rejects any `/admin/*` request without this header.

```typescript
const verify = req.headers['x-ssl-client-verify'];
if (verify !== 'SUCCESS') throw new ForbiddenException('admin_gate_required');
```

---

## Testing

```bash
# Without gate credential → 403
curl -H "Authorization: Bearer <admin-token>" https://admin.nabd.plus/api/v1/admin/users

# With gate credential → 200
curl -H "Authorization: Bearer <admin-token>" \
     -H "X-Admin-Gate-Token: <secret>" \
     https://admin.nabd.plus/api/v1/admin/users
```

The backend e2e tests verify both paths (see `admin-gate.spec.ts`).
