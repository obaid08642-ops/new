# The whole data/API stack in ONE container, so `docker run --cpus=4 --memory=3.8g` limits it like the production host (one 4 vCPU / 3.8 GB machine
# running the API, MongoDB and Redis). Test stacks only: no authentication, bound to the loopback of the CI runner.
FROM node:22-bookworm-slim AS node
FROM mongo:7
COPY --from=node /usr/local/bin/node /usr/local/bin/node
RUN apt-get update && apt-get install -y --no-install-recommends redis-server ca-certificates && rm -rf /var/lib/apt/lists/*
COPY entry.sh /entry.sh
RUN chmod +x /entry.sh
ENTRYPOINT ["/entry.sh"]
