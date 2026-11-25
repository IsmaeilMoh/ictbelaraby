'use strict';
const assert=require('node:assert/strict');const backup=require('./crypto-spot-backup');
async function main(){
 const ms=900000,now=Date.parse('2026-11-25T09:01:00Z'),first=Math.floor(now/ms)*ms-40*ms;
 const arr=Array.from({length:41},(_,i)=>[first+i*ms,'100','102','99','101','5','0',first+(i+1)*ms-1]);
 const rows=backup.parse(arr,'BTCUSDT','15',now);
 assert.equal(rows.length,41);assert.equal(rows[0].confirmed,true);assert.equal(rows.at(-1).confirmed,false);
 assert.equal(rows.at(-1).market,'spot');assert.match(rows.at(-1).source,/NOT Bybit perpetual/);
 assert.throws(()=>backup.parse([arr[0],arr[0],...arr.slice(2)],'BTCUSDT','15',now),/BACKUP_INVALID_CANDLE/);
 assert.throws(()=>backup.parse(arr,'BTCUSD','15',now),/UNSUPPORTED/);
 assert.throws(()=>backup.parse(arr.map((x,i)=>i===1?[...x.slice(0,2),'95',...x.slice(3)]:x),'BTCUSDT','15',now),/INVALID_CANDLE/);
 const mock=async(url)=>{assert.match(url,/data-api\.binance\.vision/);return {ok:true,json:async()=>arr}};
 assert.equal((await backup.fetchHistory('BTCUSDT','15',{fetchImpl:mock,now})).length,41);
 await assert.rejects(()=>backup.fetchHistory('BTCUSDT','15',{fetchImpl:async()=>({ok:false,status:451}),now}),/HTTP_451/);
 console.log('Research-only spot backup validation: PASS');
}
main().catch(e=>{console.error(e);process.exitCode=1});
