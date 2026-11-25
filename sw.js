/* ICT بالعربي 6.8.74: prioritize the home offline shell; other pages cache when visited. */
const CACHE='ict-shell-2026-11-25-bybit-only';
const PREFIX='ict-shell-';
const CORE=["./site-visual-system.css","./unified-theme.css","./ict-home-header-exact-691914.js","./ict-home-header-exact-691914.css","./asset-config.js","./asset.js","./ict-entry-stream.js","./site-shell-691911.css","./site-shell-691911.js","./ict-monitor-auto-refresh-709.js","./ict-desktop-more-7013.js","./ict-desktop-more-7013.css","./tools.html","./ict-tools-hub-7011.css","./ict-tools-unified-7012.css","./ict-tools-entry-7011.css","./ict-tools-deeplink-7011.js","./ict-background-status-708c2.js","./ict-background-status-708c2.css","./ict-readiness-console-708c.css","./ict-opportunity-lifecycle-708b.js","./ict-opportunity-console-708b.js","./ict-opportunity-center-708b.css","./decision-center.html","./ict-decision-engine-708a.js","./ict-decision-console-708a.js","./ict-decision-center-708a.css","./ict-weekly-core-707c.js","./ict-weekly-console-707c.js","./ict-weekly-console-707c.css","./ict-performance-core-707b.js","./ict-performance-console-707b.js","./ict-performance-console-707b.css","./ict-accounts-707a.js","./ict-accounts-707a.css","./ict-accounts-console-707a.js","./ict-accounts-journal-707a.js","./workspace.html","./smart-desk.html","./smart-desk.js","./ict-economic-compare-706c.js","./ict-economic-compare-console-706c.js","./ict-economic-compare-console-706c.css","./ict-event-impact-706b.js","./ict-event-impact-console-706b.js","./ict-event-impact-console-706b.css","./ict-economic-link-706a.js","./ict-economic-console-706a.js","./ict-economic-console-706a.css","./ict-learning-review-705c.js","./ict-learning-review-705c.css","./ict-replay-core-705b.js","./ict-replay-console-705b.js","./ict-replay-console-705b.css","./ict-academy-path-705a.js","./ict-academy-path-705a.css","./","./index.html","./style.css","./app.js","./navspeed-691916.js","./ict-data-core-700.js","./trust.html","./research.html","./ict-playbook-catalog-704a.js","./ict-playbook-console-704a.js","./ict-playbook-console-704a.css","./ict-case-engine-704b.js","./ict-case-library-704b.js","./ict-case-library-704b.css","./ict-validation-engine-704c.js","./ict-validation-console-704c.js","./ict-validation-console-704c.css","./ict-composite-console-704c2.css","./ict-composite-console-704c2.js","./ict-composite-validation-704c2.js","./ict-model-validation-704c3.js","./ict-model-console-704c3.js","./ict-model-console-704c3.css","./ict-advanced-validation-704c4.js","./ict-advanced-console-704c4.js","./ict-advanced-console-704c4.css","./ict-live-feed-702a.js","./ict-live-console-702a.js","./ict-live-console-702a.css","./ict-candle-store-702b.js","./ict-public-markets-702c2.js","./ict-public-console-702c2.js","./ict-structure-engine-702d.js","./ict-structure-console-702d.js","./ict-structure-console-702d.css","./ict-signal-engine-702e.js","./ict-signal-console-702e.js","./ict-market-times-702e.js","./ict-signal-console-702e.css","./ict-context-engine-703a.js","./ict-context-console-703a.js","./ict-context-console-703a.css","./ict-scenario-engine-703b.js","./ict-scenario-console-703b.js","./ict-scenario-console-703b.css","./ict-briefing-console-703c.css","./ict-briefing-engine-703c.js","./ict-briefing-console-703c.js","./ui-icons.css","./ui-icons.js","./ict-readiness-core-708c.js","./ict-readiness-console-708c.js","./ict-execution-safety-708c5.js","./logo-original.jpeg"];
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 // Bound parallelism to avoid congesting slower mobile connections during an update.
 let cursor=0;const concurrency=4;
 await Promise.all(Array.from({length:concurrency},async()=>{
  while(cursor<CORE.length){const path=CORE[cursor++];try{const url=new URL(path,self.registration.scope).href;const response=await fetch(url,{cache:'reload'});if(response.ok)await cache.put(url,response)}catch(_){/* unavailable optional resources should not block activation */}}
 }));
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)));
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const request=event.request;if(request.method!=='GET'||request.headers.has('Authorization'))return;
 const url=new URL(request.url),scope=new URL(self.registration.scope);
 if(url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
 if(url.pathname.includes('/push/')||/\/(admin\.html|admin\.js|admin\.css)$/.test(url.pathname))return;
 const name=url.pathname.split('/').pop()||'index.html';
 if(name==='economic-forecasts.json'||name==='economic-official.json'||name==='economic-bea.json'||name==='news-live.json'||name==='calendar-live.json'||name==='calendar-next.json'||name==='calendar-sync-status.json'||name==='market-movers.json'||name==='market-radar.json'||name==='market-xray.json'||name==='historical-candles.json'){
  // Live public data must be requested from the network, never presented as fresh from the shell cache.
  event.respondWith(fetch(request,{cache:'no-store'}).catch(()=>new Response('{}',{status:503,headers:{'Content-Type':'application/json'}})));
  return;
 }
 const isJson=name.endsWith('.json');
 const isShell=/\.(?:html|css|js)$/.test(name)||request.mode==='navigate';
 // Market, news, calendar, and all JSON feeds remain network-first.
 const cacheKey=isJson?new Request(new URL(url.pathname,scope.origin).href):request;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  if(isShell){
   const saved=await cache.match(cacheKey,{ignoreSearch:true});
   if(saved){
    // Don't delay navigation on slow links; refresh the cache without blocking the visitor.
    event.waitUntil(fetch(request,{cache:'no-cache'}).then(response=>{
      if(response.ok&&response.type==='basic')return cache.put(cacheKey,response.clone());
    }).catch(()=>{}));
    return saved;
   }
  }
  try{
   const response=await fetch(request,{cache:isShell?'no-cache':'default'});
   if(response.ok&&response.type==='basic')event.waitUntil(cache.put(cacheKey,response.clone()));
   return response;
  }catch(error){
   const saved=await cache.match(cacheKey,{ignoreSearch:!isJson});
   if(saved)return saved;
   if(request.mode==='navigate')return new Response('الصفحة غير متاحة بدون اتصال. افتحها مرة أثناء الاتصال بالإنترنت.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
   throw error;
  }
 })());
});
