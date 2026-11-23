/* Header visual identity only: 6.9.19 original home is not modified. */
(()=>{'use strict';
 const label=(mode)=>({auto:'تلقائي',light:'فاتح',dark:'داكن'})[mode]||'داكن';
 function admin(){const header=document.querySelector('body > header.admin-header');if(!header)return;
 document.body.classList.add('ict-header-match-admin');
 const brand=header.querySelector('.admin-brand');if(!brand)return;
 const strong=brand.querySelector('strong');const text=brand.querySelector('span');
 if(strong&&text){const wrap=document.createElement('span');wrap.className='ict-brand-stack';strong.replaceWith(wrap);wrap.append(strong);text.remove();const subtitle=document.createElement('small');subtitle.textContent='مساحة المتداول العربي';wrap.append(subtitle)}
 const bar=header.querySelector('.admin-header-inner');const view=bar.querySelector('a:not(.admin-brand)');
 const actions=document.createElement('div');actions.className='ict-admin-actions';if(view){view.classList.add('ict-admin-view-link');actions.append(view)}
 const button=document.createElement('button');button.type='button';button.className='ict-admin-theme';button.setAttribute('aria-label','تغيير مظهر الصفحة');
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','2');svg.setAttribute('stroke-linecap','round');svg.setAttribute('aria-hidden','true');const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d','M20 13.2A8.5 8.5 0 0 1 10.8 4 8.5 8.5 0 1 0 20 13.2Z');svg.append(path);button.append(svg);
 const caption=document.createElement('span');button.append(caption);
 function update(){caption.textContent=label(window.ICTTheme?.resolved?.());const current=window.ICTTheme?.resolved?.()||'light';document.body.dataset.ictAdminTheme=current}
 button.addEventListener('click',()=>{if(window.ICTTheme)window.ICTTheme.cycle();update()});
 actions.prepend(button);bar.append(actions);update();
 document.documentElement.addEventListener('ict:themechange',update);
 }
 function init(){if(location.pathname.split('/').pop()==='admin.html')admin()}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
