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
    // 임시 점검: 환경변수 이름만 보여 준다(값은 절대 내보내지 않음)
    if (url.pathname === '/api/_env') return new Response(JSON.stringify({ keys: Object.keys(env), molit: typeof env.MOLIT_KEY, len: env.MOLIT_KEY ? String(env.MOLIT_KEY).length : 0 }), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
    if (url.pathname.startsWith('/api/')) return new Response('Not Found', { status: 404 });
    return env.ASSETS.fetch(request);
  }
};
