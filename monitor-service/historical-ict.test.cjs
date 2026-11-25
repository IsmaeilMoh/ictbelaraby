'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const structure = require('./ict_phase2d/ict-structure-engine-702d.js');
const engine = require('./ict_phase2e/ict-signal-engine-702e.js');
const { datasets } = require('./fixtures/ict-history.json');

const browser = { ICTStructureEngine: structure };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../ict-signal-engine-702e.js'), 'utf8'), browser);
const expected = [9, 7, 1];
const allPhases = new Set();

for (const [index, sample] of datasets.entries()) {
  const frame = sample.frame.slice(0, -1);
  const ms = Number(frame) * 60000;
  const market = sample.source.includes('Binance') ? 'spot' : 'forex';
  const bars = sample.rows.map(([time, open, high, low, close]) => ({
    start: Date.parse(time), open, high, low, close, confirmed: true
  }));
  assert.ok(bars.at(-1).start + ms <= Date.parse(sample.updatedAt));
  const observed = new Map();
  for (let n = 30; n <= bars.length; n++) {
    const now = bars[n - 1].start + ms;
    const opts = { now, market, symbol: sample.symbol };
    const prefix = bars.slice(0, n);
    const { models, analysis } = engine.evaluate(prefix, frame, opts);
    // Even if future rows are already loaded, their closes cannot affect the current result.
    assert.deepEqual(engine.evaluate(bars, frame, opts).models, models);
    assert.equal(JSON.stringify(browser.ICTSignalEngine.evaluate(prefix, frame, opts).models), JSON.stringify(models));
    for (const model of models.filter(m => m.research && m.ageBars <= 12)) {
      assert.ok(model.formedAt <= now && model.research.at <= now);
      assert.ok(model.sweepAt < model.mssAt && model.sweepAt < model.fvgAt);
      assert.equal(model.formedAt, Math.max(model.mssAt, model.fvgAt) + ms);
      assert.ok(analysis.events.some(e => e.type === 'SWEEP' && e.at === model.sweepAt && e.direction === model.direction));
      assert.ok(analysis.events.some(e => e.type === 'MSS' && e.at === model.mssAt && e.direction === model.direction));
      const gap = analysis.zones.find(z => z.at === model.fvgAt && z.direction === model.direction);
      assert.ok(gap && gap.low === model.zone.low && gap.high === model.zone.high);
      const key = [model.formedAt, model.entry, model.stop, model.target];
      if (observed.has(model.id)) assert.deepEqual(key, observed.get(model.id).key);
      else {
        // These fixtures start with a warm-up window. First observation must occur at formation.
        assert.equal(model.formedAt, now);
        assert.equal(model.research.phase, 'observed');
      }
      const last = observed.get(model.id)?.state;
      if (last && ['invalidated', 'expired'].includes(last.phase)) assert.deepEqual(model.research, last);
      if (model.research.phase === 'awaiting_confirmation') assert.equal(model.research.at, model.formedAt + ms);
      if (model.research.phase === 'confirmed_research') {
        const proof = prefix.filter(b => b.start >= model.formedAt && b.start + ms <= model.research.at);
        assert.ok(proof.some(b => b.low <= gap.high && b.high >= gap.low));
        assert.ok(proof.every(b => model.direction === 'bull' ? b.low > model.stop : b.high < model.stop));
        assert.ok(model.direction === 'bull' ? proof.at(-1).close > gap.high : proof.at(-1).close < gap.low);
      }
      allPhases.add(model.research.phase);
      observed.set(model.id, { key, state: model.research });
    }
  }
  assert.equal(observed.size, expected[index]);
  console.log(`Historical replay: ${sample.source}, ${sample.symbol}/${sample.frame}, ${observed.size} causal ICT models across ${bars.length} candles`);
}
assert.deepEqual([...allPhases].sort(), ['awaiting_confirmation','confirmed_research','expired','invalidated','observed']);
