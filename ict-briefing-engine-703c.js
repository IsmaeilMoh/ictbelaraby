/* ICT بالعربي / 3C — a sourced, expiring daily briefing, not a trade signal. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.ICTBriefingEngine=api})(typeof globalThis!=='undefined'?globalThis:null,function(){
'use strict';const HOUR=3600000;
function assert(condition,message){if(!condition)throw Error(message)}
function build(context,assessment,opts={}){
 const now=Number.isFinite(opts.now)?opts.now:Date.now(),market=String(opts.market||''),symbol=String(opts.symbol||'');
 assert(context?.previousDay&&Array.isArray(assessment?.scenarios)&&assessment.scenarios.length===2,'بيانات السياق والسيناريوهات غير مكتملة');
 assert(market&&symbol,'الأصل أو فئة السوق غير محددين');
 const pd=context.previousDay,pw=context.priorWeek||null;
 const scenarios=assessment.scenarios.map(s=>({direction:s.direction,status:String(s.status||''),score:Number(s.score)||0,evidence:[...(s.evidence||[])].map(String),awaiting:[...(s.awaiting||[])].map(String),invalidation:String(s.invalidation||''),targets:(s.targets||[]).map(t=>({name:String(t.name),value:Number(t.value)})),zone:s.zone?{low:Number(s.zone.low),high:Number(s.zone.high),at:s.zone.at}:null}));
 const warnings=[...(assessment.warnings||[]),...(context.weekWarning?[context.weekWarning]:[])].map(String);
 const qualified=assessment.qualified===true&&Number.isFinite(assessment.price)&&assessment.price>0;
 const priceAt=Number.isFinite(context.priceAt)?context.priceAt:null;
 const sourceExpiry=priceAt==null?now:priceAt+HOUR+3*HOUR;
 const expiresAt=Math.max(now,Math.min(now+HOUR,sourceExpiry));
 const health=qualified&&sourceExpiry>now?'مراجعة بحثية ببيانات حديثة':'بيانات غير كافية أو متأخرة — للمراقبة فقط';
 const bulletin={version:1,market,symbol,source:String(context.sources||assessment.source||'غير محدد'),session:String(context.sourceDay||'America/New_York'),createdAt:now,expiresAt,price:qualified?context.price:null,priceAt,previousDay:{key:pd.key,high:pd.high,low:pd.low,midpoint:pd.midpoint},priorWeek:pw?{key:pw.key,high:pw.high,low:pw.low}:null,health,qualified,warnings,scenarios,disclaimer:'نشرة بحثية من شموع مكتملة؛ ليست توصية شراء أو بيع. لا تضمن الأسعار أو المستويات التطابق مع مزود TradingView. الفحص يدوي أو أثناء فتح الصفحة فقط.'};
 bulletin.fingerprint=signature(bulletin);return bulletin;
}
function signature(b){return JSON.stringify([b.market,b.symbol,b.session,b.source,b.qualified,b.previousDay,b.priorWeek,b.health,b.scenarios.map(s=>[s.direction,s.score,s.status,s.evidence,s.awaiting,s.invalidation,s.targets,s.zone]),b.warnings]);}
function compare(previous,current){if(!previous)return {changed:false,first:true,items:['أول نشرة محفوظة لهذا الأصل والإعداد.']};
 const items=[];if(previous.previousDay?.key!==current.previousDay?.key)items.push('بدأ يوم مرجعي جديد بتوقيت نيويورك');if(previous.priorWeek?.key!==current.priorWeek?.key)items.push('تغير الأسبوع المرجعي');if(previous.qualified!==current.qualified)items.push(current.qualified?'تحسنت صلاحية البيانات':'لم تعد البيانات كافية');
 for(const s of current.scenarios){const old=previous.scenarios?.find(x=>x.direction===s.direction);if(old&&(s.score!==old.score||s.status!==old.status||JSON.stringify(s.evidence)!==JSON.stringify(old.evidence)))items.push('تغيرت أدلة السيناريو '+(s.direction==='bull'?'الصعودي':'الهبوطي'));}
 const changed=previous.fingerprint!==current.fingerprint;return {changed,first:false,items:changed?(items.length?items:['تغيرت تفاصيل أو تحذيرات النشرة']):['لم تتغير الشروط الأساسية منذ آخر فحص']};
}
function expired(b,now=Date.now()){return !b||!Number.isFinite(b.expiresAt)||now>=b.expiresAt}
return Object.freeze({build,compare,expired,signature});
});
