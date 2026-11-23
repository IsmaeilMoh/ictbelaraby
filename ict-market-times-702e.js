/* ICT بالعربي — Dual-market time display. UTC remains the internal storage and calculation standard. */
(function(root){'use strict';
const settings={year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'};
const zones=[['نيويورك','America/New_York'],['فلسطين','Asia/Gaza']];
const formatters=zones.map(([label,zone])=>({label,fmt:new Intl.DateTimeFormat('en-GB',{...settings,timeZone:zone})}));
function format(value){const dt=new Date(value);if(!Number.isFinite(dt.getTime()))return 'وقت غير صالح';
 return formatters.map(({label,fmt})=>label+': '+fmt.format(dt).replace(',','')).join(' | ');
}
root.ICTMarketTimes=Object.freeze({format,zones:zones.map(x=>x[1])});
})(typeof window!=='undefined'?window:globalThis);
