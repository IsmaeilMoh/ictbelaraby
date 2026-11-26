'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { inspectHourly } = require('./hourly-context.js');

const now = Date.parse('2026-11-25T12:00:00Z');
const hour = 3600000;
let seed = 1;
let price = 200;
function sample() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 2 ** 32;
}
const hourly = Array.from({ length: 180 }, (_, i) => {
  const open = price + (sample() - .5) * 4;
  price = open + (sample() - .5) * 8;
  return {start:now-(180-i)*hour,open,close:price,high:Math.max(open,price)+sample(),low:Math.min(open,price)-sample(),confirmed:true};
});
const aligned = inspectHourly(hourly, 'crypto', now);
assert.deepEqual(aligned, {status:'ready',lastCompleteAt:now,aligned:['bull']});
assert.deepEqual(inspectHourly([...hourly, {...hourly.at(-1), start:now, close:10, low:5}], 'crypto', now), aligned);
assert.equal(inspectHourly(hourly, 'crypto', now + 4 * hour).status, 'stale');
assert.equal(inspectHourly(hourly.filter((_, i) => i !== 178), 'crypto', now).status, 'insufficient');
assert.equal(inspectHourly([...hourly,hourly[0]], 'crypto', now).status, 'insufficient');

for (const [start, reopen] of [
  ['2026-11-23T23:00:00Z', '2026-11-24T23:00:00Z'],
  ['2026-07-06T22:00:00Z', '2026-07-07T22:00:00Z']
]) {
  const startAt = Date.parse(start);
  const reopenAt = Date.parse(reopen);
  const cutoff = reopenAt + 11 * hour;
  const closed = hourly.slice(0,23).map((bar,i) => ({...bar,start:startAt+i*hour}));
  const active = hourly.slice(23,34).map((bar,i) => ({...bar,start:reopenAt+i*hour}));
  const gold = [...closed,...active];
  assert.equal(inspectHourly(gold,'metals',cutoff,'XAUUSD').status,'ready');
  assert.equal(inspectHourly(gold,'metals',cutoff,'XAGUSD').status,'insufficient');
  assert.equal(inspectHourly(gold.filter((_,i)=>i!==5),'metals',cutoff,'XAUUSD').reason,'session_history_missing');
  assert.equal(inspectHourly(gold.filter((_,i)=>i!==26),'metals',cutoff,'XAUUSD').reason,'candle_gap');
  assert.equal(inspectHourly(gold, 'metals', cutoff+4*hour, 'XAUUSD').status,'stale');

  const shifted = [...closed,...active.map(bar=>({...bar,start:bar.start+hour}))];
  assert.equal(inspectHourly(shifted,'metals',cutoff+hour,'XAUUSD').status,'insufficient');
}
const friday = hourly.slice(0,23).map((bar,i) => ({...bar,start:Date.parse('2026-11-19T23:00:00Z')+i*hour}));
const sunday = hourly.slice(23,34).map((bar,i) => ({...bar,start:Date.parse('2026-11-22T23:00:00Z')+i*hour}));
assert.equal(inspectHourly([...friday,...sunday],'metals',sunday.at(-1).start+hour,'XAUUSD').status,'insufficient');

async function run() {
  process.env.MONITOR_TARGETS='crypto:BTCUSDT:5,crypto:BTCUSDT:15,crypto:ETHUSDT:15';
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'ict-hourly-'));
  process.env.STORE_FILE=path.join(dir,'monitor.json');
  const oldNow=Date.now;
  const oldFetch=global.fetch;
  const requests=[];
  Date.now=()=>now;
  let outage=false;
  global.fetch=async input=>{
    const url=new URL(input);
    if(url.hostname!=='api.bybit.com')return {ok:false,status:503};
    const interval=url.searchParams.get('interval');
    const symbol=url.searchParams.get('symbol');
    requests.push([symbol,interval]);
    if(interval==='60'&&(outage||symbol==='ETHUSDT'))return {ok:false,status:503};
    const rows=interval==='60'?hourly:Array.from({length:40},(_,i)=>({
      start:now-(40-i)*Number(interval)*60000,open:200,high:201,low:199,close:200
    }));
    return {ok:true,json:async()=>({retCode:0,result:{symbol,category:'linear',list:rows.map(b=>[b.start,b.open,b.high,b.low,b.close,100])}})};
  };
  try {
    const monitor=require('./server.js');
    const { publicSnapshot }=require('./github-run-once.cjs');
    await monitor.cycle();
    const live=monitor.snapshot();
    const view=publicSnapshot(live,now);
    assert.equal(view.readyForExecution,false);
    assert.equal(Object.keys(view.targets).length,3);
    assert.equal(live.targets['crypto:BTCUSDT:5'].hourlyContext.status,'ready');
    assert.deepEqual(live.targets['crypto:BTCUSDT:15'].hourlyContext.aligned,['bull']);
    assert.equal(live.targets['crypto:ETHUSDT:15'].hourlyContext.status,'unavailable');
    assert.equal(live.targets['crypto:ETHUSDT:15'].hourlyContext.reason,'provider_unavailable');
    assert.equal(live.targets['crypto:ETHUSDT:15'].status,'research_data_valid');
    assert.equal(requests.filter(([symbol,interval])=>symbol==='BTCUSDT'&&interval==='60').length,1);
    assert.equal(requests.filter(([symbol,interval])=>symbol==='ETHUSDT'&&interval==='60').length,1);
    outage=true;
    await monitor.cycle();
    const failed=monitor.snapshot();
    assert.equal(failed.targets['crypto:BTCUSDT:15'].hourlyContext.status,'unavailable');
    assert.equal(failed.targets['crypto:BTCUSDT:15'].status,'research_data_valid');
  } finally {
    Date.now=oldNow;
    global.fetch=oldFetch;
    await fs.rm(dir,{recursive:true,force:true});
  }
  console.log('Hourly context: aligned direction, future/old/gapped data, instrument isolation, deduplication and outage PASS');
}
run().catch(error=>{console.error(error);process.exitCode=1});
