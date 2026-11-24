'use strict';
const assert=require('node:assert/strict');const {publicSnapshot}=require('./github-run-once.cjs');
const now=Date.parse('2026-11-24T12:00:00Z');
const fixture={schema:'ict-research-monitor/1',readyForExecution:false,lastCycleAt:new Date(now-60000).toISOString(),cycleError:null,cycleCount:9,safety:{economic:{ok:false,reason:'SOURCE_MISSING'}},targets:{'crypto:BTCUSDT:15':{market:'crypto',symbol:'BTCUSDT',frame:'15',status:'research_data_valid',lastCompleteAt:new Date(now-60000).toISOString(),consecutiveFailures:0}}};
let s=publicSnapshot(fixture,now);assert.equal(s.marketDataReady,true);assert.equal(s.readyForExecution,false);assert.equal(s.safety.economic.ok,false);assert.equal(s.observations.length,0);
s=publicSnapshot({...fixture,lastCycleAt:new Date(now-50*60000).toISOString()},now);assert.equal(s.marketDataReady,false);assert.equal(s.active,false);
s=publicSnapshot({...fixture,targets:{'crypto:BTCUSDT:15':{...fixture.targets['crypto:BTCUSDT:15'],status:'blocked'}}},now);assert.equal(s.marketDataReady,false);
assert.throws(()=>publicSnapshot({...fixture,readyForExecution:true},now),/UNSAFE/);
console.log('GitHub static payload safety tests: PASS');
