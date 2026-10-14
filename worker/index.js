// 예나준 Worker 진입점 — /api/* 만 코드로 처리하고, 나머지는 정적 파일(assets)을 그대로 돌려준다.
// 배포 설정은 저장소 맨 위 wrangler.jsonc, 정적 파일에서 뺄 목록은 .assetsignore.
import { onRequestGet as aptPrice } from './apt-price.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/apt-price') {
      if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405, headers: { allow: 'GET' } });
      return aptPrice({ request, env, waitUntil: (p) => ctx.waitUntil(p) });
    }
    if (url.pathname.startsWith('/api/')) return new Response('Not Found', { status: 404 });
    return env.ASSETS.fetch(request);
  }
};
