#!/usr/bin/env python3
"""Publish verified Bybit linear USDT perpetual OHLC candles; never generate synthetic prices.
V2 includes multiple intervals. Only publishes received, contiguous, closed bars.
The project must review exchange redistribution terms prior to production/commercial use.
"""
import datetime as dt
import json
import math
import pathlib
import urllib.parse
import urllib.request

BASE=pathlib.Path(__file__).resolve().parents[1]
ENDPOINT='https://api.bybit.com/v5/market/kline'
BYBIT_INTERVAL={'5m':'5','15m':'15','1h':'60','4h':'240','1d':'D'}
SYMBOLS={'BTCUSDT':'BTCUSDT','ETHUSDT':'ETHUSDT','SOLUSDT':'SOLUSDT','XRPUSDT':'XRPUSDT'}
INTERVALS={'5m':300,'15m':900,'1h':3600,'4h':14400,'1d':86400}

def get(symbol, interval, now_ms):
    url=ENDPOINT+'?'+urllib.parse.urlencode({
        'category':'linear','symbol':symbol,'interval':BYBIT_INTERVAL[interval],'limit':1000
    })
    req=urllib.request.Request(url,headers={'User-Agent':'ICTArabic research data client'})
    with urllib.request.urlopen(req,timeout=16) as response:
        data=json.load(response)
    result=data.get('result') or {}
    if data.get('retCode')!=0 or result.get('symbol')!=symbol or result.get('category')!='linear':
        raise ValueError('Unexpected Bybit instrument')
    provider_ms=int(data['time'])
    step=INTERVALS[interval]*1000
    rows=[]
    for value in reversed(result['list']):
        stamp=int(value[0])
        if stamp%step:raise ValueError('Invalid candle alignment')
        if stamp+step>min(now_ms,provider_ms):continue
        o,h,l,c=map(float,value[1:5])
        if not all(math.isfinite(x) and x>0 for x in (o,h,l,c)) or h<max(o,c,l) or l>min(o,c,h):
            raise ValueError('Invalid OHLC')
        when=dt.datetime.fromtimestamp(stamp/1000,dt.timezone.utc).isoformat().replace('+00:00','Z')
        rows.append((stamp,[when,o,h,l,c]))
    if len(rows)<600:raise ValueError('Too few closed candles')
    if any(second[0]-first[0]!=step for first,second in zip(rows,rows[1:])):
        raise ValueError('Noncontiguous observations')
    return [row for _,row in rows]

def main():
    now=dt.datetime.now(dt.timezone.utc)
    now_ms=int(now.timestamp()*1000)
    assets={}
    for public_symbol,api_symbol in SYMBOLS.items():
        frames={}
        for tf in INTERVALS:
            try:frames[tf]=get(api_symbol,tf,now_ms)
            except Exception as exc:print(f'WARNING {public_symbol} {tf}: {exc}')
        if frames:assets[public_symbol]=frames
    # Preserve the previously published dataset on provider failure.
    if 'BTCUSDT' not in assets or 'ETHUSDT' not in assets or '15m' not in assets['BTCUSDT'] or '15m' not in assets['ETHUSDT']:
        raise SystemExit('Critical datasets unavailable; leaving existing feed untouched')
    payload={'version':2,'updatedAt':now.isoformat().replace('+00:00','Z'),'source':'Bybit V5 USDT perpetual',
             'assets':assets,'notes':'USDT-settled linear perpetual futures from Bybit. No synthetic candles; verify usage rights.'}
    target=BASE/'historical-candles.json';tmp=target.with_suffix('.json.tmp')
    tmp.write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
    tmp.replace(target)
    print('Published',[(symbol,list(frames)) for symbol,frames in assets.items()])

if __name__=='__main__':main()
