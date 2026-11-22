#!/usr/bin/env python3
"""Optional Twelve Data OHLC publisher. A paid/licensed key may be required.
Only publishes observed OHLC bars, no synthetic weekend candles or prices.
Run from Github Actions with TWELVEDATA_API_KEY secret, not in browser.
"""
import datetime as dt
import json
import os
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT=Path(__file__).resolve().parents[1]
SYMBOLS={
  'XAUUSD':('XAU/USD','metal'), 'XAGUSD':('XAG/USD','metal'),
  'EURUSD':('EUR/USD','forex'), 'GBPUSD':('GBP/USD','forex'),
  'USDJPY':('USD/JPY','forex'), 'AUDUSD':('AUD/USD','forex'),
  'NZDUSD':('NZD/USD','forex'), 'USDCAD':('USD/CAD','forex'),
  'USDCHF':('USD/CHF','forex'),
  'NDX_INDEX':('NDX','index'), 'SPX_INDEX':('SPX','index'), 'DJI_INDEX':('DJI','index'),
}
INTERVALS={'15m':'15min','1h':'1h','1d':'1day'}

def request_series(symbol, interval, key, now):
    query=urlencode({'symbol':symbol,'interval':interval,'outputsize':500,'timezone':'UTC','apikey':key,'format':'JSON'})
    req=Request('https://api.twelvedata.com/time_series?'+query,headers={'User-Agent':'ICTArabic research (licensed data)'})
    with urlopen(req,timeout=22) as response: payload=json.load(response)
    if not isinstance(payload,dict) or payload.get('status')=='error' or not isinstance(payload.get('values'),list):
        raise ValueError(str(payload.get('message','Invalid provider response'))[:170])
    meta=payload.get('meta') or {}
    # Require exact symbol identity in the response, not merely HTTP 200.
    if str(meta.get('symbol','')).upper()!=symbol.upper():
        raise ValueError('Provider returned different symbol: '+str(meta.get('symbol','')))
    rows=[]
    for bar in reversed(payload['values']):
        when=str(bar.get('datetime',''))
        if interval=='1day':
            # Time marks session dates, NOT actual UTC exchange opening times.
            try: stamp=dt.datetime.strptime(when,'%Y-%m-%d').replace(tzinfo=dt.timezone.utc)
            except ValueError:continue
        else:
            try: stamp=dt.datetime.strptime(when,'%Y-%m-%d %H:%M:%S').replace(tzinfo=dt.timezone.utc)
            except ValueError:continue
        if stamp>=now:continue
        try:o,h,l,c=(float(bar[k]) for k in ('open','high','low','close'))
        except (ValueError,TypeError,KeyError):continue
        if not (0<l<=min(o,c)<=max(o,c)<=h):raise ValueError('Invalid OHLC')
        rows.append([stamp.isoformat().replace('+00:00','Z'),o,h,l,c])
    if len(rows)<60:raise ValueError('Fewer than 60 usable candles')
    times=[dt.datetime.fromisoformat(x[0].replace('Z','+00:00')) for x in rows]
    if any(times[i]<=times[i-1] for i in range(1,len(times))):raise ValueError('Duplicate/out-of-order candles')
    return rows

def main():
    key=os.getenv('TWELVEDATA_API_KEY','').strip()
    if not key:raise SystemExit('TWELVEDATA_API_KEY missing — no publication attempted')
    now=dt.datetime.now(dt.timezone.utc);assets={};kinds={}
    for public,(provider,kind) in SYMBOLS.items():
        candles={}
        for label,interval in INTERVALS.items():
            try:candles[label]=request_series(provider,interval,key,now)
            except Exception as exc:print(f'UNAVAILABLE {public} {label}: {exc}')
        if candles:assets[public]=candles;kinds[public]=kind
    if not assets:raise SystemExit('No verified provider datasets; previous file retained')
    target=ROOT/'historical-multi-market.json'
    # Do not publish a partial failure that accidentally removes all previously verified assets.
    if target.exists():
        try:
            previous=json.loads(target.read_text(encoding='utf-8'))
            for symbol,frames in previous.get('assets',{}).items():
                if symbol not in assets:
                    # Do NOT carry forward stale prices: only freshly fetched series are published.
                    print('Unavailable in new run:',symbol)
        except Exception:pass
    output={'version':2,'updatedAt':now.isoformat().replace('+00:00','Z'),
            'source':'Twelve Data time_series','marketKinds':kinds,'assets':assets,
            'notes':'Daily timestamps indicate session date, not UTC market opening. Index symbols are cash reference series, not broker CFD contracts. Check API rights and quote provenance.'}
    temp=target.with_suffix('.json.tmp');temp.write_text(json.dumps(output,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8');temp.replace(target)
    print('Published:',[(key,list(value)) for key,value in assets.items()])
if __name__=='__main__':main()
