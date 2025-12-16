#!/bin/bash

# Frontend deployment script
# Usage: ./deploy-frontend.sh

set -e

echo "🚀 Building frontend for production..."

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

# Build for production
echo "🔨 Building production bundle..."
pnpm run build

# Build Docker image
echo "🐳 Building Docker image..."
docker build -t ast-tools-frontend:latest .

# Stop existing container
echo "🛑 Stopping existing container..."
docker stop ast-tools-frontend 2>/dev/null || true
docker rm ast-tools-frontend 2>/dev/null || true

# Run new container
echo "🚀 Starting new container..."
docker run -d \
  --name ast-tools-frontend \
  --restart unless-stopped \
  -p 9090:80 \
  ast-tools-frontend:latest

# Wait for container to be healthy
echo "⏳ Waiting for frontend to be healthy..."
timeout 30 bash -c 'until curl -f http://localhost:9090 > /dev/null 2>&1; do sleep 2; done' || {
    echo "❌ Frontend failed to start"
    docker logs ast-tools-frontend
    exit 1
}

echo "✅ Frontend deployed successfully!"
echo "📝 Access: http://172.18.220.56:9090"
