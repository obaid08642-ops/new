# Direct Nabdah backend build environment blocker — 2026-08-18

The direct Nabdah source branch was identified correctly inside `obaid08642-ops/new`. Its backend package manifest and lockfile do not match the pre-existing extracted backend dependency tree, so that tree cannot be reused as build evidence.

A clean `npm ci` initially hit the Nest peer conflict (`@nestjs/terminus@11.1.1` versus `@nestjs/mongoose@10.1.0`). A one-time `--legacy-peer-deps` retry then hit the sandbox filesystem inode limit while unpacking dependencies. The disk had approximately 28 GB free but zero free inodes; partial `node_modules` was removed and inode capacity recovered only partially. No package versions or source files were changed, and no build result was marked PASS from the incompatible dependency tree.

Required resolution: run the direct-source gates in an environment with sufficient inodes or a compatible package-manager store, then run Jest and Nest build from the exact direct source branch. This is an environment blocker, not a source fix or a production failure.
