/* 6.9.19.13 — same theme icon design as homepage, no new theme controller. */
(()=>{'use strict';
const root=document.getElementById('ict-one-header');if(!root)return;
const button=root.querySelector('.ict-one-theme'),box=root.querySelector('.ict-one-theme-icon'),label=root.querySelector('.ict-one-theme-label');
const moon='<path d="M20 14.2A7.7 7.7 0 0 1 9.8 4a8.7 8.7 0 1 0 10.2 10.2Z"/>';
const sun='<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"/>';
function draw(){const mode=document.documentElement.getAttribute('data-theme')==='light'?'light':'dark';
 box.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+(mode==='light'?sun:moon)+'</svg>';
 label.textContent=mode==='light'?'فاتح':'داكن';
 button.title='تغيير المظهر';}
button.addEventListener('click',()=>{window.ICTTheme?.cycle?.();draw();});
new MutationObserver(draw).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
window.addEventListener('pageshow',draw);draw();
})();
