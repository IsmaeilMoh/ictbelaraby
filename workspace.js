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
 ],checkAsset:'XAUUSD',checkDirection:'BUY',checkRisk:'1',checkNotes:'',history:[],accounts:[],activeAccountId:'',maxTradePct:'1',checkAccountId:'',decisionInputs:{entry:'',stop:'',target:'',minRR:'1.5',pointValue:'',lotStep:'',fee:'0',news:'unknown',session:'unknown',htf:'unknown'}};
 const moduleCatalog={guardian:{icon:'◈',title:'حارس مخاطرة الحساب',desc:'افحص حدود المخاطرة في حساباتك الشخصية والممولة.',action:'فتح الحارس',tab:'guardian'},checklist:{icon:'✓',title:'مراجعة ما قبل الصفقة',desc:'راجع شروط ICT وإدارة المخاطرة في قائمة واحدة.',action:'ابدأ المراجعة',tab:'checklist'},sessions:{icon:'◷',title:'جلسات ICT',desc:'توقيت Kill Zones وSilver Bullet والعد التنازلي.',action:'عرض الجلسات',link:'./#ict'},calendar:{icon:'▦',title:'الأجندة الاقتصادية',desc:'تحقق من الأخبار القادمة قبل أي دخول.',action:'فتح الأجندة',link:'./#agenda'},trades:{icon:'↗',title:'التوصيات والتحليلات',desc:'راقب الأفكار المنشورة وحالات الصفقات.',action:'عرض التوصيات',link:'./#recs'},academy:{icon:'▣',title:'أكاديمية ICT',desc:'دروس واختبارات قصيرة حول مفاهيم التداول.',action:'ابدأ التعلم',link:'./#academy'},calculators:{icon:'◎',title:'حاسبات التداول',desc:'حجم الصفقة ونسبة العائد إلى المخاطرة.',action:'فتح الحاسبات',link:'./#calculators'},markets:{icon:'▥',title:'الأسواق والأسعار',desc:'أدوات TradingView وأسعار مصادرها المحددة.',action:'عرض الأسواق',link:'./#markets'}};
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
  if(Array.isArray(obj.accounts)){
    clean.accounts=obj.accounts.slice(0,20).filter(a=>a&&typeof a==='object'&&typeof a.id==='string'&&a.guardian&&typeof a.guardian==='object').map(a=>{
      const g=clone(defaults.guardian);for(const k of Object.keys(g))if(k!=='updated'&&typeof a.guardian[k]==='string')g[k]=a.guardian[k].slice(0,64);
      if(a.guardian.updated&&Number.isFinite(Date.parse(a.guardian.updated)))g.updated=a.guardian.updated;
      if(!['static','trailing'].includes(g.drawdownMode))g.drawdownMode='static';
      if(!['USD','EUR','GBP'].includes(g.currency))g.currency='USD';
      return {id:a.id.slice(0,64),type:a.type==='funded'?'funded':'personal',maxTradePct:String(a.maxTradePct??'').slice(0,20),guardian:g};
    });
    const seen=new Set();clean.accounts=clean.accounts.filter(a=>{if(seen.has(a.id))return false;seen.add(a.id);return true});
  }
  if(typeof obj.activeAccountId==='string')clean.activeAccountId=obj.activeAccountId.slice(0,64);
  if(typeof obj.checkAccountId==='string')clean.checkAccountId=obj.checkAccountId.slice(0,64);
  if(typeof obj.maxTradePct==='string')clean.maxTradePct=obj.maxTradePct.slice(0,20);
  if(obj.decisionInputs&&typeof obj.decisionInputs==='object'){for(const key of Object.keys(clean.decisionInputs)){const value=obj.decisionInputs[key];if(typeof value==='string'&&value.length<60)clean.decisionInputs[key]=value}}
  if(Array.isArray(obj.history))clean.history=obj.history.slice(0,15).filter(x=>x&&typeof x==='object'&&typeof x.when==='string'&&typeof x.asset==='string'&&Number.isFinite(Number(x.done))&&Number.isFinite(Number(x.total))).map(x=>({when:x.when.slice(0,40),asset:x.asset.slice(0,24),direction:String(x.direction||'WAIT').slice(0,5),done:Number(x.done),total:Number(x.total)}));
  return clean;
 }
 try{const raw=localStorage.getItem(STORAGE);if(raw){const parsed=validatePayload(JSON.parse(raw));if(parsed)model=parsed;}}catch(e){console.info('Workspace saved data unavailable',e)}
 // Backward-compatible migration of the original single funded-account form.
 function newAccount(type='personal', name=''){
   const g=clone(defaults.guardian);g.accountName=name|| (type==='funded'?'حساب ممول':'حساب شخصي');
   return {id:'acct-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),type,maxTradePct:'1',guardian:g};
 }
 if(!model.accounts.length){const legacy=model.guardian;const hasLegacy=Boolean(legacy.updated||legacy.accountName||legacy.initial||legacy.balance||legacy.equity);const account=newAccount(hasLegacy?'funded':'personal',legacy.accountName||(hasLegacy?'حساب ممول سابق':'حساب شخصي'));account.guardian=clone(legacy);account.maxTradePct=hasLegacy?'':'1';model.accounts=[account];model.activeAccountId=account.id;model.checkAccountId=account.id;storageSave()}
 if(!model.accounts.some(a=>a.id===model.activeAccountId))model.activeAccountId=model.accounts[0].id;
 if(!model.accounts.some(a=>a.id===model.checkAccountId))model.checkAccountId=model.activeAccountId;
 function selectedAccount(id=model.activeAccountId){return model.accounts.find(a=>a.id===id)||null}
 function accountLabel(a){return (a.guardian.accountName||'حساب بدون اسم')+' · '+(a.type==='personal'?'شخصي':'ممول')}
 function syncAccountPicker(){for(const id of ['ws-account-picker','check-account']){const el=$(id),current=id==='check-account'?model.checkAccountId:model.activeAccountId;el.replaceChildren();for(const a of model.accounts){const o=node('option','',accountLabel(a));o.value=a.id;el.append(o)}el.value=current}
  const a=selectedAccount();$('ws-account-type').value=a.type;$('ws-max-trade-pct').value=a.maxTradePct;
  $('ws-account-remove').disabled=model.accounts.length===1;
  $('guardian-form').querySelectorAll('[name="dailyPct"],[name="totalPct"],[name="dayStart"]').forEach(el=>{el.required=a.type==='funded'});
 }
 function assessAccount(a,pct){
   if(!a)return {state:'unknown',reason:'لم يتم تحديد حساب صالح.'};
   const g=a.guardian,eq=Number(g.equity),riskPct=Number(pct),limit=Number(a.maxTradePct);
   if(!validNumber(g.equity)||eq<=0||!validNumber(pct)||riskPct<=0||riskPct>100)return {state:'unknown',reason:'أدخل Equity صالحًا ونسبة مخاطرة الصفقة قبل التقييم.'};
   if(!validNumber(a.maxTradePct)||limit<=0||limit>100)return {state:'unknown',reason:'حدد الحد الأقصى للمخاطرة لكل صفقة لهذا الحساب.'};
   const proposed=eq*riskPct/100;
   if(riskPct>limit+1e-9)return {state:'block',reason:'مخاطرة الصفقة تتجاوز حد الحساب المحدد.',proposed,perTrade:limit*eq/100};
   if(a.type==='funded'){
     const r=window.ICTGuardianLimits.calculate({...g,plannedRisk:String(proposed)});
     if(r.error)return {state:'unknown',reason:'بيانات الحساب الممول غير مكتملة: '+r.error,proposed};
     if(r.allowed<=0||proposed>r.allowed)return {state:'block',reason:'الخسارة المحتملة تتجاوز المساحة المتاحة قبل خرق قواعد الحساب الممول.',proposed,remaining:r.allowed};
     return {state:'ok',reason:'ضمن حدود الصفقة والحساب الممول المدخلة نظريًا.',proposed,remaining:r.allowed};
   }
   // Personal account: daily and total loss caps are optional; never fabricate prop-firm rules.
   const usedCaps=[['dailyPct','dayStart'],['totalPct','initial']].filter(([pctKey])=>String(g[pctKey]).trim()!=='');
   if((String(g.reservedRisk).trim()!==''&&!validNumber(g.reservedRisk))||(String(g.safetyBuffer).trim()!==''&&!validNumber(g.safetyBuffer)))return {state:'unknown',reason:'أكمل المخاطر المفتوحة وهامش الأمان بأرقام صحيحة.',proposed};
   const reserves=validNumber(g.reservedRisk)?Number(g.reservedRisk):0,buffer=validNumber(g.safetyBuffer)?Number(g.safetyBuffer):0;
   if(reserves<0||buffer<0)return {state:'unknown',reason:'الاحتياط أو هامش الأمان غير صالح.',proposed};
   let remaining=eq-reserves-buffer;
   for(const [pctKey,baseKey] of usedCaps){
     if(!validNumber(g[pctKey])||!validNumber(g[baseKey])||Number(g[pctKey])<=0||Number(g[pctKey])>100||Number(g[baseKey])<=0)return {state:'unknown',reason:'أكمل بيانات حد الخسارة الاختياري أو اترك الحد والمرجع فارغين.',proposed};
     const base= g.drawdownMode==='trailing'&&pctKey==='totalPct'?Number(g.highWater):Number(g[baseKey]);
     if(!Number.isFinite(base)||base<=0)return {state:'unknown',reason:'حد التراجع المتحرك يحتاج أعلى رصيد مرجعي صالح.',proposed};
     remaining=Math.min(remaining,eq-base*(1-Number(g[pctKey])/100)-reserves-buffer);
   }
   if(proposed>remaining||remaining<=0)return {state:'block',reason:'المخاطرة تتجاوز حدود الحساب الشخصية المدخلة.',proposed,remaining};
   return {state:'ok',reason:'ضمن حدود المخاطرة الشخصية المدخلة نظريًا.',proposed,remaining};
 }
 function decisionState(){return assessAccount(selectedAccount(model.checkAccountId),model.checkRisk)}
 const decisionFields={entry:'check-entry',stop:'check-stop',target:'check-target',minRR:'check-min-rr',pointValue:'check-point-value',lotStep:'check-lot-step',fee:'check-fee',news:'check-news',session:'check-session',htf:'check-htf'};
 function populateDecisionInputs(){const values=model.decisionInputs||defaults.decisionInputs;for(const [key,id] of Object.entries(decisionFields))$(id).value=values[key]??defaults.decisionInputs[key]}
 function readDecisionInputs(){const next={};for(const [key,id] of Object.entries(decisionFields))next[key]=String($(id).value).slice(0,50);model.decisionInputs=next;storageSave();renderChecklistReport();renderDecisionOverview()}
 function getTrade(){const a=selectedAccount(model.checkAccountId);return window.ICTWorkspaceDecision.tradeMath({...model.decisionInputs,direction:model.checkDirection,riskPct:model.checkRisk},a?.guardian.equity)}
 function getFinal(){const d=window.ICTWorkspaceDecision,risk=decisionState(),t=getTrade(),a=selectedAccount(model.checkAccountId),i=model.decisionInputs;
  const age=a?.guardian.updated?Date.now()-Date.parse(a.guardian.updated):Infinity;
  return d.evaluate({account:a,risk,trade:t,checks:model.checks,minRR:Number(i.minRR)||1.5,news:i.news,session:i.session,higherTimeframe:i.htf,stale:!Number.isFinite(age)||age>24*60*60*1000});
 }
 function line(root,label,detail,cls){const el=node('div','ws-insight-line '+(cls||''));el.append(node('strong','',label),node('span','',detail));root.append(el)}
 function renderTradeReport(){const el=$('ws-trade-report');el.replaceChildren();const t=getTrade(),a=selectedAccount(model.checkAccountId);
  if(!t.valid){line(el,'تحقق الأسعار والمخاطرة',t.issues.join(' '),'ws-warn');return}
  line(el,'ملخص المخاطرة','المسافة إلى الوقف: '+t.dist.toPrecision(6)+' · R:R الإجمالية 1:'+t.rr.toFixed(2)+' · ميزانية الخسارة '+money(t.risk,a.guardian.currency),'ws-safe');
  if(t.quantity!==null)line(el,'حجم المركز حسب مواصفاتك','الكمية المقدرة '+t.quantity+' · الخسارة عند الوقف '+money(t.realRisk,a.guardian.currency)+(t.netRR!==null?' · R:R بعد التكلفة 1:'+t.netRR.toFixed(2):''),'ws-safe');
  if(t.issues.length)line(el,'تنبيه حساب الحجم',t.issues.join(' '),'ws-warn');
  const session=window.ICTWorkspaceDecision.sessionAt(new Date());el.append(node('p','ws-insight-meta','وقت نيويورك الآن: '+session.name+' (معلومة زمنية وليست تحققًا من صلاحية الصفقة).'));
 }
 function renderFinal(){const final=getFinal(),el=$('ws-final-status'),list=$('ws-final-reasons');el.replaceChildren();list.replaceChildren();const labels={block:'تعارض مع قواعد المخاطرة أو الحد الأدنى للصفقة',unknown:'تعذر التحقق — بيانات أو أدلة ناقصة',review:'تحتاج مراجعة قبل اتخاذ القرار',conditional:'الشروط المدخلة متوافقة نظريًا'};
  el.append(node('h3',final.state==='block'?'ws-danger':final.state==='conditional'?'ws-safe':'ws-warn',labels[final.state]));
  for(const [key,title,cls] of [['block','مخالفات','ws-danger'],['unknown','غير قابل للتحقق','ws-warn'],['review','تحذيرات','ws-warn'],['ok','ما تم التحقق منه حسابيًا أو تأكيده يدويًا','ws-safe']])if(final[key].length)line(list,title,final[key].join(' · '),cls);
  list.append(node('p','ws-insight-meta','البيانات المحلية: '+new Date().toLocaleString('ar-u-nu-latn')+' · الأخبار والشموع وشروط ICT لا يتم التحقق منها تلقائيًا داخل مساحتي.'));
 }
 function stressReport(){const el=$('ws-stress-report');el.replaceChildren();const a=selectedAccount();if(!a)return;const input=a.guardian,base=assessAccount(a,model.checkRisk);const count=Number($('ws-stress-count').value),slip=$('ws-stress-slippage').value;
  const r=window.ICTWorkspaceDecision.stress(a,base.remaining,base.proposed,count,slip);
  if(base.state==='unknown'||!r.valid){line(el,'يلزم استكمال الحساب',base.state==='unknown'?base.reason:r.reason,'ws-warn');return}
  line(el,'خسائر متتالية مفترضة',count+' × (مخاطرة الصفقة '+money(base.proposed,input.currency)+' + تكلفة إضافية '+money(Number(slip),input.currency)+') = '+money(r.total,input.currency),'ws-warn');
  line(el,'Equity بعد السيناريو',money(r.after,input.currency)+(r.availableAfter===null?' · حد الخسارة غير متاح للحساب':' · المساحة بعد السيناريو '+money(r.availableAfter,input.currency)),r.breach?'ws-danger':'ws-warn');
  if(r.breach)line(el,'تحذير حدود','الخسائر المتتالية تتجاوز المساحة التي حددتها للحساب.','ws-danger');
 }
 function exportDecision(){const result={version:'6.9.12',createdAt:new Date().toISOString(),accountName:selectedAccount(model.checkAccountId)?.guardian.accountName||'',accountType:selectedAccount(model.checkAccountId)?.type||'',asset:model.checkAsset,direction:model.checkDirection,checks:model.checks.map(c=>({name:c.name,done:c.done})),riskAssessment:decisionState(),tradeCalculation:getTrade(),decision:getFinal(),inputs:model.decisionInputs,notice:'تقييم مشروط بمدخلات المستخدم، وليس توصية أو بيانات وسيط لحظية.'};const blob=new Blob([JSON.stringify(result,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=node('a');a.href=url;a.download='ICT-Decision-Report-'+Date.now()+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}
 function refreshDecisionExtras(){renderTradeReport();renderFinal();stressReport()}

 function renderDecisionOverview(){const root=$('decision-overview');root.replaceChildren();const a=selectedAccount(model.checkAccountId),res=decisionState();
   root.append(node('h3','','مركز التحقق قبل الصفقة — '+(a?accountLabel(a):'حساب غير محدد')));
   const msg=res.state==='block'?'مخالفة لقواعد المخاطرة':res.state==='unknown'?'بيانات ناقصة — لا يمكن التحقق':'المخاطرة ضمن القواعد المدخلة';
   root.append(node('strong',res.state==='block'?'ws-danger':res.state==='ok'?'ws-safe':'ws-warn',msg));
   root.append(node('p','ws-mini',res.reason));
   if(Number.isFinite(res.proposed))root.append(node('p','ws-mini','الخسارة المخططة وفق Equity: '+money(res.proposed,a.guardian.currency)));
   const b=node('button','ws-secondary','فحص تفاصيل الصفقة ←');b.type='button';b.addEventListener('click',()=>tabOpen('checklist'));root.append(b);refreshDecisionExtras();
 }
 $('ws-account-picker').addEventListener('change',e=>{model.activeAccountId=e.target.value;model.guardian=clone(selectedAccount().guardian);storageSave();syncAccountPicker();populateGuardian();renderGuardian();renderDecisionOverview()});
 $('check-account').addEventListener('change',e=>{model.checkAccountId=e.target.value;storageSave();renderChecklistReport();renderDecisionOverview()});
 $('ws-account-type').addEventListener('change',e=>{selectedAccount().type=e.target.value;storageSave();syncAccountPicker();renderGuardian();renderChecklistReport();renderDecisionOverview()});
 $('ws-max-trade-pct').addEventListener('change',e=>{selectedAccount().maxTradePct=e.target.value.trim();storageSave();renderGuardian();renderChecklistReport();renderDecisionOverview()});
 $('ws-account-add').addEventListener('click',()=>{if(model.accounts.length>=20){notify('الحد الأقصى 20 حسابًا');return}const type=prompt('نوع الحساب الجديد: اكتب personal للحساب الشخصي أو funded للممول','personal');if(type===null)return;if(!['personal','funded'].includes(type.trim())){notify('النوع غير صحيح');return}const a=newAccount(type.trim());model.accounts.push(a);model.activeAccountId=a.id;model.checkAccountId=a.id;model.guardian=clone(a.guardian);storageSave();syncAccountPicker();populateGuardian();renderGuardian();renderChecklistReport();renderDecisionOverview()});
 $('ws-account-remove').addEventListener('click',()=>{if(model.accounts.length<=1)return;if(!confirm('حذف هذا الحساب من الجهاز نهائيًا؟'))return;model.accounts=model.accounts.filter(a=>a.id!==model.activeAccountId);model.activeAccountId=model.accounts[0].id;if(!selectedAccount(model.checkAccountId))model.checkAccountId=model.activeAccountId;model.guardian=clone(selectedAccount().guardian);storageSave();syncAccountPicker();populateGuardian();renderGuardian();renderChecklistReport();renderDecisionOverview()});
 function tabOpen(name){if(!['dashboard','guardian','checklist'].includes(name))name='dashboard';document.querySelectorAll('[data-tab]').forEach(b=>{const active=b.dataset.tab===name;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));});for(const n of ['dashboard','guardian','checklist'])$('panel-'+n).hidden=n!==name;try{history.replaceState(null,'','#'+name)}catch(e){}if(name==='guardian')renderGuardian();if(name==='checklist')renderChecklist();if(name==='dashboard')renderDecisionOverview()}
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
 $('import-settings').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;if(f.size>100_000){notify('الملف أكبر من الحد المسموح');e.target.value='';return}try{const data=JSON.parse(await f.text());const parsed=validatePayload(data.workspace);if(!parsed)throw Error('invalid');if(!confirm('استيراد النسخة سيستبدل إعداداتك الحالية على هذا الجهاز. متابعة؟'))return;model=parsed;if(!model.accounts.length){const legacy=newAccount('funded',model.guardian.accountName||'حساب سابق');legacy.guardian=clone(model.guardian);legacy.maxTradePct='';model.accounts=[legacy];model.activeAccountId=legacy.id;model.checkAccountId=legacy.id}if(!selectedAccount())model.activeAccountId=model.accounts[0].id;if(!selectedAccount(model.checkAccountId))model.checkAccountId=model.activeAccountId;model.guardian=clone(selectedAccount().guardian);storageSave();syncAccountPicker();renderDashboard();populateGuardian();renderGuardian();renderChecklist();renderDecisionOverview();notify('تم استيراد النسخة المحفوظة')}catch(err){notify('ملف النسخة الاحتياطية غير صالح')}finally{e.target.value=''}});
 $('clear-settings').addEventListener('click',()=>{if(!confirm('سيتم مسح إعداداتك وحسابك وسجل المراجعات من هذا الجهاز. هل أنت متأكد؟'))return;model=clone(defaults);const a=newAccount();model.accounts=[a];model.activeAccountId=a.id;model.checkAccountId=a.id;model.guardian=clone(a.guardian);storageSave();syncAccountPicker();renderDashboard();populateGuardian();renderGuardian();renderChecklist();renderDecisionOverview();notify('تم مسح بيانات المساحة الشخصية')});
 const form=$('guardian-form');
 function populateGuardian(){for(const [key,value] of Object.entries(model.guardian)){const el=form.elements.namedItem(key);if(el&&key!=='updated')el.value=value}toggleHighWater()}
 function toggleHighWater(){const trailing=form.elements.namedItem('drawdownMode').value==='trailing';$('high-water-field').hidden=!trailing}
 form.elements.namedItem('drawdownMode').addEventListener('change',toggleHighWater);
 function guardianRead(){const next={};for(const key of Object.keys(defaults.guardian)){if(key==='updated')continue;const el=form.elements.namedItem(key);next[key]=String(el?.value??'').trim()}next.updated=new Date().toISOString();return next}
 function guardianMath(g){return window.ICTGuardianLimits.calculate(g)}
 function stat(label,value){const wrap=node('div','ws-stat');wrap.append(node('small','',label),node('strong','',value));return wrap}
 function renderGuardian(){const root=$('guardian-results');root.replaceChildren();const a=selectedAccount(),g=a.guardian;if(a.type==='personal'){const r=assessAccount(a,model.checkRisk);root.append(node('h3','','حساب شخصي: لا تُفرض قواعد الشركات الممولة'));root.append(node('p','ws-mini','نتيجة المخاطرة الحالية: '+r.reason));root.append(node('p','ws-risk-note','يمكنك إدخال حد يومي أو إجمالي اختياري. للحساب الشخصي تُستخدم حدودك الخاصة فقط. الحساب غير متصل بالوسيط.'));$('guardian-updated').textContent=g.updated?'آخر حفظ: '+new Date(g.updated).toLocaleString('ar-u-nu-latn'):'لم تحفظ بيانات الحساب';return}const res=guardianMath(g);$('guardian-updated').textContent=g.updated?'آخر حفظ: '+new Date(g.updated).toLocaleString('ar-u-nu-latn'):'قيم افتراضية قابلة للتعديل';if(res.error){root.append(node('p','ws-danger',res.error));return}
  const {n,dailyFloor,totalFloor,dailyRemaining,totalRemaining,rawAllowed,allowed,after,atRisk}=res;
  const status=allowed<=0?'تجاوزت أحد الحدود المدخلة':atRisk?'الصفقة المخطط لها قد تتجاوز حدًا من الحدود':'ضمن الحدود المدخلة نظريًا';root.append(node('h3',atRisk?'ws-danger':'ws-safe',status));
  const grid=node('div','ws-stat-grid');grid.append(stat('الحد الأدنى اليومي',money(dailyFloor,g.currency)),stat('حد الحساب الإجمالي',money(totalFloor,g.currency)),stat('المتبقي للخسارة اليومية',money(dailyRemaining,g.currency)),stat('المتبقي للخسارة الإجمالية',money(totalRemaining,g.currency)),stat('المساحة قبل الاحتياطات',money(rawAllowed,g.currency)),stat('المخاطر المحجوزة',money(n.reservedRisk,g.currency)),stat('هامش الأمان',money(n.safetyBuffer,g.currency)),stat('المتاح للصفقة القادمة بعد الاحتياطات',money(allowed,g.currency)),stat('القيمة بعد خسارة الصفقة المخططة',money(after,g.currency)));root.append(grid);
  const percent=n.plannedRisk>0&&allowed>0?n.plannedRisk/allowed*100:(allowed<=0?100:0);
  const meter=node('div','ws-meter'+(atRisk?' is-danger':percent>=75?' is-warn':''));const fill=node('span');fill.style.width=Math.max(0,Math.min(100,percent))+'%';meter.append(fill);root.append(node('p','ws-mini','المخاطرة المخططة كنسبة من المساحة المتاحة: '+integer(percent)+'%'),meter);
  root.append(node('p','ws-risk-note','تُحسب المساحة من Equity المدخلة وتُخصم المخاطر الإضافية للصفقات المفتوحة وهامش الأمان. لا تضف الخسارة العائمة الحالية مرة ثانية. المقياس لا يتصل بحساب الوسيط؛ تأكد من تحديث الأرقام وقواعد إعادة الضبط قبل كل صفقة.'));
 }
 form.addEventListener('submit',e=>{e.preventDefault();const g=guardianRead(),a=selectedAccount();if(!validNumber(g.equity)||Number(g.equity)<=0||!validNumber(g.initial)||Number(g.initial)<=0||!validNumber(g.balance)||Number(g.balance)<0){notify('أدخل الرصيد الابتدائي والحالي وEquity بأرقام صحيحة.');return}const r=a.type==='funded'?guardianMath(g):assessAccount({...a,guardian:g},model.checkRisk);if(a.type==='funded'&&r.error){notify(r.error);return}selectedAccount().guardian=g;model.guardian=clone(g);storageSave();syncAccountPicker();renderGuardian();renderChecklistReport();renderDecisionOverview();notify('تم حفظ بيانات الحساب وحساب الحدود')});
 $('day-reset').addEventListener('click',()=>{if(!confirm('تعيين مرجع بداية اليوم مساويًا للرصيد الحالي؟ افعل هذا فقط إذا كان مطابقًا لقواعد شركتك.'))return;form.elements.namedItem('dayStart').value=form.elements.namedItem('balance').value;notify('تم تحديث الحقل. اضغط حفظ لإعادة الحساب')});
 function persistChecklistInputs(){model.checkAsset=$('check-asset').value.slice(0,24);model.checkDirection=$('check-direction').value;model.checkRisk=$('check-risk').value.slice(0,20);model.checkNotes=$('check-notes').value.slice(0,180);storageSave();renderChecklistReport();renderDecisionOverview()}
 for(const id of ['check-asset','check-direction','check-risk','check-notes'])$(id).addEventListener('input',persistChecklistInputs);
 for(const id of Object.values(decisionFields))$(id).addEventListener('input',readDecisionInputs);
 for(const id of ['ws-stress-count','ws-stress-slippage'])$(id).addEventListener('input',stressReport);
 $('ws-decision-export').addEventListener('click',exportDecision);$('ws-to-setup').addEventListener('click',()=>tabOpen('checklist'));
 function drawChecks(){const root=$('checklist-items');root.replaceChildren();model.checks.forEach(check=>{const line=node('div','ws-check-item'),label=node('label'),inp=node('input');inp.type='checkbox';inp.checked=check.done;inp.addEventListener('change',()=>{check.done=inp.checked;storageSave();renderChecklistReport();renderDecisionOverview()});label.append(inp,document.createTextNode(check.name));line.append(label);if(!defaults.checks.some(c=>c.id===check.id)){const remove=node('button','','✕');remove.type='button';remove.setAttribute('aria-label','حذف الشرط '+check.name);remove.addEventListener('click',()=>{model.checks=model.checks.filter(x=>x.id!==check.id);storageSave();drawChecks();renderChecklistReport()});line.append(remove)}root.append(line)})}
 function renderChecklistReport(){const root=$('checklist-report');root.replaceChildren();const count=model.checks.filter(x=>x.done).length,total=model.checks.length,ratio=total?count/total:0,validRisk=validNumber(model.checkRisk)&&Number(model.checkRisk)>0&&Number(model.checkRisk)<=100;
  root.append(node('div','ws-readiness',Math.round(ratio*100)+'%'),node('p','ws-check-status',`${count} من ${total} شروط مكتملة`));const meter=node('div','ws-meter'+(ratio<.6?' is-danger':ratio<1?' is-warn':''));const fill=node('span');fill.style.width=ratio*100+'%';meter.append(fill);root.append(meter);
  const riskResult=decisionState();const hard=['risk','discipline'];const missingHard=model.checks.some(c=>hard.includes(c.id)&&!c.done);
  let message=riskResult.state==='block'?'مخالفة: '+riskResult.reason:riskResult.state==='unknown'?'غير قابل للتحقق: '+riskResult.reason:missingHard?'شروط إلزامية في القائمة لم تُستوفَ؛ نسبة اكتمال المربعات لا تعني الجاهزية.':ratio<1?'شروط الاستراتيجية لم تكتمل.':'الشروط التي أدخلتها مستوفاة نظريًا؛ لا تعني نجاح الصفقة.';
  root.append(node('strong',riskResult.state==='block'?'ws-danger':riskResult.state==='ok'?'ws-safe':'ws-warn',riskResult.state==='block'?'مخالفة للمخاطرة':riskResult.state==='unknown'?'بيانات ناقصة':'المخاطرة ضمن القواعد المدخلة'));
  const current=selectedAccount(model.checkAccountId);root.append(node('p','ws-mini','الحساب: '+(current?accountLabel(current):'غير محدد')));
  if(Number.isFinite(riskResult.proposed)&&current)root.append(node('p','ws-mini','المخاطرة المحتملة: '+money(riskResult.proposed,current.guardian.currency)));

  root.append(node('p','ws-risk-note',message));
  if(model.checkAsset.trim())root.append(node('p','ws-mini','الأصل: '+model.checkAsset+' · الاتجاه: '+model.checkDirection));refreshDecisionExtras();
 }
 function historyRender(){const root=$('review-history');root.replaceChildren();if(!model.history.length){root.append(node('p','ws-mini','لا توجد مراجعات محفوظة بعد.'));return}model.history.forEach(r=>{const line=node('div','ws-history-row');line.append(node('b','',r.asset+' · '+r.direction+' · '+r.done+'/'+r.total),node('small','',new Date(r.when).toLocaleString('ar-u-nu-latn')));root.append(line)})}
 function renderChecklist(){for(const [id,val] of [['check-asset',model.checkAsset],['check-direction',model.checkDirection],['check-risk',model.checkRisk],['check-notes',model.checkNotes]])$(id).value=val;drawChecks();renderChecklistReport();historyRender();populateDecisionInputs();refreshDecisionExtras()}
 $('add-check').addEventListener('click',()=>{const el=$('new-check'),name=el.value.trim();if(name.length<3){notify('اكتب شرطًا واضحًا من ثلاثة أحرف على الأقل');return}if(model.checks.length>=25){notify('الحد الأقصى 25 شرطًا');return}model.checks.push({id:'user-'+Date.now()+'-'+Math.round(Math.random()*10000),name:name.slice(0,90),done:false});el.value='';storageSave();drawChecks();renderChecklistReport()});
 $('new-check').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('add-check').click()}});
 $('reset-checks').addEventListener('click',()=>{model.checks.forEach(c=>c.done=false);storageSave();drawChecks();renderChecklistReport()});
 $('restore-checks').addEventListener('click',()=>{if(!confirm('إعادة الشروط الافتراضية ستحذف الشروط المضافة يدويًا. متابعة؟'))return;model.checks=clone(defaults.checks);storageSave();renderChecklist();notify('تم استعادة الشروط الافتراضية')});
 $('save-checklist').addEventListener('click',()=>{persistChecklistInputs();const asset=model.checkAsset.trim();if(!asset){notify('أدخل رمز الأصل قبل الحفظ');return}const risk=Number(model.checkRisk);if(!validNumber(model.checkRisk)||risk<=0||risk>100){notify('أدخل نسبة مخاطرة موجبة وصحيحة قبل الحفظ');return}model.history.unshift({asset,direction:model.checkDirection,when:new Date().toISOString(),done:model.checks.filter(x=>x.done).length,total:model.checks.length});model.history=model.history.slice(0,15);storageSave();historyRender();notify('تم حفظ المراجعة محليًا')});
 $('clear-review-history').addEventListener('click',()=>{if(!confirm('هل تريد حذف سجل مراجعات ما قبل الصفقة؟'))return;model.history=[];storageSave();historyRender()});
 model.guardian=clone(selectedAccount().guardian);syncAccountPicker();populateDecisionInputs();renderDashboard();populateGuardian();renderGuardian();renderChecklist();renderDecisionOverview();updateClock();setInterval(updateClock,1000);tabOpen(location.hash.slice(1));
})();
