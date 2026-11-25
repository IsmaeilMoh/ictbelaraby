/* Read-only chart of the closed candles used by an opportunity scan. */
(function () {
 'use strict';

 const price = new Intl.NumberFormat('en-US', {maximumSignificantDigits: 12});
 const stamp = time => new Date(time).toISOString().slice(5, 16).replace('T', ' ');
 const colors = {entry:'#5dc9ff',stop:'#ff9b9f',target:'#7de0b1',ote:'#f5d688'};
 const lastWide = 1320, height = 740;

 function describe(plan, bars) {
  const timestamps = new Set(bars.map(bar => bar.start));
  const markers = ['سحب السيولة','MSS','FVG'].map((label,i) => ({label,at:plan.modelEvidence?.[i]}));
  const zones = [{label:'FVG',at:plan.modelEvidence?.[2],...plan.zone,color:'#5dc9ff'}];
  const levels = [
   {label:'دخول مرجعي',value:plan.entry,color:colors.entry},
   {label:'وقف افتراضي',value:plan.stop,color:colors.stop},
   {label:'هدف افتراضي',value:plan.target,color:colors.target}
  ];
  for (const match of plan.modelMatches || []) {
   if (match.type === 'ote') levels.push({label:'OTE',value:match.price,color:colors.ote});
   if (match.type === 'silver-bullet') markers.push({label:'Silver Bullet',at:match.at});
   if (match.type === '2022') markers.push({label:'إزاحة 2022',at:match.at});
   if (match.type === 'breaker' && match.region) {
    const region = match.region;
    zones.push({label:'Breaker',at:region.blockAt,low:region.low,high:region.high,color:'#d2a5ff'});
    markers.push({label:'كسر الكتلة',at:region.breakAt},{label:'إعادة اختبار الكتلة',at:region.retestAt});
   }
   if (match.type === 'amd' && match.region) {
    zones.push({label:'تراكم AMD',...match.region,color:'#f5d688'});
   }
  }
  const touches = [];
  let entered = false;
  const ageLimit = window.ICTSignalEngine.CONFIG.maxSignalAgeBars;
  const expires = plan.formedAt + ageLimit*Number(plan.frame)*60000;
  for (const bar of bars.filter(bar => bar.start >= plan.formedAt && bar.start < expires)) {
   const entry = bar.low <= plan.entry && bar.high >= plan.entry;
   const stop = plan.side === 'BUY' ? bar.low <= plan.stop : bar.high >= plan.stop;
   const target = plan.side === 'BUY' ? bar.high >= plan.target : bar.low <= plan.target;
   if (!entered && !entry && stop) {
    touches.push({label:'رُصد الإبطال قبل ملامسة الدخول',at:bar.start});
    break;
   }
   if (!entered && entry) {
    entered = true;
    touches.push({label:'لامست الشمعة الدخول المرجعي',at:bar.start});
    if (stop || target) {
     touches.push({label:'ترتيب المستويات غير محسوم داخل الشمعة',at:bar.start});
     break;
    }
   } else if (entered && (stop || target)) {
    touches.push({label:stop && target ? 'ترتيب الوقف والهدف غير محسوم' :
     stop ? 'لامست الشمعة مستوى الوقف' : 'لامست الشمعة مستوى الهدف',at:bar.start});
    break;
   }
  }
  const plotted = markers.filter(item=>timestamps.has(item.at));
  const regions = zones.filter(item=>timestamps.has(item.at)&&Number.isFinite(item.low)&&Number.isFinite(item.high)&&item.high>item.low);
  const prices = levels.filter(item=>Number.isFinite(item.value));
  const first = Math.min(...plotted.map(item=>item.at),...regions.map(item=>item.at));
  const firstIndex = bars.findIndex(bar=>bar.start===first);
  return {
   bars:bars.slice(firstIndex<0?Math.max(0,bars.length-40):Math.max(0,firstIndex-12)),
   markers:plotted,regions,prices,touches
  };
 }

 function draw(canvas, plan, phase, scan) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw Error('يتعذر الرسم في هذا المتصفح.');
  const {bars,markers,regions,prices,touches} = scan;
  const width = lastWide, left = 36, right = 860, top = 145, bottom = 640;
  canvas.width=width;canvas.height=height;
  ctx.fillStyle='#102026';ctx.fillRect(0,0,width,height);
  const color='#e6f3f1', muted='#afc7c9', grid='#31464e';
  function text(value,x,y,size=23,fill=color,direction='rtl'){
   ctx.font=size+'px system-ui, sans-serif';
   ctx.direction=direction;ctx.textAlign=direction==='rtl'?'right':'left';
   ctx.fillStyle=fill;ctx.fillText(value,x,y);
  }
  text(plan.symbol+' · '+plan.side+' · '+plan.frame+'m',left,44,31,color,'ltr');
  text(phase,width-36,44,28);
  text('لقطة بحثية من شموع الفحص · '+plan.source,width-36,80,23,muted);
  text('وقت الرصد UTC: '+stamp(plan.detectedAt),width-36,110,21,muted);
  const all = [...bars.flatMap(bar=>[bar.low,bar.high]),...regions.flatMap(region=>[region.low,region.high]),...prices.map(level=>level.value)];
  const lowest=Math.min(...all),highest=Math.max(...all);
  const padding=(highest-lowest || highest*0.01 || 1)*0.10;
  const min=lowest-padding,max=highest+padding;
  const y=value=>bottom-(value-min)/(max-min)*(bottom-top);
  const step=(right-left)/bars.length;
  const x=index=>left+(index+0.5)*step;
  const xAt=at=>x(bars.findIndex(bar=>bar.start===at));
  function line(x1,y1,x2,y2,stroke,width=1,dash=[]){
   ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.setLineDash(dash);
   ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.setLineDash([]);
  }
  for(let i=0;i<=5;i++){
   const v=min+(max-min)*i/5;
   line(left,y(v),right,y(v),grid);
   text(price.format(v),left+4,y(v)-4,15,muted,'ltr');
  }
  for(const region of regions){
   const start=Math.max(left,xAt(region.at)-step/2);
   const end=region.until ? xAt(region.until)+step/2 : right;
   ctx.fillStyle=region.color+'26';ctx.fillRect(start,y(region.high),Math.max(step,end-start),y(region.low)-y(region.high));
   text(region.label,start+5,y(region.high)+20,16,region.color,'ltr');
  }
  bars.forEach((bar,i)=>{
   const stroke=bar.close>=bar.open?'#70d6a8':'#ff8e95';
   line(x(i),y(bar.high),x(i),y(bar.low),stroke,1.6);
   const body=Math.max(2,Math.min(15,step*0.58));
   ctx.fillStyle=stroke;
   ctx.fillRect(x(i)-body/2,Math.min(y(bar.open),y(bar.close)),body,Math.max(2,Math.abs(y(bar.open)-y(bar.close))));
  });
  prices.forEach((level,i)=>{
   line(left,y(level.value),right,y(level.value),level.color,2,[7,6]);
   text(level.label,width-30,top+24+i*32,20,level.color);
   text(price.format(level.value),right+12,top+24+i*32,19,level.color,'ltr');
  });
  const numbered=[...markers,...touches].filter(item=>bars.some(bar=>bar.start===item.at));
  const markerRows=new Map();
  numbered.forEach((item,i)=>{
   const cx=xAt(item.at),row=markerRows.get(item.at)||0,cy=top+15+row*27;
   markerRows.set(item.at,row+1);
   line(cx,top,cx,bottom,'#d2bf82',1,[4,5]);
   ctx.fillStyle='#eed47f';ctx.beginPath();ctx.arc(cx,cy,10,0,Math.PI*2);ctx.fill();
   text(String(i+1),cx-(i<9?4:7),cy+5,14,'#102026','ltr');
   text((i+1)+' · '+item.label,width-30,top+170+i*29,18);
   text(stamp(item.at).slice(6),right+12,top+170+i*29,16,muted,'ltr');
  });
  text(stamp(bars[0].start)+' UTC',left,bottom+29,18,muted,'ltr');
  text(stamp(bars.at(-1).start)+' UTC',right-170,bottom+29,18,muted,'ltr');
  text('ملامسة الشمعة رصد سعري بحثي. تبيّن الخطوط مستويات الخطة المرجعية.',width-36,height-24,20,muted);
 }

 function mount(parent, plan, bars, phase) {
  if (!bars?.length) return;
  const doc=parent.ownerDocument;
  const add=(tag,text,container)=>{
   const element=doc.createElement(tag);
   element.textContent=text;container.append(element);return element;
  };
  const details=add('details','',parent);
  details.className='dc-evidence-chart';
  add('summary','عرض الشارت والأدلة',details);
  details.addEventListener('toggle',()=>{
   if (!details.open||details.childElementCount>1) return;
   const scan=describe(plan,bars);
   const scroller=add('div','',details);
   scroller.className='dc-chart-scroll';
   const canvas=add('canvas','شارت شموع الفحص. راجع الأدلة النصية في البطاقة.',scroller);
   canvas.setAttribute('role','img');
   canvas.setAttribute('aria-label','شارت شموع '+plan.symbol+' وحالة النموذج '+phase);
   const status=add('p','',details);status.setAttribute('role','status');
   try { draw(canvas,plan,phase,scan); }
   catch(error){scroller.remove();status.textContent=error.message;return;}
   for(const touch of scan.touches)add('p',touch.label+' · '+stamp(touch.at)+' UTC',details);
   const save=add('button','حفظ الشارت كصورة',details);
   save.type='button';save.className='secondary';
   save.addEventListener('click',()=>canvas.toBlob(blob=>{
    if(!blob){status.textContent='تعذّر إنشاء صورة الشارت.';return}
    const url=URL.createObjectURL(blob),link=doc.createElement('a');
    link.href=url;link.download='ICT-'+plan.symbol+'-'+plan.frame+'m-'+plan.detectedAt+'.png';
    details.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
   },'image/png'));
  });
 }
 window.ICTOpportunityChart=Object.freeze({mount});
})();
