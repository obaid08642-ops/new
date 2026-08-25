# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/full-audit-20260823/phase9-pnpm-audit-after-postcss.json`
- **Member SHA-256:** `f2bcf0810790da5ac76ba42eecfa08636d713065ba853e9163969088783f0231`
- **Line count:** 2572
- **Read range:** `1-2572`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `455: "overview": "### Summary\n\nesbuild allows any websites to send any request to the development server and read the response due to default CORS settings.\n\n### Details\n\nesbuild sets `Access-Control-Allow-Origin: *` header to all requests`
- `614: "overview": "# pnpm v10+ Git Dependency Script Execution Bypass\n\n### Summary\n\nA security bypass vulnerability in pnpm v10+ allows git-hosted dependencies to execute arbitrary code during `pnpm install`, circumventing the v10 security fe`
- `653: "overview": "### Summary\n\nHTTP tarball dependencies (and git-hosted tarballs) are stored in the lockfile without integrity hashes. This allows the remote server to serve different content on each install, even when a lockfile is committed`
- `773: "overview": "### Summary\nnode-tar contains a vulnerability where the security check for hardlink entries uses different path resolution semantics than the actual hardlink creation logic. This mismatch allows an attacker to craft a maliciou`
- `1242: "overview": "### Impact\n`picomatch` is vulnerable to Regular Expression Denial of Service (ReDoS) when processing crafted extglob patterns. Certain patterns using extglob quantifiers such as `+()` and `*()`, especially when combined with o`
- `1492: "overview": "### Summary\n\n`tar` (node-tar) applies a PAX extended header's `size=` record (and other PAX\noverrides) to the **next header entry of any type**, including intermediary\nmetadata headers such as a GNU long-name (`L`) or long-`
- `1616: "overview": "### Summary\n\nA malicious `codeload.github.com` server can serve whatever tarball it wants and pnpm will install it regardless of the lockfile.\n\n### Details\n\nThe lockfile does not store the hash of the dependencies from ht`
- `1655: "overview": "## Summary\n\npnpm's patch application pipeline (`@pnpm/patch-package`) performs no path validation on file paths extracted from `.patch` files. An attacker who contributes a malicious patch file via a pull request can write at`
- `1773: "overview": "## Summary\n\npnpm passes the lockfile-controlled git `resolution.commit` value to `git fetch` without a `--` separator or commit-format validation. For git dependencies fetched through the shallow-fetch path, a malicious lockf`
- `1851: "overview": "While it is unclear whether this should be classified as a vulnerability, it is being reported through this channel because the current behavior may represent an unsafe default.\n\n## Summary\n\n`pnpm install` in non-frozen mod`
- `1931: "overview": "<!-- maintainer-action:start -->\n## Maintainer Action Plan\n\nThis report is ready to review with the shared patch branch. Start with the PR and the expected fixed behavior, then use the detailed exploit narrative below only i`
- `1972: "overview": "<details>\n<summary>Maintainer Action Plan</summary>\n\n## Maintainer Action Plan\n\nThis report is ready to review with the shared patch branch. Start with the PR and the expected fixed behavior, then use the detailed exploit `
### backend_consumers_or_contracts
- `455: "overview": "### Summary\n\nesbuild allows any websites to send any request to the development server and read the response due to default CORS settings.\n\n### Details\n\nesbuild sets `Access-Control-Allow-Origin: *` header to all requests`
- `773: "overview": "### Summary\nnode-tar contains a vulnerability where the security check for hardlink entries uses different path resolution semantics than the actual hardlink creation logic. This mismatch allows an attacker to craft a maliciou`
- `1015: "overview": "### Summary\nThe Rollup module bundler (specifically v4.x and present in current source) is vulnerable to an Arbitrary File Write via Path Traversal. Insecure file name sanitization in the core engine allows an attacker to cont`
- `1412: "overview": "### Summary\n\n[`server.fs`](https://vite.dev/config/server-options#server-fs-strict) check was not enforced to the `fetchModule` method that is exposed in Vite dev server's WebSocket. \n\n### Impact\n\nOnly apps that match the`
- `1414: "title": "Vite Vulnerable to Arbitrary File Read via Vite Dev Server WebSocket",`
- `1452: "overview": "## Summary\n\nA command injection vulnerability exists in pnpm when using environment variable substitution in `.npmrc` configuration files with `tokenHelper` settings. An attacker who can control environment variables during p`
- `1655: "overview": "## Summary\n\npnpm's patch application pipeline (`@pnpm/patch-package`) performs no path validation on file paths extracted from `.patch` files. An attacker who contributes a malicious patch file via a pull request can write at`
- `1694: "overview": "## Summary\n\npnpm can send user-level unscoped npm authentication credentials to a registry chosen by a repository-local `.npmrc` file.\n\nIn the reproduced case, the user's npm config contains a default registry and an unscop`
- `1931: "overview": "<!-- maintainer-action:start -->\n## Maintainer Action Plan\n\nThis report is ready to review with the shared patch branch. Start with the PR and the expected fixed behavior, then use the detailed exploit narrative below only i`
- `2488: "references": "- https://github.com/vitest-dev/vitest/security/advisories/GHSA-5xrq-8626-4rwp\n- https://github.com/vitest-dev/vitest/blob/eb1abf08573032a532015b999ad3501c5e89e3bb/packages/browser/src/node/commands/fs.ts#L10-L11\n- https://`
- `2492: "overview": "### Summary\nArbitrary file can be read on Windows when Vitest UI server is listening, especially when exposed to the network.\n\n### Impact\nOnly users that match either of the following conditions are affected:\n\n- explicitl`
### auth_ownership
- `692: "overview": "### Summary\nWhen pnpm processes a package's `directories.bin` field, it uses `path.join()` without validating the result stays within the package root. A malicious npm package can specify `\"directories\": {\"bin\": \"../../..`
- `694: "title": "pnpm has Path Traversal via arbitrary file permission modification ",`
- `773: "overview": "### Summary\nnode-tar contains a vulnerability where the security check for hardlink entries uses different path resolution semantics than the actual hardlink creation logic. This mismatch allows an attacker to craft a maliciou`
- `931: "overview": "### Summary\n\nThe `node-tar` library (`<= 7.5.2`) fails to sanitize the `linkpath` of `Link` (hardlink) and `SymbolicLink` entries when `preservePaths` is false (the default secure behavior). This allows malicious archives to `
- `1015: "overview": "### Summary\nThe Rollup module bundler (specifically v4.x and present in current source) is vulnerable to an Arbitrary File Write via Path Traversal. Insecure file name sanitization in the core engine allows an attacker to cont`
- `1054: "overview": "### Summary\n`tar` (npm) can be tricked into creating a hardlink that points outside the extraction directory by using a drive-relative link target such as `C:../target.txt`, which enables file overwrite outside `cwd` during no`
- `1094: "overview": "### Summary\n`tar` (npm) can be tricked into creating a symlink that points outside the extraction directory by using a drive-relative symlink target such as `C:../../../target.txt`, which enables file overwrite outside `cwd` d`
- `1452: "overview": "## Summary\n\nA command injection vulnerability exists in pnpm when using environment variable substitution in `.npmrc` configuration files with `tokenHelper` settings. An attacker who can control environment variables during p`
- `1694: "overview": "## Summary\n\npnpm can send user-level unscoped npm authentication credentials to a registry chosen by a repository-local `.npmrc` file.\n\nIn the reproduced case, the user's npm config contains a default registry and an unscop`
- `1931: "overview": "<!-- maintainer-action:start -->\n## Maintainer Action Plan\n\nThis report is ready to review with the shared patch branch. Start with the PR and the expected fixed behavior, then use the detailed exploit narrative below only i`
- `2012: "overview": "<!-- maintainer-action:start -->\n## Maintainer Action Plan\n\nThis report is ready to review with the shared patch branch. Start with the PR and the expected fixed behavior, then use the detailed exploit narrative below only i`
- `2129: "overview": "## Summary\n\n`pnpm` accepts package names from the env lockfile `configDependencies` section and uses those names directly when creating config dependency symlinks under `node_modules/.pnpm-config`.\n\nA malicious repository c`
### state_transitions
- `575: "overview": "### Summary\n\nUsing `.t` (aka `.list`) with `{ sync: true }` to read tar entry contents returns uninitialized memory contents if tar file was changed on disk to a smaller size while being read.\n\n### Details\n\nSee:\n* https:`
- `614: "overview": "# pnpm v10+ Git Dependency Script Execution Bypass\n\n### Summary\n\nA security bypass vulnerability in pnpm v10+ allows git-hosted dependencies to execute arbitrary code during `pnpm install`, circumventing the v10 security fe`
- `773: "overview": "### Summary\nnode-tar contains a vulnerability where the security check for hardlink entries uses different path resolution semantics than the actual hardlink creation logic. This mismatch allows an attacker to craft a maliciou`
- `931: "overview": "### Summary\n\nThe `node-tar` library (`<= 7.5.2`) fails to sanitize the `linkpath` of `Link` (hardlink) and `SymbolicLink` entries when `preservePaths` is false (the default secure behavior). This allows malicious archives to `
- `970: "overview": "### Summary\n`tar.extract()` in Node `tar` allows an attacker-controlled archive to create a hardlink inside the extraction directory that points to a file outside the extraction root, using default options.\n\nThis enables **a`
- `1015: "overview": "### Summary\nThe Rollup module bundler (specifically v4.x and present in current source) is vulnerable to an Arbitrary File Write via Path Traversal. Insecure file name sanitization in the core engine allows an attacker to cont`
- `1188: "overview": "### Impact\npicomatch is vulnerable to a **method injection vulnerability (CWE-1321)** affecting the `POSIX_REGEX_SOURCE` object. Because the object inherits from `Object.prototype`, specially crafted POSIX bracket expressions `
- `1242: "overview": "### Impact\n`picomatch` is vulnerable to Regular Expression Denial of Service (ReDoS) when processing crafted extglob patterns. Certain patterns using extglob quantifiers such as `+()` and `*()`, especially when combined with o`
- `1452: "overview": "## Summary\n\nA command injection vulnerability exists in pnpm when using environment variable substitution in `.npmrc` configuration files with `tokenHelper` settings. An attacker who can control environment variables during p`
- `1492: "overview": "### Summary\n\n`tar` (node-tar) applies a PAX extended header's `size=` record (and other PAX\noverrides) to the **next header entry of any type**, including intermediary\nmetadata headers such as a GNU long-name (`L`) or long-`
- `1533: "overview": "### Summary\nThe `launch-editor` NPM package accesses arbitrary paths including Windows UNC paths. When a UNC path is opened, Windows automatically attempts NTLM authentication to the remote host, causing the user’s NTLMv2 pass`
- `1576: "overview": "### Summary\nThe `launch-editor` NPM package accesses arbitrary paths including Windows UNC paths. When a UNC path is opened, Windows automatically attempts NTLM authentication to the remote host, causing the user’s NTLMv2 pass`
### payment_insurance_relevance
- `653: "overview": "### Summary\n\nHTTP tarball dependencies (and git-hosted tarballs) are stored in the lockfile without integrity hashes. This allows the remote server to serve different content on each install, even when a lockfile is committed`
- `931: "overview": "### Summary\n\nThe `node-tar` library (`<= 7.5.2`) fails to sanitize the `linkpath` of `Link` (hardlink) and `SymbolicLink` entries when `preservePaths` is false (the default secure behavior). This allows malicious archives to `
- `1133: "overview": "**TITLE**: Race Condition in node-tar Path Reservations via Unicode Sharp-S (ß) Collisions on macOS APFS\n\n**AUTHOR**: Tomás Illuminati\n\n### Details\n\nA race condition vulnerability exists in `node-tar` (v7.5.3) this is to `
- `1242: "overview": "### Impact\n`picomatch` is vulnerable to Regular Expression Denial of Service (ReDoS) when processing crafted extglob patterns. Certain patterns using extglob quantifiers such as `+()` and `*()`, especially when combined with o`
- `1452: "overview": "## Summary\n\nA command injection vulnerability exists in pnpm when using environment variable substitution in `.npmrc` configuration files with `tokenHelper` settings. An attacker who can control environment variables during p`
- `1492: "overview": "### Summary\n\n`tar` (node-tar) applies a PAX extended header's `size=` record (and other PAX\noverrides) to the **next header entry of any type**, including intermediary\nmetadata headers such as a GNU long-name (`L`) or long-`
- `1694: "overview": "## Summary\n\npnpm can send user-level unscoped npm authentication credentials to a registry chosen by a repository-local `.npmrc` file.\n\nIn the reproduced case, the user's npm config contains a default registry and an unscop`
- `1734: "overview": "## Summary\n\npnpm allows a transitive dependency alias from registry package metadata to contain path traversal segments. During install, pnpm later uses that alias as a filesystem path when linking dependency nodes. As a resu`
- `1851: "overview": "While it is unclear whether this should be classified as a vulnerability, it is being reported through this channel because the current behavior may represent an unsafe default.\n\n## Summary\n\n`pnpm install` in non-frozen mod`
- `1972: "overview": "<details>\n<summary>Maintainer Action Plan</summary>\n\n## Maintainer Action Plan\n\nThis report is ready to review with the shared patch branch. Start with the PR and the expected fixed behavior, then use the detailed exploit `
- `2129: "overview": "## Summary\n\n`pnpm` accepts package names from the env lockfile `configDependencies` section and uses those names directly when creating config dependency symlinks under `node_modules/.pnpm-config`.\n\nA malicious repository c`
- `2334: "overview": "### Summary\nA **Decompression/parse DoS via unlimited input** vulnerability in `node-tar` allows an attacker to exhaust server resources (disk space and CPU). Because the library does not enforce hard upper bounds on total dec`
### error_empty_loading_retry_cancel
- `575: "overview": "### Summary\n\nUsing `.t` (aka `.list`) with `{ sync: true }` to read tar entry contents returns uninitialized memory contents if tar file was changed on disk to a smaller size while being read.\n\n### Details\n\nSee:\n* https:`
- `931: "overview": "### Summary\n\nThe `node-tar` library (`<= 7.5.2`) fails to sanitize the `linkpath` of `Link` (hardlink) and `SymbolicLink` entries when `preservePaths` is false (the default secure behavior). This allows malicious archives to `
- `970: "overview": "### Summary\n`tar.extract()` in Node `tar` allows an attacker-controlled archive to create a hardlink inside the extraction directory that points to a file outside the extraction root, using default options.\n\nThis enables **a`
- `1015: "overview": "### Summary\nThe Rollup module bundler (specifically v4.x and present in current source) is vulnerable to an Arbitrary File Write via Path Traversal. Insecure file name sanitization in the core engine allows an attacker to cont`
- `1188: "overview": "### Impact\npicomatch is vulnerable to a **method injection vulnerability (CWE-1321)** affecting the `POSIX_REGEX_SOURCE` object. Because the object inherits from `Object.prototype`, specially crafted POSIX bracket expressions `
- `1242: "overview": "### Impact\n`picomatch` is vulnerable to Regular Expression Denial of Service (ReDoS) when processing crafted extglob patterns. Certain patterns using extglob quantifiers such as `+()` and `*()`, especially when combined with o`
- `1452: "overview": "## Summary\n\nA command injection vulnerability exists in pnpm when using environment variable substitution in `.npmrc` configuration files with `tokenHelper` settings. An attacker who can control environment variables during p`
- `1492: "overview": "### Summary\n\n`tar` (node-tar) applies a PAX extended header's `size=` record (and other PAX\noverrides) to the **next header entry of any type**, including intermediary\nmetadata headers such as a GNU long-name (`L`) or long-`
- `1533: "overview": "### Summary\nThe `launch-editor` NPM package accesses arbitrary paths including Windows UNC paths. When a UNC path is opened, Windows automatically attempts NTLM authentication to the remote host, causing the user’s NTLMv2 pass`
- `1576: "overview": "### Summary\nThe `launch-editor` NPM package accesses arbitrary paths including Windows UNC paths. When a UNC path is opened, Windows automatically attempts NTLM authentication to the remote host, causing the user’s NTLMv2 pass`
- `1655: "overview": "## Summary\n\npnpm's patch application pipeline (`@pnpm/patch-package`) performs no path validation on file paths extracted from `.patch` files. An attacker who contributes a malicious patch file via a pull request can write at`
- `1694: "overview": "## Summary\n\npnpm can send user-level unscoped npm authentication credentials to a registry chosen by a repository-local `.npmrc` file.\n\nIn the reproduced case, the user's npm config contains a default registry and an unscop`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
