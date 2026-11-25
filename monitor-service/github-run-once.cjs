'use strict';
/** GitHub Actions one-shot research scan. Only PUBLIC, non-execution research data is published. */
const fs=require('node:fs/promises');
const path=require('node:path');
const runner=require('./server.js');
const kraken=require('./kraken-perpetual.js');
const spot=require('./crypto-spot-backup.js');
const phases=new Set(['observed','awaiting_confirmation','confirmed_research','invalidated','expired']);
const OUT=path.resolve(process.env.PUBLIC_OUTPUT_DIR||path.join(__dirname,'..','_monitor_publish'));
const OUTFILE=path.join(OUT,'monitor-status.json');
function publicHour(context,now){
 const last=context?.lastCompleteAt;
 if(context?.status==='ready'&&Number.isSafeInteger(last)&&last<=now&&now-last<=3*3600000){
  const aligned=Array.isArray(context.aligned)?['bull','bear'].filter(side=>context.aligned.includes(side)):[];
  return {status:'ready',lastCompleteAt:new Date(last).toISOString(),aligned};
 }
 if(Number.isSafeInteger(last)&&last<=now&&now-last>3*3600000)return {status:'stale',lastCompleteAt:new Date(last).toISOString()};
 return {status:context?.status==='insufficient'?'insufficient':'unavailable'};
}
function publicSnapshot(data,now=Date.now()){
 if(!data||data.schema!=='ict-research-monitor/1'||data.readyForExecution!==false)throw Error('UNSAFE_OR_INVALID_MONITOR_STATE');
 const stamp=typeof data.lastCycleAt==='string'?Date.parse(data.lastCycleAt):NaN;
 const age=now-stamp;
 const fresh=Number.isFinite(stamp)&&age>=-120000&&age<=45*60000&&data.cycleError==null&&data.active!==false;
 const targets={};
 for(const [id,val] of Object.entries(data.targets||{}).slice(0,16)){
  if(!/^[a-z]+:[A-Z0-9_]+:(5|15)$/.test(id)||!val||typeof val!=='object')continue;
  const [market,symbol,frame]=id.split(':');
  if(market==='kraken'&&!kraken.SYMBOLS.includes(symbol))continue;
  if(val.market!==market||val.symbol!==symbol||String(val.frame)!==frame)continue;
  const marketType=market==='spot'?'SPOT_RESEARCH':['crypto','kraken'].includes(market)?'PERPETUAL':'PROVIDER_NATIVE';
  const source=market==='spot'?spot.SOURCE:market==='crypto'?'Bybit V5 USDT perpetual':market==='kraken'?kraken.SOURCE:'Biquote independent feed';
  const last=Date.parse(val.lastCompleteAt||'');
  const legacyProxy=market!=='spot'&&(/SPOT/.test(val.marketType||'')||/Binance/i.test(val.source||''));
  const status=val.status==='research_data_valid'&&!legacyProxy?'research_data_valid':'blocked';
  const patternCounts=Object.fromEntries(['sweep','mss','fvg','composite','recent','valid'].map(k=>[k,Math.min(1000,Math.max(0,Number(val.patternCounts?.[k])||0))]));
  targets[id]={market,symbol,frame,source,marketType,status,patternCounts,
   stale:val.stale===true||!Number.isFinite(last)||last>now||now-last>3*Number(frame)*60000,
   lastCompleteAt:Number.isFinite(last)?new Date(last).toISOString():null,
   consecutiveFailures:Math.max(0,Math.min(999999,Number(val.consecutiveFailures)||0)),
   modelCount:status==='research_data_valid'?patternCounts.valid:0,lastRecoveredAt:val.lastRecoveredAt||null,
   error:legacyProxy?'LEGACY_SPOT_PROXY':val.error?String(val.error).slice(0,120):null,
   hourlyContext:publicHour(val.hourlyContext,now),
   newsGate:val.newsGate||null,executionQuoteGate:'not_verified',accountRiskGate:'not_verified'};
 }
 // Only expose recent, observed research setups with internally consistent levels.
 // Never copy arbitrary backend objects or personal account fields to a public branch.
 const observations=[];
 for(const obs of (Array.isArray(data.observations)?data.observations:[]).slice(0,100)){
  if(!fresh||!obs||obs.status!=='research_only_blocked'||obs.accountName||!['BUY','SELL'].includes(obs.side))continue;
  const key=[obs.market,obs.symbol,String(obs.frame)].join(':');
  const target=targets[key];
  if(!target||target.status!=='research_data_valid'||target.stale)continue;
  const formed=obs.formedAt, detected=Date.parse(obs.detectedAt||''), checked=Date.parse(obs.checkedAt||'');
  const close=Date.parse(target.lastCompleteAt),ms=Number(target.frame)*60000;
  const {phase,at}=obs.research||{};
  const {sweepAt,mssAt,fvgAt}=obs.evidence||{};
  if(![formed,detected,checked,at,sweepAt,mssAt,fvgAt].every(Number.isSafeInteger))continue;
  if(sweepAt>=Math.min(mssAt,fvgAt)||formed!==Math.max(mssAt,fvgAt)+ms)continue;
  if(!phases.has(phase)||at<formed||at>close||detected<formed||detected>checked||checked>now||
   close>checked||close-formed>12*ms)continue;
  const {entry,stop,target:targetPrice}=obs;
  if(![entry,stop,targetPrice].every(v=>Number.isFinite(v)&&v>0))continue;
  if(obs.side==='BUY'&&!(stop<entry&&entry<targetPrice))continue;
  if(obs.side==='SELL'&&!(targetPrice<entry&&entry<stop))continue;
  if(typeof obs.id!=='string'||!obs.id.startsWith(key+':'))continue;
  observations.push({id:String(obs.id).slice(0,130),market:target.market,symbol:target.symbol,frame:target.frame,
   detectedAt:new Date(detected).toISOString(),checkedAt:new Date(checked).toISOString(),lastCompleteAt:target.lastCompleteAt,
   marketType:target.marketType,research:{phase,at:new Date(at).toISOString()},formedAt:new Date(formed).toISOString(),side:obs.side,
   entry,stop,target:targetPrice,rr:Math.round(Math.abs((targetPrice-entry)/(entry-stop))*100)/100,
   evidence:{sweepAt:new Date(sweepAt).toISOString(),mssAt:new Date(mssAt).toISOString(),fvgAt:new Date(fvgAt).toISOString()},
   zone:obs.zone&&[obs.zone.low,obs.zone.high].every(Number.isFinite)&&obs.zone.low<entry&&entry<obs.zone.high?
    {low:obs.zone.low,high:obs.zone.high}:null,
   source:target.source,model:'Sweep → MSS → FVG',status:'research_only_blocked',
   newsGate:typeof obs.newsGate==='string'?obs.newsGate.slice(0,40):String(obs.newsGate?.status||'not_verified').slice(0,40),
   accountRiskGate:'not_verified',executionQuoteGate:'not_verified',executionApproved:false});
  if(observations.length>=24)break;
 }
 const values=Object.values(targets);
 const valid=values.filter(t=>t.status==='research_data_valid'&&!t.stale).length;
 const news=data.safety?.economic||{};
 return {schema:'ict-research-monitor/1',transport:'github-actions-static',generatedAt:new Date(now).toISOString(),lastCycleAt:Number.isFinite(stamp)?new Date(stamp).toISOString():null,serverTime:new Date(now).toISOString(),active:fresh,marketDataReady:fresh&&valid>0,allMarketDataReady:fresh&&values.length>0&&values.every(t=>t.status==='research_data_valid'&&!t.stale),marketCount:values.length,cycleCount:Number(data.cycleCount)||0,pollIntervalMs:10*60000,cycleError:data.cycleError?String(data.cycleError).slice(0,120):null,marketSummary:{configured:values.length,valid,blocked:values.length-valid,stale:values.filter(t=>t.stale).length,unchecked:values.filter(t=>t.status==='not_checked').length},targets,safety:{economic:{ok:news.ok===true,reason:news.ok?null:(news.reason||'NOT_CONFIGURED'),eventCount:Number(news.eventCount)||0},bidAsk:{connected:false,reason:'NOT_CONNECTED_IN_FREE_RUNNER'},accountRisk:'not_verified',executionApproved:false},readyForExecution:false,observations};
}
async function main(){
 await fs.mkdir(OUT,{recursive:true});
 // Failure of a data source MUST NOT result in a misleading success payload.
 const monitor=runner.start({noHttp:true,noSchedule:true});
 try{await runner.restore();await runner.cycle();const snapshot=runner.snapshot();const payload=publicSnapshot(snapshot);
  await fs.writeFile(OUTFILE,JSON.stringify(payload,null,2)+'\n','utf8');
  process.stdout.write('One-shot market scan: '+payload.marketSummary.valid+'/'+payload.marketCount+' fresh sources; approval=false\n');
  for(const [id,t] of Object.entries(payload.targets)){
   const diagnostics=snapshot.targets[id]?.hourlyContext?.diagnostics;
   const coverage=diagnostics?' hourlyCoverage='+JSON.stringify(diagnostics):'';
   process.stdout.write(id+' '+(t.error||t.source)+' hourly='+t.hourlyContext.status+coverage+' '+JSON.stringify(t.patternCounts)+'\n');
  }
  process.stdout.write('Public research observations: '+payload.observations.length+'\n');
  if(!payload.marketDataReady)process.stdout.write('WARNING: no verified current market data; status remains blocked\n');
 }finally{await monitor.stop()}
}
if(require.main===module)main().catch(e=>{process.stderr.write('Monitor run failed: '+String(e.message||e)+'\n');process.exitCode=1});
module.exports={publicSnapshot};
