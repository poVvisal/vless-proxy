#!/bin/bash

#############################################
# VLESS WebSocket Proxy Installation Script
# For Ubuntu VPS
#############################################

set -e  # Exit on error

echo "═══════════════════════════════════════════════════════"
echo "  VLESS WebSocket Proxy - Installation Script"
echo "═══════════════════════════════════════════════════════"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

echo "✓ Running as root"
echo ""

# Update system
echo "📦 Updating system packages..."
apt-get update -qq
apt-get upgrade -y -qq

# Install Node.js (using NodeSource repository for latest LTS)
echo "📦 Installing Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    echo "✓ Node.js installed: $(node --version)"
else
    echo "✓ Node.js already installed: $(node --version)"
fi

echo "✓ npm version: $(npm --version)"
echo ""

# Create installation directory
INSTALL_DIR="/opt/vless-proxy"
echo "📁 Creating installation directory: $INSTALL_DIR"

if [ -d "$INSTALL_DIR" ]; then
    echo "⚠️  Directory exists, backing up to ${INSTALL_DIR}.backup.$(date +%s)"
    mv "$INSTALL_DIR" "${INSTALL_DIR}.backup.$(date +%s)"
fi

mkdir -p "$INSTALL_DIR"
echo "✓ Directory created"
echo ""

# Copy files
echo "📋 Copying application files..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cp "$SCRIPT_DIR/package.json" "$INSTALL_DIR/"
cp "$SCRIPT_DIR/config.js" "$INSTALL_DIR/"
cp "$SCRIPT_DIR/fake-page.js" "$INSTALL_DIR/"
cp "$SCRIPT_DIR/vless-parser.js" "$INSTALL_DIR/"
cp "$SCRIPT_DIR/websocket-proxy.js" "$INSTALL_DIR/"
cp "$SCRIPT_DIR/server.js" "$INSTALL_DIR/"

echo "✓ Files copied"
echo ""

# Install dependencies
echo "📦 Installing npm dependencies..."
cd "$INSTALL_DIR"
npm install --production --quiet
echo "✓ Dependencies installed"
echo ""

# Install systemd service
echo "⚙️  Installing systemd service..."
cp "$SCRIPT_DIR/vless-proxy.service" /etc/systemd/system/
systemctl daemon-reload
echo "✓ Service file installed"
echo ""

# Configure firewall (UFW)
echo "🔥 Configuring firewall (UFW)..."
if command -v ufw &> /dev/null; then
    ufw allow 80/tcp comment 'VLESS Proxy HTTP'
    ufw allow 443/tcp comment 'VLESS Proxy HTTPS (future)'
    ufw allow 22/tcp comment 'SSH'
    
    # Enable UFW if not already enabled
    if ! ufw status | grep -q "Status: active"; then
        echo "y" | ufw enable
    fi
    
    echo "✓ Firewall rules configured"
else
    echo "⚠️  UFW not found, skipping firewall configuration"
fi
echo ""

# Set permissions
echo "🔒 Setting permissions..."
chown -R root:root "$INSTALL_DIR"
chmod -R 755 "$INSTALL_DIR"
echo "✓ Permissions set"
echo ""

# Enable and start service
echo "🚀 Starting VLESS proxy service..."
systemctl enable vless-proxy.service
systemctl start vless-proxy.service

# Wait a moment for service to start
sleep 2

# Check service status
if systemctl is-active --quiet vless-proxy.service; then
    echo "✓ Service started successfully"
else
    echo "❌ Service failed to start. Check logs with: journalctl -u vless-proxy -f"
    exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  ✅ Installation Complete!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📊 Service Status:"
systemctl status vless-proxy.service --no-pager | head -n 10
echo ""
echo "📝 Useful Commands:"
echo "  • View logs:        journalctl -u vless-proxy -f"
echo "  • Restart service:  systemctl restart vless-proxy"
echo "  • Stop service:     systemctl stop vless-proxy"
echo "  • Service status:   systemctl status vless-proxy"
echo ""
echo "🌐 Configuration:"
echo "  • Domain:           khmlbb.kingczin.me"
echo "  • VPS IP:           152.42.239.18"
echo "  • WebSocket Path:   /vless/"
echo "  • Port:             80"
echo ""
echo "⚠️  Next Steps:"
echo "  1. Configure your domain DNS to point to 152.42.239.18"
echo "  2. Test connection: curl http://152.42.239.18"
echo "  3. Configure your VLESS client with the provided settings"
echo ""
echo "═══════════════════════════════════════════════════════"
