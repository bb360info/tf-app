#!/bin/bash

# Abort on error
set -e

echo "🚀 Starting VPS Setup..."

# 1. Update System
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# 2. Install Essentials
echo "🛠️ Installing essential tools..."
apt install -y curl wget git unzip ufw htop

# 3. Security: UFW Firewall
echo "🛡️ Configuring Firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw allow 8090/tcp # PocketBase API (temporary, for direct access if needed)
echo "y" | ufw enable

# 4. Install Docker & Docker Compose
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    echo "✅ Docker installed."
else
    echo "✅ Docker already installed."
fi

# 5. Create Directory for Project
mkdir -p /opt/tf-app
cd /opt/tf-app

echo "✅ VPS Setup Complete! Ready for Docker Compose."
docker --version
