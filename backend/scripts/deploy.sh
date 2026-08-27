#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Nabd Platform — Deployment Script
# Usage: ./scripts/deploy.sh [prod|staging]
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

ENV=${1:-staging}
echo "🚀 Deploying Nabd Backend — Environment: $ENV"

# Pull latest images
echo "📦 Pulling latest images..."
docker compose pull

# Build application
echo "🔨 Building application..."
docker compose build --no-cache backend

# Run database migrations / seeds if needed
echo "🗄️ Starting services..."
docker compose up -d mongodb redis

echo "⏳ Waiting for MongoDB and Redis to be ready..."
sleep 10

# Start all services
docker compose up -d

echo "✅ Deployment complete!"
echo ""
echo "Services status:"
docker compose ps
echo ""
echo "Logs (last 20 lines):"
docker compose logs --tail=20 backend
