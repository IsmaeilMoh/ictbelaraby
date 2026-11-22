'use strict';
(() => {
const $=id=>document.getElementById(id), esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STORE='ict-research-patterns-v1';
let bars=[], results=[], replayAt=0, replayTimer=null, patterns=readPatterns(), metadata={};
function setStatus(id,message,bad=false){const n=$(id);if(n){n.textContent=message;n.style.color=bad?'#ff95a4':'#a9e6ce';}}
function download(name,content,type='text/plain;charset=utf-8'){const blob=new Blob(['\ufeff',content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500);}
function parseCSV(text){const records=[];let row=[],field='',quoted=false;for(let k=0;k<text.length;k++){const c=text[k];if(quoted){if(c==='"'&&text[k+1]==='"'){field+='"';k++;}else if(c==='"')quoted=false;else field+=c;}else if(c==='"')quoted=true;else if(c===','){row.push(field.trim());field='';}else if(c==='\n'||c==='\r'){if(c==='\r'&&text[k+1]==='\n')k++;row.push(field.trim());field='';if(row.some(x=>x!==''))records.push(row);row=[];}else field+=c;}if(quoted)throw Error('علامة اقتباس غير مغلقة في ملف CSV.');row.push(field.trim());if(row.some(x=>x!==''))records.push(row);return records;}
function cleanDate(v){const d=new Date(v);if(!Number.isFinite(d.getTime())||!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(v))throw Error('وقت الشمعة غير صالح أو لا يوضح المنطقة الزمنية: '+v);return d.toISOString();}
function loadBars(content){const records=parseCSV(content.replace(/^\ufeff/,''));if(records.length<21)throw Error('يلزم 20 شمعة على الأقل مع صف العناوين.');if(records.length>20001)throw Error('الحد الأقصى 20 ألف شمعة.');const names=records[0].map(x=>x.toLowerCase().replace(/\s/g,''));const get=k=>names.indexOf(k);for(const k of ['time','open','high','low','close'])if(get(k)<0)throw Error('عمود مفقود: '+k);const res=[];for(let j=1;j<records.length;j++){const r=records[j];const time=cleanDate(r[get('time')]);const nums=['open','high','low','close'].map(k=>Number(r[get(k)]));if(nums.some((n,idx)=>!r[get(['open','high','low','close'][idx])]||!Number.isFinite(n)||n<=0))throw Error('سعر غير صالح في الصف '+(j+1));const [open,high,low,close]=nums;if(high<Math.max(open,close,low)||low>Math.min(open,close,high))throw Error('OHLC غير متسق في الصف '+(j+1));if(res.length&&time<=res[res.length-1].time)throw Error('يجب أن تكون الشموع مرتبة زمنيًا دون تكرار، عند الصف '+(j+1));res.push({time,open,high,low,close});}return res;}
function fmt(n,d=3){return Number(n).toLocaleString('en-US',{maximumFractionDigits:d});}
function number(id,min,max,integer=false){const v=Number($(id).value);if(!Number.isFinite(v)||v<min||v>max||(integer&&!Number.isInteger(v)))throw Error('قيمة غير صالحة: '+id);return v;}
function setting(){return{lookback:number('lookback',3,50,true),structure:number('structure',2,15,true),maxAge:number('sweep-age',0,15,true),rr:number('rr',.5,10),hold:number('hold',1,250,true),fee:number('fee',0,1),side:$('trade-side').value};}
function recentSweep(i,side,opts){let hit=-1,extreme=null;const minAt=Math.max(opts.lookback+1,i-opts.maxAge);for(let k=i;k>=minAt;k--){const prev=bars.slice(k-opts.lookback,k);if(prev.length<opts.lookback)continue;if(side==='long'){const threshold=Math.min(...prev.map(x=>x.low));if(bars[k].low<threshold&&bars[k].close>threshold){hit=k;extreme=bars[k].low;break;}}else{const threshold=Math.max(...prev.map(x=>x.high));if(bars[k].high>threshold&&bars[k].close<threshold){hit=k;extreme=bars[k].high;break;}}}return hit>=0?{hit,extreme}:null;}
function signal(i,side,opts){if(i<Math.max(opts.lookback+opts.maxAge+2,opts.structure+2,4))return null;const sw=recentSweep(i,side,opts);if(!sw)return null;const bar=bars[i],swing=bars.slice(i-opts.structure,i);if(side==='long'){
 if(!(bar.close>Math.max(...swing.map(x=>x.high))))return null;
 if(!(bar.low>bars[i-2].high))return null;
 const stop=Math.min(...bars.slice(sw.hit,i+1).map(x=>x.low));return{stop,side,signalAt:i,sweepAt:sw.hit};
}
 if(!(bar.close<Math.min(...swing.map(x=>x.low))))return null;
 if(!(bar.high<bars[i-2].low))return null;
 const stop=Math.max(...bars.slice(sw.hit,i+1).map(x=>x.high));return{stop,side,signalAt:i,sweepAt:sw.hit};}
function backtest(){if(!bars.length)throw Error('بيانات الشموع غير متاحة بعد؛ راجع حالة المصدر.');const opts=setting();const out=[];const start=Math.max(opts.lookback+opts.maxAge+3,opts.structure+3,5);const sides=opts.side==='both'?['long','short']:[opts.side];for(let i=start;i<bars.length-1;){let sig=null;for(const side of sides){sig=signal(i,side,opts);if(sig)break;}if(!sig){i++;continue;}const entryAt=i+1,entry=bars[entryAt].open,side=sig.side,risk=side==='long'?entry-sig.stop:sig.stop-entry;if(!(risk>0&&Number.isFinite(risk))){i++;continue;}const tp=side==='long'?entry+risk*opts.rr:entry-risk*opts.rr;if(tp<=0){i++;continue;}const last=Math.min(bars.length-1,entryAt+opts.hold-1);let closeAt=last,exit=bars[last].close,reason='timeout';for(let k=entryAt;k<=last;k++){const b=bars[k];const slHit=side==='long'?b.low<=sig.stop:b.high>=sig.stop;const tpHit=side==='long'?b.high>=tp:b.low<=tp;if(slHit){closeAt=k;exit=b.open<=sig.stop&&side==='long'?b.open:b.open>=sig.stop&&side==='short'?b.open:sig.stop;reason=tpHit?'both→SL':'SL';break;}if(tpHit){closeAt=k;exit=tp;reason='TP';break;}}const gross=(side==='long'?(exit-entry):(entry-exit))/risk;out.push({side,signalTime:bars[i].time,entryTime:bars[entryAt].time,exitTime:bars[closeAt].time,entry,stop:sig.stop,tp,exit,grossR:gross,netR:gross-opts.fee,reason,sweepTime:bars[sig.sweepAt].time});i=Math.max(i+1,closeAt+1);}return out;}
function stats(trades){const wins=trades.filter(x=>x.netR>0),losses=trades.filter(x=>x.netR<=0);const net=trades.reduce((t,x)=>t+x.netR,0);let equity=0,peak=0,maxDD=0;for(const t of trades){equity+=t.netR;peak=Math.max(peak,equity);maxDD=Math.max(maxDD,peak-equity);}const grossPos=trades.reduce((s,x)=>s+Math.max(0,x.netR),0),grossNeg=trades.reduce((s,x)=>s+Math.max(0,-x.netR),0);return[{name:'عدد الصفقات',v:String(trades.length)},{name:'نسبة الصفقات الرابحة',v:fmt(100*wins.length/trades.length,1)+'%'},{name:'صافي العائد',v:fmt(net,2)+' R'},{name:'متوسط الصفقة',v:fmt(net/trades.length,3)+' R'},{name:'أكبر تراجع متسلسل',v:fmt(maxDD,2)+' R'},{name:'Profit Factor',v:grossNeg>0?fmt(grossPos/grossNeg,2):'غير محدد'}];}
function sampleMetrics(trades){
 const n=trades.length, net=trades.reduce((sum,t)=>sum+t.netR,0), wins=trades.filter(t=>t.netR>0).length;
 const positive=trades.reduce((sum,t)=>sum+Math.max(0,t.netR),0),negative=trades.reduce((sum,t)=>sum+Math.max(0,-t.netR),0);
 let equity=0,peak=0,dd=0;for(const t of trades){equity+=t.netR;peak=Math.max(peak,equity);dd=Math.max(dd,peak-equity);}
 return {n,net,wins,rate:n?100*wins/n:null,expectancy:n?net/n:null,pf:negative>0?positive/negative:null,dd};
}
function metricValue(value,digits=2,suffix=''){return value===null||!Number.isFinite(value)?'غير محدد':fmt(value,digits)+suffix;}
function studyCard(name,trades){
 const m=sampleMetrics(trades);
 return `<div class="research-sample-card"><strong>${esc(name)}</strong><div class="research-sample-metrics"><span>الصفقات: <b>${m.n}</b></span><span>نسبة الربح: <b>${metricValue(m.rate,1,'%')}</b></span><span>صافي R: <b>${metricValue(m.net,2,' R')}</b></span><span>متوسط الصفقة: <b>${metricValue(m.expectancy,3,' R')}</b></span><span>معامل الربحية: <b>${metricValue(m.pf)}</b></span><span>أقصى تراجع: <b>${metricValue(m.dd,2,' R')}</b></span></div></div>`;
}
function showResults(){
 const container=$('backtest-results');
 if(!bars.length){container.textContent='لم تصل بيانات تاريخية موثوقة من الموقع.';return;}
 const cut=Math.floor(bars.length*.7),splitDate=bars[cut].time;
 // No boundary leakage: training exits before the split, validation entries after it.
 const train=results.filter(t=>t.exitTime<splitDate),validation=results.filter(t=>t.entryTime>=splitDate);
 const first=bars[0].time.slice(0,16).replace('T',' '),last=bars.at(-1).time.slice(0,16).replace('T',' ');
 const warning=[];
 if(bars.length<1000)warning.push('عدد الشموع محدود؛ لا تعتمد على النتائج لاتخاذ قرار تداول.');
 if(train.length<30||validation.length<30)warning.push('عدد الصفقات في إحدى العينتين أقل من 30؛ الدلالة الإحصائية ضعيفة.');
 if(results.length===0)warning.push('لم تُرصد صفقات تستوفي الشروط المختارة ضمن البيانات المتاحة.');
 const header=`<div class="research-coverage"><b>${esc(metadata.symbol||'الأصل')} · ${esc(metadata.timeframe||'15m')}</b><span>${esc(first)} — ${esc(last)} UTC</span><span>${bars.length} شمعة حقيقية · تقسيم زمني 70% / 30%</span></div>`;
 container.innerHTML=header+'<div class="research-samples">'+studyCard('عينة الدراسة — 70% الأولى',train)+studyCard('عينة التحقق — 30% الأخيرة',validation)+'</div>'+
 `<p class="micro-note">التقسيم زمني بحسب وقت الدخول، والقواعد نفسها تطبق على العينتين. لا يُعد اختبارًا مستقلًا تمامًا إذا عدّلت الإعدادات بناءً على نتائج التحقق. تحسب التكاليف المحددة بوحدة R، وتفترض الشموع وحدها ترتيب اللمسات عند الشك.</p>`+
 (warning.length?`<p class="research-warning">${warning.map(esc).join(' ')}</p>`:'');
 $('backtest-trades').innerHTML=results.slice(-40).reverse().map(t=>`<div class="trade-row"><div><b>${t.side==='long'?'شراء':'بيع'} · ${esc(t.reason)}</b><small dir="ltr">${esc(t.entryTime.slice(0,16))}</small></div><strong class="${t.netR>=0?'up':'down'}" dir="ltr">${t.netR>=0?'+':''}${fmt(t.netR,2)} R</strong></div>`).join('');
 $('export-trades').disabled=!results.length;
}
$('run-test').addEventListener('click',()=>{try{results=backtest();showResults();}catch(e){results=[];setStatus('data-status',e.message,true);$('export-trades').disabled=true;}});
$('export-trades').addEventListener('click',()=>{if(!results.length)return;const columns=['side','signalTime','entryTime','exitTime','entry','stop','tp','exit','grossR','netR','reason','sweepTime'];download('ict-backtest-trades.csv',[columns.join(','),...results.map(t=>columns.map(k=>String(t[k]).replaceAll(',',' ')).join(','))].join('\r\n'),'text/csv;charset=utf-8');});
// 6.8.98: dataset catalog is taken from verified published arrays; no fictitious forex/CFD prices.
const INTERVAL_MS={'5m':300000,'15m':900000,'1h':3600000,'4h':14400000,'1d':86400000};
const INTERVAL_LABEL={'5m':'5 دقائق','15m':'15 دقيقة','1h':'ساعة','4h':'4 ساعات','1d':'يوم'};
let publicFeed=null,feedBusy=false,loadToken=0;
function availableCatalog(feed){
 const catalog={};
 if(feed?.version===2&&feed?.source==='Binance spot public API'&&feed?.assets&&typeof feed.assets==='object'){
  for(const [symbol,intervals] of Object.entries(feed.assets)){
   if(!/^[A-Z0-9]{3,15}$/.test(symbol)||!intervals||typeof intervals!=='object'||Array.isArray(intervals))continue;
   const list=Object.keys(intervals).filter(tf=>INTERVAL_MS[tf]&&Array.isArray(intervals[tf])&&intervals[tf].length>=60);
   if(list.length)catalog[symbol]=list;
  }
 } else if(feed?.interval==='15m'&&feed?.source==='Binance spot public API'&&feed?.assets){
  for(const [symbol,data] of Object.entries(feed.assets))if(/^[A-Z0-9]{3,15}$/.test(symbol)&&Array.isArray(data)&&data.length>=60)catalog[symbol]=['15m'];
 }
 return catalog;
}
function updateCatalog(){
 const catalog=availableCatalog(publicFeed),symbolEl=$('public-history-symbol'),tfEl=$('public-history-timeframe');
 const previousSymbol=symbolEl.value,previousTF=tfEl.value;
 const symbols=Object.keys(catalog).sort((a,b)=>a.localeCompare(b));
 symbolEl.replaceChildren(...symbols.map(symbol=>new Option(symbol,symbol)));
 symbolEl.value=symbols.includes(previousSymbol)?previousSymbol:(symbols.includes('BTCUSDT')?'BTCUSDT':(symbols.includes('BTCUSD')?'BTCUSD':symbols[0]||''));
 const frames=(catalog[symbolEl.value]||[]).sort((a,b)=>INTERVAL_MS[a]-INTERVAL_MS[b]);
 tfEl.replaceChildren(...frames.map(tf=>new Option(INTERVAL_LABEL[tf],tf)));
 tfEl.value=frames.includes(previousTF)?previousTF:(frames.includes('15m')?'15m':frames[0]||'');
 $('data-symbol').value=symbolEl.value||'—';
 return symbols.length>0;
}
function sourceRows(symbol,tf){const feed=publicFeed;return feed?.version===2?feed.assets?.[symbol]?.[tf]:feed?.assets?.[symbol];}
function setHistoryFailure(message){bars=[];results=[];metadata={};stopReplay();$('backtest-results').textContent='لا يمكن احتساب اختبار دون شموع موثوقة ضمن الفترة المختارة.';$('backtest-trades').textContent='';$('export-trades').disabled=true;setStatus('data-status',message,true);drawReplay();}
function applyHistorySelection(){
 const symbol=$('public-history-symbol').value,tf=$('public-history-timeframe').value;
 const raw=sourceRows(symbol,tf),step=INTERVAL_MS[tf];
 if(!Array.isArray(raw)||!step)throw Error('هذا الأصل أو الإطار غير منشور من المصدر.');
 if(raw.length<60||raw.length>1500)throw Error('عدد الشموع في المصدر غير مناسب.');
 const valid=loadBars('time,open,high,low,close\n'+raw.map(row=>row.join(',')).join('\n'));
 if(valid.some((b,i)=>i>0&&Date.parse(b.time)-Date.parse(valid[i-1].time)!==step))throw Error('توجد فجوات زمنية في الشموع؛ تم رفض اختبار السلسلة.');
 const from=$('public-history-from').value,to=$('public-history-to').value;
 if(from&&to&&from>to)throw Error('تاريخ البداية يجب أن يسبق تاريخ النهاية.');
 const fromMs=from?Date.parse(from+'T00:00:00Z'):-Infinity;
 const toMs=to?Date.parse(to+'T00:00:00Z')+86400000:Infinity;
 const chosen=valid.filter(b=>{const t=Date.parse(b.time);return t>=fromMs&&t<toMs;});
 $('history-coverage').textContent=`تغطية المصدر المتاحة: ${valid[0].time.slice(0,16)} إلى ${valid.at(-1).time.slice(0,16)} UTC · ${valid.length} شمعة. فترة الاختبار: ${chosen.length} شمعة. لا تتوفر شموع خارج هذه الحدود.`;
 if(chosen.length<60)throw Error('الفترة المحددة تحتوي أقل من 60 شمعة؛ وسّع نطاق التاريخ أو غيّر الإطار.');
 bars=chosen;results=[];metadata={symbol,timeframe:tf,timezone:'UTC',source:publicFeed.source,updatedAt:publicFeed.updatedAt};
 $('data-symbol').value=symbol;
 $('backtest-trades').textContent='';$('export-trades').disabled=true;resetReplay();
 setStatus('data-status',`تم التحقق من ${bars.length} شمعة حقيقية · ${symbol} · ${tf} · ${publicFeed.source} · تحديث الملف ${publicFeed.updatedAt}`);
 results=backtest();showResults();
}
async function loadPublicHistory(){
 if(feedBusy)return;
 feedBusy=true;const token=++loadToken;stopReplay();setStatus('data-status','جارٍ قراءة ملف البيانات العامة والتحقق منه…');
 try{
  const response=await fetch('historical-candles.json?t='+Date.now(),{cache:'no-store'});
  if(!response.ok)throw Error('تعذر الوصول إلى ملف البيانات العامة.');
  const feed=await response.json();
  const age=Date.now()-Date.parse(feed.updatedAt);
  if(!Number.isFinite(age)||age< -600000||age>48*3600000)throw Error('ملف البيانات أقدم من 48 ساعة أو يفتقد تاريخ تحديث صالح.');
  if(!Object.keys(availableCatalog(feed)).length)throw Error('لم ينشر المصدر بيانات مدعومة قابلة للاختبار.');
  if(token!==loadToken)return;
  publicFeed=feed;updateCatalog();
  try{applyHistorySelection();}catch(e){setHistoryFailure(e.message);}
 }catch(error){publicFeed=null;setHistoryFailure('البيانات غير متاحة تلقائيًا: '+error.message);}
 finally{feedBusy=false;}
}
function useExistingHistory(){try{if(!publicFeed){setHistoryFailure('لم تُحمّل بيانات المصدر بعد.');return;}applyHistorySelection();}catch(e){setHistoryFailure(e.message);}}
$('public-history-symbol').addEventListener('change',()=>{updateCatalog();useExistingHistory();});
$('public-history-timeframe').addEventListener('change',useExistingHistory);
$('public-history-from').addEventListener('change',useExistingHistory);
$('public-history-to').addEventListener('change',useExistingHistory);
$('refresh-public-history').addEventListener('click',loadPublicHistory);
loadPublicHistory();
function stopReplay(){if(replayTimer){clearInterval(replayTimer);replayTimer=null;}$('replay-auto').textContent='تشغيل تلقائي';}
function resetReplay(){stopReplay();if(!bars.length){replayAt=0;drawReplay();return;}const start=Number($('replay-start').value);replayAt=Math.max(1,Math.min(bars.length,Number.isFinite(start)?Math.round(start):50));drawReplay();}
function nextReplay(){if(!bars.length){setStatus('replay-message','بيانات الشموع غير متاحة بعد.',true);return;}replayAt=Math.min(bars.length,replayAt+1);drawReplay();if(replayAt>=bars.length)stopReplay();}
$('replay-reset').addEventListener('click',resetReplay);$('replay-next').addEventListener('click',nextReplay);
$('replay-auto').addEventListener('click',()=>{if(replayTimer){stopReplay();return;}if(!bars.length){setStatus('replay-message','بيانات الشموع غير متاحة بعد.',true);return;}$('replay-auto').textContent='إيقاف';replayTimer=setInterval(nextReplay,Number($('replay-speed').value)||800);});$('replay-speed').addEventListener('change',()=>{if(replayTimer){stopReplay();$('replay-auto').click();}});
function drawReplay(){const node=$('replay-chart');if(!bars.length){node.innerHTML='<div class="results-placeholder" style="padding:30px">لا توجد شموع متاحة من مصدر الموقع حاليًا.</div>';$('replay-progress').textContent='لا توجد بيانات';$('replay-clock').textContent='—';return;}const visible=bars.slice(Math.max(0,replayAt-65),replayAt),W=900,H=345,left=19,right=78,top=23,bottom=27;if(!visible.length)return;const min=Math.min(...visible.map(x=>x.low)),max=Math.max(...visible.map(x=>x.high)),margin=(max-min||1)*.07,lo=min-margin,hi=max+margin,plotW=W-left-right,plotH=H-top-bottom;const px=i=>left+(i+.5)*plotW/visible.length,py=v=>top+(hi-v)/(hi-lo)*plotH;const fragments=[];for(let j=0;j<=4;j++){const y=top+j*plotH/4;fragments.push(`<line class="axis" x1="${left}" y1="${y}" x2="${W-right}" y2="${y}"/><text x="${W-6}" y="${y+4}" text-anchor="end">${fmt(hi-j*(hi-lo)/4,5)}</text>`);}const candleW=Math.max(2,Math.min(12,plotW/visible.length*.62));visible.forEach((b,i)=>{const x=px(i),up=b.close>=b.open,color=up?'#67dfad':'#fc8292';fragments.push(`<line x1="${x}" y1="${py(b.high)}" x2="${x}" y2="${py(b.low)}" stroke="${color}" stroke-width="1.8"/><rect x="${x-candleW/2}" y="${Math.min(py(b.open),py(b.close))}" width="${candleW}" height="${Math.max(1,Math.abs(py(b.open)-py(b.close)))}" rx="1" fill="${color}"/>`);});node.innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${fragments.join('')}</svg>`;$('replay-progress').textContent=`مكشوف ${replayAt} من أصل ${bars.length} شمعة`;$('replay-clock').textContent=visible.at(-1).time.replace('T',' ').slice(0,16)+' UTC';}
function readPatterns(){try{const x=JSON.parse(localStorage.getItem(STORE)||'[]');return Array.isArray(x)?x.filter(validPattern).slice(0,200):[]}catch(_){return [];}}
function validPattern(p){return p&&typeof p==='object'&&typeof p.id==='string'&&typeof p.asset==='string'&&typeof p.timeframe==='string'&&typeof p.date==='string'&&typeof p.notes==='string'&&typeof p.setup==='string'&&typeof p.outcome==='string'&&p.asset.length<=18&&p.notes.length<=1000;}
function persist(){try{localStorage.setItem(STORE,JSON.stringify(patterns));return true;}catch(_){setStatus('pattern-message','تعذر حفظ البيانات؛ تحقق من مساحة المتصفح أو صدّر نسخة JSON.',true);return false;}}
function addPattern(p){if(patterns.length>=200){setStatus('pattern-message','وصلت إلى الحد الأقصى (200 نموذج). صدّر بياناتك قبل الحذف.',true);return false;}patterns.unshift(p);if(!persist()){patterns.shift();return false;}renderPatterns();return true;}
$('pattern-form').addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.target),chart=String(f.get('chart')||'').trim();if(chart&&(!/^https:\/\//i.test(chart)||/[<>"']/.test(chart))){setStatus('pattern-message','يجب أن يبدأ الرابط بـ https://.',true);return;}const p={id:'r-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7),asset:String(f.get('asset')||'').trim().slice(0,18),timeframe:String(f.get('timeframe')||'').trim().slice(0,15),date:String(f.get('date')||''),setup:String(f.get('setup')||'').slice(0,60),outcome:String(f.get('outcome')||'').slice(0,30),notes:String(f.get('notes')||'').trim().slice(0,1000),chart:chart.slice(0,400)};if(!p.asset||!p.timeframe||!p.date||!p.notes)return;if(addPattern(p)){e.target.reset();setStatus('pattern-message','تم حفظ النموذج على هذا الجهاز.');}});
$('replay-save').addEventListener('click',()=>{if(!bars.length||!replayAt){setStatus('replay-message','حمّل بيانات المصدر وأظهر شموعًا أولًا.',true);return;}const notes=$('replay-notes').value.trim();if(!notes){setStatus('replay-message','اكتب ملاحظة قبل الحفظ.',true);return;}const when=bars[replayAt-1].time;if(addPattern({id:'replay-'+Date.now().toString(36),asset:metadata.symbol||'غير محدد',timeframe:metadata.timeframe||'غير محدد',date:when.slice(0,10),setup:'مراجعة آلة الزمن',outcome:'قيد الدراسة',notes:notes.slice(0,1000),chart:''})){setStatus('replay-message','حُفظت الملاحظة في مكتبة النماذج على هذا الجهاز.');$('replay-notes').value='';}});
function renderPatterns(){const filter=$('pattern-filter').value;const list=patterns.filter(x=>filter==='all'||x.outcome===filter);$('pattern-count').textContent=patterns.length+' نموذج';$('pattern-list').innerHTML=list.length?list.map(p=>`<article class="pattern-row"><div><b>${esc(p.asset)} · ${esc(p.setup)}</b><small>${esc(p.date)} · ${esc(p.timeframe)} · ${esc(p.outcome)}</small><p>${esc(p.notes)}</p>${/^https:\/\//i.test(p.chart||'')?`<a href="${esc(p.chart)}" target="_blank" rel="noopener noreferrer">فتح الشارت ↗</a>`:''}</div><button class="ghost" data-remove="${esc(p.id)}" type="button">حذف</button></article>`).join(''):'<p class="results-placeholder">لا توجد نماذج في هذا التصنيف. أضف حالة حقيقية أو احفظ ملاحظة من آلة الزمن.</p>';}
$('pattern-filter').addEventListener('change',renderPatterns);$('pattern-list').addEventListener('click',e=>{const b=e.target.closest('[data-remove]');if(!b)return;const id=b.dataset.remove,p=patterns.find(x=>x.id===id);if(!p||!confirm('هل تريد حذف هذا النموذج؟'))return;const old=patterns;patterns=patterns.filter(x=>x.id!==id);if(!persist())patterns=old;renderPatterns();});
$('pattern-export').addEventListener('click',()=>download('ict-pattern-library.json',JSON.stringify({version:1,exported_at:new Date().toISOString(),patterns},null,2),'application/json;charset=utf-8'));
$('pattern-import').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>500000)throw Error('الملف أكبر من الحد المسموح.');const data=JSON.parse(await file.text());if(!data||data.version!==1||!Array.isArray(data.patterns)||data.patterns.length>200||!data.patterns.every(validPattern))throw Error('صيغة النسخة الاحتياطية غير صالحة.');if(!confirm('سيتم دمج النماذج المستوردة مع محفوظاتك الحالية، هل تستمر؟'))return;const existing=new Set(patterns.map(p=>p.id)),add=data.patterns.filter(p=>!existing.has(p.id));if(patterns.length+add.length>200)throw Error('الاستيراد يتجاوز الحد الأقصى للنماذج.');patterns=[...patterns,...add];if(!persist())throw Error('تعذر الحفظ في المتصفح.');renderPatterns();setStatus('pattern-message','تم استيراد '+add.length+' نموذج جديد.');}catch(err){setStatus('pattern-message',err.message,true);}finally{e.target.value='';}});
document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>{const tab=button.dataset.tab;document.querySelectorAll('[data-tab]').forEach(b=>{const on=b===button;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on));});document.querySelectorAll('.panel').forEach(p=>p.hidden=p.id!=='panel-'+tab);if(tab!=='replay')stopReplay();if(tab==='replay')drawReplay();}));
renderPatterns();drawReplay();
})();
