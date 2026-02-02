/**
 * VLESS WebSocket Proxy Configuration
 * VPS IP: 152.42.239.18
 * Domain: khmlbb.kingczin.me
 */

export const CONFIG = {
  // VLESS UUID for authentication
  UUID: '8cd43dab-a5ae-4634-b9b1-3efa38615e0d',
  
  // WebSocket configuration
  WEBSOCKET_PATH: '/vless/',
  
  // Server configuration
  PORT: 80,
  HOST: '0.0.0.0',
  
  // VPS details
  VPS_IP: '159.65.10.18',
  DOMAIN: 'khmlbb.kingczin.me',
  
  // Logging
  LOG_CONNECTIONS: true,
  LOG_ERRORS: true,
  
  // Connection settings
  TIMEOUT: 300000, // 5 minutes
  KEEPALIVE: true
};

export default CONFIG;
