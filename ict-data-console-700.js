/* Data Foundation 7.0: diagnostics UI, opt-in fetch only. */
(function(){
'use strict';
const root=document.getElementById('ict-data-foundation');if(!root||!window.ICTDataCore)return;
const api=window.ICTDataCore,results=document.getElementById('ict-df-results'),summary=document.getElementById('ict-df-summary'),status=document.getElementById('ict-df-status');
let last=[];
const ar={usable:'مكتمل بشروط',limited:'معلومات ناقصة',stale:'متأخر',invalid:'غير صالح',unavailable:'غير متاح',fresh:'حديث وفق الحد المحدد',dated:'مؤرخ',unknown:'غير معروف',future:'توقيت مستقبلي'};
function node(tag,className,txt){const el=document.createElement(tag);if(className)el.className=className;if(txt!==undefined)el.textContent=String(txt);return el}
function line(parent,label,value){const el=node('div','ict-df-line');el.append(node('span','',label),node('strong','',value));parent.append(el)}
function render(){results.replaceChildren();summary.replaceChildren();
const counts={usable:0,limited:0,stale:0,invalid:0,unavailable:0};for(const r of last)counts[r.quality]=(counts[r.quality]||0)+1;
for(const [k,label] of [['usable','سليم بشروط'],['limited','بحاجة لمراجعة'],['stale','متأخر'],['invalid','غير صالح'],['unavailable','غير متاح']]){const tile=node('div','ict-df-stat');tile.append(node('small','',label),node('b','',counts[k]));summary.append(tile)}
for(const r of last){const card=node('article','ict-df-card'),head=node('div','ict-df-card-head');head.append(node('strong','',r.label||r.id));const badge=node('span','ict-df-badge ict-df-'+r.quality,ar[r.quality]||r.quality);head.append(badge);card.append(head);
line(card,'عدد السجلات',r.count??0);line(card,'سجلات غير صالحة',r.invalidCount??0);if(r.staleCount)line(card,'سجلات متأخرة',r.staleCount);
if(r.duplicateCount)line(card,'مكررة',r.duplicateCount);
line(card,'آخر تحديث للملف',r.updatedAt?new Date(r.updatedAt).toLocaleString('ar',{dateStyle:'medium',timeStyle:'short'}):'غير موثق');
line(card,'المصدر',r.origin||'غير محدد');
const problems=[...(r.issues||[])];for(const rec of r.records||[]){if(rec.invalid||rec.issues?.length)for(const i of rec.issues||[])if(!problems.some(p=>p.code===i.code))problems.push(i)}
const details=node('details','ict-df-details');details.append(node('summary','',`ملاحظات الجودة (${problems.length})`));const list=node('ul');if(!problems.length)list.append(node('li','','لا توجد ملاحظات بنيوية في العينة المتاحة. هذا لا يضمن صحة المصدر أو ملاءمة التداول.'));else for(const p of problems.slice(0,16))list.append(node('li','',p.detail));if(problems.length>16)list.append(node('li','',`+ ${problems.length-16} ملاحظات أخرى في التقرير`));details.append(list);card.append(details);results.append(card)}
status.textContent=`اكتمل فحص ${last.length} مصدرًا • ${new Date().toLocaleString('ar')}. التصنيف يعتمد على أوقات البيانات المنشورة وليس أسعار التنفيذ.`;
}
const refresh=document.getElementById('ict-df-refresh'),exportBtn=document.getElementById('ict-df-export');
refresh?.addEventListener('click',async()=>{refresh.disabled=true;status.textContent='جارٍ فحص مصادر البيانات المنشورة…';try{last=await api.checkAll({timeout:9000});render();exportBtn.disabled=false}catch(e){status.textContent='تعذر إكمال الفحص: '+(e.message||'خطأ غير معروف')}finally{refresh.disabled=false}});
exportBtn?.addEventListener('click',()=>{if(!last.length)return;const sanitized=last.map(r=>({id:r.id,quality:r.quality,origin:r.origin,updatedAt:r.updatedAt,count:r.count,invalidCount:r.invalidCount,staleCount:r.staleCount,duplicateCount:r.duplicateCount,issues:r.issues,recordIssues:(r.records||[]).filter(x=>x.issues?.length).map(x=>({symbol:x.symbol,at:x.at,issues:x.issues})).slice(0,150)}));const blob=new Blob([JSON.stringify({schema:'ict-data-quality-v1',generatedAt:new Date().toISOString(),note:'تشخيص بنيوي فقط، لا يعادل التحقق من مزود الأسعار أو من عمليات التداول.',sources:sanitized},null,2)],{type:'application/json;charset=utf-8'});const url=URL.createObjectURL(blob);const a=node('a');a.href=url;a.download='ict-data-quality-report.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)});
})();
