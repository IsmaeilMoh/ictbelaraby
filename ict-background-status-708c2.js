/* ICT بالعربي 8C.2: read-only background service health. Never treats the service as execution-ready. */
(function(){'use strict';
 const root=document.getElementById('dc-background-8c2');if(!root)return;
 const urlInput=document.getElementById('dc-bg-url'),save=document.getElementById('dc-bg-save'),check=document.getElementById('dc-bg-check'),status=document.getElementById('dc-bg-status'),results=document.getElementById('dc-bg-results');
 const key='ict-background-service-url-v1';
 try{urlInput.value=localStorage.getItem(key)||''}catch(_){}
 function line(text){const p=document.createElement('p');p.textContent=text;results.append(p)}
 function describeError(e){status.textContent='تعذر الاتصال بالخدمة: '+String(e.message||e).slice(0,140);status.dataset.bad='1'}
 function validate(){const value=urlInput.value.trim();if(!value)throw Error('لم تُدخل عنوان الخدمة');const u=new URL(value);
 if(!['https:','http:'].includes(u.protocol)||u.username||u.password||u.search||u.hash)throw Error('عنوان غير صالح');
 if(u.protocol==='http:'&& !['localhost','127.0.0.1'].includes(u.hostname))throw Error('الخدمة البعيدة يجب أن تعمل عبر HTTPS');
 return u.origin+u.pathname.replace(/\/$/,'')}
 save.addEventListener('click',()=>{try{const u=validate();localStorage.setItem(key,u);status.textContent='تم حفظ عنوان الخدمة على هذا المتصفح فقط. لم يتم التحقق من اتصالها بعد.';status.dataset.bad='0'}catch(e){describeError(e)}});
 check.addEventListener('click',async()=>{let url;try{url=validate()}catch(e){describeError(e);return}results.replaceChildren();status.textContent='جارٍ اختبار اتصال خادم المراقبة...';status.dataset.bad='0';
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),9500);
 try{const res=await fetch(url+'/health',{cache:'no-store',signal:controller.signal});if(!res.ok)throw Error('HTTP '+res.status);const data=await res.json();
 if(data.schema!=='ict-research-monitor/1'||data.readyForExecution!==false||typeof data.active!=='boolean')throw Error('استجابة خادم غير متوافقة');
 const heartbeat=Date.parse(data.lastCycleAt);if(!Number.isFinite(heartbeat))throw Error('الخادم لم ينجز أي دورة فحص بعد');
 const ms=Date.now()-heartbeat;if(ms< -120000||ms>Math.max(900000,(data.pollIntervalMs||300000)*3))throw Error('آخر فحص متأخر أو توقيت الخادم غير صحيح');
 status.textContent=data.active?'الخدمة متصلة وتعمل للمراقبة البحثية، وليست توصيات جاهزة للتنفيذ':'الخدمة متصلة، لكن آخر دورة غير حديثة';status.dataset.bad=data.active?'0':'1';
 line('آخر دورة فحص: '+new Intl.DateTimeFormat('ar-EG',{timeZone:'America/New_York',dateStyle:'medium',timeStyle:'short'}).format(new Date(heartbeat))+' نيويورك');
 line('عدد دورات الفحص: '+Number(data.cycleCount||0)+' · عدد الأصول: '+Number(data.marketCount||0));
 for(const [name,value] of Object.entries(data.targets||{}).slice(0,12)){line(name+' — '+(value.status==='research_data_valid'?'شموع صالحة بحثيًا':'معلّق: '+(value.error||value.status)))}
 line('لا توجد أسعار Bid/Ask تنفيذية أو فحوص أخبار ومخاطرة على الخادم. لا يُستخدم هذا المؤشر لاعتماد التوصيات.');
 }catch(e){describeError(e)}finally{clearTimeout(timeout)}});
})();
