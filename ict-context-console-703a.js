/* ICT بالعربي 7.0 3A — On demand only; no automatic requests or financial signals. */
(function(){'use strict';
const root=document.getElementById('ict-context-3a'),engine=window.ICTContextEngine,pub=window.ICTPublicMarkets,bybit=window.ICTLiveFeed;
if(!root||!engine||!pub||!bybit)return;
const el=id=>document.getElementById(id),market=el('ict-3a-market'),symbol=el('ict-3a-symbol'),run=el('ict-3a-run'),state=el('ict-3a-status'),stats=el('ict-3a-stats'),detail=el('ict-3a-detail');let busy=false;
const roll=document.getElementById('ict-3a-roll');
const CRYPTO=['BTCUSDT','ETHUSDT','SOLUSDT','XRPUSDT'];
function fmt(n){return Number(n).toLocaleString('en-US',{maximumFractionDigits:7})}
function when(t){return window.ICTMarketTimes?.format(t)||new Date(t).toISOString()}
function text(s,level){state.textContent=s;state.dataset.level=level||'info'}
function fill(){symbol.replaceChildren();const list=market.value==='crypto'?CRYPTO:pub.MARKETS[market.value]?.map(x=>x[0])||[];for(const s of list){const opt=document.createElement('option');opt.value=s;opt.textContent=s;symbol.append(opt)}stats.replaceChildren();detail.replaceChildren();text('اختر الأصل ثم اضغط «حساب السياق». لا تُرسل طلبات عند فتح الصفحة.')}
function metric(label,value){const box=document.createElement('div');box.className='ict-3a-metric';const small=document.createElement('span');small.textContent=label;const strong=document.createElement('strong');strong.textContent=value;box.append(small,strong);stats.append(box)}
async function fetchData(){const type=market.value,s=symbol.value;if(type==='crypto'){
 const hourly=await bybit.fetchHistory({symbol:s,interval:'60',limit:1000});const daily=[];
 return {daily,hourly,sources:'Bybit V5 · '+s+' USDT perpetual'};
 }
 const info=pub.resolve(type,s);const hourly=await pub.get(info,'1h',{limit:200});const daily=[];
 return {daily,hourly,sources:info.source+' · '+info.providerSymbol};
}
run.addEventListener('click',async()=>{if(busy)return;busy=true;run.disabled=true;stats.replaceChildren();detail.replaceChildren();text('جارٍ جلب اليومي والساعة المكتملين والتحقق من السياق…');try{
 const source=await fetchData();const result=engine.build(source.daily,source.hourly,{market:market.value,sources:source.sources,rollHour:Number(roll?.value)||0});
 metric('المصدر',source.sources);metric('حدود اليوم',result.sourceDay);metric('قمة آخر يوم مكتمل',fmt(result.previousDay.high));metric('قاع آخر يوم مكتمل',fmt(result.previousDay.low));metric('توازن اليوم',fmt(result.previousDay.midpoint));
 if(result.priorWeek){metric('قمة الأسبوع السابق المكتمل',fmt(result.priorWeek.high));metric('قاع الأسبوع السابق المكتمل',fmt(result.priorWeek.low));metric('منتصف الأسبوع',fmt((result.priorWeek.high+result.priorWeek.low)/2))}
 else metric('الأسبوع السابق', 'غير مكتمل/غير متاح');
 metric('آخر إغلاق ساعة حديث',result.price==null?'غير متاح':fmt(result.price));metric('الموقع الوصفي للسعر',result.position);
 if(result.nearestAbove)metric('أقرب سيولة مرجعية أعلى السعر',result.nearestAbove.name+' · '+fmt(result.nearestAbove.value));
 if(result.nearestBelow)metric('أقرب سيولة مرجعية أسفل السعر',result.nearestBelow.name+' · '+fmt(result.nearestBelow.value));
 const p=document.createElement('p');p.textContent='اليوم السابق بتوقيت نيويورك: '+result.previousDay.key+' · بدايته: '+when(result.previousDay.start)+' · آخر فحص: '+when(Date.now());detail.append(p);
 if(result.priorWeek){const w=document.createElement('p');w.textContent='الأسبوع السابق المكتمل بنيويورك يبدأ: '+when(result.priorWeek.start);detail.append(w)}
 const q=document.createElement('p');q.textContent='بيانات مستخدمة: '+result.quality.dayBars+' أيام نيويورك مكتملة و'+result.quality.hourBars+' شمعة ساعة مكتملة. شموع مستبعدة ساعيًا: '+(result.quality.hourly.invalid+result.quality.hourly.unconfirmed+result.quality.hourly.duplicate)+'.';detail.append(q);
 const note=document.createElement('p');note.textContent=result.disclaimer+' '+result.liveStatus+(result.weekWarning?' · '+result.weekWarning:'');detail.append(note);
 text(result.price==null||!result.priorWeek?'اكتمل الحساب جزئيًا مع تحذيرات جودة/تغطية. راجع التفاصيل.':'اكتمل حساب المستويات من الشموع المؤكدة. لا توجد إشارة شراء أو بيع.',result.price==null||!result.priorWeek?'warn':'ok');
 }catch(e){text('تعذر حساب السياق: '+String(e?.message||e)+'. تحقق من المصدر والرمز وتوافر الشموع اليومية والساعة.','bad')}
 finally{busy=false;run.disabled=false}});
market.addEventListener('change',()=>{if(roll)roll.value=['forex','metals','energy'].includes(market.value)?'17':'0';fill()});fill();
})();
