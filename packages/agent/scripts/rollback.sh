#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="${AGENT_INSTALL_DIR:-/opt/node-registration-agent}"
SERVICE_NAME="${AGENT_SERVICE:-node-registration-agent}"

DIST_DIR="$INSTALL_DIR/dist"
DIST_BAK="$INSTALL_DIR/dist.bak"

if [ ! -d "$DIST_BAK" ]; then
  echo "ERROR: No backup found at $DIST_BAK — nothing to roll back to."
  exit 1
fi

echo "Rolling back agent..."
echo "  Removing current dist: $DIST_DIR"
rm -rf "$DIST_DIR"

echo "  Restoring backup: $DIST_BAK -> $DIST_DIR"
mv "$DIST_BAK" "$DIST_DIR"

echo "  Restarting service: $SERVICE_NAME"
sudo systemctl restart "$SERVICE_NAME"

echo "Rollback complete. Check status with: systemctl status $SERVICE_NAME"
