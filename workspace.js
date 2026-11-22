'use strict';
/* ICT بالعربي 5.0 — local, account-free personal trading workspace */
(()=>{
 const STORAGE='ict-workspace-v1';
 const $=id=>document.getElementById(id);
 const defaults={nickname:'',favorite:'XAUUSD',order:['guardian','checklist','sessions','calendar','trades','academy','calculators','markets'],hidden:[],guardian:{accountName:'',currency:'USD',initial:'',balance:'',equity:'',dayStart:'',dailyPct:'',totalPct:'',drawdownMode:'static',highWater:'',plannedRisk:'',reservedRisk:'',safetyBuffer:'',updated:null},checks:[
 {id:'context',name:'حددت الانحياز العام والسياق على الإطار الأعلى',done:false},
 {id:'liquidity',name:'حددت السيولة المستهدفة أو التي جرى سحبها',done:false},
 {id:'structure',name:'لدي تأكيد واضح على الهيكل السعري (MSS / Displacement)',done:false},
 {id:'entry',name:'منطقة الدخول والوقف والهدف واضحة (مثل FVG)',done:false},
 {id:'session',name:'الوقت مناسب وفق استراتيجيتي ونافذة الجلسة',done:false},
 {id:'news',name:'راجعت الأجندة ولا يوجد خبر مؤثر أتجاهله',done:false},
 {id:'risk',name:'حجم المخاطرة والحد اليومي للحساب مقبولان',done:false},
 {id:'discipline',name:'القرار ليس انتقاميًا أو نتيجة FOMO',done:false}
 ],checkAsset:'XAUUSD',checkDirection:'BUY',checkRisk:'1',checkNotes:'',history:[]};
 const moduleCatalog={guardian:{icon:'◈',title:'حارس الحساب الممول',desc:'اعرف حدود السحب اليومية والإجمالية قبل فتح صفقة جديدة.',action:'فتح الحارس',tab:'guardian'},checklist:{icon:'✓',title:'مراجعة ما قبل الصفقة',desc:'راجع شروط ICT وإدارة المخاطرة في قائمة واحدة.',action:'ابدأ المراجعة',tab:'checklist'},sessions:{icon:'◷',title:'جلسات ICT',desc:'توقيت Kill Zones وSilver Bullet والعد التنازلي.',action:'عرض الجلسات',link:'./#ict'},calendar:{icon:'▦',title:'الأجندة الاقتصادية',desc:'تحقق من الأخبار القادمة قبل أي دخول.',action:'فتح الأجندة',link:'./#agenda'},trades:{icon:'↗',title:'التوصيات والتحليلات',desc:'راقب الأفكار المنشورة وحالات الصفقات.',action:'عرض التوصيات',link:'./#recs'},academy:{icon:'▣',title:'أكاديمية ICT',desc:'دروس واختبارات قصيرة حول مفاهيم التداول.',action:'ابدأ التعلم',link:'./#academy'},calculators:{icon:'◎',title:'حاسبات التداول',desc:'حجم الصفقة ونسبة العائد إلى المخاطرة.',action:'فتح الحاسبات',link:'./#calculators'},markets:{icon:'▥',title:'الأسواق والأسعار',desc:'أدوات TradingView وأسعار مصادرها المحددة.',action:'عرض الأسواق',link:'./#markets'}};
 const clone=x=>JSON.parse(JSON.stringify(x));
 let model=clone(defaults);
 let toastHandle;
 function notify(msg){const el=$('ws-toast');el.textContent=msg;el.hidden=false;clearTimeout(toastHandle);toastHandle=setTimeout(()=>el.hidden=true,3500)}
 function validNumber(v){return v!==''&&v!==null&&v!==undefined&&Number.isFinite(Number(v));}
 function money(value,currency){if(!Number.isFinite(value))return '—';return new Intl.NumberFormat('en-US',{style:'currency',currency:currency||'USD',minimumFractionDigits:2,maximumFractionDigits:2}).format(value)}
 function integer(v){return Number.isFinite(v)?new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(v):'—'}
 function node(tag,cls,content){const el=document.createElement(tag);if(cls)el.className=cls;if(content!==undefined)el.textContent=content;return el}
 function storageSave(){try{localStorage.setItem(STORAGE,JSON.stringify(model));return true}catch(e){notify('تعذر الحفظ في هذا المتصفح؛ تحقّق من مساحة التخزين أو إعدادات الخصوصية.');return false}}
 function validatePayload(obj){
  if(!obj||typeof obj!=='object'||Array.isArray(obj))return false;
  const clean=clone(defaults);
  if(typeof obj.nickname==='string')clean.nickname=obj.nickname.slice(0,32);
  if(['XAUUSD','EURUSD','GBPUSD','NAS100','BTCUSD','ETHUSD','USDJPY'].includes(obj.favorite))clean.favorite=obj.favorite;
  if(Array.isArray(obj.order)){const order=obj.order.filter(x=>Object.hasOwn(moduleCatalog,x));clean.order=[...new Set([...order,...defaults.order])];}
  if(Array.isArray(obj.hidden))clean.hidden=obj.hidden.filter(x=>Object.hasOwn(moduleCatalog,x));
  if(obj.guardian&&typeof obj.guardian==='object'){
    for(const key of Object.keys(clean.guardian))if(key!=='updated'&&typeof obj.guardian[key]==='string')clean.guardian[key]=obj.guardian[key].slice(0,64);
    if(obj.guardian.updated&&Number.isFinite(Date.parse(obj.guardian.updated)))clean.guardian.updated=obj.guardian.updated;
    if(!['static','trailing'].includes(clean.guardian.drawdownMode))clean.guardian.drawdownMode='static';
    if(!['USD','EUR','GBP'].includes(clean.guardian.currency))clean.guardian.currency='USD';
  }
  if(Array.isArray(obj.checks)){
    const allowed=obj.checks.slice(0,25).filter(x=>x&&typeof x.id==='string'&&typeof x.name==='string'&&x.name.trim().length>0).map(x=>({id:x.id.slice(0,40),name:x.name.slice(0,90),done:x.done===true}));
    if(allowed.length&&new Set(allowed.map(x=>x.id)).size===allowed.length)clean.checks=allowed;
  }
  if(typeof obj.checkAsset==='string')clean.checkAsset=obj.checkAsset.slice(0,24);
  if(['BUY','SELL','WAIT'].includes(obj.checkDirection))clean.checkDirection=obj.checkDirection;
  if(typeof obj.checkRisk==='string')clean.checkRisk=obj.checkRisk.slice(0,20);
  if(typeof obj.checkNotes==='string')clean.checkNotes=obj.checkNotes.slice(0,180);
  if(Array.isArray(obj.history))clean.history=obj.history.slice(0,15).filter(x=>x&&typeof x==='object'&&typeof x.when==='string'&&typeof x.asset==='string'&&Number.isFinite(Number(x.done))&&Number.isFinite(Number(x.total))).map(x=>({when:x.when.slice(0,40),asset:x.asset.slice(0,24),direction:String(x.direction||'WAIT').slice(0,5),done:Number(x.done),total:Number(x.total)}));
  return clean;
 }
 try{const raw=localStorage.getItem(STORAGE);if(raw){const parsed=validatePayload(JSON.parse(raw));if(parsed)model=parsed;}}catch(e){console.info('Workspace saved data unavailable',e)}
 function tabOpen(name){if(!['dashboard','guardian','checklist'].includes(name))name='dashboard';document.querySelectorAll('[data-tab]').forEach(b=>{const active=b.dataset.tab===name;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));});for(const n of ['dashboard','guardian','checklist'])$('panel-'+n).hidden=n!==name;try{history.replaceState(null,'','#'+name)}catch(e){}if(name==='guardian')renderGuardian();if(name==='checklist')renderChecklist()}
 document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>tabOpen(b.dataset.tab)));
 function updateClock(){const now=new Date();$('ny-clock').textContent=new Intl.DateTimeFormat('en-GB',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(now);$('ny-date').textContent=new Intl.DateTimeFormat('ar-u-nu-latn',{timeZone:'America/New_York',weekday:'short',day:'numeric',month:'short',year:'numeric'}).format(now)}
 function renderDashboard(){
  $('nickname').value=model.nickname;$('favorite-asset').value=model.favorite;
  const toggleRoot=$('module-toggles');toggleRoot.replaceChildren();
  for(const key of defaults.order){const label=node('label');const check=node('input');check.type='checkbox';check.checked=!model.hidden.includes(key);check.addEventListener('change',()=>{model.hidden=check.checked?model.hidden.filter(x=>x!==key):[...new Set([...model.hidden,key])];storageSave();renderDashboard()});label.append(check,document.createTextNode(moduleCatalog[key].title));toggleRoot.append(label)}
  const root=$('modules');root.replaceChildren();const visible=model.order.filter(x=>!model.hidden.includes(x));
  visible.forEach((key,index)=>{
   const info=moduleCatalog[key],card=node('article','ws-module'),header=node('div','ws-module-header'),icon=node('span','ws-module-icon',info.icon),move=node('div','ws-move-buttons');
   for(const [offset,caption] of [[-1,'←'],[1,'→']]){const button=node('button','',caption);button.type='button';button.disabled=(index+offset<0||index+offset>=visible.length);button.setAttribute('aria-label',offset===-1?'تحريك البطاقة للأول':'تحريك البطاقة للأخير');button.addEventListener('click',()=>{
    const other=visible[index+offset],a=model.order.indexOf(key),b=model.order.indexOf(other);[model.order[a],model.order[b]]=[model.order[b],model.order[a]];storageSave();renderDashboard();
   });move.append(button)}
   header.append(icon,move);card.append(header,node('h3','',info.title),node('p','',info.desc));
   if(info.link){const anchor=node('a','',info.action+' ↗');anchor.href=info.link;card.append(anchor)}else{const button=node('button','',info.action+' ←');button.addEventListener('click',()=>tabOpen(info.tab));card.append(button)}root.append(card);
  });if(!visible.length)root.append(node('p','ws-placeholder','كل البطاقات مخفية. فعّل أي بطاقة من الخيارات أعلاه.'));
 }
 $('nickname').addEventListener('change',e=>{model.nickname=e.target.value.slice(0,32);storageSave()});
 $('favorite-asset').addEventListener('change',e=>{model.favorite=e.target.value;model.checkAsset=model.favorite;storageSave()});
 $('reset-dashboard').addEventListener('click',()=>{model.order=[...defaults.order];model.hidden=[];storageSave();renderDashboard();notify('تم استعادة ترتيب البطاقات')});
 $('export-settings').addEventListener('click',()=>{const body=JSON.stringify({version:1,exportedAt:new Date().toISOString(),workspace:model},null,2);const url=URL.createObjectURL(new Blob([body],{type:'application/json'}));const a=node('a');a.href=url;a.download='ICT-Arabic-Workspace-Backup.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('تم إنشاء نسخة احتياطية')});
 $('import-settings').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;if(f.size>100_000){notify('الملف أكبر من الحد المسموح');e.target.value='';return}try{const data=JSON.parse(await f.text());const parsed=validatePayload(data.workspace);if(!parsed)throw Error('invalid');if(!confirm('استيراد النسخة سيستبدل إعداداتك الحالية على هذا الجهاز. متابعة؟'))return;model=parsed;storageSave();renderDashboard();populateGuardian();renderGuardian();renderChecklist();notify('تم استيراد النسخة المحفوظة')}catch(err){notify('ملف النسخة الاحتياطية غير صالح')}finally{e.target.value=''}});
 $('clear-settings').addEventListener('click',()=>{if(!confirm('سيتم مسح إعداداتك وحسابك وسجل المراجعات من هذا الجهاز. هل أنت متأكد؟'))return;model=clone(defaults);storageSave();renderDashboard();populateGuardian();renderGuardian();renderChecklist();notify('تم مسح بيانات المساحة الشخصية')});
 const form=$('guardian-form');
 function populateGuardian(){for(const [key,value] of Object.entries(model.guardian)){const el=form.elements.namedItem(key);if(el&&key!=='updated')el.value=value}toggleHighWater()}
 function toggleHighWater(){const trailing=form.elements.namedItem('drawdownMode').value==='trailing';$('high-water-field').hidden=!trailing}
 form.elements.namedItem('drawdownMode').addEventListener('change',toggleHighWater);
 function guardianRead(){const next={};for(const key of Object.keys(defaults.guardian)){if(key==='updated')continue;const el=form.elements.namedItem(key);next[key]=String(el?.value??'').trim()}next.updated=new Date().toISOString();return next}
 function guardianMath(g){return window.ICTGuardianLimits.calculate(g)}
 function stat(label,value){const wrap=node('div','ws-stat');wrap.append(node('small','',label),node('strong','',value));return wrap}
 function renderGuardian(){const root=$('guardian-results');root.replaceChildren();const g=model.guardian,res=guardianMath(g);$('guardian-updated').textContent=g.updated?'آخر حفظ: '+new Date(g.updated).toLocaleString('ar-u-nu-latn'):'قيم افتراضية قابلة للتعديل';if(res.error){root.append(node('p','ws-danger',res.error));return}
  const {n,dailyFloor,totalFloor,dailyRemaining,totalRemaining,rawAllowed,allowed,after,atRisk}=res;
  const status=allowed<=0?'تجاوزت أحد الحدود المدخلة':atRisk?'الصفقة المخطط لها قد تتجاوز حدًا من الحدود':'ضمن الحدود المدخلة نظريًا';root.append(node('h3',atRisk?'ws-danger':'ws-safe',status));
  const grid=node('div','ws-stat-grid');grid.append(stat('الحد الأدنى اليومي',money(dailyFloor,g.currency)),stat('حد الحساب الإجمالي',money(totalFloor,g.currency)),stat('المتبقي للخسارة اليومية',money(dailyRemaining,g.currency)),stat('المتبقي للخسارة الإجمالية',money(totalRemaining,g.currency)),stat('المساحة قبل الاحتياطات',money(rawAllowed,g.currency)),stat('المخاطر المحجوزة',money(n.reservedRisk,g.currency)),stat('هامش الأمان',money(n.safetyBuffer,g.currency)),stat('المتاح للصفقة القادمة بعد الاحتياطات',money(allowed,g.currency)),stat('القيمة بعد خسارة الصفقة المخططة',money(after,g.currency)));root.append(grid);
  const percent=n.plannedRisk>0&&allowed>0?n.plannedRisk/allowed*100:(allowed<=0?100:0);
  const meter=node('div','ws-meter'+(atRisk?' is-danger':percent>=75?' is-warn':''));const fill=node('span');fill.style.width=Math.max(0,Math.min(100,percent))+'%';meter.append(fill);root.append(node('p','ws-mini','المخاطرة المخططة كنسبة من المساحة المتاحة: '+integer(percent)+'%'),meter);
  root.append(node('p','ws-risk-note','تُحسب المساحة من Equity المدخلة وتُخصم المخاطر الإضافية للصفقات المفتوحة وهامش الأمان. لا تضف الخسارة العائمة الحالية مرة ثانية. المقياس لا يتصل بحساب الوسيط؛ تأكد من تحديث الأرقام وقواعد إعادة الضبط قبل كل صفقة.'));
 }
 form.addEventListener('submit',e=>{e.preventDefault();const g=guardianRead(),r=guardianMath(g);if(r.error){notify(r.error);return}model.guardian=g;storageSave();renderGuardian();notify('تم حفظ بيانات الحساب وحساب الحدود')});
 $('day-reset').addEventListener('click',()=>{if(!confirm('تعيين مرجع بداية اليوم مساويًا للرصيد الحالي؟ افعل هذا فقط إذا كان مطابقًا لقواعد شركتك.'))return;form.elements.namedItem('dayStart').value=form.elements.namedItem('balance').value;notify('تم تحديث الحقل. اضغط حفظ لإعادة الحساب')});
 function persistChecklistInputs(){model.checkAsset=$('check-asset').value.slice(0,24);model.checkDirection=$('check-direction').value;model.checkRisk=$('check-risk').value.slice(0,20);model.checkNotes=$('check-notes').value.slice(0,180);storageSave();renderChecklistReport()}
 for(const id of ['check-asset','check-direction','check-risk','check-notes'])$(id).addEventListener('input',persistChecklistInputs);
 function drawChecks(){const root=$('checklist-items');root.replaceChildren();model.checks.forEach(check=>{const line=node('div','ws-check-item'),label=node('label'),inp=node('input');inp.type='checkbox';inp.checked=check.done;inp.addEventListener('change',()=>{check.done=inp.checked;storageSave();renderChecklistReport()});label.append(inp,document.createTextNode(check.name));line.append(label);if(!defaults.checks.some(c=>c.id===check.id)){const remove=node('button','','✕');remove.type='button';remove.setAttribute('aria-label','حذف الشرط '+check.name);remove.addEventListener('click',()=>{model.checks=model.checks.filter(x=>x.id!==check.id);storageSave();drawChecks();renderChecklistReport()});line.append(remove)}root.append(line)})}
 function renderChecklistReport(){const root=$('checklist-report');root.replaceChildren();const count=model.checks.filter(x=>x.done).length,total=model.checks.length,ratio=total?count/total:0,validRisk=validNumber(model.checkRisk)&&Number(model.checkRisk)>0&&Number(model.checkRisk)<=100;
  root.append(node('div','ws-readiness',Math.round(ratio*100)+'%'),node('p','ws-check-status',`${count} من ${total} شروط مكتملة`));const meter=node('div','ws-meter'+(ratio<.6?' is-danger':ratio<1?' is-warn':''));const fill=node('span');fill.style.width=ratio*100+'%';meter.append(fill);root.append(meter);
  let message=ratio===1&&validRisk?'اكتملت الشروط المحددة وتم إدخال مخاطرة رقمية. هذا لا يضمن نجاح الصفقة.':!validRisk?'لم تُدخل نسبة مخاطرة صالحة بعد؛ أدخلها قبل تقييم الاستعداد.':'لا تزال هناك شروط غير مكتملة؛ راجعها قبل الدخول.';
  root.append(node('p','ws-risk-note',message));
  if(model.checkAsset.trim())root.append(node('p','ws-mini','الأصل: '+model.checkAsset+' · الاتجاه: '+model.checkDirection));
 }
 function historyRender(){const root=$('review-history');root.replaceChildren();if(!model.history.length){root.append(node('p','ws-mini','لا توجد مراجعات محفوظة بعد.'));return}model.history.forEach(r=>{const line=node('div','ws-history-row');line.append(node('b','',r.asset+' · '+r.direction+' · '+r.done+'/'+r.total),node('small','',new Date(r.when).toLocaleString('ar-u-nu-latn')));root.append(line)})}
 function renderChecklist(){for(const [id,val] of [['check-asset',model.checkAsset],['check-direction',model.checkDirection],['check-risk',model.checkRisk],['check-notes',model.checkNotes]])$(id).value=val;drawChecks();renderChecklistReport();historyRender()}
 $('add-check').addEventListener('click',()=>{const el=$('new-check'),name=el.value.trim();if(name.length<3){notify('اكتب شرطًا واضحًا من ثلاثة أحرف على الأقل');return}if(model.checks.length>=25){notify('الحد الأقصى 25 شرطًا');return}model.checks.push({id:'user-'+Date.now()+'-'+Math.round(Math.random()*10000),name:name.slice(0,90),done:false});el.value='';storageSave();drawChecks();renderChecklistReport()});
 $('new-check').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('add-check').click()}});
 $('reset-checks').addEventListener('click',()=>{model.checks.forEach(c=>c.done=false);storageSave();drawChecks();renderChecklistReport()});
 $('restore-checks').addEventListener('click',()=>{if(!confirm('إعادة الشروط الافتراضية ستحذف الشروط المضافة يدويًا. متابعة؟'))return;model.checks=clone(defaults.checks);storageSave();renderChecklist();notify('تم استعادة الشروط الافتراضية')});
 $('save-checklist').addEventListener('click',()=>{persistChecklistInputs();const asset=model.checkAsset.trim();if(!asset){notify('أدخل رمز الأصل قبل الحفظ');return}const risk=Number(model.checkRisk);if(!validNumber(model.checkRisk)||risk<=0||risk>100){notify('أدخل نسبة مخاطرة موجبة وصحيحة قبل الحفظ');return}model.history.unshift({asset,direction:model.checkDirection,when:new Date().toISOString(),done:model.checks.filter(x=>x.done).length,total:model.checks.length});model.history=model.history.slice(0,15);storageSave();historyRender();notify('تم حفظ المراجعة محليًا')});
 $('clear-review-history').addEventListener('click',()=>{if(!confirm('هل تريد حذف سجل مراجعات ما قبل الصفقة؟'))return;model.history=[];storageSave();historyRender()});
 renderDashboard();populateGuardian();renderGuardian();renderChecklist();updateClock();setInterval(updateClock,1000);tabOpen(location.hash.slice(1));
})();
