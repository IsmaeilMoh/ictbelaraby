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
 if(/non.farm|nonfarm|payroll|employment change|adp employment|jolts job openings|employment growth|الوظائف|التوظيف/.test(t))return ['سوق العمل — التوظيف','direct'];
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
root.ICTNewsImpact=Object.freeze({analyze,kind,parse});
})(window);
