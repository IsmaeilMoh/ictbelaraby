/* ICT بالعربي 5.4 — resilient offline shell. The OneSignal worker is separate. */
const CACHE='ict-shell-v6866-trade-journal-20261122';
const PREFIX='ict-shell-';
const CORE=['./','./index.html','./style.css','./app.js','./platform.css','./typography.css','./smart-weekly-agenda.css','./site-font-unified.css','./site-font-unified.css','./site-font-unified.css','./site-font-unified.css','./home-polish.css','./home-polish.js','./notify-luxury.css','./notify-luxury.js','./unified-theme.css','./unified-theme.js','./bento-glass.css','./ops-room-fix.css','./platform.js','./workspace.html','./workspace.css','./workspace.js','./intelligence.html','./intelligence.css','./radar-smart.css','./market-xray.css','./intelligence.js','./editorial-forecasts.js','./economic-news-priority.css','./economic-calendar-bridge.js','./economic-impact-engine.js','./economic-reports-finish.css','./economic-results-core.js','./research.html','./research.css','./research-study.css','./research.js','./recs-lifecycle.css','./analysis-lifecycle.css','./academy-learning.css','./learning-bridge.js','./smart-desk.html','./smart-desk.css','./trader-dna-advanced.css','./smart-desk.js','./workflow.html','./workflow.css','./workflow.js','./assets.html','./asset.css','./asset.js','./site-typography-nav-fix.css','./workflow-glass-cta.css','./site-unity.css','./site-unity.js','./ui-icons.css','./ui-icons.js','./mobile.css','./manifest.json','./logo-original.jpeg','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 // A single unavailable optional file must not prevent future site updates.
 await Promise.allSettled(CORE.map(async path=>{const url=new URL(path,self.registration.scope).href;const response=await fetch(url,{cache:'reload'});if(response.ok)await cache.put(url,response)}));
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
   const saved=await cache.match(storageKey);
   if(saved)return saved;
   if(request.mode==='navigate'){const shell=await cache.match(new URL('index.html',scope.href).href);return shell||new Response('غير متصل بالإنترنت',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});}
   throw error;
  }
 })());
});
