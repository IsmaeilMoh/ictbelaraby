/* ICT بالعربي 6.9.12 — deterministic local decision mathematics; no broker/API or trading orders */
(function(root){'use strict';
const n=v=>v===null||v===undefined||String(v).trim()===''?null:(Number.isFinite(Number(v))?Number(v):null);
const good=(x)=>x!==null&&Number.isFinite(x);
function tradeMath(d,equity){
 const entry=n(d.entry),stop=n(d.stop),target=n(d.target),riskPct=n(d.riskPct),eq=n(equity);
 const issues=[];
 if(!good(eq)||eq<=0)issues.push('Equity الحساب غير مدخلة أو غير صالحة.');
 if(!good(riskPct)||riskPct<=0||riskPct>100)issues.push('نسبة المخاطرة يجب أن تكون أكبر من صفر ولا تتجاوز 100%.');
 if(!['BUY','SELL'].includes(d.direction))issues.push('اختر BUY أو SELL للحساب السعري؛ WAIT يعني عدم وجود صفقة حالية.');
 if(![entry,stop,target].every(good)||![entry,stop,target].every(x=>x>0))issues.push('أدخل سعر دخول ووقف وهدف موجبة وصحيحة.');
 if(issues.length)return {valid:false,issues};
 const buy=d.direction==='BUY';
 if(buy&&!(stop<entry&&target>entry)||!buy&&!(stop>entry&&target<entry))issues.push('موضع الوقف والهدف غير متسق مع اتجاه الصفقة.');
 if(issues.length)return {valid:false,issues};
 const dist=Math.abs(entry-stop),rewardDist=Math.abs(target-entry),risk=eq*riskPct/100,rr=rewardDist/dist;
 const pointValue=n(d.pointValue),step=n(d.lotStep),fee=n(d.executionFee);
 const result={valid:true,issues:[],risk,dist,rr,pointValue:null,quantity:null,realRisk:null,netRR:null};
 if(good(pointValue)&&pointValue>0&&good(step)&&step>0){
   const raw=risk/(dist*pointValue);const quantity=Math.floor((raw+1e-10)/step)*step;
   if(quantity>0&&Number.isFinite(quantity)){
    result.pointValue=pointValue;result.quantity=Number(quantity.toPrecision(12));result.realRisk=dist*pointValue*result.quantity;
    if(good(fee)&&fee>=0)result.netRR=(rewardDist*pointValue*result.quantity-fee)/result.realRisk;
   }else result.issues.push('ميزانية المخاطرة أقل من الحد الأدنى لحجم المركز وفق مدخلاتك.');
 }else result.issues.push('حجم المركز غير محسوب: أدخل القيمة النقدية لكل حركة سعرية بمقدار 1.0 للوحدة والحد الأدنى لخطوة الحجم، وفق مواصفات الوسيط.');
 return result;
}
function stress(account,limitMoney,plannedRisk,losses,extra){
 const eq=n(account?.guardian?.equity),proposed=n(plannedRisk),reserved=n(account?.guardian?.reservedRisk)||0,buffer=n(account?.guardian?.safetyBuffer)||0, slip=n(extra);
 if(!good(eq)||eq<=0||!good(proposed)||proposed<0||!Number.isInteger(losses)||losses<1||losses>20||!good(slip)||slip<0)return {valid:false,reason:'أكمل Equity ومخاطرة الصفقة وعدد الخسائر وتكلفة السيناريو بصورة صحيحة.'};
 const total=(proposed+slip)*losses; const after=eq-total;
 const room=good(n(limitMoney))?n(limitMoney):null;
 return {valid:true,after,total,room,availableAfter:room===null?null:room-total,breach:room===null?null:total>room,eq,reserved,buffer};
}
function sessionAt(date){
 const d=date instanceof Date?date:new Date(date);
 if(!Number.isFinite(d.getTime()))return {name:'غير معروف',minute:null};
 const fmt=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hour12:false,weekday:'short'});
 const parts=Object.fromEntries(fmt.formatToParts(d).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
 const minute=(Number(parts.hour)%24)*60+Number(parts.minute);const weekday=parts.weekday;
 if(['Sat','Sun'].includes(weekday))return {name:'عطلة نهاية الأسبوع بتوقيت نيويورك',minute,closed:true};
 const inside=(a,b)=>minute>=a&&minute<b;
 const labels=[];
 if(inside(2*60,5*60))labels.push('London Kill Zone');
 if(inside(7*60,10*60))labels.push('New York Kill Zone');
 if(inside(10*60,11*60))labels.push('London Close');
 if(inside(10*60,11*60))labels.push('NY AM Silver Bullet');
 if(inside(14*60,15*60))labels.push('NY PM Silver Bullet');
 return {name:labels.length?labels.join(' · '):'خارج النوافذ المرجعية المبسطة',minute,closed:false};
}
function evaluate(p){
 const block=[],review=[],unknown=[],ok=[];
 const account=p.account, risk=p.risk||{},trade=p.trade||{},checks=p.checks||[];
 if(!account)unknown.push('لا يوجد حساب محدد.');
 if(risk.state==='block')block.push(risk.reason||'خرق حد الحساب.');
 else if(risk.state!=='ok')unknown.push(risk.reason||'لا يمكن التحقق من الحدود.');
 else ok.push('المخاطرة ضمن حدود الحساب المدخلة.');
 if(trade.valid){ok.push('موضع الوقف والهدف متسق مع اتجاه الصفقة.'); if(trade.rr<(p.minRR||1))block.push('العائد إلى المخاطرة أقل من الحد الأدنى الذي حددته.');}
 else unknown.push(...(trade.issues||['بيانات الدخول/الوقف/الهدف ناقصة.']));
 for(const c of checks){if(!c.done){const status=c.level==='warning'?review:unknown;status.push('شرط '+c.name+' لم يؤكد المستخدم تحققه.')}}
 if(p.news==='near')review.push('خبر اقتصادي قريب وفق إفادة المستخدم: راجع توقيته ومخاطر التقلب.');
 else if(p.news==='unknown')unknown.push('قرب الأخبار الاقتصادية غير متحقق تلقائيًا؛ راجع الأجندة.');
 if(p.session==='outside')review.push('وقت الدخول خارج جلسة الاستراتيجية التي حددتها.');
 else if(p.session==='unknown')unknown.push('جلسة الدخول لم يجرِ تأكيدها؛ ساعة نيويورك وحدها لا تثبت ملاءمة الجلسة.');
 if(p.higherTimeframe==='against')review.push('الاتجاه على الإطار الأعلى معاكس لفكرة الصفقة وفق تقييمك.');
 else if(p.higherTimeframe==='unknown')unknown.push('الانحياز على الإطار الأعلى غير مؤكد.');
 if(p.stale)unknown.push('بيانات الحساب قديمة؛ حدّث Equity والصفقات المفتوحة.');
 return {state:block.length?'block':unknown.length?'unknown':review.length?'review':'conditional',block,review,unknown,ok};
}
root.ICTWorkspaceDecision={tradeMath,stress,sessionAt,evaluate,n};
})(typeof window!=='undefined'?window:globalThis);
