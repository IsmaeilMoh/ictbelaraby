/* ICT 7.0 / stage 2B — 2A monitor + IndexedDB confirmed candle persistence & recovery. */
(function(){'use strict';
const root=document.getElementById('ict-live-2a'),feed=window.ICTLiveFeed,store=window.ICTCandleStore;if(!root||!feed||!store)return;
const $=id=>document.getElementById(id),symbol=$('ict-live-symbol'),interval=$('ict-live-interval'),start=$('ict-live-start'),stop=$('ict-live-stop'),state=$('ict-live-state'),stats=$('ict-live-stats'),rows=$('ict-live-rows'),vaultState=$('ict-vault-status'),vaultStats=$('ict-vault-stats'),repair=$('ict-vault-repair'),erase=$('ict-vault-clear');
let connection=null,history=[],generation=0,started=false,connected=false,lastPacket=0,lastSync=0,lastPersist=0,storageAvailable=true,storedCount=0,warning='',repairing=false,saveQueue=Promise.resolve(),resyncing=false,everConnected=false;
function el(tag,klass,content){const x=document.createElement(tag);if(klass)x.className=klass;if(content!==undefined)x.textContent=String(content);return x}
function fmt(n){return typeof n==='number'&&Number.isFinite(n)?new Intl.NumberFormat('en-US',{maximumFractionDigits:8}).format(n):'—'}
function time(ts){return ts?(window.ICTMarketTimes?.format(ts)||new Intl.DateTimeFormat('en-GB',{timeZone:'America/New_York',dateStyle:'short',timeStyle:'short'}).format(new Date(ts))+' نيويورك'):'—'}
function note(message,type){state.className='ict-live-state'+(type?' ict-live-'+type:'');state.textContent=message}
function vaultNote(message,type){if(vaultState){vaultState.className='ict-live-state'+(type?' ict-live-'+type:'');vaultState.textContent=message}}
function currentPair(){return {symbol:symbol.value,interval:interval.value}}
function analysis(){return store.analyze(history,interval.value)}
function render(){stats.replaceChildren();rows.replaceChildren();const last=history.at(-1),confirmed=history.filter(x=>x.confirmed),done=confirmed.at(-1),a=analysis();
 const cells=[['قناة البث',connected?'متصل':'غير متصل'],['آخر إغلاق مكتمل',done?fmt(done.close):'—'],['آخر شمعة مكتملة',done?time(done.start):'—'],['حالة آخر شمعة',last?(last.confirmed?'مكتملة':'قيد التكوّن'):'—'],['الشموع المعروضة',history.length],['آخر رسالة بث',lastPacket?time(lastPacket):'—']];
 for(const [title,value] of cells){const card=el('div','ict-live-stat');card.append(el('small','',title),el('strong','',value));stats.append(card)}
 for(const c of history.slice(-12).reverse()){const tr=el('tr');for(const value of [time(c.start),fmt(c.open),fmt(c.high),fmt(c.low),fmt(c.close),fmt(c.volume)])tr.append(el('td','',value));tr.append(el('td','ict-live-pill '+(c.confirmed?'ict-live-ok':'ict-live-warn'),c.confirmed?'مكتملة':'غير مكتملة'));rows.append(tr)}
 if(vaultStats){vaultStats.replaceChildren();for(const [label,value] of [['الشموع المكتملة محليًا',storedCount],['الفجوات داخل الفترة المحمّلة',a.gaps+' ('+a.missing+' شمعة)'],['آخر مزامنة شبكة',lastSync?time(lastSync):'—'],['التخزين',storageAvailable?'IndexedDB':'غير متاح']]){const card=el('div','ict-live-stat');card.append(el('small','',label),el('strong','',value));vaultStats.append(card)}}
 }
function detach(){generation++;started=false;connected=false;if(connection){connection.close();connection=null}start.disabled=false;stop.disabled=true;symbol.disabled=false;interval.disabled=false;render()}
async function loadLocal(id){const p=currentPair();try{const cached=await store.read(p.symbol,p.interval,1000);if(id!==generation)return;storageAvailable=true;storedCount=cached.length;history=feed.merge(cached,history,1000);if(cached.length){vaultNote('تمت استعادة '+cached.length+' شمعة مكتملة من تخزين هذا المتصفح. لا تعد بيانات حية قبل نجاح الاتصال.','warn');render()}else vaultNote('لا توجد شموع محلية لهذا العقد والإطار.','warn')}catch(e){storageAvailable=false;vaultNote('التخزين المحلي غير متاح: '+e.message+'؛ المتابعة الحية تعمل دون تخزين.','bad');render()}}
function scheduleSave(candles,id,p){const list=(candles||[]).filter(x=>x.confirmed);if(!list.length||!storageAvailable)return;saveQueue=saveQueue.catch(()=>{}).then(async()=>{if(id!==generation)return;try{const result=await store.write(p.symbol,p.interval,list);if(id!==generation)return;storedCount=Math.min(store.MAX_PER_PAIR,(await store.read(p.symbol,p.interval,store.MAX_PER_PAIR)).length);lastPersist=Date.now();if(result.rejected)warning='رُفضت '+result.rejected+' شموع غير مكتملة أو غير صالحة';render()}catch(e){storageAvailable=false;vaultNote('فشل حفظ الشموع محليًا: '+e.message,'bad');render()}})}
async function sync(id,extra){if(id!==generation||resyncing)return;const p=currentPair(),ms=store.FRAMES[p.interval];resyncing=true;const maxPages=extra?4:1;let pages=0,records=0;try{
 // Inspect the latest saved candle and retrieve the subsequent window in bounded REST pages.
 const local=storageAvailable?await store.read(p.symbol,p.interval,1).catch(()=>[]):[];
 let end=Date.now(),oldest=local.at(-1)?.start??null;
 // Stage 2B backfills at most 4,000 recent bars; older gaps are reported, not silently hidden.
 while(id===generation&&pages<maxPages){const data=await feed.fetchHistory({symbol:p.symbol,interval:p.interval,limit:1000,end,timeout:12000});if(id!==generation)return;pages++;records+=data.length;history=feed.merge(history,data,1000);scheduleSave(data,id,p);const min=data[0].start;if(!data.length||min>=end||oldest!==null&&min<=oldest+ms||pages>=maxPages)break;end=min-1;}
 lastSync=Date.now();render();if(id===generation){const a=analysis();const details=a.gaps?' يوجد '+a.gaps+' فجوات بين الشموع المعروضة؛ اطلب الاستكمال أو راجع مصدر البيانات.':'';vaultNote('مزامنة ناجحة: '+records+' شمعة عبر '+pages+' طلب. '+details,a.gaps?'warn':'ok')}
 }catch(e){if(id===generation)vaultNote('تعذرت المزامنة: '+e.message+'. ستظل الشموع المحفوظة تاريخية وليست لحظية.','bad')}finally{resyncing=false;repairing=false;if(repair)repair.disabled=false}}
async function run(){detach();const id=++generation;started=true;start.disabled=true;stop.disabled=false;symbol.disabled=true;interval.disabled=true;history=[];lastPacket=0;lastSync=0;storedCount=0;everConnected=false;render();note('جارٍ تحميل البيانات المحلية ثم مزامنتها مع Bybit…');await loadLocal(id);if(id!==generation)return;const p=currentPair();
 try{await sync(id,false);if(id!==generation)return;
 connection=feed.connect({symbol:p.symbol,interval:p.interval,onEvent:event=>{if(id!==generation)return;
 if(event.type==='connecting'){connected=false;note('جارٍ فتح بث Bybit…','warn')}
 if(event.type==='connected'){const wasDisconnected=everConnected;everConnected=true;connected=true;note('متصل ببث Bybit. الاعتماد على الشموع المكتملة فقط.','ok');if(wasDisconnected)sync(id,false)}
 if(event.type==='candles'){history=feed.merge(history,event.candles,1000);lastPacket=Date.now();note('بث متصل • آخر رسالة '+time(lastPacket),'ok');scheduleSave(event.candles,id,p)}
 if(event.type==='error')note(event.message||'خطأ في البث','bad');
 if(event.type==='disconnected'){connected=false;note('انقطع بث Bybit. الشموع السابقة ليست لحظية، وستتم المزامنة عند استعادة الاتصال.','warn')}
 render();}});
 }catch(e){if(id!==generation)return;note('تعذّر تشغيل الاتصال الحي: '+e.message,'bad');detach()}}
start.addEventListener('click',run);stop.addEventListener('click',()=>{detach();note('الاتصال متوقف؛ البيانات الموجودة محفوظة تاريخيًا وليست لحظية.','warn')});
if(repair)repair.addEventListener('click',async()=>{if(repairing)return;const id=generation,p=currentPair();repairing=true;repair.disabled=true;vaultNote('جارٍ استكمال تاريخ الشموع ضمن حد 4 طلبات…','warn');await sync(id,true)});
if(erase)erase.addEventListener('click',async()=>{if(!confirm('حذف الشموع المحلية للعقد والإطار المحددين فقط؟ لن تتأثر ملفات الموقع أو سجل تداولك.'))return;const p=currentPair();try{const count=await store.clear(p.symbol,p.interval);storedCount=0;vaultNote('حُذف '+count+' شمعة محلية لهذا العقد والإطار. الشموع الظاهرة من الجلسة الحالية لم تُحذف من الذاكرة.','warn');render()}catch(e){vaultNote('فشل الحذف: '+e.message,'bad')}});
async function preview(){if(started)return;history=[];storedCount=0;render();await loadLocal(generation)}
symbol.addEventListener('change',preview);interval.addEventListener('change',preview);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&started){detach();note('أُوقف البث أثناء إخفاء الصفحة. اضغط اتصال لإعادة المزامنة.','warn')}});
window.addEventListener('pagehide',detach);render();preview();
})();
