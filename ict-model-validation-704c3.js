/* ICT بالعربي — 4C.3: research-only operational filters for Silver Bullet and 2022 model.
   All timestamps stored UTC; session conditions evaluated in America/New_York. */
(function(root,factory){'use strict';const api=factory(root&&root.ICTCompositeValidation4C,root&&root.ICTStructureEngine);if(typeof module==='object'&&module.exports)module.exports=factory(require('./ict-composite-validation-704c2.js'),require('./ict-structure-engine-reference.js'));if(root)root.ICTModelValidation4C3=api})(typeof globalThis!=='undefined'?globalThis:null,function(base,structure){'use strict';
const VERSION='7.0.4c.3',tz='America/New_York';
const RULES=Object.freeze({silverBulletWindows:[[3,4],[10,11],[14,15]],displacementRatio:1.5,medianWindow:12,bodyFloor:0});
function num(x){return Number.isFinite(x)}
function nyParts(t){const parts=new Intl.DateTimeFormat('en-US',{timeZone:tz,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(t));return {h:Number(parts.find(p=>p.type==='hour')?.value),m:Number(parts.find(p=>p.type==='minute')?.value)}}
function silverBulletMatch({sweepAt,mssAt,fvgAt}){
 return [sweepAt,mssAt,fvgAt].every(inSilverBullet)&&nyParts(sweepAt).h===nyParts(mssAt).h&&nyParts(mssAt).h===nyParts(fvgAt).h&&fvgAt>=mssAt&&fvgAt-sweepAt<3600000;
}
function inSilverBullet(t){const {h,m}=nyParts(t);return RULES.silverBulletWindows.some(([start,end])=>h*60+m>=start*60&&h*60+m<end*60)}
function median(v){const a=v.slice().sort((a,b)=>a-b),n=a.length;return n?a.length%2?a[(n-1)/2]:(a[n/2-1]+a[n/2])/2:NaN}
function displacementEvidence(candidate,bars,index){const i=index.get(candidate.mssAt),sweepIndex=index.get(candidate.sweepAt);if(i==null||sweepIndex==null)return {pass:false,reason:'لا توجد شمعة MSS في المقطع المتصل'};
 // Only use candles ending at MSS; never use bars after the event to select displacement.
 for(let j=Math.max(12,i-2,sweepIndex);j<=i;j++){
  const c=bars[j];if(!c)continue;const prev=bars.slice(j-12,j);if(prev.length<12)continue;
  const baseBody=median(prev.map(b=>Math.abs(b.close-b.open))),body=Math.abs(c.close-c.open);
  const directional=candidate.direction==='bull'?c.close>c.open:c.close<c.open;
  const closesBeyond=candidate.direction==='bull'?c.close>Math.max(...prev.map(b=>b.high)):c.close<Math.min(...prev.map(b=>b.low));
  if(directional&&closesBeyond&&num(body)&&body>Math.max(RULES.bodyFloor,baseBody*RULES.displacementRatio))return {pass:true,at:c.start,ratio:baseBody>0?body/baseBody:null};
 }
 return {pass:false,reason:'لا توجد إزاحة باتجاه MSS بمتن 1.5× الوسيط وإغلاق خارج نطاق 12 شمعة سابقة'};
}
function summarize(rows,costR,rr){const wins=rows.filter(r=>r.outcome==='win').length,losses=rows.filter(r=>r.outcome==='loss').length,settled=wins+losses,net=(wins*rr-losses)-(settled*costR);return {total:rows.length,settled,wins,losses,misses:rows.filter(r=>r.outcome==='miss').length,invalid:rows.filter(r=>r.outcome==='invalid').length,uncertain:rows.filter(r=>r.outcome==='uncertain').length,winRate:settled?wins/settled*100:null,avgR:settled?net/settled:null,netR:settled?net:null}}
function evalRows(rows,costR,rr){rows=rows.slice().sort((a,b)=>a.formedAt-b.formedAt);const cut=Math.max(1,Math.floor(rows.length*.7)),testStart=rows[cut]?.formedAt??null,raw=rows.slice(0,cut),train=testStart==null?[]:raw.filter(r=>r.evaluatedThrough<testStart),test=rows.slice(cut);const tr=summarize(train,costR,rr),te=summarize(test,costR,rr);return {train:tr,test:te,purged:raw.length-train.length,testStart,status:tr.settled>=10&&te.settled>=10?'exploratory_only':'insufficient_evidence',candidates:rows}}
function validate(candles,frame,opts={}){
 if(!base||!base.derive||!structure||!structure.normalize)throw Error('تعذّر تجهيز بيانات الاختبار.');
 const costR=Number(opts.costR??.1),now=Number(opts.now??Date.now());if(!num(costR)||costR<0||costR>2)throw Error('التكلفة يجب أن تكون بين 0 و2 R');
 const scan=base.derive(candles,frame,now),parsed=structure.normalize(candles,frame,now),bars=parsed.segments.at(-1)||[],index=new Map(bars.map((b,i)=>[b.start,i]));
 const silver=scan.candidates.filter(silverBulletMatch).map(r=>({...r,model:'silver-bullet'}));
 const full=scan.candidates.map(r=>({r,e:displacementEvidence(r,bars,index)}));const mentorship=full.filter(x=>x.e.pass).map(x=>({...x.r,model:'2022-research',displacement:x.e}));
 return {version:VERSION,coverage:scan.coverage,source:'2D events + 4C.2 composite + 4C.3 independent checks',costR,
  models:{silverBullet:{...evalRows(silver,costR,base.RULES.rr),label:'Silver Bullet — تعريف بحثي بوقت نيويورك',excluded:scan.candidates.length-silver.length},mentorship2022:{...evalRows(mentorship,costR,base.RULES.rr),label:'2022 Model — تعريف بحثي مشروط بالإزاحة',excluded:full.length-mentorship.length}},
  assumptions:['يجب وقوع Sweep وMSS وFVG بالترتيب داخل الساعة نفسها من نوافذ 03–04 أو 10–11 أو 14–15 نيويورك لنموذج Silver Bullet البحثي. هذا تضييق مُعلن على الاستعمالات الممكنة، وليس نصًا مقدسًا.', 'يشترط نموذج 2022 البحثي إزاحة مع MSS أو خلال شمعتين سابقتين، بمتن شمعة أكبر من 1.5× وسيط أجسام آخر 12 شمعة، وإغلاق خلف نطاقها في اتجاه الحدث.', 'جميع الإشارات مستمدة من النموذج المركب 4C.2؛ لا إضافة نتائج مستقبلية لتأكيد شروط التكوين.', 'إحصاءات البحث لا تعتبر إثبات ربحية؛ لا سبريد حقيقي أو تنفيذ Tick ولا معالجة كاملة لتداخل الصفقات.', 'لا تظهر صلاحية تاريخية عند نقص العينة، وتُستبعد حالات التدريب المتداخلة زمنيًا مع فترة الاختبار.', 'حدود الشموع الأصلية تعتمد على المصدر؛ أوقات النوافذ تقاس على America/New_York مع تغيّر DST.']};
}
return Object.freeze({VERSION,RULES,nyParts,inSilverBullet,silverBulletMatch,displacementEvidence,validate});
});
