#!/usr/bin/env python3
"""Optional 5-minute Yahoo Finance candle snapshot (unofficial source).

This feed is only an informational, delayed snapshot, not tick data, not a live
trading signal. No fabricated values; absent instruments/windows stay absent.
"""
import concurrent.futures
import datetime as dt
import json
import math
from pathlib import Path
import urllib.parse
import urllib.request
from update_movers import INSTRUMENTS

UTC = dt.timezone.utc
NOW = lambda: dt.datetime.now(UTC)


def measures(timestamps, closes, latest_ts=None):
    """Measure window returns only against observed closes near target timestamps."""
    points = sorted((int(t), float(c)) for t, c in zip(timestamps, closes)
                    if t is not None and c is not None and math.isfinite(float(c)) and float(c) > 0)
    if len(points) < 2:
        return None
    latest_ts = int(latest_ts) if latest_ts is not None else points[-1][0]
    # Only use candles at or before the latest selected timestamp.
    points = [(t, c) for t, c in points if t <= latest_ts]
    if len(points) < 2:
        return None
    current_t, current = points[-1]
    output = {'quotedAt': dt.datetime.fromtimestamp(current_t, UTC).isoformat().replace('+00:00', 'Z'),
              'price': round(current, 8)}
    for duration in (5, 15, 60):
        target = current_t - duration * 60
        candidates = [(t, c) for t, c in points[:-1] if target - 90 <= t <= target + 90]
        if not candidates:
            continue
        _, baseline = min(candidates, key=lambda item: abs(item[0] - target))
        result = (current / baseline - 1) * 100
        if math.isfinite(result) and abs(result) < 99:
            output[str(duration)] = round(result, 5)
    return output


def fetch_one(instrument):
    symbol, yahoo, label, group, _tv, proxy = instrument
    endpoint = '/v8/finance/chart/' + urllib.parse.quote(yahoo, safe='') + '?interval=5m&range=2d'
    errors = []
    for host in ('query1.finance.yahoo.com', 'query2.finance.yahoo.com'):
        request = urllib.request.Request('https://' + host + endpoint,
            headers={'User-Agent': 'Mozilla/5.0 (compatible; ICTArabic/6.8)', 'Accept': 'application/json'})
        try:
            with urllib.request.urlopen(request, timeout=12) as response:
                data = json.load(response)
            entry = (data.get('chart', {}).get('result') or [None])[0]
            if entry is None:
                raise ValueError('No chart data')
            quote = ((entry.get('indicators') or {}).get('quote') or [{}])[0]
            snapshot = measures(entry.get('timestamp') or [], quote.get('close') or [])
            if snapshot is None:
                raise ValueError('No usable candle pair')
            # Do not output even a 5m change when last candle is more than 45m old.
            age = (NOW() - dt.datetime.fromisoformat(snapshot['quotedAt'].replace('Z', '+00:00'))).total_seconds()
            if age < -600 or age > 45 * 60:
                raise ValueError('Stale candles')
            if not any(str(d) in snapshot for d in (5, 15, 60)):
                raise ValueError('No valid window comparisons')
            return {'symbol': symbol, 'label': label, 'category': group, 'proxy': proxy, **snapshot}
        except Exception as exc:
            errors.append(str(exc))
    raise RuntimeError('; '.join(errors))


def build():
    items = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        futures = {pool.submit(fetch_one, i): i[0] for i in INSTRUMENTS}
        for future in concurrent.futures.as_completed(futures):
            try:
                items.append(future.result())
            except Exception as exc:
                print('INFO: intraday unavailable:', futures[future], str(exc))
    order = {x[0]: i for i, x in enumerate(INSTRUMENTS)}
    items.sort(key=lambda x: order[x['symbol']])
    result = {'updatedAt': NOW().isoformat().replace('+00:00', 'Z'),
              'source': 'Yahoo Finance public chart feed (unofficial)',
              'intervalMinutes': 5, 'windowBasis': '5-minute chart close comparisons',
              'isRealtime': False, 'items': items}
    target = Path(__file__).resolve().parents[1] / 'market-radar.json'
    # Empty feed on weekends/closed markets is truthful; it prevents stale signals.
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('Wrote intraday feed with', len(items), 'instruments')


if __name__ == '__main__':
    build()
