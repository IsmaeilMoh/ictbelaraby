'use strict';
/* ICT Research Guided Workflow 6.9.14 — a presentation and audit layer.
   All prices and backtests originate in the existing validated research engine. */
(() => {
 const $=id=>document.getElementById(id), bridge=window.ICTResearchBridge;
 if(!bridge){console.warn('Research bridge unavailable');return;}
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const metric=(v,d=2)=>Number.isFinite(v)?v.toLocaleString('en-US',{maximumFractionDigits:d,minimumFractionDigits:d}):'—';
 const iso=t=>Number.isFinite(Date.parse(t))?new Date(t).toISOString().replace('T',' ').slice(0,16)+' UTC':'غير محدد';
 const REVIEW_KEY='ict-research-replay-audit-v2';
 let copyText='', lastSignature='', lastAuditKey='', auditResults=null, storedNotes=readNotes();
 function readNotes(){try{const d=JSON.parse(localStorage.getItem(REVIEW_KEY)||'[]');return Array.isArray(d)?d.filter(x=>x&&typeof x.asset==='string'&&typeof x.time==='string'&&typeof x.view==='string').slice(0,150):[];}catch{return [];}}
 function current(){return bridge.snapshot();}
 function sample(trades){const n=trades.length,net=trades.reduce((s,t)=>s+t.netR,0),good=trades.filter(t=>t.netR>0),loss=trades.filter(t=>t.netR<=0);let equity=0,peak=0,dd=0;for(const t of trades){equity+=t.netR;peak=Math.max(peak,equity);dd=Math.max(dd,peak-equity);}return{n,net,mean:n?net/n:null,rate:n?good.length/n*100:null,dd,profit:trades.reduce((s,t)=>s+Math.max(0,t.netR),0),loss:loss.reduce((s,t)=>s+Math.max(0,-t.netR),0)};}
 function slices(state,arr){const cut=state.bars[Math.floor(state.bars.length*.7)]?.time;return{train:arr.filter(t=>t.exitTime<cut),test:arr.filter(t=>t.entryTime>=cut)};}
 function coverage(s){const b=s.bars,tf=s.metadata.timeframe,ints={'1m':60000,'5m':300000,'15m':900000,'30m':1800000,'1h':3600000,'4h':14400000,'1d':86400000};let gaps=0;const step=ints[tf];if(step){for(let i=1;i<b.length;i++)if(Date.parse(b[i].time)-Date.parse(b[i-1].time)>step*1.5)gaps++;}
 const first=b[0]?.time,last=b.at(-1)?.time,span=(Date.parse(last)-Date.parse(first))/86400000;
 return{first,last,span,gaps,step,ageHours:(Date.now()-Date.parse(s.metadata.updatedAt))/3600000};}
 function classify(s){const train=slices(s,s.trades),a=sample(train.train),b=sample(train.test),c=coverage(s);
 let reasons=[],positive=[];
 if(s.bars.length<1000)reasons.push('التغطية أقل من 1000 شمعة؛ فترات السوق المتنوعة غير ممثلة بما يكفي.');
 if(a.n<30||b.n<30)reasons.push(`صفقات الدراسة ${a.n} والتحقق ${b.n}؛ يلزم 30 صفقة على الأقل في كل عينة لقراءة أولية.`);
 if(a.n>=30&&b.n>=30){if(a.mean>0&&b.mean<=0)reasons.push('متوسط العائد الموجب في الدراسة لم يستمر في فترة التحقق.');if(b.mean>0&&a.mean>0)positive.push('متوسط صافي العائد موجب في عينتي الدراسة والتحقق.');if(a.mean<=0||b.mean<=0)reasons.push('متوسط صافي العائد غير موجب في إحدى العينتين.');}
 if(s.metadata.marketKind==='index')reasons.push('بيانات المؤشر مرجع نقدي وليست عقد الوسيط، ولا تكفي لتقدير تكلفة التنفيذ الفعلية.');
 if(!Number.isFinite(c.ageHours)||c.ageHours>48)reasons.push('تاريخ تحديث المصدر غير حديث؛ افحص صلاحية الملف قبل الاستنتاج.');
 if(c.gaps&&s.metadata.marketKind==='crypto')reasons.push('توجد فجوات زمنية في سلسلة السوق الرقمية.');
 if(c.gaps&&s.metadata.marketKind!=='crypto')positive.push('انقطاعات التداول المحتملة ظاهرة في تغطية المصدر؛ لا تعتبرها شموعًا مفقودة تلقائيًا.');
 if(!positive.length&&a.n&&b.n)positive.push('تم فصل الفترتين زمنيًا دون احتساب صفقات تتجاوز الحد الفاصل.');
 if(!s.trades.length)reasons.push('لم ينتج الاختبار أي صفقة مستوفية للقواعد المحددة.');
 if(a.n>=30&&b.n>=30&&b.mean>0&&a.mean>0&&s.bars.length>=1000&&Number.isFinite(c.ageHours)&&c.ageHours<=48){positive.push('إشارة أولية تستحق دراسة إضافية؛ ليست تحققًا مستقلاً من استراتيجية قابلة للتنفيذ.');}
 const ok=a.n>=30&&b.n>=30&&b.mean>0&&a.mean>0&&s.bars.length>=1000&&c.ageHours<=48;
 return{a,b,c,positive,reasons,level:!s.trades.length?'غير كافية':ok?'مؤشرات بحث أولية':'غير حاسمة'};
 }
 function renderEvidence(){const s=current(),node=$('r14-main-message'),list=$('r14-metrics'),find=$('r14-findings'),limit=$('r14-limits');
  if(!s.bars.length){node.textContent='لا توجد بيانات تاريخية صالحة حاليًا. راجع رسالة المصدر وحدد الأصل والإطار المتاحين.';list.innerHTML='';find.innerHTML='<li>لا تتوفر عينة تاريخية قابلة للاختبار.</li>';limit.innerHTML='<li>لن يصدر المختبر توصيفًا للأداء دون شموع موثوقة.</li>';$('r14-copy').disabled=true;copyText='';return;}
  const x=classify(s),m=s.metadata;
  node.innerHTML=`<span class="r14-level">${escape(x.level)}</span> <strong>${escape(m.symbol||'الأصل')} · ${escape(m.timeframe||'الإطار')}</strong> — ${x.level==='مؤشرات بحث أولية'?'العينة تستحق تحقيقًا إضافيًا واختبارًا مستقلًا.':'لا يوجد دليل كافٍ لاعتماد القواعد كتداول حي.'}`;
  const specs=[['حجم البيانات',s.bars.length.toLocaleString('en-US')+' شمعة'],['صفقات التحقق',String(x.b.n)],['متوسط التحقق',x.b.mean===null?'—':metric(x.b.mean,3)+' R'],['تراجع التحقق',x.b.n?metric(x.b.dd,2)+' R':'—'],['الفترة',Number.isFinite(x.c.span)?metric(x.c.span,0)+' يوم':'—'],['تاريخ المصدر',iso(m.updatedAt)]];
  list.innerHTML=specs.map(([name,v])=>`<div><small>${escape(name)}</small><strong dir="auto">${escape(v)}</strong></div>`).join('');
  find.innerHTML=x.positive.map(v=>'<li>'+escape(v)+'</li>').join('')||'<li>لا توجد مؤشرات إيجابية كافية من اختبار مستقل.</li>';
  limit.innerHTML=x.reasons.map(v=>'<li>'+escape(v)+'</li>').join('')||'<li>لا يوجد ضمان بالانتقال للأداء الحقيقي: الأسعار والسبريد والانزلاق والسيولة تختلف.</li>';
  const audit=auditResults&&auditResults.signature===signature(s)?auditResults:null;
  if(audit){limit.innerHTML+='<li>'+escape('حساسية الفرضيات: '+audit.message)+'</li>';}
  copyText=[`مختبر أبحاث ICT بالعربي — ${m.symbol} / ${m.timeframe}`,`المصدر: ${m.source||'غير موضح'} · تحديث: ${iso(m.updatedAt)}`,`تغطية: ${s.bars.length} شمعة / ${metric(x.c.span,0)} يوم`,`الدراسة: ${x.a.n} صفقة، متوسط ${metric(x.a.mean,3)} R`,`التحقق: ${x.b.n} صفقة، متوسط ${metric(x.b.mean,3)} R، أقصى تراجع ${metric(x.b.dd)} R`,`الاستنتاج: ${x.level}`,'الملاحظات: '+x.reasons.join(' | '),'نتائج تاريخية بحثية، لا توصية ولا توقع أداء.'].join('\n');
  $('r14-copy').disabled=false;
 }
 function signature(s){return [s.metadata.symbol,s.metadata.timeframe,s.bars[0]?.time,s.bars.at(-1)?.time,s.bars.length,JSON.stringify(bridge.options())].join('|');}
 function runMain(){try{$('run-test').click();auditResults=null;lastAuditKey='';renderEvidence();}catch(e){$('r14-main-message').textContent='تعذر تشغيل الاختبار: '+e.message;}}
 function applyPreset(name){const presets={balanced:{lookback:8,structure:3,'sweep-age':6,rr:2,hold:48,fee:.05,'slippage-r':.02,'require-mss':true,'require-fvg':true,'trade-side':'both','research-session':'all','stop-mode':'sweep','stop-buffer':0},strict:{lookback:12,structure:5,'sweep-age':4,rr:2,hold:64,fee:.08,'slippage-r':.05,'require-mss':true,'require-fvg':true,'trade-side':'both','research-session':'all','stop-mode':'sweep','stop-buffer':10},explore:{lookback:6,structure:3,'sweep-age':8,rr:1.5,hold:36,fee:.05,'slippage-r':.03,'require-mss':true,'require-fvg':false,'trade-side':'both','research-session':'all','stop-mode':'sweep','stop-buffer':0}};
 if(!presets[name])return;for(const [id,v]of Object.entries(presets[name])){const el=$(id);if(!el)continue;if(el.type==='checkbox')el.checked=v;else el.value=String(v);}
 auditResults=null;lastAuditKey='';$('r14-robust-result').textContent='تم تغيير افتراضات القواعد. شغّل الاختبار ثم فحص المتانة لمراجعة النتائج الجديدة.';
 }
 function drill(tab,anchor){const button=document.querySelector(`[data-tab="${tab}"]`);if(button)button.click();const el=$(anchor)||$('panel-'+tab);el?.scrollIntoView({behavior:'smooth',block:'start'});}
 function robust(){const s=current();if(!s.bars.length){$('r14-robust-result').textContent='الاختبار غير متاح دون شموع صالحة.';return;}const opts=bridge.options(),key=signature(s);if(!s.trades.length){$('r14-robust-result').textContent='القواعد الحالية لم تنتج صفقات؛ جرّب نطاقًا تاريخيًا أطول أو تعريفًا واضحًا مختلفًا.';return;}
 const variants=[['الأساس',{}],['تكلفة أعلى +0.05R',{fee:Math.min(1,opts.fee+.05)}],['انزلاق أعلى +0.10R',{slippage:Math.min(1,opts.slippage+.10)}],['هدف أقل 0.5R',{rr:Math.max(.5,opts.rr-.5)}],['هدف أعلى 0.5R',{rr:Math.min(10,opts.rr+.5)}],['سيولة أضيق',{lookback:Math.max(3,opts.lookback-2)}],['سيولة أوسع',{lookback:Math.min(50,opts.lookback+2)}],['احتفاظ أقل',{hold:Math.max(1,opts.hold-12)}],['احتفاظ أطول',{hold:Math.min(250,opts.hold+12)}]];
 const outcome=[];try{for(const [name,change] of variants){const trade=Object.keys(change).length?bridge.simulate(change):s.trades;const sub=slices(s,trade);const tr=sample(sub.train),te=sample(sub.test);outcome.push({name,tr,te});}}catch(e){$('r14-robust-result').textContent='تعذّر تحليل الحساسية: '+e.message;return;}
 const usable=outcome.filter(x=>x.te.n>=30&&x.tr.n>=30),positive=usable.filter(x=>x.te.mean>0&&x.tr.mean>0),base=outcome[0];
 let message;if(base.te.n<30||base.tr.n<30)message='التحقق غير كافٍ؛ حساسية الافتراضات استكشافية فقط ولا تسمح باستنتاج متانة.';else if(usable.length<7)message='بعض السيناريوهات لا تملك صفقات كافية؛ النتيجة غير حاسمة.';else if(positive.length===usable.length)message='متوسط العائد موجب في السيناريوهات ذات العينات الكافية، لكن يلزم تحقق مستقل خارج هذه البيانات.';else message='بعض السيناريوهات تغيرت فيها النتيجة أو فقدت كفاية العينة؛ تجنّب اعتبار الإعدادات متينة.';
 auditResults={signature:key,message};lastAuditKey=key;
 $('r14-robust-result').innerHTML=`<div class="r14-audit-summary"><strong>${escape(message)}</strong><small>سيناريوهات ذات عينات كافية: ${usable.length} من ${outcome.length} · متوسط موجب في العينتين: ${positive.length} · حد الاستكشاف 30 صفقة لكل عينة</small></div><div class="r14-table-wrap"><table class="r14-audit-table"><thead><tr><th>السيناريو</th><th>صفقات التحقق</th><th>متوسط التحقق (R)</th><th>وضع الدليل</th></tr></thead><tbody>${outcome.map(v=>`<tr><td>${escape(v.name)}</td><td dir="ltr">${v.te.n}</td><td dir="ltr">${metric(v.te.mean,3)}</td><td>${v.tr.n<30||v.te.n<30?'عينة ضعيفة':v.tr.mean>0&&v.te.mean>0?'موجب بالعينة':'غير مستقر / غير موجب'}</td></tr>`).join('')}</tbody></table></div><p class="micro-note">حُسبت كل فرضية بالقواعد نفسها على سلسلة الأسعار الحالية مع تغيير متغير واحد. لا تعرض هذه المقارنة نتائج حية أو تمنع تحيز اختيار القواعد. المقارنات المتعددة تزيد خطر اختيار نتيجة مصادفة.</p>`;
 renderEvidence();
 }
 function renderPatterns(){const p=current().patterns,box=$('r14-pattern-insights');if(!p.length){box.textContent='لا توجد أمثلة شخصية بعد. ابدأ بتوثيق الحالات الفاشلة أيضًا لتقليل تحيز الانتقاء.';return;}
 const by=new Map();for(const x of p){const k=x.setup||'غير محدد',a=by.get(k)||{total:0,win:0,fail:0,pending:0};a.total++;if(x.outcome==='ناجح')a.win++;else if(x.outcome==='فاشل')a.fail++;else a.pending++;by.set(k,a);}
 const rows=[...by].sort((a,b)=>b[1].total-a[1].total).slice(0,8);
 box.innerHTML=`<p class="r14-summary-text">إجمالي ${p.length} مثال مسجل يدويًا. المقارنة تصف <strong>ما وثقته أنت</strong> ولا تمثل معدل نجاح قابلًا للتعميم.</p><div class="r14-table-wrap"><table class="r14-audit-table"><thead><tr><th>النموذج</th><th>مسجل</th><th>ناجح / فاشل</th><th>غير محسوم</th></tr></thead><tbody>${rows.map(([k,v])=>`<tr><td>${escape(k)}</td><td>${v.total}</td><td>${v.win} / ${v.fail}</td><td>${v.pending}</td></tr>`).join('')}</tbody></table></div><p class="micro-note">إذا كانت أمثلتك مختارة بعد ظهور النتيجة، فلا يمكن استخدامها لتقدير احتمال نجاح مستقبلي. سجّل كل الحالات وفق تعريف ثابت.</p>`;
 }
 function renderNotes(){const s=current(),a=storedNotes.filter(x=>x.asset===s.metadata.symbol&&x.frame===s.metadata.timeframe).slice(0,15);
 $('r14-replay-list').innerHTML=a.length?a.map(x=>`<article><b>${escape(({long:'شراء مشروط',short:'بيع مشروط',wait:'انتظار',avoid:'تجنب'})[x.view]||x.view)}</b><small dir="ltr">${escape(x.time.slice(0,16))} UTC</small><p>${escape(x.reason||'—')}</p></article>`).join(''):'<p class="micro-note">لا توجد قرارات مثبتة لهذا الأصل والإطار بعد.</p>';
 }
 function recordNote(){const s=current(),at=s.replayAt;if(!s.bars.length||at<1||at>s.bars.length){$('r14-replay-status').textContent='ابدأ إعادة التشغيل ببيانات صالحة أولًا.';return;}
 const reason=$('r14-replay-reason').value.trim();if(reason.length<8){$('r14-replay-status').textContent='اكتب سببًا واضحًا لا يقل عن 8 أحرف قبل تثبيت القرار.';return;}
 const x={asset:s.metadata.symbol||'',frame:s.metadata.timeframe||'',time:s.bars[at-1].time,view:$('r14-replay-view').value,reason:reason.slice(0,220),savedAt:new Date().toISOString()};
 const next=[x,...storedNotes].slice(0,150);try{localStorage.setItem(REVIEW_KEY,JSON.stringify(next));storedNotes=next;$('r14-replay-status').textContent='ثُبّت القرار عند الشمعة المكشوفة فقط. يمكن مراجعة الشموع التالية بعد الآن.';$('r14-replay-reason').value='';renderNotes();}catch{$('r14-replay-status').textContent='فشل الحفظ المحلي. صدّر نسختك قبل متابعة التدريب.';}
 }
 function saveJSON(){const s=current(),data={schema:'ict-research-replay-audit-v2',exportedAt:new Date().toISOString(),notes:storedNotes};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='ict-replay-decisions.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 function transformLayout(){const card=$('lookback')?.closest('.card');if(!card)return;
 const toolbar=card.querySelector('.actions');if(!toolbar)return;
 const mainRun=$('run-test'),exportBtn=$('export-trades');
 // Bring the two routine actions to the top; group expert diagnostics away from the default path.
 const tool= document.createElement('details');tool.className='r14-expert';tool.innerHTML='<summary>اختبارات الباحث المتقدمة · المقارنات والتحقق المتتابع</summary><div class="r14-expert-body"></div>';
 const inner=tool.querySelector('.r14-expert-body');for(const b of [...toolbar.children])if(b!==mainRun&&b!==exportBtn)inner.appendChild(b);
 toolbar.after(tool);const advanced=document.createElement('div');advanced.id='r14-advanced-config';advanced.hidden=true;advanced.className='r14-advanced-config';
 // Keep description and actions visible, move the detailed form controls under one disclosure.
 const firstField=card.querySelector('.field-grid');const ending=toolbar;
 if(firstField){let node=firstField;while(node&&node!==ending){const next=node.nextSibling;advanced.appendChild(node);node=next;} toolbar.before(advanced);}
 // Put 'advanced' toggle on the guided control, not inside original form.
 $('r14-advanced-toggle').addEventListener('click',()=>{advanced.hidden=!advanced.hidden;$('r14-advanced-toggle').setAttribute('aria-expanded',String(!advanced.hidden));$('r14-advanced-toggle').textContent=advanced.hidden?'إظهار إعدادات القواعد المتقدمة':'إخفاء إعدادات القواعد المتقدمة';});
 // Old diagnostic results remain available, but not five expanded blocks by default.
 const result=$('backtest-results')?.closest('.card');if(result){const extras=['rule-comparison','risk-sensitivity','research-stability','walk-forward-results','market-regime-results'].map($).filter(Boolean);if(extras.length){const d=document.createElement('details');d.className='r14-expert';d.innerHTML='<summary>التقارير البحثية التفصيلية · افتح عند الحاجة</summary><div class="r14-expert-body"></div>';extras[0].before(d);for(const el of extras)d.querySelector('div').appendChild(el);}}
 }
 function attach(){transformLayout();
 $('r14-preset').addEventListener('change',e=>applyPreset(e.target.value));
 $('r14-run').addEventListener('click',()=>{drill('strategy','r14-setup');runMain();});
 $('r14-audit').addEventListener('click',robust);
 $('r14-replay-record').addEventListener('click',recordNote);
 $('r14-replay-export').addEventListener('click',saveJSON);
 $('r14-copy').addEventListener('click',async()=>{if(!copyText)return;try{await navigator.clipboard.writeText(copyText);$('r14-copy').textContent='تم نسخ الملخص';}catch{$('r14-copy').textContent='النسخ غير متاح في هذا المتصفح';}});
 document.querySelectorAll('[data-r14-go]').forEach(btn=>btn.addEventListener('click',()=>{const choice=btn.dataset.r14Go;if(choice==='strategy')drill('strategy','r14-setup');else if(choice==='robust')drill('strategy','r14-robust');else if(choice==='replay')drill('replay','panel-replay');else drill('patterns','panel-patterns');}));
 // A light DOM observer mirrors the validated engine rather than re-fetching or storing prices.
 const results=$('backtest-results'),data=$('data-status'),patterns=$('pattern-list'),replay=$('replay-progress');let pending=false;
 function update(){if(pending)return;pending=true;setTimeout(()=>{pending=false;const s=current(),sig=signature(s)+':'+s.trades.length+':'+s.metadata.updatedAt;if(sig!==lastSignature){lastSignature=sig;if(lastAuditKey!==signature(s))auditResults=null;renderEvidence();renderNotes();}renderPatterns();},70);}
 for(const n of [results,data,patterns,replay])if(n)new MutationObserver(update).observe(n,{subtree:true,childList:true,characterData:true});
 ['public-history-symbol','public-history-timeframe','public-history-from','public-history-to'].forEach(id=>$(id)?.addEventListener('change',()=>{auditResults=null;lastSignature='';setTimeout(update,100);}));
 $('run-test')?.addEventListener('click',()=>{auditResults=null;lastSignature='';setTimeout(update,50);});
 renderEvidence();renderPatterns();renderNotes();update();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach);else attach();
})();
