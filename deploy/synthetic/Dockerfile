# Synthetic Monitoring Dockerfile
# Runs Playwright-based synthetic checks

FROM mcr.microsoft.com/playwright:v1.44.0-jammy

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy synthetic monitoring scripts
COPY deploy/synthetic/ ./deploy/synthetic/

# Create non-root user
RUN groupadd -r synthetic && useradd -r -g synthetic synthetic
USER synthetic

# Run synthetic monitoring
CMD ["node", "deploy/synthetic/run-synthetic.js"]