'use strict';
const assert=require('node:assert/strict');
const source=require('./ict-public-markets-702c2.js');
const bybit=require('./ict-live-feed-702a.js');
const now=Date.parse('2026-11-24T12:42:00Z');
const ms=900000,start=Math.floor(now/ms)*ms-35*ms;
const rows=Array.from({length:36},(_,i)=>({openTime:new Date(start+i*ms).toISOString(),open:1.08,high:1.10,low:1.07,close:1.09,isOpen:i===35}));
const ins=source.resolve('forex','EURUSD');
const parsed=source.parse({symbol:'EURUSD',interval:'15m',bars:rows},ins,'15min',now);
assert.equal(parsed.length,36);assert.equal(parsed[0].confirmed,true);assert.equal(parsed[35].confirmed,false);
assert.throws(()=>source.parse({symbol:'XAUUSD',interval:'15m',bars:rows},ins,'15min',now),/رمز الاستجابة/);
assert.throws(()=>source.parse({symbol:'EURUSD',interval:'15m',bars:[rows[0],rows[0]]},ins,'15min',now),/مكررة/);
const b=bybit.parseHistory({retCode:0,result:{symbol:'BTCUSDT',list:[
 [start+34*ms,'100','103','99','102','25','20'],[start+33*ms,'100','104','98','101','30','20']
]}},'BTCUSDT','15',now);
assert.equal(b.length,2);assert.equal(b[0].confirmed,true);
assert.equal(source.resolve('metals','XAUUSD').quote,'USD');
console.log('Traditional and Bybit candle connector fixtures: PASS');
