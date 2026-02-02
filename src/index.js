import { CONFIG } from './config.js';
import { handleVlessWebSocket } from './websocket-handler.js';
import { getFakeNginxPage } from './fake-page.js';

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const upgradeHeader = request.headers.get('Upgrade');
      
      // Check if request matches VLESS path and is WebSocket upgrade
      if (url.pathname === CONFIG.PATH && upgradeHeader === 'websocket') {
        return await handleVlessWebSocket(request);
      }
      
      // Return fake nginx page for all other requests
      return new Response(getFakeNginxPage(), {
        status: 200,
        headers: {
          'Content-Type': 'text/html;charset=UTF-8',
          'Server': 'nginx/1.18.0'
        }
      });
      
    } catch (error) {
      console.error('Worker error:', error);
      return new Response('Bad Request', { 
        status: 400,
        headers: { 'Server': 'nginx/1.18.0' }
      });
    }
  }
};
