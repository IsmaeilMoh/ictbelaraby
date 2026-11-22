#!/usr/bin/env python3
"""Informational historical daily closes for ICT Market X-Ray.
Unofficial Yahoo Finance chart. No estimates, no fabricated fallback; data may be delayed.
"""
import concurrent.futures
import datetime as dt
import json
import math
import urllib.parse
import urllib.request
from pathlib import Path

FEEDS = {
 "XAUUSD": ("GC=F", True), "EURUSD": ("EURUSD=X", False),
 "USDJPY": ("JPY=X", False), "NAS100": ("^NDX", False),
 "SP500": ("^GSPC", False), "BTCUSD": ("BTC-USD", False),
 "ETHUSD": ("ETH-USD", False), "GBPUSD": ("GBPUSD=X", False),
 "USDCHF": ("CHF=X", False), "WTI": ("CL=F", True),
 "DXY": ("DX-Y.NYB", False), "US10Y": ("^TNX", True)
}

def fetch_one(pair):
    symbol, (ticker, proxy) = pair
    suffix = '/v8/finance/chart/'+urllib.parse.quote(ticker,safe='')+'?interval=1d&range=3mo'
    error = None
    for host in ('query1.finance.yahoo.com','query2.finance.yahoo.com'):
        req=urllib.request.Request('https://'+host+suffix,headers={'User-Agent':'Mozilla/5.0','Accept':'application/json'})
        try:
            with urllib.request.urlopen(req, timeout=15) as f: data=json.load(f)
            result=(data.get('chart',{}).get('result') or [None])[0]
            if not result: raise ValueError('Missing chart')
            closes=((result.get('indicators') or {}).get('quote') or [{}])[0].get('close') or []
            timestamps=result.get('timestamp') or []
            days={}
            for t,v in zip(timestamps,closes):
                if v is None: continue
                v=float(v)
                if not math.isfinite(v) or v<=0:continue
                day=dt.datetime.fromtimestamp(int(t),dt.timezone.utc).strftime('%Y-%m-%d')
                days[day]=round(v,8)
            points=[{'date':date,'close':value} for date,value in sorted(days.items())][-62:]
            if len(points)<12:raise ValueError('Insufficient prices')
            return {'symbol':symbol,'ticker':ticker,'proxy':proxy,'points':points}
        except Exception as exc: error=exc
    raise RuntimeError(str(error))

def build():
    items=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        jobs={pool.submit(fetch_one,p):p[0] for p in FEEDS.items()}
        for job in concurrent.futures.as_completed(jobs):
            try:items.append(job.result())
            except Exception as exc:print('UNAVAILABLE',jobs[job],exc)
    if len(items)<4:raise RuntimeError('Not enough instruments; preserve previous published file')
    items.sort(key=lambda row:list(FEEDS).index(row['symbol']))
    payload={'updatedAt':dt.datetime.now(dt.timezone.utc).isoformat().replace('+00:00','Z'),
      'source':'Yahoo Finance public chart (unofficial, delayed)',
      'interval':'1d','comparison':'Daily close-to-close returns with matching UTC dates',
      'items':items}
    out=Path(__file__).resolve().parents[1]/'market-xray.json'
    out.write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf8')
    print('Wrote',len(items),'instruments to',out)

if __name__=='__main__':build()
