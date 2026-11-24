/* Helper: populate selectors from shared local account registry; no changes to historic trades. */
(()=>{'use strict';const api=window.ICTAccounts7A;if(!api)return;
 const form=document.getElementById('trade-form'),account=form?.elements.namedItem('accountId'),filter=document.getElementById('dna-account-filter');if(!form||!account||!filter)return;
 function refresh(){const accounts=api.list(),selected=api.selected(),before=account.value,prev=filter.value;
   account.replaceChildren(new Option('بدون ربط بحساب',''));
   filter.replaceChildren(new Option('جميع الحسابات','all'),new Option('صفقات بلا حساب محدد','unassigned'));
   for(const a of accounts){const text=a.name+' — '+(a.type==='funded'?'ممول':'شخصي');account.add(new Option(text,a.id));filter.add(new Option(text,a.id));}
   account.value=accounts.some(a=>a.id===before)?before:accounts.some(a=>a.id===selected)?selected:'';
   filter.value=['all','unassigned',...accounts.map(a=>a.id)].includes(prev)?prev:'all';
 }
 refresh();window.addEventListener('ict:accounts-changed',refresh);window.addEventListener('storage',e=>{if(e.key===api.KEY)refresh()});
})();
