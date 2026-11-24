'use strict';
/** ICT بالعربي 8C.2 — background research observer, NOT an execution signal server. Node >=20. */
const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const live=require('./ict-live-feed-702a.js');
const traditional=require('./ict-public-markets-702c2.js');
const structure=require('./ict_phase2d/ict-structure-engine-702d.js');
const signals=require('./ict_phase2e/ict-signal-engine-702e.js');
const started=Date.now();
const intervalMs=Math.min(900000,Math.max(60000,Number(process.env.POLL_MS)||300000));
const port=Math.max(1,Math.min(65535,Number(process.env.PORT)||8787));
const host=process.env.HOST||'127.0.0.1';
const origin=process.env.ALLOWED_ORIGIN||'';
const storage=path.resolve(process.env.STORE_FILE||path.join(__dirname,'monitor-data.json'));
const DEFAULT='crypto:BTCUSDT:15,crypto:ETHUSDT:15,metals:XAUUSD:15,forex:EURUSD:15';
function parseTargets(str){const parsed=[];for(const raw of str.split(',')){
 const parts=raw.trim().split(':');if(parts.length!==3)throw Error('INVALID_TARGET '+raw);
 const [market,symbol,tf]=parts;if(!['5','15'].includes(tf))throw Error('UNSUPPORTED_FRAME '+tf);
 if(market==='crypto'){if(!live.SYMBOLS.includes(symbol))throw Error('UNSUPPORTED_CRYPTO '+symbol)}
 else {if(!traditional.MARKETS[market]||!traditional.MARKETS[market].some(x=>x[0]===symbol))throw Error('UNSUPPORTED_MARKET_SYMBOL '+raw)}
 const id=[market,symbol,tf].join(':');if(!parsed.some(x=>x.id===id))parsed.push({id,market,symbol,tf});
 }if(!parsed.length||parsed.length>12)throw Error('TARGET_COUNT_MUST_BE_1_TO_12');return parsed}
const targets=parseTargets(process.env.MONITOR_TARGETS||DEFAULT);
let state={schema:'ict-research-monitor/1',startedAt:new Date(started).toISOString(),lastCycleAt:null,targets:{},observations:[],cycleCount:0,readyForExecution:false,limitations:['لا توجد تغذية Bid/Ask تنفيذية','فحص الأخبار ومخاطرة الحساب غير مربوط بالخادم','لا تُرسل إشعارات Push','نتائج بحثية وليست صفقات أو توصيات معتمدة']};
let stopping=false,inCycle=false,timer=null;
function safeError(e){return String(e?.message||e||'خطأ').slice(0,180)}
async function fetchBars(target,now){if(target.market==='crypto')return live.fetchHistory({symbol:target.symbol,interval:target.tf,limit:200,now});
 const ins=traditional.resolve(target.market,target.symbol);
 return traditional.get(ins,target.tf==='5'?'5min':'15min',{limit:200,now});}
function validBars(bars,tf,now){const ms=Number(tf)*60000;const valid=bars.filter(x=>x.confirmed===true&&x.start+ms<=now).sort((a,b)=>a.start-b.start);
 if(valid.length<30)throw Error('NOT_ENOUGH_CONFIRMED_CANDLES');
 const consecutive=[];for(const b of valid){const last=consecutive.at(-1);if(last&&b.start-last.start!==ms)consecutive.length=0;consecutive.push(b)}
 if(consecutive.length<30)throw Error('LATEST_SEGMENT_TOO_SHORT');
 const last=consecutive.at(-1);if(now-(last.start+ms)>Math.max(3*ms,180000))throw Error('STALE_CANDLES');
 return consecutive;}
function recentObservation(m,target,now){return {id:target.id+':'+String(m.id),market:target.market,symbol:target.symbol,frame:target.tf,formedAt:m.formedAt,detectedAt:new Date(now).toISOString(),status:'research_only_blocked',reason:'لم يُتحقق من الأخبار والمخاطرة وBid/Ask؛ ليست توصية تنفيذ',side:m.direction==='bull'?'BUY':'SELL',entry:m.entry,stop:m.stop,target:m.target,model:'Sweep → MSS → FVG'};}
async function check(target){const now=Date.now();const meta={market:target.market,symbol:target.symbol,frame:target.tf,lastAttempt:new Date(now).toISOString(),source:target.market==='crypto'?'Bybit V5 USDT':'Biquote independent feed',status:'unavailable',lastCompleteAt:null,modelCount:0};
 try {const bars=validBars(await fetchBars(target,now),target.tf,now);const last=bars.at(-1);meta.lastCompleteAt=new Date(last.start+Number(target.tf)*60000).toISOString();meta.status='research_data_valid';
 const result=signals.evaluate(bars,target.tf,{now,market:target.market,symbol:target.symbol});
 const models=result.models.filter(m=>m.ageBars<=2&&m.status==='watching'&&Number.isFinite(m.entry)&&Number.isFinite(m.stop)&&Number.isFinite(m.target));meta.modelCount=models.length;
 for(const model of models){const obs=recentObservation(model,target,now);if(!state.observations.some(x=>x.id===obs.id))state.observations.unshift(obs)}
 }catch(e){meta.status='blocked';meta.error=safeError(e)}
 state.targets[target.id]=meta;state.observations=state.observations.slice(0,100);}
async function restore(){
 try{
  const st=await fs.stat(storage);
  if(st.size>2_000_000)throw Error('STORAGE_FILE_TOO_LARGE');
  const existing=JSON.parse(await fs.readFile(storage,'utf8'));
  if(existing?.schema!==state.schema||!Array.isArray(existing.observations)||!existing.targets||typeof existing.targets!=='object')return false;
  state.observations=existing.observations.filter(x=>x&&typeof x.id==='string'&&x.status==='research_only_blocked').slice(0,100);
  state.targets=Object.fromEntries(Object.entries(existing.targets).filter(([id])=>targets.some(t=>t.id===id)));
  state.cycleCount=Number.isSafeInteger(existing.cycleCount)&&existing.cycleCount>=0?existing.cycleCount:0;
  state.lastCycleAt=typeof existing.lastCycleAt==='string'?existing.lastCycleAt:null;
  return true;
 }catch(e){if(e.code!=='ENOENT')process.stderr.write('Monitor storage restore: '+safeError(e)+'\n');return false}
}
async function persist(){const tmp=storage+'.tmp';await fs.mkdir(path.dirname(storage),{recursive:true});await fs.writeFile(tmp,JSON.stringify(state,null,2),'utf8');await fs.rename(tmp,storage)}
async function cycle(){if(inCycle||stopping)return;inCycle=true;try{
 for(const t of targets){if(stopping)break;await check(t)}
 state.lastCycleAt=new Date().toISOString();state.cycleCount++;await persist();
 }catch(e){process.stderr.write('Monitor cycle error: '+safeError(e)+'\n')}finally{inCycle=false}}
function snapshot(){const now=Date.now(),last=state.lastCycleAt?Date.parse(state.lastCycleAt):NaN;
 return {...state,serverTime:new Date(now).toISOString(),uptimeSeconds:Math.floor((now-started)/1000),active:!stopping&&Number.isFinite(last)&&now-last<=Math.max(3*intervalMs,900000),pollIntervalMs:intervalMs,targets:Object.fromEntries(Object.entries(state.targets).map(([key,v])=>[key,{...v,stale:!v.lastCompleteAt||now-Date.parse(v.lastCompleteAt)>Math.max(3*Number(v.frame)*60000,300000)}]))};}
function api(req,res){if(req.method!=='GET'||!['/health','/snapshot'].includes(new URL(req.url,'http://127.0.0.1').pathname)){res.writeHead(404);res.end('Not found');return}
 if(origin&&req.headers.origin===origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin')}
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');
 const view=snapshot();const route=new URL(req.url,'http://127.0.0.1').pathname;
 const payload=route==='/health'?{schema:view.schema,active:view.active,lastCycleAt:view.lastCycleAt,serverTime:view.serverTime,uptimeSeconds:view.uptimeSeconds,cycleCount:view.cycleCount,pollIntervalMs:view.pollIntervalMs,readyForExecution:false,marketCount:Object.keys(view.targets).length,targets:view.targets}:view;
 res.writeHead(200);res.end(JSON.stringify(payload));}
function start(options={}){const httpServer=http.createServer(api);if(!options.noHttp)httpServer.listen(port,host,()=>process.stdout.write('Research monitor listening on '+host+':'+port+'\n'));
 const run=()=>cycle().catch(e=>process.stderr.write(safeError(e)+'\n'));
 if(!options.noSchedule){restore().then(run).catch(e=>process.stderr.write(safeError(e)+'\n'));timer=setInterval(run,intervalMs)}
 return {httpServer,cycle,stop:async()=>{stopping=true;clearInterval(timer);if(httpServer.listening)await new Promise(r=>httpServer.close(r))},snapshot};}
if(require.main===module){const app=start();for(const sig of ['SIGTERM','SIGINT'])process.on(sig,()=>app.stop().then(()=>process.exit(0)));}
module.exports={parseTargets,validBars,start,snapshot,cycle,restore,targets};
