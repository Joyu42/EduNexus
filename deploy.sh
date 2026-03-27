#!/bin/bash

# echo "🔄 Pull latest code..."
# git pull
set -e  # ❗出错直接停止
echo "📦 Install deps..."
pnpm install

echo "🏗 Build project..."
pnpm run build

echo "🚀 Restart or start service..."

pm2 describe edunexus-preview > /dev/null \
  && pm2 restart edunexus-preview \
  || pm2 start ecosystem.config.js

echo "✅ Done!"