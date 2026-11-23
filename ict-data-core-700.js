/* ICT بالعربي — Data Foundation 7.0 phase 1.
 * Read-only public data adapter. No execution signals, keys or personal records.
 */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object' && module.exports) module.exports=api;
  if(root) root.ICTDataCore=Object.freeze(api);
})(typeof globalThis!=='undefined'?globalThis:null,function(){
 'use strict';
 const VERSION='7.0-p1';
 const SOURCES=Object.freeze([
  {id:'movers',file:'market-movers.json',kind:'quotes',label:'لقطات الأسعار',ttl:45*60*1000},
  {id:'calendar',file:'calendar-live.json',kind:'events',label:'الأجندة الحية',ttl:7*24*3600000},
  {id:'calendarNext',file:'calendar-next.json',kind:'events',label:'الأجندة القادمة',ttl:7*24*3600000},
  {id:'official',file:'economic-official.json',kind:'events',label:'نتائج رسمية',ttl:7*24*3600000},
  {id:'news',file:'news-live.json',kind:'news',label:'الأخبار الحديثة',ttl:4*3600000},
  {id:'recommendations',file:'recs.json',kind:'editorial',label:'التوصيات المنشورة',ttl:null},
  {id:'analyses',file:'analyses.json',kind:'editorial',label:'التحليلات المنشورة',ttl:null}
 ]);
 const MAPPING=Object.freeze({GOLD:'XAUUSD',XAU:'XAUUSD',SILVER:'XAGUSD',XAG:'XAGUSD',NASDAQ:'NAS100',NASDAQ100:'NAS100',NDX:'NAS100',US100:'NAS100',USTEC:'NAS100',SP500:'US500',SPX:'US500',SPX500:'US500',US30:'DJ30',DOW:'DJ30',DOWJONES:'DJ30',BTC:'BTCUSD',XBTUSD:'BTCUSD',ETH:'ETHUSD',WTI:'USOUSD',USOIL:'USOUSD',UKOIL:'UKOUSD'});
 const CURRENCIES=Object.freeze({US:'USD',EU:'EUR',GB:'GBP',UK:'GBP',JP:'JPY',AU:'AUD',NZ:'NZD',CA:'CAD',CH:'CHF',CN:'CNY'});
 function s(v){return v==null?'':String(v).trim()}
 function finite(v){if(v===null||v===undefined||s(v)==='')return null;const n=Number(v);return Number.isFinite(n)?n:null}
 function stamp(v){if(v==null||s(v)===''||v==='—')return null;if(typeof v==='number'){if(!Number.isFinite(v))return null;const d=new Date(v<1e11?v*1000:v);return Number.isFinite(d.getTime())?d.toISOString():null}const d=new Date(v);return Number.isFinite(d.getTime())?d.toISOString():null}
 function symbol(v){let raw=s(v).toUpperCase().replace(/^(?:FX:|OANDA:|FOREXCOM:|TVC:|BINANCE:|BYBIT:)/,'').replace(/(?:[._-]P|PERP)$/,'').replace(/[\s/._-]/g,'');raw=raw.replace(/(?:USDT|USD)PERP$/,'USD').replace(/USDT$/,'USD');if(!/^[A-Z0-9]{2,22}$/.test(raw))return null;return MAPPING[raw]||raw}
 function currency(v){let raw=s(v).toUpperCase();return CURRENCIES[raw]||raw||null}
 function status(updated,now,ttl){if(!updated)return 'unknown';const t=Date.parse(updated);if(!Number.isFinite(t))return 'invalid';if(t>now+5*60*1000)return 'future';if(ttl===null)return 'dated';return now-t>ttl?'stale':'fresh'}
 function issue(code,detail,level){return {code,detail,level:level||'warning'}}
 function envelope(payload,source){if(Array.isArray(payload))return {rows:payload,updated:null,origin:'منشورات الموقع',notice:[]};if(!payload||typeof payload!=='object')throw Error('BAD_ENVELOPE');const rows=payload.items||payload.events||(source.kind==='editorial'&&payload.records);if(!Array.isArray(rows))throw Error('BAD_COLLECTION');return {rows,updated:stamp(payload.updatedAt||payload.updated_at||payload.updated||payload.generatedAt),origin:s(payload.source||payload.src||'غير محدد'),notice:Array.isArray(payload.fetch_errors)?payload.fetch_errors:[]}}
 function normalizeRow(row,src,updated,now){
  if(!row||typeof row!=='object'||Array.isArray(row))return {bad:true,issues:[issue('ROW_TYPE','السجل ليس كائنًا صالحًا','error')]};
  const errors=[];let rec={kind:src.kind,sourceId:src.id,origin:s(row.source||row.src||''),sourceUrl:s(row.url||''),symbol:null,at:null,fields:{},issues:errors};
  if(src.kind==='quotes'){
   rec.symbol=symbol(row.symbol||row.pair||row.asset);rec.at=stamp(row.quotedAt||row.at||row.time||row.timestamp);
   rec.fields={price:finite(row.price),changePct:finite(row.change),basis:s(row.changeBasis||''),proxy:row.proxy===true};
   if(!rec.symbol)errors.push(issue('SYMBOL_MISSING','رمز الأصل غير معروف','error'));
   if(rec.fields.price===null||rec.fields.price<=0)errors.push(issue('PRICE_INVALID','سعر غير رقمي أو غير موجب','error'));
   if(rec.fields.changePct===null)errors.push(issue('CHANGE_MISSING','نسبة التغير ناقصة'));
   if(rec.fields.proxy)errors.push(issue('PROXY_QUOTE','تسعيرة بديلة؛ لا تُعامل كسعر تنفيذ'));
   if(!rec.at)errors.push(issue('QUOTE_TIME_MISSING','وقت التسعيرة غير متاح','error'));
   rec.freshness=status(rec.at,now,src.ttl);
   if(rec.freshness==='stale'||rec.freshness==='future')errors.push(issue('QUOTE_'+rec.freshness.toUpperCase(),'التسعيرة ليست حديثة',rec.freshness==='future'?'error':'warning'));
   if(rec.freshness==='unknown')errors.push(issue('QUOTE_AGE_UNKNOWN','حداثة التسعيرة غير قابلة للتحقق','error'));
  }else if(src.kind==='events'){
   rec.at=stamp(row.date||row.datetime||row.eventTime||row.timestamp||row.release_time);
   rec.fields={title:s(row.title||row.event||row.name),currency:currency(row.country||row.currency),impact:s(row.impact||row.importance||''),forecast:s(row.forecast||''),actual:s(row.actual||''),previous:s(row.previous||'')};
   if(!rec.at)errors.push(issue('EVENT_TIME_MISSING','وقت الحدث غير صالح','error'));
   if(!rec.fields.title)errors.push(issue('EVENT_TITLE_MISSING','عنوان الحدث مفقود','error'));
   rec.freshness='event';
  }else if(src.kind==='news'){
   rec.at=stamp(row.date||row.published_at||row.publishedAt||row.time);
   rec.fields={title:s(row.title),tag:s(row.tag),summary:s(row.sum||row.summary)};
   if(!rec.fields.title)errors.push(issue('NEWS_TITLE_MISSING','عنوان الخبر ناقص','error'));
   if(!rec.at)errors.push(issue('NEWS_TIME_MISSING','وقت الخبر غير صالح','error'));
   rec.freshness=status(rec.at,now,src.ttl);
  }else{
   rec.symbol=symbol(row.pair||row.symbol||row.asset);rec.at=stamp(row.updated_at||row.published_at||row.date);
   rec.fields={title:s(row.title||row.note),direction:s(row.dir||row.direction),entry:finite(row.entry),stop:finite(row.sl||row.stop),target:finite(row.tp||row.target),recordStatus:s(row.status)};
   if(!rec.symbol)errors.push(issue('SYMBOL_MISSING','رمز المنشور ناقص','error'));
   if(src.id==='recommendations'&&(rec.fields.entry===null||rec.fields.stop===null||rec.fields.target===null))errors.push(issue('LEVELS_INCOMPLETE','المستويات لا تصلح لحساب مخاطرة دون تدقيق'));
   rec.freshness='editorial';
  }
  rec.invalid=errors.some(i=>i.level==='error');
  if(rec.at&&Date.parse(rec.at)>now+5*60*1000&&src.kind!=='events'){
    errors.push(issue('FUTURE_TIMESTAMP','تاريخ السجل في المستقبل','error'));rec.invalid=true;
  }
  return rec;
 }
 function analyze(id,payload,now){
  now=typeof now==='number'?now:Date.now();const src=SOURCES.find(x=>x.id===id);if(!src)throw Error('UNKNOWN_SOURCE');
  const env=envelope(payload,src);const records=env.rows.map(x=>normalizeRow(x,src,env.updated,now));
  const problems=[];if(env.notice.length)problems.push(issue('FETCH_PARTIAL',`أخطاء مصادر فرعية: ${env.notice.length}`));
  const batch=status(env.updated,now,src.ttl);
  if(!env.updated)problems.push(issue('BATCH_TIME_UNKNOWN','وقت تحديث الملف غير موثّق'));
  else if(batch==='stale'||batch==='future')problems.push(issue('BATCH_'+batch.toUpperCase(),'ملف المصدر قديم أو توقيته غير منطقي','error'));
  if(!records.length)problems.push(issue('EMPTY_SOURCE','الملف لا يحتوي على سجلات'));
  const invalid=records.filter(x=>x.invalid||x.bad).length;
  const stale=records.filter(x=>x.freshness==='stale').length;
  const dedup=new Set(),duplicates=[];
  records.forEach((r,i)=>{const key=r.kind==='quotes'?`${r.symbol}|${r.at}`:r.kind==='events'?`${r.fields.currency}|${r.fields.title}|${r.at}`:r.kind==='news'?`${r.fields.title}|${r.at}`:`${r.symbol}|${r.at}|${r.fields.title}`;if(dedup.has(key))duplicates.push(i);else dedup.add(key)});
  if(duplicates.length)problems.push(issue('DUPLICATES',`سجلات متكررة: ${duplicates.length}`));
  const quality=invalid? 'invalid' : (batch==='stale'||batch==='future'||stale? 'stale' : (!env.updated||problems.length?'limited':'usable'));
  return {id,label:src.label,kind:src.kind,origin:env.origin,updatedAt:env.updated,batchState:batch,quality,count:records.length,invalidCount:invalid,staleCount:stale,duplicateCount:duplicates.length,records,issues:problems};
 }
 function normalizeCandles(input,opts){
   opts=opts||{};const now=opts.now||Date.now();const timeframe=s(opts.timeframe||'');const asset=symbol(opts.symbol);
   const arr=Array.isArray(input)?input:(input&&Array.isArray(input.candles)?input.candles:[]);
   const out=[],errors=[];let previous=-Infinity;
   if(!asset)errors.push(issue('CANDLE_SYMBOL','رمز الأصل مطلوب','error'));
   if(!timeframe)errors.push(issue('CANDLE_TIMEFRAME','الإطار الزمني مطلوب','error'));
   for(let i=0;i<arr.length;i++){
    const r=arr[i];if(!r||typeof r!=='object'){errors.push(issue('CANDLE_FORMAT',`شمعة ${i+1} غير صالحة`,'error'));continue}
    const at=stamp(r.time||r.timestamp||r.t||r.date),o=finite(r.open??r.o),h=finite(r.high??r.h),l=finite(r.low??r.l),c=finite(r.close??r.c),v=finite(r.volume??r.v);
    const ts=at?Date.parse(at):NaN;
    if(!at||![o,h,l,c].every(x=>x!==null)||Math.min(o,h,l,c)<0||h<Math.max(o,c,l)||l>Math.min(o,c,h)||ts<=previous||ts>now+5*60000){errors.push(issue('CANDLE_INVALID',`شمعة ${i+1}: وقت أو OHLC غير صالح أو ترتيب غير تصاعدي`,'error'));continue}
    out.push({symbol:asset,timeframe,at,open:o,high:h,low:l,close:c,volume:v});previous=ts;
   }
   return {symbol:asset,timeframe,count:out.length,records:out,issues:errors,valid:errors.length===0&&out.length>0};
 }
 async function load(id,options){
  options=options||{};const src=SOURCES.find(x=>x.id===id);if(!src)throw Error('UNKNOWN_SOURCE');
  const controller=new AbortController(),timeout=Number.isFinite(options.timeout)?Math.min(Math.max(options.timeout,1000),20000):8000;
  const handle=setTimeout(()=>controller.abort(),timeout);
  try{
   const res=await (options.fetch||fetch)(new URL(src.file,options.baseUrl||document.baseURI).href,{cache:'no-store',signal:controller.signal,headers:{Accept:'application/json'}});
   if(!res.ok)throw Error('HTTP_'+res.status);
   const payload=await res.json();return analyze(id,payload,options.now);
  }finally{clearTimeout(handle)}
 }
 async function checkAll(options){const ids=SOURCES.map(s=>s.id),results=[];let next=0;const workers=Array.from({length:Math.min(3,ids.length)},async()=>{while(next<ids.length){const id=ids[next++];try{results.push(await load(id,options))}catch(e){results.push({id,label:SOURCES.find(s=>s.id===id).label,quality:'unavailable',count:0,invalidCount:0,staleCount:0,issues:[issue('SOURCE_UNAVAILABLE',s(e.message||e),'error')],records:[]})}}});await Promise.all(workers);return ids.map(id=>results.find(r=>r.id===id))}
 return Object.freeze({VERSION,SOURCES,symbol,currency,stamp,finite,status,normalizeRow,analyze,normalizeCandles,load,checkAll});
});
