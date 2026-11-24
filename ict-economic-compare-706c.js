/* ICT بالعربي 7.0 / 6C — Research-only economic event comparisons. No forecasts/signals. */
(function(root,factory){'use strict';const lib=factory();if(typeof module==='object'&&module.exports)module.exports=lib;if(root)root.ICTEconomicCompare706C=lib})(typeof globalThis!=='undefined'?globalThis:null,function(){
'use strict';
const WINDOWS=[5,15,60];
function normalizeTitle(value){return String(value||'').toLowerCase().replace(/[\u064b-\u065f]/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim()}
function parseFigure(input){
 let s=String(input??'').trim().replace(/\s/g,'').replace(/,/g,'');if(!s||/^(?:n\/a|na|—|-|غيرمتاح|pending|null)$/i.test(s))return null;
 const m=s.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))(%|[kKmMbB])?$/);if(!m)return null;
 const n=Number(m[1]),unit=(m[2]||'').toUpperCase();if(!Number.isFinite(n))return null;
 return {value:n*(unit==='K'?1e3:unit==='M'?1e6:unit==='B'?1e9:1),unit:unit==='%'?'%':'count',original:s};
}
function surprise(event){const a=parseFigure(event?.actual),f=parseFigure(event?.forecast);if(!a||!f)return {status:'missing',reason:'الفعلي أو المتوقع مفقود أو بصيغة غير رقمية'};
 if(a.unit!==f.unit)return {status:'incompatible',reason:'وحدة الفعلي والمتوقع مختلفة'};
 const difference=a.value-f.value;return {status:'measured',difference,unit:a.unit,relativePct:f.value===0?null:difference/Math.abs(f.value)*100,actual:a.value,forecast:f.value};
}
function qualityFor(windows){return WINDOWS.every(n=>windows?.find(w=>w.minutes===n)?.status==='measured')?'complete':WINDOWS.some(n=>windows?.find(w=>w.minutes===n)?.status==='measured')?'partial':'unavailable'}
function summarizeGroups(records,groupKey,minimum=5){
 const groups=new Map();for(const r of records){const key=String(groupKey(r)||'غير مصنف');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r)}
 return [...groups].map(([name,entries])=>{
   const stats={};for(const minutes of WINDOWS){const measured=entries.map(r=>r.result?.windows?.find(w=>w.minutes===minutes)).filter(w=>w?.status==='measured');
    const avg=k=>measured.length?measured.reduce((acc,w)=>acc+w[k],0)/measured.length:null;
    const sample=measured.length;stats[minutes]={sample,excluded:entries.length-sample,meanAbsChangePct:sample?measured.reduce((a,w)=>a+Math.abs(w.changePct),0)/sample:null,meanChangePct:avg('changePct'),meanRangePct:avg('rangePct'),positive:measured.filter(w=>w.changePct>0).length,negative:measured.filter(w=>w.changePct<0).length,status:sample>=minimum?'exploratory':'insufficient'};
   }
   return {name,total:entries.length,stats};
 }).sort((a,b)=>b.total-a.total);
}
function summarizeSurprises(records,minimum=5){
 const measured=records.filter(r=>r.surprise?.status==='measured'&&r.result?.windows?.find(w=>w.minutes===15)?.status==='measured');
 const positive=measured.filter(r=>r.surprise.difference>0),negative=measured.filter(r=>r.surprise.difference<0),zero=measured.filter(r=>r.surprise.difference===0);
 const avgAbs=arr=>arr.length?arr.reduce((a,r)=>a+Math.abs(r.result.windows.find(w=>w.minutes===15).changePct),0)/arr.length:null;
 return {positive:{count:positive.length,meanAbs15Pct:avgAbs(positive),status:positive.length>=minimum?'exploratory':'insufficient'},negative:{count:negative.length,meanAbs15Pct:avgAbs(negative),status:negative.length>=minimum?'exploratory':'insufficient'},zero:{count:zero.length,meanAbs15Pct:avgAbs(zero),status:zero.length>=minimum?'exploratory':'insufficient'},excluded:records.length-measured.length};
}
function filterEvents(events,opts={}){
 return (events||[]).filter(e=>Number.isFinite(e.when)&&e.when<(opts.now||Date.now())-61*60000&&(!opts.currency||e.currency===opts.currency)&&(!opts.title||normalizeTitle(e.title).includes(normalizeTitle(opts.title)))&&(!opts.impact||String(e.importance||'').toLowerCase()===opts.impact.toLowerCase())).sort((a,b)=>b.when-a.when);
}
return Object.freeze({WINDOWS,normalizeTitle,parseFigure,surprise,qualityFor,summarizeGroups,summarizeSurprises,filterEvents});
});
