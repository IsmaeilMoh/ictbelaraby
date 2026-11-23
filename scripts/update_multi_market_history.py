#!/usr/bin/env python3
"""Publish verified Twelve Data candles with conservative account-aware pacing.

Reads API credentials only from environment. Does not synthesize index data or
replace NDX with a different instrument. The publisher is optional: if quota is
exhausted, it leaves the previous published file untouched.
"""
import datetime as dt
import json
import os
import time
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
SYMBOLS = {
    'XAUUSD': ('XAU/USD', 'metal'), 'XAGUSD': ('XAG/USD', 'metal'),
    'EURUSD': ('EUR/USD', 'forex'), 'GBPUSD': ('GBP/USD', 'forex'),
    'USDJPY': ('USD/JPY', 'forex'), 'AUDUSD': ('AUD/USD', 'forex'),
    'NZDUSD': ('NZD/USD', 'forex'), 'USDCAD': ('USD/CAD', 'forex'),
    'USDCHF': ('USD/CHF', 'forex'),
    'NDX_INDEX': ('NDX', 'index'), 'SPX_INDEX': ('SPX', 'index'),
    'DJI_INDEX': ('DJI', 'index'),
}
INTERVALS = {'15m': '15min', '1h': '1h', '1d': '1day'}
DEEP_SYMBOLS = {'XAUUSD', 'EURUSD'}
DEEP_OUTPUTSIZE = 5000
REGULAR_OUTPUTSIZE = 500

# Account screenshot: 8 credits per minute. Use no more than five requests per
# minute when each costs 1 credit; the provider can charge MORE for some data.
# A 429 pauses the workflow, retries once, then halts publication if repeated.
MIN_REQUEST_SPACING_SECONDS = 12.0
RATE_LIMIT_RETRY_SECONDS = 70.0


class RateLimitError(Exception):
    """Provider rejected a request for rate/credit reasons."""


class QuotaHalt(Exception):
    """Repeated rate limiting: stop, do not overwrite working datasets."""


class RequestPacer:
    def __init__(self, spacing=MIN_REQUEST_SPACING_SECONDS):
        self.spacing = spacing
        self.next_start = 0.0

    def wait(self):
        remaining = self.next_start - time.monotonic()
        if remaining > 0:
            time.sleep(remaining)
        self.next_start = time.monotonic() + self.spacing

    def cooldown(self):
        # A 429 may be a per-minute or daily limit. Back off before one retry.
        time.sleep(RATE_LIMIT_RETRY_SECONDS)
        self.next_start = time.monotonic()


def safe_provider_message(payload):
    if isinstance(payload, dict):
        return str(payload.get('message') or payload.get('status') or 'Provider error')[:160]
    return 'Unexpected provider response'


def read_api_payload(symbol, interval, key, outputsize):
    query = urlencode({'symbol': symbol, 'interval': interval,
                       'outputsize': outputsize, 'timezone': 'UTC',
                       'apikey': key, 'format': 'JSON'})
    request = Request('https://api.twelvedata.com/time_series?' + query,
                      headers={'User-Agent': 'ICTArabic research (licensed data)'})
    try:
        with urlopen(request, timeout=22) as response:
            payload = json.load(response)
    except HTTPError as exc:
        try:
            body = json.loads(exc.read(4096).decode('utf-8', 'replace'))
        except (ValueError, UnicodeError):
            body = None
        message = safe_provider_message(body)
        if exc.code == 429:
            raise RateLimitError(f'HTTP 429: {message}') from None
        raise ValueError(f'HTTP {exc.code}: {message}') from None

    if not isinstance(payload, dict):
        raise ValueError('Invalid provider response')
    if payload.get('status') == 'error':
        code = str(payload.get('code', ''))
        message = safe_provider_message(payload)
        if code == '429' or any(x in message.lower() for x in ('rate limit', 'too many requests', 'api credits exceeded', 'credit limit', 'api credits limit', 'minute credit')):
            raise RateLimitError(f'Provider {code}: {message}')
        raise ValueError(f'Provider {code}: {message}')
    if not isinstance(payload.get('values'), list):
        raise ValueError(safe_provider_message(payload))
    return payload


def request_series(symbol, interval, key, now, pacer, outputsize=REGULAR_OUTPUTSIZE):
    for attempt in range(2):
        pacer.wait()
        try:
            payload = read_api_payload(symbol, interval, key, outputsize)
            break
        except RateLimitError as exc:
            if attempt == 1:
                raise QuotaHalt(f'RATE_LIMIT_OR_CREDITS after cooldown: {exc}') from None
            print(f'RATE_LIMIT {symbol} {interval}: cooling down before one retry', flush=True)
            pacer.cooldown()

    meta = payload.get('meta') or {}
    if str(meta.get('symbol', '')).upper() != symbol.upper():
        raise ValueError('Provider returned different symbol: ' + str(meta.get('symbol', '')))
    rows = []
    for bar in reversed(payload['values']):
        when = str(bar.get('datetime', ''))
        if interval == '1day':
            try:
                stamp = dt.datetime.strptime(when, '%Y-%m-%d').replace(tzinfo=dt.timezone.utc)
            except ValueError:
                continue
        else:
            try:
                stamp = dt.datetime.strptime(when, '%Y-%m-%d %H:%M:%S').replace(tzinfo=dt.timezone.utc)
            except ValueError:
                continue
        if interval == '1day':
            if stamp.date() >= now.date():
                continue
        elif stamp + dt.timedelta(seconds={'15min': 900, '1h': 3600}[interval]) > now:
            continue
        try:
            o, h, l, c = (float(bar[k]) for k in ('open', 'high', 'low', 'close'))
        except (ValueError, TypeError, KeyError):
            continue
        if not (0 < l <= min(o, c) <= max(o, c) <= h):
            raise ValueError('Invalid OHLC')
        rows.append([stamp.isoformat().replace('+00:00', 'Z'), o, h, l, c])
    if len(rows) < 60:
        raise ValueError('Fewer than 60 usable candles')
    times = [dt.datetime.fromisoformat(x[0].replace('Z', '+00:00')) for x in rows]
    if any(times[i] <= times[i-1] for i in range(1, len(times))):
        raise ValueError('Duplicate/out-of-order candles')
    return rows


def diagnose_index_failure(message):
    detail = str(message).lower()
    if any(x in detail for x in ('plan', 'subscription', 'upgrade', 'premium',
                                   'access denied', 'not authorized', 'permission', 'forbidden')):
        return 'PROVIDER_PLAN_OR_ENTITLEMENT'
    if any(x in detail for x in ('rate limit', 'credit', 'quota', '429', 'too many')):
        return 'RATE_LIMIT_OR_CREDITS'
    if any(x in detail for x in ('symbol', 'instrument', 'not found', 'invalid')):
        return 'SYMBOL_OR_COVERAGE'
    if 'fewer than' in detail:
        return 'INSUFFICIENT_HISTORY'
    return 'PROVIDER_ERROR_OR_NETWORK'


def ordered_requests():
    # Diagnose the missing Nasdaq-100 daily series FIRST, while fresh minute
    # credits are available. Do not replace with QQQ/Nasdaq Composite.
    yield 'NDX_INDEX', '1d', INTERVALS['1d']
    for sym in ('NDX_INDEX', 'SPX_INDEX', 'DJI_INDEX'):
        for label, interval in INTERVALS.items():
            if sym == 'NDX_INDEX' and label == '1d':
                continue
            yield sym, label, interval
    for sym in SYMBOLS:
        if SYMBOLS[sym][1] == 'index':
            continue
        for label, interval in INTERVALS.items():
            yield sym, label, interval


def write_summary(assets, diagnostics, halted, summary_file):
    if not summary_file:
        return
    lines = [
        '## ICT بالعربي — تشخيص المؤشرات وحدود Twelve Data', '',
        'الطلبات موزعة بفاصل 12 ثانية على الأقل بين بداياتها؛ قد يخصم المزود أكثر من credit واحد لبعض الطلبات.',
        '', '| المؤشر | إطار 15m | إطار 1h | إطار 1d |', '|---|---|---|---|',
    ]
    for symbol in ('NDX_INDEX', 'SPX_INDEX', 'DJI_INDEX'):
        cells = []
        for frame in INTERVALS:
            if frame in assets.get(symbol, {}):
                cells.append(f'OK ({len(assets[symbol][frame])} شمعة)')
            else:
                item = diagnostics.get((symbol, frame))
                cells.append(item[0] if item else 'NOT_ATTEMPTED')
        lines.append('| ' + symbol + ' | ' + ' | '.join(cells) + ' |')
    lines.extend(['',
                  ('⚠️ أُوقفت المحاولات بعد تكرار خطأ تحديد المعدل؛ لم يُستبدل ملف البيانات السابق.'
                   if halted else 'الرموز غير المتاحة لا تُستبدل ببيانات ETF أو مؤشر مختلف.'),
                  'للتشخيص الدقيق راجع سجل UNAVAILABLE أو RATE_LIMIT. نجاح GitHub Action لا يضمن دعم الخطة للمؤشرات.',
                  ''])
    with open(summary_file, 'a', encoding='utf-8') as report:
        report.write('\n'.join(lines))


def main():
    key = os.getenv('TWELVEDATA_API_KEY', '').strip()
    if not key:
        raise SystemExit('TWELVEDATA_API_KEY missing — no publication attempted')
    now = dt.datetime.now(dt.timezone.utc)
    assets, kinds, diagnostics = {}, {}, {}
    pacer = RequestPacer()
    halted = False
    print('First request: NDX daily; minimum 12 seconds between request starts.', flush=True)
    for public, label, interval in ordered_requests():
        provider, kind = SYMBOLS[public]
        depth = DEEP_OUTPUTSIZE if public in DEEP_SYMBOLS else REGULAR_OUTPUTSIZE
        try:
            candles = request_series(provider, interval, key, now, pacer, outputsize=depth)
            assets.setdefault(public, {})[label] = candles
            kinds[public] = kind
            print(f'OK {public} {label}: {len(candles)} / {depth} observations', flush=True)
        except QuotaHalt as exc:
            reason = str(exc).replace(key, '[REDACTED]')[:160]
            print(f'QUOTA_HALT {public} {label}: {reason}', flush=True)
            if kind == 'index':
                diagnostics[(public, label)] = ('RATE_LIMIT_OR_CREDITS', reason)
            halted = True
            break
        except Exception as exc:
            reason = str(exc).replace(key, '[REDACTED]')[:160]
            print(f'UNAVAILABLE {public} {label}: {reason}', flush=True)
            if kind == 'index':
                diagnostics[(public, label)] = (diagnose_index_failure(reason), reason)

    write_summary(assets, diagnostics, halted, os.getenv('GITHUB_STEP_SUMMARY'))
    if halted:
        raise SystemExit('Rate/credit limit persisted after cooldown; retained the prior published file')
    if not assets:
        raise SystemExit('No verified provider datasets; previous file retained')

    # Keep existing behavior: only publish freshly fetched observations. Never
    # mark last week's old bars as if they were refreshed in this run.
    output = {
        'version': 2, 'updatedAt': now.isoformat().replace('+00:00', 'Z'),
        'source': 'Twelve Data time_series', 'marketKinds': kinds, 'assets': assets,
        'notes': ('Daily timestamps indicate session date, not UTC market opening. '
                  'Index symbols are cash reference series, not broker CFD contracts. '
                  'Check API rights and quote provenance.'),
    }
    target = ROOT / 'historical-multi-market.json'
    temp = target.with_suffix('.json.tmp')
    temp.write_text(json.dumps(output, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    temp.replace(target)
    print('Published:', [(symbol, list(frames)) for symbol, frames in assets.items()], flush=True)


if __name__ == '__main__':
    main()
