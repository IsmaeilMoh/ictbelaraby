'use strict';
const assert = require('node:assert/strict');
const kraken = require('./kraken-perpetual.js');
const { parseTargets, validBars, targets } = require('./server.js');
const { publicSnapshot } = require('./github-run-once.cjs');

async function run() {
  const symbol = 'PF_XBTUSD';
  const instrument = { symbol, type: 'flexible_futures', tradeable: true };
  const instruments = await kraken.fetchInstruments(async url => {
    assert.ok(url.endsWith('/derivatives/api/v3/instruments'));
    return { ok: true, json: async () => ({ result: 'success', instruments: [
      instrument, { symbol: 'PF_ETHUSD', type: 'futures', tradeable: true }
    ] }) };
  });
  assert.deepEqual([...instruments], [symbol]);
  assert.equal(targets.length, 16);
  assert.throws(() => parseTargets('kraken:BTCUSDT:5'), /UNSUPPORTED/);
  const now = Date.parse('2026-11-25T12:01:00Z');

  for (const frame of ['5', '15']) {
    const ms = Number(frame) * 60000;
    const current = Math.floor(now / ms) * ms;
    const candles = Array.from({ length: 41 }, (_, i) => ({
      time: current - (40 - i) * ms, open: '100', high: '103', low: '99', close: '101'
    })).reverse();
    const bars = await kraken.fetchHistory(symbol, frame, { now, instruments, fetchImpl: async input => {
      const url = new URL(input);
      assert.equal(url.hostname, 'futures.kraken.com');
      assert.equal(url.pathname, '/api/charts/v1/trade/' + symbol + '/' + frame + 'm');
      assert.equal(Number(url.searchParams.get('to')), now / 1000);
      assert.equal(Number(url.searchParams.get('from')), (current - 200 * ms) / 1000);
      return { ok: true, json: async () => ({ candles }) };
    } });
    assert.equal(bars.length, 40);
    assert.equal(bars.at(-1).start + ms, current);
    assert.ok(bars.every(b => b.confirmed && b.source === kraken.SOURCE));
    assert.equal(validBars(bars, frame, now).length, 40);
    assert.throws(() => validBars(bars, frame, now + 4 * ms), /STALE_CANDLES/);
    assert.throws(() => validBars(bars.filter((_,i) => i !== 34), frame, now), /LATEST_SEGMENT/);
    for (const bad of [
      [candles[0], candles[0]],
      [{ ...candles[0], time: current + ms }],
      [{ ...candles[0], high: '98' }],
      [{ ...candles[0], time: current + 1 }]
    ]) assert.throws(() => kraken.parseCandles({ candles: bad }, symbol, frame, now), /KRAKEN_CANDLE_INVALID/);

    const id = 'kraken:' + symbol + ':' + frame;
    const currentIso = new Date(current).toISOString();
    const nowIso = new Date(now).toISOString();
    const view = publicSnapshot({
      schema:'ict-research-monitor/1', readyForExecution:false, lastCycleAt:nowIso,
      targets:{[id]:{market:'kraken',symbol,frame,source:kraken.SOURCE,status:'research_data_valid',lastCompleteAt:currentIso}},
      observations:[{id:id+':setup',market:'kraken',symbol,frame,status:'research_only_blocked',side:'BUY',
        entry:100, stop:99, target:102, formedAt:current, detectedAt:nowIso, checkedAt:nowIso,
        research:{phase:'observed',at:current},evidence:{sweepAt:current-2*ms,mssAt:current-ms,fvgAt:current-ms}}]
    },now);
    assert.equal(view.targets[id].marketType, 'PERPETUAL');
    assert.equal(view.observations[0].source, kraken.SOURCE);
    assert.equal(view.observations[0].symbol, symbol);
    assert.equal(view.observations[0].executionApproved, false);
  }

  await assert.rejects(() => kraken.fetchHistory('PF_ETHUSD','15',{now,instruments}), /NOT_VERIFIED/);
  await assert.rejects(() => kraken.fetchHistory(symbol,'5',{now,instruments,fetchImpl:async()=>({ok:false,status:503})}), /503/);
  console.log('Kraken USD perpetual contract, 5m/15m candles, source outage and publication isolation: PASS');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
