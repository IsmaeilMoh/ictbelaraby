/* ICT بالعربي 6.8.85 — local, optional daily review. No trading/market logic. */
(()=>{'use strict';
const root=document.querySelector('.daily-readiness');if(!root)return;
const key='ict-daily-readiness-v6885';
const allowed=['calendar','session','context','risk','discipline'];
const boxes=[...root.querySelectorAll('input[data-readiness]')];
const status=root.querySelector('#readiness-status');
const updated=root.querySelector('#readiness-updated');
const dateKey=()=>{const now=new Date();return [now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-')};
let record={date:dateKey(),done:[],updatedAt:null};
function restore(){try{const raw=JSON.parse(localStorage.getItem(key)||'null');if(raw&&raw.date===dateKey()&&Array.isArray(raw.done)){record={date:dateKey(),done:[...new Set(raw.done.filter(k=>allowed.includes(k)))],updatedAt:typeof raw.updatedAt==='string'?raw.updatedAt:null};return;}}catch(_){}record={date:dateKey(),done:[],updatedAt:null};}
function draw(){const n=record.done.length;for(const b of boxes)b.checked=record.done.includes(b.dataset.readiness);status.textContent=n+' من '+allowed.length+' خطوات تمت مراجعتها';updated.textContent=record.updatedAt?'آخر مراجعة اليوم: '+new Date(record.updatedAt).toLocaleTimeString('ar',{hour:'2-digit',minute:'2-digit'}):'لم تُسجل مراجعة اليوم بعد.';}
function persist(){record.updatedAt=new Date().toISOString();try{localStorage.setItem(key,JSON.stringify(record))}catch(_){updated.textContent='تعذر حفظ المراجعة محليًا؛ قد لا تبقى بعد إغلاق الصفحة.'}draw();}
function ensureDay(){if(record.date===dateKey())return;restore();draw();}
root.addEventListener('change',e=>{const b=e.target.closest('input[data-readiness]');if(!b)return;ensureDay();record.done=boxes.filter(x=>x.checked).map(x=>x.dataset.readiness).filter(x=>allowed.includes(x));persist();});
root.querySelector('#readiness-reset').addEventListener('click',()=>{ensureDay();if(!record.done.length)return; if(!confirm('إعادة ضبط خطوات مراجعة اليوم على هذا الجهاز؟'))return;record.done=[];persist();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)ensureDay()});
restore();draw();
})();
