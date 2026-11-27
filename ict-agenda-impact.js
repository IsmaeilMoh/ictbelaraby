/* On-demand price measurement in each agenda release. */
(()=>{'use strict';
 const catalog=window.ICTMarketCatalog, impact=window.ICTEventImpact706B;
 if(!catalog||!impact)return;
 const initialized=new WeakSet();
 function setSymbols(form,market){
  const symbol=form.elements.symbol,selected=symbol.value;
  const values=catalog.list(market);
  symbol.replaceChildren(...values.map(value=>new Option(value,value)));
  if(values.includes(selected))symbol.value=selected;
 }
 async function selectMarket(details,form){
  const market=form.elements.market.value;
  const status=details.querySelector('[data-impact-catalog]');
  details.querySelector('[data-impact-result]').replaceChildren();
  setSymbols(form,market);
  status.textContent='جارٍ تحديث قائمة الأصول…';
  try{
   const full=await catalog.load(market);
   if(form.elements.market.value!==market||!form.isConnected)return;
   setSymbols(form,market);
   status.textContent=full?'':'تظهر القائمة الأساسية لهذه الفئة.';
  }catch{
   if(form.elements.market.value===market)status.textContent='تعذّر تحديث الدليل؛ تظهر القائمة الأساسية.';
  }
 }
 document.addEventListener('toggle',event=>{
  const details=event.target;
  if(!details.matches('.agenda-release[open]')||initialized.has(details))return;
  const form=details.querySelector('form');
  if(!form)return;
  initialized.add(details);
  catalog.options(form.elements.market);
  selectMarket(details,form);
  form.elements.market.addEventListener('change',()=>selectMarket(details,form));
 },true);
 document.addEventListener('submit',async event=>{
  const form=event.target;
  if(!form.matches('.agenda-impact-form'))return;
  event.preventDefault();
  const details=form.closest('.agenda-release');
  const result=details.querySelector('[data-impact-result]');
  const market=form.elements.market.value,symbol=form.elements.symbol.value;
  const when=Number(details.dataset.eventAt),button=form.querySelector('button');
  if(!symbol||button.disabled)return;
  const fields=[form.elements.market,form.elements.symbol,button];
  fields.forEach(field=>{field.disabled=true});
  result.textContent='جارٍ فحص شموع الدقيقة المكتملة…';
  try{
   const fetcher=(url,options)=>fetch(url,{...options,signal:AbortSignal.timeout(12000)});
   const data=await impact.getMinuteCandles(market,symbol,when,fetcher);
   const measured=impact.measure(when,data.bars);
   const source=document.createElement('p');
   source.textContent=symbol+' · '+data.provider;
   const list=document.createElement('ul');
   for(const window of measured.windows){
    const item=document.createElement('li');
    const stillOpen=measured.at+window.minutes*60000>Date.now();
    item.textContent=window.minutes+' دقيقة · '+(window.status==='measured'
     ?new Intl.NumberFormat('ar',{style:'percent',maximumFractionDigits:3,signDisplay:'exceptZero'}).format(window.changePct/100)
     :stillOpen?'النافذة لم تكتمل بعد':'شموع غير كافية');
    list.append(item);
   }
   result.replaceChildren(source,list);
  }catch{
   result.textContent='تعذّر جلب شموع دقيقة لهذا الأصل من المزوّد. أعد المحاولة لاحقًا.';
  }finally{
   fields.forEach(field=>{field.disabled=false});
  }
 });
})();
