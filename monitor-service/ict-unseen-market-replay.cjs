'use strict';

// Compare entry frames and FVG timing using snapshots available at the decision time.
const {execFileSync} = require('node:child_process');
const rules = require('../ict-decision-engine-708a.js');
const structure = require('../ict-structure-engine-702d.js');
const signals = require('./ict_phase2e/ict-signal-engine-702e.js');
const lifecycle = require('../ict-opportunity-lifecycle-708b.js');
const context = require('../ict-context-engine-703a.js');
const scenario = require('../ict-scenario-engine-703b.js');
const calendar = require('../ict-economic-link-706a.js');

const START = Date.parse('2026-11-18T14:00:00Z');
const END = Date.parse('2026-11-26T12:00:00Z');
const HOUR = 3600000;
const DAY = 24 * HOUR;
const DEFAULT_WINDOW = {start: START, split: Date.parse('2026-11-23T00:00:00Z'), end: END};
const FRAMES = [['5', '5min'], ['15', '15min'], ['60', '1h'], ['240', '4h']];
const PROVIDER_INTERVALS = new Map([...FRAMES, ['D', '1day']]);
const MARKETS = [['XAU/USD', 'metals'], ...[
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'EUR/JPY', 'GBP/JPY', 'EUR/GBP', 'AUD/JPY'
].map(symbol => [symbol, 'forex'])];
const alternatives = [
  ['early', -1, {allowEarlyFvgForResearch: true}],
  ['late', 2, {allowDelayedFvgForResearch: true}]
];
const groups = () => ({selection:{baseline:[],early:[],late:[],continuation:[]}, validation:{baseline:[],early:[],late:[],continuation:[]}});
const COSTS = [0.05, 0.1, 0.2];

function readWindow(start, split, end, now = Date.now()) {
  if (!start && !split && !end) return DEFAULT_WINDOW;
  const times = [start, split, end].map(value => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw Error('Use UTC dates YYYY-MM-DD');
    const time = Date.parse(value + 'T00:00:00Z');
    if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== value) throw Error('Invalid UTC date');
    return time;
  });
  const [first, boundary, last] = times;
  if (boundary - first < 2 * DAY || last - boundary < 2 * DAY || last > now || last - first > 56 * DAY) {
    throw Error('Use two completed chronological periods of at least two days, up to 56 days total');
  }
  return {start: first, split: boundary, end: last};
}

function priceWindows(interval, window) {
  const warmup = interval === '1day' || interval === '4h' ? 80 : 14;
  const span = (interval === '5min' ? 14 : interval === '15min' ? 40 : 140) * DAY;
  const ranges = [];
  for (let from = Math.floor(window.start / DAY) * DAY - warmup * DAY; from < window.end; from += span) {
    ranges.push({from, to: Math.min(from + span, window.end)});
  }
  return ranges;
}

const iso = time => new Date(time).toISOString();
const providerTime = time => iso(time).slice(0, 19).replace('T', ' ');

function archive(window = DEFAULT_WINDOW) {
  const files = ['calendar-live.json', 'calendar-next.json'];
  return files.flatMap(file => {
    const log = execFileSync('git', ['log', '--diff-filter=AM', '--format=%H %ct', '--since=' + iso(window.start - DAY),
      '--until=' + iso(window.end), 'HEAD', '--', file], {encoding: 'utf8'}).trim();
    return log.split('\n').filter(Boolean).map(line => {
      const [sha, time] = line.split(' ');
      const json = JSON.parse(execFileSync('git', ['show', sha + ':' + file], {encoding: 'utf8'}));
      return {file, feed: json.source, json, availableAt: Number(time) * 1000};
    });
  });
}

function newsAt(archives, now) {
  const latest = new Map();
  for (const snapshot of archives) {
    if (snapshot.availableAt > now || Date.parse(snapshot.json.updatedAt) > now) continue;
    const prior = latest.get(snapshot.file);
    if (!prior || prior.availableAt < snapshot.availableAt) latest.set(snapshot.file, snapshot);
  }
  const parts = [...latest.values()];
  return {events: calendar.collect(parts), covered: calendar.scheduleCovers(parts, now)};
}

async function prices(symbol, interval, key, range) {
  const query = new URLSearchParams({symbol, interval, timezone: 'UTC', outputsize: '5000',
    start_date: providerTime(range.from), end_date: providerTime(range.to - 1000), apikey: key});
  let response;
  try {
    response = await fetch('https://api.twelvedata.com/time_series?' + query,
      {signal: AbortSignal.timeout(15000)});
  } catch {
    return {failure: 'transport'};
  }
  if (!response.ok) return {failure: 'HTTP ' + response.status};
  const payload = await response.json().catch(() => null);
  if (!Array.isArray(payload?.values)) return {failure: 'provider ' + (Number(payload?.code) || 'no rows')};
  if (payload.meta?.symbol?.replace('/', '') !== symbol.replace('/', '') || payload.meta?.interval !== interval) {
    return {failure: 'identity mismatch'};
  }
  const frame = [...PROVIDER_INTERVALS].find(([, value]) => value === interval)[0];
  const ms = structure.FRAME_MS[frame];
  const normalized = structure.normalize(payload.values.map(row => ({
    start: Date.parse(String(row.datetime).replace(' ', 'T') + 'Z'),
    open: Number(row.open), high: Number(row.high), low: Number(row.low), close: Number(row.close),
    confirmed: true
  })), frame, range.to);
  if (normalized.rejected || normalized.duplicates) return {failure: 'invalid or duplicate rows'};
  return {bars: normalized.rows.filter(bar => bar.start >= range.from && bar.start + ms <= range.to).map(bar => ({...bar, confirmed: true}))};
}

function summarize(outcomes) {
  const settled = outcomes.filter(row => Number.isFinite(row.outcomeR));
  const targets = settled.filter(row => row.state === 'won').length;
  const returns = settled.map(row => row.outcomeR - 0.1);
  return {
    opportunities: outcomes.length,
    targets,
    stops: settled.length - targets,
    targetRate: settled.length ? Number((100 * targets / settled.length).toFixed(1)) : null,
    unresolved: outcomes.length - settled.length,
    withoutLargestAt0_1R: Number((returns.reduce((sum, value) => sum + value, 0) - Math.max(0, ...returns)).toFixed(2)),
    touched: outcomes.filter(row => row.activationAt != null).length,
    ambiguous: outcomes.filter(row => row.state === 'ambiguous').length,
    netR: Object.fromEntries(COSTS.map(cost => [
      cost, Number(settled.reduce((sum, row) => sum + row.outcomeR - cost, 0).toFixed(2))
    ]))
  };
}

function rejection(model, range, bars, structures, displayed) {
  if (!range) return 'displacement or FVG timing';
  if (model.direction === 'bull' ? model.entry >= range.midpoint : model.entry <= range.midpoint) {
    return 'premium or discount';
  }
  const plan = rules.liquidityPlan(model, bars, structures, range);
  if (!plan) return 'no eligible liquidity target at 2R';
  if (!displayed) return 'invalid plan geometry';
  if (displayed.blocks.length) return displayed.blocks[0];
  if (displayed.interveningLiquidity) return 'intervening liquidity below 2R';
  if (displayed.research?.phase !== 'observed') return 'not a new entry';
  return null;
}

function contextAt(hourly, higher, frame, now) {
  const higherFrame = rules.contextFrame(frame);
  const higherMs = structure.FRAME_MS[higherFrame];
  return {
    candles60: hourly.filter(bar => bar.start + HOUR <= now).slice(-1000),
    higherCandles: higher.filter(bar => bar.start + higherMs <= now).slice(-120)
  };
}

function replay(archives, symbol, market, bars, hourly, frame, higherBars = hourly, window = DEFAULT_WINDOW) {
  const ms = structure.FRAME_MS[frame];
  const horizon = 24 * HOUR;
  const maxBars = horizon / ms;
  const periods = groups(), reasons = {}, modelReasons = {}, displacementFailures = {};
  const addReason = reason => { reasons[reason] = (reasons[reason] || 0) + 1; };
  for (let n = 30; n <= bars.length; n++) {
    const now = bars[n - 1].start + ms;
    if (now < window.start || now >= window.end || (now < window.split && now + horizon > window.split)) continue;
    const prefix = bars.slice(Math.max(0, n - 250), n);
    const raw = signals.evaluate(prefix, frame, {market, symbol, now});
    const formed = raw.models.filter(model => model.formedAt === now && model.status === 'watching' && model.research);
    const segment = structure.normalize(prefix, frame, now).segments.at(-1) || [];
    const index = new Map(segment.map((bar, i) => [bar.start, i]));
    const continuation = raw.analysis.eligible && rules.continuationCandidates(segment, index, raw.analysis, ms, market, symbol, frame)
      .some(plan => plan.formedAt === now && plan.status === 'watching');
    if (!formed.length && !continuation) continue;
    const news = newsAt(archives, now);
    if (!news.covered) { addReason('calendar unavailable'); continue; }
    if (rules.nearNews(news.events, market, symbol, now).length) { addReason('near scheduled news'); continue; }
    const higherFrame = rules.contextFrame(frame);
    const histories = contextAt(hourly, higherBars, frame, now);
    let inspected;
    const input = {market, symbol, frame, now, candles15: prefix, ...histories,
      includeContinuationForResearch: continuation, newsChecked: true, newsCovered: true, events: news.events, structureEngine: structure,
      signalEngine: signals, contextEngine: context, scenarioEngine: scenario};
    try {
      inspected = rules.inspect(input);
    } catch (error) {
      if (!/جلسة يوم نيويورك|شموع ساعة مكتملة|بيانات غير كافية/.test(error.message)) throw error;
      addReason('hourly session unavailable');
      continue;
    }
    const qualified = inspected.opportunities.filter(plan => plan.modelType !== 'bos-fvg' && plan.formedAt === now && rules.qualifiesFocused(plan));
    const usedZones = new Set(qualified.map(plan => plan.direction + ':' + plan.modelEvidence[2]));
    const independentlyQualified = inspected.opportunities.filter(plan => plan.modelType === 'bos-fvg' &&
      plan.formedAt === now && rules.qualifiesFocused(plan) && !usedZones.has(plan.direction + ':' + plan.modelEvidence[2]));
    if (formed.length && !qualified.length) {
      addReason('entry qualification');
      const higher = structure.analyze(higherFrame === '60' ? histories.candles60 : histories.higherCandles, higherFrame, {now, pivot: 2});
      const structures = [{pivots: raw.analysis.pivots, ms: ms, frame},
        {pivots: higher.pivots, ms: structure.FRAME_MS[higherFrame], frame: higherFrame}];
      for (const model of formed) {
        const range = rules.displacementRange(model, segment, index, raw.analysis.events);
        if (!range) {
          const strong = Boolean(rules.displacementLeg(model, segment, index, raw.analysis.events));
          const lag = index.get(model.fvgAt) - index.get(model.mssAt);
          const key = 'strong=' + strong + '; lag=' + lag;
          displacementFailures[key] = (displacementFailures[key] || 0) + 1;
        }
        const displayed = inspected.opportunities.find(plan => plan.id === model.id);
        const reason = rejection(model, range, segment, structures, displayed) || 'diagnostic mismatch';
        modelReasons[reason] = (modelReasons[reason] || 0) + 1;
      }
    }
    const period = now < window.split ? periods.selection : periods.validation;
    const positions = [['baseline', qualified], ['continuation', independentlyQualified]];
    for (const [name, lag, options] of alternatives) {
      if (!formed.some(model => model.fvgAt - model.mssAt === lag * ms)) continue;
      const additional = rules.inspect({...input, ...options}).opportunities.filter(plan =>
        plan.modelType !== 'bos-fvg' && plan.formedAt === now && rules.qualifiesFocused(plan) &&
        plan.modelEvidence[2] - plan.modelEvidence[1] === lag * ms);
      positions.push([name, additional]);
    }
    for (const [name, plans] of positions) {
      for (const plan of plans) {
        const record = lifecycle.create({...plan, frame}, now, {researchOnly: true, maxBars});
        period[name].push(lifecycle.advance(record, bars.slice(n, n + maxBars), Math.min(window.end, now + horizon)));
      }
    }
  }
  return {periods, reasons, modelReasons, displacementFailures};
}

function summarizePeriod({baseline, early, late, continuation}) {
  return {
    baseline: summarize(baseline),
    continuation: summarize(continuation),
    withContinuation: summarize([...baseline, ...continuation]),
    earlyAdditional: summarize(early),
    lateAdditional: summarize(late),
    withEarly: summarize([...baseline, ...early]),
    withLate: summarize([...baseline, ...late])
  };
}

async function main() {
  const key = process.env.TWELVEDATA_API_KEY;
  const window = readWindow(process.env.ICT_REPLAY_START, process.env.ICT_REPLAY_SPLIT, process.env.ICT_REPLAY_END);
  const archives = archive(window);
  console.log('Calendar snapshots:', archives.length, 'from commit history');
  let coveredHours = 0;
  for (let now = window.start; now < window.end; now += HOUR) if (newsAt(archives, now).covered) coveredHours++;
  console.log('Calendar-covered hours:', coveredHours, '/', Math.ceil((window.end-window.start)/HOUR));
  if (!coveredHours) { console.log('Replay skipped: no point-in-time calendar coverage'); return; }
  if (!key) { console.log('Holdout prices unavailable without the licensed environment'); return; }
  const combined = Object.fromEntries(FRAMES.map(([frame]) => [frame, groups()]));
  console.log('Research split:', iso(window.split));
  let requests = 0;
  for (const [symbol, market] of MARKETS) {
    const marketPrices = new Map();
    for (const interval of PROVIDER_INTERVALS.values()) {
      const bars = [];
      for (const range of priceWindows(interval, window)) {
        if (requests++) await new Promise(resolve => setTimeout(resolve, 12000));
        const result = await prices(symbol, interval, key, range);
        if (result.failure) {
          if (/\b(?:429|401|403)\b/.test(result.failure)) throw Error('Licensed provider: ' + result.failure);
          marketPrices.set(interval, result);
          break;
        }
        bars.push(...result.bars);
      }
      if (!marketPrices.has(interval)) marketPrices.set(interval, {bars});
    }
    const hourly = marketPrices.get('1h');
    for (const [frame, interval] of FRAMES) {
      const entry = marketPrices.get(interval);
      const higher = marketPrices.get(PROVIDER_INTERVALS.get(rules.contextFrame(frame)));
      if (!entry.bars?.length || !hourly.bars?.length || !higher.bars?.length) {
        console.log('Holdout', symbol, frame, 'unavailable:', entry.failure || hourly.failure || higher.failure || 'empty');
        continue;
      }
      const result = replay(archives, symbol.replace('/', ''), market, entry.bars, hourly.bars, frame, higher.bars, window);
      for (const [period, buckets] of Object.entries(result.periods)) {
        for (const [name, outcomes] of Object.entries(buckets)) combined[frame][period][name].push(...outcomes);
      }
      console.log('Holdout', symbol, frame, JSON.stringify({entryBars: entry.bars.length,
        hourlyBars: hourly.bars.length, higherBars: higher.bars.length, gateCounts: result.reasons, firstModelRejection: result.modelReasons}));
    }
  }
  for (const [frame, periods] of Object.entries(combined)) {
    for (const [period, buckets] of Object.entries(periods)) {
      console.log('Holdout overall', frame, period + ':', JSON.stringify(summarizePeriod(buckets)));
    }
  }
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = {newsAt, summarize, rejection, replay, contextAt, readWindow, priceWindows};
