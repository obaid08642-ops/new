# Multi-stage build for web production deployment
# --------------------------------------------------------
# Stage 1: Build Expo Web App
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy full project source
COPY . .

# Build/export the web assets using Expo CLI
RUN npx expo export --platform web

# Stage 2: Serve using Nginx
FROM nginx:alpine

# Copy built web dist directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose Nginx port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
