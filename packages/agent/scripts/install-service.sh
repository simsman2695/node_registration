#!/bin/bash
set -euo pipefail

INSTALL_DIR="/opt/node-registration-agent"
SERVICE_FILE="/etc/systemd/system/node-registration-agent.service"

echo "Installing node-registration-agent..."

# Create install directory
mkdir -p "$INSTALL_DIR"

# Copy built files
cp -r dist/ "$INSTALL_DIR/"
cp package.json "$INSTALL_DIR/"
cp -r node_modules/ "$INSTALL_DIR/" 2>/dev/null || true

# Copy .env if it exists
if [ -f .env ]; then
  cp .env "$INSTALL_DIR/"
else
  echo "WARNING: No .env file found. Copy .env.example to .env and configure it."
  cp .env.example "$INSTALL_DIR/.env"
fi

# Install systemd service
cp scripts/node-registration-agent.service "$SERVICE_FILE"
systemctl daemon-reload
systemctl enable node-registration-agent
systemctl start node-registration-agent

echo "Service installed and started."
echo "Check status: systemctl status node-registration-agent"
echo "View logs: journalctl -u node-registration-agent -f"
