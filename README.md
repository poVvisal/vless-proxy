# VLESS WebSocket Proxy Server

A lightweight VLESS WebSocket proxy server designed to run on Ubuntu VPS.

## Server Configuration

- **VPS IP**: 159.65.10.18
- **Domain**: khmlbb.kingczin.me
- **UUID**: 8cd43dab-a5ae-4634-b9b1-3efa38615e0d
- **WebSocket Path**: /vless/
- **Port**: 80

## Features

- ✅ VLESS protocol support (version 0)
- ✅ WebSocket transport
- ✅ TCP proxy (IPv4, IPv6, Domain)
- ✅ UUID authentication
- ✅ Fake nginx page for stealth
- ✅ Systemd service integration
- ✅ Connection logging

## Installation

### Quick Install (Ubuntu VPS)

```bash
# Upload all files to your VPS
scp -r * root@159.65.10.18:/root/vless-proxy/

# SSH into your VPS
ssh root@159.65.10.18

# Navigate to directory
cd /root/vless-proxy

# Make install script executable
chmod +x install.sh

# Run installation
sudo ./install.sh
```

### Manual Installation

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs

# Create directory
sudo mkdir -p /opt/vless-proxy
cd /opt/vless-proxy

# Copy files and install dependencies
npm install

# Install systemd service
sudo cp vless-proxy.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable vless-proxy
sudo systemctl start vless-proxy
```

## Usage

### Service Management

```bash
# Start service
sudo systemctl start vless-proxy

# Stop service
sudo systemctl stop vless-proxy

# Restart service
sudo systemctl restart vless-proxy

# Check status
sudo systemctl status vless-proxy

# View logs
sudo journalctl -u vless-proxy -f
```

### Testing

```bash
# Test HTTP endpoint (should show fake nginx page)
curl http://159.65.10.18

# Check if server is listening
netstat -tulpn | grep :80
```

## Client Configuration

Configure your VLESS client with these settings:

```
Protocol: VLESS
Address: khmlbb.kingczin.me (or 159.65.10.18)
Port: 80
UUID: 8cd43dab-a5ae-4634-b9b1-3efa38615e0d
Transport: WebSocket
Path: /vless/
TLS: Off (for port 80)
```

## File Structure

```
vless-proxy/
├── server.js           # Main entry point
├── config.js           # Configuration
├── vless-parser.js     # VLESS protocol parser
├── websocket-proxy.js  # WebSocket handler
├── fake-page.js        # Fake nginx page
├── package.json        # Dependencies
├── vless-proxy.service # Systemd service
├── install.sh          # Installation script
└── README.md          # This file
```

## Security Notes

- Change the UUID in `config.js` for production use
- Consider adding TLS/SSL for port 443
- Configure firewall rules appropriately
- Monitor logs for suspicious activity
- Keep Node.js and dependencies updated

## Troubleshooting

### Service won't start
```bash
sudo journalctl -u vless-proxy -n 50
```

### Port 80 already in use
```bash
sudo lsof -i :80
# Stop conflicting service or change PORT in config.js
```

### Connection refused
```bash
# Check firewall
sudo ufw status
sudo ufw allow 80/tcp

# Check if service is running
sudo systemctl status vless-proxy
```

## License

MIT

## Support

For issues and questions, check the logs and systemd status first.
