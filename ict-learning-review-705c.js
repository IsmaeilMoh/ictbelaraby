/* ICT بالعربي 7.0 / 5C — educational decision review, no trading orders or model profitability claim */
(()=>{'use strict';
const STORE='ict-academy-5c-reviews-v1',MAX=200;
const models=[['sweep-mss-fvg','Sweep → MSS → FVG'],['silver-bullet','Silver Bullet'],['2022-model','2022 Model'],['power-of-three','Power of Three (AMD)'],['ote','OTE'],['breaker','Breaker Block'],['none','لا يوجد نموذج / انتظار']];
const errors=[['none','لا خطأ محدد'],['early','دخول قبل تأكيد الشروط'],['liquidity','مستوى السيولة غير واضح'],['structure','الهيكل أو MSS غير مؤكد'],['time','خارج نافذة نيويورك المناسبة'],['risk','الإبطال/المخاطرة غير محددين'],['news','تجاهلت سياق خبر مهم'],['chase','مطاردة الحركة بعد انطلاقها']];
const exercises=[{id:'q1',title:'حالة تعليمية 1 — فجوة بلا سياق',story:'ظهرت FVG صعودية مؤكدة، لكن لم يُحدَّد مستوى سيولة أو تحول هيكلي قبلها. هل تُعد إشارة Sweep → MSS → FVG مكتملة؟',choices:['نعم، وجود FVG كافٍ','لا، يلزم إثبات السحب ثم MSS ثم FVG بالترتيب','نعم، إذا كان لون الشمعة أخضر'],right:1,why:'FVG منفردة لا تثبت النموذج المركب؛ يلزم ترتيب الأحداث وأدلتها.'},{id:'q2',title:'حالة تعليمية 2 — غموض الشمعة',story:'دخلت صفقة تدريبية افتراضية، ولمست الشمعة التالية وقف الخسارة والهدف معًا. بياناتك OHLC فقط. كيف تُسجَّل النتيجة؟',choices:['نجاح 2R','خسارة -1R','غير حاسمة حتى تتوفر بيانات أدق'],right:2,why:'لا يمكن تحديد أي المستوىين لُمِس أولًا من شمعة OHLC.'},{id:'q3',title:'حالة تعليمية 3 — انضباط رغم الخسارة',story:'تحققت شروط نموذج محدد مسبقًا، ونفذت وقفًا واضحًا دون تغيير الخطة. وصلت الصفقة إلى الوقف. ما الاستنتاج الأفضل؟',choices:['الخسارة وحدها تعني أن القرار خاطئ','قد يكون القرار منضبطًا رغم الخسارة؛ نراجع الأدلة على عينة كافية','يجب نقل الوقف دائمًا'],right:1,why:'جودة العملية تختلف عن نتيجة صفقة واحدة؛ لا نثبت الصلاحية أو الفشل بحالة منفردة.'}];
const $=id=>document.getElementById(id);const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function read(){try{const r=JSON.parse(localStorage.getItem(STORE)||'[]');return Array.isArray(r)?r.filter(x=>x&&typeof x.id==='string').slice(-MAX):[]}catch(_){return []}}
function write(arr){try{localStorage.setItem(STORE,JSON.stringify(arr.slice(-MAX)));return true}catch(_){return false}}
function getValue(id){return $(id)?.value||''}
function labelOptions(a){return a.map(([v,s])=>`<option value="${esc(v)}">${esc(s)}</option>`).join('')}
function fmt(t){if(!Number.isFinite(Number(t)))return 'غير متاح';const date=new Date(Number(t)),opts={year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false};return 'نيويورك: '+new Intl.DateTimeFormat('ar-EG',{...opts,timeZone:'America/New_York'}).format(date)+' | فلسطين: '+new Intl.DateTimeFormat('ar-EG',{...opts,timeZone:'Asia/Gaza'}).format(date)}
let replay={key:'',history:[],shownAt:null},chosen='',qSelected=0;
function decisions(){return replay.history.map((h,index)=>({...h,index})).filter(h=>h.kind==='decision'||h.kind==='wait')}
function outcome(dec){const after=replay.history.slice(dec.index+1);const close=after.find(h=>h.kind==='closed'||h.kind==='rejected'||h.kind==='unresolved');if(!close)return 'بانتظار كشف الشموع / لم يُحسم';if(close.kind==='closed')return ({win:'تحقق هدف 2R الافتراضي',loss:'وصل إلى الوقف الافتراضي',ambiguous:'غير حاسم: الهدف والوقف بنفس الشمعة'})[close.outcome]||'غير حاسم';if(close.kind==='rejected')return 'قرار مرفوض لأسباب مخاطرة';return 'انتهى التاريخ دون حسم'}
function keyOf(d){return `${replay.key}|${d.index}|${d.at}`}
function updateDecisions(){const el=$('ict-lr-decisions');if(!el)return;const d=decisions();const available=new Set(d.map(keyOf));if(!available.has(chosen))chosen=d.length?keyOf(d[d.length-1]):'';
 const prev=el.value;const options=d.map(x=>`<option value="${esc(keyOf(x))}">${esc(replay.key)} · ${esc(x.side==='buy'?'شراء':x.side==='sell'?'بيع':'انتظار')} · ${esc(fmt(x.at))}</option>`).join('');if(el.innerHTML!==options)el.innerHTML=options;el.value=available.has(prev)?prev:chosen;chosen=el.value;
 const current=d.find(x=>keyOf(x)===chosen);$('ict-lr-current').textContent=current?`القرار: ${current.side==='buy'?'شراء':current.side==='sell'?'بيع':'انتظار'} · ${fmt(current.at)} — ${outcome(current)}`:'ابدأ جلسة في محاكي 5B وسجّل قرارًا، ثم يمكنك توثيقه هنا.';
 $('ict-lr-save').disabled=!current;
}
function mount(){const replayRoot=$('ict-replay-5b');if(!replayRoot||!$('app')?.querySelector('.academy-layout')||$('ict-learning-5c'))return;
 const s=document.createElement('section');s.id='ict-learning-5c';s.className='ict-learning5c card';s.setAttribute('aria-label','دراسات الحالات وتقييم القرارات');
 s.innerHTML=`<div class="ict-learning5c-head"><span>ICT ACADEMY · 5C</span><h2>مراجعة قراراتك — من الحالة إلى الدرس</h2><p>وثّق لماذا اتخذت القرار قبل رؤية المستقبل، ثم راجع نتيجته دون الخلط بين الربح وجودة التنفيذ. الحالات المحفوظة على هذا الجهاز فقط.</p></div>
 <div class="ict-learning5c-metrics" id="ict-lr-metrics"></div>
 <div class="ict-learning5c-grid"><div class="ict-learning5c-panel"><h3>مراجعة قرار من المحاكي 5B</h3><label>القرار المسجل خلال الجلسة<select id="ict-lr-decisions"></select></label><p id="ict-lr-current" role="status">ابدأ المحاكاة وسجّل قرارًا أولًا.</p>
 <label>النموذج الذي كنت تراقبه<select id="ict-lr-model">${labelOptions(models)}</select></label>
 <fieldset><legend>الأدلة المتوفرة وقت اتخاذ القرار (تقييم ذاتي)</legend><label><input type="checkbox" id="ict-lr-liq"> مستوى سيولة معروف</label><label><input type="checkbox" id="ict-lr-mss"> تأكيد هيكل السوق</label><label><input type="checkbox" id="ict-lr-risk"> إبطال ومخاطرة محددان</label></fieldset>
 <label>أبرز خطأ أو نقطة تحسين<select id="ict-lr-error">${labelOptions(errors)}</select></label>
 <label>سبب القرار / ما الذي لاحظته قبل ظهور الشموع التالية<textarea id="ict-lr-note" maxlength="900" rows="3" placeholder="اذكر الدليل الذي كان ظاهرًا وقت القرار، ولا تعتمد على نتيجة ظهرت لاحقًا…"></textarea></label>
 <div class="ict-learning5c-actions"><button type="button" id="ict-lr-save" disabled>حفظ مراجعة القرار</button><button type="button" id="ict-lr-export">تصدير JSON</button></div><p class="ict-learning5c-feedback" id="ict-lr-feedback" role="status"></p></div>
 <div class="ict-learning5c-panel"><h3>دراسات قرار قصيرة</h3><p class="ict-learning5c-muted">هذه حالات <strong>افتراضية تعليمية</strong> لا تُنسب إلى سوق أو تاريخ حقيقي. الحالات التاريخية الموثقة موجودة في مختبر 4B.</p><div id="ict-lr-quiz"></div>
 <div class="ict-learning5c-links"><a href="./research.html#ict-cases-4b">افتح أرشيف الحالات التاريخية 4B</a><a href="./research.html#ict-playbooks-4a">راجع تعريفات نماذج ICT في 4A</a></div>
 <p id="ict-lr-archive" class="ict-learning5c-muted"></p></div></div>
 <h3>سجل المراجعات ونقاط التحسين</h3><div id="ict-lr-list"></div><button id="ict-lr-clear" type="button" class="ict-learning5c-secondary">حذف مراجعات 5C المحلية فقط</button>
 <p class="ict-learning5c-muted">الدرجة هنا تقييم ذاتي للأدلة الثلاثة، وليست درجة ثقة آلية أو احتمال نجاح. قد تكون النتيجة مربحة رغم خطأ القرار، أو خاسرة رغم الالتزام. لا يتم إرسال المراجعات إلى خادم أو تغيير حسابات التداول.</p>`;
 replayRoot.insertAdjacentElement('afterend',s);
 $('ict-lr-decisions').addEventListener('change',()=>{chosen=getValue('ict-lr-decisions');$('ict-lr-feedback').textContent='';updateDecisions()});
 $('ict-lr-save').addEventListener('click',save);
 $('ict-lr-export').addEventListener('click',exportJSON);
 $('ict-lr-clear').addEventListener('click',()=>{if(!confirm('حذف مراجعات المرحلة 5C المخزنة في هذا المتصفح فقط؟'))return;localStorage.removeItem(STORE);renderSummary()});
 renderQuiz();updateDecisions();renderSummary();
}
function save(){const d=decisions().find(x=>keyOf(x)===chosen);if(!d)return;
 const note=getValue('ict-lr-note').trim();if(note.length<15){$('ict-lr-feedback').textContent='اكتب سبب القرار في 15 حرفًا على الأقل قبل الحفظ.';return;}
 const checked={liquidity:$('ict-lr-liq').checked,structure:$('ict-lr-mss').checked,risk:$('ict-lr-risk').checked},score=Object.values(checked).filter(Boolean).length;
 const doc={id:keyOf(d),key:replay.key,index:d.index,decisionAt:d.at,side:d.side,model:getValue('ict-lr-model'),error:getValue('ict-lr-error'),checked,score,note,observedOutcome:outcome(d),savedAt:new Date().toISOString(),reviewType:'self-reported'};
 const arr=read(),idx=arr.findIndex(x=>x.id===doc.id);if(idx>=0)arr.splice(idx,1);arr.push(doc);
 const ok=write(arr);$('ict-lr-feedback').textContent=ok?'حُفظت المراجعة محليًا. الدرجة تقييم ذاتي وليست حكمًا آليًا على جودة نموذج ICT.':'تعذّر التخزين المحلي، يمكنك استخدام تصدير JSON بعد إتاحة التخزين.';renderSummary();}
function renderQuiz(){const e=exercises[qSelected],box=$('ict-lr-quiz');if(!box)return;
 box.innerHTML=`<div class="ict-learning5c-quiz-head"><span>حالة ${qSelected+1} من ${exercises.length}</span><button type="button" id="ict-lr-nextquiz">الحالة التالية ←</button></div><strong>${esc(e.title)}</strong><p>${esc(e.story)}</p><div class="ict-learning5c-choices">${e.choices.map((c,i)=>`<button type="button" data-choice="${i}">${esc(c)}</button>`).join('')}</div><p id="ict-lr-explanation" aria-live="polite"></p>`;
 box.querySelector('#ict-lr-nextquiz').addEventListener('click',()=>{qSelected=(qSelected+1)%exercises.length;renderQuiz()});
 box.querySelectorAll('[data-choice]').forEach(btn=>btn.addEventListener('click',()=>{const correct=Number(btn.dataset.choice)===e.right;box.querySelector('#ict-lr-explanation').textContent=(correct?'✓ إجابة سليمة. ':'الإجابة تحتاج مراجعة. ')+e.why;}));
}
function renderSummary(){if(!$('ict-lr-metrics'))return;const arr=read(),n=arr.length,avg=n?(arr.reduce((a,x)=>a+(Number(x.score)||0),0)/n).toFixed(1):'—';const errorsCount={};arr.forEach(x=>{if(x.error&&x.error!=='none')errorsCount[x.error]=(errorsCount[x.error]||0)+1});const worst=Object.entries(errorsCount).sort((a,b)=>b[1]-a[1])[0];
 $('ict-lr-metrics').innerHTML=`<span><b>${n}</b> مراجعة محفوظة</span><span><b>${avg}</b> / 3 متوسط الأدلة الموثّقة ذاتيًا</span><span><b>${worst?esc(errors.find(x=>x[0]===worst[0])?.[1]||worst[0]):'لا يوجد'}</b> أكثر نقطة تحتاج متابعة</span>`;
 $('ict-lr-list').innerHTML=arr.length?`<div class="ict-learning5c-records">${arr.slice(-12).reverse().map(x=>`<div><strong>${esc(x.key)} · ${esc(x.side==='buy'?'شراء':x.side==='sell'?'بيع':'انتظار')}</strong><small>${esc(fmt(x.decisionAt))} · ${esc(x.model)} · ${x.score}/3</small><p>${esc(x.note)}</p><small>الملاحظة عند الحفظ: ${esc(x.observedOutcome||'غير محدد')}</small></div>`).join('')}</div>`:'<p class="ict-learning5c-muted">لا توجد مراجعات محفوظة بعد. شغّل محاكي 5B واتخذ قرارًا ثم احفظ مراجعته هنا.</p>';
 try{const obj=JSON.parse(localStorage.getItem('ict-cases-reviewed-704b')||'{}');const values=Object.values(obj);$('ict-lr-archive').textContent=`أرشيف 4B على هذا الجهاز: ${values.length} مراجعة، منها ${values.filter(v=>v?.review==='confirmed').length} مراجعة موسومة يدويًا بأنها مستوفية لشروط نموذج. لا تدخل هذه الأعداد في درجة 5C.`}catch(_){$('ict-lr-archive').textContent='لا تتوفر مراجعات أرشيف 4B محليًا.'}
}
function exportJSON(){const doc={schema:'ICT-Academy-5C-v1',exportedAt:new Date().toISOString(),timezone:'America/New_York',note:'Self-reported educational reviews, not live trades or verified signals.',reviews:read()};const blob=new Blob([JSON.stringify(doc,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='ICT_Arabic_Academy_5C_Reviews.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
document.addEventListener('ict-replay-5b-state',event=>{const x=event.detail||{};replay={key:x.key||'',history:Array.isArray(x.history)?x.history:[],shownAt:x.shownAt??null};if($('ict-learning-5c'))updateDecisions()});
document.addEventListener('ict-view-rendered',mount);window.addEventListener('hashchange',()=>requestAnimationFrame(mount));if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
