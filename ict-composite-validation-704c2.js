/* ICT بالعربي 7.0 / 4C-2
 * Historical, completed-candle ONLY research evaluation of Sweep -> MSS -> FVG.
 * Model rules are frozen and non-optimised, OHLC cannot resolve intrabar order.
 * No brokerage fills, live signal, execution, or profitability assertion.
 */
(function(root,factory){'use strict';const api=factory(root&&root.ICTStructureEngine);if(typeof module==='object'&&module.exports)module.exports=factory(require('./ict-structure-engine-reference.js'));if(root)root.ICTCompositeValidation4C=api})(typeof globalThis!=='undefined'?globalThis:null,function(structure){
'use strict';
const VERSION='7.0.4c.2';
const RULES=Object.freeze({sweepToMss:12,mssToFvg:5,entryWindow:6,outcomeWindow:20,rr:2,pivot:2});
function isNum(x){return Number.isFinite(x)}
function summarize(rows,costR){const winners=rows.filter(r=>r.outcome==='win');const losers=rows.filter(r=>r.outcome==='loss');const settled=winners.length+losers.length;const sum=(winners.length*RULES.rr-losers.length)-settled*costR;return {total:rows.length,settled,wins:winners.length,losses:losers.length,misses:rows.filter(r=>r.outcome==='miss').length,invalid:rows.filter(r=>r.outcome==='invalid').length,uncertain:rows.filter(r=>r.outcome==='uncertain').length,winRate:settled?100*winners.length/settled:null,avgR:settled?sum/settled:null,netR:settled?sum:null}}
function nySession(time){const h=Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',hourCycle:'h23'}).format(new Date(time)));return h>=2&&h<5?'London KZ':h>=7&&h<10?'New York KZ':h>=10&&h<11?'Silver Bullet NY':'Other hours'}
function classify(candidate,bars,formedIndex){const {direction,entry,stop,target}=candidate;const bullish=direction==='bull';const end=Math.min(bars.length-1,formedIndex+RULES.entryWindow+RULES.outcomeWindow);let active=-1,checked=formedIndex,reason='',outcome='uncertain';
 for(let i=formedIndex+1;i<=end;i++){
  const c=bars[i];checked=i;const stopHit=bullish?c.low<=stop:c.high>=stop,goalHit=bullish?c.high>=target:c.low<=target,entryTouch=c.low<=entry&&c.high>=entry;
  if(active<0){
   // Invalidate a hypothesis when the candle CLOSES through the stop before an entry.
   if((bullish?c.close<=stop:c.close>=stop)){outcome='invalid';reason='إغلاق تجاوز الإبطال قبل الدخول';break}
   if(i-formedIndex>RULES.entryWindow){outcome='miss';reason='لم تحدث عودة لمنطقة الدخول خلال مدة التفعيل';break}
   if(!entryTouch)continue;
   active=i;
   // Intrabar ordering of entry vs either exit is not observable from OHLC.
   if(stopHit||goalHit){outcome='uncertain';reason='شمعة الدخول لامست الدخول والخروج؛ الترتيب غير معلوم';break}
  }else{
   if(stopHit&&goalHit){outcome='uncertain';reason='الهدف والإبطال في شمعة واحدة';break}
   if(stopHit||goalHit){outcome=goalHit?'win':'loss';reason=goalHit?'وصل هدف 2R بعد شمعة الدخول':'وصل الإبطال بعد شمعة الدخول';break}
   if(i-active>=RULES.outcomeWindow){outcome='uncertain';reason='انتهت نافذة التقييم دون هدف أو إبطال';break}
  }
 }
 if(!reason){if(active<0&&bars.length-1-formedIndex>=RULES.entryWindow){outcome='miss';reason='لم يحدث دخول خلال نافذة التفعيل'}else{outcome='uncertain';reason='تاريخ متابعة غير مكتمل لتقرير النتيجة'}}
 return {...candidate,outcome,reason,entryAt:active<0?null:bars[active].start,evaluatedThrough:bars[checked]?.start??candidate.formedAt};
}
function derive(candles,frame,now=Date.now()){
 if(!structure||!structure.analyze||!structure.normalize)throw Error('تعذّر تجهيز بيانات الاختبار.');
 const parsed=structure.normalize(candles,frame,now);if(parsed.rows.length<35)throw Error('نحتاج 35 شمعة مكتملة على الأقل');
 const analysis=structure.analyze(candles,frame,{pivot:RULES.pivot,now});
 const bars=parsed.segments.at(-1)||[],index=new Map(bars.map((c,i)=>[c.start,i]));
 if(bars.length<35)throw Error('أحدث فترة شموع متصلة قصيرة جدًا؛ لا يمكن اختبار تسلسل النموذج عبر فجوة');
 const events=analysis.events.filter(e=>index.has(e.at)),zones=analysis.zones.filter(z=>index.has(z.at));
 const candidates=[],keys=new Set();
 for(const mss of events.filter(e=>e.type==='MSS').sort((a,b)=>a.at-b.at)){
  const mi=index.get(mss.at),dir=mss.direction;
  const sweep=events.filter(e=>e.type==='SWEEP'&&e.direction===dir&&index.get(e.at)<mi&&mi-index.get(e.at)<=RULES.sweepToMss).sort((a,b)=>b.at-a.at)[0];
  if(!sweep)continue;const si=index.get(sweep.at);
  const fvg=zones.filter(z=>z.type==='FVG'&&z.direction===dir&&index.get(z.at)>=mi&&index.get(z.at)-mi<=RULES.mssToFvg).sort((a,b)=>a.at-b.at)[0];
  if(!fvg)continue;const fi=index.get(fvg.at);
  const key=[sweep.at,mss.at,fvg.at,dir].join(':');if(keys.has(key))continue;keys.add(key);
  const swept=bars[si];const entry=(fvg.low+fvg.high)/2;
  const stop=dir==='bull'?Math.min(swept.low,sweep.level):Math.max(swept.high,sweep.level);
  const risk=Math.abs(entry-stop);
  if(!isNum(entry)||!isNum(stop)||risk<=0||(dir==='bull'?stop>=fvg.low:stop<=fvg.high))continue;
  const target=dir==='bull'?entry+RULES.rr*risk:entry-RULES.rr*risk;
  const candidate={id:key,direction:dir,sweepAt:sweep.at,mssAt:mss.at,fvgAt:fvg.at,formedAt:bars[fi].start,entry,stop,target,gapLow:fvg.low,gapHigh:fvg.high,session:nySession(bars[fi].start)};
  candidates.push(classify(candidate,bars,fi));
 }
 candidates.sort((a,b)=>a.formedAt-b.formedAt);
 return {candidates,coverage:{bars:bars.length,from:bars[0].start,to:bars.at(-1).start,segments:parsed.segments.length,gaps:parsed.gaps.length,truncatedEvents:'هيكل 2D يرجع آخر 100 حدث و100 منطقة فقط؛ الاختبار لا يضمن شمول تاريخ أطول',source:'ICTStructureEngine 2D',rules:RULES}};
}
function validate(candles,frame,options={}){
 const costR=Number(options.costR??0.1),now=Number(options.now??Date.now());if(!isNum(costR)||costR<0||costR>2)throw Error('تكلفة R يجب أن تكون بين 0 و2');
 const scan=derive(candles,frame,now),rows=scan.candidates;const splitIndex=Math.max(1,Math.floor(rows.length*0.7));const testStart=rows[splitIndex]?.formedAt??null;
 const trainRaw=rows.slice(0,splitIndex),train=testStart==null?[]:trainRaw.filter(r=>r.evaluatedThrough<testStart),test=rows.slice(splitIndex),purged=trainRaw.length-train.length;
 const a=summarize(train,costR),b=summarize(test,costR);const adequate=a.settled>=10&&b.settled>=10;
 return {version:VERSION,method:'Sweep-MSS-FVG-pivot2-midpoint-2R-fixed',status:adequate?'exploratory_only':'insufficient_evidence',scope:'ONE composite research model, not all ICT playbooks',fullModelsImplemented:1,fullModelsValidated:0,train:a,test:b,purged,testStart,requiredSettledPerPeriod:10,coverage:scan.coverage,costR,candidates:rows,groups:[...new Set(test.map(r=>r.session))].map(session=>({session,...summarize(test.filter(r=>r.session===session),costR)})),notes:[
 'نموذج واحد فقط من النماذج الستة: سحب سيولة ثم MSS ثم FVG وفق تعريفات 2D؛ لا يثبت صحة ICT ككل',
 'القواعد ثابتة: تأكيد Pivot=2، أقصى 12 شمعة إلى MSS و5 إلى FVG و6 للدخول و20 للتقييم وهدف 2R',
 'الوقف عند طرف شمعة السحب/مستوى السيولة؛ الدخول عند منتصف FVG بعد اكتمال النموذج',
 'تُستبعد شمعة الدخول إذا لم يُعرف تسلسل لمس الدخول والخروج، وكذلك شمعة لمس الهدف والوقف معًا',
 `تقسيم زمني 70/30 على الحالات: ${purged} حالة تدريب حُذفت لتداخل نافذة تقييمها مع بداية الاختبار`,
 'لا يمنع الاختبار تداخل الصفقات أو عدم واقعية التنفيذ؛ النتائج ليست أرباح حساب أو عائد محفظة',
 'تحليل 2D يقتصر على الفترة المتصلة الأخيرة ويحتفظ بعدد محدود من الأحداث؛ العينة قد تكون صغيرة أو منحازة',
 'ليست بيانات Tick؛ السبريد والانزلاق والعمولات الحقيقية قد تختلف عن تكلفة R الافتراضية',
 'أوقات الجلسات مبنية على America/New_York؛ حدود الشموع الأصلية تعتمد على المصدر وإطاره',
 'التقسيم الزمني اختبار واحد فقط وليس Walk-Forward أو تجربة أمامية، ولا يسمح بتأكيد صلاحية النموذج وحده'
 ]};
}
return Object.freeze({VERSION,RULES,derive,validate,evaluateCandidate:classify});
});
