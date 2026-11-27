/* ICT بالعربي | Stage 2E, deterministic research setups. No order placement. */
(function(root,factory){'use strict';const api=factory(root&&root.ICTStructureEngine);if(typeof module==='object'&&module.exports)module.exports=factory(require('../ict_phase2d/ict-structure-engine-702d.js'));if(root)root.ICTSignalEngine=api})(typeof globalThis!=='undefined'?globalThis:null,function(structure){
'use strict';
const CONFIG=Object.freeze({maxSweepToMSS:12,maxFVGAfterMSS:5,maxSignalAgeBars:6,rewardMultiple:2});
function researchState(bars,formedIndex,direction,zone,stop,ms){
 const formed=bars[formedIndex].start+ms;
 const next=bars[formedIndex+1];
 let state=next?{phase:'awaiting_confirmation',at:next.start+ms}:{phase:'observed',at:formed};
 let touched=false;
 for(const [i,bar] of bars.slice(formedIndex+1).entries()){
  const at=bar.start+ms;
  if(i>=CONFIG.maxSignalAgeBars)return {phase:'expired',at};
  if(direction==='bull'?bar.low<=stop:bar.high>=stop)return {phase:'invalidated',at};
  touched ||= bar.low<=zone.high&&bar.high>=zone.low;
  if(touched&&state.phase!=='confirmed_research'&&(direction==='bull'?bar.close>zone.high:bar.close<zone.low)){
   state={phase:'confirmed_research',at};
  }
 }
 return state;
}
function evaluate(candles,frame,opts={}){
 if(!structure)throw Error('تعذّر تحميل أداة هيكل السوق.');const analysis=structure.analyze(candles,frame,{...opts,fullEvidence:true,allowInsufficient:opts.displayCompleteModels}),normalized=structure.normalize(candles,frame,opts.now||Date.now());
 const bars=normalized.segments.at(-1)||[],ms=structure.FRAME_MS[String(frame)];
 if(!analysis.eligible)return {analysis,modelCount:0,models:[],reason:'الفترة الأخيرة لا تحتوي شموعًا متصلة كافية'};
 const indexes=new Map(bars.map((b,i)=>[b.start,i]));const events=analysis.events.filter(x=>indexes.has(x.at)),zones=analysis.zones.filter(x=>indexes.has(x.at));const models=[];const seen=new Set();
 // A confirmed sweep must precede an opposite-direction MSS. The FVG must follow the sweep and be within the existing 2-before / 5-after MSS window.
 for(const sweep of events.filter(x=>x.type==='SWEEP')){
  const si=indexes.get(sweep.at),opposite=sweep.direction;
  for(const mss of events.filter(x=>x.type==='MSS'&&x.direction===opposite)){
   const mi=indexes.get(mss.at);if(mi<=si||mi-si>CONFIG.maxSweepToMSS)continue;
   const compatible=zones.filter(z=>z.direction===opposite&&indexes.get(z.at)>si&&indexes.get(z.at)>=mi-2&&indexes.get(z.at)<=mi+CONFIG.maxFVGAfterMSS);
   for(const zone of (opts.displayCompleteModels?compatible:compatible.slice(0,1))){
   const zi=indexes.get(zone.at),formedIndex=Math.max(mi,zi),formed=bars[formedIndex];
   // The setup is not known until *all three* steps have closed; fixed entry/stop are only an illustrative trade plan.
   const zoneTouched=bars.slice(zi+1).some(b=>b.low<=zone.high&&b.high>=zone.low);
   const sweptBar=bars[si],entry=(zone.low+zone.high)/2,stop=opposite==='bull'?Math.min(sweptBar.low,sweep.level):Math.max(sweptBar.high,sweep.level),risk=Math.abs(entry-stop);
   const target=opposite==='bull'?entry+CONFIG.rewardMultiple*risk:entry-CONFIG.rewardMultiple*risk;
   const validRisk=(opts.displayCompleteModels||Number.isFinite(target)&&target>0)&&(opposite==='bull'?stop<zone.low:stop>zone.high);
   const invalidAtFormation=bars.slice(si+1,formedIndex+1).some(b=>opposite==='bull'?b.low<=stop:b.high>=stop);
   const age=bars.length-1-formedIndex,invalid=bars.slice(si+1).some(b=>opposite==='bull'?b.low<=stop:b.high>=stop);
   const expired=age>CONFIG.maxSignalAgeBars;
   const status=!validRisk||risk<=0?'no-risk-plan':invalid?'invalidated':expired?'expired':zoneTouched?'retested':'watching';
   const key=[opts.market||'unknown',opts.symbol||'unknown',frame,sweep.at,mss.at,zone.at,opposite].join('|');if(seen.has(key))continue;seen.add(key);
   models.push({id:key,direction:opposite,status,research:!validRisk||invalidAtFormation?null:researchState(bars,formedIndex,opposite,zone,stop,ms),formedAt:formed.start+ms,sweepAt:sweep.at,mssAt:mss.at,fvgAt:zone.at,level:sweep.level,zone:{low:zone.low,high:zone.high},entry:validRisk?entry:null,stop:validRisk?stop:null,target:validRisk?target:null,rr:validRisk?CONFIG.rewardMultiple:null,ageBars:age,confirmation:'سحب سيولة ثم MSS معاكس ثم FVG من شموع مغلقة',sourceBars:analysis.sourceBars});
   }
  }
 }
 return {analysis,modelCount:models.length,models:models.sort((a,b)=>b.formedAt-a.formedAt).slice(0,opts.displayCompleteModels?models.length:40),reason:models.length?'':'لم يكتمل النموذج المركب في العينة المتصلة الأخيرة'};
}
return Object.freeze({CONFIG,evaluate,researchState});
});
