/* ICT بالعربي 7A — Local multi-account registry. No network, no automatic migration. */
(function(root){'use strict';
 const KEY='ict-accounts-7a-v1',SELECT='ict-accounts-7a-selected';
 const N=x=>x===''||x===null||x===undefined?NaN:Number(x);
 const finite=x=>Number.isFinite(x)&&x>=0;
 const makeId=()=>root.crypto&&crypto.randomUUID?crypto.randomUUID():'acc-'+Date.now()+'-'+Math.random().toString(36).slice(2,10);
 const safeText=(x,n)=>String(x??'').trim().slice(0,n);
 function clean(a){if(!a||typeof a!=='object')return null;
  const type=a.type==='funded'?'funded':a.type==='personal'?'personal':null;
  const name=safeText(a.name,60),currency=['USD','EUR','GBP'].includes(a.currency)?a.currency:'USD';
  if(!type||!name||!finite(N(a.initial))||!finite(N(a.balance))||!finite(N(a.equity)))return null;
  const risk=N(a.riskPct),daily=N(a.dailyPct),total=N(a.totalPct);
  if(!Number.isFinite(risk)||risk<=0||risk>100)return null;
  if(type==='funded'&&(!Number.isFinite(daily)||daily<=0||daily>100||!Number.isFinite(total)||total<=0||total>100))return null;
  const dayStart=finite(N(a.dayStart))?N(a.dayStart):N(a.balance),highWater=finite(N(a.highWater))?N(a.highWater):Math.max(N(a.initial),N(a.balance));
  return {id:safeText(a.id,80)||makeId(),type,name,currency,initial:N(a.initial),balance:N(a.balance),equity:N(a.equity),dayStart,highWater,drawdownMode:a.drawdownMode==='trailing'?'trailing':'static',riskPct:risk,dailyPct:type==='funded'?daily:null,totalPct:type==='funded'?total:null,updatedAt:typeof a.updatedAt==='string'?a.updatedAt:new Date().toISOString()};
 }
 function list(){try{const a=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(a)?a.slice(0,60).map(clean).filter(Boolean):[]}catch{return []}}
 function save(rows){if(!Array.isArray(rows)||rows.length>60)throw Error('حد الحسابات 60');const cleaned=rows.map(clean);if(cleaned.some(x=>!x))throw Error('بيانات حساب غير صالحة');if(new Set(cleaned.map(x=>x.id)).size!==cleaned.length)throw Error('حسابات مكررة');localStorage.setItem(KEY,JSON.stringify(cleaned));root.dispatchEvent(new CustomEvent('ict:accounts-changed'));return cleaned;}
 function selected(){try{return localStorage.getItem(SELECT)||''}catch{return ''}}
 function choose(id){if(id&&!list().some(x=>x.id===id))throw Error('الحساب غير موجود');localStorage.setItem(SELECT,id||'');root.dispatchEvent(new CustomEvent('ict:account-selected',{detail:{id}}));}
 function evaluate(a,planned){const amount=N(planned);if(!a||!Number.isFinite(amount)||amount<0)return {ok:false,message:'أدخل قيمة مخاطرة صحيحة'};
  const perTrade=a.equity*a.riskPct/100;
  if(amount>perTrade+1e-8)return {ok:false,perTrade,message:'المخاطرة تتجاوز حد الصفقة الذي حددته لهذا الحساب'};
  if(a.type==='personal')return {ok:true,perTrade,message:'ضمن حد الصفقة الشخصي المحدد؛ لا تُطبّق قواعد شركات التمويل'};
  // Conservative estimate, not a substitute for firm-specific daily reset/high-water rules.
  const dailyFloor=a.dayStart-a.initial*a.dailyPct/100;
  const reference=a.drawdownMode==='trailing'?Math.max(a.highWater,a.initial,a.balance):a.initial;
  const totalFloor=reference-a.initial*a.totalPct/100;
  const remaining=Math.min(a.equity-dailyFloor,a.equity-totalFloor);
  return {ok:remaining>=amount-1e-8,perTrade,remaining,dailyFloor,totalFloor,message:remaining>=amount?'ضمن الحدود التقريبية المدخلة للحساب الممول':'المخاطرة تتجاوز الهامش المتبقي من حد السحب اليومي أو الإجمالي'};
 }
 root.ICTAccounts7A=Object.freeze({KEY,SELECT,clean,list,save,selected,choose,evaluate});
})(window);
