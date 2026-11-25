/* ICT بالعربي | Stage 2D: deterministic market-structure research engine.
   Confirmed OHLC candles only. All detections use information available at event time. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.ICTStructureEngine=api})(typeof globalThis!=='undefined'?globalThis:null,function(){
'use strict';
const FRAME_MS=Object.freeze({'1':60000,'5':300000,'15':900000,'60':3600000,'240':14400000,D:86400000,'1min':60000,'5min':300000,'15min':900000,'1h':3600000,'4h':14400000,'1day':86400000});
const EPS=1e-10;
function normalize(candles,frame,now=Date.now()){
 const ms=FRAME_MS[String(frame)];if(!ms)throw Error('إطار زمني غير مدعوم');if(!Array.isArray(candles))throw Error('بيانات الشموع غير صالحة');
 const rows=[];let rejected=0,unconfirmed=0,duplicates=0;const seen=new Set();
 for(const r of candles){const t=Number(r?.start),o=Number(r?.open),h=Number(r?.high),l=Number(r?.low),c=Number(r?.close);
  if(!Number.isSafeInteger(t)||t<946684800000||!([o,h,l,c].every(v=>Number.isFinite(v)&&v>0))||h<Math.max(o,c,l)||l>Math.min(o,c,h)||t>now+ms){rejected++;continue}
  if(r.confirmed!==true||t+ms>now){unconfirmed++;continue}
  if(seen.has(t)){duplicates++;continue}seen.add(t);rows.push({start:t,open:o,high:h,low:l,close:c});
 }
 rows.sort((a,b)=>a.start-b.start);
 const gaps=[];const segments=[];let offset=0;
 for(let i=1;i<rows.length;i++)if(rows[i].start-rows[i-1].start!==ms){const diff=rows[i].start-rows[i-1].start;gaps.push({before:rows[i-1].start,after:rows[i].start,intervals:diff>ms?Math.floor(diff/ms)-1:0});segments.push(rows.slice(offset,i));offset=i}
 if(rows.length)segments.push(rows.slice(offset));
 return {rows,segments,gaps,rejected,unconfirmed,duplicates,intervalMs:ms};
}
function analyze(candles,frame,opts={}){
 const pivot=Number(opts.pivot??2),now=Number.isFinite(opts.now)?opts.now:Date.now();if(!Number.isInteger(pivot)||pivot<2||pivot>5)throw Error('نافذة القمم غير صالحة');
 const input=normalize(candles,frame,now),minBars=Math.max(18,pivot*4+7);
 if(input.rows.length<minBars)throw Error('بيانات غير كافية: نحتاج '+minBars+' شمعة مكتملة على الأقل');
 const latest=input.segments.at(-1)||[],events=[],zones=[],pivots=[];
 // A break must be decided against a previously confirmed pivot (never future candles).
 for(const segment of input.segments){if(segment.length<minBars)continue;const localHighs=[],localLows=[];let previousBreak=null;let lastBrokenHigh=-1,lastBrokenLow=-1;
  const startIndex=input.rows.indexOf(segment[0]);
  for(let i=0;i<segment.length;i++){
   const bar=segment[i];
   // A pivot at index i-pivot is confirmed only when the right-hand window has closed.
   const j=i-pivot;if(j>=pivot){const p=segment[j];let hi=true,lo=true;
    for(let k=j-pivot;k<=j+pivot;k++){if(k===j)continue;if(segment[k].high>=p.high-EPS)hi=false;if(segment[k].low<=p.low+EPS)lo=false}
    if(hi){const item={type:'swing-high',level:p.high,start:p.start,confirmedAt:bar.start,index:startIndex+j};localHighs.push(item);pivots.push(item)}
    if(lo){const item={type:'swing-low',level:p.low,start:p.start,confirmedAt:bar.start,index:startIndex+j};localLows.push(item);pivots.push(item)}
   }
   const hi=localHighs.at(-1),lo=localLows.at(-1),prev=i>0?segment[i-1]:null;
   if(prev&&hi&&hi.index!==lastBrokenHigh&&bar.close>hi.level&&prev.close<=hi.level){
    const type=previousBreak==='bear'?'MSS':'BOS';events.push({type,direction:'bull',at:bar.start,level:hi.level,note:previousBreak===null?'اختراق هيكلي أولي، دون اتجاه سابق مؤكد':undefined});lastBrokenHigh=hi.index;previousBreak='bull';
   }
   if(prev&&lo&&lo.index!==lastBrokenLow&&bar.close<lo.level&&prev.close>=lo.level){
    const type=previousBreak==='bull'?'MSS':'BOS';events.push({type,direction:'bear',at:bar.start,level:lo.level,note:previousBreak===null?'اختراق هيكلي أولي، دون اتجاه سابق مؤكد':undefined});lastBrokenLow=lo.index;previousBreak='bear';
   }
   if(hi&&bar.high>hi.level&&bar.close<hi.level&&bar.start>hi.confirmedAt)events.push({type:'SWEEP',direction:'bear',at:bar.start,level:hi.level});
   if(lo&&bar.low<lo.level&&bar.close>lo.level&&bar.start>lo.confirmedAt)events.push({type:'SWEEP',direction:'bull',at:bar.start,level:lo.level});
   if(i>=2){const first=segment[i-2];
    if(first.high<bar.low){zones.push({type:'FVG',direction:'bull',at:bar.start,low:first.high,high:bar.low,mitigated:false})}
    if(first.low>bar.high){zones.push({type:'FVG',direction:'bear',at:bar.start,low:bar.high,high:first.low,mitigated:false})}
    // Mark previously formed zones touched only after their formation.
    for(const z of zones)if(z.at<bar.start&&!z.mitigated&&bar.low<=z.high&&bar.high>=z.low){z.mitigated=true;z.touchedAt=bar.start}
   }
  }
 }
 // Premium/Discount uses latest confirmed swing high and swing low within the contiguous current segment.
 const firstLatest=latest[0]?.start??Infinity,hi=[...pivots].reverse().find(p=>p.type==='swing-high'&&p.start>=firstLatest),lo=[...pivots].reverse().find(p=>p.type==='swing-low'&&p.start>=firstLatest);
 const range=hi&&lo&&hi.level>lo.level?{high:hi.level,low:lo.level,equilibrium:(hi.level+lo.level)/2,premium:[(hi.level+lo.level)/2,hi.level],discount:[lo.level,(hi.level+lo.level)/2],from:[hi.start,lo.start]}:null;
 const qualified=latest.length>=minBars;
 return {sourceBars:input.rows.length,usableBars:latest.length,eligible:qualified,frame,gaps:input.gaps,rejected:input.rejected,unconfirmed:input.unconfirmed,duplicates:input.duplicates,pivot,events:events.filter(e=>e.at>=firstLatest).slice(opts.fullEvidence?-Infinity:-100),zones:zones.filter(z=>z.at>=firstLatest).slice(opts.fullEvidence?-Infinity:-100),pivots:pivots.filter(p=>p.start>=firstLatest).slice(-40),range,first:latest[0]?.start??null,last:latest.at(-1)?.start??null,segments:input.segments.length,minimum:minBars,disclaimer:'اكتشافات وصفية لقواعد حسابية مبسطة؛ ليست توصية أو نموذج ICT معتمدًا للتنفيذ.'};
}
return Object.freeze({FRAME_MS,normalize,analyze});
});
