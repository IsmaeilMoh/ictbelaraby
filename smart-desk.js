'use strict';
(()=>{
const $=id=>document.getElementById(id), escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const asDate=s=>{const d=new Date(s);return Number.isFinite(d.getTime())?d:null};
const fmt=s=>{const d=asDate(s);return d?d.toLocaleString('ar-u-nu-latn',{dateStyle:'medium',timeStyle:'short'}):'غير متاح'};
const money=n=>Number(n).toLocaleString('en-US',{maximumFractionDigits:2});
const reviewMistakes={none:'لا أخطاء مسجلة','early-entry':'دخول مبكر','moved-stop':'تحريك الوقف','over-risk':'مخاطرة زائدة',news:'تجاهل خبر','early-exit':'خروج مبكر',revenge:'تداول انتقامي',other:'خطأ آخر'};
const reviewAdherence={unreviewed:'غير مقيّم',yes:'ملتزم',partial:'التزام جزئي',no:'لم ألتزم'};
const safeReview=(value,values,fallback)=>Object.prototype.hasOwnProperty.call(values,value)?value:fallback;
const storeKey='ict-trader-dna-v53';let data={},journal=[];
function cleanRow(x){if(!x||typeof x!=='object')return null;const r=Number(x.r);if(!Number.isFinite(r)||Math.abs(r)>100||!/^\d{4}-\d\d-\d\d$/.test(x.date||'')||!asDate(x.date+'T12:00:00'))return null;return {id:String(x.id||crypto.randomUUID()),origin:x.origin==='workflow'||(!x.origin&&String(x.id||'').startsWith('wf-'))?'workflow':'manual',recommendationRef:typeof x.recommendationRef==='string'?x.recommendationRef.slice(0,360):'',date:x.date,asset:String(x.asset||'OTHER').slice(0,16),session:String(x.session||'Other').slice(0,30),strategy:String(x.strategy||'Other').slice(0,80),r, note:String(x.note||'').slice(0,300),adherence:safeReview(x.adherence,reviewAdherence,'unreviewed'),mistake:safeReview(x.mistake,reviewMistakes,'none'),reviewed:Boolean(x.reviewed)||['yes','partial','no'].includes(x.adherence)||Boolean(x.mistake&&x.mistake!=='none')};}
try{const rows=JSON.parse(localStorage.getItem(storeKey)||'[]');journal=Array.isArray(rows)?rows.slice(0,1000).map(cleanRow).filter(Boolean):[]}catch{journal=[]}
function save(){try{localStorage.setItem(storeKey,JSON.stringify(journal))}catch{alert('تعذر الحفظ؛ مساحة التخزين المحلية قد تكون ممتلئة. صدّر نسخة احتياطية.') }}
function download(name,body,type){const url=URL.createObjectURL(new Blob([body],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function csvCell(s){const v=String(s??'');return '"'+v.replace(/"/g,'""')+'"'}
function exportCsv(){const columns=['date','asset','session','strategy','r','note','adherence','mistake','reviewed'];download('ict-trader-dna.csv','\ufeff'+[columns.join(','),...journal.map(r=>columns.map(k=>csvCell(r[k])).join(','))].join('\r\n'),'text/csv;charset=utf-8')}
const dnaPreferencesKey='ict-trader-dna-filters-v6858';
function dnaSelectRows(){
 const days=$('dna-period')?.value||'all',asset=$('dna-asset')?.value||'all',session=$('dna-session')?.value||'all',origin=$('dna-origin')?.value||'all';
 const today=new Date();today.setHours(23,59,59,999);
 return journal.map((row,index)=>({...row,_idx:index})).filter(row=>{
  if(asset!=='all'&&row.asset!==asset)return false;
  if(session!=='all'&&row.session!==session)return false;
  if(origin!=='all'&&row.origin!==origin)return false;
  if(days!=='all'){
   const date=asDate(row.date+'T12:00:00');
   if(!date)return false;
   const lower=new Date(today);lower.setDate(lower.getDate()-Number(days));lower.setHours(0,0,0,0);
   if(date<lower||date>today)return false;
  }
  return true;
 });
}
function refreshDnaFilters(){
 for(const [id,key] of [['dna-asset','asset'],['dna-session','session']]){
  const select=$(id);if(!select)continue;
  const old=select.value||'all';
  const options=[...new Set(journal.map(x=>x[key]).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  while(select.options.length>1)select.remove(1);
  for(const value of options){const option=document.createElement('option');option.value=value;option.textContent=value;select.appendChild(option)}
  select.value=options.includes(old)?old:'all';
 }
}
function renderJournal(){
 refreshDnaFilters();
 const rows=dnaSelectRows();
 const count=rows.length,total=rows.reduce((s,x)=>s+x.r,0),wins=rows.filter(x=>x.r>0),losses=rows.filter(x=>x.r<0),flat=rows.filter(x=>x.r===0);
 const gain=wins.reduce((s,x)=>s+x.r,0),lossAbs=-losses.reduce((s,x)=>s+x.r,0);
 // Stable entry order resolves ties for multiple trades on the same date.
 const chronological=[...rows].sort((a,b)=>a.date.localeCompare(b.date)||a._idx-b._idx);
 let equity=0,peak=0,maxDD=0,runWin=0,runLoss=0,maxWin=0,maxLoss=0;
 for(const trade of chronological){
  equity+=trade.r;peak=Math.max(peak,equity);maxDD=Math.max(maxDD,peak-equity);
  runWin=trade.r>0?runWin+1:0;runLoss=trade.r<0?runLoss+1:0;
  maxWin=Math.max(maxWin,runWin);maxLoss=Math.max(maxLoss,runLoss);
 }
 const pct=n=>n.toFixed(1)+'%';
 const rfmt=n=>(n>0?'+':'')+n.toFixed(2)+' R';
 const pf=lossAbs>0?(gain/lossAbs).toFixed(2):'—';
 const stats=[['الصفقات',count],['الربح من الصفقات',count?pct(wins.length/count*100):'—'],['صافي R',count?rfmt(total):'—'],['متوسط R',count?rfmt(total/count):'—'],['أقصى تراجع',count?maxDD.toFixed(2)+' R':'—'],['معامل الربحية',pf],['متوسط الربح',wins.length?rfmt(gain/wins.length):'—'],['متوسط الخسارة',losses.length?rfmt(-lossAbs/losses.length):'—']];
 $('dna-metrics').innerHTML=stats.map(([title,value])=>`<div class="metric"><small>${escape(title)}</small><strong>${escape(value)}</strong></div>`).join('');
 const group=key=>{
  const groups=new Map();
  for(const trade of rows){const name=trade[key]||'غير محدد';const rec=groups.get(name)||{name,n:0,sum:0,wins:0};rec.n++;rec.sum+=trade.r;rec.wins+=(trade.r>0?1:0);groups.set(name,rec)}
  return [...groups.values()].sort((a,b)=>b.n-a.n).slice(0,8)
 };
 $('dna-breakdown').innerHTML=[['حسب الأصل','asset'],['حسب الجلسة','session'],['حسب الاستراتيجية','strategy']].map(([title,key])=>`<div><h4>${title}</h4>${group(key).map(x=>`<div class="line"><span>${escape(x.name)} <small>(${x.n})</small></span><b class="${x.sum<0?'down':'up'}" dir="ltr">${escape(rfmt(x.sum))}</b></div>`).join('')||'<p class="micro">لا بيانات ضمن الفلتر</p>'}</div>`).join('');
 const significant=group('session').filter(x=>x.n>=10).sort((a,b)=>b.sum/b.n-a.sum/a.n),best=significant[0];
 let insight=count<20?'العينة صغيرة (أقل من 20 صفقة). يمكن قراءة الأرقام، لكن لا تكفي لاستنتاج أفضلية مستقرة.':best?`أعلى متوسط مسجل بين الجلسات التي لديها 10 صفقات على الأقل: ${best.name} (${(best.sum/best.n).toFixed(2)} R/صفقة). هذا وصف تاريخي، وليس توقعًا.`:'لا توجد جلسة تضم 10 صفقات في الفترة المختارة للمقارنة.';
 insight+=` أطول سلسلة ربح: ${maxWin}، وأطول سلسلة خسارة: ${maxLoss}. الصفقات المتعادلة: ${flat.length}.`;
 if(count&&!losses.length)insight+=' لا توجد خسائر في العينة؛ لذلك معامل الربحية غير قابل للحساب.';
 $('dna-insight').textContent=insight;
 const months=new Map();for(const trade of rows){const key=trade.date.slice(0,7);const x=months.get(key)||{n:0,sum:0};x.n++;x.sum+=trade.r;months.set(key,x)}
 $('dna-monthly').innerHTML=[...months].sort((a,b)=>b[0].localeCompare(a[0])).slice(0,12).map(([month,x])=>`<div class="dna-month-row"><span dir="ltr">${escape(month)}</span><span>${x.n} صفقة</span><b class="${x.sum<0?'down':'up'}" dir="ltr">${escape(rfmt(x.sum))}</b></div>`).join('')||'<p class="micro">لا توجد أشهر في الفترة المحددة.</p>';
 const tagged=rows.filter(x=>x.reviewed===true),reviewedCount=tagged.length;
 const missed=tagged.filter(x=>x.adherence==='no'||x.adherence==='partial').length;
 $('dna-review-metrics').textContent=rows.length?`تمت مراجعة ${reviewedCount} من ${rows.length} صفقة في النطاق الحالي. التزام جزئي أو غير ملتزم: ${missed} صفقة.`:'لا توجد صفقات في النطاق المحدد.';
 const mistakeCount=new Map();
 for(const trade of tagged){if(trade.mistake==='none')continue;const rec=mistakeCount.get(trade.mistake)||{n:0,r:0};rec.n++;rec.r+=trade.r;mistakeCount.set(trade.mistake,rec)}
 const sortedMistakes=[...mistakeCount].sort((a,b)=>b[1].n-a[1].n).slice(0,6);
 $('dna-review-breakdown').innerHTML=sortedMistakes.map(([key,rec])=>`<div class="dna-review-row"><span>${escape(reviewMistakes[key])} <small>(${rec.n})</small></span><b dir="ltr">${escape((rec.r/rec.n).toFixed(2))} R/صفقة</b></div>`).join('')||'<p class="micro">لا توجد أخطاء مصنفة ضمن الصفقات التي راجعتها بعد التنفيذ.</p>';
 const sortRows=[...rows].sort((a,b)=>b.date.localeCompare(a.date)||b._idx-a._idx);
 $('trade-rows').innerHTML=sortRows.map(r=>`<tr><td dir="ltr">${escape(r.date)}</td><td>${escape(r.asset)}</td><td>${escape(r.session)}</td><td>${escape(r.strategy)}</td><td><span class="dna-origin-tag">${r.origin==='workflow'?'رحلة الصفقة':'إدخال مباشر'}</span>${r.recommendationRef?' <small>• توصية</small>':''}</td><td class="${r.r>=0?'up':'down'}" dir="ltr">${escape(r.r.toFixed(2))} R</td><td class="dna-review-cell">${r.reviewed?escape(reviewAdherence[r.adherence])+' · '+escape(reviewMistakes[r.mistake]):'لم تُراجع'}</td><td><button type="button" data-delete="${escape(r.id)}">حذف</button></td></tr>`).join('')||'<tr><td colspan="8">لا توجد صفقات ضمن المرشح المختار.</td></tr>';
 $('dna-scope').textContent=`${count} صفقة معروضة من أصل ${journal.length} صفقة محفوظة على هذا الجهاز. التصفية لا تغير بيانات السجل.`;
}
function bindJournal(){const form=$('trade-form');form.elements.date.value=[new Date().getFullYear(),String(new Date().getMonth()+1).padStart(2,'0'),String(new Date().getDate()).padStart(2,'0')].join('-');form.addEventListener('submit',e=>{e.preventDefault();const d=Object.fromEntries(new FormData(form));const r=cleanRow({...d,r:Number(d.r),reviewed:d.adherence!=='unreviewed'||d.mistake!=='none',id:crypto.randomUUID()});if(!r){alert('راجع التاريخ ونتيجة R؛ يجب أن تكون قيمة عددية معقولة.');return}if(journal.length>=1000){alert('بلغ السجل الحد الأقصى (1000 صفقة). لم تُحذف صفقاتك السابقة؛ احفظ نسخة احتياطية ونظّم السجل قبل الإضافة.');return}journal.push(r);save();renderJournal();form.reset();form.elements.date.value=[new Date().getFullYear(),String(new Date().getMonth()+1).padStart(2,'0'),String(new Date().getDate()).padStart(2,'0')].join('-')});$('trade-rows').addEventListener('click',e=>{const btn=e.target.closest('[data-delete]');if(!btn||!confirm('حذف هذه الصفقة من سجلك المحلي؟'))return;journal=journal.filter(x=>x.id!==btn.dataset.delete);save();renderJournal()});$('export-trades').onclick=exportCsv;$('backup-trades').onclick=()=>download('ict-trader-dna-backup.json',JSON.stringify({version:1,exportedAt:new Date().toISOString(),trades:journal},null,2),'application/json');$('import-trades').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>1024*1024){alert('الملف كبير جدًا (الحد 1MB).');return}try{const obj=JSON.parse(await file.text());if(!obj||obj.version!==1||!Array.isArray(obj.trades)||obj.trades.length>1000)throw Error();const rows=obj.trades.map(cleanRow);if(rows.some(x=>!x))throw Error();if(!confirm('استبدال سجل الصفقات المحلي بالكامل بالنسخة المستوردة؟'))return;journal=rows;save();renderJournal()}catch{alert('ملف النسخة الاحتياطية غير صالح.')}finally{e.target.value=''}});for(const id of ['dna-period','dna-asset','dna-session','dna-origin'])$(id)?.addEventListener('change',()=>{try{localStorage.setItem(dnaPreferencesKey,JSON.stringify({period:$('dna-period').value,asset:$('dna-asset').value,session:$('dna-session').value,origin:$('dna-origin').value}))}catch{}renderJournal()});refreshDnaFilters();try{const filters=JSON.parse(localStorage.getItem(dnaPreferencesKey)||'{}');for(const [id,key] of [['dna-period','period'],['dna-asset','asset'],['dna-session','session'],['dna-origin','origin']]){if([...$(id).options].some(o=>o.value===filters[key]))$(id).value=filters[key]}}catch{}renderJournal()}
// 6.8.88: retain source availability separately from a legitimate empty dataset.
const deskSources=[
 {file:'analyses.json',label:'التحليلات',path:'./#recs',key:'analyses'},
 {file:'recs.json',label:'التوصيات',path:'./#recs',key:'recs'},
 {file:'news-live.json',label:'الأخبار',path:'./#news',key:'news'},
 {file:'calendar-live.json',label:'الأجندة',path:'./#agenda',key:'calendar'},
 {file:'market-movers.json',label:'الأسواق',path:'./#markets',key:'movers'}
];
// 6.8.89: distinguish delivery cadence from tradeable real-time quotes.
const sourceCadence={analyses:'محتوى تحريري منشور',recs:'محتوى تحريري منشور',news:'تغذية أخبار دورية',calendar:'أجندة اقتصادية مجمعة',movers:'لقطات أسعار وتغيرات دورية'};
const formatSourceAge=stamp=>{const d=asDate(stamp);if(!d)return 'وقت التحديث غير منشور';const delta=Date.now()-d.getTime();if(delta< -300000)return 'توقيت المصدر في المستقبل — تحقق من الساعة';if(delta<0)return 'تحديث حديث (اختلاف طفيف في الساعة)';if(delta<60000)return 'منذ أقل من دقيقة';if(delta<3600000)return 'منذ '+Math.floor(delta/60000)+' دقيقة';if(delta<86400000)return 'منذ '+Math.floor(delta/3600000)+' ساعة';return 'منذ '+Math.floor(delta/86400000)+' يوم';};
const sourceTimestampLabel=source=>source?.updated?'آخر تحديث معلن: '+fmt(source.updated)+' ('+formatSourceAge(source.updated)+')':'لم ينشر الملف توقيت تحديث';
let deskLoadId=0;
async function getDeskSource(source){
 try{
  const response=await fetch('./'+source.file+'?v='+Date.now(),{cache:'no-store'});
  if(!response.ok)throw Error('HTTP '+response.status);
  const json=await response.json();
  const list=source.key==='news'||source.key==='movers'?json?.items:source.key==='calendar'?json?.events:json;
  if(!Array.isArray(list))throw Error('unexpected shape');
  const updated=source.key==='news'?json?.updated_at:source.key==='calendar'||source.key==='movers'?json?.updatedAt:null;
  const timestamp=asDate(updated);
  const hours={news:6,calendar:30,movers:8}[source.key];
  const stale=hours&&(!timestamp||Date.now()-timestamp.getTime()>hours*3600000||timestamp.getTime()>Date.now()+300000);
  return {ok:true,rows:list,updated,stale:Boolean(stale)};
 }catch(error){console.warn('ICT data source unavailable:',source.file,error?.message);return {ok:false,rows:[],updated:null,stale:false}}
}
async function loadData(){
 const id=++deskLoadId;
 const refresh=$('refresh-desk');if(refresh){refresh.disabled=true;refresh.textContent='جارٍ التحديث…'}
 const status=$('desk-status');if(status)status.textContent='جارٍ فحص مصادر البيانات العامة…';
 try{
  const results=await Promise.all(deskSources.map(getDeskSource));
  if(id!==deskLoadId)return;
  const sources=Object.fromEntries(deskSources.map((source,i)=>[source.key,results[i]]));
  data={analyses:sources.analyses.rows,recs:sources.recs.rows,news:sources.news.rows,calendar:sources.calendar.rows,movers:sources.movers.rows,
    meta:{news:sources.news.updated,calendar:sources.calendar.updated,movers:sources.movers.updated},sources};
  renderDesk();
 }finally{if(id===deskLoadId&&refresh){refresh.disabled=false;refresh.textContent='تحديث البيانات'}}
}
function deskEmpty(source,emptyText){
 const state=data.sources?.[source];
 if(state&&!state.ok)return `<p class="desk-source-message" role="status">تعذر تحميل بيانات ${escape(deskSources.find(x=>x.key===source)?.label||'المصدر')} حاليًا. <button type="button" data-desk-retry>إعادة المحاولة</button></p>`;
 if(state?.stale)return `<p class="desk-source-message">بيانات المصدر قديمة؛ لا نعتمدها كقائمة حديثة. <button type="button" data-desk-retry>إعادة المحاولة</button></p>`;
 return `<p class="desk-source-message">${escape(emptyText)}</p>`;
}
function item(link,title,meta){return `<a class="item" href="${escape(link)}"><b>${escape(title)}</b><small>${escape(meta)}</small></a>`}
function renderDesk(){const now=Date.now(),as=data.analyses||[],rs=(data.recs||[]).filter(x=>!x.sample),ns=data.news||[],evs=data.calendar||[],ms=data.movers||[];
const source=data.sources||{};
const upcoming=source.calendar?.stale?[]:evs.filter(x=>{const t=asDate(x.date);return t&&t.getTime()>now}).sort((a,b)=>Date.parse(a.date)-Date.parse(b.date)).slice(0,6);
const published=[...(source.analyses?.ok?as:[]).map(x=>({kind:'تحليل',title:x.title||x.asset||'تحليل',when:x.published_at||x.date,link:'./#recs'})),...(source.recs?.ok?rs:[]).map(x=>({kind:'توصية',title:x.title||x.pair||'توصية',when:x.published_at||x.date,link:'./#recs'}))].sort((a,b)=>Date.parse(b.when||0)-Date.parse(a.when||0)).slice(0,7);
const metric=(text,count,ok)=>`<div class="metric"><small>${text}</small><strong>${ok?count:'—'}</strong></div>`;
$('desk-metrics').innerHTML=metric('التحليلات المنشورة',as.length,source.analyses?.ok)+metric('التوصيات المنشورة',rs.length,source.recs?.ok)+metric('أحداث قادمة',upcoming.length,source.calendar?.ok&&!source.calendar?.stale)+metric('لقطات أصول',ms.length,source.movers?.ok&&!source.movers?.stale);
$('latest-content').innerHTML=published.map(x=>item(x.link,x.title,x.kind+' • '+fmt(x.when))).join('')||deskEmpty(!source.analyses?.ok?'analyses':'recs','لا توجد تحليلات أو توصيات منشورة حاليًا.');
$('upcoming-events').innerHTML=upcoming.map(x=>item('./#agenda',x.title||'حدث اقتصادي',(x.country||x.currency||'')+' • '+fmt(x.date)+' • '+(x.impact||'تأثير غير محدد'))).join('')||deskEmpty('calendar','لا توجد أحداث قادمة في الأجندة الحالية.');
$('latest-news').innerHTML=(!source.news?.stale?ns:[]).slice(0,7).map(x=>item(/^https:\/\/[^\s<>"']+$/.test(x.url||'')?x.url:'./#news',x.title||'خبر',fmt(x.date))).join('')||deskEmpty('news','لا توجد أخبار منشورة في هذا التحديث.');
$('latest-movers').innerHTML=(!source.movers?.stale?ms:[]).filter(x=>Number.isFinite(Number(x.change))).sort((a,b)=>Math.abs(Number(b.change))-Math.abs(Number(a.change))).slice(0,9).map(x=>item(/^https:\/\/www\.tradingview\.com\//.test(x.url||'')?x.url:'./#markets',x.symbol||'الأصل',`التغير الدوري: ${Number(x.change)>0?'+':''}${Number(x.change).toFixed(2)}% • ${x.proxy?'عقد آجل مرجعي':'سعر اللقطة'}: ${x.price??'غير متاح'} • وقت السعر: ${x.quotedAt?fmt(x.quotedAt):'غير منشور'}`)).join('')||deskEmpty('movers','لا توجد لقطة حركة متاحة من المصدر حاليًا.');
const lines=deskSources.map(s=>{const x=source[s.key];const status=!x?.ok?'غير متاح':x?.stale?'متأخر':'تم تحميل الملف';return `<span class="desk-source-pill ${!x?.ok?'is-unavailable':x?.stale?'is-stale':'is-available'}" title="${escape(sourceCadence[s.key])} — ${escape(sourceTimestampLabel(x))}">${escape(s.label)}: ${status}${x?.updated?' · '+escape(formatSourceAge(x.updated)):' · دون طابع تحديث'}</span>`});
const failed=deskSources.filter(s=>!source[s.key]?.ok),stale=deskSources.filter(s=>source[s.key]?.stale);
const reliability=$('desk-data-provenance');
if(reliability){reliability.innerHTML=`<div class="desk-provenance-grid"><div><strong>الأسعار والتغيرات</strong><span>لقطات دورية من ملف الأسواق، وليست بث Tick-by-Tick. بعض الأصول قد تستخدم سعر عقد آجل مرجعيًا.</span><small>${escape(sourceTimestampLabel(source.movers))}</small></div><div><strong>الأخبار والأجندة</strong><span>بيانات مجمعة ومحدثة على فترات. وقت تحديث الملف يختلف عن تاريخ الحدث أو نشر الخبر.</span><small>الأخبار: ${escape(sourceTimestampLabel(source.news))} · الأجندة: ${escape(sourceTimestampLabel(source.calendar))}</small></div><div><strong>التحليلات والتوصيات</strong><span>منشورات تحريرية؛ تاريخ المنشور ليس إثباتًا على تحديث أسعار السوق.</span><small>تواريخ النشر معروضة داخل بطاقات المحتوى</small></div><div><strong>الشموع التاريخية</strong><span>بيانات للبحث والاختبار داخل مختبر الأبحاث، وليست أسعار تنفيذ فورية.</span><a href="research.html">فتح مختبر الأبحاث ←</a></div></div>`;}
$('desk-status').innerHTML=`<div class="desk-source-heading">${failed.length?'تعذر تحميل بعض مصادر البيانات.':'تم فحص مصادر البيانات.'} ${stale.length?'بعض البيانات متأخرة ولا تُعرض بوصفها حديثة.':''}</div><div class="desk-source-pills">${lines.join('')}</div>${failed.length||stale.length?'<div class="desk-source-help">راجع اتصال الإنترنت أو أعد المحاولة. تظهر البيانات تلقائيًا عند عودة المصدر. <button type="button" data-desk-retry>إعادة المحاولة</button></div>':'<small>المصادر عامة، والأرقام المعروضة ليست أسعارًا لحظية.</small>'}`;
}
const synonyms=[[/الذهب|gold/i,'XAUUSD'],[/الفضة|silver/i,'XAGUSD'],[/ناسداك|nasdaq/i,'NAS100'],[/البيتكوين|بيتكوين|bitcoin/i,'BTC'],[/اليورو/i,'EURUSD'],[/التضخم/i,'CPI'],[/الوظائف/i,'NFP']];
function search(q){let query=q.trim();for(const [re,target] of synonyms)if(re.test(query)){query+=' '+target;}const tokens=[...new Set(query.toLowerCase().split(/\s+/).filter(s=>s.length>1&&!['آخر','احدث','أحدث','عن','على','من','في','ما','هو','هي','التوصيات','التحليلات','اخبار','الأخبار'].includes(s)))];const entries=[...(data.analyses||[]).map(x=>({type:'تحليل',text:[x.title,x.asset,x.summary,x.body].join(' '),title:x.title||x.asset||'تحليل',date:x.published_at||x.date,link:'./#recs'})),...(data.recs||[]).filter(x=>!x.sample).map(x=>({type:'توصية',text:[x.title,x.pair,x.note,x.dir].join(' '),title:x.title||x.pair||'توصية',date:x.published_at||x.date,link:'./#recs'})),...(data.news||[]).map(x=>({type:'خبر',text:[x.title,x.src,x.tag].join(' '),title:x.title||'خبر',date:x.date,link:/^https:\/\/[^\s<>"']+$/.test(x.url||'')?x.url:'./#news'})),...(data.calendar||[]).map(x=>({type:'أجندة',text:[x.title,x.country,x.currency].join(' '),title:x.title||'حدث',date:x.date,link:'./#agenda'}))];const typeHint=/توصي/.test(q)?'توصية':/تحليل/.test(q)?'تحليل':/خبر|اخبار|أخبار/.test(q)?'خبر':null;const matches=entries.map(x=>{const text=x.text.toLowerCase();const score=tokens.reduce((v,t)=>v+(text.includes(t)?1:0),0)+(typeHint===x.type?1:0);return {...x,score}}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||Date.parse(b.date||0)-Date.parse(a.date||0)).slice(0,18);$('search-status').textContent=matches.length?`عُثر على ${matches.length} نتيجة مرتبطة بالسؤال من البيانات المنشورة. افتح المصدر للتحقق من التفاصيل.`:'لم أجد نتيجة مطابقة في البيانات المتاحة حاليًا. جرّب رمز الأصل أو اسم الحدث بالإنجليزية.';$('search-results').innerHTML=matches.map(x=>`<div class="search-result"><span>${escape(x.type)} · ${escape(fmt(x.date))}</span><b>${escape(x.title)}</b><p>${escape(x.text.slice(0,170))}</p><a href="${escape(x.link)}" ${x.link.startsWith('https://')?'target="_blank" rel="noopener noreferrer"':''}>فتح المصدر ↗</a></div>`).join('')}
function openTab(tab){const btn=document.querySelector('[data-tab="'+tab+'"]');if(!btn)return;document.querySelectorAll('[data-tab]').forEach(b=>{const active=b===btn;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active))});document.querySelectorAll('.tab-panel').forEach(panel=>panel.hidden=panel.id!=='tab-'+tab)}
function bind(){document.querySelectorAll('[data-tab]').forEach(btn=>btn.addEventListener('click',()=>openTab(btn.dataset.tab)));if(['dna','live','assistant'].includes(location.hash.slice(1)))openTab(location.hash.slice(1));window.addEventListener('hashchange',()=>{const tab=location.hash.slice(1);if(['dna','live','assistant'].includes(tab))openTab(tab)});$('refresh-desk').onclick=loadData;document.querySelector('#tab-live')?.addEventListener('click',e=>{if(e.target.closest('[data-desk-retry]'))loadData()});$('search-form').addEventListener('submit',e=>{e.preventDefault();search($('search-query').value)});document.querySelectorAll('[data-query]').forEach(b=>b.onclick=()=>{$('search-query').value=b.dataset.query;search(b.dataset.query)});bindJournal();loadData();setInterval(loadData,5*60*1000)}
bind();
})();
