/* The public site keeps its default appearance. Preview state is tab-local. */
(() => {
 'use strict';
 const url = new URL(location.href);
 const selection = url.searchParams.get('design');
 const key = 'ict-design-preview';
 let enabled = selection === 'play';
 try {
  if (selection === 'play') sessionStorage.setItem(key, 'play');
  else if (selection === 'classic') sessionStorage.removeItem(key);
  else enabled = sessionStorage.getItem(key) === 'play';
 } catch {
  // The explicit preview URL still works when browser storage is unavailable.
 }
 if (!enabled) return;
 document.documentElement.dataset.ictDesign = 'play';
 document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('body > header');
  if (!header) return;
  const badge = document.createElement('aside');
  badge.className = 'ict-preview-bar';
  badge.setAttribute('aria-label', 'معاينة التصميم');
  const label = document.createElement('span');
  label.textContent = 'معاينة التصميم';
  const classic = document.createElement('a');
  url.searchParams.set('design', 'classic');
  classic.href = url.href;
  classic.addEventListener('click', event => {
   // Rebuild from the current route, including changes to the hash since load.
   const returnUrl = new URL(location.href);
   returnUrl.searchParams.set('design', 'classic');
   if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
    event.preventDefault();
    location.assign(returnUrl);
   }
  });
  classic.textContent = 'العودة للتصميم الحالي';
  badge.append(label, classic);
  header.after(badge);
 }, { once: true });
})();
