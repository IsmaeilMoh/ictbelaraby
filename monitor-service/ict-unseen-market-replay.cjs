'use strict';

// Holdout markets omitted from the earlier session/timeframe experiment.
const {execFileSync} = require('node:child_process');
const rules = require('../ict-decision-engine-708a.js');
const structure = require('../ict-structure-engine-702d.js');
const signals = require('./ict_phase2e/ict-signal-engine-702e.js');
const lifecycle = require('../ict-opportunity-lifecycle-708b.js');
const context = require('../ict-context-engine-703a.js');
const scenario = require('../ict-scenario-engine-703b.js');
const calendar = require('../ict-economic-link-706a.js');

const START = Date.parse('2026-11-19T00:00:00Z');
const END = Date.parse('2026-11-26T00:00:00Z');
const MS = 900000;
const HOUR = 3600000;
const MARKETS = [['XAU/USD', 'metals'], ...[
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'EUR/JPY', 'GBP/JPY', 'EUR/GBP', 'AUD/JPY'
].map(symbol => [symbol, 'forex'])];
const SPLIT = Date.parse('2026-11-23T00:00:00Z');
const alternatives = [
  ['early', -1, {allowEarlyFvgForResearch: true}],
  ['late', 2, {allowDelayedFvgForResearch: true}]
];
const groups = () => ({selection:{baseline:[],early:[],late:[]}, validation:{baseline:[],early:[],late:[]}});
const COSTS = [0.05, 0.1, 0.2];

function archive() {
  const files = ['calendar-live.json', 'calendar-next.json'];
  return files.flatMap(file => {
    const log = execFileSync('git', ['log', '--diff-filter=AM', '--format=%H %ct', '--since=2026-11-17T00:00:00Z',
      '--until=2026-11-27T00:00:00Z', 'HEAD', '--', file], {encoding: 'utf8'}).trim();
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

async function prices(symbol, interval, key) {
  const query = new URLSearchParams({symbol, interval, timezone: 'UTC', outputsize: '2500',
    start_date: '2026-11-08 00:00:00', end_date: '2026-11-26 00:00:00', apikey: key});
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
  const ms = interval === '1h' ? HOUR : MS;
  const normalized = structure.normalize(payload.values.map(row => ({
    start: Date.parse(String(row.datetime).replace(' ', 'T') + 'Z'),
    open: Number(row.open), high: Number(row.high), low: Number(row.low), close: Number(row.close),
    confirmed: true
  })), interval === '1h' ? '60' : '15', END);
  if (normalized.rejected || normalized.duplicates) return {failure: 'invalid or duplicate rows'};
  return {bars: normalized.rows.filter(bar => bar.start + ms <= END).map(bar => ({...bar, confirmed: true}))};
}

function summarize(outcomes) {
  const settled = outcomes.filter(row => Number.isFinite(row.outcomeR));
  return {
    opportunities: outcomes.length,
    targets: settled.filter(row => row.state === 'won').length,
    stops: settled.filter(row => row.state === 'lost').length,
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

function replay(archives, symbol, market, bars, hourly) {
  const periods = groups(), reasons = {}, modelReasons = {}, displacementFailures = {};
  const addReason = reason => { reasons[reason] = (reasons[reason] || 0) + 1; };
  for (let n = 30; n <= bars.length; n++) {
    const now = bars[n - 1].start + MS;
    if (now < START || now >= END || (now < SPLIT && now + 24 * MS > SPLIT)) continue;
    const prefix = bars.slice(Math.max(0, n - 250), n);
    const raw = signals.evaluate(prefix, '15', {market, symbol, now});
    const formed = raw.models.filter(model => model.formedAt === now && model.status === 'watching' && model.research);
    if (!formed.length) continue;
    const news = newsAt(archives, now);
    if (!news.covered) { addReason('calendar unavailable'); continue; }
    if (rules.nearNews(news.events, market, symbol, now).length) { addReason('near scheduled news'); continue; }
    const hourlyPrefix = hourly.filter(bar => bar.start + HOUR <= now).slice(-1000);
    let inspected;
    const input = {market, symbol, frame: '15', now, candles15: prefix, candles60: hourlyPrefix,
      newsChecked: true, newsCovered: true, events: news.events, structureEngine: structure,
      signalEngine: signals, contextEngine: context, scenarioEngine: scenario};
    try {
      inspected = rules.inspect(input);
    } catch (error) {
      if (!/جلسة يوم نيويورك|شموع ساعة مكتملة|بيانات غير كافية/.test(error.message)) throw error;
      addReason('hourly session unavailable');
      continue;
    }
    const qualified = inspected.opportunities.filter(plan => plan.formedAt === now && rules.qualifiesFocused(plan));
    if (!qualified.length) {
      addReason('entry qualification');
      const segment = structure.normalize(prefix, '15', now).segments.at(-1) || [];
      const index = new Map(segment.map((bar, i) => [bar.start, i]));
      const higher = structure.analyze(hourlyPrefix, '60', {now, pivot: 2});
      const structures = [{pivots: raw.analysis.pivots, ms: MS, frame: '15'},
        {pivots: higher.pivots, ms: HOUR, frame: '60'}];
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
    const period = now < SPLIT ? periods.selection : periods.validation;
    const positions = [['baseline', qualified]];
    for (const [name, lag, options] of alternatives) {
      if (!formed.some(model => model.fvgAt - model.mssAt === lag * MS)) continue;
      const additional = rules.inspect({...input, ...options}).opportunities.filter(plan =>
        plan.formedAt === now && rules.qualifiesFocused(plan) &&
        plan.modelEvidence[2] - plan.modelEvidence[1] === lag * MS);
      positions.push([name, additional]);
    }
    for (const [name, plans] of positions) {
      for (const plan of plans) {
        const record = lifecycle.create({...plan, frame: '15'}, now, {researchOnly: true});
        period[name].push(lifecycle.advance(record, bars.slice(n, n + 24), Math.min(END, now + 24 * MS)));
      }
    }
  }
  return {periods, reasons, modelReasons, displacementFailures};
}

function summarizePeriod({baseline, early, late}) {
  return {
    baseline: summarize(baseline),
    earlyAdditional: summarize(early),
    lateAdditional: summarize(late),
    withEarly: summarize([...baseline, ...early]),
    withLate: summarize([...baseline, ...late])
  };
}

async function main() {
  const key = process.env.TWELVEDATA_API_KEY;
  const archives = archive();
  console.log('Calendar snapshots:', archives.length, 'from commit history');
  if (!key) { console.log('Holdout prices unavailable without the licensed environment'); return; }
  const combined = groups();
  console.log('Research split:', new Date(SPLIT).toISOString());
  let requests = 0;
  for (const [symbol, market] of MARKETS) {
    const marketPrices = [];
    for (const interval of ['15min', '1h']) {
      if (requests++) await new Promise(resolve => setTimeout(resolve, 12000));
      marketPrices.push(await prices(symbol, interval, key));
    }
    const [entry, hourly] = marketPrices;
    if (!entry.bars?.length || !hourly.bars?.length) {
      console.log('Holdout', symbol, 'unavailable:', entry.failure || hourly.failure || 'empty');
      continue;
    }
    const result = replay(archives, symbol.replace('/', ''), market, entry.bars, hourly.bars);
    for (const [period, buckets] of Object.entries(result.periods)) {
      for (const [name, outcomes] of Object.entries(buckets)) combined[period][name].push(...outcomes);
    }
    console.log('Holdout', symbol, JSON.stringify({entryBars: entry.bars.length, hourlyBars: hourly.bars.length,
      selection: summarizePeriod(result.periods.selection), validation: summarizePeriod(result.periods.validation), gateCounts: result.reasons,
      firstModelRejection: result.modelReasons, displacementFailures: result.displacementFailures}));
  }
  for (const [period, buckets] of Object.entries(combined)) {
    console.log('Holdout overall', period + ':', JSON.stringify(summarizePeriod(buckets)));
  }
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = {newsAt, summarize, rejection};
