'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const code=fs.readFileSync(require('node:path').join(__dirname,'..','ict-background-status-708c2.js'),'utf8');
function element(id){return {id,value:'',textContent:'',disabled:false,dataset:{},children:[],get childElementCount(){return this.children.length},events:{},append(...nodes){this.children.push(...nodes)},replaceChildren(){this.children=[]},addEventListener(name,callback){this.events[name]=callback}};}
const ids=['dc-background-8c2','dc-bg-url','dc-bg-save','dc-bg-check','dc-bg-status','dc-bg-results','dc-bg-free-check'];
const elements=Object.fromEntries(ids.map(i=>[i,element(i)]));
const current=Date.parse('2026-11-24T12:00:00Z');
function makeSnapshot(active=true,stale=false){return {
 schema:'ict-research-monitor/1',transport:'github-actions-static',readyForExecution:false,active,marketDataReady:true,lastCycleAt:new Date(active?current-60000:current-3600000).toISOString(),
 safety:{executionApproved:false,economic:{ok:false}},marketSummary:{valid:1,configured:1,blocked:0},targets:{'metals:XAUUSD:15':{status:'blocked',reason:'provider_access_denied',error:'RAW_PROVIDER_DETAIL',sourceDelay:{since:new Date(current-240000).toISOString(),through:new Date(current-60000).toISOString()},sourceHistory:[{kind:'blocked',at:new Date(current-120000).toISOString(),reason:'provider_access_denied'},{kind:'recovered',at:new Date(current-180000).toISOString(),since:new Date(current-360000).toISOString()},{kind:'recovered',at:new Date(current+60000).toISOString()}]},'crypto:BTCUSDT:15':{hourlyContext:{status:'insufficient',reason:'session_history_missing'},status:'research_data_valid',stale:false,lastCompleteAt:new Date(current-(stale?46:2)*60000).toISOString()}},
 observations:[{id:'crypto:BTCUSDT:15:a',market:'crypto',symbol:'BTCUSDT',frame:'15',side:'BUY',entry:100,stop:99,target:102,rr:2,detectedAt:new Date(current-60000).toISOString(),status:'research_only_blocked',executionApproved:false,model:'Sweep → MSS → FVG'}]};}
async function run(active,stale=false){
 elements['dc-bg-results'].replaceChildren();

 class FixedDate extends Date {constructor(...a){super(...(a.length?a:[current]))}static now(){return current}}
 const delivered=[];
 elements['ict-decision-8a']={dispatchEvent:e=>delivered.push(e)};
 const ctx={document:{getElementById:id=>elements[id]||null,createElement:tag=>element(tag)},window:{ICTMarketTimes:{format:t=>new Date(t).toISOString()}},URL,Date:FixedDate,AbortController,
  CustomEvent:class {constructor(type,options){this.type=type;this.detail=options.detail}},
  setTimeout:()=>1,clearTimeout(){},localStorage:{getItem:()=>null,setItem(){}},fetch:async()=>({ok:true,json:async()=>makeSnapshot(active,stale)})};
 vm.runInNewContext(code,ctx);
 await elements['dc-bg-free-check'].events.click();
 const output=elements['dc-bg-results'].children.map(node=>node.textContent).join(' ');
 assert.doesNotMatch(output,/RAW_PROVIDER_DETAIL/);
 const detail=elements['dc-bg-results'].children.find(node=>node.id==='details');
 assert.match(detail.children[0].textContent,/سجل تغيّر حالة المصدر/);
 assert.equal(detail.children[1].children.length,2);
 assert.match(output,/مدة التعليق المرصودة حتى آخر فحص/);
 assert.match(detail.children[1].children[1].textContent,/مدة التعليق المرصودة: ٣ د/);
 assert.match(detail.children[1].children[0].textContent,/رُصد التعليق/);
 if(active)assert.match(output,/المزوّد رفض الوصول/);
 if(active&&stale)assert.match(output,/الشموع قديمة/);
 if(active&&!stale)assert.match(output,/سجل الجلسة السابقة غير مكتمل/);
 const eligible=active&&!stale;
 assert.equal(delivered[0]?.type,'ict:background-scanned');
 assert.equal(delivered[0].detail.entries.length,eligible?1:0);
 assert.equal(delivered[0].detail.entries[0]?.symbol,eligible?'BTCUSDT':undefined);
 assert.match(elements['dc-bg-status'].textContent,eligible?/بحثية/:stale?/لا توجد/:/قديم/);
}
(async()=>{await run(true);await run(false);await run(true,true);console.log('Public research dashboard fresh/stale rendering: PASS')})().catch(e=>{console.error(e);process.exitCode=1});
