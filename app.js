'use strict';
const $=x=>document.getElementById(x),S={news:[],newsArchive:[],newsUpdated:null,newsStatus:'loading',recs:[],analyses:[],links:[],agenda:{days:[]},calendarCurrentFeed:null,calendarNextFeed:null,calendarWeek:'current',calendarWeekManual:false,movers:[],moversUpdated:null,moversStatus:'loading'},state={page:'home',nf:'الكل',rf:'all',contentTab:'signals',analysisAsset:'all',analysisStatus:'active',country:'ALL',impact:'all',day:'all',search:''};
const escapeHTML=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl=u=>/^https:\/\/[^\s\"'<>]+$/i.test(u||'')?u:'#';
const newsImageURL=u=>{const raw=String(u||'');try{const p=new URL(raw);return p.protocol==='https:'&&!/\.(svg|gif|pdf)$/i.test(p.pathname)&&!/[<>\s]/.test(raw)?raw:''}catch(e){return ''}};
const newsImage=n=>newsImageURL(n?.image||n?.image_url||n?.thumbnail);
const dateFormat=d=>{if(!d)return '';const obj=new Date(/^\d{4}-\d{2}-\d{2}$/.test(String(d))?d+'T12:00:00':d);return Number.isFinite(obj.getTime())?obj.toLocaleString('ar-u-nu-latn',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:typeof currentZone==='function'?currentZone():undefined}):''};
const section=(title,content,link='',more='عرض الكل')=>`<section class="section"><div class="section-heading"><h2>${title}</h2>${link?`<a href="${link}">${more} ←</a>`:''}</div>${content}</section>`;
const empty=m=>`<div class="empty">${m}</div>`;
async function load(file){try{const r=await fetch(file,{cache:'no-store'});if(!r.ok)throw Error(r.status);return await r.json()}catch(e){console.warn('تعذر تحميل',file,e);return null}}
function relatedAssetLinks(items,label){
 if(!items.length)return '';
 return `<details class="related-asset-links"><summary>${label}</summary><ul>${items.map(asset=>`<li><a href="assets/${encodeURIComponent(asset.symbol)}.html">${escapeHTML(asset.name)} <bdi>${escapeHTML(asset.symbol)}</bdi></a></li>`).join('')}</ul></details>`;
}
function assetsForCurrency(currency){
 return (window.ICT_ASSETS||[]).filter(asset=>asset.currencies.includes(currency));
}
function assetsMentionedIn(title){
 const words=new Set(String(title).toUpperCase().replace(/\b([A-Z]{3})\/([A-Z]{3})\b/g,'$1$2').split(/[^\p{L}\p{N}]+/u));
 return (window.ICT_ASSETS||[]).filter(asset=>asset.aliases.some(alias=>words.has(alias.toUpperCase())));
}
function cardNews(n){const photo=newsImage(n);const artwork=photo?`<div class="news-photo"><img src="${escapeHTML(photo)}" alt="صورة مرفقة من المصدر: ${escapeHTML(n.src||'المصدر')}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.closest('.news-photo').classList.add('image-error')"><span class="news-photo-fallback" aria-hidden="true">${escapeHTML(n.tag||'اقتصاد')}</span></div>`:`<div class="news-photo news-photo-placeholder" aria-hidden="true"><span>${escapeHTML(n.tag||'اقتصاد')}</span></div>`;return `<article class="card news-card">${artwork}<span class="tag">${escapeHTML(n.tag||'اقتصاد')}</span><h3>${escapeHTML(n.title)}</h3><p>${escapeHTML(n.sum||'')}</p><div class="card-meta"><span>${escapeHTML(n.src||'')} · ${dateFormat(n.date)}</span>${safeUrl(n.url)!=='#'?`<a href="${escapeHTML(safeUrl(n.url))}" target="_blank" rel="noopener noreferrer">قراءة الخبر ↗</a>`:''}</div>${relatedAssetLinks(assetsMentionedIn(n.title),'الأصول المذكورة في الخبر')}</article>`}
function newsStatusLine(){const date=S.newsUpdated?dateFormat(S.newsUpdated):'';if(S.newsStatus==='fresh')return `آخر تحديث: ${escapeHTML(date)} • أخبار من مصادرها الأصلية`;
if(S.newsStatus==='stale')return `آخر تحديث: ${escapeHTML(date)} • قد تكون بعض الأخبار قديمة؛ تحقق من تاريخ النشر`;
if(S.newsStatus==='archive')return 'أخبار سابقة • الأخبار الجديدة غير متاحة حاليًا';
return 'جارٍ تحميل الأخبار…';}
function newsBadge(){return `<span class="news-live-chip ${S.newsStatus==='fresh'?'is-fresh':S.newsStatus==='stale'?'is-stale':''}">${S.newsStatus==='fresh'?'تحديث تلقائي':S.newsStatus==='stale'?'أخبار سابقة':S.newsStatus==='archive'?'أرشيف':'جارٍ التحديث'}</span>`;}
async function fetchLiveNews(refresh=true){
 let payload=null;try{const r=await fetch('news-live.json?t='+Date.now(),{cache:'no-store'});if(r.ok)payload=await r.json()}catch(e){console.info('News feed unavailable',e.message)}
 const time=payload?.updated_at?new Date(payload.updated_at):null;
 const records=Array.isArray(payload?.items)?payload.items:[];
 const normalized=records.filter(n=>n&&typeof n.title==='string'&&n.title.trim()&&/^https:\/\/[^\s]+$/i.test(n.url||'')&&Number.isFinite(new Date(n.date).getTime())&&Date.now()-new Date(n.date).getTime()<7*86400000).map(n=>({title:n.title,src:String(n.src||'المصدر'),tag:String(n.tag||'اقتصاد'),date:n.date,url:n.url,sum:'',image:newsImage(n),language:n.language||'ar'})).slice(0,80);
 if(normalized.length){S.news=normalized;S.newsUpdated=time;S.newsStatus=(time&&Number.isFinite(time.getTime())&&Date.now()-time.getTime()<4*3600000)?'fresh':'stale';}
 else {S.news=S.newsArchive;S.newsUpdated=null;S.newsStatus='archive';}
 if(refresh&&['news','home'].includes(state.page))render(true);
}
function newsGrid(items){return items.length?`<div class="grid">${items.map(cardNews).join('')}</div>`:empty('لا توجد أخبار في هذا التصنيف.')}
const statusNames={pending:'بانتظار التفعيل',open:'مفعّلة',tp:'هدف مسجل إداريًا',sl:'وقف مسجل إداريًا',cl:'مغلقة يدويًا',cancelled:'ملغاة'};
const tradeFinalStates=new Set(['tp','sl','cl','cancelled']);
function tradeLevelIssue(r){const n=['entry','sl','tp'].map(k=>Number(r[k]));if(!n.every(x=>Number.isFinite(x)&&x>0))return 'مستويات غير رقمية؛ لا يمكن حساب العائد إلى المخاطرة.';if(!['buy','sell'].includes(r.dir))return 'اتجاه الصفقة غير محدد.';if((r.dir==='buy'&&!(n[1]<n[0]&&n[0]<n[2]))||(r.dir==='sell'&&!(n[2]<n[0]&&n[0]<n[1])))return 'ترتيب الدخول والوقف والهدف غير منطقي لاتجاه الصفقة.';return '';}
function resultHistoryMarkup(r){const rows=Array.isArray(r.status_history)?r.status_history.filter(x=>x&&x.status&&x.at).slice(-5):[];return rows.length?`<details class="trade-audit"><summary>سجل التحديثات الإدارية (${rows.length})</summary><ul>${rows.map(h=>`<li>${escapeHTML(statusNames[h.status]||h.status)} · ${escapeHTML(dateFormat(h.at))}${h.note?' — '+escapeHTML(h.note):''}</li>`).join('')}</ul></details>`:'';}
function tradeRR(r){
 const entry=Number(r.entry),stop=Number(r.sl),target=Number(r.tp),buy=r.dir==='buy';
 if(![entry,stop,target].every(Number.isFinite)||entry<=0||stop<=0||target<=0||entry===stop)return null;
 if((buy&&(target<=entry||stop>=entry))||(!buy&&(target>=entry||stop<=entry)))return null;
 return Math.abs((target-entry)/(entry-stop));
}
function workflowReference(r){const key=r?.id!==undefined&&r?.id!==null&&String(r.id)!==''?String(r.id):[r?.pair||'',r?.published_at||r?.date||'',r?.entry||'',r?.sl||'',r?.tp||'',r?.dir||''].join('|');return key.slice(0,360)}
function cardRec(r){
 const buy=r.dir==='buy',stat=r.status||'open',rr=tradeRR(r),updated=r.updated_at&&r.updated_at!==r.published_at;
 const stateLabel=escapeHTML(statusNames[stat]||stat),levelIssue=tradeLevelIssue(r),final=tradeFinalStates.has(stat),audit=resultHistoryMarkup(r);
 return `<article class="card trade-pro-card"><div class="rec-head"><span class="pair" dir="ltr">${escapeHTML(r.pair)}</span><span class="direction ${buy?'buy':'sell'}">${buy?'BUY • شراء':'SELL • بيع'}</span></div><div class="trade-pro-badges"><span class="trade-state trade-state-${escapeHTML(stat)}">${stateLabel}</span>${!r.sample?`<span class="trade-source-badge">تحديث إداري · غير مرتبط بتنفيذ وسيط</span>`:''}${rr!==null?`<span class="trade-rr en" dir="ltr">R:R 1:${rr.toFixed(2)}</span>`:''}</div><div class="kv"><div><small>الدخول ENTRY</small><strong dir="ltr">${escapeHTML(r.entry)}</strong></div><div><small>الهدف TP</small><strong dir="ltr">${escapeHTML(r.tp)}</strong></div><div><small>الإيقاف SL</small><strong dir="ltr">${escapeHTML(r.sl)}</strong></div></div><div class="card-meta"><span>نُشرت: ${dateFormat(r.published_at||r.date)}</span>${updated?`<span>آخر تعديل: ${dateFormat(r.updated_at)}</span>`:''}</div>${levelIssue?`<p class="trade-level-warning">⚠ ${escapeHTML(levelIssue)}</p>`:''}${r.note?`<p class="trade-pro-note">${escapeHTML(r.note)}</p>`:''}${r.result_note?`<div class="trade-pro-result"><b>تحديث النتيجة</b><p>${escapeHTML(r.result_note)}</p></div>`:''}${final&&!r.result_note?`<p class="trade-level-warning">الحالة مسجلة دون شرح أو توثيق مرفق.</p>`:''}${audit}${r.sample?'<span class="tag">بيانات تجريبية</span>':`<a class="trade-workflow-action" href="workflow.html?ref=${encodeURIComponent(workflowReference(r))}" aria-label="حضّر الصفقة ثم احسب المخاطرة وسجّل النتيجة"><span class="twf-icon" aria-hidden="true">◈</span><span class="twf-copy"><strong class="twf-title">حضّر الصفقة</strong><small class="twf-subtitle">احسب المخاطرة • سجّل النتيجة</small></span><span class="twf-arrow" aria-hidden="true">←</span></a>`}</article>`;
}
function recGrid(items){return items.length?`<div class="grid">${items.map(cardRec).join('')}</div>`:empty('لا توجد توصيات في هذه الحالة.')}
// Only same-site uploaded chart images or HTTPS source images are accepted.
function analysisImageURL(value){const raw=String(value||'');if(/^https:\/\/[^\s<>"']+$/.test(raw))return newsImageURL(raw);if(/^analysis-images\/[a-zA-Z0-9_./-]+\.(?:jpg|jpeg|png|webp)$/i.test(raw)&&!raw.includes('..'))return raw;return ''}
// Independent long-form market analysis, not an immediate trade signal.
function analysisState(a){
 const s=['active','completed','invalidated','expired'].includes(a.status)?a.status:'active';
 // Expiration means the editorial follow-up window has ended, not that price invalidated the idea.
 if(s==='active'&&a.expires_at&&Number.isFinite(Date.parse(a.expires_at))&&Date.parse(a.expires_at)<=Date.now())return 'expired_by_time';
 return s;
}
const analysisStatusLabels={active:'قيد المتابعة',completed:'مكتمل — تحديث إداري',invalidated:'تم إبطال السيناريو — تحديث إداري',expired:'مؤرشف — تحديث إداري',expired_by_time:'انتهت مدة المتابعة'};
function analysisCard(a){
 const img=analysisImageURL(a.image),asset=escapeHTML(a.asset||'الأسواق'),heading=escapeHTML(a.title||''),bias=escapeHTML(a.bias||'نظرة محايدة'),s=analysisState(a);
 const safeImage=img?`<img class="analysis-image" src="${escapeHTML(img)}" alt="شارت تحليل ${asset}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.hidden=true">`:`<div class="analysis-image analysis-placeholder"><span>CHART / ANALYSIS</span><strong>${asset}</strong></div>`;
 const notes=String(a.body||a.summary||'').split(/\n+/).filter(Boolean).map(x=>`<p>${escapeHTML(x)}</p>`).join('');
 const levels=Array.isArray(a.levels)?a.levels.filter(x=>x&&x.label&&x.value).slice(0,8).map(x=>`<span><small>${escapeHTML(x.label)}</small><b dir="ltr">${escapeHTML(x.value)}</b></span>`).join(''):'';
 const chart=safeUrl(a.chart_url),updated=a.updated_at&&a.updated_at!==a.published_at;
 const history=Array.isArray(a.status_history)?a.status_history.slice(-8).reverse().filter(x=>x&&x.at).map(x=>`<li><b>${escapeHTML(analysisStatusLabels[x.status]||'تحديث إداري')}</b> — ${escapeHTML(dateFormat(x.at))}${x.note?`<div>${escapeHTML(x.note)}</div>`:''}</li>`).join(''):'';
 return `<article class="card analysis-card ${s!=='active'?'analysis-archived':''}">${safeImage}<div class="analysis-copy"><div class="analysis-tags"><span class="tag">${asset}</span><span class="tag">${escapeHTML(a.timeframe||'غير محدد')}</span><span class="tag analysis-bias">${bias}</span><span class="tag analysis-state-tag">${escapeHTML(analysisStatusLabels[s])}</span></div><h3>${heading}</h3><p class="analysis-summary">${escapeHTML(a.summary||'')}</p><div class="analysis-meta"><span>نُشر: ${escapeHTML(dateFormat(a.published_at))}</span>${updated?`<span>حُدّث: ${escapeHTML(dateFormat(a.updated_at))}</span>`:''}${a.expires_at?`<span>نهاية المتابعة: ${escapeHTML(dateFormat(a.expires_at))}</span>`:''}</div>${s==='expired_by_time'?'<p class="analysis-status-note">انتهت فترة المتابعة الزمنية؛ لا يعني ذلك تحقق هدف أو إبطالًا سعريًا.</p>':''}${s==='invalidated'&&a.invalidation?`<p class="analysis-status-note">أُبطل السيناريو وفق تحديث الإدارة، وليس فحصًا آليًا للسعر.</p>`:''}${a.status_note&&s!=='active'?`<p class="analysis-status-note"><b>توضيح الإدارة:</b> ${escapeHTML(a.status_note)}</p>`:''}<details><summary>قراءة التحليل والمستويات</summary><div class="analysis-body">${notes}${levels?`<div class="analysis-levels">${levels}</div>`:''}${a.invalidation?`<p><b>شرط إبطال السيناريو:</b> ${escapeHTML(a.invalidation)}</p>`:''}${chart!=='#'?`<a class="analysis-chart-link" href="${escapeHTML(chart)}" target="_blank" rel="noopener noreferrer">فتح الرسم البياني ↗</a>`:''}${history?`<div class="analysis-history"><b>سجل متابعة التحليل (إداري)</b><ul>${history}</ul></div>`:''}</div></details></div></article>`;
}
function analysesGrid(){
 const assets=['all',...new Set(S.analyses.map(a=>a.asset).filter(Boolean))];
 const statusFilter=state.analysisStatus||'active';
 const filtered=S.analyses.filter(a=>(state.analysisAsset==='all'||a.asset===state.analysisAsset)&&(statusFilter==='all'||(statusFilter==='active'?analysisState(a)==='active':analysisState(a)!=='active')));
 const items=filtered.sort((a,b)=>(analysisState(a)==='active'?0:1)-(analysisState(b)==='active'?0:1)||Date.parse(b.published_at||0)-Date.parse(a.published_at||0));
 return `<div class="analysis-toolbar"><div><strong>التحليلات الفنية والنظرة المستقبلية</strong><p>تابع السيناريوهات النشطة، أو افتح الأرشيف لمراجعة التحليلات المنتهية. انتهاء الوقت ليس دليلًا على نجاح أو فشل التحليل.</p></div><label>الأصل <select id="analysis-asset"><option value="all">كل الأصول</option>${assets.filter(x=>x!=='all').map(x=>`<option value="${escapeHTML(x)}" ${state.analysisAsset===x?'selected':''}>${escapeHTML(x)}</option>`).join('')}</select></label><label>الحالة <select id="analysis-status-filter"><option value="active" ${statusFilter==='active'?'selected':''}>قيد المتابعة</option><option value="archived" ${statusFilter==='archived'?'selected':''}>الأرشيف</option><option value="all" ${statusFilter==='all'?'selected':''}>الكل</option></select></label></div>${items.length?`<div class="analysis-grid">${items.map(analysisCard).join('')}</div>`:empty('لا توجد تحليلات مطابقة لهذا الفلتر.')}`;
}
const badges={telegram:'➤',x:'𝕏',youtube:'▶',instagram:'◎',tiktok:'♪',facebook:'f',whatsapp:'◉',email:'✉'};
function linksGrid(items){return items.length?`<div class="grid">${items.map(x=>{const ok=safeUrl(x.url)!=='#';const inside=`<span class="social-icon">${badges[x.icon]||'↗'}</span><span class="social-copy"><b>${escapeHTML(x.name)}</b><small>${escapeHTML(x.desc||'')}</small></span><span style="color:var(--muted)">${ok?'↗':'—'}</span>`;return ok?`<a class="card social-card" href="${safeUrl(x.url)}" target="_blank" rel="noopener noreferrer">${inside}</a>`:`<div class="card social-card disabled" title="الرابط لم يُضف بعد">${inside}</div>`}).join('')}</div>`:empty('لا تتوفر روابط بعد.')}
const navTitle={home:'الرئيسية',markets:'الأسواق',news:'الأخبار الاقتصادية',recs:'التوصيات',agenda:'الأجندة الاقتصادية',ict:'أدوات ICT',links:'تابعنا',more:'الأدوات',intelligence:'قراءة الأخبار',academy:'أكاديمية ICT',calculators:'أدوات التداول'};
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
 const current=calendarView('current').events;
 const next=calendarView('next').events;
 return [...current,...next].filter(e=>e&&e.impact===3&&e.dt instanceof Date&&Number.isFinite(e.dt.getTime())&&e.dt.getTime()>now&&e.dt.getTime()<until)
  .sort((a,b)=>a.dt-b.dt).filter((e,i,arr)=>arr.findIndex(x=>x.id===e.id)===i)[0]||null;
}
function upcomingCalendarAvailable(){return Boolean(calendarView('current').events.length||calendarView('next').events.length);}
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
 <a class="ops-card" href="#recs"><div class="ops-card-top"><span class="ops-tag">TRADE TRACKER</span><span class="ops-kicker">التوصيات المنشورة</span></div><h3>حالات التوصيات</h3><div class="ops-stats-row"><span><small>نشطة ومعلقة</small><b class="en">${active.length}</b></span><span><small>قيد الانتظار</small><b class="en">${pending}</b></span><span><small>أهداف مسجلة*</small><b class="en">${rate}</b></span></div><p class="ops-copy">*حالات يسجلها ناشر التوصيات يدويًا؛ ليست نتائج تنفيذ مثبتة بسجل وسيط.</p></a>
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


// 6.8.67: Only lower homepage tool shortcuts. Protected hero and Market Pulse remain untouched.
// 6.8.72: Read-only unified search; it searches content already supplied by the website.
// No uploads, external index, extra public API, or tracking of search queries.
let siteSearchCategory='all';
const siteSearchTools=[
 ['أكاديمية ICT','دروس السيولة MSS FVG Order Blocks OTE Silver Bullet Kill Zones','درس','./#academy'],
 ['مختبر الأبحاث التاريخية','شموع واختبار الاستراتيجيات آلة الزمن','أداة','research.html'],
 ['رادار الأسواق وأشعة السوق','حركة الأسعار الارتباط الذهب الدولار','أداة','intelligence.html'],
 ['حارس الحساب الممول','حسابات المخاطرة الخسارة اليومية الثابتة والمتحركة','أداة','workspace.html'],
 ['رحلة الصفقة الذكية','دخول وقف خسارة هدف حساب اللوت إدارة المخاطرة','أداة','workflow.html'],
 ['Trader DNA وسجل الصفقات','إحصائيات أداء المتداول الأرباح الخسائر R','أداة','smart-desk.html#dna'],
 ['دليل الأصول المالية','الذهب XAUUSD EURUSD GBPUSD USDJPY NAS100 BTCUSD','أداة','assets.html'],
 ['الأجندة الاقتصادية','الأخبار الاقتصادية المتوقعة عالية التأثير موعد الفائدة CPI NFP','أداة','./#agenda'],
 ['قراءة نتائج الأخبار','التضخم الوظائف مفاجأة الأخبار الاقتصادي','أداة','./#intelligence'],
 ['جلسات ICT وKill Zones','جلسة لندن نيويورك Silver Bullet','أداة','./#ict'],
 ['حاسبات التداول','حجم اللوت المخاطرة العائد إلى المخاطرة','أداة','./#calculators'],
 ['التوصيات والتحليلات','توصيات شراء بيع التحليلات الفنية الأهداف','أداة','./#recs']
];
function siteSearchSection(){return `<section class="site-search" aria-label="البحث في الموقع"><details id="site-search-details"><summary><span class="site-search-icon" aria-hidden="true"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.5"></circle><path d="m16 16 4.5 4.5"></path></svg></span><span><strong>ابحث في ICT بالعربي</strong><small>دروس، أدوات، توصيات، تحليلات، وأخبار منشورة</small></span><span class="site-search-chevron" aria-hidden="true"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg></span></summary><div class="site-search-body"><label for="site-search-input">اكتب اسم مفهوم ICT أو أصل أو أداة</label><div class="site-search-controls"><input type="search" id="site-search-input" placeholder="مثلاً: FVG أو الذهب أو التضخم" autocomplete="off" maxlength="100" aria-controls="site-search-results"><select id="site-search-category" aria-label="نوع نتائج البحث"><option value="all">كل المحتوى</option><option value="أداة">الأدوات</option><option value="درس">الدروس</option><option value="توصية">التوصيات</option><option value="تحليل">التحليلات</option><option value="خبر">الأخبار</option><option value="أجندة">الأجندة</option></select></div><p class="site-search-help">البحث في المحتوى المتاح بالموقع؛ لا يستعلم عن الويب ولا يضيف أخبارًا غير منشورة.</p><div id="site-search-results" class="site-search-results" aria-live="polite" aria-atomic="true"><p class="site-search-empty">ابدأ بالكتابة لعرض النتائج.</p></div></div></details></section>`}
function normalizeSiteSearch(value){return String(value??'').toLowerCase().normalize('NFKC').replace(/[\u064b-\u065f\u0670\u0640]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[^\p{L}\p{N}]+/gu,' ').trim()}
function siteSearchEntries(){
 const result=siteSearchTools.map(([title,body,type,url])=>({title,body,type,url}));
 for(const l of academyLessons) result.push({title:l.title,body:[l.body,academyStudy[l.id]?.goal,academyStudy[l.id]?.example,l.tag].join(' '),type:'درس',url:'./?lesson='+encodeURIComponent(l.id)+'#academy'});
 for(const r of S.recs||[]){if(r.sample)continue;result.push({title:r.title||r.pair||'توصية',body:[r.pair,r.note,r.dir,r.entry,r.sl,r.tp].join(' '),type:'توصية',url:'./#recs',tab:'signals',when:r.published_at||r.date})}
 for(const x of S.analyses||[]) result.push({title:x.title||x.asset||'تحليل فني',body:[x.asset,x.summary,x.body,x.timeframe].join(' '),type:'تحليل',url:'./#recs',tab:'analysis',when:x.updated_at||x.published_at});
 for(const n of S.news||[])result.push({title:n.title||'خبر اقتصادي',body:[n.sum,n.src,n.tag].join(' '),type:'خبر',url:'./#news',when:n.date});
 const events=[...calendarView('current').events,...calendarView('next').events];const seen=new Set();
 for(const e of events){const key=[e.id,e.title,e.dt?.getTime?.()].join('|');if(seen.has(key))continue;seen.add(key);result.push({title:e.title||'حدث اقتصادي',body:[e.country,e.currency,e.impact].join(' '),type:'أجندة',url:'./#agenda',when:e.dt?.toISOString?.()})}
 return result;
}
function performSiteSearch(){
 const input=$('site-search-input'),host=$('site-search-results');if(!input||!host)return;
 const term=normalizeSiteSearch(input.value),tokens=term.split(/\s+/).filter(Boolean);
 if(term.length<2){host.innerHTML='<p class="site-search-empty">اكتب حرفين على الأقل لعرض نتائج البحث.</p>';return}
 const matches=siteSearchEntries().filter(x=>siteSearchCategory==='all'||siteSearchCategory===x.type).map(x=>{
  const title=normalizeSiteSearch(x.title),body=normalizeSiteSearch(x.body);
  const score=tokens.reduce((s,t)=>s+(title.includes(t)?5:body.includes(t)?1:0),0);
  return {...x,score};
 }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||(Date.parse(b.when||0)||0)-(Date.parse(a.when||0)||0)).slice(0,16);
 if(!matches.length){host.innerHTML='<p class="site-search-empty">لا توجد نتائج مطابقة في المحتوى المتاح. جرّب رمز الأصل أو اسم الدرس بالإنجليزية.</p>';return}
 host.innerHTML=`<p class="site-search-count">عرض ${matches.length} نتيجة كحد أقصى. اختر النتيجة لفتح القسم.</p><div class="site-search-list">${matches.map(x=>`<a class="site-search-result" href="${escapeHTML(x.url)}" ${x.tab?`data-site-search-tab="${escapeHTML(x.tab)}"`:''}><span class="site-search-type">${escapeHTML(x.type)}</span><strong>${escapeHTML(x.title)}</strong><span class="site-search-link" aria-hidden="true">←</span></a>`).join('')}</div>`;
}
document.addEventListener('input',e=>{if(e.target.id==='site-search-input')performSiteSearch()});
document.addEventListener('change',e=>{if(e.target.id==='site-search-category'){siteSearchCategory=e.target.value;performSiteSearch()}});
document.addEventListener('click',e=>{const item=e.target.closest('[data-site-search-tab]');if(item){state.contentTab=item.dataset.siteSearchTab;state.analysisStatus='all';state.rf='all';if(location.hash==='#recs')render()}});

// 6.8.73: Optional, entirely local goal-based guide. No popups, tracking or uploads.
const visitorGoals=[
 {id:'learn',label:'أتعلم ICT',summary:'ابدأ بالمفاهيم الأساسية ثم جرّبها على بيانات تاريخية.',steps:[['1. تعلّم المفهوم','ابدأ بدروس الأكاديمية واختبارات الفهم.','./#academy'],['2. جرّب الفكرة','افتح مختبر الأبحاث وراجع الشروط وحجم العينة.','research.html']]},
 {id:'markets',label:'أتابع الأسواق',summary:'راقب التوقيت والأخبار ثم انتقل للرادار دون اعتبار الحركة إشارة دخول.',steps:[['1. راجع الأجندة','اعرف موعد الخبر وتصنيفه قبل التداول.','./#agenda'],['2. راقب الحركة','افتح رادار الأسواق وأشعة السوق مع التحقق من تحديث البيانات.','intelligence.html']]},
 {id:'plan',label:'أخطط لصفقة',summary:'تحقق من السيناريو واحسب المخاطرة قبل اتخاذ قرار.',steps:[['1. راجع التحليلات','اقرأ السيناريو وشروط إبطاله، ولا تفترض أن النتيجة مؤكدة.','./#recs'],['2. احسب المخاطرة','استخدم رحلة الصفقة الذكية قبل التنفيذ.','workflow.html']]},
 {id:'review',label:'أراجع أدائي',summary:'سجّل نتائج تداولاتك بنفسك ثم افحص إحصاءاتك.',steps:[['1. أدخل صفقتك','سجّل الصفقة الفعلية من داخل غرفة المتداول.','smart-desk.html'],['2. افحص إحصاءاتك','راجع Trader DNA حسب الأصل والفترة والجلسة.','smart-desk.html#dna']]}
];
function visitorGuideSection(){return `<section class="visitor-guide" aria-label="إرشاد حسب هدف الزائر"><details id="visitor-guide-details"><summary><span class="visitor-guide-mark" aria-hidden="true"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"></circle><circle cx="12" cy="12" r="4"></circle><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"></circle></svg></span><span><strong>ابدأ حسب هدفك</strong><small>دليل اختياري للوصول إلى الأداة المناسبة، بدون تسجيل أو رفع ملفات</small></span><span class="visitor-guide-chevron" aria-hidden="true"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg></span></summary><div class="visitor-guide-body"><p class="visitor-guide-intro">ماذا تريد أن تفعل اليوم؟ اختر هدفًا لعرض خطوتين واضحتين.</p><div class="visitor-guide-choices" role="group" aria-label="اختر هدفك">${visitorGoals.map(g=>`<button type="button" data-visitor-goal="${g.id}" aria-pressed="false">${g.label}</button>`).join('')}</div><div class="visitor-guide-result" id="visitor-guide-result" aria-live="polite"><p>اختر أحد الأهداف أعلاه لتبدأ.</p></div></div></details></section>`}
function showVisitorGoal(goalId){
 const root=document.getElementById('visitor-guide-details');if(!root)return;
 const goal=visitorGoals.find(g=>g.id===goalId);if(!goal)return;
 root.querySelectorAll('[data-visitor-goal]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.visitorGoal===goalId)));
 const target=root.querySelector('#visitor-guide-result');if(!target)return;
 target.innerHTML=`<p class="visitor-guide-summary">${escapeHTML(goal.summary)}</p><div class="visitor-guide-steps">${goal.steps.map(([heading,detail,url])=>`<a class="visitor-guide-step" href="${escapeHTML(url)}"><strong>${escapeHTML(heading)}</strong><span>${escapeHTML(detail)}</span><b aria-hidden="true">←</b></a>`).join('')}</div><p class="visitor-guide-note">الخطوات إرشادية وليست توصية تداول. يمكن استخدام أي أداة مباشرة دون اتباع المسار.</p>`;
}
document.addEventListener('click',event=>{const button=event.target.closest('[data-visitor-goal]');if(button)showVisitorGoal(button.dataset.visitorGoal)});

function home(){
 return `<section class="welcome welcome-news-layout"><div class="hero-news-column">${heroSlider()}</div><div class="welcome-aside pulse-desk" id="market-pulse" aria-label="ملخص الأسواق والأخبار والجلسات">${marketPulse()}</div></section>${operationsRoom()}${siteSearchSection()}${visitorGuideSection()}
 <div class="section-title home-tools-title"><div><span class="eyebrow">QUICK ACCESS</span><h2 id="home-tools-heading">مركز التداول</h2></div></div>
 <section class="home-tools-browser" aria-labelledby="home-tools-heading"><div class="tool-grid" id="home-tools-grid"><a class="tool-card" href="decision-center.html"><span class="tool-glyph" aria-hidden="true">◎</span><strong>مركز فرص ICT</strong><span>افحص أصلًا، راجع الأدلة، وتابع الفرص المرصودة</span><b>افتح مركز الفرص ←</b></a><a class="tool-card" href="workflow.html"><span class="tool-glyph">◈</span><strong>رحلة الصفقة الذكية</strong><span>من التوصية إلى المراجعة والحاسبة وسجل النتائج</span><b>افتح الأداة ←</b></a><a class="tool-card" href="smart-desk.html"><span class="tool-glyph">◈</span><strong>غرفة المتداول اليومية</strong><span>الجاهزية اليومية ومراجعة الأداء والبحث في الموقع</span><b>افتح الغرفة ←</b></a></div></section>
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
 XAUUSD:'FOREXCOM:XAUUSD',XAGUSD:'FOREXCOM:XAGUSD',
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
 const economic=next?`<div class="pulse-news-head"><span class="pulse-currency">${escapeHTML(next.currency)}</span><strong>${escapeHTML(next.title)}</strong><span class="pulse-impact-label">تأثير مرتفع${calendarView('current').status==='stale'||calendarView('next').status==='stale'?' • تحقق من الموعد':''}</span></div><div class="pulse-countdown">${pulseClock(next.dt.getTime(),'pulse-news-clock')}<span class="pulse-countdown-caption">حتى صدور الخبر</span></div><details class="pulse-extra"><summary>الموعد والتوقعات</summary><div class="pulse-news-info"><span>الموعد: <b>${escapeHTML(showDate(next.dt,'date'))} — ${escapeHTML(showDate(next.dt))}</b> (${escapeHTML(zoneLabel())})</span><span>السابق: <b class="en" dir="ltr">${escapeHTML(next.previous)}</b></span><span>المتوقع: <b class="en" dir="ltr">${escapeHTML(next.forecast)}</b></span></div></details>`:`<p class="pulse-unavailable">${upcomingCalendarAvailable()?'لا يوجد خبر مرتفع التأثير خلال الأيام الثمانية القادمة في بيانات الأسبوعين المتاحة':'لا تتوفر بيانات أجندة صالحة حاليًا؛ افتح قسم الأجندة للتحقق من حالة المصدر'}</p>`;
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
 return `<div class="trade-stats" aria-label="ملخص نتائج التوصيات"><div><small>منشورات حقيقية</small><b class="en">${list.length}</b></div><div><small>نشطة / معلّقة</small><b class="en">${list.filter(r=>['open','pending'].includes(r.status||'open')).length}</b></div><div><small>حقق الهدف</small><b class="en">${won}</b></div><div><small>وقف الخسارة</small><b class="en">${lost}</b></div><div><small>نسبة الأهداف المسجلة</small><b class="en">${closed?`${(won/closed*100).toFixed(1)}%`:'—'}</b></div></div><p class="trade-stats-note">نسبة الأهداف المسجلة تُحسب من حالات الهدف والوقف التي يحدّثها الناشر يدويًا. لا تتحقق آليًا من سعر السوق أو تنفيذ الصفقة، ولا تمثل عائدًا ماليًا مثبتًا.</p>`;
}
function recommendations(){const f=[['all','الكل'],['pending','معلّقة'],['open','مفعّلة'],['tp','تحقق الهدف'],['sl','وقف الخسارة'],['cl','مغلقة'],['cancelled','ملغاة']],items=state.rf==='all'?S.recs:S.recs.filter(x=>(x.status||'open')===state.rf);return `${title('TRADE IDEAS & ANALYSIS','التوصيات والتحليلات المنشورة','أفكار تداول محددة المستويات، وتحليلات فنية طويلة وقصيرة المدى مصحوبة بالشارت.')}<div class="related-asset-links"><a href="decision-center.html">افتح مركز فرص ICT للفحص والمتابعة</a></div><div class="content-tabs" role="group" aria-label="نوع المحتوى"><button type="button" data-content-tab="signals" class="${state.contentTab==='signals'?'selected':''}" aria-pressed="${state.contentTab==='signals'}">↗ التوصيات <span>${S.recs.filter(x=>!x.sample).length}</span></button><button type="button" data-content-tab="analysis" class="${state.contentTab==='analysis'?'selected':''}" aria-pressed="${state.contentTab==='analysis'}">▥ التحليلات الفنية <span>${S.analyses.length}</span></button></div>${state.contentTab==='analysis'?analysesGrid():`${tradeStats()}<div class="notice">حالات التوصيات ونتائجها تُحدّث من لوحة الإدارة، وليست متابعة تلقائية لتنفيذ الوسيط أو لمسار السعر. هذه معلومات تعليمية وليست ضمانًا أو نصيحة استثمارية.</div><div class="filter-bar">${f.map(([v,n])=>`<button class="chip ${state.rf===v?'active':''}" data-filter="rf" data-value="${v}">${n}</button>`).join('')}</div>${recGrid(items)}`}${notificationCenter('compact')}`}

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
function normalizeEvent(e){if(!e||!e.date||!e.title)return null;const dt=new Date(e.date);if(!Number.isFinite(dt.getTime()))return null;const impact=String(e.impact||'').toLowerCase();const rank=impact==='high'?3:impact==='medium'?2:impact==='low'?1:0;return {id:String(e.id||`${dt.toISOString()}-${e.country||''}-${e.title}`),dt,title:String(e.title),currency:String(e.country||e.currency||'').toUpperCase(),impact:rank,forecast:String(e.forecast||'—'),previous:String(e.previous||'—'),actual:String(e.actual??'—')};}
function calendarWeekKey(offset=0,time=new Date()){
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Gaza',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(time);
 const get=key=>Number(parts.find(part=>part.type===key).value);
 const day=new Date(Date.UTC(get('year'),get('month')-1,get('day')));
 day.setUTCDate(day.getUTCDate()-(day.getUTCDay()+6)%7+7*offset);
 return day.toISOString().slice(0,10);
}
function emptyCalendarWeek(week){
 return {events:[],status:'unavailable',updated:null,week,coverage:'none',source:'',sourceUrl:''};
}
async function loadCalendarWeek(file,maxAge){
 try{
  const payload=await load(file+'?t='+Date.now());
  if(!payload||!Array.isArray(payload.events)||!['full','partial'].includes(payload.coverage))return null;
  const week=payload.weekStart,updated=new Date(payload.updatedAt),age=Date.now()-updated.getTime();
  if(![calendarWeekKey(),calendarWeekKey(1)].includes(week)||!Number.isFinite(age)||age<0)return null;
  const events=payload.events.filter(event=>typeof event?.date==='string'&&/(?:Z|[+-]\d{2}:\d{2})$/i.test(event.date))
   .map(normalizeEvent).filter(event=>event&&calendarWeekKey(0,event.dt)===week).sort((a,b)=>a.dt-b.dt);
  if(!events.length)return null;
  const coverage=events.length===payload.events.length?payload.coverage:'partial';
  return {events,maxAge,updated,week,coverage,source:payload.source||'الأجندة الاقتصادية',sourceUrl:payload.sourceUrl||''};
 }catch{return null;}
}
function fetchLiveCalendar(){return loadCalendarWeek('calendar-live.json',24*3600000).then(view=>{
 S.calendarCurrentFeed=view;
})}
function isGazaWeekend(){
 return ['Sat','Sun'].includes(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Gaza',weekday:'short'}).format(new Date()));
}
function fetchNextCalendar(){return loadCalendarWeek('calendar-next.json',36*3600000).then(view=>{
 S.calendarNextFeed=view;
 const next=calendarView('next');
 if(!S.calendarWeekManual&&isGazaWeekend()&&next.events.length)S.calendarWeek='next';
})}
function calendarView(choice=S.calendarWeek){
 const week=calendarWeekKey(choice==='next'?1:0);
 const feed=[S.calendarCurrentFeed,S.calendarNextFeed].filter(feed=>feed?.week===week)
  .sort((a,b)=>b.updated-a.updated)[0];
 return feed?{...feed,status:Date.now()-feed.updated<feed.maxAge?'fresh':'stale'}:emptyCalendarWeek(week);
}

// In-page reminders only. OneSignal background delivery and configuration remain separate.
function futureAlerts(){
 const week=calendarView('current');
 if(!('Notification' in window)||!alertSettings().news||localStorage.getItem('ict-alerts')!=='enabled'||Notification.permission!=='granted'||week.status!=='fresh')return;
 const windowMin=Number(localStorage.getItem('ict-alert-before')||15);
 if(![5,15,30,60].includes(windowMin))return;
 const now=Date.now(),limit=windowMin*60000,keyName='ict-alert-sent';
 let sent={};try{const parsed=JSON.parse(localStorage.getItem(keyName)||'{}');if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))sent=parsed}catch(_){}
 let changed=false;
 for(const e of week.events){
  if(e.impact<2||!(e.dt instanceof Date)||!Number.isFinite(e.dt.getTime()))continue;
  const gap=e.dt.getTime()-now;
  if(gap<0||gap>limit)continue;
  // Include scheduled time: recurring releases must not share one de-duplication key.
  const key=String(e.id)+'@'+e.dt.toISOString();
  if(sent[key])continue;
  if(sendLocalAlert(`خبر اقتصادي ${e.currency} بعد ${Math.max(1,Math.ceil(gap/60000))} دقيقة`,e.title+' • '+showDate(e.dt),'ict-news-'+key,'agenda')){
   sent[key]=now;changed=true;
  }
 }
 if(changed){
  for(const [key,ts] of Object.entries(sent))if(!Number.isFinite(Number(ts))||now-Number(ts)>8*86400000)delete sent[key];
  try{localStorage.setItem(keyName,JSON.stringify(sent))}catch(_){}
 }
}
function economicReading(row,peers=[]){
 if(!row)return '';
 if(row.stage==='upcoming')return '';
 if(row.stage==='awaiting')return '<small class="econ-reading">بانتظار النتيجة الفعلية</small>';
 const analysis=window.ICTNewsImpact?.analyze(row,peers);
 const url=safeUrl(row.sourceUrl);
 const source=escapeHTML(row.actualSource||'غير محدد');
 const sourceLabel=url==='#'?source:`<a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">${source}</a>`;
 const unit=row.unit==='%'?'نقطة مئوية':escapeHTML(row.unit);
 const difference=row.difference===null?'':` · ${row.difference>0?'+':''}${escapeHTML(row.difference)} ${unit}`;
 return `<div class="econ-reading">المصدر: ${sourceLabel}${difference}${analysis?`<details><summary>${escapeHTML(analysis.headline)}</summary><span>${escapeHTML(analysis.detail)}</span></details>`:''}</div>`;
}
function calendar(){const view=calendarView(),events=view.events,available=view.status==='fresh'||view.status==='stale';const filtered=events.filter(e=>(state.country==='ALL'||e.currency===({US:'USD',GB:'GBP',CA:'CAD',AU:'AUD',NZ:'NZD',EU:'EUR',JP:'JPY',CH:'CHF'}[state.country]||state.country))&&(state.impact==='all'||e.impact===+state.impact)&&(!state.search||(e.title+' '+e.currency).toLowerCase().includes(state.search.toLowerCase()))&&(state.day==='all'||eventDayKey(e.dt)===state.day));const groups=Object.groupBy?Object.groupBy(filtered,e=>eventDayKey(e.dt)):filtered.reduce((r,e)=>((r[eventDayKey(e.dt)]??=[]).push(e),r),{});const countHigh=events.filter(e=>e.impact===3).length;const next=events.find(e=>e.dt>new Date()&&e.impact===3);const status=view.status==='fresh'?'محدثة':view.status==='stale'?'قديمة — يُرجى التحقق':'غير متاحة';const days=[...new Set(events.map(e=>eventDayKey(e.dt)))];const readings=new Map(events.map(e=>[e.id,window.ICTCalendarConsensus?.resultFor({...e,date:e.dt.toISOString()},officialEconomicFeed?.events||[])]));
const peers=[...readings.values()].filter(Boolean);
const rows=Object.entries(groups).sort(([a],[b])=>a.localeCompare(b)).map(([day,es])=>`<section class="calendar-day"><h2>${escapeHTML(showDate(es[0].dt,'date'))} <span class="micro en">${day}</span></h2><div class="event-table"><div class="event-head"><span>الوقت</span><span>العملة</span><span>الحدث الاقتصادي</span><span>التأثير</span><span>السابق</span><span>المتوقع</span><span>الفعلي</span></div>${es.map(e=>`<div class="event-row"><time dir="ltr">${showDate(e.dt)}</time><b class="en">${escapeHTML(e.currency)}</b><div class="event-name">${escapeHTML(e.title)}<small>${escapeHTML(showDate(e.dt,'date'))}</small>${relatedAssetLinks(assetsForCurrency(e.currency),'أصول مرتبطة بالعملة')}</div><div><span class="impact ${impactClass[e.impact]||''}">${impactLabel[e.impact]||'غير محدد'}</span></div><span class="numeric" dir="ltr">${escapeHTML(e.previous)}</span><span class="numeric" dir="ltr">${escapeHTML(readings.get(e.id)?.forecast??e.forecast)}</span><div class="numeric"><bdi dir="ltr">${escapeHTML(readings.get(e.id)?.actual??e.actual)}</bdi>${economicReading(readings.get(e.id),peers)}</div></div>`).join('')}</div></section>`).join('');
return `${title('ECONOMIC CALENDAR','الأجندة الاقتصادية','الأحداث الاقتصادية المهمة بتوقيتك المختار، مع خيارات البحث والتنبيه.')}
<nav class="related-asset-links" aria-label="نتائج الأخبار وتأثيرها">
<a href="#intelligence">قراءة نتائج الأخبار</a>
<a href="#agenda/ict-economic-6a">ربط الخبر بالشموع</a>
<a href="#agenda/ict-impact-6b">قياس حركة السعر</a>
<a href="#agenda/ict-compare-6c">مقارنة الإصدارات</a>
</nav>
<div class="calendar-week-switch" role="group" aria-label="اختيار أسبوع الأجندة"><button type="button" class="chip ${S.calendarWeek==='current'?'active':''}" data-calendar-week="current">هذا الأسبوع</button><button type="button" class="chip ${S.calendarWeek==='next'?'active':''}" data-calendar-week="next">الأسبوع القادم</button><span class="calendar-week-label">الأسبوع الذي يبدأ ${escapeHTML(view.week)} · ${status}${isGazaWeekend()&&S.calendarWeek==='next'?' · عرض مبكر من السبت':''}</span></div><div class="calendar-stats"><div class="metric"><span>الأحداث</span><strong class="en">${events.length}</strong></div><div class="metric"><span>التأثير المرتفع</span><strong class="en">${countHigh}</strong></div><div class="metric"><span>المصدر</span><strong style="font-size:14px">${escapeHTML(view.source||'Forex Factory')}</strong></div><div class="metric"><span>حالة البيانات</span><strong class="status-text" style="font-size:13px">${status}</strong></div></div>
<div class="card calendar-settings"><div class="settings-grid"><div>${tzPicker()}</div><div><label class="tz-label" for="alert-lead">التنبيه قبل الخبر</label><select id="alert-lead"><option value="5" ${localStorage.getItem('ict-alert-before')==='5'?'selected':''}>5 دقائق</option><option value="15" ${!localStorage.getItem('ict-alert-before')||localStorage.getItem('ict-alert-before')==='15'?'selected':''}>15 دقيقة</option><option value="30" ${localStorage.getItem('ict-alert-before')==='30'?'selected':''}>30 دقيقة</option><option value="60" ${localStorage.getItem('ict-alert-before')==='60'?'selected':''}>60 دقيقة</option></select></div><div><label class="tz-label">إشعارات المتصفح</label><button class="btn btn-small" id="enable-alerts" type="button">${localStorage.getItem('ict-alerts')==='enabled'?'إيقاف التنبيهات':'تفعيل التنبيهات'}</button></div></div><p class="subtle">تنبيهات هذا الخيار تعمل أثناء تصفح الموقع. لتلقي إشعارات عند إغلاقه، فعّل الاشتراك من مركز التنبيهات.</p></div>
<div class="card" style="padding:15px 18px"><div class="agenda-tools"><input id="event-search" aria-label="ابحث في الأحداث" placeholder="بحث باسم الحدث أو العملة" value="${escapeHTML(state.search)}"><select id="country-filter"><option value="ALL">كل العملات</option>${['USD','EUR','GBP','JPY','CHF','CAD','AUD','NZD','CNY'].map(code=>`<option value="${code}" ${state.country===code?'selected':''}>${code}</option>`).join('')}</select><select id="impact-filter"><option value="all">كل التأثيرات</option>${[3,2,1].map(i=>`<option value="${i}" ${state.impact==i?'selected':''}>${impactLabel[i]}</option>`).join('')}</select><select id="day-filter"><option value="all">جميع الأيام</option>${days.map(d=>`<option value="${d}" ${state.day===d?'selected':''}>${d}</option>`).join('')}</select><button class="chip" id="reset-filters">مسح الفلاتر</button><button class="chip" id="refresh-calendar">تحديث ↻</button></div></div>
${view.coverage==='partial'&&available?`<div class="notice" role="status">تغطية الأجندة جزئية لهذا الأسبوع. قد تغيب بعض الأحداث أو التوقعات. — راجع أجندة TradingView أدناه لبقية الأخبار.</div>`:''}
${view.updated?`<p class="data-caption">آخر تحديث ${escapeHTML(showDate(view.updated,'date'))}، ${showDate(view.updated)} (${escapeHTML(zoneLabel())}) · ${status}</p>`:''}
${view.status==='stale'?'<div class="notice">تحذير: هذه الأجندة لم تُحدّث مؤخرًا. تحقق من مواعيد الأحداث قبل التداول.</div>':''}
${next?`<div class="notice">الحدث القادم مرتفع التأثير: <b>${escapeHTML(next.title)}</b> — ${escapeHTML(next.currency)} • ${escapeHTML(showDate(next.dt,'date'))} ${showDate(next.dt)}</div>`:''}
${available?(filtered?rows:empty('لا توجد أحداث مطابقة للفلاتر.')):empty(S.calendarWeek==='next'?'لم ينشر المصدر بيانات الأسبوع القادم بعد، أو لم ينجح التحديث التلقائي. يبدأ عرض الأسبوع المقبل من السبت بتوقيت غزة بمجرد توفر بيانات موثوقة.':'الأجندة غير متاحة حاليًا. يمكنك الاطلاع على التقويم الإضافي أدناه.')}
<section class="section"><div class="section-heading"><h2>أجندة TradingView</h2><span class="subtle">مصدر مرئي إضافي — إعداد توقيتها مستقل عن اختيار الموقع</span></div><div class="tv-calendar"><tv-economic-calendar></tv-economic-calendar></div></section>
<div class="notice">قد تتأخر مواعيد الأحداث أو النتائج عن المصدر. الشرطة (—) تعني عدم توفر القيمة، وليست صفرًا. أوقات الأحداث حسب المنطقة الزمنية المختارة.</div>`;}
function nyClock(){return new Intl.DateTimeFormat('en-GB',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date())}
function markets(){return `${title('MARKETS DESK','الأسواق وقوة العملات','خريطة حرارية لعملات الفوركس تعرض التغيرات النسبية من TradingView مع رسوم الأسواق التفاعلية.')}
<div class="related-asset-links"><a href="assets.html#scan-assets">تصفّح كل أصول مركز الفرص</a></div>
<div class="notice">بيانات الخريطة مقدمة من TradingView وقد تتأخر حسب المصدر. الألوان تعكس تغيّر الزوج وليست تقييمًا مستقلًا لقوة عملة بعينها. للتبديل بين العرضين استخدم الزرين أدناه.</div>
<div class="market-pills"><button class="chip heat-toggle active" data-heat="heatmap" type="button">خريطة العملات الحرارية</button><button class="chip heat-toggle" data-heat="rates" type="button">جدول أسعار التقاطعات</button><a href="https://www.tradingview.com/markets/currencies/rates-all/" target="_blank" rel="noopener noreferrer">المزيد من العملات ↗</a></div>
<section class="chart-shell"><div class="section-heading"><h2>مركز قوة العملات — Forex Heatmap</h2><span class="subtle">TradingView • تغيّر يومي</span></div><div class="forex-heatmap" id="forex-heatmap"><tv-forex-table displayed-value="dailyChange" heatmap></tv-forex-table></div><p class="subtle">تُعرض التغيرات المتاحة عند الاتصال بالإنترنت؛ وهي ليست مؤشرًا مستقلًا لقوة العملة.</p></section>
<div class="market-pills"><a href="https://www.tradingview.com/symbols/XAUUSD/" target="_blank" rel="noopener noreferrer">الذهب XAUUSD ↗</a><a href="https://www.tradingview.com/symbols/EURUSD/" target="_blank" rel="noopener noreferrer">EURUSD ↗</a><a href="https://www.tradingview.com/symbols/GBPUSD/" target="_blank" rel="noopener noreferrer">GBPUSD ↗</a><a href="https://www.tradingview.com/symbols/TVC-DXY/" target="_blank" rel="noopener noreferrer">DXY ↗</a><a href="https://www.tradingview.com/symbols/NASDAQ-NDX/" target="_blank" rel="noopener noreferrer">NAS100 ↗</a><a href="https://www.tradingview.com/symbols/BTCUSD/" target="_blank" rel="noopener noreferrer">BTCUSD ↗</a></div>
<section class="chart-shell"><div class="section-heading"><h2>الرسم البياني التفاعلي — XAUUSD</h2><span class="subtle">TradingView</span></div><div class="chart-frame"><div class="tradingview-widget-container" style="height:100%;width:100%"><div class="tradingview-widget-container__widget" style="height:100%;width:100%"></div></div></div></section>`}
const ictZones=[['Asian Session','20:00','00:00','نطاق تداول آسيا (مرجع تعليمي شائع)'],['London Kill Zone','02:00','05:00','بداية الجلسة الأوروبية'],['New York Kill Zone','07:00','10:00','افتتاح السوق الأمريكي'],['London Close','10:00','12:00','إغلاق لندن حسب التعريف المستخدم'],['London Silver Bullet','03:00','04:00','نافذة Silver Bullet لندن'],['New York AM Silver Bullet','10:00','11:00','نافذة Silver Bullet نيويورك'],['New York PM Silver Bullet','14:00','15:00','نافذة Silver Bullet المسائية']];
function nyToday(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
function nyLocalToUtc(day,hhmm){const [y,m,d]=day.split('-').map(Number),[h,mm]=hhmm.split(':').map(Number);const desired=Date.UTC(y,m-1,d,h,mm);let guess=desired;for(let k=0;k<3;k++){const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(guess)).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));const actual=Date.UTC(parts.year,parts.month-1,parts.day,parts.hour,parts.minute);guess+=desired-actual}return new Date(guess)}
function convertNyWindow(start,end){const date=nyToday();const a=nyLocalToUtc(date,start),b=nyLocalToUtc(date,end);if(end<=start)b.setTime(b.getTime()+86400000);return `${showDate(a)} – ${showDate(b)} (${zoneLabel()})`}
// 6.8.82 — Optional educational notes inside the existing ICT Sessions page.
// This guide adds no signals, trade entries, market data or automated decisions.
function ictSessionPracticalGuide(){
 const guides=[
  {id:'london',label:'London Kill Zone',context:'راجع نطاق آسيا، القمم والقيعان القريبة، واتجاه اليوم المحتمل قبل التفكير في سيناريو.',
   checks:['ارسم أعلى وأدنى نطاق آسيا والقمم والقيعان الواضحة.','انتظر تفاعل السعر مع السيولة، ثم راقب الاندفاع وتغيّر البنية إن حدث.','حدّد الإبطال والمخاطرة أولًا؛ وجود الوقت المناسب وحده غير كافٍ.'],
   avoid:'تجنب اعتبار أي اختراق أو FVG داخل الجلسة إشارة دخول مستقلة دون سياق.'},
  {id:'newyork',label:'New York Kill Zone',context:'راجع ما حققته لندن، واتجاه الدولار، والأخبار الأمريكية القريبة من وقت الافتتاح.',
   checks:['افحص إن كانت سيولة لندن قد سُحبت أو ما زالت مستهدفة.','راجع الأجندة لتجنب تجاهل الأخبار عالية التأثير وقت التنفيذ.','انتظر تأكيدًا سعريًا واضحًا وحدد نقطة إبطال السيناريو.'],
   avoid:'لا تفترض استمرار حركة لندن أو انعكاسها تلقائيًا عند افتتاح نيويورك.'},
  {id:'bullet',label:'ICT Silver Bullet',context:'نافذة زمنية للبحث عن شروط نموذج محتمل، وليست وعدًا بوجود فرصة.',
   checks:['حدّد اتجاه السياق والسيولة التي جرى التعامل معها.','ابحث عن اندفاع واضح وFVG متسقة مع السياق، لا عن أي فجوة عشوائية.','راقب العودة للمنطقة وشروط الإبطال، ثم قيّم العائد إلى المخاطرة.'],
   avoid:'إذا لم تتوفر البنية والسيولة والاندفاع، فمرور النافذة بلا صفقة نتيجة طبيعية.'}
 ];
 return `<section class="ict-practical-guides" aria-label="دليل التطبيق العملي لجلسات ICT"><div class="ict-practical-guides-head"><div><span class="eyebrow">SESSION PLAYBOOK</span><h2>دليل التطبيق خلال الجلسات</h2></div><span class="subtle">افتح النموذج الذي تريد مراجعته</span></div><p class="ict-guide-lead">الوقت يحدد نافذة مراقبة، لكنه لا يثبت نموذجًا أو يضمن اتجاهًا. استخدم هذه القوائم للتعلّم والتحقق اليدوي على الشارت.</p><div class="ict-guide-grid">${guides.map(g=>`<details class="ict-guide-card"><summary><strong dir="ltr">${escapeHTML(g.label)}</strong><span aria-hidden="true">⌄</span></summary><div class="ict-guide-details"><p>${escapeHTML(g.context)}</p><h3>قائمة التحقق</h3><ol>${g.checks.map(c=>`<li>${escapeHTML(c)}</li>`).join('')}</ol><p class="ict-guide-avoid"><strong>متى أتجنب الإشارة؟</strong> ${escapeHTML(g.avoid)}</p></div></details>`).join('')}</div><div class="ict-guide-links"><a href="#academy">راجع الدروس في الأكاديمية</a><a href="research.html">افتح مختبر الأبحاث</a><a href="#agenda">تحقق من الأجندة الاقتصادية</a></div><p class="ict-guide-disclaimer">قوائم تدريبية لا تُنشئ صفقات أو إشعارات، ولا تستبدل التحقق من ظروف السوق أو إدارة المخاطرة.</p></section>`;
}
function ictTools(){const ny=new Date().toLocaleString('en-US',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hour12:false});const mins=Number(ny.split(':')[0])*60+Number(ny.split(':')[1]);const z=ictZones.map(([name,start,end,desc])=>{const s=+start.slice(0,2)*60+ +start.slice(3),e=+end.slice(0,2)*60+ +end.slice(3),active=s<e?mins>=s&&mins<e:mins>=s||mins<e;return `<article class="zone-row"><div><h3 dir="ltr">${name}</h3><p>${desc}</p></div><div class="zone-side"><strong class="en" dir="ltr">${start} – ${end} NY</strong><small class="local-zone">${convertNyWindow(start,end)}</small><span class="${active?'open-zone':'closed-zone'}">${active?'ضمن النافذة الآن':'خارج النافذة'}</span></div></article>`}).join('');return `${title('ICT TRADING TOOLS','أدوات ICT','مرجع سريع لجلسات التداول والنوافذ الزمنية حسب توقيت نيويورك، مع مراعاة تغير التوقيت الصيفي والشتوي.')}<div class="clock-banner"><div><small>الوقت الحالي في نيويورك</small><strong dir="ltr" class="en">${nyClock()}</strong></div><div><small>المنطقة الزمنية المرجعية</small><strong class="en">America/New_York</strong></div><button type="button" class="chip" id="refresh-clock">تحديث الوقت ↻</button></div><div class="card calendar-settings"><div class="settings-grid"><div>${tzPicker()}</div><div><label class="tz-label">الوقت في منطقتك</label><strong class="en">${showDate(new Date())}</strong></div></div><p class="subtle">المواعيد في الجدول أدناه مرجعية بتوقيت نيويورك. سيظهر التوقيت المحلي لكل نافذة تحت موعد نيويورك.</p></div>${sessionTimeline()}${ictSessionPracticalGuide()}<div class="section-heading"><h2>تفاصيل جميع النوافذ</h2><span class="subtle">المواعيد وفق التعريفات الشائعة</span></div><div class="zones">${z}</div><div class="notice">هذه النوافذ الزمنية إرشادية وتعتمد على توقيت نيويورك المحلي، وليست توصيات تداول أو ضمانًا لتحقق نمط سعري. قد تختلف التسميات وحدود بعض الجلسات بين المدارس والمراجع.</div>${notificationCenter()}`}
function hydrateMarketChart(){const target=document.querySelector('.chart-frame .tradingview-widget-container');if(!target)return;const script=document.createElement('script');script.src='https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';script.async=true;script.text=JSON.stringify({autosize:true,symbol:'FOREXCOM:XAUUSD',interval:'60',timezone:'Etc/UTC',theme:document.documentElement.dataset.theme==='dark'?'dark':'light',style:'1',locale:'en',allow_symbol_change:true,hide_top_toolbar:false,save_image:false,calendar:false,support_host:'https://www.tradingview.com'});target.appendChild(script)}
function social(){return `${title('CONNECT WITH US','تابعنا','ابقَ قريبًا من أخبارنا وتوصياتنا ومحتوانا التعليمي عبر منصات التواصل.')}${linksGrid(S.links)}`}

// Local, opt-in browser reminders. For background delivery a Push server is required.
const alertSettings=()=>({sessions:localStorage.getItem('ict-pref-sessions')!=='0'&&localStorage.getItem('ict-alert-sessions')==='yes',news:localStorage.getItem('ict-pref-news')!=='0'&&localStorage.getItem('ict-alert-news')!=='no',posts:localStorage.getItem('ict-pref-posts')!=='0'&&localStorage.getItem('ict-alert-posts')!=='no'});
function notificationCenter(mode='full'){
 const pref=alertSettings(),enabled=localStorage.getItem('ict-alerts')==='enabled';
 const newsPref=localStorage.getItem('ict-pref-news')!=='0',sessionPref=localStorage.getItem('ict-pref-sessions')!=='0',postsPref=localStorage.getItem('ict-pref-posts')!=='0';
 return `<section class="notification-center notification-public ${mode==='compact'?'notification-compact':''}" aria-label="اشتراك التنبيهات"><div class="card public-notify-card"><div class="public-notify-icon" aria-hidden="true"><svg class="public-notify-bell" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"/><path d="M10 21h4"/></svg><span>●</span></div><div class="public-notify-main"><span class="public-notify-eyebrow">ICT ALERTS</span><h2>خليك أول من يعرف</h2><p class="public-notify-intro">تصلك التحليلات والتوصيات الجديدة، والأخبار الاقتصادية المهمة، وتنبيهات جلسات التداول مباشرة على جهازك.</p><div class="public-notify-actions"><button type="button" class="btn public-push-btn" id="ict-push-subscribe">🔔 فعّل الإشعارات</button><span class="public-notify-privacy">بموافقتك فقط • يمكنك إيقافها في أي وقت</span></div><p id="ict-push-status" aria-live="polite" role="status" class="public-notify-status" hidden></p><details class="public-notify-options"><summary>تخصيص تنبيهاتي</summary><div class="public-notify-preferences"><label><input type="checkbox" id="alert-posts-opt" ${postsPref?'checked':''}> التحليلات والتوصيات</label><label><input type="checkbox" id="alert-news-opt" ${newsPref?'checked':''}> الأخبار الاقتصادية المهمة</label><label><input type="checkbox" id="alert-sessions-opt" ${sessionPref?'checked':''}> جلسات التداول وKill Zones</label></div><div class="public-notify-local"><span>تذكيرات إضافية أثناء التصفح</span><button type="button" class="chip" id="enable-alerts">${enabled?'إيقاف التذكيرات':'تفعيل التذكيرات'}</button><label class="alert-time">قبل الخبر <select id="alert-lead"><option value="5" ${localStorage.getItem('ict-alert-before')==='5'?'selected':''}>5 دقائق</option><option value="15" ${!localStorage.getItem('ict-alert-before')||localStorage.getItem('ict-alert-before')==='15'?'selected':''}>15 دقيقة</option><option value="30" ${localStorage.getItem('ict-alert-before')==='30'?'selected':''}>30 دقيقة</option><option value="60" ${localStorage.getItem('ict-alert-before')==='60'?'selected':''}>60 دقيقة</option></select></label></div></details></div></div></section>`;
}
function sendLocalAlert(title,body,tag,url){
 if(!('Notification' in window)||localStorage.getItem('ict-alerts')!=='enabled'||Notification.permission!=='granted')return false;
 try{const note=new Notification(title,{body,tag,icon:'icon-192.png'});note.onclick=()=>{window.focus();if(url)location.hash=url};return true}
 catch(err){console.warn('Local notification failed',err);return false}
}
const sessionSentKey='ict-session-sent-v1';
function sessionAlerts(){if(!alertSettings().sessions||localStorage.getItem('ict-alerts')!=='enabled'||Notification.permission!=='granted')return;
 const now=Date.now(),today=nyToday();let sent={};try{sent=JSON.parse(localStorage.getItem(sessionSentKey)||'{}')||{}}catch(_){sent={}}
 const names=new Set();let updated=false;
 // Display and remind only at real NY session boundaries (not rounded local times).
 for(const offset of [-1,0,1]){
  const date=new Date(Date.parse(today+'T12:00:00Z')+offset*86400000).toISOString().slice(0,10);
  for(const [name,start,end] of ictZones){const dt=nyLocalToUtc(date,start);const delta=now-dt.getTime();const key=name+'@'+dt.toISOString();if(delta>=0&&delta<75000&&!sent[key]&&!names.has(key)){
   if(sendLocalAlert('بدأت '+name,`من ${start} إلى ${end} بتوقيت نيويورك • راقب إعدادك قبل التداول`,'ict-session-'+key,'ict')){sent[key]=now;updated=true;names.add(key)}
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
  return `<article class="intel-event"><div class="intel-event-top"><span class="intel-currency">USD · ${escapeHTML(e.source)}</span><span class="intel-date">الفترة ${escapeHTML(e.period)}</span></div><h3>${escapeHTML(e.title)}</h3><div class="intel-numbers"><div><small>السابق</small><strong dir="ltr">${prior===null?'—':escapeHTML(String(prior))+escapeHTML(e.unit)}</strong></div><div><small>المتوقع</small><strong dir="ltr">${f?escapeHTML(String(f.value))+escapeHTML(f.unit):'—'}</strong></div><div><small>الفعلي</small><strong dir="ltr">${escapeHTML(String(actual))+escapeHTML(e.unit)}</strong></div></div><p class="intel-outcome">${f?`الفارق عن توقع السوق: ${surprise>0?'+':''}${escapeHTML(String(surprise))} ${e.unit==='%'?'نقطة مئوية':escapeHTML(e.unit)} · ${surprise>0?'أعلى من المتوقع':surprise<0?'أقل من المتوقع':'مطابق للتوقع'}`:changed}</p><p class="intel-note">${f?`التوقع: ${escapeHTML(f.source)} · ${f.verifiedBeforeRelease===false?'توقع الأجندة الحالي، غير مثبت الحفظ قبل النشر':'سُجل قبل النشر'}${f.recordedAt?' · '+escapeHTML(f.recordedAt):''}. ${f.verifiedBeforeRelease===false?'الفرق مرجعي وليس مفاجأة مثبتة قبل صدور الخبر. ':''}${escapeHTML(window.ICTCalendarConsensus?.interpretation(e)||'')} النتيجة الرسمية: ${escapeHTML(e.source)}. لا تمثل إشارة تداول. ${escapeHTML(window.ICTNewsImpact?.analyze({title:e.title,currency:'USD',stage:'released',actual:String(e.actual)+e.unit,forecast:f?String(f.value)+f.unit:'—',verifiedBeforeRelease:f?.verifiedBeforeRelease}).detail||'')}`:`قراءة رسمية من ${escapeHTML(e.source)}. توقع سوق مطابق غير متاح.`}</p></article>`;
 }).join('');
}
async function fetchOfficialEconomicResults(){
 // Reload the same calendar data even when the BLS feed is temporarily unavailable.
 await window.ICTCalendarConsensus?.load().catch(()=>{});
 const feeds=await Promise.all([['economic-official.json','BLS'],['economic-bea.json','BEA']].map(async ([file,source])=>{
  try{
   const response=await fetch(file+'?t='+Date.now(),{cache:'no-store'});
   if(!response.ok)return null;
   const data=await response.json();
   if(data?.source!==source||data.status!=='ok'||!Array.isArray(data.events))return null;
   return {updatedAt:data.updatedAt,events:data.events.filter(e=>e?.source===source&&e.period&&
    e.actual!==null&&e.actual!==''&&Number.isFinite(Number(e.actual))&&['%','K'].includes(e.unit)&&
    (source!=='BEA'||e.indicator==='core-pce-mom'&&Date.parse(e.releaseAt)<=Date.now()))};
  }catch{return null}
 }));
 const available=feeds.filter(Boolean);
 officialEconomicFeed=available.length?{updatedAt:available.map(f=>f.updatedAt).filter(Boolean).sort().at(-1),events:available.flatMap(f=>f.events).slice(0,30)}:null;
 if(['agenda','intelligence'].includes(state.page))render(true);
}
function economicNewsPriority(){
 try{const v=localStorage.getItem('ict-economic-news-priority-v1');return ['important','high','all'].includes(v)?v:'important'}catch{return 'important'}
}
function economicIntelligence(){
 const official=officialEconomicFeed?.events||[];
 const timeline=window.ICTCalendarConsensus?.lifecycle(official)||[];
 const priority=economicNewsPriority();
 const eligible=window.ICTCalendarConsensus?.priorityFilter(timeline,priority)||[];
 const relevant=eligible.filter(x=>x.stage==='upcoming'||x.stage==='awaiting'||x.stage==='released').slice(0,18);
 const filterUi=`<div class="economic-priority-filter" role="group" aria-label="تصفية الأخبار حسب التأثير"><span>عرض الأخبار:</span>${[['important','مرتفعة ومتوسطة'],['high','مرتفعة فقط'],['all','الكل']].map(([v,label])=>`<button type="button" data-economic-priority="${v}" aria-pressed="${priority===v}" class="${priority===v?'active':''}">${label}</button>`).join('')}</div>`;

 const clusterReports=(window.ICTNewsImpact?.clusters(eligible)||[]).filter(x=>x.items.some(i=>i.status!=='غير مكتمل')).slice(0,4);
 const reportStats=window.ICTNewsImpact?.clusterStats(eligible);
 const reportOverview=reportStats?.total?`<p class="macro-summary" aria-label="إحصاءات التقارير المتزامنة">من التقارير المتزامنة القابلة للمقارنة في البيانات المحمّلة: <strong>${reportStats.total}</strong> · متعارضة: <strong>${reportStats.mixed}</strong> · جزئية: <strong>${reportStats.partial}</strong>. ليست إحصاءات تاريخية شاملة ولا تعكس حركة السعر.</p>`:'';
 const clusterCards=clusterReports.length?`<h2>قراءة التقارير الاقتصادية المتزامنة</h2>${reportOverview}<div class="intel-grid macro-report-grid">${clusterReports.map(x=>`<article class="intel-event macro-report-card"><div class="intel-event-top"><span class="intel-currency">${escapeHTML(x.currency)}</span><span class="intel-date">${escapeHTML(showDate(new Date(x.date),'date'))}</span></div><h3>${escapeHTML(x.headline)}</h3><ul class="macro-report-items">${x.items.map(i=>`<li><span>${escapeHTML(i.name)}</span><small>${escapeHTML(i.status)}</small></li>`).join('')}</ul><p class="intel-note">${escapeHTML(x.detail)}</p></article>`).join('')}</div>`:'';
 const newsStages=filterUi+clusterCards+(relevant.length?`<h2>الأخبار العالمية القادمة وحالة النتائج</h2><div class="notice">أخبار العملات المتاحة في أجندتك الحالية والأسبوع القادم. النتائج الرسمية تُعرض من BLS أو BEA للمؤشرات المدعومة. وتُذكر الأجندة كمصدر للنتائج التي تنقلها.</div><div class="intel-grid">${relevant.map(e=>`<article class="intel-event"><div class="intel-event-top"><span class="intel-currency">${escapeHTML(e.currency)}</span><span class="intel-impact">${e.impact==='high'?'تأثير مرتفع':e.impact==='medium'?'تأثير متوسط':e.impact==='low'?'تأثير منخفض':'تأثير غير محدد'}</span><span class="intel-impact">${e.stage==='upcoming'?'قادم':e.stage==='released'?'صدرت النتيجة':'بانتظار النتيجة'}</span><span class="intel-date">${escapeHTML(showDate(new Date(e.date),'date'))} · ${escapeHTML(showDate(new Date(e.date)))}</span></div><h3>${escapeHTML(e.title)}</h3><div class="intel-numbers"><div><small>السابق</small><strong dir="ltr">${escapeHTML(e.previous)}</strong></div><div><small>المتوقع</small><strong dir="ltr">${escapeHTML(e.forecast)}</strong></div><div><small>الفعلي</small><strong dir="ltr">${escapeHTML(e.actual)}</strong></div></div>${e.stage==='upcoming'?'<p class="intel-note">لم يحن موعد الخبر بعد.</p>':economicReading(e,eligible)}</article>`).join('')}</div>`:`<div class="notice">لا توجد حاليًا أحداث قادمة أو نتائج منتظرة في الأجندة الأسبوعية المتاحة. ${priority==='important'?'جرّب خيار «الكل» لعرض الأخبار الأقل تأثيرًا.':'تأكد من تحديث ملفات الأسبوع الحالي والقادم.'}</div>`);
 const officialBlock=official.length
  ? `<div class="notice">نتائج رسمية أمريكية (BLS وBEA بحسب المؤشر) · آخر جلب ${escapeHTML(String(officialEconomicFeed.updatedAt||'غير متاح'))} · الفترة المكتوبة هي فترة الإحصاء لا موعد النشر. التوقعات تؤخذ من السجل التحريري الموثق أو من الأجندة الحالية عند تطابق الخبر والفترة؛ وتُميَّز التوقعات التي لم يُحفظ وقتها قبل الصدور.</div><div class="intel-grid">${officialIndicatorCards(official)}</div>`
  : `<div class="notice">لا تتوفر الآن نتائج رسمية محدثة. ستظهر تلقائيًا بعد نجاح مهمة GitHub الرسمية. لا نعرض أرقامًا افتراضية.</div>`;

 // Economic news is supplied by the site; no visitor uploads or private archives required.
 return `${title('ECONOMIC NEWS INTELLIGENCE','قراءة نتائج الأخبار الاقتصادية','أخبار الأجندة العالمية والنتائج الرسمية المتاحة تلقائيًا للجميع.')}${newsStages}<h2>النتائج الرسمية المتاحة تلقائيًا</h2>${officialBlock}<div class="notice">تظهر الأخبار القادمة والمتوقع والسابق من بيانات الموقع العامة، وتظهر النتائج الفعلية عندما ينشرها المصدر المتاح. لا يلزم استيراد ملفات أو تسجيل حساب. الأخبار غير المدعومة بنتيجة مؤكدة تُعرض دون اختلاق Actual.</div><a class="btn" href="intelligence.html#news">فتح مختبر الأخبار ←</a>`;

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
// 6.8.64 — Academy learning pathway. Content is bundled with the public site.
const academyStudy={
 liq:{goal:'تمييز أماكن السيولة الخارجية من مجرد حركة عشوائية.',example:'عندما يخترق السعر قمة اليوم السابق ثم يعود تحتها، سجّل المستوى والسياق وانتظر بنية أو تأكيدًا إضافيًا؛ لا تفترض انعكاسًا مضمونًا.',mistake:'اعتبار كل اختراق لقمة سابقة إشارة بيع مباشرة.',practice:'حدد قمة وقاع جلسة سابقة على شارت تاريخي، واكتب ما حدث بعد اختراق أحدهما.'},
 structure:{goal:'تمييز تغير البنية القصيرة عن كسر عابر داخل نطاق.',example:'بعد سحب سيولة قاع، راقب اندفاعًا صاعدًا وكسر قمة قصيرة محددة مسبقًا، ثم فكر في شروط الإبطال.',mistake:'وصف أي شمعة قوية بأنها MSS دون تحديد قمة أو قاع هيكلي.',practice:'اختر مثالين تاريخيين: كسر بنية واضح وكسر كاذب، ثم قارن.'},
 fvg:{goal:'تحديد الفجوة على ثلاث شموع وربطها بسياق الحركة.',example:'في المثال الصعودي التقليدي، تكون قمة الشمعة الأولى أدنى من قاع الشمعة الثالثة؛ المنطقة بينهما هي الفجوة المرجعية.',mistake:'تداول أي FVG بمعزل عن الاتجاه والسيولة وإدارة المخاطر.',practice:'حدد فجوتين على شارت 15 دقيقة، وسجل اتجاه الحركة ومكان السيولة المجاورة.'},
 ob:{goal:'اتباع تعريف ثابت لكتلة الأوامر عند مراجعة النماذج.',example:'حدد آخر شمعة معاكسة قبل اندفاع بنيوي وفق معيار مكتوب مسبقًا، ثم قارنها بحالات تاريخية مشابهة.',mistake:'إعادة رسم المنطقة بعد النتيجة لكي تبدو التوقعات صحيحة.',practice:'اكتب قاعدة واحدة لتحديد المنطقة واختبر تطبيقها على خمس لقطات تاريخية.'},
 premium:{goal:'حساب منتصف نطاق واضح بدل اختيار نطاق يلائم توقعك.',example:'إذا امتد النطاق المرجعي من 100 إلى 120، فإن منتصفه 110، والجزء الأعلى Premium والأسفل Discount.',mistake:'تغيير أطراف النطاق كلما تحرك السعر، ثم التعامل مع النتيجة كإشارة مستقلة.',practice:'اختر Swing High وSwing Low وعلّم المنتصف على الشارت.'},
 ote:{goal:'فهم أن نطاق التصحيح أداة سياق وليس نظام دخول مكتملًا.',example:'بعد حركة واضحة، يمكن فحص مناطق تصحيح عميقة بحثًا عن تقاطع مع السيولة أو FVG وتوقيت ملائم.',mistake:'اعتبار لمس نسبة فيبوناتشي كافيًا لإلغاء شرط الوقف أو التأكيد.',practice:'راجع ثلاث حركات سابقة وحدد أين كان الإبطال منطقيًا قبل معرفة النتيجة.'},
 kz:{goal:'ربط الوقت بالسياق ومراعاة تغير التوقيت الصيفي لنيويورك.',example:'قد تتكرر زيادة النشاط حول افتتاح نيويورك، لكن التوقيت وحده لا يثبت وجود فرصة جيدة.',mistake:'افتراض أن Kill Zone تبقى على نفس ساعة الهاتف طوال العام.',practice:'قارن توقيت نافذة ICT المختارة في أسبوع صيفي وآخر شتوي.'},
 sb:{goal:'فهم شروط المراقبة الزمنية لنموذج Silver Bullet.',example:'راقب خلال النافذة المحددة سياق السيولة والاندفاع والفجوات، وسجل الحالات التي لم تتوافر فيها الشروط.',mistake:'تحويل اسم النافذة إلى إشارة شراء أو بيع تلقائية.',practice:'وثّق خمس جلسات متتالية، بما فيها الجلسات التي لم يوجد فيها إعداد صالح.'}
};
// 6.8.76: editorial study cards — examples, verification steps and limitations.
// Content is included in the site; no visitor uploads, external requests or auto-trading.
const academyFieldGuide={
 liq:{scenario:'قمة جلسة سابقة عند 1.0850: اخترقها السعر إلى 1.0854 ثم عاد تحت 1.0850. هذه ملاحظة لسحب محتمل للسيولة، وليست أمر بيع.',checks:['ارسم المستوى قبل الاختراق ولا تعِد تحديده بعد النتيجة.','سجّل وقت الجلسة وما إذا كانت الحركة مدعومة باندفاع لاحق.','حدد قمة الإبطال ومسافة الوقف قبل التفكير في الدخول.'],avoid:'إذا استقر السعر فوق القمة وأعاد اختبارها بنجاح، قد تكون الحركة اختراقًا مستمرًا لا انعكاسًا.',review:'افحص 10 اختراقات سابقة وسجّل عدد حالات العودة داخل النطاق دون افتراض أن العودة وحدها تحقق ربحًا.'},
 structure:{scenario:'بعد سحب قاع محلي، يصعد السعر بكسر قمة قصيرة محددة سلفًا؛ يمكن وصف ذلك كتحول بنية على الإطار المختار إذا رافقه انتقال واضح في الزخم.',checks:['اختر إطارًا زمنيًا وحدد القمة أو القاع الهيكلي مسبقًا.','ميّز بين كسر بإغلاق واضح ووخزة عابرة فوق المستوى.','حدد موضع إبطال السيناريو على نفس الإطار.'],avoid:'داخل نطاق متذبذب وضيق، قد تتكرر كسور شكلية كثيرة من دون تحول قابل للاعتماد.',review:'وثّق خمس كسور بنية مع صور قبل وبعد الكسر وقارنها بخمس حالات لم ينجح فيها الكسر.'},
 fvg:{scenario:'في نموذج صعودي من ثلاث شموع، إذا كانت قمة الأولى 100.20 وقاع الثالثة 100.50 فالفجوة المرجعية بين 100.20 و100.50؛ لا يلزم أن يعود السعر إليها.',checks:['تحقق من علاقة الشمعة الأولى والثالثة دون الاعتماد على لون الشمعة الوسطى وحده.','دوّن اتجاه الاندفاع وموقع الفجوة بالنسبة للسيولة والنطاق.','حدد بوضوح هل هدف الدراسة هو لمس الفجوة أم رد فعل السعر بعدها.'],avoid:'الفجوات الصغيرة داخل التذبذب أو أثناء سبريد مرتفع قد لا تحمل دلالة عملية.',review:'حدد 20 فجوة تاريخية، واحتسب معدل العودة إليها خلال عدد شموع محدد مسبقًا.'},
 ob:{scenario:'بعد كسر بنية مصحوب باندفاع، حدد آخر شمعة معاكسة وفق تعريف مكتوب. قد يستخدم متداولون آخرون حدودًا مختلفة للكتلة نفسها.',checks:['اكتب معيار الكتلة قبل مراجعة النتائج.','حدد هل ستستخدم جسم الشمعة أم الظل لتحديد المنطقة.','ميّز بين لمس المنطقة وحدوث تأكيد قابل للقياس.'],avoid:'إذا احتاج رسم الكتلة إلى تحريك حدودها بعد كل نتيجة، فالمعيار غير قابل للاختبار العادل.',review:'طبق نفس قاعدة الرسم على 15 مثالًا، وسجّل النتائج دون تعديل تعريف المنطقة.'},
 premium:{scenario:'نطاق من 100 إلى 120 يعطي منتصفًا عند 110. أعلى 110 يسمى Premium وأسفله Discount بالنسبة لهذا النطاق فقط.',checks:['حدد قمة وقاع النطاق قبل معرفة موضع السعر.','احسب المنتصف رياضيًا: (القمة + القاع) ÷ 2.','استخدم موقع السعر ضمن النطاق مع اتجاه وبنية السوق، لا بمعزل عنهما.'],avoid:'اختيار نطاق جديد في كل مرة للحصول على تسمية تناسب الصفقة يؤدي إلى انحياز.',review:'راجع عشرة نطاقات ثابتة وسجّل ما إذا كان تقسيمها أضاف معلومة تتجاوز اتجاه السوق.'},
 ote:{scenario:'بعد حركة من 100 إلى 120 يمكن دراسة تراجع عميق ضمن الحركة، لكن مستوى فيبوناتشي وحده لا يحدد نجاح صفقة أو حدود إبطالها.',checks:['حدد طرفي الحركة ونوع القياس قبل رسم النسب.','تحقق من تلاقي المنطقة مع بنية أو سيولة ووقت واضح.','احسب نسبة المخاطرة إلى العائد بعد تحديد وقف موضوعي.'],avoid:'لا تتعامل مع لمس منطقة OTE باعتباره أمر دخول تلقائيًا، خصوصًا عندما تتغير البنية ضد السيناريو.',review:'قارن 10 حالات لمس منطقة التصحيح مع 10 حالات لم تُلمس، مع تسجيل نافذة المراقبة نفسها.'},
 kz:{scenario:'قد يزداد النشاط في جزء محدد من جلسة لندن أو نيويورك؛ التوقيت في فلسطين يختلف موسميًا بحسب تغيّر الساعة في نيويورك.',checks:['اعتمد توقيت نيويورك الأصلي للنافذة أولًا.','راجع الفروق الموسمية مع توقيتك المحلي يوم التطبيق.','افحص الأخبار القوية والسبريد قبل الحكم على نشاط الجلسة.'],avoid:'ليس كل يوم أو دقيقة داخل Kill Zone فرصة؛ بعض الجلسات تبقى منخفضة النشاط.',review:'سجّل حركة 15 دقيقة في عشر جلسات داخل النافذة وخارجها لمقارنة التذبذب.'},
 sb:{scenario:'في نافذة Silver Bullet، قد تتشكل سيولة ثم اندفاع وفجوة FVG. غياب أحد الشروط المحددة في خطة الاختبار يعني لا توجد إشارة، حتى لو تحرك السعر بقوة.',checks:['ثبت النافذة الزمنية والتوقيت المرجعي.','عرّف شرط السيولة والاندفاع وFVG كتابةً.','حدّد شروط إبطال السيناريو ومدة مراقبته قبل دخول افتراضي.'],avoid:'لا تبحث عن صفقة بأي ثمن لمجرد دخول النافذة الزمنية أو رؤية فجوة عشوائية.',review:'وثّق 20 جلسة، وسجل أيضًا الأيام التي لم تتوافر فيها شروط النموذج.'}
};
const academyTracks=[{id:'start',label:'الأساسيات',ids:['liq','premium','kz']},{id:'build',label:'بناء النموذج',ids:['structure','fvg','ob']},{id:'advanced',label:'التطبيق المتقدم',ids:['ote','sb']}];
let academySelected='liq', academyTrack='all';
// 6.8.65: readonly contextual navigation from research to the corresponding public lesson.
try { const lessonParam=new URLSearchParams(location.search).get('lesson');
  if(academyLessons.some(item=>item.id===lessonParam)) academySelected=lessonParam;
} catch {} 
const academyDestinations={
 liq:{url:'research.html?concept=liq',label:'افحص سحب السيولة في مختبر الأبحاث'},
 structure:{url:'research.html?concept=structure',label:'راجع مفهوم MSS داخل المختبر'},
 fvg:{url:'research.html?concept=fvg',label:'استكشف FVG في مختبر الأبحاث'},
 ob:{url:'research.html?concept=ob',label:'وثّق مثال Order Block في مكتبة النماذج'},
 premium:{url:'research.html?concept=premium',label:'طبّق النطاقات على مخطط تاريخي'},
 ote:{url:'research.html?concept=ote',label:'راجع مناطق التصحيح على شموع تاريخية'},
 kz:{url:'./#ict',label:'افتح أوقات جلسات ICT'},
 sb:{url:'research.html?concept=sb',label:'راجع Silver Bullet مع بيانات تاريخية'}
};
// 6.8.81 — Interactive ICT decision practice. Independent from lesson completion.
// Fictional scenarios, not market quotes, signals, or automatic trade recommendations.
const academyExercises={
 liq:[
  {s:'السعر اخترق قمة الأمس 1.0850 ثم أغلق فوقها، وما زال يحتفظ بالمستوى كدعم. ماذا تستنتج؟',o:['سحب سيولة وانعكاس هابط مؤكد','قد يكون اختراقًا مستمرًا؛ أحتاج سياقًا وتأكيدًا','بيع فوري لأن القمة اختُرقت'],a:1,why:'مجرد تجاوز القمة لا يثبت انعكاسًا. البقاء فوقها قد ينسجم مع استمرار الاختراق.'},
  {s:'اخترق السعر قاعًا واضحًا ثم عاد فوقه، دون كسر بنية صاعد لاحق. ما التصرف التحليلي الأنسب؟',o:['أصفه سحبًا محتملًا وأنتظر تأكيدًا آخر','أضمن أن القاع النهائي تحقق','أضع هدفًا سعريًا عشوائيًا'],a:0,why:'العودة فوق القاع قد تشير إلى سحب محتمل، لكنها لا تكفي بذاتها للدخول أو لتوقع المسار.'}
 ],
 structure:[
  {s:'بعد سحب قاع، أغلق السعر فوق قمة هيكلية قصيرة محددة مسبقًا باندفاع واضح. ما الوصف الأقرب؟',o:['MSS محتمل يحتاج سياقًا وخطة إبطال','نجاح الصفقة مضمون','لا توجد أي دلالة على تغير البنية'],a:0,why:'كسر قمة محددة مع انتقال الزخم يدعم قراءة MSS، لكنه لا يؤكد نتيجة تداول.'},
  {s:'في نطاق ضيق، تخترق شمعة بظلها قمة صغيرة ثم تغلق داخل النطاق. هل تعدها MSS مؤكدة؟',o:['نعم لأن الظل يكفي في كل الحالات','لا؛ أراجع معيار الكسر والإغلاق والسياق','نعم إذا كان لونها أخضر'],a:1,why:'الاختراق العابر داخل نطاق متذبذب لا يحقق بالضرورة معيار كسر البنية المحدد مسبقًا.'}
 ],
 fvg:[
  {s:'قمة الشمعة الأولى 100.20 وقاع الثالثة 100.50 بعد اندفاع صاعد. ما المنطقة المرجعية للفجوة؟',o:['100.20 إلى 100.50','100.50 إلى 101.50 بالضرورة','لا توجد فجوة لأن لون الشمعة مجهول'],a:0,why:'الفجوة الصعودية التقليدية تتكون عندما تكون قمة الأولى أدنى من قاع الثالثة؛ هنا الفارق 0.30.'},
  {s:'ظهرت FVG صعودية في سوق متذبذب دون سياق سيولة أو إبطال واضح. ماذا تفعل؟',o:['أشتري كل فجوة','أتجاهل المعايير وأكتفي بحجمها','أمتنع عن عدّها فرصة مكتملة وأفحص السياق'],a:2,why:'الفجوة وصف لحركة سعرية وليست إشارة تداول مستقلة، خصوصًا في التذبذب.'}
 ],
 ob:[
  {s:'أثناء مراجعة 20 نموذجًا، غيّرت حدود Order Block بعد معرفة النتيجة. ما أثر ذلك؟',o:['يجعل الاختبار أكثر دقة','يدخل انحيازًا ويضعف صلاحية النتائج','ليس مهمًا لأن النماذج تقديرية'],a:1,why:'تحريك التعريف بعد الاطلاع على النتيجة يخلق انحيازًا تاريخيًا؛ يجب تثبيت القواعد قبل الاختبار.'},
  {s:'حددت آخر شمعة معاكسة قبل اندفاع، لكن لم يحدث تغير بنية وفق معيارك. هل المنطقة تلقائيًا Order Block صالح؟',o:['لا، راجع شروط النموذج كاملة','نعم بمجرد وجود شمعة معاكسة','نعم إذا لمست المنطقة لاحقًا'],a:0,why:'وفق التعريف المعتمد في الدرس، يلزم اتساق سياق الاندفاع والبنية ومعايير اختيار المنطقة.'}
 ],
 premium:[
  {s:'لديك نطاق واضح بين 100 و120، والسعر عند 114. أين يقع بالنسبة إلى منتصف النطاق؟',o:['Discount','Premium','عند المنتصف بالضبط'],a:1,why:'منتصف النطاق 110؛ السعر 114 يقع في النصف العلوي (Premium) بالنسبة لهذا النطاق.'},
  {s:'غيّرت قمة النطاق المرجعي بعد رؤية السعر لكي يصبح في Discount. ما المشكلة؟',o:['لا مشكلة لأن النطاق قابل للتغيير دومًا','هذا يصحح التحيز','اختيار النطاق بعد النتيجة قد يخدع التحليل'],a:2,why:'ينبغي تحديد أطراف النطاق بمعيار ثابت قبل استنتاج Premium أو Discount.'}
 ],
 ote:[
  {s:'لمس السعر منطقة تصحيح عميق دون تلاقٍ مع سيولة أو بنية، ولا يوجد وقف محدد. ما الأفضل؟',o:['المنطقة وحدها لا تبرر دخولًا؛ أنتظر شروطًا إضافية','أدخل لأن النسبة تضمن الارتداد','أرفع الرافعة لتعويض غياب الشروط'],a:0,why:'OTE إطار لدراسة التصحيح؛ لا يضمن الدخول ولا يلغي شرط إدارة المخاطر.'},
  {s:'وضعت أداة فيبوناتشي على حركة عشوائية بلا أطراف مرجعية ثابتة. هل يصح اعتبار النسب دليلاً مستقلًا؟',o:['نعم في أي سوق','لا، يجب تحديد الحركة والسياق قبل القياس','نعم إذا ظهرت خطوط كثيرة'],a:1,why:'اختيار الحركة والأطراف أساس التفسير؛ التلاقي العشوائي للنسب ليس تحققًا من النموذج.'}
 ],
 kz:[
  {s:'تغيّر توقيت نيويورك الصيفي، وأنت تعتمد ساعة ثابتة على هاتفك لنافذة Kill Zone. أين الخلل؟',o:['لا حاجة لمراجعة التوقيت','توقيت النافذة يجب ربطه بنيويورك ثم تحويله محليًا','كل Kill Zones تتبع UTC دائمًا'],a:1,why:'مواعيد نيويورك المحلية لا تساوي ساعة ثابتة على جهازك طوال السنة؛ راجع اختلاف التوقيت الموسمي.'},
  {s:'وصلت نافذة Kill Zone، لكن لا يوجد نموذج سعري واضح. ماذا تعتبر الوقت؟',o:['إشارة دخول آلية','ضمان زيادة السعر','شرطًا زمنيًا دون إشارة تداول مكتملة'],a:2,why:'نافذة الوقت تصفي مواعيد المراقبة، ولا تنشئ فرصة مكتملة من عدم.'}
 ],
 sb:[
  {s:'خلال نافذة Silver Bullet لم يظهر اندفاع أو FVG واضح أو سياق سيولة. ما القرار الأنسب؟',o:['أسجل عدم توافر إعداد مطابق لقواعدي','أتداول لأن الوقت وحده يكفي','أفترض أن أي شمعة هي إشارة'],a:0,why:'عدم وجود إعداد صالح نتيجة متابعة طبيعية؛ النافذة لا تفرض تنفيذ صفقة.'},
  {s:'في اختبار Silver Bullet التاريخي، احتفظت فقط بالجلسات التي نجح فيها النموذج. ما أثر ذلك؟',o:['يجعل الربحية المتوقعة أدق','انحياز انتقائي يخفي الجلسات الفاشلة أو غير المؤهلة','لا يؤثر إذا كان الهدف تعليمياً'],a:1,why:'تقييم النموذج يتطلب سجلًا متسقًا يشمل جميع الجلسات المعنية، لا المنتقاة بعد معرفة النتيجة.'}
 ]
};
const academyPracticeKey='ict-academy-practice-v1';
const academyPracticeChoice=Object.create(null);
function academyPracticeProgress(){
 try{const value=JSON.parse(localStorage.getItem(academyPracticeKey)||'{}');
  if(!value||typeof value!=='object'||Array.isArray(value))return {};
  return Object.fromEntries(Object.entries(value).filter(([id,v])=>academyLessons.some(l=>l.id===id)&&Array.isArray(v)&&v.length===2).map(([id,v])=>[id,v.map(Boolean)]));
 }catch{return {}}
}
function academyPracticeBlock(id){
 const rows=academyExercises[id]||[],saved=academyPracticeProgress(),passed=rows.filter((_,i)=>saved[id]?.[i]).length;
 return `<details class="academy-practice" id="academy-practice"><summary>تدرّب على اتخاذ القرار · ${passed}/${rows.length} إجابات صحيحة محفوظة</summary>
 <div class="academy-practice-body"><p class="academy-practice-note">حالات تعليمية افتراضية. اختر جوابًا، ثم اقرأ السبب. يمكن إعادة المحاولة دون تغيير إكمال الدرس.</p>
 ${rows.map((item,i)=>{const previous=academyPracticeChoice[id+'-'+i];const correct=saved[id]?.[i];return `<section class="academy-practice-case" data-practice-case="${id}-${i}"><small>حالة ${i+1} من ${rows.length}</small><h3>${escapeHTML(item.s)}</h3><div class="academy-practice-options">${item.o.map((answer,j)=>`<button type="button" data-practice-lesson="${id}" data-practice-case-index="${i}" data-practice-choice="${j}" aria-pressed="${previous===j}">${escapeHTML(answer)}</button>`).join('')}</div><p class="academy-practice-feedback" role="status" aria-live="polite">${previous===undefined?(correct?'✓ أنهيت هذه الحالة سابقًا. يمكنك إعادتها.':'اختر إجابة لعرض التفسير.'):escapeHTML((previous===item.a?'✓ إجابة صحيحة. ':'ليست الإجابة الأنسب. ')+item.why)}</p></section>`}).join('')}
 <p class="academy-practice-note">يُحفظ التقدم على هذا الجهاز فقط؛ لا يحتاج الزائر إلى ملفات أو تسجيل حساب.</p></div></details>`;
}
function academyPracticeAnswer(id,caseIndex,choice){
 const item=academyExercises[id]?.[caseIndex];if(!item||academySelected!==id||!Number.isInteger(choice)||choice<0||choice>=item.o.length)return;
 academyPracticeChoice[id+'-'+caseIndex]=choice;
 const saved=academyPracticeProgress();if(!Array.isArray(saved[id]))saved[id]=[false,false];
 if(choice===item.a){saved[id][caseIndex]=true;try{localStorage.setItem(academyPracticeKey,JSON.stringify(saved))}catch{}}
 const block=document.querySelector(`[data-practice-case="${id}-${caseIndex}"]`);if(!block)return;
 block.querySelectorAll('[data-practice-choice]').forEach(btn=>{const pressed=Number(btn.dataset.practiceChoice)===choice;btn.setAttribute('aria-pressed',String(pressed));btn.classList.toggle('is-correct',pressed&&choice===item.a);btn.classList.toggle('is-wrong',pressed&&choice!==item.a)});
 const feedback=block.querySelector('.academy-practice-feedback');if(feedback)feedback.textContent=(choice===item.a?'✓ إجابة صحيحة. ':'ليست الإجابة الأنسب. ')+item.why;
 const summary=document.querySelector('#academy-practice>summary');if(summary){const count=academyExercises[id].filter((_,i)=>saved[id]?.[i]).length;summary.textContent=`تدرّب على اتخاذ القرار · ${count}/${academyExercises[id].length} إجابات صحيحة محفوظة`;}
}

function academyDone(){try{const raw=JSON.parse(localStorage.getItem('ict-academy-completed')||'[]');return Array.isArray(raw)?raw.filter(id=>academyLessons.some(l=>l.id===id)):[]}catch{return []}}
function academyProgressHTML(done){const count=academyLessons.filter(x=>done.includes(x.id)).length;return `تقدمك: <strong>${count} من ${academyLessons.length}</strong> دروس · ${Math.round(count/academyLessons.length*100)}%<div class="academy-progress-track" role="progressbar" aria-label="نسبة إكمال الدروس" aria-valuenow="${count}" aria-valuemin="0" aria-valuemax="${academyLessons.length}"><span style="width:${100*count/academyLessons.length}%"></span></div>`}
function ictAcademy(){
 const done=academyDone(),current=academyLessons.find(x=>x.id===academySelected)||academyLessons[0],study=academyStudy[current.id],ix=academyLessons.findIndex(x=>x.id===current.id);
 const next=academyLessons.slice(ix+1).find(x=>!done.includes(x.id))||academyLessons.find(x=>!done.includes(x.id)&&x.id!==current.id)||academyLessons[(ix+1)%academyLessons.length];
 const filtered=academyTrack==='all'?academyLessons:academyLessons.filter(x=>academyTracks.find(t=>t.id===academyTrack)?.ids.includes(x.id));
 return `${title('ICT ACADEMY','أكاديمية ICT بالعربي','مسار تعليمي مجاني من الموقع نفسه: درس، تطبيق عملي، ثم اختبار فهم.')}
 <div class="academy-progress" id="academy-progress">${academyProgressHTML(done)}</div>
 <div class="academy-tracks" role="group" aria-label="مسارات التعلم"><button type="button" data-academy-track="all" aria-pressed="${academyTrack==='all'}">كل الدروس</button>${academyTracks.map(t=>`<button type="button" data-academy-track="${t.id}" aria-pressed="${academyTrack===t.id}">${t.label} · ${t.ids.filter(id=>done.includes(id)).length}/${t.ids.length}</button>`).join('')}</div>
 <div class="academy-layout"><nav class="academy-list" aria-label="اختيار درس">${filtered.map(x=>`<button type="button" data-lesson="${x.id}" class="${x.id===current.id?'active':''}" aria-current="${x.id===current.id?'true':'false'}"><span>${done.includes(x.id)?'✓ ':''}${escapeHTML(x.title)}</span><small>${escapeHTML(x.tag)}</small></button>`).join('')}</nav>
 <article class="academy-content card"><div class="academy-topline"><span class="tag">${escapeHTML(current.tag)}</span><span class="subtle">الدرس ${ix+1} من ${academyLessons.length}</span></div><h2>${escapeHTML(current.title)}</h2><p>${escapeHTML(current.body)}</p>
 <div class="academy-notes"><section><h3>هدف الدرس</h3><p>${escapeHTML(study.goal)}</p></section><section><h3>مثال توضيحي</h3><p>${escapeHTML(study.example)}</p></section><section><h3>خطأ شائع</h3><p>${escapeHTML(study.mistake)}</p></section><section><h3>تدريب على الشارت</h3><p>${escapeHTML(study.practice)}</p></section></div>
 <details class="academy-field-guide"><summary>دليل التطبيق العملي · ${escapeHTML(current.title)}</summary><div class="academy-field-body"><section><h3>حالة دراسة توضيحية</h3><p>${escapeHTML(academyFieldGuide[current.id].scenario)}</p></section><section><h3>قائمة تحقق قبل التطبيق</h3><ol>${academyFieldGuide[current.id].checks.map(c=>`<li>${escapeHTML(c)}</li>`).join('')}</ol></section><section><h3>متى نتجنب الاستنتاج؟</h3><p>${escapeHTML(academyFieldGuide[current.id].avoid)}</p></section><section><h3>تمرين توثيق ومراجعة</h3><p>${escapeHTML(academyFieldGuide[current.id].review)}</p></section><p class="academy-field-disclaimer">الأمثلة تعليمية وليست أسعارًا حية أو توصيات. سجّل حالات النجاح والفشل معًا لتجنّب الانحياز.</p></div></details>
 ${academyPracticeBlock(current.id)}
 <div class="academy-question"><strong>اختبر فهمك</strong><p>${escapeHTML(current.q)}</p>${current.opts.map((v,i)=>`<button type="button" data-quiz="${i}" data-lesson-id="${current.id}">${escapeHTML(v)}</button>`).join('')}<div id="academy-feedback" role="status" aria-live="polite">${done.includes(current.id)?'✓ أنهيت هذا الدرس سابقًا. يمكنك مراجعته أو إعادة الإجابة.':''}</div></div>
 <div class="academy-bridge"><div><strong>تطبيق ما تعلمته</strong><p>انتقل إلى الأداة المرتبطة بالدرس. البيانات العامة جاهزة من الموقع؛ اختبر الشروط بنفسك، ولا تُنشأ أي صفقة تلقائيًا.</p></div><a class="academy-bridge-link" href="${academyDestinations[current.id].url}">${escapeHTML(academyDestinations[current.id].label)} ←</a></div>
 <div class="academy-actions"><button type="button" data-academy-next="${next.id}" class="btn">${done.length===academyLessons.length?'مراجعة الدرس التالي':'الدرس التالي غير المكتمل'} ←</button><button type="button" data-academy-revisit="1" class="academy-secondary">مراجعة الدروس المكتملة</button></div><p class="subtle">التقدم محفوظ على جهازك فقط؛ لا يلزم حساب أو رفع ملفات. الأمثلة تعليمية وليست إشارات تداول.</p></article></div>`;
}
function academyAnswer(id,index){
 const lesson=academyLessons.find(x=>x.id===id),feedback=$('academy-feedback');if(!lesson||!feedback||academySelected!==id)return;
 const right=index===lesson.a;
 feedback.textContent=(right?'✓ إجابة صحيحة. ':'الإجابة غير صحيحة؛ راجع الشرح وحاول مرة أخرى. ')+lesson.why;
 feedback.className=right?'answer-ok':'answer-wrong';
 document.querySelectorAll('[data-quiz]').forEach(b=>{b.classList.toggle('academy-correct',right&&Number(b.dataset.quiz)===index);b.classList.toggle('academy-incorrect',!right&&Number(b.dataset.quiz)===index)});
 if(right){const done=academyDone();if(!done.includes(id)){done.push(id);try{localStorage.setItem('ict-academy-completed',JSON.stringify(done))}catch{feedback.textContent+=' تعذر حفظ التقدم على هذا الجهاز.'}}
 const prog=$('academy-progress');if(prog)prog.innerHTML=academyProgressHTML(done);
 document.querySelectorAll(`[data-lesson="${id}"] span`).forEach(el=>{if(!el.textContent.startsWith('✓'))el.prepend('✓ ')});
 }
}
function tradingCalculators(){return `${title('TRADING CALCULATORS','حاسبات التداول وإدارة المخاطر','احسب قيمة المخاطرة وحجم الصفقة والعائد إلى المخاطرة باستخدام مواصفات عقد وسيطك.')}<div class="calc-grid"><section class="card"><h2>حاسبة حجم الصفقة</h2><div class="calc-fields"><label>الرصيد بعملة الحساب<input id="calc-balance" type="number" min="0" step="any" value="1000"></label><label>المخاطرة %<input id="calc-risk-pct" type="number" min="0" max="100" step="any" value="1"></label><label>مسافة وقف الخسارة (بيب/نقطة)<input id="calc-stop" type="number" min="0" step="any" value="30"></label><label>قيمة البيب/النقطة للوت الواحد بعملة الحساب<input id="calc-value" type="number" min="0" step="any" value="10"></label></div><div class="calc-result" id="calc-position-result" role="status"></div><p class="subtle">أدخل قيمة البيب أو النقطة للوت الواحد وفق الوسيط والعملة ونوع العقد. 10 هنا مثال فقط، وليس قيمة صحيحة لكل الأدوات. لا يشمل السبريد أو العمولة أو الانزلاق.</p></section><section class="card"><h2>حاسبة العائد إلى المخاطرة</h2><div class="calc-fields"><label>الدخول<input id="rr-entry" type="number" step="any" value="1.15000"></label><label>وقف الخسارة<input id="rr-stop" type="number" step="any" value="1.14700"></label><label>جني الربح<input id="rr-take" type="number" step="any" value="1.15600"></label><label>اتجاه الصفقة<select id="rr-dir"><option value="buy">BUY — شراء</option><option value="sell">SELL — بيع</option></select></label></div><div class="calc-result" id="calc-rr-result" role="status"></div></section></div><div class="notice">الحسابات تقديرية وتعليمية. لا ترسل أوامر تداول ولا تحفظ بيانات مالية في خادم. تحقق من حجم العقد والحد الأدنى للوت ومتطلبات الهامش لدى وسيطك.</div>`}
function updateCalculators(){if(state.page!=='calculators')return;const n=id=>Number($(id)?.value),b=n('calc-balance'),r=n('calc-risk-pct'),s=n('calc-stop'),v=n('calc-value');const result=$('calc-position-result');if(result){if(![b,r,s,v].every(Number.isFinite)||b<=0||r<=0||r>100||s<=0||v<=0)result.textContent='أدخل قيمًا موجبة صحيحة، ونسبة مخاطرة لا تتجاوز 100%.';else{const cash=b*r/100,lots=cash/(s*v);result.textContent=`المخاطرة النقدية: ${cash.toFixed(2)} | الحجم النظري: ${lots.toFixed(3)} لوت (قبل التقريب لشروط الوسيط)`;}}const entry=n('rr-entry'),stop=n('rr-stop'),take=n('rr-take'),dir=$('rr-dir')?.value;const rr=$('calc-rr-result');if(rr){const risk=dir==='buy'?entry-stop:stop-entry,reward=dir==='buy'?take-entry:entry-take;rr.textContent=[entry,stop,take].every(Number.isFinite)&&risk>0&&reward>0?`نسبة العائد إلى المخاطرة: 1:${(reward/risk).toFixed(2)}`:'تحقق من ترتيب الدخول والوقف والهدف وفق اتجاه الصفقة.'}}

const routeWidgets={agenda:'tv-economic-calendar',markets:'tv-forex-table'};
function loadRouteWidget(page){
 const name=routeWidgets[page];
 if(!name||customElements.get(name)||$('ict-widget-'+name))return;
 const script=document.createElement('script');
 script.id='ict-widget-'+name;
 script.type='module';
 script.async=true;
 script.src='https://widgets.tradingview-widget.com/w/en/'+name+'.js';
 script.onerror=()=>script.remove();
 document.head.append(script);
}

const routeSectionIds=new Set(['ict-economic-6a','ict-impact-6b','ict-compare-6c','ict-learning-5c']);
function scrollToRouteSection(id){
 if(!routeSectionIds.has(id))return;
 requestAnimationFrame(()=>{
  if(location.hash.split('/')[1]===id)document.getElementById(id)?.scrollIntoView({block:'start'});
 });
}

function render(preserveScroll=false){const scrollTop=preserveScroll===true?window.scrollY:0;const [p,target]=(location.hash.slice(1)||'home').split('/');if(p==='more'){location.replace('tools.html');return;}state.page=Object.hasOwn(navTitle,p)?p:'home';$('app').innerHTML=({home,markets,news,recs:recommendations,agenda:calendar,ict:ictTools,links:social,intelligence:economicIntelligence,academy:ictAcademy,calculators:tradingCalculators})[state.page]();document.querySelectorAll('[data-page]').forEach(a=>{const active=a.dataset.page===state.page||(a.dataset.page==='more'&&['news','ict','links','more'].includes(state.page));a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});document.title=`${navTitle[state.page]} | ICT بالعربي`;loadRouteWidget(state.page);if(state.page==='markets')hydrateMarketChart();if(state.page==='calculators')updateCalculators();document.dispatchEvent(new Event('ict-view-rendered'));if(state.page==='home'){initPulseFallback();initHeroSlider()}else if(heroSlideTimer){clearInterval(heroSlideTimer);heroSlideTimer=null}window.scrollTo({top:scrollTop,behavior:'instant'});if(target&&(!preserveScroll||scrollTop===0))scrollToRouteSection(target)}

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
document.addEventListener('click',e=>{const practiceBtn=e.target.closest('[data-practice-lesson]');if(practiceBtn){academyPracticeAnswer(practiceBtn.dataset.practiceLesson,Number(practiceBtn.dataset.practiceCaseIndex),Number(practiceBtn.dataset.practiceChoice));return}const priorityButton=e.target.closest('[data-economic-priority]');if(priorityButton){try{localStorage.setItem('ict-economic-news-priority-v1',priorityButton.dataset.economicPriority)}catch{}render();return}const track=e.target.closest('[data-academy-track]');if(track){academyTrack=track.dataset.academyTrack;render();return}const nextLesson=e.target.closest('[data-academy-next]');if(nextLesson){academyTrack='all';academySelected=nextLesson.dataset.academyNext;render();return}const revisit=e.target.closest('[data-academy-revisit]');if(revisit){const first=academyLessons.find(x=>academyDone().includes(x.id));academyTrack='all';academySelected=first?.id||academyLessons[0].id;render();return}const lesson=e.target.closest('[data-lesson]');if(lesson){academySelected=lesson.dataset.lesson;render();return}const quiz=e.target.closest('[data-quiz]');if(quiz){academyAnswer(quiz.dataset.lessonId,Number(quiz.dataset.quiz));return}const sessionButton=e.target.closest('[data-session-filter]');if(sessionButton){sessionCategory=sessionButton.dataset.sessionFilter;render();return}const tab=e.target.closest('[data-content-tab]');if(tab){state.contentTab=tab.dataset.contentTab;render();return}const heroDot=e.target.closest('[data-hero-index]');if(heroDot){showHeroSlide(Number(heroDot.dataset.heroIndex));return}const heroNav=e.target.closest('[data-hero-move]');if(heroNav){showHeroSlide(heroSlideIndex+Number(heroNav.dataset.heroMove));return}const heroPause=e.target.closest('[data-hero-pause]');if(heroPause){heroSlidePaused=!heroSlidePaused;heroPause.textContent=heroSlidePaused?'▶':'Ⅱ';heroPause.setAttribute('aria-label',heroSlidePaused?'تشغيل التبديل التلقائي':'إيقاف التبديل التلقائي');initHeroSlider();return}const weekButton=e.target.closest('[data-calendar-week]');if(weekButton){S.calendarWeek=weekButton.dataset.calendarWeek;S.calendarWeekManual=true;state.day='all';render();return}const chip=e.target.closest('[data-filter]');if(chip){state[chip.dataset.filter]=chip.dataset.value;render()}if(e.target.closest('#refresh-clock'))render();if(e.target.closest('#refresh-news'))fetchLiveNews();if(e.target.closest('#refresh-calendar')){render();Promise.all([fetchLiveCalendar(),fetchNextCalendar()]).then(()=>{render();futureAlerts()})}const heat=e.target.closest('[data-heat]');if(heat){document.querySelectorAll('[data-heat]').forEach(b=>b.classList.toggle('active',b===heat));const table=document.querySelector('#forex-heatmap tv-forex-table');if(table){if(heat.dataset.heat==='heatmap')table.setAttribute('heatmap','');else table.removeAttribute('heatmap')}}if(e.target.closest('#enable-alerts')){toggleAlerts()}if(e.target.closest('#reset-filters')){state.country='ALL';state.impact='all';state.day='all';state.search='';render()}});
document.addEventListener('change',e=>{if(e.target.closest('.calc-grid'))updateCalculators();const ids={'country-filter':'country','impact-filter':'impact','day-filter':'day'};if(ids[e.target.id]){state[ids[e.target.id]]=e.target.value;render()}if(e.target.id==='tz-selector'){localStorage.setItem('ict-timezone',e.target.value);render();updateHeaderDate()}if(e.target.id==='analysis-asset'){state.analysisAsset=e.target.value;render()}if(e.target.id==='analysis-status-filter'){state.analysisStatus=e.target.value;render()}if(e.target.id==='alert-news-opt')localStorage.setItem('ict-alert-news',e.target.checked?'yes':'no');if(e.target.id==='alert-sessions-opt')localStorage.setItem('ict-alert-sessions',e.target.checked?'yes':'no');if(e.target.id==='alert-posts-opt')localStorage.setItem('ict-alert-posts',e.target.checked?'yes':'no');if(e.target.id==='alert-lead'){localStorage.setItem('ict-alert-before',e.target.value);futureAlerts()}});
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
async function boot(){applyTheme();updateHeaderDate();render();const a=await Promise.all([load('news.json'),load('recs.json'),load('links.json'),load('agenda.json'),load('analyses.json')]);[S.newsArchive,S.recs,S.links,S.agenda,S.analyses]=[a[0]||[],a[1]||[],a[2]||[],a[3]||{days:[]},a[4]||[]];checkPublications();S.news=S.newsArchive;await Promise.all([fetchLiveCalendar(),fetchNextCalendar(),fetchLiveNews(false)]);render(true);refreshPulse();ticker();futureAlerts();sessionAlerts();fetchMovers();setInterval(updatePulseClocks,1000);setInterval(refreshPulse,60000);setInterval(fetchMovers,5*60*1000);setInterval(()=>{futureAlerts();sessionAlerts()},30000);setInterval(pollPublishedContent,120000);setInterval(async()=>{await Promise.all([fetchLiveCalendar(),fetchNextCalendar()]);if(state.page==='agenda')render();else refreshPulse();futureAlerts()},10*60*1000);setInterval(()=>{updateHeaderDate();if(state.page==='ict')render()},60000);setInterval(fetchLiveNews,10*60*1000);fetchOfficialEconomicResults();setInterval(fetchOfficialEconomicResults,30*60*1000);if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(console.warn)}boot();
