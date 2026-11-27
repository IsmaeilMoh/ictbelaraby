
(()=>{
  'use strict';
  const NS='http://www.w3.org/2000/svg';
  const ICONS={
    home:'<path d="M3.5 9.2 12 2.8l8.5 6.4v8.3a1 1 0 0 1-1 1h-5.3v-5h-4.4v5H4.5a1 1 0 0 1-1-1z"/><path d="M8.5 18.5v-5h7v5"/>',
    markets:'<path d="M4 17.5V6.5"/><path d="M10 17.5V3.5"/><path d="M16 17.5v-8"/><path d="M21 17.5V8.8"/><path d="M2.8 18.5h18.4"/>',
    news:'<rect x="3.5" y="4.5" width="17" height="14" rx="2.5"/><path d="M7 8h3.7v6H7z"/><path d="M12.5 8h5.5M12.5 11h5.5M7 15h11"/>',
    recs:'<path d="M4 17 10.2 10.8l3.3 3.3L20 7.6"/><path d="M15.7 7.6H20v4.3"/>',
    agenda:'<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M8 3.5v3M16 3.5v3M4 9.5h16"/><path d="M8.3 13h3.4M8.3 16h6.7"/>',
    ict:'<path d="M5 18.5 12 5.5l7 13"/><path d="M8.8 14.7h6.4"/>',
    links:'<path d="M10 14a3.5 3.5 0 0 1 0-5l2-2a3.5 3.5 0 0 1 5 5l-1 1"/><path d="M14 10a3.5 3.5 0 0 1 0 5l-2 2a3.5 3.5 0 0 1-5-5l1-1"/>',
    more:'<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
    workspace:'<path d="M4 5.2h16a1 1 0 0 1 1 1v10.6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6.2a1 1 0 0 1 1-1Z"/><path d="M3 9.5h18"/><path d="M8 13h4M8 16h7"/>',
    intelligence:'<path d="M12 4.5c4 0 7.2 3.2 7.2 7.2S16 18.9 12 18.9 4.8 15.7 4.8 11.7 8 4.5 12 4.5Z"/><path d="M12 2.7v2.1M12 19.2v2.1M21 11.9h-2.1M5.1 11.9H3"/><path d="m17.1 6.8-1.5 1.5M8.4 15.5l-1.5 1.5M17.1 17l-1.5-1.5M8.4 8.3 6.9 6.8"/><circle cx="12" cy="11.9" r="2.5"/>',
    research:'<path d="M10 4.5h8a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 18V6A1.5 1.5 0 0 1 6 4.5h1"/><path d="M8.2 4.5a1.8 1.8 0 1 1 3.6 0"/><path d="M8 10h8M8 13h8M8 16h5"/>',
    smartdesk:'<rect x="3.8" y="4.5" width="16.4" height="14" rx="2.6"/><path d="M8 20.3h8"/><path d="M9 8.8h6M7.8 12h8.4M9.6 15.2h4.8"/>',
    dashboard:'<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="4.5" rx="1.5"/><rect x="13" y="10.5" width="7" height="9.5" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/>',
    guardian:'<path d="M12 3.5 19 6v5.1c0 4.2-2.8 7-7 9.4-4.2-2.4-7-5.2-7-9.4V6z"/><path d="m9.2 11.7 1.9 1.9 3.7-4"/>',
    checklist:'<path d="M6 7.8 7.5 9.3 10 6.8"/><path d="M12.5 8h5.5"/><path d="M6 12.3l1.5 1.5 2.5-2.5"/><path d="M12.5 12.5h5.5"/><path d="M6 16.8l1.5 1.5 2.5-2.5"/><path d="M12.5 17h5.5"/>',
    radar:'<circle cx="12" cy="12" r="7.5"/><path d="M12 12 17 9"/><path d="M12 4.5v15"/><path d="M4.5 12h15"/>',
    xray:'<path d="M6 5.5 18 18.5M18 5.5 6 18.5"/><rect x="4" y="4" width="16" height="16" rx="3"/>',
    strategy:'<path d="M4.5 17.5 10 12l3 3 6.5-7"/><path d="M14.7 8H19v4.3"/>',
    replay:'<path d="M7.5 7.3 4.5 10l3 2.7"/><path d="M4.5 10h7.2a4.8 4.8 0 0 1 0 9.6H9.5"/>',
    patterns:'<path d="M5 16.5h3.5v-6H5zM10.2 16.5h3.5v-10h-3.5zM15.4 16.5h3.5v-3.5h-3.5z"/>',
    live:'<path d="M5 12h3l1.5-3 3 6 2.1-4H19"/><circle cx="4" cy="12" r="1"/><circle cx="20" cy="12" r="1"/>',
    dna:'<path d="M8 4.5c4 2 4 13 8 15"/><path d="M16 4.5c-4 2-4 13-8 15"/><path d="M8.6 8h6.8M7.8 12h8.4M8.6 16h6.8"/>',
    assistant:'<path d="M12 4.2 13.8 8l4.2.5-3.1 2.9.8 4.2L12 13.6 8.3 15.6l.8-4.2L6 8.5 10.2 8z"/>',
    back:'<path d="M14.5 6 8.5 12l6 6"/><path d="M9 12h10"/>',
    theme:'<path d="M20 14.2A7.7 7.7 0 0 1 9.8 4a8.7 8.7 0 1 0 10.2 10.2Z"/>',
    refresh:'<path d="M20 10a8 8 0 0 0-13.5-4.6L4 8m0-4v4h4M4 14a8 8 0 0 0 13.5 4.6L20 16m0 4v-4h-4"/>',
    install:'<path d="M12 4v10"/><path d="m8.5 10.5 3.5 3.5 3.5-3.5"/><path d="M5 18.5h14"/>'
  };
  function makeIcon(name, cls='uii-svg'){
    const wrap=document.createElement('span');
    wrap.className=cls;
    const svg=document.createElementNS(NS,'svg');
    svg.setAttribute('viewBox','0 0 24 24');
    svg.setAttribute('fill','none');
    svg.setAttribute('stroke','currentColor');
    svg.setAttribute('stroke-width','1.85');
    svg.setAttribute('stroke-linecap','round');
    svg.setAttribute('stroke-linejoin','round');
    svg.setAttribute('aria-hidden','true');
    svg.innerHTML=ICONS[name]||ICONS.more;
    wrap.append(svg);
    return wrap;
  }
  window.ICTSharedIcons=Object.freeze({makeIcon});
  function boxed(name, kind='uii-inlinebox'){
    const b=document.createElement('span');
    b.className=kind;
    b.append(makeIcon(name));
    return b;
  }
  function cleanLabel(el){
    if(!el)return;
    const nodes=[...el.childNodes];
    nodes.forEach(n=>{
      if(n.nodeType===3){ n.nodeValue=n.nodeValue.replace(/^[\s⌂▥▦↗☷◐◉◈✦◎←]+/u,'').trimStart(); }
    });
  }
  function prependOnce(el, marker, node){ if(!el || el.querySelector('.'+marker)) return; node.classList.add(marker); el.prepend(node); }

  const topNavMap={home:'home',markets:'markets',news:'news',recs:'recs',agenda:'agenda',ict:'ict',links:'links',more:'more'};
  document.querySelectorAll('.navigation a[data-page], .topbar nav a, .ws-nav a').forEach(a=>{
    let key=a.dataset.page || '';
    if(!key){
      const href=a.getAttribute('href')||'';
      if(href.includes('workspace')) key='workspace';
      else if(href.includes('intelligence')) key='intelligence';
      else if(href.includes('research')) key='research';
      else if(href.includes('smart-desk')) key='smartdesk';
      else if(href.includes('#agenda')) key='agenda';
      else if(href.includes('#recs')) key='recs';
      else if(href.includes('#ict')) key='ict';
      else key='home';
    }
    cleanLabel(a);
    prependOnce(a,'uii-linkmark',boxed(topNavMap[key]||key,'uii-inlinebox'));
  });

  document.querySelectorAll('.mobile-bottom a[data-page]').forEach(a=>{
    const key=topNavMap[a.dataset.page] || a.dataset.page || 'more';
    const old=a.querySelector('.nav-icon'); if(old) old.remove();
    prependOnce(a,'uii-mobilemark',boxed(key,'uii-iconbox'));
  });

  const themeBtn=document.getElementById('theme');
  if(themeBtn){
    const txt=themeBtn.firstChild; // remove stray text icon if any
    [...themeBtn.childNodes].forEach(n=>{ if(n.nodeType===3) n.nodeValue=''; });
    prependOnce(themeBtn,'uii-themebox',boxed('theme','uii-inlinebox'));
  }

  // Keep main header switch synchronized with the effective theme, not the
  // stored auto setting. This decorates the existing button; it does not
  // replace its original click listener or change localStorage.
  function syncThemeVisual(){
    if(!themeBtn)return;
    const mode=document.documentElement.getAttribute('data-theme')==='dark'?'dark':'light';
    const label=themeBtn.querySelector('#theme-label');
    const box=themeBtn.querySelector('.uii-themebox .uii-svg');
    const display=mode==='dark'?'داكن':'فاتح';
    if(label && label.textContent!==display)label.textContent=display;
    if(box && box.dataset.iconMode!==mode){
      box.dataset.iconMode=mode;
      const svg=box.querySelector('svg');
      if(svg)svg.innerHTML=mode==='light'
        ? '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"/>'
        : ICONS.theme;
    }
    themeBtn.setAttribute('title','المظهر الحالي: '+display+' — اضغط للتغيير');
    themeBtn.setAttribute('aria-label','المظهر الحالي: '+display+'، اضغط للتغيير');
  }
  if(themeBtn){
    const mo=new MutationObserver(syncThemeVisual);
    mo.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
    // Native app code can update the label after the theme switch; maintain
    // the actual light/dark label without retriggering if no change is needed.
    const stateLabel=themeBtn.querySelector('#theme-label');
    if(stateLabel)mo.observe(stateLabel,{childList:true,characterData:true,subtree:true});
    syncThemeVisual();
  }
  const installBtn=document.getElementById('install');
  if(installBtn) prependOnce(installBtn,'uii-installbox',boxed('install','uii-inlinebox'));

  document.querySelectorAll('.go-home,.ws-back,.back').forEach(a=>prependOnce(a,'uii-backbox',boxed('back','uii-inlinebox')));

  document.querySelectorAll('.ict54-hub-links a').forEach(a=>{
    prependOnce(a,'uii-hublink',boxed(a.dataset.navIcon||'more','ict54-link-icon'));
  });

  const tabMap={dashboard:'dashboard',guardian:'guardian',checklist:'checklist',radar:'radar',xray:'xray',news:'news',strategy:'strategy',replay:'replay',patterns:'patterns',live:'live',dna:'dna',assistant:'assistant'};
  document.querySelectorAll('[data-tab]').forEach(btn=>{
    const key=tabMap[btn.dataset.tab] || 'more';
    cleanLabel(btn);
    prependOnce(btn,'uii-tabmark',boxed(key,'uii-tabbox'));
  });


  // Extra icons are hydrated after app.js renders and whenever the SPA changes sections.
  const hrefIcon = (href)=>{
    const h=String(href||'').toLowerCase();
    if(h.includes('#more'))return 'more';
    if(h.includes('#ict-structure'))return 'patterns';
    if(h.includes('#ict-briefing'))return 'news';
    if(h.includes('#dc-lifecycle')||h.includes('decision-center'))return 'recs';
    if(h.includes('#dc-advanced'))return 'guardian';
    if(h.includes('research'))return 'research';
    if(h.includes('intelligence'))return 'intelligence';
    if(h.includes('smart-desk'))return 'smartdesk';
    if(h.includes('workspace'))return 'workspace';
    if(h.includes('workflow'))return 'strategy';
    if(h.includes('assets'))return 'markets';
    if(h.includes('#agenda'))return 'agenda';
    if(h.includes('#recs'))return 'recs';
    if(h.includes('#academy'))return 'ict';
    if(h.includes('#ict'))return 'ict';
    if(h.includes('#markets'))return 'markets';
    if(h.includes('#calculators'))return 'guardian';
    return 'dashboard';
  };
  const app=document.getElementById('app')||document.querySelector('html[data-ict-unified] main');
  function hydrateApp(){
    if(!app)return;
    const shortcuts='.dc-nav a,.workflow-link-trail a,.hero-actions a,.hero-pills a,.r14-quick-actions a,.asset-actions a,.asset-crumbs a,.tools-actions a';
    app.querySelectorAll('[data-ict-icon],'+shortcuts).forEach(element=>{
      const explicit=element.dataset.ictIcon;
      const name=explicit||hrefIcon(element.getAttribute('href'));
      if(!Object.hasOwn(ICONS,name))return;
      if(element.matches('a'))element.classList.add('uii-action-link');
      if(!element.querySelector('svg'))prependOnce(element,'uii-actionmark',boxed(name,'uii-actionmark'));
    });
    app.querySelectorAll('.ict-center-group').forEach(group=>{
      const title=(group.querySelector('summary strong')?.textContent||'').trim();
      let key='more';
      if(title.includes('الأسواق'))key='markets';
      else if(title.includes('المختبرات'))key='research';
      else if(title.includes('إدارة'))key='workspace';
      else if(title.includes('التعليم'))key='ict';
      const holder=group.querySelector('.ict-center-icon');
      if(holder&&!holder.classList.contains('uii-ready')){
        holder.replaceChildren(makeIcon(key));holder.classList.add('uii-ready');
      }
    });
    app.querySelectorAll('.tool-card[href]').forEach(a=>{
      let g=a.querySelector('.tool-glyph');
      if(!g){g=document.createElement('span');g.className='tool-glyph';a.prepend(g);}
      if(g.classList.contains('uii-ready'))return;
      g.replaceChildren(makeIcon(hrefIcon(a.getAttribute('href'))));
      g.classList.add('uii-ready');
    });
    // Restrict icon embellishments to headings, never the live TradingView/price text.
    app.querySelectorAll('.section-title h2,.section-heading h2,.news-line h3,.rec-card h3').forEach(h=>{
      if(h.querySelector('.uii-headingmark'))return;
      const text=(h.textContent||'').trim();
      const name=/أبرز الأخبار|أخبار اقتصادية|الأخبار/.test(text)?'news':
        /التوصيات|تحليلات فنية/.test(text)?'recs':
        /الأجندة|التقويم/.test(text)?'agenda':null;
      if(name)prependOnce(h,'uii-headingmark',boxed(name,'uii-headingmark'));
    });
  }
  // The shared 6.8.3 theme script injects a bottom button on standalone pages;
  // relocate the *same button* into the header, preserving its click handler/storage.
  function relocateTheme(){
    const c=document.getElementById('ict68-theme-control');
    if(!c)return;
    const header=document.querySelector('.ws-header-content')||
      document.querySelector('.topbar .header-inner')||
      document.querySelector('.topbar');
    if(header&&!header.contains(c)){
      header.append(c);
      c.classList.add('uii-header-theme');
      c.setAttribute('title','تغيير المظهر');
    }
  }
  let queued=false;
  function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;hydrateApp();relocateTheme();});}
  // app.js generates pages asynchronously; run again for newly inserted cards.
  const obs=new MutationObserver(schedule);
  if(app)obs.observe(app,{childList:true,subtree:true});
  // Standalone button is appended to body at DOMContentLoaded.
  obs.observe(document.body,{childList:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});
  schedule();

})();
