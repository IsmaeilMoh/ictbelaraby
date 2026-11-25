'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const context = require('../ict-context-engine-703a.js');
const economic = require('../ict-economic-link-706a.js');
const decision = require('../ict-decision-engine-708a.js');
const structure = require('../ict-structure-engine-702d.js');
const monitorSignals = require('./ict_phase2e/ict-signal-engine-702e.js');
const bybit = require('./ict-live-feed-702a.js');

const now = Date.parse('2026-11-25T14:00:00Z');
const minute = 60000;
const interval = 15 * minute;
const hour = 60 * minute;
const iso = instant => new Date(instant).toISOString();

function syntheticBars() {
  // Deterministic unit-test prices. This OHLC sequence ends with a bearish sweep/MSS/FVG.
  let seed = 20;
  let price = 200;
  function sample() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  }
  return Array.from({ length: 48 }, (_, i) => {
    const open = price + (sample() - 0.5) * 4;
    price = open + (sample() - 0.5) * 8;
    return { start: now - (48 - i) * interval, open, close: price,
      high: Math.max(open, price) + sample(), low: Math.min(open, price) - sample(), confirmed: true };
  });
}

function testModelTypes(){
  const create=(file)=>fs.readFile(path.join(__dirname,'..',file),'utf8');
  return Promise.all([create('ict-model-validation-704c3.js'),create('ict-advanced-validation-704c4.js')]).then(([models,advanced])=>{
    const browser={Intl,Date};
    vm.runInNewContext(models,browser);
    vm.runInNewContext(advanced,browser);
    const rule=browser.ICTModelValidation4C3,extra=browser.ICTAdvancedValidation4C4;
    for(const close of ['2026-01-15T15:00:00Z','2026-07-15T14:00:00Z']){
      const start=Date.parse(close);
      const candle={sweepAt:start,mssAt:start+15*minute,fvgAt:start+30*minute};
      assert.ok(rule.silverBulletMatch(candle));
      assert.equal(rule.silverBulletMatch({...candle,fvgAt:start+60*minute}),false);
      assert.equal(rule.silverBulletMatch({...candle,fvgAt:start}),false);
    }
    const candles=Array.from({length:13},(_,i)=>({start:now+i*minute,open:100,close:101,low:99,high:102}));
    candles[12]={...candles[12],open:102,close:105,high:106};
    const index=new Map(candles.map((bar,i)=>[bar.start,i]));
    assert.ok(rule.displacementEvidence({direction:'bull',sweepAt:now+10*minute,mssAt:now+12*minute},candles,index).pass);
    assert.equal(extra.oteEntry({direction:'bull',gapLow:102,gapHigh:104},[{low:100,high:110}],0,0),102.95);
    const start=Date.parse('2026-11-01T04:00:00Z');
    const sequence=Array.from({length:7},(_,i)=>({start:start+i*hour,high:110,low:i===6?95:100}));
    const c={direction:'bull',sweepAt:sequence[6].start,mssAt:sequence[6].start+hour,fvgAt:sequence[6].start+hour};
    assert.equal(extra.amdRange(c,sequence,6,'60').accumulationLow,100);
    assert.equal(extra.amdRange(c,sequence.filter((_,i)=>i!==2),5,'60'),null);
    assert.equal(extra.amdRange(c,sequence,6,'240'),null);
  });
}

function testSessions() {
  for (const [day, start, next, hours, roll] of [
    ['2026-03-08', '2026-03-08T05:00:00Z', '2026-03-09T04:00:00Z', 23, '2026-03-08T21:00:00Z'],
    ['2026-11-01', '2026-11-01T04:00:00Z', '2026-11-02T05:00:00Z', 25, '2026-11-01T22:00:00Z']
  ]) {
    assert.equal(context.sessionStart(day), Date.parse(start));
    const end = Date.parse(next);
    assert.equal(context.sessionStart(next.slice(0, 10), 17), Date.parse(roll));
    const bars = Array.from({ length: hours }, (_, i) => ({
      start: Date.parse(start) + i * hour, open: 100, high: 101, low: 99, close: 100, confirmed: true
    }));
    assert.equal(context.build([], bars, { market: 'crypto', now: end }).previousDay.count, hours);
    assert.throws(() => context.build([], bars.slice(1), { market: 'crypto', now: end }), /مكتملة/);
  }
}

async function testCalendar() {
  const full = { source: 'Forex Factory', coverage: 'full', weekStart: '2026-11-23',
    updatedAt: iso(now - hour), events: [{ date: iso(now + hour), title: 'Scheduled release', country: 'USD' }] };
  const read = data => async url => {
    if (!url.startsWith('calendar-live.json')) throw Error('TEST_OUTAGE');
    return { ok: true, json: async () => data };
  };
  const feed = await economic.loadEvents(read(full));
  assert.equal(feed.feedsLoaded, 1);
  assert.equal(feed.failures.length, 2);
  assert.equal(economic.scheduleCovers(feed.parts, now), true);
  for (const invalid of [
    { ...full, updatedAt: iso(now - 25 * hour) },
    { ...full, coverage: 'partial' },
    { ...full, events: [{ ...full.events[0], date: '2026-11-25T14:30:00' }] },
    { ...full, events: [] }
  ]) {
    assert.equal(economic.scheduleCovers((await economic.loadEvents(read(invalid))).parts, now), false);
  }
  assert.equal(economic.scheduleCovers([{ file: 'economic-official.json', json: full }], now), false);
  assert.equal((await economic.loadEvents(read({ unexpected: 1 }))).feedsLoaded, 0);
  const rollover = Date.parse('2026-11-29T21:45:00Z');
  const previous = { ...full, updatedAt: iso(rollover - hour), events: [{ ...full.events[0], date: iso(rollover) }] };
  const next = { ...previous, weekStart: '2026-11-30', events: [{ ...full.events[0], date: iso(rollover + hour) }] };
  const parts = [{ file: 'calendar-live.json', json: previous }, { file: 'calendar-next.json', json: next }];
  assert.equal(economic.scheduleCovers(parts.slice(0, 1), rollover), false);
  assert.equal(economic.scheduleCovers(parts, rollover), true);
}

async function testOpportunities() {
  const bars = syntheticBars();
  const options = { now, market: 'crypto', symbol: 'BTCUSDT' };
  const { models } = monitorSignals.evaluate(bars, '15', options);
  const model = models.find(m => m.status === 'watching');
  assert.ok(model);
  assert.equal(model.formedAt, now);
  assert.ok(model.target < model.entry && model.entry < model.stop);
  assert.ok(model.sweepAt < model.mssAt && model.fvgAt < model.formedAt);
  const browser = { ICTStructureEngine: structure };
  vm.runInNewContext(await fs.readFile(path.join(__dirname, '../ict-signal-engine-702e.js'), 'utf8'), browser);
  assert.equal(JSON.stringify(browser.ICTSignalEngine.evaluate(bars, '15', options).models), JSON.stringify(models));
  const wick = { start: now, open: model.entry - 1, close: model.entry - 1,
    high: model.stop + 1, low: model.entry - 2, confirmed: true };
  assert.equal(monitorSignals.evaluate([...bars, wick], '15', options).models.find(m => m.id === model.id).status, 'watching');
  assert.equal(monitorSignals.evaluate([...bars, wick], '15', { ...options, now: now + interval })
    .models.find(m => m.id === model.id).status, 'invalidated');
  const inputs = {
    ...options, candles15: bars, structureEngine: structure, signalEngine: monitorSignals,
    contextEngine: { build: () => ({ priorWeek: null }) },
    scenarioEngine: { build: () => ({ qualified: true, scenarios: [{ direction: 'bear', score: 2, evidence: ['MSS', 'FVG'] }] }) },
    candles60: bars.map((b, i) => ({ ...b, start: now - (bars.length - i) * hour })),
    newsChecked: true, newsCovered: true
  };
  assert.equal(decision.inspect(inputs).opportunities[0].blocks.length, 0);
  assert.equal(decision.inspect(inputs).entryFreshUntil, now + interval);
  for (const [frame, higher] of [['60', '240'], ['240', 'D']]) {
    const tfMs = structure.FRAME_MS[frame], higherMs = structure.FRAME_MS[higher];
    const rescale = ms => {
      const close = Math.floor(now / ms) * ms;
      return bars.map((bar, i) => ({ ...bar, start: close - (bars.length - i) * ms }));
    };
    let scenarioFrame;
    const higherInput = {
      ...inputs, frame, candles15: rescale(tfMs), higherCandles: rescale(higherMs),
      scenarioEngine: { build(ctx, data, opts) {
        assert.equal(data.frame, higher);
        scenarioFrame = opts.frame;
        return inputs.scenarioEngine.build(ctx, data, opts);
      } }
    };
    const result = decision.inspect(higherInput);
    assert.equal(scenarioFrame, higher);
    assert.ok(result.opportunities.some(plan => plan.side === "SELL" && plan.blocks.length === 0));
    assert.equal(result.blocks.length, 0);
    assert.equal(result.entryFreshUntil, Math.floor(now / tfMs) * tfMs + tfMs);
    const stale = decision.inspect({ ...higherInput, candles15: higherInput.candles15.slice(0, -1) });
    assert.ok(stale.blocks.includes('شموع إطار الدخول قديمة أو مفقودة'));
  }
  const highImpact = [{ when: now + minute, currency: 'USD', title: 'Scheduled release' }];
  for (const override of [{ newsCovered: false }, { events: highImpact },
    { now: now + 3 * interval }]) {
    assert.ok(decision.inspect({ ...inputs, ...override }).opportunities[0].blocks.length > 0);
  }
  const latest = bars.at(-1);
  const response = { retCode: 0, time: now - 1, result: {
    symbol: 'BTCUSDT', list: [[latest.start, latest.open, latest.high, latest.low, latest.close, 1, 1]]
  }};
  assert.equal(bybit.parseHistory(response, 'BTCUSDT', '15', now)[0].confirmed, false);
  return bars;
}

async function testMonitor(bars) {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'ict-center-test-'));
  process.env.STORE_FILE = path.join(temp, 'state.json');
  process.env.MONITOR_TARGETS = 'crypto:BTCUSDT:15,spot:BTCUSDT:15';
  process.env.QUOTE_FEED_URL = 'https://quotes.example/quotes';
  const monitor = require('./server');
  const realNow = Date.now;
  const realFetch = global.fetch;
  const id = 'crypto:BTCUSDT:15';
  let time = now;
  let scenario = 'healthy';
  Date.now = () => time;
  global.fetch = async url => {
    if (String(url).includes('quotes.example')) {
      return { ok: true, text: async () => JSON.stringify([{ id, bid: 200, ask: 200.1, timestamp: iso(now), source: 'test' }]) };
    }
    if (String(url).includes('binance.vision') && scenario === 'spot-only') {
      return {ok:true,json:async()=>bars.map(b=>[b.start,b.open,b.high,b.low,b.close,1])};
    }
    if (String(url).includes('bybit.com') && scenario === 'spot-only') return {ok:false,status:451};
    if (!String(url).includes('bybit.com') || scenario === 'outage') return { ok: false, status: 503 };
    const rows = bars.map(b => [b.start - (scenario === 'stale' ? 6 * interval : 0),
      b.open, b.high, b.low, b.close, 1, 1]);
    return { ok: true, json: async () => ({ retCode: 0, result: { symbol: 'BTCUSDT', list: rows } }) };
  };
  try {
    await monitor.cycle();
    const fresh = monitor.snapshot();
    assert.equal(fresh.marketDataReady, true, fresh.targets[id].error);
    assert.equal(fresh.targets[id].executionQuoteGate, 'verified_research_quote');
    assert.ok(fresh.observations.some(o=>o.research.phase==='observed'));
    const first = fresh.observations[0];
    assert.equal(fresh.targets[id].patternCounts.valid, fresh.observations.length);
    time += minute;
    await monitor.cycle();
    const rescanned = monitor.snapshot().observations.find(o=>o.id===first.id);
    assert.equal(rescanned.detectedAt,first.detectedAt);
    assert.notEqual(rescanned.checkedAt,first.checkedAt);
    assert.equal(fresh.observations[0].newsGate.status, 'blocked');
    assert.equal(fresh.readyForExecution, false);
    time += minute;
    assert.equal(monitor.snapshot().targets[id].executionQuoteReason, 'QUOTE_STALE_OR_FUTURE');
    for (scenario of ['outage', 'stale']) {
      await monitor.cycle();
      assert.equal(monitor.snapshot().marketDataReady, false);
      assert.equal(monitor.snapshot().observations.length, 0);
      assert.match(monitor.snapshot().targets[id].error, scenario === 'outage' ? /503/ : /STALE_CANDLES/);
    }
    scenario = 'spot-only';
    await monitor.cycle();
    const separate = monitor.snapshot();
    assert.equal(separate.targets[id].status,'blocked');
    assert.match(separate.targets[id].error,/451/);
    assert.equal(separate.targets['spot:BTCUSDT:15'].marketType,'SPOT_RESEARCH');
    assert.equal(separate.targets['spot:BTCUSDT:15'].status,'research_data_valid');
    assert.ok(separate.observations.length>0 && separate.observations.every(o=>o.market==='spot'));
  } finally {
    Date.now = realNow;
    global.fetch = realFetch;
    await fs.rm(temp, { recursive: true });
  }
}

(async () => {
  testSessions();
  await testCalendar();
  await testModelTypes();
  await testMonitor(await testOpportunities());
  console.log('Center safety: DST, calendar coverage, real ICT engine, invalidation, outage, stale candles and quote expiry PASS');
})().catch(error => { console.error(error); process.exitCode = 1; });
