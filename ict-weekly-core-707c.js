/* ICT بالعربي 7C — pure weekly journal summaries; date-only trade entries are NOT timestamps. */
(function(root){'use strict';
const MS=86400000;
function validDate(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(s)))return false;const n=Date.parse(s+'T00:00:00Z');return Number.isFinite(n)&&new Date(n).toISOString().slice(0,10)===s}
function day(s){return Date.parse(s+'T00:00:00Z')/MS}
function iso(n){return new Date(n*MS).toISOString().slice(0,10)}
function monday(s){if(!validDate(s))throw new Error('Invalid date');const n=day(s),weekday=new Date(n*MS).getUTCDay();return iso(n-((weekday+6)%7))}
function todayNY(now=new Date()){const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);const o=Object.fromEntries(parts.map(p=>[p.type,p.value]));return `${o.year}-${o.month}-${o.day}`}
function weekFor(offset=1,today=todayNY()){const base=day(monday(today))-7*Number(offset);return {start:iso(base),end:iso(base+6),priorStart:iso(base-7),priorEnd:iso(base-1),current:offset===0};}
function scope(rows,account){return rows.filter(r=>account==='all'||(account==='unassigned'?!r.accountId:r.accountId===account))}
function summarize(rows,account,period){const all=scope(rows,account),inRange=(start,end)=>all.filter(r=>r.date>=start&&r.date<=end).sort((a,b)=>a.date.localeCompare(b.date)||a.order-b.order);const current=inRange(period.start,period.end),previous=inRange(period.priorStart,period.priorEnd),metric=root.ICTPerformance7B.metrics;const m=metric(current),prev=metric(previous),reviewed=current.filter(r=>r.reviewed),reviewedAdherence=reviewed.filter(r=>r.adherence!=='unreviewed'),bad=reviewedAdherence.filter(r=>r.adherence==='no'||r.adherence==='partial');const mistakes=new Map();for(const r of reviewed){if(r.mistake&&r.mistake!=='none')mistakes.set(r.mistake,(mistakes.get(r.mistake)||0)+1)}const sorted=[...mistakes].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));return {period,account,metrics:m,previous:prev,reviewed:reviewed.length,unreviewed:m.n-reviewed.length,adherenceReviewed:reviewedAdherence.length,adherenceExceptions:bad.length,mistakes:sorted,bySession:root.ICTPerformance7B.groups(current,'session'),byStrategy:root.ICTPerformance7B.groups(current,'strategy'),enough:m.n>=10,previousEnough:prev.n>=10,reviewCoverage:m.n?reviewed.length/m.n:null,rows:current};}
function suggested(summary){const n=summary.metrics.n;const p=[];if(n===0){p.push({id:'record',title:'توثيق الصفقات المنفذة',target:'سجّل وراجع كل صفقة خلال الأسبوع القادم؛ لا تختلق صفقات لزيادة العينة.'});return p}
if(summary.reviewCoverage===null||summary.reviewCoverage<0.8)p.push({id:'review',title:'رفع تغطية مراجعة الصفقات',target:'راجع 100% من الصفقات الجديدة خلال 24 ساعة من تسجيلها، مع ذكر سبب القرار.'});
if(summary.mistakes.length){const [top,count]=summary.mistakes[0];p.push({id:'mistake',title:'مراجعة الخطأ الأكثر تكرارًا',target:`سجّل تحققًا مسبقًا من قواعد خطتك قبل كل صفقة، وراجع تكرار الرمز ${top} (ظهر ${count} مرة في المراجعات).`});}
if(summary.adherenceExceptions>0)p.push({id:'discipline',title:'توثيق التزام خطة التداول',target:'قبل كل صفقة جديدة، وثّق شروط الدخول والإبطال والمخاطرة، ثم قيّم الالتزام بعدها.'});
if(n<10)p.push({id:'sample',title:'تحسين جودة العينة',target:'استمر بتسجيل الصفقات التي تنفذها فعلًا؛ لا تستنتج أفضلية نموذج من هذه العينة المحدودة.'});
if(!p.length)p.push({id:'evidence',title:'تثبيت عادة مراجعة الأداء',target:'راجع خطة المخاطرة ومبررات الدخول لكل صفقة جديدة، وسجّل ما اختلف عن الخطة.'});
return p.slice(0,3)}
const api={validDate,monday,todayNY,weekFor,scope,summarize,suggested};root.ICTWeekly7C=Object.freeze(api);if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='object'?window:globalThis);
