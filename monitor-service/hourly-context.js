'use strict';

const structure = require('./ict_phase2d/ict-structure-engine-702d.js');
const context = require('../ict-context-engine-703a.js');
const scenarios = require('../ict-scenario-engine-703b.js');

// XAUUSD can have a scheduled break at 17:00 New York Mon–Thu. Analyze each
// side independently, so the closure cannot create a pivot or an FVG.
function goldSessionAnalysis(analysis, segments, now) {
  if (analysis.eligible || segments.length < 2) return analysis;
  const current = segments.at(-1);
  const previous = segments.at(-2);
  const before = context.nyParts(previous.at(-1).start);
  const after = context.nyParts(current[0].start);
  const weekday = new Date(after.key + 'T00:00:00Z').getUTCDay();
  if (weekday < 1 || weekday > 4 || before.key !== after.key || before.hour !== 16 || after.hour !== 18 ||
      current[0].start - previous.at(-1).start !== 2 * context.HOUR || previous.length !== 23) return analysis;

  const prior = structure.analyze(previous.map(bar => ({ ...bar, confirmed:true })), '60', { now, pivot: 2 });
  const zones = prior.zones.filter(zone => !zone.mitigated &&
    !current.some(bar => bar.low <= zone.high && bar.high >= zone.low));
  return { ...analysis, first:prior.first, eligible:true,
    usableBars:prior.usableBars + current.length, events:prior.events, zones };
}

function inspectHourly(bars, market, now, symbol) {
  const { rows, gaps, segments, rejected, duplicates } = structure.normalize(bars, '60', now);
  if (rejected || duplicates) return { status: 'insufficient', reason:'invalid_candles' };
  if (!rows.length) return { status: 'insufficient', reason:'not_enough_candles' };
  const diagnostics = { completed: rows.length, contiguous: segments.at(-1).length,
    recentGaps: gaps.slice(-5).map(gap => ({ before: new Date(gap.before).toISOString(), after: new Date(gap.after).toISOString() })) };
  const lastCompleteAt = rows.at(-1).start + context.HOUR;
  if (now - lastCompleteAt > 3 * context.HOUR) return { status: 'stale', lastCompleteAt };
  const marketKind = ['crypto', 'spot', 'kraken'].includes(market) ? 'crypto' : market;
  const rollHour = ['forex', 'metals', 'energy'].includes(marketKind) ? 17 : 0;
  const insufficient = reason => ({ status:'insufficient', reason, lastCompleteAt, diagnostics });
  let levels;
  try {
    levels = context.build([], bars, { market: marketKind, rollHour, now });
  } catch {
    return insufficient('session_history_missing');
  }
  try {
    let analysis = structure.analyze(bars, '60', { now, pivot: 2 });
    if (market === 'metals' && symbol === 'XAUUSD') analysis = goldSessionAnalysis(analysis, segments, now);
    const view = scenarios.build(levels, analysis, { now });
    if (!view.qualified) return insufficient(gaps.length && !analysis.eligible ? 'candle_gap' : 'not_enough_candles');
    const aligned = view.scenarios.filter(s => s.score >= 2 && s.structuralEvent !== null).map(s => s.direction);
    return { status: 'ready', lastCompleteAt, aligned };
  } catch {
    return insufficient('not_enough_candles');
  }
}

module.exports = { inspectHourly };
