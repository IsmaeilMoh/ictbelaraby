'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
process.env.MONITOR_TARGETS='crypto:BTCUSDT:15';process.env.STORE_FILE=path.join(os.tmpdir(),'ict-8c7-recovery-'+process.pid+'.json');
const monitor=require('./server.js');
(async()=>{
 const original=global.fetch,service=monitor.start({noHttp:true,noSchedule:true});
 try{
  global.fetch=async()=>{throw Error('SIMULATED_OUTAGE')};
  await service.cycle();let v=service.snapshot();
  assert.equal(v.targets['crypto:BTCUSDT:15'].consecutiveFailures,1);assert.equal(v.marketDataReady,false);
  await service.cycle();v=service.snapshot();assert.equal(v.targets['crypto:BTCUSDT:15'].consecutiveFailures,2);
  const now=Date.now(),ms=900000,base=Math.floor(now/ms)*ms-34*ms;
  const bars=Array.from({length:34},(_,i)=>[base+i*ms,'100','110','90','105','20','20']).reverse();
  global.fetch=async()=>({ok:true,json:async()=>({retCode:0,result:{symbol:'BTCUSDT',list:bars}})});
  await service.cycle();v=service.snapshot();
  assert.equal(v.targets['crypto:BTCUSDT:15'].consecutiveFailures,0);
  assert.ok(v.targets['crypto:BTCUSDT:15'].lastRecoveredAt);
  assert.equal(v.marketDataReady,true);assert.equal(v.allMarketDataReady,true);
  assert.equal(v.readyForExecution,false);
  assert.equal(v.failingTargets.length,0);
  const stored=JSON.parse(await fs.readFile(process.env.STORE_FILE,'utf8'));
  assert.ok(stored.targets['crypto:BTCUSDT:15'].lastRecoveredAt);
  console.log('8C.7 failure-streak and outage recovery: passed');
 }finally{global.fetch=original;await service.stop();await fs.unlink(process.env.STORE_FILE).catch(()=>{})}
})().catch(e=>{console.error(e);process.exitCode=1});
