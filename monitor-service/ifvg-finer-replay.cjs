'use strict';

const rules=require('../ict-decision-engine-708a.js');
const structure=require('../ict-structure-engine-702d.js');
const signals=require('./ict_phase2e/ict-signal-engine-702e.js');
const lifecycle=require('../ict-opportunity-lifecycle-708b.js');
const data=require('../historical-multi-market.json');

const FIVE=300000;
const WEEK=7*86400000;
const windowStart=time=>Math.floor(time/WEEK)*WEEK;
const iso=time=>new Date(time).toISOString();
const utc=time=>iso(time).slice(0,19).replace('T',' ');
const rows=series=>series.map(([time,open,high,low,close])=>({start:Date.parse(time),open,high,low,close,confirmed:true}));
const fields=['open','high','low','close'];

function ambiguousCases(){
 const cases=[];
 for(const [symbol,series] of Object.entries(data.assets)){
  for(const [frame,key] of [['15','15m'],['60','1h']]){
   const ms=lifecycle.FRAME[frame],bars=rows(series[key]||[]);
   for(let n=30;n<=bars.length;n++){
    const prefix=bars.slice(Math.max(0,n-250),n),now=prefix.at(-1).start+ms;
    const {analysis}=signals.evaluate(prefix,frame,{now,market:'forex',symbol});
    if(!analysis.eligible)continue;
    const segment=structure.normalize(prefix,frame,now).segments.at(-1)||[];
    const index=new Map(segment.map((bar,i)=>[bar.start,i]));
    const pivots=[{pivots:analysis.pivots,ms,frame}];
    for(const model of rules.inversionFvg(segment,index,analysis,ms,'forex',symbol,frame)){
     if(model.formedAt!==now||model.status!=='watching')continue;
     const plan=rules.liquidityPlan(model,segment,pivots,model.range);
     if(!plan||plan.interveningLiquidity)continue;
     const side=model.direction==='bull'?'BUY':'SELL';
     const record=lifecycle.create({...model,market:'forex',symbol,frame,side,target:plan.target},now,{researchOnly:true});
     const result=lifecycle.advance(record,bars,bars.at(-1).start+ms);
     if(result.state!=='ambiguous')continue;
     const start=result.lastProcessedStart;
     const parent=bars.find(bar=>bar.start===start);
     const before=lifecycle.advance(record,bars,start);
     cases.push({symbol,frame,start,ms,parent,before,bars});
    }
   }
  }
 }
 return cases;
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

async function getFine(symbol,start,key){
 const query=new URLSearchParams({
  symbol:symbol.slice(0,3)+'/'+symbol.slice(3),interval:'5min',timezone:'UTC',
  start_date:utc(start),end_date:utc(start+WEEK-1),outputsize:'2016',apikey:key
 });
 let response;
 try{response=await fetch('https://api.twelvedata.com/time_series?'+query,{signal:AbortSignal.timeout(12000)})}
 catch{return {reason:'transport'};}
 if(!response.ok)return {reason:'HTTP '+response.status};
 const payload=await response.json().catch(()=>null);
 const code=Number(payload?.code);
 if(!Array.isArray(payload?.values))return {reason:Number.isInteger(code)?'provider '+code:'no data'};
 if(payload.meta?.symbol?.replace('/','')!==symbol||payload.meta?.interval!=='5min')return {reason:'identity'};
 const bars=new Map();
 for(const row of payload.values){
  const stamp=Date.parse(String(row.datetime).replace(' ','T')+'Z');
  const bar={start:stamp,confirmed:true};
  for(const field of fields)bar[field]=Number(row[field]);
  if(!Number.isSafeInteger(stamp)||stamp%FIVE!==0||stamp<start||stamp>=start+WEEK||
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
 const cases=ambiguousCases(),requests=new Map(),summary={};
 console.log('Source:',data.source,'archive:',data.updatedAt,'ambiguous cases:',cases.length);
 const pending=[];
 const archived=new Map(Object.entries(data.assets).map(([symbol,series])=>[symbol,new Map(rows(series['15m']||[]).map(bar=>[bar.start,bar]))]));
 for(const item of cases){
  const prior=item.frame==='60'?refine(item,archived.get(item.symbol),'15'):null;
  if(prior&&['won','lost','invalidated'].includes(prior.state)){
   summary['archive '+prior.state]=(summary['archive '+prior.state]||0)+1;
   continue;
  }
  pending.push(item);
  const day=windowStart(item.start);
  requests.set(item.symbol+':'+day,{symbol:item.symbol,day});
 }
 console.log('Remaining cases:',pending.length,'targeted symbol-weeks:',requests.size);
 const batches=new Map();
 if(key)for(const [id,{symbol,day}] of requests){
  if(batches.size)await new Promise(resolve=>setTimeout(resolve,8500));
  const result=await getFine(symbol,day,key);
  batches.set(id,result);
  if(result.reason)console.log(symbol,iso(day).slice(0,10),result.reason);
  if(['HTTP 429','provider 429','HTTP 401','provider 401','HTTP 403','provider 403'].includes(result.reason))break;
 }
 let netR=0;
 for(const item of pending){
  const batch=batches.get(item.symbol+':'+windowStart(item.start));
  const result=batch?.bars?refine(item,batch.bars,'5'):{state:batch?.reason||'unavailable'};
  const id=item.frame+'m '+result.state;
  summary[id]=(summary[id]||0)+1;
  if(Number.isFinite(result.outcomeR))netR+=result.outcomeR;
 }
 console.log('IFVG refinement:',JSON.stringify(summary));
 console.log('Net R from newly resolved 5m cases:',netR.toFixed(2));
}
if(require.main===module)main().catch(()=>{console.error('IFVG refinement failed');process.exitCode=1});
module.exports={refine};
