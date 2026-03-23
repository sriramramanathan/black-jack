import { BlackjackRoom } from './BlackjackRoom';

// Re-export the DO class — Cloudflare requires this so the runtime knows
// which classes to register as Durable Objects
export { BlackjackRoom };

export interface Env {
  BLACKJACK_ROOM: DurableObjectNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS headers — needed so the web app (on a different domain) can connect.
    // In production you'd lock this down to your actual domain.
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Route: GET /room/new → generate a room code and return it
    if (url.pathname === '/room/new') {
      const code = generateRoomCode();
      return Response.json({ roomCode: code }, { headers: corsHeaders });
    }

    // Route: GET /room/:roomCode (WebSocket upgrade only)
    // e.g. wss://blackjack.yourname.workers.dev/room/ABC123
    const roomMatch = url.pathname.match(/^\/room\/([A-Z0-9]{4,12})$/i);
    if (roomMatch) {
      // Reject non-WebSocket requests here — before instantiating the DO —
      // so we don't spin up a DO unnecessarily
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('This endpoint only accepts WebSocket connections', {
          status: 426,
        });
      }

      const roomCode = roomMatch[1].toUpperCase();

      // idFromName gives us a stable DO id for a given name.
      // The same room code always maps to the same DO instance.
      const id = env.BLACKJACK_ROOM.idFromName(roomCode);
      const room = env.BLACKJACK_ROOM.get(id);

      // Forward the request (including the WebSocket upgrade) to the DO
      return room.fetch(request);
    }

    return new Response('Not found', { status: 404 });
  },
};

// Generates a random 6-character uppercase room code e.g. "A3X9KQ"
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I to avoid confusion
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
