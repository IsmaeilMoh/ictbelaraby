'use strict';

const rules=require('../ict-decision-engine-708a.js');
const structure=require('../ict-structure-engine-702d.js');
const signals=require('./ict_phase2e/ict-signal-engine-702e.js');
const lifecycle=require('../ict-opportunity-lifecycle-708b.js');
const data=require('../historical-multi-market.json');

const DAY=86400000;
const displayed=process.env.IFVG_DISPLAYED==='1';
const holdout=process.env.IFVG_HOLDOUT==='1';
const extended=process.env.IFVG_EXTENDED==='1';
const matched=holdout||extended||process.env.IFVG_MATCHED==='1';
const matchedSymbols=holdout?['GBPUSD','USDJPY']:['EURUSD','XAUUSD'];
const independent=matched||process.env.IFVG_INDEPENDENT==='1';
const boundary=Date.parse('2026-10-10T00:00:00Z');
const replayStart=holdout?Date.parse('2026-10-12T00:00:00Z'):matched&&!extended?Date.parse('2026-10-04T00:00:00Z'):independent?Date.parse('2026-09-01T00:00:00Z'):boundary;
const replayEnd=holdout?Date.parse('2026-11-13T00:00:00Z'):independent?boundary:Date.parse(data.updatedAt)+1;
const fineFrame=process.env.IFVG_FINE_FRAME==='1'?'1':'5';
const windowMs=(fineFrame==='1'?3:7)*DAY;
const windowStart=time=>Math.floor(time/windowMs)*windowMs;
const iso=time=>new Date(time).toISOString();
const utc=time=>iso(time).slice(0,19).replace('T',' ');
const rows=series=>series.map(([time,open,high,low,close])=>({start:Date.parse(time),open,high,low,close,confirmed:true}));
const fields=['open','high','low','close'];

function ambiguousCases(assets){
 const cases=[],settled={'15':[],'60':[]},coverage={'15':{scans:0},'60':{scans:0}};
 for(const [symbol,series] of Object.entries(assets)){
  if(matched&&!matchedSymbols.includes(symbol))continue;
  for(const [frame,key] of [['15','15m'],['60','1h']]){
   const ms=lifecycle.FRAME[frame],bars=rows(series[key]||[]).filter(bar=>!independent||bar.start+ms<replayEnd);
   for(let n=30;n<=bars.length;n++){
    const prefix=bars.slice(Math.max(0,n-250),n),now=prefix.at(-1).start+ms;
    if(displayed&&(now<replayStart||now>=replayEnd))continue;
    const {analysis}=signals.evaluate(prefix,frame,{now,market:'forex',symbol});
    if(!analysis.eligible)continue;
    const sample=coverage[frame];
    sample.scans++;
    sample.first=Math.min(sample.first??now,now);
    sample.last=Math.max(sample.last??now,now);
    const segment=structure.normalize(prefix,frame,now).segments.at(-1)||[];
    const index=new Map(segment.map((bar,i)=>[bar.start,i]));
    const pivots=[{pivots:analysis.pivots,ms,frame}];
    for(const model of rules.inversionFvg(segment,index,analysis,ms,'forex',symbol,frame)){
     if(model.formedAt!==now||model.status!=='watching')continue;
     const plan=rules.liquidityPlan(model,segment,pivots,model.range,{focused:!displayed});
     if(!plan||plan.interveningLiquidity)continue;
     const side=model.direction==='bull'?'BUY':'SELL';
     const record=lifecycle.create({...model,market:'forex',symbol,frame,side,target:plan.target},now,{researchOnly:true});
     const result=lifecycle.advance(record,bars,bars.at(-1).start+ms);
     if(Number.isFinite(result.outcomeR))settled[frame].push(result.outcomeR);
     if(result.state!=='ambiguous')continue;
     const start=result.lastProcessedStart;
     const parent=bars.find(bar=>bar.start===start);
     const before=lifecycle.advance(record,bars,start);
     cases.push({symbol,frame,start,ms,parent,before,bars});
    }
   }
  }
 }
 return {cases,settled,coverage};
}

function refine(item,fine,frame){
 const ms=lifecycle.FRAME[frame];
 const children=Array.from({length:item.ms/ms},(_,i)=>fine.get(item.start+i*ms));
 if(!children.every(Boolean))return {state:'missing'};
 const reconstructed={
  open:children[0].open,high:Math.max(...children.map(bar=>bar.high)),
  low:Math.min(...children.map(bar=>bar.low)),close:children.at(-1).close
 };
 if(!fields.every(field=>Math.abs(reconstructed[field]-item.parent[field])<=1e-8*Math.max(1,Math.abs(item.parent[field])))){
  return {state:'mismatch'};
 }
 const result=lifecycle.advance({...item.before,frame,maxBars:item.before.barsExamined+children.length+1,
  lastProcessedStart:item.start-ms},children,item.start+item.ms);
 if(!['waiting','active'].includes(result.state))return result;
 return lifecycle.advance({...result,frame:item.frame,maxBars:item.before.maxBars,
  barsExamined:item.before.barsExamined+1,lastProcessedStart:item.start},item.bars,item.bars.at(-1).start+item.ms);
}

async function getHistory(symbol,start,key,frame=fineFrame,duration=windowMs){
 const step=lifecycle.FRAME[frame];
 const interval=frame==='60'?'1h':frame+'min';
 const query=new URLSearchParams({
  symbol:symbol.slice(0,3)+'/'+symbol.slice(3),interval,timezone:'UTC',
  start_date:utc(start),end_date:utc(start+duration-1),outputsize:String(Math.ceil(duration/step)),apikey:key
 });
 let response;
 try{response=await fetch('https://api.twelvedata.com/time_series?'+query,{signal:AbortSignal.timeout(12000)})}
 catch{return {reason:'transport'};}
 if(!response.ok)return {reason:'HTTP '+response.status};
 const payload=await response.json().catch(()=>null);
 const code=Number(payload?.code);
 if(!Array.isArray(payload?.values))return {reason:Number.isInteger(code)?'provider '+code:'no data'};
 if(payload.meta?.symbol?.replace('/','')!==symbol||payload.meta?.interval!==interval)return {reason:'identity'};
 const bars=new Map();
 for(const row of payload.values){
  const stamp=Date.parse(String(row.datetime).replace(' ','T')+'Z');
  const bar={start:stamp,confirmed:true};
  for(const field of fields)bar[field]=Number(row[field]);
  if(!Number.isSafeInteger(stamp)||stamp%step!==0||stamp<start||stamp>=start+duration||
     bars.has(stamp)||!fields.every(field=>Number.isFinite(bar[field])&&bar[field]>0)||
     bar.high<Math.max(bar.open,bar.close,bar.low)||bar.low>Math.min(bar.open,bar.close,bar.high)){
   return {reason:'invalid candles'};
  }
  bars.set(stamp,bar);
 }
 return {bars};
}

async function main(){
 const key=process.env.TWELVEDATA_API_KEY;
 const assets={...data.assets};
 if(extended){
  if(!key)throw Error('TWELVEDATA_API_KEY is not configured');
  const warmup=replayStart-2*DAY;
  for(const symbol of matchedSymbols){
   const series=assets[symbol]['15m'];
   const edge=Date.parse(series[0][0]);
   const result=await getHistory(symbol,warmup,key,'15',edge-warmup);
   if(!result.bars?.size)throw Error(symbol+' 15m history unavailable: '+result.reason);
   const backfill=[...result.bars.values()].sort((a,b)=>a.start-b.start)
    .map(bar=>[iso(bar.start),...fields.map(field=>bar[field])]);
   assets[symbol]={...assets[symbol],'15m':[...backfill,...series]};
   console.log('Same-provider backfill:',symbol,backfill.length);
  }
 }
 if(holdout){
  if(!key)throw Error('TWELVEDATA_API_KEY is not configured');
  const warmup=replayStart-3*DAY;
  for(const symbol of matchedSymbols){
   const marketHistory={};
   for(const [frame,series] of [['15','15m'],['60','1h']]){
    const result=await getHistory(symbol,warmup,key,frame,replayEnd-warmup);
    if(!result.bars?.size)throw Error(symbol+' '+series+' history unavailable: '+result.reason);
    marketHistory[series]=[...result.bars.values()].sort((a,b)=>a.start-b.start)
     .map(bar=>[iso(bar.start),...fields.map(field=>bar[field])]);
    console.log('Holdout provider bars:',symbol,series,marketHistory[series].length);
   }
   assets[symbol]=marketHistory;
  }
 }
 const {cases,settled,coverage}=ambiguousCases(assets),requests=new Map(),summary={};
 console.log('Mode:',displayed?'nearest liquidity on entry frame':'focused','Fine frame:',fineFrame);
 console.log('Source:',data.source,holdout?'holdout fetched directly':'archive '+data.updatedAt,'ambiguous cases:',cases.length);
 if(independent){
  console.log('Independent UTC interval:',iso(replayStart),iso(replayEnd));
  for(const [frame,info] of Object.entries(coverage)){
   console.log('Coverage '+frame+'m:',JSON.stringify({scans:info.scans,first:info.first?iso(info.first):null,last:info.last?iso(info.last):null}));
  }
 }
 const pending=[];
 const archived=new Map(Object.entries(assets).map(([symbol,series])=>[symbol,new Map(rows(series['15m']||[]).map(bar=>[bar.start,bar]))]));
 for(const item of cases){
  const prior=item.frame==='60'?refine(item,archived.get(item.symbol),'15'):null;
  if(prior&&['won','lost','invalidated'].includes(prior.state)){
   if(Number.isFinite(prior.outcomeR))settled[item.frame].push(prior.outcomeR);
   const id='archive '+(independent?item.frame+'m ':'')+prior.state;
   summary[id]=(summary[id]||0)+1;
   continue;
  }
  pending.push(item);
  const day=windowStart(item.start);
  requests.set(item.symbol+':'+day,{symbol:item.symbol,day});
 }
 console.log('Remaining cases:',pending.length,'targeted windows:',requests.size);
 if(!key&&pending.length)console.log('Fine history unavailable: TWELVEDATA_API_KEY is not configured.');
 const batches=new Map();
 if(key)for(const [id,{symbol,day}] of requests){
  if(batches.size)await new Promise(resolve=>setTimeout(resolve,8500));
  const result=await getHistory(symbol,day,key);
  batches.set(id,result);
  if(result.reason)console.log(symbol,iso(day).slice(0,10),result.reason);
  if(['HTTP 429','provider 429','HTTP 401','provider 401','HTTP 403','provider 403'].includes(result.reason))break;
 }
 let netR=0;
 for(const item of pending){
  const batch=batches.get(item.symbol+':'+windowStart(item.start));
  const result=batch?.bars?refine(item,batch.bars,fineFrame):{state:batch?.reason||'unavailable'};
  const id=item.frame+'m '+result.state;
  summary[id]=(summary[id]||0)+1;
  if(Number.isFinite(result.outcomeR)){netR+=result.outcomeR;settled[item.frame].push(result.outcomeR);}
 }
 console.log('IFVG refinement:',JSON.stringify(summary));
 if([...batches.values()].some(batch=>batch.bars))console.log('Net R from newly resolved '+fineFrame+'m cases:',netR.toFixed(2));
 if(independent)for(const [frame,outcomes] of Object.entries(settled))logSettled('Settled '+frame+'m:',outcomes);
 logSettled('Settled IFVG:',Object.values(settled).flat());
}

function logSettled(label,settled){
 const total=settled.reduce((sum,value)=>sum+value,0),largest=Math.max(0,...settled);
 console.log(label,JSON.stringify({targets:settled.filter(value=>value>0).length,stops:settled.filter(value=>value<0).length,
  netR:Number(total.toFixed(2)),largestWinR:Number(largest.toFixed(2)),withoutLargestR:Number((total-largest).toFixed(2))}));
}
if(require.main===module)main().catch(error=>{console.error('IFVG refinement failed:',error.message);process.exitCode=1});
module.exports={refine};
