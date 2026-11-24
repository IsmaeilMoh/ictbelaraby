/* ICT بالعربي 7.0 — 4C.4 | Reproducible exploratory operational definitions.
 * No live signals. UTC timestamps, New York calendar/session rules, closed candles only.
 * OTE: 70.5% retracement of sweep→MSS impulse after FVG confirmation.
 * AMD: NY 00-05 accumulation / 05-10 manipulation / 05-16 distribution proxy.
 * Breaker: proxy for post-MSS retest of broken structural level, NOT verified order block.
 */
(function(root,factory){'use strict';const make=()=>factory(root?.ICTCompositeValidation4C,root?.ICTStructureEngine);
 if(typeof module==='object'&&module.exports)module.exports=factory(require('./ict-composite-validation-704c2.js'),require('./ict-structure-engine-reference.js'));
 if(root)root.ICTAdvancedValidation4C4=make();})(typeof globalThis!=='undefined'?globalThis:null,function(base,structure){'use strict';
const VERSION='7.0.4c.4', TZ='America/New_York', RR=2;
const RULES=Object.freeze({oteRatio:.705,amdAccumFrom:0,amdAccumTo:5,amdManipFrom:5,amdManipTo:10,amdDistributionTo:16,breakerToleranceATR:.2,minSettled:10});
const datefmt=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'});
function ny(t){const p=Object.fromEntries(datefmt.formatToParts(new Date(t)).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));return {date:`${p.year}-${p.month}-${p.day}`,hour:Number(p.hour)}}
function summary(rows,cost){const wins=rows.filter(x=>x.outcome==='win').length,losses=rows.filter(x=>x.outcome==='loss').length,settled=wins+losses;return {total:rows.length,settled,wins,losses,misses:rows.filter(x=>x.outcome==='miss').length,invalid:rows.filter(x=>x.outcome==='invalid').length,uncertain:rows.filter(x=>x.outcome==='uncertain').length,winRate:settled?100*wins/settled:null,avgR:settled?(2*wins-losses-cost*settled)/settled:null}}
function split(rows,cost){rows=rows.slice().sort((a,b)=>a.formedAt-b.formedAt);const k=Math.max(1,Math.floor(rows.length*.7)),cut=rows[k]?.formedAt??null,train=rows.slice(0,k).filter(r=>cut!=null&&r.evaluatedThrough<cut),test=rows.slice(k),a=summary(train,cost),b=summary(test,cost);return {train:a,test:b,purged:k-train.length,candidates:rows,status:a.settled>=RULES.minSettled&&b.settled>=RULES.minSettled?'exploratory_only':'insufficient_evidence'}}
function validate(candles,frame,opts={}){
 if(!base?.derive||!base?.evaluateCandidate||!structure?.normalize)throw Error('يجب تحميل محركي 2D و4C.2');
 const cost=Number(opts.costR??.1),now=Number(opts.now??Date.now());if(!Number.isFinite(cost)||cost<0||cost>2)throw Error('تكلفة R بين 0 و2');
 const scan=base.derive(candles,frame,now),segments=structure.normalize(candles,frame,now).segments,bars=segments.at(-1)||[],idx=new Map(bars.map((c,i)=>[c.start,i]));
 const candidateRows={ote:[],amd:[],breakerProxy:[]};const rejected={ote:0,amd:0,breakerProxy:0};
 function finish(model,c,entry,stop,extra={}){const bullish=c.direction==='bull',risk=Math.abs(entry-stop);if(!Number.isFinite(risk)||risk<=0||(bullish?entry<=stop:entry>=stop))return null;const formIndex=idx.get(c.formedAt);if(formIndex==null)return null;return base.evaluateCandidate({...c,model,entry,stop,target:bullish?entry+2*risk:entry-2*risk,...extra},bars,formIndex)}
 for(const c of scan.candidates){const si=idx.get(c.sweepAt),mi=idx.get(c.mssAt),fi=idx.get(c.fvgAt);if(si==null||mi==null||fi==null){for(const k of Object.keys(rejected))rejected[k]++;continue}
  // OTE anchors are known at formation, never chosen using later price bars.
  const impulse=bars.slice(si,mi+1),extreme=c.direction==='bull'?Math.max(...impulse.map(x=>x.high)):Math.min(...impulse.map(x=>x.low)),origin=c.direction==='bull'?bars[si].low:bars[si].high;
  const entry=extreme+(origin-extreme)*RULES.oteRatio,stop=c.stop;
  const validRange=c.direction==='bull'?entry>=c.gapLow&&entry<=c.gapHigh:entry>=c.gapLow&&entry<=c.gapHigh;
  const o=validRange&&finish('ote',c,entry,stop,{evidence:'70.5% impulse retracement inside confirmed FVG'});
  if(o)candidateRows.ote.push(o);else rejected.ote++;
  // NY calendar accumulation window; exclude incomplete history from either side of the boundary.
  const sweepNY=ny(c.sweepAt),mssNY=ny(c.mssAt),fvgNY=ny(c.fvgAt);
  const prior=bars.filter(b=>{const d=ny(b.start);return d.date===sweepNY.date&&d.hour>=0&&d.hour<5&&b.start<c.sweepAt});
  const expected=Math.ceil(5*60/Number(frame));const complete=prior.length>=expected&&prior.length<=expected+1;
  const high=complete?Math.max(...prior.map(x=>x.high)):NaN,low=complete?Math.min(...prior.map(x=>x.low)):NaN;
  const touched=c.direction==='bull'?bars[si].low<low:bars[si].high>high;
  const amd=complete&&sweepNY.hour>=5&&sweepNY.hour<10&&mssNY.date===sweepNY.date&&fvgNY.date===sweepNY.date&&fvgNY.hour<16&&touched&&finish('amd',c,c.entry,c.stop,{accumulationHigh:high,accumulationLow:low,evidence:'NY 00-05 range swept 05-10 followed by confirmed MSS FVG before 16'});
  if(amd)candidateRows.amd.push(amd);else rejected.amd++;
  // Breaker PROXY only: former structural price near MSS body, not order-block identification.
  const m=bars[mi],bodyLow=Math.min(m.open,m.close),bodyHigh=Math.max(m.open,m.close);
  const local=bars.slice(Math.max(0,mi-12),mi).map(b=>b.high-b.low).filter(Number.isFinite),atr=local.reduce((a,b)=>a+b,0)/(local.length||1);
  const level=c.direction==='bull'?bodyHigh:bodyLow;
  const near=c.gapLow-RULES.breakerToleranceATR*atr<=level&&level<=c.gapHigh+RULES.breakerToleranceATR*atr;
  const br=local.length>=8&&atr>0&&near&&finish('breaker-proxy',c,level,c.stop,{level,evidence:'MSS body boundary near FVG; proxy only, no order-block lineage'});
  if(br)candidateRows.breakerProxy.push(br);else rejected.breakerProxy++;
 }
 const models={ote:{label:'OTE 70.5% + FVG confluence — تعريف بحثي',...split(candidateRows.ote,cost),excluded:rejected.ote},amd:{label:'AMD نيويورك — تراكم/سحب/توزيع (تقريب بحثي)',...split(candidateRows.amd,cost),excluded:rejected.amd},breakerProxy:{label:'Breaker candidate — تقريب غير مثبت، وليس Breaker Block كاملًا',...split(candidateRows.breakerProxy,cost),excluded:rejected.breakerProxy}};
 return {version:VERSION,source:'4C.2 confirmed composite event stream',coverage:scan.coverage,costR:cost,models,notes:[
 'تستخدم هذه الاختبارات فقط آخر مقطع متصل من شموع المصدر المكتملة؛ 4C.2 يحتفظ بعدد محدود من أحداث 2D.',
 'OTE: تصحيح 70.5% من حركة طرف شمعة السحب إلى أقصى سعر حتى MSS، مشروط بوقوع منطقة الدخول داخل FVG مؤكدة. هذا تعريف بحثي مخصص، وليس شرط ICT موحدًا.',
 'AMD: نطاق تراكم 00:00–05:00 نيويورك مكتمل على الإطار المختار، سحب 05:00–10:00، ثم MSS وFVG قبل 16:00 من يوم نيويورك نفسه؛ لا يثبت أن التراكم كان أفقيًا.',
 'Breaker: تقريب أولي يعيد اختبار حد جسم شمعة MSS قرب FVG؛ لا يثبت أن شمعة Order Block فشلت وتحولت إلى Breaker. لا تستخدم نتائجه لاعتماد استراتيجية Breaker.',
 'الفترة 70% للتطوير و30% لاحقة؛ يُستبعد من التدريب ما يتداخل مع بدء الاختبار. ليست تجربة أمامية أو Walk-Forward.',
 'النتائج البحثية الافتراضية لا تتضمن تنفيذ Tick أو تكاليف حقيقية أو معالجة التداخل بين الصفقات؛ ليست إشارات حية أو دليل ربحية.',
 'يُعد الهدف والوقف في شمعة واحدة غير حاسمين؛ النوافذ الزمنية تعتمد America/New_York وDST تلقائيًا.'
 ]};
}
return Object.freeze({VERSION,RULES,ny,validate,split});
});
