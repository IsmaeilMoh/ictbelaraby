/* ICT بالعربي 8B — evidence-preserving, forward-only opportunity lifecycle research.
 * OHLC cannot order intrabar touches. Never infer execution before observation.
 */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.ICTOpportunityLifecycle708B=api})(typeof globalThis!=='undefined'?globalThis:null,function(){'use strict';
const FRAME={1:60000,5:300000,15:900000,60:3600000,240:14400000};const FINAL=new Set(['won','lost','ambiguous','expired','blocked','gap','invalidated']);
function signature(o){return [o.market,o.symbol,String(o.frame),o.id].join('|')}
function valid(o){return o&&['BUY','SELL'].includes(o.side)&&FRAME[Number(o.frame)]&&Number.isFinite(o.formedAt)&&[o.entry,o.stop,o.target].every(x=>Number.isFinite(x)&&x>0)&&(o.side==='BUY'?o.stop<o.entry&&o.entry<o.target:o.target<o.entry&&o.entry<o.stop)}
function create(o,at,opts={}){if(!valid(o))throw Error('المستويات أو هوية الفرصة غير صالحة');if(!Number.isFinite(at)||at<o.formedAt)throw Error('وقت الرصد غير صالح');const blocked=!opts.researchOnly&&(!!o.blocks?.length||o.status!=='خطة مشروطة — تنتظر إعادة اختبار السعر والتحقق من التنفيذ');return {key:signature(o),id:o.id,market:o.market,symbol:o.symbol,frame:String(o.frame),side:o.side,formedAt:o.formedAt,observedAt:at,entry:o.entry,stop:o.stop,target:o.target,zone:{low:o.zone?.low??null,high:o.zone?.high??null},model:o.model||'Sweep → MSS → FVG',originStatus:o.status,originBlocks:[...(o.blocks||[])],evidence:[...(o.evidence||[])],accountName:opts.accountName||null,source:opts.source||null,modelEvidence:o.modelEvidence||null,state:blocked?'blocked':'waiting',lastProcessedStart:null,activationAt:null,closedAt:null,outcomeR:null,updatedAt:at,maxBars:opts.maxBars||24,barsExamined:0,comments:'',events:[{type:blocked?'blocked':'registered',at,note:blocked?'فرصة معلّقة وقت الرصد — لا تدخل إحصاءات النتائج':'تم حفظ المستويات المرجعية للمتابعة النظرية'}]}}
function createLiveEntry(plan,observedAt,quote,source){
 if(!valid(plan)||plan.blocks?.length||!Number.isSafeInteger(quote?.at)||quote.at<plan.formedAt||
    quote.at>observedAt||observedAt-quote.at>5000||
    ![quote.bid,quote.ask].every(v=>Number.isFinite(v)&&v>0)||quote.bid>=quote.ask)throw Error('قراءة تنبيه الدخول غير صالحة');
 const buy=plan.side==='BUY',price=buy?quote.ask:quote.bid;
 if(buy?price>plan.entry||quote.bid<=plan.stop:price<plan.entry||quote.ask>=plan.stop)throw Error('السعر لا يطابق شرط الدخول');
 const entry=create({...plan,id:plan.id+':live'},observedAt,{source,researchOnly:true});
 entry.modelId=plan.id;
 entry.liveQuote={at:quote.at,bid:quote.bid,ask:quote.ask,price};
 entry.state='active';
 entry.activationAt=quote.at;
 entry.events.push({type:'activated',at:observedAt,note:'رُصد عبور الدخول في تدفق Bid/Ask العام؛ لا يوجد تأكيد لتنفيذ صفقة'});
 return entry;
}
function closed(r){return FINAL.has(r.state)}
function touch(b,p){return b.low<=p&&b.high>=p}
function sound(b,frame,now){return b&&b.confirmed===true&&Number.isSafeInteger(b.start)&&b.start>=0&&b.start+FRAME[frame]<=now&&[b.open,b.high,b.low,b.close].every(Number.isFinite)&&b.high>=Math.max(b.open,b.close,b.low)&&b.low<=Math.min(b.open,b.close,b.high)}
function step(r,b){const entry=touch(b,r.entry),stop=touch(b,r.stop),target=touch(b,r.target),at=b.start+FRAME[r.frame];
 const beyondStop=r.side==='BUY'?b.open<r.stop:b.open>r.stop;
 const beyondTarget=r.side==='BUY'?b.open>r.target:b.open<r.target;
 if((r.state==='active'&&(beyondStop||beyondTarget))||(r.state==='waiting'&&beyondStop&&entry)){
  r.state='ambiguous';r.closedAt=at;
  r.events.push({type:'ambiguous',at,note:'افتتحت الشمعة بعد تجاوز مستوى؛ تعذّر حسم لمس المستويات'});
 }else if(r.state==='waiting'){
  if(!entry&&(stop||beyondStop)){r.state='invalidated';r.closedAt=at;r.events.push({type:'invalidated',at,note:'بلغ السعر الوقف قبل أي ملامسة مؤكدة للدخول'});}
  if(entry){r.activationAt=at;r.events.push({type:'activated',at,note:'ملامسة مستوى الدخول في شمعة مكتملة؛ ليس تأكيدًا لتنفيذ فعلي'});if(stop||target){r.state='ambiguous';r.closedAt=at;r.events.push({type:'ambiguous',at,note:'الدخول ومستوى خروج في نفس الشمعة؛ ترتيب اللمسات غير معروف'});}else r.state='active';}
 }else if(r.state==='active'){
  if(stop&&target){r.state='ambiguous';r.closedAt=at;r.events.push({type:'ambiguous',at,note:'الهدف والوقف داخل شمعة واحدة؛ لا يمكن ترتيب الحركة'});}
  else if(stop){r.state='lost';r.outcomeR=-1;r.closedAt=at;r.events.push({type:'lost',at,note:'لامس السعر مستوى الوقف الافتراضي'});}
  else if(target){r.state='won';r.outcomeR=Math.abs((r.target-r.entry)/(r.entry-r.stop));r.closedAt=at;r.events.push({type:'won',at,note:'لامس السعر الهدف الافتراضي'});}
 }
 r.lastProcessedStart=b.start;r.updatedAt=at;r.barsExamined++;
 if(r.state==='waiting'&&r.barsExamined>=r.maxBars){r.state='expired';r.closedAt=at;r.events.push({type:'expired',at,note:'انتهت نافذة المراقبة دون ملامسة الدخول'})}
 if(r.state==='active'&&r.barsExamined>=r.maxBars){r.state='expired';r.closedAt=at;r.events.push({type:'expired',at,note:'انتهت نافذة المراقبة بعد التفعيل دون لمس وقف أو هدف؛ لا تُحسب خسارة أو ربحًا'})}
}
function advance(input,raw,now=Date.now()){
 const r=JSON.parse(JSON.stringify(input));if(!valid(r)||!Number.isFinite(now))throw Error('مدخلات التتبع غير صالحة');if(closed(r))return r;
 const ms=FRAME[r.frame];
 const origin=r.liveQuote?Math.floor(r.liveQuote.at/ms)*ms:Math.ceil(r.observedAt/ms)*ms;
 const minStart=r.lastProcessedStart===null?origin:r.lastProcessedStart+ms;
 const bars=(raw||[]).filter(b=>b&&Number.isFinite(b.start)&&b.start>=minStart).sort((a,b)=>a.start-b.start);
 let previous=r.lastProcessedStart;
 for(const b of bars){if(!sound(b,r.frame,now))continue;if(previous!=null&&b.start<=previous)continue;
  const expected=previous===null?minStart:previous+ms;
  if(b.start!==expected){r.state='gap';r.closedAt=now;r.events.push({type:'gap',at:now,note:'توجد فجوة أو بيانات مفقودة بعد التسجيل؛ أوقف التقييم بدل تخمين مسار السعر'});r.updatedAt=now;return r}
  if(r.liveQuote&&previous===null&&r.liveQuote.at>b.start){
   const at=Math.max(b.start+ms,r.observedAt);
   const buy=r.side==='BUY';
   if((buy&&(b.low<=r.stop||b.high>=r.target))||(!buy&&(b.high>=r.stop||b.low<=r.target))){
    r.state='ambiguous';r.closedAt=at;
    r.events.push({type:'ambiguous',at,note:'تداخلت حدود خروج مع شمعة رصد التنبيه؛ ترتيب الأحداث غير محسوم'});
   }
   r.updatedAt=at;r.lastProcessedStart=b.start;
  }else step(r,b);
  previous=b.start;
  if(closed(r))break;
 }
 return r;
}
function stats(rows){const result={total:rows.length,waiting:0,active:0,blocked:0,invalidated:0,ambiguous:0,expired:0,gap:0,won:0,lost:0,settled:0,winRate:null,totalR:0};for(const r of rows){if(result[r.state]!==undefined)result[r.state]++;if(r.state==='won'||r.state==='lost'){result.settled++;result.totalR+=Number(r.outcomeR)||0}}if(result.settled)result.winRate=result.won/result.settled*100;return result}
return Object.freeze({FRAME,FINAL,valid,signature,create,createLiveEntry,advance,stats,closed});
});
