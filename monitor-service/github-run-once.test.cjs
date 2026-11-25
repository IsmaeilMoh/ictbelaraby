'use strict';
const assert=require('node:assert/strict');const {publicSnapshot}=require('./github-run-once.cjs');
const now=Date.parse('2026-11-24T12:00:00Z');
const fixture={schema:'ict-research-monitor/1',readyForExecution:false,lastCycleAt:new Date(now-60000).toISOString(),cycleError:null,cycleCount:9,safety:{economic:{ok:false,reason:'SOURCE_MISSING'}},targets:{'crypto:BTCUSDT:15':{market:'crypto',symbol:'BTCUSDT',frame:'15',status:'research_data_valid',lastCompleteAt:new Date(now-60000).toISOString(),consecutiveFailures:0}}};
let s=publicSnapshot(fixture,now);assert.equal(s.marketDataReady,true);assert.equal(s.readyForExecution,false);assert.equal(s.safety.economic.ok,false);assert.equal(s.observations.length,0);
s=publicSnapshot({...fixture,lastCycleAt:new Date(now-50*60000).toISOString()},now);assert.equal(s.marketDataReady,false);assert.equal(s.active,false);
s=publicSnapshot({...fixture,targets:{'crypto:BTCUSDT:15':{...fixture.targets['crypto:BTCUSDT:15'],status:'blocked'}}},now);assert.equal(s.marketDataReady,false);
assert.throws(()=>publicSnapshot({...fixture,readyForExecution:true},now),/UNSAFE/);
console.log('GitHub static payload safety tests: PASS');

const good={id:'crypto:BTCUSDT:15:setup-01',market:'crypto',symbol:'BTCUSDT',frame:'15',formedAt:now-60000,checkedAt:new Date(now).toISOString(),research:{phase:'observed',at:now-60000},evidence:{sweepAt:now-1860000,mssAt:now-960000,fvgAt:now-960000},detectedAt:new Date(now-60000).toISOString(),status:'research_only_blocked',side:'BUY',entry:100,stop:99,target:102,accountRiskGate:'not_verified'};
let o=publicSnapshot({...fixture,observations:[good]},now);
assert.equal(o.observations.length,1);
assert.equal(o.observations[0].entry,100);
assert.equal(o.observations[0].executionApproved,false);
assert.equal(o.observations[0].accountName,undefined);
assert.equal(o.observations[0].accountRiskGate,'not_verified');
assert.equal(publicSnapshot({...fixture,observations:[{...good,side:'SELL'}]},now).observations.length,0);
assert.equal(publicSnapshot({...fixture,observations:[{...good,entry:NaN}]},now).observations.length,0);
assert.equal(publicSnapshot({...fixture,observations:[{...good,detectedAt:new Date(now-3600000).toISOString()}]},now).observations.length,0);
assert.equal(publicSnapshot({...fixture,observations:[{...good,accountName:'Private Account'}]},now).observations.length,0);
assert.equal(publicSnapshot({...fixture,targets:{...fixture.targets,'crypto:BTCUSDT:15':{...fixture.targets['crypto:BTCUSDT:15'],status:'blocked'}},observations:[good]},now).observations.length,0);
assert.equal(publicSnapshot({...fixture,observations:[good],cycleError:'storage unavailable'},now).observations.length,0);
assert.equal(publicSnapshot({...fixture,observations:[{...good,entry:'100'}]},now).observations.length,0);
console.log('Public research observation sanitization: PASS');

const proxy=publicSnapshot({...fixture,targets:{'crypto:BTCUSDT:15':{...fixture.targets['crypto:BTCUSDT:15'],source:'Binance Spot (research backup; NOT Bybit perpetual)',marketType:'SPOT_RESEARCH_PROXY'}}},now);
assert.equal(proxy.targets['crypto:BTCUSDT:15'].status,'blocked');
const spot=publicSnapshot({...fixture,targets:{'spot:BTCUSDT:15':{...fixture.targets['crypto:BTCUSDT:15'],market:'spot'}},
 observations:[{...good,market:'spot',id:'spot:BTCUSDT:15:setup-01'}]},now);
assert.equal(spot.targets['spot:BTCUSDT:15'].marketType,'SPOT_RESEARCH');
assert.match(spot.observations[0].source,/Binance Spot/);
assert.equal(spot.observations[0].executionApproved,false);
assert.equal(publicSnapshot({...fixture,observations:[{...good,research:{...good.research,at:now+60000}}]},now).observations.length,0);
console.log('Spot and perpetual identities remain disjoint: PASS');
const future=publicSnapshot({...fixture,targets:{'crypto:BTCUSDT:15':{...fixture.targets['crypto:BTCUSDT:15'],lastCompleteAt:new Date(now+5*60000).toISOString()}},observations:[good]},now);
assert.equal(future.targets['crypto:BTCUSDT:15'].stale,true);
assert.equal(future.marketDataReady,false);
assert.equal(future.observations.length,0);
console.log('Future-dated candles cannot produce published opportunities: PASS');

const key='crypto:BTCUSDT:15';
const refused=publicSnapshot({...fixture,targets:{[key]:{...fixture.targets[key],
 status:'blocked',lastCompleteAt:null,error:'BYBIT_HTTP_403',
 hourlyContext:{status:'unavailable',reason:'internal arbitrary error'}
}}},now);
assert.equal(refused.targets[key].reason,'provider_access_denied');
assert.equal(refused.targets[key].error,null);
assert.equal(refused.targets[key].hourlyContext.reason,'unknown');
assert.equal(future.targets[key].reason,'stale_candles');
console.log('Public market reasons are stable and omit raw provider errors: PASS');


const eventTime=new Date(now-120000).toISOString();
const history=publicSnapshot({...fixture,targets:{[key]:{...fixture.targets[key],sourceHistory:[
 {kind:'blocked',at:eventTime,reason:'provider_access_denied',details:'private provider text'},
 {kind:'recovered',at:new Date(now+60000).toISOString()},
 {kind:'invalid',at:eventTime,reason:'provider_unavailable'}
]}}},now);
assert.deepEqual(history.targets[key].sourceHistory,[{kind:'blocked',at:eventTime,reason:'provider_access_denied'}]);
assert.equal(history.readyForExecution,false);
