FROM node:20-alpine
ARG VERSION=v0
ARG FAIL_HEALTH=0
ENV VERSION=$VERSION FAIL_HEALTH=$FAIL_HEALTH
COPY server.js /app/server.js
CMD ["node", "/app/server.js"]
