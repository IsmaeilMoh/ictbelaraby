/* ICT بالعربي / 7.0 4C — chronological out-of-sample validation for FVG COMPONENT ONLY.
   No optimisation, no full-playbook win rate, no assumptions about intrabar fill order. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.ICTValidation4C=api})(typeof globalThis!=='undefined'?globalThis:null,function(){
'use strict';
const METHOD='FVG3-midpoint-1R-v1',VERSION='7.0.4c.1';
function finite(x){return Number.isFinite(x)}
function nyHour(t){const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',hourCycle:'h23'}).formatToParts(new Date(t));return Number(parts.find(x=>x.type==='hour').value)}
function session(t){const h=nyHour(t);if(h>=2&&h<5)return 'London KZ 02–05';if(h>=7&&h<10)return 'NY KZ 07–10';if(h>=10&&h<11)return 'NY Silver Bullet 10–11';return 'Other hours'}
function stats(arr,costR){const settled=arr.filter(x=>x.status==='win'||x.status==='loss');const wins=settled.filter(x=>x.status==='win').length;const losses=settled.length-wins;
 const returns=settled.map(x=>(x.status==='win'?1:-1)-costR),total=returns.reduce((a,b)=>a+b,0);
 let equity=0,peak=0,dd=0;for(const r of returns){equity+=r;peak=Math.max(peak,equity);dd=Math.max(dd,peak-equity)}
 return {observations:arr.length,win:wins,loss:losses,miss:arr.filter(x=>x.status==='miss').length,uncertain:arr.filter(x=>x.status==='uncertain').length,settled:settled.length,winRate:settled.length?wins/settled.length:null,avgR:settled.length?total/settled.length:null,totalR:settled.length?total:null,maxDrawdownR:settled.length?dd:null,overlapRisk:settled.some((x,i)=>i>0&&x.entryAt!=null&&settled[i-1].closedAt!=null&&x.entryAt<=settled[i-1].closedAt)};
}
function validate(rows,opts){opts=opts||{};const costR=Number(opts.costR??0.10),fraction=Number(opts.trainFraction??0.7),minimum=Number(opts.minSample??10);
 if(!finite(costR)||costR<0||costR>2)throw Error('تكلفة R يجب أن تكون بين 0 و2');if(!finite(fraction)||fraction<0.5||fraction>0.85)throw Error('تقسيم التدريب غير صالح');
 const sorted=(rows||[]).slice().sort((a,b)=>a.detectedAt-b.detectedAt);if(!sorted.length)return {version:VERSION,method:METHOD,status:'no_data',train:stats([],costR),test:stats([],costR),costR,groups:[],notes:['لا توجد حالات FVG من شموع مكتملة']};
 for(let i=0;i<sorted.length;i++){const x=sorted[i];if(!finite(x.detectedAt)||!['win','loss','miss','uncertain'].includes(x.status)||x.method!==METHOD||x.modelValidated!==false||(i&&x.detectedAt===sorted[i-1].detectedAt&&x.dir===sorted[i-1].dir))throw Error('تعذّر تجهيز بيانات الاختبار.')}
 const firstTest=Math.max(1,Math.floor(sorted.length*fraction));const testStart=sorted[firstTest]?.detectedAt;
 // Purge any training observation whose label can use candles from the validation period.
 const train=sorted.slice(0,firstTest).filter(x=>x.closedAt!=null&&testStart!=null&&x.closedAt<testStart);
 const dropped=firstTest-train.length;
 const test=sorted.slice(firstTest);
 const a=stats(train,costR),b=stats(test,costR);
 const groups=[...new Set(test.map(x=>session(x.detectedAt)))].map(name=>({session:name,...stats(test.filter(x=>session(x.detectedAt)===name),costR)}));
 const required=Math.max(3,Math.round(minimum));const adequate=a.settled>=required&&b.settled>=required;
 const notes=[`تقسيم زمني ثابت: ${Math.round(fraction*100)}% أولي و${Math.round((1-fraction)*100)}% لاحق؛ لا نختار القاعدة وفق نتائج الاختبار`,`${dropped} حالة تدريب استبعدت لغياب نتيجة محسومة قبل بدء الاختبار، لمنع تسرب معلومات مستقبلية`,'الحالات غير الحاسمة وغير المفعّلة معروضة ولا تدخل في مقام نسبة النجاح بين الحالات المحسومة','قد تتداخل نوافذ أحداث FVG؛ النتائج ليست صفقات مستقلة أو محاكاة تنفيذ واقعية','تكاليف R تقديرية ولا تعوّض محاكاة سبريد وانزلاق وعمولات كل أصل','التصنيف حسب ساعة ظهور الفجوة بتوقيت نيويورك، وليس بالضرورة ساعة الدخول الفعلية'];
 if(!adequate)notes.unshift('حجم العينة المحسومة صغير جدًا؛ لا يمكن اعتبار النتائج دليل صلاحية');
 return {version:VERSION,method:METHOD,status:adequate?'exploratory_only':'insufficient_evidence',costR,fraction,required,train:a,test:b,groups,trainingOmitted:dropped,testStart:testStart||null,notes,scope:'FVG component observation, NOT a full ICT model',fullModelsValidated:0};
}
return Object.freeze({VERSION,METHOD,validate,session});
});
