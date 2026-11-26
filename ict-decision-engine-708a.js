/* ICT بالعربي 7.0/8A: conservative multi-engine coordination, NOT trade execution. */
(function(root,factory){'use strict';const api=factory(typeof module==='object'&&module.exports?require('./ict-public-markets-702c2.js'):root.ICTPublicMarkets);if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.ICTDecisionEngine708A=api})(typeof globalThis!=='undefined'?globalThis:null,function(traditional){
'use strict';
const MIN=60000;
const knownMarkets=new Set(['crypto','kraken','oanda','forex','metals','indices','stocks','energy']);
function oandaGroup(symbol){return Object.entries(traditional?.MARKETS||{}).find(([,rows])=>rows.some(row=>row[1]===symbol))?.[0]}
function nearNews(events,market,symbol,now){const relevant=market==='oanda'?oandaGroup(symbol)==='forex'?symbol.split('_'):['USD']:market==='forex'?[symbol.slice(0,3),symbol.slice(3,6)]:market==='crypto'?['USD']:['USD'];return (events||[]).filter(e=>e&&Number.isFinite(e.when)&&relevant.includes(e.currency)&&Math.abs(e.when-now)<=30*MIN).sort((a,b)=>Math.abs(a.when-now)-Math.abs(b.when-now)).slice(0,8)}
const contextFrame=frame=>({'60':'240','240':'D'}[String(frame)]||'60');
function rangePlan(model,bars,pivots,ms){
 const bullish=model.direction==='bull';
 const impulse=bars.filter(bar=>bar.start>=model.sweepAt&&bar.start<model.formedAt);
 if(!impulse.length||impulse[0].start!==model.sweepAt)return null;
 const low=Math.min(...impulse.map(bar=>bar.low));
 const high=Math.max(...impulse.map(bar=>bar.high));
 if(high<=low)return null;
 const midpoint=(low+high)/2;
 if(bullish?model.entry>=midpoint:model.entry<=midpoint)return null;
 const pullback=bar=>(bullish?high-bar.low:bar.high-low)/(high-low);
 const correction=bars.find(bar=>bar.start>=model.formedAt&&pullback(bar)>0.30);
 if(!correction)return null;
 const qualifiesAt=correction.start+ms;
 const risk=Math.abs(model.entry-model.stop);
 const side=bullish?1:-1;
 const levels=pivots.filter(pivot=>{
  if(pivot.type!==(bullish?'swing-high':'swing-low')||pivot.confirmedAt+ms>model.formedAt)return false;
  if(side*(pivot.level-model.entry)<2*risk)return false;
  // Use liquidity levels still intact when the correction first qualifies.
  return !bars.some(bar=>bar.start>pivot.start&&bar.start<qualifiesAt&&
   (bullish?bar.high>=pivot.level:bar.low<=pivot.level));
 }).sort((a,b)=>side*(a.level-b.level));
 const target=levels[0];
 return target?{target:target.level,rr:side*(target.level-model.entry)/risk,
  dealingRange:{low,high,midpoint,correctionPct:100*pullback(correction),qualifiedAt:qualifiesAt,swingAt:target.start}}:null;
}
function inspect(input){
 const {market,symbol,frame='15',candles15=[],candles60=[],higherCandles,events=[],eventFeedsLoaded=0,newsChecked=false,newsCovered=false,now=Date.now(),rollHour=0,structureEngine,signalEngine,contextEngine,scenarioEngine}=input;
 if(!knownMarkets.has(market)||!symbol||!['5','15',...(market==='crypto'?['60','240']:[])].includes(String(frame)))throw Error('السوق أو الإطار المختار غير مدعوم');
 if(!structureEngine||!signalEngine||!contextEngine||!scenarioEngine)throw Error('محرك تحليلي أساسي مفقود');
 const warnings=[],blocks=[];
 const context=contextEngine.build([],candles60,{market:market==='kraken'?'crypto':market==='oanda'?(oandaGroup(symbol)||'forex'):market,rollHour,now,sources:market==='crypto'?'Bybit V5':market==='kraken'?'Kraken Futures':'OANDA Practice'});
 const higher=contextFrame(frame);
 const higherStructure=structureEngine.analyze(higher==='60'?candles60:(higherCandles||[]),higher,{now,pivot:2});
 const scenarios=scenarioEngine.build(context,higherStructure,{now,frame:higher});
 const evaluation=signalEngine.evaluate(candles15,String(frame),{now,market,symbol});
 const latest=evaluation.analysis.last,ms=structureEngine.FRAME_MS[String(frame)],age=latest==null?Infinity:now-(latest+ms);
 if(!Number.isFinite(age)||age<0||latest+ms!==Math.floor(now/ms)*ms)blocks.push('شموع إطار الدخول قديمة أو مفقودة');
 if(!scenarios.qualified)blocks.push('سياق الإطار الأعلى أو شموع الساعة غير مكتملة أو غير حديثة');
 if(context.priorWeek==null)warnings.push('الأسبوع المرجعي السابق غير مكتمل؛ لا توجد مستويات PWH/PWL موثوقة');
 if(!newsChecked||!newsCovered)blocks.push('الأجندة المجدولة قديمة أو ناقصة في نافذة الفحص؛ يُمنع اعتماد الخطة');
 const nearby=nearNews(events,market,symbol,now);
 if(nearby.length)blocks.push('خبر اقتصادي قريب ضمن 30 دقيقة قبل الإعلان أو بعده');
 const models=evaluation.models||[];
 const recent=models.filter(m=>m&&m.ageBars<=12&&m.research&&(m.direction==='bull'||m.direction==='bear')&&[m.entry,m.stop,m.target,m.zone?.low,m.zone?.high].every(v=>Number.isFinite(v)&&v>0)&&(m.direction==='bull'?m.stop<m.entry&&m.entry<m.target:m.target<m.entry&&m.entry<m.stop));
 const bars=recent.length?structureEngine.normalize(candles15,String(frame),now).segments.at(-1)||[]:[];
 const opportunities=recent.flatMap(m=>{
  const plan=rangePlan(m,bars,evaluation.analysis.pivots,ms);
  if(!plan)return [];
  const matched=scenarios.scenarios.find(s=>s.direction===m.direction),alignment=Boolean(matched&&matched.score>=2&&matched.evidence.some(v=>/MSS|BOS/.test(v)));
  const localBlocks=[...blocks];
  if(bars.some(bar=>bar.start>=plan.dealingRange.qualifiedAt&&(m.direction==='bull'?bar.high>=plan.target:bar.low<=plan.target)))localBlocks.push('السعر سبق أن لامس سوينج الهدف بعد اكتمال شرط التصحيح');
  if(!alignment)localBlocks.push('سيناريو الإطار الأعلى غير مؤكد في اتجاه النموذج');
  if(m.status==='retested')localBlocks.push('عادت الأسعار إلى المنطقة بالفعل؛ لا نفترض تفعيلًا أو سعر تنفيذ');
  if(['invalidated','expired'].includes(m.research.phase))localBlocks.push('النموذج انتهى أو لامس مستوى الإبطال');
  if(m.status!=='watching')localBlocks.push('النموذج ليس في وضع انتظار دخول جديد');
  const price=context.price;const entry=m.entry;
  const side=m.direction==='bull'?'BUY':'SELL';
  // Never conflate a last-hour close with a live bid/ask or an executable quote.
  const status=localBlocks.length?'مراقبة فقط':'نموذج بحثي — ينتظر إعادة اختبار السعر';
  return [{id:m.id,symbol,market,direction:m.direction,side,formedAt:m.formedAt,research:m.research,status,entry,stop:m.stop,...plan,zone:m.zone,model:m.confirmation,blocks:localBlocks,waiting:['عودة السعر إلى منطقة FVG دون إبطال','التحقق من سعر Bid/Ask والسبريد عند التنفيذ','تأكيد عدم تغيّر الهيكل بعد آخر شمعة'],evidence:matched?.evidence||[],modelEvidence:[m.sweepAt,m.mssAt,m.fvgAt],contextScore:matched?.score||0,ageBars:m.ageBars,referenceClose:price}];
 }).sort((a,b)=>b.formedAt-a.formedAt);
 if(!opportunities.length)warnings.push('لا توجد خطة تحقق شروط النطاق والتصحيح والهدف عند سوينج مؤكد بعائد 2R على الأقل');
 return {symbol,market,frame,checkedAt:now,source:market==='crypto'?'Bybit V5 · عقد دائم · USDT':market==='kraken'?'Kraken Futures · USD perpetual':'OANDA Practice · شموع المنتصف',sourceBars:evaluation.analysis.sourceBars,lastCompleteAt:Number.isFinite(latest)?latest+ms:null,entryFreshUntil:Number.isFinite(latest)?latest+2*ms:null,context,scenarios,opportunities,warnings,blocks,nearbyNews:nearby,newsChecked,newsCovered,eventFeedsLoaded,priceAt:context.priceAt,price:context.price,disclaimer:'هذه فرص بحثية مشروطة مستخرجة من إغلاقات شموع، وليست أسعار Bid/Ask لحظية أو أوامر تنفيذ. لا تعتمد الربحية ولا الملاءمة المالية ولا تتضمن سبريدًا أو انزلاقًا أو حجم عقد. تتوقف المراقبة بإغلاق الصفحة.'};
}
return Object.freeze({inspect,nearNews,contextFrame,rangePlan});
});
