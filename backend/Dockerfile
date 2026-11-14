FROM node:22.23.4-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22.23.4-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY package*.json ./
RUN npm ci --only=production
# Build-time smoke: a missing sharp platform binary must fail the build, not crash the container on boot (Sentry NABD-BACKEND-1X).
RUN node -e "require('sharp')"
EXPOSE 3000
CMD ["npm", "run", "start:prod"]
