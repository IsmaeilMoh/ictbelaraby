/* ICT بالعربي 8C — deterministic operational-readiness checks; no profitability claims. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.ICTReadiness708C=api})(typeof globalThis!=='undefined'?globalThis:null,function(){'use strict';
const FRAME={5:300000,15:900000,60:3600000,240:14400000};
function sample(raw,frame,now=Date.now()){
 const ms=FRAME[Number(frame)];if(!ms)return {ok:false,code:'frame',message:'إطار غير مدعوم'};
 if(!Array.isArray(raw)||!raw.length)return {ok:false,code:'empty',message:'لم تصل شموع من المصدر',count:0};
 const data=[],issues=[];let unfinished=0;
 for(const b of raw){if(!b||!Number.isSafeInteger(b.start)||!Number.isFinite(b.open)||!Number.isFinite(b.high)||!Number.isFinite(b.low)||!Number.isFinite(b.close)||b.open<=0||b.low<=0||b.high<Math.max(b.open,b.close,b.low)||b.low>Math.min(b.open,b.close,b.high)){issues.push('شمعة غير صالحة');continue}
  if(b.confirmed!==true||b.start+ms>now){unfinished++;continue}data.push(b)}
 data.sort((a,b)=>a.start-b.start);let gaps=0,duplicate=0;
 for(let i=1;i<data.length;i++){if(data[i].start===data[i-1].start)duplicate++;else if(data[i].start-data[i-1].start>ms)gaps+=Math.max(1,Math.round((data[i].start-data[i-1].start)/ms)-1)}
 const last=data.at(-1),age=last?now-(last.start+ms):null;
 const fresh=last&&age>=-120000&&age<=Math.max(ms*2+120000,3600000);
 const ok=!!last&&data.length>=12&&gaps===0&&duplicate===0&&issues.length===0&&fresh;
 return {ok,code:!last?'no-closed':data.length<12?'short':gaps?'gap':duplicate?'duplicate':issues.length?'invalid':!fresh?'stale':'ok',count:data.length,unfinished,gaps,duplicate,invalid:issues.length,ageMs:age,lastStart:last?.start??null,message:ok?'شموع مكتملة ومتتابعة وحديثة':!last?'لا توجد شموع مكتملة':gaps?'توجد فجوات زمنية':duplicate?'تكرار بيانات':!fresh?'الشموع قديمة أو وقتها غير متسق':data.length<12?'عدد الشموع غير كافٍ':'الشموع غير صالحة'};
}
function summarize(items){const failed=items.filter(x=>x.level==='block'),caution=items.filter(x=>x.level==='warn');return {status:failed.length?'blocked':caution.length?'conditional':'research-only',failed:failed.length,caution:caution.length,total:items.length,readyForPublicSignals:false,readyFor24h:false,reason:'لا توجد خدمة مراقبة مستقلة 24/7، أو أسعار تنفيذ Bid/Ask مؤكدة، أو اختبار أمامي وحقوق بيانات مثبتة للنشر العام.'}}
function check(id,label,ok,detail,level='block'){return {id,label,level:ok?'pass':level,detail}}
return Object.freeze({FRAME,sample,summarize,check});});
