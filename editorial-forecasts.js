/* ICT بالعربي — editorial market consensus, no API or scraping.
   Only records deliberately approved for public reuse are displayed.
   Match EXACT indicator, measurement period and units; freeze before release.
*/
(function(){
'use strict';
let records=new Map(),loaded=false;
const ISO=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(s)&&Number.isFinite(Date.parse(s));
const key=(a,b)=>String(a)+'|'+String(b);
function parse(data){
 const next=new Map();
 if(data?.schemaVersion!==1||!Array.isArray(data.forecasts)||data.forecasts.length>1000)return next;
 for(const x of data.forecasts){
  if(!x||!['%','K'].includes(x.unit)||!/^20\d\d-(0[1-9]|1[0-2])$/.test(x.period||'')||!/^[-+]?(?:\d+\.?\d*|\.\d+)$/.test(String(x.value))||!Number.isFinite(Number(x.value)))continue;
  if(!/^[a-z0-9-]{2,45}$/.test(x.indicator||''))continue;
  if(!ISO(x.recordedAt)||!ISO(x.releaseAt)||Date.parse(x.recordedAt)>=Date.parse(x.releaseAt))continue;
  if(x.approvedForPublicDisplay!==true||typeof x.source!=='string'||x.source.trim().length<3||!/^https:\/\//.test(x.sourceUrl||''))continue;
  const k=key(x.indicator,x.period);if(!next.has(k)||Date.parse(x.recordedAt)<Date.parse(next.get(k).recordedAt))next.set(k,Object.freeze({...x,value:Number(x.value)}));
 }
 return next;
}
async function load(){try{const response=await fetch('economic-forecasts.json?t='+Date.now(),{cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);records=parse(await response.json());loaded=true;}catch{records=new Map();loaded=false;}return loaded}
function find(e){const f=records.get(key(e?.indicator,e?.period));return f&&f.unit===e.unit?f:null}
function difference(e){const f=find(e);if(!f||!Number.isFinite(Number(e.actual)))return null;return Math.round((Number(e.actual)-f.value)*1000)/1000}
window.ICTEditorialForecasts=Object.freeze({load,find,difference});
})();
