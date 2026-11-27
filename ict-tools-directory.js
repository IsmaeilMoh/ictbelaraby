(()=>{'use strict';
 const hub=document.getElementById('ict-tools-hub');
 const search=document.getElementById('tools-search');
 const status=document.getElementById('tools-search-status');
 if(!hub||!search||!status)return;

 const normalize=text=>text.normalize('NFKD').replace(/\p{M}|ـ/gu,'').replace(/ى/g,'ي').replace(/([a-z]{3})[/\-]([a-z]{3})(?![a-z])/gi,'$1$2').toLowerCase();
 const assetList=hub.querySelector('.tools-asset-list');
 let assetsOpenBeforeSearch=false;
 const groups=[...hub.querySelectorAll('details.tools-phase')].map(section=>({
  section,
  cards:[...section.querySelectorAll('.tools-card')].map(link=>({
   link,
   tokens:normalize(section.querySelector('summary').textContent+' '+link.textContent+' '+link.dataset.keywords)
  }))
 }));
 let openBeforeSearch;
 search.closest('label').hidden=false;

 search.addEventListener('input',()=>{
  const terms=normalize(search.value).trim().split(/\s+/).filter(Boolean);
  if(terms.length&&!openBeforeSearch){
   openBeforeSearch=groups.map(({section})=>section.open);
   assetsOpenBeforeSearch=assetList?.open;
  }
  let count=0;
  groups.forEach(({section,cards},index)=>{
   let matches=0;
   for(const {link,tokens} of cards){
    link.hidden=!terms.every(term=>tokens.includes(term));
    if(!link.hidden)matches++;
   }
   section.hidden=matches===0;
   if(terms.length)section.open=matches>0;
   else if(openBeforeSearch)section.open=openBeforeSearch[index];
   count+=matches;
  });
  if(assetList){
   const hasAssets=Boolean(assetList.querySelector('.tools-card:not([hidden])'));
   assetList.hidden=!hasAssets;
   assetList.open=terms.length?hasAssets:assetsOpenBeforeSearch;
  }
  if(!terms.length)openBeforeSearch=null;
  status.textContent=terms.length?(count?'عُثر على '+count+' نتيجة.':'لم نجد أدوات تطابق البحث.'):'';
 });
 function openLinkedSection(){
  const target=document.getElementById(location.hash.slice(1));
  const section=target?.closest('#ict-tools-hub details.tools-phase');
  if(section){
   section.open=true;
   section.scrollIntoView({block:'start'});
  }
 }
 openLinkedSection();
 window.addEventListener('hashchange',openLinkedSection);
})();
