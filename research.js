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
function setting(){return{lookback:number('lookback',3,50,true),structure:number('structure',2,15,true),maxAge:number('sweep-age',0,15,true),rr:number('rr',.5,10),hold:number('hold',1,250,true),fee:number('fee',0,1),slippage:number('slippage-r',0,1),stopMode:$('stop-mode').value,stopBuffer:number('stop-buffer',0,50)/100,requireMss:$('require-mss').checked,requireFvg:$('require-fvg').checked,side:$('trade-side').value,session:$('research-session').value};}
function recentSweep(i,side,opts){let hit=-1,extreme=null;const minAt=Math.max(opts.lookback+1,i-opts.maxAge);for(let k=i;k>=minAt;k--){const prev=bars.slice(k-opts.lookback,k);if(prev.length<opts.lookback)continue;if(side==='long'){const threshold=Math.min(...prev.map(x=>x.low));if(bars[k].low<threshold&&bars[k].close>threshold){hit=k;extreme=bars[k].low;break;}}else{const threshold=Math.max(...prev.map(x=>x.high));if(bars[k].high>threshold&&bars[k].close<threshold){hit=k;extreme=bars[k].high;break;}}}return hit>=0?{hit,extreme}:null;}
const NY_CLOCK = new Intl.DateTimeFormat('en-GB',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
function inSession(time,session){if(session==='all')return true;const parts=NY_CLOCK.formatToParts(new Date(time));const h=Number(parts.find(p=>p.type==='hour')?.value),m=Number(parts.find(p=>p.type==='minute')?.value);if(!Number.isFinite(h+m))return false;const minute=h*60+m;const bounds={london:[120,300],newyork:[420,600],silver:[600,660]}[session];return !!bounds&&minute>=bounds[0]&&minute<bounds[1];}
function signal(i,side,opts){
 if(!inSession(bars[i].time,opts.session))return null;
 // Do not build a signal using pre-closure candles when markets have been shut.
 if(metadata.marketKind && metadata.marketKind!=='crypto'){
  const step=INTERVAL_MS[metadata.timeframe],lower=Math.max(1,i-Math.max(opts.lookback+opts.maxAge+3,opts.structure+3));
  for(let k=lower;k<=i;k++)if(Date.parse(bars[k].time)-Date.parse(bars[k-1].time)>step*1.5)return null;
 }
if(i<Math.max(opts.lookback+opts.maxAge+2,opts.structure+2,4))return null;const sw=recentSweep(i,side,opts);if(!sw)return null;const bar=bars[i],swing=bars.slice(i-opts.structure,i);if(side==='long'){
 if(opts.requireMss&&!(bar.close>Math.max(...swing.map(x=>x.high))))return null;
 if(opts.requireFvg&&!(bar.low>bars[i-2].high))return null;
 const stop=Math.min(...bars.slice(sw.hit,i+1).map(x=>x.low));return{stop,side,signalAt:i,sweepAt:sw.hit};
}
 if(opts.requireMss&&!(bar.close<Math.min(...swing.map(x=>x.low))))return null;
 if(opts.requireFvg&&!(bar.high<bars[i-2].low))return null;
 const stop=Math.max(...bars.slice(sw.hit,i+1).map(x=>x.high));return{stop,side,signalAt:i,sweepAt:sw.hit};}
function backtest(override={}){
 if(!bars.length)throw Error('بيانات الشموع غير متاحة بعد؛ راجع حالة المصدر.');
 const opts={...setting(),...override};
 if(opts.session!=='all'&&metadata.timeframe==='1d')throw Error('لا يمكن تطبيق Kill Zones على شموع يومية؛ اختر إطارًا داخل اليوم.');
 const out=[],start=Math.max(opts.lookback+opts.maxAge+3,opts.structure+3,5);
 const sides=opts.side==='both'?['long','short']:[opts.side];
 for(let i=start;i<bars.length-1;){
  let sig=null;for(const side of sides){sig=signal(i,side,opts);if(sig)break;}
  if(!sig){i++;continue;}
  const entryAt=i+1,entry=bars[entryAt].open,side=sig.side;
  const rawStop=opts.stopMode==='signal'?(side==='long'?bars[i].low:bars[i].high):sig.stop;
  const initialRisk=side==='long'?entry-rawStop:rawStop-entry;
  if(!(initialRisk>0&&Number.isFinite(initialRisk))){i++;continue;}
  // Buffer is a fraction of the initial entry-to-stop distance, never future volatility.
  const risk=initialRisk*(1+opts.stopBuffer);
  const stop=side==='long'?entry-risk:entry+risk;
  if(!(stop>0)){i++;continue;}
  const tp=side==='long'?entry+risk*opts.rr:entry-risk*opts.rr;
  if(tp<=0){i++;continue;}
  const last=Math.min(bars.length-1,entryAt+opts.hold-1);
  let closeAt=last,exit=bars[last].close,reason='timeout';
  for(let k=entryAt;k<=last;k++){
   const b=bars[k],slHit=side==='long'?b.low<=stop:b.high>=stop;
   const tpHit=side==='long'?b.high>=tp:b.low<=tp;
   if(slHit){closeAt=k;exit=side==='long'&&b.open<=stop?b.open:side==='short'&&b.open>=stop?b.open:stop;reason=tpHit?'both→SL':'SL';break;}
   if(tpHit){closeAt=k;exit=tp;reason='TP';break;}
  }
  const gross=(side==='long'?exit-entry:entry-exit)/risk;
  out.push({side,signalTime:bars[i].time,entryTime:bars[entryAt].time,exitTime:bars[closeAt].time,entry,stop,tp,exit,grossR:gross,netR:gross-opts.fee-opts.slippage,reason,sweepTime:bars[sig.sweepAt].time});
  i=Math.max(i+1,closeAt+1);
 }
 return out;
}
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
 if(metadata.marketKind==='index')warning.push('المؤشر هنا مرجع نقدي وليس عقد وسيط قابلًا للتنفيذ بنفس الأسعار.');
 if(train.length<30||validation.length<30)warning.push('عدد الصفقات في إحدى العينتين أقل من 30؛ الدلالة الإحصائية ضعيفة.');
 if(results.length===0)warning.push('لم تُرصد صفقات تستوفي الشروط المختارة ضمن البيانات المتاحة.');
 const header=`<div class="research-coverage"><b>${esc(metadata.symbol||'الأصل')} · ${esc(metadata.timeframe||'15m')}</b><span>${esc(first)} — ${esc(last)} UTC</span><span>${bars.length} شمعة حقيقية · تقسيم زمني 70% / 30%</span></div>`;
 container.innerHTML=header+'<div class="research-samples">'+studyCard('عينة الدراسة — 70% الأولى',train)+studyCard('عينة التحقق — 30% الأخيرة',validation)+'</div>'+
 `<p class="micro-note">التقسيم زمني بحسب وقت الدخول، والقواعد نفسها تطبق على العينتين. لا يُعد اختبارًا مستقلًا تمامًا إذا عدّلت الإعدادات بناءً على نتائج التحقق. تحسب التكاليف المحددة بوحدة R، وتفترض الشموع وحدها ترتيب اللمسات عند الشك.</p>`+
 (warning.length?`<p class="research-warning">${warning.map(esc).join(' ')}</p>`:'');
 $('backtest-trades').innerHTML=results.slice(-40).reverse().map(t=>`<div class="trade-row"><div><b>${t.side==='long'?'شراء':'بيع'} · ${esc(t.reason)}</b><small dir="ltr">${esc(t.entryTime.slice(0,16))}</small></div><strong class="${t.netR>=0?'up':'down'}" dir="ltr">${t.netR>=0?'+':''}${fmt(t.netR,2)} R</strong></div>`).join('');
 $('export-trades').disabled=!results.length;
}
function comparisonCard(title, trades){
 const m=sampleMetrics(trades);return `<div class="research-sample-card"><strong>${esc(title)}</strong><div class="research-sample-metrics"><span>الصفقات: <b>${m.n}</b></span><span>متوسط R: <b>${metricValue(m.expectancy,3,' R')}</b></span><span>نسبة الربح: <b>${metricValue(m.rate,1,'%')}</b></span><span>أقصى تراجع: <b>${metricValue(m.dd,2,' R')}</b></span></div></div>`;
}
function showRuleComparison(){
 const node=$('rule-comparison');if(!node)return;
 if(!bars.length){node.textContent='لا توجد بيانات قابلة للاختبار.';return;}
 const mss=$('require-mss'),fvg=$('require-fvg');
 const before=[mss.checked,fvg.checked];
 let cards=[];
 try{
  for(const [title,a,b] of [['سحب + تأكيد بنيوي + FVG',true,true],['سحب + تأكيد بنيوي فقط',true,false],['سحب + FVG فقط',false,true],['سحب فقط (مرجع)',false,false]]){
   mss.checked=a;fvg.checked=b;
   const trades=backtest(),split=bars[Math.floor(bars.length*.7)].time;
   cards.push(comparisonCard(title+' · عينة التحقق',trades.filter(t=>t.entryTime>=split)));
  }
  node.innerHTML='<p class="micro-note">مقارنة أربع صيغ على نفس الأصل والإطار ونفس التكاليف. النتائج على آخر 30% من الشموع فقط، وقد تتأثر بانحياز الاختيار عند تكرار التجارب. لا تساوي احتمالات نجاح مستقبلية.</p><div class="research-samples">'+cards.join('')+'</div>';
 }finally{[mss.checked,fvg.checked]=before;}
}
$('run-test').addEventListener('click',()=>{try{results=backtest();showResults();$('rule-comparison').textContent='اضغط مقارنة القواعد لرؤية أثر تغيير التأكيدات.';$('risk-sensitivity').textContent='اضغط اختبار الحساسية لمراجعة تغير النتائج مع الوقف والهدف.';$('research-stability').textContent='اضغط فحص الاستقرار لتحليل توزيع النتائج على الفترات التاريخية.';$('walk-forward-results').textContent='اضغط تشغيل Walk-Forward بعد اختيار القواعد والبيانات.';$('market-regime-results').textContent='اضغط تحليل ظروف السوق لعرض النتائج حسب الجلسات والتقلب والاتجاه.';}catch(e){results=[];setStatus('data-status',e.message,true);$('export-trades').disabled=true;}});
function compareRiskSensitivity(){
 const node=$('risk-sensitivity');if(!node)return;
 if(bars.length<50)throw Error('عدد الشموع غير كافٍ لاختبار الحساسية.');
 const opts=setting(), split=bars[Math.floor(bars.length*.7)].time;
 const targetSet=[Math.max(.5,Math.round((opts.rr-.5)*4)/4),opts.rr,Math.min(10,Math.round((opts.rr+.5)*4)/4)];
 const buffers=[0,opts.stopBuffer,Math.min(.5,opts.stopBuffer+.1)];
 const cases=[],seen=new Set();
 for(const rr of targetSet)for(const stopBuffer of buffers){
  const key=rr.toFixed(2)+':'+stopBuffer.toFixed(3);if(seen.has(key))continue;seen.add(key);
  const trades=backtest({rr,stopBuffer}).filter(t=>t.entryTime>=split);
  const m=sampleMetrics(trades);
  cases.push({rr,stopBuffer,m});
 }
 const sufficient=cases.every(c=>c.m.n>=30);
 node.innerHTML=`<p class="micro-note">حساسية نتيجة آخر 30% من الشموع لتعديل الهدف وهامش الوقف. نفس تعريف الإشارات والتكاليف في جميع التجارب. هذه ليست محاكاة سبريد فعلي ولا اختيارًا تلقائيًا لأفضل استراتيجية.</p>`+
 `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;text-align:right;font-size:.87rem"><thead><tr><th>الهدف</th><th>هامش الوقف</th><th>الصفقات</th><th>متوسط R</th><th>أقصى تراجع</th></tr></thead><tbody>`+
 cases.map(c=>`<tr><td dir="ltr">1:${fmt(c.rr,2)}</td><td>${fmt(c.stopBuffer*100,1)}%</td><td>${c.m.n}</td><td dir="ltr">${metricValue(c.m.expectancy,3,' R')}</td><td dir="ltr">${metricValue(c.m.dd,2,' R')}</td></tr>`).join('')+`</tbody></table></div>`+
 (!sufficient?'<p class="research-warning">بعض التجارب أقل من 30 صفقة؛ لا تُستخدم للمفاضلة الإحصائية. جرّب بيانات تاريخية أطول.</p>':'<p class="micro-note">التكرار في ضبط الخيارات على هذه العينة يسبب انحياز الاختيار؛ اترك فترة أخرى للتحقق المستقل.</p>');
}
$('compare-risk').addEventListener('click',()=>{try{compareRiskSensitivity();}catch(e){setStatus('data-status',e.message,true);}});
$('compare-rules').addEventListener('click',()=>{try{showRuleComparison();}catch(e){setStatus('data-status',e.message,true);}});

// 6.9.02: Observed-sample diagnostics, not a forecast or optimization selector.
// Wilson interval is defined for binary outcomes only; it is NOT a confidence band for expectancy.
function wilson95(successes,n){
 if(!n)return null;
 const z=1.95996398454,p=successes/n,den=1+z*z/n;
 const mid=(p+z*z/(2*n))/den;
 const half=z*Math.sqrt((p*(1-p)+z*z/(4*n))/n)/den;
 return [Math.max(0,100*(mid-half)),Math.min(100,100*(mid+half))];
}
function stabilityDiagnostics(trades,candles){
 if(!candles.length)return {segments:[],n:0,warnings:['لا توجد بيانات تاريخية كافية.']};
 const limits=[0,Math.floor(candles.length/3),Math.floor(2*candles.length/3),candles.length];
 const segments=[];
 for(let j=0;j<3;j++){
  const first=candles[limits[j]],last=candles[limits[j+1]-1];
  if(!first||!last)continue;
  const start=first.time,end=j===2?null:candles[limits[j+1]].time;
  // A trade is attributed to its ENTRY segment; separate exit overlap is disclosed.
  const group=trades.filter(t=>t.entryTime>=start&&(end===null||t.entryTime<end));
  const m=sampleMetrics(group);
  const win=wilson95(m.wins,m.n);
  segments.push({start:first.time,end:last.time,m,win});
 }
 const n=trades.length,winCount=trades.filter(t=>t.netR>0).length;
 const allWin=wilson95(winCount,n);
 const warnings=[];
 if(candles.length<1000)warnings.push('أقل من 1000 شمعة في الفترة المختارة؛ نطاق السوق المدروس محدود.');
 if(n<30)warnings.push('أقل من 30 صفقة إجمالًا؛ أي نسبة ربح أو متوسط R عرضة لتقلب كبير.');
 if(segments.some(s=>s.m.n<15))warnings.push('توجد فترة تحتوي أقل من 15 صفقة؛ لا يمكن تقييم ثبات الأداء بين الفترات بثقة.');
 const populated=segments.filter(s=>s.m.n>0);
 if(populated.length<3)warnings.push('لم تظهر صفقات في الفترات الثلاث جميعها، لذا لا يمكن المقارنة الزمنية المتوازنة.');
 if(populated.some(s=>s.m.expectancy>0)&&populated.some(s=>s.m.expectancy<0))warnings.push('تغيرت إشارة متوسط R بين الفترات؛ النتائج ليست مستقرة تاريخيًا ضمن هذه العينة.');
 // Measuring concentration without classifying future profitability.
 const positive=segments.filter(s=>s.m.net>0).reduce((a,s)=>a+s.m.net,0);
 const largest=segments.reduce((a,s)=>Math.max(a,s.m.net),0);
 const concentration=positive>0?largest/positive:null;
 if(concentration!==null&&concentration>.7)warnings.push('أكثر من 70% من مجموع أرباح الفترات الرابحة يأتي من فترة واحدة؛ النتيجة شديدة التركّز زمنيًا.');
 if(trades.some(t=>t.entryTime<t.exitTime&&segments.some(s=>t.entryTime>=s.start&&t.entryTime<=s.end&&t.exitTime>s.end)))warnings.push('بعض الصفقات امتدت عبر حدود الفترات؛ نُسبت نتائجها إلى فترة الدخول، لا إلى فترة الخروج.');
 warnings.push('هذا وصف للعينة نفسها، وليس اختبارًا مستقلًا ولا تقديرًا لاحتمال الربح مستقبلًا. نطاق Wilson يفترض ملاحظات ثنائية مستقلة تقريبًا؛ الترابط بين الصفقات قد يجعله ضيقًا أكثر من اللازم.');
 return {segments,n,allWin,concentration,warnings};
}
function showStability(){
 const node=$('research-stability');if(!node)return;
 if(!bars.length){node.textContent='لا توجد بيانات منشورة قابلة للتحليل.';return;}
 const current=backtest(); // recompute from current controls, not stale results
 results=current;showResults();
 const d=stabilityDiagnostics(current,bars);
 const overall=sampleMetrics(current);
 const cols=d.segments.map((s,i)=>{
  const title=['الثلث الزمني الأول','الثلث الزمني الأوسط','الثلث الزمني الأخير'][i];
  return `<div class="research-sample-card"><strong>${title}</strong><div class="research-sample-metrics">`+
  `<span>الفترة: <b dir="ltr">${esc(s.start.slice(0,10))} — ${esc(s.end.slice(0,10))}</b></span>`+
  `<span>الصفقات: <b>${s.m.n}</b></span>`+
  `<span>متوسط R: <b>${metricValue(s.m.expectancy,3,' R')}</b></span>`+
  `<span>صافي R: <b>${metricValue(s.m.net,2,' R')}</b></span>`+
  `<span>أقصى تراجع: <b>${metricValue(s.m.dd,2,' R')}</b></span>`+
  `<span>نطاق 95% لنسبة الفوز: <b>${s.win?fmt(s.win[0],1)+'% – '+fmt(s.win[1],1)+'%':'غير محدد'}</b></span></div></div>`;
 });
 node.innerHTML=`<div class="card-head"><h3>فحص استقرار النتائج عبر التاريخ</h3><span class="tag">تشخيص وصفي</span></div>`+
 `<p class="micro-note">الثلثات متساوية في عدد الشموع، لا في عدد الصفقات. الإحصاءات مبنية على صفقات دخلت داخل كل فترة. التكاليف كما ضُبطت في محرك الاختبار، وأي نقص في المصدر يؤثر في الاستنتاج.</p>`+
 `<p class="micro-note">إجمالي الصفقات: <b>${d.n}</b> · متوسط العينة: <b>${metricValue(overall.expectancy,3,' R')}</b> · نطاق Wilson التقريبي 95% لنسبة الصفقات الرابحة: <b>${d.allWin?fmt(d.allWin[0],1)+'% – '+fmt(d.allWin[1],1)+'%':'غير محدد'}</b>.</p>`+
 `<div class="research-samples">${cols.join('')}</div>`+
 `<p class="research-warning">${d.warnings.map(esc).join(' ')}</p>`;
}
$('check-stability').addEventListener('click',()=>{try{showStability();}catch(e){setStatus('data-status',e.message,true);}});


// 6.9.04: sequential expanding-window Walk-Forward; choose rules from past data only.
const WF_VARIANTS=[
 {name:'سحب + بنية + FVG',requireMss:true,requireFvg:true},
 {name:'سحب + بنية',requireMss:true,requireFvg:false},
 {name:'سحب + FVG',requireMss:false,requireFvg:true},
 {name:'سحب فقط',requireMss:false,requireFvg:false}
];
function walkForwardEvaluate(candles,traces){
 const limits=[0,.5,.65,.8,1].map(v=>Math.floor(candles.length*v));
 const rounds=[];
 for(let j=1;j<4;j++){
  const trainEnd=candles[limits[j]].time;
  const testEnd=j===3?null:candles[limits[j+1]].time;
  const eligible=traces.map((trades,k)=>{
   // A past trade is eligible for selection only after its exit; never expose a later outcome.
   const training=trades.filter(t=>t.exitTime<trainEnd);
   return {k,training,m:sampleMetrics(training)};
  }).filter(x=>x.m.n>=10);
  // Do not select a winner by a single trade or silently imply adequate training history.
  eligible.sort((a,b)=>b.m.expectancy-a.m.expectancy||a.k-b.k);
  const chosen=eligible[0]||null;
  const testing=chosen?traces[chosen.k].filter(t=>t.entryTime>=trainEnd&&(testEnd===null||t.exitTime<testEnd)):[];
  rounds.push({trainEnd,testEnd,chosen,testing,test:sampleMetrics(testing)});
 }
 return rounds;
}
function showWalkForward(){
 const node=$('walk-forward-results');if(!node)return;
 if(bars.length<300){node.innerHTML='<p class="research-warning">يلزم 300 شمعة على الأقل لتقسيم التاريخ إلى جولات Walk-Forward؛ اختر نطاقًا أوسع.</p>';return;}
 // Compute each rule once without modifying any user's selected controls.
 const traces=WF_VARIANTS.map(v=>backtest({requireMss:v.requireMss,requireFvg:v.requireFvg}));
 const rounds=walkForwardEvaluate(bars,traces);
 const warnings=[];
 const tested=rounds.filter(r=>r.chosen);
 const evaluated=tested.filter(r=>r.test.n>=5);
 if(tested.length<3)warnings.push('تعذر اختيار نموذج في بعض الجولات: كل صيغة احتاجت 10 صفقات تدريب مكتملة على الأقل.');
 if(evaluated.length<3)warnings.push('إحدى جولات التحقق أقل من 5 صفقات أو غير متاحة؛ الاستنتاج الإحصائي ضعيف.');
 if(bars.length<1000)warnings.push('أقل من 1000 شمعة متاحة؛ الفترات قد لا تشمل ظروف سوق متنوعة.');
 if(tested.some(r=>r.test.n<30))warnings.push('تحتوي جولة تحقق واحدة على الأقل أقل من 30 صفقة؛ تجنب الاستنتاج من متوسط R وحده.');
 const cards=rounds.map((r,j)=>{
  const period=r.testEnd?`${r.trainEnd.slice(0,10)} — ${r.testEnd.slice(0,10)}`:`من ${r.trainEnd.slice(0,10)} حتى نهاية البيانات`;
  return `<div class="research-sample-card"><strong>الجولة ${j+1} · بيانات لاحقة</strong><div class="research-sample-metrics"><span>الاختبار: <b dir="ltr">${esc(period)}</b></span><span>الصيغة المنتقاة من التدريب: <b>${r.chosen?esc(WF_VARIANTS[r.chosen.k].name):'لا توجد عينة تدريب كافية'}</b></span><span>صفقات التدريب: <b>${r.chosen?r.chosen.m.n:'—'}</b></span><span>صفقات التحقق: <b>${r.test.n}</b></span><span>متوسط R للتحقق: <b>${metricValue(r.test.expectancy,3,' R')}</b></span><span>صافي R: <b>${r.test.n?metricValue(r.test.net,2,' R'):'غير محدد'}</b></span><span>أقصى تراجع: <b>${r.test.n?metricValue(r.test.dd,2,' R'):'غير محدد'}</b></span></div></div>`;
 }).join('');
 const selectedTrades=rounds.flatMap(r=>r.testing);
 const total=sampleMetrics(selectedTrades);
 node.innerHTML=`<div class="card-head"><h3>التحقق المتتابع Walk-Forward</h3><span class="tag">3 جولات زمنية</span></div>`+
 `<p class="micro-note">تدريب متوسع على أول 50% ثم 65% ثم 80% من الشموع؛ اختبار على الفترات اللاحقة (15%، 15%، 20%). في كل جولة يُختار نموذج التأكيد ذو أعلى متوسط R من <b>صفقات التدريب التي أُغلقت قبل بداية التحقق</b>، بشرط 10 صفقات تدريب على الأقل. الخيارات الأخرى (الوقف، الهدف، الجلسة، التكلفة) ثابتة حسب إعداداتك.</p>`+
 `<div class="research-samples">${cards}</div>`+
 `<p class="micro-note">مجموع صفقات التحقق المحددة: <b>${total.n}</b> · متوسط R: <b>${metricValue(total.expectancy,3,' R')}</b>. لا توجد نتائج مستقبلية أو أسعار افتراضية؛ تُستبعد الصفقة التي يتجاوز خروجها نهاية جولة التحقق.</p>`+
 `<p class="research-warning">${esc(warnings.join(' ')||'حتى مع توفر صفقات كافية، النتائج تاريخية ولا تعطي احتمال نجاح مستقبلي.') } التدريب في الجولات اللاحقة يشمل فترات التحقق السابقة؛ هذا تحديث متسلسل مقصود وليس اختبارًا نهائيًا مستقلًا. تكرار تعديل بقية القواعد بعد مشاهدة النتائج يؤدي إلى انحياز الاختيار. تكاليف التنفيذ تقديرية بوحدة R، والشموع لا تكشف ترتيب اللمسات داخل الشمعة.</p>`;
}
$('run-walk-forward').addEventListener('click',()=>{try{showWalkForward();}catch(e){setStatus('data-status',e.message,true);}});

// 6.9.05: Descriptive market-regime diagnostics. All indicators only use CLOSED
// candles strictly BEFORE a trade's entry; no information from future candles.
function previousMarketState(entryIndex){
 if(entryIndex<55)return null;
 const prior=bars.slice(entryIndex-55,entryIndex);
 if(prior.length!==55)return null;
 const last=prior.at(-1).close;
 const mean=n=>prior.slice(-n).reduce((sum,b)=>sum+b.close,0)/n;
 const sma20=mean(20),sma50=mean(50);
 // Prior ATR(14), using each closed candle and its predecessor.
 let trSum=0;
 for(let j=prior.length-14;j<prior.length;j++){
  const b=prior[j],prev=prior[j-1];
  trSum+=Math.max(b.high-b.low,Math.abs(b.high-prev.close),Math.abs(b.low-prev.close));
 }
 const atrPct=100*(trSum/14)/last;
 if(!Number.isFinite(atrPct)||atrPct<0)return null;
 const gap=.001; // 0.10% SMA separation, fixed and not optimized.
 const diff=(sma20-sma50)/last;
 const trend=diff>gap?'up':diff< -gap?'down':'flat';
 return {atrPct,trend};
}
function observedSession(time){
 const parts=NY_CLOCK.formatToParts(new Date(time));
 const h=Number(parts.find(p=>p.type==='hour')?.value);
 const m=Number(parts.find(p=>p.type==='minute')?.value);
 const minutes=h*60+m;
 if(minutes>=120&&minutes<300)return 'london';
 if(minutes>=420&&minutes<600)return 'newyork';
 if(minutes>=600&&minutes<660)return 'silver';
 return 'other';
}
function marketRegimeDiagnostics(trades,candles){
 const byTime=new Map(candles.map((b,i)=>[b.time,i]));
 const observed=[],skipped=[];
 for(const t of trades){
  const i=byTime.get(t.entryTime);
  if(i===undefined){skipped.push(t);continue;}
  const state=previousMarketState(i);
  if(!state){skipped.push(t);continue;}
  observed.push({trade:t,state,session:observedSession(t.entryTime)});
 }
 const sorted=observed.map(o=>o.state.atrPct).sort((a,b)=>a-b);
 // Entire observed sample defines these tertiles. EXPLORATORY ONLY, not an
 // ex-ante volatility signal or an independent prediction threshold.
 const lower=sorted.length?sorted[Math.floor((sorted.length-1)/3)]:null;
 const upper=sorted.length?sorted[Math.floor(2*(sorted.length-1)/3)]:null;
 const volatility=o=>o.state.atrPct<=lower?'low':o.state.atrPct<=upper?'mid':'high';
 const categories={
  sessions:[['london','London Kill Zone'],['newyork','New York Kill Zone'],['silver','NY Silver Bullet'],['other','خارج الجلسات المحددة']],
  volatility:[['low','تقلب أقل'],['mid','تقلب متوسط'],['high','تقلب أعلى']],
  trends:[['up','اتجاه صاعد'],['down','اتجاه هابط'],['flat','اتجاه عرضي']]
 };
 const subsets=(items,key)=>items.map(([id,label])=>({label,trades:observed.filter(o=>(key==='volatility'?volatility(o):key==='trends'?o.state.trend:o.session)===id).map(o=>o.trade)}));
 return {n:observed.length,skipped:skipped.length,lower,upper,
  sessions:subsets(categories.sessions,'sessions'),volatility:subsets(categories.volatility,'volatility'),trends:subsets(categories.trends,'trends')};
}
function showMarketRegimes(){
 const node=$('market-regime-results');if(!node)return;
 if(!bars.length){node.textContent='لا تتوفر شموع صالحة لتحليل ظروف السوق.';return;}
 if(bars.length<100){node.textContent='يحتاج التحليل 100 شمعة على الأقل؛ وسّع الفترة التاريخية.';return;}
 const trades=backtest();
 const d=marketRegimeDiagnostics(trades,bars);
 const section=(heading,groups)=>`<h4 style="margin:14px 0 8px">${esc(heading)}</h4>`+
 `<div class="research-samples">${groups.map(g=>{
  const m=sampleMetrics(g.trades);
  return `<div class="research-sample-card"><strong>${esc(g.label)}</strong>`+
  `<div class="research-sample-metrics"><span>الصفقات: <b>${m.n}</b></span>`+
  `<span>متوسط R: <b>${metricValue(m.expectancy,3,' R')}</b></span>`+
  `<span>نسبة الفوز: <b>${metricValue(m.rate,1,'%')}</b></span>`+
  `<span>أقصى تراجع: <b>${m.n?metricValue(m.dd,2,' R'):'غير محدد'}</b></span></div>`+
  `${m.n<15?'<p class="research-warning">أقل من 15 صفقة؛ عينة ضعيفة للمقارنة.</p>':''}</div>`;
 }).join('')}</div>`;
 const notices=[];
 if(d.skipped)notices.push(`استُبعدت ${d.skipped} صفقة لا تتوفر قبل دخولها 55 شمعة كاملة أو توقيتها غير موجود.`);
 if(d.n<30)notices.push('أقل من 30 صفقة قابلة للتصنيف؛ لا تستنتج أفضل ظروف للتداول.');
 if(metadata.timeframe==='1d')notices.push('الجلسات في الإطار اليومي غير دقيقة؛ لا تستخدم مقارنة الجلسات في هذا الإطار.');
 if(d.volatility.some(g=>g.trades.length<15)||d.trends.some(g=>g.trades.length<15))notices.push('بعض المجموعات تحتوي أقل من 15 صفقة، ولا تصلح لاستنتاج تفوق إحصائي.');
 node.innerHTML=`<div class="card-head"><h3>تحليل ظروف السوق التاريخية</h3><span class="tag">تشخيص لا توقع</span></div>`+
 `<p class="micro-note">${d.n} صفقة مصنفة من ${trades.length} · المصدر ${esc(metadata.source||'غير محدد')} · ${esc(metadata.symbol||'')} ${esc(metadata.timeframe||'')}.</p>`+
 (metadata.timeframe!=='1d'?section('الجلسة حسب توقيت نيويورك (من وقت الدخول)',d.sessions):'')+
 section('التقلب التاريخي عند الدخول',d.volatility)+section('الاتجاه السابق للدخول',d.trends)+
 `<p class="micro-note">التقلب = ATR(14) ÷ إغلاق الشمعة السابقة كنسبة مئوية، ثم توزيع <b>الصفقات المرصودة</b> إلى ثلاثة أثلاث حسب التقلب. الحدود في هذه العينة: ${d.lower===null?'—':fmt(d.lower,3)+'%'} و${d.upper===null?'—':fmt(d.upper,3)+'%'}. الاتجاه = متوسط إغلاق آخر 20 شمعة مقارنة بآخر 50 شمعة؛ عرضي إذا كان الفرق لا يتجاوز 0.10% من السعر. جميع الحسابات تستخدم شموعًا مغلقة قبل الدخول، ولا تؤثر على الصفقات أو قواعد الاختبار.</p>`+
 `<p class="research-warning">${esc(notices.join(' '))} حدود التقلب مشتقة من <b>العينة كاملة</b> لأغراض الوصف؛ ليست حدودًا قابلة للاستخدام المستقبلي دون اختبار مستقل. الفئات قد تتداخل سببيًا مع قواعد الدخول، والاختبارات المتكررة ترفع انحياز اختيار أفضل فئة. لا توجد توصية تداول ولا تنبؤ بالأداء القادم. إغلاق السوق وفجواته قد يؤثران على ATR.</p>`;
}
$('analyze-regimes').addEventListener('click',()=>{try{showMarketRegimes();}catch(e){setStatus('data-status',e.message,true);}});


$('export-trades').addEventListener('click',()=>{if(!results.length)return;const columns=['side','signalTime','entryTime','exitTime','entry','stop','tp','exit','grossR','netR','reason','sweepTime'];download('ict-backtest-trades.csv',[columns.join(','),...results.map(t=>columns.map(k=>String(t[k]).replaceAll(',',' ')).join(','))].join('\r\n'),'text/csv;charset=utf-8');});
// 6.8.98: dataset catalog is taken from verified published arrays; no fictitious forex/CFD prices.
const INTERVAL_MS={'5m':300000,'15m':900000,'1h':3600000,'4h':14400000,'1d':86400000};
const INTERVAL_LABEL={'5m':'5 دقائق','15m':'15 دقيقة','1h':'ساعة','4h':'4 ساعات','1d':'يوم'};
let publicFeed=null,feedBusy=false,loadToken=0,feedSources={},feedMarkets={};
function availableCatalog(feed){
 const catalog={};
 if(feed?.version===2&&['Bybit V5 USDT perpetual','Research verified multi-source'].includes(feed?.source)&&feed?.assets&&typeof feed.assets==='object'){
  for(const [symbol,intervals] of Object.entries(feed.assets)){
   if(!/^[A-Z0-9_]{3,24}$/.test(symbol)||!intervals||typeof intervals!=='object'||Array.isArray(intervals))continue;
   const list=Object.keys(intervals).filter(tf=>INTERVAL_MS[tf]&&Array.isArray(intervals[tf])&&intervals[tf].length>=60);
   if(list.length)catalog[symbol]=list;
  }
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
function setHistoryFailure(message){bars=[];results=[];metadata={};stopReplay();$('backtest-results').textContent='لا يمكن احتساب اختبار دون شموع موثوقة ضمن الفترة المختارة.';$('backtest-trades').textContent='';$('export-trades').disabled=true;$('research-stability').textContent='فحص الاستقرار غير متاح دون بيانات موثوقة.';$('walk-forward-results').textContent='Walk-Forward غير متاح دون بيانات موثوقة.';$('market-regime-results').textContent='تحليل ظروف السوق غير متاح دون بيانات موثوقة.';setStatus('data-status',message,true);drawReplay();}
function applyHistorySelection(){
 const symbol=$('public-history-symbol').value,tf=$('public-history-timeframe').value;
 const raw=sourceRows(symbol,tf),step=INTERVAL_MS[tf],kind=feedMarkets[symbol]||'crypto';
 if(!Array.isArray(raw)||!step)throw Error('هذا الأصل أو الإطار غير منشور من المصدر.');
 if(raw.length<60||raw.length>5000)throw Error('عدد الشموع في المصدر غير مناسب.');
 const valid=loadBars('time,open,high,low,close\n'+raw.map(row=>row.join(',')).join('\n'));
 const gaps=valid.reduce((n,b,i)=>n+(i>0&&Date.parse(b.time)-Date.parse(valid[i-1].time)!==step?1:0),0);
 if(kind==='crypto'&&gaps)throw Error('توجد فجوات زمنية في شموع العملات الرقمية؛ تم رفض الاختبار.');
 // Exchange closures in forex/indices are genuine non-trading intervals, never synthetic bars.
 if(kind!=='crypto'&&valid.some((b,i)=>i>0&&(Date.parse(b.time)-Date.parse(valid[i-1].time)<step||Date.parse(b.time)-Date.parse(valid[i-1].time)>step*120)))throw Error('فجوات زمنية غير مقبولة في مصدر السوق.');
 const from=$('public-history-from').value,to=$('public-history-to').value;
 if(from&&to&&from>to)throw Error('تاريخ البداية يجب أن يسبق تاريخ النهاية.');
 const fromMs=from?Date.parse(from+'T00:00:00Z'):-Infinity;
 const toMs=to?Date.parse(to+'T00:00:00Z')+86400000:Infinity;
 const chosen=valid.filter(b=>{const t=Date.parse(b.time);return t>=fromMs&&t<toMs;});
 $('history-coverage').textContent=`تغطية المصدر المتاحة: ${valid[0].time.slice(0,16)} إلى ${valid.at(-1).time.slice(0,16)} UTC · ${valid.length} شمعة · انقطاعات جلسات/سوق ${gaps}. العمق يعتمد على رصيد المصدر وتغطيته. فترة الاختبار: ${chosen.length} شمعة. لا تتوفر شموع خارج هذه الحدود.`;
 if(chosen.length<60)throw Error('الفترة المحددة تحتوي أقل من 60 شمعة؛ وسّع نطاق التاريخ أو غيّر الإطار.');
 bars=chosen;results=[];metadata={symbol,timeframe:tf,timezone:'UTC',source:feedSources[symbol]?.source||publicFeed.source,updatedAt:feedSources[symbol]?.updatedAt||publicFeed.updatedAt,marketKind:kind};
 $('data-symbol').value=symbol;
 $('backtest-trades').textContent='';$('export-trades').disabled=true;$('research-stability').textContent='اضغط فحص الاستقرار لتحليل البيانات المختارة.';$('walk-forward-results').textContent='اضغط تشغيل Walk-Forward لبدء التحقق المتتابع.';$('market-regime-results').textContent='اضغط تحليل ظروف السوق لعرض التصنيف التاريخي.';resetReplay();
 setStatus('data-status',`تم التحقق من ${bars.length} شمعة حقيقية · ${symbol} · ${tf} · ${metadata.source} · وقت جلب البيانات ${metadata.updatedAt}`);
 results=backtest();showResults();
}
async function readHistoryFile(name,optional=false){
 const response=await fetch(name+'?t='+Date.now(),{cache:'no-store'});
 if(!response.ok){if(optional)return null;throw Error('تعذر الوصول إلى '+name);}
 const feed=await response.json();const age=Date.now()-Date.parse(feed.updatedAt);
 if(!Number.isFinite(age)||age< -600000||age>48*3600000)throw Error('ملف '+name+' قديم أو يفتقد تاريخ تحديث صالح.');
 return feed;
}
async function readBybitHistory(){
 const live=window.ICTLiveFeed;
 if(!live)throw Error('موصل Bybit غير متاح في هذه الصفحة.');
 const assets={};
 const frames={'15m':'15','5m':'5','1h':'60','4h':'240','1d':'D'};
 const now=Date.now();
 let firstFailure;
 for(const [tf,interval] of Object.entries(frames)){
  const step=INTERVAL_MS[tf];
  const group=await Promise.allSettled(live.SYMBOLS.map(async symbol=>{
   const candles=await live.fetchHistory({symbol,interval,limit:1000,now});
   const closed=candles.filter(bar=>bar.confirmed&&bar.start%step===0);
   if(closed.length<60||closed.some((bar,i)=>i>0&&bar.start-closed[i-1].start!==step)){
    throw Error('شموع Bybit المتصلة غير كافية');
   }
   if(now-(closed.at(-1).start+step)>=step)throw Error('آخر شمعة Bybit متأخرة');
   (assets[symbol]??={})[tf]=closed.map(bar=>[bar.at,bar.open,bar.high,bar.low,bar.close]);
  }));
  firstFailure??=group.find(result=>result.status==='rejected')?.reason;
  if(group.every(result=>result.status==='rejected'&&/^BYBIT_(?:HTTP_(?:403|429|451)|CODE_(?:429|10006))$/.test(result.reason?.message)))break;
  // If no contract could be reached in the first group, avoid repeated retries on a disconnected client.
  if(tf==='15m'&&group.every(result=>result.status==='rejected'&&/^(TypeError|AbortError|TimeoutError)$/.test(result.reason?.name)))break;
 }
 if(!Object.keys(assets).length)throw firstFailure||Error('لا توجد شموع مكتملة من Bybit.');
 return {version:2,source:'Bybit V5 USDT perpetual',updatedAt:new Date(now).toISOString(),assets,direct:true};
}
async function loadPublicHistory({refresh=false}={}){
 if(feedBusy)return;
 feedBusy=true;const token=++loadToken;stopReplay();setStatus('data-status','جارٍ قراءة مصادر البيانات والتحقق من شموعها…');
 try{
  // External feed is optional; a failing provider must not disable the crypto feed.
  const [primary,external]=await Promise.allSettled([
   readHistoryFile('historical-candles.json'),readHistoryFile('historical-multi-market.json',true)
  ]);
  let crypto=primary.status==='fulfilled'&&primary.value?.source==='Bybit V5 USDT perpetual'?primary.value:null;
  let directFailure;
  if(refresh&&(!crypto||!Object.keys(availableCatalog(crypto)).length)){
   setStatus('data-status','جارٍ جلب شموع عقود Bybit مباشرة من المتصفح…');
   try{crypto=await readBybitHistory();}catch(error){directFailure=error.message;}
  }
  const cross=external.status==='fulfilled'?external.value:null;
  const validCrypto=crypto?.source==='Bybit V5 USDT perpetual'&&Object.keys(availableCatalog(crypto)).length>0;
  const validCross=cross&&cross.version===2&&cross.source==='Twelve Data time_series'&&cross.assets&&typeof cross.assets==='object';
  const sources={},markets={},assets={};
  if(validCrypto){for(const [name,rows] of Object.entries(crypto.assets)){assets[name]=rows;sources[name]={source:crypto.source,updatedAt:crypto.updatedAt};markets[name]='crypto';}}
  if(validCross){for(const [name,rows] of Object.entries(cross.assets)){
    if(!/^[A-Z0-9_]{3,24}$/.test(name)||!rows||typeof rows!=='object'||Array.isArray(rows))continue;
    const allowed=Object.keys(rows).filter(tf=>INTERVAL_MS[tf]&&Array.isArray(rows[tf])&&rows[tf].length>=60);
    if(!allowed.length)continue;
    assets[name]=Object.fromEntries(allowed.map(tf=>[tf,rows[tf]]));
    sources[name]={source:'Twelve Data time_series',updatedAt:cross.updatedAt};markets[name]=cross.marketKinds?.[name]||'other';
  }}
  const label=$('market-data-provenance');if(label)label.textContent=[validCrypto?(crypto.direct?'شموع عقود Bybit USDT جُلبت من المتصفح مباشرة.':'شموع عقود Bybit USDT متاحة من الملف المنشور.'):'شموع عقود Bybit USDT غير متاحة حاليًا.'+(directFailure?' ('+directFailure+')':' اضغط تحديث بيانات الاختبار لجلبها من المتصفح.'),validCross?'بيانات Twelve Data متاحة بحسب تغطية الأصول.':'بيانات الأسواق الأخرى غير متاحة حاليًا.'].join(' ');
  if(!Object.keys(assets).length)throw Error('لا تتوفر شموع حديثة قابلة للاختبار من المصادر.');
  if(token!==loadToken)return;
  publicFeed={version:2,source:'Research verified multi-source',updatedAt:new Date().toISOString(),assets};feedSources=sources;feedMarkets=markets;
  updateCatalog();try{applyHistorySelection();}catch(e){setHistoryFailure(e.message);}
 }catch(error){publicFeed=null;setHistoryFailure('البيانات غير متاحة تلقائيًا: '+error.message);}
 finally{feedBusy=false;}
}
function useExistingHistory(){try{if(!publicFeed){setHistoryFailure('لم تُحمّل بيانات المصدر بعد.');return;}applyHistorySelection();}catch(e){setHistoryFailure(e.message);}}
$('public-history-symbol').addEventListener('change',()=>{updateCatalog();useExistingHistory();});
$('public-history-timeframe').addEventListener('change',useExistingHistory);
$('public-history-from').addEventListener('change',useExistingHistory);
$('public-history-to').addEventListener('change',useExistingHistory);
$('refresh-public-history').addEventListener('click',()=>loadPublicHistory({refresh:true}));
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
// Read-only integration bridge for the 6.9.14 guided research experience.
// Returns copies so the presentation cannot mutate the simulation state.
window.ICTResearchBridge={
 snapshot:()=>({bars:bars.map(b=>({...b})),trades:results.map(t=>({...t})),metadata:{...metadata},replayAt,patterns:patterns.map(p=>({...p}))}),
 options:()=>({...setting()}),
 simulate:(changes={})=>backtest(changes).map(t=>({...t})),
};
renderPatterns();drawReplay();
})();
