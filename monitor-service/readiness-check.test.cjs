'use strict';
const assert=require('node:assert/strict');const {report,checkRemote}=require('./readiness-check.cjs');
const now=Date.parse('2026-11-24T18:00:00Z');
const health={schema:'ict-research-monitor/1',readyForExecution:false,active:true,lastCycleAt:new Date(now-1000).toISOString(),pollIntervalMs:300000,marketSummary:{configured:2,valid:2,blocked:0,stale:0,unchecked:0},marketDataReady:true,allMarketDataReady:true,safety:{economic:{ok:false},bidAsk:{connected:false}}};
assert.equal(report(health,now).serviceDataReady,true);
assert.equal(report(health,now).executionApproved,false);
assert.ok(report({...health,marketSummary:{...health.marketSummary,valid:0},marketDataReady:false},now).issues.includes('NO_FRESH_VALID_MARKET_DATA'));
assert.equal(report({...health,active:false},now).serviceDataReady,false);
assert.equal(report({...health,readyForExecution:true},now).serviceDataReady,false);
assert.equal(report({...health,lastCycleAt:new Date(now-3600000).toISOString()},now).serviceDataReady,false);
assert.equal(report({...health,marketSummary:{...health.marketSummary,valid:1},allMarketDataReady:false},now).serviceDataReady,true);
(async()=>{
 const mock=async url=>({ok:true,text:async()=>JSON.stringify({...health,lastCycleAt:new Date().toISOString()})});
 assert.equal((await checkRemote('https://test.example',mock)).serviceDataReady,true);
 await assert.rejects(()=>checkRemote('http://test.example',mock),/HTTPS/);
 console.log('8C.6 readiness test assertions passed');
})().catch(e=>{console.error(e);process.exitCode=1});
