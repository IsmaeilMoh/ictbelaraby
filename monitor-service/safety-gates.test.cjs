'use strict';const assert=require('node:assert/strict');const g=require('./safety-gates');
async function test(){
 const now=Date.parse('2026-11-24T14:00:00Z');
 assert.ok(Number.isNaN(g.isoTime('2026-11-24T14:00:00')));
 assert.equal(g.isoTime('2026-11-24T09:00:00-05:00'),now);
 assert.deepEqual(g.currenciesFor({market:'forex',symbol:'EURUSD'}),['EUR','USD']);
 assert.deepEqual(g.currenciesFor({market:'metals',symbol:'XAUUSD'}),['USD']);
 const f=g.normalizeFeed({events:[{currency:'USD',impact:'high',datetime:'2026-11-24T14:15:00Z',title:'US CPI'}]});
 assert.equal(g.checkNews(f,{market:'metals',symbol:'XAUUSD'},now).status,'blocked');
 assert.equal(g.checkNews(f,{market:'forex',symbol:'EURUSD'},now).reason,'HIGH_IMPACT_NEARBY');
 assert.equal(g.checkNews(f,{market:'forex',symbol:'EURGBP'},now).status,'clear_research_only');
 assert.equal(g.checkNews(null,{market:'metals',symbol:'XAUUSD'},now).status,'blocked');
 const incomplete=g.normalizeFeed({events:[{currency:'USD',impact:'high',datetime:'2026-11-24T14:15:00Z'},{currency:'USD',impact:'high',datetime:'2026-11-24T14:00:00'}]});
 assert.equal(g.checkNews(incomplete,{market:'metals',symbol:'XAUUSD'},now).reason,'ECONOMIC_FEED_HAS_UNVERIFIED_TIMES');
 assert.throws(()=>g.normalizeFeed({events:[{currency:'USD',datetime:'2026-11-24T14:00:00'}]}),/NO_EVENTS/);
 const good={direction:'bull',entry:100,stop:98,target:104};
 assert.equal(g.checkStructure(good).status,'clear_research_only');
 assert.equal(g.checkStructure({...good,stop:102}).status,'blocked');
 assert.equal(g.checkStructure({...good,stop:90}).reason,'STOP_DISTANCE_OUT_OF_POLICY');
 // Never use a live economic provider in this deterministic safety regression test.
 const unavailable=await g.fetchEconomic('',now,{fetch:async()=>({ok:false,status:503})});
 assert.equal(unavailable.ok,false);
 assert.match(unavailable.reason,/FREE_CALENDAR_HTTP_503/);
 const ok=await g.fetchEconomic('https://data.example.org/calendar.json',now,{fetch:async()=>({ok:true,text:async()=>JSON.stringify({events:[{currency:'USD',impact:'high',datetime:'2026-11-24T14:15:00Z'}]})})});
 assert.equal(ok.ok,true);
 const old=await g.fetchEconomic('https://data.example.org/calendar.json',now,{fetch:async()=>({ok:true,text:async()=>JSON.stringify({events:[{currency:'USD',impact:'high',datetime:'2020-01-01T00:00:00Z'}]})})});
 assert.equal(old.ok,false);
 console.log('8C.4 safety gates: 15+ assertions passed');
}
test().catch(e=>{console.error(e);process.exitCode=1});

(async()=>{
 const {fetchFreeCalendar,checkNews}=require('./safety-gates.js');
 const base=Date.parse('2026-11-24T12:00:00Z');
 const fake=rows=>async()=>({ok:true,text:async()=>JSON.stringify(rows)});
 const good=await fetchFreeCalendar(base,{fetch:fake([{time:'2026-11-24T12:30:00Z',timeMode:'exact',currency:'USD',importance:'high',name:'High-impact CPI'}])});
 assert.equal(good.ok,true);assert.equal(good.eventCount,1);assert.equal(checkNews(good.feed,{market:'metals',symbol:'XAUUSD'},base).status,'blocked');
 const tentative=await fetchFreeCalendar(base,{fetch:fake([{time:'2026-11-24T12:30:00Z',timeMode:'tentative',currency:'USD',importance:'high',name:'Tentative CPI'}, {time:'2026-11-24T15:00:00Z',timeMode:'exact',currency:'USD',importance:'high',name:'Some event'}])});
 assert.equal(tentative.ok,true);assert.ok(tentative.invalid>=1);assert.equal(checkNews(tentative.feed,{market:'metals',symbol:'XAUUSD'},base).status,'blocked');
 const empty=await fetchFreeCalendar(base,{fetch:fake([])});assert.equal(empty.ok,false);
 console.log('Free calendar fallback safety tests: PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
