/* ICT بالعربي 6.8.74: prioritize the home offline shell; other pages cache when visited. */
const CACHE='ict-shell-2026-11-27-home-tools';
const PREFIX='ict-shell-';
const CORE=[
 "./",
 "./academy-learning.css?v=6.8.81",
 "./analysis-lifecycle.css?v=6.8.61",
 "./analytics-config.js?v=6.4.0",
 "./analytics.js?v=6.4.0",
 "./app.js?v=7.0.57-home-tools",
 "./asset-choice-6918.css?v=6.9.18",
 "./asset-choice-6918.js?v=6.9.18",
 "./asset-config.js?v=7.0.31-biquote",
 "./asset.css?v=6.1.0",
 "./asset.css?v=6.2.0",
 "./asset.js?v=6.1.0",
 "./asset.js?v=6.8.27",
 "./assets.html",
 "./assets/AUDUSD.html",
 "./assets/BTCUSD.html",
 "./assets/DJ30.html",
 "./assets/ETHUSD.html",
 "./assets/EURUSD.html",
 "./assets/GBPUSD.html",
 "./assets/NAS100.html",
 "./assets/NZDUSD.html",
 "./assets/SP500.html",
 "./assets/USDCAD.html",
 "./assets/USDCHF.html",
 "./assets/USDJPY.html",
 "./assets/WTI.html",
 "./assets/XAGUSD.html",
 "./assets/XAUUSD.html",
 "./bento-glass.css?v=6.8.5",
 "./bottom-bars-order.css?v=6.8.26",
 "./daily-readiness-6885.css?v=6.8.85",
 "./decision-center.html",
 "./design-consistency.css?v=7.0.51-shared-design",
 "./design-consistency.js?v=6.8.6",
 "./economic-calendar-bridge.js?v=7.0.16-bea",
 "./economic-impact-engine.js?v=6.8.54",
 "./economic-news-priority.css?v=6.8.51",
 "./economic-reports-finish.css?v=6.8.54",
 "./editorial-forecasts.js?v=6.8.47",
 "./home-glass-cards-6919.css?v=7.0.51-shared-design",
 "./home-polish.css?v=6.7.0",
 "./home-polish.js?v=6.7.0",
 "./home-tools-compact.css?v=6.8.67",
 "./icon-192.png",
 "./icon-192.png?v=6.8.78",
 "./ict-academy-path-705a.css?v=7.0.5a.1",
 "./ict-academy-path-705a.js?v=7.0.52-directory",
 "./ict-accounts-707a.css",
 "./ict-accounts-707a.js",
 "./ict-accounts-console-707a.js",
 "./ict-accounts-journal-707a.js",
 "./ict-advanced-console-704c4.css",
 "./ict-advanced-console-704c4.js",
 "./ict-advanced-validation-704c4.js?v=7.0.53-audit",
 "./ict-background-status-708c2.css?v=7.0.8c2",
 "./ict-background-status-708c2.js?v=7.0.53-audit",
 "./ict-briefing-console-703c.css",
 "./ict-briefing-console-703c.js",
 "./ict-briefing-engine-703c.js",
 "./ict-candle-store-702b.js",
 "./ict-case-engine-704b.js",
 "./ict-case-library-704b.css",
 "./ict-case-library-704b.js",
 "./ict-composite-console-704c2.css",
 "./ict-composite-console-704c2.js",
 "./ict-composite-validation-704c2.js",
 "./ict-context-console-703a.css",
 "./ict-context-console-703a.js",
 "./ict-context-engine-703a.js?v=7.0.45-prior-week",
 "./ict-data-core-700.js",
 "./ict-decision-center-708a.css?v=7.0.56-result-cards",
 "./ict-decision-console-708a.js?v=7.0.56-result-cards",
 "./ict-decision-engine-708a.js?v=7.0.45-prior-week",
 "./ict-desktop-more-7013.css?v=7.0.13",
 "./ict-desktop-more-7013.css?v=7.0.17-visual",
 "./ict-desktop-more-7013.js?v=7.0.55-tools-label",
 "./ict-economic-compare-706c.js?v=7.0.6c.1",
 "./ict-economic-compare-console-706c.css?v=7.0.6c.1",
 "./ict-economic-compare-console-706c.js?v=7.0.53-audit",
 "./ict-economic-console-706a.css?v=7.0.6a.1",
 "./ict-economic-console-706a.js?v=7.0.53-audit",
 "./ict-economic-link-706a.js?v=7.0.6a.1",
 "./ict-economic-link-706a.js?v=7.0.8a",
 "./ict-entry-stream.js?v=7.0.31-biquote",
 "./ict-event-impact-706b.js?v=7.0.6b.1",
 "./ict-event-impact-console-706b.css?v=7.0.6b.1",
 "./ict-event-impact-console-706b.js?v=7.0.53-audit",
 "./ict-execution-safety-708c5.js",
 "./ict-home-header-exact-691914.css?v=6.9.19.15",
 "./ict-home-header-exact-691914.css?v=7.0.17-visual",
 "./ict-home-header-exact-691914.js?v=6.9.19.14",
 "./ict-home-header-exact-691914.js?v=7.0.17-visual",
 "./ict-learning-review-705c.css?v=7.0.5c.1",
 "./ict-learning-review-705c.js?v=7.0.53-audit",
 "./ict-live-console-702a.css",
 "./ict-live-console-702a.js",
 "./ict-live-feed-702a.js?v=7.0.22-bybit-batch",
 "./ict-live-feed-702a.js?v=7.0.5b.1",
 "./ict-market-times-702e.js",
 "./ict-model-console-704c3.css",
 "./ict-model-console-704c3.js",
 "./ict-model-validation-704c3.js?v=7.0.53-audit",
 "./ict-monitor-auto-refresh-709.js?v=7.0.9",
 "./ict-opportunity-center-708b.css?v=7.0.8b",
 "./ict-opportunity-console-708b.js?v=7.0.33-market-catalog",
 "./ict-opportunity-lifecycle-708b.js?v=7.0.22-bybit-batch",
 "./ict-performance-console-707b.css?v=7.0.7b",
 "./ict-performance-console-707b.js",
 "./ict-performance-core-707b.js",
 "./ict-playbook-catalog-704a.js",
 "./ict-playbook-console-704a.css",
 "./ict-playbook-console-704a.js",
 "./ict-public-console-702c2.js",
 "./ict-public-markets-702c2.js?v=7.0.31-biquote",
 "./ict-public-markets-702c2.js?v=7.0.40-tradingview-links",
 "./ict-readiness-console-708c.css?v=7.0.8c",
 "./ict-readiness-console-708c.js",
 "./ict-readiness-core-708c.js",
 "./ict-replay-console-705b.css?v=7.0.5b.1",
 "./ict-replay-console-705b.js?v=7.0.53-audit",
 "./ict-replay-core-705b.js?v=7.0.5b.1",
 "./ict-scenario-console-703b.css",
 "./ict-scenario-console-703b.js",
 "./ict-scenario-engine-703b.js?v=7.0.53-audit",
 "./ict-sessions-playbook.css?v=6.8.82",
 "./ict-signal-console-702e.css",
 "./ict-signal-console-702e.js",
 "./ict-signal-engine-702e.js?v=7.0.53-audit",
 "./ict-structure-console-702d.css",
 "./ict-structure-console-702d.js",
 "./ict-structure-engine-702d.js?v=7.0.43-model-results",
 "./ict-tools-deeplink-7011.js",
 "./ict-tools-directory.js?v=7.0.53-audit",
 "./ict-tools-entry-7011.css",
 "./ict-tools-hub-7011.css",
 "./ict-tools-unified-7012.css?v=7.0.52-directory",
 "./ict-validation-console-704c.css",
 "./ict-validation-console-704c.js",
 "./ict-validation-engine-704c.js",
 "./ict-weekly-console-707c.css?v=7.0.7c",
 "./ict-weekly-console-707c.js",
 "./ict-weekly-core-707c.js",
 "./index.html",
 "./interaction-harmony.css?v=6.8.8",
 "./light-contrast.css?v=6.8.11",
 "./logo-original.jpeg",
 "./logo-transparent.png",
 "./manifest.json?v=6.9.19.9",
 "./market-icons/aud.svg",
 "./market-icons/btc.svg",
 "./market-icons/cad.svg",
 "./market-icons/chf.svg",
 "./market-icons/dj30.svg",
 "./market-icons/eth.svg",
 "./market-icons/eur.svg",
 "./market-icons/gbp.svg",
 "./market-icons/gold.svg",
 "./market-icons/jpy.svg",
 "./market-icons/market.svg",
 "./market-icons/nas100.svg",
 "./market-icons/nzd.svg",
 "./market-icons/oil.svg",
 "./market-icons/silver.svg",
 "./market-icons/sp500.svg",
 "./market-icons/usd.svg",
 "./market-movers-fit-6919.css?v=6.9.19.8",
 "./mobile-usability-6868.css?v=6.8.68",
 "./mobile.css?v=6.5.0",
 "./navigation-responsive-6879.css?v=6.8.79",
 "./navspeed-691916.js?v=6.9.19.16",
 "./navspeed-691916.js?v=7.0.8a",
 "./notify-luxury.css?v=6.8.30",
 "./notify-luxury.js?v=6.8.30",
 "./ops-room-fix.css?v=6.8.5",
 "./platform.css?v=5.4.0",
 "./platform.js?v=5.4.0",
 "./push-config.js",
 "./push.js",
 "./recs-command-6916.css?v=6.9.17",
 "./recs-command-6916.js?v=6.9.16",
 "./recs-lifecycle.css?v=6.8.60",
 "./research.html",
 "./site-font-unified.css?v=6.8.32",
 "./site-search.css?v=6.8.72",
 "./site-shell-691911.css?v=6.9.19.12",
 "./site-shell-691911.css?v=7.0.17-visual",
 "./site-shell-691911.js?v=7.0.17-visual",
 "./site-typography-nav-fix.css?v=6.8.31",
 "./site-unity.css?v=6.8.34",
 "./site-unity.css?v=6.9.19.4",
 "./site-unity.js?v=7.0.55-tools-label",
 "./site-visual-system.css?v=7.0.51-shared-design",
 "./smart-desk.html",
 "./smart-desk.js",
 "./smart-weekly-agenda.css?v=6833",
 "./style.css?v=7.0.16-bea",
 "./theme-surfaces.css?v=6.8.14",
 "./tools.html",
 "./trade-flow-links-6886.css?v=6.8.86",
 "./trading-center-compact.css?v=6.8.10",
 "./trading-center-compact.js?v=6.8.10",
 "./trust.html",
 "./typography.css?v=5.5.0",
 "./typography.css?v=6.6.0",
 "./typography.css?v=6.8.29",
 "./ui-icons.css?v=6.8.22",
 "./ui-icons.css?v=6.8.27",
 "./ui-icons.css?v=6.8.30",
 "./ui-icons.js?v=7.0.51-shared-design",
 "./unified-theme.css?v=7.0.53-audit",
 "./unified-theme.js?v=6.8.31",
 "./value-engine-6918.css?v=6.9.18",
 "./value-engine-6918.js?v=6.9.18",
 "./visitor-guide.css?v=6.8.73",
 "./workflow-glass-cta.css?v=6.9.17",
 "./workspace.html"
];
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
   const saved=await cache.match(cacheKey);
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
   const saved=await cache.match(cacheKey);
   if(saved)return saved;
   if(request.mode==='navigate')return new Response('الصفحة غير متاحة بدون اتصال. افتحها مرة أثناء الاتصال بالإنترنت.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
   throw error;
  }
 })());
});
