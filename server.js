/**
 * VLESS WebSocket Proxy Server
 * Main entry point
 */

import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { CONFIG } from './config.js';
import { handleWebSocketUpgrade } from './websocket-proxy.js';
import { getNginxWelcomePage } from './fake-page.js';

// Create Express app
const app = express();

// Create HTTP server
const server = createServer(app);

// Create WebSocket server (noServer mode for manual upgrade handling)
const wss = new WebSocketServer({ noServer: true });

/**
 * HTTP Route Handler
 * Serves fake nginx page for regular HTTP requests
 */
app.get('*', (req, res) => {
  // Log non-VLESS access attempts
  if (CONFIG.LOG_CONNECTIONS) {
    console.log(`[HTTP] Request from ${req.ip} to ${req.path}`);
  }

  // Serve fake nginx welcome page
  res.status(200).send(getNginxWelcomePage());
});

/**
 * WebSocket Upgrade Handler
 * Only upgrade connections to the VLESS path
 */
server.on('upgrade', (request, socket, head) => {
  const { pathname } = new URL(request.url, `http://${request.headers.host}`);

  // Check if request is for VLESS WebSocket path
  if (pathname === CONFIG.WEBSOCKET_PATH) {
    // Verify WebSocket upgrade
    const upgradeHeader = request.headers['upgrade'];
    
    if (upgradeHeader && upgradeHeader.toLowerCase() === 'websocket') {
      if (CONFIG.LOG_CONNECTIONS) {
        console.log(`[Upgrade] WebSocket upgrade request from ${socket.remoteAddress}`);
      }

      // Handle WebSocket upgrade
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      // Not a WebSocket upgrade, reject
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
    }
  } else {
    // Wrong path, reject upgrade
    if (CONFIG.LOG_CONNECTIONS) {
      console.log(`[Upgrade] Rejected upgrade to invalid path: ${pathname}`);
    }
    
    socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    socket.destroy();
  }
});

/**
 * WebSocket Connection Handler
 * Process VLESS protocol connections
 */
wss.on('connection', (ws, request) => {
  const clientIP = request.socket.remoteAddress;
  
  if (CONFIG.LOG_CONNECTIONS) {
    console.log(`[VLESS] New VLESS connection from ${clientIP}`);
  }

  // Handle the VLESS WebSocket connection
  handleWebSocketUpgrade(ws, CONFIG);
});

/**
 * WebSocket Server Error Handler
 */
wss.on('error', (error) => {
  console.error('[WebSocket Server] Error:', error.message);
});

/**
 * Start the server
 */
server.listen(CONFIG.PORT, CONFIG.HOST, () => {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  VLESS WebSocket Proxy Server');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  🚀 Server running on: ${CONFIG.HOST}:${CONFIG.PORT}`);
  console.log(`  🌐 Domain: ${CONFIG.DOMAIN}`);
  console.log(`  📡 VPS IP: ${CONFIG.VPS_IP}`);
  console.log(`  🔌 WebSocket Path: ${CONFIG.WEBSOCKET_PATH}`);
  console.log(`  🔑 UUID: ${CONFIG.UUID}`);
  console.log(`  📊 Logging: ${CONFIG.LOG_CONNECTIONS ? 'Enabled' : 'Disabled'}`);
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Server is ready to accept connections');
  console.log('═══════════════════════════════════════════════════════\n');
});

/**
 * Graceful shutdown handler
 */
process.on('SIGTERM', () => {
  console.log('\n[Server] SIGTERM received, shutting down gracefully...');
  
  server.close(() => {
    console.log('[Server] HTTP server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('[Server] Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
});

process.on('SIGINT', () => {
  console.log('\n[Server] SIGINT received, shutting down gracefully...');
  
  server.close(() => {
    console.log('[Server] HTTP server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('[Server] Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
});

/**
 * Unhandled error handlers
 */
process.on('uncaughtException', (error) => {
  console.error('[Process] Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Process] Unhandled Rejection at:', promise, 'reason:', reason);
});
