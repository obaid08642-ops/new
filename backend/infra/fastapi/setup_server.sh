#!/bin/bash
# =============================================================
# Nabd Plus — Server Setup Script
# AWS EC2 Ubuntu 24.04 LTS
# =============================================================
set -e

echo "=========================================="
echo "  ✅ Step 1: Installing system essentials"
echo "=========================================="
sudo apt-get install -y curl wget gnupg git unzip software-properties-common

echo ""
echo "=========================================="
echo "  ✅ Step 2: Installing MongoDB 7.0"
echo "=========================================="
# Add MongoDB GPG key and repo
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update -y
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
echo "  ✅ MongoDB installed and running"

echo ""
echo "=========================================="
echo "  ✅ Step 3: Installing Node.js 20"
echo "=========================================="
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version
npm --version
echo "  ✅ Node.js installed"

echo ""
echo "=========================================="
echo "  ✅ Step 4: Installing PM2 (Process Manager)"
echo "=========================================="
sudo npm install -g pm2
pm2 --version
echo "  ✅ PM2 installed"

echo ""
echo "=========================================="
echo "  ✅ Step 5: Installing Python 3 and pip"
echo "=========================================="
sudo apt-get install -y python3 python3-pip python3-venv
python3 --version
pip3 --version
echo "  ✅ Python3 installed"

echo ""
echo "=========================================="
echo "  ✅ Step 6: Opening Firewall Ports"
echo "=========================================="
# Allow MongoDB, FastAPI, NestJS ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 8000/tcp  # FastAPI
sudo ufw allow 8002/tcp  # NestJS Backend
sudo ufw allow 27017/tcp # MongoDB (local only ideally)
echo "  ✅ Ports opened"

echo ""
echo "=========================================="
echo "  ✅ Setup Complete!"
echo "=========================================="
echo "  MongoDB Status:"
sudo systemctl status mongod --no-pager | head -5
echo ""
echo "  Node version:   $(node --version)"
echo "  NPM version:    $(npm --version)"
echo "  Python version: $(python3 --version)"
echo "  PM2 version:    $(pm2 --version)"
echo ""
echo "  🚀 Server is ready for deployment!"
