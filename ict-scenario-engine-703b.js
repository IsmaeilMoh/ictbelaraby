/* ICT بالعربي · 7.0/3B · Conditional scenarios, not signals. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.ICTScenarioEngine=api})(typeof globalThis!=='undefined'?globalThis:null,function(){
'use strict';const HOUR=3600000;
function finite(x){return typeof x==='number'&&Number.isFinite(x)&&x>0}
function build(context,structure,opts={}){
 const now=Number.isFinite(opts.now)?opts.now:Date.now();
 if(!context||!context.previousDay||!structure)throw Error('بيانات السياق أو الهيكل ناقصة');
 const structureMs=opts.frame==='D'?24*HOUR:opts.frame==='240'?4*HOUR:HOUR;
 const frameLabel=opts.frame==='D'?'اليوم':opts.frame==='240'?'أربع ساعات':'الساعة';
 const day=context.previousDay;
 if(!finite(day.high)||!finite(day.low)||day.high<=day.low)throw Error('حدود اليوم السابق غير صالحة');
 const price=context.price;
 const fresh=finite(price)&&Number.isFinite(context.priceAt)&&now-(context.priceAt+HOUR)<=3*HOUR&&now>=context.priceAt+HOUR;
 const eligible=structure.eligible===true&&structure.usableBars>=structure.minimum&&Number.isFinite(structure.last)&&structure.last+structureMs<=now&&now-(structure.last+structureMs)<=(structureMs===HOUR?3*HOUR:structureMs-1);
 const dataOK=fresh&&eligible;
 const lastAt=structure.last||0;
 // An event counts as recent only if its candle is within 24 completed structure bars of the latest candle.
 const firstAt=Number.isFinite(structure.first)?structure.first:lastAt-(structure.usableBars-1)*HOUR;
 const events=(Array.isArray(structure.events)?structure.events:[]).filter(e=>e&&e.type&&['BOS','MSS','SWEEP'].includes(e.type)&&['bull','bear'].includes(e.direction)&&Number.isFinite(e.at)&&e.at>=firstAt&&e.at<=lastAt&&lastAt-e.at<=24*structureMs);
 const zones=(Array.isArray(structure.zones)?structure.zones:[]).filter(z=>z&&z.type==='FVG'&&['bull','bear'].includes(z.direction)&&finite(z.low)&&finite(z.high)&&z.low<z.high&&z.mitigated!==true&&Number.isFinite(z.at)&&z.at>=firstAt&&z.at<=lastAt&&lastAt-z.at<=24*structureMs);
 const upper=context.priorWeek&&finite(context.priorWeek.high)?context.priorWeek.high:null;
 const lower=context.priorWeek&&finite(context.priorWeek.low)?context.priorWeek.low:null;
 function make(dir){const bull=dir==='bull',reference=bull?day.high:day.low,opposite=bull?day.low:day.high;
  const marketEvents=events.filter(e=>e.direction===dir);const pivot=marketEvents.filter(e=>e.type==='MSS'||e.type==='BOS').at(-1)||null;
  const sweep=events.filter(e=>e.type==='SWEEP'&&e.direction===dir).at(-1)||null;
  const zone=zones.filter(z=>z.direction===dir).at(-1)||null;
  const evidence=[];const awaiting=[];
  if(pivot)evidence.push(`${pivot.type} ${bull?'صعودي':'هبوطي'} مؤكد على إطار ${frameLabel}`);
  else awaiting.push(`ظهور BOS أو MSS ${bull?'صعودي':'هبوطي'} مؤكد على إطار ${frameLabel}`);
  if(sweep)evidence.push(`رُصد سحب سيولة ${bull?'أسفل قاع':'أعلى قمة'} في التاريخ الحديث`);
  else awaiting.push(`سحب سيولة ${bull?'سفلي':'علوي'} مؤكد (ليس شرطًا لعرض السيناريو، لكنه دليل إضافي)`);
  if(zone)evidence.push(`فجوة سعرية (${bull?'صعودية':'هبوطية'}) لم يعد السعر إليها منذ تكوّنها (FVG)`);
  else awaiting.push(`تكوّن FVG ${bull?'صعودية':'هبوطية'} حديثة غير ملامسة`);
  if(fresh){if(bull?price>reference:price<reference)evidence.push(`آخر إغلاق ساعة ${bull?'فوق قمة':'تحت قاع'} اليوم السابق`);
   else awaiting.push(`إغلاق ساعة مؤكدة ${bull?'فوق قمة':'تحت قاع'} اليوم السابق (${reference})`);
  }else awaiting.push('تسعيرة ساعة حديثة قبل التحقق من أي شرط سعري');
  const score=(pivot?1:0)+(sweep?1:0)+(zone?1:0)+(fresh&&(bull?price>reference:price<reference)?1:0);
  const note=!dataOK?'بيانات غير كافية أو متأخرة — للمراقبة فقط':score>=3?'أدلة متوافقة جزئيًا — لا تعتبر إشارة':score>0?'بعض الأدلة موجودة — شروط معلقة':'لا توجد أدلة حديثة كافية';
  // Invalidation is a condition, not an assumed executed stop. Always ground in last completed daily range.
  const invalidation=bull?`إغلاق ساعة دون قاع اليوم السابق (${opposite}) يلغي الفرضية المرجعية، أو ظهور كسر هيكلي هبوطي جديد`:`إغلاق ساعة فوق قمة اليوم السابق (${opposite}) يلغي الفرضية المرجعية، أو ظهور كسر هيكلي صعودي جديد`;
  const targets=[bull?{name:'قمة آخر يوم مكتمل',value:day.high}:{name:'قاع آخر يوم مكتمل',value:day.low}];
  if(bull&&upper!=null)targets.push({name:'قمة الأسبوع السابق',value:upper});if(!bull&&lower!=null)targets.push({name:'قاع الأسبوع السابق',value:lower});
  return {direction:dir,score,evidence,awaiting,status:note,invalidation,reference,targets,zone:zone?{low:zone.low,high:zone.high,at:zone.at}:null,structuralEvent:pivot?.at??null};
 }
 const warnings=[];
 if(!fresh)warnings.push('تسعيرة الساعة غير حديثة/غير متاحة');
 if(!eligible)warnings.push('هيكل إطار '+frameLabel+' غير متصل أو غير كافٍ أو متأخر');
 if(!context.priorWeek)warnings.push('مستويات الأسبوع السابق غير مكتملة؛ نستخدم اليوم السابق فقط');
 if(Array.isArray(structure.gaps)&&structure.gaps.length)warnings.push('وُجدت فجوات زمنية في بيانات إطار '+frameLabel+'؛ يُستخدم أحدث مقطع فقط');
 return {scenarios:[make('bull'),make('bear')],warnings,qualified:dataOK,price:fresh?price:null,sourceDay:context.sourceDay,source:context.sources,lastStructureAt:structure.last??null,checkedAt:now,disclaimer:'قراءة بحثية مشروطة، وليست توصية تداول أو توقع اتجاه. لا توجد احتمالات نجاح أو نقاط دخول تنفيذية. مستويات PDH/PDL وPWH/PWL مبنية على يوم نيويورك 00:00 من شموع الساعة المكتملة؛ وقد تختلف عن جلسة وسيط TradingView أو مصدر سعر مختلف.'};
}
return Object.freeze({build});
});
