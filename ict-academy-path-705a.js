/* ICT بالعربي 7.0 — phase 5A | progressive academy pathway, additive only */
(()=>{'use strict';
const STORE='ict-academy-path-705a-v1';
const units=[
{id:'foundations',level:'التأسيس',title:'قراءة البنية قبل البحث عن صفقة',duration:'25 دقيقة',lesson:'structure',goal:'تمييز Swing High/Low وMSS عن الضجيج السعري دون استخدام حركة مستقبلية.',tasks:['حدد قمة وقاعًا مؤكدين على 20 شمعة مكتملة.','سجل شرط كسر البنية الذي سيُبطل قراءتك.'],quiz:{q:'متى تعتبر القمة المؤكدة قابلة للاستخدام في تحليل لا يستبق المستقبل؟',choices:['عندما تتشكل القمة فورًا دون شموع تأكيد','بعد اكتمال شموع التأكيد المحددة في قاعدة النموذج','عندما يظهر هدف الربح لاحقًا'],correct:1,why:'التأكيد لا يجوز أن يستعين بشموع لم تكن متاحة عند لحظة القرار.'},tool:'./trust.html#ict-structure-2d',toolName:'مختبر هيكل السوق 2D'},
{id:'liquidity',level:'التأسيس',title:'السيولة ومستويات نيويورك',duration:'30 دقيقة',lesson:'liq',goal:'تمييز PDH/PDL وPWH/PWL واختلاف مستويات جلسة نيويورك عن UTC.',tasks:['قارن قمة اليوم السابق على إطار الساعة باستخدام بداية يوم نيويورك المناسبة.','اكتب احتمالين لما قد يحدث بعد سحب السيولة بدل افتراض انعكاس مضمون.'],quiz:{q:'إذا ظهر اختلاف بين PDH في موقعين، ماذا تتحقق منه أولًا؟',choices:['لون الشارت','مزود الأسعار وحدود يوم التداول والجلسة','مدة تشغيل المتصفح'],correct:1,why:'حدود اليوم والمصدر قد تغير القمم والقيعان حتى لو اختلف عرض الساعة فقط.'},tool:'./trust.html#ict-context-3a',toolName:'سياق السوق 3A'},
{id:'imbalance',level:'التأسيس',title:'FVG وPremium/Discount',duration:'30 دقيقة',lesson:'fvg',goal:'تمييز الفجوة ذات الثلاث شموع وموقعها داخل نطاق سعر محدد.',tasks:['حدد FVG من ثلاث شموع مكتملة وحدد نقطة الإبطال.','قارن موقع الفجوة بالنسبة إلى منتصف نطاق مرجعي واضح.'],quiz:{q:'هل وجود FVG وحدها كافٍ لإصدار إشارة تداول؟',choices:['نعم','لا، يلزم سياق وشروط نموذج ومخاطرة','نعم إذا كانت كبيرة فقط'],correct:1,why:'الفجوة حدث سعري، وليست استراتيجية دخول كاملة بذاتها.'},tool:'./research.html#ict-cases-4b',toolName:'دراسات حالات FVG 4B'},
{id:'timing',level:'بناء النموذج',title:'الجلسات وSilver Bullet بتوقيت نيويورك',duration:'35 دقيقة',lesson:'sb',goal:'تطبيق النوافذ الزمنية مع قواعد بنيوية، ومراعاة التوقيت الصيفي.',tasks:['حدد نافذة Silver Bullet صحيحة بالتوقيت المحلي لنيويورك.','راجع حالة ظهرت خارج النافذة وفسر سبب استبعادها.'],quiz:{q:'هل يكفي ظهور FVG أثناء Silver Bullet لقبول النموذج؟',choices:['نعم، الوقت وحده حاسم','لا، نافذة الوقت لا تستبدل شروط النموذج','نعم عند حركة سعر سريعة'],correct:1,why:'شروط الجلسة قيد إضافي وليست برهانًا على وجود نموذج كامل.'},tool:'./research.html#ict-models-4c3',toolName:'اختبار Silver Bullet 4C.3'},
{id:'composite',level:'بناء النموذج',title:'سحب سيولة ← MSS ← FVG',duration:'40 دقيقة',lesson:'structure',goal:'ترتيب الأحداث وتحديد توقيت اعتبار النموذج مكتملًا.',tasks:['استخرج حالة يظهر فيها Sweep قبل MSS ثم FVG.','دوّن منطقة العودة، والوقف، وحالات عدم التفعيل.'],quiz:{q:'متى يبدأ تقييم دخول نموذج Sweep → MSS → FVG؟',choices:['بمجرد رؤية Sweep','بعد اكتمال عناصر النموذج بترتيبها','بعد ظهور ربح تاريخي'],correct:1,why:'اختبار الدخول قبل اكتمال الشروط يغيّر الاستراتيجية ويخلق انحيازًا.'},tool:'./research.html#ict-composite-4c2',toolName:'اختبار النموذج المركب 4C.2'},
{id:'playbooks',level:'بناء النموذج',title:'OTE وAMD وBreaker: التعريف وحدود الثقة',duration:'40 دقيقة',lesson:'ote',goal:'التفرقة بين قواعد بحثية معلنة ونموذج لم تُستكمل خوارزميته.',tasks:['اختر نموذجًا واكتب شروط دخوله وإبطاله والتعامل مع الغموض.','اشرح لماذا نتائج مرشح Breaker لا تثبت صلاحية Breaker Block الكامل.'],quiz:{q:'كيف نفسر تقرير مرشح Breaker الحالي؟',choices:['إثبات صلاحية النموذج الكامل','اختبار تقريبي يحتاج تحققًا من أصل Order Block وتحوله','توصية مباشرة'],correct:1,why:'الكاشف التقريبي لا يتتبع أصل Order Block وفشلها، فلا يجوز تسميته نموذجًا مكتملًا.'},tool:'./research.html#ict-advanced-4c4',toolName:'مختبر OTE وAMD وBreaker 4C.4'},
{id:'research',level:'الاختبار والانضباط',title:'الاختبار التاريخي خارج العينة',duration:'45 دقيقة',lesson:'premium',goal:'قراءة النتائج بوحدة R والتمييز بين التدريب والاختبار اللاحق.',tasks:['قارن نتيجة فترة التطوير بفترة الاختبار اللاحقة.','سجل عدد الحالات غير الحاسمة والتكلفة الافتراضية وحدود حجم العينة.'],quiz:{q:'ما الذي يجعل تقرير نموذج صغير العينة غير كافٍ؟',choices:['يحتوي على فائزين','قلة البيانات وقدرة القواعد على التكيّف مع الماضي','يعرض توقيت نيويورك'],correct:1,why:'النتيجة التاريخية وحدها لا تثبت صلاحية خارج العينة أو قابلية التنفيذ.'},tool:'./research.html#ict-validation-4c',toolName:'مختبر صلاحية النتائج 4C'},
{id:'decision',level:'الاختبار والانضباط',title:'سيناريوهات قبل الصفقة ومراجعة المخاطرة',duration:'35 دقيقة',lesson:'kz',goal:'بناء فرضيتين مشروطتين وربطهما بحدود الحساب قبل التفكير في التنفيذ.',tasks:['أنشئ نشرة لأصل واحد ودوّن شروط تأكيد وإبطال السيناريوهين.','قارن مخاطرة فكرة التداول بحدود حساب تجريبي دون تنفيذ صفقة.'],quiz:{q:'ما السلوك الصحيح إذا كانت بيانات الشموع متأخرة أو شروط السيناريو غير مكتملة؟',choices:['إصدار توصية فورًا','تأجيل القرار أو الاكتفاء بالمراقبة','زيادة حجم الصفقة'],correct:1,why:'نقص المعلومات لا يتحول إلى درجة ثقة أو إشارة تنفيذ.'},tool:'./trust.html#ict-briefing-3c',toolName:'النشرة اليومية 3C'}
];
const safeRead=()=>{try{const x=JSON.parse(localStorage.getItem(STORE)||'{}');return x&&typeof x==='object'&&!Array.isArray(x)?x:{}}catch{return {}}};
const safeWrite=x=>{try{localStorage.setItem(STORE,JSON.stringify(x));return true}catch{return false}};
const h=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let current=units[0].id;
function mount(){
 if(location.hash.split('/')[0]!=='#academy')return;
 const app=document.getElementById('app');if(!app||!app.querySelector('.academy-layout'))return;
 if(app.querySelector('#ict-academy-path-5a'))return;
 const el=document.createElement('section');el.id='ict-academy-path-5a';el.className='ict-path5a card';el.setAttribute('aria-label','المسار التعليمي المتدرج');
 const progress=app.querySelector('.academy-progress');if(progress)progress.insertAdjacentElement('afterend',el);else app.querySelector('.academy-layout').before(el);
 render(el);
}
function render(el){
 if(!el)return;const saved=safeRead(),passed=units.filter(u=>saved[u.id]?.quiz&&saved[u.id]?.practice).length;
 const selected=units.find(u=>u.id===current)||units[0],pr=saved[selected.id]||{};
 const levels=[...new Set(units.map(u=>u.level))];
 el.innerHTML=`<div class="ict-path5a-head"><div><span class="ict-path5a-kicker">ICT ACADEMY · 5A</span><h2>مسارك التعليمي خطوة بخطوة</h2><p>تعلم المفهوم، طبقه في مختبر، ثم اختبر فهمك. الدروس الأصلية باقية أسفل هذا المسار.</p></div><div class="ict-path5a-progress" aria-live="polite"><strong>${passed} / ${units.length}</strong><span>وحدات مكتملة</span></div></div>
 <div class="ict-path5a-meter" role="progressbar" aria-valuemin="0" aria-valuemax="${units.length}" aria-valuenow="${passed}"><span style="width:${passed/units.length*100}%"></span></div>
 <div class="ict-path5a-columns"><nav class="ict-path5a-list" aria-label="وحدات المنهج">${levels.map(l=>`<div class="ict-path5a-group"><b>${h(l)}</b>${units.filter(u=>u.level===l).map((u)=>`<button type="button" data-path-unit="${u.id}" aria-current="${selected.id===u.id?'step':'false'}"><span>${saved[u.id]?.quiz&&saved[u.id]?.practice?'✓':'○'} ${h(u.title)}</span><small>${h(u.duration)}</small></button>`).join('')}</div>`).join('')}</nav>
 <article class="ict-path5a-detail"><div class="ict-path5a-tags"><span>${h(selected.level)}</span><span>${h(selected.duration)}</span></div><h3>${h(selected.title)}</h3><p><strong>هدف الوحدة:</strong> ${h(selected.goal)}</p><div class="ict-path5a-tasks"><h4>مهمتان عمليتان</h4><ol>${selected.tasks.map(t=>`<li>${h(t)}</li>`).join('')}</ol><a href="${h(selected.tool)}" class="ict-path5a-link">افتح ${h(selected.toolName)} ←</a><a href="./?lesson=${h(selected.lesson)}#academy" class="ict-path5a-link">راجع الدرس المرتبط في الأكاديمية ←</a></div>
 <div class="ict-path5a-quiz"><h4>اختبار الفهم</h4><p>${h(selected.quiz.q)}</p><div class="ict-path5a-options">${selected.quiz.choices.map((c,i)=>`<button type="button" data-path-answer="${i}" ${pr.quiz?'disabled':''}>${h(c)}</button>`).join('')}</div><p class="ict-path5a-feedback" aria-live="polite">${pr.quiz?'✓ اجتزت اختبار الفهم. '+h(selected.quiz.why):'اختر إجابة لعرض تفسيرها.'}</p></div>
 <label class="ict-path5a-practice"><input type="checkbox" data-path-practice ${pr.practice?'checked':''}> أنجزت التطبيق العملي ودوّنت ملاحظاتي بنفسي</label><p class="ict-path5a-status" aria-live="polite">${pr.quiz&&pr.practice?'✓ اكتملت الوحدة — يمكنك الانتقال للتي تليها.':'إكمال الوحدة يتطلب اجتياز الاختبار والتأكيد على إنجاز التطبيق.'}</p></article></div>
 <p class="ict-path5a-note">التقدم محفوظ على جهازك فقط. لا توجد صفقات فعلية أو توصيات في هذه المسارات؛ نتائج المختبرات بحثية وتحتاج تحققًا مستقلًا.</p>`;
}
document.addEventListener('click',e=>{
 const el=document.getElementById('ict-academy-path-5a');if(!el||!el.contains(e.target))return;
 const b=e.target.closest('[data-path-unit],[data-path-answer]');if(!b)return;
 if(b.hasAttribute('data-path-unit')){current=b.dataset.pathUnit;render(el);return}
 const u=units.find(x=>x.id===current),answer=Number(b.dataset.pathAnswer);if(!u)return;
 const ok=answer===u.quiz.correct;const status=el.querySelector('.ict-path5a-feedback');if(status){status.textContent=(ok?'✓ إجابة صحيحة. ':'الإجابة غير صحيحة. ')+u.quiz.why;status.classList.toggle('is-ok',ok)}
 if(ok){const saved=safeRead();saved[u.id]={...(saved[u.id]||{}),quiz:true};safeWrite(saved);render(el)}
});
document.addEventListener('change',e=>{
 if(!e.target.matches('#ict-academy-path-5a [data-path-practice]'))return;
 const saved=safeRead();saved[current]={...(saved[current]||{}),practice:e.target.checked};safeWrite(saved);render(document.getElementById('ict-academy-path-5a'));
});
document.addEventListener('ict-view-rendered',mount);
window.addEventListener('hashchange',()=>requestAnimationFrame(mount));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
