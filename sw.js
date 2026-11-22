/* ICT بالعربي 6.8.74: prioritize the home offline shell; other pages cache when visited. */
const CACHE='ict-shell-v6889-source-clarity-20261122';
const PREFIX='ict-shell-';
const CORE=["./","./index.html","./icon-192.png","./style.css","./platform.css","./platform.js","./typography.css","./home-polish.css","./notify-luxury.css","./unified-theme.css","./bento-glass.css","./unified-theme.js","./ops-room-fix.css","./design-consistency.css","./interaction-harmony.css","./trading-center-compact.css","./light-contrast.css","./theme-surfaces.css","./ui-icons.css","./bottom-bars-order.css","./workflow-glass-cta.css","./site-font-unified.css","./smart-weekly-agenda.css","./economic-news-priority.css","./economic-reports-finish.css","./recs-lifecycle.css","./analysis-lifecycle.css","./academy-learning.css","./home-tools-compact.css","./mobile-usability-6868.css","./site-search.css","./visitor-guide.css","./editorial-forecasts.js","./economic-calendar-bridge.js","./economic-impact-engine.js","./app.js","./home-polish.js","./notify-luxury.js","./design-consistency.js","./trading-center-compact.js","./ui-icons.js","./manifest.json","./logo-original.jpeg","./icon-512.png","./navigation-responsive-6879.css","./ict-sessions-playbook.css"];
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
 const isCode=/\.(?:html|css|js)$/.test(name)||request.mode==='navigate';
 const storageKey=isJson?new Request(new URL(url.pathname,scope.origin).href):request;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  try{
   const response=await fetch(request,{cache:isCode?'no-cache':'default'});
   if(response.ok && response.type==='basic')event.waitUntil(cache.put(storageKey,response.clone()));
   return response;
  }catch(error){
   const saved=await cache.match(storageKey)
    || (isCode ? await cache.match(new URL(url.pathname,scope.origin).href) : undefined);
   if(saved)return saved;
   if(request.mode==='navigate'){const shell=await cache.match(new URL('index.html',scope.href).href);return shell||new Response('غير متصل بالإنترنت',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});}
   throw error;
  }
 })());
});
