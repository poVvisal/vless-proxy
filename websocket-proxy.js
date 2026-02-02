/**
 * WebSocket Proxy Handler
 * 
 * Handles WebSocket connections for VLESS protocol:
 * 1. Receives WebSocket connection from client
 * 2. Parses VLESS header to extract target destination
 * 3. Creates TCP connection to target server
 * 4. Pipes data bidirectionally between WebSocket and TCP socket
 */

import net from 'net';
import { processVlessHeader } from './vless-parser.js';

/**
 * Pipe data from remote TCP socket to WebSocket client
 * @param {net.Socket} tcpSocket - Remote TCP connection
 * @param {WebSocket} ws - WebSocket connection to client
 * @param {string} address - Target address for logging
 * @param {number} port - Target port for logging
 */
function pipeRemoteToWebSocket(tcpSocket, ws, address, port) {
  tcpSocket.on('data', (chunk) => {
    try {
      if (ws.readyState === ws.OPEN) {
        // Send binary data to WebSocket client
        ws.send(chunk);
      }
    } catch (error) {
      console.error(`[${address}:${port}] Error sending to WebSocket:`, error.message);
      safeClose(tcpSocket);
    }
  });

  tcpSocket.on('end', () => {
    console.log(`[${address}:${port}] Remote connection ended`);
    safeClose(ws);
  });

  tcpSocket.on('error', (error) => {
    console.error(`[${address}:${port}] Remote socket error:`, error.message);
    safeClose(ws);
  });
}

/**
 * Safely close a connection (WebSocket or TCP socket)
 * @param {WebSocket|net.Socket} connection - Connection to close
 */
function safeClose(connection) {
  try {
    if (connection) {
      if (connection.readyState === 1 || connection.readyState === 0) {
        // WebSocket: OPEN or CONNECTING
        connection.close();
      } else if (connection.destroyed === false) {
        // TCP Socket: not destroyed
        connection.destroy();
      }
    }
  } catch (error) {
    // Ignore errors during cleanup
  }
}

/**
 * Handle WebSocket connection upgrade for VLESS protocol
 * @param {WebSocket} ws - WebSocket connection from client
 * @param {Object} config - Configuration object with UUID and logging settings
 */
export function handleWebSocketUpgrade(ws, config) {
  const { UUID, LOG_CONNECTIONS } = config;
  
  // Connection state
  let remoteSocket = null;
  let addressRemote = '';
  let portRemote = 0;
  let isFirstMessage = true;
  let isHeaderProcessed = false;

  if (LOG_CONNECTIONS) {
    console.log(`[WebSocket] New connection established`);
  }

  /**
   * Handle incoming WebSocket messages
   * First message contains VLESS header + initial payload
   * Subsequent messages are pure data
   */
  ws.on('message', async (data) => {
    try {
      // Convert to Uint8Array for processing
      const buffer = new Uint8Array(data);

      // ===== First Message: Parse VLESS Header =====
      if (isFirstMessage) {
        isFirstMessage = false;

        // Parse VLESS protocol header
        const vlessInfo = processVlessHeader(buffer, UUID);

        if (vlessInfo.hasError) {
          console.error(`[VLESS] Header parsing failed: ${vlessInfo.message}`);
          ws.close(1008, vlessInfo.message); // Policy Violation
          return;
        }

        // Extract target destination
        addressRemote = vlessInfo.addressRemote;
        portRemote = vlessInfo.portRemote;
        const payloadStartIndex = vlessInfo.rawDataIndex;

        if (LOG_CONNECTIONS) {
          console.log(`[${addressRemote}:${portRemote}] VLESS header parsed successfully`);
          console.log(`[${addressRemote}:${portRemote}] Connecting to target...`);
        }

        // ===== Create TCP Connection to Target =====
        remoteSocket = net.connect(
          {
            host: addressRemote,
            port: portRemote,
            allowHalfOpen: false
          },
          () => {
            // Connection established
            isHeaderProcessed = true;
            
            if (LOG_CONNECTIONS) {
              console.log(`[${addressRemote}:${portRemote}] ✓ Connected to remote server`);
            }

            // Forward any payload data that came with the header
            if (payloadStartIndex < buffer.length) {
              const initialPayload = buffer.slice(payloadStartIndex);
              remoteSocket.write(Buffer.from(initialPayload));
              
              if (LOG_CONNECTIONS) {
                console.log(`[${addressRemote}:${portRemote}] Forwarded ${initialPayload.length} bytes initial payload`);
              }
            }

            // Start piping data from remote to WebSocket
            pipeRemoteToWebSocket(remoteSocket, ws, addressRemote, portRemote);
          }
        );

        // Handle connection errors
        remoteSocket.on('error', (error) => {
          console.error(`[${addressRemote}:${portRemote}] Connection error:`, error.message);
          ws.close(1011, 'Remote connection failed');
          safeClose(remoteSocket);
        });

        // Handle connection timeout
        remoteSocket.setTimeout(config.TIMEOUT || 300000, () => {
          console.log(`[${addressRemote}:${portRemote}] Connection timeout`);
          safeClose(remoteSocket);
          safeClose(ws);
        });

        return;
      }

      // ===== Subsequent Messages: Forward to Remote =====
      // This implements pipeWebSocketToRemote() pattern
      if (remoteSocket && isHeaderProcessed && !remoteSocket.destroyed) {
        remoteSocket.write(Buffer.from(buffer));
      } else if (!isHeaderProcessed) {
        // Still waiting for remote connection
        console.warn(`[${addressRemote}:${portRemote}] Received data before connection ready`);
      }

    } catch (error) {
      console.error(`[WebSocket] Message handling error:`, error.message);
      safeClose(remoteSocket);
      ws.close(1011, 'Internal server error');
    }
  });

  /**
   * Handle WebSocket close event
   */
  ws.on('close', (code, reason) => {
    if (LOG_CONNECTIONS) {
      const reasonText = reason ? reason.toString() : 'No reason';
      console.log(`[${addressRemote || 'unknown'}:${portRemote || 0}] WebSocket closed (code: ${code}, reason: ${reasonText})`);
    }
    
    // Cleanup remote connection
    safeClose(remoteSocket);
  });

  /**
   * Handle WebSocket error event
   */
  ws.on('error', (error) => {
    console.error(`[${addressRemote || 'unknown'}:${portRemote || 0}] WebSocket error:`, error.message);
    
    // Cleanup both connections
    safeClose(remoteSocket);
    safeClose(ws);
  });

  /**
   * Handle unexpected connection closure
   */
  ws.on('unexpected-response', (request, response) => {
    console.error(`[WebSocket] Unexpected response: ${response.statusCode}`);
  });
}

/**
 * Note on pipeWebSocketToRemote pattern:
 * 
 * The WebSocket → Remote piping is handled through the 'message' event handler above.
 * After the VLESS header is processed, all subsequent WebSocket messages are directly
 * written to the TCP socket via remoteSocket.write().
 * 
 * This approach is more efficient than creating a separate piping function because:
 * 1. WebSocket doesn't expose a readable stream interface
 * 2. We need to handle the VLESS header specially on first message
 * 3. Direct write() calls minimize overhead
 * 
 * The remote → WebSocket direction uses the pipeRemoteToWebSocket() function which
 * handles the TCP socket's 'data' events and forwards to WebSocket.
 */

export default handleWebSocketUpgrade;
