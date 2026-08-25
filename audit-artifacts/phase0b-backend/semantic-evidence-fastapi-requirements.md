# Phase 0B semantic evidence — FastAPI requirements

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `infra/fastapi/requirements.txt:1–29`

The requirements file pins only a subset of packages exactly: FastAPI, Uvicorn, PyMongo, bcrypt, Motor and httpx (`1–2,7,11,14,28`). Most runtime packages use lower-bound-only constraints (`3–6,8–10,12–13,21–26`), allowing resolver drift and non-reproducible deployments. There are no hashes, constraints/lock file, approved index/source, SBOM, vulnerability policy, license inventory or dependency provenance in this file.

The file mixes runtime and development/tooling dependencies: pytest, black, isort, flake8 and mypy are included in the same requirements set (`15–19`), increasing production image size and attack surface. Pandas, NumPy, jq and Typer are also present without a visible ownership/use contract (`22–26`). Both `python-jose` and `pyjwt` are included (`10,20`), creating competing JWT implementations and algorithm/configuration drift. `requests` and `httpx` coexist (`21,28`), while `requests-oauthlib` is present without a visible route contract (`4`); this increases duplicate HTTP/auth client surface.

`motor==3.3.1` is paired with `pymongo==4.5.0` (`7,14`) but compatibility is not documented or locked transitively. `cryptography>=42.0.8`, boto3 and other lower-bounded packages can change behavior or security posture between deployments. `emergentintegrations` is commented out (`27`) even though `ai_service.py` and `server.py` import it dynamically, so the AI path's installability depends on an undocumented external environment. No Python version, platform marker, CPU/ABI constraint or build isolation is declared.

The file does not separate production/test/dev requirements, enforce vulnerability scanning or deny known-bad transitive packages, and does not prove that the FastAPI service is reproducibly buildable. No packages were installed and no build/tests were run during this semantic read; no product code was changed.
