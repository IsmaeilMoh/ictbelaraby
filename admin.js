"use strict";
const $=id=>document.getElementById(id);
const OWNER='IsmaeilMoh',REPO='ictbelaraby',BRANCH='main';
let token='',posts={analysis:[],signal:[]},editing=null,chosenImage=null,storedImage='',deleting=false;
const $status=(id,message,kind='')=>{const element=$(id);element.className=kind?'admin-'+kind:'';element.textContent=message;};
const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const filePath=type=>type==='analysis'?'analyses.json':'recs.json';
function b64(bytes){let binary='';for(let i=0;i<bytes.length;i+=32768){binary+=String.fromCharCode(...bytes.subarray(i,i+32768));}return btoa(binary);}
function encodedJSON(obj){return b64(new TextEncoder().encode(JSON.stringify(obj,null,2)+'\n'));}
async function request(path,method='GET',data=null){const url='https://api.github.com/repos/'+OWNER+'/'+REPO+'/contents/'+path;const response=await fetch(url,{method,headers:{'Accept':'application/vnd.github+json','Authorization':'Bearer '+token,'X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},body:data?JSON.stringify(data):undefined,cache:'no-store'});let result={};try{result=await response.json();}catch{}if(!response.ok)throw Error(result.message||('GitHub HTTP '+response.status));return result;}
async function fetchFile(path){try{const r=await request(path+'?ref='+BRANCH);const decoded=Uint8Array.from(atob((r.content||'').replace(/\s/g,'')),c=>c.charCodeAt(0));return {sha:r.sha,items:JSON.parse(new TextDecoder().decode(decoded))};}catch(e){if(/Not Found/.test(e.message))return{sha:null,items:[]};throw e;}}
async function writeFile(path,content,message,oldSha){const payload={message,branch:BRANCH,content};if(oldSha)payload.sha=oldSha;return request(path,'PUT',payload);}
async function connect(){const entered=$('github-token').value.trim();if(!entered)return $status('auth-status','أدخل رمز GitHub أولًا.','error');token=entered;$('github-token').value='';try{await refreshPosts();$('admin-workspace').hidden=false;$status('auth-status','تم الاتصال بالمستودع. الرمز يبقى في ذاكرة هذه الصفحة فقط.','ok');}catch(e){token='';$status('auth-status','فشل الاتصال: '+e.message,'error');}}
async function refreshPosts(){const [a,s]=await Promise.all([fetchFile('analyses.json'),fetchFile('recs.json')]);posts.analysis=Array.isArray(a.items)?a.items:[];posts.signal=Array.isArray(s.items)?s.items:[];renderExisting();if(typeof studioRefresh==='function')studioRefresh();}
function renderExisting(){
 const query=($('post-search')?.value||'').trim().toLocaleLowerCase();
 const filter=$('post-filter')?.value||'all';
 const all=[...posts.analysis.map((x,i)=>({...x,kind:'analysis',index:i})),...posts.signal.map((x,i)=>({...x,kind:'signal',index:i}))]
   .sort((a,b)=>(Date.parse(b.published_at||b.date||0)||0)-(Date.parse(a.published_at||a.date||0)||0))
   .filter(p=>(filter==='all'||p.kind===filter)&&(!query||[p.title,p.asset,p.pair,p.entry,p.summary].some(v=>String(v||'').toLocaleLowerCase().includes(query))));
 $('existing-posts').innerHTML=all.map(p=>`<div class="admin-post"><div class="admin-post-main"><b>${escape(p.title||p.pair||p.asset||'منشور')}</b><small>${p.kind==='analysis'?'تحليل':'توصية'} • ${escape((p.published_at||p.date||'').slice(0,16))}${p.sample?' • نموذج':''}</small></div><div class="admin-post-buttons"><button type="button" class="secondary" data-edit="${p.kind}:${p.index}" ${deleting?'disabled':''}>تحرير</button><button type="button" class="admin-danger" data-delete="${p.kind}:${p.index}" ${deleting?'disabled':''} aria-label="حذف ${p.kind==='analysis'?'تحليل':'توصية'} ${escape(p.title||p.pair||p.asset||'')}">حذف</button></div></div>`).join('')||'<p class="admin-help">لا توجد منشورات مطابقة.</p>';
}
async function deletePost(kind,index){
 if(deleting)return;
 if(!token)return $status('posts-status','اتصل بالمستودع أولًا.','error');
 if(!['analysis','signal'].includes(kind)||!Number.isSafeInteger(index)||index<0)return;
 const selected=posts[kind][index];if(!selected)return $status('posts-status','هذه القائمة قديمة. اضغط تحديث القائمة وحاول مرة أخرى.','error');
 const title=selected.title||selected.pair||selected.asset||'المنشور';
 const label=kind==='analysis'?'التحليل':'التوصية';
 if(!window.confirm(`هل أنت متأكد من حذف ${label} «${title}» من الموقع؟\n\nسيُحذف هذا المنشور من القائمة العامة، ويمكن استعادته فقط من سجل GitHub. لن تُحذف صورة الشارت تلقائيًا.\n\nلن يتم إرسال إشعار للمتابعين عند الحذف.`))return;
 deleting=true;renderExisting();$status('posts-status','جارٍ حذف المنشور من GitHub…','loading');
 try{
   const path=filePath(kind),old=await fetchFile(path);
   if(!Array.isArray(old.items))throw Error('ملف المنشورات ليس قائمة JSON صالحة.');
   // Compare full contents to protect against deleting a changed/replaced post,
   // including legacy posts without IDs. Never fall back to an unsafe index.
   const identical=old.items.map((p,i)=>JSON.stringify(p)===JSON.stringify(selected)?i:-1).filter(i=>i!==-1);
   if(identical.length!==1)throw Error('تغيّر المنشور أو لم يعد فريدًا؛ اضغط «تحديث القائمة» ثم أعد المحاولة. لم يُحذف شيء.');
   old.items.splice(identical[0],1);
   await writeFile(path,encodedJSON(old.items),`delete: ${kind} ${selected.id||title}`,old.sha);
   // Clear editor if it referenced the deleted post; avoid publishing a stale edit.
   if(editing?.kind===kind&&posts[kind][editing.index]===selected)reset();
   await refreshPosts();
   $status('posts-status',`تم حذف ${label} «${title}» بنجاح. ستظهر النتيجة للجمهور بعد تحديث GitHub Pages.`, 'ok');
 }catch(e){
   $status('posts-status','تعذر الحذف: '+e.message+'\nلم نعُدّل القائمة المحلية. حدّث القائمة إذا لزم الأمر.','error');
 }finally{deleting=false;renderExisting();}
}

function typeChanged(){const t=$('post-type').value;$('analysis-fields').hidden=t!=='analysis';$('signal-fields').hidden=t!=='signal';$('title-row').hidden=t!=='analysis';$('post-title').required=t==='analysis';$('entry').required=t==='signal';$('sl').required=t==='signal';$('tp').required=t==='signal';$('saved-image').textContent=storedImage?'الصورة الحالية: '+storedImage:'';}
function toLocalInput(value){const d=new Date(value||'');if(!Number.isFinite(d.getTime()))return '';const local=new Date(d.getTime()-d.getTimezoneOffset()*60000);return local.toISOString().slice(0,16);}
function fromLocalInput(value){const d=value?new Date(value):null;return d&&Number.isFinite(d.getTime())?d.toISOString():'';}
function setValues(a={}){const t=a.kind||'analysis';$('post-type').value=t;$('asset').value=a.asset||a.pair||'';$('post-title').value=a.title||'';$('timeframe').value=a.timeframe||'4H';$('bias').value=a.bias||'محايد';$('summary').value=a.summary||'';$('body').value=a.body||'';$('invalidation').value=a.invalidation||'';$('chart-url').value=a.chart_url||'';$('levels').value=(a.levels||[]).map(l=>l.label+': '+l.value).join('\n');$('analysis-status').value=['completed','invalidated','expired'].includes(a.status)?a.status:'active';$('analysis-expires').value=toLocalInput(a.expires_at);$('analysis-status-note').value=a.status_note||'';$('direction').value=a.dir||'buy';$('signal-status').value=['pending','open','tp','sl','cl','cancelled'].includes(a.status)?a.status:'open';$('entry').value=a.entry||'';$('tp').value=a.tp||'';$('sl').value=a.sl||'';$('signal-note').value=a.note||'';$('signal-result').value=a.result_note||'';$('send-notice').checked=!editing;$('chart-image').value='';chosenImage=null;storedImage=a.image||'';$('image-preview').hidden=true;typeChanged();}
function reset(){editing=null;setValues();$status('publish-status','');}
function edit(kind,i){const a=posts[kind][i];if(!a)return;editing={kind,index:i};setValues({...a,kind});window.scrollTo({top:0,behavior:'smooth'});$status('publish-status','وضع التحرير: تعديل منشور موجود لا يعيد إرسال إشعار جديد.','loading');}
function fields(){const type=$('post-type').value,now=new Date().toISOString();if(type==='analysis'){const prev=editing?.kind==='analysis'?posts.analysis[editing.index]:null;return {id:prev?.id||crypto.randomUUID(),asset:$('asset').value.trim().toUpperCase(),title:$('post-title').value.trim(),timeframe:$('timeframe').value,bias:$('bias').value,summary:$('summary').value.trim(),body:$('body').value.trim(),invalidation:$('invalidation').value.trim(),chart_url:$('chart-url').value.trim(),image:storedImage,levels:$('levels').value.split(/\r?\n/).map(s=>{let pos=s.indexOf(':');return pos>0?{label:s.slice(0,pos).trim(),value:s.slice(pos+1).trim()}:null}).filter(x=>x?.label&&x?.value),status:$('analysis-status').value,status_note:$('analysis-status-note').value.trim(),status_history:Array.isArray(prev?.status_history)?prev.status_history.slice(-29):[],expires_at:fromLocalInput($('analysis-expires').value),published_at:prev?.published_at||now,updated_at:now,notify:!prev&&$('send-notice').checked};}const prev=editing?.kind==='signal'?posts.signal[editing.index]:null;return {id:prev?.id||crypto.randomUUID(),pair:$('asset').value.trim().toUpperCase(),dir:$('direction').value,entry:$('entry').value.trim(),tp:$('tp').value.trim(),sl:$('sl').value.trim(),status:$('signal-status').value,note:$('signal-note').value.trim(),result_note:$('signal-result').value.trim(),date:prev?.date||now,published_at:prev?.published_at||now,updated_at:now,sample:false,notify:!prev&&$('send-notice').checked};}
async function convertImage(file){if(file.size>12*1024*1024)throw Error('الصورة الأصلية أكبر من 12 MB. صغّرها أولًا.');const bitmap=await createImageBitmap(file);const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.82));if(!blob||blob.size>2*1024*1024)throw Error('الصورة كبيرة جدًا بعد المعالجة. اختر صورة أصغر.');return new Uint8Array(await blob.arrayBuffer());}
function validSignalLevels(post){
 const entry=Number(post.entry),sl=Number(post.sl),tp=Number(post.tp);
 if(![entry,sl,tp].every(n=>Number.isFinite(n)&&n>0))throw Error('أدخل سعر دخول ووقف وهدف رقميين أكبر من الصفر. لا تستخدم عبارة «السعر الحالي».');
 if(post.dir==='buy'&&!(sl<entry&&entry<tp))throw Error('للشراء يجب أن يكون وقف الخسارة أقل من الدخول والهدف أعلى منه.');
 if(post.dir==='sell'&&!(tp<entry&&entry<sl))throw Error('للبيع يجب أن يكون الهدف أقل من الدخول والوقف أعلى منه.');
 if(!['buy','sell'].includes(post.dir))throw Error('حدد اتجاه شراء أو بيع صالحًا.');
 if(['tp','sl','cl','cancelled'].includes(post.status)&&post.result_note.trim().length<12)throw Error('اكتب شرحًا واضحًا (12 حرفًا على الأقل) عند تسجيل تحقق الهدف أو الوقف أو الإغلاق أو الإلغاء.');
}
function appendSignalAudit(post,prev){
 const history=Array.isArray(prev?.status_history)?prev.status_history.slice(-29):[];
 if(!prev||prev.status!==post.status){history.push({status:post.status,at:post.updated_at,note:post.result_note||'تحديث الحالة من لوحة الإدارة'});}
 post.status_history=history.slice(-30);
 post.status_source='manual_admin';
 return post;
}
function validateAnalysis(post,prev){
 if(!['active','completed','invalidated','expired'].includes(post.status))throw Error('حالة التحليل غير صحيحة.');
 if(post.expires_at){const until=Date.parse(post.expires_at);if(!Number.isFinite(until))throw Error('موعد انتهاء المتابعة غير صالح.');if(!prev&&until<=Date.now())throw Error('اختر موعد انتهاء مستقبليًا للتحليل الجديد.');}
 const changed=!!prev&&prev.status!==post.status;
 if((changed&&post.status!=='active')||(!prev&&post.status!=='active')){
  if(post.status_note.length<12)throw Error('اكتب سببًا واضحًا (12 حرفًا على الأقل) لتوثيق حالة التحليل.');
 }
 const history=Array.isArray(prev?.status_history)?prev.status_history.slice(-29):[];
 if(changed||!prev){history.push({status:post.status,at:post.updated_at,note:post.status_note||'نشر التحليل من لوحة الإدارة',source:'manual_admin'});}
 post.status_history=history.slice(-30);
 post.status_source='manual_admin';
 return post;
}
async function publish(e){e.preventDefault();if(!token)return;$('publish').disabled=true;$status('publish-status','جارٍ التحقق والنشر…','loading');try{const type=$('post-type').value;const post=fields();if(!post.pair&&!post.asset)throw Error('اكتب اسم الأصل المالي.');if(type==='signal'&&(!post.entry||!post.tp||!post.sl))throw Error('مستويات الصفقة مطلوبة.');if(type==='analysis'&&!post.title)throw Error('عنوان التحليل مطلوب.');if(type==='signal')validSignalLevels(post);const old=await fetchFile(filePath(type));const list=old.items;if(!Array.isArray(list))throw Error('بنية الملف ليست قائمة JSON.');if(editing&&editing.kind!==type)throw Error('لا يمكن تغيير نوع منشور قائم. أنشئ منشورًا جديدًا بدلًا من ذلك.');
if(type==='analysis'){const prior=editing?.kind==='analysis'?posts.analysis[editing.index]:null;validateAnalysis(post,prior);}if(type==='analysis'&&chosenImage){$status('publish-status','جارٍ رفع صورة الشارت إلى GitHub…','loading');const bytes=await convertImage(chosenImage);const name='analysis-images/'+post.id+'.jpg';const imageOld=await request(name+'?ref='+BRANCH).then(x=>x.sha).catch(e=>/Not Found/.test(e.message)?null:Promise.reject(e));await writeFile(name,b64(bytes),'media: chart for '+post.id,imageOld);post.image=name;}
if(type==='signal'){const existing=editing?.kind==='signal'?posts.signal[editing.index]:null;appendSignalAudit(post,existing);}
if(editing){const target=list.findIndex(p=>p.id&&p.id===(posts[type][editing.index]?.id));if(target<0)throw Error('تعذر تحديد المنشور القديم بمعرّف ثابت؛ حدّث القائمة قبل التعديل.');list[target]=post;}else list.unshift(post);$status('publish-status','جارٍ حفظ بيانات المنشور…','loading');await writeFile(filePath(type),encodedJSON(list),(editing?'edit: ':'publish: ')+(type==='analysis'?'analysis ':'signal ')+(post.id),old.sha);$status('publish-status','تم حفظ المنشور على GitHub بنجاح. قد يحتاج GitHub Pages بضع دقائق للنشر. '+(post.notify?'سترسل مهمة الإشعارات تنبيهًا فقط بعد إعداد OneSignal بنجاح.':''),'ok');editing=null;await refreshPosts();}catch(err){$status('publish-status','تعذر إتمام النشر: '+err.message+'\nإذا رُفعت الصورة وحدث خطأ بعدها، يمكنك إعادة المحاولة؛ لن تُرسل الصورة وحدها إشعارًا.','error');}finally{$('publish').disabled=false;}}
function preview(){const p=fields(),t=$('post-type').value;if(t==='signal'){try{validSignalLevels(p);}catch(e){$status('publish-status','تنبيه قبل النشر: '+e.message,'error');}}$('live-preview').innerHTML=t==='analysis'?`<small>${escape(p.asset)} • ${escape(p.timeframe)} • ${escape(p.bias)}</small><h3>${escape(p.title)}</h3><p>${escape(p.summary)}</p><hr><p>${escape(p.body)}</p><small>إبطال السيناريو: ${escape(p.invalidation||'غير محدد')}</small><p>الحالة: ${escape(p.status)} • نهاية المتابعة: ${escape(p.expires_at?new Date(p.expires_at).toLocaleString('ar-u-nu-latn'):'غير محددة')}</p><p>سبب تحديث الحالة: ${escape(p.status_note||'—')}</p>`:`<small>${escape(p.pair)} • ${escape(p.dir)}</small><h3>${escape(p.entry)}</h3><p>الهدف: ${escape(p.tp)} | الإيقاف: ${escape(p.sl)}</p><p>${escape(p.note)}</p><p>نتيجة الصفقة: ${escape(p.result_note||'—')}</p>`;}

// 4.5 — operational content metrics. No third-party secrets, no fake traffic analytics.
function studioRefresh(){
 const target=$('studio-metrics');if(!target)return;
 const signals=posts.signal.filter(x=>!x.sample);
 const statuses={open:signals.filter(x=>!x.status||x.status==='open').length,pending:signals.filter(x=>x.status==='pending').length,tp:signals.filter(x=>x.status==='tp').length,sl:signals.filter(x=>x.status==='sl').length};
 const fields=[['التحليلات المنشورة',posts.analysis.length],['التوصيات المنشورة',signals.length],['نشطة',statuses.open],['معلّقة',statuses.pending],['أهداف محققة',statuses.tp],['وقف خسارة',statuses.sl]];
 target.innerHTML=fields.map(([label,value])=>`<div class="studio-metric"><small>${escape(label)}</small><strong>${value}</strong></div>`).join('');publicationWarnings();
}
function studioExport(){const cells=[['النوع','الرمز','العنوان','الحالة','النشر','آخر تحديث'],...posts.analysis.map(x=>['تحليل',x.asset||'',x.title||'',x.status||'',x.published_at||'',x.updated_at||'']),...posts.signal.filter(x=>!x.sample).map(x=>['توصية',x.pair||'',x.dir||'',x.status||'',x.published_at||x.date||'',x.updated_at||''])];const csv='\ufeff'+cells.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""').replace(/^[=+\-@]/,'\u200b$&')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='ict-arabic-publications.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
// 6.8.75 — Read-only operational status. Public files are fetched from this site,
// never from a private account or a third-party dashboard. No auto-publishing or notification actions.
const PUBLIC_FEEDS = [
 {file:'calendar-live.json',name:'الأجندة الحالية',hours:36,items:'events'},
 {file:'calendar-next.json',name:'الأجندة القادمة',hours:168,items:'events',optional:true},
 {file:'news-live.json',name:'الأخبار',hours:12,items:'items'},
 {file:'market-movers.json',name:'تحركات السوق',hours:36,items:'items'},
 {file:'market-radar.json',name:'الرادار قصير المدى',hours:2,items:'items',optional:true},
 {file:'market-xray.json',name:'أشعة السوق',hours:36,optional:true},
 {file:'historical-candles.json',name:'الشموع التاريخية',hours:18,optional:true},
 {file:'economic-official.json',name:'النتائج الرسمية الأمريكية',hours:168,items:'events'}
];
const statusClass = code => code==='fresh'?'ok':code==='stale'?'warn':code==='missing'?'warn':'bad';
const safeDate = raw => {if(!raw)return null;const time=Date.parse(raw);return Number.isFinite(time)?time:null;};
function publicationWarnings(){
 const area=$('studio-content-warnings');if(!area)return;
 const all=posts.signal.filter(x=>!x.sample),issues=[];
 for(const p of all){
  const entry=Number(p.entry),tp=Number(p.tp),sl=Number(p.sl);
  const direction=String(p.dir||p.direction||'').toLowerCase();
  const valid=[entry,tp,sl].every(x=>Number.isFinite(x)&&x>0) && (direction==='buy'?(sl<entry&&entry<tp):direction==='sell'?(tp<entry&&entry<sl):false);
  if(!valid)issues.push('توصية '+String(p.pair||p.asset||'غير محددة')+' تحتاج مراجعة مستويات الدخول/الهدف/الوقف');
 }
 const now=Date.now();for(const p of posts.analysis){
  if(p.status==='active'&&p.expires_at&&safeDate(p.expires_at)!==null&&safeDate(p.expires_at)<now)issues.push('تحليل '+String(p.title||p.asset||'غير محدد')+' تجاوز موعد المتابعة');
 }
 const maxShow=5;
 area.replaceChildren();
 const h=document.createElement('p');h.className='studio-ops-heading';h.textContent='مراجعة المحتوى المنشور — '+(issues.length?'ملاحظات '+issues.length:'لا توجد ملاحظات من القواعد الأساسية');area.append(h);
 if(issues.length){const ul=document.createElement('ul');for(const issue of issues.slice(0,maxShow)){const li=document.createElement('li');li.textContent=issue;ul.append(li)}area.append(ul);if(issues.length>maxShow){const p=document.createElement('p');p.textContent='وملاحظات أخرى: '+(issues.length-maxShow);area.append(p)}}
 const note=document.createElement('p');note.className='admin-help';note.textContent='فحص تنبيهي للحقول فقط، ولا يتحقق من أسعار السوق أو نتائج الصفقات.';area.append(note);
}
async function studioHealth(){
 const box=$('studio-health-result');if(!box)return;
 const button=$('studio-health');button.disabled=true;box.replaceChildren();
 const loading=document.createElement('p');loading.textContent='جارٍ التحقق من الملفات المنشورة على الموقع…';box.append(loading);
 try{
  const results=await Promise.all(PUBLIC_FEEDS.map(async feed=>{
   try{
    const controller=new AbortController();const t=setTimeout(()=>controller.abort(),10000);
    let response;
    try{response=await fetch('./'+feed.file+'?adminHealth='+Date.now(),{cache:'no-store',signal:controller.signal})}
    finally{clearTimeout(t)}
    if(!response.ok)throw Error('HTTP '+response.status);
    const data=await response.json();if(!data||typeof data!=='object'||Array.isArray(data))throw Error('بنية JSON غير متوقعة');
    const timestamp=safeDate(data.updatedAt||data.updated_at||data.generatedAt||data.generated_at);
    let code='unknown',summary='وقت التحديث غير متاح';
    if(timestamp!==null){const age=(Date.now()-timestamp)/3600000;code=age>feed.hours?'stale':'fresh';summary='آخر تحديث: '+new Date(timestamp).toLocaleString('ar-u-nu-latn',{dateStyle:'short',timeStyle:'short'});if(age< -1){code='unknown';summary+=' (وقت مستقبلي يحتاج مراجعة)'}}
    if(feed.items&&Array.isArray(data[feed.items]))summary+=' · عناصر: '+data[feed.items].length;
    if(data.status==='pending_first_update')code='unknown';
    return {...feed,code,summary};
   }catch(e){return {...feed,code:'missing',summary:'تعذّر الجلب: '+String(e.message||e)}}
  }));
  box.replaceChildren();const list=document.createElement('div');list.className='studio-feed-list';
  const labels={fresh:'حديث وفق حدّ الفحص',stale:'متأخر',missing:'غير متاح',unknown:'غير محدد'};
  for(const item of results){const card=document.createElement('div');card.className='studio-feed-item '+statusClass(item.code);const title=document.createElement('strong');title.textContent=item.name;const badge=document.createElement('span');badge.textContent=labels[item.code];badge.className='studio-feed-badge';const detail=document.createElement('small');detail.textContent=item.file+' — '+item.summary;card.append(title,badge,detail);list.append(card)}
  box.append(list);const foot=document.createElement('p');foot.className='admin-help';foot.textContent='هذه لقطة لحالة ملفات الموقع وليست ضمانًا لصحة البيانات اللحظية. قد تكون بيانات الأسواق متوقفة طبيعيًا في عطلات التداول، والملفات الاختيارية لا تعني أن الخدمة مفعّلة تلقائيًا.';box.append(foot);
 }finally{button.disabled=false}
}
$('studio-export').addEventListener('click',studioExport);
$('studio-health').addEventListener('click',studioHealth);

$('connect').addEventListener('click',connect);$('github-token').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();connect();}});$('post-type').addEventListener('change',typeChanged);$('publish-form').addEventListener('submit',publish);$('preview-post').addEventListener('click',preview);$('new-post').addEventListener('click',reset);$('reload').addEventListener('click',()=>refreshPosts().catch(e=>$status('publish-status',e.message,'error')));$('existing-posts').addEventListener('click',e=>{
 const del=e.target.closest('[data-delete]');
 if(del){const [kind,i]=del.dataset.delete.split(':');deletePost(kind,Number(i));return;}
 const editButton=e.target.closest('[data-edit]');
 if(editButton&&!deleting){const [kind,i]=editButton.dataset.edit.split(':');edit(kind,Number(i));}
});
$('post-search').addEventListener('input',renderExisting);
$('post-filter').addEventListener('change',renderExisting);
$('chart-image').addEventListener('change',()=>{chosenImage=$('chart-image').files[0]||null;const preview=$('image-preview');if(preview.dataset.objectUrl)URL.revokeObjectURL(preview.dataset.objectUrl);if(chosenImage){preview.dataset.objectUrl=URL.createObjectURL(chosenImage);preview.src=preview.dataset.objectUrl;preview.hidden=false;}else preview.hidden=true;});
$('save-draft').addEventListener('click',()=>{const draft={kind:$('post-type').value,fields:fields()};localStorage.setItem('ict-admin-local-draft',JSON.stringify(draft));$status('publish-status','تم حفظ مسودة نصية على هذا الجهاز فقط، دون صورة الشارت.','ok');});
$('restore-draft').addEventListener('click',()=>{try{const d=JSON.parse(localStorage.getItem('ict-admin-local-draft'));if(!d)return $status('publish-status','لا توجد مسودة محفوظة.','loading');editing=null;setValues({...d.fields,kind:d.kind});$status('publish-status','تمت استعادة المسودة المحلية.','ok');}catch(e){$status('publish-status','المسودة غير صالحة.','error');}});
reset();
