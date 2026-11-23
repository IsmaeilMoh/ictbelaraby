/* ICT بالعربي 7.0/3B · no background network requests */
(function(){'use strict';const root=document.getElementById('ict-scenarios-3b');if(!root)return;
const el=id=>document.getElementById(id),market=el('ict-3b-market'),symbol=el('ict-3b-symbol'),run=el('ict-3b-run'),status=el('ict-3b-status'),result=el('ict-3b-results');
const deps=()=>({c:window.ICTContextEngine,s:window.ICTStructureEngine,e:window.ICTScenarioEngine,p:window.ICTPublicMarkets,b:window.ICTLiveFeed});
let busy=false;const crypto=['BTCUSDT','ETHUSDT','SOLUSDT','XRPUSDT'];
function when(x){return window.ICTMarketTimes?.format(x)||new Date(x).toLocaleString('ar',{timeZone:'Asia/Gaza'})}
function fmt(x){return Number(x).toLocaleString('en-US',{maximumFractionDigits:6})}
function notice(t,kind='info'){status.textContent=t;status.dataset.level=kind}
function fill(){symbol.replaceChildren();const {p}=deps();const list=market.value==='crypto'?crypto:p?.MARKETS?.[market.value]?.map(v=>v[0])||[];for(const s of list){const o=document.createElement('option');o.value=s;o.textContent=s;symbol.append(o)}result.replaceChildren();notice('اختر الأصل واضغط «تكوين السيناريوهات»؛ لا يوجد جلب تلقائي.');}
async function load(){const {p,b}=deps(),s=symbol.value;if(market.value==='crypto'){const [daily,hourly]=await Promise.all([b.fetchHistory({symbol:s,interval:'D',limit:100}),b.fetchHistory({symbol:s,interval:'60',limit:160})]);return {daily,hourly,source:'Bybit · '+s+' USDT perpetual'}}
const resolved=p.resolve(market.value,s),[daily,hourly]=await Promise.all([p.get(resolved,'1day'),p.get(resolved,'1h')]);return {daily,hourly,source:resolved.source+' · '+resolved.providerSymbol};}
function line(parent,tag,text,cls){const x=document.createElement(tag);if(cls)x.className=cls;x.textContent=text;parent.append(x);return x}
function draw(assessment,context,structure){result.replaceChildren();line(result,'p','وقت الفحص: '+when(assessment.checkedAt)+' | المصدر: '+assessment.source,'ict-3b-meta');
if(assessment.warnings.length)line(result,'p','تنبيهات جودة: '+assessment.warnings.join(' • '),'ict-3b-alert');
line(result,'p','السعر المرجعي: '+(assessment.price==null?'غير متاح/متأخر':fmt(assessment.price))+' · آخر يوم مكتمل: '+when(context.previousDay.start),'ict-3b-meta');
for(const s of assessment.scenarios){const card=document.createElement('article');card.className='ict-3b-card '+(s.direction==='bull'?'bull':'bear');line(card,'h3',s.direction==='bull'?'السيناريو الصعودي المشروط':'السيناريو الهبوطي المشروط');line(card,'p',s.status,'ict-3b-state');line(card,'h4','الأدلة المرصودة');if(s.evidence.length){const ul=document.createElement('ul');for(const i of s.evidence)line(ul,'li',i);card.append(ul)}else line(card,'p','لا توجد أدلة حديثة كافية.');line(card,'h4','الشروط التي نراقبها');const ul=document.createElement('ul');for(const t of s.awaiting)line(ul,'li',t);card.append(ul);
line(card,'p','الإبطال: '+s.invalidation,'ict-3b-invalidate');line(card,'p','مستويات مرجعية: '+s.targets.map(t=>t.name+' '+fmt(t.value)).join(' · '),'ict-3b-meta');if(s.zone)line(card,'p','FVG المرصودة: '+fmt(s.zone.low)+' – '+fmt(s.zone.high)+' | '+when(s.zone.at),'ict-3b-meta');result.append(card)}
line(result,'p','المقارنة بين اتجاهين لا تعني ترجيحًا إحصائيًا. '+assessment.disclaimer,'ict-3b-meta');}
run.addEventListener('click',async()=>{if(busy)return;const {c,s,e,p,b}=deps();if(!c||!s||!e||!p||!b){notice('لم تُحمّل إحدى مكتبات السوق اللازمة. حدّث الصفحة بعد التأكد من نشر ملفات 2D و3A و3B.','bad');return}
busy=true;run.disabled=true;result.replaceChildren();notice('جارٍ جلب الشموع المكتملة وحساب السياق والهيكل…');try{const v=await load();const now=Date.now(),context=c.build(v.daily,v.hourly,{now,market:market.value,sources:v.source}),structure=s.analyze(v.hourly,'1h',{now,pivot:2}),assessment=e.build(context,structure,{now});draw(assessment,context,structure);notice(assessment.qualified?'اكتمل عرض السيناريوهين المشروطين — ليست توصية تداول.':'اكتمل العرض مع تحذير: البيانات غير كافية لترجيح أي سيناريو.',''+(assessment.qualified?'ok':'warn'))}
catch(err){notice('تعذر تكوين السيناريوهات: '+String(err?.message||err)+'؛ راجع توافر بيانات اليومي والساعة وجودة المصدر.','bad')}
finally{busy=false;run.disabled=false}});
market.addEventListener('change',fill);fill();
})();
