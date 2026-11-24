/* ICT بالعربي 7.0 / 4B: reproducible candle observations, NOT full ICT model backtests. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.ICTCaseEngine=api})(typeof globalThis!=='undefined'?globalThis:null,function(){
 'use strict';
 const PERIOD={'5':300000,'15':900000,'60':3600000};
 function scan(input,interval,opt){opt=opt||{};const ms=PERIOD[String(interval)];if(!ms)throw Error('إطار غير مدعوم');const maxHorizon=20;const candles=(input||[]).filter(x=>x&&x.confirmed===true).map(x=>({start:Number(x.start),open:Number(x.open),high:Number(x.high),low:Number(x.low),close:Number(x.close)})).sort((a,b)=>a.start-b.start);
  if(candles.length<7)throw Error('لا توجد شموع مكتملة كافية');for(let j=0;j<candles.length;j++){const c=candles[j];if(!Number.isSafeInteger(c.start)||!Number.isFinite(c.open)||c.open<=0||![c.high,c.low,c.close].every(Number.isFinite)||c.low<=0||c.high<Math.max(c.open,c.close,c.low)||c.low>Math.min(c.open,c.close,c.high)||(j&&c.start===candles[j-1].start))throw Error('بيانات OHLC غير سليمة أو مكررة')}
  const output=[];const need=opt.minGapPct===undefined?0.015:Math.max(0,Number(opt.minGapPct));
  for(let i=2;i<candles.length-1;i++){const a=candles[i-2],b=candles[i-1],c=candles[i];if(b.start-a.start!==ms||c.start-b.start!==ms)continue;
   const bullish=a.high<c.low,bearish=a.low>c.high;if(!bullish&&!bearish)continue;
   const dir=bullish?'bull':'bear',bottom=bullish?a.high:c.high,top=bullish?c.low:a.low,gap=top-bottom;
   if(gap/c.close*100<need)continue;
   const entry=(top+bottom)/2,stop=bullish?bottom:top,target=bullish?entry+(entry-stop):entry-(stop-entry),risk=Math.abs(entry-stop);
   if(risk<=0)continue;let status='uncertain',trigger=-1,done=-1,reason='انتهت نافذة التقييم أو التاريخ المتاح';let contiguous=true;
   for(let k=i+1;k<Math.min(candles.length,i+1+maxHorizon);k++){const q=candles[k];if(q.start-candles[k-1].start!==ms){reason='فجوة زمنية في الشموع';break;}
    if(trigger<0){const touched=bullish?q.low<=entry:q.high>=entry;if(!touched)continue;trigger=k;
     const both=(bullish?q.low<=stop&&q.high>=target:q.high>=stop&&q.low<=target);
     const adverse=bullish?q.low<=stop:q.high>=stop, favorable=bullish?q.high>=target:q.low<=target;
     if(both||adverse||favorable){status='uncertain';reason='في شمعة الدخول لامس السعر الإبطال أو الهدف؛ ترتيب الحركة غير معروف';done=k;break;}
    }else{const adverse=bullish?q.low<=stop:q.high>=stop,favorable=bullish?q.high>=target:q.low<=target;
     if(adverse&&favorable){reason='الهدف والإبطال لُمسا في نفس الشمعة دون معرفة الترتيب';done=k;break;}
     if(adverse||favorable){status=adverse?'loss':'win';done=k;reason=adverse?'وصل إلى الإبطال أولًا':'وصل إلى هدف 1R أولًا';break;}
    }
   }
   if(trigger<0&&done<0&&reason==='انتهت نافذة التقييم أو التاريخ المتاح'){status='miss';reason='لم يرجع السعر إلى منتصف الفجوة في نافذة الرصد المتاحة';}
   const evidence={kind:'FVG component observation',candleStart:a.start,detectedAt:c.start,entryAt:trigger<0?null:candles[trigger].start,closedAt:done<0?null:candles[done].start,dir,entry,stop,target,gapLow:bottom,gapHigh:top,status,reason,windowBars:Math.min(maxHorizon,candles.length-i-1),isCompleteHorizon:candles.length-i-1>=maxHorizon,method:'FVG3-midpoint-1R-v1',modelValidated:false};
   if(status==='miss'&&!evidence.isCompleteHorizon){evidence.status='uncertain';evidence.reason='تاريخ المتابعة المتاح أقل من 20 شمعة، لا يمكن الجزم بعدم التفعيل';}
   output.push(evidence);
  }
  return output;
 }
 return Object.freeze({PERIOD,scan,version:'7.0.4b.1'});
});
