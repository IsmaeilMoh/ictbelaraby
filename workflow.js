/* ICT بالعربي 6.2 — Local-only Smart Trading Workflow */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const DRAFT_KEY='ict-trade-workflow-v62',WORKSPACE_KEY='ict-workspace-v1',DNA_KEY='ict-trader-dna-v53';
const requiredChecks=[
 'حددت السياق والانحياز على الإطار الأعلى',
 'راجعت مستويات السيولة وسحبها إن كان شرطًا',
 'تحققت من MSS / Displacement',
 'راجعت منطقة الدخول (FVG أو غيرها)',
 'الوقت مناسب للجلسة وخطة التداول',
 'تحققت من مواعيد الأخبار المهمة',
 'المخاطرة وحدود الحساب مقبولتان',
 'القرار بعيد عن FOMO والتداول الانتقامي'
];
const qs=new URLSearchParams(location.search);const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=(id)=>{const s=$(id).value.trim();return s===''?null:(Number.isFinite(Number(s))?Number(s):null)};
const positive=(v)=>v!==null&&Number.isFinite(v)&&v>0;
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const ident=r=>r.id!=null&&String(r.id)!==''?String(r.id):[r.pair||'',r.published_at||r.date||'',r.entry||'',r.sl||'',r.tp||'',r.dir||''].join('|');
const makeId=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():'wf-'+Date.now()+'-'+Math.random().toString(36).slice(2);
const cleanId=x=>String(x||'').slice(0,360);
const scenarioFields=['liquidity','structure','fvg','timing'];
const cleanScenario=()=>({liquidity:'unchecked',structure:'unchecked',fvg:'unchecked',timing:'unchecked',invalidates:''});
const draftBase=()=>({instanceId:makeId(),selected:'',asset:'',direction:'buy',entry:'',stop:'',target:'',balance:'',accountCurrency:'',riskPct:'',contractValue:'',lotStep:'',costPerLot:'',checks:requiredChecks.map(()=>false),scenario:cleanScenario(),notes:'',date:today(),session:'New York AM',strategy:'',result:'',adherence:'unreviewed',mistake:'none',executed:false,logged:false});
let records=[],draft=draftBase();
try{const saved=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');if(saved&&typeof saved==='object'&&!Array.isArray(saved)){const sample={...draft,...saved};if(Array.isArray(sample.checks)&&sample.checks.length===requiredChecks.length){draft=sample;draft.checks=sample.checks.map(x=>x===true);const sc=sample.scenario&&typeof sample.scenario==='object'&&!Array.isArray(sample.scenario)?sample.scenario:{};draft.scenario=cleanScenario();for(const k of scenarioFields){if(['unchecked','confirmed','missing','not_applicable'].includes(sc[k]))draft.scenario[k]=sc[k]};draft.scenario.invalidates=String(sc.invalidates||'').slice(0,260)} }}catch{}
function save(){try{localStorage.setItem(DRAFT_KEY,JSON.stringify(draft));return true}catch(e){message('تعذر حفظ مسودة الصفقة على هذا الجهاز. تأكد من السماح بالتخزين المحلي.',true);return false}}
function message(t,error=false){$('page-status').textContent=t;$('page-status').style.borderColor=error?'#a46355':'#46624f'}
function fmt(n,d=2){return Number.isFinite(n)?new Intl.NumberFormat('en-US',{maximumFractionDigits:d}).format(n):'—'}
function renderScenario(){
 const sc=draft.scenario&&typeof draft.scenario==='object'?draft.scenario:cleanScenario();
 const options=['unchecked','confirmed','missing','not_applicable'];
 for(const field of scenarioFields){const el=$('scenario-'+field);if(el)el.value=options.includes(sc[field])?sc[field]:'unchecked'}
 const note=$('scenario-invalidates');if(note)note.value=String(sc.invalidates||'').slice(0,260);
 updateScenarioSummary();
}
function updateScenarioSummary(){
 const el=$('scenario-summary');if(!el)return;
 const sc=draft.scenario||cleanScenario();
 const values=scenarioFields.map(k=>sc[k]);
 const ok=values.filter(v=>v==='confirmed').length;
 const missing=values.filter(v=>v==='missing').length;
 const na=values.filter(v=>v==='not_applicable').length;
 const unchecked=values.filter(v=>v==='unchecked').length;
 let headline='المراجعة التفصيلية غير مكتملة';
 if(missing)headline='هناك شروط غير متحققة حسب مراجعتك';
 else if(unchecked===0&&ok>0&&String(sc.invalidates||'').trim())headline='اكتملت خانات المراجعة اليدوية';
 else if(unchecked===0&&!String(sc.invalidates||'').trim())headline='حدّد سبب إبطال السيناريو قبل اعتباره مكتمل المراجعة';
 el.textContent=`${headline} | مؤكدة: ${ok} · غير متحققة: ${missing} · غير منطبقة: ${na} · لم تُراجع: ${unchecked}. هذه قراءة لمدخلاتك فقط، وليست إشارة تداول أو موافقة على الدخول.`;
 el.dataset.status=missing?'warning':(unchecked===0&&String(sc.invalidates||'').trim()?'reviewed':'incomplete');
}
function readScenario(){
 if(!draft.scenario||typeof draft.scenario!=='object')draft.scenario=cleanScenario();
 for(const field of scenarioFields){const el=$('scenario-'+field);if(el)draft.scenario[field]=el.value}
 const note=$('scenario-invalidates');if(note)draft.scenario.invalidates=note.value.slice(0,260);
 save();updateScenarioSummary();
}
function readFields(){for(const [field,id] of [['asset','asset'],['direction','direction'],['entry','entry'],['stop','stop'],['target','target'],['balance','balance'],['accountCurrency','account-currency'],['riskPct','risk-pct'],['contractValue','contract-value'],['lotStep','lot-step'],['costPerLot','cost-per-lot'],['notes','notes'],['date','trade-date'],['session','session'],['strategy','strategy'],['result','actual-r']])draft[field]=$(id).value;draft.adherence=$('workflow-adherence').value;draft.mistake=$('workflow-mistake').value;draft.executed=$('executed').checked;save()}
function fill(){const link=$('journal-link');if(link)link.hidden=!draft.logged;for(const [field,id] of [['asset','asset'],['direction','direction'],['entry','entry'],['stop','stop'],['target','target'],['balance','balance'],['accountCurrency','account-currency'],['riskPct','risk-pct'],['contractValue','contract-value'],['lotStep','lot-step'],['costPerLot','cost-per-lot'],['notes','notes'],['date','trade-date'],['session','session'],['strategy','strategy'],['result','actual-r']])$(id).value=String(draft[field]??'');$('workflow-adherence').value=['unreviewed','yes','partial','no'].includes(draft.adherence)?draft.adherence:'unreviewed';$('workflow-mistake').value=['none','early-entry','moved-stop','over-risk','news','early-exit','revenge','other'].includes(draft.mistake)?draft.mistake:'none';$('executed').checked=draft.executed===true;$('rec-select').value=draft.selected;$('save-journal').disabled=!!draft.logged;renderChecks();renderScenario();renderMetrics()}
function applyRecord(record){draft.selected=record?ident(record):'';if(record){draft.asset=String(record.pair||record.symbol||'').slice(0,24);draft.direction=record.dir==='sell'?'sell':'buy';draft.entry=record.entry==null?'':String(record.entry);draft.stop=record.sl==null?'':String(record.sl);draft.target=record.tp==null?'':String(record.tp)}$('published-status').value=record?({pending:'بانتظار التفعيل',open:'مفعّلة',tp:'تحقق الهدف',sl:'وقف الخسارة',cancelled:'ملغاة',cl:'مغلقة يدويًا'}[record.status]||String(record.status||'غير محددة')):'صفقة مستقلة';draft.instanceId=makeId();draft.logged=false;draft.executed=false;draft.result='';draft.adherence='unreviewed';draft.mistake='none';draft.scenario=cleanScenario();save();fill();$('journal-status').textContent=''}
function renderChecks(){const root=$('checklist');root.replaceChildren();requiredChecks.forEach((t,i)=>{const label=document.createElement('label'),cb=document.createElement('input');cb.type='checkbox';cb.checked=draft.checks[i]===true;cb.addEventListener('change',()=>{draft.checks[i]=cb.checked;save();updateProgress()});label.append(cb,document.createTextNode(t));root.append(label)});updateProgress()}
function updateProgress(){const n=draft.checks.filter(Boolean).length;$('check-score').textContent=`${n} / ${requiredChecks.length} شروط`;$('check-fill').style.width=`${n/requiredChecks.length*100}%`}
function renderMetrics(){
 const e=num('entry'),s=num('stop'),t=num('target'),balance=num('balance'),pct=num('risk-pct'),cv=num('contract-value'),buy=$('direction').value==='buy';
 const step=num('lot-step'),cost=num('cost-per-lot');
 const valid=positive(e)&&positive(s)&&positive(t)&&(buy?s<e&&t>e:s>e&&t<e);
 const distance=valid?Math.abs(e-s):null, reward=valid?Math.abs(t-e):null;
 const rr=valid?reward/distance:null;
 $('rr').textContent=valid?`الصفقة ${buy?'شراء':'بيع'} | المخاطرة السعرية: ${fmt(distance,6)} | الهدف السعري: ${fmt(reward,6)} | نسبة العائد إلى المخاطرة 1:${fmt(rr,3)}`:'تحقق من الدخول والوقف والهدف واتجاه الصفقة؛ يجب أن يكون الوقف والهدف على الجهتين الصحيحتين.';
 const money=positive(balance)&&positive(pct)&&pct<=100?balance*pct/100:null;
 const extraInvalid=(step!==null&&!positive(step))||(cost!==null&&(!Number.isFinite(cost)||cost<0));
 const unitRisk=valid&&positive(cv)&&!extraInvalid?distance*cv+(cost??0):null;
 const theoretical=money!==null&&unitRisk!==null&&positive(unitRisk)?money/unitRisk:null;
 let lots=null,rounded=false;
 if(theoretical!==null){
  if(step!==null){
   // Round down to the broker's volume step, never up. Do not guess minimum volume.
   const units=Math.floor(theoretical/step+1e-10);
   lots=units>0?Number((units*step).toPrecision(12)):0;
   rounded=true;
  }else lots=theoretical;
 }
 const stopLoss=lots!==null?lots*unitRisk:null;
 const targetProfit=lots!==null?lots*(reward*cv-(cost??0)):null;
 const cards=[['المخاطرة المخططة',money===null?'—':fmt(money)+' (عملة الحساب)'],['المسافة إلى الوقف',distance===null?'—':fmt(distance,6)],['الحجم النظري قبل التقريب',theoretical===null?'—':fmt(theoretical,6)+' لوت'],['الحجم بعد خطوة الوسيط',lots===null?'—':rounded?(lots>0?fmt(lots,8)+' لوت':'أقل من خطوة اللوت المدخلة'):'لم تُدخل خطوة اللوت'],['خسارة الوقف المحسوبة',stopLoss===null?'—':fmt(stopLoss)+' (عملة الحساب)'],['الربح عند الهدف (بعد التكلفة المدخلة)',targetProfit===null?'—':fmt(targetProfit)+' (عملة الحساب)']];
 $('risk-results').innerHTML=cards.map(([k,v])=>`<div><small>${esc(k)}</small><b dir="ltr">${esc(v)}</b></div>`).join('');
 const notes=[];
 if(extraInvalid)notes.push('خطوة اللوت يجب أن تكون أكبر من صفر والتكلفة لا تقل عن صفر.');
 if(step===null)notes.push('حجم اللوت نظري فقط؛ أدخل خطوة اللوت من وسيطك للحصول على حجم مقرب للأسفل.');
 if(cost===null)notes.push('لم تُدخل تكلفة لكل لوت؛ النتائج لا تشمل العمولة والسبريد.');
 if(rounded&&lots===0)notes.push('المخاطرة المتاحة لا تكفي لخطوة اللوت المختارة؛ لا ترفع الحجم تلقائيًا.');
 if(valid&&positive(cv)&&cost!==null&&reward*cv<cost)notes.push('تكلفة الصفقة المدخلة تتجاوز عائد الهدف لكل لوت.');
 notes.push('لا يشمل الحساب الانزلاق ولا تحويل العملات بين الربح وعملة الحساب؛ تحقق من مواصفات وسيطك.');
 $('risk-caveat').textContent=notes.join(' ');
 renderGuardianBridge({balance,stopLoss,money,step,lots,cost});
}
function renderGuardianBridge({balance,stopLoss,money,step,lots,cost}){
 const el=$('guardian-bridge');if(!el)return;
 const currency=$('account-currency').value;
 let stored;try{stored=JSON.parse(localStorage.getItem(WORKSPACE_KEY)||'null')}catch{}
 const g=stored&&typeof stored==='object'&&stored.guardian;
 if(!g||!g.updated){el.textContent='حارس الحساب الممول: لم تحفظ إعداداته بعد. يمكنك متابعة استخدام الحاسبة دون الحارس.';return}
 const updated=Date.parse(g.updated);
 if(!Number.isFinite(updated)||Math.abs(Date.now()-updated)>24*3600*1000){el.textContent='حارس الحساب الممول: البيانات المحفوظة أقدم من 24 ساعة أو تاريخها غير صالح. حدّث Equity ومرجع اليوم ومخاطر الصفقات المفتوحة في مساحتك قبل المقارنة.';return}
 if(!currency){el.textContent='لربط الحاسبة بالحارس اختر عملة الحساب أولًا؛ لا نفترض أنها USD.';return}
 if(currency!==g.currency){el.textContent='لا يمكن مقارنة المخاطرة بالحارس: العملة المختارة مختلفة عن عملة الحساب المحفوظة.';return}
 const savedBalance=Number(g.balance);
 if(!positive(balance)||!Number.isFinite(savedBalance)||Math.abs(balance-savedBalance)>Math.max(.01,Math.abs(savedBalance)*.0001)){
 el.textContent='لا يمكن اعتماد مقارنة الحارس: رصيد الحاسبة لا يطابق الرصيد المحفوظ في مساحتك. حدّث بيانات الحساب أو راجع الحاسبة.';return;
 }
 const math=window.ICTGuardianLimits.calculate(g);
 if(math.error){el.textContent='حارس الحساب الممول: '+math.error;return}
 if(stopLoss===null||step===null||lots===null||lots<=0||cost===null){el.textContent='لإجراء المقارنة أدخل مستويات الصفقة وقيمة العقد وخطوة اللوت والتكلفة المتوقعة، بحيث تتحدد خسارة الوقف المحسوبة.';return}
 const remaining=Math.max(0,math.allowed),delta=math.allowed-stopLoss;
 const status=math.allowed<=0?'تجاوزت مساحة المخاطرة المتاحة':delta<-.000001?'تحذير: خسارة الوقف المحسوبة تتجاوز المساحة المتاحة':'خسارة الوقف المحسوبة ضمن المساحة المدخلة نظريًا';
 el.textContent=`حارس الحساب الممول · ${status} | المساحة المتبقية قبل الصفقة: ${fmt(remaining)} ${currency} | خسارة الوقف المحسوبة: ${fmt(stopLoss)} ${currency} | الفارق بعد الصفقة: ${fmt(delta)} ${currency}. هذه مقارنة محلية لقواعدك المدخلة وليست موافقة من شركة التمويل؛ راجع تغيّر Equity والعمولات والانزلاق.`;
 el.style.borderColor=delta<0?'#b96657':'#537c69';
}

function saveChecklist(){readFields();readScenario();if(!draft.asset.trim()){message('أدخل رمز الأصل قبل حفظ المراجعة.',true);return}if(!draft.checks.some(Boolean)&&!confirm('لم تُؤكّد أي شرط بعد. هل تريد حفظ مراجعة غير مكتملة؟'))return;let workspace;try{workspace=JSON.parse(localStorage.getItem(WORKSPACE_KEY)||'null')}catch{}if(!workspace||typeof workspace!=='object'||Array.isArray(workspace)){message('لتسجيل المراجعة في مساحتي، افتح صفحة مساحتي مرة واحدة ثم أعد المحاولة. لن أستبدل إعداداتك الحالية.',true);return}if(!Array.isArray(workspace.history))workspace.history=[];workspace.history.unshift({when:new Date().toISOString(),asset:draft.asset.slice(0,24),direction:draft.direction.toUpperCase(),done:draft.checks.filter(Boolean).length,total:requiredChecks.length});workspace.history=workspace.history.slice(0,15);try{localStorage.setItem(WORKSPACE_KEY,JSON.stringify(workspace));message('تم حفظ ملخص المراجعة داخل مساحتي. شروط هذه الصفحة بقيت محفوظة في مسودتك.')}catch{message('تعذر حفظ المراجعة محليًا.',true)}}
function saveJournal(){readFields();if(draft.logged){$('journal-status').textContent='تم حفظ هذه المسودة مسبقًا. اضغط «بدء صفقة جديدة» لتسجيل تنفيذ آخر.';return}if(!$('executed').checked){$('journal-status').textContent='يجب تأكيد تنفيذ الصفقة فعلًا قبل تسجيل النتيجة.';return}
 const r=num('actual-r');if(r===null||Math.abs(r)>100){$('journal-status').textContent='أدخل نتيجة فعلية صالحة بوحدة R بين -100 و +100.';return}
 const asset=draft.asset.trim();if(!asset||asset.length>16){$('journal-status').textContent='أدخل رمز أصل صالحًا لا يتجاوز 16 حرفًا.';return}
 const date=draft.date;if(!/^\d{4}-\d\d-\d\d$/.test(date)||!Number.isFinite(new Date(date+'T12:00:00').getTime())){$('journal-status').textContent='تحقق من تاريخ التنفيذ.';return}
 if(!confirm(`تأكيد تسجيل نتيجة تنفيذك الفعلي: ${asset}، ${r} R في سجل Trader DNA؟`))return;
 let rows;try{rows=JSON.parse(localStorage.getItem(DNA_KEY)||'[]')}catch{rows=null}if(!Array.isArray(rows)){$('journal-status').textContent='تعذر قراءة سجل Trader DNA الحالي. لن أستبدله.';return}if(rows.length>=1000){$('journal-status').textContent='سجل Trader DNA وصل للحد الأقصى (1000 صفقة). صدّر نسخة احتياطية ثم نظّم السجل أولًا.';return}
 const id='wf-'+draft.instanceId;if(rows.some(x=>x&&x.id===id)){$('journal-status').textContent='الصفقة مسجلة مسبقًا. لن أضيف نسخة مكررة.';draft.logged=true;save();return}
 const row={id,origin:'workflow',recommendationRef:draft.selected?String(draft.selected).slice(0,360):'',date,asset:asset.slice(0,16),session:draft.session.slice(0,30),strategy:(draft.strategy.trim()||'Other').slice(0,80),r,adherence:['yes','partial','no'].includes(draft.adherence)?draft.adherence:'unreviewed',mistake:['early-entry','moved-stop','over-risk','news','early-exit','revenge','other'].includes(draft.mistake)?draft.mistake:'none',reviewed:draft.adherence!=='unreviewed'||draft.mistake!=='none',note:[draft.selected?'Workflow 6.2 • توصية: '+draft.selected:'Workflow 6.2 • صفقة مستقلة',draft.notes.trim()].filter(Boolean).join(' | ').slice(0,300)};
 try{localStorage.setItem(DNA_KEY,JSON.stringify([...rows,row]));draft.logged=true;save();$('save-journal').disabled=true;if($('journal-link'))$('journal-link').hidden=false;$('journal-status').textContent='تم حفظ الصفقة في Trader DNA على جهازك. يمكنك مراجعتها من غرفة المتداول.';message('نجحت رحلة الصفقة: النتيجة المحفوظة تم إدخالها وتأكيدها يدويًا.')}catch{$('journal-status').textContent='تعذر حفظ الصفقة. لم يتم تعديل السجل.'}}
function initEvents(){for(const field of scenarioFields){const control=$('scenario-'+field);if(control)control.addEventListener('change',readScenario)}const invalidates=$('scenario-invalidates');if(invalidates)invalidates.addEventListener('input',readScenario);for(const id of ['workflow-adherence','workflow-mistake'])$(id).addEventListener('change',readFields);const selectors=['asset','direction','entry','stop','target','balance','account-currency','risk-pct','contract-value','lot-step','cost-per-lot','notes','trade-date','session','strategy','actual-r','executed'];for(const id of selectors){$(id).addEventListener('input',()=>{readFields();if(['entry','stop','target','balance','account-currency','risk-pct','contract-value','lot-step','cost-per-lot','account-currency','direction'].includes(id))renderMetrics()})} $('rec-select').addEventListener('change',()=>{const r=records.find(x=>ident(x)===$('rec-select').value);applyRecord(r||null)});$('save-checklist').addEventListener('click',saveChecklist);$('save-journal').addEventListener('click',saveJournal);$('new-trade').addEventListener('click',()=>{if(!confirm('إنشاء صفقة جديدة؟ ستُستبدل المسودة الحالية فقط، ولن يُحذف أي شيء من سجل الأداء.'))return;draft=draftBase();$('published-status').value='صفقة مستقلة';save();fill();$('journal-status').textContent='صفقة جديدة جاهزة.';if($('journal-link'))$('journal-link').hidden=true})}
async function init(){initEvents();try{const r=await fetch('./recs.json',{cache:'no-store'});if(!r.ok)throw Error(r.status);const payload=await r.json();records=(Array.isArray(payload)?payload:[]).filter(x=>x&&typeof x==='object'&&!x.sample);const sel=$('rec-select');for(const rec of records){const opt=document.createElement('option');opt.value=ident(rec);opt.textContent=`${String(rec.pair||'أصل غير معروف')} • ${rec.dir==='sell'?'SELL':'BUY'} • ${String(rec.entry||'—')} / ${String(rec.sl||'—')} / ${String(rec.tp||'—')}`;sel.append(opt)}const ref=qs.get('ref'),asset=qs.get('asset');if(ref){const chosen=records.find(r=>ident(r)===ref);if(chosen){if(draft.selected===ref&&draft.asset){$('published-status').value=({pending:'بانتظار التفعيل',open:'مفعّلة',tp:'تحقق الهدف',sl:'وقف الخسارة',cancelled:'ملغاة',cl:'مغلقة يدويًا'}[chosen.status]||String(chosen.status||'غير محددة'));fill();message(draft.logged?'هذه الصفقة مسجلة بالفعل. ابدأ صفقة جديدة إذا كان لديك تنفيذ آخر.':'تم استعادة مسودتك المحفوظة للتوصية نفسها.')}else{applyRecord(chosen);message('تم تحميل بيانات التوصية المنشورة في الحاسبة وقائمة المراجعة.')}}else{fill();message('لم نجد التوصية المحددة في أحدث ملف. راجع القائمة أو أدخل المستويات يدويًا.',true)}}else if(asset&&/^[A-Za-z0-9]{3,18}$/.test(asset)){draft.asset=asset.toUpperCase();save();fill();message('تم اختيار الأصل؛ أدخل المستويات يدويًا أو اختر توصية منشورة.')}else{fill();message(records.length?`تم تحميل ${records.length} توصية منشورة. اختر واحدة أو حضّر صفقة مستقلة.`:'لا توجد توصيات منشورة حاليًا؛ يمكنك إعداد صفقة مستقلة.')}}catch(err){fill();message('تعذر تحميل ملف التوصيات حاليًا. يمكن استخدام المسودة يدويًا دون فقد البيانات.',true)} }
init();
})();