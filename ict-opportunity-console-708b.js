/* ICT بالعربي 8B — local record and lifecycle UI; user explicitly saves a candidate. */
(function(){'use strict';const root=document.getElementById('ict-decision-8a'),area=document.getElementById('dc-lifecycle');if(!root||!area)return;
const engine=window.ICTOpportunityLifecycle708B,storeKey='ict-8b-opportunities-v1',cap=80;const $=id=>document.getElementById(id),status=$('dc-tracker-status'),candidates=$('dc-tracker-candidates'),records=$('dc-tracker-records'),statsEl=$('dc-tracker-stats'),exportBtn=$('dc-tracker-export'),clearBtn=$('dc-tracker-clear');
function elem(tag,text,parent,cls){const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;parent.append(e);return e}
function local(t){if(!Number.isFinite(t))return '—';const f=zone=>new Intl.DateTimeFormat('ar-EG',{timeZone:zone,month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(t));return 'نيويورك '+f('America/New_York')+' · فلسطين '+f('Asia/Gaza')}
function number(x){return Number.isFinite(x)?Number(x).toLocaleString('en-US',{maximumFractionDigits:6}):'—'}
function stored(){try{const arr=JSON.parse(localStorage.getItem(storeKey)||'[]');return Array.isArray(arr)?arr:[]}catch{return []}}
const traditional=window.ICTPublicMarkets;
const supported=row=>row?.market==='crypto'?/^[A-Z0-9]{1,31}USDT$/.test(row.symbol):
 row?.source===traditional.SOURCE&&Object.hasOwn(traditional.MARKETS,row.market)&&traditional.validSymbol(row.symbol);
function load(){return stored().filter(row=>supported(row)&&engine.valid(row)).slice(0,cap)}
function save(rows){try{localStorage.setItem(storeKey,JSON.stringify([...rows.slice(0,cap),...stored().filter(row=>!supported(row))]));return true}catch(e){status.textContent='تعذر حفظ السجل محليًا: '+e.message;return false}}
function announce(v){status.textContent=v}
const label={waiting:'بانتظار الدخول',active:'لامس الدخول — قيد المتابعة',won:'وصل الهدف الافتراضي',lost:'وصل الوقف الافتراضي',invalidated:'أُلغي قبل الدخول',ambiguous:'غير حاسم',expired:'انتهت المدة',blocked:'معلق وقت الرصد',gap:'توقف — فجوة بيانات'};
function refresh(){const rows=load(),s=engine.stats(rows);statsEl.textContent='المحفوظة: '+s.total+' · انتظار: '+s.waiting+' · متابعة: '+s.active+' · معلّقة: '+s.blocked+' · محسومة حسابيًا: '+s.settled+' · غير حاسمة/ناقصة: '+(s.ambiguous+s.gap)+' · النتيجة النظرية للمحسوم: '+number(s.totalR)+'R';records.replaceChildren();if(!rows.length){elem('p','لا توجد فرص محفوظة. افحص السوق ثم اختر حفظ فرصة من القائمة أعلاه.',records);return}
 for(const r of rows.slice(0,40)){const box=elem('article',null,records,'dc-track-item'),head=elem('div',null,box,'dc-track-head');elem('strong',r.symbol+' · '+r.side+' · '+(label[r.state]||r.state),head);elem('small',r.frame+' دقائق · سجلت '+local(r.observedAt),box);if(r.liveQuote){elem('p','تنبيه دخول لحظي · '+(r.source||r.market)+' · السعر المرصود '+number(r.liveQuote.price)+' | Bid '+number(r.liveQuote.bid)+' | Ask '+number(r.liveQuote.ask)+' · '+new Date(r.liveQuote.at).toISOString(),box)}elem('p','دخول '+number(r.entry)+' | وقف '+number(r.stop)+' | هدف '+number(r.target),box);elem('p','شموع فُحصت بعد التسجيل: '+r.barsExamined+(r.outcomeR==null?'':' | نتيجة '+number(r.outcomeR)+'R'),box);if(r.originBlocks.length)elem('p','أسباب التعليق عند التسجيل: '+r.originBlocks.join('، '),box,'dc-track-warning');if(r.events?.length){const d=elem('details',null,box);elem('summary','سجل الانتقالات ('+r.events.length+')',d);const ul=elem('ul',null,d);r.events.slice(-12).forEach(e=>elem('li',local(e.at)+' — '+e.note,ul))}
 const controls=elem('div',null,box,'dc-track-actions');const remove=elem('button','حذف هذا السجل',controls);remove.type='button';remove.className='secondary';remove.addEventListener('click',()=>{if(!confirm('حذف سجل الفرصة المختارة؟ لن تُمس صفقات Trader DNA.'))return;save(load().filter(x=>x.key!==r.key));refresh()});}
}
function drawCandidates(res){candidates.replaceChildren();if(!res.opportunities?.length){elem('p','لا توجد فرص حديثة في الفحص الأخير لحفظها. يمكن متابعة الفرص المسجلة سابقًا عند تكرار الفحص لنفس الأصل.',candidates);return}elem('p','اختر فرصة لحفظ صورتها وقت الرصد. الفرص المعلقة تُحفظ للتوثيق فقط ولا تُقيَّم كصفقات.',candidates);res.opportunities.slice(0,8).forEach(o=>{const row=elem('div',null,candidates,'dc-track-pick');elem('span',res.symbol+' · '+o.side+' · '+local(o.formedAt)+' · '+(o.blocks.length?'معلّقة':'مشروطة'),row);const b=elem('button','حفظ الفرصة للمراقبة',row);b.type='button';b.addEventListener('click',()=>{try{const item=engine.create({...o,market:res.market,symbol:res.symbol,frame:String(res.frame)},Date.now(),{source:res.source,maxBars:24});const all=load();if(all.some(x=>x.key===item.key)){announce('الفرصة محفوظة بالفعل، ولن ننشئ لها نسخة مكررة.');return}if(save([item,...all])){announce('حُفظت الفرصة في المتصفح. سيتم تقييم الشموع اللاحقة فقط عند إعادة فحص الأصل والإطار نفسيهما.');refresh()}}catch(e){announce('تعذر حفظ الفرصة: '+e.message)}})})}
function onScan(e){if(!engine)return;const {result,bars,scanStartedAt}=e.detail||{};if(!result||!Array.isArray(bars))return;drawCandidates(result);const items=load();let changed=0,skipped=0;const updated=items.map(r=>{if(r.market!==result.market||r.symbol!==result.symbol||r.frame!==String(result.frame)||engine.closed(r))return r;try{const advanced=engine.advance(r,bars,result.checkedAt);if(JSON.stringify(advanced)!==JSON.stringify(r)){changed++;return advanced}}catch(_){skipped++}return r});if(changed)save(updated);refresh();if(changed)announce('تم تحديث '+changed+' سجل/سجلات باستخدام شموع مكتملة بعد تسجيل الفرصة.');else if(items.length)announce('اكتمل الفحص؛ لا توجد شموع جديدة كافية لتغيير الحالات المحفوظة.');else announce('اختر حفظ فرصة عند توفر نموذج جديد؛ لا تُسجّل توصيات تلقائيًا.');}
root.addEventListener('ict:live-entry',event=>{
 if(!engine)return;
 try{
  const {plan,observedAt,quote,source}=event.detail;
  const record=engine.createLiveEntry(plan,observedAt,quote,source);
  const rows=load();
  if(rows.some(row=>row.key===record.key))return;
  if(save([record,...rows])){
   refresh();
   announce('حُفظ تنبيه الدخول محليًا. تابع نتيجته البحثية بعد إعادة فحص الأداة والإطار نفسيهما.');
  }
 }catch(e){announce('تعذّر حفظ التنبيه: '+e.message)}
});
root.addEventListener('ict:decision-scanned',onScan);
root.addEventListener('ict:decision-cleared',()=>candidates.replaceChildren());
exportBtn.addEventListener('click',()=>{const rows=load(),json=JSON.stringify({schema:'ict-8b-lifecycle-v1',exportedAt:new Date().toISOString(),note:'نتائج بحثية معتمدة على OHLC وليست عمليات تداول منفذة',records:rows},null,2);const url=URL.createObjectURL(new Blob([json],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='ICT_8B_Opportunity_Journal_'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
clearBtn.addEventListener('click',()=>{if(!confirm('مسح سجل فرص 8B المحلي فقط؟ لن تُحذف الصفقات أو الحسابات.'))return;if(save([])){refresh();announce('تم مسح فرص Bybit المحفوظة.')}});
refresh();announce('سجل المتابعة محلي. افحص السوق ثم احفظ فرصة للمراقبة، وأعد الفحص بعد اكتمال شموع جديدة.');
})();
