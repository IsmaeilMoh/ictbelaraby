'use strict';
const assert=require('node:assert/strict');
const stream=require('../ict-entry-stream.js');
const now=Date.parse('2026-11-25T12:00:00Z');
const quote=(at,bid,ask)=>({at,bid,ask,bidSize:1,askSize:1});
const buy={id:'buy',side:'BUY',entry:100,stop:97,target:110,blocks:[]};
const sell={id:'sell',side:'SELL',entry:101,stop:104,target:92,blocks:[]};
const watch=(plans=[buy],allowed=()=>true)=>stream.watch(plans,{observedAt:now,until:now+10000,allowed});
let session=watch();
assert.deepEqual(session.push(quote(now+1,100.8,101),now+1),[]);
let events=session.push(quote(now+2,99.9,100),now+2);
assert.deepEqual(events.map(event=>[event.kind,event.price]),[['entry',100]]);
assert.deepEqual(session.push(quote(now+3,99.8,99.9),now+3),[]);
session=watch([sell]);
session.push(quote(now+1,100,100.1),now+1);
assert.equal(session.push(quote(now+2,101,101.1),now+2)[0].price,101);
assert.equal(watch().push(quote(now+1,99.9,100),now+1)[0].kind,'unconfirmed');
assert.equal(watch().push(quote(now+1,96.9,97),now+1)[0].kind,'invalidated');
session=watch([buy],()=>false);
session.push(quote(now+1,100.9,101),now+1);
assert.equal(session.push(quote(now+2,99.9,100),now+2)[0].kind,'unconfirmed');
assert.deepEqual(watch([{...buy,blocks:['hourly']}]).push(quote(now+1,99.9,100),now+1),[]);
session=watch();
session.push(quote(now+1,100.9,101),now+1);
assert.deepEqual(session.push(quote(now+1,99.9,100),now+2),[]);
assert.deepEqual(session.push(quote(now+6002,99.9,100),now+6002),[]);
session=watch();
session.push(quote(now+1,100.9,101),now+1);
session.pause();
assert.deepEqual(session.push(quote(now+2,99.9,100),now+2),[]);
assert.deepEqual(watch().push(quote(now+10000,99.9,100),now+10000),[]);
assert.equal(stream.quoteStatus(quote(now-6000,99.9,100),now),'invalid');
assert.equal(stream.quoteStatus(quote(now+1,99.9,100),now),'invalid');
assert.equal(stream.quoteStatus(quote(now,99,101),now),'wide');
const ticker={channel:'ticker',type:'update',data:[{symbol:'PF_XBTUSD',timestamp:new Date(now).toISOString(),
 bid:99.9,ask:100,bid_qty:1,ask_qty:1}]};
assert.deepEqual(stream.parse('kraken','PF_XBTUSD',ticker),quote(now,99.9,100));
assert.equal(stream.parse('kraken','PF_ETHUSD',ticker),null);
assert.equal(stream.subscription('kraken','PF_XBTUSD').request.params.asset_class,'derivatives');
const bybit={topic:'orderbook.1.BTCUSDT',type:'snapshot',cts:now,data:{s:'BTCUSDT',b:[['99.9','1']],a:[['100','1']]}};
assert.deepEqual(stream.parse('crypto','BTCUSDT',bybit),quote(now,99.9,100));
assert.equal(stream.parse('crypto','BTCUSDT',{...bybit,type:'delta'}),null);
assert.equal(stream.subscription('spot','BTCUSDT'),null);

class Socket extends EventTarget {
 constructor(url){super();this.url=url;Socket.instance=this}
 send(data){this.sent=JSON.parse(data)}
 close(){this.dispatchEvent(new Event('close'))}
}
let received=0,failed;
const link=stream.connect('kraken','PF_XBTUSD',{quote(){received++},failed(reason){failed=reason}},
 {Socket,clock:()=>now});
Socket.instance.dispatchEvent(new Event('open'));
assert.deepEqual(Socket.instance.sent.params.symbol,['PF_XBTUSD']);
Socket.instance.dispatchEvent(new MessageEvent('message',{data:JSON.stringify(ticker)}));
assert.equal(received,1);
Socket.instance.dispatchEvent(new Event('close'));
assert.equal(failed,'disconnected');
Socket.instance.dispatchEvent(new MessageEvent('message',{data:JSON.stringify(ticker)}));
assert.equal(received,1);
link.close();
console.log('Entry stream: venue identity, fresh bid/ask, buy/sell crosses and fail-closed monitoring PASS');
