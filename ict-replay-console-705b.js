/* ICT Academy 5B — interactive historical candles replay, client-only. */
(()=>{'use strict';
const $=id=>document.getElementById(id),escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tz=new Intl.DateTimeFormat('ar-EG',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
let state=null,loading=false,loadSeq=0,currentKey='';
const groups={crypto:[['BTCUSDT','BTCUSDT'],['ETHUSDT','ETHUSDT'],['SOLUSDT','SOLUSDT'],['XRPUSDT','XRPUSDT']],forex:[['EURUSD','EURUSD'],['GBPUSD','GBPUSD'],['USDJPY','USDJPY'],['NZDUSD','NZDUSD']],metals:[['XAUUSD','XAUUSD'],['XAGUSD','XAGUSD']],indices:[['NAS100','NAS100'],['US500','US500'],['US30','US30']],stocks:[['TSLA','TSLA'],['AAPL','AAPL'],['NVDA','NVDA']],energy:[['USOIL','USOIL'],['UKOIL','UKOIL']]};
const frameOptions=[['1','1 دقيقة'],['5','5 دقائق'],['15','15 دقيقة'],['60','ساعة'],['240','4 ساعات']];
const msByFrame={'1':60000,'5':300000,'15':900000,'60':3600000,'240':14400000};
const publicFrames={'1':'1min','5':'5min','15':'15min','60':'1h','240':'4h'};
function selectOpts(items){return items.map(([v,t])=>`<option value="${escape(v)}">${escape(t)}</option>`).join('')}
function mount(){const app=$('app');if(!app||!app.querySelector('.academy-layout'))return;let root=$('ict-replay-5b');if(root)return;
 root=document.createElement('section');root.id='ict-replay-5b';root.className='ict-replay5b card';root.setAttribute('aria-label','محاكي الشموع التاريخية');
 root.innerHTML=`<div class="ict-replay5b-title"><span>ICT ACADEMY · 5B</span><h2>محاكي الشموع — قرر قبل رؤية المستقبل</h2><p>شموع تاريخية فعلية، تكشفها خطوة بخطوة. التداول هنا افتراضي للتدريب فقط.</p></div>
 <div class="ict-replay5b-controls"><label>السوق<select id="ict-rp-market">${selectOpts([['crypto','الكريبتو / USDT'],['forex','الفوركس'],['metals','المعادن'],['indices','المؤشرات'],['stocks','الأسهم'],['energy','الطاقة']])}</select></label><label>الأصل<select id="ict-rp-symbol"></select></label><label>الإطار<select id="ict-rp-frame">${selectOpts(frameOptions)}</select></label><button type="button" id="ict-rp-load">جلب جلسة تدريب</button></div>
 <p class="ict-replay5b-status" id="ict-rp-status" role="status">اختر الأصل ثم ابدأ جلسة التدريب.</p>
 <div class="ict-replay5b-chart" id="ict-rp-chart" aria-label="مخطط الشموع التاريخية"><p>سيظهر المخطط هنا بعد تحميل جلسة التدريب.</p></div>
 <div class="ict-replay5b-actions"><button type="button" id="ict-rp-buy" disabled>تسجيل شراء افتراضي</button><button type="button" id="ict-rp-sell" disabled>تسجيل بيع افتراضي</button><button type="button" id="ict-rp-wait" disabled>انتظار</button><button type="button" id="ict-rp-next" disabled>كشف الشمعة التالية ←</button></div>
 <div id="ict-rp-summary" class="ict-replay5b-summary">لا توجد جلسة نشطة.</div>
 <details class="ict-replay5b-details"><summary>قواعد التقييم والقيود</summary><p>يحدد الدخول عند افتتاح الشمعة التالية بعد قرارك. وقف الشراء أدنى قاع آخر 10 شموع ظاهرة، ووقف البيع أعلى قمة آخر 10 شموع، والهدف 2R. إذا لمس الهدف والوقف في شمعة واحدة تكون النتيجة غير حاسمة؛ ولا تُستخدم الشموع المخفية في اتخاذ القرار. لا يشمل التقييم السبريد والعمولات والانزلاق. الأسعار من مصدر السوق المذكور، وليست وعدًا بتطابق بيانات الوسيط.</p></details>`;
 const path=$('ict-academy-path-5a');if(path)path.insertAdjacentElement('afterend',root);else app.querySelector('.academy-layout').before(root);
 const market=$('ict-rp-market'),symbol=$('ict-rp-symbol');function refill(){symbol.innerHTML=selectOpts(groups[market.value]||[])}refill();market.addEventListener('change',refill);
 $('ict-rp-load').addEventListener('click',load);
 ['buy','sell','wait'].forEach(a=> $('ict-rp-'+a).addEventListener('click',()=>{try{state=ICTReplayCore.propose(state,a);render()}catch(e){status(e.message,true)}}));
 $('ict-rp-next').addEventListener('click',()=>{try{state=ICTReplayCore.step(state);render()}catch(e){status(e.message,true)}});
}
function status(s,bad=false){const el=$('ict-rp-status');if(el){el.textContent=s;el.dataset.error=bad?'true':'false'}}
async function load(){if(loading)return;const market=$('ict-rp-market').value,symbol=$('ict-rp-symbol').value,frame=$('ict-rp-frame').value;loading=true;const seq=++loadSeq;state=null;currentKey='';render();$('ict-rp-load').disabled=true;status('جاري تحميل شموع مكتملة من المصدر…');
 try{let bars,source;if(market==='crypto'){
 if(!window.ICTLiveFeed)throw Error('ملف اتصال Bybit غير محمّل');const raw=await ICTLiveFeed.fetchHistory({symbol,interval:frame,limit:180});bars=raw;source='Bybit V5 — USDT perpetual';
 }else{if(!window.ICTPublicMarkets)throw Error('ملف الأسواق التقليدية غير محمّل');const ins=ICTPublicMarkets.resolve(market,symbol);bars=await ICTPublicMarkets.get(ins,publicFrames[frame]);source=ins.source;}
 if(seq!==loadSeq)return;const complete=ICTReplayCore.normalize(bars);let segment=[],best=[];for(const b of complete){if(segment.length&&b.start-segment[segment.length-1].start!==msByFrame[frame]){if(segment.length>best.length)best=segment;segment=[]}segment.push(b)}if(segment.length>best.length)best=segment;
 if(best.length<50)throw Error('المصدر أرجع أقل من 50 شمعة متصلة مكتملة. جرّب إطارًا آخر أو أصلًا مختلفًا.');
 // Show the oldest ~70% of a bounded segment; future candles remain unavailable in chart until revealed.
 const slice=best.slice(-Math.min(140,best.length));state=ICTReplayCore.init(slice,Math.max(30,Math.min(70,Math.floor(slice.length*.65))));currentKey=market+'/'+symbol+'/'+frame;status(`تم التحميل: ${slice.length} شمعة متصلة · ${source} · الفحص بتوقيت نيويورك`);render();
 }catch(e){status('تعذر بدء المحاكاة: '+e.message,true);render()}finally{loading=false;if($('ict-rp-load'))$('ict-rp-load').disabled=false}}
function candleSvg(bars){const width=940,height=330,pad=44,space=17,visible=bars.slice(-48);if(!visible.length)return '';
 let low=Math.min(...visible.map(b=>b.low)),high=Math.max(...visible.map(b=>b.high));const spread=Math.max(1e-7,high-low);low-=spread*.09;high+=spread*.09;
 const chartHeight=height-35;const y=v=>25+(high-v)/(high-low)*(chartHeight-45),x=i=>pad+i*((width-pad*2)/Math.max(visible.length,1))+8;
 const lines=[0,.25,.5,.75,1].map(z=>{const yy=25+z*(chartHeight-45);const val=high-z*(high-low);return `<line x1="${pad}" y1="${yy}" x2="${width-pad}" y2="${yy}" stroke="currentColor" opacity=".12"/><text x="${width-6}" y="${yy+4}" text-anchor="end" fill="currentColor" opacity=".64" font-size="11">${val.toFixed(high<10?5:2)}</text>`}).join('');
 const candles=visible.map((b,i)=>{const xx=x(i),top=y(Math.max(b.open,b.close)),bottom=y(Math.min(b.open,b.close)),up=b.close>=b.open,color=up?'#46b79e':'#de7587';return `<line x1="${xx}" x2="${xx}" y1="${y(b.high)}" y2="${y(b.low)}" stroke="${color}" stroke-width="2"/><rect x="${xx-5}" y="${top}" width="10" height="${Math.max(1.5,bottom-top)}" rx="1" fill="${color}"/>`}).join('');
 return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${visible.length} شمعة معروضة فقط" preserveAspectRatio="xMidYMid meet"><g>${lines}${candles}</g></svg>`;
}
function render(){const chart=$('ict-rp-chart'),summary=$('ict-rp-summary');if(!chart)return;
 document.dispatchEvent(new CustomEvent('ict-replay-5b-state',{detail:state?{key:currentKey,shownAt:state.bars[state.shown].start,finished:state.finished,history:state.history.slice(-80)}:{key:'',shownAt:null,finished:false,history:[]}}));
 const has=!!state,ended=has&&state.finished;for(const a of ['buy','sell','wait'])$('ict-rp-'+a).disabled=!has||ended||!!state.action;$('ict-rp-next').disabled=!has||ended;
 if(!has){chart.innerHTML='<p>سيظهر المخطط هنا بعد تحميل جلسة التدريب.</p>';summary.textContent='لا توجد جلسة نشطة.';return}
 const current=state.bars[state.shown],revealed=state.bars.slice(0,state.shown+1),s=ICTReplayCore.stats(state.history);
 chart.innerHTML=candleSvg(revealed)+`<div class="ict-replay5b-chartfoot"><span>${escape(tz.format(new Date(current.start)))} · نيويورك</span><span>شمعة ${state.shown+1} من ${state.bars.length}</span></div>`;
 const a=state.action,remaining=state.bars.length-1-state.shown;
 summary.innerHTML=`<div class="ict-replay5b-metrics"><span>قرارات: <b>${s.decisions}</b></span><span>هدف 2R: <b>${s.win}</b></span><span>وقف: <b>${s.loss}</b></span><span>غير حاسم: <b>${s.ambiguous}</b></span><span>مجموع R الافتراضي: <b>${s.totalR.toFixed(1)}</b></span></div><p>${a?`صفقة تدريبية ${a.side==='buy'?'شراء':'بيع'} ${a.status==='pending'?'بانتظار افتتاح الشمعة التالية':`مفتوحة: دخول ${a.entry.toFixed(5)}، وقف ${a.stop.toFixed(5)}، هدف ${a.target.toFixed(5)}`}`:ended?'انتهت جلسة التدريب؛ حمّل جلسة أخرى.':`باقي ${remaining} شمعة مخفية — يمكنك تسجيل فرضية أو اختيار الانتظار ثم الكشف.`}</p><p class="ict-replay5b-event">${escape((state.history.slice(-1)[0]||{}).kind==='closed'?({'win':'تحقق الهدف الافتراضي','loss':'تحقق الوقف الافتراضي','ambiguous':'الهدف والوقف في الشمعة نفسها — غير حاسم'}[state.history.at(-1).outcome]||''):'')}</p>`;
}
document.addEventListener('ict-view-rendered',mount);window.addEventListener('hashchange',()=>requestAnimationFrame(mount));if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
