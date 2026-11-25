'use strict';
const oanda=require('./oanda-practice.js');
const biquote=require('./ict-public-markets-702c2.js');

function compare(oandaBars,biquoteBars){
 const matched=new Map(biquoteBars.filter(bar=>bar.confirmed).map(bar=>[bar.start,bar.close]));
 return oandaBars.filter(bar=>bar.confirmed&&matched.has(bar.start)).map(bar=>{
  const other=matched.get(bar.start);
  return {closedAt:new Date(bar.start+900000).toISOString(),oandaMidClose:bar.close,biquoteClose:other,
   differenceBps:Math.round((bar.close/other-1)*1000000)/100};
 }).slice(-5);
}
async function run(){
 const settings=oanda.config();
 if(!settings)throw Error('Configure OANDA Practice on the monitor before comparing market prices.');
 const now=Date.now();
 for(const [symbol,market] of [['XAU_USD','metals'],['EUR_USD','forex']]){
  const [left,right]=await Promise.all([
   oanda.fetchCandles(symbol,'15',settings,{now}),
   biquote.get(biquote.resolve(market,symbol.replace('_','')),'15min',{limit:100,now})
  ]);
  const sample=compare(left,right);
  console.log(symbol,sample.length?JSON.stringify(sample):'No matching completed 15-minute bars.');
 }
}
if(require.main===module)run().catch(error=>{console.error(error.message);process.exitCode=1});
module.exports={compare};
