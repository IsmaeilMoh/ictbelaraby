'use strict';
/** Headless integration contract: site wiring, PWA delivery, and auto-refresh behaviour. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('decision-center.html');
const sw=read('sw.js');
const status=read('ict-background-status-708c2.js');
const script=read('ict-monitor-auto-refresh-709.js');
const count=(text,needle)=>text.split(needle).length-1;
assert.equal(count(html,'id="dc-bg-free-check"'),1,'one public scan trigger');
assert.equal(count(html,'src="ict-background-status-708c2.js?v='),1,'one public status handler');
assert.equal(count(html,'src="ict-monitor-auto-refresh-709.js?v='),1,'one auto refresh handler');
assert.ok(html.indexOf('src="ict-background-status-708c2.js')<html.indexOf('src="ict-monitor-auto-refresh-709.js'),'refresh must load after handler');
assert.match(sw,/ict-monitor-auto-refresh-709\.js/,'PWA installs the refresh asset');
assert.match(status,/ict-monitor-feed\/monitor-status\.json/,'dashboard reads published monitor feed');
assert.match(status,/d\.readyForExecution!==false/,'dashboard rejects unsafe monitor payloads');
assert.match(status,/now-checked<=45\*60000/,'dashboard rejects stale observations');
assert.doesNotMatch(html,/<script[^>]+(?:ict-execution-safety|ict-readiness-console)/,'advanced controls do not block initial rendering');
assert.match(read('ict-decision-console-708a.js'),/loadAdvancedScript\('ict-execution-safety-708c5\.js/,'quote verification remains available on demand');
assert.doesNotMatch(html,/id="dc-(?:account|risk|exec-check-risk)"/);
assert.doesNotMatch(read('ict-decision-console-708a.js'),/ICTAccounts7A|accountEngine|riskAmount/);
assert.match(sw,/ict-execution-safety-708c5\.js/,'installed PWA retains advanced checks');
assert.doesNotMatch(script,/\b(placeOrder|executeTrade|submitOrder|createOrder)\s*\(/i,'status refresher must not issue orders');
const sections=['dc-scan-actions','dc-results','dc-lifecycle','dc-advanced','dc-readiness-8c'];
for(let i=1;i<sections.length;i++) {
 assert.ok(html.indexOf('id="'+sections[i-1]+'"')<html.indexOf('id="'+sections[i]+'"'),'visitor sees scan, results, tracking and advanced settings in order');
}
assert.match(html,/href="#dc-lifecycle"/,'results link to opportunity tracking');
assert.match(read('app.js'),/id="home-tools-grid"><a class="tool-card" href="decision-center.html"/,'homepage links to the scan directly');
assert.match(read('asset.js'),/decision-center\.html\?['"]\+new URLSearchParams/,'asset link carries the selected instrument');
assert.doesNotMatch(read('index.html'),/widgets\.tradingview-widget\.com\/w\/en\/tv-(forex-table|economic-calendar)\.js/,'route widgets stay off the initial page');
assert.match(read('app.js'),/routeWidgets=\{agenda:'tv-economic-calendar',markets:'tv-forex-table'\}/,'the widgets remain available in their own sections');
const decision=read('ict-decision-console-708a.js');
assert.doesNotMatch(html,/dc-public-quote|tradingview-widget/,'charts stay outside the scan form');
assert.match(html,/<div class="dc-actions" id="dc-scan-actions"><button\b[^>]*\bid="dc-run"/,'scan controls appear in their original location');
for(const [name,href] of [['more','tools.html'],['patterns','trust.html#ict-structure-2d'],
 ['news','trust.html#ict-briefing-3c'],['recs','#dc-lifecycle'],['guardian','#dc-advanced']]){
 assert.ok(html.includes('data-ict-icon="'+name+'" href="'+href+'"'),'shortcut uses the shared icon and keeps its destination');
}
assert.match(html,/id="dc-monitor" type="button">تشغيل المراقبة أثناء فتح الصفحة/,'monitor retains its original label');
assert.doesNotMatch(html,/type="password"/,'public visitors never enter a dealer or service key');
assert.match(html,/<select id="dc-market"><option value="crypto">[^<]+USDT<\/option><option value="forex">Biquote/);
assert.doesNotMatch(html,/dc-gold-reference|value="kraken"/);
assert.doesNotMatch(decision,/getKraken|publicView|lastTrade/);
const {inspect:inspectQuote,countCatalogMatches}=require('./audit-public-markets.cjs');
const quote={symbol:'EURUSD',status:'LIVE',bid:'1.08',ask:'1.09',time:'2026-11-25T12:00:00Z'};
const sampledAt=Date.parse(quote.time)+1000;
const response={cors:true,data:{data:[quote]}};
assert.equal(inspectQuote('EURUSD',response,sampledAt),'Fresh Bid/Ask snapshot with CORS');
assert.equal(inspectQuote('EURUSD',response,sampledAt+15000),'Timestamp fails 15s freshness');
assert.equal(inspectQuote('EURUSD',{data:{data:[{...quote,status:'MARKET_CLOSED'}]}},sampledAt),'MARKET_CLOSED');
assert.equal(inspectQuote('USDJPY',response,sampledAt),'No matching quote');
const listed={status:'live',networkType:'mainnet',baseAsset:'EUR',quoteAsset:'USD'};
const catalog={data:{feeds:[listed,{...listed,networkType:'testnet'},{...listed,quoteAsset:'JPY'},{...listed,status:'testing'}]}};
assert.equal(countCatalogMatches(catalog,['EUR','USD']),'1 listed catalog entries');
assert.equal(countCatalogMatches(catalog,['USD','EUR']),'No matching public catalog record');
assert.equal(countCatalogMatches({failure:'HTTP 503'},['EUR','USD']),'HTTP 503 (unverified)');
let now=1_000_000,clicks=0,tick,unload,visible;
const button={disabled:false,click(){clicks++}};
const doc={hidden:false,readyState:'complete',getElementById(id){return id==='dc-bg-free-check'?button:id==='dc-background-8c2'?{}:null;},addEventListener(event,fn){if(event==='visibilitychange')visible=fn}};
vm.runInNewContext(script,{document:doc,window:{addEventListener(event,fn){if(event==='pagehide')unload=fn}},Date:{now:()=>now},setInterval(fn,ms){assert.equal(ms,300000);tick=fn;return 1;},clearInterval(){tick=null}});
assert.equal(clicks,1,'initial visit checks status');
now+=300000;tick();assert.equal(clicks,2,'periodic refresh');
doc.hidden=true;now+=300000;tick();assert.equal(clicks,2,'do not poll hidden tabs');
doc.hidden=false;visible();assert.equal(clicks,3,'refresh on return');
button.disabled=true;now+=300000;tick();assert.equal(clicks,3,'do not overlap in-flight requests');
button.disabled=false;unload();assert.equal(tick,null,'stop timer on navigation');
console.log('Center integration, PWA and auto-refresh contract: PASS');

assert.doesNotMatch(html,/id="dc-quality"/,'entry qualification needs no new control');
assert.doesNotMatch(decision,/res\.opportunities=res\.opportunities\.filter\(api\.qualifiesFocused\)/);
assert.match(decision,/displayCompleteModels:true,includeTurtleSoup:true,includeIfvg:true/);
assert.match(decision,/const plans=res\.opportunities\.filter\(plan=>api\.qualifiesFocused\(plan\)/);

async function testCalendarWeekSelection(){
 const app=read('app.js');
 let time=Date.parse('2026-11-27T10:00:00Z');
 class Clock extends Date {
  constructor(...args){super(...(args.length?args:[time]));}
  static now(){return time;}
 }
 const feeds={};
 const calendar=vm.createContext({Date:Clock,S:{calendarWeek:'current'},load:async url=>feeds[url.split('?')[0]]});
 vm.runInContext(app.slice(app.indexOf('function normalizeEvent('),app.indexOf('// In-page reminders')),calendar);
 const payload=(weekStart,date)=>({weekStart,updatedAt:new Date(time).toISOString(),coverage:'full',events:[{title:'Release',date}]});
 const current=()=>calendar.calendarView('current');
 feeds['calendar-live.json']=payload('2026-11-16','2026-11-20T13:30:00Z');
 await calendar.fetchLiveCalendar();
 assert.equal(current().status,'unavailable','a new timestamp cannot validate the wrong week');
 feeds['calendar-live.json']=payload('2026-11-23','2026-11-27T13:30:00Z');
 feeds['calendar-live.json'].events.push({title:'Outside the reported week',date:'2026-11-30T13:30:00Z'});
 await calendar.fetchLiveCalendar();
 assert.equal(current().status,'fresh');
 assert.equal(current().coverage,'partial');
 assert.equal(current().events.length,1);
 time+=25*3600000;
 assert.equal(current().status,'stale','an open page recalculates freshness');
 feeds['calendar-next.json']=payload('2026-11-30','2026-11-30T13:30:00Z');
 await calendar.fetchNextCalendar();
 assert.equal(calendar.calendarView('next').events.length,1);
 time=Date.parse('2026-11-29T22:30:00Z');
 assert.equal(current().week,'2026-11-30','switch weeks at midnight in Gaza');
 assert.equal(current().events.length,1,'reuse a matching feed after the week changes');
 console.log('Calendar week identity, partial coverage, tab freshness and local rollover: PASS');
}
testCalendarWeekSelection().catch(error=>{console.error(error);process.exitCode=1;});

async function testSharedMarketCatalog(){
 let cryptoCalls=0,traditionalCalls=0;
 const window={
  ICTLiveFeed:{
   SYMBOLS:['BTCUSDT'],
   fetchPerpetuals:async()=>{
    if(++cryptoCalls===1)throw Error('provider unavailable');
    return [{symbol:'BTCUSDT'},{symbol:'ARBUSDT'}];
   }
  },
  ICTPublicMarkets:{
   listed:market=>market==='forex'?[['EURGBP','EURGBP']]:[],
   loadCatalog:async()=>{
    traditionalCalls++;
    return {forex:[['EURGBP','EURGBP']],metals:[]};
   }
  }
 };
 vm.runInNewContext(read('ict-market-catalog.js'),{
  window,document:{addEventListener(){},getElementById(){return null}},URLSearchParams
 });
 const catalog=window.ICTMarketCatalog;
 await assert.rejects(catalog.loadCrypto(),/provider unavailable/);
 assert.deepEqual(Array.from(catalog.list('crypto')),['BTCUSDT']);
 await Promise.all([catalog.load('crypto'),catalog.loadCrypto()]);
 assert.deepEqual(Array.from(catalog.list('crypto')),['BTCUSDT','ARBUSDT']);
 assert.equal(cryptoCalls,2,'retry after outage and share the in-flight request');
 assert.deepEqual(await Promise.all([catalog.load('forex'),catalog.load('metals')]),[true,false]);
 assert.equal(traditionalCalls,1,'traditional categories share one catalogue request');
 assert.equal(catalog.marketUrl('crypto','ARBUSDT'),'decision-center.html?market=crypto&symbol=ARBUSDT');
 console.log('Shared market catalog, identity, request reuse and fallback: PASS');
}
testSharedMarketCatalog().catch(error=>{console.error(error);process.exitCode=1;});
