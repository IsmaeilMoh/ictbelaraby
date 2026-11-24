'use strict';
/** Read-only verifier. Does not send orders or credentials. */
const fs=require('node:fs');
function report(health,now=Date.now()){
 const issues=[],warnings=[];
 if(health?.schema!=='ict-research-monitor/1')issues.push('INCOMPATIBLE_HEALTH_SCHEMA');
 if(health?.readyForExecution!==false)issues.push('EXECUTION_FLAG_UNSAFE');
 const ms=Date.parse(health?.lastCycleAt||'');
 if(!Number.isFinite(ms)||ms>now+120000||now-ms>Math.max(900000,3*(Number(health.pollIntervalMs)||300000)))issues.push('CYCLE_TIMESTAMP_INVALID_OR_STALE');
 if(health?.active!==true)issues.push('MONITOR_NOT_ACTIVE');
 const totals=health?.marketSummary;
 if(!totals||!Number.isSafeInteger(totals.configured)||totals.configured<1)issues.push('MARKET_SUMMARY_MISSING');
 else {
  if(totals.valid===0||health.marketDataReady!==true)issues.push('NO_FRESH_VALID_MARKET_DATA');
  if(totals.valid<totals.configured||health.allMarketDataReady!==true)warnings.push('SOME_TARGETS_UNAVAILABLE');
 }
 if(health?.safety?.economic?.ok!==true)warnings.push('ECONOMIC_FEED_NOT_VERIFIED');
 if(health?.safety?.bidAsk?.connected!==true)warnings.push('EXECUTION_QUOTE_FEED_NOT_CONNECTED');
 warnings.push('ACCOUNT_RISK_AND_EXECUTION_NOT_APPROVED');
 return {serviceDataReady:issues.length===0,executionApproved:false,issues,warnings,marketSummary:totals||null};
}
async function checkRemote(url,fetchImpl=fetch){const u=new URL(url);
 if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)throw Error('PUBLIC_ENDPOINT_MUST_BE_CLEAN_HTTPS');
 const endpoint=u.origin+u.pathname.replace(/\/$/,'')+'/health';
 const response=await fetchImpl(endpoint,{signal:AbortSignal.timeout(10000),cache:'no-store',headers:{Accept:'application/json'}});
 if(!response.ok)throw Error('HEALTH_HTTP_'+response.status);
 const body=await response.text();if(body.length>150000)throw Error('HEALTH_RESPONSE_TOO_LARGE');
 return report(JSON.parse(body));}
if(require.main===module){const url=process.argv[2];if(!url){console.error('Usage: node readiness-check.cjs https://monitor.yourdomain.example');process.exitCode=2}else checkRemote(url).then(result=>{console.log(JSON.stringify(result,null,2));if(!result.serviceDataReady)process.exitCode=1}).catch(error=>{console.error('READINESS_CHECK_FAILED: '+String(error.message||error));process.exitCode=2});}
module.exports={report,checkRemote};
