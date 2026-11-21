/* ICT بالعربي 6.8.52 — qualitative economic impact, not live market reaction.
   This module never fetches external data or changes original readings. */
(function(root){
'use strict';
const missing = x => x==null || !String(x).trim() || ['—','-','null','undefined','n/a'].includes(String(x).trim().toLowerCase());
function parse(x){
 if(missing(x))return null;
 const m=String(x).trim().replace(/,/g,'').match(/^([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*(%|K|M|B|T)?$/i);
 if(!m)return null;
 return {n:Number(m[1]),u:(m[2]||'').toUpperCase()};
}
function kind(title){
 const t=String(title||'').toLowerCase();
 if(/unemployment rate|jobless rate|معدل البطالة|unemployment claims|jobless claims|claimant count|initial claims|continuing claims/.test(t))return ['سوق العمل — البطالة','inverse'];
 if(/non.farm|nonfarm|payroll|employment change|adp employment|jolts job openings|employment growth|average hourly earnings|wage growth|earnings m\/m|الأجور|الوظائف|التوظيف/.test(t))return ['سوق العمل — التوظيف','direct'];
 if(/cpi|consumer price|ppi|producer price|pce price|inflation rate|التضخم|أسعار المستهلك|أسعار المنتجين/.test(t))return ['التضخم','inflation'];
 if(/interest rate|rate decision|policy rate|cash rate|bank rate|federal funds|deposit facility rate|قرار الفائدة|سعر الفائدة/.test(t))return ['السياسة النقدية','rates'];
 if(/gdp|gross domestic product|retail sales|industrial production|manufacturing production|pmi|purchasing managers|ism manufacturing|ism services|الناتج المحلي|مبيعات التجزئة|مديري المشتريات/.test(t))return ['النشاط والنمو','direct'];
 if(/consumer confidence|consumer sentiment|business confidence|economic sentiment|ثقة المستهلك/.test(t))return ['الثقة الاقتصادية','direct'];
 return ['مؤشر يحتاج قراءة متخصصة','unknown'];
}
function analyze(row, peers=[]){
 const stage=String(row?.stage||'released'),name=row?.eventTitle||row?.title||'',currency=String(row?.currency||'').toUpperCase();
 const [category,rule]=kind(name),a=parse(row?.actual),f=parse(row?.forecast);
 if(stage==='upcoming')return {category,headline:'بانتظار صدور الخبر',detail:'التفسير الاقتصادي سيظهر بعد صدور القراءة الفعلية ومقارنتها بالتوقع المتاح. لا يمكن استنتاج اتجاه السوق مسبقًا.',quality:'pending'};
 if(stage==='awaiting')return {category,headline:'بانتظار النتيجة الفعلية',detail:'مر موعد الحدث ولم تتوفر نتيجة فعلية قابلة للتحقق بعد. لا توجد مفاجأة اقتصادية قابلة للحساب.',quality:'pending'};
 if(!a||!f||a.u!==f.u)return {category,headline:'المقارنة غير متاحة',detail:'تحتاج القراءة الفعلية والتوقع إلى قيمتين رقميتين بالوحدة نفسها. لا نعطي اتجاهًا محتملًا عند نقص البيانات.',quality:'unavailable'};
 const diff=a.n-f.n, tolerance=1e-8;
 if(Math.abs(diff)<tolerance)return {category,headline:'مطابق للتوقعات',detail:'القراءة مطابقة للتوقعات؛ رد الفعل الفعلي قد يتأثر بالمراجعات والتفاصيل المصاحبة وتسعير السوق المسبق.',quality:'context',difference:0};
 const higher=diff>0;
 let direction=rule==='inverse'?(higher?-1:1):rule==='unknown'?0:(higher?1:-1);
 let context='';
 if(rule==='inflation')context=higher?'ارتفاع التضخم عن المتوقع قد يرفع توقعات التشدد النقدي.':'انخفاض التضخم عن المتوقع قد يخفف توقعات التشدد النقدي.';
 else if(rule==='inverse')context=higher?'البطالة أو طلبات الإعانة أعلى من المتوقع، ما قد يشير إلى ضعف سوق العمل.':'البطالة أو طلبات الإعانة أقل من المتوقع، ما قد يشير إلى تماسك سوق العمل.';
 else if(rule==='rates')context='المستوى المعلن للفائدة يختلف عن التوقع؛ بيان البنك ونبرة السياسة والمسار المستقبلي قد تكون أهم من الرقم.';
 else if(rule==='direct')context=higher?'النشاط أو التوظيف أقوى من المتوقع بحسب المؤشر.':'النشاط أو التوظيف أضعف من المتوقع بحسب المؤشر.';
 else context='الفرق العددي وحده لا يكفي لتحديد الدلالة الاقتصادية لهذا المؤشر.';
 const directional=direction===1?`قد يدعم ${currency||'عملة الخبر'} في بعض الظروف.`:direction===-1?`قد يضغط على ${currency||'عملة الخبر'} في بعض الظروف.`:'لا نحدد أثرًا اتجاهيًا من هذا المؤشر.';
 const same=(Array.isArray(peers)?peers:[]).filter(x=>x!==row&&x?.stage==='released'&&x.currency===currency&&Math.abs(Date.parse(x.date)-Date.parse(row?.date))<=10*60000&&Number.isFinite(Date.parse(x.date)));
 const conflict=same.some(x=>{
  const aa=parse(x.actual),ff=parse(x.forecast);if(!aa||!ff||aa.u!==ff.u||aa.n===ff.n)return false;
  const r=kind(x.eventTitle||x.title)[1];const d=r==='inverse'?(aa.n>ff.n?-1:1):r==='unknown'?0:(aa.n>ff.n?1:-1);
  return direction&&d&&d!==direction;
 });
 const gold=currency==='USD'&&direction!==0?(direction===1?'قد يتعرض الذهب لضغوط إذا صعدت عوائد الدولار.':'قد يستفيد الذهب إذا تراجعت عوائد الدولار.'):'لا يمكن استنتاج أثر محدد على الذهب دون سياق الدولار والعوائد.';
 const confidence=row?.verifiedBeforeRelease===true?'':' التوقع غير موثق الحفظ قبل الإصدار؛ المقارنة مرجعية وليست مفاجأة تاريخية مؤكدة.';
 return {category,headline:higher?'أعلى من المتوقع':'أقل من المتوقع',detail:context+' '+(conflict?'صدرت مؤشرات متزامنة بإشارات متعارضة؛ لا نرجّح اتجاهًا من هذا الخبر منفردًا.':directional+' '+gold)+' هذا تفسير احتمالي لا يقيس حركة السعر الحقيقية.'+confidence,quality:conflict?'mixed':rule==='unknown'?'unknown':'conditional',difference:diff};
}
// 6.8.53: group simultaneously published macro releases; interpretation only.
function clusters(rows, minutes=10){
 const list=(Array.isArray(rows)?rows:[]).filter(x=>x&&/^[A-Z]{3}$/.test(String(x.currency||''))&&Number.isFinite(Date.parse(x.date))&&['released','awaiting'].includes(x.stage)).slice().sort((a,b)=>Date.parse(a.date)-Date.parse(b.date));
 const used=new Set(),out=[];
 for(let i=0;i<list.length;i++){
  if(used.has(i))continue;
  const seed=list[i],time=Date.parse(seed.date),members=[];
  for(let j=i;j<list.length;j++){
   if(!used.has(j)&&list[j].currency===seed.currency&&Math.abs(Date.parse(list[j].date)-time)<=minutes*60000){used.add(j);members.push(list[j]);}
  }
  // Do not show a redundant report when there is just one event.
  if(members.length<2)continue;
  const distinct=[...new Map(members.map(x=>[String(x.eventTitle||x.title)+'|'+x.date,x])).values()];
  if(distinct.length<2)continue;
  let positive=0,negative=0,neutral=0,missing=0,unverified=0;
  const details=distinct.map(x=>{
   const a=parse(x.actual),f=parse(x.forecast),rule=kind(x.eventTitle||x.title)[1];
   if(x.stage!=='released'||!a||!f||a.u!==f.u){missing++;return {name:x.eventTitle||x.title,status:'غير مكتمل',tone:0};}
   const delta=a.n-f.n;
   if(!Number.isFinite(delta)){missing++;return {name:x.eventTitle||x.title,status:'غير مكتمل',tone:0};}
   if(x.verifiedBeforeRelease!==true)unverified++;
   const strength=rule==='inverse'?-1:(rule==='rates'||rule==='unknown')?0:1;
   const tone=Math.abs(delta)<1e-8?0:Math.sign(delta)*strength;
   if(tone>0)positive++;else if(tone<0)negative++;else neutral++;
   return {name:x.eventTitle||x.title,status:delta>0?'أعلى من المتوقع':delta<0?'أقل من المتوقع':'مطابق للتوقع',tone};
  });
  let headline,quality;
  if(positive&&negative){headline='نتائج متزامنة بإشارات متعارضة';quality='mixed';}
  else if(positive||negative){headline=missing?'إشارات جزئية — بعض النتائج لم تصل':positive?'القراءات القابلة للتفسير تميل للقوة':'القراءات القابلة للتفسير تميل للضعف';quality=missing?'partial':'conditional';}
  else {headline=missing?'بانتظار اكتمال التقرير':'لا تتوفر إشارة اتجاهية كافية';quality=missing?'pending':'neutral';}
  const info=`${positive} أقوى · ${negative} أضعف · ${neutral} محايد · ${missing} غير مكتمل.`+(unverified?' بعض التوقعات لم يثبت حفظها قبل الإصدار؛ المقارنة مرجعية.':'')+' لا يمثل ذلك قياسًا لحركة السعر أو إشارة تداول.';
  out.push({currency:seed.currency,date:seed.date,headline,quality,detail:info,items:details});
 }
 return out.sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
}

function clusterStats(rows){
 // Only count groups with at least one comparable released observation.
 const groups=clusters(rows).filter(g=>g.items.some(i=>i.status!=='غير مكتمل'));
 const count=q=>groups.filter(g=>g.quality===q).length;
 return {total:groups.length,mixed:count('mixed'),partial:count('partial'),conditional:count('conditional'),neutral:count('neutral'),pending:count('pending')};
}
root.ICTNewsImpact=Object.freeze({analyze,kind,parse,clusters,clusterStats});
})(window);
