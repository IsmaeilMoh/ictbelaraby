/* ICT بالعربي 6.9.19.12 — one controlled theme switch for the static header. */
(()=>{'use strict';
const root=document.getElementById('ict-one-header');if(!root)return;
const button=root.querySelector('.ict-one-theme');const icon=root.querySelector('.ict-one-theme-icon');const label=root.querySelector('.ict-one-theme-label');
const modes={light:['☀','فاتح'],dark:['☾','داكن'],auto:['◐','تلقائي']};
function draw(){let mode=window.ICTTheme?.chosen?.();if(!modes[mode])mode='auto';const [symbol,text]=modes[mode];icon.textContent=symbol;label.textContent=text;button.title='تغيير المظهر — '+text;}
button.addEventListener('click',()=>{window.ICTTheme?.cycle?.();draw();});
document.documentElement.addEventListener('ict:themechange',draw);
window.addEventListener('pageshow',draw);
draw();
})();
