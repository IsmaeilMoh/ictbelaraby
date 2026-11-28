/* ICT بالعربي 6.9.18: asset catalog comparison without assumed live prices. */
(()=>{'use strict';if(document.body.dataset.asset!=='catalog')return;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const assets=window.ICT_ASSETS||[],catalog=window.ICTMarketCatalog;
const split=key=>key.includes(':')?key.split(':'):[null,key];
const valid=key=>typeof key==='string'&&/^(?:(?:crypto|forex|metals|indices|stocks|energy):)?[A-Z0-9][A-Z0-9._-]{0,34}$/.test(key);
const $=id=>document.getElementById(id);
const key='ict-asset-compare-6918';let selected=[];try{const saved=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(saved))selected=saved.filter(valid).slice(0,4)}catch{}
const save=()=>{try{localStorage.setItem(key,JSON.stringify(selected))}catch{}};
const fresh=(s,max=6)=>{const t=Date.parse(s||'');const h=(Date.now()-t)/3600000;return Number.isFinite(h)&&h>=-.083&&h<max};
const dt=s=>{const t=Date.parse(s||'');return Number.isFinite(t)?new Date(t).toLocaleString('ar-EG',{dateStyle:'short',timeStyle:'short'}):'غير معروف'};
const fmt=n=>Number.isFinite(n)?new Intl.NumberFormat('en-US',{maximumFractionDigits:5}).format(n):'—';
const list=v=>Array.isArray(v)?v:Array.isArray(v?.items)?v.items:[];
const fetchJSON=async s=>{try{const r=await fetch('./'+s,{cache:'no-store'});if(!r.ok)throw Error(r.status);return await r.json()}catch{return null}};
function setup(){const host=$('asset-app');if(!host||!$('asset-grid')||$('ac6918'))return;
 const wrap=document.createElement('section');wrap.id='ac6918';wrap.className='ac-lab';wrap.innerHTML=`<header><small>ASSET SELECTION • 6.9.18</small><h2>قارن الأصول قبل اختيار ما يستحق المراقبة</h2><p>اختر حتى 4 أصول لعرض توفر السعر الدوري، الأخبار المنشورة، والتوصيات المرتبطة بالأصل. لا توجد أسعار تنفيذ فورية.</p></header><div id="ac-choices" class="ac-choices"></div><div class="ac-toolbar"><label>أضف أصلًا للمقارنة<select id="ac-select"><option value="">اختر الأصل</option>${assets.map(x=>`<option value="${esc(x.symbol)}">${esc(x.symbol)} — ${esc(x.name)}</option>`).join('')}</select></label><button type="button" id="ac-add">إضافة</button><button type="button" id="ac-reset">مسح الاختيارات</button></div><div id="ac-result" aria-live="polite">اختر أصلًا لبدء المقارنة.</div></section>`;
 host.querySelector('.asset-hero')?.insertAdjacentElement('afterend',wrap);
 const buttons=()=>{$('ac-choices').innerHTML=selected.map(x=>`<button type="button" data-remove="${esc(x)}">${esc(split(x)[1])} ×</button>`).join('')};
 let revision=0;
 const render=async()=>{const current=++revision;buttons();const box=$('ac-result');if(!box||!selected.length){if(box)box.textContent='اختر أصلًا واحدًا أو أكثر للمقارنة.';return}box.textContent='جارٍ تحميل المصادر المنشورة…';const [quotes,news,recs,calendar]=await Promise.all(['market-movers.json','news-live.json','recs.json','calendar-live.json'].map(fetchJSON));if(!box.isConnected||current!==revision)return;
 const all=list(quotes),newsRows=list(news),recsRows=list(recs);const dates=Array.isArray(calendar?.events)?calendar.events:[];
 const quotFresh=fresh(quotes?.updatedAt),newsFresh=fresh(news?.updated_at,24),calFresh=fresh(calendar?.updatedAt,24);
 box.innerHTML=`<p class="ac-caption">الأسعار: ${quotFresh?'لقطة ضمن 6 ساعات':'قديمة أو غير متاحة'} (${dt(quotes?.updatedAt)}) · الأخبار: ${newsFresh?'تغذية ضمن 24 ساعة':'قديمة أو غير متاحة'} · الأجندة: ${calFresh?'ضمن 24 ساعة':'قديمة أو غير متاحة'}</p><div class="ac-results">${selected.map(key=>{const [market,s]=split(key),a=assets.find(x=>x.symbol===s),q=market==='crypto'?null:all.find(x=>x.symbol===s),related=recsRows.filter(x=>!x.sample&&(x.pair===s||x.asset===s)),terms=[s,...(a?.aliases||[])].map(x=>x.toLowerCase());const mention=newsRows.filter(x=>terms.some(t=>t.length>3&&((x.title||'')+' '+(x.sum||'')).toLowerCase().includes(t)));const next=dates.filter(x=>(a?.currencies||(market==='forex'?[s.slice(0,3),s.slice(3)]:[])).includes(String(x.country||x.currency||'').toUpperCase())).filter(x=>Date.parse(x.date||x.dt||x.datetime)>Date.now()).sort((x,y)=>Date.parse(x.date||0)-Date.parse(y.date||0))[0];const qt=fresh(q?.quotedAt||quotes?.updatedAt);const price=quotFresh&&qt&&Number(q?.price)>0?fmt(Number(q.price)):'—';return `<article class="ac-item"><h3><span dir="ltr">${esc(s)}</span><small>${esc(a?.name||catalog?.labels[market]||s)}</small></h3><dl><div><dt>سعر اللقطة</dt><dd dir="ltr">${price}</dd></div><div><dt>توصيات منشورة</dt><dd>${related.length}</dd></div><div><dt>عناوين تذكر الأصل</dt><dd>${newsFresh?mention.length:'غير موثوق بحداثتها'}</dd></div><div><dt>الحدث القادم للعملات المرتبطة</dt><dd>${calFresh&&next?esc((next.title||next.name||'حدث')+' — '+dt(next.date||next.dt)):'غير متاح'}</dd></div></dl>${a?`<a href="assets/${esc(s)}.html">افتح ملف الأصل ↗</a>`:''}${market&&catalog?` <a href="${esc(catalog.marketUrl(market,s))}">افحص الأصل ↗</a>`:''}</article>`}).join('')}</div><p class="ac-caption">الأعداد حجم التغطية المنشورة وليست تقييمًا لجودة التوصيات أو احتمالات الربح. لا تقارن تغيرات أسعار مصادر مختلفة كأنها موحدة. إذا تأخرت المصادر تُخفى الأسعار بدل تقديمها كحالية.</p>`};
 const select=$('ac-select');
 catalog?.populate(select,{placeholder:'اختر الأصل',legacy:assets.map(asset=>asset.symbol)});
 $('ac-add').addEventListener('click',()=>{
  const symbol=select.value,market=select.selectedOptions[0]?.dataset.market;
  const value=market?market+':'+symbol:symbol;
  if(valid(value)&&!selected.includes(value)&&!selected.includes(symbol)&&selected.length<4){selected.push(value);save();render()}
 });
 $('ac-reset').addEventListener('click',()=>{selected=[];save();render()});
 $('ac-choices').addEventListener('click',e=>{const b=e.target.closest('[data-remove]');if(b){selected=selected.filter(x=>x!==b.dataset.remove);save();render()}});render();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
