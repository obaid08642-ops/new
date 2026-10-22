#!/bin/bash
# READ-ONLY (owner, 2026-10-22). Count of log lines that mention "sharp" in the last 24 hours. Prints a status: line only;
# the log lines themselves are never printed.
set +e
echo "## ops-sharp"
n=$(sudo -n docker logs nabdah-backend --since 24h 2>&1 | grep -ci sharp)
echo "status: sharp errors_24h=${n:-0}"
echo "## ops-sharp done"
