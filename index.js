/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run "npm run dev" in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run "npm run deploy" to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

/** 
export default {
  async fetch(request, env, ctx) {
    // You can view your logs in the Observability dashboard
    console.info({ message: 'Hello World Worker received a request!' }); 
    return new Response('Hello World!');
  }
};
*/

function safeExtractTTL(buffer) {
  try {
    const view = new DataView(buffer);
    const qdcount = view.getUint16(4);
    const ancount = view.getUint16(6);
    if (ancount === 0) return null;

    let offset = 12;
    // Skip questions
    for (let i = 0; i < qdcount; i++) {
      while (view.getUint8(offset) !== 0) {
        offset += view.getUint8(offset) + 1;
      }
      offset += 5; // null + QTYPE + QCLASS
    }

    // First answer
    offset += 2; // NAME pointer
    offset += 2; // TYPE
    offset += 2; // CLASS
    return view.getUint32(offset); // TTL
  } catch {
    return null; // fallback if parsing fails
  }
}

export default {
  async fetch(request, env, ctx) {
    if (request.method !== 'GET' && request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const upstream = env.UPSTREAM_DOH || 'https://1.1.1.1/dns-query';
    const url = new URL(request.url);
    const dohUrl = `${upstream}${url.search}`;

    const init = {
      method: request.method,
      headers: {
        'Content-Type': 'application/dns-message',
        'Accept': 'application/dns-message',
      },
      body: request.method === 'POST' ? await request.arrayBuffer() : undefined,
    };

    try {
      // Fetch upstream
      const upstreamResp = await fetch(dohUrl, init);
      const buffer = await upstreamResp.arrayBuffer();

      // Extract TTL
      let ttl = safeExtractTTL(buffer);
      if (!ttl) ttl = env.CACHE_TTL_DEFAULT || 30;
      const minTTL = env.CACHE_TTL_MIN || 10;
      const maxTTL = env.CACHE_TTL_MAX || 60;
      const boundedTTL = Math.max(minTTL, Math.min(ttl, maxTTL));

      // Return response with proper headers
      return new Response(buffer, {
        status: upstreamResp.status,
        headers: {
          'Content-Type': 'application/dns-message',
          'Cache-Control': `max-age=${boundedTTL}`,
        },
      });
    } catch (err) {
      return new Response('Upstream error', { status: 502 });
    }
  }
};