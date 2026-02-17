#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
OUTPUT_DIR="${RELEASE_DIR:-$AGENT_DIR/../../releases}"

cd "$AGENT_DIR"

# Read version from package.json
VERSION=$(node -p "require('./package.json').version")
echo "Building agent release v${VERSION}..."

# Build TypeScript
echo "Compiling TypeScript..."
npx tsc

# Create staging directory
STAGING=$(mktemp -d)
trap 'rm -rf "$STAGING"' EXIT

# Copy dist (compiled JS)
cp -r dist "$STAGING/dist"

# Install production dependencies into staging
cp package.json "$STAGING/package.json"
cp pnpm-lock.yaml "$STAGING/pnpm-lock.yaml" 2>/dev/null || true
cd "$STAGING"
npm install --omit=dev --ignore-scripts 2>/dev/null || {
  # Fallback: copy node_modules from source
  cd "$AGENT_DIR"
  cp -r node_modules "$STAGING/node_modules"
}
cd "$AGENT_DIR"

# Remove lock file from staging (not needed at runtime)
rm -f "$STAGING/pnpm-lock.yaml"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Create tarball
FILENAME="agent-${VERSION}.tar.gz"
tar -czf "$OUTPUT_DIR/$FILENAME" -C "$STAGING" .

# Compute SHA256
SHA256=$(sha256sum "$OUTPUT_DIR/$FILENAME" | awk '{print $1}')
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Write manifest
cat > "$OUTPUT_DIR/manifest.json" << EOF
{
  "version": "${VERSION}",
  "sha256": "${SHA256}",
  "filename": "${FILENAME}",
  "timestamp": "${TIMESTAMP}"
}
EOF

echo ""
echo "Release built successfully:"
echo "  Tarball:  $OUTPUT_DIR/$FILENAME"
echo "  SHA256:   $SHA256"
echo "  Manifest: $OUTPUT_DIR/manifest.json"
echo "  Version:  $VERSION"
