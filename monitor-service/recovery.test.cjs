'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
process.env.MONITOR_TARGETS='crypto:BTCUSDT:15';process.env.STORE_FILE=path.join(os.tmpdir(),'ict-8c7-recovery-'+process.pid+'.json');
const monitor=require('./server.js');
(async()=>{
 const original=global.fetch,service=monitor.start({noHttp:true,noSchedule:true});
 try{
  const id='crypto:BTCUSDT:15';
  global.fetch=async()=>({ok:false,status:503});
  await service.cycle();let v=service.snapshot();
  assert.equal(v.targets['crypto:BTCUSDT:15'].consecutiveFailures,1);assert.equal(v.marketDataReady,false);
  const first=v.targets[id].sourceHistory[0];
  assert.equal(first.kind,'blocked');
  assert.equal(first.reason,'provider_unavailable');
  await service.cycle();v=service.snapshot();assert.equal(v.targets[id].consecutiveFailures,2);
  assert.deepEqual(v.targets[id].sourceHistory,[first]);
  global.fetch=async()=>({ok:false,status:429});
  await service.cycle();
  assert.equal(await monitor.restore(),true);
  const changed=service.snapshot().targets[id].sourceHistory[0];
  assert.equal(changed.kind,'reason_changed');
  assert.equal(changed.reason,'provider_rate_limited');
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
  assert.ok(stored.targets[id].lastRecoveredAt);
  assert.deepEqual(stored.targets[id].sourceHistory.map(event=>event.kind),['recovered','reason_changed','blocked']);
  await service.cycle();
  assert.deepEqual(service.snapshot().targets[id].sourceHistory,stored.targets[id].sourceHistory);
  for(let i=0;i<10;i++){
   global.fetch=async()=>({ok:false,status:i%2?429:503});
   await service.cycle();
  }
  const bounded=service.snapshot().targets[id].sourceHistory;
  assert.equal(bounded.length,8);
  assert.equal(bounded[0].reason,'provider_rate_limited');
  console.log('8C.7 failure-streak and outage recovery: passed');
 }finally{global.fetch=original;await service.stop();await fs.unlink(process.env.STORE_FILE).catch(()=>{})}
})().catch(e=>{console.error(e);process.exitCode=1});
