'use strict';const assert=require('node:assert/strict');const os=require('node:os');const path=require('node:path');const fs=require('node:fs/promises');
process.env.MONITOR_TARGETS='crypto:BTCUSDT:15';process.env.STORE_FILE=path.join(os.tmpdir(),'ict-8c2-test-'+process.pid+'.json');process.env.PORT='18787';
const m=require('./server');
async function main(){
 assert.equal(m.parseTargets('crypto:BTCUSDT:15,metals:XAUUSD:5').length,2);
 assert.throws(()=>m.parseTargets('metals:XAUUSDT:15'),/UNSUPPORTED/);
 assert.throws(()=>m.parseTargets('crypto:BTCUSDT:999'),/FRAME/);
 const now=Date.now(),ms=900000;
 const mk=(i)=>({start:Math.floor(now/ms)*ms-34*ms+i*ms,open:1,high:2,low:0.5,close:1.5,confirmed:true});
 const bars=Array.from({length:34},(_,i)=>mk(i));
 assert.equal(m.validBars(bars,'15',now).length,34);
 assert.throws(()=>m.validBars(bars.filter((_,i)=>i!==26),'15',now),/LATEST_SEGMENT/);
 assert.throws(()=>m.validBars(bars.map(b=>({...b,confirmed:false})),'15',now),/NOT_ENOUGH/);
 assert.equal(m.snapshot().readyForExecution,false);
 const oldFetch=global.fetch;global.fetch=async u=>({ok:true,json:async()=>({retCode:0,result:{symbol:'BTCUSDT',list:bars.map(b=>[b.start,String(b.open),String(b.high),String(b.low),String(b.close),'20','20']).reverse()}})});
 const service=m.start({noHttp:true,noSchedule:true});await service.cycle();
 const s=service.snapshot();assert.equal(s.cycleCount,1);assert.equal(s.targets['crypto:BTCUSDT:15'].status,'research_data_valid');assert.equal(s.readyForExecution,false);
 assert.equal(s.active,true);assert.equal(s.observations.every(x=>x.status==='research_only_blocked'),true);
 const persisted=JSON.parse(await fs.readFile(process.env.STORE_FILE,'utf8'));assert.equal(persisted.cycleCount,1);
 global.fetch=oldFetch;await fs.unlink(process.env.STORE_FILE).catch(()=>{});
 console.log('8C.2: 12 assertions passed');
}
main().catch(e=>{console.error(e);process.exitCode=1});
