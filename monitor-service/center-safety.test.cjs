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
    for(const direction of ['bull','bear']){
      const raw=[
        {open:100,close:105,high:106,low:99},
        {open:101,close:98,high:103,low:95},
        {open:100,close:108,high:109,low:99},
        {open:108,close:107,high:109,low:105}
      ];
      const series=raw.map((b,i)=>direction==='bull'?{...b,start:now+i*minute}:
        {open:200-b.open,close:200-b.close,high:200-b.low,low:200-b.high,start:now+i*minute});
      const pivot={type:direction==='bull'?'swing-high':'swing-low',start:now,confirmedAt:now};
      const positions=new Map(series.map((b,i)=>[b.start,i]));
      const candidate={direction,sweepAt:series[1].start,mssAt:series[2].start};
      const evidence=extra.breakerEvidence(candidate,series,positions,[pivot]);
      assert.equal(evidence.retestAt,series[3].start);
      assert.equal(extra.breakerEvidence(candidate,series.slice(0,3),positions,[pivot]),null);
      assert.equal(extra.breakerEvidence(candidate,series,positions,[{...pivot,confirmedAt:candidate.mssAt}]),null);
      const invalid={...series[3],low:90,high:110,start:now+4*minute};
      assert.equal(extra.breakerEvidence(candidate,[...series,invalid],positions,[pivot]),null);
    }

  });
}

function testDisplacementRange() {
  const bars = Array.from({length: 16}, (_, start) => ({start, open: 100, close: 101, low: 99, high: 102}));
  bars[12] = {...bars[12], low: 95};
  bars[13] = {start: 13, open: 101, close: 108, low: 100, high: 109};
  bars[14] = {start: 14, open: 110, close: 111, low: 110, high: 112};
  bars[15] = {...bars[15], high: 130};
  const index = new Map(bars.map((bar, idx) => [bar.start, idx]));
  const model = {direction: 'bull', sweepAt: 12, mssAt: 13, fvgAt: 14};
  const events = [{type: 'MSS', at: 13, direction: 'bull', level: 103}];
  const evidence = decision.displacementRange(model, bars, index, events);
  assert.deepEqual(evidence, {low: 95, high: 109, midpoint: 102, displacementAt: 13});
  const early = {...model, sweepAt: 11, fvgAt: 12};
  const earlyBars = bars.map(bar => bar.start === 11 ? {...bar, low: 95} : bar);
  assert.equal(decision.displacementRange(early, earlyBars, index, events), null);
  assert.deepEqual(decision.displacementRange(early, earlyBars, index, events, 1, -1), evidence);
  assert.equal(decision.displacementRange({...early, fvgAt: 11}, earlyBars, index, events, 1, -1), null);
  assert.equal(decision.displacementRange(early, earlyBars, index, [], 1, -1), null);
  const delayed = {...model, fvgAt: 15};
  assert.equal(decision.displacementRange(delayed, bars, index, events), null);
  assert.deepEqual(decision.displacementRange(delayed, bars, index, events, 2), evidence);
  const weak = bars.map(bar => bar.start === 13 ? {...bar, open: 107} : bar);
  assert.equal(decision.displacementRange(model, weak, index, events), null);
  assert.equal(decision.displacementRange(delayed, weak, index, events, 2), null);
  assert.equal(decision.displacementRange(model, bars, index, [{...events[0], level: 108}]), null);
}
function testLiquidityPlan() {
  const bars = [
    { start: 0, low: 90, high: 132 },
    { start: 1, low: 91, high: 122 },
    { start: 2, low: 90, high: 114 },
    { start: 3, low: 99, high: 120 }
  ];
  const model = { direction: 'bull', sweepAt: 2, formedAt: 4, entry: 100, stop: 90 };
  const pivots = [
    { type: 'swing-high', start: 0, confirmedAt: 1, level: 132 },
    { type: 'swing-high', start: 1, confirmedAt: 2, level: 122 },
    { type: 'swing-high', start: 2, confirmedAt: 3, level: 114 },
    { type: 'swing-high', start: 3, confirmedAt: 4, level: 120 }
  ];
  const plan = (entry, candles, levels) =>
    decision.liquidityPlan(entry, candles, [{ pivots: levels, ms: 1, frame: '5' }], {midpoint:125-(entry.direction==='bull'?20:-20)});
  const clear = plan(model, bars, pivots);
  assert.equal(clear.target, 122, 'nearest confirmed untouched liquidity above 2R');
  assert.equal(clear.interveningLiquidity, null);
  const obstacle = {type: 'swing-high', start: 2, confirmedAt: 3, level: 121};
  const crowded = plan({...model, stop: 89}, bars, [...pivots, obstacle]);
  assert.equal(crowded.target, 122);
  assert.equal(crowded.interveningLiquidity.level, 121);
  const observed = {research: {phase: 'observed'}, blocks: []};
  assert.equal(decision.qualifiesFocused({...clear, ...observed}), true);
  assert.equal(decision.qualifiesFocused({...crowded, ...observed}), false);
  assert.equal(decision.qualifiesFocused({...clear, ...observed, blocks: ['stale candles']}), false);
  assert.equal(decision.qualifiesFocused({...clear, ...observed, research: {phase: 'confirmed_research'}}), false);
  assert.equal(plan({ ...model, entry: 105 }, bars, pivots), null, 'equilibrium does not qualify');
  assert.equal(plan(model, bars, pivots.slice(-2)), null, 'further confirmation and insufficient reward cannot supply a target');
  const later = plan(model, [...bars, {start: 4, low: 111, high: 122}], pivots);
  assert.equal(later.target, 122, 'the target does not move after it is reached');
  assert.equal(later.targetTouched, true);
  const short = plan({ ...model, direction: 'bear', entry: 150, stop: 160 },
    bars.map(bar => ({ ...bar, high: 250-bar.low, low: 250-bar.high })),
    pivots.map(pivot => ({ ...pivot, type: 'swing-low', level: 250-pivot.level })));
  assert.equal(short.target, 128);
}
function testTurtleSoup() {
  const bars = [
    {start: 0, low: 90, high: 110},
    {start: 1, low: 101, high: 114}
  ];
  const sweep = {type: 'SWEEP', direction: 'bull', at: 0, level: 100};
  const shift = {type: 'MSS', direction: 'bull', at: 1};
  const detect = (rows, events) => decision.turtleSoup(rows, new Map(rows.map((bar,i)=>[bar.start,i])), events, 1, 'forex','EURUSD','15');
  assert.deepEqual(detect(bars.slice(0,1), [sweep]), []);
  const [plan] = detect(bars, [sweep,shift]);
  assert.equal(plan.formedAt, 2);
  assert.equal(plan.entry, 100);
  assert.equal(plan.stop, 90);
  assert.equal(plan.status, 'watching');
  assert.equal(detect([...bars,{start:2,low:99,high:111}], [sweep,shift])[0].status, 'retested');
  assert.deepEqual(detect([bars[0],{...bars[1],low:89}], [sweep,shift]), []);
}
function testInversionFvg() {
  const zone = {at: 2, low: 100, high: 105, direction: 'bear'};
  const events = [{type: 'MSS', at: 3, direction: 'bull'}];
  const bars = [
    {start: 0, low: 105, high: 120},
    {start: 1, low: 98, high: 114},
    {start: 2, low: 96, high: 100},
    {start: 3, low: 98, high: 110, close: 108}
  ];
  const detect = (rows, shifts=events) => decision.inversionFvg(rows,
   new Map(rows.map((bar,i)=>[bar.start,i])), {events:shifts,zones:[zone]}, 1, 'forex','EURUSD','15');
  assert.deepEqual(detect(bars.slice(0,3)), []);
  assert.deepEqual(detect(bars, []), []);
  assert.deepEqual(detect([...bars.slice(0,3),{...bars[3],close:105}]), []);
  const [plan] = detect(bars);
  assert.equal(plan.entry, 102.5);
  assert.equal(plan.stop, 100);
  assert.equal(plan.formedAt, 4);
  assert.equal(plan.status, 'watching');
  assert.equal(detect([...bars,{start:4,low:104,high:110}])[0].status, 'retested');
  assert.deepEqual(detect([...bars,{start:4,low:106,high:113,close:112}],
    [{type:'MSS',at:4,direction:'bull'}]), [], 'the first close is the only inversion');
}
function testContinuationCandidates() {
  const bars = Array.from({length: 14}, (_, start) => ({start, open: 101, close: 102, low: 100, high: 103}));
  bars[3].low = 90;
  bars[12] = {start: 12, open: 102, close: 112, low: 101, high: 114};
  bars[13] = {start: 13, open: 112, close: 114, low: 106, high: 115};
  const analysis = {
    events: [{type: 'BOS', direction: 'bull', at: 12, level: 109}],
    zones: [{type: 'FVG', direction: 'bull', at: 13, low: 103, high: 106}],
    pivots: [{type: 'swing-low', start: 3, confirmedAt: 5, level: 90}]
  };
  const detect = (rows, a = analysis) => decision.continuationCandidates(rows,
    new Map(rows.map((bar,i)=>[bar.start,i])), a, 1, 'forex', 'EURUSD', '15');
  assert.deepEqual(detect(bars.slice(0,13)), []);
  const [plan] = detect(bars);
  assert.equal(plan.entry, 104.5);
  assert.equal(plan.stop, 90);
  assert.equal(plan.formedAt, 14);
  assert.equal(detect([...bars,{start:14,low:105}])[0].status,'retested');
  assert.deepEqual(detect(bars,{...analysis,events:[{...analysis.events[0],note:'initial break'}]}),[]);
  assert.deepEqual(detect(bars,{...analysis,pivots:[{...analysis.pivots[0],confirmedAt:12}]}),[]);
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
  const scopedBars = bars.map((bar, i) => i === 4 ? { ...bar, low: model.target - 20 } : i === bars.length - 1 ? { ...bar, low: 187 } : bar);
  inputs.candles15 = scopedBars;
  const plan = decision.inspect(inputs).opportunities.find(item => item.id === model.id);
  assert.ok(plan, 'a completed model is visible before any subsequent correction');
  assert.equal(plan.blocks.length, 0);
  assert.equal(plan.entry, (model.zone.low + model.zone.high) / 2);
  assert.equal(plan.stop, model.stop);
  assert.ok(plan.rr >= 2);
  assert.ok(plan.entry > plan.midpoint);
  assert.equal(plan.liquidity.type, 'swing-low');
  assert.equal(plan.target, scopedBars[4].low);
  assert.equal(decision.inspect(inputs).entryFreshUntil, now + interval);
  for (const [frame, higher] of [['60', '240'], ['240', 'D']]) {
    const tfMs = structure.FRAME_MS[frame], higherMs = structure.FRAME_MS[higher];
    const rescale = ms => {
      const close = Math.floor(now / ms) * ms;
      return scopedBars.map((bar, i) => ({ ...bar, start: close - (bars.length - i) * ms }));
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
    assert.ok(decision.inspect({ ...inputs, ...override }).opportunities.find(item => item.id === model.id).blocks.length > 0);
  }
  vm.runInNewContext(await fs.readFile(path.join(__dirname, '../ict-advanced-validation-704c4.js'), 'utf8'), browser);
  const displayInputs = {
    ...inputs, candles15: bars, candles60: [], contextEngine: context, newsCovered: false,
    signalEngine: browser.ICTSignalEngine, advancedEngine: browser.ICTAdvancedValidation4C4,
    displayCompleteModels: true, includeTurtleSoup: true, includeIfvg: true
  };
  const display = decision.inspect(displayInputs);
  assert.equal(display.context, null, 'missing context cannot abort a scan of usable entry candles');
  const shown = display.opportunities.find(item => item.id === model.id);
  assert.ok(shown, 'a composite remains visible without stricter filters and without complete calendar coverage');
  assert.ok(shown.rr === null || shown.rr < 2, 'display does not require a 2R target');
  assert.equal(decision.qualifiesFocused(shown), false);
  assert.ok(display.opportunities.some(item => item.modelType === 'ote' && item.entry > item.zone.low && item.entry < item.zone.high));
  const withOpenCandle = decision.inspect({...displayInputs, candles15: [...bars, wick]});
  assert.equal(withOpenCandle.opportunities.find(item => item.id === model.id).research.phase, 'observed');
  const afterInvalidation = decision.inspect({...displayInputs, candles15: [...bars, wick], now: now + interval});
  assert.equal(afterInvalidation.opportunities.find(item => item.id === model.id).research.phase, 'invalidated');
  assert.equal(decision.inspect({...displayInputs, candles15: []}).opportunities.length, 0);
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
  process.env.MONITOR_TARGETS = 'crypto:BTCUSDT:15';
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
    if (String(url).includes('bybit.com') && scenario === 'provider-denied') return {ok:false,status:451};
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
    scenario = 'provider-denied';
    await monitor.cycle();
    const separate = monitor.snapshot();
    assert.equal(separate.targets[id].status,'blocked');
    assert.match(separate.targets[id].error,/451/);
    assert.deepEqual(separate.observations,[]);
    assert.throws(()=>monitor.parseTargets('spot:BTCUSDT:15'),/UNSUPPORTED_MARKET/);
  } finally {
    Date.now = realNow;
    global.fetch = realFetch;
    await fs.rm(temp, { recursive: true });
  }
}

function testProviderWeek(){
  const monday=Date.parse('2026-11-16T00:00:00Z'),day=86400000;
  const bars=Array.from({length:11},(_,i)=>({start:monday+i*day,open:100,close:101,
    high:102+i,low:99-i,confirmed:true}));
  const at=Date.parse('2026-11-26T15:00:00Z');
  const equity=[...bars.slice(0,5),...bars.slice(7)];
  assert.deepEqual([context.priorProviderWeek(equity,at).high,context.priorProviderWeek(equity,at).low],[106,95]);
  assert.equal(context.priorProviderWeek(equity.slice(1),at),null);
  assert.equal(context.priorProviderWeek(equity.map((bar,i)=>i===4?{...bar,confirmed:false}:bar),at),null);
  assert.equal(context.priorProviderWeek(equity,at,true),null);
  assert.equal(context.priorProviderWeek(bars,at,true).high,108);
  assert.equal(context.priorProviderWeek(equity,Date.parse('2026-11-23T02:00:00Z')),null,'New York Sunday has not rolled into Monday');
}

(async () => {
  testSessions();
  testProviderWeek();
  testContinuationCandidates();
  testTurtleSoup();
  testInversionFvg();
  testLiquidityPlan();
  testDisplacementRange();
  await testCalendar();
  await testModelTypes();
  await testMonitor(await testOpportunities());
  console.log('Center safety: DST, calendar coverage, real ICT engine, invalidation, outage, stale candles and quote expiry PASS');
})().catch(error => { console.error(error); process.exitCode = 1; });
