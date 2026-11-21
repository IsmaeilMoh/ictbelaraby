#!/usr/bin/env python3
"""Free US BLS public API -> verified observations, no market forecasts.
Public JSON contains only governmental observations and our derived arithmetic.
"""
import argparse
import datetime as dt
import json
import math
import pathlib
import urllib.request

API = 'https://api.bls.gov/publicAPI/v1/timeseries/data/'
SERIES = ['CUUR0000SA0','CUSR0000SA0','CUSR0000SA0L1E','LNS14000000','CES0000000001','WPSFD4']

def load_bls(timeout=35):
    body=json.dumps({'seriesid':SERIES}).encode('utf-8')
    req=urllib.request.Request(API, data=body,headers={'Content-Type':'application/json','User-Agent':'ICTBelaraby-public-economic-data/1.0 (+https://www.bls.gov/developers/)'},method='POST')
    with urllib.request.urlopen(req,timeout=timeout) as rsp:
        raw=rsp.read(3_000_000)
    data=json.loads(raw)
    if data.get('status')!='REQUEST_SUCCEEDED':
        raise RuntimeError('BLS request failed: '+str(data.get('message','unknown'))[:350])
    return data

def points(item):
    out={}
    for p in item.get('data',[]):
        period=p.get('period','')
        if not (period.startswith('M') and len(period)==3 and period[1:].isdigit() and 1<=int(period[1:])<=12):continue
        try:
            val=float(str(p['value']).replace(',',''))
            year=int(p['year']); month=int(period[1:]); key=f'{year:04d}-{month:02d}'
            if math.isfinite(val):out[key]=val
        except (ValueError,TypeError,KeyError):continue
    return out

def prev_month(period, months=1):
    year,month=map(int,period.split('-')); idx=year*12+month-1-months
    return f'{idx//12:04d}-{idx%12+1:02d}'

def diff(v,base):return round(v-base,3)
def percent(v,base):return round((v/base-1)*100,3) if base else None

def build(payload, retrieved):
    index={s['seriesID']:points(s) for s in payload.get('Results',{}).get('series',[]) if s.get('seriesID') in SERIES}
    mapping=[
      ('CUUR0000SA0','cpi-yoy','CPI العام السنوي','Headline CPI y/y','index-yoy','%'),
      ('CUSR0000SA0','cpi-mom','CPI العام الشهري','Headline CPI m/m','index-mom','%'),
      ('CUSR0000SA0L1E','core-cpi-mom','CPI الأساسي الشهري','Core CPI m/m','index-mom','%'),
      ('LNS14000000','unemployment','معدل البطالة','Unemployment rate','level','%'),
      ('CES0000000001','payroll-change','التغير في الوظائف غير الزراعية','Nonfarm payrolls monthly change','difference','K'),
      ('WPSFD4','ppi-mom','مؤشر أسعار المنتجين الشهري','PPI Final Demand m/m','index-mom','%')
    ]
    events=[]
    for sid,key,title,label,method,unit in mapping:
        p=index.get(sid,{})
        valid=[]
        for period,v in p.items():
            previous=p.get(prev_month(period,12 if method=='index-yoy' else 1))
            if previous is None:continue
            value=(percent(v,previous) if method.startswith('index-') else diff(v,previous) if method=='difference' else v)
            if value is None:continue
            valid.append((period,round(value,3)))
        valid.sort(reverse=True)
        if not valid:continue
        period,actual=valid[0]; prior=valid[1][1] if len(valid)>1 else None
        events.append({'id':'bls-'+key+'-'+period,'indicator':key,'title':title,'titleEn':label,
          'country':'US','currency':'USD','period':period,'actual':actual,'previous':prior,
          'forecast':None,'unit':unit,'seriesId':sid,'source':'BLS','sourceUrl':'https://www.bls.gov/developers/',
          'measurement':method,'note':'الفترة المرجعية للإحصاء، وليست وقت صدور الخبر أو توقع السوق.'})
    if not events:raise RuntimeError('BLS response yielded no usable observations; public file left unchanged')
    return {'schemaVersion':1,'source':'BLS','updatedAt':retrieved,'status':'ok','coverage':'US BLS indicators only',
            'disclaimer':'القيم للفترات المرجعية الرسمية، وليست توقعات سوق أو إشارات تداول. قد تُراجع لاحقًا.',
            'events':events}

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--output',default='economic-official.json');ap.add_argument('--fixture',help='Offline JSON test only')
    args=ap.parse_args();payload=json.loads(pathlib.Path(args.fixture).read_text(encoding='utf-8')) if args.fixture else load_bls()
    result=build(payload,dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds'))
    path=pathlib.Path(args.output);path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('BLS validated indicators:',len(result['events']))
if __name__=='__main__':main()
