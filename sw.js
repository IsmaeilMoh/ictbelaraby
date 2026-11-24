/* ICT بالعربي 6.8.74: prioritize the home offline shell; other pages cache when visited. */
const CACHE='ict-shell-v700-phase4c-composite-v2-20261124';
const PREFIX='ict-shell-';
const CORE=["./","./index.html","./style.css","./app.js","./navspeed-691916.js","./ict-data-core-700.js","./trust.html","./research.html","./ict-playbook-catalog-704a.js","./ict-playbook-console-704a.js","./ict-playbook-console-704a.css","./ict-case-engine-704b.js","./ict-case-library-704b.js","./ict-case-library-704b.css","./ict-validation-engine-704c.js","./ict-validation-console-704c.js","./ict-validation-console-704c.css","./ict-composite-console-704c2.css","./ict-composite-console-704c2.js","./ict-composite-validation-704c2.js","./ict-live-feed-702a.js","./ict-live-console-702a.js","./ict-live-console-702a.css","./ict-candle-store-702b.js","./ict-public-markets-702c2.js","./ict-public-console-702c2.js","./ict-structure-engine-702d.js","./ict-structure-console-702d.js","./ict-structure-console-702d.css","./ict-signal-engine-702e.js","./ict-signal-console-702e.js","./ict-market-times-702e.js","./ict-signal-console-702e.css","./ict-context-engine-703a.js","./ict-context-console-703a.js","./ict-context-console-703a.css","./ict-scenario-engine-703b.js","./ict-scenario-console-703b.js","./ict-scenario-console-703b.css","./ict-briefing-console-703c.css","./ict-briefing-engine-703c.js","./ict-briefing-console-703c.js","./ui-icons.css","./ui-icons.js","./logo-original.jpeg"];
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
 const request=event.request;if(request.method!=='GET')return;
 const url=new URL(request.url),scope=new URL(self.registration.scope);
 if(url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
 if(url.pathname.includes('/push/')||/\/(admin\.html|admin\.js|admin\.css)$/.test(url.pathname))return;
 const name=url.pathname.split('/').pop()||'index.html';
 if(name==='economic-forecasts.json'||name==='economic-official.json'||name==='news-live.json'||name==='calendar-live.json'||name==='calendar-next.json'||name==='calendar-sync-status.json'||name==='market-movers.json'||name==='market-radar.json'||name==='market-xray.json'||name==='historical-candles.json'){
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
