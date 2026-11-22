/* ICT بالعربي 6.8.63 — shared, local-only funded-account limit math. */
(function(){'use strict';
function numeric(value){if(value===null||value===undefined||String(value).trim()==='')return null;const n=Number(value);return Number.isFinite(n)?n:null}
function calculate(g){
 if(!g||!['static','trailing'].includes(g.drawdownMode))return {error:'اختر طريقة تراجع صحيحة.'};
 const keys=['initial','balance','equity','dayStart','dailyPct','totalPct','plannedRisk'];if(g.drawdownMode==='trailing')keys.push('highWater');
 const n={};for(const key of keys){n[key]=numeric(g[key]);if(n[key]===null)return {error:'أدخل بيانات الحساب المطلوبة، بما فيها مخاطرة الصفقة المخططة.'}}
 for(const key of ['reservedRisk','safetyBuffer']){n[key]=numeric(g[key]);if(n[key]===null)n[key]=0}
 if(n.initial<=0||n.balance<0||n.equity<0||n.dayStart<=0||n.dailyPct<=0||n.dailyPct>100||n.totalPct<=0||n.totalPct>100||n.plannedRisk<0||n.reservedRisk<0||n.safetyBuffer<0)return {error:'تحقق من الأرصدة والنسب والمخاطر المحجوزة وهامش الأمان: لا تقبل الأرقام السالبة.'};
 if(g.drawdownMode==='trailing'&&n.highWater<Math.max(n.initial,n.balance))return {error:'أعلى رصيد مرجعي لا يمكن أن يقل عن الرصيد الابتدائي أو الحالي.'};
 const totalBase=g.drawdownMode==='trailing'?n.highWater:n.initial;
 const dailyFloor=n.dayStart*(1-n.dailyPct/100),totalFloor=totalBase*(1-n.totalPct/100);
 const dailyRemaining=n.equity-dailyFloor,totalRemaining=n.equity-totalFloor;
 const rawAllowed=Math.min(dailyRemaining,totalRemaining),allowed=rawAllowed-n.reservedRisk-n.safetyBuffer;
 const after=n.equity-n.reservedRisk-n.safetyBuffer-n.plannedRisk;
 return {n,dailyFloor,totalFloor,dailyRemaining,totalRemaining,rawAllowed,allowed,after,atRisk:allowed<=0||n.plannedRisk>allowed,totalBase};
}
window.ICTGuardianLimits={calculate};
})();
