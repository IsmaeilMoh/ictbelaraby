'use strict';

const rules = require('../ict-decision-engine-708a.js');
const structure = require('../ict-structure-engine-702d.js');
const signals = require('./ict_phase2e/ict-signal-engine-702e.js');
const lifecycle = require('../ict-opportunity-lifecycle-708b.js');
const source = require('../historical-multi-market.json');

const SPLIT = Date.parse('2026-11-10T00:00:00Z');
const COST_R = 0.1;
const nyHour = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York', hour: 'numeric', hourCycle: 'h23'
});

function session(at) {
  const hour = Number(nyHour.format(at));
  if (hour >= 2 && hour < 5) return 'London 02–05';
  if (hour >= 7 && hour < 11) return 'NY AM 07–11';
  if (hour >= 13 && hour < 16) return 'NY PM 13–16';
  return 'Other';
}

function summarize(outcomes) {
  const settled = outcomes.filter(row => Number.isFinite(row.outcomeR));
  const returns = settled.map(row => row.outcomeR - COST_R);
  const total = returns.reduce((sum, value) => sum + value, 0);
  const largest = Math.max(0, ...returns);
  const targets = settled.filter(row => row.state === 'won').length;
  return {
    models: outcomes.length,
    touched: outcomes.filter(row => row.activationAt != null).length,
    targets,
    stops: settled.length - targets,
    ambiguous: outcomes.filter(row => row.state === 'ambiguous').length,
    targetRate: settled.length ? Number((100 * targets / settled.length).toFixed(1)) : null,
    netR: Number(total.toFixed(2)),
    withoutLargestR: Number((total - largest).toFixed(2))
  };
}

function replay(universe) {
  const result = { selection: {}, holdout: {} };
  for (const [symbol, series] of Object.entries(universe)) {
    for (const [frame, key] of [['15', '15m'], ['60', '1h']]) {
      const ms = lifecycle.FRAME[frame];
      const bars = (series[key] || []).map(([time, open, high, low, close]) => ({
        start: Date.parse(time), open, high, low, close, confirmed: true
      }));
      const seen = new Set();
      for (let n = 30; n <= bars.length; n++) {
        const prefix = bars.slice(Math.max(0, n - 250), n);
        const now = prefix.at(-1).start + ms;
        // Purge selection trades whose fixed 24-bar observation window spans the split.
        if (now < SPLIT && now + 24 * ms > SPLIT) continue;
        const {models, analysis} = signals.evaluate(prefix, frame, {now, market: 'forex', symbol});
        const segment = structure.normalize(prefix, frame, now).segments.at(-1) || [];
        const index = new Map(segment.map((bar, i) => [bar.start, i]));
        const pivots = [{pivots: analysis.pivots, ms, frame}];
        for (const model of models) {
          if (model.formedAt !== now || !model.research || model.status !== 'watching' || seen.has(model.id)) continue;
          seen.add(model.id);
          const range = rules.displacementRange(model, segment, index, analysis.events);
          const plan = rules.liquidityPlan(model, segment, pivots, range);
          if (!plan) continue;
          const side = model.direction === 'bull' ? 'BUY' : 'SELL';
          const record = lifecycle.create({...model, symbol, market: 'forex', frame, side, target: plan.target},
            now, {researchOnly: true});
          const outcome = lifecycle.advance(record, bars.slice(n, n + 24), now + 24 * ms);
          const period = now < SPLIT ? result.selection : result.holdout;
          const venue = session(now);
          for (const name of ['all paths', ...(!plan.interveningLiquidity ? ['clear path'] : [])]) {
            for (const bucket of [venue, 'Any']) {
              const group = [frame, bucket, name].join(' | ');
              (period[group] ??= []).push(outcome);
            }
          }
        }
      }
    }
  }
  return Object.fromEntries(Object.entries(result).map(([period, groups]) => [
    period, Object.fromEntries(Object.entries(groups).sort().map(([group, outcomes]) => [group, summarize(outcomes)]))
  ]));
}

if (require.main === module) {
  console.log(JSON.stringify({source: source.source, updatedAt: source.updatedAt,
    split: new Date(SPLIT).toISOString(), costRPerSettledTrade: COST_R, ...replay(source.assets)}, null, 2));
}
module.exports = {session, summarize};
