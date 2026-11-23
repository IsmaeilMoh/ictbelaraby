/* ICT 6.9.19.14 — same HOME theme icon via ui-icons.js.
   This file only binds the header's click to the existing controller. */
(()=>{'use strict';
  const button=document.querySelector('#ict-one-header #theme');
  if(!button)return;
  button.addEventListener('click',()=>window.ICTTheme?.cycle?.());
  // ui-icons.js decorates #theme with the identical homepage
  // .uii-themebox SVG and watches data-theme for visual sync.
})();
