'use strict';
/** ICT بالعربي 8C.2 — background research observer, NOT an execution signal server. Node >=20. */
const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const live=require('./ict-live-feed-702a.js');
const kraken=require('./kraken-perpetual.js');
const cryptoSpotBackup=require('./crypto-spot-backup.js');
const traditional=require('./ict-public-markets-702c2.js');
const structure=require('./ict_phase2d/ict-structure-engine-702d.js');
const signals=require('./ict_phase2e/ict-signal-engine-702e.js');
const gates=require('./safety-gates.js');
const lifecycle=require('../ict-opportunity-lifecycle-708b.js');
const {inspectHourly}=require('./hourly-context.js');
const quotesGuard=require('./execution-quotes.js');
const started=Date.now();
const intervalMs=Math.min(900000,Math.max(60000,Number(process.env.POLL_MS)||300000));
const port=Math.max(1,Math.min(65535,Number(process.env.PORT)||8787));
const host=process.env.HOST||'127.0.0.1';
const origin=process.env.ALLOWED_ORIGIN||'';
const storage=path.resolve(process.env.STORE_FILE||path.join(__dirname,'monitor-data.json'));
const DEFAULT=[
 'crypto:BTCUSDT','crypto:ETHUSDT','spot:BTCUSDT','spot:ETHUSDT','metals:XAUUSD','forex:EURUSD','kraken:PF_XBTUSD','kraken:PF_ETHUSD'
].flatMap(target=>['15','5'].map(frame=>target+':'+frame)).join(',');
function parseTargets(str){const parsed=[];for(const raw of str.split(',')){
 const parts=raw.trim().split(':');if(parts.length!==3)throw Error('INVALID_TARGET '+raw);
 const [market,symbol,tf]=parts;if(!['5','15'].includes(tf))throw Error('UNSUPPORTED_FRAME '+tf);
 if(market==='crypto'){if(!live.SYMBOLS.includes(symbol))throw Error('UNSUPPORTED_CRYPTO '+symbol)}
 else if(market==='kraken'){if(!kraken.SYMBOLS.includes(symbol))throw Error('UNSUPPORTED_KRAKEN_PERPETUAL '+symbol)}
 else if(market==='spot'){if(!cryptoSpotBackup.PAIRS.includes(symbol))throw Error('UNSUPPORTED_SPOT '+symbol)}
 else {if(!traditional.MARKETS[market]||!traditional.MARKETS[market].some(x=>x[0]===symbol))throw Error('UNSUPPORTED_MARKET_SYMBOL '+raw)}
 const id=[market,symbol,tf].join(':');if(!parsed.some(x=>x.id===id))parsed.push({id,market,symbol,tf});
 }if(!parsed.length||parsed.length>16)throw Error('TARGET_COUNT_MUST_BE_1_TO_16');return parsed}
const targets=parseTargets(process.env.MONITOR_TARGETS||DEFAULT);
let state={schema:'ict-research-monitor/1',startedAt:new Date(started).toISOString(),lastCycleAt:null,targets:{},observations:[],forward:{},cycleCount:0,readyForExecution:false,limitations:['لا توجد تغذية Bid/Ask تنفيذية','بوابة الأخبار اختيارية وتفشل بالإغلاق عند نقص التغطية','مخاطرة الحساب الشخصي غير مرتبطة بالخادم','لا تُرسل إشعارات Push','نتائج بحثية وليست صفقات أو توصيات معتمدة']};
let stopping=false,inCycle=false,timer=null;
let lastCycleError=null;
const economicUrl=process.env.ECONOMIC_FEED_URL||'';
const quoteUrl=process.env.QUOTE_FEED_URL||'';
let quoteFeed={ok:false,reason:'QUOTE_FEED_NOT_CONFIGURED',quotes:new Map()};
const maxStopDistancePct=Math.max(0.01,Math.min(100,Number(process.env.MAX_STOP_DISTANCE_PCT)||5));
let economic={ok:false,reason:'NOT_CHECKED'};
function safeError(e){return String(e?.message||e||'خطأ').slice(0,180)}
const DATA_REASONS=new Set(['stale_candles','candle_gap','not_enough_candles','provider_access_denied',
 'provider_rate_limited','provider_unavailable','invalid_candles','session_history_missing','instrument_mismatch','unknown']);
const HISTORY_LIMIT=8;
function observedTime(value,through){
 const at=typeof value==='string'?Date.parse(value):NaN;
 return Number.isFinite(at)&&at<=through?new Date(at).toISOString():null;
}
function sourceHistory(events,now){
 if(!Array.isArray(events))return [];
 return events.slice(0,HISTORY_LIMIT).flatMap(event=>{
  const at=typeof event?.at==='string'?Date.parse(event.at):NaN;
  if(!Number.isFinite(at)||at>now||!['blocked','reason_changed','recovered'].includes(event.kind))return [];
  const entry={kind:event.kind,at:new Date(at).toISOString()};
  if(event.kind!=='recovered')entry.reason=DATA_REASONS.has(event.reason)?event.reason:'unknown';
  else {
   const since=observedTime(event.since,at);
   if(since)entry.since=since;
  }
  return [entry];
 }).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));
}
function sourceDelay(target,now){
 if(target.status!=='blocked')return null;
 const through=observedTime(target.lastAttempt,now);
 const since=through&&observedTime(target.blockedSince,Date.parse(through));
 return since?{since,through}:null;
}
function recordSourceHistory(previous,current,now){
 const history=sourceHistory(previous.sourceHistory,now),last=history[0];
 const healthy=current.status==='research_data_valid';
 const recoveryIndex=history.findIndex(event=>event.kind==='recovered');
 const currentEpisode=recoveryIndex<0?history:history.slice(0,recoveryIndex);
 const previousStart=previous.status==='blocked'?
  observedTime(previous.blockedSince,now)||currentEpisode.find(event=>event.kind==='blocked')?.at:null;
 const at=new Date(now).toISOString();
 let kind;
 if(healthy){
  if(last?last.kind!=='recovered':previous.status==='blocked')kind='recovered';
 }else{
  current.blockedSince=previousStart||at;
  if(!last||last.kind==='recovered')kind='blocked';
  else if(last.reason!==current.reason)kind='reason_changed';
 }
 if(kind){
  const event={kind,at};
  if(!healthy)event.reason=current.reason;
  else if(previousStart)event.since=previousStart;
  history.unshift(event);
 }
 return history.slice(0,HISTORY_LIMIT);
}
function dataReason(error){
 const code=String(error?.message||error||'');
 if(code==='KRAKEN_PERPETUAL_NOT_VERIFIED'||code==='BYBIT_SYMBOL_MISMATCH'||/الاستجابة لا يطابق/.test(code))return 'instrument_mismatch';
 if(code==='STALE_CANDLES')return 'stale_candles';
 if(code==='LATEST_SEGMENT_TOO_SHORT')return 'candle_gap';
 if(code==='NOT_ENOUGH_CONFIRMED_CANDLES'||code==='NO_CANDLES')return 'not_enough_candles';
 if(/(?:_HTTP_|HTTP )(401|403|451)$/.test(code))return 'provider_access_denied';
 if(/(?:_HTTP_|HTTP )429$/.test(code))return 'provider_rate_limited';
 if(/(?:_HTTP_|HTTP )\d{3}$/.test(code)||code==='fetch failed'||['AbortError','TimeoutError'].includes(error?.name))return 'provider_unavailable';
 if(/INVALID|MISMATCH|غير صالحة|غير واضحة|لا يطابق|مكررة/.test(code))return 'invalid_candles';
 return 'unknown';
}
async function fetchBars(target,now,getKrakenInstruments){
 if(target.market==='kraken')return kraken.fetchHistory(target.symbol,target.tf,{now,instruments:await getKrakenInstruments()});
 if(target.market==='crypto')return live.fetchHistory({symbol:target.symbol,interval:target.tf,limit:200,now});
 if(target.market==='spot')return cryptoSpotBackup.fetchHistory(target.symbol,target.tf,{now});
 const ins=traditional.resolve(target.market,target.symbol);
 return traditional.get(ins,target.tf==='60'?'1h':target.tf==='5'?'5min':'15min',{limit:200,now});}
function validBars(bars,tf,now){
 const normalized=structure.normalize(bars,tf,now);
 if(normalized.rejected||normalized.duplicates)throw Error('INVALID_OR_DUPLICATE_CANDLES');
 if(normalized.rows.length<30)throw Error('NOT_ENOUGH_CONFIRMED_CANDLES');
 const consecutive=normalized.segments.at(-1);
 if(consecutive.length<30)throw Error('LATEST_SEGMENT_TOO_SHORT');
 if(now-(consecutive.at(-1).start+normalized.intervalMs)>3*normalized.intervalMs)throw Error('STALE_CANDLES');
 const raw=new Map(bars.filter(b=>b.confirmed===true).map(b=>[Number(b.start),b]));
 return consecutive.map(b=>raw.get(b.start));
}
function recentObservation(m,target,now,news,structureGate,previous){return {id:target.id+':'+String(m.id),market:target.market,symbol:target.symbol,frame:target.tf,formedAt:m.formedAt,detectedAt:previous?.detectedAt||new Date(now).toISOString(),checkedAt:new Date(now).toISOString(),research:m.research,status:'research_only_blocked',reason:'غير معتمدة للتنفيذ: لا توجد مراجعة مخاطرة حساب أو أسعار Bid/Ask',newsGate:news,structureGate,accountRiskGate:'not_verified',side:m.direction==='bull'?'BUY':'SELL',entry:m.entry,stop:m.stop,target:m.target,model:'Sweep → MSS → FVG',zone:{low:m.zone.low,high:m.zone.high},evidence:{sweepAt:m.sweepAt,mssAt:m.mssAt,fvgAt:m.fvgAt},reasonCodes:['ACCOUNT_RISK_NOT_VERIFIED','EXECUTION_QUOTE_NOT_VERIFIED']};}
// Keep records separated by venue, instrument and timeframe, including after a restart.
function updateForward(previous,target,bars,observations,now){
 const ms=lifecycle.FRAME[target.tf];
 const advanced=(previous||[]).map(record=>lifecycle.advance(record,bars,now));
 const known=new Set(advanced.map(r=>r.id));
 const current=bars.at(-1).start+ms===Math.floor(now/ms)*ms;
 const candidates=current?observations.filter(o=>o.research.phase==='observed'||o.research.phase==='awaiting_confirmation'):[];
 for(const o of candidates){
  if(known.has(o.id))continue;
  const row=lifecycle.create({...o,evidence:[],blocks:[
   ...(o.newsGate.status==='clear_research_only'?[]:['بوابة الأخبار معلّقة']),
   ...(o.hourlyAligned?[]:['اتجاه الساعة غير مؤكد']),
   'سعر التنفيذ ومخاطرة الحساب غير متحقق منهما'
  ],modelEvidence:[o.evidence.sweepAt,o.evidence.mssAt,o.evidence.fvgAt]},now,{researchOnly:true});
  advanced.unshift(row);
  known.add(o.id);
 }
 return advanced.filter(r=>!lifecycle.closed(r)).concat(advanced.filter(lifecycle.closed)).slice(0,32);
}
async function check(target,draft,calendar,getKrakenInstruments,getHourly){const now=Date.now();
 const previousModels=new Map(draft.observations.filter(x=>x.id.startsWith(target.id+':')).map(x=>[x.id,x]));
 const previous=draft.targets[target.id]||{};const meta={market:target.market,symbol:target.symbol,frame:target.tf,lastAttempt:new Date(now).toISOString(),source:target.market==='crypto'?'Bybit V5 USDT':target.market==='spot'?cryptoSpotBackup.SOURCE:target.market==='kraken'?kraken.SOURCE:'Biquote independent feed',status:'unavailable',lastCompleteAt:null,modelCount:0};
 try {const bars=validBars(await fetchBars(target,now,getKrakenInstruments),target.tf,now);const last=bars.at(-1);
 meta.source=last.source||meta.source;meta.marketType=target.market==='spot'?'SPOT_RESEARCH':['crypto','kraken'].includes(target.market)?'PERPETUAL':'PROVIDER_NATIVE';meta.lastCompleteAt=new Date(last.start+Number(target.tf)*60000).toISOString();meta.status='research_data_valid';
 meta.hourlyContext=await getHourly(target);
 const result=signals.evaluate(bars,target.tf,{now,market:target.market,symbol:target.symbol});
 const news=gates.checkNews(calendar.ok?calendar.feed:null,target,now);
 const observations=[];
 meta.patternCounts={sweep:0,mss:0,fvg:result.analysis.zones.length,composite:result.modelCount,recent:0,valid:0};
 for(const event of result.analysis.events){
  if(event.type==='SWEEP')meta.patternCounts.sweep++;
  if(event.type==='MSS')meta.patternCounts.mss++;
 }
 for(const model of result.models){
  if(model.ageBars>12||!model.research)continue;
  meta.patternCounts.recent++;
  const plan=gates.checkStructure(model,maxStopDistancePct);
  if(plan.status==='clear_research_only'){
   const row=recentObservation(model,target,now,news,plan,previousModels.get(target.id+':'+model.id));
   row.hourlyAligned=meta.hourlyContext.aligned?.includes(model.direction)===true;
   row.trackable=model.status==='watching'&&model.ageBars<=6;
   observations.push(row);
  }
 }
 draft.forward[target.id]=updateForward(draft.forward[target.id],target,bars,observations.filter(o=>o.trackable),Date.now());
 meta.patternCounts.valid=observations.length;
 meta.modelCount=observations.length;
 meta.newsGate=news.status;
 draft.observations=draft.observations.filter(x=>!previousModels.has(x.id));
 draft.observations.push(...observations);
 }catch(e){meta.status='blocked';meta.error=safeError(e);meta.reason=dataReason(e)}
 const healthy=meta.status==='research_data_valid';
 meta.consecutiveFailures=healthy?0:Math.min(1000000,(Number(previous.consecutiveFailures)||0)+1);
 meta.lastHealthyAt=healthy?meta.lastCompleteAt:(previous.lastHealthyAt||null);
 meta.lastRecoveredAt=healthy&&Number(previous.consecutiveFailures)>0?new Date(now).toISOString():(previous.lastRecoveredAt||null);
 meta.sourceHistory=recordSourceHistory(previous,meta,now);
 draft.targets[target.id]=meta;draft.observations=draft.observations.filter(x=>now-x.formedAt<=13*Number(x.frame)*60000)
  .sort((a,b)=>b.formedAt-a.formedAt).slice(0,100);}
async function restore(){
 try{
  const st=await fs.stat(storage);
  if(st.size>2_000_000)throw Error('STORAGE_FILE_TOO_LARGE');
  const existing=JSON.parse(await fs.readFile(storage,'utf8'));
  if(existing?.schema!==state.schema||!Array.isArray(existing.observations)||!existing.targets||typeof existing.targets!=='object')return false;
  state.observations=existing.observations.filter(x=>x&&typeof x.id==='string'&&x.status==='research_only_blocked'&&x.research&&x.checkedAt).slice(0,100);
  state.targets=Object.fromEntries(Object.entries(existing.targets).filter(([id,value])=>targets.some(t=>t.id===id)&&value?.marketType!=='SPOT_RESEARCH_PROXY'));
  state.forward=Object.fromEntries(targets.map(t=>[t.id,Array.isArray(existing.forward?.[t.id])?
   existing.forward[t.id].filter(r=>lifecycle.valid(r)&&r.market===t.market&&r.symbol===t.symbol&&r.frame===t.tf&&Array.isArray(r.events)).slice(0,32):[]]));
  state.cycleCount=Number.isSafeInteger(existing.cycleCount)&&existing.cycleCount>=0?existing.cycleCount:0;
  state.lastCycleAt=typeof existing.lastCycleAt==='string'?existing.lastCycleAt:null;
  return true;
 }catch(e){if(e.code!=='ENOENT')process.stderr.write('Monitor storage restore: '+safeError(e)+'\n');return false}
}
async function persist(draft){const tmp=storage+'.tmp';await fs.mkdir(path.dirname(storage),{recursive:true});await fs.writeFile(tmp,JSON.stringify(draft,null,2),'utf8');await fs.rename(tmp,storage)}
async function cycle(){if(inCycle||stopping)return;inCycle=true;try{
 const calendar=await gates.fetchEconomic(economicUrl,Date.now());
 const quotes=await quotesGuard.fetchQuotes(quoteUrl,Date.now());
 const draft={...state,targets:{...state.targets},forward:{...state.forward}};
 let krakenInstruments;
 const getKrakenInstruments=()=>krakenInstruments??=kraken.fetchInstruments();
 const hourly=new Map();
 const getHourly=target=>{
  const key=target.market+':'+target.symbol;
  if(!hourly.has(key)){
   const cutoff=Date.now();
   hourly.set(key,fetchBars({...target,tf:'60'},cutoff,getKrakenInstruments)
    .then(bars=>inspectHourly(bars,target.market,cutoff,target.symbol))
    .catch(error=>({status:'unavailable',reason:dataReason(error)})));
  }
  return hourly.get(key);
 };
 for(const t of targets){if(stopping)return;await check(t,draft,calendar,getKrakenInstruments,getHourly)}
 draft.lastCycleAt=new Date(Date.now()).toISOString();
 draft.cycleCount++;
 await persist(draft);
 state=draft;
 economic=calendar;
 quoteFeed=quotes;
 lastCycleError=null;
 }catch(e){lastCycleError=safeError(e);process.stderr.write('Monitor cycle error: '+lastCycleError+'\n')}finally{inCycle=false}}
function snapshot(){const now=Date.now(),last=state.lastCycleAt?Date.parse(state.lastCycleAt):NaN;
 const active=!stopping&&!lastCycleError&&Number.isFinite(last)&&last<=now&&now-last<=Math.max(3*intervalMs,900000);
 const checked=Object.fromEntries(targets.map(t=>{
  const v=state.targets[t.id],complete=Date.parse(v?.lastCompleteAt);
  if(!v)return [t.id,{market:t.market,symbol:t.symbol,frame:t.tf,status:'not_checked',stale:true}];
  const stale=!Number.isFinite(complete)||complete>now||now-complete>3*Number(t.tf)*60000;
  const quote=quotesGuard.parseQuote(active&&t.market!=='spot'&&v.status==='research_data_valid'&&!stale?quoteFeed.quotes.get(t.id):null,now);
  return [t.id,{...v,sourceDelay:sourceDelay(v,now),stale,executionQuoteGate:quote.status,executionQuoteReason:quote.reason,
   quoteSpreadBps:Number.isFinite(quote.spreadBps)?Math.round(quote.spreadBps*100)/100:null,
   quoteSource:quote.source||null,accountRiskGate:'not_verified'}];
 }));
 const totals={configured:targets.length,valid:0,blocked:0,stale:0,unchecked:0};
 for(const t of Object.values(checked)){if(t.stale)totals.stale++;if(t.status==='not_checked')totals.unchecked++;else if(t.status==='research_data_valid'&&!t.stale)totals.valid++;else totals.blocked++;}
 const marketDataReady=active&&totals.valid>0;
 const failingTargets=Object.entries(checked).filter(([,v])=>v.status==='blocked'||v.stale).map(([id,v])=>({id,consecutiveFailures:Number(v.consecutiveFailures)||0,lastHealthyAt:v.lastHealthyAt||null}));
 const observations=active?state.observations.filter(x=>{
  const target=checked[[x.market,x.symbol,x.frame].join(':')];
  return target?.status==='research_data_valid'&&!target.stale&&Date.parse(x.checkedAt)===Date.parse(target.lastAttempt);
 }):[];
 return {...state,observations,safety:{economic:{ok:economic.ok,reason:economic.reason||null,eventCount:economic.eventCount||0,invalid:economic.invalid||0,receivedAt:economic.receivedAt||null},accountRisk:'not_verified',bidAsk:{connected:quoteFeed.ok,reason:quoteFeed.reason||null,receivedAt:quoteFeed.receivedAt||null},executionApproved:false},serverTime:new Date(now).toISOString(),uptimeSeconds:Math.floor((now-started)/1000),active,pollIntervalMs:intervalMs,cycleError:lastCycleError,marketDataReady,allMarketDataReady:marketDataReady&&totals.valid===totals.configured,marketSummary:totals,failingTargets,targets:checked};}

const directScans=new Map();
async function directKraken(symbol,frame){
 const key=symbol+':'+frame,now=Date.now();
 const previous=directScans.get(key);
 if(previous&&(previous.pending||previous.until>now))return previous.task;
 const scan={pending:true,until:0};
 scan.task=(async()=>{
  const instruments=await kraken.fetchInstruments();
  const [entry,hourly,lastTrade]=await Promise.all([
   kraken.fetchHistory(symbol,frame,{instruments,now}),
   kraken.fetchHistory(symbol,'60',{instruments,now}),
   kraken.fetchLastTrade(symbol,{instruments}).catch(()=>null)
  ]);
  return {schema:'ict-direct-kraken/1',symbol,frame,entry,hourly,lastTrade,readyForExecution:false};
 })().finally(()=>{scan.pending=false;scan.until=Date.now()+2500});
 directScans.set(key,scan);
 return scan.task;
}
async function api(req,res){const url=new URL(req.url,'http://127.0.0.1');
 if(req.method!=='GET'||!['/health','/snapshot','/market-research'].includes(url.pathname)){res.writeHead(404);res.end('Not found');return}
 if(origin&&req.headers.origin===origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin')}
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');
 if(url.pathname==='/market-research'){
  const symbol=url.searchParams.get('symbol'),frame=url.searchParams.get('frame');
  if(!kraken.SYMBOLS.includes(symbol)||!['5','15'].includes(frame)){
   res.writeHead(400);res.end(JSON.stringify({error:'INVALID_RESEARCH_TARGET'}));return;
  }
  try{const market=await directKraken(symbol,frame);res.writeHead(200);res.end(JSON.stringify(market))}
  catch{res.writeHead(503);res.end(JSON.stringify({error:'KRAKEN_SOURCE_UNAVAILABLE'}))}
  return;
 }
 const view=snapshot();const route=url.pathname;
 const payload=route==='/health'?{schema:view.schema,active:view.active,lastCycleAt:view.lastCycleAt,serverTime:view.serverTime,uptimeSeconds:view.uptimeSeconds,cycleCount:view.cycleCount,pollIntervalMs:view.pollIntervalMs,readyForExecution:false,safety:view.safety,marketCount:Object.keys(view.targets).length,marketDataReady:view.marketDataReady,allMarketDataReady:view.allMarketDataReady,marketSummary:view.marketSummary,failingTargets:view.failingTargets,cycleError:view.cycleError,targets:view.targets}:view;
 res.writeHead(200);res.end(JSON.stringify(payload));}
function start(options={}){const httpServer=http.createServer(api);if(!options.noHttp)httpServer.listen(port,host,()=>process.stdout.write('Research monitor listening on '+host+':'+port+'\n'));
 const run=()=>cycle().catch(e=>process.stderr.write(safeError(e)+'\n'));
 if(!options.noSchedule){restore().then(run).catch(e=>process.stderr.write(safeError(e)+'\n'));timer=setInterval(run,intervalMs)}
 return {httpServer,cycle,stop:async()=>{stopping=true;clearInterval(timer);if(httpServer.listening)await new Promise(r=>httpServer.close(r))},snapshot};}
if(require.main===module){const app=start();for(const sig of ['SIGTERM','SIGINT'])process.on(sig,()=>app.stop().then(()=>process.exit(0)));}
module.exports={updateForward,DATA_REASONS,sourceHistory,sourceDelay,dataReason,parseTargets,validBars,start,snapshot,cycle,restore,targets};
