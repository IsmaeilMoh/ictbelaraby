#!/usr/bin/env python3
"""Publish verified Binance spot crypto OHLC candles; never generate synthetic prices.
V2 includes multiple intervals. Only publishes received, contiguous, closed bars.
The project must review exchange redistribution terms prior to production/commercial use.
"""
import datetime as dt
import json
import pathlib
import urllib.parse
import urllib.request

BASE=pathlib.Path(__file__).resolve().parents[1]
HOSTS=('https://data-api.binance.vision/api/v3/klines','https://api.binance.com/api/v3/klines')
SYMBOLS={'BTCUSDT':'BTCUSDT','ETHUSDT':'ETHUSDT','SOLUSDT':'SOLUSDT','BNBUSDT':'BNBUSDT','XRPUSDT':'XRPUSDT'}
INTERVALS={'5m':300,'15m':900,'1h':3600,'4h':14400,'1d':86400}

def get(symbol, interval, now_ms):
    errors=[]
    for endpoint in HOSTS:
        try:
            url=endpoint+'?'+urllib.parse.urlencode({'symbol':symbol,'interval':interval,'limit':1000})
            req=urllib.request.Request(url,headers={'User-Agent':'ICTArabic research data client'})
            with urllib.request.urlopen(req,timeout=16) as response:
                data=json.load(response)
            if not isinstance(data,list):raise ValueError('Bad API response')
            rows=[]
            for value in data:
                if not isinstance(value,list) or len(value)<7:continue
                if int(value[6])>=now_ms:continue  # discard unclosed candles
                stamp=int(value[0]); o,h,l,c=map(float,value[1:5])
                if min(o,h,l,c)<=0 or h<max(o,c,l) or l>min(o,c,h):raise ValueError('Invalid OHLC')
                when=dt.datetime.fromtimestamp(stamp/1000,dt.timezone.utc).isoformat().replace('+00:00','Z')
                rows.append([when,o,h,l,c])
            if len(rows)<600:raise ValueError('Too few closed candles')
            step=INTERVALS[interval]*1000
            if any(int(dt.datetime.fromisoformat(rows[i][0].replace('Z','+00:00')).timestamp()*1000)-int(dt.datetime.fromisoformat(rows[i-1][0].replace('Z','+00:00')).timestamp()*1000)!=step for i in range(1,len(rows))):
                raise ValueError('Noncontiguous observations')
            return rows
        except Exception as exc:errors.append(f'{endpoint}: {exc}')
    raise RuntimeError('; '.join(errors))

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
    payload={'version':2,'updatedAt':now.isoformat().replace('+00:00','Z'),'source':'Binance spot public API',
             'assets':assets,'notes':'Spot USDT market reference, NOT USD forex, gold, CFD or perpetual futures. No synthetic candles; verify usage rights.'}
    target=BASE/'historical-candles.json';tmp=target.with_suffix('.json.tmp')
    tmp.write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
    tmp.replace(target)
    print('Published',[(symbol,list(frames)) for symbol,frames in assets.items()])

if __name__=='__main__':main()
