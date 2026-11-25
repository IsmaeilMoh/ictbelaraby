'use strict';

const structure = require('./ict_phase2d/ict-structure-engine-702d.js');
const context = require('../ict-context-engine-703a.js');
const scenarios = require('../ict-scenario-engine-703b.js');

function inspectHourly(bars, market, now) {
  const { rows, rejected, duplicates } = structure.normalize(bars, '60', now);
  if (!rows.length || rejected || duplicates) return { status: 'insufficient' };
  const lastCompleteAt = rows.at(-1).start + context.HOUR;
  if (now - lastCompleteAt > 3 * context.HOUR) return { status: 'stale', lastCompleteAt };
  try {
    const marketKind = ['crypto', 'spot', 'kraken'].includes(market) ? 'crypto' : market;
    const rollHour = ['forex', 'metals', 'energy'].includes(marketKind) ? 17 : 0;
    const levels = context.build([], bars, { market: marketKind, rollHour, now });
    const analysis = structure.analyze(bars, '60', { now, pivot: 2 });
    const view = scenarios.build(levels, analysis, { now });
    if (!view.qualified) return { status: 'insufficient', lastCompleteAt };
    const aligned = view.scenarios.filter(s => s.score >= 2 && s.structuralEvent !== null).map(s => s.direction);
    return { status: 'ready', lastCompleteAt, aligned };
  } catch {
    return { status: 'insufficient', lastCompleteAt };
  }
}

module.exports = { inspectHourly };
