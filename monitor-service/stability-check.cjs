'use strict';
/** Read-only repeated health check for a DEPLOYED monitor. No market orders, tokens or private accounts. */
const {checkRemote}=require('./readiness-check.cjs');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function sample(base,{count=3,intervalMs=10000,check=checkRemote,sleep=pause}={}){
 if(!Number.isSafeInteger(count)||count<2||count>30)throw Error('SAMPLE_COUNT_MUST_BE_2_TO_30');
 if(!Number.isSafeInteger(intervalMs)||intervalMs<0||intervalMs>900000)throw Error('INVALID_INTERVAL');
 const snapshots=[];
 for(let i=0;i<count;i++){
  if(i)await sleep(intervalMs);
  const at=new Date().toISOString();
  try{const result=await check(base);snapshots.push({at,pass:result.serviceDataReady===true,issues:result.issues,warnings:result.warnings,marketSummary:result.marketSummary})}
  catch(e){snapshots.push({at,pass:false,issues:['CONNECTIVITY_ERROR: '+String(e.message||e).slice(0,130)],warnings:[]})}
 }
 const passed=snapshots.filter(x=>x.pass).length;
 return {schema:'ict-monitor-stability/1',executionApproved:false,passed,failed:snapshots.length-passed,count,allPassed:passed===count,snapshots};
}
if(require.main===module){
 const url=process.argv[2],count=Number(process.argv[3]||3),intervalMs=Number(process.argv[4]||10000);
 if(!url){console.error('Usage: node stability-check.cjs https://monitor.example.com [samples=3] [interval_ms=10000]');process.exitCode=2}
 else sample(url,{count,intervalMs}).then(r=>{console.log(JSON.stringify(r,null,2));if(!r.allPassed)process.exitCode=1}).catch(e=>{console.error('STABILITY_CHECK_FAILED: '+e.message);process.exitCode=2});
}
module.exports={sample};
