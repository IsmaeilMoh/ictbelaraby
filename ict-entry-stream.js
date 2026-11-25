/* Public market data and conditional research alerts. No trading API. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.ICTEntryStream=api;
})(globalThis,function(){
 'use strict';
 const MAX_AGE=5000, MAX_SPREAD_BPS=40;

 function subscription(market,symbol){
  if(market==='kraken'&&['PF_XBTUSD','PF_ETHUSD'].includes(symbol))return {
   url:'wss://uws.kraken.com/v2/public',
   request:{method:'subscribe',params:{channel:'ticker',asset_class:'derivatives',symbol:[symbol],snapshot:true}}
  };
  if(market==='crypto'&&['BTCUSDT','ETHUSDT','SOLUSDT','XRPUSDT'].includes(symbol))return {
   url:'wss://stream.bybit.com/v5/public/linear',request:{op:'subscribe',args:['orderbook.1.'+symbol]}
  };
  return null;
 }
 function parse(market,symbol,message){
  if(market==='kraken'){
   if(message?.channel!=='ticker'||!['snapshot','update'].includes(message.type)||!Array.isArray(message.data))return null;
   const row=message.data.find(item=>item?.symbol===symbol);
   if(!row)return null;
   const at=typeof row.timestamp==='string'&&/(?:Z|[+-]\d{2}:\d{2})$/.test(row.timestamp)?Date.parse(row.timestamp):NaN;
   return {bid:row.bid,ask:row.ask,bidSize:row.bid_qty,askSize:row.ask_qty,at};
  }
  const data=message?.data;
  if(market!=='crypto'||message?.topic!=='orderbook.1.'+symbol||message.type!=='snapshot'||data?.s!==symbol)return null;
  return {bid:Number(data.b?.[0]?.[0]),ask:Number(data.a?.[0]?.[0]),
   bidSize:Number(data.b?.[0]?.[1]),askSize:Number(data.a?.[0]?.[1]),at:message.cts};
 }
 function quoteStatus(quote,now){
  if(!quote||!Number.isSafeInteger(quote.at)||quote.at>now||now-quote.at>MAX_AGE||
     ![quote.bid,quote.ask,quote.bidSize,quote.askSize].every(value=>Number.isFinite(value)&&value>0)||quote.bid>=quote.ask)return 'invalid';
  const spread=(quote.ask-quote.bid)/((quote.ask+quote.bid)/2)*10000;
  return spread<=MAX_SPREAD_BPS?'ready':'wide';
 }
 function watch(plans,options){
  const pending=plans.filter(p=>p&&['BUY','SELL'].includes(p.side)&&!p.blocks?.length&&
   [p.entry,p.stop,p.target].every(value=>Number.isFinite(value)&&value>0)&&
   (p.side==='BUY'?p.stop<p.entry&&p.entry<p.target:p.target<p.entry&&p.entry<p.stop));
  let last=null, paused=false;
  const done=new Set();
  return {
   pause(){paused=true},
   push(quote,now){
    if(paused||now>=options.until||quote?.at<=options.observedAt)return [];
    if(last&&quote?.at<=last.at)return [];
    if(quoteStatus(quote,now)!=='ready'||(last&&quote.at-last.at>MAX_AGE)){
     paused=true;
     return [];
    }
    const changes=[];
    for(const plan of pending){
     if(done.has(plan.id))continue;
     const buy=plan.side==='BUY',price=buy?quote.ask:quote.bid;
     const previous=last?(buy?last.ask:last.bid):null;
     const beyondEntry=buy?price<=plan.entry:price>=plan.entry;
     const invalid=buy?quote.bid<=plan.stop:quote.ask>=plan.stop;
     if(!invalid&&!beyondEntry)continue;
     const crossed=last&&(buy?previous>plan.entry:previous<plan.entry);
     done.add(plan.id);
     changes.push({plan,quote,price,kind:invalid?'invalidated':crossed&&options.allowed(now)?'entry':'unconfirmed'});
    }
    last=quote;
    return changes;
   }
  };
 }
 function connect(market,symbol,callbacks,{Socket=globalThis.WebSocket,clock=Date.now}={}){
  const config=subscription(market,symbol);
  if(!config||typeof Socket!=='function')return null;
  const socket=new Socket(config.url);
  let stopped=false, deadline, latest;
  function close(){
   if(stopped)return;
   stopped=true;
   clearTimeout(deadline);
   socket.close();
  }
  function fail(reason){if(!stopped){close();callbacks.failed(reason)}}
  function arm(delay){clearTimeout(deadline);deadline=setTimeout(()=>fail('stale'),delay)}
  arm(8000);
  socket.addEventListener('open',()=>{if(!stopped)socket.send(JSON.stringify(config.request))});
  socket.addEventListener('close',()=>fail('disconnected'));
  socket.addEventListener('error',()=>fail('disconnected'));
  socket.addEventListener('message',event=>{
   if(stopped||typeof event.data!=='string')return;
   let message;
   try{message=JSON.parse(event.data)}catch{return}
   if(message?.success===false&&(message.method==='subscribe'||message.op==='subscribe'))return fail('rejected');
   const quote=parse(market,symbol,message);
   if(!quote)return;
   const now=clock(),status=quoteStatus(quote,now);
   if(latest&&quote.at<=latest)return;
   if(status!=='ready')return fail(status);
   if(latest&&quote.at-latest>MAX_AGE)return fail('stale');
   latest=quote.at;
   arm(Math.max(1,quote.at+MAX_AGE-now));
   callbacks.quote(quote,now);
  });
  return {close};
 }
 return Object.freeze({subscription,parse,quoteStatus,watch,connect});
});
