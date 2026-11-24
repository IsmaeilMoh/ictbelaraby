'use strict';
const assert=require('node:assert/strict');const q=require('./execution-quotes.js');
const now=Date.parse('2026-11-24T14:00:00Z');
const quote={id:'metals:XAUUSD:15',bid:4000,ask:4000.2,timestamp:new Date(now-1000).toISOString(),source:'licensed-feed'};
assert.equal(q.parseQuote(quote,now).status,'verified_research_quote');
assert.equal(q.parseQuote({...quote,bid:4002},now).reason,'INVALID_BID_ASK');
assert.equal(q.parseQuote({...quote,timestamp:new Date(now-31000).toISOString()},now).reason,'QUOTE_STALE_OR_FUTURE');
assert.equal(q.parseQuote({...quote,ask:4030},now).reason,'SPREAD_TOO_WIDE');
assert.equal(q.parseQuote({...quote,source:''},now).reason,'QUOTE_TIMESTAMP_OR_SOURCE_MISSING');
assert.equal(q.parseFeed({quotes:[quote]}).get(quote.id).bid,4000);
assert.throws(()=>q.parseFeed({quotes:[quote,quote]}),/DUPLICATE/);
(async()=>{
 const good=await q.fetchQuotes('https://quotes.example/api',now,{fetch:async()=>({ok:true,text:async()=>JSON.stringify({quotes:[quote]})})});
 assert.equal(good.ok,true);
 assert.equal((await q.fetchQuotes('http://bad.example',now)).ok,false);
 assert.equal((await q.fetchQuotes('',now)).ok,false);
 console.log('execution quote guard tests passed');
})().catch(e=>{console.error(e);process.exitCode=1});
