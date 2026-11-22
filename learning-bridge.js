/* ICT بالعربي 6.8.65 — readonly educational context; no test parameters or saved trades touched. */
(()=>{'use strict';
  const lessons={
    liq:['السيولة — Liquidity','اختبر كيف تحدد قواعد البحث السحب من القمم والقيعان. النماذج المعروضة ليست إشارات مباشرة.'],
    structure:['تحول هيكل السوق — MSS','راجع قواعد كسر البنية التقريبية المستخدمة في الاختبار؛ التعريف قد يختلف عن تطبيقك اليدوي.'],
    fvg:['فجوة القيمة العادلة — FVG','افحص قاعدة الفجوة ثلاثية الشموع ضمن نموذج البحث. هذه الأداة لا تفحص كل أشكال FVG على حدة.'],
    ob:['كتل الأوامر — Order Blocks','استخدم مكتبة النماذج لتوثيق أمثلة من تحليلك. لا يوجد اختبار آلي مستقل لكتل الأوامر.'],
    premium:['Premium & Discount','راجع النطاقات على مخطط تاريخي، وحدد منتصفها بنفسك؛ لا يوجد اختبار مستقل لهذا المفهوم.'],
    ote:['Optimal Trade Entry — OTE','راقب التصحيحات التاريخية في آلة الزمن؛ لا يوجد اختبار آلي مستقل لـ OTE.'],
    sb:['Silver Bullet','راجع توقيت الجلسة والسياق مع FVG والسيولة؛ لا يوجد اختبار كامل مؤتمت لهذا النموذج.']
  };
  const id=new URLSearchParams(location.search).get('concept');if(!Object.prototype.hasOwnProperty.call(lessons,id))return;
  const panel=document.getElementById('course-bridge'),title=document.getElementById('course-bridge-title'),copy=document.getElementById('course-bridge-copy'),back=document.getElementById('course-bridge-back');
  if(!panel||!title||!copy||!back)return;
  title.textContent='من الأكاديمية: '+lessons[id][0];copy.textContent=lessons[id][1];
  back.href='./?lesson='+encodeURIComponent(id)+'#academy';panel.hidden=false;
  if(id==='ob'){
    const tab=document.querySelector('[data-tab="patterns"]');if(tab)tab.click();
  } else if(id==='ote'||id==='premium'){
    const tab=document.querySelector('[data-tab="replay"]');if(tab)tab.click();
  }
})();
