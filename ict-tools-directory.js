(()=>{'use strict';
 const hub=document.getElementById('ict-tools-hub');
 const search=document.getElementById('tools-search');
 const status=document.getElementById('tools-search-status');
 if(!hub||!search||!status)return;

 const normalize=text=>text.normalize('NFKD').replace(/\p{M}|ـ/gu,'').replace(/ى/g,'ي').replace(/([a-z]{3})[/\-]([a-z]{3})(?![a-z])/gi,'$1$2').toLowerCase();
 const index=(section,label='')=>[...section.querySelectorAll('.tools-card')].map(link=>({
  link,
  tokens:normalize([label,link.textContent,link.dataset.keywords].join(' '))
 }));
 const assets=document.getElementById('tools-asset-results');
 const assetCards=index(assets);
 const groups=[...hub.querySelectorAll('details.tools-phase')].map(section=>({
  section,
  cards:index(section,section.querySelector('summary').textContent)
 }));
 let openBeforeSearch;
 search.closest('label').hidden=false;

 function filter(cards,terms){
  let count=0;
  for(const {link,tokens} of cards){
   link.hidden=!terms.every(term=>tokens.includes(term));
   if(!link.hidden)count++;
  }
  return count;
 }

 search.addEventListener('input',()=>{
  const terms=normalize(search.value).trim().split(/\s+/).filter(Boolean);
  if(terms.length&&!openBeforeSearch)openBeforeSearch=groups.map(({section})=>section.open);
  let count=terms.length?filter(assetCards,terms):0;
  assets.hidden=count===0;
  groups.forEach(({section,cards},i)=>{
   const matches=filter(cards,terms);
   section.hidden=matches===0;
   if(terms.length)section.open=matches>0;
   else if(openBeforeSearch)section.open=openBeforeSearch[i];
   count+=matches;
  });
  if(!terms.length)openBeforeSearch=null;
  status.textContent=terms.length?(count?'عُثر على '+count+' نتيجة.':'لم نجد أدوات تطابق البحث.'):'';
 });

 function openLinkedSection(){
  const anchor=document.getElementById(location.hash.slice(1));
  const target=anchor?.dataset.toolsTarget?document.getElementById(anchor.dataset.toolsTarget):anchor;
  const section=target?.closest('#ict-tools-hub details.tools-phase');
  if(!section)return;
  if(search.value){
   search.value='';
   search.dispatchEvent(new Event('input'));
  }
  section.open=true;
  (target.classList.contains('tools-card')?target:section).scrollIntoView({block:'start'});
 }
 openLinkedSection();
 window.addEventListener('hashchange',openLinkedSection);
})();
