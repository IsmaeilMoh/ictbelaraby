/* ICT 7.0 / 5B — deterministic educational candle replay; no execution, no forward-data decisions. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.ICTReplayCore=api})(typeof globalThis!=='undefined'?globalThis:null,function(){
'use strict';
function normalize(input,frameMs){
 const m=new Map();for(const r of input||[]){const start=Number(r.start),open=Number(r.open),high=Number(r.high),low=Number(r.low),close=Number(r.close);
 if(!r.confirmed||!Number.isSafeInteger(start)||![open,high,low,close].every(v=>Number.isFinite(v)&&v>0)||high<Math.max(open,close,low)||low>Math.min(open,close,high))continue;
 if(m.has(start))throw Error('البيانات تتضمن توقيت شمعة مكررًا');m.set(start,{start,open,high,low,close});}
 const out=[...m.values()].sort((a,b)=>a.start-b.start);
 if(!out.length)throw Error('لا توجد شموع مكتملة');if(frameMs&&out.some((v,i)=>i&&v.start-out[i-1].start!==frameMs))throw Error('التاريخ يحتوي على فجوات؛ اختر فترة متصلة');return out;
}
function init(bars,visible=35){if(!Array.isArray(bars)||bars.length<50)throw Error('يلزم 50 شمعة مكتملة متصلة على الأقل');const n=Math.min(Math.max(20,visible),bars.length-12);return {bars,shown:n-1,action:null,history:[],finished:false};}
function propose(state,side){if(state.action)throw Error('هناك صفقة تدريبية مفتوحة');if(!['buy','sell','wait'].includes(side))throw Error('قرار غير صالح');if(state.shown>=state.bars.length-1)throw Error('انتهت الشموع');
 if(side==='wait')return {...state,history:[...state.history,{kind:'wait',at:state.bars[state.shown].start}]};
 const subset=state.bars.slice(Math.max(0,state.shown-9),state.shown+1),lo=Math.min(...subset.map(b=>b.low)),hi=Math.max(...subset.map(b=>b.high));
 return {...state,action:{side,proposedAt:state.bars[state.shown].start,stopReference:side==='buy'?lo:hi,status:'pending',entry:null,stop:null,target:null,openedAt:null},history:[...state.history,{kind:'decision',side,at:state.bars[state.shown].start}]};
}
function step(state){if(state.shown>=state.bars.length-1)return {...state,finished:true};const shown=state.shown+1,c=state.bars[shown];let action=state.action,hist=state.history.slice();
 if(action?.status==='pending'){
   const entry=c.open,stop=action.stopReference,risk=action.side==='buy'?entry-stop:stop-entry;
   if(risk<=0||risk/entry>0.08){hist.push({kind:'rejected',reason:'مستوى الوقف غير صالح أو مخاطرة سعرية كبيرة',at:c.start});action=null;}
   else {action={...action,status:'active',entry,stop,target:action.side==='buy'?entry+2*risk:entry-2*risk,openedAt:c.start};hist.push({kind:'opened',at:c.start,entry,stop,target:action.target});}
 }
 if(action?.status==='active'){
   const hitStop=action.side==='buy'?c.low<=action.stop:c.high>=action.stop;
   const hitTarget=action.side==='buy'?c.high>=action.target:c.low<=action.target;
   if(hitStop||hitTarget){const outcome=hitStop&&hitTarget?'ambiguous':hitStop?'loss':'win';hist.push({kind:'closed',outcome,at:c.start,entry:action.entry,stop:action.stop,target:action.target,r:outcome==='win'?2:outcome==='loss'?-1:null});action=null;}
 }
 if(shown===state.bars.length-1&&action){hist.push({kind:'unresolved',at:c.start});action=null;}
 return {...state,shown,action,history:hist,finished:shown===state.bars.length-1};
}
function stats(history){const closed=history.filter(x=>x.kind==='closed');return {decisions:history.filter(x=>x.kind==='decision').length,win:closed.filter(x=>x.outcome==='win').length,loss:closed.filter(x=>x.outcome==='loss').length,ambiguous:closed.filter(x=>x.outcome==='ambiguous').length,totalR:closed.reduce((a,x)=>a+(x.r||0),0)};}
return Object.freeze({normalize,init,propose,step,stats});
});
