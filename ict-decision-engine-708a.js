/* ICT بالعربي 7.0/8A: conservative multi-engine coordination, NOT trade execution. */
(function(root,factory){'use strict';const api=factory(typeof module==='object'&&module.exports?require('./ict-public-markets-702c2.js'):root.ICTPublicMarkets);if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.ICTDecisionEngine708A=api})(typeof globalThis!=='undefined'?globalThis:null,function(traditional){
'use strict';
const MIN=60000;
const knownMarkets=new Set(['crypto','kraken','forex','metals','indices','stocks','energy']);
function nearNews(events,market,symbol,now){const relevant=market==='forex'?[symbol.slice(0,3),symbol.slice(3,6)]:market==='crypto'?['USD']:['USD'];return (events||[]).filter(e=>e&&Number.isFinite(e.when)&&relevant.includes(e.currency)&&Math.abs(e.when-now)<=30*MIN).sort((a,b)=>Math.abs(a.when-now)-Math.abs(b.when-now)).slice(0,8)}
const contextFrame=frame=>({'60':'240','240':'D'}[String(frame)]||'60');
function strongDisplacement(bars,index,bullish){
 if(index<12)return false;
 const bar=bars[index];
 const bodies=bars.slice(index-12,index).map(candle=>Math.abs(candle.close-candle.open)).sort((a,b)=>a-b);
 const median=(bodies[5]+bodies[6])/2,body=bullish?bar.close-bar.open:bar.open-bar.close;
 return body>1.5*median;
}
function displacementLeg(model,bars,index,events){
 const sweep=index.get(model.sweepAt),mss=index.get(model.mssAt);
 if(sweep==null||mss==null||mss<12||mss<=sweep)return null;
 const bullish=model.direction==='bull',bar=bars[mss];
 const breakEvent=events.find(event=>event.type==='MSS'&&event.direction===model.direction&&event.at===model.mssAt);
 if(!breakEvent||!(bullish?bar.close>breakEvent.level:bar.close<breakEvent.level))return null;
 if(!strongDisplacement(bars,mss,bullish))return null;
 const leg=bars.slice(sweep,mss+1);
 const low=bullish?bars[sweep].low:Math.min(...leg.map(bar=>bar.low));
 const high=bullish?Math.max(...leg.map(bar=>bar.high)):bars[sweep].high;
 return high>low?{low,high,midpoint:(low+high)/2,displacementAt:bar.start}:null;
}
function displacementRange(model,bars,index,events,maxFvgLag=1,minFvgLag=0){
 const mss=index.get(model.mssAt),fvg=index.get(model.fvgAt);
 if(mss==null||fvg==null||fvg-mss<minFvgLag||fvg-mss>maxFvgLag)return null;
 return displacementLeg(model,bars,index,events);
}
// Use only volatility and structure known when the model formed.
function structuralStop(model,bars,structures){
 const before=bars.filter(bar=>bar.start<model.formedAt);
 const ranges=before.slice(-20).map(bar=>bar.high-bar.low).sort((a,b)=>a-b);
 if(ranges.length<12)return null;
 const median=(ranges[Math.floor((ranges.length-1)/2)]+ranges[Math.floor(ranges.length/2)])/2;
 if(!(median>0))return null;
 const bullish=model.direction==='bull',side=bullish?1:-1;
 const type=bullish?'swing-low':'swing-high';
 const swept=before.find(bar=>bar.start===model.sweepAt);
 const anchors=swept?[{level:bullish?swept.low:swept.high,type:'sweep',at:swept.start,frame:structures[0].frame}]:[];
 for(const {pivots,ms,frame} of structures){
  for(const pivot of pivots){
   if(pivot.type===type&&pivot.start>=before[0].start&&pivot.confirmedAt+ms<=model.formedAt)
    anchors.push({level:pivot.level,type,at:pivot.start,frame});
  }
 }
 const buffer=median*0.05, minimum=median*0.25;
 return anchors.filter(anchor=>{
  const distance=side*(model.entry-anchor.level);
  return distance+buffer>=minimum&&side*(model.stop-anchor.level)>=0&&
   !before.some(bar=>bar.start>anchor.at&&(bullish?bar.low<anchor.level:bar.high>anchor.level));
 }).sort((a,b)=>side*(b.level-a.level))
  .map(anchor=>({stop:anchor.level-side*buffer,stopLiquidity:anchor}))
  .find(plan=>plan.stop>0)||null;
}
function liquidityPlan(model,bars,structures,range,{focused=true}={}){
 const bullish=model.direction==='bull';
 if(focused&&(!range||(bullish?model.entry>=range.midpoint:model.entry<=range.midpoint)))return null;

 const risk=Math.abs(model.entry-model.stop),side=bullish?1:-1;
 const type=bullish?'swing-high':'swing-low';
 const touches=(bar,level)=>bullish?bar.high>=level:bar.low<=level;
 let best=null,interveningLiquidity=null;
 for(const {pivots,ms,frame} of structures){
  for(const pivot of pivots){
   // Verify the entire post-pivot price path using the contiguous entry candles.
   if(pivot.type!==type||pivot.start<bars[0].start||pivot.confirmedAt+ms>model.formedAt)continue;
   const rr=side*(pivot.level-model.entry)/risk;
   if(!Number.isFinite(rr)||rr<=0)continue;
   if(bars.some(bar=>bar.start>=pivot.start+ms&&bar.start<model.formedAt&&touches(bar,pivot.level)))continue;
   const liquidity={type,frame,at:pivot.start};
   if(rr<2){
    if(!interveningLiquidity||rr<interveningLiquidity.rr)interveningLiquidity={level:pivot.level,rr,...liquidity};
   }else if(!best||rr<best.rr){
    best={target:pivot.level,rr,liquidity};
   }
  }
 }
 if(!best)return null;
 return {...best,range,interveningLiquidity,targetTouched:bars.some(bar=>bar.start>=model.formedAt&&touches(bar,best.target))};
}
// Turtle Soup uses a reclaimed swing and a subsequent MSS as its entry evidence.
function turtleSoup(bars,index,events,ms,market,symbol,frame){
 const candidates=[];
 const shifts=events.filter(event=>event.type==='MSS');
 for(const sweep of events.filter(event=>event.type==='SWEEP')){
  const si=index.get(sweep.at),swept=bars[si];
  if(!swept)continue;
  const bullish=sweep.direction==='bull',entry=sweep.level,stop=bullish?swept.low:swept.high;
  if(!Number.isFinite(entry)||!(bullish?stop<entry:stop>entry))continue;
  const shift=shifts.find(event=>event.direction===sweep.direction&&event.at>sweep.at&&event.at<=sweep.at+5*ms);
  if(!shift)continue;
  const mi=index.get(shift.at),ageBars=bars.length-1-mi;
  if(mi==null||ageBars>12)continue;
  const sinceSweep=bars.slice(si+1,mi+1);
  if(sinceSweep.some(bar=>bullish?bar.low<=stop:bar.high>=stop))continue;
  const leg=bars.slice(si,mi+1);
  const low=Math.min(...leg.map(bar=>bar.low)),high=Math.max(...leg.map(bar=>bar.high));
  const tested=bars.slice(mi+1).some(bar=>bullish?bar.low<=entry:bar.high>=entry);
  const formedAt=shift.at+ms;
  candidates.push({
   id:[market,symbol,frame,'turtle-soup',sweep.at,shift.at].join('|'),
   direction:sweep.direction,entry,stop,formedAt,ageBars,sweepAt:sweep.at,mssAt:shift.at,
   status:tested?'retested':'watching',research:{phase:'observed',at:formedAt},modelType:'turtle-soup',
   confirmation:'Turtle Soup · كسر كاذب ثم تغيّر الهيكل',
   range:{low,high,midpoint:(low+high)/2,displacementAt:shift.at}
  });
 }
 return candidates;
}
function inversionFvg(bars,index,analysis,ms,market,symbol,frame){
 const shifts=new Map(analysis.events.filter(event=>event.type==='MSS').map(event=>[event.at,event.direction]));
 const candidates=[];
 for(const zone of analysis.zones){
  const start=index.get(zone.at);
  if(start==null||start<2)continue;
  const bullish=zone.direction==='bear',direction=bullish?'bull':'bear';
  const flips=bar=>bullish?bar.close>zone.high:bar.close<zone.low;
  const offset=bars.slice(start+1,start+21).findIndex(flips);
  if(offset<0)continue;
  const inversion=start+1+offset;
  if(bars.length-1-inversion>12)continue;
  const candle=bars[inversion];
  if(shifts.get(candle.start)!==direction)continue;
  const entry=(zone.high+zone.low)/2,stop=bullish?zone.low:zone.high;
  const leg=bars.slice(start-2,inversion+1);
  const low=Math.min(...leg.map(bar=>bar.low)),high=Math.max(...leg.map(bar=>bar.high));
  const tested=bars.slice(inversion+1).some(bar=>bullish?bar.low<=zone.high:bar.high>=zone.low);
  const formedAt=candle.start+ms;
  candidates.push({
   id:[market,symbol,frame,'ifvg',zone.at,candle.start,direction].join('|'),
   direction,entry,stop,formedAt,ageBars:bars.length-1-inversion,mssAt:candle.start,fvgAt:zone.at,
   status:tested?'retested':'watching',research:{phase:'observed',at:formedAt},modelType:'ifvg',
   confirmation:'IFVG · إغلاق يعكس الفجوة ويكسر الهيكل',zone:{low:zone.low,high:zone.high},
   range:{low,high,midpoint:(low+high)/2,displacementAt:candle.start}
  });
 }
 return candidates;
}
function continuationCandidates(bars,index,analysis,ms,market,symbol,frame){
 const candidates=[];
 for(const event of analysis.events){
  if(event.type!=='BOS'||event.note)continue;
  const bos=index.get(event.at);
  if(bos==null||bars.length-1-bos>13)continue;
  const bullish=event.direction==='bull';
  if(!strongDisplacement(bars,bos,bullish))continue;
  const zone=analysis.zones.find(gap=>gap.direction===event.direction&&
   (gap.at===event.at||gap.at===event.at+ms));
  if(!zone)continue;
  const end=index.get(zone.at);
  if(end==null||bars.length-1-end>12)continue;
  const pivot=analysis.pivots.filter(item=>item.type===(bullish?'swing-low':'swing-high')&&
   index.has(item.start)&&item.confirmedAt+ms<=event.at).at(-1);
  if(!pivot)continue;
  const entry=(zone.low+zone.high)/2,stop=pivot.level;
  if(!(bullish?stop<zone.low:stop>zone.high))continue;
  const afterPivot=bars.slice(index.get(pivot.start)+1,end+1);
  if(afterPivot.some(bar=>bullish?bar.low<=stop:bar.high>=stop))continue;
  const leg=bars.slice(index.get(pivot.start),bos+1);
  const low=Math.min(...leg.map(bar=>bar.low)),high=Math.max(...leg.map(bar=>bar.high));
  const tested=bars.slice(end+1).some(bar=>bullish?bar.low<=zone.high:bar.high>=zone.low);
  const formedAt=zone.at+ms;
  candidates.push({
   id:[market,symbol,frame,'bos-fvg',event.at,zone.at].join('|'),direction:event.direction,entry,stop,formedAt,
   ageBars:bars.length-1-end,mssAt:event.at,fvgAt:zone.at,modelType:'bos-fvg',
   status:tested?'retested':'watching',research:{phase:'observed',at:formedAt},
   confirmation:'BOS → FVG · استمرار الهيكل',zone:{low:zone.low,high:zone.high},
   range:{low,high,midpoint:(low+high)/2,displacementAt:event.at}
  });
 }
 return candidates;
}
// OTE, AMD and Breaker have their own entry zones. None requires an FVG.
function structureModels(bars,index,analysis,ms,market,symbol,frame,signalEngine,advanced){
 if(!advanced)return [];
 const candidates=[];
 const shifts=analysis.events.filter(event=>event.type==='MSS');
 const sweeps=analysis.events.filter(event=>event.type==='SWEEP');
 for(const shift of shifts){
  const mi=index.get(shift.at);
  const sweep=sweeps.findLast(event=>event.direction===shift.direction&&event.at<shift.at&&
   index.has(event.at)&&mi-index.get(event.at)<=signalEngine.CONFIG.maxSweepToMSS);
  if(mi==null||!sweep)continue;
  const si=index.get(sweep.at),bullish=shift.direction==='bull';
  const leg=bars.slice(si,mi+1);
  const origin=bullish?bars[si].low:bars[si].high;
  const extreme=bullish?Math.max(...leg.map(b=>b.high)):Math.min(...leg.map(b=>b.low));
  if(bullish?extreme<=origin:extreme>=origin)continue;
  if(leg.slice(1).some(b=>bullish?b.low<=origin:b.high>=origin))continue;
  const low=Math.min(origin,extreme),high=Math.max(origin,extreme);
  const range={low,high,midpoint:(low+high)/2,displacementAt:shift.at};
  const evidence={direction:shift.direction,sweepAt:sweep.at,mssAt:shift.at};
  const add=(modelType,zone,entry,stop,formation,confirmation,research)=>{
   if(bars.length-1-formation>12||(bullish?stop>=entry:stop<=entry))return;
   const formedAt=bars[formation].start+ms;
   const state=research||signalEngine.researchState(bars,formation,shift.direction,zone,stop,ms);
   candidates.push({...evidence,modelType,entry,stop,zone,formedAt,range,confirmation,
    id:[market,symbol,frame,modelType,sweep.at,shift.at].join('|'),
    ageBars:bars.length-1-formation,status:state.phase==='observed'?'watching':state.phase,research:state});
  };
  const retrace=ratio=>extreme+(origin-extreme)*ratio;
  add('ote',{low:Math.min(retrace(.62),retrace(.79)),high:Math.max(retrace(.62),retrace(.79))},
   retrace(.705),origin,mi,'منطقة تصحيح 62–79% من حركة السحب إلى MSS · مرجع 70.5%');
  const accumulation=advanced.amdRange({...evidence,fvgAt:shift.at},bars,si,frame);
  if(accumulation){
   const edge=bullish?accumulation.accumulationLow:accumulation.accumulationHigh;
   if(bullish?bars[mi].close>edge:bars[mi].close<edge)
    add('amd',{low:edge,high:edge},edge,origin,mi,'تراكم نيويورك 00–05 ثم سحب نطاقه وإغلاق MSS عائد إلى النطاق');
  }
  const breaker=advanced.breakerEvidence(evidence,bars,index,analysis.pivots,{trackInvalidation:true});
  if(breaker){
   const formation=index.get(breaker.retestAt),entry=bullish?breaker.high:breaker.low;
   const stop=bullish?breaker.low:breaker.high;
   const research=breaker.invalidatedAt==null?{phase:'confirmed_research',at:breaker.retestAt+ms}:
    {phase:'invalidated',at:breaker.invalidatedAt+ms};
   add('breaker',{low:breaker.low,high:breaker.high},entry,stop,formation,
    'إغلاق يتجاوز كتلة عند سوينج مؤكد، ثم إعادة اختبار وإغلاق يؤكد تبدّل دورها',research);
  }
 }
 return candidates;
}
function inspect(input){
 const {market,symbol,frame='15',candles15=[],candles60=[],higherCandles,events=[],eventFeedsLoaded=0,newsChecked=false,newsCovered=false,now=Date.now(),rollHour=0,displayCompleteModels=false,includeTurtleSoup=false,includeIfvg=false,allowDelayedFvgForResearch=false,allowEarlyFvgForResearch=false,includeContinuationForResearch=false,structureEngine,signalEngine,contextEngine,scenarioEngine,advancedEngine}=input;
 if(!knownMarkets.has(market)||!symbol||!['5','15',...(market==='kraken'?[]:['60','240'])].includes(String(frame)))throw Error('السوق أو الإطار المختار غير مدعوم');
 if(!structureEngine||!signalEngine||!contextEngine||!scenarioEngine)throw Error('محرك تحليلي أساسي مفقود');
 const warnings=[],blocks=[];
 const context=contextEngine.build([],candles60,{market:market==='kraken'?'crypto':market,rollHour,now,allowUnavailable:displayCompleteModels,sources:market==='crypto'?'Bybit V5':market==='kraken'?'Kraken Futures':traditional.SOURCE});
 const higher=contextFrame(frame);
 const higherStructure=structureEngine.analyze(higher==='60'?candles60:(higherCandles||[]),higher,{now,pivot:2,allowInsufficient:displayCompleteModels});
 const scenarios=context?scenarioEngine.build(context,higherStructure,{now,frame:higher}):{qualified:false,scenarios:[]};
 const evaluation=signalEngine.evaluate(candles15,String(frame),{now,market,symbol,displayCompleteModels});
 const latest=evaluation.analysis.last,ms=structureEngine.FRAME_MS[String(frame)],age=latest==null?Infinity:now-(latest+ms);
 if(!Number.isFinite(age)||age<0||latest+ms!==Math.floor(now/ms)*ms)blocks.push('شموع إطار الدخول قديمة أو مفقودة');
 if(!scenarios.qualified)blocks.push('سياق الإطار الأعلى أو شموع الساعة غير مكتملة أو غير حديثة');
 if(context?.priorWeek==null)warnings.push('الشموع الساعية غير كافية لحساب مستويات الأسبوع السابق بنيويورك');
 if(!newsChecked||!newsCovered)blocks.push('الأجندة المجدولة قديمة أو ناقصة في نافذة الفحص؛ يُمنع اعتماد الخطة');
 const nearby=nearNews(events,market,symbol,now);
 if(nearby.length)blocks.push('خبر اقتصادي قريب ضمن 30 دقيقة قبل الإعلان أو بعده');
 const models=evaluation.models||[];
 const recent=models.filter(m=>m&&m.ageBars<=12&&m.research&&(m.direction==='bull'||m.direction==='bear')&&[m.entry,m.stop,...(displayCompleteModels?[]:[m.target]),m.zone?.low,m.zone?.high].every(v=>Number.isFinite(v)&&v>0)&&(m.direction==='bull'?m.stop<m.entry&&(displayCompleteModels||m.entry<m.target):m.entry<m.stop&&(displayCompleteModels||m.target<m.entry)));
 const bars=structureEngine.normalize(candles15,String(frame),now).segments.at(-1)||[];
 const index=new Map(bars.map((bar,i)=>[bar.start,i]));
 const targetStructures=[
  {pivots:evaluation.analysis.pivots,ms,frame:String(frame)},
  {pivots:higherStructure.pivots,ms:structureEngine.FRAME_MS[higher],frame:higher}
 ];
 const reversals=includeTurtleSoup&&evaluation.analysis.eligible?turtleSoup(bars,index,evaluation.analysis.events,ms,market,symbol,frame):[];
 const inversions=includeIfvg&&evaluation.analysis.eligible?inversionFvg(bars,index,evaluation.analysis,ms,market,symbol,frame):[];
 const continuations=includeContinuationForResearch&&evaluation.analysis.eligible
  ?continuationCandidates(bars,index,evaluation.analysis,ms,market,symbol,frame):[];
 const independent=displayCompleteModels&&evaluation.analysis.eligible
  ?structureModels(bars,index,evaluation.analysis,ms,market,symbol,frame,signalEngine,advancedEngine):[];
 const opportunities=[...recent,...reversals,...inversions,...continuations,...independent].flatMap(m=>{
  const range=m.range||displacementRange(m,bars,index,evaluation.analysis.events,allowDelayedFvgForResearch?2:1,allowEarlyFvgForResearch?-1:0);
  const protection=structuralStop(m,bars,targetStructures);
  if(!protection)return [];
  const protectedModel={...m,...protection};
  const focusedPlan=liquidityPlan(protectedModel,bars,targetStructures,range);
  if(!displayCompleteModels&&!focusedPlan)return [];
  const plan=displayCompleteModels?liquidityPlan(protectedModel,bars,targetStructures,range,{focused:false}):focusedPlan;
  if(!plan)return [];

  const matched=scenarios.scenarios.find(s=>s.direction===m.direction),alignment=Boolean(matched&&matched.score>=2&&matched.evidence.some(v=>/MSS|BOS/.test(v)));
  const localBlocks=[...blocks];
  if(displayCompleteModels&&(!focusedPlan||focusedPlan.interveningLiquidity||plan?.target!==focusedPlan.target))localBlocks.push('أهلية تنبيه الدخول معلّقة وفق شروط المراقبة اللحظية');
  if(displayCompleteModels&&['turtle-soup','ifvg'].includes(m.modelType)){
   const zone=m.zone||{low:m.entry,high:m.entry};
   m.research=signalEngine.researchState(bars,index.get(m.formedAt-ms),m.direction,zone,m.stop,ms);
  }
  if(displayCompleteModels&&m.modelType)localBlocks.push('هذا النوع معروض للبحث');
  if(plan?.targetTouched)localBlocks.push('السعر وصل إلى سيولة الهدف بعد تكوّن النموذج');
  if(!alignment)localBlocks.push('سيناريو الإطار الأعلى غير مؤكد في اتجاه النموذج');
  if(m.status==='retested')localBlocks.push('عادت الأسعار إلى المنطقة بالفعل؛ لا نفترض تفعيلًا أو سعر تنفيذ');
  if(['invalidated','expired'].includes(m.research.phase))localBlocks.push('النموذج انتهى أو لامس مستوى الإبطال');
  if(m.status!=='watching')localBlocks.push('النموذج ليس في وضع انتظار دخول جديد');
  const price=context?.price;const entry=m.entry;
  const side=m.direction==='bull'?'BUY':'SELL';
  // Never conflate a last-hour close with a live bid/ask or an executable quote.
  const status=localBlocks.length?'مراقبة فقط':'نموذج بحثي — ينتظر إعادة اختبار السعر';
  return [{id:m.id,symbol,market,direction:m.direction,modelType:m.modelType,side,formedAt:m.formedAt,research:m.research,status,entry,stop:protection.stop,stopLiquidity:protection.stopLiquidity,target:plan.target,rr:plan?.rr??null,liquidity:plan?.liquidity??null,interveningLiquidity:plan?.interveningLiquidity??null,midpoint:range?.midpoint,dealingRange:range,zone:m.zone,model:m.confirmation,blocks:localBlocks,waiting:[m.modelType==='turtle-soup'?'إعادة اختبار المستوى المسترد دون إبطال':m.modelType==='ifvg'?'إعادة اختبار الفجوة المقلوبة دون إبطال':m.modelType==='ote'?'إعادة اختبار منطقة OTE':m.modelType==='amd'?'مراقبة حد نطاق التراكم':m.modelType==='breaker'?'مراجعة استمرار تبدّل دور الكتلة':'عودة السعر إلى منطقة FVG دون إبطال','التحقق من سعر Bid/Ask والسبريد عند التنفيذ','تأكيد عدم تغيّر الهيكل بعد آخر شمعة'],evidence:matched?.evidence||[],modelEvidence:[m.sweepAt,m.mssAt,m.fvgAt],contextScore:matched?.score||0,ageBars:m.ageBars,referenceClose:price}];
 }).sort((a,b)=>b.formedAt-a.formedAt);
 if(!opportunities.length)warnings.push(displayCompleteModels?'لم تظهر فرصة بوقف هيكلي وهدف سيولة يحقق 2R على الأقل':'لم يظهر نموذج حديث مع Premium/Discount وهدف سيولة يؤمّن 2R على الأقل');
 return {symbol,market,frame,checkedAt:now,source:market==='crypto'?'Bybit V5 · عقد دائم · USDT':market==='kraken'?'Kraken Futures · USD perpetual':traditional.SOURCE,sourceBars:evaluation.analysis.sourceBars,lastCompleteAt:Number.isFinite(latest)?latest+ms:null,entryFreshUntil:Number.isFinite(latest)?latest+2*ms:null,context,scenarios,opportunities,warnings,blocks,nearbyNews:nearby,newsChecked,newsCovered,eventFeedsLoaded,priceAt:context?.priceAt,price:context?.price,disclaimer:'هذه فرص بحثية مشروطة مستخرجة من إغلاقات شموع، وليست أسعار Bid/Ask لحظية أو أوامر تنفيذ. لا تعتمد الربحية ولا الملاءمة المالية ولا تتضمن سبريدًا أو انزلاقًا أو حجم عقد. تتوقف المراقبة بإغلاق الصفحة.'};
}
function qualifiesFocused(plan){
 return plan.research?.phase==='observed'&&!plan.blocks.length&&!plan.interveningLiquidity;
}
return Object.freeze({continuationCandidates,inversionFvg,turtleSoup,qualifiesFocused,inspect,nearNews,contextFrame,structuralStop,liquidityPlan,displacementRange,displacementLeg});
});
