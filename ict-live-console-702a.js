/* ICT 7.0 Stage 2A — Bybit public candle monitor, runs only after user clicks. */
(function(){
'use strict';
const root=document.getElementById('ict-live-2a'),feed=window.ICTLiveFeed;if(!root||!feed)return;
const $=id=>document.getElementById(id),symbol=$('ict-live-symbol'),interval=$('ict-live-interval'),start=$('ict-live-start'),stop=$('ict-live-stop'),state=$('ict-live-state'),stats=$('ict-live-stats'),rows=$('ict-live-rows');
let connection=null,history=[],generation=0,started=false,connected=false,received=0,lastPacket=0;
function el(tag,klass,content){const x=document.createElement(tag);if(klass)x.className=klass;if(content!==undefined)x.textContent=String(content);return x}
function fmt(n){return typeof n==='number'&&Number.isFinite(n)?new Intl.NumberFormat('en-US',{maximumFractionDigits:8}).format(n):'—'}
function time(ts){return ts?new Date(ts).toLocaleString('ar',{dateStyle:'short',timeStyle:'medium'}):'—'}
function note(message,type){state.className='ict-live-state'+(type?' ict-live-'+type:'');state.textContent=message}
function render(){stats.replaceChildren();rows.replaceChildren();const last=history.at(-1),confirmed=history.filter(x=>x.confirmed),done=confirmed.at(-1);
 const cells=[['قناة البث',connected?'متصل':'غير متصل'],['آخر إغلاق مكتمل',done?fmt(done.close):'—'],['آخر شمعة مكتملة',done?time(done.start):'—'],['حالة آخر شمعة',last?(last.confirmed?'مكتملة':'قيد التكوّن'):'—'],['الشموع المستلمة',history.length],['آخر رسالة بث',lastPacket?time(lastPacket):'—']];
 for(const [title,value] of cells){const card=el('div','ict-live-stat');card.append(el('small','',title),el('strong','',value));stats.append(card)}
 for(const c of history.slice(-12).reverse()){const tr=el('tr');for(const value of [time(c.start),fmt(c.open),fmt(c.high),fmt(c.low),fmt(c.close),fmt(c.volume)])tr.append(el('td','',value));tr.append(el('td','ict-live-pill '+(c.confirmed?'ict-live-ok':'ict-live-warn'),c.confirmed?'مكتملة':'غير مكتملة'));rows.append(tr)}
 }
function disconnect(){generation++;started=false;connected=false;if(connection){connection.close();connection=null}start.disabled=false;stop.disabled=true;symbol.disabled=false;interval.disabled=false;render()}
async function run(){disconnect();const id=++generation;started=true;start.disabled=true;stop.disabled=false;symbol.disabled=true;interval.disabled=true;history=[];received=0;lastPacket=0;render();note('جارٍ طلب شموع تاريخية من Bybit…');
 try{history=await feed.fetchHistory({symbol:symbol.value,interval:interval.value,limit:160,timeout:11000});if(id!==generation)return;
  // Stage 2A is only in-memory for the opened page; stage 2B will persist data.
  note(`تمت قراءة ${history.length} شمعة. جارٍ الاتصال بتحديثات WebSocket…`,'ok');render();
  connection=feed.connect({symbol:symbol.value,interval:interval.value,onEvent:event=>{if(id!==generation)return;
   if(event.type==='connecting'){connected=false;note('جارٍ فتح بث Bybit… محاولة '+event.at,'warn')}
   if(event.type==='connected'){connected=true;note('متصل ببث Bybit. الشمعة الجاري تكوّنها ليست مؤكدة حتى إغلاقها.','ok')}
   if(event.type==='candles'){history=feed.merge(history,event.candles,200);received+=event.candles.length;lastPacket=Date.now();note(`بث مباشر متصل • آخر تحديث ${time(lastPacket)} • ${received} تحديث شموع`,'ok')}
   if(event.type==='error')note(event.message||'خطأ في الاتصال','bad');
   if(event.type==='disconnected'){connected=false;note('انقطع بث الشموع؛ جارٍ إعادة المحاولة تلقائيًا. لا تعتمد على الأسعار المعروضة الآن.','warn')}
   render();
  }});
 }catch(e){if(id!==generation)return;disconnect();note('تعذر جلب الشموع من Bybit: '+(e.name==='AbortError'?'انتهت مهلة الاتصال':e.message)+'. ربما تمنع الشبكة أو المنطقة أو سياسة CORS اتصال المتصفح بالمصدر. لا توجد بيانات حية في هذه الحالة.','bad')}
}
start.addEventListener('click',run);stop.addEventListener('click',()=>{disconnect();note('تم إيقاف الاتصال. البيانات المعروضة آخر لقطة محفوظة في ذاكرة الصفحة فقط، وليست لحظية.','warn')});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&started){disconnect();note('أُوقف الاتصال أثناء إخفاء الصفحة لتقليل استخدام البيانات. اضغط «اتصال» للاستئناف.','warn')}});
window.addEventListener('pagehide',disconnect);render();
})();
