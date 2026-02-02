import { processVlessHeader } from './vless-parser.js';
import { CONFIG } from './config.js';

export async function handleVlessWebSocket(request) {
  const webSocketPair = new WebSocketPair();
  const [client, server] = Object.values(webSocketPair);
  
  server.accept();
  
  let remoteSocket = null;
  let addressRemote = '';
  let portRemote = 0;
  
  const log = (msg, data = '') => {
    console.log(`[${addressRemote}:${portRemote}] ${msg}`, data);
  };
  
  // Handle incoming WebSocket messages
  server.addEventListener('message', async (event) => {
    try {
      const vlessBuffer = new Uint8Array(event.data);
      
      if (!remoteSocket) {
        // First message: parse VLESS header
        const result = processVlessHeader(vlessBuffer, CONFIG.UUID);
        
        if (result.hasError) {
          log('Header parse error:', result.message);
          server.close(1002, 'Protocol error');
          return;
        }
        
        addressRemote = result.addressRemote;
        portRemote = result.portRemote;
        
        log(`Connecting to ${addressRemote}:${portRemote}`);
        
        // Establish TCP connection to target
        remoteSocket = connect({
          hostname: addressRemote,
          port: portRemote
        });
        
        // Pipe remote responses back to client
        pipeRemoteToWebSocket(remoteSocket, server, log);
        
        // Forward payload data after VLESS header
        const payload = vlessBuffer.slice(result.rawDataIndex);
        if (payload.byteLength > 0) {
          const writer = remoteSocket.writable.getWriter();
          await writer.write(payload);
          writer.releaseLock();
        }
        
      } else {
        // Subsequent messages: forward to remote
        const writer = remoteSocket.writable.getWriter();
        await writer.write(vlessBuffer);
        writer.releaseLock();
      }
      
    } catch (error) {
      log('Message error:', error.message);
      safeCloseWebSocket(server);
      if (remoteSocket) {
        try { remoteSocket.close(); } catch {}
      }
    }
  });
  
  server.addEventListener('close', () => {
    log('WebSocket closed by client');
    if (remoteSocket) {
      try { remoteSocket.close(); } catch {}
    }
  });
  
  server.addEventListener('error', (error) => {
    log('WebSocket error:', error.message);
  });
  
  return new Response(null, {
    status: 101,
    webSocket: client
  });
}

async function pipeRemoteToWebSocket(remoteSocket, webSocket, log) {
  try {
    const reader = remoteSocket.readable.getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        log('Remote connection closed');
        break;
      }
      
      if (webSocket.readyState === WebSocket.READY_STATE_OPEN) {
        webSocket.send(value);
      } else {
        log('WebSocket not open, stopping pipe');
        break;
      }
    }
  } catch (error) {
    log('Pipe error:', error.message);
  } finally {
    safeCloseWebSocket(webSocket);
  }
}

function safeCloseWebSocket(ws) {
  try {
    if (ws.readyState === WebSocket.READY_STATE_OPEN || 
        ws.readyState === WebSocket.READY_STATE_CONNECTING) {
      ws.close();
    }
  } catch (error) {
    console.log('Error closing WebSocket:', error.message);
  }
}
