'use strict';

// Public USD perpetuals. These instruments are distinct from Bybit USDT.
const BASE = 'https://futures.kraken.com';
const SOURCE = 'Kraken Futures · USD perpetual';
const SYMBOLS = Object.freeze(['PF_XBTUSD', 'PF_ETHUSD']);
const FRAME_MS = Object.freeze({ '5': 300000, '15': 900000, '60': 3600000 });

async function read(url, fetchImpl) {
  const response = await fetchImpl(url, {
    headers: { Accept: 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(7000)
  });
  if (!response.ok) throw Error('KRAKEN_FUTURES_HTTP_' + response.status);
  return response.json();
}

async function fetchInstruments(fetchImpl = globalThis.fetch) {
  const data = await read(BASE + '/derivatives/api/v3/instruments', fetchImpl);
  if (data?.result !== 'success' || !Array.isArray(data.instruments)) throw Error('KRAKEN_INSTRUMENTS_INVALID');
  return new Set(SYMBOLS.filter(symbol => {
    const matches = data.instruments.filter(instrument => instrument?.symbol === symbol);
    return matches.length === 1 && matches[0].type === 'flexible_futures' && matches[0].tradeable === true;
  }));
}

function parseCandles(data, symbol, frame, now) {
  const ms = FRAME_MS[frame];
  if (!SYMBOLS.includes(symbol) || !ms) throw Error('KRAKEN_UNSUPPORTED_CONTRACT_OR_FRAME');
  if (!Array.isArray(data?.candles) || !data.candles.length || data.candles.length > 500) {
    throw Error('KRAKEN_CANDLES_INVALID');
  }
  const seen = new Set();
  return data.candles.map(row => {
    const start = row?.time;
    const [open, high, low, close] = ['open','high','low','close'].map(key => Number(row?.[key]));
    if (!Number.isSafeInteger(start) || start < 946684800000 || start % ms !== 0 || start > now || seen.has(start) ||
        ![open, high, low, close].every(price => Number.isFinite(price) && price > 0) ||
        high < Math.max(open, close, low) || low > Math.min(open, close, high)) {
      throw Error('KRAKEN_CANDLE_INVALID');
    }
    seen.add(start);
    return { start, open, high, low, close, confirmed: start + ms <= now, symbol, interval: frame, source: SOURCE };
  }).filter(bar => bar.confirmed).sort((a,b) => a.start - b.start);
}

async function fetchHistory(symbol, frame, { instruments, now = Date.now(), fetchImpl = globalThis.fetch } = {}) {
  const ms = FRAME_MS[frame];
  if (!SYMBOLS.includes(symbol) || !ms || !instruments?.has(symbol)) throw Error('KRAKEN_PERPETUAL_NOT_VERIFIED');
  const url = new URL('/api/charts/v1/trade/' + symbol + '/' + (frame === '60' ? '1h' : frame + 'm'), BASE);
  url.searchParams.set('from', String(Math.floor(now / ms) * ms / 1000 - 200 * ms / 1000));
  url.searchParams.set('to', String(Math.floor(now / 1000)));
  return parseCandles(await read(url.toString(), fetchImpl), symbol, frame, now);
}

async function fetchLastTrade(symbol,{instruments,fetchImpl=globalThis.fetch,clock=Date.now}={}){
  if(!SYMBOLS.includes(symbol)||!instruments?.has(symbol))throw Error('KRAKEN_PERPETUAL_NOT_VERIFIED');
  const url=new URL('/derivatives/api/v3/history',BASE);
  url.searchParams.set('symbol',symbol);
  const data=await read(url.toString(),fetchImpl);
  const latest=data?.history?.[0];
  const at=typeof latest?.time==='string'&&/(?:Z|[+-]\d{2}:\d{2})$/.test(latest.time)?Date.parse(latest.time):NaN;
  const value=latest?.price;
  const price=typeof value==='string'&&value.trim()!==''?Number(value):value,now=clock();
  if(data?.result!=='success'||!Number.isFinite(price)||price<=0||!Number.isFinite(at)||at>now||now-at>15000){
    throw Error('KRAKEN_TRADE_STALE_OR_INVALID');
  }
  return {at,price};
}

module.exports = { SYMBOLS, SOURCE, fetchInstruments, fetchHistory, fetchLastTrade, parseCandles };
