'use strict';
const $=x=>document.getElementById(x),S={news:[],newsArchive:[],newsUpdated:null,newsStatus:'loading',recs:[],analyses:[],links:[],agenda:{days:[]},liveEvents:[],liveUpdated:null,liveStatus:'loading',nextEvents:[],nextUpdated:null,nextStatus:'unavailable',nextSource:'Forex Factory',nextSourceUrl:'',nextCoverage:'full',calendarWeek:'current',calendarWeekManual:false,currentWeekStart:null,nextWeekStart:null,movers:[],moversUpdated:null,moversStatus:'loading'},state={page:'home',nf:'الكل',rf:'all',contentTab:'signals',analysisAsset:'all',country:'ALL',impact:'all',day:'all',search:''};
const escapeHTML=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl=u=>/^https:\/\/[^\s\"'<>]+$/i.test(u||'')?u:'#';
const newsImageURL=u=>{const raw=String(u||'');try{const p=new URL(raw);return p.protocol==='https:'&&!/\.(svg|gif|pdf)$/i.test(p.pathname)&&!/[<>\s]/.test(raw)?raw:''}catch(e){return ''}};
const newsImage=n=>newsImageURL(n?.image||n?.image_url||n?.thumbnail);
const dateFormat=d=>{if(!d)return '';const obj=new Date(/^\d{4}-\d{2}-\d{2}$/.test(String(d))?d+'T12:00:00':d);return Number.isFinite(obj.getTime())?obj.toLocaleString('ar-u-nu-latn',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:typeof currentZone==='function'?currentZone():undefined}):''};
const section=(title,content,link='',more='عرض الكل')=>`<section class="section"><div class="section-heading"><h2>${title}</h2>${link?`<a href="${link}">${more} ←</a>`:''}</div>${content}</section>`;
const empty=m=>`<div class="empty">${m}</div>`;
async function load(file){try{const r=await fetch(file,{cache:'no-store'});if(!r.ok)throw Error(r.status);return await r.json()}catch(e){console.warn('تعذر تحميل',file,e);return null}}
function cardNews(n){const photo=newsImage(n);const artwork=photo?`<div class="news-photo"><img src="${escapeHTML(photo)}" alt="صورة مرفقة من المصدر: ${escapeHTML(n.src||'المصدر')}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.closest('.news-photo').classList.add('image-error')"><span class="news-photo-fallback" aria-hidden="true">${escapeHTML(n.tag||'اقتصاد')}</span></div>`:`<div class="news-photo news-photo-placeholder" aria-hidden="true"><span>${escapeHTML(n.tag||'اقتصاد')}</span></div>`;return `<article class="card news-card">${artwork}<span class="tag">${escapeHTML(n.tag||'اقتصاد')}</span><h3>${escapeHTML(n.title)}</h3><p>${escapeHTML(n.sum||'')}</p><div class="card-meta"><span>${escapeHTML(n.src||'')} · ${dateFormat(n.date)}</span>${safeUrl(n.url)!=='#'?`<a href="${escapeHTML(safeUrl(n.url))}" target="_blank" rel="noopener noreferrer">قراءة الخبر ↗</a>`:''}</div></article>`}
function newsStatusLine(){const date=S.newsUpdated?dateFormat(S.newsUpdated):'';if(S.newsStatus==='fresh')return `آخر تحديث: ${escapeHTML(date)} • أخبار من مصادرها الأصلية`;
if(S.newsStatus==='stale')return `آخر تحديث: ${escapeHTML(date)} • قد تكون بعض الأخبار قديمة؛ تحقق من تاريخ النشر`;
if(S.newsStatus==='archive')return 'أخبار سابقة • الأخبار الجديدة غير متاحة حاليًا';
return 'جارٍ تحميل الأخبار…';}
function newsBadge(){return `<span class="news-live-chip ${S.newsStatus==='fresh'?'is-fresh':S.newsStatus==='stale'?'is-stale':''}">${S.newsStatus==='fresh'?'تحديث تلقائي':S.newsStatus==='stale'?'أخبار سابقة':S.newsStatus==='archive'?'أرشيف':'جارٍ التحديث'}</span>`;}
async function fetchLiveNews(){
 let payload=null;try{const r=await fetch('news-live.json?t='+Date.now(),{cache:'no-store'});if(r.ok)payload=await r.json()}catch(e){console.info('News feed unavailable',e.message)}
 const time=payload?.updated_at?new Date(payload.updated_at):null;
 const records=Array.isArray(payload?.items)?payload.items:[];
 const normalized=records.filter(n=>n&&typeof n.title==='string'&&n.title.trim()&&/^https:\/\/[^\s]+$/i.test(n.url||'')&&Number.isFinite(new Date(n.date).getTime())&&Date.now()-new Date(n.date).getTime()<7*86400000).map(n=>({title:n.title,src:String(n.src||'المصدر'),tag:String(n.tag||'اقتصاد'),date:n.date,url:n.url,sum:'',image:newsImage(n),language:n.language||'ar'})).slice(0,80);
 if(normalized.length){S.news=normalized;S.newsUpdated=time;S.newsStatus=(time&&Number.isFinite(time.getTime())&&Date.now()-time.getTime()<4*3600000)?'fresh':'stale';}
 else {S.news=S.newsArchive;S.newsUpdated=null;S.newsStatus='archive';}
 if(['news','home'].includes(state.page))render();
}
function newsGrid(items){return items.length?`<div class="grid">${items.map(cardNews).join('')}</div>`:empty('لا توجد أخبار في هذا التصنيف.')}
const statusNames={pending:'بانتظار التفعيل',open:'مفعّلة',tp:'تحقق الهدف',sl:'وقف الخسارة',cl:'مغلقة يدويًا',cancelled:'ملغاة'};
function tradeRR(r){
 const entry=Number(r.entry),stop=Number(r.sl),target=Number(r.tp),buy=r.dir==='buy';
 if(![entry,stop,target].every(Number.isFinite)||entry<=0||stop<=0||target<=0||entry===stop)return null;
 if((buy&&(target<=entry||stop>=entry))||(!buy&&(target>=entry||stop<=entry)))return null;
 return Math.abs((target-entry)/(entry-stop));
}
function workflowReference(r){const key=r?.id!==undefined&&r?.id!==null&&String(r.id)!==''?String(r.id):[r?.pair||'',r?.published_at||r?.date||'',r?.entry||'',r?.sl||'',r?.tp||'',r?.dir||''].join('|');return key.slice(0,360)}
function cardRec(r){
 const buy=r.dir==='buy',stat=r.status||'open',rr=tradeRR(r),updated=r.updated_at&&r.updated_at!==r.published_at;
 const stateLabel=escapeHTML(statusNames[stat]||stat);
 return `<article class="card trade-pro-card"><div class="rec-head"><span class="pair" dir="ltr">${escapeHTML(r.pair)}</span><span class="direction ${buy?'buy':'sell'}">${buy?'BUY • شراء':'SELL • بيع'}</span></div><div class="trade-pro-badges"><span class="trade-state trade-state-${escapeHTML(stat)}">${stateLabel}</span>${rr!==null?`<span class="trade-rr en" dir="ltr">R:R 1:${rr.toFixed(2)}</span>`:''}</div><div class="kv"><div><small>الدخول ENTRY</small><strong dir="ltr">${escapeHTML(r.entry)}</strong></div><div><small>الهدف TP</small><strong dir="ltr">${escapeHTML(r.tp)}</strong></div><div><small>الإيقاف SL</small><strong dir="ltr">${escapeHTML(r.sl)}</strong></div></div><div class="card-meta"><span>نُشرت: ${dateFormat(r.published_at||r.date)}</span>${updated?`<span>آخر تعديل: ${dateFormat(r.updated_at)}</span>`:''}</div>${r.note?`<p class="trade-pro-note">${escapeHTML(r.note)}</p>`:''}${r.result_note?`<div class="trade-pro-result"><b>تحديث النتيجة</b><p>${escapeHTML(r.result_note)}</p></div>`:''}${r.sample?'<span class="tag">بيانات تجريبية</span>':`<a class="trade-workflow-action" href="workflow.html?ref=${encodeURIComponent(workflowReference(r))}">◈ حضّر الصفقة • احسب المخاطرة • سجّل النتيجة ←</a>`}</article>`;
}
function recGrid(items){return items.length?`<div class="grid">${items.map(cardRec).join('')}</div>`:empty('لا توجد توصيات في هذه الحالة.')}
// Only same-site uploaded chart images or HTTPS source images are accepted.
function analysisImageURL(value){const raw=String(value||'');if(/^https:\/\/[^\s<>"']+$/.test(raw))return newsImageURL(raw);if(/^analysis-images\/[a-zA-Z0-9_./-]+\.(?:jpg|jpeg|png|webp)$/i.test(raw)&&!raw.includes('..'))return raw;return ''}
// Independent long-form market analysis, not an immediate trade signal.
function analysisCard(a){
 const img=analysisImageURL(a.image),asset=escapeHTML(a.asset||'الأسواق'),heading=escapeHTML(a.title||''),bias=escapeHTML(a.bias||'نظرة محايدة');
 const safeImage=img?`<img class="analysis-image" src="${escapeHTML(img)}" alt="شارت تحليل ${asset}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.hidden=true">`:`<div class="analysis-image analysis-placeholder"><span>CHART / ANALYSIS</span><strong>${asset}</strong></div>`;
 const notes=String(a.body||a.summary||'').split(/\n+/).filter(Boolean).map(x=>`<p>${escapeHTML(x)}</p>`).join('');
 const levels=Array.isArray(a.levels)?a.levels.filter(x=>x&&x.label&&x.value).slice(0,8).map(x=>`<span><small>${escapeHTML(x.label)}</small><b dir="ltr">${escapeHTML(x.value)}</b></span>`).join(''):'';
 const chart=safeUrl(a.chart_url),updated=a.updated_at&&a.updated_at!==a.published_at;
 return `<article class="card analysis-card">${safeImage}<div class="analysis-copy"><div class="analysis-tags"><span class="tag">${asset}</span><span class="tag">${escapeHTML(a.timeframe||'غير محدد')}</span><span class="tag analysis-bias">${bias}</span>${a.status==='invalidated'?'<span class="tag">تم إبطال الفكرة</span>':a.status==='completed'?'<span class="tag">مكتمل</span>':''}</div><h3>${heading}</h3><p class="analysis-summary">${escapeHTML(a.summary||'')}</p><div class="analysis-meta"><span>نُشر: ${escapeHTML(dateFormat(a.published_at))}</span>${updated?`<span>حُدّث: ${escapeHTML(dateFormat(a.updated_at))}</span>`:''}</div><details><summary>قراءة التحليل والمستويات</summary><div class="analysis-body">${notes}${levels?`<div class="analysis-levels">${levels}</div>`:''}${a.invalidation?`<p><b>شرط إبطال السيناريو:</b> ${escapeHTML(a.invalidation)}</p>`:''}${chart!=='#'?`<a class="analysis-chart-link" href="${escapeHTML(chart)}" target="_blank" rel="noopener noreferrer">فتح الرسم البياني ↗</a>`:''}</div></details></div></article>`;
}
function analysesGrid(){const assets=['all',...new Set(S.analyses.map(a=>a.asset).filter(Boolean))];const items=S.analyses.filter(a=>state.analysisAsset==='all'||a.asset===state.analysisAsset).sort((a,b)=>Date.parse(b.published_at||0)-Date.parse(a.published_at||0));return `<div class="analysis-toolbar"><div><strong>التحليلات الفنية والنظرة المستقبلية</strong><p>تحليل فني مصحوب بصورة شارت، ولا يعني بالضرورة وجود نقطة دخول فورية.</p></div><label>الأصل <select id="analysis-asset"><option value="all">كل الأصول</option>${assets.filter(x=>x!=='all').map(x=>`<option value="${escapeHTML(x)}" ${state.analysisAsset===x?'selected':''}>${escapeHTML(x)}</option>`).join('')}</select></label></div>${items.length?`<div class="analysis-grid">${items.map(analysisCard).join('')}</div>`:empty('لم تُنشر تحليلات بعد. أضف أول تحليل في ملف analyses.json مع صورة الشارت والتفاصيل.')}`}
const badges={telegram:'➤',x:'𝕏',youtube:'▶',instagram:'◎',tiktok:'♪',facebook:'f',whatsapp:'◉',email:'✉'};
function linksGrid(items){return items.length?`<div class="grid">${items.map(x=>{const ok=safeUrl(x.url)!=='#';const inside=`<span class="social-icon">${badges[x.icon]||'↗'}</span><span class="social-copy"><b>${escapeHTML(x.name)}</b><small>${escapeHTML(x.desc||'')}</small></span><span style="color:var(--muted)">${ok?'↗':'—'}</span>`;return ok?`<a class="card social-card" href="${safeUrl(x.url)}" target="_blank" rel="noopener noreferrer">${inside}</a>`:`<div class="card social-card disabled" title="الرابط لم يُضف بعد">${inside}</div>`}).join('')}</div>`:empty('لا تتوفر روابط بعد.')}
const navTitle={home:'الرئيسية',markets:'الأسواق',news:'الأخبار الاقتصادية',recs:'التوصيات',agenda:'الأجندة الاقتصادية',ict:'أدوات ICT',links:'تابعنا',more:'المزيد',intelligence:'قراءة الأخبار',academy:'أكاديمية ICT',calculators:'أدوات التداول'};
function title(eng,arabic,lead){return `<div class="eyebrow">${eng}</div><h1 class="page-title">${arabic}</h1><p class="lead">${lead}</p>`}
// Featured editorial headlines — same verified feed as the news section, no duplicate source.
let heroSlideIndex=0,heroSlideTimer=null;
function heroNews(){if(!Array.isArray(S.news))return [];const recent=S.news.filter(n=>n&&n.title).slice(0,35);const pictured=recent.filter(n=>newsImage(n)).slice(0,3);const remaining=recent.filter(n=>!pictured.includes(n)).slice(0,5-pictured.length);return [...pictured,...remaining].sort((a,b)=>new Date(b.date)-new Date(a.date));}
function heroSlideMarkup(n,i,total){
 const src=escapeHTML(n.src||'المصدر غير محدد'),tag=escapeHTML(n.tag||'اقتصاد');
 const meta=escapeHTML(dateFormat(n.date));
 const sum=n.sum?`<p class="hero-news-summary">${escapeHTML(n.sum)}</p>`:'';
 const url=safeUrl(n.url);
 const image=newsImage(n);
 const heroPhoto=image?`<div class="hero-news-photo" aria-hidden="true"><img src="${escapeHTML(image)}" alt="" decoding="async" referrerpolicy="no-referrer" onerror="this.parentElement.classList.add('image-error')"></div>`:'';
 return `${heroPhoto}<div class="hero-news-body" aria-live="off"><div class="hero-news-label"><span class="hero-news-indicator" aria-hidden="true"></span><span>${S.newsStatus==='archive'?'من أرشيف الأخبار':S.newsStatus==='stale'?'أخبار سابقة':'أبرز الأخبار الاقتصادية'}</span><span class="hero-news-counter en" dir="ltr">${i+1} / ${total}</span></div><div class="hero-news-tag">${tag}</div><h2 class="hero-news-title">${escapeHTML(n.title)}</h2>${sum}<div class="hero-news-meta"><span>${src}</span><span aria-hidden="true">•</span><span>${meta}</span></div><div class="hero-news-action">${url!=='#'?`<a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer" class="hero-news-link">اقرأ الخبر من المصدر <span aria-hidden="true">↗</span></a>`:`<a href="#news" class="hero-news-link">استعرض الأخبار <span aria-hidden="true">←</span></a>`}</div></div>`;
}
function heroSlider(){
 const items=heroNews();
 if(!items.length)return `<div class="hero-news-slider hero-news-empty"><span class="eyebrow">HEADLINES</span><h2>أبرز الأخبار الاقتصادية</h2><p>لا توجد أخبار متاحة حاليًا. تصفح قسم الأخبار لاحقًا.</p><a class="hero-news-link" href="#news">قسم الأخبار ←</a></div>`;
 heroSlideIndex=((heroSlideIndex%items.length)+items.length)%items.length;
 const dots=items.map((_,i)=>`<button class="hero-news-dot ${i===heroSlideIndex?'is-active':''}" type="button" data-hero-index="${i}" aria-label="عرض الخبر ${i+1}" aria-pressed="${i===heroSlideIndex}"></button>`).join('');
 return `<section class="hero-news-slider" id="hero-news-slider" aria-roledescription="عارض أخبار" aria-label="أبرز الأخبار الاقتصادية"><div id="hero-slide-content" class="hero-slide-content">${heroSlideMarkup(items[heroSlideIndex],heroSlideIndex,items.length)}</div><div class="hero-news-controls"><div class="hero-news-dots" aria-label="اختيار الخبر">${dots}</div><div class="hero-news-arrows"><button type="button" data-hero-move="-1" aria-label="الخبر السابق">❮</button><button type="button" data-hero-move="1" aria-label="الخبر التالي">❯</button><button type="button" data-hero-pause aria-label="إيقاف التبديل التلقائي" title="إيقاف التبديل التلقائي">Ⅱ</button></div></div></section>`;
}
function showHeroSlide(index){
 const items=heroNews(),host=document.getElementById('hero-slide-content');if(!host||!items.length)return;
 heroSlideIndex=(index+items.length)%items.length;
 host.innerHTML=heroSlideMarkup(items[heroSlideIndex],heroSlideIndex,items.length);
 document.querySelectorAll('.hero-news-dot').forEach((b,i)=>{b.classList.toggle('is-active',i===heroSlideIndex);b.setAttribute('aria-pressed',String(i===heroSlideIndex))});
}
let heroSlidePaused=false;
function initHeroSlider(){
 if(heroSlideTimer){clearInterval(heroSlideTimer);heroSlideTimer=null}
 const slider=document.getElementById('hero-news-slider');
 if(!slider||heroNews().length<2)return;
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 if(heroSlidePaused)return;
 heroSlideTimer=setInterval(()=>{
  if(state.page==='home'&&document.visibilityState==='visible'&&!slider.matches(':hover')&&!slider.matches(':focus-within'))showHeroSlide(heroSlideIndex+1)
 },7000);
}
// Shared upcoming-event selector: the agenda and Market Pulse must use both FF weeks.
// Do not tie the next-event card to the currently selected calendar tab.
function upcomingHighImpact(days=8){
 const now=Date.now(),until=now+days*86400000;
 const current=['fresh','stale'].includes(S.liveStatus)?S.liveEvents:[];
 const next=['fresh','stale'].includes(S.nextStatus)&&S.nextWeekStart===calendarWeekKey(1)?S.nextEvents:[];
 return [...current,...next].filter(e=>e&&e.impact===3&&e.dt instanceof Date&&Number.isFinite(e.dt.getTime())&&e.dt.getTime()>now&&e.dt.getTime()<until)
  .sort((a,b)=>a.dt-b.dt).filter((e,i,arr)=>arr.findIndex(x=>x.id===e.id)===i)[0]||null;
}
function upcomingCalendarAvailable(){return ['fresh','stale'].includes(S.liveStatus)||(['fresh','stale'].includes(S.nextStatus)&&S.nextWeekStart===calendarWeekKey(1));}
// ICT 4.4 — a concise desk: actual published content, no manufactured signals.
function traderDashboard(){
 const published=S.recs.filter(r=>!r.sample),active=published.filter(r=>['open','pending'].includes(r.status||'open'));
 const coming=upcomingHighImpact();
 const zone=currentIctWindow();
 const latestAnalysis=S.analyses.slice().sort((a,b)=>Date.parse(b.published_at||0)-Date.parse(a.published_at||0))[0];
 const latest=latestAnalysis?escapeHTML(latestAnalysis.title||latestAnalysis.asset||'تحليل فني'):'لا توجد تحليلات منشورة';
 return `<section class="trader-desk" aria-label="لوحة المتداول اليومية"><div class="trader-desk-head"><div><span class="eyebrow">TRADER'S DESK</span><h2>لوحة المتداول اليومية</h2></div><span class="trader-desk-date">${escapeHTML(showDate(new Date(),'date'))}</span></div><div class="trader-desk-grid"><a class="desk-tile" href="#ict"><small>النافذة الحالية</small><strong dir="ltr">${escapeHTML(zone.active?zone.title:'خارج نوافذ ICT')}</strong><span>${zone.active?'نشطة الآن':'اطلع على النافذة التالية'} ←</span></a><a class="desk-tile" href="#agenda"><small>الخبر القوي القادم</small><strong>${coming?escapeHTML(coming.title):'لا يوجد حدث مؤكد حديثًا'}</strong><span>${coming?`الوقت ${escapeHTML(showDate(coming.dt))}`:'فتح الأجندة'} ←</span></a><a class="desk-tile" href="#recs"><small>التوصيات المعلّقة والنشطة</small><strong class="desk-number en">${active.length}</strong><span>متابعة الحالات والنتائج ←</span></a><a class="desk-tile" href="#recs"><small>أحدث تحليل فني</small><strong>${latest}</strong><span>قراءة التحليل ←</span></a></div><p class="desk-disclaimer">بيانات الجلسات إرشادية، وتُحدّث الأخبار والأسعار حسب المصدر. القرارات وإدارة المخاطر مسؤولية المتداول.</p></section>`;
}

function operationsRoom(){
 const posted=S.recs.filter(r=>!r.sample);
 const active=posted.filter(r=>['open','pending'].includes(r.status||'open'));
 const pending=posted.filter(r=>(r.status||'open')==='pending').length;
 const finished=posted.filter(r=>['tp','sl'].includes(r.status||''));
 const rate=finished.length?`${(100*finished.filter(r=>r.status==='tp').length/finished.length).toFixed(1)}%`:'—';
 const latest=S.analyses.slice().sort((a,b)=>Date.parse(b.updated_at||b.published_at||0)-Date.parse(a.updated_at||a.published_at||0))[0];
 const headline=latest?escapeHTML(latest.title||latest.asset||'تحليل فني'):'لا يوجد تحليل منشور بعد';
 const analysisMeta=latest?`${escapeHTML(latest.asset||'الأسواق')} • ${escapeHTML(dateFormat(latest.updated_at||latest.published_at))}`:'يمكن متابعة التحليلات الجديدة من قسم التوصيات';
 return `<section class="ops-room ops-room-v66" aria-label="غرفة عمليات التداول">
 <div class="ops-room-head"><div><span class="eyebrow">TRADER ACTION DESK</span><h2>غرفة عمليات التداول</h2><p>هنا قرارات المتداول وأدواته؛ الجلسة والأخبار القادمة وحركة الأسواق موجودة مرة واحدة في Market Pulse بالأعلى.</p></div><a class="ops-v66-headlink" href="workflow.html">ابدأ خطة صفقة ←</a></div>
 <div class="ops-grid">
 <a class="ops-card" href="#recs"><div class="ops-card-top"><span class="ops-tag">TRADE TRACKER</span><span class="ops-kicker">التوصيات المنشورة</span></div><h3>حالات التوصيات</h3><div class="ops-stats-row"><span><small>نشطة ومعلقة</small><b class="en">${active.length}</b></span><span><small>قيد الانتظار</small><b class="en">${pending}</b></span><span><small>نجاح موثق*</small><b class="en">${rate}</b></span></div><p class="ops-copy">*النسبة للصفقات المنشورة التي انتهت بهدف أو وقف فقط.</p></a>
 <a class="ops-card" href="#recs"><div class="ops-card-top"><span class="ops-tag">EDITOR'S VIEW</span><span class="ops-kicker">أحدث تحليل</span></div><h3>${headline}</h3><div class="ops-meta-list"><span>${analysisMeta}</span></div><p class="ops-copy">اعرض التحليل والمستويات الفنية المرتبطة به.</p></a>
 <a class="ops-card" href="workflow.html"><div class="ops-card-top"><span class="ops-tag">YOUR NEXT STEP</span><span class="ops-kicker">إدارة المخاطرة</span></div><h3>حضّر الصفقة قبل الدخول</h3><p class="ops-copy">اختر توصية، راجع شروط ICT، احسب مخاطرتك، ثم سجّل نتيجتك الفعلية.</p><span class="ops-v66-arrow">فتح رحلة الصفقة ←</span></a>

 </div></section>`;
}
function sessionTimeline(){
 const now=Date.now(),today=nyToday();
 const dayOffset=(delta)=>{const d=new Date(today+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+delta);return d.toISOString().slice(0,10)};
 const items=ictZones.map(([name,start,end,desc])=>{
  const windows=[-1,0,1,2].map(offset=>{
   const begin=nyLocalToUtc(dayOffset(offset),start);
   const finish=nyLocalToUtc(dayOffset(offset+(end<=start?1:0)),end);
   return {begin,finish};
  });
  const activeWindow=windows.find(w=>now>=w.begin.getTime()&&now<w.finish.getTime());
  const upcoming=windows.filter(w=>w.begin.getTime()>now).sort((a,b)=>a.begin-b.begin)[0];
  return {name,start,end,desc,begin:activeWindow?.begin||upcoming?.begin,finish:activeWindow?.finish||upcoming?.finish,active:Boolean(activeWindow)};
 });
 const filtered=items.filter(z=>sessionCategory==='all'||(sessionCategory==='sb'?z.name.includes('Silver Bullet'):sessionCategory==='kz'?z.name.includes('Kill Zone'):!z.name.includes('Silver Bullet')&&!z.name.includes('Kill Zone')));
 return `<section class="ict-session-pro"><div class="session-pro-head"><div><span class="eyebrow">SMART SESSIONS</span><h2>خريطة جلسات ICT التفاعلية</h2></div><div class="session-live-clock"><span>نيويورك</span><strong class="en" dir="ltr">${nyClock()}</strong></div></div><div class="session-tabs" role="group" aria-label="تصفية جلسات ICT">${[['all','الكل'],['kz','Kill Zones'],['sb','Silver Bullet'],['other','جلسات أخرى']].map(([key,label])=>`<button type="button" data-session-filter="${key}" class="chip ${sessionCategory===key?'active':''}" aria-pressed="${sessionCategory===key}">${label}</button>`).join('')}</div><div class="session-pro-grid">${filtered.map(z=>`<article class="session-pro-item ${z.active?'is-live':''}"><div class="session-pro-title"><b dir="ltr">${escapeHTML(z.name)}</b><span class="session-pro-state">${z.active?'نشطة':'خارج النافذة'}</span></div><div class="session-pro-ny en" dir="ltr">${z.start} – ${z.end} NY</div><div class="session-pro-time">${z.active?'بدأت':'تبدأ'} بتوقيتك: <strong class="en" dir="ltr">${escapeHTML(showDate(z.begin))}</strong></div><div class="session-pro-countdown">${z.active?'تنتهي بعد':'تبدأ بعد'} ${pulseClock((z.active?z.finish:z.begin).getTime(),'session-pro-clock')}</div><p>${escapeHTML(z.desc)}</p></article>`).join('')}</div><p class="session-pro-caution">الأوقات حسب نيويورك وتراعي تغيّر التوقيت الموسمي. المواعيد تعليمية، وقد تختلف تعريفاتها بين مدارس ICT.</p></section>`;
}
let sessionCategory='all';

function home(){
 return `<section class="welcome welcome-news-layout"><div class="hero-news-column">${heroSlider()}</div><div class="welcome-aside pulse-desk" id="market-pulse" aria-label="ملخص الأسواق والأخبار والجلسات">${marketPulse()}</div></section>${operationsRoom()}
 <div class="section-title"><div><span class="eyebrow">QUICK ACCESS</span><h2>مركز التداول</h2></div><span class="subtle">اختصارات التشغيل السريع لأهم الأدوات</span></div><div class="tool-grid"><a class="tool-card" href="assets.html"><span class="tool-glyph">◉</span><strong>دليل الأصول المالية</strong><span>صفحات مستقلة للذهب والعملات والمؤشرات</span><b>تصفح الأصول ←</b></a><a class="tool-card" href="workflow.html"><span class="tool-glyph">◈</span><strong>رحلة الصفقة الذكية</strong><span>من التوصية إلى المراجعة والحاسبة وسجل النتائج</span><b>افتح الأداة ←</b></a><a class="tool-card" href="smart-desk.html"><span class="tool-glyph">◈</span><strong>غرفة المتداول الذكية</strong><span>Trader DNA، البحث في محتوى الموقع، ومتابعة الأخبار والتوصيات</span><b>افتح الغرفة ←</b></a><a class="tool-card" href="research.html"><span class="tool-glyph">▣</span><strong>مختبر الأبحاث التاريخية</strong><span>اختبار الاستراتيجيات وآلة الزمن ومكتبة نماذج ICT</span><b>ابدأ البحث ←</b></a><a class="tool-card" href="intelligence.html"><span class="tool-glyph">◉</span><strong>مختبر ذكاء الأسواق</strong><span>رادار المتابعة وأشعة السوق ورد فعل الأخبار</span><b>افتح المختبر ←</b></a><a class="tool-card" href="workspace.html"><span class="tool-glyph">✦</span><strong>مساحتي الخاصة</strong><span>حارس الحساب الممول ومراجعة الصفقة وتخصيص الأدوات</span><b>افتح مساحتي ←</b></a><a class="tool-card" href="#calculators"><span class="tool-glyph">◉</span><strong>حاسبات المخاطرة</strong><span>حجم الصفقة والعائد إلى المخاطرة</span><b>افتح الحاسبات ←</b></a><a class="tool-card" href="#intelligence"><span class="tool-glyph">◈</span><strong>قراءة نتائج الأخبار</strong><span>قارن نتائج الأحداث الاقتصادية</span><b>استكشف ←</b></a><a class="tool-card" href="#academy"><span class="tool-glyph">▣</span><strong>أكاديمية ICT</strong><span>دروس واختبارات تفاعلية</span><b>ابدأ التعلم ←</b></a><a class="tool-card" href="#markets"><span class="tool-glyph">▥</span><strong>مراقبة الأسواق</strong><span>خريطة حرارية ومخطط تفاعلي</span><b>استكشف ←</b></a><a class="tool-card" href="#agenda"><span class="tool-glyph">▦</span><strong>الأجندة الاقتصادية</strong><span>بحث وتصفية حسب الأهمية</span><b>استكشف ←</b></a><a class="tool-card" href="#ict"><span class="tool-glyph">◎</span><strong>جلسات ICT</strong><span>أوقات نيويورك وKill Zones</span><b>استكشف ←</b></a><a class="tool-card" href="#recs"><span class="tool-glyph">↗</span><strong>التوصيات</strong><span>المستويات والحالات والأرشيف</span><b>استكشف ←</b></a></div>
 ${notificationCenter('compact')}`;
}

// Market Pulse: Yahoo snapshot selects periodic movers only. TradingView supplies the displayed quotes.
const moverFreshMs=6*60*60*1000; // Snapshot polling is not a live streaming quote service
const allowedPulseSymbols=new Set(['EURUSD','GBPUSD','USDJPY','USDCHF','USDCAD','AUDUSD','NZDUSD','XAUUSD','XAGUSD','NAS100','SP500','DJ30','WTI','BTCUSD','ETHUSD']);
async function fetchMovers(){
 let payload=null;
 try{const r=await fetch('market-movers.json?t='+Date.now(),{cache:'no-store'});if(r.ok)payload=await r.json()}catch(e){console.info('Market snapshot unavailable',e.message)}
 const when=new Date(payload?.updatedAt||''),age=Date.now()-when.getTime();
 const rows=Array.isArray(payload?.items)?payload.items.filter(x=>allowedPulseSymbols.has(x.symbol)&&Number.isFinite(Number(x.change))&&Math.abs(Number(x.change))<100&&Number.isFinite(Date.parse(x.quotedAt))&&typeof x.url==='string'&&/^https:\/\/www\.tradingview\.com\//.test(x.url)).map(x=>({symbol:x.symbol,label:String(x.label||x.symbol),change:Number(x.change),price:(x.price!==null&&x.price!==undefined&&x.price!==''&&Number.isFinite(Number(x.price))&&Number(x.price)>0)?Number(x.price):null,quotedAt:x.quotedAt,proxy:Boolean(x.proxy),url:x.url,category:String(x.category||'')})):[];
 S.movers=rows;S.moversUpdated=when;
 S.moversStatus=rows.length&&Number.isFinite(age)&&age>=-300000&&age<moverFreshMs?'fresh':rows.length&&Number.isFinite(age)&&age<72*3600000?'stale':'unavailable';refreshPulse();ticker();
}
function compactCountdown(ms){const secs=Math.max(0,Math.floor(ms/1000));const days=Math.floor(secs/86400),hh=Math.floor(secs%86400/3600),mm=Math.floor(secs%3600/60),ss=secs%60;return days?`${days}d ${String(hh).padStart(2,'0')}h ${String(mm).padStart(2,'0')}m`:`${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`}
function currentIctWindow(){
 const now=new Date(),today=nyToday();
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));
 const mins=parts.hour*60+parts.minute;
 const windows=ictZones.map(([name,start,end,description])=>{
   const a=Number(start.slice(0,2))*60+Number(start.slice(3)),b=Number(end.slice(0,2))*60+Number(end.slice(3));
   const active=a<b?(mins>=a&&mins<b):(mins>=a||mins<b);
   let startDate=nyLocalToUtc(today,start),endDate=nyLocalToUtc(today,end);
   if(a>=b){if(mins<b)startDate=new Date(startDate.getTime()-86400000);else endDate=new Date(endDate.getTime()+86400000)}
   if(!active&&startDate<=now)startDate=new Date(startDate.getTime()+86400000);
   return {name,start,end,description,active,startDate,endDate};
 });
 const priority=['New York AM Silver Bullet','London Silver Bullet','New York PM Silver Bullet','New York Kill Zone','London Kill Zone','London Close','Asian Session'];
 const active=windows.filter(z=>z.active).sort((a,b)=>priority.indexOf(a.name)-priority.indexOf(b.name));
 const picked=active[0];
 if(!picked){const upcoming=windows.sort((a,b)=>a.startDate-b.startDate)[0];return {active:false,title:'خارج نوافذ ICT المحددة',next:upcoming,others:0}}
 return {...picked,title:picked.name,others:active.length-1};
}
function pulseClock(deadline,klass){return `<b class="en ${klass}" dir="ltr" data-deadline="${Number(deadline)}">${compactCountdown(Number(deadline)-Date.now())}</b>`}
// ICT v3.7: use the actual published quote; never estimate missing prices from percent change.
function marketQuotePrice(x){
 const n=x.price;
 if(typeof n!=='number'||!Number.isFinite(n)||n<=0)return '—';
 const fixed=({EURUSD:5,GBPUSD:5,USDJPY:3,USDCHF:5,USDCAD:5,AUDUSD:5,NZDUSD:5,XAUUSD:2,XAGUSD:3,NAS100:2,SP500:2,DJ30:2,WTI:2,BTCUSD:2,ETHUSD:2})[x.symbol]??2;
 return new Intl.NumberFormat('en-US',{minimumFractionDigits:fixed,maximumFractionDigits:fixed}).format(n);
}
function marketTickerCard(x,icon){
 const trend=x.change>0?'up':x.change<0?'down':'flat';
 const arrow=trend==='up'?'▲':trend==='down'?'▼':'◆';
 const pct=(x.change>0?'+':'')+x.change.toFixed(2)+'%';
 const quote=marketQuotePrice(x);
 const extra=x.proxy?' — سعر عقد آجل مرجعي':'';
 return `<span class="market-ticker-item ticker-${trend==='up'?'rising':trend==='down'?'falling':'flat'}" title="${escapeHTML(x.label)}${extra} — ${quote==='—'?'السعر غير متاح':`السعر ${quote}`} • التغير ${pct}"><span class="ticker-asset-icon ticker-cat-${escapeHTML(x.category||'misc')}" aria-hidden="true">${escapeHTML(icon)}</span><span class="market-ticker-symbol en" dir="ltr">${escapeHTML(x.symbol)}</span><span class="ticker-last en" dir="ltr" aria-label="السعر">${quote}</span><span class="ticker-change ${trend} en" dir="ltr"><span class="ticker-arrow" aria-hidden="true">${arrow}</span><strong>${pct}</strong></span></span>`;
}
// Local vector insignia/flags: no external logo hotlinks and no proprietary TradingView artwork.
const marketFlagPairs={EURUSD:['eur','usd'],GBPUSD:['gbp','usd'],USDJPY:['usd','jpy'],USDCHF:['usd','chf'],USDCAD:['usd','cad'],AUDUSD:['aud','usd'],NZDUSD:['nzd','usd']};
const marketIconFiles={XAUUSD:'gold',XAGUSD:'silver',NAS100:'nas100',SP500:'sp500',DJ30:'dj30',WTI:'oil',BTCUSD:'btc',ETHUSD:'eth'};
function marketLogo(x){
 const flags=marketFlagPairs[x.symbol];
 if(flags)return `<span class="mover-currency-pair" aria-hidden="true"><img src="market-icons/${flags[0]}.svg" alt=""><img src="market-icons/${flags[1]}.svg" alt=""></span>`;
 const icon=marketIconFiles[x.symbol]||'market';
 return `<span class="mover-icon" aria-hidden="true"><img src="market-icons/${icon}.svg" alt=""></span>`;
}
function tvChartUrl(symbol){return `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tvMarketSymbols[symbol]||'FX:EURUSD')}`;}
function moverRow(x,highlight){
 const trend=x.change>0?'up':x.change<0?'down':'flat';
 const arrow=trend==='up'?'↗':trend==='down'?'↘':'→';
 const pct=(x.change>0?'+':'')+x.change.toFixed(2)+'%';
 const date=new Date(x.quotedAt||S.moversUpdated);
 const stamp=Number.isFinite(date.getTime())?dateFormat(date.toISOString()):'';
 const delayed=S.moversStatus!=='fresh';
 const quote=delayed?'—':marketQuotePrice(x);
 const priceTitle=quote==='—'?'سعر غير متاح من لقطة حديثة':`السعر الدوري المرجعي ${quote}`;
 return `<a class="pulse-mover-row ${trend}${highlight?' mover-highlight':''}" href="${escapeHTML(tvChartUrl(x.symbol))}" target="_blank" rel="noopener noreferrer" aria-label="فتح شارت ${escapeHTML(x.label)} على TradingView" title="${escapeHTML(priceTitle)}${stamp?' • '+escapeHTML(stamp):''}"><span class="pulse-mover-main">${marketLogo(x)}<span class="pulse-mover-copy"><b class="en" dir="ltr">${escapeHTML(x.symbol)}</b><small class="pulse-mover-source">${escapeHTML(x.label)}</small></span></span><span class="pulse-mover-quote"><b class="en pulse-mover-price" dir="ltr">${quote}</b><span class="pulse-mover-change ${trend} en" dir="ltr"><span aria-hidden="true">${arrow}</span><strong>${pct}</strong></span></span></a>`;
}
function moversBoard(){
 if(!Array.isArray(S.movers)||!S.movers.length)return '';
 const good=S.movers.filter(x=>tvMarketSymbols[x.symbol]&&Number.isFinite(x.change)).slice();
 if(!good.length)return '';
 const rising=good.filter(x=>x.change>0).sort((a,b)=>b.change-a.change).slice(0,3);
 const falling=good.filter(x=>x.change<0).sort((a,b)=>a.change-b.change).slice(0,3);
 if(!rising.length&&!falling.length)return '';
 const when=S.moversUpdated instanceof Date&&Number.isFinite(S.moversUpdated.getTime())?dateFormat(S.moversUpdated.toISOString()):'غير متاح';
 const freshness=S.moversStatus==='fresh'?'لقطة دورية':'بيانات قديمة';
 return `<div class="pulse-movers-board"><div class="pulse-movers-meta"><span class="movers-time-icon" aria-hidden="true">◷</span><span>آخر تحديث: <b>${escapeHTML(when)}</b></span><span class="movers-fresh-state ${S.moversStatus==='fresh'?'':'is-stale'}">${freshness}</span></div><div class="pulse-movers-layout"><div class="pulse-movers-col is-up"><div class="pulse-movers-head"><div class="movers-heading-name"><span class="movers-trend-symbol">↗</span><b>الأكثر صعودًا</b></div><span class="movers-head-en">TOP GAINERS</span></div>${rising.length?rising.map((x,i)=>moverRow(x,i===0&&Math.abs(x.change)>=2)).join(''):`<p class="pulse-movers-empty">لا توجد أصول صاعدة</p>`}</div><div class="pulse-movers-col is-down"><div class="pulse-movers-head"><div class="movers-heading-name"><span class="movers-trend-symbol">↘</span><b>الأكثر هبوطًا</b></div><span class="movers-head-en">TOP LOSERS</span></div>${falling.length?falling.map((x,i)=>moverRow(x,i===0&&Math.abs(x.change)>=2)).join(''):`<p class="pulse-movers-empty">لا توجد أصول هابطة</p>`}</div></div></div>`;
}
// TradingView displays the quotes; snapshot metadata is used ONLY to choose
// the leaders/laggards, never as displayed market prices.
const tvMarketSymbols={
 EURUSD:'FX:EURUSD',GBPUSD:'FX:GBPUSD',USDJPY:'FX:USDJPY',USDCHF:'FX:USDCHF',
 USDCAD:'FX:USDCAD',AUDUSD:'FX:AUDUSD',NZDUSD:'FX:NZDUSD',
 XAUUSD:'OANDA:XAUUSD',XAGUSD:'OANDA:XAGUSD',
 NAS100:'FOREXCOM:NSXUSD',SP500:'FOREXCOM:SPXUSD',DJ30:'FOREXCOM:DJI',
 WTI:'TVC:USOIL',BTCUSD:'BITSTAMP:BTCUSD',ETHUSD:'BITSTAMP:ETHUSD'
};
const tvMarketOrder=['EURUSD','GBPUSD','USDJPY','USDCHF','USDCAD','AUDUSD','NZDUSD','XAUUSD','XAGUSD','NAS100','SP500','DJ30','WTI','BTCUSD','ETHUSD'];
function tvTickerSymbols(list){return list.filter(s=>tvMarketSymbols[s]).map(s=>({proName:tvMarketSymbols[s],title:s}));}
function mountTvTicker(root,symbols,theme,transparent=true){
 if(!root||root.dataset.tvMounted==='yes')return;
 root.dataset.tvMounted='yes';
 const script=document.createElement('script');
 script.async=true;
 script.src='https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
 script.text=JSON.stringify({symbols:tvTickerSymbols(symbols),showSymbolLogo:false,
   isTransparent:transparent,displayMode:'adaptive',colorTheme:theme,locale:'en'});
 root.appendChild(script);
}
function pulseLeaders(){
 // A periodic, dated Yahoo snapshot only chooses which symbols to show.
 // Do not label the ranking live or mix its numerical quotes into the widget.
 if(S.moversStatus!=='fresh'||!Array.isArray(S.movers))return null;
 const good=S.movers.filter(x=>tvMarketSymbols[x.symbol]&&Number.isFinite(x.change));
 const rising=good.filter(x=>x.change>0).sort((a,b)=>b.change-a.change).slice(0,3);
 const falling=good.filter(x=>x.change<0).sort((a,b)=>a.change-b.change).slice(0,3);
 return rising.length&&falling.length?[...rising,...falling].map(x=>x.symbol):null;
}
function marketPulse(){
 const now=Date.now(),leaders=pulseLeaders();
 const board=moversBoard()||`<div class="tv-live-pulse fallback" data-tv-key="EURUSD|XAUUSD|NAS100|BTCUSD|GBPUSD|ETHUSD"><div class="tradingview-widget-container"><div class="tradingview-widget-container__widget"></div></div></div>`;
 const ticker=board;
 const marketAlternative='';
 const next=upcomingHighImpact();
 const economic=next?`<div class="pulse-news-head"><span class="pulse-currency">${escapeHTML(next.currency)}</span><strong>${escapeHTML(next.title)}</strong><span class="pulse-impact-label">تأثير مرتفع${S.liveStatus==='stale'||S.nextStatus==='stale'?' • تحقق من الموعد':''}</span></div><div class="pulse-countdown">${pulseClock(next.dt.getTime(),'pulse-news-clock')}<span class="pulse-countdown-caption">حتى صدور الخبر</span></div><details class="pulse-extra"><summary>الموعد والتوقعات</summary><div class="pulse-news-info"><span>الموعد: <b>${escapeHTML(showDate(next.dt,'date'))} — ${escapeHTML(showDate(next.dt))}</b> (${escapeHTML(zoneLabel())})</span><span>السابق: <b class="en" dir="ltr">${escapeHTML(next.previous)}</b></span><span>المتوقع: <b class="en" dir="ltr">${escapeHTML(next.forecast)}</b></span></div></details>`:`<p class="pulse-unavailable">${upcomingCalendarAvailable()?'لا يوجد خبر مرتفع التأثير خلال الأيام الثمانية القادمة في بيانات الأسبوعين المتاحة':'لا تتوفر بيانات أجندة صالحة حاليًا؛ افتح قسم الأجندة للتحقق من حالة المصدر'}</p>`;
 const zone=currentIctWindow();
 const session=zone.active?`<div class="pulse-zone-name"><span class="pulse-indicator is-active"></span><strong dir="ltr">${escapeHTML(zone.title)}</strong><span class="pulse-state">نشطة الآن</span></div><div class="pulse-zone-timer">تنتهي بعد ${pulseClock(zone.endDate.getTime(),'pulse-zone-clock')}</div><details class="pulse-extra"><summary>مواعيد النافذة</summary><p class="pulse-zone-desc">${escapeHTML(zone.description)}</p><div class="pulse-zone-details"><span>بتوقيت نيويورك <strong class="en" dir="ltr">${zone.start} – ${zone.end}</strong></span><span>بتوقيتك <strong class="en" dir="ltr">${escapeHTML(showDate(zone.startDate))} – ${escapeHTML(showDate(zone.endDate))}</strong></span></div></details>${zone.others?`<small>هناك ${zone.others} نافذة أخرى متزامنة</small>`:''}`:`<div class="pulse-zone-name"><span class="pulse-indicator"></span><strong>${escapeHTML(zone.title)}</strong></div>${zone.next?`<div class="pulse-zone-next">القادمة: <strong dir="ltr">${escapeHTML(zone.next.name)}</strong> <span>بعد ${pulseClock(zone.next.startDate.getTime(),'pulse-zone-clock')}</span></div><details class="pulse-extra"><summary>مواعيد النافذة القادمة</summary><p class="pulse-zone-desc">${escapeHTML(zone.next.description)}</p><div class="pulse-zone-details"><span>نيويورك <strong class="en" dir="ltr">${zone.next.start} – ${zone.next.end}</strong></span><span>بداية النافذة بتوقيتك <strong class="en" dir="ltr">${escapeHTML(showDate(zone.next.startDate))}</strong></span></div></details>`:''}`;
 return `<div class="panel-top"><span>MARKET PULSE</span><span class="outline-pill">ملخص التداول</span></div><div class="pulse-block pulse-market"><div class="pulse-heading"><b>الأكثر صعودًا وهبوطًا</b><span class="pulse-quiet-badge">${leaders?'ترتيب دوري':'أسواق مختارة'}</span></div>${ticker}${marketAlternative}<div class="pulse-foot">${moversBoard()?'الترتيب والأسعار أعلاه دورية وليست أسعار TradingView المباشرة.':'أسعار من TradingView؛ قد تتأخر بعض الأسواق.'}</div></div><div class="pulse-brief-grid" aria-label="الخبر الاقتصادي القادم ونافذة ICT"><section class="pulse-block pulse-event" aria-label="الخبر الاقتصادي القوي القادم"><div class="pulse-heading"><b>الخبر الاقتصادي القوي القادم</b><span class="pulse-quiet-badge">HIGH IMPACT</span></div>${economic}</section><section class="pulse-block pulse-session" aria-label="نافذة ICT الحالية"><div class="pulse-heading"><b>نافذة ICT الحالية</b><span class="pulse-quiet-badge">NEW YORK TIME</span></div>${session}</section></div>`;
}
function refreshPulse(){
 const node=document.getElementById('market-pulse');if(!node||state.page!=='home')return;
 // Keep the TradingView iframe alive while refreshing the event/session clocks.
 const oldWidget=node.querySelector('.tv-live-pulse');
 const oldKey=oldWidget?.dataset.tvKey;
 node.innerHTML=marketPulse();
 const newWidget=node.querySelector('.tv-live-pulse');
 if(oldWidget&&newWidget&&oldKey===newWidget.dataset.tvKey)newWidget.replaceWith(oldWidget);
 updatePulseClocks();initPulseFallback();
}
function initPulseFallback(){
 const node=document.querySelector('.tv-live-pulse');if(!node)return;
 mountTvTicker(node.querySelector('.tradingview-widget-container'),node.dataset.tvKey.split('|'),'dark');
}
function updatePulseClocks(){document.querySelectorAll('#market-pulse [data-deadline]').forEach(el=>{const deadline=Number(el.dataset.deadline);if(Number.isFinite(deadline))el.textContent=compactCountdown(deadline-Date.now())})}
function news(){const tags=['الكل',...new Set(S.news.map(n=>n.tag).filter(Boolean))],items=state.nf==='الكل'?S.news:S.news.filter(n=>n.tag===state.nf);return `${title('ECONOMIC NEWS','الأخبار الاقتصادية','عناوين اقتصادية عالمية تتجدد تلقائيًا من مصادرها مع روابط القراءة الأصلية.') }<div class="news-feed-top">${newsBadge()}<span>${newsStatusLine()}</span><button type="button" class="chip" id="refresh-news">تحديث الآن ↻</button></div><div class="filter-bar">${tags.map(x=>`<button class="chip ${state.nf===x?'active':''}" data-filter="nf" data-value="${escapeHTML(x)}">${escapeHTML(x)}</button>`).join('')}</div>${newsGrid(items)}`}
function tradeStats(){
 const list=S.recs.filter(r=>!r.sample),won=list.filter(r=>r.status==='tp').length,lost=list.filter(r=>r.status==='sl').length,closed=won+lost;
 return `<div class="trade-stats" aria-label="ملخص نتائج التوصيات"><div><small>منشورات حقيقية</small><b class="en">${list.length}</b></div><div><small>نشطة / معلّقة</small><b class="en">${list.filter(r=>['open','pending'].includes(r.status||'open')).length}</b></div><div><small>حقق الهدف</small><b class="en">${won}</b></div><div><small>وقف الخسارة</small><b class="en">${lost}</b></div><div><small>نسبة النجاح الموثقة</small><b class="en">${closed?`${(won/closed*100).toFixed(1)}%`:'—'}</b></div></div><p class="trade-stats-note">نسبة النجاح مبنية فقط على توصيات سُجلت نتيجتها كهدف أو وقف خسارة، ولا تشمل الإغلاقات اليدوية أو الصفقات الملغاة، ولا تمثل عائدًا ماليًا.</p>`;
}
function recommendations(){const f=[['all','الكل'],['pending','معلّقة'],['open','مفعّلة'],['tp','تحقق الهدف'],['sl','وقف الخسارة'],['cl','مغلقة'],['cancelled','ملغاة']],items=state.rf==='all'?S.recs:S.recs.filter(x=>(x.status||'open')===state.rf);return `${title('TRADE IDEAS & ANALYSIS','التوصيات والتحليلات','أفكار تداول محددة المستويات، وتحليلات فنية طويلة وقصيرة المدى مصحوبة بالشارت.')}<div class="content-tabs" role="group" aria-label="نوع المحتوى"><button type="button" data-content-tab="signals" class="${state.contentTab==='signals'?'selected':''}" aria-pressed="${state.contentTab==='signals'}">↗ التوصيات <span>${S.recs.filter(x=>!x.sample).length}</span></button><button type="button" data-content-tab="analysis" class="${state.contentTab==='analysis'?'selected':''}" aria-pressed="${state.contentTab==='analysis'}">▥ التحليلات الفنية <span>${S.analyses.length}</span></button></div>${state.contentTab==='analysis'?analysesGrid():`${tradeStats()}<div class="notice">التوصيات معلومات تعليمية وليست ضمانًا أو نصيحة استثمارية. تحقق من مستويات التنفيذ وإدارة المخاطر.</div><div class="filter-bar">${f.map(([v,n])=>`<button class="chip ${state.rf===v?'active':''}" data-filter="rf" data-value="${v}">${n}</button>`).join('')}</div>${recGrid(items)}`}${notificationCenter('compact')}`}

const countries={ALL:'كل الدول',US:'أمريكا',GB:'بريطانيا',CA:'كندا',AU:'أستراليا',NZ:'نيوزيلندا',CN:'الصين',EU:'منطقة اليورو',JP:'اليابان',CH:'سويسرا'};
const impactLabel={3:'مرتفع',2:'متوسط',1:'منخفض'},impactClass={3:'high',2:'medium',1:'low'};
function eventDate(day,time){return new Date(`${day}T${time.replace('~','')}:00+02:00`)}
// Date/time settings shared between agenda, ICT and header; IANA TZ handles DST automatically.
const timeZones=[['device','توقيت الجهاز (تلقائي)'],['Asia/Gaza','فلسطين — غزة'],['America/New_York','نيويورك'],['Europe/London','لندن'],['Europe/Paris','باريس'],['Europe/Berlin','برلين'],['Europe/Istanbul','إسطنبول'],['Asia/Dubai','دبي'],['Asia/Riyadh','الرياض'],['Africa/Cairo','القاهرة'],['Asia/Tokyo','طوكيو'],['Asia/Singapore','سنغافورة'],['Australia/Sydney','سيدني'],['Etc/UTC','UTC (العالمي)']];
function currentZone(){const stored=localStorage.getItem('ict-timezone')||'device';return stored==='device'?Intl.DateTimeFormat().resolvedOptions().timeZone:stored}
function zoneLabel(){const stored=localStorage.getItem('ict-timezone')||'device';return timeZones.find(x=>x[0]===stored)?.[1]||stored}
function tzPicker(){return `<label class="tz-label" for="tz-selector">المنطقة الزمنية</label><select id="tz-selector" aria-label="اختيار المنطقة الزمنية">${timeZones.map(([val,label])=>`<option value="${val}" ${val===(localStorage.getItem('ict-timezone')||'device')?'selected':''}>${label}</option>`).join('')}</select>`}
function showDate(d,mode='time'){try{const opts={timeZone:currentZone(),hour12:false,numberingSystem:'latn'};if(mode==='time')Object.assign(opts,{hour:'2-digit',minute:'2-digit'});else if(mode==='date')Object.assign(opts,{weekday:'long',day:'numeric',month:'long'});else Object.assign(opts,{year:'numeric',month:'2-digit',day:'2-digit'});return new Intl.DateTimeFormat(mode==='date'?'ar':'en-GB',opts).format(d)}catch{return '—'}}
function eventDayKey(d){return new Intl.DateTimeFormat('en-CA',{timeZone:currentZone(),year:'numeric',month:'2-digit',day:'2-digit'}).format(d)}
function normalizeEvent(e){if(!e||!e.date||!e.title)return null;const dt=new Date(e.date);if(!Number.isFinite(dt.getTime()))return null;const impact=String(e.impact||'').toLowerCase();const rank=impact==='high'?3:impact==='medium'?2:impact==='low'?1:0;return {id:String(e.id||`${dt.toISOString()}-${e.country||''}-${e.title}`),dt,title:String(e.title),currency:String(e.country||e.currency||'').toUpperCase(),impact:rank,forecast:String(e.forecast||'—'),previous:String(e.previous||'—'),actual:String(e.actual||'—')};}
async function fetchLiveCalendar(){let payload=null;try{const r=await fetch('calendar-live.json?t='+Date.now(),{cache:'no-store'});if(r.ok)payload=await r.json()}catch{};
if(!payload||!Array.isArray(payload.events)||!payload.events.length){S.liveStatus='unavailable';S.liveEvents=[];return}
const updated=new Date(payload.updatedAt||'');const fresh=Number.isFinite(updated.getTime())&&Date.now()-updated.getTime()<24*60*60*1000&&Date.now()>=updated.getTime()-5*60*1000;
S.liveEvents=payload.events.map(normalizeEvent).filter(Boolean).sort((a,b)=>a.dt-b.dt);S.liveUpdated=updated;S.liveStatus=fresh?'fresh':'stale';S.currentWeekStart=payload.weekStart||null;}
function isGazaWeekend(){const day=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Gaza',weekday:'short'}).format(new Date());return day==='Sat'||day==='Sun'}
function selectSaturdayNextWeek(){if(!S.calendarWeekManual&&isGazaWeekend()&&S.nextWeekStart===calendarWeekKey(1)&&S.nextEvents.length)S.calendarWeek='next'}
function calendarWeekKey(offset=0){const d=new Date();const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Gaza',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);const get=k=>Number(parts.find(p=>p.type===k).value);const day=new Date(Date.UTC(get('year'),get('month')-1,get('day')));day.setUTCDate(day.getUTCDate()-(day.getUTCDay()+6)%7+7*offset);return day.toISOString().slice(0,10)}
async function fetchNextCalendar(){try{const r=await fetch('calendar-next.json?t='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);const p=await r.json();if(!Array.isArray(p.events)||!p.events.length||!p.weekStart)throw Error('Invalid next week');const wanted=calendarWeekKey(1);if(p.weekStart!==wanted)throw Error('Next week feed not ready');const updated=new Date(p.updatedAt);const ev=p.events.map(normalizeEvent).filter(Boolean).sort((a,b)=>a.dt-b.dt);if(!ev.length)throw Error('No valid events');S.nextEvents=ev;S.nextUpdated=updated;S.nextWeekStart=p.weekStart;S.nextSource=p.source||'Forex Factory';S.nextSourceUrl=p.sourceUrl||'';S.nextCoverage=p.coverage==='partial'?'partial':'full';S.nextStatus=Number.isFinite(updated.getTime())&&Date.now()-updated.getTime()<36*3600000?'fresh':'stale';selectSaturdayNextWeek();}catch(_){S.nextEvents=[];S.nextStatus='unavailable';S.nextUpdated=null;S.nextWeekStart=null;S.nextSource='Forex Factory';S.nextSourceUrl='';S.nextCoverage='full'}}
function calendarView(){const currentKey=calendarWeekKey(),nextKey=calendarWeekKey(1);if(S.currentWeekStart&&S.currentWeekStart!==currentKey&&S.nextWeekStart===currentKey){return S.calendarWeek==='next'?{events:[],status:'unavailable',updated:null,week:nextKey,coverage:'full',source:'Forex Factory',sourceUrl:''}:{events:S.nextEvents,status:S.nextStatus,updated:S.nextUpdated,week:currentKey,coverage:S.nextCoverage,source:S.nextSource,sourceUrl:S.nextSourceUrl}}return S.calendarWeek==='next'?{events:S.nextWeekStart===nextKey?S.nextEvents:[],status:S.nextWeekStart===nextKey?S.nextStatus:'unavailable',updated:S.nextUpdated,week:nextKey,coverage:S.nextCoverage,source:S.nextSource,sourceUrl:S.nextSourceUrl}:{events:S.liveEvents,status:S.liveStatus,updated:S.liveUpdated,week:currentKey,coverage:'full',source:'Forex Factory',sourceUrl:'https://www.forexfactory.com/calendar'}}

function futureAlerts(){if(!alertSettings().news)return;if(localStorage.getItem('ict-alerts')!=='enabled'||Notification.permission!=='granted'||S.liveStatus!=='fresh')return;const windowMin=Number(localStorage.getItem('ict-alert-before')||15);const now=Date.now(),sent=JSON.parse(localStorage.getItem('ict-alert-sent')||'{}');let changed=false;for(const e of S.liveEvents){if(e.impact<2)continue;const gap=e.dt.getTime()-now,limit=windowMin*60*1000;if(gap>=0&&gap<=limit&&!sent[e.id]){new Notification(`خبر اقتصادي ${e.currency} بعد ${Math.max(1,Math.ceil(gap/60000))} دقيقة`,{body:e.title+' • '+showDate(e.dt),icon:'icon-192.png',tag:'ict-news-'+e.id});sent[e.id]=now;changed=true}}if(changed){for(const [k,v] of Object.entries(sent))if(now-v>8*86400000)delete sent[k];localStorage.setItem('ict-alert-sent',JSON.stringify(sent))}}
function calendar(){const view=calendarView(),events=view.events,available=view.status==='fresh'||view.status==='stale';const filtered=events.filter(e=>(state.country==='ALL'||e.currency===({US:'USD',GB:'GBP',CA:'CAD',AU:'AUD',NZ:'NZD',EU:'EUR',JP:'JPY',CH:'CHF'}[state.country]||state.country))&&(state.impact==='all'||e.impact===+state.impact)&&(!state.search||(e.title+' '+e.currency).toLowerCase().includes(state.search.toLowerCase()))&&(state.day==='all'||eventDayKey(e.dt)===state.day));const groups=Object.groupBy?Object.groupBy(filtered,e=>eventDayKey(e.dt)):filtered.reduce((r,e)=>((r[eventDayKey(e.dt)]??=[]).push(e),r),{});const countHigh=events.filter(e=>e.impact===3).length;const next=events.find(e=>e.dt>new Date()&&e.impact===3);const status=view.status==='fresh'?'محدثة':view.status==='stale'?'قديمة — يُرجى التحقق':'غير متاحة';const days=[...new Set(events.map(e=>eventDayKey(e.dt)))];const rows=Object.entries(groups).sort(([a],[b])=>a.localeCompare(b)).map(([day,es])=>`<section class="calendar-day"><h2>${escapeHTML(showDate(es[0].dt,'date'))} <span class="micro en">${day}</span></h2><div class="event-table"><div class="event-head"><span>الوقت</span><span>العملة</span><span>الحدث الاقتصادي</span><span>التأثير</span><span>السابق</span><span>المتوقع</span><span>الفعلي</span></div>${es.map(e=>`<div class="event-row"><time dir="ltr">${showDate(e.dt)}</time><b class="en">${escapeHTML(e.currency)}</b><div class="event-name">${escapeHTML(e.title)}<small>${escapeHTML(showDate(e.dt,'date'))}</small></div><div><span class="impact ${impactClass[e.impact]||''}">${impactLabel[e.impact]||'غير محدد'}</span></div><span class="numeric" dir="ltr">${escapeHTML(e.previous)}</span><span class="numeric" dir="ltr">${escapeHTML(e.forecast)}</span><span class="numeric" dir="ltr">${escapeHTML(e.actual)}</span></div>`).join('')}</div></section>`).join('');
return `${title('ECONOMIC CALENDAR','الأجندة الاقتصادية','الأحداث الاقتصادية المهمة بتوقيتك المختار، مع خيارات البحث والتنبيه.')}
<div class="calendar-week-switch" role="group" aria-label="اختيار أسبوع الأجندة"><button type="button" class="chip ${S.calendarWeek==='current'?'active':''}" data-calendar-week="current">هذا الأسبوع</button><button type="button" class="chip ${S.calendarWeek==='next'?'active':''}" data-calendar-week="next">الأسبوع القادم</button><span class="calendar-week-label">الأسبوع الذي يبدأ ${escapeHTML(view.week)} · ${status}${isGazaWeekend()&&S.calendarWeek==='next'?' · عرض مبكر من السبت':''}</span></div><div class="calendar-stats"><div class="metric"><span>الأحداث</span><strong class="en">${events.length}</strong></div><div class="metric"><span>التأثير المرتفع</span><strong class="en">${countHigh}</strong></div><div class="metric"><span>المصدر</span><strong style="font-size:14px">${escapeHTML(view.source||'Forex Factory')}</strong></div><div class="metric"><span>حالة البيانات</span><strong class="status-text" style="font-size:13px">${status}</strong></div></div>
<div class="card calendar-settings"><div class="settings-grid"><div>${tzPicker()}</div><div><label class="tz-label" for="alert-lead">التنبيه قبل الخبر</label><select id="alert-lead"><option value="5" ${localStorage.getItem('ict-alert-before')==='5'?'selected':''}>5 دقائق</option><option value="15" ${!localStorage.getItem('ict-alert-before')||localStorage.getItem('ict-alert-before')==='15'?'selected':''}>15 دقيقة</option><option value="30" ${localStorage.getItem('ict-alert-before')==='30'?'selected':''}>30 دقيقة</option><option value="60" ${localStorage.getItem('ict-alert-before')==='60'?'selected':''}>60 دقيقة</option></select></div><div><label class="tz-label">إشعارات المتصفح</label><button class="btn btn-small" id="enable-alerts" type="button">${localStorage.getItem('ict-alerts')==='enabled'?'إيقاف التنبيهات':'تفعيل التنبيهات'}</button></div></div><p class="subtle">تنبيهات هذا الخيار تعمل أثناء تصفح الموقع. لتلقي إشعارات عند إغلاقه، فعّل الاشتراك من مركز التنبيهات.</p></div>
<div class="card" style="padding:15px 18px"><div class="agenda-tools"><input id="event-search" aria-label="ابحث في الأحداث" placeholder="بحث باسم الحدث أو العملة" value="${escapeHTML(state.search)}"><select id="country-filter"><option value="ALL">كل العملات</option>${['USD','EUR','GBP','JPY','CHF','CAD','AUD','NZD','CNY'].map(code=>`<option value="${code}" ${state.country===code?'selected':''}>${code}</option>`).join('')}</select><select id="impact-filter"><option value="all">كل التأثيرات</option>${[3,2,1].map(i=>`<option value="${i}" ${state.impact==i?'selected':''}>${impactLabel[i]}</option>`).join('')}</select><select id="day-filter"><option value="all">جميع الأيام</option>${days.map(d=>`<option value="${d}" ${state.day===d?'selected':''}>${d}</option>`).join('')}</select><button class="chip" id="reset-filters">مسح الفلاتر</button><button class="chip" id="refresh-calendar">تحديث ↻</button></div></div>
${view.coverage==='partial'&&available?`<div class="notice" role="status">عرض احتياطي جزئي للأسبوع القادم: حتى 4 أخبار أمريكية مرتفعة التأثير فقط، وليس الأجندة الكاملة. لا تتوفر توقعات السوق في هذا المصدر. <a href="https://xoomar.com/economic-calendar-api" target="_blank" rel="noopener noreferrer">Data: XOOMAR</a> — راجع أجندة TradingView أدناه لبقية الأخبار.</div>`:''}
${view.updated?`<p class="data-caption">آخر تحديث ${escapeHTML(showDate(view.updated,'date'))}، ${showDate(view.updated)} (${escapeHTML(zoneLabel())}) · ${status}</p>`:''}
${view.status==='stale'?'<div class="notice">تحذير: هذه الأجندة لم تُحدّث مؤخرًا. تحقق من مواعيد الأحداث قبل التداول.</div>':''}
${next?`<div class="notice">الحدث القادم مرتفع التأثير: <b>${escapeHTML(next.title)}</b> — ${escapeHTML(next.currency)} • ${escapeHTML(showDate(next.dt,'date'))} ${showDate(next.dt)}</div>`:''}
${available?(filtered?rows:empty('لا توجد أحداث مطابقة للفلاتر.')):empty(S.calendarWeek==='next'?'لم ينشر المصدر بيانات الأسبوع القادم بعد، أو لم ينجح التحديث التلقائي. يبدأ عرض الأسبوع المقبل من السبت بتوقيت غزة بمجرد توفر بيانات موثوقة. راجع حالة GitHub Actions.':'الأجندة غير متاحة حاليًا. يمكنك الاطلاع على التقويم الإضافي أدناه.')}
<section class="section"><div class="section-heading"><h2>أجندة TradingView</h2><span class="subtle">مصدر مرئي إضافي — إعداد توقيتها مستقل عن اختيار الموقع</span></div><div class="tv-calendar"><tv-economic-calendar></tv-economic-calendar></div></section>
<div class="notice">قد تتأخر مواعيد الأحداث أو النتائج عن المصدر. الشرطة (—) تعني عدم توفر القيمة، وليست صفرًا. أوقات الأحداث حسب المنطقة الزمنية المختارة.</div>`;}
function nyClock(){return new Intl.DateTimeFormat('en-GB',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date())}
function markets(){return `${title('MARKETS DESK','الأسواق وقوة العملات','خريطة حرارية لعملات الفوركس تعرض التغيرات النسبية من TradingView مع رسوم الأسواق التفاعلية.')}
<div class="notice">بيانات الخريطة مقدمة من TradingView وقد تتأخر حسب المصدر. الألوان تعكس تغيّر الزوج وليست تقييمًا مستقلًا لقوة عملة بعينها. للتبديل بين العرضين استخدم الزرين أدناه.</div>
<div class="market-pills"><button class="chip heat-toggle active" data-heat="heatmap" type="button">خريطة العملات الحرارية</button><button class="chip heat-toggle" data-heat="rates" type="button">جدول أسعار التقاطعات</button><a href="https://www.tradingview.com/markets/currencies/rates-all/" target="_blank" rel="noopener noreferrer">المزيد من العملات ↗</a></div>
<section class="chart-shell"><div class="section-heading"><h2>مركز قوة العملات — Forex Heatmap</h2><span class="subtle">TradingView • تغيّر يومي</span></div><div class="forex-heatmap" id="forex-heatmap"><tv-forex-table displayed-value="dailyChange" heatmap></tv-forex-table></div><p class="subtle">تُعرض التغيرات المتاحة عند الاتصال بالإنترنت؛ وهي ليست مؤشرًا مستقلًا لقوة العملة.</p></section>
<div class="market-pills"><a href="https://www.tradingview.com/symbols/XAUUSD/" target="_blank" rel="noopener noreferrer">الذهب XAUUSD ↗</a><a href="https://www.tradingview.com/symbols/EURUSD/" target="_blank" rel="noopener noreferrer">EURUSD ↗</a><a href="https://www.tradingview.com/symbols/GBPUSD/" target="_blank" rel="noopener noreferrer">GBPUSD ↗</a><a href="https://www.tradingview.com/symbols/TVC-DXY/" target="_blank" rel="noopener noreferrer">DXY ↗</a><a href="https://www.tradingview.com/symbols/NASDAQ-NDX/" target="_blank" rel="noopener noreferrer">NAS100 ↗</a><a href="https://www.tradingview.com/symbols/BTCUSD/" target="_blank" rel="noopener noreferrer">BTCUSD ↗</a></div>
<section class="chart-shell"><div class="section-heading"><h2>الرسم البياني التفاعلي — XAUUSD</h2><span class="subtle">TradingView</span></div><div class="chart-frame"><div class="tradingview-widget-container" style="height:100%;width:100%"><div class="tradingview-widget-container__widget" style="height:100%;width:100%"></div></div></div></section>`}
const ictZones=[['Asian Session','20:00','00:00','نطاق تداول آسيا (مرجع تعليمي شائع)'],['London Kill Zone','02:00','05:00','بداية الجلسة الأوروبية'],['New York Kill Zone','07:00','10:00','افتتاح السوق الأمريكي'],['London Close','10:00','12:00','إغلاق لندن حسب التعريف المستخدم'],['London Silver Bullet','03:00','04:00','نافذة Silver Bullet لندن'],['New York AM Silver Bullet','10:00','11:00','نافذة Silver Bullet نيويورك'],['New York PM Silver Bullet','14:00','15:00','نافذة Silver Bullet المسائية']];
function nyToday(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
function nyLocalToUtc(day,hhmm){const [y,m,d]=day.split('-').map(Number),[h,mm]=hhmm.split(':').map(Number);const desired=Date.UTC(y,m-1,d,h,mm);let guess=desired;for(let k=0;k<3;k++){const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(guess)).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));const actual=Date.UTC(parts.year,parts.month-1,parts.day,parts.hour,parts.minute);guess+=desired-actual}return new Date(guess)}
function convertNyWindow(start,end){const date=nyToday();const a=nyLocalToUtc(date,start),b=nyLocalToUtc(date,end);if(end<=start)b.setTime(b.getTime()+86400000);return `${showDate(a)} – ${showDate(b)} (${zoneLabel()})`}
function ictTools(){const ny=new Date().toLocaleString('en-US',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hour12:false});const mins=Number(ny.split(':')[0])*60+Number(ny.split(':')[1]);const z=ictZones.map(([name,start,end,desc])=>{const s=+start.slice(0,2)*60+ +start.slice(3),e=+end.slice(0,2)*60+ +end.slice(3),active=s<e?mins>=s&&mins<e:mins>=s||mins<e;return `<article class="zone-row"><div><h3 dir="ltr">${name}</h3><p>${desc}</p></div><div class="zone-side"><strong class="en" dir="ltr">${start} – ${end} NY</strong><small class="local-zone">${convertNyWindow(start,end)}</small><span class="${active?'open-zone':'closed-zone'}">${active?'ضمن النافذة الآن':'خارج النافذة'}</span></div></article>`}).join('');return `${title('ICT TRADING TOOLS','أدوات ICT','مرجع سريع لجلسات التداول والنوافذ الزمنية حسب توقيت نيويورك، مع مراعاة تغير التوقيت الصيفي والشتوي.')}<div class="clock-banner"><div><small>الوقت الحالي في نيويورك</small><strong dir="ltr" class="en">${nyClock()}</strong></div><div><small>المنطقة الزمنية المرجعية</small><strong class="en">America/New_York</strong></div><button type="button" class="chip" id="refresh-clock">تحديث الوقت ↻</button></div><div class="card calendar-settings"><div class="settings-grid"><div>${tzPicker()}</div><div><label class="tz-label">الوقت في منطقتك</label><strong class="en">${showDate(new Date())}</strong></div></div><p class="subtle">المواعيد في الجدول أدناه مرجعية بتوقيت نيويورك. سيظهر التوقيت المحلي لكل نافذة تحت موعد نيويورك.</p></div>${sessionTimeline()}<div class="section-heading"><h2>تفاصيل جميع النوافذ</h2><span class="subtle">المواعيد وفق التعريفات الشائعة</span></div><div class="zones">${z}</div><div class="notice">هذه النوافذ الزمنية إرشادية وتعتمد على توقيت نيويورك المحلي، وليست توصيات تداول أو ضمانًا لتحقق نمط سعري. قد تختلف التسميات وحدود بعض الجلسات بين المدارس والمراجع.</div>${notificationCenter()}`}
function more(){return `${title('MORE','استكشف المنصة','كل ما تحتاج إليه في مكان واحد.') }<div class="tool-grid"><a class="tool-card" href="assets.html"><span class="tool-glyph">◉</span><strong>دليل الأصول المالية</strong><span>الذهب والفوركس والمؤشرات في صفحات مستقلة</span></a><a class="tool-card" href="smart-desk.html"><span class="tool-glyph">◈</span><strong>غرفة المتداول الذكية</strong><span>سجل الأداء، البحث، والمتابعة اليومية</span></a><a class="tool-card" href="research.html"><span class="tool-glyph">▣</span><strong>مختبر الأبحاث التاريخية</strong><span>اختبار الاستراتيجيات وإعادة تشغيل السوق</span></a><a class="tool-card" href="intelligence.html"><span class="tool-glyph">◉</span><strong>مختبر ذكاء الأسواق</strong><span>رادار الحركة وأشعة السوق ومختبر رد الفعل</span></a><a class="tool-card" href="workspace.html"><span class="tool-glyph">✦</span><strong>مساحتي — Trader Workspace</strong><span>لوحتي الخاصة وحارس الحساب وقائمة ما قبل الصفقة</span></a><a class="tool-card" href="#intelligence"><span class="tool-glyph">◈</span><strong>قراءة نتائج الأخبار</strong><span>المتوقع مقابل الفعلي</span></a><a class="tool-card" href="#academy"><span class="tool-glyph">▣</span><strong>أكاديمية ICT</strong><span>دروس ومراجعة تفاعلية</span></a><a class="tool-card" href="#calculators"><span class="tool-glyph">◎</span><strong>حاسبات التداول</strong><span>مخاطرة وحجم الصفقة</span></a><a class="tool-card" href="#news"><span class="tool-glyph">▤</span><strong>الأخبار الاقتصادية</strong><span>آخر المحتوى المنشور</span></a><a class="tool-card" href="#ict"><span class="tool-glyph">◎</span><strong>أدوات ICT</strong><span>الجلسات والنوافذ الزمنية</span></a><a class="tool-card" href="#links"><span class="tool-glyph">↗</span><strong>تابعنا</strong><span>حساباتنا وروابط التواصل</span></a><a class="tool-card" href="#agenda"><span class="tool-glyph">▦</span><strong>الأجندة</strong><span>الأحداث الاقتصادية</span></a></div>`}
function hydrateMarketChart(){const target=document.querySelector('.chart-frame .tradingview-widget-container');if(!target)return;const script=document.createElement('script');script.src='https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';script.async=true;script.text=JSON.stringify({autosize:true,symbol:'OANDA:XAUUSD',interval:'60',timezone:'Etc/UTC',theme:document.documentElement.dataset.theme==='dark'?'dark':'light',style:'1',locale:'en',allow_symbol_change:true,hide_top_toolbar:false,save_image:false,calendar:false,support_host:'https://www.tradingview.com'});target.appendChild(script)}
function social(){return `${title('CONNECT WITH US','تابعنا','ابقَ قريبًا من أخبارنا وتوصياتنا ومحتوانا التعليمي عبر منصات التواصل.')}${linksGrid(S.links)}`}

// Local, opt-in browser reminders. For background delivery a Push server is required.
const alertSettings=()=>({sessions:localStorage.getItem('ict-pref-sessions')!=='0'&&localStorage.getItem('ict-alert-sessions')==='yes',news:localStorage.getItem('ict-pref-news')!=='0'&&localStorage.getItem('ict-alert-news')!=='no',posts:localStorage.getItem('ict-pref-posts')!=='0'&&localStorage.getItem('ict-alert-posts')!=='no'});
function notificationCenter(mode='full'){
 const pref=alertSettings(),enabled=localStorage.getItem('ict-alerts')==='enabled';
 const newsPref=localStorage.getItem('ict-pref-news')!=='0',sessionPref=localStorage.getItem('ict-pref-sessions')!=='0',postsPref=localStorage.getItem('ict-pref-posts')!=='0';
 return `<section class="notification-center notification-public ${mode==='compact'?'notification-compact':''}" aria-label="اشتراك التنبيهات"><div class="card public-notify-card"><div class="public-notify-icon" aria-hidden="true"><svg class="public-notify-bell" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"/><path d="M10 21h4"/></svg><span>●</span></div><div class="public-notify-main"><span class="public-notify-eyebrow">ICT ALERTS</span><h2>خليك أول من يعرف</h2><p class="public-notify-intro">تصلك التحليلات والتوصيات الجديدة، والأخبار الاقتصادية المهمة، وتنبيهات جلسات التداول مباشرة على جهازك.</p><div class="public-notify-actions"><button type="button" class="btn public-push-btn" id="ict-push-subscribe">🔔 فعّل الإشعارات</button><span class="public-notify-privacy">بموافقتك فقط • يمكنك إيقافها في أي وقت</span></div><p id="ict-push-status" aria-live="polite" role="status" class="public-notify-status" hidden></p><details class="public-notify-options"><summary>تخصيص تنبيهاتي</summary><div class="public-notify-preferences"><label><input type="checkbox" id="alert-posts-opt" ${postsPref?'checked':''}> التحليلات والتوصيات</label><label><input type="checkbox" id="alert-news-opt" ${newsPref?'checked':''}> الأخبار الاقتصادية المهمة</label><label><input type="checkbox" id="alert-sessions-opt" ${sessionPref?'checked':''}> جلسات التداول وKill Zones</label></div><div class="public-notify-local"><span>تذكيرات إضافية أثناء التصفح</span><button type="button" class="chip" id="enable-alerts">${enabled?'إيقاف التذكيرات':'تفعيل التذكيرات'}</button><label class="alert-time">قبل الخبر <select id="alert-lead"><option value="5" ${localStorage.getItem('ict-alert-before')==='5'?'selected':''}>5 دقائق</option><option value="15" ${!localStorage.getItem('ict-alert-before')||localStorage.getItem('ict-alert-before')==='15'?'selected':''}>15 دقيقة</option><option value="30" ${localStorage.getItem('ict-alert-before')==='30'?'selected':''}>30 دقيقة</option><option value="60" ${localStorage.getItem('ict-alert-before')==='60'?'selected':''}>60 دقيقة</option></select></label></div></details></div></div></section>`;
}
function sendLocalAlert(title,body,tag,url){if(localStorage.getItem('ict-alerts')!=='enabled'||Notification.permission!=='granted')return;try{const note=new Notification(title,{body,tag,icon:'icon-192.png'});note.onclick=()=>{window.focus();if(url)location.hash=url}}catch(err){console.warn('Local notification failed',err)}}
const sessionSentKey='ict-session-sent-v1';
function sessionAlerts(){if(!alertSettings().sessions||localStorage.getItem('ict-alerts')!=='enabled'||Notification.permission!=='granted')return;
 const now=Date.now(),today=nyToday();let sent={};try{sent=JSON.parse(localStorage.getItem(sessionSentKey)||'{}')||{}}catch(_){sent={}}
 const names=new Set();let updated=false;
 // Display and remind only at real NY session boundaries (not rounded local times).
 for(const offset of [-1,0,1]){
  const date=new Date(Date.parse(today+'T12:00:00Z')+offset*86400000).toISOString().slice(0,10);
  for(const [name,start,end] of ictZones){const dt=nyLocalToUtc(date,start);const delta=now-dt.getTime();const key=name+'@'+dt.toISOString();if(delta>=0&&delta<75000&&!sent[key]&&!names.has(key)){
   sendLocalAlert('بدأت '+name,`من ${start} إلى ${end} بتوقيت نيويورك • راقب إعدادك قبل التداول`,'ict-session-'+key,'ict');sent[key]=now;updated=true;names.add(key)
  }}
 }
 if(updated){for(const [key,ts] of Object.entries(sent))if(now-ts>4*86400000)delete sent[key];localStorage.setItem(sessionSentKey,JSON.stringify(sent))}
}
const publicationKey='ict-published-content-v1';let contentPollStarted=false;
function publicationRows(){return [...S.analyses.map(a=>({id:'a:'+a.id,title:a.title||'تحليل جديد',when:Date.parse(a.published_at||0),kind:'تحليل فني'})),...S.recs.filter(r=>!r.sample).map(r=>({id:'r:'+String(r.id||[r.pair,r.date,r.entry,r.dir].join('|')),title:r.title||r.pair||'توصية جديدة',when:Date.parse(r.published_at||r.date||0),kind:'توصية'}))].filter(x=>x.id&&Number.isFinite(x.when))}
function checkPublications(){const current=publicationRows(),ids=current.map(x=>x.id);let previous=null;try{previous=JSON.parse(localStorage.getItem(publicationKey)||'null')}catch(_){previous=null}
 if(Array.isArray(previous)&&alertSettings().posts){const seen=new Set(previous);for(const x of current.filter(x=>!seen.has(x.id)&&Date.now()-x.when<48*3600000).slice(0,3)){sendLocalAlert('نُشر '+x.kind+' على ICT بالعربي',x.title,'ict-publication-'+x.id,'recs')}}
 localStorage.setItem(publicationKey,JSON.stringify(ids.slice(0,300)));
}
async function pollPublishedContent(){const [recs,analyses]=await Promise.all([load('recs.json?t='+Date.now()),load('analyses.json?t='+Date.now())]);if(Array.isArray(recs))S.recs=recs;if(Array.isArray(analyses))S.analyses=analyses;checkPublications();if(state.page==='recs'&&contentPollStarted)render();contentPollStarted=true}


// ICT 4.5 — sourced economic surprise, educational academy and local-only calculators.
function numericMacro(raw){
 const s=String(raw??'').trim().replace(/,/g,'').replace(/\s/g,'');
 if(!s||s==='—'||s==='-'||s.toLowerCase()==='n/a')return null;
 const match=s.match(/^([+-]?(?:\d+(?:\.\d+)?|\.\d+))(%|K|M|B)?$/i);
 if(!match)return null;
 const unit=(match[2]||'').toUpperCase(),mult=unit==='K'?1e3:unit==='M'?1e6:unit==='B'?1e9:1;
 const n=Number(match[1])*mult;
 return Number.isFinite(n)?{value:n,unit:unit==='%'?'%':unit==='K'||unit==='M'||unit==='B'?'count':'plain'}:null;
}
function macroSurprise(e){
 const actual=numericMacro(e.actual),forecast=numericMacro(e.forecast);
 if(!actual||!forecast||actual.unit!==forecast.unit)return null;
 const difference=actual.value-forecast.value;
 const tolerance=Math.max(1e-9,Math.abs(forecast.value)*1e-8);
 return {difference,kind:Math.abs(difference)<tolerance?'equal':difference>0?'above':'below',unit:actual.unit};
}
// Public official observations; no Forex Factory archive is published or fetched here.
let officialEconomicFeed=null;
function officialIndicatorCards(items){
 return items.map(e=>{
  const actual=Number(e.actual),prior=e.previous===null?null:Number(e.previous);
  const f=window.ICTEditorialForecasts?.find(e)||window.ICTCalendarConsensus?.find(e);const surprise=window.ICTEditorialForecasts?.find(e)?window.ICTEditorialForecasts?.difference(e):window.ICTCalendarConsensus?.comparison(e)?.difference;
  const changed=prior===null?'السابق غير متاح':`السابق ${escapeHTML(String(prior))}${escapeHTML(e.unit)} · التغير ${actual-prior>0?'+':''}${(actual-prior).toFixed(2)}${escapeHTML(e.unit==='%'?' نقطة مئوية':e.unit)}`;
  return `<article class="intel-event"><div class="intel-event-top"><span class="intel-currency">USD · BLS</span><span class="intel-date">الفترة ${escapeHTML(e.period)}</span></div><h3>${escapeHTML(e.title)}</h3><div class="intel-numbers"><div><small>السابق</small><strong dir="ltr">${prior===null?'—':escapeHTML(String(prior))+escapeHTML(e.unit)}</strong></div><div><small>المتوقع</small><strong dir="ltr">${f?escapeHTML(String(f.value))+escapeHTML(f.unit):'—'}</strong></div><div><small>الفعلي</small><strong dir="ltr">${escapeHTML(String(actual))+escapeHTML(e.unit)}</strong></div></div><p class="intel-outcome">${f?`الفارق عن توقع السوق: ${surprise>0?'+':''}${escapeHTML(String(surprise))} ${e.unit==='%'?'نقطة مئوية':escapeHTML(e.unit)} · ${surprise>0?'أعلى من المتوقع':surprise<0?'أقل من المتوقع':'مطابق للتوقع'}`:changed}</p><p class="intel-note">${f?`التوقع: ${escapeHTML(f.source)} · ${f.verifiedBeforeRelease===false?'توقع الأجندة الحالي، غير مثبت الحفظ قبل النشر':'سُجل قبل النشر'}${f.recordedAt?' · '+escapeHTML(f.recordedAt):''}. ${f.verifiedBeforeRelease===false?'الفرق مرجعي وليس مفاجأة مثبتة قبل صدور الخبر. ':''}${escapeHTML(window.ICTCalendarConsensus?.interpretation(e)||'')} النتيجة الرسمية: BLS. لا تمثل إشارة تداول.`:'قراءة رسمية من BLS؛ لا يتوفر لها توقع سوق معتمد صالح للمطابقة.'}</p></article>`;
 }).join('');
}
async function fetchOfficialEconomicResults(){
 try{
  const response=await fetch('economic-official.json?t='+Date.now(),{cache:'no-store'});
  if(!response.ok)throw Error('HTTP '+response.status);
  const data=await response.json();
  if(data?.source!=='BLS'||data.status!=='ok'||!Array.isArray(data.events))throw Error('invalid official feed');
  await Promise.all([window.ICTEditorialForecasts?.load(),window.ICTCalendarConsensus?.load()]);
  officialEconomicFeed={updatedAt:data.updatedAt,events:data.events.filter(e=>e&&e.source==='BLS'&&e.period&&Number.isFinite(Number(e.actual))&&['%','K'].includes(e.unit)).slice(0,30)};
 }catch{officialEconomicFeed=null}
 if(state.page==='intelligence')render();
}
function economicIntelligence(){
 const engine=window.ICTEconomicResults;
 const local=engine?engine.rows().sort((a,b)=>Date.parse(b.date)-Date.parse(a.date)):[];
 const official=officialEconomicFeed?.events||[];
 const officialBlock=official.length
  ? `<div class="notice">نتائج رسمية أمريكية (BLS) · آخر جلب ${escapeHTML(String(officialEconomicFeed.updatedAt||'غير متاح'))} · الفترة المكتوبة هي فترة الإحصاء لا موعد النشر. التوقعات تؤخذ من السجل التحريري الموثق أو من الأجندة الحالية عند تطابق الخبر والفترة؛ وتُميَّز التوقعات التي لم يُحفظ وقتها قبل الصدور.</div><div class="intel-grid">${officialIndicatorCards(official)}</div>`
  : `<div class="notice">لا تتوفر الآن نتائج BLS الرسمية المحدثة. ستظهر تلقائيًا بعد نجاح مهمة GitHub الرسمية. لا نعرض أرقامًا افتراضية.</div>`;

 // Local results are imported only by the visitor. They are not published on our server.
 if(local.length){
  const cards=local.slice().sort((a,b)=>(b.impact==='high')-(a.impact==='high')||Date.parse(b.date)-Date.parse(a.date)).slice(0,18).map(e=>{
   const analysis=engine.explain(e),difference=engine.differenceText(analysis.comparison);
   return `<article class="intel-event"><div class="intel-event-top"><span class="intel-currency">${escapeHTML(e.currency)}</span><span class="intel-impact">${escapeHTML(e.impact==='high'?'مرتفع التأثير':e.impact==='medium'?'متوسط التأثير':'أثر آخر')}</span><span class="intel-date">${escapeHTML(showDate(new Date(e.date),'date'))}</span></div><h3>${escapeHTML(e.title)}</h3><div class="intel-numbers"><div><small>السابق</small><strong dir="ltr">${escapeHTML(e.previous)}</strong></div><div><small>المتوقع</small><strong dir="ltr">${escapeHTML(e.forecast)}</strong></div><div><small>الفعلي</small><strong dir="ltr">${escapeHTML(e.actual)}</strong></div></div><p class="intel-outcome">${escapeHTML(analysis.headline)} · <span dir="ltr">${escapeHTML(difference)}</span></p><p class="intel-note">${escapeHTML(analysis.category)} — ${escapeHTML(analysis.description)}</p></article>`;
  }).join('');
  return `${title('ECONOMIC NEWS INTELLIGENCE','قراءة نتائج الأخبار الاقتصادية','النتائج الرسمية العامة وأرشيفك الشخصي من Forex Factory.')}<h2>النتائج الرسمية التلقائية</h2>${officialBlock}<h2>أرشيف Forex Factory الشخصي</h2><div class="notice">أرشيف خاص على هذا الجهاز · ${local.length} نتيجة فعلية محفوظة. لا تُحدَّث هذه النتائج تلقائيًا؛ استورد ملفًا جديدًا في مختبر الأخبار عند الحاجة. لا تمثل التحليلات إشارات دخول.</div><div class="intel-grid">${cards}</div><a class="btn" href="intelligence.html#news">فتح مختبر الأخبار والأرشيف الكامل ←</a>`;
 }
 return `${title('ECONOMIC NEWS INTELLIGENCE','قراءة نتائج الأخبار الاقتصادية','النتائج الرسمية العامة وأرشيفك الشخصي من Forex Factory.')}<h2>النتائج الرسمية التلقائية</h2>${officialBlock}<h2>أرشيف Forex Factory الشخصي (اختياري)</h2><div class="notice">لم أجد نتائج فعلية مستوردة على هذا الجهاز. افتح مختبر الأخبار واستورد ملف JSON من GitHub Actions؛ ستظهر النتائج هنا تلقائيًا في المتصفح نفسه. لا يمكن اعتبار مواعيد الأجندة نتائج فعلية.</div><a class="btn" href="intelligence.html#news">فتح مختبر الأخبار لاستيراد النتائج ←</a><a class="btn" href="#agenda">عرض الأجندة الأسبوعية ←</a>`;
}

const academyLessons=[
 {id:'liq',title:'السيولة Liquidity',tag:'أساسي',body:'تتجمع أوامر الوقف والسيولة غالبًا حول القمم والقيعان الظاهرة. اجعل تحديد مستوى السيولة جزءًا من السياق، لا إشارة دخول منفردة.',q:'هل مجرد سحب قمة سابقة كافٍ للدخول؟',opts:['نعم دائمًا','لا، يلزم سياق وتأكيد','يضمن انعكاس السعر'],a:1,why:'سحب السيولة بمفرده لا يضمن انعكاسًا أو استمرارًا.'},
 {id:'structure',title:'تحول هيكل السوق MSS',tag:'متوسط',body:'راقب انتقال الزخم وكسر البنية القصيرة بعد حركة السيولة، وميّز بين إشارة تؤكد سيناريوك وبين اختراق عادي ضمن نطاق متذبذب.',q:'ماذا يضيف MSS في النموذج؟',opts:['سياق تغير البنية','تحديد الربح حتمًا','إلغاء الحاجة لوقف الخسارة'],a:0,why:'MSS يساعد في قراءة تحوّل البنية لكنه لا يضمن نجاح الصفقة.'},
 {id:'fvg',title:'فجوة القيمة العادلة FVG',tag:'متوسط',body:'فجوة القيمة العادلة منطقة عدم توازن نسبي بين ثلاث شموع. ليست كل فجوة فرصة، وينبغي النظر إلى موقعها واتجاه السوق والسيولة.',q:'هل يجب تداول جميع فجوات FVG؟',opts:['نعم','فقط إذا ظهرت على دقيقة','لا، بعد مراعاة السياق'],a:2,why:'تنتج فجوات كثيرة دون دلالة تداول مناسبة.'},
 {id:'ob',title:'كتل الأوامر Order Blocks',tag:'متوسط',body:'تُستخدم كتل الأوامر ضمن بعض نماذج ICT لتحديد مناطق اهتمام محتملة. طريقة رسمها تختلف بين المتداولين؛ اختبر تعريفًا ثابتًا في سجل تداولك.',q:'ما النهج الأفضل عند رسم Order Block؟',opts:['تغيير القاعدة لكل صفقة','اتباع معيار محدد واختباره','تجاهل الإبطال'],a:1,why:'اتساق التعريف ضروري لتقييم صلاحية النموذج.'},
 {id:'premium',title:'Premium & Discount',tag:'أساسي',body:'يمكن تقسيم نطاق سعري مرجعي إلى نصف علوي Premium ونصف سفلي Discount. يعتمد المعنى على اختيار النطاق الصحيح ولا يكفي وحده لاتخاذ قرار.',q:'أي شرط مهم لاستخدام Premium/Discount؟',opts:['تحديد النطاق المرجعي','لون الشمعة','اسم الوسيط'],a:0,why:'المستويات تتغير بتغير القمة والقاع المرجعيين.'},
 {id:'ote',title:'Optimal Trade Entry — OTE',tag:'متقدم',body:'يستخدم بعض متداولي ICT نطاقات تصحيح عميقة ضمن حركة مرجعية. لا تعامل نسب فيبوناتشي كضمان، واختبر علاقتها بالسيولة وFVG والوقت.',q:'ماذا نفعل إذا ظهرت OTE دون سياق مناسب؟',opts:['ندخل فورًا','نتجاهل إدارة المخاطر','نمتنع أو ننتظر التأكيد'],a:2,why:'الدخول يجب أن يعتمد على خطة ومعايير واضحة.'},
 {id:'kz',title:'Kill Zones والجلسات',tag:'أساسي',body:'تزداد أهمية التوقيت حول افتتاحات الجلسات وبعض الأخبار. توقيت نيويورك يتغير موسميًا؛ استخدم أداة جلسات ICT لمراجعة الساعة المحلية.',q:'هل جميع دقائق Kill Zone صالحة للدخول؟',opts:['لا','نعم','فقط يوم الاثنين'],a:0,why:'التوقيت جزء من السيناريو وليس إشارة مستقلة.'},
 {id:'sb',title:'Silver Bullet',tag:'متقدم',body:'Silver Bullet أسلوب تداول ضمن نافذة زمنية محددة، يركز عادةً على سياق السيولة والاندفاع ومناطق FVG؛ يجب تقييمه باختبارات ووقف خسارة.',q:'ما دور نافذة Silver Bullet؟',opts:['ضمان نجاح كل صفقة','تصفية الفرص زمنيًا ضمن نموذج','إلغاء ضرورة التحليل'],a:1,why:'النافذة تحدد الوقت فقط ولا تغني عن شروط الدخول.'}
];
let academySelected='liq';
function ictAcademy(){const current=academyLessons.find(x=>x.id===academySelected)||academyLessons[0];let done=[];try{done=JSON.parse(localStorage.getItem('ict-academy-completed')||'[]')}catch{}const progress=academyLessons.filter(x=>done.includes(x.id)).length;return `${title('ICT ACADEMY','أكاديمية ICT بالعربي','دروس قصيرة تشرح المفاهيم الأساسية مع اختبار فهم بعد كل درس.')}<div class="academy-progress">تقدمك: <strong>${progress} من ${academyLessons.length}</strong> دروس <div class="academy-progress-track"><span style="width:${100*progress/academyLessons.length}%"></span></div></div><div class="academy-layout"><nav class="academy-list" aria-label="اختيار درس">${academyLessons.map(x=>`<button type="button" data-lesson="${x.id}" class="${x.id===current.id?'active':''}"><span>${done.includes(x.id)?'✓ ':''}${escapeHTML(x.title)}</span><small>${escapeHTML(x.tag)}</small></button>`).join('')}</nav><article class="academy-content card"><span class="tag">${escapeHTML(current.tag)}</span><h2>${escapeHTML(current.title)}</h2><p>${escapeHTML(current.body)}</p><div class="academy-question"><strong>اختبر فهمك</strong><p>${escapeHTML(current.q)}</p>${current.opts.map((v,i)=>`<button type="button" data-quiz="${i}" data-lesson-id="${current.id}">${escapeHTML(v)}</button>`).join('')}<div id="academy-feedback" role="status" aria-live="polite"></div></div><p class="subtle">تقدمك محفوظ على هذا الجهاز فقط. المحتوى تعليمي ولا يضمن نجاح التداول.</p></article></div>`}
function academyAnswer(id,index){const lesson=academyLessons.find(x=>x.id===id),feedback=$('academy-feedback');if(!lesson||!feedback)return;const right=index===lesson.a;feedback.textContent=(right?'✓ إجابة صحيحة. ':'حاول مرة أخرى. ')+lesson.why;feedback.className=right?'answer-ok':'answer-wrong';if(right){let done=[];try{done=JSON.parse(localStorage.getItem('ict-academy-completed')||'[]')}catch{}if(!done.includes(id)){done.push(id);localStorage.setItem('ict-academy-completed',JSON.stringify(done))}const prog=document.querySelector('.academy-progress');if(prog){const count=academyLessons.filter(x=>done.includes(x.id)).length;prog.innerHTML=`تقدمك: <strong>${count} من ${academyLessons.length}</strong> دروس <div class="academy-progress-track"><span style="width:${100*count/academyLessons.length}%"></span></div>`}}}
function tradingCalculators(){return `${title('TRADING CALCULATORS','حاسبات التداول وإدارة المخاطر','احسب قيمة المخاطرة وحجم الصفقة والعائد إلى المخاطرة باستخدام مواصفات عقد وسيطك.')}<div class="calc-grid"><section class="card"><h2>حاسبة حجم الصفقة</h2><div class="calc-fields"><label>الرصيد بعملة الحساب<input id="calc-balance" type="number" min="0" step="any" value="1000"></label><label>المخاطرة %<input id="calc-risk-pct" type="number" min="0" max="100" step="any" value="1"></label><label>مسافة وقف الخسارة (بيب/نقطة)<input id="calc-stop" type="number" min="0" step="any" value="30"></label><label>قيمة البيب/النقطة للوت الواحد بعملة الحساب<input id="calc-value" type="number" min="0" step="any" value="10"></label></div><div class="calc-result" id="calc-position-result" role="status"></div><p class="subtle">أدخل قيمة البيب أو النقطة للوت الواحد وفق الوسيط والعملة ونوع العقد. 10 هنا مثال فقط، وليس قيمة صحيحة لكل الأدوات. لا يشمل السبريد أو العمولة أو الانزلاق.</p></section><section class="card"><h2>حاسبة العائد إلى المخاطرة</h2><div class="calc-fields"><label>الدخول<input id="rr-entry" type="number" step="any" value="1.15000"></label><label>وقف الخسارة<input id="rr-stop" type="number" step="any" value="1.14700"></label><label>جني الربح<input id="rr-take" type="number" step="any" value="1.15600"></label><label>اتجاه الصفقة<select id="rr-dir"><option value="buy">BUY — شراء</option><option value="sell">SELL — بيع</option></select></label></div><div class="calc-result" id="calc-rr-result" role="status"></div></section></div><div class="notice">الحسابات تقديرية وتعليمية. لا ترسل أوامر تداول ولا تحفظ بيانات مالية في خادم. تحقق من حجم العقد والحد الأدنى للوت ومتطلبات الهامش لدى وسيطك.</div>`}
function updateCalculators(){if(state.page!=='calculators')return;const n=id=>Number($(id)?.value),b=n('calc-balance'),r=n('calc-risk-pct'),s=n('calc-stop'),v=n('calc-value');const result=$('calc-position-result');if(result){if(![b,r,s,v].every(Number.isFinite)||b<=0||r<=0||r>100||s<=0||v<=0)result.textContent='أدخل قيمًا موجبة صحيحة، ونسبة مخاطرة لا تتجاوز 100%.';else{const cash=b*r/100,lots=cash/(s*v);result.textContent=`المخاطرة النقدية: ${cash.toFixed(2)} | الحجم النظري: ${lots.toFixed(3)} لوت (قبل التقريب لشروط الوسيط)`;}}const entry=n('rr-entry'),stop=n('rr-stop'),take=n('rr-take'),dir=$('rr-dir')?.value;const rr=$('calc-rr-result');if(rr){const risk=dir==='buy'?entry-stop:stop-entry,reward=dir==='buy'?take-entry:entry-take;rr.textContent=[entry,stop,take].every(Number.isFinite)&&risk>0&&reward>0?`نسبة العائد إلى المخاطرة: 1:${(reward/risk).toFixed(2)}`:'تحقق من ترتيب الدخول والوقف والهدف وفق اتجاه الصفقة.'}}

function render(){const p=location.hash.replace('#','')||'home';state.page=Object.hasOwn(navTitle,p)?p:'home';$('app').innerHTML=({home,markets,news,recs:recommendations,agenda:calendar,ict:ictTools,links:social,more,intelligence:economicIntelligence,academy:ictAcademy,calculators:tradingCalculators})[state.page]();document.querySelectorAll('[data-page]').forEach(a=>{const active=a.dataset.page===state.page||(a.dataset.page==='more'&&['news','ict','links','more'].includes(state.page));a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});document.title=`${navTitle[state.page]} | ICT بالعربي`;if(state.page==='markets')hydrateMarketChart();if(state.page==='calculators')updateCalculators();document.dispatchEvent(new Event('ict-view-rendered'));if(state.page==='home'){initPulseFallback();initHeroSlider()}else if(heroSlideTimer){clearInterval(heroSlideTimer);heroSlideTimer=null}window.scrollTo({top:0,behavior:'instant'})}

function ticker(){
 const host=$('tape');if(!host)return;
 // Do not rebuild and reset the live iframe on every snapshot refresh or theme change.
 if(host.querySelector('#tv-bottom-ticker'))return;
 host.innerHTML=`<div class="bottom-ticker-shell tv-market-bottom glass-bottom-tv">
   <div class="bottom-ticker-label" aria-label="أسعار الأسواق"><span class="bottom-ticker-dot"></span><span class="en">MARKET WATCH</span></div>
   <div class="bottom-ticker-tv" id="tv-bottom-ticker" role="region" aria-label="شريط أسعار TradingView المختصر">
     <tv-ticker-tape class="tv-compact-tape" symbols="${tvMarketOrder.map(s=>tvMarketSymbols[s]).join(',')}" item-size="compact" theme="dark" transparent="true" dir="ltr"></tv-ticker-tape>
   </div>
   <span class="bottom-ticker-brand" title="ICT بالعربي" aria-label="شعار ICT بالعربي"><img src="logo-original.jpeg" alt="ICT بالعربي" loading="eager" decoding="async"></span></div>`;
 // TradingView's current Web Component can render its own compact layout.
 // Do not crop or force a shorter iframe than the widget's internal content.
 if(!document.querySelector('script[data-ict-tv-tape]')){
   const script=document.createElement('script');
   script.type='module';
   script.src='https://widgets.tradingview-widget.com/w/en/tv-ticker-tape.js';
   script.dataset.ictTvTape='yes';
   script.onerror=()=>{
     const slot=document.getElementById('tv-bottom-ticker');
     if(slot&&slot.querySelector('tv-ticker-tape')){
       slot.innerHTML='<div class="tv-ticker-fallback" role="status">تعذر تحميل أسعار الأسواق الآن — تحقق من الاتصال.</div>';
     }
   };
   document.head.appendChild(script);
 }
}
document.addEventListener('click',e=>{const lesson=e.target.closest('[data-lesson]');if(lesson){academySelected=lesson.dataset.lesson;render();return}const quiz=e.target.closest('[data-quiz]');if(quiz){academyAnswer(quiz.dataset.lessonId,Number(quiz.dataset.quiz));return}const sessionButton=e.target.closest('[data-session-filter]');if(sessionButton){sessionCategory=sessionButton.dataset.sessionFilter;render();return}const tab=e.target.closest('[data-content-tab]');if(tab){state.contentTab=tab.dataset.contentTab;render();return}const heroDot=e.target.closest('[data-hero-index]');if(heroDot){showHeroSlide(Number(heroDot.dataset.heroIndex));return}const heroNav=e.target.closest('[data-hero-move]');if(heroNav){showHeroSlide(heroSlideIndex+Number(heroNav.dataset.heroMove));return}const heroPause=e.target.closest('[data-hero-pause]');if(heroPause){heroSlidePaused=!heroSlidePaused;heroPause.textContent=heroSlidePaused?'▶':'Ⅱ';heroPause.setAttribute('aria-label',heroSlidePaused?'تشغيل التبديل التلقائي':'إيقاف التبديل التلقائي');initHeroSlider();return}const weekButton=e.target.closest('[data-calendar-week]');if(weekButton){S.calendarWeek=weekButton.dataset.calendarWeek;S.calendarWeekManual=true;state.day='all';render();return}const chip=e.target.closest('[data-filter]');if(chip){state[chip.dataset.filter]=chip.dataset.value;render()}if(e.target.closest('#refresh-clock'))render();if(e.target.closest('#refresh-news'))fetchLiveNews();if(e.target.closest('#refresh-calendar')){S.liveStatus='loading';render();Promise.all([fetchLiveCalendar(),fetchNextCalendar()]).then(()=>{render();futureAlerts()})}const heat=e.target.closest('[data-heat]');if(heat){document.querySelectorAll('[data-heat]').forEach(b=>b.classList.toggle('active',b===heat));const table=document.querySelector('#forex-heatmap tv-forex-table');if(table){if(heat.dataset.heat==='heatmap')table.setAttribute('heatmap','');else table.removeAttribute('heatmap')}}if(e.target.closest('#enable-alerts')){toggleAlerts()}if(e.target.closest('#reset-filters')){state.country='ALL';state.impact='all';state.day='all';state.search='';render()}});
document.addEventListener('change',e=>{if(e.target.closest('.calc-grid'))updateCalculators();const ids={'country-filter':'country','impact-filter':'impact','day-filter':'day'};if(ids[e.target.id]){state[ids[e.target.id]]=e.target.value;render()}if(e.target.id==='tz-selector'){localStorage.setItem('ict-timezone',e.target.value);render();updateHeaderDate()}if(e.target.id==='analysis-asset'){state.analysisAsset=e.target.value;render()}if(e.target.id==='alert-news-opt')localStorage.setItem('ict-alert-news',e.target.checked?'yes':'no');if(e.target.id==='alert-sessions-opt')localStorage.setItem('ict-alert-sessions',e.target.checked?'yes':'no');if(e.target.id==='alert-posts-opt')localStorage.setItem('ict-alert-posts',e.target.checked?'yes':'no');if(e.target.id==='alert-lead'){localStorage.setItem('ict-alert-before',e.target.value);futureAlerts()}});
document.addEventListener('input',e=>{if(e.target.closest('.calc-grid'))updateCalculators();if(e.target.id==='event-search'){const pos=e.target.selectionStart;state.search=e.target.value;render();const input=$('event-search');input.focus();input.setSelectionRange(pos,pos)}});
function updateHeaderDate(){$('today').textContent=new Intl.DateTimeFormat('ar-u-nu-latn',{timeZone:currentZone(),weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date())}
async function toggleAlerts(){if(localStorage.getItem('ict-alerts')==='enabled'){localStorage.setItem('ict-alerts','disabled');render();return}if(!('Notification' in window)){alert('هذا المتصفح لا يدعم إشعارات سطح المكتب.');return}if(!window.isSecureContext){alert('تحتاج الإشعارات إلى HTTPS.');return}const permission=await Notification.requestPermission();if(permission==='granted'){localStorage.setItem('ict-alerts','enabled');render();futureAlerts()}else alert('لم يتم منح الإذن للإشعارات. يمكن تغييره من إعدادات الموقع في المتصفح.')}
const themeModes=['auto','light','dark'];
function currentTheme(){const mode=localStorage.getItem('ict-theme-mode')||'auto';return mode==='auto'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):mode}
function applyTheme(){const mode=localStorage.getItem('ict-theme-mode')||'auto';document.documentElement.dataset.theme=currentTheme();$('theme-label').textContent=({auto:'تلقائي',light:'فاتح',dark:'داكن'})[mode];$('theme').setAttribute('aria-label','المظهر: '+$('theme-label').textContent+'؛ انقر للتبديل');$('meta-theme').setAttribute('content',currentTheme()==='dark'?'#111715':'#14251f')}
$('theme').addEventListener('click',()=>{const mode=localStorage.getItem('ict-theme-mode')||'auto';localStorage.setItem('ict-theme-mode',themeModes[(themeModes.indexOf(mode)+1)%3]);applyTheme();ticker();if(state.page==='markets')render()});
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',()=>{if((localStorage.getItem('ict-theme-mode')||'auto')==='auto'){applyTheme();ticker();if(state.page==='markets')render()}});

let deferredInstall;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;$('install').hidden=false});$('install').addEventListener('click',async()=>{if(deferredInstall){deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;$('install').hidden=true}});
window.addEventListener('hashchange',render);
async function boot(){applyTheme();updateHeaderDate();const a=await Promise.all([load('news.json'),load('recs.json'),load('links.json'),load('agenda.json'),load('analyses.json')]);[S.newsArchive,S.recs,S.links,S.agenda,S.analyses]=[a[0]||[],a[1]||[],a[2]||[],a[3]||{days:[]},a[4]||[]];checkPublications();S.news=S.newsArchive;await Promise.all([fetchLiveCalendar(),fetchNextCalendar(),fetchLiveNews()]);render();refreshPulse();ticker();futureAlerts();sessionAlerts();fetchMovers();setInterval(updatePulseClocks,1000);setInterval(refreshPulse,60000);setInterval(fetchMovers,5*60*1000);setInterval(()=>{futureAlerts();sessionAlerts()},30000);setInterval(pollPublishedContent,120000);setInterval(async()=>{await Promise.all([fetchLiveCalendar(),fetchNextCalendar()]);if(state.page==='agenda')render();else refreshPulse();futureAlerts()},10*60*1000);setInterval(()=>{updateHeaderDate();if(state.page==='ict')render()},60000);setInterval(fetchLiveNews,10*60*1000);fetchOfficialEconomicResults();setInterval(fetchOfficialEconomicResults,30*60*1000);if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(console.warn)}boot();
