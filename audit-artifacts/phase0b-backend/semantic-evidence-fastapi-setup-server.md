# Phase 0B semantic evidence — FastAPI server setup script

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `infra/fastapi/setup_server.sh:1–79`

The script is a privileged Ubuntu/EC2 setup script using `set -e` and installs system packages via apt (`1–11`). It has no root/OS/architecture/repository preflight, package pinning, lockfile/SBOM, checksum verification or rollback. It fetches a MongoDB GPG key and writes a repository line for Ubuntu `jammy` while the header claims Ubuntu 24.04 LTS (`15–21`), creating release/compatibility drift. The key is streamed from the network into `gpg` without an independently pinned digest or provenance assertion.

It installs MongoDB 7.0, starts/enables the service and reports it running (`15–24`), but does not configure authentication, bind address, TLS, encryption at rest, least-privilege users, backup/restore, replica set, audit logging, storage limits or health/readiness verification. It installs Node.js 20 using a remote NodeSource setup script and Python/pip/venv packages (`28–51`) without pinned artifact/version, runtime policy or vulnerability verification. PM2 is installed globally from the package registry with no version pin, integrity record, service user or process configuration (`38–42`).

The firewall section explicitly allows SSH, HTTP, HTTPS, FastAPI 8000, NestJS 8002 and MongoDB 27017 (`53–64`). The comment says MongoDB should be local only, but the command opens TCP 27017 without a source restriction; FastAPI and NestJS ports are also externally opened rather than bound behind a reverse proxy/private network. There is no UFW enable/default-deny policy, IPv6 rule, SSH hardening, rate limiting, TLS/certificate setup, ingress allowlist, cloud security-group coordination or verification of effective rules.

The script ends by printing service/version information and declaring the server ready for deployment (`66–78`) without confirming secrets, application deployment, migrations, dependencies, backups, monitoring, health/readiness, TLS, firewall state, disk capacity, rollback or security posture. It does not install/configure the FastAPI/NestJS application, PM2 process, reverse proxy, system service, environment files or worker queues. Running this script would make broad privileged and network changes; it was not executed. No product code was changed and no tests/builds were run during this semantic read.
