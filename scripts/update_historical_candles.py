#!/usr/bin/env python3
"""Public BTC/ETH 15m spot candles for research. No synthetic prices.
Data source may become unavailable and publication terms must be reviewed.
"""
import datetime as dt
import json, pathlib, urllib.request, urllib.parse

BASE=pathlib.Path(__file__).resolve().parents[1]
HOSTS=('https://data-api.binance.vision/api/v3/klines', 'https://api.binance.com/api/v3/klines')

def get(symbol):
    errors=[]
    for endpoint in HOSTS:
        try:
            url=endpoint+'?'+urllib.parse.urlencode({'symbol':symbol,'interval':'15m','limit':500})
            req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 (ICTArabic research publication)'})
            with urllib.request.urlopen(req,timeout=16) as r: data=json.load(r)
            if not isinstance(data,list): raise ValueError('Malformed klines')
            rows=[]
            for x in data:
                if not isinstance(x,list) or len(x)<5: continue
                t=dt.datetime.fromtimestamp(int(x[0])/1000,dt.timezone.utc).isoformat().replace('+00:00','Z')
                o,h,l,c=[float(v) for v in x[1:5]]
                if min(o,h,l,c)<=0 or h<max(o,c,l) or l>min(o,c,h): raise ValueError('Bad candle')
                rows.append([t,o,h,l,c])
            if len(rows)<300 or any((dt.datetime.fromisoformat(rows[i][0].replace('Z','+00:00'))-dt.datetime.fromisoformat(rows[i-1][0].replace('Z','+00:00'))).total_seconds()!=900 for i in range(1,len(rows))):
                raise ValueError('Missing or noncontiguous candles')
            return rows
        except Exception as exc:errors.append(str(exc))
    raise RuntimeError('; '.join(errors))

def main():
    assets={}
    for sym,api in [('BTCUSD','BTCUSDT'),('ETHUSD','ETHUSDT')]:
        try:assets[sym]=get(api)
        except Exception as exc:print('WARNING',sym,exc)
    if len(assets)!=2:raise SystemExit('Incomplete public datasets; leaving existing feed untouched')
    now=dt.datetime.now(dt.timezone.utc).isoformat().replace('+00:00','Z')
    payload={'updatedAt':now,'interval':'15m','source':'Binance spot public API','assets':assets,'notes':'Crypto spot USDT reference. Not broker CFD or forex pricing. Public availability and redistribution terms require review.'}
    (BASE/'historical-candles.json').write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
    print('Updated datasets',list(assets))
if __name__=='__main__':main()
