'use strict';
/** GitHub Actions one-shot research scan. Only PUBLIC, non-execution research data is published. */
const fs=require('node:fs/promises');
const path=require('node:path');
const runner=require('./server.js');
const OUT=path.resolve(process.env.PUBLIC_OUTPUT_DIR||path.join(__dirname,'..','_monitor_publish'));
const OUTFILE=path.join(OUT,'monitor-status.json');
function publicSnapshot(data,now=Date.now()){
 if(!data||data.schema!=='ict-research-monitor/1'||data.readyForExecution!==false)throw Error('UNSAFE_OR_INVALID_MONITOR_STATE');
 const stamp=typeof data.lastCycleAt==='string'?Date.parse(data.lastCycleAt):NaN;
 const age=now-stamp;
 const fresh=Number.isFinite(stamp)&&age>=-120000&&age<=45*60000&&data.cycleError==null;
 const targets={};
 for(const [id,val] of Object.entries(data.targets||{}).slice(0,12)){
  if(!/^[a-z]+:[A-Z0-9]+:(5|15)$/.test(id)||!val||typeof val!=='object')continue;
  const last=Date.parse(val.lastCompleteAt||'');
  targets[id]={market:String(val.market||'').slice(0,30),symbol:String(val.symbol||'').slice(0,20),frame:String(val.frame||''),status:val.status==='research_data_valid'?'research_data_valid':'blocked',stale:!Number.isFinite(last)||now-last>Math.max(3*Number(val.frame||15)*60000,300000),lastCompleteAt:Number.isFinite(last)?new Date(last).toISOString():null,consecutiveFailures:Math.max(0,Math.min(999999,Number(val.consecutiveFailures)||0)),modelCount:Math.max(0,Math.min(100,Number(val.modelCount)||0)),lastRecoveredAt:val.lastRecoveredAt||null,error:val.error?String(val.error).slice(0,120):null,newsGate:val.newsGate||null,executionQuoteGate:val.executionQuoteGate||null,accountRiskGate:'not_verified'};
 }
 const values=Object.values(targets);
 const valid=values.filter(t=>t.status==='research_data_valid'&&!t.stale).length;
 const news=data.safety?.economic||{};
 return {schema:'ict-research-monitor/1',transport:'github-actions-static',generatedAt:new Date(now).toISOString(),lastCycleAt:Number.isFinite(stamp)?new Date(stamp).toISOString():null,serverTime:new Date(now).toISOString(),active:fresh,marketDataReady:fresh&&valid>0,allMarketDataReady:fresh&&values.length>0&&values.every(t=>t.status==='research_data_valid'&&!t.stale),marketCount:values.length,cycleCount:Number(data.cycleCount)||0,pollIntervalMs:15*60000,cycleError:data.cycleError?String(data.cycleError).slice(0,120):null,marketSummary:{configured:values.length,valid,blocked:values.length-valid,stale:values.filter(t=>t.stale).length,unchecked:values.filter(t=>t.status==='not_checked').length},targets,safety:{economic:{ok:news.ok===true,reason:news.ok?null:(news.reason||'NOT_CONFIGURED'),eventCount:Number(news.eventCount)||0},bidAsk:{connected:false,reason:'NOT_CONNECTED_IN_FREE_RUNNER'},accountRisk:'not_verified',executionApproved:false},readyForExecution:false,observations:[]};
}
async function main(){
 await fs.mkdir(OUT,{recursive:true});
 // Failure of a data source MUST NOT result in a misleading success payload.
 const monitor=runner.start({noHttp:true,noSchedule:true});
 try{await runner.restore();await runner.cycle();const payload=publicSnapshot(runner.snapshot());
  await fs.writeFile(OUTFILE,JSON.stringify(payload,null,2)+'\n','utf8');
  process.stdout.write('One-shot market scan: '+payload.marketSummary.valid+'/'+payload.marketCount+' fresh sources; approval=false\n');
  if(!payload.marketDataReady)process.stdout.write('WARNING: no verified current market data; status remains blocked\n');
 }finally{await monitor.stop()}
}
if(require.main===module)main().catch(e=>{process.stderr.write('Monitor run failed: '+String(e.message||e)+'\n');process.exitCode=1});
module.exports={publicSnapshot};
