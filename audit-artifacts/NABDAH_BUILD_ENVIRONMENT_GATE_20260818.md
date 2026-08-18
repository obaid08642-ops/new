# Nabdah build environment gate — 2026-08-18

The authoritative direct source is present at `/home/ubuntu/nabdah-authoritative-worktree` on commit `21006cc`. All five application packages have lockfiles, but no local `node_modules` in the authoritative worktree.

The sandbox filesystem currently reports approximately **96% inode usage** (38,084 free inodes). Existing inode-heavy temporary QA/cache directories include `/tmp/nabdah-device-validation`, `/tmp/nabdah-appointment-work`, `/tmp/nabdah-backend-f2bffa2-gate`, `/tmp/jest_rs`, `/tmp/metro-cache`, and other generated caches. This prevents treating a fresh `npm ci` or complete clean build as a reliable gate until the environment is recovered.

Status: **BLOCKED — environment capacity**, not a source pass/fail. No project or database data was deleted. The next action is to archive or remove only known temporary QA/cache artifacts, then install from each lockfile and run the package-specific build/test commands. Any clean build result must identify the exact commit and package.
