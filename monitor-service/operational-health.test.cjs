'use strict';
const assert=require('node:assert/strict');const os=require('node:os');const path=require('node:path');const fs=require('node:fs/promises');
process.env.MONITOR_TARGETS='crypto:BTCUSDT:15';process.env.STORE_FILE=path.join(os.tmpdir(),'ict-8c6-health-'+process.pid+'.json');
const {start}=require('./server.js');
(async()=>{
 const initialFetch=global.fetch;
 global.fetch=async()=>{throw Error('SIMULATED_MARKET_OUTAGE')};
 const service=start({noHttp:true,noSchedule:true});
 try{
  const before=service.snapshot();assert.equal(before.marketSummary.configured,1);assert.equal(before.marketSummary.unchecked,1);assert.equal(before.marketDataReady,false);
  await service.cycle();const x=service.snapshot();
  assert.equal(x.active,true,'heartbeat can stay operational');
  assert.equal(x.marketDataReady,false,'outage cannot claim market readiness');
  assert.equal(x.allMarketDataReady,false);
  assert.equal(x.marketSummary.valid,0);assert.equal(x.marketSummary.blocked,1);
  assert.equal(x.targets['crypto:BTCUSDT:15'].status,'blocked');
  assert.equal(x.readyForExecution,false);
  console.log('8C.6 outage health assertions passed');
 }finally{global.fetch=initialFetch;await service.stop();await fs.unlink(process.env.STORE_FILE).catch(()=>{});}
})().catch(e=>{console.error(e);process.exitCode=1});
